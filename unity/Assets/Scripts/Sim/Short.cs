using System;
using System.Collections.Generic;

namespace GolfGo.Sim
{
    /* Stage 3: the short game around the strike (state.js): how far each shot type runs out (shortRoll), the meter sized to the
       pin (setShortMax), the planner that finds the carry finishing level with the cup (shortFinish / shortPlan, which also
       puts the flag on the meter), chooseShort's pick of chip or pitch and club, and which shots a lie allows (setShot).
       The player judges the wind himself here (windAlong is the rivals' only), so the plan ignores it, as in the web game. */
    public class Short
    {
        readonly Strike S; readonly SimHole H; readonly Course C; readonly Tuning T;
        public Short(Strike s, SimHole h, Course c) { S = s; H = h; C = c; T = s.T; }

        static double Tab(Tuning t, string k, string key, double d) => t.Get(k, key) ?? d;
        // shortRoll: roll-out as a share of carry, by shot (chips by club), times the surface it lands on
        public static double Roll(Tuning t, Club c, string st, string L)
        {
            double k = st == "chip" ? Tab(t, "CHIP_R", c.Tid, 1) : st == "pitch" ? Tab(t, "PITCH_R", c.Tid, .3) : Tab(t, "SHORT_RK", st, .22);
            return k * Tab(t, "SHORT_SURF", L, .5);
        }
        public static bool BunkerSide(string lie, double pinDist) => lie == "sand" && pinDist <= 45;
        public double PinDist(ShotIn s) => M.Hypot(s.bx - C.pin[0], s.by - C.pin[1]);
        public double NatMax(Club c, ShotIn s) => c.carry * S.Cm.Carry(c) * S.LieMul(c, s.lie, s.stype, s.onTeeBox) * T.ShotK(s.stype, "c");

        // setShortMax: every short-game shot's meter is sized from the carry it needs, so the flag sits high on it
        public double SetMax(ShotIn s)
        {
            var c = S.Club(s.club); if (!Strike.IsShort(s.stype) || c.putter) return 0;
            double mx = NatMax(c, s), ka = 0;   // (windAlong: 0 for the player)
            var Mv = S.ShotMods(c, s);
            return M.Clamp(PinDist(s) / (1 + Roll(T, c, s.stype, s.lie == "rough" ? "fairway" : "green")) * 1.8 / (Mv.carry * Math.Max(.6, 1 + Math.Min(0, ka))) + 1.5, Math.Min(6, mx), mx);
        }

        public class Finish { public double lx, ly, x, y; public string L; public bool bad; }
        // simRollP: a roll from a point at a starting speed over the real ground
        (double x, double y, bool bad) SimRoll(double x, double y, double dx, double dy, double v)
        {
            double vx = dx * v, vy = dy * v, h = 1.0 / 240;
            for (double t = 0; t < 20; t += h)
            {
                string L = H.Lie(x, y); if (L == "water" || L == "ob") return (x, y, true);
                double sp = M.Hypot(vx, vy), mu = H.MuRoll(L, sp); var (gx, gy) = C.Grad(x, y); double sx = -H.GACC * gx, sy = -H.GACC * gy, smag = M.Hypot(sx, sy), ax = sx, ay = sy;
                if (sp > 1e-6) { ax -= mu * vx / sp; ay -= mu * vy / sp; }
                vx += ax * h; vy += ay * h; if (M.Hypot(vx, vy) < Math.Max(.1, mu * h * 1.5) && smag < H.MuStill(L) * .95) break; x += vx * h; y += vy * h;
            }
            return (x, y, false);
        }
        // shortFinish: where a short shot of this carry lands and finishes, with the landing, hops and roll the shot itself uses
        public Finish FinishAt(ShotIn s, double carry)
        {
            var c = S.Club(s.club); var (dx, dy) = M.Dir(s.aim); var Mv = S.ShotMods(c, s);
            var f = new Flight { sx = s.bx, sy = s.by, y0 = C.HAt(s.bx, s.by) + .03, dx = dx, dy = dy, px = -dy, py = dx, carry = carry, lat = 0, wx = dx * 0, wy = dy * 0, apex = S.ShotApex(c, carry, s) * Mv.apex, rollMul = Mv.roll * S.Cm.Roll(c, s.stype), back = Mv.back * S.Cm.SpinC(c) };
            double lx = s.bx + dx * carry, ly = s.by + dy * carry, u = .5;
            for (; u < 2.4; u += .01) { var q = f.Pos(u); lx = q.x; ly = q.y; if (q.Y <= C.HAt(q.x, q.y) + .03) break; }
            string L = H.Lie(lx, ly);
            if (L == "water" || L == "ob") return new Finish { x = lx, y = ly, lx = lx, ly = ly, L = L, bad = true };
            var (tx, ty) = f.Travel(u); double R = f.carry * Roll(T, c, s.stype, L) * f.rollMul;
            if (L == "green" && f.back > 0) R = -Math.Min(3.5, f.carry * .03) * f.back;
            double mu = H.MU["green"], Tb = Math.Max(.8 + f.carry / 140, .55 + Math.Sqrt(f.apex) * .28), g = M.Clamp(8 * f.apex / (Tb * Tb), 16, 42), vyIn = M.Clamp(4 * f.apex / Tb * (1 + Math.Max(0, u - 1)), 1, 60);
            double e = H.HOP_E.TryGetValue(L, out var ee) ? ee : .3;
            double vh = R > 0 ? Math.Min(Math.Sqrt(2 * mu * R) * .95, 24) : 1.3;
            double HopDist(double v0) { double d = 0, vy = vyIn * e, vv = v0; for (int k = 0; k < 4 && vy >= 1.6; k++) { d += vv * 2 * vy / g; vy *= e; vv *= .72; } return d; }
            double Dh = HopDist(vh); if (R > 0 && Dh > R * .6) { vh *= R * .6 / Dh; Dh = R * .6; }
            double rollV = R > 0 ? Math.Sqrt(2 * mu * Math.Max(0, R - Dh)) : M.Sign(R) * Math.Sqrt(2 * mu * Math.Abs(R));
            var (gx, gy) = C.Grad(lx, ly); double x = lx, y = ly, Y = C.HAt(lx, ly) + .01, hvx = tx * vh - gx * vyIn * e * 1.6, hvz = ty * vh - gy * vyIn * e * 1.6, hvy = vyIn * e; int n = 0;
            if (!(vyIn * e < 1.6 || L == "sand"))
            {
                double h = 1.0 / 120;
                for (int i = 0; i < 2400; i++)
                {
                    hvy -= g * h; Y += hvy * h; x += hvx * h; y += hvz * h; double gnd = C.HAt(x, y);
                    if (Y <= gnd && hvy < 0)
                    {
                        Y = gnd; string L2 = H.Lie(x, y); if (L2 == "water" || L2 == "ob") return new Finish { x = x, y = y, lx = lx, ly = ly, L = L, bad = true };
                        double vi = -hvy, e2 = H.HOP_E.TryGetValue(L2, out var e2v) ? e2v : .3; n++;
                        if (vi * e2 < 1.6 || n >= 4 || L2 == "sand") break;
                        (gx, gy) = C.Grad(x, y); hvy = vi * e2; hvx = hvx * .72 - gx * vi * e2 * 1.6; hvz = hvz * .72 - gy * vi * e2 * 1.6;
                    }
                }
            }
            double rx, ry; if (rollV < 0) { rx = -tx; ry = -ty; } else { double l = M.Hypot(hvx, hvz); if (l > .3) { rx = hvx / l; ry = hvz / l; } else { rx = tx; ry = ty; } }
            var r = SimRoll(x, y, rx, ry, Math.Abs(rollV));
            return new Finish { x = r.x, y = r.y, lx = lx, ly = ly, L = L, bad = r.bad };
        }
        public class Plan { public double carry; public bool over, bad; public Finish F; }
        // shortPlan: the carry that finishes level with the cup along the aim line (a 15-step search)
        public Plan PlanFor(ShotIn s)
        {
            var c = S.Club(s.club); var (dx, dy) = M.Dir(s.aim); var p = C.pin;
            double want = (p[0] - s.bx) * dx + (p[1] - s.by) * dy, mx = NatMax(c, s) * S.ShotMods(c, s).carry;
            double Along(Finish q) => (q.x - s.bx) * dx + (q.y - s.by) * dy;
            double lo = .5, hi = mx; bool over = false;
            if (Along(FinishAt(s, hi)) < want) { lo = hi; over = true; }
            else for (int i = 0; i < 15; i++) { double m = (lo + hi) / 2; if (Along(FinishAt(s, m)) < want) lo = m; else hi = m; }
            double carry = over ? mx : (lo + hi) / 2; var F = FinishAt(s, carry);
            return new Plan { carry = carry, over = over, bad = F.bad, F = F };
        }
        // the meter power that carries the planned distance (where the flag sits: the meter shows Power^(1/SG_K))
        public double FlagPower(ShotIn s, Plan P) => P.carry / (s.swMax * S.ShotMods(S.Club(s.club), s).carry);
        public double MeterToPower(double f) => Math.Pow(M.Clamp(f, 0, 1), T.Num("SG_K"));
        public double PowerToMeter(double p) => Math.Pow(M.Clamp(p, 0, 1), 1 / T.Num("SG_K"));

        // chooseShort: from a bunker by the green a splash (a blast when plugged) with the SW; otherwise inside 70 yd off the green,
        // the chip or pitch and club that finish closest, with a penalty for landing short of the green and a preference for chips
        // CI(id): the club in that slot of the player's set (a swapped-in 64° for "LW"); the stock club when nothing is swapped
        public Func<string, string> Slot = id => id;
        public (string stype, string club)? Choose(ShotIn s0)
        {
            double d = PinDist(s0); string L = s0.lie;
            if (BunkerSide(L, d)) return (s0.buried ? "blast" : "splash", Slot("SW"));
            if (L == "sand" || L == "green" || d > 70) return null;
            var cands = new List<(string, string)>();
            if (d <= 40) foreach (var id in new[] { "7I", "8I", "9I", "PW", "GW", "SW", "LW" }) cands.Add(("chip", id));
            foreach (var id in new[] { "PW", "GW", "SW", "LW" }) cands.Add(("pitch", id));
            (string, string)? best = null; double bs = 0; var p = C.pin;
            foreach (var (st, id) in cands)
            {
                var s = Copy(s0); s.stype = st; s.club = Slot(id); s.swMax = 0; var P = PlanFor(s); if (P.over || P.bad) continue;
                double miss = M.Hypot(P.F.x - p[0], P.F.y - p[1]), landPen = P.F.L == "green" ? 0 : (P.F.L == "fairway" || P.F.L == "tee") ? 1.2 : P.F.L == "cut" ? 1.8 : P.F.L == "rough" ? 4 : 8;
                double sc = miss + landPen + (st == "pitch" ? 1.6 : 0) + (st == "chip" ? Math.Abs(Tab(T, "CHIP_R", id, 1) - 2) * .15 : 0);
                if (best == null || sc < bs) { best = (st, Slot(id)); bs = sc; }
            }
            return best;
        }
        public static ShotIn Copy(ShotIn a) => a.MemberwiseCloneShot();

        // setShot / shotOK: which shot types this club and lie allow (the HUD greys out the rest)
        public bool ShotOK(string st, int clubIndex) { var cl = (List<object>)T.Shot(st)["clubs"]; foreach (var o in cl) if (Convert.ToInt32(o) == clubIndex) return true; return false; }
        public string Why(string st, string lie, double pinDist, bool buried)
        {
            if (Strike.BunkerT(st) && !BunkerSide(lie, pinDist)) return "Bunker shots are for the sand by the green";
            if (buried && (st == "splash" || st == "pick")) return "PLUGGED · only a blast gets it out";
            if (st == "spin" && !(lie == "fairway" || lie == "tee" || lie == "cut")) return "NO SPINNER · needs a clean lie: fairway, first cut or tee";
            return null;
        }
        // the club a shot type moves to when the current one can't play it (setShot)
        public int ClubFor(string st, int clubIndex)
        {
            if (ShotOK(st, clubIndex)) return clubIndex; var cl = (List<object>)T.Shot(st)["clubs"]; if (cl.Count == 0) return clubIndex;
            int a = Convert.ToInt32(cl[0]), b = Convert.ToInt32(cl[cl.Count - 1]); return clubIndex < a ? a : b;
        }
    }
}

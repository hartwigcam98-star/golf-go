using System;
using System.Collections.Generic;

namespace GolfGo.Sim
{
    /* Stage 5: the round around the shots (state.js, save-file.js), without the rivals: the lie a shot is played from (shotLie),
       where the aim starts (aimTarget: the pin, or 255 yd along the centreline on a long hole), the club the game hands you
       (autoClub: putter on the green or from short grass inside 14 yd, driver off the tee when the landing zone is clear, else
       the shortest club that gets there, a straighter one from fescue), the hole's wind and its shift every stroke, and the
       penalty area's relief (Rule 17: lateral within two club-lengths, back on the line, or stroke and distance). */
    public class Round
    {
        readonly Strike S; readonly SimHole H; readonly Course C; readonly Short SG; readonly Putt PT; List<Club> clubs;
        public Round(Strike s, SimHole h, Course c, Short sg, Putt pt) { S = s; H = h; C = c; SG = sg; PT = pt; clubs = s.T.Clubs(); }
        public int Putter => clubs.FindIndex(k => k.putter);
        // CI: a club by its id, or by the slot it fills (a swapped-in club)
        public int Index(string id) { int i = clubs.FindIndex(k => k.id == id); return i >= 0 ? i : clubs.FindIndex(k => k.slot == id); }
        public void SetClubs(List<Club> set) { clubs = set; SG.Slot = id => { int i = Index(id); return i >= 0 ? clubs[i].id : id; }; }   // the player's set (club swaps)

        // shotLie: the turf, the cart path where it shows, and the teeing area within 5 yd of the tee spot
        public string ShotLie(double x, double y)
        {
            string L = H.Lie(x, y); if (H.PATH_ON.Contains(L) && H.OnPath(x, y)) L = "path";
            if (L != "water" && L != "ob" && M.Hypot(x - C.line0[0], y - C.line0[1]) < 5) L = "tee";
            return L;
        }
        public bool OnTeeBox(double x, double y, string lie) => lie == "tee" || Math.Min(M.Hypot(x - C.line0[0], y - C.line0[1]), M.Hypot(x, y)) < 8;
        public static double AngTo(double x1, double y1, double x2, double y2) => Math.Atan2(x2 - x1, -(y2 - y1));
        // aimTarget
        public (double x, double y) AimTarget(double x, double y)
        {
            if (C.segs != null) { double s = C.AlongCl(x, y); if (C.len - s > 300) { var p = C.At(s + 255); return (p.x, p.y); } }
            return (C.pin[0], C.pin[1]);
        }
        // teeDriver: par 4s and 5s off the tee, unless the green is in reach or trouble covers a fifth of the driver's landing zone
        public bool TeeDriver(double x, double y, double aim, string lie)
        {
            if (C.par < 4 || !OnTeeBox(x, y, lie)) return false;
            double dC = clubs[0].carry * S.Cm.Carry(clubs[0]); if (M.Hypot(x - C.pin[0], y - C.pin[1]) < dC + 25) return false;
            var (dx, dy) = M.Dir(aim); double px = -dy, py = dx, bad = 0, n = 0;
            for (double s = dC - 10; s <= dC + 30; s += 8) for (double w = -14; w <= 14; w += 7)
                { string L = H.Lie(x + dx * s + px * w, y + dy * s + py * w); n++; if (L == "water" || L == "ob" || L == "sand" || L == "fescue" || L == "dirt") bad += Math.Abs(w) > 10 ? .6 : 1; }
            return bad / n < .2;
        }
        // autoClub (driverOK: the driver only off the tee for the player's golfer)
        public int AutoClub(double d, double x, double y, double aim, string lie)
        {
            int PUTTER = Putter; bool onTee = OnTeeBox(x, y, lie);
            if (lie == "green") return PUTTER;
            if (d < 14 && (lie == "fairway" || lie == "tee" || lie == "cut")) return PUTTER;
            if (TeeDriver(x, y, aim, lie)) return 0;
            double Mul(Club c) => S.LieMul(c, lie, "full", onTee);
            if (lie == "sand") { for (int i = PUTTER - 1; i >= Index("5I"); i--) { var c = clubs[i]; if (c.carry * S.Cm.Carry(c) * Mul(c) >= d * .97) return i; } return Index("5I"); }
            int lo = onTee ? 0 : 1;
            for (int i = PUTTER - 1; i >= lo; i--) { var c = clubs[i]; if (c.carry * S.Cm.Carry(c) * Mul(c) >= d * (lie == "fescue" ? .93 : .97) && S.LieErr(c, lie) < 2.4) return i; }
            if (lie == "rough" || lie == "fescue") { int bi = lo; double bs = -1; for (int i = lo; i < PUTTER; i++) { var c = clubs[i]; double sc = c.carry * S.Cm.Carry(c) * Mul(c) / (1 + (S.LieErr(c, lie) - 1) * .5); if (sc > bs) { bs = sc; bi = i; } } return bi; }
            return lo;
        }
        public class Setup { public string lie, stype = "full"; public double aim, swMax, puttMax; public int club; public bool flagOut; }
        // prepareShot: lie, aim, club, then the putter only on a clean line (else a PW) and chooseShort, the meters' sizes, the flag
        public Setup Prepare(double x, double y, bool buried, double windA, double windMph)
        {
            var o = new Setup { lie = ShotLie(x, y) }; var t = AimTarget(x, y); o.aim = AngTo(x, y, t.x, t.y);
            o.club = AutoClub(M.Hypot(t.x - x, t.y - y) + M.Clamp(C.HAt(t.x, t.y) - C.HAt(x, y), -25, 25) * .9, x, y, o.aim, o.lie);
            o.flagOut = Putt.FlagOut(o.lie, M.Hypot(x - C.pin[0], y - C.pin[1]));
            if (o.club == Putter && o.lie != "green" && !PT.LineClean(x, y)) o.club = Index("PW");
            var si = new ShotIn { bx = x, by = y, aim = o.aim, lie = o.lie, club = clubs[o.club].id, stype = "full", onTeeBox = OnTeeBox(x, y, o.lie), buried = buried, windA = windA, windMph = windMph };
            if (o.club != Putter) { var pk = SG.Choose(si); if (pk != null) { o.stype = pk.Value.stype; o.club = Index(pk.Value.club); si.stype = o.stype; si.club = pk.Value.club; o.swMax = SG.SetMax(si); } }
            o.puttMax = PT.Max(x, y, o.lie);
            return o;
        }

        // holeWind: one round seed sets the day's wind; each hole varies it a little
        public static (double a, double mph) HoleWind(int roundSeed, int hi)
        {
            var rb = new Rng(roundSeed * 31 + 977); double a0 = rb.Next() * 2 * Math.PI, m0 = 1 + rb.Next() * 11; var wr = new Rng(roundSeed * 31 + 1000 + hi * 17);
            return (a0 + (wr.Next() - .5) * .35, M.Clamp(JsRound(m0 + (wr.Next() - .5) * 4), 0, 16));
        }
        // the wind shifts once per stroke after the first
        public static (double a, double mph) Shift(double a, double mph, Func<double> rnd) { double m = M.Clamp(JsRound(mph + (rnd() - .5) * 3), 0, 16); return (a + (rnd() - .5) * .5, m); }
        static double JsRound(double v) => Math.Floor(v + .5);

        // ---- the penalty area (Rule 17): where it crossed in, and the relief options ----
        bool Wet(double x, double y) => H.Lie(x, y) == "water";
        // waterCross: the last point where the ball's path went from dry to wet, narrowed down (16 halvings)
        public double[] WaterCross(double[] prev, List<double[]> rec, double[] ball)
        {
            var pts = new List<double[]> { prev }; pts.AddRange(rec); pts.Add(ball);
            for (int i = pts.Count - 1; i > 0; i--)
            {
                var a = pts[i - 1]; var b = pts[i];
                if (!Wet(a[0], a[1]) && Wet(b[0], b[1]))
                {
                    double[] lo = a, hi = b;
                    for (int k = 0; k < 16; k++) { var m = new[] { (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2 }; if (Wet(m[0], m[1])) hi = m; else lo = m; }
                    return lo;
                }
            }
            return new[] { prev[0], prev[1] };
        }
        static readonly Dictionary<string, double> RELIEF_LIE = new Dictionary<string, double> { { "fairway", 0 }, { "tee", 0 }, { "cut", .3 }, { "green", .4 }, { "rough", 1 }, { "fescue", 2.5 }, { "sand", 3 } };
        static double RL(string L) => RELIEF_LIE.TryGetValue(L, out var v) ? v : 2;
        public class Relief { public string k, name, L; public double x, y, d; public double[] C; }
        // dropLateral: within two club-lengths of the crossing, no nearer the hole, out of the water, the best lie close by
        public Relief DropLateral(double[] Cx)
        {
            var p = C.pin; double dC = M.Hypot(Cx[0] - p[0], Cx[1] - p[1]); Relief best = null; double bsc = 0;
            for (double r = .4; r <= 2.5; r += .3) for (int k = 0; k < 24; k++)
                {
                    double a = k / 24.0 * 2 * Math.PI, x = Cx[0] + Math.Cos(a) * r, y = Cx[1] + Math.Sin(a) * r; string L = H.Lie(x, y);
                    if (L == "water" || L == "ob" || M.Hypot(x - p[0], y - p[1]) < dC - .01) continue;
                    double sc = RL(L) + r * .12; if (best == null || sc < bsc) { bsc = sc; best = new Relief { k = "lat", x = x, y = y, L = L }; }
                }
            return best;
        }
        // dropBack: back along the pin-to-crossing line until it's clear of the water
        public Relief DropBack(double[] Cx)
        {
            var p = C.pin; double ux = Cx[0] - p[0], uy = Cx[1] - p[1], l = M.Hypot(ux, uy); if (l == 0) l = 1; ux /= l; uy /= l;
            for (double t = 1; t < 400; t += .5)
            {
                double x = Cx[0] + ux * t, y = Cx[1] + uy * t; string L = H.Lie(x, y); if (L == "ob") return null; if (L == "water") continue;
                string L2 = H.Lie(x + ux, y + uy); if (L2 == "water") continue; if (L2 == "ob") return null;
                return new Relief { k = "line", x = x + ux, y = y + uy, L = L2 };
            }
            return null;
        }
        public List<Relief> ReliefOpts(double[] Cx, double[] prev)
        {
            var o = new List<Relief>(); var p = C.pin;
            var lat = DropLateral(Cx); if (lat != null) { lat.name = "Lateral drop"; lat.C = Cx; o.Add(lat); }
            var bk = DropBack(Cx); if (bk != null) { bk.name = "Back on the line"; bk.C = Cx; o.Add(bk); }
            o.Add(new Relief { k = "replay", name = "Replay from last spot", x = prev[0], y = prev[1], L = H.Lie(prev[0], prev[1]) });
            foreach (var q in o) q.d = M.Hypot(q.x - p[0], q.y - p[1]);
            return o;
        }
        // reliefBest: the option that leaves the easiest next shot (the web game marks it, and takes it for the rivals)
        public static Relief Best(List<Relief> o) { Relief b = o[0]; double bs = 1e9; foreach (var q in o) { double s = q.d + RL(q.L) * 6; if (s < bs) { bs = s; b = q; } } return b; }
    }
}

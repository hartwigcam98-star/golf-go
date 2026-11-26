using System;
using System.Collections.Generic;

namespace GolfGo.Sim
{
    /* Stage 2 of the port: what the ball does after it is struck, from the web game's stepFlight / land / fullRoll / stepHop /
       startRoll / stepRoll / stopBall (save-file.js), line for line and with the same dice in the same order:
         - in the air: trees (through the leaves, a branch knock-down, off the trunk, cacti), the flagstick
         - landing: water and out of bounds, a slam dunk, a plugged ball in sand, the planned roll-out (club, surface, wind, a
           downhill drop), wedges checking up and spinning back, hops that kick off slopes, cart paths (a high skip and a run)
         - rolling: slopes, friction by surface, the cup (centred or off-centre pace, the flagstick in), rim rides, lip-outs
         - at rest: holed, a gimme inside 4 ft on the green, free relief from a cart path (the spot), or where it lies
       The web game steps it every frame at 60 a second, the flight then the hops then the roll in one frame, and so does this.
       Not yet: bunker faces (Troy Burne 1 has none; they come with the courses that have them), the water relief options (stage 5).
       Sounds, toasts, leaves and birds are left to the Unity side: only the dice they cost here are drawn. */
    public class SimHole
    {
        public string[] lieNames; double lx0, ly0; int lnx, lny; int[] lie;
        public class Tree { public double x, y, r, cr, mh, gh, vs; public bool con, cactus; public double cpB; public double[] cpR; public double cs0, cs1; public bool hasCp; }
        public List<Tree> trees = new List<Tree>();
        public List<double[][]> paths = new List<double[][]>();
        public Dictionary<string, double> MU = new Dictionary<string, double>(), HOP_E = new Dictionary<string, double>(), SURF = new Dictionary<string, double>();
        public double sandRel = 1;
        public double MU_REST, MU_REST_FW, CUP, CAPV, GACC, GIMME_YD, PATH_HW, bury;
        public HashSet<string> PATH_ON = new HashSet<string>();
        public double wx0, wy0, wst; public int wnx, wny; public double[] wide;   // heights beyond the hole's grid (see Course.SetOuter)
        static double D(object o) => Convert.ToDouble(o);
        static void Tab(Dictionary<string, object> o, Dictionary<string, double> into) { foreach (var kv in o) if (kv.Value is double d) into[kv.Key] = d; }
        public SimHole(string json)
        {
            var o = (Dictionary<string, object>)MiniJson.Parse(json);
            var ln = (List<object>)o["lieNames"]; lieNames = new string[ln.Count]; for (int i = 0; i < ln.Count; i++) lieNames[i] = (string)ln[i];
            var lg = (Dictionary<string, object>)o["lg"]; lx0 = D(lg["x0"]); ly0 = D(lg["y0"]); lnx = Convert.ToInt32(lg["nx"]); lny = Convert.ToInt32(lg["ny"]);
            var ld = (List<object>)lg["data"]; lie = new int[ld.Count]; for (int i = 0; i < lie.Length; i++) lie[i] = Convert.ToInt32(ld[i]);
            foreach (Dictionary<string, object> t in (List<object>)o["trees"])
            {
                var q = new Tree { x = D(t["x"]), y = D(t["y"]), r = D(t["r"]), cr = D(t["cr"]), mh = D(t["mh"]), gh = D(t["gh"]), vs = D(t["vs"]), con = D(t["con"]) != 0, cactus = D(t["cactus"]) != 0 };
                if (t["cp"] is Dictionary<string, object> cp && t["cs"] is List<object> cs)
                {
                    q.hasCp = true; q.cpB = D(cp["B"]); var r = (List<object>)cp["r"]; q.cpR = new double[r.Count]; for (int i = 0; i < r.Count; i++) q.cpR[i] = D(r[i]);
                    q.cs0 = D(cs[0]); q.cs1 = D(cs[1]);
                }
                trees.Add(q);
            }
            foreach (List<object> pl in (List<object>)o["paths"])
            {
                var a = new double[pl.Count][]; for (int i = 0; i < pl.Count; i++) { var p = (List<object>)pl[i]; a[i] = new[] { D(p[0]), D(p[1]) }; }
                paths.Add(a);
            }
            Tab((Dictionary<string, object>)o["MU"], MU); Tab((Dictionary<string, object>)o["HOP_E"], HOP_E); Tab((Dictionary<string, object>)o["SURF"], SURF);
            MU_REST = D(o["MU_REST"]); MU_REST_FW = D(o["MU_REST_FW"]); CUP = D(o["CUP"]); CAPV = D(o["CAPV"]); GACC = D(o["GACC"]); GIMME_YD = D(o["GIMME_YD"]);
            PATH_HW = D(o["PATH_HW"]); bury = D(o["bury"]); if (o.TryGetValue("sandRel", out var sr) && sr is double srd) sandRel = srd;
            foreach (var kv in (Dictionary<string, object>)o["PATH_ON"]) PATH_ON.Add(kv.Key);
            if (o.TryGetValue("wide", out var wo) && wo is Dictionary<string, object> w)
            {
                wx0 = D(w["x0"]); wy0 = D(w["y0"]); wst = D(w["st"]); wnx = Convert.ToInt32(w["nx"]); wny = Convert.ToInt32(w["ny"]);
                var wd = (List<object>)w["data"]; wide = new double[wd.Count]; for (int i = 0; i < wide.Length; i++) wide[i] = D(wd[i]);
            }
        }
        // lieAt: the 1-yd surface grid, the ground under the trees already marked as dirt
        public string Lie(double x, double y)
        {
            int i = (int)Math.Floor(x - lx0 + .5), j = (int)Math.Floor(y - ly0 + .5);
            if (i < 0 || j < 0 || i >= lnx || j >= lny) return "ob";
            int c = lie[j * lnx + i]; return c >= 0 && c < lieNames.Length ? lieNames[c] : "ob";
        }
        // onPath: within the path's half width (plus pad) of any of its segments
        public bool OnPath(double x, double y, double pad = 0)
        {
            double w = PATH_HW + pad;
            foreach (var pl in paths)
                for (int i = 0; i < pl.Length - 1; i++)
                {
                    double ax = pl[i][0], ay = pl[i][1], dx = pl[i + 1][0] - ax, dy = pl[i + 1][1] - ay, l2 = dx * dx + dy * dy; if (l2 == 0) l2 = 1;
                    double t = M.Clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
                    if (M.Hypot(ax + dx * t - x, ay + dy * t - y) <= w) return true;
                }
            return false;
        }
        public string PhysLie(double x, double y) { var L = Lie(x, y); return PATH_ON.Contains(L) && OnPath(x, y) ? "path" : L; }
        public double Mu(string L) => MU.TryGetValue(L, out var m) && m != 0 ? m : MU["fairway"];
        static double Smooth(double e0, double e1, double x) { double t = M.Clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
        public double MuRoll(string L, double sp)
        {
            double m = Mu(L);
            return L == "green" ? m * (MU_REST + (1 - MU_REST) * Smooth(.15, .4, sp)) : (L == "fairway" || L == "tee") ? m * (MU_REST_FW + (1 - MU_REST_FW) * Smooth(.2, .9, sp)) : m;
        }
        public double MuStill(string L) => Mu(L) * (L == "green" ? MU_REST : (L == "fairway" || L == "tee") ? MU_REST_FW : 1);
        // treeCrown: the crown's radius at a height above the tree's foot (null when the tree has no measured profile)
        public static double? Crown(Tree t, double ht)
        {
            if (!t.hasCp) return null; int bi = (int)Math.Floor(ht / t.cs1 / t.cpB);
            return (bi >= 0 && bi < t.cpR.Length ? t.cpR[bi] : 0) * t.cs0;
        }
    }

    public enum BallState { Flight, Bounce, Roll, Rest, Holed, Penalty }

    public class Outcome
    {
        public string kind;          // rest, holed, water, ob
        public string how = "";      // holed: "", "Slam dunk", "Dunked it", "Off the pin", "Rattled in", "Gimme"
        public double x, y;          // where the ball is when its fate is known (holed: the cup)
        public string lie, plie;     // rest: the turf, and what the ball feels (the cart path where it shows)
        public double[] relief;      // rest on a cart path: the free-relief spot (null when none)
        public bool gimme, buried, spinBack, pinHit, knocked;
        public List<string> events = new List<string>();   // for the Unity side's sounds and toasts: "trunk", "branch", "rustle", "pin", "path", "lip", "rim", "spinback", "plug", "pmark"
        public List<double[]> at = new List<double[]>();     // where each event happened: x, y, height, travel x, y (+ the tree's x, y, radius for "rustle"); the effects read it
        public int dice;             // dice drawn before the fate was known
    }

    public class Ball
    {
        public readonly SimHole H; readonly Course C; readonly Strike S; Rng R;
        public double x, y, bY; public BallState state; public Outcome outcome;
        public double windA, windMph; public bool flagOut;
        public double[] pin; public int dice; public List<double[]> rec = new List<double[]>();
        double D() { dice++; return R.Next(); }
        // the flight in progress (G.flight) and its running fields
        public double U => u;   // (how far along the flight: the tracer)
        public Flight f; Club fc; double u; bool pinHitF, knocked; double? lx, ly, qx, qy, qY; HashSet<SimHole.Tree> rus;
        bool dropping; double dvx, dvz, dvy;
        // the hops (G.hop) and the roll (G.roll)
        double hvx, hvz, hvy, hg, rollV, htx, hty; int hn; bool hSpinBack, hPinHit;
        public double rvx, rvy, rt; bool rlip; double? rcb; int rtk;
        bool rim; double rimA, rimW, rimLeft, rimSp; bool rimDrop;

        public Ball(SimHole h, Course c, Strike s) { H = h; C = c; S = s; pin = c.pin; if (h.wide != null) c.SetOuter(h.wx0, h.wy0, h.wst, h.wnx, h.wny, h.wide); }

        public void Launch(Flight fl, int seed)
        {
            f = fl; fc = S.Club(fl.club); u = 0; pinHitF = false; knocked = false; lx = ly = qx = qy = qY = null; rus = null; dropping = false;
            R = new Rng(seed); dice = 0; outcome = null; rim = false; rec.Clear();
            x = fl.sx; y = fl.sy; bY = fl.y0; state = BallState.Flight;
        }
        // a ball already rolling (a putt, a chip's run-out, or a test): from (x, y) at (vx, vy) yd/s
        public void LaunchRoll(double x0, double y0, double vx, double vy, int seed)
        {
            f = null; fc = null; u = 0; pinHitF = false; knocked = false; hPinHit = false; dropping = false; R = new Rng(seed); dice = 0; outcome = null; rec.Clear();
            x = x0; y = y0; bY = C.HAt(x0, y0); StartRollV(vx, vy, false);
        }
        public bool Moving => state == BallState.Flight || state == BallState.Bounce || state == BallState.Roll;
        // one frame of the game loop: the flight, then the hops, then the roll
        public void Step(double dt)
        {
            if (state == BallState.Flight) StepFlight(dt);
            if (Moving) rec.Add(new[] { x, y });   // the shot's path, as the loop records it (after the flight's step): waterCross reads it
            if (state == BallState.Bounce) StepHop(dt);
            if (state == BallState.Roll) StepRoll(dt);
        }
        public void RunToRest(double dt = 1.0 / 60, int maxFrames = 60 * 40) { for (int n = 0; n < maxFrames && Moving; n++) Step(dt); }

        void Fate(string kind, string how = "") { if (outcome == null) outcome = new Outcome(); outcome.kind = kind; outcome.how = how; outcome.x = x; outcome.y = y; outcome.dice = dice; outcome.knocked = knocked; outcome.pinHit = pinHitF || hPinHit; }
        void Ev(string e, double[] at = null) { if (outcome == null) outcome = new Outcome(); outcome.events.Add(e); outcome.at.Add(at ?? new[] { x, y, bY, 0, 0 }); }   // (no dice: the shot plays out the same)
        void Penalty(string L) { Fate(L); state = BallState.Penalty; }
        void Holed(string how = "") { Fate("holed", how); x = pin[0]; y = pin[1]; state = BallState.Holed; }

        (double, double) TravelDir(double uu)
        {
            double s = Flight.S(uu), tx = f.dx * f.carry + 2 * s * (f.px * f.lat + f.wx), ty = f.dy * f.carry + 2 * s * (f.py * f.lat + f.wy);
            double l = M.Hypot(tx, ty); if (l == 0) l = 1; return (tx / l, ty / l);
        }
        static double Trunc(double v) => v < 0 ? Math.Ceiling(v) : Math.Floor(v);   // (x|0) for small values

        void PinHit(double hp)
        {
            var (tx, ty) = TravelDir(u); pinHitF = true; Ev("pin");
            if (hp < .35 && D() < .4) { Holed("Off the pin"); return; }
            double a = (D() - .5) * 2.4, c = Math.Cos(a), s = Math.Sin(a), v = .5 + D() * 1.3, bx = -tx, by = -ty;
            x = pin[0] - tx * .1; y = pin[1] - ty * .1; bY = C.HAt(x, y);
            StartRollV((bx * c - by * s) * v, (bx * s + by * c) * v, true);
        }
        void StartRollV(double vx, double vy, bool lip) { rvx = vx; rvy = vy; rt = 0; rlip = lip; rcb = null; rtk = 0; rim = false; state = BallState.Roll; }

        void StepFlight(double dt)
        {
            if (dropping)
            {   // falling out of the branches
                dvy -= 30 * dt; x += dvx * dt; y += dvz * dt; bY += dvy * dt; double g0 = C.HAt(x, y);
                if (bY <= g0 + .03) { bY = g0; StartRollV(dvx * .6, dvz * .6, false); }
                return;
            }
            u += dt / f.T; var (X, Yy, Y) = f.Pos(u); x = X; y = Yy; bY = Y;
            double gnd = C.HAt(x, y);
            if (!pinHitF && u > .3)
            {
                double plx = qx ?? x, ply = qy ?? y, plY = qY ?? Y; qx = x; qy = y; qY = Y;
                double sx = x - plx, sy = y - ply, L2 = sx * sx + sy * sy, k = L2 > 1e-9 ? M.Clamp(((pin[0] - plx) * sx + (pin[1] - ply) * sy) / L2, 0, 1) : 1;
                double cx = plx + sx * k, cy = ply + sy * k, Yk = plY + (Y - plY) * k, gp = C.HAt(pin[0], pin[1]);
                if (M.Hypot(cx - pin[0], cy - pin[1]) < .075 && Yk - gp > .02 && Yk - gp < 2.5) { PinHit(Yk - gp); return; }
            }
            if (!knocked)
            {
                double ox = lx ?? x, oy = ly ?? y, ds = M.Hypot(x - ox, y - oy); lx = x; ly = y;
                foreach (var t in H.trees)
                {
                    double d = M.Hypot(x - t.x, y - t.y); if (d > Math.Max(t.r, t.cr)) continue;
                    double ht = Y - t.gh, top = t.mh != 0 ? t.mh : 2 + 1.35 * t.r, tr = M.Clamp(.05 * t.r + .12, .15, .5);
                    double? cw = SimHole.Crown(t, ht);
                    bool InLeaf(double kk) => cw == null ? (ht > (kk > .82 ? 2 : 3) && ht < top && d < t.r * kk) : (ht > 1.5 && d < cw.Value * (kk > .82 ? 1 : .92));
                    if (t.cactus)
                    {
                        if (ht < 9.5 * t.vs && d < .62 && ds > 0)
                        {
                            double nx = (x - t.x) / (d != 0 ? d : 1), ny = (y - t.y) / (d != 0 ? d : 1); var (tx, ty) = TravelDir(u);
                            double dot = tx * nx + ty * ny, rx = tx - 2 * dot * nx, ry = ty - 2 * dot * ny, v = M.Clamp(f.carry / f.T * .25, 1.5, 7);
                            Ev("cactus"); bY = gnd; StartRollV(rx * v, ry * v, false); return;
                        }
                        continue;
                    }
                    if (ht < top * .8 && d < tr + .05 && ds > 0)
                    {   // the trunk: back the way it came
                        double nx = (x - t.x) / (d != 0 ? d : 1), ny = (y - t.y) / (d != 0 ? d : 1); var (tx, ty) = TravelDir(u);
                        double dot = tx * nx + ty * ny, rx = tx - 2 * dot * nx, ry = ty - 2 * dot * ny, v = M.Clamp(f.carry / f.T * .3, 2, 9);
                        Ev("trunk"); bY = gnd; StartRollV(rx * v, ry * v, false); return;
                    }
                    if (u > .04 && InLeaf(.85) && !(rus ?? (rus = new HashSet<SimHole.Tree>())).Contains(t))
                    {   // through the leaves: the leaf count and the birds cost dice
                        { var (rtx, rty) = TravelDir(u); rus.Add(t); Ev("rustle", new[] { x, y, bY, rtx, rty, t.x, t.y, t.r }); } D(); if (D() < .4) D();
                    }
                    if (u > .04 && InLeaf(.8))
                    {
                        double p = (t.con ? .02 : .009) * ds;
                        if (D() < p)
                        {   // caught a branch: drops a few yards on
                            var (tx, ty) = TravelDir(u); double a = (D() - .5) * 1.4, c = Math.Cos(a), sn = Math.Sin(a); Ev("branch");
                            double v = 1.2 + D() * 2.5; knocked = true; dropping = true; dvx = (tx * c - ty * sn) * v; dvz = (tx * sn + ty * c) * v; dvy = .5; return;
                        }
                    }
                }
            }
            if ((u > .5 && Y <= gnd + .03) || u > 2.4) Land();
        }

        double FullRoll(string L, double tx, double ty)
        {
            var c = fc; string st = f.stype ?? "full";
            double pk = c.kind == "wood" ? .8 : c.kind == "hybrid" ? .5 : c.kind == "iron" ? .35 : c.kind == "wedge" ? 0 : 0;
            var pkT = S.T.Get("PART_K", c.kind); if (pkT.HasValue) pk = pkT.Value;
            double Ce = f.full != 0 ? f.carry + Math.Max(0, f.full - f.carry) * pk : f.carry;
            double surf = L == "green" ? (S.T.Get("GREEN_HOLD", c.Tid) ?? .5) : (H.SURF.TryGetValue(L, out var sv) && sv != 0 ? sv : 1);
            var (wx, wy) = M.Dir(windA); double along = windMph * (wx * tx + wy * ty), wind = M.Clamp(1 + .014 * along, .75, 1.35);
            double drop = f.y0 - C.HAt(x, y), fall = M.Clamp(1 - .012 * drop, .8, 1.2);
            return Ce * c.roll * S.T.ShotK(st, "r") * surf * f.rollMul * wind * fall;
        }
        double HopE(string L) => H.HOP_E.TryGetValue(L, out var e) ? e : .3;
        double Surf(string L) => H.SURF.TryGetValue(L, out var v) && v != 0 ? v : 1;

        void Land()
        {
            string L = H.PhysLie(x, y);
            if (L == "water" || L == "ob") { Penalty(L); return; }
            if (M.Hypot(x - pin[0], y - pin[1]) < .35) { Holed("Slam dunk"); return; }
            Ev("land");   // (the landing thud: sfx.land)
            bool buried = false;
            if (L == "sand")
            {   // a steep drop into soft sand can plug
                double st0 = M.Clamp((f.apex / Math.Max(8, f.carry) - .1) / .22, 0, 1), pb = H.bury * (.25 + 1.75 * st0);
                if (D() < pb) { buried = true; Ev("plug"); }
            }
            var (tx, ty) = TravelDir(u);
            if (L == "green" && f.apex > 2.5) Ev("pmark", new[] { x + tx * .03, y + ty * .03, 0, tx, ty });   // a pitch mark where it came down
            string st = f.stype ?? "full";
            double R0;
            if (st == "punch") R0 = f.carry * .22 * Surf(L) * f.rollMul;
            else if (Strike.IsShort(st)) R0 = f.carry * Short.Roll(S.T, fc, st, L) * f.rollMul;
            else R0 = FullRoll(L, tx, ty);
            if (f.rel != 0) R0 += f.carry * f.rel * Surf(L);
            bool spinBack = L == "green" && ((f.back > 0) || (fc.loft >= 1.15 && st == "full" && f.carry > 45 && !f.fly));
            if (spinBack) R0 = f.back > 0 ? -Math.Min(3.5, f.carry * .03) * f.back : Math.Min(R0, f.carry * (fc.loft >= 1.25 ? .012 : fc.loft >= 1.19 ? .018 : .024));
            double mu = Strike.IsShort(st) ? H.MU["green"] : H.Mu(L);
            double Tb = Math.Max(.8 + f.carry / 140, .55 + Math.Sqrt(f.apex) * .28);
            double g = M.Clamp(8 * f.apex / (Tb * Tb), 16, 42), vyIn = M.Clamp(4 * f.apex / Tb * (1 + Math.Max(0, u - 1)), 1, 60);
            double e = HopE(L);
            double vh = R0 > 0 ? Math.Min(Math.Sqrt(2 * mu * R0) * .95, 24) : 1.3;
            double HopDist(double v0) { double dd = 0, vy = vyIn * e, vv = v0; for (int k = 0; k < 4 && vy >= 1.6; k++) { dd += vv * 2 * vy / g; vy *= e; vv *= .72; } return dd; }
            double Dh = HopDist(vh); if (R0 > 0 && Dh > R0 * .6) { vh *= R0 * .6 / Dh; Dh = R0 * .6; }
            double rv = R0 > 0 ? Math.Sqrt(2 * mu * Math.Max(0, R0 - Dh)) : M.Sign(R0) * Math.Sqrt(2 * mu * Math.Abs(R0));
            var (gx, gy) = C.Grad(x, y);
            hvx = tx * vh - gx * vyIn * e * 1.6; hvz = ty * vh - gy * vyIn * e * 1.6; hvy = vyIn * e; hg = g; rollV = rv; htx = tx; hty = ty; hn = 0; hSpinBack = spinBack; hPinHit = false;
            bY = C.HAt(x, y) + .01;
            if (outcome == null) outcome = new Outcome(); outcome.buried = buried; outcome.spinBack = spinBack && R0 < 0;
            if (L == "path") Ev("path");
            if (vyIn * e < 1.6 || L == "sand") StartRoll(); else state = BallState.Bounce;
        }
        void StartRoll()
        {
            double dx, dz;
            if (rollV < 0) { dx = -htx; dz = -hty; }
            else { double l = M.Hypot(hvx, hvz); if (l > .3) { dx = hvx / l; dz = hvz / l; } else { dx = htx; dz = hty; } }
            double v = Math.Abs(rollV); StartRollV(dx * v, dz * v, false); bY = C.HAt(x, y);
        }
        void StepHop(double dt)
        {
            int n = Math.Max(1, (int)Math.Ceiling(dt * 120)); double h = dt / n;
            for (int i = 0; i < n; i++)
            {
                hvy -= hg * h; bY += hvy * h; x += hvx * h; y += hvz * h;
                if (!hPinHit && M.Hypot(x - pin[0], y - pin[1]) < .075)
                {
                    double hp = bY - C.HAt(pin[0], pin[1]);
                    if (hp < 2.5) { hPinHit = true; Ev("pin"); if (hp < .3 && D() < .35) { Holed("Off the pin"); return; } hvx *= -.25; hvz *= -.25; }
                }
                double gnd = C.HAt(x, y);
                if (bY <= gnd && hvy < 0)
                {
                    bY = gnd; string L = H.PhysLie(x, y);
                    if (L == "water" || L == "ob") { Penalty(L); return; }
                    double vyIn = -hvy;
                    if (M.Hypot(x - pin[0], y - pin[1]) < H.CUP * 1.6 && vyIn < 7) { Holed("Dunked it"); return; }
                    double e = HopE(L); hn++;
                    if (vyIn * e < 1.6 || hn >= 4 || L == "sand") { StartRoll(); return; }
                    var (gx, gy) = C.Grad(x, y);
                    double keep = L == "path" ? .86 : .72; hvy = vyIn * e; hvx = hvx * keep - gx * vyIn * e * 1.6; hvz = hvz * keep - gy * vyIn * e * 1.6;
                    if (L == "path") { double a = (D() - .5) * .5, c = Math.Cos(a), s = Math.Sin(a), vx = hvx; hvx = vx * c - hvz * s; hvz = vx * s + hvz * c; Ev("path"); }
                }
            }
        }
        double CapV(double cb) => H.CAPV * (.2 + .8 * Math.Sqrt(Math.Max(0, 1 - Math.Pow(cb / H.CUP, 2)))) * (flagOut ? 1 : 1.35);
        void StepRoll(double dt)
        {
            rt += dt; int n = Math.Max(1, (int)Math.Ceiling(dt * 240)); double h = dt / n; double CUP = H.CUP;
            for (int i = 0; i < n; i++)
            {
                if (rim)
                {   // riding the rim
                    rimA += rimW * h; rimLeft -= Math.Abs(rimW) * h; x = pin[0] + Math.Cos(rimA) * CUP * .9; y = pin[1] + Math.Sin(rimA) * CUP * .9;
                    if (rimLeft <= 0)
                    {
                        rim = false; if (rimDrop) { Holed("Rattled in"); return; }
                        double ox = Math.Cos(rimA), oy = Math.Sin(rimA), sg = M.Sign(rimW), tx = -oy * sg, ty = ox * sg, ex = tx + ox * .8, ey = ty + oy * .8, l = M.Hypot(ex, ey);
                        rvx = ex / l * rimSp; rvy = ey / l * rimSp; x = pin[0] + ox * CUP * 1.05; y = pin[1] + oy * CUP * 1.05; Ev("lip");
                    }
                    continue;
                }
                string L = H.PhysLie(x, y);
                if (L == "water" || L == "ob") { Penalty(L); return; }
                double sp = M.Hypot(rvx, rvy), d = M.Hypot(x - pin[0], y - pin[1]);
                if (d < CUP)
                {
                    if (rcb == null) rcb = sp > 1e-6 ? Math.Abs(rvx * (pin[1] - y) - rvy * (pin[0] - x)) / sp : 0;
                    double vmax = CapV(rcb.Value);
                    if (!flagOut && rtk == 0 && sp > .6) { rtk = 1; Ev("pin"); }
                    if (sp < vmax) { Holed(); return; }
                    if (!rlip && rcb.Value > CUP * .4 && sp < vmax * 2.2)
                    {
                        rlip = true; double rx = x - pin[0], ry = y - pin[1], sg = M.Sign(rx * rvy - ry * rvx); if (sg == 0) sg = 1;
                        rim = true; rimA = Math.Atan2(ry, rx); rimW = sg * M.Clamp(sp * .6, .7, 1.6) / (CUP * .9); rimLeft = .9 + D() * 1.9; rimSp = sp * .45;
                        rimDrop = sp < vmax * 1.2 && D() < .3; Ev("rim"); continue;
                    }
                    if (!rlip)
                    {
                        rlip = true; double a = (D() < .5 ? -1 : 1) * (.35 + D() * .4), c = Math.Cos(a), s = Math.Sin(a), vx = rvx, vy = rvy;
                        rvx = (vx * c - vy * s) * .62; rvy = (vx * s + vy * c) * .62; Ev("lip");
                    }
                }
                else if (d > CUP * 1.6) { rlip = false; rcb = null; rtk = 0; }
                sp = M.Hypot(rvx, rvy); double mu = H.MuRoll(L, sp);
                var (gx, gy) = C.Grad(x, y); double sx = -H.GACC * gx, sy = -H.GACC * gy, smag = M.Hypot(sx, sy);
                double ax = sx, ay = sy; if (sp > 1e-6) { ax += -mu * rvx / sp; ay += -mu * rvy / sp; }
                rvx += ax * h; rvy += ay * h;
                if (M.Hypot(rvx, rvy) < Math.Max(.1, mu * h * 1.5) && smag < H.MuStill(L) * .95) { Stop(); return; }
                x += rvx * h; y += rvy * h;
            }
            if (rt > 30) Stop();
        }
        void Stop()
        {
            if (M.Hypot(x - pin[0], y - pin[1]) < H.CUP) { Holed(); return; }
            string L = H.Lie(x, y);
            if (L == "green" && M.Hypot(x - pin[0], y - pin[1]) <= H.GIMME_YD)
            {   // conceded: one more stroke, then in
                Fate("holed", "Gimme"); outcome.gimme = true; outcome.lie = L; outcome.x = x; outcome.y = y; state = BallState.Holed; return;
            }
            Fate("rest"); outcome.lie = L; outcome.plie = H.PhysLie(x, y); outcome.relief = PathRelief(); state = BallState.Rest;
        }
        // pathReliefSpot: the nearest spot clear of the path, no nearer the hole, never in a bunker, on a green, in water or OB
        public double[] PathRelief()
        {
            if (H.PhysLie(x, y) != "path") return null; double d0 = M.Hypot(x - pin[0], y - pin[1]);
            for (double r = .5; r <= 12; r += .5)
            {
                double[] best = null; double bd = 0;
                for (int k = 0; k < 32; k++)
                {
                    double a = k / 32.0 * (2 * Math.PI), px = x + Math.Cos(a) * r, py = y + Math.Sin(a) * r, d = M.Hypot(px - pin[0], py - pin[1]); if (d < d0 - .02) continue;
                    string L = H.Lie(px, py); if (L == "water" || L == "ob" || L == "green" || L == "sand") continue; if (H.OnPath(px, py, .35)) continue;
                    if (best == null || d < bd) { best = new[] { px, py }; bd = d; }
                }
                if (best != null) return best;
            }
            return null;
        }
    }
}

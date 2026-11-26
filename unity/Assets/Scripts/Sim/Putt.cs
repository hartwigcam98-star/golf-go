using System;

namespace GolfGo.Sim
{
    /* Stage 4: putting (state.js, save-file.js). What a putt needs to finish just past the cup on this ground (puttNeed: friction
       along the line, the rise or fall, plus a little), the meter's length sized so the flag sits where PUTT_FLAG puts it for the
       distance (calcPuttMax; off the green it's cut to fit), where the flag sits (puttTargetPower), the stroke itself (strikeShot's
       putter branch: the window, a miss pulls or pushes and comes up short), when the flag comes out (inside 15 ft), and whether a
       ball off the green can be putted (puttLineClean). The ball then rolls on Ball.LaunchRoll like every other roll. */
    public class Putt
    {
        readonly Strike S; readonly SimHole H; readonly Course C;
        public Putt(Strike s, SimHole h, Course c) { S = s; H = h; C = c; }
        static readonly double[][] FLAG = { new[] { 4.0, .85 }, new[] { 10.0, .75 }, new[] { 25.0, .65 }, new[] { 60.0, .5 } };
        double Mu(string L) => H.MU.TryGetValue(L, out var m) && m != 0 ? m : H.MU["fairway"];
        double MuGreen => H.MU["green"];

        // puttFlagAt: how far up the meter the flag sits for a putt of this many feet (log-interpolated)
        public static double FlagAt(double ft)
        {
            var P = FLAG; if (ft <= P[0][0]) return P[0][1];
            for (int i = 1; i < P.Length; i++) if (ft <= P[i][0]) { double a = Math.Log(P[i - 1][0]), b = Math.Log(P[i][0]), t = (Math.Log(ft) - a) / (b - a); return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t; }
            return P[P.Length - 1][1];
        }
        // puttNeed: yards of flat-ground roll that finish just past the cup
        public (double d, double need) Need(double bx, double by, string lie)
        {
            var p = C.pin; double d = M.Hypot(p[0] - bx, p[1] - by);
            int n = Math.Max(4, (int)Math.Ceiling(d / .5)); double work = 0;
            for (int i = 0; i < n; i++) { double t = (i + .5) / n; string L = H.Lie(bx + (p[0] - bx) * t, by + (p[1] - by) * t); work += Mu(L) * d / n; }
            double mu0 = Mu(lie), dz = C.HAt(p[0], p[1]) - C.HAt(bx, by);
            return (d, (work + H.GACC * dz + MuGreen * .45) / mu0);
        }
        // calcPuttMax: the meter's full stroke in yards of roll
        public double Max(double bx, double by, string lie)
        {
            var q = Need(bx, by, lie); double n = Math.Max(0, q.need), k = S.Cm.PuttM(q.d);
            double b = lie == "green" ? M.Clamp(n / FlagAt(q.d * 3), 1, 80) : M.Clamp(n * 1.4 + .1, .3, 80);
            return k == 1 ? b : Math.Max(b * k, n * 1.12 + .2);   // v103: a blade putter's meter is finer
        }
        // puttTargetPower: where the flag sits on the meter (null inside a foot)
        public double? TargetPower(double bx, double by, string lie, double puttMax) { var q = Need(bx, by, lie); if (q.d < .3) return null; return Math.Max(0, q.need / puttMax); }
        public static bool FlagOut(string lie, double pinDist) => lie == "green" && pinDist <= 5;
        // puttLineClean: off the green, a putt only when the whole line is mown grass
        public bool LineClean(double bx, double by)
        {
            var p = C.pin;
            for (int i = 1; i < 20; i++) { double t = i / 20.0; string L = H.Lie(bx + (p[0] - bx) * t, by + (p[1] - by) * t); if (L != "green" && L != "fairway" && L != "tee" && L != "cut") return false; }
            return true;
        }
        public double Window(bool aiTurn) => .026 * (aiTurn ? 1 : .8) * S.Cm.WinPutt;

        public class Stroke { public double vx, vy, D, missBy; public int perfect; public bool miss; }
        // the putter's strike (strikeShot): the same dice as a full swing's timing, then the distance and the line
        public Stroke Hit(double bx, double by, double aim, string lie, double puttMax, double power, double? e0, bool aiTurn, int seed)
        {
            var R = new Rng(seed); bool HARSH = !aiTurn, miss = e0 == null; int perfect = 0; double missBy = 0, e;
            if (miss) { e = (R.Next() < .5 ? -1 : 1) * (HARSH ? .09 + R.Next() * .1 : .07 + R.Next() * .08); power *= HARSH ? .3 + R.Next() * .15 : .45; missBy = HARSH ? .06 : 0; }
            else
            {
                e = e0.Value; double w = Window(aiTurn), ae = Math.Abs(e);
                if (ae <= w) { perfect = ae <= w * .5 ? 2 : 1; e = HARSH && perfect == 1 ? M.Sign(e) * (ae - w * .5) * .45 : 0; }
                else { missBy = ae - w; e = HARSH ? M.Sign(e) * (.018 + (ae - w) * 2.6) + (R.Next() - .5) * (ae - w) * 1.4 : M.Sign(e) * (.012 + (ae - w) * 1.6); }
            }
            double D = Math.Max(lie == "green" ? .3 : .05, puttMax * power * (HARSH ? 1 - Math.Min(.3, missBy * 2.4 * S.Cm.PuttD) : 1)), mu = Mu(lie);
            double a = aim - e * (HARSH ? 1.45 : 1.1) * S.Cm.PuttB(M.Hypot(bx - C.pin[0], by - C.pin[1])); var (dx, dy) = M.Dir(a); double v = Math.Sqrt(2 * mu * D);
            return new Stroke { vx = dx * v, vy = dy * v, D = D, missBy = missBy, perfect = perfect, miss = miss };
        }
    }
}

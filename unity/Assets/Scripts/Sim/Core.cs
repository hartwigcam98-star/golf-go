using System;
using System.Collections.Generic;

namespace GolfGo.Sim
{
    /* The web game's own numbers (Resources/tuning.json, exported from the live game): one place to read every table. */
    public class Tuning
    {
        readonly Dictionary<string, object> t;
        public Tuning(string json) { t = (Dictionary<string, object>)MiniJson.Parse(json); }
        public object Raw(string k) => t.TryGetValue(k, out var v) ? v : null;
        public double Num(string k) => Convert.ToDouble(t[k]);
        public Dictionary<string, object> Obj(string k) => t.TryGetValue(k, out var v) ? v as Dictionary<string, object> : null;
        // table[key] or table[key][sub]; null when missing (the JS `?.` / `??` cases)
        public double? Get(string k, string key) { var o = Obj(k); if (o == null || key == null || !o.TryGetValue(key, out var v) || v == null) return null; return v is double d ? d : (double?)null; }
        public double? Get(string k, string key, string sub)
        {
            var o = Obj(k); if (o == null || !o.TryGetValue(key, out var v) || !(v is Dictionary<string, object> d)) return null;
            return d.TryGetValue(sub, out var w) && w is double x ? x : (double?)null;
        }
        public Dictionary<string, object> Shot(string stype) => (Dictionary<string, object>)Obj("SHOTS")[stype];
        public double ShotK(string stype, string k) => Convert.ToDouble(Shot(stype)[k]);
        public List<Club> Clubs()
        {
            var l = new List<Club>();
            foreach (var o in (List<object>)t["CLUBS"])
            {
                var d = (Dictionary<string, object>)o;
                l.Add(new Club
                {
                    id = (string)d["id"], name = (string)d["name"], kind = d.TryGetValue("kind", out var k) ? (string)k : "",
                    carry = d.TryGetValue("carry", out var c) && c is double cc ? cc : 0, roll = d.TryGetValue("roll", out var r) && r is double rr ? rr : 0,
                    apex = d.TryGetValue("apex", out var a) && a is double aa ? aa : 0, loft = d.TryGetValue("loft", out var lf) && lf is double ll ? ll : 1,
                    putter = d.TryGetValue("putter", out var p) && p is bool pb && pb, tid = d.TryGetValue("tid", out var ti) ? ti as string : null
                });
            }
            return l;
        }
    }

    public class Club
    {
        public string id, name, kind, tid; public double carry, roll, apex, loft; public bool putter;
        public string Tid => tid ?? id;
        public string Group
        {
            get
            {
                var i = Tid;
                return kind == "wood" ? "wood" : kind == "hybrid" ? "hyb" : (i == "5I" || i == "6I") ? "long" : (i == "7I" || i == "8I") ? "mid" : (i == "9I" || i == "PW") ? "short" : (i == "SW" || i == "LW") ? "sand" : "gap";
            }
        }
    }

    /* The game's seeded dice (mulberry32, start.js rng), bit for bit, so a shot struck with the same seed comes out the same. */
    public class Rng
    {
        int seed;
        public Rng(int s) { seed = s; }
        public double Next()
        {
            unchecked
            {
                seed = seed + 0x6D2B79F5;
                int t = (seed ^ (int)((uint)seed >> 15)) * (1 | seed);
                t = (t + ((t ^ (int)((uint)t >> 7)) * (61 | t))) ^ t;
                return ((uint)(t ^ (int)((uint)t >> 14))) / 4294967296.0;
            }
        }
        // match-state.js gauss(): Box-Muller, redrawing zeros
        public double Gauss() { double u = 0, v = 0; while (u == 0) u = Next(); while (v == 0) v = Next(); return Math.Sqrt(-2 * Math.Log(u)) * Math.Cos(2 * Math.PI * v); }
    }

    /* The ground the sim plays on: heights on the hole's 2-yd grid (hAt), the fine green grid (hFine) and the lie map. */
    public class Course
    {
        public double[] pin, tee; public int par; public double len; public double[][] segs; public double[] line0 = { 0, 0 };
        // h.at: the point s yards along the centreline (and its heading)
        public (double x, double y, double a) At(double s0)
        {
            var g = segs[segs.Length - 1]; foreach (var q in segs) if (s0 <= q[4] + q[3]) { g = q; break; }
            if (s0 < 0) g = segs[0]; double t = s0 - g[4]; return (g[0] + Math.Sin(g[2]) * t, g[1] - Math.Cos(g[2]) * t, g[2]);
        }
        // alongCl: how far along the centreline the nearest point to (x, y) is
        public double AlongCl(double x, double y)
        {
            double best = 1e9, bs = 0;
            for (int i = 0; i < segs.Length; i++)
            {
                var g = segs[i]; double dx = Math.Sin(g[2]), dy = -Math.Cos(g[2]), t = (x - g[0]) * dx + (y - g[1]) * dy;
                double tc = M.Clamp(t, i == 0 ? -1e4 : 0, i == segs.Length - 1 ? 1e4 : g[3]), d = M.Hypot(x - g[0] - dx * tc, y - g[1] - dy * tc);
                if (d < best) { best = d; bs = g[4] + tc; }
            }
            return bs;
        }
        G hg, gg, outer; double lx0, ly0; int lnx, lny; int[] lie; string[] lieNames;
        class G { public double x0, y0, st; public int nx, ny; public double[] d; }
        static G Grid(Dictionary<string, object> o)
        {
            var l = (List<object>)o["data"]; var d = new double[l.Count]; for (int i = 0; i < d.Length; i++) d[i] = Convert.ToDouble(l[i]);
            return new G { x0 = Convert.ToDouble(o["x0"]), y0 = Convert.ToDouble(o["y0"]), st = Convert.ToDouble(o["st"]), nx = Convert.ToInt32(o["nx"]), ny = Convert.ToInt32(o["ny"]), d = d };
        }
        static double[] Arr(object o) { var l = (List<object>)o; var a = new double[l.Count]; for (int i = 0; i < a.Length; i++) a[i] = Convert.ToDouble(l[i]); return a; }
        public Course(string json)
        {
            var o = (Dictionary<string, object>)MiniJson.Parse(json);
            hg = Grid((Dictionary<string, object>)o["hg"]); gg = Grid((Dictionary<string, object>)o["gg"]);
            var lg = (Dictionary<string, object>)o["lg"]; lx0 = Convert.ToDouble(lg["x0"]); ly0 = Convert.ToDouble(lg["y0"]); lnx = Convert.ToInt32(lg["nx"]); lny = Convert.ToInt32(lg["ny"]);
            var ld = (List<object>)lg["data"]; lie = new int[ld.Count]; for (int i = 0; i < lie.Length; i++) lie[i] = Convert.ToInt32(ld[i]);
            var ln = (List<object>)o["lieNames"]; lieNames = new string[ln.Count]; for (int i = 0; i < ln.Count; i++) lieNames[i] = (string)ln[i];
            pin = Arr(o["pin"]); tee = Arr(o["tee"]); par = Convert.ToInt32(o["par"]);
            // the hole's centreline (h.segs: x, y, heading, length, distance from the tee) and the tee spot line0, for aimTarget / onTeeBox
            if (o.TryGetValue("segs", out var sg) && sg is List<object> sl) { segs = new double[sl.Count][]; for (int i = 0; i < sl.Count; i++) segs[i] = Arr(sl[i]); }
            if (o.TryGetValue("line0", out var l0) && l0 is List<object>) line0 = Arr(l0);
            if (o.TryGetValue("len", out var ln) && ln is double lnd) len = lnd;
        }
        // terrain-height.js hAtH: bilinear on the 2-yd grid (outside it the game reads the elevation model; the test hole stays inside)
        public double HAt(double x, double y)
        {
            var g = hg; double fx = (x - g.x0) / g.st, fy = (y - g.y0) / g.st;
            if (outer != null && (fx < 0 || fy < 0 || fx >= g.nx - 1 || fy >= g.ny - 1)) { g = outer; fx = (x - g.x0) / g.st; fy = (y - g.y0) / g.st; }
            if (fx < 0) fx = 0; if (fy < 0) fy = 0; if (fx > g.nx - 1.000001) fx = g.nx - 1.000001; if (fy > g.ny - 1.000001) fy = g.ny - 1.000001;
            int i = (int)fx, j = (int)fy; double tx = fx - i, ty = fy - j; var d = g.d; int n = g.nx;
            return (d[j * n + i] * (1 - tx) + d[j * n + i + 1] * tx) * (1 - ty) + (d[(j + 1) * n + i] * (1 - tx) + d[(j + 1) * n + i + 1] * tx) * ty;
        }
        // beyond the hole's grid the web game reads the course's elevation model (demRel); the sim uses the web game's own heights
        // there, sampled every 4 yd (troy1_sim.json "wide"): close, not bit for bit, and only out of bounds
        public bool Outside(double x, double y) { var g = hg; double fx = (x - g.x0) / g.st, fy = (y - g.y0) / g.st; return fx < 0 || fy < 0 || fx >= g.nx - 1 || fy >= g.ny - 1; }
        public void SetOuter(double x0, double y0, double st, int nx, int ny, double[] d) { outer = new G { x0 = x0, y0 = y0, st = st, nx = nx, ny = ny, d = d }; }
        // hFineH: the 0.5-yd grid round the green, else hAt
        public double HFine(double x, double y)
        {
            var q = gg; double fx = (x - q.x0) / q.st, fy = (y - q.y0) / q.st;
            if (fx >= 0 && fy >= 0 && fx < q.nx - 1 && fy < q.ny - 1)
            {
                int i = (int)fx, j = (int)fy; double tx = fx - i, ty = fy - j; var d = q.d; int n = q.nx;
                return (d[j * n + i] * (1 - tx) + d[j * n + i + 1] * tx) * (1 - ty) + (d[(j + 1) * n + i] * (1 - tx) + d[(j + 1) * n + i + 1] * tx) * ty;
            }
            return HAt(x, y);
        }
        public (double, double) Grad(double x, double y) => (HFine(x + .5, y) - HFine(x - .5, y), HFine(x, y + .5) - HFine(x, y - .5));
        // lieCodeAt: the 1-yd surface grid (rounded to the nearest cell)
        public string Lie(double x, double y)
        {
            int i = (int)Math.Floor(x - lx0 + .5), j = (int)Math.Floor(y - ly0 + .5);
            if (i < 0 || j < 0 || i >= lnx || j >= lny) return "ob";
            int c = lie[j * lnx + i]; return c >= 0 && c < lieNames.Length ? lieNames[c] : "ob";
        }
    }

    public static class M
    {
        public static double Clamp(double v, double a, double b) => v < a ? a : v > b ? b : v;
        public static double Hyp(double a, double b) => Math.Sqrt(a * a + b * b);
        // Math.hypot as V8 computes it (scaled by the larger value, Kahan sum): plain sqrt(a*a+b*b) can differ in the last bit,
        // and a roll that runs thousands of steps can carry that difference to a stop/no-stop decision
        public static double Hypot(double a, double b)
        {
            a = Math.Abs(a); b = Math.Abs(b); double max = Math.Max(a, b);
            if (double.IsInfinity(max)) return double.PositiveInfinity; if (double.IsNaN(a) || double.IsNaN(b)) return double.NaN; if (max == 0) return 0;
            double sum = 0, comp = 0;
            double n = a / max, summand = n * n - comp, pre = sum + summand; comp = (pre - sum) - summand; sum = pre;   // (unrolled: no allocation per call)
            n = b / max; summand = n * n - comp; pre = sum + summand; sum = pre;
            return Math.Sqrt(sum) * max;
        }
        public static (double, double) Dir(double a) => (Math.Sin(a), -Math.Cos(a));
        public static double Sign(double v) => v > 0 ? 1 : v < 0 ? -1 : 0;
    }
}

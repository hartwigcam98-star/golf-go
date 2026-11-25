using System;
using System.Collections.Generic;
using System.IO;
using GolfGo.Sim;

/* Parity test: every case in strike_cases.json was struck in the web game (headless, neutral golfer) with its seed; the C# sim
   strikes the same and must give the same flight to 1e-6. Run: dotnet run --project unity/SimTests */
static class Program
{
    static int Main()
    {
        string dir = AppContext.BaseDirectory, root = FindUp(dir, "Assets");
        var T = new Tuning(File.ReadAllText(Path.Combine(root, "Assets/Resources/tuning.json")));
        var C = new Course(File.ReadAllText(Path.Combine(root, "Assets/Resources/troy1.json")));
        var S = new Strike(T, C);
        var cases = (List<object>)MiniJson.Parse(File.ReadAllText(Path.Combine(root, "SimTests/strike_cases.json")));
        int bad = 0, n = 0;
        foreach (Dictionary<string, object> c in cases)
        {
            n++;
            var s = new ShotIn
            {
                bx = D(c["bx"]), by = D(c["by"]), aim = D(c["aim"]), power = D(c["power"]), e = c["e"] == null ? (double?)null : D(c["e"]),
                club = (string)c["club"], lie = (string)c["lie"], stype = (string)c["stype"], impX = D(c["impX"]), impY = D(c["impY"]), traj = (int)D(c["traj"]),
                pshot = (bool)c["pshot"], aiTurn = (bool)c["aiTurn"], onTeeBox = (bool)c["onTeeBox"], windA = D(c["windA"]), windMph = D(c["windMph"])
            };
            var o = (Dictionary<string, object>)c["out"]; Flight f;
            try { f = S.Hit(s, (int)D(c["seed"])); }
            catch (Exception ex) { Console.WriteLine($"case {n}: {ex.Message}"); bad++; continue; }
            var land = (List<object>)o["land"]; var q = f.Pos(1);
            var diffs = new List<string>();
            void Chk(string k, double a, double b) { if (Math.Abs(a - b) > 1e-6 * Math.Max(1, Math.Abs(b))) diffs.Add($"{k} {a:G9} vs web {b:G9}"); }
            Chk("carry", f.carry, D(o["carry"])); Chk("lat", f.lat, D(o["lat"])); Chk("wx", f.wx, D(o["wx"])); Chk("wy", f.wy, D(o["wy"]));
            Chk("apex", f.apex, D(o["apex"])); Chk("T", f.T, D(o["T"])); Chk("rollMul", f.rollMul, D(o["rollMul"])); Chk("back", f.back, D(o["back"]));
            Chk("full", f.full, D(o["full"])); Chk("y0", f.y0, D(o["y0"])); Chk("missBy", f.missBy, D(o["missBy"]));
            Chk("landX", q.x, D(land[0])); Chk("landY", q.y, D(land[1]));
            if (f.fly != (bool)o["fly"]) diffs.Add($"fly {f.fly} vs web {o["fly"]}");
            if (diffs.Count > 0) { bad++; Console.WriteLine($"case {n} ({s.club} {s.lie} p{s.power} e{s.e}): " + string.Join("; ", diffs)); }
        }
        Console.WriteLine($"strike parity: {n - bad}/{n} cases match the web game");
        int lbad = Landings(root, S, C);
        return bad == 0 && lbad == 0 ? 0 : 1;
    }

    /* Stage 2: each case in land_cases.json is a shot the web game struck on Troy Burne 1, then flew, bounced and rolled to rest
       at 60 steps a second with its landing seed. The C# ball gets the same flight and seed and must end in the same place
       (1e-6 yd), the same way (rest / holed / water / ob, and how), on the same frame, having drawn the same dice. */
    static int Landings(string root, Strike S, Course C)
    {
        var H = new SimHole(File.ReadAllText(Path.Combine(root, "Assets/Resources/troy1_sim.json")));
        var cases = (List<object>)MiniJson.Parse(File.ReadAllText(Path.Combine(root, "SimTests/land_cases.json")));
        int bad = 0, n = 0; var kinds = new Dictionary<string, int>();
        foreach (Dictionary<string, object> c in cases)
        {
            n++;
            var fl = (Dictionary<string, object>)c["flight"];
            double F(string k) => fl.TryGetValue(k, out var v) && v is double d ? d : 0;
            var f = new Flight
            {
                sx = F("sx"), sy = F("sy"), y0 = F("y0"), dx = F("dx"), dy = F("dy"), px = F("px"), py = F("py"), carry = F("carry"), lat = F("lat"), wx = F("wx"), wy = F("wy"),
                apex = F("apex"), T = F("T"), rollMul = fl.ContainsKey("rollMul") ? F("rollMul") : 1, rel = F("rel"), back = F("back"), full = F("full"),
                fly = fl.TryGetValue("fly", out var fy) && fy is bool fb && fb, club = (string)fl["club"], stype = fl.TryGetValue("stype", out var st) ? (string)st : "full"
            };
            var w = (Dictionary<string, object>)c["wind"];
            var b = new Ball(H, C, S) { windA = D(w["a"]), windMph = D(w["mph"]), flagOut = false };
            b.Launch(f, (int)D(c["lseed"]));
            var trace = (List<object>)c["trace"]; int frames = 0, ti = 0; string firstOff = null;
            while (b.Moving && frames < 60 * 40)
            {
                frames++; b.Step(1.0 / 60);
                if (frames % 15 == 0 && ti < trace.Count && firstOff == null)
                {
                    var t = (List<object>)trace[ti++]; double tx = D(t[2]), ty = D(t[3]);
                    if (Math.Abs(b.x - tx) > 1e-3 || Math.Abs(b.y - ty) > 1e-3) firstOff = $"frame {frames}: C# ({b.x:F4},{b.y:F4},{b.state}) vs web ({tx},{ty},{t[1]})";
                }
            }
            var o = (Dictionary<string, object>)c["out"]; var q = b.outcome;
            string wk = (string)o["kind"]; bool gim = o.TryGetValue("gimme", out var gv) && gv is bool gb && gb;
            if (wk == "rest" && gim) wk = "holed";
            string wantHow = gim ? "Gimme" : o.TryGetValue("how", out var hw) ? (string)hw ?? "" : "";
            var diffs = new List<string>();
            if (q == null) diffs.Add($"no outcome (state {b.state})");
            else
            {
                if (q.kind != wk) diffs.Add($"kind {q.kind} vs web {wk}");
                if (wk == "holed" && q.how != wantHow) diffs.Add($"how '{q.how}' vs web '{wantHow}'");
                bool beyond = wk == "ob" && C.Outside(D(o["x"]), D(o["y"]));   // out there the heights are sampled (Course.SetOuter)
                double tol = beyond ? .5 : 1e-6;
                if (Math.Abs(q.x - D(o["x"])) > tol || Math.Abs(q.y - D(o["y"])) > tol) diffs.Add($"at ({q.x:G10},{q.y:G10}) vs web ({D(o["x"]):G10},{D(o["y"]):G10})");
                if (q.dice != (int)D(o["d"])) diffs.Add($"dice {q.dice} vs web {D(o["d"])}");
                if (wk == "rest" && q.lie != (string)o["lie"]) diffs.Add($"lie {q.lie} vs web {o["lie"]}");
                if (wk == "rest" && q.plie != (string)o["plie"]) diffs.Add($"feels {q.plie} vs web {o["plie"]}");
                bool wr = o.TryGetValue("relief", out var rv) && rv is List<object>; if (wk == "rest" && (q.relief != null) != wr) diffs.Add("cart-path relief differs");
                if (Math.Abs(frames - (int)D(c["frames"])) > (beyond ? 2 : 0)) diffs.Add($"frames {frames} vs web {D(c["frames"])}");
            }
            string key = wk + (wk == "rest" ? ":" + o["lie"] : ""); kinds[key] = kinds.TryGetValue(key, out var kc) ? kc + 1 : 1;
            if (diffs.Count > 0) { bad++; Console.WriteLine($"land {n} ({f.club} from {D(c["bx"]):F0},{D(c["by"]):F0}): " + string.Join("; ", diffs) + (firstOff != null ? " | first off at " + firstOff : "")); }
        }
        var ks = new List<string>(); foreach (var kv in kinds) ks.Add(kv.Key + " " + kv.Value);
        Console.WriteLine($"landing parity: {n - bad}/{n} cases match the web game ({string.Join(", ", ks)})");
        return bad;
    }
    static double D(object o) => Convert.ToDouble(o);
    static string FindUp(string d, string name) { var x = new DirectoryInfo(d); while (x != null && !Directory.Exists(Path.Combine(x.FullName, name))) x = x.Parent; return x?.FullName ?? throw new Exception("unity folder not found"); }
}

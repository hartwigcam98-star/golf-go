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
        return bad == 0 ? 0 : 1;
    }
    static double D(object o) => Convert.ToDouble(o);
    static string FindUp(string d, string name) { var x = new DirectoryInfo(d); while (x != null && !Directory.Exists(Path.Combine(x.FullName, name))) x = x.Parent; return x?.FullName ?? throw new Exception("unity folder not found"); }
}

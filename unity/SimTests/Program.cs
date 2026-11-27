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
        var C = new Course(File.ReadAllText(Path.Combine(root, "Assets/Resources/troy/h01.json")));
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
        int sbad = ShortGame(root, S, C, "short_cases.json");
        int pbad = Putting(root, S, C, "putt_cases.json");
        // each of the Unity game's golfers (Dex, Andre, Danny: their own charMods, the standard bag), short game, full shots and putts
        // ... and with gear in the bag (short_cases_<golfer>_<drv-irn-wdg-ptr-ball>.json, putt_cases_<golfer>_<putter>.json)
        foreach (var f in Directory.GetFiles(Path.Combine(root, "SimTests"), "short_cases_*.json")) sbad += ShortGame(root, S, C, Path.GetFileName(f));
        foreach (var f in Directory.GetFiles(Path.Combine(root, "SimTests"), "putt_cases_*.json")) pbad += Putting(root, S, C, Path.GetFileName(f));
        S.Cm = CharMods.Neutral;
        int rbad = RoundFlow(root, T);
        return bad == 0 && lbad == 0 && sbad == 0 && pbad == 0 && rbad == 0 ? 0 : 1;
    }

    /* Stage 2: each case in land_cases.json is a shot the web game struck on Troy Burne 1, then flew, bounced and rolled to rest
       at 60 steps a second with its landing seed. The C# ball gets the same flight and seed and must end in the same place
       (1e-6 yd), the same way (rest / holed / water / ob, and how), on the same frame, having drawn the same dice. */
    static int Landings(string root, Strike S, Course C)
    {
        var H = new SimHole(File.ReadAllText(Path.Combine(root, "Assets/Resources/troy/h01_sim.json")));
        var cases = (List<object>)MiniJson.Parse(File.ReadAllText(Path.Combine(root, "SimTests/land_cases.json")));
        int bad = 0, n = 0; var kinds = new Dictionary<string, int>();
        foreach (Dictionary<string, object> c in cases)
        {
            n++;
            var w = (Dictionary<string, object>)c["wind"];
            var b = new Ball(H, C, S) { windA = D(w["a"]), windMph = D(w["mph"]), flagOut = false };
            bool roll = c.ContainsKey("roll"); string label = roll ? "roll" : "";
            if (roll) b.LaunchRoll(D(c["bx"]), D(c["by"]), D(c["vx"]), D(c["vy"]), (int)D(c["lseed"]));
            else {
            var fl = (Dictionary<string, object>)c["flight"];
            double F(string k) => fl.TryGetValue(k, out var v) && v is double d ? d : 0;
            var f = new Flight
            {
                sx = F("sx"), sy = F("sy"), y0 = F("y0"), dx = F("dx"), dy = F("dy"), px = F("px"), py = F("py"), carry = F("carry"), lat = F("lat"), wx = F("wx"), wy = F("wy"),
                apex = F("apex"), T = F("T"), rollMul = fl.ContainsKey("rollMul") ? F("rollMul") : 1, rel = F("rel"), back = F("back"), full = F("full"),
                fly = fl.TryGetValue("fly", out var fy) && fy is bool fb && fb, club = (string)fl["club"], stype = fl.TryGetValue("stype", out var st) ? (string)st : "full"
            };
            b.Launch(f, (int)D(c["lseed"])); label = f.club; }
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
            if (diffs.Count > 0) { bad++; Console.WriteLine($"land {n} ({label} from {D(c["bx"]):F0},{D(c["by"]):F0}): " + string.Join("; ", diffs) + (firstOff != null ? " | first off at " + firstOff : "")); }
        }
        var ks = new List<string>(); foreach (var kv in kinds) ks.Add(kv.Key + " " + kv.Value);
        Console.WriteLine($"landing parity: {n - bad}/{n} cases match the web game ({string.Join(", ", ks)})");
        return bad;
    }
    /* Stage 3: short-game shots round the green (short_cases.json, a neutral golfer in the web game). Before the swing the meter's
       size, the planned carry and finish and chooseShort's pick must match; then the strike (flight fields, 1e-6) and the landing. */
    // a recorded bag: drv,irn,wdg,ptr,ball (the first recordings had no putter field: drv,irn,wdg,ball)
    static CharMods Bag(CharMods m, string bs) { var q = bs.Split(','); return q.Length == 4 ? m.WithBag(q[0], q[1], q[2], "std", q[3]) : m.WithBag(q[0], q[1], q[2], q[3], q[4]); }
    static int ShortGame(string root, Strike S, Course C, string file)
    {
        var H = new SimHole(File.ReadAllText(Path.Combine(root, "Assets/Resources/troy/h01_sim.json")));
        var SG = new Short(S, H, C);
        var cases = (List<object>)MiniJson.Parse(File.ReadAllText(Path.Combine(root, "SimTests/" + file)));
        int bad = 0, n = 0; var kinds = new Dictionary<string, int>();
        foreach (Dictionary<string, object> c in cases)
        {
            n++; var pre = (Dictionary<string, object>)c["pre"]; var w = (Dictionary<string, object>)c["wind"]; var diffs = new List<string>();
            S.Cm = c.TryGetValue("golfer", out var gid) && gid is string gs ? CharMods.For(gs) : CharMods.Neutral;
            if (c.TryGetValue("bag", out var bg) && bg is string bs) S.Cm = Bag(S.Cm, bs);
            // club swaps: the short game's choice takes the club in each slot of the swapped set
            var swap = new Dictionary<string, string>(); if (c.TryGetValue("swap", out var sw) && sw is string sws) foreach (var p in sws.Split(',')) { var q = p.Split(':'); swap[q[0]] = q[1]; }
            SG.Slot = id => swap.TryGetValue(id, out var x) ? x : id;
            void Chk(string k, double a, double b, double tol = 1e-6) { if (Math.Abs(a - b) > tol * Math.Max(1, Math.Abs(b))) diffs.Add($"{k} {a:G9} vs web {b:G9}"); }
            var s = new ShotIn { bx = D(c["bx"]), by = D(c["by"]), aim = D(pre["aim"]), lie = (string)pre["lie"], onTeeBox = (bool)pre["onTee"], buried = (bool)c["buried"], windA = D(w["a"]), windMph = D(w["mph"]) };
            if (c["chose"] is Dictionary<string, object> ch)
            {
                var pick = SG.Choose(new ShotIn { bx = s.bx, by = s.by, aim = s.aim, lie = s.lie, onTeeBox = s.onTeeBox, buried = s.buried, windA = s.windA, windMph = s.windMph, stype = "full", club = "PW" });
                string want = ch["stype"] + " " + ch["club"], got = pick == null ? "none" : pick.Value.stype + " " + pick.Value.club;
                if (want != got) diffs.Add($"chooseShort {got} vs web {want}");
            }
            s.stype = (string)pre["stype"]; s.club = (string)pre["club"];
            s.swMax = SG.SetMax(s); Chk("swMax", s.swMax, D(pre["swMax"]));
            Chk("natMax", SG.NatMax(S.Club(s.club), s), D(pre["natMax"])); Chk("window", S.PerfectWin(S.Club(s.club), s), D(pre["win"]));
            if (pre["plan"] is Dictionary<string, object> pl)
            {
                var P = SG.PlanFor(s); Chk("plan carry", P.carry, D(pl["carry"])); var fin = (List<object>)pl["fin"]; Chk("plan finish x", P.F.x, D(fin[0])); Chk("plan finish y", P.F.y, D(fin[1]));
                if (P.F.L != (string)pl["landL"]) diffs.Add($"plan lands on {P.F.L} vs web {pl["landL"]}");
                if (P.over != (bool)pl["over"]) diffs.Add("plan over differs");
            }
            s.swMax = D(pre["swMax"]);   // (the strike from the web game's own numbers, so one difference doesn't hide the next)
            s.power = D(pre["power"]); s.e = c["e"] == null ? (double?)null : D(c["e"]); s.sandRel = H.sandRel;
            Flight f = null;
            try { f = S.Hit(s, (int)D(c["seed"])); } catch (Exception ex) { diffs.Add("strike: " + ex.Message); }
            var fl = (Dictionary<string, object>)c["flight"];
            double F(string k) => fl.TryGetValue(k, out var v) && v is double d ? d : 0;
            if (f != null)
            {
                foreach (var k in new[] { "carry", "lat", "apex", "T", "rollMul", "rel", "back", "full", "wx", "wy", "y0" })
                    Chk(k, k == "carry" ? f.carry : k == "lat" ? f.lat : k == "apex" ? f.apex : k == "T" ? f.T : k == "rollMul" ? f.rollMul : k == "rel" ? f.rel : k == "back" ? f.back : k == "full" ? f.full : k == "wx" ? f.wx : k == "wy" ? f.wy : f.y0, F(k));
                bool wf = fl.TryGetValue("fly", out var fy) && fy is bool fb && fb; if (f.fly != wf) diffs.Add("fly differs");
                if (diffs.Count == 0)
                {
                    var b = new Ball(H, C, S) { windA = s.windA, windMph = s.windMph, flagOut = false };
                    b.Launch(f, (int)D(c["lseed"])); int frames = 0; while (b.Moving && frames < 60 * 40) { frames++; b.Step(1.0 / 60); }
                    var o = (Dictionary<string, object>)c["out"]; var q = b.outcome;
                    string wk = (string)o["kind"]; bool gim = o.TryGetValue("gimme", out var gv) && gv is bool gb && gb; if (wk == "rest" && gim) wk = "holed";
                    if (q == null) diffs.Add("no outcome");
                    else
                    {
                        if (q.kind != wk) diffs.Add($"kind {q.kind} vs web {wk}");
                        // (a full shot that runs off the hole's height grid: out there the heights are sampled (Course.SetOuter), as in
                        // the landing cases: half a yard and a frame or two; within a yard of the grid's edge too)
                        double ox = D(o["x"]), oy = D(o["y"]); bool beyond = C.Outside(ox, oy) || C.Outside(ox - 1, oy - 1) || C.Outside(ox + 1, oy + 1); double rt = beyond ? .5 : 1e-6;
                        if (Math.Abs(q.x - D(o["x"])) > rt || Math.Abs(q.y - D(o["y"])) > rt) diffs.Add($"rest ({q.x:G9},{q.y:G9}) vs web ({D(o["x"]):G9},{D(o["y"]):G9})");
                        if (q.dice != (int)D(o["d"])) diffs.Add($"dice {q.dice} vs web {D(o["d"])}");
                        if (Math.Abs(frames - (int)D(c["frames"])) > (beyond ? 2 : 0)) diffs.Add($"frames {frames} vs web {D(c["frames"])}");
                    }
                }
            }
            string key = s.stype + "@" + s.lie; kinds[key] = kinds.TryGetValue(key, out var kc) ? kc + 1 : 1;
            if (diffs.Count > 0) { bad++; if (bad <= 40) Console.WriteLine($"short {n} ({s.stype} {s.club} from {s.lie} {D(c["bx"]):F1},{D(c["by"]):F1} e{c["e"]}): " + string.Join("; ", diffs)); }
        }
        var ks = new List<string>(); foreach (var kv in kinds) ks.Add(kv.Key + " " + kv.Value);
        Console.WriteLine($"short-game parity ({file}): {n - bad}/{n} cases match the web game ({string.Join(", ", ks)})");
        return bad;
    }
    /* Stage 4: putts on Troy 1's green and fringe (putt_cases.json): the meter's length, the need, the flag, the window, flag out,
       the stroke's starting velocity, then the roll to rest. */
    static int Putting(string root, Strike S, Course C, string file)
    {
        var H = new SimHole(File.ReadAllText(Path.Combine(root, "Assets/Resources/troy/h01_sim.json")));
        var P = new Putt(S, H, C);
        var cases = (List<object>)MiniJson.Parse(File.ReadAllText(Path.Combine(root, "SimTests/" + file)));
        int bad = 0, n = 0; var kinds = new Dictionary<string, int>();
        foreach (Dictionary<string, object> c in cases)
        {
            n++; var pre = (Dictionary<string, object>)c["pre"]; var diffs = new List<string>();
            S.Cm = c.TryGetValue("golfer", out var gid) && gid is string gs ? CharMods.For(gs) : CharMods.Neutral;
            if (c.TryGetValue("bag", out var bg) && bg is string bs) S.Cm = Bag(S.Cm, bs);
            void Chk(string k, double a, double b, double tol = 1e-6) { if (Math.Abs(a - b) > tol * Math.Max(1, Math.Abs(b))) diffs.Add($"{k} {a:G9} vs web {b:G9}"); }
            double bx = D(c["bx"]), by = D(c["by"]); string lie = (string)pre["lie"];
            var q = P.Need(bx, by, lie); Chk("need", q.need, D(pre["need"])); Chk("d", q.d, D(pre["d"]));
            double pm = P.Max(bx, by, lie); Chk("puttMax", pm, D(pre["puttMax"]));
            var tp = P.TargetPower(bx, by, lie, D(pre["puttMax"]));
            if ((tp == null) != (pre["tp"] == null)) diffs.Add("flag shown differs"); else if (tp != null) Chk("flag", tp.Value, D(pre["tp"]));
            bool fo = Putt.FlagOut(lie, q.d); if (fo != (bool)pre["flagOut"]) diffs.Add("flag out differs");
            if (P.LineClean(bx, by) != (bool)pre["clean"]) diffs.Add("clean line differs");
            Chk("window", P.Window(false), D(pre["win"]));
            var st = P.Hit(bx, by, D(pre["aim"]), lie, D(pre["puttMax"]), D(pre["power"]), c["e"] == null ? (double?)null : D(c["e"]), false, (int)D(c["seed"]));
            var v0 = (List<object>)c["v0"]; Chk("vx", st.vx, D(v0[0])); Chk("vy", st.vy, D(v0[1]));
            if (diffs.Count == 0)
            {
                var b = new Ball(H, C, S) { flagOut = (bool)pre["flagOut"] };
                b.LaunchRoll(bx, by, D(v0[0]), D(v0[1]), (int)D(c["lseed"])); int frames = 0; while (b.Moving && frames < 60 * 40) { frames++; b.Step(1.0 / 60); }
                var o = (Dictionary<string, object>)c["out"]; var oc = b.outcome;
                string wk = (string)o["kind"]; bool gim = o.TryGetValue("gimme", out var gv) && gv is bool gb && gb; if (wk == "rest" && gim) wk = "holed";
                string how = gim ? "Gimme" : o.TryGetValue("how", out var hw) ? (string)hw ?? "" : "";
                if (oc == null) diffs.Add("no outcome");
                else
                {
                    if (oc.kind != wk) diffs.Add($"kind {oc.kind} vs web {wk}");
                    else if (wk == "holed" && oc.how != how) diffs.Add($"how '{oc.how}' vs web '{how}'");
                    Chk("rest x", oc.x, D(o["x"])); Chk("rest y", oc.y, D(o["y"]));
                    if (oc.dice != (int)D(o["d"])) diffs.Add($"dice {oc.dice} vs web {D(o["d"])}");
                    if (frames != (int)D(c["frames"])) diffs.Add($"frames {frames} vs web {D(c["frames"])}");
                }
                string key = lie + ":" + wk + (how != "" ? "/" + how : ""); kinds[key] = kinds.TryGetValue(key, out var kc) ? kc + 1 : 1;
            }
            if (diffs.Count > 0) { bad++; if (bad <= 40) Console.WriteLine($"putt {n} ({lie} {bx:F2},{by:F2} e{c["e"]}): " + string.Join("; ", diffs)); }
        }
        var ks = new List<string>(); foreach (var kv in kinds) ks.Add(kv.Key + " " + kv.Value);
        Console.WriteLine($"putting parity ({file}): {n - bad}/{n} cases match the web game ({string.Join(", ", ks)})");
        return bad;
    }
    /* Stage 5: all 18 holes (round_cases.json): each hole's wind, prepareShot from the tee and spots all over the hole (lie, aim,
       club, shot type, meter sizes, flag out), and shots into the water: the path, where it crossed, the relief options and the best. */
    static int RoundFlow(string root, Tuning T)
    {   // Troy Burne (round_cases.json), then every other course with its own cases (round_cases_<course>.json)
        int bad = 0;
        foreach (var f in Directory.GetFiles(Path.Combine(root, "SimTests"), "round_cases*.json"))
        {
            var nm = Path.GetFileNameWithoutExtension(f); string cid = nm == "round_cases" ? "troy" : nm.Substring("round_cases_".Length);
            bad += RoundFlow(root, T, f, cid);
        }
        return bad;
    }
    static int RoundFlow(string root, Tuning T, string file, string cid)
    {
        var holes = (List<object>)MiniJson.Parse(File.ReadAllText(file));
        int bad = 0, n = 0, nw = 0;
        foreach (Dictionary<string, object> hc in holes)
        {
            int hn = (int)D(hc["hole"]); string nn = hn.ToString("00");
            string cdir = Directory.Exists(Path.Combine(root, $"Assets/Courses/{cid}")) ? $"Assets/Courses/{cid}" : $"Assets/Resources/{cid}";   // (downloadable courses live in Assets/Courses)
            var C = new Course(File.ReadAllText(Path.Combine(root, $"{cdir}/h{nn}.json")));
            var H = new SimHole(File.ReadAllText(Path.Combine(root, $"{cdir}/h{nn}_sim.json")));
            var S = new Strike(T, C); var R = new Round(S, H, C, new Short(S, H, C), new Putt(S, H, C));
            void Bad(string what) { bad++; if (bad <= 40) Console.WriteLine($"{cid} hole {hn}: {what}"); }
            n++; var w = (Dictionary<string, object>)hc["wind"]; var hw = Round.HoleWind((int)D(hc["roundSeed"]), hn - 1);
            if (Math.Abs(hw.a - D(w["a"])) > 1e-9 || hw.mph != D(w["mph"])) Bad($"wind {hw.a:F4}/{hw.mph} vs web {D(w["a"]):F4}/{D(w["mph"])}");
            foreach (Dictionary<string, object> p in (List<object>)hc["prep"])
            {
                n++; double x = D(p["x"]), y = D(p["y"]); var o = R.Prepare(x, y, false, 0, 0); var d = new List<string>();
                if (o.lie != (string)p["lie"]) d.Add($"lie {o.lie} vs {p["lie"]}");
                if (Math.Abs(o.aim - D(p["aim"])) > 1e-9) d.Add($"aim {o.aim:F6} vs {D(p["aim"]):F6}");
                string club = T.Clubs()[o.club].id; if (club != (string)p["club"]) d.Add($"club {club} vs {p["club"]}");
                if (o.stype != (string)p["stype"]) d.Add($"shot {o.stype} vs {p["stype"]}");
                if (Math.Abs(o.swMax - D(p["swMax"])) > 1e-6 * Math.Max(1, D(p["swMax"]))) d.Add($"swMax {o.swMax:G8} vs {D(p["swMax"]):G8}");
                if (Math.Abs(o.puttMax - D(p["puttMax"])) > 1e-6 * Math.Max(1, D(p["puttMax"]))) d.Add($"puttMax {o.puttMax:G8} vs {D(p["puttMax"]):G8}");
                if (o.flagOut != (bool)p["flagOut"]) d.Add("flag out");
                if (R.OnTeeBox(x, y, o.lie) != (bool)p["onTee"]) d.Add("on tee");
                if (d.Count > 0) Bad($"prepare at {x:F1},{y:F1}: " + string.Join("; ", d));
            }
            foreach (Dictionary<string, object> wc in (List<object>)hc["water"])
            {
                n++; nw++; var fl = (Dictionary<string, object>)wc["flight"];
                double F(string k) => fl.TryGetValue(k, out var v) && v is double dd ? dd : 0;
                var f = new Flight { sx = F("sx"), sy = F("sy"), y0 = F("y0"), dx = F("dx"), dy = F("dy"), px = F("px"), py = F("py"), carry = F("carry"), lat = F("lat"), wx = F("wx"), wy = F("wy"), apex = F("apex"), T = F("T"),
                    rollMul = F("rollMul"), rel = F("rel"), back = F("back"), full = F("full"), fly = fl.TryGetValue("fly", out var fy) && fy is bool fb && fb, club = (string)fl["club"], stype = "full" };
                var b = new Ball(H, C, S) { windA = 1, windMph = 3 }; b.Launch(f, (int)D(wc["lseed"])); b.RunToRest();
                string kind = wc["kind"] as string ?? "none", got = b.outcome?.kind ?? "none";
                if (kind == "rest" || kind == "none") { if (got != "rest" && got != "holed" && kind == "rest") Bad($"water shot ended {got} vs web rest"); continue; }
                if (got != kind)
                {
                    var wat = wc["opts"] is Dictionary<string, object> wOpt && wOpt.TryGetValue("at", out var wAt) && wAt is List<object> al ? $" (web in at {D(al[0]):F2},{D(al[1]):F2})" : "";
                    Bad($"water shot ended {got} vs web {kind}: from {D(wc["bx"]):F2},{D(wc["by"]):F2} seed {D(wc["lseed"])}, ended at {b.x:F2},{b.y:F2} lie {H.Lie(b.x, b.y)}" + wat); continue;
                }
                if (kind != "water") continue;
                var op = (Dictionary<string, object>)wc["opts"]; var prev = new[] { D(wc["bx"]), D(wc["by"]) }; var at = new[] { b.x, b.y };
                var rec = new List<double[]>(b.rec) { at };   // (endRec adds the spot it went in)
                var Cx = R.WaterCross(prev, rec, at); var wC = (List<object>)op["C"];
                if (Math.Abs(Cx[0] - D(wC[0])) > 1e-6 || Math.Abs(Cx[1] - D(wC[1])) > 1e-6) { Bad($"crossed at {Cx[0]:F3},{Cx[1]:F3} vs web {D(wC[0]):F3},{D(wC[1]):F3}"); continue; }
                var opts = R.ReliefOpts(Cx, prev); var wo = (List<object>)op["o"];
                if (opts.Count != wo.Count) { Bad($"{opts.Count} relief options vs web {wo.Count}"); continue; }
                for (int i = 0; i < opts.Count; i++)
                {
                    var q = (Dictionary<string, object>)wo[i];
                    if (opts[i].k != (string)q["k"] || Math.Abs(opts[i].x - D(q["x"])) > 1e-6 || Math.Abs(opts[i].y - D(q["y"])) > 1e-6 || opts[i].L != (string)q["L"])
                        Bad($"relief {i}: {opts[i].k} {opts[i].x:F3},{opts[i].y:F3} {opts[i].L} vs web {q["k"]} {D(q["x"]):F3},{D(q["y"]):F3} {q["L"]}");
                }
                if (Round.Best(opts).k != (string)op["best"]) Bad($"best relief {Round.Best(opts).k} vs web {op["best"]}");
            }
        }
        Console.WriteLine($"round parity, {cid}: {n - bad}/{n} checks match the web game ({holes.Count} holes: winds, shot setups, {nw} water shots and their relief)");
        return bad;
    }
    static double D(object o) => Convert.ToDouble(o);
    static string FindUp(string d, string name) { var x = new DirectoryInfo(d); while (x != null && !Directory.Exists(Path.Combine(x.FullName, name))) x = x.Parent; return x?.FullName ?? throw new Exception("unity folder not found"); }
}

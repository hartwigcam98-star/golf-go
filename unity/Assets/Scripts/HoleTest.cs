using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/* Golf Go, Unity test (Nov 2026): one real hole (Troy Burne 1) from the web game's own data, to measure how smoothly a native
   build runs on the same phones. Ground (heights + painted course map), measured trees, a golfer, a two-tap swing, ball flight
   with the web game's drag curve, roll with slopes, putting, holing out. 120 Hz where the screen allows it; the FPS readout
   is top left. Everything is built in code, hole by hole, from Resources/troy/hNN*.json, hNN_ground.jpg and hNN_light.png. */
public class HoleTest : MonoBehaviour
{
    GolfGo.Sim.Tuning TU; GolfGo.Sim.Course CO; GolfGo.Sim.Strike SK; GolfGo.Sim.Flight FL; GolfGo.Sim.SimHole SH; GolfGo.Sim.Ball SB; GolfGo.Sim.Short SG; GolfGo.Sim.Putt PT; GolfGo.Sim.Round RD; float simAcc; int evSeen;
    // stage 5: the round (Troy Burne's 18), the hole being played, scores, the round's seed (pins and wind), the hole's objects
    readonly List<UnityEngine.Object> holeAssets = new List<UnityEngine.Object>();
    // stage 6: the web game's golfer (recorded body and swing), the swing's clock from the strike, how far back he went
    WaterReflect WR; Material waterMat;
    Golfer GF; string golferId; float swingClock = -1, swingBack = 1, launchAt;
    // the golfer's own game with the bag the player built (Cam, Nov 25: "bring back the build your bag")
    static string[] BagNow() { var q = PlayerPrefs.GetString("bag", "std,std,std,std,std").Split(','); return q.Length == 5 ? q : new[] { "std", "std", "std", "std", "std" }; }
    static GolfGo.Sim.CharMods GolferMods(string id) { var q = BagNow(); return GolfGo.Sim.CharMods.For(id).WithBag(q[0], q[1], q[2], q[3], q[4]); }
    // BAG_SLOTS (golfers.js): each slot's models, with what each gains (+) and gives up (−)
    static readonly (string k, string name, (string id, string name, string[] g, string[] c)[] m)[] BAG_SLOTS = {
        ("drv", "Driver & woods", new[] { ("std", "Standard", new string[0], new string[0]),
            ("bomb", "Bomber", new[] { "+5% carry with woods", "Rolls out a little more" }, new[] { "Wood misses stray 10% wider" }),
            ("max", "Max forgiveness", new[] { "Wood misses stray 15% less", "Mistimed woods lose half the distance" }, new[] { "\u22123.5% carry with woods" }),
            ("shape", "Shaper", new[] { "Draws and fades 40% stronger with woods" }, new[] { "Perfect window 10% smaller with woods" }) }),
        ("irn", "Irons & hybrid", new[] { ("std", "Standard", new string[0], new string[0]),
            ("cav", "Cavity back", new[] { "+3% carry", "Mistimed shots lose 30% less" }, new[] { "Rolls out 25% more on greens", "Shaping 20% weaker" }),
            ("forged", "Forged", new[] { "Checks up 15% more", "Shaping 15% stronger" }, new[] { "\u22122% carry" }),
            ("blade", "Blades", new[] { "Perfect strikes bite twice as hard", "Shaping 35% stronger" }, new[] { "Perfect window 8% smaller", "Mistimed shots lose 20% more" }) }),
        ("wdg", "Wedges", new[] { ("std", "Standard", new string[0], new string[0]),
            ("high", "High bounce", new[] { "Bunker shot window 15% bigger", "Rough and fescue hurt chips and pitches 40% less" }, new[] { "Flop and spinner windows 20% smaller" }),
            ("low", "Low bounce", new[] { "Flop and spinner windows 20% bigger", "A little more backspin" }, new[] { "Bunker window 15% smaller", "Rough and fescue hurt chips and pitches 40% more" }),
            ("milled", "Milled spin", new[] { "Chips and pitches check 30% more", "Backspin 30% stronger" }, new[] { "Mishit chips and pitches go 20% further wrong" }) }),
        ("ptr", "Putter", new[] { ("std", "Standard", new string[0], new string[0]),
            ("blade", "Blade", new[] { "Finer putting meter: the same tap misses the pace 15% less" }, new[] { "Line wanders 15% more" }),
            ("mallet", "Mallet", new[] { "Line wanders 10% less" }, new[] { "Coarser putting meter: pace misses 25% more" }),
            ("lock", "Arm-lock", new[] { "Inside 12 ft the line wanders 20% less" }, new[] { "Beyond 30 ft: line 15% wider, pace misses 40% more" }) }),
        ("ball", "Ball", new[] { ("std", "Standard", new string[0], new string[0]),
            ("dist", "Distance", new[] { "+2% carry on every club" }, new[] { "Chips and pitches release 25% more", "Less backspin, wind moves it 5% more" }),
            ("ure", "Tour urethane", new[] { "Approaches roll 10% less, short game checks 15% more", "More backspin" }, new[] { "\u22122% carry on every club" }),
            ("low", "Low spin", new[] { "Wind moves it 20% less" }, new[] { "Shaping 30% weaker", "Approaches roll out 20% more, chips 10% more" }) }) };
    static string GearLine((string id, string name, string[] g, string[] c) m) => m.id == "std" ? "Balanced: no strengths, no weaknesses" : string.Join(" \u00b7 ", System.Linq.Enumerable.Concat(System.Linq.Enumerable.Select(m.g, t => "+ " + t), System.Linq.Enumerable.Select(m.c, t => "\u2212 " + t)));
    // the bag panel (renderBag): each slot and its model; tap a slot to pick another
    string BagSummary() { var q = BagNow(); var n = new List<string>(); for (int i = 0; i < 5; i++) if (q[i] != "std") n.Add(System.Array.Find(BAG_SLOTS[i].m, m => m.id == q[i]).name); return n.Count == 0 ? "Standard bag" : string.Join(" \u00b7 ", n); }
    // drawBallGear: Distance is optic yellow, Low spin orange, the rest white (the urethane's red band is left out)
    void BallColour() { var q = BagNow(); var c = q[4] == "dist" ? new Color(1, .93f, .28f) : q[4] == "low" ? new Color(1, .52f, .14f) : Color.white; var r = ball.GetComponent<MeshRenderer>(); r.sharedMaterial.color = c * new Color(.96f, .96f, .94f, 1); }
    // club swaps (CLUB_ALT): slot -> club id, saved as "3W:MD;LW:64"
    static Dictionary<string, string> Swaps()
    {
        var d = new Dictionary<string, string>();
        foreach (var p in PlayerPrefs.GetString("swaps", "").Split(';')) { var q = p.Split(':'); if (q.Length == 2 && GolfGo.Sim.Tuning.ALT.ContainsKey(q[0])) d[q[0]] = q[1]; }
        return d;
    }
    static readonly string[] SwapSlots = { "3W", "5W", "4H", "5I", "GW", "SW", "LW" };
    static string ClubLabel(GolfGo.Sim.Club c) => c.id == "1W" ? "Driver" : c.id == "MD" ? "Mini driver" : c.id == "DI" ? "Driving iron" : c.name;
    void ApplyClubs()
    {
        string cur = C.id; Clubs = TU.ClubSet(Swaps()); RD?.SetClubs(Clubs);
        int k = Clubs.FindIndex(c => c.id == cur); if (k >= 0) ci = k; ci = Mathf.Clamp(ci, 0, Clubs.Count - 1);
        if (st == S.Aim) PrepareShot(false);
    }
    // the yardage table's swaps (renderBag): each swappable slot, what's in it, and its carry for this golfer with this bag
    void ClubsMenu()
    {
        var sw = Swaps(); var opts = new List<(string, string, bool)>(); var stock = TU.Clubs();
        foreach (var sl in SwapSlots)
        {
            var c = sw.TryGetValue(sl, out var id) ? System.Array.Find(GolfGo.Sim.Tuning.ALT[sl], q => q.id == id) : stock.Find(q => q.id == sl);
            var stk = stock.Find(q => q.id == sl);
            opts.Add(("\u21c4 " + stk.name + " slot", ClubLabel(c) + " \u00b7 " + Mathf.RoundToInt((float)(c.carry * SK.Cm.Carry(c))) + "y carry", false));
        }
        opts.Add(("Done", "", true));
        hud.ShowChoice("Your bag", "Club swaps", "Each slot can take a different club.", opts, k => { hud.HideChoice(); if (k < SwapSlots.Length) SwapMenu(SwapSlots[k]); else BagMenu(); });
    }
    void SwapMenu(string sl)
    {
        var sw = Swaps(); var stock = TU.Clubs().Find(q => q.id == sl); var all = new List<GolfGo.Sim.Club> { stock }; all.AddRange(GolfGo.Sim.Tuning.ALT[sl]);
        string cur = sw.TryGetValue(sl, out var id) ? id : sl; var opts = new List<(string, string, bool)>();
        foreach (var c in all) opts.Add((ClubLabel(c), c.deg + "\u00b0 \u00b7 " + Mathf.RoundToInt((float)(c.carry * SK.Cm.Carry(c))) + "y carry", c.id == cur));
        hud.ShowChoice("Your bag", stock.name + " slot", null, opts, k =>
        {
            var c = all[k]; if (c.id == sl) sw.Remove(sl); else sw[sl] = c.id;   // (bagSwap)
            var parts = new List<string>(); foreach (var kv in sw) parts.Add(kv.Key + ":" + kv.Value); PlayerPrefs.SetString("swaps", string.Join(";", parts));
            ApplyClubs(); hud.HideChoice(); ClubsMenu();
        });
    }
    void BagMenu()
    {
        var q = BagNow(); var opts = new List<(string, string, bool)>();
        for (int i = 0; i < 5; i++) { var Sl = BAG_SLOTS[i]; var cur = System.Array.Find(Sl.m, m => m.id == q[i]); if (cur.name == null) cur = Sl.m[0]; opts.Add((Sl.name + " \u00b7 " + cur.name, GearLine(cur), false)); }
        opts.Add(("Club swaps", SwapSummary(), false));
        opts.Add(("Done", "", true));
        hud.ShowChoice("Your bag", "Build your bag", "Every model trades a strength for a weakness.", opts, k => { hud.HideChoice(); if (k < 5) SlotMenu(k); else if (k == 5) ClubsMenu(); else Menu(); });
    }
    string SwapSummary() { var sw = Swaps(); if (sw.Count == 0) return "Stock set"; var n = new List<string>(); foreach (var kv in sw) { var c = System.Array.Find(GolfGo.Sim.Tuning.ALT[kv.Key], q => q.id == kv.Value); if (c != null) n.Add(ClubLabel(c)); } return string.Join(" \u00b7 ", n); }
    void SlotMenu(int i)
    {
        var Sl = BAG_SLOTS[i]; var q = BagNow(); var opts = new List<(string, string, bool)>();
        foreach (var m in Sl.m) opts.Add((m.name, GearLine(m), m.id == q[i]));
        hud.ShowChoice("Your bag", Sl.name, null, opts, k =>
        {
            q[i] = Sl.m[k].id; PlayerPrefs.SetString("bag", string.Join(",", q)); BallColour();
            if (SK != null) { SK.Cm = GolferMods(golferId); if (st == S.Aim) PrepareShot(false); }
            hud.HideChoice(); BagMenu();
        });
    }
    // each golfer's trait (golfers.js), shown when picking
    static string Trait(string id) => id == "ch06" ? "Pure striker: irons and hybrids stray 15% less" : id == "ch28" ? "Pro swing: driver and woods stray 15% less" : id == "ch42" ? "Range rat: perfect strikes +5% with woods, irons bite harder" : "";
    static readonly string[][] Golfers = { new[] { "ch06", "Dex" }, new[] { "ch28", "Andre" }, new[] { "ch42", "Danny" } };
    int hi, roundSeed, roundDiff, holesDone; readonly int[] scores = new int[18], pars = new int[18]; Transform holeRoot; Dictionary<string, object> lightB;
    double puttMax = 10; bool flagOut;   // stage 4: the putter meter's length (yards of roll), the flag out inside 15 ft
    List<GolfGo.Sim.Club> Clubs;
    string stype = "full"; double swMax; bool buried;   // stage 3: the shot type, the short-game meter's size, a plugged lie
    const float IMPACT = .12f; float mpos, mdir = 1, mPower; double windA, windMph;
    Vector2 imp; int traj;   // the strike point (x: draw − / fade +, y: topspin + / backspin −) and the shot height (−1 low, 0, 1 high)
    Hud hud; bool pshot, mapView; float tapMark = -1, aimHeld; bool tapGood;
    static readonly Dictionary<string, float> Mu = new Dictionary<string, float> { { "green", .545f }, { "fairway", 1.2f }, { "tee", 1.2f }, { "cut", 2.4f }, { "rough", 11 }, { "sand", 28 }, { "fescue", 17 } };
    static readonly Dictionary<string, float> Surf = new Dictionary<string, float> { { "green", .9f }, { "fairway", 1.08f }, { "tee", 1.08f }, { "cut", .8f }, { "rough", .35f }, { "sand", .05f }, { "fescue", .15f } };
    const float GACC = 10.7f, CUP = .059f, DRAG = 1.1f;
    static readonly float DRAG_N = 1 - Mathf.Exp(-DRAG);

    HoleData D;
    Camera cam; Transform ball, golfer, club, flag; Mesh ground;
    Vector2 b, prev; float bY; float aim; int ci, strokes;
    enum S { Aim, Power, Acc, Flight, Roll, Holed, Replay } S st = S.Aim;
    float meter, meterDir = 1; // swing meter
    // flight
    Vector2 fs, fd; float fCarry, fApex, fLat, fT, fu, fRollMul; bool fPutt;
    Vector2 rv; // roll velocity
    float swingT = -1;
    // fps
    int fN; float fAcc, fMax; readonly List<float> win = new List<float>();
    Vector3 camPos, camLook;

    // ---------- what went wrong, on screen (a TestFlight build has no console): the first errors, in red over the top of the picture ----------
    static readonly List<string> errs = new List<string>();
    static void OnLog(string msg, string stack, LogType t)
    {
        if (t != LogType.Error && t != LogType.Exception && t != LogType.Assert) return;
        string line = msg + (string.IsNullOrEmpty(stack) ? "" : " @ " + stack.Split('\n')[0]);
        if (errs.Count < 6 && !errs.Contains(line)) errs.Add(line);
    }
    GUIStyle errStyle;
    void OnGUI()
    {
        if (errs.Count == 0) return;
        errStyle ??= new GUIStyle(GUI.skin.label) { fontSize = Mathf.Max(14, Screen.height / 70), wordWrap = true, normal = { textColor = new Color(1, .35f, .3f) } };
        GUI.Label(new Rect(10, Screen.height * .12f, Screen.width - 20, Screen.height * .5f), "Errors:\n" + string.Join("\n", errs), errStyle);
    }
    // a step that may fail on the phone: it logs (and so shows) what went wrong, and the game carries on
    static void Try(string what, System.Action a) { try { a(); } catch (System.Exception e) { Debug.LogError(what + ": " + e.GetType().Name + " " + e.Message + " " + (e.StackTrace ?? "").Split('\n')[0]); } }
    void Awake()
    {
        Application.logMessageReceived += OnLog;
        Application.targetFrameRate = 120; QualitySettings.vSyncCount = 0; Screen.sleepTimeout = SleepTimeout.NeverSleep;
        QualitySettings.shadowDistance = 160; QualitySettings.shadows = ShadowQuality.All; QualitySettings.shadowResolution = ShadowResolution.High;
        // the game's own mechanics (GolfGo.Sim, checked shot for shot against the web game) and its numbers
        TU = new GolfGo.Sim.Tuning(Resources.Load<TextAsset>("tuning").text); Clubs = TU.ClubSet(Swaps());
        lightB = (Dictionary<string, object>)GolfGo.Sim.MiniJson.Parse(Resources.Load<TextAsset>("troy/light_bounds").text);
        BuildWorld(); BuildHud();
        golferId = PlayerPrefs.GetString("golfer", "ch06"); LoadGolfer(golferId); BallColour();
        var sv = LoadSave(); if (sv != null) Welcome(sv); else NewRound();
        // the look check on GitHub's Mac (unity-test.yml): -ggshots <folder> saves pictures of a few holes, then quits
        var args = System.Environment.GetCommandLineArgs(); int ai = System.Array.IndexOf(args, "-ggshots");
        if (ai >= 0 && ai + 1 < args.Length) StartCoroutine(Shots(args[ai + 1]));
    }
    // sunny (the web screenshots' weather), the tee view on four holes in the lower camera, then the higher one and the green from the look camera
    System.Collections.IEnumerator Shots(string dir)
    {
        System.IO.Directory.CreateDirectory(dir); Application.targetFrameRate = 30;
        if (gLook != null && gLook.Ok) Try("weather", () => gLook.Weather(0));
        foreach (int h in new[] { 0, 4, 9, 13 })
        {
            LoadHole(h); CAMV = 1;
            for (int view = 0; view < 3; view++)
            {
                if (view == 1) CAMV = 0;
                if (view == 2) { CAMV = 1; Try("look", LookGreen); }
                yield return new WaitForSecondsRealtime(view == 0 ? 3.5f : 2.5f);
                // the build Mac draws about one frame a second: put the camera where it's going instead of waiting for it to ease there
                camPos = Vector3.zero; if (fc != null) { fc.fly = null; fc.dist = fc.distT; }
                for (int fr = 0; fr < 3; fr++) yield return null;
                yield return new WaitForEndOfFrame();
                var t = new Texture2D(Screen.width, Screen.height, TextureFormat.RGB24, false); t.ReadPixels(new Rect(0, 0, Screen.width, Screen.height), 0, 0); t.Apply();   // (the ScreenCapture module isn't in the build)
                var name = "h" + (h + 1).ToString("00") + "_" + new[] { "tee", "tee_high", "green" }[view] + ".png";
                System.IO.File.WriteAllBytes(System.IO.Path.Combine(dir, name), t.EncodeToPNG()); Destroy(t);
                // the 3D view alone at a phone's size (590 x 1278, the same shape as the window: the same framing), off screen
                Try("hi-res", () =>
                {
                    var rt = new RenderTexture(590, 1278, 24, RenderTextureFormat.ARGB32, RenderTextureReadWrite.sRGB) { antiAliasing = 4 };
                    var keep = cam.targetTexture; cam.targetTexture = rt; cam.Render(); cam.targetTexture = keep;
                    var was = RenderTexture.active; RenderTexture.active = rt;
                    var t2 = new Texture2D(590, 1278, TextureFormat.RGB24, false); t2.ReadPixels(new Rect(0, 0, 590, 1278), 0, 0); t2.Apply(); RenderTexture.active = was;
                    System.IO.File.WriteAllBytes(System.IO.Path.Combine(dir, name.Replace(".png", "_3d.png")), t2.EncodeToPNG()); Destroy(t2); rt.Release(); Destroy(rt);
                });
                Debug.Log("GGSHOT " + name + " " + Screen.width + "x" + Screen.height + " · " + Diag() + (errs.Count > 0 ? " · errors: " + string.Join(" | ", errs) : ""));
            }
            if (fc != null) { Try("look end", LookEnd); yield return new WaitForSecondsRealtime(1.5f); }
        }
        Debug.Log("GGSHOT done"); Application.Quit();
    }

    // ---------- world ----------
    Material M(string n) => Resources.Load<Material>("Mats/" + n);
    string HolePath(string suffix) => "troy/h" + (hi + 1).ToString("00") + suffix;
    // the hole's own objects: ground (heights + course map + baked light), trees, flag; built again for every hole
    void BuildHole()
    {
        if (holeRoot) Destroy(holeRoot.gameObject);
        foreach (var o in holeAssets) if (o) Destroy(o); holeAssets.Clear(); slopeMat = null;
        holeRoot = new GameObject("Hole " + (hi + 1)).transform;
        var g = D.hg; int nx = g.nx, ny = g.ny;
        var v = new Vector3[nx * ny]; var uv = new Vector2[nx * ny];
        for (int j = 0; j < ny; j++) for (int i = 0; i < nx; i++)
        {
            float x = g.x0 + i * g.st, y = g.y0 + j * g.st, h = g.data[j * nx + i];
            v[j * nx + i] = HoleData.U(x, y, h);
            uv[j * nx + i] = new Vector2((x - D.tex.x0) / D.tex.w, 1 - (y - D.tex.y0) / D.tex.h);
        }
        var t = new int[(nx - 1) * (ny - 1) * 6]; int q = 0;
        for (int j = 0; j < ny - 1; j++) for (int i = 0; i < nx - 1; i++)
        { int a = j * nx + i, bb = a + 1, c = a + nx, d = c + 1; t[q++] = a; t[q++] = bb; t[q++] = c; t[q++] = bb; t[q++] = d; t[q++] = c; }
        ground = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32, vertices = v, uv = uv, triangles = t };
        ground.RecalculateNormals(); ground.RecalculateBounds(); holeAssets.Add(ground);
        if (ground.normals.Length > 0 && ground.normals[nx * (ny / 2) + nx / 2].y < 0) { System.Array.Reverse(t); ground.triangles = t; ground.RecalculateNormals(); }
        {   // tangents along east (x), square to the normal: the ground shader's turf normal map and micro-relief use that frame (the web's Tt)
            var nn = ground.normals; var tg = new Vector4[nn.Length];
            for (int k = 0; k < nn.Length; k++) { var tv = (Vector3.right - nn[k] * nn[k].x).normalized; tg[k] = new Vector4(tv.x, tv.y, tv.z, 1); }
            ground.tangents = tg;
        }
        var go = new GameObject("Ground"); go.transform.SetParent(holeRoot); go.AddComponent<MeshFilter>().sharedMesh = ground; var mr = go.AddComponent<MeshRenderer>();
        look = LoadLook();
        var gm = GroundMat(); mr.sharedMaterial = gm; holeAssets.Add(gm);
        // the hole's Blender-baked light as the x2 detail map; its rect can differ from the ground texture's, so map one onto the other
        var lt = Resources.Load<Texture2D>(HolePath("_light")); Shader.SetGlobalFloat("_LightOn", 0); baked = false;
        if (lt != null && gm.shader.name == "GolfGo/Ground")
        {   // the web game's ground shader: the light map in its own rect
            float lx0 = D.tex.x0, ly0 = D.tex.y0, lw = D.tex.w, lh = D.tex.h;
            if (lightB != null && lightB.TryGetValue(hi.ToString(), out var lbo) && lbo is List<object> lb) { lx0 = System.Convert.ToSingle(lb[0]); ly0 = System.Convert.ToSingle(lb[1]); lw = System.Convert.ToSingle(lb[2]); lh = System.Convert.ToSingle(lb[3]); }
            gm.SetTexture("_Light", lt); gm.SetVector("_LB", new Vector4(lx0, ly0, lw, lh)); gm.SetFloat("_LightOn", 1);
            // (the grass blades read the same bake: globals, their shader has no such properties)
            Shader.SetGlobalTexture("_Light", lt); Shader.SetGlobalVector("_LB", new Vector4(lx0, ly0, lw, lh)); Shader.SetGlobalFloat("_LightOn", 1); baked = true;
        }
        else if (lt != null)
        {
            gm.SetTexture("_DetailAlbedoMap", lt); gm.EnableKeyword("_DETAIL_MULX2");
            float lx0 = D.tex.x0, ly0 = D.tex.y0, lw = D.tex.w, lh = D.tex.h;
            if (lightB != null && lightB.TryGetValue(hi.ToString(), out var lbo) && lbo is List<object> lb) { lx0 = System.Convert.ToSingle(lb[0]); ly0 = System.Convert.ToSingle(lb[1]); lw = System.Convert.ToSingle(lb[2]); lh = System.Convert.ToSingle(lb[3]); }
            float sx = D.tex.w / lw, sy = D.tex.h / lh;
            gm.SetTextureScale("_DetailAlbedoMap", new Vector2(sx, sy)); gm.SetTextureOffset("_DetailAlbedoMap", new Vector2((D.tex.x0 - lx0) / lw, 1 - sy - (D.tex.y0 - ly0) / lh));
        }
        mr.receiveShadows = true; mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;   // (live shadows: the golfer's and the buildings'; the trees' only where there's no bake, as the web's r3Shadow)

        // trees: a trunk, and a crown of leaf cards from the web game's leaf atlas (clusters of cards round an ellipsoid, as the game
        // draws them), merged per tint so the whole course is a handful of draw calls
        var cyl = Prim(PrimitiveType.Cylinder); Material bark = M("Bark");
        // the web game's species trees when they're exported for this hole (Trees.cs); the old leaf-card crowns otherwise
        speciesTrees = null; Trees.Cast = !baked; Try("trees", () => speciesTrees = Trees.Available(HolePath("")) ? new Trees(HolePath(""), holeRoot) : null);
        var T = speciesTrees != null ? new float[0] : D.trees; var root = new GameObject("Trees").transform; root.SetParent(holeRoot); var rnd = new System.Random(77);
        var lists = new List<Vector3>[5]; var uvs = new List<Vector2>[5]; var nrm = new List<Vector3>[5];
        for (int z = 0; z < 5; z++) { lists[z] = new List<Vector3>(); uvs[z] = new List<Vector2>(); nrm[z] = new List<Vector3>(); }
        int[] broad = { 2, 3, 6, 7, 13, 15 }, pine = { 10, 11 };
        var trunks = new List<CombineInstance>();
        for (int k = 0; k + 6 < T.Length; k += 7)
        {
            float x = T[k], y = T[k + 1], r = Mathf.Max(.8f, T[k + 2]), gh = T[k + 3], top = Mathf.Max(3, T[k + 4]), cb = T[k + 5]; bool con = T[k + 6] > .5f;
            if (cb <= 0 || cb > top * .8f) cb = top * (con ? .15f : .35f);
            var p = HoleData.U(x, y, gh); float tw = Mathf.Clamp(r * .1f, .12f, .5f);
            trunks.Add(new CombineInstance { mesh = cyl, transform = Matrix4x4.TRS(p + Vector3.up * (cb * .5f + .2f), Quaternion.identity, new Vector3(tw, cb * .5f + .5f, tw)) });
            float ch = top - cb; var c0 = p + Vector3.up * (cb + ch * .5f);
            int tint = con ? 4 : rnd.Next(4), cards = Mathf.Clamp((int)(r * r * ch * .25f), 10, 90);
            for (int n = 0; n < cards; n++)
            {
                // a point on (and a little inside) the crown, facing out; cones for conifers
                var d = new Vector3((float)rnd.NextDouble() * 2 - 1, (float)rnd.NextDouble() * 2 - 1, (float)rnd.NextDouble() * 2 - 1).normalized;
                float k2 = .7f + .3f * (float)rnd.NextDouble();
                Vector3 c;
                if (con) { float h01 = (float)rnd.NextDouble(); float rr = r * (1 - h01) * k2; c = p + Vector3.up * (cb + h01 * ch) + new Vector3(d.x, 0, d.z).normalized * rr; d = new Vector3(d.x, .2f, d.z).normalized; }
                else c = c0 + new Vector3(d.x * r, d.y * ch * .5f, d.z * r) * k2;
                float sz = (con ? 1.2f : 1.6f) * Mathf.Clamp(r * .45f, .8f, 3.2f);
                var right = Vector3.Cross(d, Vector3.up); if (right.sqrMagnitude < 1e-4f) right = Vector3.right; right.Normalize();
                var up = Vector3.Cross(right, d).normalized;
                int cell = con ? pine[rnd.Next(pine.Length)] : broad[rnd.Next(broad.Length)];
                float u0 = (cell % 4) / 4f, v0 = 1 - (cell / 4 + 1) / 4f;
                var LV = lists[tint]; var U2 = uvs[tint]; var N = nrm[tint];
                Vector3 a1 = c - right * sz * .5f - up * sz * .5f, a2 = c + right * sz * .5f - up * sz * .5f, a3 = c + right * sz * .5f + up * sz * .5f, a4 = c - right * sz * .5f + up * sz * .5f;
                // both faces (the Standard shader draws one side)
                foreach (var s2 in new[] { 1f, -1f })
                {
                    LV.Add(a1); LV.Add(s2 > 0 ? a2 : a4); LV.Add(a3); LV.Add(s2 > 0 ? a4 : a2);
                    U2.Add(new Vector2(u0, v0)); U2.Add(s2 > 0 ? new Vector2(u0 + .25f, v0) : new Vector2(u0, v0 + .25f)); U2.Add(new Vector2(u0 + .25f, v0 + .25f)); U2.Add(s2 > 0 ? new Vector2(u0, v0 + .25f) : new Vector2(u0 + .25f, v0));
                    var nn = Vector3.Lerp(d * s2, Vector3.up, .4f).normalized; for (int z = 0; z < 4; z++) N.Add(nn);
                }
            }
        }
        var tm = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 }; tm.CombineMeshes(trunks.ToArray(), true, true); holeAssets.Add(tm);
        var tgo = new GameObject("Trunks"); tgo.transform.SetParent(root); tgo.AddComponent<MeshFilter>().sharedMesh = tm; tgo.AddComponent<MeshRenderer>().sharedMaterial = bark;
        string[] leafMats = { "Leaf0", "Leaf1", "Leaf2", "Leaf3", "Pine" };
        for (int z = 0; z < 5; z++)
        {
            if (lists[z].Count == 0) continue;
            var idx = new int[lists[z].Count / 4 * 6]; for (int i = 0, o = 0; i < lists[z].Count; i += 4) { idx[o++] = i; idx[o++] = i + 2; idx[o++] = i + 1; idx[o++] = i; idx[o++] = i + 3; idx[o++] = i + 2; }
            var lm = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 }; lm.SetVertices(lists[z]); lm.SetUVs(0, uvs[z]); lm.SetNormals(nrm[z]); lm.SetTriangles(idx, 0); lm.RecalculateBounds(); holeAssets.Add(lm);
            var lg = new GameObject(leafMats[z]); lg.transform.SetParent(root); lg.AddComponent<MeshFilter>().sharedMesh = lm; var lr = lg.AddComponent<MeshRenderer>(); lr.sharedMaterial = M(leafMats[z]);
        }
        // flag
        BuildWater(); BuildSkirt();
        Try("buildings", () => Built.Build(HolePath(""), holeRoot, holeAssets));   // the clubhouse, houses, structures, bridges and props (Built.cs)
        // the grass blades (Grass.cs), on this hole's ground textures
        grass?.Dispose(); grass = null; far?.Dispose(); far = null; Try("far trees", () => far = new FarTrees(HolePath(""), holeRoot));   // (the far trees: FarTrees.cs)
        if (slopeMat != null && slopeMat.shader.name == "GolfGo/Ground")
            Try("grass", () => grass = new Grass(D, slopeMat.GetTexture("_Surf"), slopeMat.GetTexture("_MainTex"), slopeMat.GetVector("_GSB"), slopeMat.GetVector("_GB"), slopeMat.GetVector("_TK")));
        float ph = D.H(D.pin[0], D.pin[1]); flag = new GameObject("Flag").transform; flag.SetParent(holeRoot); flag.position = HoleData.U(D.pin[0], D.pin[1], ph);
        Make(flag, cyl, M("White"), flag.position + Vector3.up * 1.2f, new Vector3(.03f, 1.2f, .03f));
        // the flag (r3FlagMesh): a 12 x 4 cloth in the course's colours and emblem (troy/flag.png, r3FlagCanvas), rippled every frame
        if (flagMesh == null)
        {
            flagMesh = new Mesh { name = "Flag cloth" }; flagMesh.MarkDynamic(); var fv = new Vector3[FLAG_N * 2]; var fuv = new Vector2[FLAG_N * 2]; var ft = new List<int>();
            for (int j = 0; j <= 4; j++) for (int i = 0; i <= 12; i++) { int k = j * 13 + i; fuv[k] = fuv[k + FLAG_N] = new Vector2(i / 12f, j / 4f); }
            for (int j = 0; j < 4; j++) for (int i = 0; i < 12; i++)
            {   // both faces (the web's DoubleSide): the back is its own copy, wound the other way, so its normals face out too
                int a = j * 13 + i, c = a + 13; ft.AddRange(new[] { a, c, a + 1, a + 1, c, c + 1 }); int A = a + FLAG_N, Cc = c + FLAG_N; ft.AddRange(new[] { A, A + 1, Cc, A + 1, Cc + 1, Cc });
            }
            flagMesh.vertices = fv; flagMesh.uv = fuv; flagMesh.SetTriangles(ft, 0);
            var ftex = Resources.Load<Texture2D>("troy/flag"); flagMat = new Material(Shader.Find("Standard")); flagMat.SetFloat("_Glossiness", .15f);
            if (ftex) flagMat.mainTexture = ftex; else flagMat.color = new Color(.12f, .31f, .24f);
        }
        var cloth = new GameObject("Cloth").transform; cloth.SetParent(flag, false); cloth.gameObject.AddComponent<MeshFilter>().sharedMesh = flagMesh;
        var clr = cloth.gameObject.AddComponent<MeshRenderer>(); clr.sharedMaterial = flagMat; clr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
        Make(flag, cyl, M("Dark"), flag.position + Vector3.up * .005f, new Vector3(CUP * 2, .01f, CUP * 2));
    }
    // ---------- the ground's look (Stage 6) ----------
    Dictionary<string, object> look; static Texture2D[] groundShared;
    Dictionary<string, object> LoadLook() { var ta = Resources.Load<TextAsset>(HolePath("_look")); return ta == null ? null : (Dictionary<string, object>)GolfGo.Sim.MiniJson.Parse(ta.text); }
    static Vector4 V4(Dictionary<string, object> L, string k, Vector4 d)
    {
        if (L == null || !L.TryGetValue(k, out var o) || !(o is List<object> a) || a.Count < 2) return d;
        float F(int i) => i < a.Count ? System.Convert.ToSingle(a[i]) : 0; return new Vector4(F(0), F(1), F(2), F(3));
    }
    // the hole's ground material: the web game's ground shader (GolfGo/Ground) when it's in the build, else the Standard ground
    Trees speciesTrees; Grass grass; FarTrees far; bool baked;
    /* the ball is drawn at least 2.6 px across its radius (immediate-mode-primitives.js: r = max(.024, 2.6/k)), so it can be followed
       in the air; and the tracer (r3Tracer): a glowing ribbon along the flight up to where it lands, fading once the next shot is set up */
    Mesh trMesh; Material trMat; GameObject trGo; float trFade; GolfGo.Sim.Flight trF; double trLand = 9;
    const int TRN = 160;
    Transform peg, pegCap;
    // pegFor: tee height in ball radii (driver and mini driver high, woods and hybrids middling, irons low)
    float PegFor() => C.putter ? 0 : C.id == "1W" || C.id == "MD" ? 1.5f : C.kind == "wood" || C.kind == "hybrid" ? .65f : .35f;
    void BallAndTracer(float dt)
    {
        Vector3 bc; if (st == S.Replay) bc = ReplayBall(); else bc = HoleData.U(b.x, b.y, bY);
        var sp = cam.WorldToScreenPoint(bc); float k = sp.z > .3f ? VfPx / sp.z / hud.K : 1e3f, r = Mathf.Max(.024f, 2.6f / k);
        // teed up (immediate-mode-primitives.js): the first shot from the tee box sits on a peg (driver high, irons low) until the club gets there
        bool pre = st == S.Flight && GF != null && swingClock >= 0 && swingClock < launchAt;
        float pk = Lie0 == "tee" && !mapView && ((strokes == 0 && AimingSt) || (pre && strokes == 1 && fromLie == "tee")) ? PegFor() : 0;
        ball.localScale = Vector3.one * r * 2; ball.position = bc + Vector3.up * (r + pk * r);
        if (peg == null)
        {
            var pm = new Material(Shader.Find("Standard")) { color = new Color(.957f, .945f, .91f) }; pm.SetFloat("_Glossiness", .35f);
            peg = Make(null, Prims.Get(PrimitiveType.Cylinder), pm, Vector3.zero, Vector3.one); pegCap = Make(null, Prims.Get(PrimitiveType.Cylinder), pm, Vector3.zero, Vector3.one);
        }
        peg.gameObject.SetActive(pk > 0); pegCap.gameObject.SetActive(pk > 0);
        if (pk > 0)
        {   // cylAB(ground - .01 to the ball's foot, r * .16) and a cup on top (r * .16 * 2.6 across, .9 of the peg's radius deep)
            float pr = r * .16f, ph = pk * r;
            peg.position = bc + Vector3.up * ((ph - .01f) / 2); peg.localScale = new Vector3(pr * 2, (ph + .01f) / 2, pr * 2);
            pegCap.position = bc + Vector3.up * (ph - pr * .45f); pegCap.localScale = new Vector3(pr * 5.2f, pr * .45f, pr * 5.2f);
        }
        // the tracer: the live shot's flight (not a putt), drawn up to where it lands
        if (trGo == null)
        {
            trMat = M("Tracer"); if (trMat == null) return;
            trMesh = new Mesh { name = "Tracer" }; trMesh.MarkDynamic(); var idx = new int[(TRN - 1) * 6];
            for (int i = 0; i < TRN - 1; i++) { int a = i * 2, o = i * 6; idx[o] = a; idx[o + 1] = a + 1; idx[o + 2] = a + 2; idx[o + 3] = a + 1; idx[o + 4] = a + 3; idx[o + 5] = a + 2; }
            trMesh.vertices = new Vector3[TRN * 2]; trMesh.uv = new Vector2[TRN * 2]; trMesh.triangles = idx; trMesh.bounds = new Bounds(Vector3.zero, Vector3.one * 1e5f);
            trGo = new GameObject("Tracer"); trGo.AddComponent<MeshFilter>().sharedMesh = trMesh; trGo.AddComponent<MeshRenderer>().sharedMaterial = trMat;
            trGo.GetComponent<MeshRenderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        }
        if (st == S.Flight && SB.f != null && SB.f != trF && !fPutt)
        {   // a new flight: where it comes down (r3TvPlan's search)
            trF = SB.f; trFade = 1; trLand = 2.4;
            for (double u = .5; u < 2.4; u += .01) { var q = trF.Pos(u); if (q.Y <= D.H((float)q.x, (float)q.y) + .03) { trLand = u; break; } }
        }
        if (trF == null || st == S.Replay || mapView) { trGo.SetActive(false); return; }
        if (AimingSt) { trFade = Mathf.Max(0, trFade - dt * 1.5f); if (trFade <= 0) { trF = null; trGo.SetActive(false); return; } }
        double u1 = System.Math.Min(SB.f == trF ? SB.U : trLand, trLand); if (u1 < .01) { trGo.SetActive(false); return; }
        var P = new Vector3[TRN * 2]; var UV = new Vector2[TRN * 2]; var E = cam.transform.position;
        Vector3 F(double u) { var q = trF.Pos(u); return HoleData.U((float)q.x, (float)q.y, (float)q.Y); }
        for (int i = 0; i < TRN; i++)
        {
            double u = u1 * i / (TRN - 1); var p = F(u); var t = F(System.Math.Min(u1, u + .01)) - F(System.Math.Max(0, u - .01));
            var c = E - p; float cd = c.magnitude; if (cd < 1e-3f) cd = 1; var s = Vector3.Cross(t, c); float sl = s.magnitude; if (sl < 1e-6f) sl = 1;
            s *= Mathf.Max(.05f, cd * .0032f) / sl;
            P[i * 2] = p - s; P[i * 2 + 1] = p + s; UV[i * 2] = new Vector2(i / (float)(TRN - 1), 0); UV[i * 2 + 1] = new Vector2(i / (float)(TRN - 1), 1);
        }
        trMesh.vertices = P; trMesh.uv = UV; trMat.SetFloat("_Op", trFade); trGo.SetActive(true);
    }
    // Flight zoom (the web's pause menu: Standard, Closer, Closest): how close the camera frames the ball in flight
    static float TRZ => PlayerPrefs.GetFloat("trz", 1);
    Material slopeMat; float slFade; Vector2 slRotV = new Vector2(1, 0);
    // slopeWanted (webgl-ground.js): on the green, putting, a short shot within 40 yd, a putt rolling, or looking near the green
    bool SlopeWanted()
    {
        if (st == S.Holed && !inCup) return false; bool aiming = AimingSt && !mapView; var pin = new Vector2(D.pin[0], D.pin[1]);
        return Lie0 == "green" || (aiming && C.putter) || (aiming && !C.putter && Short && PinDist <= 40) || (st == S.Roll && fromLie == "green")
            || (fc != null && st == S.Aim && fc.dist < 120 && Vector2.Distance(new Vector2(fc.tx, fc.tz), pin) < 50) || (fc != null && st == S.Aim && fc.fly == null && !C.putter && fc.dist < 160);
    }
    void SlopeGrid(float dt)
    {
        if (slopeMat == null) return;
        slFade += ((SlopeWanted() ? 1 : 0) - slFade) * (1 - Mathf.Exp(-Mathf.Min(.5f, dt) * 7)); if (slFade < .003f) slFade = 0;
        bool moving = st == S.Flight || st == S.Roll || st == S.Holed; var o = st == S.Replay ? rp0 : moving ? prev : b;   // the grid runs ball-to-pin from where the shot was played
        var d = new Vector2(D.pin[0], D.pin[1]) - o; float l = d.magnitude; if (l > .3f) slRotV = d / l;
        slopeMat.SetFloat("_SlOn", slFade); slopeMat.SetVector("_SlRot", new Vector4(slRotV.x, slRotV.y, 0, 0)); slopeMat.SetFloat("_SlDk", PlayerPrefs.GetInt("grid", 0));
    }
    Material GroundMat()
    {
        var gg = M("GroundG");
        if (gg == null || gg.shader == null || !gg.shader.isSupported)
        { var std = new Material(M("Ground")); std.mainTexture = Resources.Load<Texture2D>(HolePath("_ground")); return std; }
        var gm = new Material(gg);
        if (groundShared == null) groundShared = new[] { "det_short", "det_rough", "det_fescue", "det_sand", "turf_g", "turf_s", "surround", "turf_gn", "turf_sn" }.Select(n => Resources.Load<Texture2D>("troy/" + n)).ToArray();
        gm.SetTexture("_MainTex", Resources.Load<Texture2D>(HolePath("_ground"))); gm.SetTexture("_Surf", Resources.Load<Texture2D>(HolePath("_surf")));
        string[] slots = { "_DS", "_DR", "_DF", "_DD", "_PG", "_PS", "_Surround", "_PGN", "_PSN" }; for (int k = 0; k < slots.Length; k++) if (groundShared[k]) gm.SetTexture(slots[k], groundShared[k]);
        gm.SetVector("_GB", V4(look, "gB", new Vector4(D.tex.x0, D.tex.y0, D.tex.w, D.tex.h))); gm.SetVector("_GSB", V4(look, "gSB", new Vector4(D.lg.x0, D.lg.y0, D.lg.nx, D.lg.ny)));
        gm.SetVector("_GSS", V4(look, "gSS", Vector4.zero)); gm.SetVector("_TK", V4(look, "tK", Vector4.one)); gm.SetVector("_RLS", V4(look, "rlS", Vector4.zero)); gm.SetVector("_RLG", V4(look, "rlG", Vector4.zero));
        gm.SetFloat("_POn", look != null && look.TryGetValue("pOn", out var po) && po is double pd ? (float)pd : 1); gm.SetFloat("_GMode", 1); gm.SetFloat("_LightOn", 0);
        // the green's slope map (export_slope.js: buildSlopeTex's own bytes)
        var sb = Resources.Load<TextAsset>(HolePath("_slope"));
        if (sb != null)
        {
            var by = sb.bytes; float x0 = System.BitConverter.ToSingle(by, 0), y0 = System.BitConverter.ToSingle(by, 4), sw = System.BitConverter.ToSingle(by, 8), sh = System.BitConverter.ToSingle(by, 12);
            int nx = System.BitConverter.ToInt32(by, 16), ny = System.BitConverter.ToInt32(by, 20);
            var st = new Texture2D(nx, ny, TextureFormat.RGBA32, false, true) { wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
            var raw = new byte[nx * ny * 4]; System.Buffer.BlockCopy(by, 24, raw, 0, raw.Length); st.LoadRawTextureData(raw); st.Apply(false, true); holeAssets.Add(st);
            gm.SetTexture("_SlT", st); gm.SetVector("_SLB", new Vector4(x0, y0, sw, sh)); gm.SetFloat("_SLG", 1); gm.SetFloat("_SlOn", 0); if (slopeMat == null) slopeMat = gm;   // (the hole's ground, built first; the skirt shares the code)
        }
        return gm;
    }
    // the land round the hole (the web game's skirt, r3Surround): a 20-yd grid of the course's elevation, the hole's own rect cut out
    void BuildSkirt()
    {
        if (look == null || !(look.TryGetValue("skirt", out var so) && so is Dictionary<string, object> S)) return;
        float x0 = System.Convert.ToSingle(S["x0"]), y0 = System.Convert.ToSingle(S["y0"]), st = System.Convert.ToSingle(S["st"]); int nx = System.Convert.ToInt32(S["nx"]), ny = System.Convert.ToInt32(S["ny"]);
        var H = (List<object>)S["h"]; var v = new Vector3[nx * ny];
        for (int j = 0; j < ny; j++) for (int i = 0; i < nx; i++) v[j * nx + i] = HoleData.U(x0 + i * st, y0 + j * st, System.Convert.ToSingle(H[j * nx + i]));
        float b0 = D.tex.x0, b1 = D.tex.y0, b2 = D.tex.x0 + D.tex.w, b3 = D.tex.y0 + D.tex.h;
        bool InB(float x, float y) => x > b0 + 4 && x < b2 - 4 && y > b1 + 4 && y < b3 - 4;
        var t = new List<int>();
        for (int j = 0; j < ny - 1; j++) for (int i = 0; i < nx - 1; i++)
        {
            float x = x0 + i * st, y = y0 + j * st; if (InB(x, y) && InB(x + st, y) && InB(x, y + st) && InB(x + st, y + st)) continue;
            int a = j * nx + i, bq = a + 1, c = a + nx, d = c + 1; t.Add(a); t.Add(bq); t.Add(c); t.Add(bq); t.Add(d); t.Add(c);   // (rewound for the mirror)
        }
        var m = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32, vertices = v }; m.SetTriangles(t, 0); m.RecalculateNormals(); m.RecalculateBounds(); holeAssets.Add(m);
        if (m.normals.Length > 0 && m.normals[0].y < 0) { t.Reverse(); m.SetTriangles(t, 0); m.RecalculateNormals(); }
        var go = new GameObject("Skirt"); go.transform.SetParent(holeRoot); go.AddComponent<MeshFilter>().sharedMesh = m; var mr = go.AddComponent<MeshRenderer>();
        var gm = GroundMat(); if (gm.shader.name == "GolfGo/Ground") { gm.SetFloat("_GMode", 0); gm.SetFloat("_LightOn", 0); } holeAssets.Add(gm);
        mr.sharedMaterial = gm; mr.receiveShadows = false; mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
    }
    // the hole's water: the web game's own surface (hNN_look.json), mirrored into Unity's axes, on the Water layer, with its reflection
    void BuildWater()
    {
        if (WR != null) WR.on = false; var L = look; if (L == null) return;
        if (!(L.TryGetValue("water", out var wo) && wo is List<object> W) || W.Count < 9) return;
        int n = W.Count / 3; var v = new Vector3[n]; var t = new int[n];
        for (int i = 0; i < n; i++) v[i] = new Vector3(System.Convert.ToSingle(W[i * 3]), System.Convert.ToSingle(W[i * 3 + 1]), -System.Convert.ToSingle(W[i * 3 + 2]));
        for (int i = 0; i + 2 < n; i += 3) { t[i] = i; t[i + 1] = i + 2; t[i + 2] = i + 1; }   // (rewound for the mirror)
        var m = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32, vertices = v, triangles = t }; m.RecalculateNormals(); m.RecalculateBounds(); holeAssets.Add(m);
        var go = new GameObject("Water"); go.layer = WaterReflect.WaterLayer; go.transform.SetParent(holeRoot);
        go.AddComponent<MeshFilter>().sharedMesh = m; var mr = go.AddComponent<MeshRenderer>();
        if (waterMat == null) { var wm = M("Water"); if (wm != null) { waterMat = new Material(wm); WR = new WaterReflect(waterMat); } }
        if (waterMat == null) { Destroy(go); return; }
        mr.sharedMaterial = waterMat; mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off; mr.receiveShadows = false;
        float lv = L.TryGetValue("level", out var lo) && lo is double ld ? (float)ld : v[0].y; WR.SetLevel(lv); WR.on = true;
    }
    void BuildWorld()
    {
        var cyl = Prim(PrimitiveType.Cylinder); var sph = Prim(PrimitiveType.Sphere);
        RenderSettings.skybox = M("Sky"); DynamicGI.UpdateEnvironment();
        // golfer (simple figure) and ball
        golfer = new GameObject("Golfer").transform;
        Make(golfer, Prim(PrimitiveType.Capsule), M("Shirt"), new Vector3(0, 1.15f, 0), new Vector3(.42f, .5f, .3f));
        Make(golfer, Prim(PrimitiveType.Capsule), M("Pants"), new Vector3(0, .45f, 0), new Vector3(.36f, .45f, .28f));
        Make(golfer, sph, M("Skin"), new Vector3(0, 1.85f, 0), Vector3.one * .26f);
        Make(golfer, Prim(PrimitiveType.Cylinder), M("Red"), new Vector3(0, 1.98f, 0), new Vector3(.28f, .04f, .28f));
        club = new GameObject("Club").transform; club.SetParent(golfer, false); club.localPosition = new Vector3(0, 1.3f, .1f);
        Make(club, cyl, M("Dark"), new Vector3(0, -.55f, .25f), new Vector3(.02f, .55f, .02f)).localRotation = Quaternion.Euler(25, 0, 0);
        ball = Make(null, sph, new Material(M("White")), Vector3.zero, Vector3.one * .06f);   // (its own material: the ball's colour follows the bag)
        ball.GetComponent<MeshRenderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
        // light and camera
        var L = new GameObject("Sun").AddComponent<Light>(); L.type = LightType.Directional; L.intensity = 1.15f; L.shadows = LightShadows.Soft;
        L.transform.rotation = Quaternion.Euler(48, -35, 0); RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
        RenderSettings.ambientSkyColor = new Color(.62f, .72f, .86f); RenderSettings.ambientEquatorColor = new Color(.55f, .6f, .58f); RenderSettings.ambientGroundColor = new Color(.32f, .36f, .28f);
        RenderSettings.fog = true; RenderSettings.fogMode = FogMode.Linear; RenderSettings.fogStartDistance = 250; RenderSettings.fogEndDistance = 900; RenderSettings.fogColor = new Color(.74f, .82f, .9f);
        cam = Camera.main; if (!cam) { cam = new GameObject("Camera").AddComponent<Camera>(); cam.tag = "MainCamera"; }
        if (CAMV < 0) CAMV = PlayerPrefs.GetInt("camv", 1);   // (Cam, Nov 25: the lower aiming view; the camera button cycles all three)
        cam.fieldOfView = 50; cam.nearClipPlane = .3f; cam.farClipPlane = 5000; cam.allowMSAA = true;
        // the web game's sun, sky, clouds, weather and finish (GolfGoLook.cs); the old light and fog stay only if its shaders can't run
        Try("look", () => { gLook = cam.gameObject.AddComponent<GolfGoLook>(); gLook.sun = L; });
        SFX = new GameObject("Sound").AddComponent<SoundFX>();
        GolfGoLook.AfterPost = () => { if (FX != null && !mapView) Try("flames", () => FX.DrawFlames(cam, VfPx, hud.K)); };
        Try("weather", () => { if (gLook != null && gLook.Ok) { RenderSettings.fog = false; gLook.Weather(PlayerPrefs.GetInt("wx", 0)); } });
    }
    GolfGoLook gLook;
    // r3NewWx: each new round rolls its weather (Sunny, Partly cloudy, Cloudy, Overcast) and says so
    void NewWeather()
    {
        if (gLook == null || !gLook.Ok) return; int i = Random.Range(0, GolfGoLook.WX.Length); PlayerPrefs.SetInt("wx", i); Try("weather", () => gLook.Weather(i));
        wxToast = GolfGoLook.WX[i].n.ToUpperInvariant(); wxToastAt = Time.time + 1.4f;   // (a timer of its own: loading the hole cancels Invokes)
    }
    string wxToast; float wxToastAt = -1;
    static Mesh Prim(PrimitiveType t) => Prims.Get(t);   // (not CreatePrimitive: it adds a collider, and the build has no physics)
    static Transform Make(Transform parent, Mesh mesh, Material mat, Vector3 pos, Vector3 scale)
    {
        var o = new GameObject(mesh.name); if (parent) o.transform.SetParent(parent, true);
        o.transform.position = pos; o.transform.localScale = scale; o.AddComponent<MeshFilter>().sharedMesh = mesh; var r = o.AddComponent<MeshRenderer>(); r.sharedMaterial = mat;
        return o.transform;
    }
    static Mesh ConeMesh(int n)
    {
        var v = new List<Vector3> { new Vector3(0, 1, 0) }; var t = new List<int>();
        for (int i = 0; i < n; i++) { float a = i * Mathf.PI * 2 / n; v.Add(new Vector3(Mathf.Cos(a) * .5f, 0, Mathf.Sin(a) * .5f)); }
        for (int i = 0; i < n; i++) { t.Add(0); t.Add(1 + (i + 1) % n); t.Add(1 + i); }
        var m = new Mesh { name = "Cone", vertices = v.ToArray(), triangles = t.ToArray() }; m.RecalculateNormals(); m.RecalculateBounds(); return m;
    }

    // ---------- HUD (Hud.cs: the web game's own HUD, rebuilt) ----------
    static readonly Dictionary<string, string> LieName = new Dictionary<string, string> { { "tee", "Tee box" }, { "fairway", "Fairway" }, { "cut", "First cut" }, { "rough", "Rough" }, { "sand", "Bunker" }, { "green", "Green" }, { "fescue", "Fescue" }, { "dirt", "Dirt & leaves" }, { "water", "Water" }, { "ob", "Out of bounds" }, { "path", "Cart path" } };
    static readonly Dictionary<string, string> LieCol = new Dictionary<string, string> { { "tee", "#7cc257" }, { "fairway", "#6db14a" }, { "cut", "#5ea247" }, { "rough", "#3f7d35" }, { "sand", "#f4efe2" }, { "green", "#9ad873" }, { "fescue", "#c9b35f" }, { "dirt", "#9b7651" }, { "path", "#c9c4b8" } };
    void BuildHud()
    {
        hud = new Hud(IMPACT);
        hud.onSwing = Swing; hud.onMeter = () => { if (st == S.Power || st == S.Acc) Swing(); };
        hud.onClub = d => { if (st != S.Aim || Lie0 == "green") return; SFX?.Tick(); ci = Mathf.Clamp(ci + d, 0, Clubs.Count - 1);
            if (C.id == "1W" && Lie0 != "tee") { hud.Toast("NO DRIVER", "Driver is off the tee only", Hud.Cream); ci = Mathf.Min(1, Clubs.Count - 1); }   // (pickClub: driverOK)
            if (C.putter) pshot = false; else if (!SG.ShotOK(stype, ci)) stype = "full"; PrepareShot(false); };
        hud.onAimTap = d => { if (st != S.Aim) return; float Dd = Mathf.Max(MaxDist, 3); aim += d * Mathf.Max(.4f, Dd * .006f) / Dd; aimHeld = 0; PlaceGolfer(); };
        hud.onPower = () => { if (st != S.Aim || C.putter) return; if (!pshot && stype != "full") return; pshot = !pshot; SFX?.Tick(); if (pshot) hud.Toast("POWER SHOT", "+15% on a pure strike · faster impact", Hud.Hex("#ff9a3c")); RefreshHud(); };
        hud.onShotType = SetShot;
        hud.onSpin = () => { if (st != S.Aim || C.putter) return; hud.ShowImp(!hud.ImpOpen); RefreshHud(); };
        hud.onImp = v => { if (st != S.Aim || C.putter) return; imp = v; RefreshHud(); };
        hud.onTraj = t => { if (st != S.Aim || C.putter) return; traj = t; RefreshHud(); };
        hud.onFlag = () => { if (st != S.Aim || !C.putter) return; flagOut = !flagOut; ShowFlag(); };
        hud.onCam = () => { if (st != S.Aim) return; SFX?.Tick(); CAMV = (CAMV + 1) % 3; PlayerPrefs.SetInt("camv", CAMV); };
        hud.onLookBar = k => { if (k == 0) LookGreen(); else if (k == 1) LookRead(); else if (k == 2) LookLanding(); else LookEnd(); };
        hud.onFF = () => { if (FfActive) ff = ff == 1 ? 2 : ff == 2 ? 4 : 1; };
        hud.onReplay = () => { if (st == S.Aim && canReplay) StartReplay(); };
        hud.onImpReset = () => { imp = Vector2.zero; traj = 0; RefreshHud(); };
        hud.onMap = () => { if (st == S.Aim) { mapView = !mapView; if (mapView) fc = null; } };
        hud.onLook = () => { if (fc != null && !(fc.fly != null && fc.fly.dir < 0)) LookEnd(); else LookStart(); };
        hud.onMenu = Menu;
    }
    // the lie the shot is played from (shotLie): the turf, or the cart path where it shows
    string Lie0 => RD.ShotLie(b.x, b.y);
    bool Short => !C.putter && GolfGo.Sim.Strike.IsShort(stype);
    // the meter's power: the short game's meter is curved (power = meter^SG_K), so small swings are easier to judge
    double Power => Short ? SG.MeterToPower(mPower) : mPower;
    GolfGo.Sim.ShotIn Si(float? e = null) => new GolfGo.Sim.ShotIn { bx = b.x, by = b.y, aim = aim, power = Power, e = e, club = C.id, lie = Lie0, stype = C.putter ? "full" : stype, pshot = pshot && !C.putter, onTeeBox = strokes == 0, windA = windA, windMph = windMph, swMax = Short ? swMax : 0, buried = buried, sandRel = SH.sandRel, impX = imp.x, impY = imp.y, traj = traj };
    // setShot (input.js): bunker shots only in the sand by the green, only a blast from a plugged lie, the spinner from a clean lie;
    // a shot the club can't play moves to the nearest club that can
    void SetShot(string t)
    {
        if (st != S.Aim || C.putter) return;
        string why = SG.Why(t, Lie0, PinDist, buried); if (why != null) { var w = why.Split('·'); hud.Toast(w.Length > 1 ? w[0].Trim() : "", w[w.Length - 1].Trim(), Hud.Cream); return; }
        ci = SG.ClubFor(t, ci); stype = t; SizeShort(); RefreshHud(); PlaceGolfer();
    }
    bool ShotEnabled(string t) => !(GolfGo.Sim.Strike.BunkerT(t) && !GolfGo.Sim.Short.BunkerSide(Lie0, PinDist)) && !(buried && (t == "splash" || t == "pick"))
        && !(t == "spin" && !(Lie0 == "fairway" || Lie0 == "tee" || Lie0 == "cut"));
    void SizeShort() { swMax = 0; flagKey = null; if (Short) swMax = SG.SetMax(Si()); }
    // the flag on the meter: where the planned carry sits (shortPlan, worked out again only when the shot changes)
    string flagKey; double flagTp; GolfGo.Sim.Short.Plan planC;
    void ShortFlag()
    {
        if (!(st == S.Aim || st == S.Power || st == S.Acc)) { hud.SetFlag(-1, "", false); return; }
        if (C.putter)
        {   // puttTargetPower: the flag where a stroke finishes just past the cup (none inside a foot)
            var tp = PT.TargetPower(b.x, b.y, Lie0, puttMax);
            if (tp == null) { hud.SetFlag(-1, "", false); return; }
            bool po = tp.Value > 1; hud.SetFlag(IMPACT + Mathf.Min(1, (float)tp.Value) * (1 - IMPACT), po ? "Beyond max" : Mathf.RoundToInt(PinDist * 3) + " ft", po); return;
        }
        if (!Short || swMax <= 0) { hud.SetFlag(-1, "", false); return; }
        string key = ci + "|" + stype + "|" + aim.ToString("F4") + "|" + b.x.ToString("F2") + "|" + b.y.ToString("F2") + "|" + pshot + "|" + imp + "|" + traj;
        if (key != flagKey) { var s = Si(); planC = SG.PlanFor(s); flagTp = SG.FlagPower(s, planC); flagKey = key; }
        bool over = flagTp > 1; float pos = IMPACT + (float)SG.PowerToMeter(Mathf.Min(1, (float)flagTp)) * (1 - IMPACT);
        hud.SetFlag(pos, over ? "Beyond max" : Mathf.RoundToInt(PinDist) + " y", over);
    }
    float winC = .03f;
    float Win => C.putter ? (float)PT.Window(false) : (float)SK.PerfectWin(C, Si());
    void RefreshHud()
    {
        string lie = Lie0; float pd = PinDist;
        hud.SetTop(D.course + " · Hudson, WI", D.hole, "Par " + D.par + " · " + D.len + " yds", "Stroke " + (strokes + 1) + " · Round " + DiffStr(roundDiff));
        hud.SetClub(C.id == "1W" ? "Driver" : char.IsDigit(C.id[0]) && C.id.Length == 2 && C.kind == "wedge" ? C.id + "\u00b0" : C.id, C.putter ? "Putter · " + Mathf.RoundToInt(MaxDist * 3) + " ft" : (C.id == "1W" ? (strokes == 0 ? "Off the tee" : "Off the deck") : C.name) + " · " + Mathf.RoundToInt(MaxDist) + "y", ci > 0, ci < Clubs.Count - 1);
        hud.SetLie(LieName.TryGetValue(lie, out var ln) ? ln : Cap(lie), Hud.Hex(LieCol.TryGetValue(lie, out var lc) ? lc : "#6db14a"), lie == "green" || pd < 20 ? "Cup " + Mathf.RoundToInt(pd * 3) + " ft" : "Pin " + Mathf.RoundToInt(pd) + " yds");
        hud.SetShot(stype, C.putter, st == S.Aim, pshot && !C.putter, ShotEnabled, GolfGo.Sim.Short.BunkerSide(lie, pd)); winC = Win;
        // the meter's scale: carry yards along it (feet of roll for a putt on the green)
        bool pg = C.putter && lie == "green", pct = C.putter && !pg; float mx = C.putter ? MaxDist * 3 : MaxDist * (float)SK.ShotMods(C, Si()).carry;
        string L(float f) => pct ? Mathf.RoundToInt(f * 100).ToString() : Mathf.Max(1, Mathf.RoundToInt(mx * (Short ? (float)SG.MeterToPower(f) : f))) + (pg ? " ft" : "y");
        hud.SetLabels(L(.25f), L(.5f), L(.75f), pct ? "Max" : L(1));
        hud.SetImp(imp, traj, ImpName(false), ImpName(true), C.putter);   // off the green the putter's meter reads in percent
    }
    // impName / impShort (hud.js)
    string ImpName(bool shortN)
    {
        string h = traj > 0 ? "High" : traj < 0 ? "Low" : "";
        if (imp.magnitude < .15f) return h != "" ? (shortN ? h : h + " \u00b7 centre") : "Centre";
        var a = new List<string>(); if (h != "") a.Add(h);
        if (imp.y > .2f) a.Add(shortN ? "Top" : "Topspin"); else if (imp.y < -.2f) a.Add(shortN ? "Back" : "Backspin");
        if (imp.x < -.2f) a.Add("Draw"); else if (imp.x > .2f) a.Add("Fade");
        return a.Count > 0 ? string.Join(shortN ? " " : " \u00b7 ", a) : "Centre";
    }
    static string Cap(string s) => string.IsNullOrEmpty(s) ? s : char.ToUpper(s[0]) + s.Substring(1);

    // ---------- play ----------
    GolfGo.Sim.Club C => Clubs[ci];
    float PinDist => Vector2.Distance(b, new Vector2(D.pin[0], D.pin[1]));
    void AimAtPin() { var d = new Vector2(D.pin[0], D.pin[1]) - b; aim = Mathf.Atan2(d.x, -d.y); }
    Vector2 Dir(float a) => new Vector2(Mathf.Sin(a), -Mathf.Cos(a));
    // previewDist: the putt's reach, the short-game meter's size, or the club's natural distance from this lie with this shot
    float MaxDist => C.putter ? (float)puttMax : Short && swMax > 0 ? (float)swMax : (float)(C.carry * SK.Cm.Carry(C) * SK.LieMul(C, Lie0, stype, strokes == 0) * TU.ShotK(stype, "c"));

    void PrepareShot(bool pick)
    {
        if (pick && strokes >= 10 && !inCup) { PickUp(); return; }   // prepareShot: the 10-stroke limit
        if (pick) SaveRound(false);
        string lie = Lie0;
        if (pick)
        {
            if (strokes > 0) { var w = GolfGo.Sim.Round.Shift(windA, windMph, () => Random.value); windA = w.a; windMph = w.mph; }   // the wind shifts once per stroke
            var o = RD.Prepare(b.x, b.y, buried, windA, windMph); aim = (float)o.aim; ci = o.club; stype = o.stype;   // prepareShot (round parity-tested)
            imp = Vector2.zero; traj = 0; pshot = false;   // each shot starts from the centre, normal height, no power shot
        }
        if (C.putter) stype = "full"; else if (!SG.ShotOK(stype, ci) && !GolfGo.Sim.Strike.BunkerT(stype)) stype = "full";
        SizeShort();
        if (C.putter) puttMax = PT.Max(b.x, b.y, Lie0);
        flagOut = GolfGo.Sim.Putt.FlagOut(Lie0, PinDist);   // inside 15 ft on the green the flag comes out (a ball needs less pace to drop)
        ShowFlag();
        st = S.Aim; mpos = IMPACT; mapView = false; swingBack0 = false; inCup = false; if (pick) landPt = null; hud.SetSwing("SWING", 0, true); RefreshHud();
        lastHint = null;
        PlaceGolfer(); swingT = -1;
    }
    void ShowFlag() { for (int k = 0; k < 2 && k < flag.childCount; k++) flag.GetChild(k).gameObject.SetActive(!flagOut); }
    void LoadGolfer(string id)
    {
        try { var g = new Golfer(id, M("Leaf0")); GF?.Destroy(); GF = g; golferId = id; PlayerPrefs.SetString("golfer", id); if (SK != null) { SK.Cm = GolferMods(id); if (st == S.Aim) PrepareShot(false); } golfer.gameObject.SetActive(false); }
        catch (System.Exception e) { Debug.LogError("[golfer] " + e); }   // (the simple figure stays if a golfer can't load)
    }
    void PlaceGolfer()
    {
        if (GF != null)
        {   // the recorded golfer at the ball: the club and shot's own swing, at address
            GF.Setup(C.id, C.putter, stype); GF.Place(b.x, b.y, D.H(b.x, b.y), aim); if (st == S.Aim) GF.Backswing(0, 0, true); swingClock = -1; return;
        }
        var d = Dir(aim); var right = new Vector2(-d.y, d.x) * -1;
        var gp = b - right * (C.putter ? .55f : .75f);
        golfer.position = HoleData.U(gp.x, gp.y, D.H(gp.x, gp.y)); golfer.rotation = Quaternion.LookRotation(new Vector3(right.x, 0, -right.y));
        golfer.gameObject.SetActive(true);
    }

    // the web game's meter (loop.js / tap): Swing starts it rising from the impact line, a tap sets the power on the way up, a tap
    // on the way back down strikes it: how far from the white line that tap lands decides perfect, nice, hook or slice
    void Swing()
    {
        if (st == S.Aim && fc != null) { LookEnd(); return; }   // tap(): while looking, Swing flies the camera back first
        if (st == S.Aim) { SFX?.Tick(); st = S.Power; mpos = IMPACT; mdir = 1; mapView = false; tapMark = -1; hud.SetSwing("POWER", 1, true); hud.SetHint("Tap to set power"); RefreshHud(); return; }
        if (st == S.Power) { SFX?.Tick(); mPower = (mpos - IMPACT) / (1 - IMPACT); st = S.Acc; hud.SetSwing("IMPACT!", 2, true); hud.SetHint("Tap on the white line"); return; }
        if (st == S.Acc) StrikeNow(Mathf.Clamp(mpos - IMPACT, -.12f, .4f));
    }
    // meterSpeed (loop.js): the putter and the short game run slower
    float SpeedP => C.putter ? .7f : Short ? .85f : 1f;
    float SpeedA => C.putter ? .6f : Short ? .8f : .95f * (pshot ? 1.2f : 1);
    // the strike's contact for its sound (strikeShot's q): 1 inside half the window, .76-.86 inside it, falling to .06 beyond
    float StrikeQ(float? e)
    {
        if (!e.HasValue) return .05f; float w = Win, ae = Mathf.Abs(e.Value);
        return ae <= w * .5f ? 1 : ae <= w ? .86f - .1f * (ae - w * .5f) / (w * .5f) : Mathf.Clamp(.62f - (ae - w) / .06f * .55f, .06f, .62f);
    }
    SoundFX SFX;
    void StrikeNow(float? e)
    {
        float win = Win; tapMark = e.HasValue ? IMPACT + e.Value : -1; tapGood = e.HasValue && Mathf.Abs(e.Value) <= win;
        fromLie = Lie0; strokes++; prev = b; swingT = 0; shotRot = Dir(aim); shotAim = aim; ff = 1;
        rec = new List<Vector4>(); recT = 0; recOn = true; canReplay = false;
        if (GF != null) { swingClock = 0; swingBack = Mathf.Max(.15f, (float)Power); launchAt = C.putter ? GF.PuttImpactT : GF.ImpactT; } hud.SetSwing("SWING", 0, false); hud.SetHint(""); hud.AimHide();
        if (C.putter)
        {
            // the web game's putter stroke (GolfGo.Sim.Putt): the window, a pull or push and a short miss, then the roll on the same ball
            var pst = PT.Hit(b.x, b.y, aim, Lie0, puttMax, mPower, e, false, Random.Range(1, int.MaxValue)); fPutt = true;
            { float qp = StrikeQ(e); SFX?.After(launchAt, () => SFX.PuttQ(qp)); }
            if (pst.miss) hud.Toast("MISHIT!", "Timing missed the impact line", Hud.Coral); else if (pst.perfect == 2) hud.Toast("PURE STROKE", "", Hud.Hex("#ffe27a"));
            SB.flagOut = flagOut; SB.LaunchRoll(b.x, b.y, pst.vx, pst.vy, Random.Range(1, int.MaxValue)); simAcc = 0; evSeen = 0; st = S.Roll; return;
        }
        strokes--; var si = Si(e); strokes++;   // (onTeeBox: the stroke being played is the first)
        FL = SK.Hit(si, Random.Range(1, int.MaxValue));
        // the web game's strike toasts (save-file.js strikeShot)
        float ev = e ?? 0;
        if (FL.miss) hud.Toast("MISHIT!", "Timing missed the impact line", Hud.Coral);
        else if (FL.perfect == 2) hud.Toast("PERFECT!", (pshot ? "Full-power fireball" : "Dead centre") + (Short ? "" : C.kind == "wood" ? " · +" + Mathf.RoundToInt((float)(SK.Cm.Perf - 1) * 100) + "% carry" : " · bites on landing"), pshot ? Hud.Hex("#ff8a3c") : Hud.Hex("#7cc8ff"));
        else if (FL.perfect == 1) hud.Toast("NICE SHOT!", "", Hud.Sun);
        else if (FL.misKind != null && FL.misT >= .5) hud.Toast(FL.misKind == "chunk" ? "CHUNKED!" : "BLADED!", FL.misKind == "chunk" ? "Tapped early · caught it fat" : "Tapped late · caught it thin", Hud.Hex("#ff9b6a"));
        else if (FL.misKind != null) hud.Toast(FL.misKind == "chunk" ? "A TOUCH FAT" : "A TOUCH THIN", FL.misKind == "chunk" ? "A touch early" : "A touch late", Hud.Hex("#ffd2a8"));
        else if (FL.sgChunk) hud.Toast("GRABBED!", "The fescue caught the club", Hud.Hex("#ffb46a"));
        else if (Mathf.Abs(ev) > .035f) hud.Toast(ev > 0 ? "HOOK!" : "SLICE!", ev > 0 ? "Tapped early" : "Tapped late", Hud.Hex("#ff9b6a"));
        else if (ev != 0) hud.Toast(ev > 0 ? "PULLED" : "PUSHED", ev > 0 ? "A touch early" : "A touch late", Hud.Hex("#ffd2a8"));
        if (FX != null)
        {
            FX.flame = FL.perfect == 2 && pshot ? "red" : null; FX.ClearTrail();   // (Oct 28, Cam: flames only on a power shot struck dead centre)
            float bx0 = b.x, by0 = b.y, aim0 = aim, pw = (float)Power, pk = fromLie == "tee" && strokes == 1 ? PegFor() : 0; string lie0 = fromLie, sty = stype;
            bool fat = FL.miss || (FL.misKind == "chunk" && FL.misT >= .5), thin = FL.misKind == "blade" && FL.misT >= .5, div = Effects.DivotFor(C, sty, lie0, thin);
            float sw = (float)(FL.carry / System.Math.Max(1, MaxDist)); bool birds = C.kind == "wood" && FL.carry > 170; var land = FL.Pos(1); float ft = (float)FL.T;
            bool drv = C.kind == "wood";
            fxQ = () =>
            {
                if (div) FX.Divot(bx0, by0, aim0, sw, sty, lie0, fat);
                if (pk > 0) FX.Tee(bx0, by0, aim0, pk, pw, drv);
                if (birds && Random.value < .4f) FX.BirdsNear(SH, (float)land.x, (float)land.y, ft * .75f);
            };
        }
        shotInfo = new Vector4(b.x, b.y, (float)FL.carry, (float)FL.apex);   // (showShotStats: carry and peak from the flight, total from where it stops)
        if (FL.fat > 0) Invoke(nameof(HeavyToast), .3f);
        if (SFX != null)
        {
            float q = FL.miss ? .05f : StrikeQ(e), pw = (float)Power; string kind = C.kind, lie = fromLie; bool red = FX != null && FX.flame == "red", perf = FL.perfect > 0;
            SFX.After(Mathf.Max(0, launchAt - .15f), () => SFX.Swoosh(.5f + .5f * pw));
            SFX.After(launchAt, () => { SFX.Strike(pw, q, kind, lie); if (red) SFX.After(.06f, () => SFX.Flame(true)); if (perf) SFX.After(.12f, SFX.Nice); });
        }
        fs = b; var td = new Vector2((float)FL.dx, (float)FL.dy); fd = td; fCarry = (float)FL.carry; fT = (float)FL.T; fu = 0; fRollMul = (float)FL.rollMul; fPutt = false;
        SB.windA = windA; SB.windMph = windMph; SB.flagOut = flagOut; SB.Launch(FL, Random.Range(1, int.MaxValue)); simAcc = 0; evSeen = 0; st = S.Flight;
    }
    static float FlightS(float u) => u <= 1 ? (1 - Mathf.Exp(-DRAG * u)) / DRAG_N : 1 + (u - 1) * DRAG * Mathf.Exp(-DRAG) / DRAG_N;
    static float ArcH(float s) => 2.802f * s * (1 - s) * (1 + .8f * s);
    Vector3 FlightPos(float u, out Vector2 g)
    {
        var q = FL.Pos(u); g = new Vector2((float)q.x, (float)q.y);
        return HoleData.U(g.x, g.y, (float)q.Y);
    }

    void Update()
    {
        float dt = Mathf.Min(Time.unscaledDeltaTime, .05f);
        Fps(Time.unscaledDeltaTime);
        if (hud.ImpOpen && (st != S.Aim || C.putter || fc != null)) hud.ShowImp(false);
        if (st == S.Aim && !hud.ChoiceOpen) { HandleTouches(); ShortFlag(); DrawAim(); } else hud.AimHide();
        LookStep(dt);
        bool aimingHud = st == S.Aim && !hud.ChoiceOpen, lkH = fc != null && aimingHud;
        hud.SetLook(aimingHud && !mapView, lkH);
        hud.SetCam(aimingHud && !mapView && !lkH && !C.putter && Lie0 != "green", CAMV);
        hud.SetLookBar(lkH, lkH && NearGreen, lkH && fc.read, lkH && fc.follow);
        LookRet(lkH);
        PinAndFlag();
        if (st == S.Aim && !mapView) { string h = fc != null ? (fc.follow ? "Scouting your shot \u00b7 change club or aim \u00b7 drag to turn \u00b7 pinch to zoom" : "Free look \u00b7 tap Landing to follow your shot again") : C.putter ? "Grid lines: red is steep, green is gentle \u00b7 the glow runs downhill" : stype == "full" || stype == "spin" ? "Drag to aim \u00b7 Tap Swing to start" : ShotHint.TryGetValue(stype, out var sh) ? sh : "Drag to aim \u00b7 Tap Swing to start"; if (h != lastHint) { lastHint = h; hud.SetHint(h); } }
        else if (st == S.Aim && mapView && lastHint != "map") { lastHint = "map"; hud.SetHint("Tap the map button to return to your ball"); }
        else if (st != S.Aim) lastHint = null;
        if (wxToastAt > 0 && Time.time >= wxToastAt) { wxToastAt = -1; hud.Toast(wxToast, "Today's conditions", Hud.Hex("#bfe3ff")); }
        float fdt = FfActive && ff > 1 ? dt * ff : dt;   // fast-forward: the web runs several updates a frame; here, the time steps n times as far
        hud.SetFlagChip(st == S.Aim && C.putter && Lie0 == "green" && !hud.ChoiceOpen, flagOut);
        if (st == S.Aim && (fc != null) != swingBack0) { swingBack0 = fc != null; hud.SetSwing(swingBack0 ? "\u21a9 BACK" : "SWING", 0, true); }
        if (st == S.Power)
        {
            mpos += mdir * dt * SpeedP; if (mpos >= 1) { mpos = 1; mdir = -1; }
            else if (mdir < 0 && mpos <= IMPACT) { PrepareShot(false); SFX?.Miss(); hud.Toast("NO POWER SET", "Tap once more during the backswing", Hud.Cream); }
        }
        else if (st == S.Acc) { mpos -= dt * SpeedA; if (mpos <= 0) { mpos = 0; StrikeNow(null); } }   // (StrikeNow keeps mpos: the cursor shows the tap)
        bool live = st == S.Power || st == S.Acc;
        float lockAt = IMPACT + mPower * (1 - IMPACT);
        ShortFlag();
        hud.SetMeter(IMPACT, mpos, st == S.Power ? mpos : st == S.Acc ? lockAt : IMPACT, st == S.Acc ? lockAt : -1, winC, live ? -1 : tapMark, tapGood);   // (the cursor stays where it was tapped until the next shot, as the web's m.pos does)
        if (st == S.Aim && hud.aimHold != 0)
        {   // loop.js: holding an aim arrow turns faster the longer it's held
            aimHeld += dt; float Dd = Mathf.Max(MaxDist, 3); aim += hud.aimHold * Mathf.Max(.6f, Dd * .04f) / Dd * (1 + aimHeld * 2.5f) * dt; PlaceGolfer();
        }
        else aimHeld = 0;
        hud.SetWind((int)windMph, (float)(windA - aim) * Mathf.Rad2Deg);
        hud.Tick(dt);
        if (swingT >= 0) { swingT += dt; float a = swingT < .35f ? -110 * (swingT / .35f) : Mathf.Lerp(-110, 120, Mathf.Clamp01((swingT - .35f) / .25f)); club.localRotation = Quaternion.Euler(0, 0, a); if (swingT > 1.4f) swingT = -1; }
        if (GF != null)
        {
            if (st == S.Aim || st == S.Power || st == S.Acc)
            {   // the backswing chases the meter (the web game's spring); the aim can change while he stands there
                float tgt = st == S.Power ? (mpos - IMPACT) / (1 - IMPACT) : st == S.Acc ? mPower : 0;
                GF.Place(b.x, b.y, D.H(b.x, b.y), aim); GF.Backswing(Mathf.Max(0, tgt), dt, st == S.Aim);
            }
            else if (st == S.Replay) { GF.Place(rp0.x, rp0.y, D.H(rp0.x, rp0.y), rpAim); GF.SwingAt(Mathf.Max(.001f, rpLaunch + rpT), rpBack); }
            else if (swingClock >= 0) { swingClock += fdt; GF.SwingAt(swingClock, swingBack); }
        }
        if (st == S.Flight || st == S.Roll) StepSim(fdt);
        if (st == S.Replay) StepReplay(fdt);
        BallAndTracer(fdt);
        hud.SetReplayBtn(st == S.Aim && canReplay && !mapView && fc == null && !hud.ChoiceOpen);
        hud.SetFF(FfActive, ff);
        CameraUpdate(fdt);
        if (SFX != null) { SFX.ambWanted = !hud.ChoiceOpen && !mapView; SFX.windMph = (float)windMph; SFX.water = WR != null && WR.on; SFX.wx = gLook != null ? gLook.wx : 0; }   // (ambTick: off on menus)
        if (FX != null)
        {   // the bits that wait for the club to reach the ball (the divot, the tee peg, birds off a big drive), then everything moving
            bool launched = !(GF != null && swingClock >= 0 && swingClock < launchAt);
            if (fxQ != null && launched) { var q = fxQ; fxQ = null; Try("effects", q); }
            Try("effects", () => { FX.Step(fdt, (float)windA, (float)windMph); FX.Draw(cam, VfPx / hud.K, mapView); });
        }
        Try("trees lod", () => speciesTrees?.Lod(cam.transform.position)); Try("far draw", () => far?.Draw());
        // the grass: densest round the ball (or the look camera's spot); none in the overview or while the look camera is far out
        Try("grass draw", () => grass?.Draw(cam, fc != null && st == S.Aim ? new Vector2(fc.tx, fc.tz) : b, b, (float)windA, (float)windMph, mapView || (fc != null && st == S.Aim && fc.dist > 140)));
        SlopeGrid(dt);
        if (WR != null) WR.Render(cam);   // the water's mirror, from where the camera now is
    }
    // ---------- touches (input.js): one finger drags the aim; a second finger (a pinch) opens the look camera; in the look camera one finger
    // turns round the marker (sideways) and looks nearer or further (up and down), two pan, pinch-zoom and twist ----------
    readonly Dictionary<int, Vector2> pts = new Dictionary<int, Vector2>(); readonly List<int> ptOrder = new List<int>(); int dragId = -1;
    float VfPx => cam.projectionMatrix[1, 1] * Screen.height / 2;   // the focal length in screen pixels (the web's V.f, in its px)
    bool OverHud(Vector2 p, int id) => p.y < hud.BottomFrac * Screen.height || (UnityEngine.EventSystems.EventSystem.current != null && UnityEngine.EventSystems.EventSystem.current.IsPointerOverGameObject(id));
    void HandleTouches()
    {
        if (Input.touchCount == 0) { pts.Clear(); ptOrder.Clear(); dragId = -1; HandleMouse(); return; }
        // the first two fingers down, as they were last frame
        var prev2 = ptOrder.Take(2).Select(i => (i, pts[i])).ToList(); Vector2 dragOld = dragId >= 0 && pts.TryGetValue(dragId, out var dq) ? dq : default;
        for (int n = 0; n < Input.touchCount; n++)
        {
            var t = Input.GetTouch(n);
            if (t.phase == TouchPhase.Began)
            {
                if (OverHud(t.position, t.fingerId)) continue;
                pts[t.fingerId] = t.position; ptOrder.Add(t.fingerId);
                if (pts.Count >= 2 && fc == null) LookStart();
                dragId = fc != null ? -1 : t.fingerId; continue;
            }
            if (!pts.ContainsKey(t.fingerId)) continue;
            if (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled) { pts.Remove(t.fingerId); ptOrder.Remove(t.fingerId); if (dragId == t.fingerId) dragId = -1; continue; }
            pts[t.fingerId] = t.position;
        }
        if (fc != null)
        {
            prev2 = prev2.Where(q => pts.ContainsKey(q.Item1)).ToList(); if (prev2.Count == 0) return;
            var ids = prev2.Select(q => q.Item1).ToList(); var old = prev2.Select(q => q.Item2).ToList(); var nw = ids.Select(i => pts[i]).ToList();
            if (ids.Count == 1) { var d = nw[0] - old[0]; LookTurn(-d.x / hud.K * .0075f); LookPan(0, -d.y); }
            else
            {   // (screen y is up here, down on the web: the pan's y and the twist change sign)
                var mo = (old[0] + old[1]) / 2; var mn = (nw[0] + nw[1]) / 2;
                float so = Vector2.Distance(old[0], old[1]), sn = Vector2.Distance(nw[0], nw[1]);
                float ao = Mathf.Atan2(old[1].y - old[0].y, old[1].x - old[0].x), an = Mathf.Atan2(nw[1].y - nw[0].y, nw[1].x - nw[0].x), da = an - ao;
                if (da > Mathf.PI) da -= 2 * Mathf.PI; if (da < -Mathf.PI) da += 2 * Mathf.PI;
                LookPan(mn.x - mo.x, -(mn.y - mo.y)); if (so > 20 * hud.K && sn > 20 * hud.K) LookZoom(so / sn); LookTurn(da);
            }
            return;
        }
        if (dragId >= 0 && pts.TryGetValue(dragId, out var dp) && dragOld != default) { float dx = dp.x - dragOld.x; if (dx != 0) { aim += dx / VfPx * (C.putter ? .5f : .8f); PlaceGolfer(); } }
    }
    Vector2 mouseOld; bool mouseDown;
    void HandleMouse()
    {   // (the editor: drag to aim, or to turn and look in the look camera; the wheel zooms)
        Vector2 mp = Input.mousePosition;
        if (Input.GetMouseButtonDown(0)) { mouseDown = !OverHud(mp, -1); mouseOld = mp; }
        if (!Input.GetMouseButton(0)) mouseDown = false;
        if (mouseDown) { var d = mp - mouseOld; mouseOld = mp; if (fc != null) { LookTurn(-d.x / hud.K * .0075f); LookPan(0, -d.y); } else if (d.x != 0) { aim += d.x / VfPx * (C.putter ? .5f : .8f); PlaceGolfer(); } }
        float w = Input.mouseScrollDelta.y; if (w != 0 && !mapView && (fc != null || LookStart())) LookZoom(Mathf.Exp(Mathf.Clamp(-w * 100, -120, 120) * .0025f));
    }

    // ---------- the look camera (camera.js "scout cam"): flies out along the shot to a low view of the landing spot; three zoom steps,
    // pinch zooms smoothly; with the putter it looks at the cup. Swing (or the eye) flies it back to the golfer ----------
    class Fly { public float t, dir, dur, bx, bz; public Vector3 fE, fL; }
    class Look { public float tx, tz, yaw, yawOff, dist, distT, pan, readD; public int lvl; public bool follow, read; public Fly fly; }
    const float READ_PITCH = 1.15f, READ_NEAR = 45;
    bool NearGreen => Lie0 == "green" || PinDist <= READ_NEAR;
    float AngTo(Vector2 a, Vector2 p) => Mathf.Atan2(p.x - a.x, -(p.y - a.y));
    void ScoutSetLvl(int l) { if (fc == null) return; fc.lvl = Mathf.Clamp(l, 0, 2); fc.distT = fc.read ? fc.readD * new[] { 1, 1.6f, 2.4f }[fc.lvl] : ScoutLevels()[fc.lvl]; }
    // v96 green read: a steep, nearly top-down view of the stretch from the ball to the hole, the ball at the bottom
    void ReadFrame()
    {
        var p = new Vector2(D.pin[0], D.pin[1]); float d = Vector2.Distance(p, b);
        fc.tx = b.x + (p.x - b.x) * .55f; fc.tz = b.y + (p.y - b.y) * .55f; if (d > 1) fc.yaw = AngTo(b, p); fc.yawOff = 0;
        fc.readD = Mathf.Clamp(d * 1.25f + 9, 13, 62); fc.distT = fc.readD; fc.lvl = 0; fc.read = true; fc.follow = false; fc.pan = 0;
    }
    void LookGreen()
    {
        if (!LookStart()) return; var p = new Vector2(D.pin[0], D.pin[1]); float d = Vector2.Distance(p, b);
        fc.read = false; fc.tx = p.x; fc.tz = p.y; if (d > 2) fc.yaw = AngTo(b, p); fc.distT = Lie0 == "green" || d < 30 ? 22 : 42; fc.lvl = 0; fc.follow = false; LookClamp();
    }
    void LookRead() { if (!LookStart()) return; if (fc.read) { LookGreen(); return; } ReadFrame(); LookClamp(); }
    void LookLanding()
    {
        if (!LookStart()) return; fc.read = false; var q = landPt ?? b; fc.tx = q.x; fc.tz = q.y; fc.yaw = aim; fc.yawOff = 0; ScoutSetLvl(0); fc.follow = true; fc.pan = 0; LookClamp();
    }
    Look fc; Vector2? landPt; bool swingBack0;
    static float LookPitch(float d) => Mathf.Clamp(.3f + d / 350, .3f, 1.2f);
    float ScoutCarry => landPt.HasValue ? Vector2.Distance(landPt.Value, b) : 40;
    float[] ScoutLevels()
    {
        if (C.putter) return new float[] { 24, 48, 96 };
        float cy = ScoutCarry, d0 = Mathf.Clamp(7 + cy * .055f + Mathf.Max(0, cy - 180) * .04f, 11, 25);   // long shots sit a little further back
        return new[] { d0, d0 * 2.4f, d0 * 5.5f };
    }
    void LookClamp()
    {   // within 150 yd of the line from the ball to the pin
        fc.dist = Mathf.Clamp(fc.dist, 2, 460);
        var a = b; var v = new Vector2(D.pin[0], D.pin[1]) - a; float l2 = v.sqrMagnitude; if (l2 == 0) l2 = 1;
        float t = Mathf.Clamp01(Vector2.Dot(new Vector2(fc.tx, fc.tz) - a, v) / l2); var c = a + v * t; var o = new Vector2(fc.tx, fc.tz) - c; float d = o.magnitude;
        if (d > 150) { fc.tx = c.x + o.x * 150 / d; fc.tz = c.y + o.y * 150 / d; }
    }
    bool LookStart()
    {
        if (st != S.Aim || hud.ChoiceOpen) return false; mapView = false;
        if (fc == null)
        {
            var q = landPt ?? b; var L = ScoutLevels();
            fc = new Look { tx = q.x, tz = q.y, yaw = aim, dist = L[0], distT = L[0], lvl = 0, follow = true,
                fly = new Fly { t = 0, dir = 1, dur = .55f + Mathf.Min(.5f, ScoutCarry / 500), fE = camPos, fL = camLook, bx = b.x, bz = b.y } };
            if (C.putter)
            {   // putting, it looks at the cup from behind the ball's line (Oct 24, Pappa)
                var p = new Vector2(D.pin[0], D.pin[1]); float d = Vector2.Distance(p, b); fc.tx = p.x; fc.tz = p.y; fc.follow = false; fc.lvl = -1;
                if (d > 1) fc.yaw = Mathf.Atan2(p.x - b.x, -(p.y - b.y)); fc.dist = fc.distT = Mathf.Clamp(d * .55f + 3, 5, 30);
            }
            LookClamp();
        }
        else if (fc.fly != null && fc.fly.dir < 0) fc.fly.dir = 1;   // tapped again while flying back: turn round
        return true;
    }
    void LookEnd()
    {   // fly back along the same path to where the address camera wants to be now (the aim may have changed)
        if (fc == null) return; NormalTarget(out var E, out var L);
        if (fc.fly == null) fc.fly = new Fly { t = 1, dir = -1, dur = .5f + Mathf.Min(.45f, ScoutCarry / 550), fE = E, fL = L, bx = b.x, bz = b.y };
        else { fc.fly.dir = -1; fc.fly.fE = E; fc.fly.fL = L; }
    }
    void LookPan(float px, float py)
    {   // screen pixels; py > 0 = the finger moving down the screen (looks further on)
        if (fc == null) return;
        if (fc.follow) { fc.pan += Mathf.Sqrt(px * px + py * py); if (fc.pan < 26 * hud.K) return; fc.follow = false; }
        float s = fc.dist / VfPx, sp = Mathf.Max(Mathf.Sin(fc.read ? READ_PITCH : LookPitch(fc.dist)), .3f); var f = Dir(fc.yaw);
        fc.tx += f.y * px * s + f.x * py * s / sp; fc.tz += -f.x * px * s + f.y * py * s / sp; LookClamp();
    }
    void LookZoom(float k) { if (fc == null || !(k > 0) || float.IsInfinity(k)) return; fc.lvl = -1; fc.distT = Mathf.Clamp((fc.distT > 0 ? fc.distT : fc.dist) * k, 2, 460); }
    void LookTurn(float a) { if (fc == null) return; if (fc.follow) fc.yawOff += a; else fc.yaw += a; }
    void LookStep(float dt)
    {
        if (fc != null && (st != S.Aim || mapView || hud.ChoiceOpen)) fc = null;
        if (fc?.fly != null) { var F = fc.fly; F.t += F.dir * dt / F.dur; if (F.dir > 0 && F.t >= 1) fc.fly = null; else if (F.dir < 0 && F.t <= 0) fc = null; }
        if (fc == null) return;
        if (fc.follow && fc.lvl >= 0) fc.distT = ScoutLevels()[fc.lvl];   // club changes re-frame the view
        fc.dist += (fc.distT - fc.dist) * (1 - Mathf.Exp(-dt * 6));
        if (fc.follow && landPt.HasValue)
        {
            float k = fc.fly != null ? 1 : 1 - Mathf.Exp(-dt * 7), dy = aim + fc.yawOff - fc.yaw;
            dy = Mathf.Repeat(dy + Mathf.PI, 2 * Mathf.PI) - Mathf.PI;   // (wrapped to ±π without a loop)
            fc.tx += (landPt.Value.x - fc.tx) * k; fc.tz += (landPt.Value.y - fc.tz) * k; fc.yaw += dy * k;
        }
    }
    // the reticle and its pill (hud.js): the lie there, how far, uphill or down, and how far from the pin when it's close
    Vector2 landPx; float landRy; bool landOk;
    string lastHint;
    // SHOTS[t].hint (clubs-and-surfaces.js)
    static readonly Dictionary<string, string> ShotHint = new Dictionary<string, string> {
        { "punch", "Punch \u2014 low, bores through wind, runs out, stays under branches" }, { "pitch", "Pitch \u2014 soft, medium height, checks up" },
        { "chip", "Chip \u2014 low hop, then rolls like a putt" }, { "flop", "Flop \u2014 sky-high and stops dead; tight timing" },
        { "splash", "Splash \u2014 the standard bunker shot: up, out and a little release" }, { "pick", "Pick \u2014 clean off the top of the sand: lands soft and stops; tight timing" },
        { "blast", "Blast \u2014 forgiving: comes out low and runs out" } };
    // the flagstick grows when far off so it's always at least 30 px tall (ps), and the pin's yardage sits above it (drawPinLabel)
    void PinAndFlag()
    {
        var pw = HoleData.U(D.pin[0], D.pin[1], D.H(D.pin[0], D.pin[1])); var pc = cam.WorldToScreenPoint(pw);
        float ps = pc.z >= .3f ? Mathf.Max(1, 30 / (2.6f * (VfPx / pc.z / hud.K))) : 1;
        if (flag.childCount >= 2)
        {
            flag.GetChild(0).localPosition = new Vector3(0, 1.25f * ps, 0); flag.GetChild(0).localScale = new Vector3(.056f * ps, 1.25f * ps, .056f * ps);
            FlagPose(2.48f * ps, ps);
        }
        var top = cam.WorldToScreenPoint(pw + Vector3.up * 2.6f * ps);
        hud.SetPinLabel(pc.z >= .3f && top.z >= .3f && !inCup && !(AimingSt && C.putter) && !mapView, top, Mathf.RoundToInt(PinDist) + "y");
    }
    // r3FlagPose: the flag hangs from the top of the stick, turned downwind (swaying when it's calm), rippling faster in more wind,
    // drooping when there's none; 0.64 x 0.4 yd, scaled up with distance like the stick
    const int FLAG_N = 65; static Mesh flagMesh; static Material flagMat; readonly Vector3[] flagV = new Vector3[FLAG_N * 2];
    void FlagPose(float top, float ps)
    {
        float T = Time.time, mph = (float)windMph * (1 + .22f * Mathf.Sin(T * .41f) * Mathf.Sin(T * 1.7f + .6f)), calm = Mathf.Clamp01(1 - mph / 4);
        float sway = Mathf.Sin(T * 1.3f) * .35f * calm + Mathf.Sin(T * .7f) * .12f;
        var d = Dir((float)windA); float baseA = Mathf.Atan2(d.y, d.x), a = mph > 0 ? baseA + sway : Mathf.Sin(T * .9f) * .6f;
        var fx = new Vector3(Mathf.Cos(a), 0, -Mathf.Sin(a)); var fz = Vector3.Cross(Vector3.up, fx);   // (the game's (cos, sin) in its plane; Unity's z is the game's -y)
        float amp = .035f + .0075f * Mathf.Min(mph, 16), fq = 6 + mph * .35f, droop = .18f * calm, sx = .64f * ps, sy = .4f * ps, y0 = top - .2f * ps;
        for (int j = 0; j <= 4; j++) for (int i = 0; i <= 12; i++)
        {
            float u = i / 12f, v = j / 4f - .5f; int k = j * 13 + i;
            var p = fx * (u * (1 - .08f * calm) * sx) + Vector3.up * (y0 + (v - droop * u * u) * sy) + fz * (amp * Mathf.Sin(u * 7.5f - T * fq + v * 1.4f) * Mathf.Pow(u, .8f) * sx);
            flagV[k] = flagV[k + FLAG_N] = p;
        }
        flagMesh.vertices = flagV; flagMesh.RecalculateNormals(); flagMesh.RecalculateBounds();
        if (flag.childCount >= 2) { flag.GetChild(1).localPosition = Vector3.zero; flag.GetChild(1).localScale = Vector3.one; flag.GetChild(1).localRotation = Quaternion.identity; }
    }
    void LookRet(bool on)
    {
        if (!on) { hud.SetLookRet(false, default, false, 0, ""); return; }
        float ty = D.H(fc.tx, fc.tz); var q = cam.WorldToScreenPoint(HoleData.U(fc.tx, fc.tz, ty));
        float d = Vector2.Distance(new Vector2(fc.tx, fc.tz), b), rise = (ty - D.H(b.x, b.y)) * 3, pd = Vector2.Distance(new Vector2(fc.tx, fc.tz), new Vector2(D.pin[0], D.pin[1]));
        bool fol = fc.follow && !C.putter; string lk = SH.Lie(fc.tx, fc.tz), lie = LieName.TryGetValue(lk, out var ln) ? ln : Cap(lk);
        string txt = (lie != "" && !C.putter ? lie + " \u00b7 " : "") + (d < 20 ? Mathf.RoundToInt(d * 3) + " ft" : Mathf.RoundToInt(d) + " yds") + (fol ? " carry" : "")
            + (Mathf.Abs(rise) >= 2 ? (rise > 0 ? " \u25b2" : " \u25bc") + Mathf.RoundToInt(Mathf.Abs(rise)) + " ft" : "") + (pd < 25 && pd >= 1 && d > 25 ? " \u00b7 " + Mathf.RoundToInt(pd * 3) + " ft to pin" : "");
        if (fol && landOk) { hud.SetLookRet(true, landPx, true, landRy, txt); return; }
        hud.SetLookRet(q.z >= .3f, q, false, 0, txt);
    }
    void LookTarget(out Vector3 pos, out Vector3 look)
    {
        float pt = fc.read ? READ_PITCH : LookPitch(fc.dist); var f = Dir(fc.yaw); float ty = D.H(fc.tx, fc.tz), hz = fc.dist * Mathf.Cos(pt);
        // look a little past the marker so it sits low in the frame with the ground beyond it in view
        float ah = C.putter || fc.read ? 0 : fc.dist * .2f, ax2 = fc.tx + f.x * ah, az2 = fc.tz + f.y * ah;
        var E1 = HoleData.U(fc.tx - f.x * hz, fc.tz - f.y * hz, ty + fc.dist * Mathf.Sin(pt)); var L1 = HoleData.U(ax2, az2, ty * .6f + D.H(ax2, az2) * .4f);
        var F = fc.fly; if (F == null) { pos = E1; look = L1; return; }
        // along the shot: the camera rides up over the ball's path and comes down behind the landing spot
        float t = Mathf.Clamp01(F.t), s = t * t * (3 - 2 * t), sl = 1 - Mathf.Pow(1 - t, 2.2f), c = Vector2.Distance(new Vector2(fc.tx, fc.tz), new Vector2(F.bx, F.bz));
        pos = Vector3.LerpUnclamped(F.fE, E1, s) + Vector3.up * (Mathf.Sin(Mathf.PI * s) * Mathf.Min(26, 4 + c * .1f)); look = Vector3.LerpUnclamped(F.fL, L1, sl);
    }

    // ---------- the aim (post-chain.js): white dots along the predicted flight (on the ground for a putt), the pulsing gold ring where it
    // lands, the carry beside it (none while the look camera follows it) ----------
    static readonly Color DotC = new Color(1, 1, 1, .9f);
    void Dot(Vector2 g, float h)
    {
        var p = cam.WorldToScreenPoint(HoleData.U(g.x, g.y, h)); if (p.z < .3f) return;
        float k = VfPx / p.z / hud.K; hud.AimDot(p, Mathf.Clamp(.06f * k, 1.4f, 3), DotC);
    }
    void DrawAim()
    {
        hud.AimBegin();
        var d = Dir(aim); var pv = new Vector2(-d.y, d.x); Vector2 m; float landD; float y0 = D.H(b.x, b.y) + .03f;
        if (C.putter)
        {
            float Dd = MaxDist; m = b + d * Dd; landD = Dd;
            for (int i = 1; i <= 30; i++) { var q = b + d * Dd * (i / 30f); Dot(q, D.H(q.x, q.y) + .05f); }
        }
        else if (Short && swMax > 0 && planC != null)
        {
            var si = Si(); var Mv = SK.ShotMods(C, si); float c2 = (float)planC.carry, ap = (float)(SK.ShotApex(C, c2, si) * Mv.apex);
            for (int i = 1; i <= 60; i++) { float u = i / 36f; var q = b + d * c2 * u; float Y = y0 + ap * ArcH(u); if (u > .5f && Y <= D.H(q.x, q.y)) break; Dot(q, Y); }
            m = new Vector2((float)planC.F.lx, (float)planC.F.ly); landD = Vector2.Distance(m, b);
        }
        else
        {
            var si = Si(); var Mv = SK.ShotMods(C, si); float Dd = MaxDist * (float)Mv.carry, cv = (float)Mv.curve * Dd, ap = (float)(SK.ShotApex(C, Dd, si) * Mv.apex); m = b;
            for (int i = 1; i <= 90; i++)
            {
                float u = i / 36f; var q = b + d * Dd * u + pv * cv * u * u; float Y = y0 + ap * ArcH(u); m = q;
                if (u > .5f && Y <= D.H(q.x, q.y)) break; Dot(q, Y);
            }
            landD = Vector2.Distance(m, b);
        }
        landPt = m;
        // groundEllipse: a ring of 3 yd (a putt's .35) on the ground, at least 13 px across
        float r = C.putter ? .35f : 3, gy = D.H(m.x, m.y) + .02f; var cw = HoleData.U(m.x, m.y, gy); var c = cam.WorldToScreenPoint(cw); bool ring = c.z >= .3f;
        if (ring)
        {
            var fh = cam.transform.forward; fh.y = 0; fh = fh.sqrMagnitude > 1e-6f ? fh.normalized : Vector3.forward;
            var a = cam.WorldToScreenPoint(cw + fh * r); var bb = cam.WorldToScreenPoint(cw - fh * r);
            float k = VfPx / c.z / hud.K, rx = r * k, ry = a.z >= .3f && bb.z >= .3f ? Mathf.Abs(a.y - bb.y) / 2 / hud.K : rx * .3f;
            if (rx < 13) { ry *= 13 / rx; rx = 13; }
            float pulse = 1 + Mathf.Sin(Time.time * 4) * .08f;
            string txt = fc != null && fc.follow && !C.putter ? "" : C.putter ? Mathf.RoundToInt(landD * 3) + " ft" : Mathf.RoundToInt(landD) + " y";
            hud.AimRing(c, rx * pulse, Mathf.Max(ry, 1) * pulse, txt); landPx = c; landRy = Mathf.Max(ry, 1);
        }
        landOk = ring;
        hud.AimEnd(ring);
    }
    /* the ball after the strike: the web game's own flight, trees, landing, hops, roll and cup (GolfGo.Sim.Ball), stepped at its
       60 a second whatever the screen runs at, so a shot plays out exactly as it would in the web game */
    const float SIM_DT = 1f / 60;
    void StepSim(float dt)
    {
        if (GF != null && swingClock >= 0 && swingClock < launchAt) return;   // the ball waits for the club (impact: IMPACT_T into the swing)
        simAcc += dt;
        while (simAcc >= SIM_DT && SB.Moving) { SB.Step(SIM_DT); simAcc -= SIM_DT; }
        b = new Vector2((float)SB.x, (float)SB.y);
        // in the air (flight, hops) the sim's height; rolling, the ground under it (the sim leaves bY where the ball touched down, and
        // the web draws a rolling ball at hAt: an uphill roll was drawn under the turf, the ball "disappearing into the ground")
        bool airNow = SB.state == GolfGo.Sim.BallState.Flight || SB.state == GolfGo.Sim.BallState.Bounce; bY = airNow ? (float)SB.bY : D.H(b.x, b.y);
        if (recOn) { recT += dt; rec.Add(new Vector4(recT, b.x, b.y, airNow ? bY : D.H(b.x, b.y))); }   // (the web: in the air through the hops too)
        if (SB.state == GolfGo.Sim.BallState.Flight && FX != null && !fPutt) FX.Trail(b.x, b.y, bY);
        if (st == S.Flight && SB.state != GolfGo.Sim.BallState.Flight) st = S.Roll;
        var o = SB.outcome;
        if (o != null) for (; evSeen < o.events.Count; evSeen++) { FxEvent(o.events[evSeen], evSeen < o.at.Count ? o.at[evSeen] : null); ShotEvent(o.events[evSeen], o); }
        if (!SB.Moving) Finish(o);
    }
    // the effects for what happened on the way: leaves (and now and then birds) through a tree, a pitch mark on the green
    Effects FX; System.Action fxQ;
    void FxEvent(string e, double[] at)
    {
        if (SFX != null)
        {   // the ball's sounds on the way (save-file.js)
            if (e == "trunk" || e == "branch" || e == "cactus") SFX.Tree();
            else if (e == "rustle") SFX.Rustle(Mathf.Clamp(fCarry / 200, .45f, 1));
            else if (e == "pin") SFX.Pin(SB.state == GolfGo.Sim.BallState.Flight ? 1 : SB.state == GolfGo.Sim.BallState.Bounce ? .8f : .35f);
            else if (e == "lip") SFX.Lip();
            else if (e == "rim") SFX.Rim();
            else if (e == "land") SFX.Land();
        }
        if (FX == null || at == null) return;
        if (e == "rustle") { FX.Leaves((float)at[0], (float)at[1], (float)at[2], (float)at[3], (float)at[4], 8 + Random.Range(0, 6)); if (at.Length >= 8 && Random.value < .4f) { FX.Birds((float)at[5], (float)at[6], (float)at[7], (float)at[0], (float)at[1], 2 + Random.Range(0, 3), 0); SFX?.Flutter(.6f); } }
        else if (e == "pmark") FX.PitchMark((float)at[0], (float)at[1], (float)at[3], (float)at[4]);
    }
    // the web game's toasts for what happened on the way (save-file.js)
    void ShotEvent(string e, GolfGo.Sim.Outcome o)
    {
        if (e == "trunk") hud.Toast("THWACK!", "Off the trunk", Hud.Hex("#ff9b6a"));
        else if (e == "branch") hud.Toast("TIMBER!", "Knocked down by a branch", Hud.Hex("#ff9b6a"));
        else if (e == "cactus") hud.Toast("OUCH!", "Off a saguaro", Hud.Hex("#ff9b6a"));
        else if (e == "pin" && !fPutt) hud.Toast("OFF THE PIN!", "", Hud.Cream);
        else if (e == "path" && st != S.Holed) hud.Toast("CART PATH!", "", Hud.Hex("#d8d2c4"));
        else if (e == "lip") hud.Toast("LIP OUT!", "", Hud.Hex("#ff9b6a"));
        else if (e == "plug") hud.Toast("FRIED EGG!", "Plugged in the sand · only a blast will do", Hud.Hex("#ffb46a"));
        if (o.spinBack && e == "spinback") hud.Toast("SPIN BACK!", "", Hud.Mint);
    }
    // ---------- fast-forward and replay (loop.js, saved-shots.js) ----------
    int ff = 1; float shotAim;
    bool FfActive => st == S.Replay || ((st == S.Flight || st == S.Roll) && (GF == null || swingClock >= launchAt));
    List<Vector4> rec = new List<Vector4>(); float recT; bool recOn, canReplay;
    // the last shot: its flight (t, x, y, height), where he stood, the club and swing
    class LastShot { public List<Vector4> rec; public Vector2 at; public float aim, launchAt, back; public bool holed, putt; public string club, stype; }
    LastShot last; S rpPrev; System.Action rpDone; float rpT, rpDur, rpLaunch, rpBack, rpAim; Vector2 rp0;
    void EndRec(bool holedIt)
    {
        if (!recOn) return; recOn = false; rec.Add(new Vector4(recT + .02f, b.x, b.y, D.H(b.x, b.y)));
        last = new LastShot { rec = rec, at = prev, aim = shotAim, launchAt = launchAt, back = swingBack, holed = holedIt, putt = fPutt, club = C.id, stype = stype };
        canReplay = rec.Count > 6;
    }
    Vector4 ReplayPoint(float t)
    {
        var r = last.rec; if (t <= 0) return r[0];
        for (int i = 1; i < r.Count; i++) if (r[i].x >= t) { var a = r[i - 1]; var q = r[i]; float k = (t - a.x) / ((q.x - a.x) == 0 ? 1 : q.x - a.x); return a + (q - a) * k; }
        return r[r.Count - 1];
    }
    Vector3 ReplayBall() { var p = ReplayPoint(Mathf.Max(0, rpT)); return HoleData.U(p.y, p.z, p.w); }
    void StartReplay(System.Action done = null)
    {
        if (last == null || last.rec.Count < 6) { done?.Invoke(); return; }
        rpPrev = st; rpDone = done; ff = 1; fc = null; mapView = false;
        rpT = -.55f; rpDur = last.rec[last.rec.Count - 1].x; rp0 = last.at; rpAim = last.aim; rpLaunch = last.launchAt; rpBack = last.back;
        if (GF != null) GF.Setup(last.club, last.putt, last.stype);
        st = S.Replay; hud.SetSwing("SWING", 0, false); hud.SetHint(""); hud.AimHide();
        NormalTarget(out camPos, out camLook);   // (the camera cuts to the replay's first view)
    }
    void StepReplay(float dt)
    {
        float slow = last.holed && rpT > rpDur - 1.1f ? .5f : 1; rpT += dt * slow;
        if (rpT > rpDur + .9f)
        {
            st = rpPrev; if (st == S.Aim) { hud.SetSwing("SWING", 0, true); swingBack0 = false; PlaceGolfer(); }
            var d = rpDone; rpDone = null; d?.Invoke();
        }
    }
    // replayCamTrail: behind him at the start, then trailing the ball like a live shot (a putt: low behind the ball)
    void ReplayCam(out Vector3 E, out Vector3 L)
    {
        var rp = ReplayPoint(Mathf.Max(0, rpT)); var d = Dir(rpAim); var ga = rp0; float g0 = D.H(ga.x, ga.y), gb = D.H(rp.y, rp.z); var p = new Vector2(rp.y, rp.z);
        if (last.putt)
        {
            if (rpT < .3f) { var e0 = ga - d * 2.6f; var l0 = ga + d * 4; E = HoleData.U(e0.x, e0.y, g0 + 1.4f); L = HoleData.U(l0.x, l0.y, g0); return; }
            var e1 = p - d * 6; E = HoleData.U(e1.x, e1.y, gb + 2.8f); L = HoleData.U(p.x, p.y, gb); return;
        }
        if (rpT < .4f) { if (CamAddress(ga, rpAim, out E, out L)) return; var e0 = ga - d * 13; var l0 = ga + d * 40; E = HoleData.U(e0.x, e0.y, g0 + 5.4f); L = HoleData.U(l0.x, l0.y, g0); return; }
        if (rp.w > gb + .25f) { var e2 = p - d * 31; var l2 = p + d * 8; E = HoleData.U(e2.x, e2.y, rp.w * .55f + gb * .45f + 9); L = HoleData.U(l2.x, l2.y, rp.w * .85f + gb * .15f); return; }
        var e3 = p - d * 20; E = HoleData.U(e3.x, e3.y, gb + 7); L = HoleData.U(p.x, p.y, gb);
    }
    void Finish(GolfGo.Sim.Outcome o)
    {
        EndRec(o != null && o.kind == "holed");
        if (o == null) { Stop(); return; }
        if (o.kind == "water" || o.kind == "ob") { Penalty(o.kind); return; }
        if (o.kind == "holed")
        {
            if (o.gimme) { SFX?.Cup(false); strokes++; hud.Toast("GIMME", "Inside 4 ft · conceded", Hud.Mint); Invoke(nameof(Holed), .7f); st = S.Holed; return; }
            holedHow = o.how; SFX?.Cup(o.how == "Slam dunk" || o.how == "Off the pin" || o.how == "Dunked it"); Holed(); return;
        }
        if (o.spinBack) hud.Toast("SPIN BACK!", "", Hud.Mint);
        buried = o.buried && o.lie == "sand";   // a plugged ball stays plugged: only a blast
        if (o.relief != null)
        {   // on the cart path (Rule 16.1): free relief beside it, or play it off the concrete; the player chooses (pathAsk)
            hud.Toast("ON THE CART PATH", "", Hud.Hex("#d8d2c4")); st = S.Holed; var rel = o.relief; Invoke(nameof(AskPath), 1.1f); pathRel = rel; return;
        }
        else
        {
            string L = o.lie, from = fromLie;
            if (L == "green" && from != "green") hud.Toast(strokes <= D.par - 2 ? "NICE ON!" : "ON THE GREEN", Mathf.RoundToInt(PinDist * 3) + " ft to the cup", Hud.Mint);
            else if (L == "sand" && from != "sand") hud.Toast("BUNKER", "", Hud.Hex("#f0e0ab"));
            else if (L == "fescue" && from != "fescue") hud.Toast("IN THE FESCUE", "Tough lie", Hud.Hex("#e3cf7e"));
            else if (L == "dirt" && from != "dirt") hud.Toast("UNDER THE TREES", "Leaves and dirt · tough lie", Hud.Hex("#c9a27a"));
        }
        Stop();
    }
    string holedHow = "", fromLie = "tee"; double[] pathRel;
    void AskPath()
    {
        var p = new Vector2(D.pin[0], D.pin[1]); float dr = Vector2.Distance(new Vector2((float)pathRel[0], (float)pathRel[1]), p); string Lr = SH.Lie(pathRel[0], pathRel[1]);
        var opts = new List<(string, string, bool)> { ("Take free relief", Mathf.RoundToInt(dr) + " yds to the pin · " + (LieName.TryGetValue(Lr, out var ln) ? ln : Cap(Lr)) + " · dropped beside the path", true),
            ("Play it as it lies", Mathf.RoundToInt(PinDist) + " yds to the pin · Cart path · clean but firm, no spin shots", false) };
        hud.ShowChoice("Cart path · no penalty", "Free relief?", null, opts, k =>
        {
            if (k == 0) { b = new Vector2((float)pathRel[0], (float)pathRel[1]); bY = D.H(b.x, b.y); hud.Toast("FREE RELIEF", "Dropped beside the cart path · " + Mathf.RoundToInt(PinDist) + " yds", Hud.Mint); }
            else hud.Toast("PLAY IT", "Off the cart path", Hud.Hex("#d8d2c4"));
            PrepareShot(true);
        });
    }
    void Penalty(string L)
    {
        strokes++; buried = false; st = S.Holed; hud.SetHint("");
        if (L != "water") { SFX?.Miss(); hud.Toast("OUT OF BOUNDS", "+1 stroke · replay from last spot", Hud.Coral); b = prev; bY = D.H(b.x, b.y); Invoke(nameof(Next), 1.6f); return; }   // stroke and distance (Rule 18.2)
        hud.Toast("SPLASH!", "Penalty area · +1 stroke", Hud.SkyC); FX?.Splash(b.x, b.y, fPutt);
        if (SFX != null) { if (fPutt) SFX.Plop(true); else { SFX.Splash(); SFX.Plop(false); } }
        // Rule 17: where it last crossed into the water, then lateral, back on the line, or stroke and distance; the best is marked
        var at = new[] { (double)b.x, (double)b.y }; var rec = new List<double[]>(SB.rec) { at };
        var opts = RD.ReliefOpts(RD.WaterCross(new double[] { prev.x, prev.y }, rec, at), new double[] { prev.x, prev.y }); var best = GolfGo.Sim.Round.Best(opts);
        reliefOpts = opts; reliefBest = best; Invoke(nameof(AskRelief), 1.5f);
    }
    List<GolfGo.Sim.Round.Relief> reliefOpts; GolfGo.Sim.Round.Relief reliefBest;
    void AskRelief()
    {
        var L = new List<(string, string, bool)>();
        foreach (var q in reliefOpts) L.Add((q.name, Mathf.RoundToInt((float)q.d) + " yds to the pin · " + (LieName.TryGetValue(q.L, out var ln) ? ln : Cap(q.L)) + (q.k == "lat" ? " · within two club-lengths" : q.k == "line" ? " · back on the line" : " · stroke and distance"), q == reliefBest));
        hud.ShowChoice("Penalty area · +1 stroke", "Take relief", null, L, k =>
        {
            var q = reliefOpts[k]; b = new Vector2((float)q.x, (float)q.y); bY = D.H(b.x, b.y);
            hud.Toast(q.k == "replay" ? "REPLAY" : "DROP", q.name + " · " + Mathf.RoundToInt((float)q.d) + " yds", Hud.Mint); PrepareShot(true);
        });
    }
    void Stop()
    {
        st = S.Holed; Invoke(nameof(Next), .9f);
        if (shotInfo.HasValue) { var I = shotInfo.Value; shotInfo = null; hud.ShotStats(Mathf.RoundToInt(I.z), Mathf.RoundToInt(Vector2.Distance(b, new Vector2(I.x, I.y))), Mathf.RoundToInt(I.w * 3)); }
    }
    Vector4? shotInfo;
    void HeavyToast() => hud.Toast("HEAVY!", "Caught the sand first", Hud.Hex("#ffb46a"));
    void Next() { PrepareShot(true); }
    void Holed()
    {
        st = S.Holed; inCup = true; b = new Vector2(D.pin[0], D.pin[1]); bY = D.H(b.x, b.y) - .08f; int tp = strokes - D.par;
        string nm = strokes == 1 ? "HOLE IN ONE" : tp <= -3 ? "ALBATROSS" : tp == -2 ? "EAGLE" : tp == -1 ? "BIRDIE" : tp == 0 ? "PAR" : tp == 1 ? "BOGEY" : "+" + tp;
        string how = holedHow; holedHow = "";
        hud.Toast(nm, strokes + (strokes == 1 ? " stroke" : " strokes") + (how != "" ? " · " + how : ""), tp < 0 ? Hud.Sun : tp == 0 ? Hud.Mint : Hud.Cream); hud.SetHint(""); hud.SetSwing("SWING", 0, false);
        Record(strokes); shotInfo = null;
        Invoke(nameof(HoleDone), 1.8f);
    }
    // ---------- the round's framing (save-file.js): the hole intro, the scorecard, the 10-stroke pick-up, the saved round ----------
    [System.Serializable] class TipsData { public string line, name, fine; public string[] tips; public int[] par; }
    static TipsData tipsD; static TipsData Tips => tipsD ??= JsonUtility.FromJson<TipsData>(Resources.Load<TextAsset>("troy/tips").text);
    static readonly string[] HOWTO = {
        "<color=#c0542f><b>Aim:</b></color> drag the screen left or right (or use the arrows) to turn. The ring and dotted arc show where a full-power shot lands.",
        "<color=#c0542f><b>Look:</b></color> tap the eye (or pinch the screen) to scout the hole. Drag to move, pinch to zoom, twist to turn, and tap Green to read the putting surface.",
        "<color=#c0542f><b>Pick a shot</b></color> above the meter: Full, Punch (low, runs, stays under branches), Pitch, Chip (low runner) or Flop (sky-high, stops dead).",
        "<color=#c0542f><b>Tap Swing</b></color> to start, then <color=#c0542f><b>tap again</b></color> to set power as the marker runs right.",
        "<color=#c0542f><b>Tap a third time</b></color> right on the white impact line as it comes back. Early hooks left, late slices right." };
    bool intro, resuming, cardUp;
    // #introM: the hole, its par, length and wind, the tip; on the 1st also how to play and the fine print; the whole hole behind it
    void ShowIntro()
    {
        intro = true; mapView = true; fc = null;
        var T = Tips; string tip = T != null && T.tips != null && hi < T.tips.Length ? T.tips[hi] : "";
        var c = new Hud.Paper
        {
            eyebrow = T?.line ?? "Troy Burne", title = "Hole " + (hi + 1),
            meta = new[] { "Par " + D.par, D.len + " yds", windMph >= .5 ? "Wind " + Mathf.RoundToInt((float)windMph) + " mph" : "Calm" },
            tip = tip, fine = hi == 0 ? T?.fine : null, howto = hi == 0 ? HOWTO : null, buttons = new[] { "!Tee off", "_Menu" }
        };
        hud.ShowPaper(c, k => { intro = false; mapView = false; if (k == 1) Menu(); });
    }
    void Record(int s)
    {
        if (scores[hi] == 0) { scores[hi] = s; pars[hi] = D.par; roundDiff += s - D.par; holesDone++; }
        if (hi < 17) SaveRound(true);
    }
    // pickUp: the 10-stroke limit
    void PickUp()
    {
        st = S.Holed; strokes = 10; Record(10); hud.Toast("PICKED UP", "10-stroke limit", Hud.Cream); hud.SetSwing("SWING", 0, false); hud.SetHint("");
        CancelInvoke(nameof(HoleDone)); Invoke(nameof(HoleDone), 1.6f);
    }
    // the saved round (saveGame / loadSave): after every shot and at each hole's end; Continue round on the next launch
    [System.Serializable] class Save { public int v = 1, seed, hi, strokes, wx; public int[] scores, pars; public float bx, by, px, py, windA, windMph; public bool mid; }
    void SaveRound(bool holeDone)
    {
        var sv = new Save { seed = roundSeed, hi = holeDone ? hi + 1 : hi, strokes = holeDone ? 0 : strokes, wx = gLook != null ? gLook.wx : 0, scores = (int[])scores.Clone(), pars = (int[])pars.Clone(),
            bx = b.x, by = b.y, px = prev.x, py = prev.y, windA = (float)windA, windMph = (float)windMph, mid = !holeDone && strokes > 0 };
        try { PlayerPrefs.SetString("round", JsonUtility.ToJson(sv)); PlayerPrefs.Save(); } catch { }
    }
    static Save LoadSave()
    {
        try { var j = PlayerPrefs.GetString("round", ""); if (j == "") return null; var sv = JsonUtility.FromJson<Save>(j); return sv != null && sv.v == 1 && sv.hi >= 0 && sv.hi < 18 && sv.scores != null && sv.scores.Length == 18 && sv.pars != null && sv.pars.Length == 18 ? sv : null; }
        catch { return null; }
    }
    static void ClearSave() { PlayerPrefs.DeleteKey("round"); PlayerPrefs.Save(); }
    // the launch with a round saved: the hole behind, and Continue round / New round
    void Welcome(Save sv)
    {
        ResumeRound(sv);
        var c = new Hud.Paper
        {
            eyebrow = Tips?.line ?? "Troy Burne", title = "Welcome back",
            note = "Your round is saved: hole " + (sv.hi + 1) + ", stroke " + (sv.mid ? sv.strokes + 1 : 1) + (holesDone > 0 ? " · " + DiffStr(roundDiff) + " through " + holesDone : "") + ".",
            buttons = new[] { "!Continue round", "~New round" }
        };
        hud.ShowPaper(c, k => { if (k == 1) { ClearSave(); NewRound(); } else hud.Toast("WELCOME BACK", "Hole " + (hi + 1) + " · stroke " + (strokes + 1), Hud.Mint); });
    }
    void ResumeRound(Save sv)
    {
        CancelInvoke(); hud.HideChoice(); hud.HidePaper(); roundSeed = sv.seed; roundDiff = 0; holesDone = 0;
        for (int k = 0; k < 18; k++) { scores[k] = sv.scores[k]; pars[k] = sv.pars[k]; if (scores[k] > 0) { roundDiff += scores[k] - pars[k]; holesDone++; } }
        if (gLook != null && gLook.Ok) Try("weather", () => gLook.Weather(Mathf.Clamp(sv.wx, 0, GolfGoLook.WX.Length - 1)));
        resuming = true; LoadHole(sv.hi); resuming = false;
        if (sv.mid && sv.strokes > 0)
        {
            strokes = sv.strokes; b = new Vector2(sv.bx, sv.by); prev = new Vector2(sv.px, sv.py); bY = D.H(b.x, b.y); fromLie = Lie0;
            windA = sv.windA; windMph = sv.windMph; var o = RD.Prepare(b.x, b.y, buried, windA, windMph); aim = (float)o.aim; ci = o.club; stype = o.stype;
            PrepareShot(false); camPos = Vector3.zero;
        }
    }
    // #cardM: after each hole (and from the menu): the hole's result, both nines with the marks, the round so far
    Hud.Paper CardBase() => new Hud.Paper { pars = ParsFull(), scores = (int[])scores.Clone(), totalPar = TotalPar(), legend = "Circle birdie · double circle eagle or better · square bogey · double square double or worse" };
    int[] ParsFull() { var p = new int[18]; var T = Tips; for (int k = 0; k < 18; k++) p[k] = pars[k] > 0 ? pars[k] : T != null && T.par != null && k < T.par.Length ? T.par[k] : 0; return p; }
    int TotalPar() { int t = 0; foreach (var p in ParsFull()) t += p; return t; }
    static string Cap1(string s) => string.IsNullOrEmpty(s) ? s : char.ToUpperInvariant(s[0]) + s.Substring(1).ToLowerInvariant();

    // ---------- the round (stage 5): Troy Burne's 18 in order, the web game's Quick play pins and wind ----------
    void NewRound()
    {
        CancelInvoke(); hud.HideChoice(); hud.HidePaper(); cardUp = false; roundSeed = Random.Range(1, 1000000000); roundDiff = 0; holesDone = 0; NewWeather();
        for (int k = 0; k < 18; k++) { scores[k] = 0; pars[k] = 0; }
        LoadHole(0);
    }
    void LoadHole(int i)
    {
        CancelInvoke(); hud.HideChoice(); hud.HidePaper(); hud.HideStats(); cardUp = false; inCup = false; shotInfo = null; hi = i; canReplay = false; recOn = false; if (st == S.Replay) st = S.Aim;
        D = HoleData.Load(HolePath(""));
        CO = new GolfGo.Sim.Course(Resources.Load<TextAsset>(HolePath("")).text);
        // pinIndex (a Quick play round): one of the hole's three pin spots, from the round's seed
        if (CO.pins != null && CO.pins.Length == 3) { int k = (int)System.Math.Floor(new GolfGo.Sim.Rng(roundSeed + i * 7919).Next() * 3) % 3; CO.pin = new[] { CO.pins[k][0], CO.pins[k][1] }; }
        D.pin = new[] { (float)CO.pin[0], (float)CO.pin[1] };
        SK = new GolfGo.Sim.Strike(TU, CO) { Cm = GolferMods(golferId) };   // the golfer's own game (charMods)
        SH = new GolfGo.Sim.SimHole(Resources.Load<TextAsset>(HolePath("_sim")).text); SB = new GolfGo.Sim.Ball(SH, CO, SK); SG = new GolfGo.Sim.Short(SK, SH, CO); PT = new GolfGo.Sim.Putt(SK, SH, CO);
        RD = new GolfGo.Sim.Round(SK, SH, CO, SG, PT); RD.SetClubs(Clubs);
        var w = GolfGo.Sim.Round.HoleWind(roundSeed, i); windA = w.a; windMph = w.mph;
        BuildHole(); Resources.UnloadUnusedAssets();   // (the last hole's 4K textures go)
        FX = new Effects(D); fxQ = null;   // (a new hole: no divots, marks or bits from the last)
        strokes = 0; buried = false; b = new Vector2(D.tee[0], D.tee[1]); prev = b; bY = D.H(b.x, b.y); fromLie = "tee";
        PrepareShot(true);
        if (!resuming) ShowIntro();
    }
    void HoleDone()
    {
        cardUp = true; bool last = hi >= 17; int s0 = scores[hi]; var c = CardBase(); var btn = new List<string>();
        if (last)
        {   // the round's end: the total, a personal best on this device (back tees only on the web; Unity plays one set)
            ClearSave(); int tot = Total(); int best = PlayerPrefs.GetInt("troyburne-best-18", 0); bool isBest = best == 0 || tot < best; if (isBest) PlayerPrefs.SetInt("troyburne-best-18", tot);
            c.eyebrow = "Round complete"; c.title = tot + " (" + DiffStr(roundDiff) + ")";
            c.note = isBest ? (best > 0 ? "New personal best — beat your old " + best + "." : "First round in the books. Go again and beat it.") : "Personal best on this device: " + best + ".";
        }
        else
        {
            c.eyebrow = "Hole " + (hi + 1) + " · " + s0 + (s0 == 1 ? " stroke" : " strokes"); c.title = Cap1(ScoreName(s0, pars[hi]));
            c.note = "Round so far: " + DiffStr(roundDiff) + " through " + (hi + 1) + "." + (hi == 8 ? " That’s the front nine — on to the back." : "");
        }
        if (canReplay) btn.Add("~▶ Watch replay");
        btn.Add(last ? "!Play again" : "!Next hole"); btn.Add("_Menu"); c.buttons = btn.ToArray();
        hud.ShowPaper(c, k =>
        {
            var a = btn[k].Substring(1);
            if (a.EndsWith("Watch replay")) { StartReplay(HoleDone); return; }
            cardUp = false;
            if (a == "Menu") { cardUp = true; Menu(); return; }
            if (last) NewRound(); else LoadHole(hi + 1);
        });
    }
    string NextPar() { try { return HoleData.Load("troy/h" + (hi + 2).ToString("00")).par.ToString(); } catch { return "?"; } }
    int Total() { int t = 0; for (int k = 0; k < 18; k++) t += scores[k]; return t; }
    static string DiffStr(int d) => d == 0 ? "E" : d > 0 ? "+" + d : d.ToString();
    static string ScoreName(int s, int par) { int tp = s - par; return s == 1 ? "Hole in one" : tp <= -3 ? "Albatross" : tp == -2 ? "Eagle" : tp == -1 ? "Birdie" : tp == 0 ? "Par" : tp == 1 ? "Bogey" : tp == 2 ? "Double bogey" : "+" + tp; }
    // the scorecard (pause menu / after a hole): hole, par, score, in two nines
    void ShowCard(bool afterHole)
    {
        if (afterHole) { HoleDone(); return; }
        var c = CardBase(); c.eyebrow = (Tips?.name ?? "Troy Burne") + " · " + (holesDone >= 18 ? "Final" : "Thru " + holesDone); c.title = "Round " + DiffStr(roundDiff);
        c.note = holesDone > 0 ? Total() + " strokes through " + holesDone + (holesDone == 1 ? " hole." : " holes.") : "No holes finished yet.";
        c.buttons = new[] { "!Back to the hole", "~New round" };
        hud.ShowPaper(c, k => { if (k == 1) { ClearSave(); NewRound(); } else if (cardUp && st == S.Holed) HoleDone(); });
    }
    void PickGolfer()
    {
        var opts = new List<(string, string, bool)>(); foreach (var g in Golfers) opts.Add((g[1], (g[0] == golferId ? "Playing now · " : "") + Trait(g[0]), g[0] == golferId));
        hud.ShowChoice("Golfer", "Who's playing?", "The look only for now: shots play the same for every golfer", opts, k => { if (Golfers[k][0] != golferId) LoadGolfer(Golfers[k][0]); PlaceGolfer(); });
    }
    void Menu()
    {
        if (hud.ChoiceOpen || !(st == S.Aim || st == S.Holed)) return;
        string gName = System.Array.Find(Golfers, g => g[0] == golferId)?[1] ?? golferId;
        var opts = new List<(string, string, bool)> { ("Resume", "", true), ("Scorecard", "Thru " + holesDone + " · Round " + DiffStr(roundDiff), false), ("Golfer", "Playing as " + gName, false), ("Bag", BagSummary(), false), ("Flight zoom", TRZ >= 1.5f ? "Closest" : TRZ >= 1.3f ? "Closer" : "Standard", false), ("Restart hole", "Hole " + (hi + 1) + " from the tee", false), ("New round", "Troy Burne from the 1st", false) };
        hud.ShowChoice("Paused", "Troy Burne · Hole " + (hi + 1), null, opts, k =>
        {
            if (k == 0) { if (cardUp && st == S.Holed) HoleDone(); }
            else if (k == 1) ShowCard(false); else if (k == 2) PickGolfer(); else if (k == 3) { hud.HideChoice(); BagMenu(); }
            else if (k == 4) { float z = TRZ; PlayerPrefs.SetFloat("trz", z >= 1.5f ? 1 : z >= 1.3f ? 1.5f : 1.3f); hud.HideChoice(); Menu(); }
            else if (k == 5) { if (scores[hi] > 0) { roundDiff -= scores[hi] - pars[hi]; scores[hi] = 0; holesDone--; } LoadHole(hi); } else if (k == 6) { ClearSave(); NewRound(); }
        });
    }

    /* the camera (camera.js camTarget + stepCam + camera-straight-from-v.js), copied from the web game: its own projection
       (V.f = min((H/2)/tan 31°, (W/2)/tan 24°), the centre at V.cy, the middle of the open part of the screen between the top plate
       and the bottom panel), its targets for each moment of a shot, and its easing (the eye and the look point ease separately). */
    static int CAMV = -1;   // the camera views (camAddress): 0 the web default (13 back, 5.4 up), 1 lower (8.6, 3.4), 2 lowest (6.2, 2.5)
    static readonly float[][] CAMV_SET = { null, new[] { 8.6f, 3.4f, .6f }, new[] { 6.2f, 2.5f, .4f } };
    float camZm = 1; Vector2 shotRot; bool inCup;
    bool AimingSt => st == S.Aim || st == S.Power || st == S.Acc;
    void Projection(float zoom)
    {
        float W = hud.W, H = hud.Hh, f = Mathf.Min(H / 2 / Mathf.Tan(31 * Mathf.Deg2Rad), W / 2 / Mathf.Tan(24 * Mathf.Deg2Rad)) * zoom, cy = (hud.TopH + (H - hud.BotH)) / 2;
        const float n = .3f, fa = 5000; float Kx = 2 * f / W, Ky = 2 * f / H, Kz = 1 - 2 * cy / H;
        var m = new Matrix4x4(); m[0, 0] = Kx; m[1, 1] = Ky; m[1, 2] = -Kz; m[2, 2] = -(fa + n) / (fa - n); m[2, 3] = -2 * fa * n / (fa - n); m[3, 2] = -1;
        cam.nearClipPlane = n; cam.farClipPlane = fa; cam.projectionMatrix = m;
    }
    bool CamAddress(Vector2 at, float a, out Vector3 E, out Vector3 L)
    {
        E = L = default; if (CAMV <= 0) return false; var V2 = CAMV_SET[CAMV]; var d = Dir(a); float g0 = D.H(at.x, at.y), Dd = Mathf.Max(MaxDist, 2);
        float look = Mathf.Max(8, Mathf.Min(70, Dd * .6f) * V2[2]); var l = at + d * look; var e = at - d * V2[0];
        E = HoleData.U(e.x, e.y, Mathf.Max(D.H(e.x, e.y) + .7f, g0 + V2[1])); L = HoleData.U(l.x, l.y, D.H(l.x, l.y) * .6f + g0 * .4f); return true;
    }
    // camTarget (not looking): E the eye, L the point it looks at, zoom
    void NormalTarget(out Vector3 E, out Vector3 L) => NormalTarget(out E, out L, out _);
    void NormalTarget(out Vector3 E, out Vector3 L, out float zoom)
    {
        zoom = 1; float gb = D.H(b.x, b.y);
        if (st == S.Replay) { ReplayCam(out E, out L); return; }
        if (mapView && st == S.Aim)
        {   // the overview: the whole hole from up the tee end, swaying slowly
            var pin = new Vector2(D.pin[0], D.pin[1]); float ax0 = Mathf.Atan2(pin.x, -pin.y); var A = Dir(ax0); float Ln = Mathf.Max(160, D.len);
            float sway = Mathf.Sin(Time.time * .25f) * Ln * .04f; var pp = new Vector2(-A.y, A.x);
            E = HoleData.U(-A.x * Ln * .35f + pp.x * sway, -A.y * Ln * .35f + pp.y * sway, Ln * .8f); L = HoleData.U(A.x * Ln * .5f, A.y * Ln * .5f, 0); return;
        }
        if (AimingSt)
        {
            var d = Dir(aim); float Dd = Mathf.Max(MaxDist, 2);
            if (C.putter) { float back = 2.4f + Dd * .2f, ht = 1.25f + Dd * .11f, look = 1 + Dd * .55f; var l = b + d * look; var e = b - d * back; E = HoleData.U(e.x, e.y, gb + ht); L = HoleData.U(l.x, l.y, D.H(l.x, l.y)); return; }
            if (CamAddress(b, aim, out E, out L)) return;
            { float look = Mathf.Min(70, Dd * .6f); var l = b + d * look; var e = b - d * 13; E = HoleData.U(e.x, e.y, gb + 5.4f); L = HoleData.U(l.x, l.y, D.H(l.x, l.y) * .6f + gb * .4f); return; }
        }
        if ((st == S.Flight || st == S.Roll) && swingClock > 0 && swingClock < launchAt + .4f)
        {   // the first moments of the shot: still behind the golfer
            var ga = prev; float g0 = D.H(ga.x, ga.y); var a3 = Dir(Mathf.Atan2(shotRot.x, -shotRot.y));
            if (fromLie != "green" && CamAddress(ga, Mathf.Atan2(shotRot.x, -shotRot.y), out E, out L)) return;
            var e = ga - a3 * 13; var l = ga + a3 * 40; E = HoleData.U(e.x, e.y, g0 + 5.4f); L = HoleData.U(l.x, l.y, g0); return;
        }
        var dd = shotRot;
        if (inCup) { var p = new Vector2(D.pin[0], D.pin[1]); float gp = D.H(p.x, p.y); var e = p - dd * 4.5f; E = HoleData.U(e.x, e.y, gp + 2.2f); L = HoleData.U(p.x, p.y, gp); return; }
        if (st == S.Flight) { var e = b - dd * 31; var l = b + dd * 8; E = HoleData.U(e.x, e.y, bY * .55f + gb * .45f + 9); L = HoleData.U(l.x, l.y, bY * .85f + gb * .15f); zoom = TRZ; return; }   // trailing the ball
        { bool putt = fromLie == "green"; float back = putt ? 6 : 20, ht = putt ? 2.8f : 7; var e = b - dd * back; E = HoleData.U(e.x, e.y, gb + ht); L = HoleData.U(b.x, b.y, gb); zoom = putt ? 1 : TRZ; }
    }
    void CameraUpdate(float dt)
    {
        bool lk = fc != null && st == S.Aim, flyK = lk && fc.fly != null; float zoom = 1;
        Vector3 E, L; if (lk) LookTarget(out E, out L); else NormalTarget(out E, out L, out zoom);
        float kE = 1 - Mathf.Exp(-dt * (flyK ? 40 : lk ? 9 : st == S.Flight ? 2.6f : AimingSt ? 5 : 3)), kL = 1 - Mathf.Exp(-dt * (flyK ? 40 : lk ? 9 : st == S.Flight ? 9 : 5));
        if (camPos == Vector3.zero) { camPos = E; camLook = L; }
        camPos = Vector3.Lerp(camPos, E, kE); camLook = Vector3.Lerp(camLook, L, kL);
        camPos.y = Mathf.Max(D.H(camPos.x, -camPos.z) + .7f, camPos.y);
        camZm += (zoom - camZm) * (1 - Mathf.Exp(-dt * 3));
        Projection(camZm);
        var fw = camLook - camPos; cam.transform.position = camPos; cam.transform.rotation = Quaternion.LookRotation(fw.sqrMagnitude > 1e-8f ? fw : Vector3.forward, Vector3.up);
    }

    // what's running (the look's pieces), under the FPS: colour space, the finish, bake, far trees, grass tiles, shadows
    string Diag()
    {
        string P(string what, int n, string why) => what + " " + (why ?? n.ToString());
        return (QualitySettings.activeColorSpace == ColorSpace.Linear ? "linear" : "GAMMA") + " · finish " + (gLook == null ? "none" : !gLook.Ok ? "off" : gLook.Posts > 0 ? "on " + gLook.SrcFmt : "not run")
            + " · bake " + (baked ? "on" : "off") + " · " + P("far", far?.N ?? 0, far == null ? "none" : far.Why) + " · " + P("grass", grass?.Drawn ?? 0, grass == null ? "none" : grass.Why)
            + " · " + SystemInfo.graphicsDeviceType + " · sh " + QualitySettings.shadows + "/" + QualitySettings.shadowDistance.ToString("0");
    }
    void Fps(float raw)
    {
        fN++; fAcc += raw; fMax = Mathf.Max(fMax, raw);
        if (fAcc >= .5f)
        {
            int f = Mathf.RoundToInt(fN / fAcc);
            hud.SetFps(f + " FPS · worst " + Mathf.RoundToInt(fMax * 1000) + " ms · " + Screen.currentResolution.refreshRateRatio.value.ToString("0") + " Hz\n" + Diag());
            fN = 0; fAcc = 0; fMax = 0;
        }
    }
}

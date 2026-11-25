using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/* Golf Go, Unity test (Nov 2026): one real hole (Troy Burne 1) from the web game's own data, to measure how smoothly a native
   build runs on the same phones. Ground (heights + painted course map), measured trees, a golfer, a two-tap swing, ball flight
   with the web game's drag curve, roll with slopes, putting, holing out. 120 Hz where the screen allows it; the FPS readout
   is top left. Everything is built in code at start, from Resources/troy1.json and troy1_ground.png. */
public class HoleTest : MonoBehaviour
{
    GolfGo.Sim.Tuning TU; GolfGo.Sim.Course CO; GolfGo.Sim.Strike SK; GolfGo.Sim.Flight FL; GolfGo.Sim.SimHole SH; GolfGo.Sim.Ball SB; GolfGo.Sim.Short SG; float simAcc; int evSeen;
    List<GolfGo.Sim.Club> Clubs;
    string stype = "full"; double swMax; bool buried;   // stage 3: the shot type, the short-game meter's size, a plugged lie
    const float IMPACT = .12f; float mpos, mdir = 1, mPower; double windA, windMph;
    Hud hud; bool pshot, mapView; float tapMark = -1, aimHeld; bool tapGood;
    static readonly Dictionary<string, float> Mu = new Dictionary<string, float> { { "green", .545f }, { "fairway", 1.2f }, { "tee", 1.2f }, { "cut", 2.4f }, { "rough", 11 }, { "sand", 28 }, { "fescue", 17 } };
    static readonly Dictionary<string, float> Surf = new Dictionary<string, float> { { "green", .9f }, { "fairway", 1.08f }, { "tee", 1.08f }, { "cut", .8f }, { "rough", .35f }, { "sand", .05f }, { "fescue", .15f } };
    const float GACC = 10.7f, CUP = .059f, DRAG = 1.1f;
    static readonly float DRAG_N = 1 - Mathf.Exp(-DRAG);

    HoleData D;
    Camera cam; Transform ball, golfer, club, flag; Mesh ground;
    LineRenderer aimLine; Transform ring;
    Vector2 b, prev; float bY; float aim; int ci, strokes;
    enum S { Aim, Power, Acc, Flight, Roll, Holed } S st = S.Aim;
    float meter, meterDir = 1; // swing meter
    // flight
    Vector2 fs, fd; float fCarry, fApex, fLat, fT, fu, fRollMul; bool fPutt;
    Vector2 rv; // roll velocity
    float swingT = -1;
    // fps
    int fN; float fAcc, fMax; readonly List<float> win = new List<float>();
    Vector3 camPos, camLook;

    void Awake()
    {
        Application.targetFrameRate = 120; QualitySettings.vSyncCount = 0; Screen.sleepTimeout = SleepTimeout.NeverSleep;
        QualitySettings.shadowDistance = 160; QualitySettings.shadows = ShadowQuality.All; QualitySettings.shadowResolution = ShadowResolution.High;
        D = HoleData.Load("troy1");
        // the game's own mechanics (GolfGo.Sim, checked shot for shot against the web game) and its numbers
        TU = new GolfGo.Sim.Tuning(Resources.Load<TextAsset>("tuning").text); CO = new GolfGo.Sim.Course(Resources.Load<TextAsset>("troy1").text);
        SK = new GolfGo.Sim.Strike(TU, CO); Clubs = TU.Clubs();
        SH = new GolfGo.Sim.SimHole(Resources.Load<TextAsset>("troy1_sim").text); SB = new GolfGo.Sim.Ball(SH, CO, SK); SG = new GolfGo.Sim.Short(SK, SH, CO);   // stage 2: what the ball does after the strike
        windA = Random.value * Mathf.PI * 2; windMph = Mathf.Round(Random.value * 14);
        BuildWorld(); BuildHud();
        b = new Vector2(D.tee[0], D.tee[1]); bY = D.H(b.x, b.y); strokes = 0;
        AimAtPin(); ci = 0; PrepareShot(true);
    }

    // ---------- world ----------
    Material M(string n) => Resources.Load<Material>("Mats/" + n);
    void BuildWorld()
    {
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
        ground.RecalculateNormals(); ground.RecalculateBounds();
        if (ground.normals.Length > 0 && ground.normals[nx * (ny / 2) + nx / 2].y < 0) { System.Array.Reverse(t); ground.triangles = t; ground.RecalculateNormals(); }
        var go = new GameObject("Ground"); go.AddComponent<MeshFilter>().sharedMesh = ground; var mr = go.AddComponent<MeshRenderer>();
        var gm = new Material(M("Ground")); gm.mainTexture = Resources.Load<Texture2D>("troy1_ground"); mr.sharedMaterial = gm;
        mr.receiveShadows = false; mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;   // tree shadows come from the baked light map

        // trees: a trunk, and a crown of leaf cards from the web game's leaf atlas (clusters of cards round an ellipsoid, as the game
        // draws them), merged per tint so the whole course is a handful of draw calls
        var cyl = Prim(PrimitiveType.Cylinder); Material bark = M("Bark");
        var T = D.trees; var root = new GameObject("Trees").transform; var rnd = new System.Random(77);
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
        var tm = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 }; tm.CombineMeshes(trunks.ToArray(), true, true);
        var tgo = new GameObject("Trunks"); tgo.transform.SetParent(root); tgo.AddComponent<MeshFilter>().sharedMesh = tm; tgo.AddComponent<MeshRenderer>().sharedMaterial = bark;
        string[] leafMats = { "Leaf0", "Leaf1", "Leaf2", "Leaf3", "Pine" };
        for (int z = 0; z < 5; z++)
        {
            if (lists[z].Count == 0) continue;
            var idx = new int[lists[z].Count / 4 * 6]; for (int i = 0, o = 0; i < lists[z].Count; i += 4) { idx[o++] = i; idx[o++] = i + 2; idx[o++] = i + 1; idx[o++] = i; idx[o++] = i + 3; idx[o++] = i + 2; }
            var lm = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 }; lm.SetVertices(lists[z]); lm.SetUVs(0, uvs[z]); lm.SetNormals(nrm[z]); lm.SetTriangles(idx, 0); lm.RecalculateBounds();
            var lg = new GameObject(leafMats[z]); lg.transform.SetParent(root); lg.AddComponent<MeshFilter>().sharedMesh = lm; var lr = lg.AddComponent<MeshRenderer>(); lr.sharedMaterial = M(leafMats[z]);
        }
        var sph = Prim(PrimitiveType.Sphere);
        RenderSettings.skybox = M("Sky"); DynamicGI.UpdateEnvironment();
        // flag
        float ph = D.H(D.pin[0], D.pin[1]); flag = new GameObject("Flag").transform; flag.position = HoleData.U(D.pin[0], D.pin[1], ph);
        Make(flag, cyl, M("White"), flag.position + Vector3.up * 1.2f, new Vector3(.03f, 1.2f, .03f));
        var cloth = Make(flag, Prim(PrimitiveType.Cube), M("Red"), flag.position + new Vector3(.28f, 2.15f, 0), new Vector3(.55f, .35f, .01f));
        Make(flag, cyl, M("Dark"), flag.position + Vector3.up * .005f, new Vector3(CUP * 2, .01f, CUP * 2));
        // golfer (simple figure) and ball
        golfer = new GameObject("Golfer").transform;
        Make(golfer, Prim(PrimitiveType.Capsule), M("Shirt"), new Vector3(0, 1.15f, 0), new Vector3(.42f, .5f, .3f));
        Make(golfer, Prim(PrimitiveType.Capsule), M("Pants"), new Vector3(0, .45f, 0), new Vector3(.36f, .45f, .28f));
        Make(golfer, sph, M("Skin"), new Vector3(0, 1.85f, 0), Vector3.one * .26f);
        Make(golfer, Prim(PrimitiveType.Cylinder), M("Red"), new Vector3(0, 1.98f, 0), new Vector3(.28f, .04f, .28f));
        club = new GameObject("Club").transform; club.SetParent(golfer, false); club.localPosition = new Vector3(0, 1.3f, .1f);
        Make(club, cyl, M("Dark"), new Vector3(0, -.55f, .25f), new Vector3(.02f, .55f, .02f)).localRotation = Quaternion.Euler(25, 0, 0);
        ball = Make(null, sph, M("White"), Vector3.zero, Vector3.one * .06f);
        ball.GetComponent<MeshRenderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
        // light and camera
        var L = new GameObject("Sun").AddComponent<Light>(); L.type = LightType.Directional; L.intensity = 1.15f; L.shadows = LightShadows.Soft;
        L.transform.rotation = Quaternion.Euler(48, -35, 0); RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
        RenderSettings.ambientSkyColor = new Color(.62f, .72f, .86f); RenderSettings.ambientEquatorColor = new Color(.55f, .6f, .58f); RenderSettings.ambientGroundColor = new Color(.32f, .36f, .28f);
        RenderSettings.fog = true; RenderSettings.fogMode = FogMode.Linear; RenderSettings.fogStartDistance = 250; RenderSettings.fogEndDistance = 900; RenderSettings.fogColor = new Color(.74f, .82f, .9f);
        cam = Camera.main; if (!cam) { cam = new GameObject("Camera").AddComponent<Camera>(); cam.tag = "MainCamera"; }
        cam.fieldOfView = 50; cam.nearClipPlane = .1f; cam.farClipPlane = 1500; cam.allowMSAA = true;
        // aim line and landing ring
        aimLine = new GameObject("Aim").AddComponent<LineRenderer>(); aimLine.material = M("White"); aimLine.widthMultiplier = .25f; aimLine.positionCount = 0; aimLine.numCapVertices = 2;
        ring = Make(null, cyl, M("Gold"), Vector3.zero, new Vector3(3, .02f, 3)); ring.GetComponent<MeshRenderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
    }
    static Mesh Prim(PrimitiveType t) { var o = GameObject.CreatePrimitive(t); var m = o.GetComponent<MeshFilter>().sharedMesh; Destroy(o); return m; }
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
        hud.onClub = d => { if (st != S.Aim || Lie0 == "green") return; ci = Mathf.Clamp(ci + d, 0, Clubs.Count - 1); if (C.putter) pshot = false; else if (!SG.ShotOK(stype, ci)) stype = "full"; PrepareShot(false); };
        hud.onAimTap = d => { if (st != S.Aim) return; float Dd = Mathf.Max(MaxDist, 3); aim += d * Mathf.Max(.4f, Dd * .006f) / Dd; aimHeld = 0; PlaceGolfer(); };
        hud.onPower = () => { if (st != S.Aim || C.putter) return; pshot = !pshot; RefreshHud(); };
        hud.onShotType = SetShot;
        hud.onSpin = () => { if (st == S.Aim) hud.SetHint("Strike point and shot height come over with stage 3"); };
        hud.onMap = () => { if (st == S.Aim) mapView = !mapView; };
        hud.onMenu = () => { if (st == S.Aim || st == S.Holed) { CancelInvoke(); ArmRestart(); } };
    }
    // the lie the shot is played from (shotLie): the turf, or the cart path where it shows
    string Lie0 => SH.PhysLie(b.x, b.y);
    bool Short => !C.putter && GolfGo.Sim.Strike.IsShort(stype);
    // the meter's power: the short game's meter is curved (power = meter^SG_K), so small swings are easier to judge
    double Power => Short ? SG.MeterToPower(mPower) : mPower;
    GolfGo.Sim.ShotIn Si(float? e = null) => new GolfGo.Sim.ShotIn { bx = b.x, by = b.y, aim = aim, power = Power, e = e, club = C.id, lie = Lie0, stype = C.putter ? "full" : stype, pshot = pshot && !C.putter, onTeeBox = strokes == 0, windA = windA, windMph = windMph, swMax = Short ? swMax : 0, buried = buried, sandRel = SH.sandRel };
    // setShot (input.js): bunker shots only in the sand by the green, only a blast from a plugged lie, the spinner from a clean lie;
    // a shot the club can't play moves to the nearest club that can
    void SetShot(string t)
    {
        if (st != S.Aim || C.putter) return;
        string why = SG.Why(t, Lie0, PinDist, buried); if (why != null) { var w = why.Split('·'); hud.Toast(w.Length > 1 ? w[0].Trim() : "", w[w.Length - 1].Trim(), Hud.Cream); return; }
        ci = SG.ClubFor(t, ci); stype = t; SizeShort(); RefreshHud();
    }
    bool ShotEnabled(string t) => !(GolfGo.Sim.Strike.BunkerT(t) && !GolfGo.Sim.Short.BunkerSide(Lie0, PinDist)) && !(buried && (t == "splash" || t == "pick"))
        && !(t == "spin" && !(Lie0 == "fairway" || Lie0 == "tee" || Lie0 == "cut"));
    void SizeShort() { swMax = 0; flagKey = null; if (Short) swMax = SG.SetMax(Si()); }
    // the flag on the meter: where the planned carry sits (shortPlan, worked out again only when the shot changes)
    string flagKey; double flagTp;
    void ShortFlag()
    {
        if (!Short || swMax <= 0 || !(st == S.Aim || st == S.Power || st == S.Acc)) { hud.SetFlag(-1, "", false); return; }
        string key = ci + "|" + stype + "|" + aim.ToString("F4") + "|" + b.x.ToString("F2") + "|" + b.y.ToString("F2") + "|" + pshot;
        if (key != flagKey) { var s = Si(); flagTp = SG.FlagPower(s, SG.PlanFor(s)); flagKey = key; }
        bool over = flagTp > 1; float pos = IMPACT + (float)SG.PowerToMeter(Mathf.Min(1, (float)flagTp)) * (1 - IMPACT);
        hud.SetFlag(pos, over ? "Beyond max" : Mathf.RoundToInt(PinDist) + " y", over);
    }
    float winC = .03f;
    float Win => C.putter ? .03f : (float)SK.PerfectWin(C, Si());
    void RefreshHud()
    {
        string lie = Lie0; float pd = PinDist;
        hud.SetTop(D.course + " · Hudson, WI", D.hole, "Par " + D.par + " · " + D.len + " yds", "Stroke " + (strokes + 1) + " · Round E");
        hud.SetClub(C.id == "1W" ? "Driver" : C.id, C.putter ? "Putter · " + Mathf.RoundToInt(MaxDist * 3) + " ft" : (C.id == "1W" ? (strokes == 0 ? "Off the tee" : "Off the deck") : C.name) + " · " + Mathf.RoundToInt(MaxDist) + "y", ci > 0, ci < Clubs.Count - 1);
        hud.SetLie(LieName.TryGetValue(lie, out var ln) ? ln : Cap(lie), Hud.Hex(LieCol.TryGetValue(lie, out var lc) ? lc : "#6db14a"), lie == "green" || pd < 20 ? "Cup " + Mathf.RoundToInt(pd * 3) + " ft" : "Pin " + Mathf.RoundToInt(pd) + " yds");
        hud.SetShot(stype, C.putter, st == S.Aim, pshot && !C.putter, ShotEnabled, GolfGo.Sim.Short.BunkerSide(lie, pd)); winC = Win;
        // the meter's scale: carry yards along it (feet of roll for a putt on the green)
        bool pg = C.putter && lie == "green"; float mx = C.putter ? MaxDist * 3 : MaxDist * (float)SK.ShotMods(C, Si()).carry;
        string L(float f) => Mathf.Max(1, Mathf.RoundToInt(mx * (Short ? (float)SG.MeterToPower(f) : f))) + (pg ? " ft" : "y");
        hud.SetLabels(L(.25f), L(.5f), L(.75f), L(1));
    }
    static string Cap(string s) => string.IsNullOrEmpty(s) ? s : char.ToUpper(s[0]) + s.Substring(1);

    // ---------- play ----------
    GolfGo.Sim.Club C => Clubs[ci];
    float PinDist => Vector2.Distance(b, new Vector2(D.pin[0], D.pin[1]));
    void AimAtPin() { var d = new Vector2(D.pin[0], D.pin[1]) - b; aim = Mathf.Atan2(d.x, -d.y); }
    Vector2 Dir(float a) => new Vector2(Mathf.Sin(a), -Mathf.Cos(a));
    // previewDist: the putt's reach, the short-game meter's size, or the club's natural distance from this lie with this shot
    float MaxDist => C.putter ? Mathf.Max(3, PinDist * 1.6f) : Short && swMax > 0 ? (float)swMax : (float)(C.carry * SK.LieMul(C, Lie0, stype, strokes == 0) * TU.ShotK(stype, "c"));

    void PrepareShot(bool pick)
    {
        string lie = Lie0;
        if (pick)
        {
            float pd = PinDist;
            int pt = Clubs.FindIndex(k => k.putter);
            if (lie == "green") ci = pt;
            else { ci = pt - 1; for (int k = 0; k < pt; k++) if (Clubs[k].carry <= pd * 1.02f) { ci = k; break; } if (strokes == 0 && D.par >= 4) ci = 0; }
            AimAtPin();
            stype = "full";
            if (ci != pt) { var pk = SG.Choose(Si()); if (pk != null) { stype = pk.Value.stype; ci = Clubs.FindIndex(k => k.id == pk.Value.club); } }   // chooseShort
        }
        if (C.putter) stype = "full"; else if (!SG.ShotOK(stype, ci) && !GolfGo.Sim.Strike.BunkerT(stype)) stype = "full";
        SizeShort();
        st = S.Aim; mpos = IMPACT; mapView = false; hud.SetSwing("SWING", 0, true); RefreshHud();
        hud.SetHint("Drag to aim · Tap Swing to start");
        PlaceGolfer(); swingT = -1;
    }
    void PlaceGolfer()
    {
        var d = Dir(aim); var right = new Vector2(-d.y, d.x) * -1;
        var gp = b - right * (C.putter ? .55f : .75f);
        golfer.position = HoleData.U(gp.x, gp.y, D.H(gp.x, gp.y)); golfer.rotation = Quaternion.LookRotation(new Vector3(right.x, 0, -right.y));
        golfer.gameObject.SetActive(true);
    }

    // the web game's meter (loop.js / tap): Swing starts it rising from the impact line, a tap sets the power on the way up, a tap
    // on the way back down strikes it: how far from the white line that tap lands decides perfect, nice, hook or slice
    void Swing()
    {
        if (st == S.Aim) { st = S.Power; mpos = IMPACT; mdir = 1; mapView = false; tapMark = -1; hud.SetSwing("POWER", 1, true); hud.SetHint("Tap to set power"); RefreshHud(); return; }
        if (st == S.Power) { mPower = (mpos - IMPACT) / (1 - IMPACT); st = S.Acc; hud.SetSwing("IMPACT!", 2, true); hud.SetHint("Tap on the white line"); return; }
        if (st == S.Acc) StrikeNow(Mathf.Clamp(mpos - IMPACT, -.12f, .4f));
    }
    float SpeedP => C.putter ? .7f : 1f;
    float SpeedA => C.putter ? .6f : .95f * (pshot ? 1.2f : 1);
    void StrikeNow(float? e)
    {
        float win = Win; tapMark = e.HasValue ? IMPACT + e.Value : -1; tapGood = e.HasValue && Mathf.Abs(e.Value) <= win;
        fromLie = Lie0; strokes++; prev = b; swingT = 0; hud.SetSwing("SWING", 0, false); hud.SetHint(""); aimLine.positionCount = 0; ring.gameObject.SetActive(false);
        if (C.putter)
        {
            float pe = e ?? (Random.value < .5f ? -.12f : .12f), pw = e == null ? mPower * .4f : mPower;
            var d = Dir(aim - pe * 1.45f); float dist = MaxDist * pw; rv = d * Mathf.Sqrt(2 * (float)SH.MU["green"] * dist); fPutt = true;
            SB.flagOut = false; SB.LaunchRoll(b.x, b.y, rv.x, rv.y, Random.Range(1, int.MaxValue)); simAcc = 0; evSeen = 0; st = S.Roll; return;   // the putt's pace is still the stand-in (stage 4); the roll, cup, rim and lip are the web game's
        }
        strokes--; var si = Si(e); strokes++;   // (onTeeBox: the stroke being played is the first)
        FL = SK.Hit(si, Random.Range(1, int.MaxValue));
        // the web game's strike toasts (save-file.js strikeShot)
        float ev = e ?? 0;
        if (FL.miss) hud.Toast("MISHIT!", "Timing missed the impact line", Hud.Coral);
        else if (FL.perfect == 2) hud.Toast("PERFECT!", (pshot ? "Full-power fireball" : "Dead centre") + (Short ? "" : C.kind == "wood" ? " · +3% carry" : " · bites on landing"), pshot ? Hud.Hex("#ff8a3c") : Hud.Hex("#7cc8ff"));
        else if (FL.perfect == 1) hud.Toast("NICE SHOT!", "", Hud.Sun);
        else if (FL.misKind != null && FL.misT >= .5) hud.Toast(FL.misKind == "chunk" ? "CHUNKED!" : "BLADED!", FL.misKind == "chunk" ? "Tapped early · caught it fat" : "Tapped late · caught it thin", Hud.Hex("#ff9b6a"));
        else if (FL.misKind != null) hud.Toast(FL.misKind == "chunk" ? "A TOUCH FAT" : "A TOUCH THIN", FL.misKind == "chunk" ? "A touch early" : "A touch late", Hud.Hex("#ffd2a8"));
        else if (FL.sgChunk) hud.Toast("GRABBED!", "The fescue caught the club", Hud.Hex("#ffb46a"));
        else if (Mathf.Abs(ev) > .035f) hud.Toast(ev > 0 ? "HOOK!" : "SLICE!", ev > 0 ? "Tapped early" : "Tapped late", Hud.Hex("#ff9b6a"));
        else if (ev != 0) hud.Toast(ev > 0 ? "PULLED" : "PUSHED", ev > 0 ? "A touch early" : "A touch late", Hud.Hex("#ffd2a8"));
        fs = b; var td = new Vector2((float)FL.dx, (float)FL.dy); fd = td; fCarry = (float)FL.carry; fT = (float)FL.T; fu = 0; fRollMul = (float)FL.rollMul; fPutt = false;
        SB.windA = windA; SB.windMph = windMph; SB.flagOut = false; SB.Launch(FL, Random.Range(1, int.MaxValue)); simAcc = 0; evSeen = 0; st = S.Flight;
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
        if (st == S.Aim) { HandleAimDrag(); DrawAim(); }
        if (st == S.Power)
        {
            mpos += mdir * dt * SpeedP; if (mpos >= 1) { mpos = 1; mdir = -1; }
            else if (mdir < 0 && mpos <= IMPACT) { PrepareShot(false); hud.SetHint("No power set · tap once more on the way up"); }
        }
        else if (st == S.Acc) { mpos -= dt * SpeedA; if (mpos <= 0) { mpos = 0; StrikeNow(null); } }
        bool live = st == S.Power || st == S.Acc;
        float lockAt = IMPACT + mPower * (1 - IMPACT);
        ShortFlag();
        hud.SetMeter(IMPACT, live ? mpos : IMPACT, st == S.Power ? mpos : st == S.Acc ? lockAt : IMPACT, st == S.Acc ? lockAt : -1, winC, live ? -1 : tapMark, tapGood);
        if (st == S.Aim && hud.aimHold != 0)
        {   // loop.js: holding an aim arrow turns faster the longer it's held
            aimHeld += dt; float Dd = Mathf.Max(MaxDist, 3); aim += hud.aimHold * Mathf.Max(.6f, Dd * .04f) / Dd * (1 + aimHeld * 2.5f) * dt; PlaceGolfer();
        }
        else aimHeld = 0;
        hud.SetWind((int)windMph, (float)(windA - aim) * Mathf.Rad2Deg);
        hud.Tick(dt);
        if (swingT >= 0) { swingT += dt; float a = swingT < .35f ? -110 * (swingT / .35f) : Mathf.Lerp(-110, 120, Mathf.Clamp01((swingT - .35f) / .25f)); club.localRotation = Quaternion.Euler(0, 0, a); if (swingT > 1.4f) swingT = -1; }
        if (st == S.Flight || st == S.Roll) StepSim(dt);
        ball.position = HoleData.U(b.x, b.y, bY + .035f);
        CameraUpdate(dt);
    }
    void HandleAimDrag()
    {
        float dx = 0;
        if (Input.touchCount == 1) { var t = Input.GetTouch(0); if (t.phase == TouchPhase.Moved && t.position.y > Screen.height * .3f) dx = t.deltaPosition.x / Screen.width; }
        else if (Input.GetMouseButton(0) && Input.mousePosition.y > Screen.height * .3f) dx = Input.GetAxis("Mouse X") * .02f;
        if (dx != 0) { aim += dx * (C.putter ? .6f : 1.2f); PlaceGolfer(); }
    }
    void DrawAim()
    {
        var d = Dir(aim); float dist = MaxDist; int n = 24; aimLine.positionCount = n + 1;
        float y0 = D.H(b.x, b.y);
        for (int i = 0; i <= n; i++)
        {
            float s = i / (float)n; var g = b + d * dist * s;
            float y = C.putter ? D.H(g.x, g.y) + .05f : y0 + (float)C.apex * ArcH(s) + .05f; if (!C.putter && s > .5f) y = Mathf.Max(y, D.H(g.x, g.y) + .05f);
            aimLine.SetPosition(i, HoleData.U(g.x, g.y, y));
        }
        aimLine.widthMultiplier = C.putter ? .03f : .25f;
        var e = b + d * dist; ring.gameObject.SetActive(true); ring.position = HoleData.U(e.x, e.y, D.H(e.x, e.y) + .03f); ring.localScale = C.putter ? new Vector3(.4f, .01f, .4f) : new Vector3(Mathf.Max(3, dist * .03f), .01f, Mathf.Max(3, dist * .03f));
    }
    /* the ball after the strike: the web game's own flight, trees, landing, hops, roll and cup (GolfGo.Sim.Ball), stepped at its
       60 a second whatever the screen runs at, so a shot plays out exactly as it would in the web game */
    const float SIM_DT = 1f / 60;
    void StepSim(float dt)
    {
        simAcc += dt;
        while (simAcc >= SIM_DT && SB.Moving) { SB.Step(SIM_DT); simAcc -= SIM_DT; }
        b = new Vector2((float)SB.x, (float)SB.y); bY = (float)SB.bY;
        if (st == S.Flight && SB.state != GolfGo.Sim.BallState.Flight) st = S.Roll;
        var o = SB.outcome;
        if (o != null) for (; evSeen < o.events.Count; evSeen++) ShotEvent(o.events[evSeen], o);
        if (!SB.Moving) Finish(o);
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
    void Finish(GolfGo.Sim.Outcome o)
    {
        if (o == null) { Stop(); return; }
        if (o.kind == "water" || o.kind == "ob") { Penalty(o.kind); return; }
        if (o.kind == "holed")
        {
            if (o.gimme) { strokes++; hud.Toast("GIMME", "Inside 4 ft · conceded", Hud.Mint); Invoke(nameof(Holed), .7f); st = S.Holed; return; }
            holedHow = o.how; Holed(); return;
        }
        if (o.spinBack) hud.Toast("SPIN BACK!", "", Hud.Mint);
        buried = o.buried && o.lie == "sand";   // a plugged ball stays plugged: only a blast
        if (o.relief != null)
        {   // free relief from the cart path (Rule 16.1): the drop beside it (the web game asks first; that choice comes with round flow)
            b = new Vector2((float)o.relief[0], (float)o.relief[1]); bY = D.H(b.x, b.y);
            hud.Toast("FREE RELIEF", "Dropped beside the cart path · " + Mathf.RoundToInt(PinDist) + " yds", Hud.Mint);
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
    string holedHow = "", fromLie = "tee";
    void Penalty(string L) { strokes++; buried = false; b = prev; bY = D.H(b.x, b.y); hud.Toast(L == "water" ? "IN THE WATER" : "OUT OF BOUNDS", "One-stroke penalty", Hud.Hex("#ff9b6a")); hud.SetHint(""); Invoke(nameof(Next), 1.2f); st = S.Holed; }
    void Stop() { st = S.Holed; Invoke(nameof(Next), .9f); }
    void Next() { PrepareShot(true); }
    void Holed()
    {
        st = S.Holed; b = new Vector2(D.pin[0], D.pin[1]); bY = D.H(b.x, b.y) - .08f; int tp = strokes - D.par;
        string nm = strokes == 1 ? "HOLE IN ONE" : tp <= -3 ? "ALBATROSS" : tp == -2 ? "EAGLE" : tp == -1 ? "BIRDIE" : tp == 0 ? "PAR" : tp == 1 ? "BOGEY" : "+" + tp;
        string how = holedHow; holedHow = "";
        hud.Toast(nm, strokes + (strokes == 1 ? " stroke" : " strokes") + (how != "" ? " · " + how : ""), tp < 0 ? Hud.Sun : tp == 0 ? Hud.Mint : Hud.Cream); hud.SetHint(""); hud.SetSwing("AGAIN", 0, false); Invoke(nameof(ArmRestart), .6f);
    }
    void ArmRestart() { st = S.Aim; strokes = 0; b = new Vector2(D.tee[0], D.tee[1]); bY = D.H(b.x, b.y); PrepareShot(true); }

    void CameraUpdate(float dt)
    {
        Vector3 pos, look; var bp = HoleData.U(b.x, b.y, bY);
        if (mapView && st == S.Aim)
        {   // the map button: the whole hole from above (the web's overview, simplified)
            var pin = new Vector2(D.pin[0], D.pin[1]); var mid = (b + pin) / 2; var dd = Dir(aim); var d3m = new Vector3(dd.x, 0, -dd.y);
            look = HoleData.U(mid.x, mid.y, D.H(mid.x, mid.y)); pos = look - d3m * (PinDist * .25f) + Vector3.up * (PinDist * 1.1f + 30);
        }
        else if (st == S.Flight) { var d3 = new Vector3(fd.x, 0, -fd.y); pos = HoleData.U(fs.x, fs.y, D.H(fs.x, fs.y)) - d3 * 10 + Vector3.up * 4; look = bp; }
        else
        {
            var d = Dir(aim); var d3 = new Vector3(d.x, 0, -d.y); bool putt = C.putter && st != S.Flight;
            pos = bp - d3 * (putt ? 4.5f : 9) + Vector3.up * (putt ? 1.7f : 3.6f);
            look = bp + d3 * (putt ? 6 : 45) + Vector3.up * (putt ? 0 : 4);
            float gy = D.H(pos.x, -pos.z) + .8f; if (pos.y < gy) pos.y = gy;
        }
        float k = 1 - Mathf.Exp(-dt * (st == S.Flight ? 3 : 5));
        camPos = camPos == Vector3.zero ? pos : Vector3.Lerp(camPos, pos, k); camLook = camLook == Vector3.zero ? look : Vector3.Lerp(camLook, look, k);
        cam.transform.position = camPos; cam.transform.LookAt(camLook);
    }

    void Fps(float raw)
    {
        fN++; fAcc += raw; fMax = Mathf.Max(fMax, raw);
        if (fAcc >= .5f)
        {
            int f = Mathf.RoundToInt(fN / fAcc);
            hud.SetFps(f + " FPS · worst " + Mathf.RoundToInt(fMax * 1000) + " ms · " + Screen.currentResolution.refreshRateRatio.value.ToString("0") + " Hz");
            fN = 0; fAcc = 0; fMax = 0;
        }
    }
}

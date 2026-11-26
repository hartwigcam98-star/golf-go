using System.Collections.Generic;
using UnityEngine;

/* The web game's small 3D bits (feel.js, divots.js, post-chain.js drawFlames), in the game's own coordinates (x east, Y up, y south;
   Unity's world is (x, Y, -y)):
     - divots: irons, pitches and flops from turf take a slab of grass that flies (higher the harder the swing), crumbs of soil,
       and leave a dark scar
     - pitch marks where a ball comes down on the green
     - water drops thrown up by a splash
     - leaves knocked out of a tree, birds lifting off (through the leaves; now and then near a big drive's landing)
     - the tee peg flying off a teed-up drive
     - flames along the flight of a dead-centre power shot (drawn over the finished picture, as the web's 2D overlay is)
   Everything is drawn each frame with instanced cubes, spheres and cylinders grouped by colour. */
public class Effects
{
    class P { public string k; public float x, y, Y, vx, vz, vy, s, life, ph, sp, th, om, dx, dy, L, r, delay, fl; public Color col; public bool rest; }
    class Div { public float x, y, Y, vx, vz, vy, th, om, yaw, L, W, Th; public Color col; public bool rest; public int bounce; }
    class Scar { public float x, y, dx, dy, L, W; }
    class Crumb { public float x, y, Y, vx, vz, vy, s; public Color col; }
    class Mark { public float x, y, dx, dy; }

    static Color Hex(string h) { ColorUtility.TryParseHtmlString(h, out var c); return c; }
    static readonly Dictionary<string, Color> DIV_COL = new Dictionary<string, Color> {
        { "fairway", Hex("#4f8f3a") }, { "cut", Hex("#4a8a36") }, { "rough", Hex("#3f7a2c") }, { "fescue", Hex("#9c8a4c") }, { "tee", Hex("#5a9a40") } };
    static readonly Color DIV_SOIL = Hex("#5b4129"), DIV_SCAR = Hex("#3e2c1c"), TEE_COL = Hex("#f4f1e8"), MARK = new Color(.19f, .31f, .13f);
    static readonly Color[] LEAF_COL = { Hex("#4f7a2e"), Hex("#6a8f34"), Hex("#3d6427"), Hex("#86963a") };

    readonly HoleData D; readonly List<P> parts = new List<P>(); readonly List<Div> divots = new List<Div>(); readonly List<Scar> scars = new List<Scar>();
    List<Crumb> crumbs = new List<Crumb>(); readonly List<Mark> marks = new List<Mark>();
    public Effects(HoleData d) { D = d; }
    float H(float x, float y) => D.H(x, y);
    static float R => Random.value;

    // ---------- divots (queueDivot + spawnDivot) ----------
    public static bool DivotFor(GolfGo.Sim.Club c, string stype, string lie, bool thin) => !c.putter && (c.kind == "iron" || c.kind == "wedge") && stype != "chip" && DIV_COL.ContainsKey(lie) && !thin;
    public void Divot(float bx, float by, float aim, float swing, string stype, string lie, bool fat)
    {
        float dx = Mathf.Sin(aim), dy = -Mathf.Cos(aim), sw = Mathf.Clamp(swing, .08f, 1), k = stype == "flop" ? 1.25f : stype == "punch" ? .55f : 1, big = fat ? 1.5f : 1;
        float x = bx + dx * .12f, y = by + dy * .12f, vis = 1.45f, L = .17f * vis * big * (.75f + .35f * sw), W = .085f * vis * big, Th = .03f * vis;
        float vy = (1.1f + 6.6f * sw) * k * (big > 1 ? 1.25f : 1), vf = (1.2f + 4.8f * sw) * (k > 1 ? .65f : k < 1 ? 1.2f : 1), side = (R - .5f) * 1.2f, g0 = H(x, y);
        divots.Add(new Div { x = x, y = y, Y = g0 + .03f, vx = dx * vf - dy * side, vz = dy * vf + dx * side, vy = vy, om = (6 + 10 * sw) * (R < .5f ? -1 : 1), yaw = Mathf.Atan2(dy, dx) + (R - .5f) * .4f, L = L, W = W, Th = Th, col = DIV_COL[lie] });
        if (divots.Count > 24) divots.RemoveAt(0);
        scars.Add(new Scar { x = x + dx * L * .4f, y = y + dy * L * .4f, dx = dx, dy = dy, L = L * 1.15f, W = W * 1.05f }); if (scars.Count > 40) scars.RemoveAt(0);
        crumbs = new List<Crumb>();
        for (int i = 0; i < 14; i++)
        {
            float a = R * Mathf.PI * 2, r = R;
            crumbs.Add(new Crumb { x = x, y = y, Y = g0 + .03f, vx = dx * vf * (.5f + r * .7f) + Mathf.Cos(a) * 1.4f * sw, vz = dy * vf * (.5f + r * .7f) + Mathf.Sin(a) * 1.4f * sw, vy = vy * (.35f + R * .75f), s = .012f + R * .018f, col = R < .55f ? DIV_SOIL : DIV_COL[lie] });
        }
    }
    // ---------- feel.js ----------
    void Add(P p) { parts.Add(p); if (parts.Count > 180) parts.RemoveAt(0); }
    public void Splash(float x, float y, bool soft)
    {
        float g = H(x, y); int n = soft ? 6 : 24;
        for (int i = 0; i < n; i++)
        {
            float a = R * Mathf.PI * 2, r = R;
            Add(new P { k = "drop", x = x, y = y, Y = g + .05f, vx = Mathf.Cos(a) * (.5f + r * 1.7f), vz = Mathf.Sin(a) * (.5f + r * 1.7f), vy = (soft ? 1.1f : 2.8f) + R * (soft ? 1 : 4.8f), s = .025f + R * .035f, life = 2.5f });
        }
    }
    public void Leaves(float x, float y, float Y, float tx, float ty, int n)
    {
        for (int i = 0; i < n; i++)
        {
            float a = R * Mathf.PI * 2;
            Add(new P { k = "leaf", x = x + (R - .5f) * .8f, y = y + (R - .5f) * .8f, Y = Y + (R - .5f) * .6f, vx = tx * 1.6f + Mathf.Cos(a) * 1.3f, vz = ty * 1.6f + Mathf.Sin(a) * 1.3f, vy = .4f + R * 1.3f, ph = R * Mathf.PI * 2, sp = 2 + R * 3, s = .055f + R * .03f, col = LEAF_COL[i % 4], life = 9 + R * 3 });
        }
    }
    // birdsFrom: a few birds lift out of a tree and fly away from (ax, ay)
    public void Birds(float tx, float ty, float tr, float ax, float ay, int n, float delay)
    {
        float top = H(tx, ty) + 2 + 1.35f * tr;
        for (int i = 0; i < n; i++)
        {
            float a = Mathf.Atan2(ty - ay, tx - ax) + (R - .5f) * 1.8f, v = 6 + R * 4;
            Add(new P { k = "bird", x = tx + (R - .5f) * tr, y = ty + (R - .5f) * tr, Y = top - .8f - R * 1.8f, vx = Mathf.Cos(a) * v, vz = Mathf.Sin(a) * v, vy = 2.2f + R * 2, ph = R * Mathf.PI * 2, fl = 15 + R * 7, life = 8, delay = delay + R * .35f });
        }
    }
    // birdsNear: a big drive: a tree 12-60 yd from where it comes down
    public void BirdsNear(GolfGo.Sim.SimHole sh, float px, float py, float delay)
    {
        var C = sh.trees.FindAll(t => !t.cactus && t.r > 1.5 && M2(t.x - px, t.y - py) > 12 && M2(t.x - px, t.y - py) < 60); if (C.Count == 0) return;
        var t0 = C[Random.Range(0, C.Count)]; Birds((float)t0.x, (float)t0.y, (float)t0.r, px, py, 3 + Random.Range(0, 4), delay);
    }
    static double M2(double a, double b) => System.Math.Sqrt(a * a + b * b);
    public void Tee(float x, float y, float aim, float pegK, float power, bool drv)
    {
        float dx = Mathf.Sin(aim), dy = -Mathf.Cos(aim), sd = (R - .5f) * .8f, v = (drv ? 2.5f : 1.5f) + power * (drv ? 3.5f : 2), g = H(x, y), L = .028f + pegK * .012f;
        Add(new P { k = "tee", x = x, y = y, Y = g + L * .5f, vx = dx * v - dy * sd * v, vz = dy * v + dx * sd * v, vy = (drv ? 2.2f : 1.2f) + power * 2, om = (12 + R * 10) * (R < .5f ? -1 : 1), dx = dx, dy = dy, L = L, r = .0035f, life = 40 });
    }
    public void PitchMark(float x, float y, float dx, float dy) { marks.Add(new Mark { x = x, y = y, dx = dx, dy = dy }); if (marks.Count > 12) marks.RemoveAt(0); }

    // ---------- stepping (stepDivots + stepParts) ----------
    public void Step(float dt, float windA, float windMph)
    {
        const float GR = 11;
        foreach (var d in divots)
        {
            if (d.rest) continue; d.vy -= GR * dt; d.x += d.vx * dt; d.y += d.vz * dt; d.Y += d.vy * dt; d.th += d.om * dt; float gnd = H(d.x, d.y) + d.Th * .5f;
            if (d.Y <= gnd && d.vy < 0) { d.Y = gnd; d.bounce++; if (d.bounce > 2 || Mathf.Abs(d.vy) < 1.2f) { d.rest = true; d.th = Mathf.Round(d.th / Mathf.PI) * Mathf.PI; } else { d.vy *= -.22f; d.vx *= .45f; d.vz *= .45f; d.om *= .4f; } }
        }
        foreach (var c in crumbs) { c.vy -= GR * dt; c.x += c.vx * dt; c.y += c.vz * dt; c.Y += c.vy * dt; }
        crumbs.RemoveAll(c => c.Y <= H(c.x, c.y) - .02f);
        float wx = Mathf.Sin(windA), wy = -Mathf.Cos(windA), wm = windMph * .035f;
        foreach (var p in parts)
        {
            p.life -= dt; if (p.delay > 0) { p.delay -= dt; continue; }
            if (p.k == "drop") { p.vy -= 18 * dt; p.x += p.vx * dt; p.y += p.vz * dt; p.Y += p.vy * dt; if (p.vy < 0 && p.Y < H(p.x, p.y)) p.life = 0; }
            else if (p.k == "leaf")
            {
                if (p.rest) continue; p.ph += p.sp * dt; float dmp = Mathf.Exp(-1.6f * dt); p.vx *= dmp; p.vz *= dmp; p.vy += (-.9f - p.vy) * 2.4f * dt;
                p.x += (p.vx + Mathf.Cos(p.ph) * .6f + wx * wm) * dt; p.y += (p.vz + Mathf.Sin(p.ph * .7f) * .6f + wy * wm) * dt; p.Y += p.vy * dt;
                float g = H(p.x, p.y); if (p.Y <= g + .01f) { p.Y = g + .01f; p.rest = true; }
            }
            else if (p.k == "bird") { p.ph += p.fl * dt; p.vy += (.5f - p.vy) * .7f * dt; p.x += p.vx * dt; p.y += p.vz * dt; p.Y += p.vy * dt; }
            else if (p.k == "tee")
            {
                if (p.rest) continue; p.vy -= 14 * dt; p.x += p.vx * dt; p.y += p.vz * dt; p.Y += p.vy * dt; p.th += p.om * dt; float g = H(p.x, p.y);
                if (p.Y <= g + .004f && p.vy < 0) { p.Y = g + .004f; if (Mathf.Abs(p.vy) < 1.6f) { p.rest = true; p.th = Mathf.PI / 2; } else { p.vy *= -.3f; p.vx *= .45f; p.vz *= .45f; p.om *= .5f; } }
            }
        }
        parts.RemoveAll(p => p.life <= 0);
    }

    // ---------- drawing (drawDivots + drawParts): boxes, spheres and cylinders, instanced by colour ----------
    static Material mat; static Mesh cube, sphere, cyl;
    readonly Dictionary<(Mesh, Color), List<Matrix4x4>> batch = new Dictionary<(Mesh, Color), List<Matrix4x4>>();
    readonly MaterialPropertyBlock mpb = new MaterialPropertyBlock();
    static Vector3 U(float x, float Y, float y) => new Vector3(x, Y, -y);   // a game point (x, up, y south) in Unity
    static Vector3 Uv(Vector3 v) => new Vector3(v.x, v.y, -v.z);              // a game vector (x, up, y south) in Unity
    void Put(Mesh m, Color c, Matrix4x4 M) { if (!batch.TryGetValue((m, c), out var l)) batch[(m, c)] = l = new List<Matrix4x4>(); l.Add(M); }
    // a matrix from three game-space axes (each the shape's full size along it) at a game-space point; kept right-handed for Unity
    static Matrix4x4 Mx(Vector3 at, Vector3 X, Vector3 Y, Vector3 Z)
    {
        Vector3 a = Uv(X), b = Uv(Y), c = Uv(Z); if (Vector3.Dot(Vector3.Cross(a, b), c) < 0) c = -c;
        var M = Matrix4x4.identity; M.SetColumn(0, a); M.SetColumn(1, b); M.SetColumn(2, c); M.SetColumn(3, new Vector4(at.x, at.y, -at.z, 1)); return M;
    }
    // boxAt (half axes), sphAt (radii along f, up, sd), cylAB (from A to B, radius r)
    void Box(Vector3 c, Vector3 X, Vector3 Y, Vector3 Z, Color col) => Put(cube, col, Mx(c, X * 2, Y * 2, Z * 2));
    void Sph(Vector3 c, float rx, float ry, float rz, Color col) => Put(sphere, col, Mx(c, new Vector3(rx * 2, 0, 0), new Vector3(0, ry * 2, 0), new Vector3(0, 0, rz * 2)));
    void Sph(Vector3 c, float rx, float ry, float rz, Color col, Vector3 f, Vector3 up, Vector3 sd) => Put(sphere, col, Mx(c, f * rx * 2, up * ry * 2, sd * rz * 2));
    void Cyl(Vector3 A, Vector3 B, float r, Color col)
    {   // game-space ends; the cylinder mesh runs y -1..1, radius .5
        var ax = B - A; float L = ax.magnitude; if (L < 1e-5f) return; var y = ax / L; var x = Vector3.Cross(y, Mathf.Abs(y.y) < .9f ? Vector3.up : Vector3.right).normalized; var z = Vector3.Cross(x, y);
        Put(cyl, col, Mx((A + B) / 2, x * r * 2, y * L / 2, z * r * 2));
    }
    public void Draw(Camera cam, float kAt1, bool hide)
    {   // kAt1: screen px (the web's CSS px) per yard at 1 yd from the camera; a thing d yd away gets kAt1 / d
        if (hide) return;
        if (mat == null)
        {
            mat = new Material(Shader.Find("Standard")) { enableInstancing = true }; mat.SetFloat("_Glossiness", .1f);
            cube = Prims.Get(PrimitiveType.Cube); sphere = Prims.Get(PrimitiveType.Sphere); cyl = Prims.Get(PrimitiveType.Cylinder);
        }
        foreach (var l in batch.Values) l.Clear();
        var E = cam.transform.position; float Px(float x, float Y, float y) => kAt1 / Mathf.Max(.3f, Vector3.Distance(E, U(x, Y, y)));
        foreach (var s in scars)
        {
            float h1 = H(s.x - s.dx * s.L * .5f, s.y - s.dy * s.L * .5f), h2 = H(s.x + s.dx * s.L * .5f, s.y + s.dy * s.L * .5f), hc = H(s.x, s.y);
            Box(new Vector3(s.x, hc + .012f, s.y), new Vector3(s.dx * s.L * .5f, (h2 - h1) * .5f, s.dy * s.L * .5f), new Vector3(0, .008f, 0), new Vector3(-s.dy * s.W * .5f, 0, s.dx * s.W * .5f), DIV_SCAR);
        }
        foreach (var d in divots)
        {
            var f = new Vector3(Mathf.Cos(d.yaw), 0, Mathf.Sin(d.yaw)); var sd = new Vector3(-f.z, 0, f.x); float c = Mathf.Cos(d.th), sn = Mathf.Sin(d.th);
            var u = new Vector3(f.x * c, sn, f.z * c); var v = new Vector3(-f.x * sn, c, -f.z * sn); var at = new Vector3(d.x, d.Y, d.y);
            Box(at + v * d.Th * .28f, u * d.L * .5f, v * d.Th * .22f, sd * d.W * .5f, d.col);
            Box(at - v * d.Th * .22f, u * d.L * .47f, v * d.Th * .28f, sd * d.W * .47f, DIV_SOIL);
        }
        foreach (var c in crumbs) Sph(new Vector3(c.x, c.Y, c.y), c.s, c.s, c.s, c.col);
        foreach (var p in parts)
        {
            if (p.delay > 0) continue; float px = Px(p.x, p.Y, p.y), fa = Mathf.Clamp01(p.life);
            if (p.k == "drop") { float s = Mathf.Max(p.s, 1.6f / px); Sph(new Vector3(p.x, p.Y, p.y), s, s * 1.3f, s, new Color(.84f, .91f, .97f)); }
            else if (p.k == "leaf")
            {
                float s = Mathf.Max(p.s, 2.2f / px), a = p.ph;
                Box(new Vector3(p.x, p.Y, p.y), new Vector3(Mathf.Cos(a) * s, Mathf.Sin(a * 1.3f) * s * .45f, Mathf.Sin(a) * s), new Vector3(0, s * .06f, 0), new Vector3(-Mathf.Sin(a) * s * .6f, 0, Mathf.Cos(a) * s * .6f), p.col);
            }
            else if (p.k == "bird")
            {
                float s = Mathf.Max(.18f, 10 / px), hd = Mathf.Atan2(p.vz, p.vx), fl = Mathf.Sin(p.ph) * .95f; var f = new Vector3(Mathf.Cos(hd), 0, Mathf.Sin(hd)); var sd = new Vector3(-f.z, 0, f.x); var B = new Vector3(p.x, p.Y, p.y);
                Sph(B, s * .3f, s * .1f, s * .1f, new Color(.13f, .12f, .11f), f, Vector3.up, sd);
                foreach (int sg in new[] { -1, 1 })
                {
                    var wv = new Vector3(sd.x * sg * Mathf.Cos(fl), Mathf.Sin(fl), sd.z * sg * Mathf.Cos(fl)); var nv = Vector3.Cross(wv, f).normalized;
                    Box(B + wv * s * .3f, wv * s * .3f, nv * s * .012f, f * s * .11f, new Color(.16f, .15f, .14f));
                }
            }
            else if (p.k == "tee")
            {
                float sc = Mathf.Max(1, 6 / (p.L * px)), L = p.L * sc; var ax = new Vector3(p.dx * Mathf.Sin(p.th), Mathf.Cos(p.th), p.dy * Mathf.Sin(p.th)); var A = new Vector3(p.x, p.Y, p.y);
                Cyl(A - ax * L * .5f, A + ax * L * .5f, p.r * sc, TEE_COL); Cyl(A + ax * L * .42f, A + ax * L * .52f, p.r * sc * 2.6f, TEE_COL);
            }
        }
        foreach (var m in marks) { float g = H(m.x, m.y); Sph(new Vector3(m.x, g + .0015f, m.y), .034f, .006f, .024f, MARK, new Vector3(m.dx, 0, m.dy), Vector3.up, new Vector3(-m.dy, 0, m.dx)); }
        foreach (var kv in batch)
        {
            var l = kv.Value; if (l.Count == 0) continue; mpb.SetColor("_Color", kv.Key.Item2);
            for (int o = 0; o < l.Count; o += 1023)
                Graphics.DrawMeshInstanced(kv.Key.Item1, 0, mat, l.GetRange(o, Mathf.Min(1023, l.Count - o)), mpb, UnityEngine.Rendering.ShadowCastingMode.On, true);
        }
    }

    // ---------- the power shot's flames (drawFlames): soft additive blobs along the last of the flight and a white-hot head ----------
    static Material flameMat; static Mesh flameMesh; readonly List<Vector3> trail = new List<Vector3>();
    readonly List<Vector3> fv = new List<Vector3>(); readonly List<Vector2> fuv = new List<Vector2>(); readonly List<Color> fcol = new List<Color>(); readonly List<int> fidx = new List<int>();
    public string flame;   // null, "red" or "blue"
    public void Trail(float x, float y, float Y) { trail.Add(new Vector3(x, Y, y)); if (trail.Count > 70) trail.RemoveAt(0); }
    public void ClearTrail() { trail.Clear(); }
    // draws into the finished picture (GolfGoLook calls it after the finish); hudK: device px per CSS px
    public void DrawFlames(Camera cam, float vfPx, float hudK)
    {
        if (flame == null || trail.Count < 2) return;
        if (flameMat == null) { var sh = Shader.Find("GolfGo/Flame"); if (sh == null || !sh.isSupported) return; flameMat = new Material(sh); flameMesh = new Mesh { name = "Flames" }; flameMesh.MarkDynamic(); }
        bool red = flame == "red";
        flameMat.SetColor("_C0", red ? new Color(1, .969f, .804f) : new Color(.922f, .973f, 1)); flameMat.SetColor("_C1", red ? new Color(1, .588f, .157f) : new Color(.353f, .686f, 1));
        flameMat.SetColor("_C2", red ? new Color(.882f, .157f, .078f) : new Color(.157f, .275f, 1));
        fv.Clear(); fuv.Clear(); fcol.Clear(); fidx.Clear();
        float W = cam.pixelWidth, Hh = cam.pixelHeight, T = Time.time;
        var tr = new List<Vector3>(); int m = Mathf.Min(trail.Count, 24);
        for (int i = trail.Count - m; i < trail.Count; i++) { var a = trail[Mathf.Max(0, i - 1)]; var b = trail[i]; for (int j = 1; j <= 3; j++) tr.Add(Vector3.Lerp(a, b, j / 3f)); }
        int n = tr.Count;
        void Quad(Vector3 sp, float r, float alpha, float head)
        {   // a screen-space square (device px), in 0..1 of the screen (drawn under GL.LoadOrtho)
            int o = fv.Count;
            foreach (var (qx, qy) in new[] { (-1, -1), (1, -1), (1, 1), (-1, 1) }) { fv.Add(new Vector3((sp.x + qx * r) / W, (sp.y + qy * r) / Hh, 0)); fuv.Add(new Vector2(qx, qy)); fcol.Add(new Color(alpha, head, 0, 0)); }
            fidx.AddRange(new[] { o, o + 1, o + 2, o, o + 2, o + 3 });
        }
        for (int i = n - 1; i >= 0; i--)
        {
            var p = tr[tr.Count - 1 - i]; float air = p.y - H(p.x, p.z); if (air < .25f) continue;
            var s = cam.WorldToScreenPoint(U(p.x, p.y + .05f, p.z)); if (s.z < .3f) continue; float k = (float)i / n, fade = Mathf.Min(1, air / 1.2f), px = vfPx / s.z / hudK;
            float fl = .8f + .25f * Mathf.Sin(T * 47 + i * 1.9f) + .15f * Mathf.Sin(T * 23 + i * .7f), r = Mathf.Clamp(2 * px, 10, 30) * Mathf.Pow(1 - k, .8f) * fl;
            float jx = Mathf.Sin(T * 31 + i * 2.3f) * r * .18f, jy = -k * r * .35f + Mathf.Cos(T * 27 + i) * r * .12f;   // (canvas y runs down: up is -y there, +y here)
            Quad(new Vector3(s.x + jx * hudK, s.y - jy * hudK), r * hudK, (1 - k) * .42f * fade, 0);
        }
        var h = tr[tr.Count - 1];
        if (h.y - H(h.x, h.z) > .25f) { var s = cam.WorldToScreenPoint(U(h.x, h.y + .05f, h.z)); if (s.z >= .3f) { float px = vfPx / s.z / hudK, r = Mathf.Clamp(1.3f * px, 8, 40) * (1 + .15f * Mathf.Sin(T * 60)); Quad(s, r * hudK, 1, 1); } }
        if (fv.Count == 0) return;
        flameMesh.Clear(); flameMesh.SetVertices(fv); flameMesh.SetUVs(0, fuv); flameMesh.SetColors(fcol); flameMesh.SetTriangles(fidx, 0); flameMesh.bounds = new Bounds(Vector3.zero, Vector3.one * 1e5f);
        GL.PushMatrix(); GL.LoadOrtho(); flameMat.SetPass(0); Graphics.DrawMeshNow(flameMesh, Matrix4x4.identity); GL.PopMatrix();
    }
    public int Count => parts.Count + divots.Count + crumbs.Count;
}

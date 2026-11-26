using System;
using System.Collections.Generic;
using UnityEngine;

/* Stage 6: the web game's golfer in Unity. The body (mesh, skeleton, skin weights, texture) and the swing are recorded from the web
   game itself (unity/SimTests/recorder/bake_golfer.js): its retargeted clips, arm and leg IK and club solve, frame by frame, for every
   club and swing type it uses. This plays them back:
     - at address and through the backswing: the pose for the meter (the web game's soft spring chases it: a little lag and a settle
       at the top), scaled by the shot type's backswing share (punch .6, chip .62, ...)
     - from the strike: the downswing, impact (IMPACT_T), follow-through and the held, relaxing finish, blended between the recorded
       backswing lengths (.4 / .7 / 1) by how far back he went (swingBack)
   Coordinates: the web game's 3D world is right-handed (x east, y up, z south); Unity's is left-handed (z north), so everything
   is mirrored in z on the way in (positions z -> -z, quaternions (x, y, z, w) -> (-x, -y, z, w), bind matrices S·M·S, triangles
   rewound). The rig is placed on the ball as the game places it: root at the rig's recorded spot in the ball frame, rig x away from
   the target line, y up, z toward the target, scale .94/100 (cm to yards, the rig's 94% height). */
public class Golfer
{
    public readonly string id;
    readonly Transform root; readonly Transform[] bones; readonly SkinnedMeshRenderer smr;
    readonly Transform shaft, grip, head; readonly Material clubMat, headMat;
    class Rig { public string ck, club; public bool putter; public float[] rootP; public float k; public Frame[] back; public float[] times; public List<Swing> swings = new List<Swing>(); }
    class Swing { public string type; public List<string> also = new List<string>(); public float back, end; public float[] b0; public Frame[][] levels; }
    class Frame { public Quaternion[] q; public Vector3 hip; public Vector3 grip, head, cd, fd, toe; }
    readonly Dictionary<string, Rig> rigs = new Dictionary<string, Rig>();
    public float ImpactT { get; private set; } = .1944f; public float PuttImpactT { get; private set; } = .18f;
    static readonly Dictionary<string, float[]> BackEnd = new Dictionary<string, float[]> {   // R3B_CFG: swing, backswing share, finish share
        { "full", new[] { 0, 1f, 1f } }, { "flop", new[] { 0, 1f, 1f } }, { "punch", new[] { 0, .6f, .5f } }, { "pitch", new[] { 1, 1f, 1f } }, { "chip", new[] { 1, .62f, .62f } },
        { "spin", new[] { 1, 1f, 1f } }, { "splash", new[] { 0, .8f, .85f } }, { "pick", new[] { 1, 1f, 1f } }, { "blast", new[] { 0, .65f, .7f } } };

    static float F(object o) => Convert.ToSingle(o);
    static float[] F32(string b64) { var b = Convert.FromBase64String(b64); var a = new float[b.Length / 4]; Buffer.BlockCopy(b, 0, a, 0, b.Length); return a; }
    static Vector3 Z(Vector3 v) => new Vector3(v.x, v.y, -v.z);
    static Quaternion Zq(float x, float y, float z, float w) => new Quaternion(-x, -y, z, w);

    public Golfer(string id, Material baseMat)
    {
        this.id = id;
        var B = (Dictionary<string, object>)GolfGo.Sim.MiniJson.Parse(Resources.Load<TextAsset>("golfers/" + id).text);
        var names = (List<object>)B["names"]; var parent = (List<object>)B["parent"]; int nb = names.Count;
        var rest = F32((string)B["restPos"]); var inv = F32((string)B["inv"]);
        root = new GameObject("Golfer " + id).transform;
        bones = new Transform[nb];
        for (int i = 0; i < nb; i++) bones[i] = new GameObject((string)names[i]).transform;
        for (int i = 0; i < nb; i++)
        {
            int p = Convert.ToInt32(parent[i]); bones[i].SetParent(p >= 0 ? bones[p] : root, false);
            bones[i].localPosition = Z(new Vector3(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]));
        }
        // the mesh, mirrored into Unity's axes
        int n = Convert.ToInt32(B["n"]); var pos = F32((string)B["pos"]); var uv = F32((string)B["uv"]);
        var nrm = B["nrm"] is string ns ? F32(ns) : null;
        var siB = Convert.FromBase64String((string)B["si"]); var si = new ushort[siB.Length / 2]; Buffer.BlockCopy(siB, 0, si, 0, siB.Length);
        float[] sw; if ((string)B["swType"] == "f32") sw = F32((string)B["sw"]); else { var u8 = Convert.FromBase64String((string)B["sw"]); sw = new float[u8.Length]; for (int i = 0; i < u8.Length; i++) sw[i] = u8[i] / 255f; }
        var ixB = Convert.FromBase64String((string)B["idx"]); var ix = new int[ixB.Length / 4]; Buffer.BlockCopy(ixB, 0, ix, 0, ixB.Length);
        bool alpha = B["alpha"] is bool al && al, dbl = B["double"] is bool db && db;
        var V = new Vector3[n]; var N = new Vector3[n]; var U = new Vector2[n]; var W = new BoneWeight[n];
        for (int i = 0; i < n; i++)
        {
            V[i] = Z(new Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])); if (nrm != null) N[i] = Z(new Vector3(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]));
            U[i] = new Vector2(uv[i * 2], uv[i * 2 + 1]);
            float w0 = sw[i * 4], w1 = sw[i * 4 + 1], w2 = sw[i * 4 + 2], w3 = sw[i * 4 + 3], s = w0 + w1 + w2 + w3; if (s <= 0) { w0 = 1; s = 1; }
            W[i] = new BoneWeight { boneIndex0 = si[i * 4], boneIndex1 = si[i * 4 + 1], boneIndex2 = si[i * 4 + 2], boneIndex3 = si[i * 4 + 3], weight0 = w0 / s, weight1 = w1 / s, weight2 = w2 / s, weight3 = w3 / s };
        }
        // the mirror turns the triangles inside out: rewind them; alpha-tested parts (hair, cap brims) get their back faces too
        int nt = ix.Length / 3; var T = new List<int>(ix.Length * (dbl ? 2 : 1));
        for (int t = 0; t < nt; t++) { T.Add(ix[t * 3]); T.Add(ix[t * 3 + 2]); T.Add(ix[t * 3 + 1]); }
        if (dbl) for (int t = 0; t < nt; t++) { T.Add(ix[t * 3]); T.Add(ix[t * 3 + 1]); T.Add(ix[t * 3 + 2]); }
        var mesh = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32, name = id };
        mesh.vertices = V; mesh.uv = U; if (nrm != null) mesh.normals = N; mesh.SetTriangles(T, 0); mesh.boneWeights = W;
        var bp = new Matrix4x4[nb]; var S = Matrix4x4.Scale(new Vector3(1, 1, -1));
        for (int i = 0; i < nb; i++)
        {
            var m = new Matrix4x4(); for (int c = 0; c < 4; c++) for (int r = 0; r < 4; r++) m[r, c] = inv[i * 16 + c * 4 + r];   // three.js: column-major
            bp[i] = S * m * S;
        }
        mesh.bindposes = bp; if (nrm == null) mesh.RecalculateNormals(); mesh.RecalculateBounds();
        var go = new GameObject("Body"); go.transform.SetParent(root, false);
        smr = go.AddComponent<SkinnedMeshRenderer>(); smr.sharedMesh = mesh; smr.bones = bones; smr.rootBone = bones[0]; smr.updateWhenOffscreen = true;
        var mat = new Material(baseMat) { color = Color.white, mainTexture = Resources.Load<Texture2D>("golfers/" + id + "_tex") };
        if (!alpha) { mat.DisableKeyword("_ALPHATEST_ON"); mat.SetFloat("_Mode", 0); mat.renderQueue = -1; }
        smr.sharedMaterial = mat; smr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
        // the club: shaft (#c9d3da), grip (#1d1f22), head (#23292e), as the game draws them
        clubMat = new Material(Shader.Find("Standard")) { color = new Color(.79f, .83f, .85f) }; headMat = new Material(Shader.Find("Standard")) { color = new Color(.14f, .16f, .18f) };
        Transform Part(string nm, PrimitiveType pt, Material m) { var o = new GameObject(nm); o.AddComponent<MeshFilter>().sharedMesh = Prims.Get(pt); o.AddComponent<MeshRenderer>().sharedMaterial = m; o.transform.SetParent(root.parent, false); return o.transform; }
        shaft = Part("Shaft", PrimitiveType.Cylinder, clubMat); grip = Part("Grip", PrimitiveType.Cylinder, new Material(Shader.Find("Standard")) { color = new Color(.11f, .12f, .13f) }); head = Part("Head", PrimitiveType.Cube, headMat);

        // the swing
        var J = (Dictionary<string, object>)GolfGo.Sim.MiniJson.Parse(Resources.Load<TextAsset>("golfers/" + id + "_swing").text);
        if (J.TryGetValue("impactT", out var it)) ImpactT = F(it); if (J.TryGetValue("puttImpactT", out var pit)) PuttImpactT = F(pit);
        foreach (Dictionary<string, object> r in (List<object>)J["rigs"])
        {
            var rg = new Rig { ck = (string)r["ck"], club = (string)r["club"], putter = r["putter"] is bool pb && pb, k = F(r["k"]) };
            var rp = (List<object>)r["root"]; rg.rootP = new[] { F(rp[0]), F(rp[1]), F(rp[2]) };
            var bk = (List<object>)r["back"]; rg.back = new Frame[bk.Count]; for (int i = 0; i < bk.Count; i++) rg.back[i] = Fr((Dictionary<string, object>)bk[i], nb);
            var tl = (List<object>)r["times"]; rg.times = new float[tl.Count]; for (int i = 0; i < tl.Count; i++) rg.times[i] = F(tl[i]);
            foreach (Dictionary<string, object> s in (List<object>)r["swings"])
            {
                var sw2 = new Swing { type = (string)s["type"], back = F(s["back"]), end = F(s["end"]) };
                foreach (var a in (List<object>)s["also"]) sw2.also.Add((string)a);
                var lv = (List<object>)s["levels"]; sw2.b0 = new float[lv.Count]; sw2.levels = new Frame[lv.Count][];
                for (int l = 0; l < lv.Count; l++)
                {
                    var L = (Dictionary<string, object>)lv[l]; sw2.b0[l] = F(L["b0"]); var fr = (List<object>)L["frames"]; sw2.levels[l] = new Frame[fr.Count];
                    for (int i = 0; i < fr.Count; i++) sw2.levels[l][i] = Fr((Dictionary<string, object>)fr[i], nb);
                }
                rg.swings.Add(sw2);
            }
            rigs[rg.ck + "|" + rg.club] = rg;
        }
    }
    static Frame Fr(Dictionary<string, object> f, int nb)
    {
        var qb = Convert.FromBase64String((string)f["q"]); var q16 = new short[qb.Length / 2]; Buffer.BlockCopy(qb, 0, q16, 0, qb.Length);
        var fr = new Frame { q = new Quaternion[nb] };
        for (int i = 0; i < nb; i++) fr.q[i] = Zq(q16[i * 4] / 32767f, q16[i * 4 + 1] / 32767f, q16[i * 4 + 2] / 32767f, q16[i * 4 + 3] / 32767f);
        var h = (List<object>)f["h"]; fr.hip = Z(new Vector3(F(h[0]), F(h[1]), F(h[2])));
        var c = (List<object>)f["c"]; Vector3 V3(int k) => new Vector3(F(c[k]), F(c[k + 1]), F(c[k + 2]));   // (ball frame: f, up, u)
        fr.grip = V3(0); fr.head = V3(3); fr.cd = V3(6); fr.fd = V3(9); fr.toe = V3(12);
        return fr;
    }

    // ---------- driving it ----------
    Rig rig; Swing swing; string clubId, stype = "full"; bool putter; float spX, spV;   // the backswing spring (x and velocity)
    Vector3 o, fU, uU;                // the ball frame in Unity's world: origin, f (away from the target line side), u (the aim)
    public void Destroy() { foreach (var t in new[] { root, shaft, grip, head }) if (t) UnityEngine.Object.Destroy(t.gameObject); }
    public void SetVisible(bool v) { root.gameObject.SetActive(v); shaft.gameObject.SetActive(v); grip.gameObject.SetActive(v); head.gameObject.SetActive(v); }
    // the club and shot about to be played (prepareShot / a club or shot change)
    public void Setup(string club, bool isPutter, string shotType)
    {
        putter = isPutter; clubId = club; stype = isPutter ? "putt" : shotType;
        string ck = isPutter ? "putt" : BackEnd.TryGetValue(shotType, out var be) ? (be[0] == 0 ? "drive" : "chip") : "drive";
        if (!rigs.TryGetValue(ck + "|" + club, out rig)) { foreach (var kv in rigs) if (kv.Value.ck == ck) { rig = kv.Value; break; } }
        swing = null; if (rig != null) foreach (var s in rig.swings) if (s.type == stype || s.also.Contains(stype)) { swing = s; break; }
        if (swing == null && rig != null && rig.swings.Count > 0) swing = rig.swings[0];
    }
    float BackShare => putter ? 1 : BackEnd.TryGetValue(stype, out var be) ? be[1] : 1;
    // place him at the ball: ball at game (x, y) with ground height h, aiming a
    public void Place(float x, float y, float h, float aim)
    {
        o = new Vector3(x, h, -y); fU = new Vector3(Mathf.Cos(aim), 0, -Mathf.Sin(aim)); uU = new Vector3(Mathf.Sin(aim), 0, Mathf.Cos(aim));
        if (rig == null) return;
        root.position = o + rig.rootP[0] * fU + rig.rootP[1] * Vector3.up + rig.rootP[2] * uU;
        root.rotation = Quaternion.LookRotation(-uU, Vector3.up); root.localScale = Vector3.one * rig.k;
    }
    Vector3 W(Vector3 p) => o + p.x * fU + p.y * Vector3.up + p.z * uU;
    Vector3 Wd(Vector3 v) => (v.x * fU + v.y * Vector3.up + v.z * uU).normalized;

    // address and backswing: target = the meter's position (0 at address); the web game's spring (K 150, damping .6 of critical)
    public void Backswing(float target, float dt, bool snap = false)
    {
        if (rig == null) return;
        if (snap) { spX = target; spV = 0; }
        else { const float K = 150; float Dm = 2 * Mathf.Sqrt(K) * .6f; int n = Mathf.Max(1, Mathf.CeilToInt(dt / .008f)); for (int i = 0; i < n; i++) { float h = dt / n; spV += (K * (target - spX) - Dm * spV) * h; spX += spV * h; } }
        // the recorded backswing is indexed by meter x (putts: the putter's own mapping is in it already); a shot type swings a share of it
        float x = Mathf.Clamp(spX, 0, 1.04f) * (putter ? 1 : BackShare);
        float fi = Mathf.Clamp(x / .04f, 0, rig.back.Length - 1); int i0 = Mathf.FloorToInt(fi), i1 = Mathf.Min(i0 + 1, rig.back.Length - 1);
        Apply(rig.back[i0], rig.back[i1], fi - i0);
    }
    public float SpringX => spX;
    // the swing from the strike: t seconds since the swing began (impact at ImpactT), back = swingBack (max(.15, power))
    public void SwingAt(float t, float back)
    {
        if (rig == null || swing == null) return;
        // the recorded backswing lengths bracketing this one (below the shortest: the shortest)
        var b0 = swing.b0; int l0 = 0; while (l0 < b0.Length - 2 && back > b0[l0 + 1]) l0++; int l1 = Mathf.Min(l0 + 1, b0.Length - 1);
        float wl = l1 == l0 ? 0 : Mathf.Clamp01((back - b0[l0]) / (b0[l1] - b0[l0]));
        var T = rig.times; int k = 0; while (k < T.Length - 2 && t > T[k + 1]) k++;
        float wt = t <= T[0] ? 0 : Mathf.Clamp01((t - T[k]) / (T[k + 1] - T[k]));
        if (t <= T[0]) { k = 0; wt = 0; }
        var A = Mix(swing.levels[l0][k], swing.levels[l0][Mathf.Min(k + 1, T.Length - 1)], wt);
        var Bq = Mix(swing.levels[l1][k], swing.levels[l1][Mathf.Min(k + 1, T.Length - 1)], wt);
        Apply(A, Bq, wl);
    }
    Frame Mix(Frame a, Frame b, float w)
    {
        var m = new Frame { q = new Quaternion[a.q.Length] };
        for (int i = 0; i < a.q.Length; i++) m.q[i] = Quaternion.Slerp(a.q[i], b.q[i], w);
        m.hip = Vector3.Lerp(a.hip, b.hip, w); m.grip = Vector3.Lerp(a.grip, b.grip, w); m.head = Vector3.Lerp(a.head, b.head, w);
        m.cd = Vector3.Slerp(a.cd, b.cd, w); m.fd = Vector3.Slerp(a.fd, b.fd, w); m.toe = Vector3.Slerp(a.toe, b.toe, w); return m;
    }
    void Apply(Frame a, Frame b, float w)
    {
        for (int i = 0; i < bones.Length; i++) bones[i].localRotation = Quaternion.Slerp(a.q[i], b.q[i], w);
        bones[0].localPosition = Vector3.Lerp(a.hip, b.hip, w);
        // the club, from the recorded grip and head (the shaft runs from 4 cm above the grip to the head)
        Vector3 g = W(Vector3.Lerp(a.grip, b.grip, w)), hd = W(Vector3.Lerp(a.head, b.head, w)), cd = Wd(Vector3.Slerp(a.cd, b.cd, w)), fd = Wd(Vector3.Slerp(a.fd, b.fd, w)), toe = Wd(Vector3.Slerp(a.toe, b.toe, w));
        Rod(shaft, g - cd * .04f, hd, .011f); Rod(grip, g - cd * .045f, g + cd * .2f, .015f);
        // the head: a wood's round head, an iron's blade, a putter's flat blade (toe, along the shaft, through the face)
        bool wood = clubId != null && (clubId.EndsWith("W") && clubId != "PW" && clubId != "GW" && clubId != "SW" && clubId != "LW" || clubId.EndsWith("H"));
        Vector3 size = putter ? new Vector3(.1f, .024f, .016f) : wood ? new Vector3(.11f, .045f, .1f) : new Vector3(.075f, .045f, .012f);
        head.position = hd - (wood ? fd * size.z * .5f : Vector3.zero); head.rotation = Quaternion.LookRotation(fd, cd); head.localScale = new Vector3(size.x, size.y, size.z);
        if (Vector3.Dot(head.right, toe) < 0) head.localScale = new Vector3(size.x, size.y, size.z);   // (a cube is symmetric: only the axes matter)
    }
    static void Rod(Transform t, Vector3 a, Vector3 b, float r)
    {
        var d = b - a; float L = d.magnitude; if (L < 1e-5f) return;
        t.position = (a + b) / 2; t.rotation = Quaternion.FromToRotation(Vector3.up, d / L); t.localScale = new Vector3(r * 2, L / 2, r * 2);
    }
}

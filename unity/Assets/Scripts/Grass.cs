using System.Collections.Generic;
using UnityEngine;

/* The web game's grass blades (post-chain.js R3G): five levels of blade tiles (110, 64, 36, 18 and 8 blades a square yard at most,
   4-yd tiles, the same random blades: r3GrassGeo with the web's rng), drawn where it's rough or fescue, densest round the ball (or
   the spot the look camera is on) and on the ground just ahead of a low camera, thinning out by 46 yd (r3GrassUpdate). The blades
   are built on the GPU (Assets/Shaders/GolfGoGrass.shader). Quality "fast" (the phones'): k = .7. */
public class Grass
{
    const int S = 4, MAXT = 1200; const float K = .7f;
    static readonly int[] CAPS = { 110, 64, 36, 18, 8 };
    static Mesh[] meshes; static Texture2D noise;
    readonly Material[] mats = new Material[5]; readonly ComputeBuffer[] bufs = new ComputeBuffer[5]; readonly int[] counts = new int[5];
    readonly List<Vector2>[] lists = new List<Vector2>[5];
    readonly HoleData D; readonly Texture2D ht; readonly Dictionary<long, bool> mask = new Dictionary<long, bool>();
    static readonly Bounds Big = new Bounds(Vector3.zero, Vector3.one * 1e5f);
    public bool ok;

    static Mesh Geo(int cap, int seed)
    {   // r3GrassGeo: n blades in a tile, each a 5-point blade (3 for the sparsest level): x across, y up, z its rank; uv0 its spot, uv1 two randoms
        int n = Mathf.RoundToInt(cap * S * S); var R = new GolfGo.Sim.Rng(seed); bool simple = cap < 12; int vpb = simple ? 3 : 5;
        float[][] shape = simple ? new[] { new[] { -1f, 0 }, new[] { 1f, 0 }, new[] { 0f, 1 } } : new[] { new[] { -1f, 0 }, new[] { 1f, 0 }, new[] { -.72f, .5f }, new[] { .72f, .5f }, new[] { 0f, 1 } };
        var v = new Vector3[n * vpb]; var u0 = new Vector2[n * vpb]; var u1 = new Vector2[n * vpb]; var idx = new List<int>(n * (simple ? 3 : 9));
        for (int i = 0; i < n; i++)
        {
            float ox = (float)R.Next() * S, oz = (float)R.Next() * S, a = (float)R.Next(), b = (float)R.Next(), rank = (i + .5f) / n;
            for (int k = 0; k < vpb; k++) { int o = i * vpb + k; v[o] = new Vector3(shape[k][0], shape[k][1], rank); u0[o] = new Vector2(ox, oz); u1[o] = new Vector2(a, b); }
            int q = i * vpb; if (simple) idx.AddRange(new[] { q, q + 1, q + 2 }); else idx.AddRange(new[] { q, q + 1, q + 2, q + 1, q + 3, q + 2, q + 2, q + 3, q + 4 });
        }
        var m = new Mesh { name = "Grass " + cap, indexFormat = v.Length > 65000 ? UnityEngine.Rendering.IndexFormat.UInt32 : UnityEngine.Rendering.IndexFormat.UInt16 };
        m.vertices = v; m.SetUVs(0, u0); m.SetUVs(1, u1); m.SetTriangles(idx, 0); m.bounds = Big; m.UploadMeshData(true); return m;
    }

    public Grass(HoleData d, Texture surf, Texture ground, Vector4 gSB, Vector4 gB, Vector4 tK)
    {
        D = d; var sh = Shader.Find("GolfGo/Grass"); var bm = Resources.Load<Material>("Mats/Grass");
        if (bm == null || bm.shader == null || !bm.shader.isSupported || !SystemInfo.supportsComputeShaders) return;
        if (meshes == null) { meshes = new Mesh[5]; for (int k = 0; k < 5; k++) meshes[k] = Geo(CAPS[k], 901 + k * 77); }
        if (noise == null)
        {
            var nb = Resources.Load<TextAsset>("troy/noise");
            noise = new Texture2D(256, 256, TextureFormat.RGBA32, true, true) { wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Trilinear };
            if (nb != null) { noise.LoadRawTextureData(nb.bytes); noise.Apply(true, true); }
        }
        // hT: the hole's heights (the ground mesh's own grid), one float a point
        var g = d.hg; ht = new Texture2D(g.nx, g.ny, TextureFormat.RFloat, false, true) { filterMode = FilterMode.Point, wrapMode = TextureWrapMode.Clamp };
        ht.SetPixelData(g.data, 0); ht.Apply(false, true);
        for (int k = 0; k < 5; k++)
        {
            var m = new Material(bm); m.SetTexture("_HT", ht); m.SetTexture("_Surf", surf); m.SetTexture("_MainTex", ground); m.SetTexture("_Noise", noise);
            m.SetVector("_HB", new Vector4(g.x0, g.y0, g.st, g.nx)); m.SetFloat("_HN", g.ny); m.SetVector("_GSB", gSB); m.SetVector("_GB", gB); m.SetVector("_TK", tK); m.SetFloat("_GCap", CAPS[k]);
            mats[k] = m; bufs[k] = new ComputeBuffer(MAXT, 8); lists[k] = new List<Vector2>(MAXT);
        }
        ok = true;
    }
    public void Dispose()
    {
        for (int k = 0; k < 5; k++) { bufs[k]?.Release(); if (mats[k]) Object.Destroy(mats[k]); }
        if (ht) Object.Destroy(ht); ok = false;
    }
    // r3GrassTileHas: a tile with rough (or fescue) anywhere on its 5 x 5 lie points
    bool TileHas(int i, int j)
    {
        long key = i * 100003L + j; if (mask.TryGetValue(key, out var v)) return v; var L = D.lg; v = false;
        for (int a = 0; a <= S && !v; a++) for (int b = 0; b <= S; b++)
        {
            int x = Mathf.FloorToInt(i * S + a - L.x0 + .5f), y = Mathf.FloorToInt(j * S + b - L.y0 + .5f);
            if (x < 0 || y < 0 || x >= L.nx || y >= L.ny) continue; int c = L.data[y * L.nx + x]; if (c == 1 || c == 0) { v = true; break; }
        }
        mask[key] = v; return v;
    }
    static float Smooth(float a, float b, float x) { float t = Mathf.Clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
    static float Dens(float d, float r0, float r1) => r1 <= 0 ? 0 : 1 - Smooth(r0, r1, d);

    // r3GrassUpdate: which tiles, at which level, this frame; then draw them. c0: the ball or the look point (game x, y)
    public void Draw(Camera cam, Vector2 c0, Vector2 ball, float windA, float windMph, bool hide)
    {
        if (!ok || hide) return;
        Vector3 Ew = cam.transform.position, Fw = cam.transform.forward, Rw = cam.transform.right;
        float ex = Ew.x, ez = -Ew.z, eY = Ew.y, eh = eY - D.H(ex, ez);
        Vector3 F = new Vector3(Fw.x, Fw.y, -Fw.z), Rt = new Vector3(Rw.x, Rw.y, -Rw.z);
        float r00 = 14 * K, r01 = 46 * K; var c1 = new Vector2(ex + F.x * 6, ez + F.z * 6); float r10 = eh < 12 ? 10 * K : 0, r11 = eh < 12 ? 30 * K : 0;
        float half = 1 / cam.projectionMatrix[0, 0];   // (W/2)/V.f
        for (int k = 0; k < 5; k++) lists[k].Clear();
        var seen = new HashSet<long>();
        void Try(int i, int j)
        {
            long key = i * 100003L + j; if (!seen.Add(key)) return;
            float x = i * S, z = j * S, cx = x + S / 2f, cz = z + S / 2f, rr = S * .71f;
            float d0 = Mathf.Max(0, Vector2.Distance(new Vector2(cx, cz), c0) - rr), d1 = Mathf.Max(0, Vector2.Distance(new Vector2(cx, cz), c1) - rr);
            float want = Mathf.Max(Dens(d0, r00, r01), Dens(d1, r10, r11)) * CAPS[0]; if (want < .4f) return;
            float dx = cx - ex, dz = cz - ez, dy = D.H(cx, cz) - eY, cz2 = dx * F.x + dy * F.y + dz * F.z;
            if (Mathf.Sqrt(dx * dx + dz * dz) > rr + 2)
            {
                if (cz2 < -rr) return; float cxs = dx * Rt.x + dz * Rt.z, sx = Mathf.Abs(cxs) / Mathf.Max(cz2, .5f);
                if (sx > half * 1.25f + rr / Mathf.Max(cz2, .5f)) return;
            }
            if (!TileHas(i, j)) return;
            int lv = 4; while (lv > 0 && CAPS[lv] < want) lv--; if (lists[lv].Count >= MAXT) return;
            lists[lv].Add(new Vector2(x, z));
        }
        foreach (var (c, r1) in new[] { (c0, r01), (c1, r11) })
        {
            if (r1 <= 0 || float.IsNaN(c.x) || float.IsNaN(c.y) || Mathf.Abs(c.x) > 1e5f || Mathf.Abs(c.y) > 1e5f) continue;   // (never an endless loop on a bad spot)
            int i0 = Mathf.FloorToInt((c.x - r1) / S), i1 = Mathf.FloorToInt((c.x + r1) / S), j0 = Mathf.FloorToInt((c.y - r1) / S), j1 = Mathf.FloorToInt((c.y + r1) / S);
            for (int j = j0; j <= j1; j++) for (int i = i0; i <= i1; i++) Try(i, j);
        }
        var wd = new Vector2(Mathf.Sin(windA), -Mathf.Cos(windA)); float ws = Mathf.Clamp01(windMph / 16);
        var gC0 = new Vector4(c0.x, c0.y, r00, r01); var gC1 = new Vector4(c1.x, c1.y, r10, Mathf.Max(r11, .01f)); var gD = new Vector4(CAPS[0], 0, ball.x, ball.y); var wV = new Vector4(wd.x, wd.y, .12f + .5f * ws, 0);
        for (int k = 0; k < 5; k++)
        {
            int n = lists[k].Count; if (n == 0) continue;
            bufs[k].SetData(lists[k]); var m = mats[k]; m.SetBuffer("_Tiles", bufs[k]);
            m.SetVector("_GC0", gC0); m.SetVector("_GC1", gC1); m.SetVector("_GD", gD); m.SetVector("_WV", wV);
            Graphics.DrawMeshInstancedProcedural(meshes[k], 0, m, Big, n, null, UnityEngine.Rendering.ShadowCastingMode.Off, true);
        }
    }
}

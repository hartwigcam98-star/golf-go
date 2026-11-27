using System.Collections.Generic;
using UnityEngine;

/* The web game's far trees (r3tFarBuild): thousands of tree pictures beyond the hole that fill the horizon, each a card turned to the
   camera. Exported per hole by export_far.js (hNN_far.bytes) with the picture atlas (trees/imp.png); drawn in one call (GolfGo/Far).
   Nov 26 (build 24): one ordinary mesh with each tree's data in its vertices (four corners a tree), in place of procedural instancing
   from a buffer, which drew nothing on the phone. */
public class FarTrees
{
    public string Why; public int N { get; private set; }   // (for the on-screen check)
    readonly GameObject go; readonly Mesh mesh;
    public FarTrees(string holePath, Transform parent)
    {
        var ta = CourseStore.Load<TextAsset>(holePath + "_far"); var bm = Resources.Load<Material>("Mats/Far");
        Why = ta == null ? "no data" : bm == null ? "no material" : bm.shader == null ? "no shader" : !bm.shader.isSupported ? "shader unsupported" : null;
        if (Why != null) return;
        var b = ta.bytes; int n = System.BitConverter.ToInt32(b, 0); if (n == 0) { Why = "0 trees"; return; }
        var f = new float[n * 14]; System.Buffer.BlockCopy(b, 4, f, 0, n * 56);
        var v = new Vector3[n * 4]; var uv = new Vector2[n * 4]; var p = new List<Vector4>(n * 4); var sz = new List<Vector4>(n * 4); var rc = new List<Vector4>(n * 4);
        var tg = new Vector4[n * 4]; var idx = new int[n * 6];
        Vector2[] corner = { new Vector2(-.5f, 0), new Vector2(.5f, 0), new Vector2(.5f, 1), new Vector2(-.5f, 1) }, cuv = { new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1), new Vector2(0, 1) };
        for (int i = 0; i < n; i++)
        {
            int o = i * 14;
            var P = new Vector4(f[o], f[o + 1], f[o + 2], f[o + 6]); var S = new Vector4(f[o + 3], f[o + 4], 0, 0); var R = new Vector4(f[o + 7], f[o + 8], f[o + 9], f[o + 10]); var C = new Vector4(f[o + 11], f[o + 12], f[o + 13], 0);
            P.w = f[o + 5];   // (the flip: the size's third value)
            for (int k = 0; k < 4; k++) { int q = i * 4 + k; v[q] = corner[k]; uv[q] = cuv[k]; p.Add(P); sz.Add(S); rc.Add(R); tg[q] = C; }
            int a = i * 4; idx[i * 6] = a; idx[i * 6 + 1] = a + 1; idx[i * 6 + 2] = a + 2; idx[i * 6 + 3] = a; idx[i * 6 + 4] = a + 2; idx[i * 6 + 5] = a + 3;
        }
        mesh = new Mesh { name = "Far trees", indexFormat = n * 4 > 65000 ? UnityEngine.Rendering.IndexFormat.UInt32 : UnityEngine.Rendering.IndexFormat.UInt16 };
        mesh.vertices = v; mesh.uv = uv; mesh.SetUVs(1, p); mesh.SetUVs(2, sz); mesh.SetUVs(3, rc); mesh.tangents = tg; mesh.normals = new Vector3[n * 4];
        mesh.SetTriangles(idx, 0); mesh.bounds = new Bounds(Vector3.zero, Vector3.one * 1e5f); mesh.UploadMeshData(true);
        go = new GameObject("Far trees"); go.transform.SetParent(parent, false);
        go.AddComponent<MeshFilter>().sharedMesh = mesh; var r = go.AddComponent<MeshRenderer>(); r.sharedMaterial = bm;
        r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off; r.receiveShadows = false; N = n;
    }
    public void Draw() { }   // (a renderer of its own now)
    public void Dispose() { if (go) Object.Destroy(go); if (mesh) Object.Destroy(mesh); N = 0; }
}

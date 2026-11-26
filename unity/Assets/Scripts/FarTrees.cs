using UnityEngine;

/* The web game's far trees (r3tFarBuild): thousands of tree pictures beyond the hole that fill the horizon, each a card turned to the
   camera. Exported per hole by export_far.js (hNN_far.bytes) with the picture atlas (trees/imp.png); drawn in one call (GolfGo/Far). */
public class FarTrees
{
    static Mesh quad; ComputeBuffer buf; Material mat; int n; static readonly Bounds Big = new Bounds(Vector3.zero, Vector3.one * 1e5f);
    public FarTrees(string holePath)
    {
        var ta = Resources.Load<TextAsset>(holePath + "_far"); var bm = Resources.Load<Material>("Mats/Far");
        if (ta == null || bm == null || bm.shader == null || !bm.shader.isSupported || !SystemInfo.supportsComputeShaders) return;
        var b = ta.bytes; n = System.BitConverter.ToInt32(b, 0); if (n == 0) return;
        var f = new float[n * 14]; System.Buffer.BlockCopy(b, 4, f, 0, n * 56);
        buf = new ComputeBuffer(n, 56); buf.SetData(f); mat = new Material(bm); mat.SetBuffer("_Far", buf);
        if (quad == null)
        {
            quad = new Mesh { name = "Far tree" };
            quad.vertices = new[] { new Vector3(-.5f, 0, 0), new Vector3(.5f, 0, 0), new Vector3(.5f, 1, 0), new Vector3(-.5f, 1, 0) };
            quad.uv = new[] { new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1), new Vector2(0, 1) }; quad.triangles = new[] { 0, 1, 2, 0, 2, 3 };
            quad.normals = new[] { Vector3.back, Vector3.back, Vector3.back, Vector3.back }; quad.bounds = Big;
        }
    }
    public void Draw() { if (buf != null) Graphics.DrawMeshInstancedProcedural(quad, 0, mat, Big, n, null, UnityEngine.Rendering.ShadowCastingMode.Off, false); }
    public void Dispose() { buf?.Release(); buf = null; if (mat) Object.Destroy(mat); }
}

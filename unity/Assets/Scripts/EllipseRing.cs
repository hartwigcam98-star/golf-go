using UnityEngine;
using UnityEngine.UI;

// an ellipse outline of a set line width (the web game's ctx.ellipse + stroke), drawn as a UI mesh so the line stays the same
// width however flat the ellipse is. rx, ry and width in canvas units; centred on the RectTransform's pivot.
public class EllipseRing : MaskableGraphic
{
    public float rx = 10, ry = 5, width = 2;
    public void Set(float x, float y, float w) { rx = x; ry = y; width = w; SetVerticesDirty(); }
    protected override void OnPopulateMesh(VertexHelper vh)
    {
        vh.Clear(); const int N = 48; var c = (Color32)color;
        for (int i = 0; i <= N; i++)
        {
            float a = i * Mathf.PI * 2 / N, cs = Mathf.Cos(a), sn = Mathf.Sin(a);
            // the normal of an ellipse at (rx cos, ry sin) is (ry cos, rx sin), normalised: offset the line half its width each side
            var nrm = new Vector2(ry * cs, rx * sn); float l = nrm.magnitude; nrm = l > 1e-4f ? nrm / l : new Vector2(cs, sn);
            var p = new Vector2(rx * cs, ry * sn);
            vh.AddVert(p + nrm * width / 2, c, Vector2.zero); vh.AddVert(p - nrm * width / 2, c, Vector2.zero);
            if (i > 0) { int k = i * 2; vh.AddTriangle(k - 2, k - 1, k); vh.AddTriangle(k - 1, k + 1, k); }
        }
    }
}

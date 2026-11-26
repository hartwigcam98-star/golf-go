using UnityEngine;

/* The water's mirror (Stage 6): the web game reflects the scene in its water (a planar reflection render target, rfT). This renders
   the same: a second camera mirrored in the water's plane (y = level), clipped at the plane (oblique near plane) so nothing below
   the water shows, at half the screen's size, without shadows and without the water itself, into a texture the water shader samples
   at each pixel's screen position. Called once a frame, before the main camera renders. */
public class WaterReflect
{
    Camera rc; RenderTexture rt; readonly Material mat; float level; public bool on = true;
    public const int WaterLayer = 4;   // Unity's built-in "Water" layer
    public WaterReflect(Material m) { mat = m; }
    public void SetLevel(float y) => level = y;
    public void Render(Camera cam)
    {
        if (!on || mat == null) { if (mat) mat.SetFloat("_ReflOn", 0); return; }
        int w = Mathf.Max(64, cam.pixelWidth / 2), h = Mathf.Max(64, cam.pixelHeight / 2);
        if (rt == null || rt.width != w || rt.height != h) { if (rt) Object.Destroy(rt); rt = new RenderTexture(w, h, 16) { name = "WaterRefl", hideFlags = HideFlags.DontSave }; }
        if (rc == null) { var go = new GameObject("Water reflection") { hideFlags = HideFlags.HideAndDontSave }; rc = go.AddComponent<Camera>(); rc.enabled = false; }
        rc.CopyFrom(cam); rc.cullingMask = cam.cullingMask & ~(1 << WaterLayer); rc.targetTexture = rt; rc.allowMSAA = false;
        // mirror the camera in the plane y = level
        var n = Vector3.up; var p = new Vector3(0, level, 0); float d = -Vector3.Dot(n, p);
        var R = Reflection(new Vector4(n.x, n.y, n.z, d));
        rc.worldToCameraMatrix = cam.worldToCameraMatrix * R;
        // clip everything below the water: an oblique near plane on the mirror plane (a hair above it)
        var cp = CameraSpacePlane(rc, p + n * .02f, n);
        rc.projectionMatrix = cam.CalculateObliqueMatrix(cp);
        var sd = QualitySettings.shadowDistance; QualitySettings.shadowDistance = 0;
        GL.invertCulling = true; rc.Render(); GL.invertCulling = false;
        QualitySettings.shadowDistance = sd;
        mat.SetTexture("_ReflTex", rt); mat.SetFloat("_ReflOn", 1);
    }
    static Vector4 CameraSpacePlane(Camera c, Vector3 pos, Vector3 normal)
    {
        var m = c.worldToCameraMatrix; var cpos = m.MultiplyPoint(pos); var cn = m.MultiplyVector(normal).normalized;
        return new Vector4(cn.x, cn.y, cn.z, -Vector3.Dot(cpos, cn));
    }
    static Matrix4x4 Reflection(Vector4 pl)
    {
        var m = new Matrix4x4();
        m.m00 = 1 - 2 * pl[0] * pl[0]; m.m01 = -2 * pl[0] * pl[1]; m.m02 = -2 * pl[0] * pl[2]; m.m03 = -2 * pl[3] * pl[0];
        m.m10 = -2 * pl[1] * pl[0]; m.m11 = 1 - 2 * pl[1] * pl[1]; m.m12 = -2 * pl[1] * pl[2]; m.m13 = -2 * pl[3] * pl[1];
        m.m20 = -2 * pl[2] * pl[0]; m.m21 = -2 * pl[2] * pl[1]; m.m22 = 1 - 2 * pl[2] * pl[2]; m.m23 = -2 * pl[3] * pl[2];
        m.m30 = 0; m.m31 = 0; m.m32 = 0; m.m33 = 1; return m;
    }
}

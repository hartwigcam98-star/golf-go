using UnityEngine;

/* The web game's light and finish on the Unity camera (sky.js, weather.js, lighting-shared-by-every.js, post-chain.js):
   - the sun: SUN (-.52, .58, .63) normalised, colour SUN_COL (1.5, 1.36, 1.12) x the weather's sun strength, in linear light
     (three's lights divide by pi and the web's sun is SUN_COL x pi; Unity's don't: the same numbers);
   - the sky (GolfGo/Sky) as the skybox, which also lights the course: ambient from the sky (x the weather's env) and the sky's
     reflections, as the web's image-based light from the sky;
   - the clouds' shadows drifting over the course (the sun's cookie, GolfGo/CloudShadow);
   - the weather (R3_WX): Sunny, Partly cloudy, Cloudy, Overcast: sun, exposure, sky light, cloud cover, grey;
   - the finish (GolfGo/Post): haze, filmic curve x exposure, grade, vignette. */
[RequireComponent(typeof(Camera))]
public class GolfGoLook : MonoBehaviour
{
    public static readonly (string n, float sun, float ex, float env, float cov, float g)[] WX = {
        ("Sunny", 1, 1, 1, .3f, 0), ("Partly cloudy", .68f, .94f, 1.05f, .56f, .25f), ("Cloudy", .42f, .8f, .95f, .86f, .62f), ("Overcast", .2f, .68f, .88f, 1, .92f) };
    static readonly Vector3 SUNW = new Vector3(-.52f, .58f, .63f).normalized;   // the web's (x, up, z south)
    public Light sun; public int wx; Material post, cookieMat, sky; RenderTexture cookie, refl; Camera cam, reflCam; Texture2D noise;
    const float COOKIE = 3000;

    public static Vector3 SunUnity => new Vector3(SUNW.x, SUNW.y, -SUNW.z);
    public bool Ok => post != null;

    void Awake()
    {
        cam = GetComponent<Camera>(); cam.allowHDR = true; cam.depthTextureMode |= DepthTextureMode.Depth;
        var ps = Shader.Find("GolfGo/Post"); var ss = Shader.Find("GolfGo/Sky"); var cs = Shader.Find("GolfGo/CloudShadow");
        if (ps != null && ps.isSupported) post = new Material(ps);
        if (ss != null && ss.isSupported) { sky = new Material(ss); RenderSettings.skybox = sky; }
        if (cs != null && cs.isSupported) cookieMat = new Material(cs);
        var nb = Resources.Load<TextAsset>("troy/noise");
        noise = new Texture2D(256, 256, TextureFormat.RGBA32, true, true) { wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Trilinear };
        if (nb != null) { noise.SetPixelData(nb.bytes, 0); noise.Apply(true, true); }   // (the top level only: the mips are made from it; LoadRawTextureData wants every mip and threw)
        Shader.SetGlobalTexture("_GGNoise", noise); Shader.SetGlobalVector("_GGSun", SUNW);
        RenderSettings.fog = false;   // (the haze is the finish's)
    }
    // r3ApplyWx: the weather for this round
    public void Weather(int i)
    {
        wx = Mathf.Clamp(i, 0, WX.Length - 1); var w = WX[wx];
        Shader.SetGlobalFloat("_GGCloudOn", w.cov); Shader.SetGlobalFloat("_GGWxG", w.g);
        if (sun)
        {
            sun.transform.rotation = Quaternion.LookRotation(-SunUnity);
            // SUN_COL x sun strength, linear (lightsUseLinearIntensity): colour = its normalised hue, intensity = the red channel
            sun.color = new Color(1, 1.36f / 1.5f, 1.12f / 1.5f).gamma; sun.intensity = 1.5f * w.sun;
            sun.shadows = LightShadows.Soft; sun.shadowStrength = 1;
            if (cookieMat != null)
            {
                if (cookie == null) { cookie = new RenderTexture(256, 256, 0, RenderTextureFormat.ARGB32) { wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear }; cookie.Create(); }
                sun.cookie = cookie; sun.cookieSize = COOKIE;
            }
        }
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Skybox; RenderSettings.ambientIntensity = w.env;
        RenderSettings.defaultReflectionMode = UnityEngine.Rendering.DefaultReflectionMode.Custom; RenderSettings.reflectionIntensity = w.env;
        Shader.SetGlobalVector("_GGE", Vector3.zero); Shader.SetGlobalFloat("_GGTime", Time.time);
        DynamicGI.UpdateEnvironment();   // the sky's light, worked out again for this sky
        // the sky's reflections: the sky alone, into a cube
        if (refl == null) { refl = new RenderTexture(128, 128, 16, RenderTextureFormat.ARGBHalf) { dimension = UnityEngine.Rendering.TextureDimension.Cube, useMipMap = true, autoGenerateMips = true }; refl.Create(); }
        if (reflCam == null) { var go = new GameObject("Sky reflection") { hideFlags = HideFlags.HideAndDontSave }; reflCam = go.AddComponent<Camera>(); reflCam.enabled = false; reflCam.cullingMask = 0; reflCam.clearFlags = CameraClearFlags.Skybox; reflCam.allowHDR = true; }
        reflCam.RenderToCubemap(refl, 63); RenderSettings.customReflectionTexture = refl;
    }
    void LateUpdate()
    {
        var E = transform.position; Shader.SetGlobalVector("_GGE", new Vector3(E.x, E.y, -E.z)); Shader.SetGlobalFloat("_GGTime", Time.time);
        if (sun && cookie != null && cookieMat != null)
        {   // the cookie round the camera: the light sits at the origin; texels wrap every COOKIE yards in its plane
            var R = sun.transform.right; var U = sun.transform.up; sun.transform.position = Vector3.zero;
            cookieMat.SetVector("_GGLightO", new Vector4(0, 0, Vector3.Dot(E, R), Vector3.Dot(E, U)));
            cookieMat.SetVector("_GGLightR", R); cookieMat.SetVector("_GGLightU", U); cookieMat.SetFloat("_GGCookieS", COOKIE);
            Graphics.Blit(null, cookie, cookieMat);
        }
    }
    public int Posts;   // (finish passes run: for the on-screen check)
    void OnRenderImage(RenderTexture src, RenderTexture dst)
    {
        Posts++;
        if (post == null) { Graphics.Blit(src, dst); return; }
        var w = WX[wx]; post.SetFloat("_GGExpo", .97f * w.ex); post.SetFloat("_GGAsp", (float)cam.pixelWidth / cam.pixelHeight);
        post.SetMatrix("_GGInvProj", cam.projectionMatrix.inverse); post.SetMatrix("_GGCamToWorld", cam.cameraToWorldMatrix);
        Graphics.Blit(src, dst, post);
    }
}

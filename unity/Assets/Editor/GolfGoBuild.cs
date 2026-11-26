using System;
using System.IO;
using UnityEditor;
using UnityEditor.Callbacks;
using UnityEditor.SceneManagement;
using UnityEngine;
#if UNITY_IOS
using UnityEditor.iOS.Xcode;
#endif

/* Batch build for the Unity test (run by .github/workflows/unity-test.yml):
   Unity -batchmode -quit -projectPath unity -buildTarget iOS -executeMethod GolfGoBuild.BuildIOS
   Makes the materials and the one scene in code (nothing hand-made in the editor), sets the iPhone player settings
   (bundle ID Golfgo, version 2.0, build number from BUILD_NUMBER) and writes the Xcode project to unity/build/iOS. */
public static class GolfGoBuild
{
    static Material Mat(string name, Color c, float smooth = .1f)
    {
        Directory.CreateDirectory("Assets/Resources/Mats");
        string p = "Assets/Resources/Mats/" + name + ".mat";
        var m = AssetDatabase.LoadAssetAtPath<Material>(p);
        if (!m) { m = new Material(Shader.Find("Standard")); AssetDatabase.CreateAsset(m, p); }
        m.color = c; m.SetFloat("_Glossiness", smooth); m.SetFloat("_Metallic", 0); m.enableInstancing = true; EditorUtility.SetDirty(m);
        return m;
    }

    public static void Prepare()
    {
        Mat("Ground", Color.white, 0); Mat("Leaf", new Color(.27f, .42f, .2f)); Mat("Needle", new Color(.17f, .3f, .2f));
        Mat("Bark", new Color(.32f, .25f, .18f)); Mat("White", new Color(.96f, .96f, .94f), .4f); Mat("Red", new Color(.85f, .16f, .14f));
        Mat("Dark", new Color(.08f, .09f, .1f)); Mat("Gold", new Color(1, .79f, .24f)); Mat("Shirt", new Color(.47f, .7f, .92f));
        Mat("Pants", new Color(.93f, .92f, .88f)); Mat("Skin", new Color(.86f, .66f, .52f));
        // every hole's course map texture at full size (it holds every fairway stripe and bunker edge), and its Blender-baked light
        // (sun shadows of every tree, sky occlusion), the same map the web game uses, as a x2 detail map: 0.5 = full sun and open sky
        foreach (var f in System.IO.Directory.GetFiles("Assets/Resources/troy"))
        {
            string a = f.Replace('\\', '/');
            if (a.EndsWith("_ground.jpg")) { var ti = AssetImporter.GetAtPath(a) as TextureImporter; if (ti) { ti.maxTextureSize = 4096; ti.mipmapEnabled = true; ti.wrapMode = TextureWrapMode.Clamp; ti.anisoLevel = 4; ti.SaveAndReimport(); } }
            else if (a.EndsWith("_light.png")) { var li = AssetImporter.GetAtPath(a) as TextureImporter; if (li) { li.maxTextureSize = 4096; li.wrapMode = TextureWrapMode.Clamp; li.sRGBTexture = false; li.SaveAndReimport(); } }
        }
        var g = Mat("Ground", Color.white, 0);   // (each hole sets its own textures on a copy at run time)
        g.SetFloat("_UVSec", 0); g.EnableKeyword("_DETAIL_MULX2"); EditorUtility.SetDirty(g);
        // leaf cards: the web game's own leaf atlas (4 x 4 clusters), alpha-tested
        var lf = AssetImporter.GetAtPath("Assets/Resources/leaves.png") as TextureImporter;
        if (lf) { lf.maxTextureSize = 2048; lf.alphaIsTransparency = true; lf.mipmapEnabled = true; lf.SaveAndReimport(); }
        var leafTex = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Resources/leaves.png");
        foreach (var (n, c) in new[] { ("Leaf0", new Color(.55f, .78f, .4f)), ("Leaf1", new Color(.45f, .7f, .35f)), ("Leaf2", new Color(.62f, .8f, .42f)), ("Leaf3", new Color(.4f, .62f, .32f)), ("Pine", new Color(.38f, .58f, .4f)) })
        {
            var m = Mat(n, c, .05f); m.mainTexture = leafTex;
            m.SetFloat("_Mode", 1); m.SetFloat("_Cutoff", .45f); m.SetOverrideTag("RenderType", "TransparentCutout");
            m.SetInt("_SrcBlend", 1); m.SetInt("_DstBlend", 0); m.SetInt("_ZWrite", 1); m.EnableKeyword("_ALPHATEST_ON");
            m.renderQueue = 2450; EditorUtility.SetDirty(m);
        }
        // sky
        Directory.CreateDirectory("Assets/Resources/Mats");
        var skyP = "Assets/Resources/Mats/Sky.mat"; var sky = AssetDatabase.LoadAssetAtPath<Material>(skyP);
        if (!sky) { sky = new Material(Shader.Find("Skybox/Procedural")); AssetDatabase.CreateAsset(sky, skyP); }
        sky.SetFloat("_SunSize", .03f); sky.SetFloat("_AtmosphereThickness", .9f); sky.SetColor("_SkyTint", new Color(.45f, .6f, .85f));
        sky.SetColor("_GroundColor", new Color(.42f, .5f, .4f)); sky.SetFloat("_Exposure", 1.25f); EditorUtility.SetDirty(sky);
        AssetDatabase.SaveAssets();
        // the scene: one object that builds everything at start
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var cam = new GameObject("Main Camera"); cam.tag = "MainCamera"; cam.AddComponent<Camera>(); cam.AddComponent<AudioListener>();
        new GameObject("Hole").AddComponent<HoleTest>();
        Directory.CreateDirectory("Assets/Scenes");
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/Hole.unity");
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene("Assets/Scenes/Hole.unity", true) };
    }

    public static void BuildIOS()
    {
        try
        {
            Prepare();
            PlayerSettings.companyName = "Golf Go"; PlayerSettings.productName = "Golf Go";
            PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.iOS, "Golfgo");
            PlayerSettings.bundleVersion = Environment.GetEnvironmentVariable("APP_VERSION") ?? "2.0";
            PlayerSettings.iOS.buildNumber = Environment.GetEnvironmentVariable("BUILD_NUMBER") ?? "1";
            PlayerSettings.iOS.targetOSVersionString = "15.0";
            PlayerSettings.iOS.appleEnableAutomaticSigning = false;
            var team = Environment.GetEnvironmentVariable("TEAM"); if (!string.IsNullOrEmpty(team)) PlayerSettings.iOS.appleDeveloperTeamID = team;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.SplashScreen.show = false;
            // the app icon (the same gold flag as the web app); App Store Connect refuses a build without the 1024 one
            AssetDatabase.ImportAsset("Assets/Icon.png");
            var icon = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Icon.png");
            if (icon)
            {
                PlayerSettings.SetIcons(UnityEditor.Build.NamedBuildTarget.Unknown, new[] { icon }, IconKind.Any);
                foreach (IconKind k in new[] { IconKind.Application, IconKind.Store, IconKind.Settings, IconKind.Notification, IconKind.Spotlight })
                {
                    int n = PlayerSettings.GetIconSizes(UnityEditor.Build.NamedBuildTarget.iOS, k).Length;
                    if (n > 0) { var a = new Texture2D[n]; for (int i = 0; i < n; i++) a[i] = icon; PlayerSettings.SetIcons(UnityEditor.Build.NamedBuildTarget.iOS, a, k); }
                }
            }
            else Debug.LogError("GolfGoBuild: Assets/Icon.png missing");
            PlayerSettings.statusBarHidden = true;
            QualitySettings.antiAliasing = 4;
            var r = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { "Assets/Scenes/Hole.unity" }, locationPathName = "build/iOS", target = BuildTarget.iOS, options = BuildOptions.None });
            Debug.Log("GolfGoBuild result: " + r.summary.result + " size " + r.summary.totalSize + " errors " + r.summary.totalErrors);
            EditorApplication.Exit(r.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded ? 0 : 1);
        }
        catch (Exception e) { Debug.LogError("GolfGoBuild failed: " + e); EditorApplication.Exit(1); }
    }

#if UNITY_IOS
    // ProMotion: let the app ask for 120 Hz; no export-compliance question per build
    [PostProcessBuild(1)]
    public static void Plist(BuildTarget t, string path)
    {
        if (t != BuildTarget.iOS) return;
        var p = Path.Combine(path, "Info.plist"); var doc = new PlistDocument(); doc.ReadFromFile(p);
        doc.root.SetBoolean("CADisableMinimumFrameDurationOnPhone", true);
        doc.root.SetBoolean("ITSAppUsesNonExemptEncryption", false);
        doc.root.SetString("CFBundleDisplayName", "Golf Go");
        doc.WriteToFile(p);
    }
#endif
}

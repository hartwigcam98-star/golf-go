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
            // (the ground shader samples every ground texture raw, as the web game does: sRGB off)
            if (a.EndsWith("_ground.jpg")) { var ti = AssetImporter.GetAtPath(a) as TextureImporter; if (ti) { ti.maxTextureSize = 4096; ti.mipmapEnabled = true; ti.wrapMode = TextureWrapMode.Clamp; ti.anisoLevel = 4; ti.sRGBTexture = false; ti.SaveAndReimport(); } }
            else if (a.EndsWith("_light.png")) { var li = AssetImporter.GetAtPath(a) as TextureImporter; if (li) { li.maxTextureSize = 4096; li.wrapMode = TextureWrapMode.Clamp; li.sRGBTexture = false; li.SaveAndReimport(); } }
            else if (a.EndsWith("_surf.png")) { var si = AssetImporter.GetAtPath(a) as TextureImporter; if (si) { si.maxTextureSize = 1024; si.mipmapEnabled = false; si.wrapMode = TextureWrapMode.Clamp; si.sRGBTexture = false; si.filterMode = FilterMode.Bilinear; si.textureCompression = TextureImporterCompression.Uncompressed; si.npotScale = TextureImporterNPOTScale.None; si.SaveAndReimport(); } }
            else if (a.EndsWith(".png") || a.EndsWith(".jpg"))
            {   // the shared ground textures: tiling detail and photographed turf repeat with mips; the surroundings map clamps
                var di = AssetImporter.GetAtPath(a) as TextureImporter; if (!di) continue; bool sur = a.EndsWith("surround.png");
                di.maxTextureSize = 2048; di.mipmapEnabled = true; di.wrapMode = sur ? TextureWrapMode.Clamp : TextureWrapMode.Repeat; di.sRGBTexture = false; di.anisoLevel = sur ? 1 : 8; di.SaveAndReimport();
            }
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
        // the water (the web game's water shader, Assets/Shaders/GolfGoWater.shader); a material in Resources keeps the shader in the build
        AssetDatabase.ImportAsset("Assets/Shaders/GolfGoWater.shader", ImportAssetOptions.ForceUpdate);
        var wsh = Shader.Find("GolfGo/Water"); if (!wsh) Debug.LogError("GolfGo/Water shader didn't compile");
        var wP = "Assets/Resources/Mats/Water.mat"; var wm = AssetDatabase.LoadAssetAtPath<Material>(wP);
        if (!wm && wsh) { wm = new Material(wsh); AssetDatabase.CreateAsset(wm, wP); } else if (wm && wsh) wm.shader = wsh;
        if (wm) EditorUtility.SetDirty(wm);
        // the ground (the web game's ground shader, Assets/Shaders/GolfGoGround.shader)
        AssetDatabase.ImportAsset("Assets/Shaders/GolfGoGround.shader", ImportAssetOptions.ForceUpdate);
        var gsh = Shader.Find("GolfGo/Ground"); if (!gsh) Debug.LogError("GolfGo/Ground shader didn't compile");
        var gP = "Assets/Resources/Mats/GroundG.mat"; var gmat = AssetDatabase.LoadAssetAtPath<Material>(gP);
        if (!gmat && gsh) { gmat = new Material(gsh); AssetDatabase.CreateAsset(gmat, gP); } else if (gmat && gsh) gmat.shader = gsh;
        if (gmat) EditorUtility.SetDirty(gmat);
        // the species trees (Assets/Shaders/GolfGoTree.shader): bark photo and normal map (raw, repeating), the leaf atlas (sRGB, clamped)
        {
            var bi = AssetImporter.GetAtPath("Assets/Resources/trees/bark.png") as TextureImporter;
            if (bi) { bi.sRGBTexture = false; bi.wrapMode = TextureWrapMode.Repeat; bi.mipmapEnabled = true; bi.anisoLevel = 4; bi.maxTextureSize = 512; bi.SaveAndReimport(); }
            var bn = AssetImporter.GetAtPath("Assets/Resources/trees/bark_n.png") as TextureImporter;
            if (bn) { bn.textureType = TextureImporterType.NormalMap; bn.wrapMode = TextureWrapMode.Repeat; bn.mipmapEnabled = true; bn.maxTextureSize = 512; bn.SaveAndReimport(); }
            var li = AssetImporter.GetAtPath("Assets/Resources/trees/leaves.png") as TextureImporter;
            if (li) { li.sRGBTexture = true; li.alphaIsTransparency = true; li.wrapMode = TextureWrapMode.Clamp; li.mipmapEnabled = true; li.anisoLevel = 4; li.maxTextureSize = 2048; li.SaveAndReimport(); }
            AssetDatabase.ImportAsset("Assets/Shaders/GolfGoTree.shader", ImportAssetOptions.ForceUpdate);
            var tsh = Shader.Find("GolfGo/Tree"); if (!tsh) Debug.LogError("GolfGo/Tree shader didn't compile");
            foreach (var (n, kind, tex, nm) in new[] { ("TreeBark", 0, "bark", "bark_n"), ("TreeMass", 1, "", ""), ("TreeLeaf", 2, "leaves", "") })
            {
                var tp = "Assets/Resources/Mats/" + n + ".mat"; var tm = AssetDatabase.LoadAssetAtPath<Material>(tp);
                if (!tsh) break; if (!tm) { tm = new Material(tsh); AssetDatabase.CreateAsset(tm, tp); } else tm.shader = tsh;
                tm.SetFloat("_Kind", kind); tm.SetFloat("_Cull", kind == 2 ? 0 : 2); tm.enableInstancing = true;
                if (tex != "") tm.SetTexture("_MainTex", AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Resources/trees/" + tex + ".png"));
                if (nm != "") tm.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Resources/trees/" + nm + ".png"));
                EditorUtility.SetDirty(tm);
            }
        }
        // the grass blades
        AssetDatabase.ImportAsset("Assets/Shaders/GolfGoGrass.shader", ImportAssetOptions.ForceUpdate);
        { var gs = Shader.Find("GolfGo/Grass"); var gp = "Assets/Resources/Mats/Grass.mat"; var gm2 = AssetDatabase.LoadAssetAtPath<Material>(gp);
          if (gs) { if (!gm2) { gm2 = new Material(gs); AssetDatabase.CreateAsset(gm2, gp); } else gm2.shader = gs; gm2.enableInstancing = true; EditorUtility.SetDirty(gm2); } else Debug.LogError("GolfGo/Grass shader didn't compile"); }
        // the shot tracer
        AssetDatabase.ImportAsset("Assets/Shaders/GolfGoTracer.shader", ImportAssetOptions.ForceUpdate);
        { var trs = Shader.Find("GolfGo/Tracer"); var trp = "Assets/Resources/Mats/Tracer.mat"; var trm = AssetDatabase.LoadAssetAtPath<Material>(trp);
          if (trs) { if (!trm) { trm = new Material(trs); AssetDatabase.CreateAsset(trm, trp); } else trm.shader = trs; EditorUtility.SetDirty(trm); } else Debug.LogError("GolfGo/Tracer shader didn't compile"); }
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

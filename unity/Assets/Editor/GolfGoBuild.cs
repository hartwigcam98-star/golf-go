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
        // the course map texture at full size (it holds every fairway stripe and bunker edge)
        var ti = AssetImporter.GetAtPath("Assets/Resources/troy1_ground.png") as TextureImporter;
        if (ti) { ti.maxTextureSize = 4096; ti.mipmapEnabled = true; ti.wrapMode = TextureWrapMode.Clamp; ti.anisoLevel = 4; ti.SaveAndReimport(); }
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

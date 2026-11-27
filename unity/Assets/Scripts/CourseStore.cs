using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;

/* Courses downloaded as they're picked (Cam, Nov 27: "do them as you select them"). Troy Burne ships in the app (Resources/troy);
   every other course is an asset bundle of its folder (Assets/Courses/<id>: holes, sim data, ground, light, looks, trees, buildings,
   flag), built with the app (GolfGoBuild.BuildCourseBundles) and put on the repo's "courses" release as <id>-<hash>.bundle.
   Resources/course_bundles.json, written by the same build, says which file and size each course is. A course's file is kept in
   the app's storage (Application.persistentDataPath/courses) and replaced when a build changes it. Its picture and tips stay in the
   app (Resources/<id>/hero.jpg, tips.json) so the home screen can show it before it's downloaded.
   Load<T>("<id>/<name>"): from the open course's bundle, else from Resources. */
public static class CourseStore
{
    [System.Serializable] public class Entry { public string id, file; public long size; public uint crc; }
    [System.Serializable] class Manifest { public string url; public Entry[] bundles; }
    static Manifest man; static string localDir;   // (the look check: -ggbundles <dir> holds the Mac build's bundles, named by id)
    static Manifest M
    {
        get
        {
            if (man != null) return man;
            var ta = Resources.Load<TextAsset>("course_bundles"); man = ta != null ? JsonUtility.FromJson<Manifest>(ta.text) : new Manifest();
            man.bundles ??= new Entry[0];
            var a = System.Environment.GetCommandLineArgs(); int i = System.Array.IndexOf(a, "-ggbundles"); if (i >= 0 && i + 1 < a.Length) localDir = a[i + 1];
            return man;
        }
    }
    public static Entry Of(string id) => System.Array.Find(M.bundles, e => e.id == id);
    static string Dir => Path.Combine(Application.persistentDataPath, "courses");
    static string PathOf(Entry e) => localDir != null ? Path.Combine(localDir, e.id) : Path.Combine(Dir, e.file);
    static readonly Dictionary<string, bool> builtin = new Dictionary<string, bool>();
    public static bool Builtin(string id) { if (!builtin.TryGetValue(id, out var b)) builtin[id] = b = Resources.Load<TextAsset>(id + "/h01") != null; return b; }
    // there to play: in the app, or its file downloaded
    public static bool Ready(string id) { if (Builtin(id)) return true; var e = Of(id); return e != null && File.Exists(PathOf(e)); }
    public static bool Known(string id) => Builtin(id) || Of(id) != null;
    public static long Size(string id) => Of(id)?.size ?? 0;

    static string openId; static AssetBundle open;
    // open this course's bundle (and close the last one); false if it isn't here
    public static bool Open(string id)
    {
        if (id == openId) return true;
        if (open != null) { open.Unload(true); open = null; } openId = null;
        if (Builtin(id)) { openId = id; return true; }
        var e = Of(id); if (e == null) return false; var p = PathOf(e); if (!File.Exists(p)) return false;
        open = AssetBundle.LoadFromFile(p); if (open == null) { try { File.Delete(p); } catch { } return false; }   // (a broken file: fetched again next time)
        openId = id; return true;
    }
    public static T Load<T>(string path) where T : Object
    {
        if (open != null)
        {
            int s = path.IndexOf('/');
            if (s > 0 && path.Substring(0, s) == openId) { var a = open.LoadAsset<T>(path.Substring(s + 1)); if (a != null) return a; }
        }
        return Resources.Load<T>(path);
    }

    // ---------- downloading ----------
    static UnityWebRequest req; static string reqId, reqTmp;
    public static string Busy => req != null ? reqId : null;
    public static float Progress => req != null ? req.downloadProgress : 0;
    public static void Download(string id, System.Action<bool, string> done)
    {
        var e = Of(id); if (e == null) { done(false, "This course isn't in this build"); return; }
        if (req != null) { done(false, "Another course is downloading"); return; }
        Directory.CreateDirectory(Dir); reqId = id; reqTmp = Path.Combine(Dir, e.file + ".part");
        req = new UnityWebRequest(M.url + e.file, "GET") { downloadHandler = new DownloadHandlerFile(reqTmp) { removeFileOnAbort = true }, timeout = 0 };
        var op = req.SendWebRequest();
        op.completed += _ =>
        {
            var r = req; req = null; reqId = null;
            if (r.result != UnityWebRequest.Result.Success) { string err = r.result == UnityWebRequest.Result.ConnectionError ? "No connection" : r.error; r.Dispose(); try { File.Delete(reqTmp); } catch { } done(false, err); return; }
            r.Dispose();
            try
            {
                var fin = Path.Combine(Dir, e.file); if (File.Exists(fin)) File.Delete(fin); File.Move(reqTmp, fin);
                foreach (var f in Directory.GetFiles(Dir, id + "-*.bundle")) if (Path.GetFileName(f) != e.file) File.Delete(f);   // (the course's older file)
                done(true, null);
            }
            catch (System.Exception ex) { done(false, ex.Message); }
        };
    }
    public static void Cancel() { if (req != null) { req.Abort(); } }
    public static string MB(long b) => b >= 1 << 30 ? (b / (float)(1 << 30)).ToString("0.0") + " GB" : Mathf.Max(1, Mathf.RoundToInt(b / 1048576f)) + " MB";
}

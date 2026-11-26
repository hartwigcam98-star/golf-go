using System.Collections.Generic;
using UnityEngine;

/* The web game's sounds (sound.js). Every sound was rendered from the web game's own code (unity/SimTests/recorder/render_sfx.js:
   its synthesis, its recorded strikes, its master bus) into Resources/sfx, so they are the same sounds; here they are played with the
   web's volumes, pitch jitter and timing:
     - the strike: the recorded driver / iron, voiced per club, darker and softer the worse the contact (five contact levels), with
       turf under it from the rough and dirt and a spray of sand from a bunker; the swoosh just before; flames and a "nice" chime
     - the ball: landing, trees, the flagstick, lip-outs and the rim, the cup (six cup-mic variants), water
     - the course (ambTick): wind that follows the hole's wind, chickadees and robins, a loon on holes with water, a mower far off;
       quieter birds under cloud; faded out on menus
     - UI ticks; the sound button (AudioListener.volume) mutes everything */
public class SoundFX : MonoBehaviour
{
    readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
    readonly List<AudioSource> pool = new List<AudioSource>(); readonly List<(float at, System.Action a)> later = new List<(float, System.Action)>();
    AudioSource wind; AudioLowPassFilter windLp; float bus, busT, windPh1, windPh2;
    readonly Dictionary<string, float> amb = new Dictionary<string, float>();
    public bool ambWanted; public float windMph; public bool water; public int wx;

    void Awake()
    {
        foreach (var c in Resources.LoadAll<AudioClip>("sfx")) clips[c.name] = c;
        for (int i = 0; i < 16; i++) { var s = gameObject.AddComponent<AudioSource>(); s.playOnAwake = false; s.spatialBlend = 0; pool.Add(s); }
        // the wind bed: a looping band of low noise (the web's noise into a 300 Hz low-pass, its level and filter following the wind)
        var go = new GameObject("Wind"); go.transform.SetParent(transform, false); wind = go.AddComponent<AudioSource>(); wind.loop = true; wind.spatialBlend = 0; wind.volume = 0;
        int sr = 44100, n = sr * 6; var d = new float[n]; float l = 0, l2 = 0, k = 1 - Mathf.Exp(-2 * Mathf.PI * 600f / sr); var R = new System.Random(5);
        for (int i = 0; i < n; i++) { l += k * ((float)R.NextDouble() * 2 - 1 - l); l2 += k * (l - l2); d[i] = l2 * 3; }
        for (int i = 0; i < sr / 2; i++) { float t = i / (sr / 2f); d[i] = d[i] * t + d[n - sr / 2 + i] * (1 - t); }   // (a seamless loop)
        var wc = AudioClip.Create("wind", n - sr / 2, 1, sr, false); var wd = new float[n - sr / 2]; System.Array.Copy(d, wd, wd.Length); wc.SetData(wd, 0); wind.clip = wc;
        windLp = go.AddComponent<AudioLowPassFilter>(); windLp.cutoffFrequency = 300; windLp.lowpassResonanceQ = .7f; wind.Play();
    }
    public int Loaded => clips.Count;

    // ---------- playing ----------
    AudioSource Free() { foreach (var s in pool) if (!s.isPlaying) return s; return pool[0]; }
    public void Play(string name, float vol, float pitch = 1, float pan = 0)
    {
        if (!clips.TryGetValue(name, out var c) || vol <= 0) return; var s = Free();
        s.clip = c; s.volume = Mathf.Clamp01(vol); s.pitch = pitch; s.panStereo = pan; s.Play();
    }
    public void After(float sec, System.Action a) { if (sec <= 0) a(); else later.Add((Time.time + sec, a)); }
    static float Jit(float a) => 1 + (Random.value - .5f) * a;

    // ---------- the game's sounds (sfx) ----------
    public void Tick() => Play("tick", 1);
    public void Miss() => Play("miss", 1);
    public void Nice() => Play("nice", 1);
    static readonly float[] Q = { .05f, .35f, .62f, .86f, 1 };
    static int QB(float q) { int b = 0; for (int i = 1; i < Q.Length; i++) if (Mathf.Abs(Q[i] - q) < Mathf.Abs(Q[b] - q)) b = i; return b; }
    // strike: p how hard (0..1), q contact (0 thin or fat .. 1 dead centre), the club's kind, the lie it came from
    public void Strike(float p, float q, string kind, string lie)
    {
        float v = .6f + .4f * p; string k = kind == "wood" || kind == "hybrid" || kind == "iron" || kind == "wedge" ? kind : "iron";
        Play("strike_" + k + "_" + QB(q), v, Jit(.03f));
        if (lie == "rough" || lie == "fescue") After(.008f, () => Play("turf", .5f * v));
        else if (lie == "dirt") After(.008f, () => Play("turf", .3f * v));
        else if (lie == "sand") Play("sand", v);
    }
    public void PuttQ(float q) => Play("strike_putter_" + QB(q), .8f, Jit(.03f));
    public void Swoosh(float v) => Play("swoosh", v);
    public void Flame(bool red) => Play(red ? "flame_red" : "flame_blue", 1);
    public void Land() => Play("land", 1);
    public void Cup(bool hard) => Play("cup_" + (hard ? 1 : 0) + "_" + Random.Range(0, 3), 1, .96f + Random.value * .08f);
    public void Splash() => Play("splash", 1);
    public void Lip() => Play("lip", 1);
    public void Tree() => Play("tree", 1);
    public void Rustle(float v) => Play("rustle", v, .85f + Random.value * .3f);
    public void Pin(float v) => Play("pin", v);
    public void Rim() => Play("rim", 1);
    public void Plop(bool soft) => Play(soft ? "plop_soft" : "plop_hard", 1);
    public void Flutter(float v) => Play("flutter", v);

    // ---------- the course's sounds (ambTick) ----------
    void Ev(string k, float lo, float hi, System.Action fn)
    {
        if (!amb.TryGetValue(k, out var t)) t = lo * .3f + Random.value * (hi - lo) * .4f;
        t -= Time.deltaTime; if (t <= 0) { t = lo + Random.value * (hi - lo); fn(); } amb[k] = t;
    }
    float Pan => (Random.value * 2 - 1) * .8f;
    void Update()
    {
        for (int i = later.Count - 1; i >= 0; i--) if (Time.time >= later[i].at) { var a = later[i].a; later.RemoveAt(i); a(); }
        // the bus fades in over ~1.5 s when the course is on screen, out in ~.2 s on menus
        busT = ambWanted ? 1 : 0; bus += (busT - bus) * (1 - Mathf.Exp(-Time.deltaTime / (busT > bus ? 1.5f : .2f)));
        float mph = Mathf.Min(22, windMph), wg = .01f + mph * .0024f; windPh1 += Time.deltaTime * .09f * 6.2832f; windPh2 += Time.deltaTime * .23f * 6.2832f;
        wind.volume = Mathf.Clamp01(2.2f * bus * wg * (1 + .4f * Mathf.Sin(windPh1) + .25f * Mathf.Sin(windPh2))); windLp.cutoffFrequency = 220 + mph * 24;
        if (!ambWanted) return;
        float dim = wx >= 2 ? .55f : 1;
        Ev("bird", 5 / dim, 12 / dim, () => { if (Random.value < .5f) Play("amb_chickadee_" + Random.Range(0, 4), bus, 1, Pan); else Play("amb_robin_" + Random.Range(0, 6), bus, 1, Pan); });
        if (water) Ev("loon", 45, 110, () => Play("amb_loon_" + Random.Range(0, 2), bus, 1, Pan * .6f));
        Ev("mow", 140, 320, () => Play("amb_mower", bus, 1, Pan));
    }
}

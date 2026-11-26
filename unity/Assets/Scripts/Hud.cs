using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/* The web game's on-screen HUD, rebuilt in uGUI to look the same: the default HUD style of index.html (the "top hud" and "bottom
   hud" CSS blocks, hud.js). Sizes are the web game's CSS pixels: the canvas is scaled so one unit is one CSS pixel on the phone
   (3 screen pixels on most iPhones), so the numbers below are the stylesheet's own. Rounded boxes, gradients, the meter's
   cursor and the icons are drawn once at start into small textures at the screen's resolution (anti-aliased edges), and
   rounded boxes are 9-sliced so they stretch without blurring their corners.
   Fonts: Lilita One (the .disp headings and buttons) and Barlow Semi Condensed (everything else), the same Google Fonts the web
   game loads; the build workflow fetches them into Resources/Fonts (the legacy font stands in if they are missing). */
public class Hud
{
    // ---- the stylesheet's colours ----
    public static readonly Color Ink = Hex("#0f2233"), Cream = Hex("#fff6dc"), Sun = Hex("#ffc93c"), Coral = Hex("#ff6a48"), Mint = Hex("#8ee6a8"), SkyC = Hex("#6cc8ff");
    static readonly Color Panel = new Color(12 / 255f, 30 / 255f, 46 / 255f, .88f), Panel2 = new Color(1, 1, 1, .08f);
    public static Color Hex(string h) { ColorUtility.TryParseHtmlString(h, out var c); return c; }
    static Color A(Color c, float a) { c.a *= a; return c; }

    public float K;                    // screen pixels per CSS pixel
    public float W, Hh;                // the canvas in CSS pixels
    public float BottomFrac;           // the share of the screen's height the bottom panel (club, shots, meter, buttons) covers
    RectTransform root, safe;
    Font fDisp, fBody, fBold;

    // what the game wires up
    public Action onSwing, onMeter, onMap, onMenu, onSpin, onPower;
    public Action<int> onClub;           // -1 longer, +1 shorter (the web's ‹ ›)
    public Action<string> onShotType;
    public int aimHold;                // -1 / 0 / +1 while an aim arrow is held
    public Action<int> onAimTap;

    // ---- textures ----
    Texture2D Tex(float wCss, float hCss, Func<float, float, Color> f)
    {
        int w = Mathf.Max(1, Mathf.CeilToInt(wCss * K)), h = Mathf.Max(1, Mathf.CeilToInt(hCss * K));
        var t = new Texture2D(w, h, TextureFormat.RGBA32, false); t.wrapMode = TextureWrapMode.Clamp; t.filterMode = FilterMode.Bilinear;
        var px = new Color[w * h];
        for (int j = 0; j < h; j++) for (int i = 0; i < w; i++)
                px[j * w + i] = f((i + .5f) / w * wCss, (1 - (j + .5f) / h) * hCss);   // CSS-style: x right, y DOWN from the top-left (rows run bottom-up)
        t.SetPixels(px); t.Apply(false, true); return t;
    }
    float Cov(float d) => Mathf.Clamp01(.5f - d * K);   // coverage of a pixel by a shape at signed distance d (CSS px)
    static Color Over(Color dst, Color src, float cov)
    {
        float a = src.a * cov; if (a <= 0) return dst; float oa = a + dst.a * (1 - a);
        if (oa <= 0) return Color.clear;
        return new Color((src.r * a + dst.r * dst.a * (1 - a)) / oa, (src.g * a + dst.g * dst.a * (1 - a)) / oa, (src.b * a + dst.b * dst.a * (1 - a)) / oa, oa);
    }
    // signed distance to a rounded box (centre cx,cy, half size hw,hh, corner r)
    static float SdBox(float x, float y, float cx, float cy, float hw, float hh, float r)
    {
        float qx = Mathf.Abs(x - cx) - hw + r, qy = Mathf.Abs(y - cy) - hh + r;
        return Mathf.Sqrt(Mathf.Max(qx, 0) * Mathf.Max(qx, 0) + Mathf.Max(qy, 0) * Mathf.Max(qy, 0)) + Mathf.Min(Mathf.Max(qx, qy), 0) - r;
    }
    static float SdSeg(float x, float y, float ax, float ay, float bx, float by)
    {
        float px = x - ax, py = y - ay, dx = bx - ax, dy = by - ay; float h = Mathf.Clamp01((px * dx + py * dy) / Mathf.Max(1e-6f, dx * dx + dy * dy));
        float ex = px - dx * h, ey = py - dy * h; return Mathf.Sqrt(ex * ex + ey * ey);
    }
    static float SdPoly(float x, float y, Vector2[] v)
    {
        float d = float.MaxValue, s = 1;
        for (int i = 0, j = v.Length - 1; i < v.Length; j = i, i++)
        {
            d = Mathf.Min(d, SdSeg(x, y, v[j].x, v[j].y, v[i].x, v[i].y));
            bool c1 = y >= v[i].y, c2 = y < v[j].y, c3 = (v[j].x - v[i].x) * (y - v[i].y) > (v[j].y - v[i].y) * (x - v[i].x);
            if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
        }
        return s * d;
    }
    static float SdPolyline(float x, float y, Vector2[] v) { float d = float.MaxValue; for (int i = 1; i < v.Length; i++) d = Mathf.Min(d, SdSeg(x, y, v[i - 1].x, v[i - 1].y, v[i].x, v[i].y)); return d; }
    // a CSS linear-gradient(90deg, ...) with hard stops allowed: (position 0..1, colour) pairs in order
    static Color Grad((float p, Color c)[] st, float t)
    {
        if (t <= st[0].p) return st[0].c;
        for (int i = 1; i < st.Length; i++) if (t <= st[i].p) { float u = st[i].p > st[i - 1].p ? (t - st[i - 1].p) / (st[i].p - st[i - 1].p) : 1; return Color.Lerp(st[i - 1].c, st[i].c, u); }
        return st[st.Length - 1].c;
    }

    readonly Dictionary<string, Sprite> sprites = new Dictionary<string, Sprite>();
    // a white rounded box (optionally with a border) 9-sliced: tinted by the Image's colour, any size
    Sprite Round(float r, float bw, Color bc, Color fill)
    {
        string key = r + "/" + bw + "/" + bc + "/" + fill; if (sprites.TryGetValue(key, out var s)) return s;
        float sz = 2 * r + 2;
        var t = Tex(sz, sz, (x, y) =>
        {
            float d = SdBox(x, y, sz / 2, sz / 2, sz / 2, sz / 2, r);
            var c = Over(Color.clear, fill, Cov(d));
            if (bw > 0) { float cb = Cov(d) * (1 - Cov(d + bw)); if (cb > 0) c = Over(c, bc, cb); }
            return c;
        });
        float b = Mathf.Max(1, r) * K;
        s = Sprite.Create(t, new Rect(0, 0, t.width, t.height), new Vector2(.5f, .5f), 100, 0, SpriteMeshType.FullRect, new Vector4(b, b, b, b));
        sprites[key] = s; return s;
    }

    // ---- building blocks ----
    static RectTransform RT(string n, Transform p)
    {
        var o = new GameObject(n, typeof(RectTransform)); o.transform.SetParent(p, false); var r = (RectTransform)o.transform;
        r.anchorMin = r.anchorMax = new Vector2(0, 1); r.pivot = new Vector2(0, 1); return r;
    }
    // place in CSS terms: x,y of the top-left corner from the parent's top-left, y down
    static RectTransform At(RectTransform r, float x, float y, float w, float h) { r.anchorMin = r.anchorMax = new Vector2(0, 1); r.pivot = new Vector2(0, 1); r.anchoredPosition = new Vector2(x, -y); r.sizeDelta = new Vector2(w, h); return r; }
    Image Box(Transform p, string n, float r, Color c, float bw = 0, Color bc = default)
    {
        var im = RT(n, p).gameObject.AddComponent<Image>(); // a bordered box is drawn in its own colours (a tint would darken the border too); a plain one is white, tinted
        im.sprite = bw > 0 ? Round(r, bw, bc, c) : Round(r, 0, default, Color.white); im.type = Image.Type.Sliced; im.pixelsPerUnitMultiplier = K; im.color = bw > 0 ? Color.white : c; im.raycastTarget = false; return im;
    }
    RawImage Pic(Transform p, string n, Texture2D t)
    {
        var im = RT(n, p).gameObject.AddComponent<RawImage>(); im.texture = t; im.raycastTarget = false; return im;
    }
    Text Txt(Transform p, string n, Font f, float size, Color c, TextAnchor a = TextAnchor.MiddleLeft)
    {
        var t = RT(n, p).gameObject.AddComponent<Text>(); t.font = f; t.fontSize = Mathf.RoundToInt(size); t.color = c; t.alignment = a; t.raycastTarget = false;
        t.horizontalOverflow = HorizontalWrapMode.Overflow; t.verticalOverflow = VerticalWrapMode.Overflow; t.supportRichText = false; return t;
    }
    // a pressable area that reacts on touch-down (PressHandler), like the web game's pointerdown
    PressHandler Press(Graphic g, Action down, Action up = null)
    {
        g.raycastTarget = true; var ph = g.gameObject.AddComponent<PressHandler>(); ph.onPress = down; ph.onRelease = up; return ph;
    }
    // the web's box-shadow:0 Npx 0 colour: the same shape, offset down, behind
    Image Drop(Transform p, RectTransform of, float r, float dy, Color c)
    {
        var im = Box(p, of.name + "Drop", r, c); var rt = im.rectTransform; rt.anchorMin = of.anchorMin; rt.anchorMax = of.anchorMax; rt.pivot = of.pivot;
        rt.anchoredPosition = of.anchoredPosition + new Vector2(0, -dy); rt.sizeDelta = of.sizeDelta; rt.SetSiblingIndex(of.GetSiblingIndex()); return im;
    }

    // ---- the elements the game updates ----
    Text courseT, holeN, parT, strokeT, windV, clubId, clubInfo, lieT, pinT, spinT, swingT, hintT, toastA, toastB, fpsT;
    readonly Text[] mLab = new Text[5];
    RectTransform windArrow, clubPanel, clubNameRT, chipsRT, plateL, swingRT, swingDropRT, toastRT;
    Image lieDot, swingImg, swingDrop, powerBtn, clubPrevBg, clubNextBg;
    Text clubPrevT, clubNextT;
    RawImage powerOn, bolt;
    readonly Dictionary<string, (Image bg, Text t)> shotBtns = new Dictionary<string, (Image, Text)>();
    // meter
    RectTransform meter, fillBody, fillCap, cursor, sweet, lockM, tapM; RawImage fillImg; Image sweetImg;
    float meterW, fillMax;
    CanvasGroup toastCG; float toastT = -1;

    public static readonly string[] ShotTypes = { "full", "punch", "pitch", "chip", "flop", "spin", "splash", "pick", "blast" };
    static readonly string[] ShotNames = { "Full", "Punch", "Pitch", "Chip", "Flop", "Spin", "Splash", "Pick", "Blast" };
    RectTransform shotsRT; float shotsIW; bool bunkerRow = true;   // (the row is laid out on the first SetShot)

    public Hud(float impact)
    {
        fDisp = Resources.Load<Font>("Fonts/LilitaOne-Regular"); fBody = Resources.Load<Font>("Fonts/BarlowSemiCondensed-Medium"); fBold = Resources.Load<Font>("Fonts/BarlowSemiCondensed-Bold");
        var legacy = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        if (!fDisp) fDisp = legacy; if (!fBody) fBody = legacy; if (!fBold) fBold = fBody;

        // one canvas unit = one CSS pixel: iPhones are 2x or 3x (Screen.dpi ~326 or ~460); keep the page 320-500 CSS px wide
        K = Screen.dpi > 0 ? Mathf.Round(Screen.dpi / 150f) : 3; if (K < 1) K = 1;
        if (Screen.width / K < 320 || Screen.width / K > 500) K = Screen.width / 393f;
        var cv = new GameObject("HUD", typeof(RectTransform)).AddComponent<Canvas>(); cv.renderMode = RenderMode.ScreenSpaceOverlay; cv.pixelPerfect = false;
        var sc = cv.gameObject.AddComponent<CanvasScaler>(); sc.uiScaleMode = CanvasScaler.ScaleMode.ConstantPixelSize; sc.scaleFactor = K; sc.referencePixelsPerUnit = 100;
        cv.gameObject.AddComponent<GraphicRaycaster>();
        if (!UnityEngine.Object.FindAnyObjectByType<UnityEngine.EventSystems.EventSystem>())
        { var es = new GameObject("Events"); es.AddComponent<UnityEngine.EventSystems.EventSystem>(); es.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>(); }
        root = (RectTransform)cv.transform;
        W = Screen.width / K; Hh = Screen.height / K;
        var sa = Screen.safeArea; float sTop = (Screen.height - sa.yMax) / K, sBot = sa.yMin / K;

        BuildAim();   // first: under everything else
        BuildTop(sTop);
        BuildToast();
        BuildBottom(sBot, impact);
        BuildLook();
        BuildImp();
        fpsT = Txt(root, "Fps", fBold, 11, A(Mint, .9f)); At(fpsT.rectTransform, 14, sTop + 10 + 67 + 6, 200, 14);
    }

    // ---------- top hud: the hole plate (left), wind, menu, sound (right) ----------
    void BuildTop(float sTop)
    {
        float y = sTop + 10, x = 12;
        // right side first (the left plate gives way to it)
        float rx = W - 12;
        var snd = Box(root, "Sound", 12, Panel); rx -= 40; At(snd.rectTransform, rx, y, 40, 40); Drop(root, snd.rectTransform, 12, 3, new Color(0, 0, 0, .28f));
        var sndIco = Pic(snd.transform, "Ico", Icon("sound")); At(sndIco.rectTransform, 10, 10, 20, 20);
        Press(snd, () => { AudioListener.volume = AudioListener.volume > 0 ? 0 : 1; sndIco.texture = Icon(AudioListener.volume > 0 ? "sound" : "mute"); });
        var men = Box(root, "Menu", 12, Panel); rx -= 48; At(men.rectTransform, rx, y, 40, 40); Drop(root, men.rectTransform, 12, 3, new Color(0, 0, 0, .28f));
        At(Pic(men.transform, "Ico", Icon("menu")).rectTransform, 10, 10, 20, 20); Press(men, () => onMenu?.Invoke());
        // wind plate: padding 8 12, dial 40, gap 8, value
        var wp = Box(root, "Wind", 14, Panel); float ww = 12 + 40 + 8 + 30 + 12; rx -= 8 + ww; At(wp.rectTransform, rx, y, ww, 56); Drop(root, wp.rectTransform, 14, 3, new Color(0, 0, 0, .28f));
        var dial = Box(wp.transform, "Dial", 20, Panel2, 2, new Color(1, 1, 1, .15f)); At(dial.rectTransform, 12, 8, 40, 40);
        var ar = Pic(dial.transform, "Arrow", Icon("arrow")); windArrow = ar.rectTransform; windArrow.anchorMin = windArrow.anchorMax = windArrow.pivot = new Vector2(.5f, .5f); windArrow.anchoredPosition = Vector2.zero; windArrow.sizeDelta = new Vector2(26, 26);
        windV = Txt(wp.transform, "V", fDisp, 22, Cream); At(windV.rectTransform, 60, 9, 40, 24);
        var u = Txt(wp.transform, "U", fBold, 11, A(Cream, .75f)); At(u.rectTransform, 60, 33, 40, 14); u.text = "MPH";
        // the hole plate
        float lw = Mathf.Min(rx - 8 - x, 260);
        var pl = Box(root, "Plate", 14, Panel); plateL = At(pl.rectTransform, x, y, lw, 67); Drop(root, plateL, 14, 3, new Color(0, 0, 0, .28f));
        courseT = Txt(pl.transform, "Course", fBold, 11, A(Sun, .9f)); At(courseT.rectTransform, 12, 8, lw - 24, 13); courseT.horizontalOverflow = HorizontalWrapMode.Wrap; courseT.verticalOverflow = VerticalWrapMode.Truncate;   // (one line: the web ends long titles in an ellipsis)
        holeN = Txt(pl.transform, "N", fDisp, 34, Cream, TextAnchor.MiddleCenter); At(holeN.rectTransform, 12, 23, 26, 36);
        parT = Txt(pl.transform, "L1", fBold, 15, Cream); At(parT.rectTransform, 48, 23, lw - 60, 18);
        strokeT = Txt(pl.transform, "L2", fBody, 13, A(Cream, .8f)); At(strokeT.rectTransform, 48, 41, lw - 60, 16);
    }

    // ---------- toast: the big PERFECT! / BIRDIE pop at 30% down ----------
    void BuildToast()
    {
        toastRT = RT("Toast", root); At(toastRT, 0, Hh * .3f, W, 100); toastRT.pivot = new Vector2(.5f, .5f); toastRT.anchoredPosition = new Vector2(W / 2, -(Hh * .3f) - 50); toastCG = toastRT.gameObject.AddComponent<CanvasGroup>(); toastCG.alpha = 0; toastCG.blocksRaycasts = false;
        float fs = Mathf.Clamp(W * .11f, 38, 64);
        toastA = Txt(toastRT, "T1", fDisp, fs, Sun, TextAnchor.UpperCenter); At(toastA.rectTransform, 16, 0, W - 32, fs);
        var o = toastA.gameObject.AddComponent<Outline>(); o.effectColor = Ink; o.effectDistance = new Vector2(2, -2);
        var s = toastA.gameObject.AddComponent<Shadow>(); s.effectColor = Ink; s.effectDistance = new Vector2(0, -4);
        toastB = Txt(toastRT, "T2", fBold, 17, Cream, TextAnchor.UpperCenter); At(toastB.rectTransform, 16, fs + 6, W - 32, 22);
        var s2 = toastB.gameObject.AddComponent<Shadow>(); s2.effectColor = Ink; s2.effectDistance = new Vector2(0, -2);
    }
    // ---------- the choice sheet (the web game's #reliefM: an eyebrow, a heading, option buttons with a sub line, the best one marked) ----------
    RectTransform sheet;
    public bool ChoiceOpen => sheet != null;
    public void HideChoice() { if (sheet) UnityEngine.Object.Destroy(sheet.gameObject); sheet = null; }
    // body: optional text above the buttons (the scorecard); opts: (label, sub line, marked best)
    public void ShowChoice(string eyebrow, string title, string body, IList<(string a, string b, bool best)> opts, Action<int> pick)
    {
        HideChoice();
        var dim = Box(root, "Sheet", 0, new Color(0, 0, 0, .45f)); sheet = At(dim.rectTransform, 0, 0, W, Hh); dim.raycastTarget = true;   // (swallows taps behind it)
        float pw = Mathf.Min(W - 32, 360), bh = 58, gap = 8, bodyH = string.IsNullOrEmpty(body) ? 0 : 18 * (body.Split('\n').Length) + 12;
        float ph = 20 + 16 + 6 + 30 + 12 + bodyH + opts.Count * (bh + gap) + 12;
        var pnl = Box(sheet, "Panel", 18, new Color(12 / 255f, 30 / 255f, 46 / 255f, .97f), 2, new Color(1, 1, 1, .12f)); At(pnl.rectTransform, (W - pw) / 2, Mathf.Max(20, (Hh - ph) / 2 - 40), pw, ph);
        var eb = Txt(pnl.transform, "Eb", fBold, 12, A(Sun, .9f)); At(eb.rectTransform, 18, 20, pw - 36, 16); eb.text = (eyebrow ?? "").ToUpperInvariant();
        var hd = Txt(pnl.transform, "H", fDisp, 26, Cream); At(hd.rectTransform, 18, 40, pw - 36, 30); hd.text = title;
        float y = 82;
        if (bodyH > 0) { var bt = Txt(pnl.transform, "Body", fBody, 14, Cream, TextAnchor.UpperLeft); At(bt.rectTransform, 18, y, pw - 36, bodyH); bt.text = body; bt.supportRichText = true; y += bodyH; }
        for (int i = 0; i < opts.Count; i++)
        {
            int k = i; var o = opts[i];
            var bb = Box(pnl.transform, "Opt" + i, 12, o.best ? A(Sun, .18f) : Panel2, o.best ? 2 : 0, Sun); At(bb.rectTransform, 14, y, pw - 28, bh);
            var ta = Txt(bb.transform, "A", fBold, 16, o.best ? Sun : Cream); At(ta.rectTransform, 14, 9, pw - 56, 20); ta.text = o.a;
            var tb = Txt(bb.transform, "B", fBody, 12, A(Cream, .75f)); At(tb.rectTransform, 14, 31, pw - 56, 18); tb.text = o.b ?? ""; tb.horizontalOverflow = HorizontalWrapMode.Wrap;
            Press(bb, () => { HideChoice(); pick?.Invoke(k); });
            y += bh + gap;
        }
    }

    public void Toast(string a, string b, Color c) { toastA.text = a; toastA.color = c; toastB.text = (b ?? "").ToUpperInvariant(); toastT = 0; }

    // ---------- bottom hud ----------
    void BuildBottom(float sBot, float impact)
    {
        float iw = Mathf.Min(540, W - 24), ix = (W - iw) / 2;
        // rows from the bottom up (CSS: .inner grid, gap 9): hint 15, controls 56, labels 14 (margin-top -4), meter 34, shots 36, club row 48
        float bottom = Hh - sBot - 12;
        float yHint = bottom - 15, yCtl = yHint - 9 - 56, yLab = yCtl - 9 - 14, yMet = yLab + 4 - 9 - 34, yShots = yMet - 9 - 36, yClub = yShots - 9 - 48, top = yClub - 28;
        // the dark fade behind it: linear-gradient(to top, rgba(9,24,36,.94) 62%, transparent)
        var bgC = new Color(9 / 255f, 24 / 255f, 36 / 255f, .94f);
        var bg = Pic(root, "BottomFade", Tex(4, 64, (x, y) => { float t = 1 - y / 64f; return A(bgC, t >= .62f ? 1 : t / .62f); }));
        At(bg.rectTransform, 0, top, W, Hh - top); BottomFrac = (Hh - top) / Hh;
        var inner = At(RT("Inner", root), ix, 0, iw, Hh);

        // club row: [‹ name ›] [lie / pin chips] [strike point]
        clubPanel = At(Box(inner, "Club", 14, Panel2).rectTransform, 0, yClub, 150, 48);
        clubPrevBg = Box(clubPanel, "Prev", 0, Color.clear); At(clubPrevBg.rectTransform, 0, 0, 28, 48);
        clubPrevT = Txt(clubPrevBg.transform, "T", fBody, 24, A(Cream, .9f), TextAnchor.MiddleCenter); At(clubPrevT.rectTransform, 0, 0, 28, 46); clubPrevT.text = "‹";
        Press(clubPrevBg, () => onClub?.Invoke(-1));
        var nm = Box(clubPanel, "Name", 0, Color.clear); clubNameRT = nm.rectTransform;
        clubId = Txt(nm.transform, "Id", fDisp, 24, Sun, TextAnchor.UpperCenter); clubInfo = Txt(nm.transform, "Info", fBody, 12, A(Cream, .85f), TextAnchor.UpperCenter);
        clubNextBg = Box(clubPanel, "Next", 0, Color.clear);
        clubNextT = Txt(clubNextBg.transform, "T", fBody, 24, A(Cream, .9f), TextAnchor.MiddleCenter); clubNextT.text = "›";
        Press(clubNextBg, () => onClub?.Invoke(1));
        var spin = Box(inner, "Spin", 14, Panel2); At(spin.rectTransform, iw - 70, yClub, 70, 48);
        At(Pic(spin.transform, "Ico", Icon("ballN")).rectTransform, 24, 6, 22, 22);
        spinDot = Pic(spin.transform, "Dot", Tex(8, 8, (x, y) => A(Color.white, Cov(Mathf.Sqrt((x - 4) * (x - 4) + (y - 4) * (y - 4)) - 3.5f)))); spinDot.color = Coral; spinDot.rectTransform.pivot = new Vector2(.5f, .5f); spinDot.rectTransform.sizeDelta = new Vector2(5.5f, 5.5f);
        spinDot.rectTransform.anchoredPosition = new Vector2(35, -17);
        spinT = Txt(spin.transform, "T", fBold, 10.5f, Cream, TextAnchor.MiddleCenter); At(spinT.rectTransform, 0, 30, 70, 13); spinT.text = "CENTRE";
        Press(spin, () => onSpin?.Invoke());
        chipsRT = At(RT("Chips", inner), 158, yClub, iw - 158 - 78, 48);
        lieDot = Box(chipsRT, "Dot", 3, Hex("#6db14a")); At(lieDot.rectTransform, 0, 8, 10, 10);
        lieT = Txt(chipsRT, "Lie", fBold, 14, Cream); At(lieT.rectTransform, 16, 4, 200, 18);
        pinT = Txt(chipsRT, "Pin", fBold, 14, Cream); At(pinT.rectTransform, 0, 26, 220, 18);

        // shot types: panel2, radius 12, padding 3; six 1fr cells and a .7fr power cell, gap 4
        var shots = Box(inner, "Shots", 12, Panel2); At(shots.rectTransform, 0, yShots, iw, 36); shotsRT = shots.rectTransform; shotsIW = iw;
        float cw = (iw - 6 - 6 * 4) / 6.7f;
        for (int i = 0; i < ShotTypes.Length; i++)
        {
            string id = ShotTypes[i];
            var b = Box(shots.transform, id, 9, Color.clear); At(b.rectTransform, 3 + i * (cw + 4), 3, cw, 30);
            var t = Txt(b.transform, "T", fBold, 14, A(Cream, .85f), TextAnchor.MiddleCenter); At(t.rectTransform, 0, 0, cw, 30); t.text = ShotNames[i];
            Press(b, () => onShotType?.Invoke(id)); shotBtns[id] = (b, t);
        }
        powerBtn = Box(shots.transform, "Power", 9, Color.clear); At(powerBtn.rectTransform, 3 + 6 * (cw + 4), 3, cw * .7f, 30);
        float pbw = cw * .7f;   // .psbtn.on: linear-gradient(180deg, #ff9a3c, #ff5a2a), radius 9, white bolt
        powerOn = Pic(powerBtn.transform, "On", Tex(pbw, 30, (x, y) => A(Color.Lerp(Hex("#ff9a3c"), Hex("#ff5a2a"), y / 30f), Cov(SdBox(x, y, pbw / 2, 15, pbw / 2, 15, 9)))));
        At(powerOn.rectTransform, 0, 0, pbw, 30); powerOn.enabled = false;
        bolt = Pic(powerBtn.transform, "Bolt", Icon("bolt")); At(bolt.rectTransform, pbw / 2 - 8, 7, 16, 16);
        Press(powerBtn, () => onPower?.Invoke());

        BuildMeter(inner, yMet, iw, impact);
        string[] ln = { "Impact", "25", "50", "75", "Max" };
        for (int i = 0; i < 5; i++)
        {
            var t = Txt(inner, "L" + i, fBold, 11, A(Cream, .6f), i == 0 ? TextAnchor.MiddleLeft : i == 4 ? TextAnchor.MiddleRight : TextAnchor.MiddleCenter);
            float lw = iw - 8; At(t.rectTransform, i == 0 ? 4 : i == 4 ? iw - 4 - 80 : 4 + lw * i / 4f - 40, yLab, 80, 14); t.text = ln[i].ToUpperInvariant(); mLab[i] = t;
        }
        // controls: map, ‹ aim, SWING, aim ›
        var map = Box(inner, "Map", 16, Panel2); At(map.rectTransform, 0, yCtl, 52, 56); At(Pic(map.transform, "Ico", Icon("map")).rectTransform, 15, 17, 22, 22); Press(map, () => onMap?.Invoke());
        var al = Box(inner, "AimL", 16, Panel2); At(al.rectTransform, 60, yCtl, 52, 56); At(Pic(al.transform, "Ico", Icon("chevL")).rectTransform, 15, 17, 22, 22);
        Press(al, () => { aimHold = -1; onAimTap?.Invoke(-1); }, () => aimHold = 0);
        var arr = Box(inner, "AimR", 16, Panel2); At(arr.rectTransform, iw - 52, yCtl, 52, 56); At(Pic(arr.transform, "Ico", Icon("chevR")).rectTransform, 15, 17, 22, 22);
        Press(arr, () => { aimHold = 1; onAimTap?.Invoke(1); }, () => aimHold = 0);
        float sw = iw - 2 * (52 + 8) - 52 - 8;
        swingDrop = Box(inner, "SwingDrop", 18, Hex("#b8860f")); swingDropRT = At(swingDrop.rectTransform, 120, yCtl + 5, sw, 56);
        swingImg = Box(inner, "Swing", 18, Sun); swingRT = At(swingImg.rectTransform, 120, yCtl, sw, 56);
        swingT = Txt(swingImg.transform, "T", fDisp, 26, Ink, TextAnchor.MiddleCenter); At(swingT.rectTransform, 0, 0, sw, 56); swingT.text = "SWING";
        Press(swingImg, () => { onSwing?.Invoke(); swingRT.anchoredPosition = new Vector2(120, -(yCtl + 3)); }, () => swingRT.anchoredPosition = new Vector2(120, -yCtl));
        hintT = Txt(inner, "Hint", fBody, 12, A(Cream, .7f), TextAnchor.MiddleCenter); At(hintT.rectTransform, 0, yHint, iw, 15);
    }

    // ---------- the swing meter (.meter, .track, .fill, .tick, .sweet, .impact, .lock, .tapmark, .cursor) ----------
    void BuildMeter(RectTransform inner, float y, float w, float impact)
    {
        meterW = w;
        // .meter: 30 px high inside a 2 px border (34 overall), radius 15, #081723, border rgba(255,255,255,.14)
        var m = Box(inner, "Meter", 15, Hex("#081723"), 2, new Color(1, 1, 1, .14f)); meter = At(m.rectTransform, 0, y, w, 34);
        Press(m, () => onMeter?.Invoke());   // the web meter takes the taps too once the swing has started
        float pw = w - 4;                    // the padding box (inside the border): CSS's insets are measured from here
        var pad = At(RT("Pad", meter), 2, 2, pw, 30);
        // .track: inset 4, radius 11, the five-stop gradient at opacity .5
        var stops = new (float, Color)[] { (0, Hex("#2a4d63")), (.12f, Hex("#2a4d63")), (.12f, Hex("#274d3a")), (.45f, Hex("#3d8b4a")), (.8f, Hex("#e0b53a")), (1, Hex("#ff6a48")) };
        float tw = pw - 8;
        var track = Pic(pad, "Track", Tex(tw, 22, (x, yy) => A(Grad(stops, x / tw), .5f * Cov(SdBox(x, yy, tw / 2, 11, tw / 2, 11, 11)))));
        At(track.rectTransform, 4, 4, tw, 22);
        // .fill: from the impact line, gradient #7fe0a8 → #ffc93c 70% → #ff6a48 stretched over its own length, rounded right end (11)
        float fx = pw * impact; fillMax = pw * (1 - impact);
        var fstops = new (float, Color)[] { (0, Hex("#7fe0a8")), (.7f, Hex("#ffc93c")), (1, Hex("#ff6a48")) };
        fillImg = Pic(pad, "Fill", Tex(256, 22, (x, yy) => { var c = Grad(fstops, x / 256f); return yy < 2 ? Color.Lerp(c, Color.white, .35f) : c; }));   // inset 0 2px 0 rgba(255,255,255,.35)
        fillBody = At(fillImg.rectTransform, fx, 4, 0, 22);
        var cap = Pic(pad, "FillCap", Tex(11, 22, (x, yy) => { var c = Hex("#ff6a48"); if (yy < 2) c = Color.Lerp(c, Color.white, .35f); return A(c, Cov(SdBox(x, yy, 0, 11, 11, 11, 11))); }));
        fillCap = At(cap.rectTransform, fx, 4, 11, 22);
        // .tick: 2 px, rgba(255,255,255,.28), top/bottom 6, at 34 / 56 / 78 % and 6 px from the end
        foreach (float p in new[] { .34f, .56f, .78f })
        { var t = Box(pad, "Tick", 0, new Color(1, 1, 1, .28f)); At(t.rectTransform, pw * p, 6, 2, 18); }
        { var t = Box(pad, "Tick", 0, new Color(1, 1, 1, .28f)); At(t.rectTransform, pw - 6, 6, 2, 18); }
        // .sweet: rgba(255,201,60,.45) over the perfect window, with a 2 px centre line rgba(255,236,160,.9)
        sweetImg = Box(pad, "Sweet", 0, new Color(1, 201 / 255f, 60 / 255f, .45f)); sweet = At(sweetImg.rectTransform, fx, 0, 0, 30);
        var sl = Box(sweet, "Line", 0, new Color(1, 236 / 255f, 160 / 255f, .9f)); sl.rectTransform.anchorMin = new Vector2(.5f, 0); sl.rectTransform.anchorMax = new Vector2(.5f, 1);
        sl.rectTransform.pivot = new Vector2(.5f, .5f); sl.rectTransform.sizeDelta = new Vector2(2, -6); sl.rectTransform.anchoredPosition = Vector2.zero;
        // .impact: the white line, 3 px, top/bottom -4, radius 2, a 2 px rgba(15,34,51,.6) ring
        var imp = Pic(pad, "Impact", Tex(7, 42, (x, yy) => { float d = SdBox(x, yy, 3.5f, 21, 1.5f, 19, 2); return Over(Over(Color.clear, A(Ink, .6f), Cov(d - 2)), Color.white, Cov(d)); }));
        At(imp.rectTransform, fx - 3.5f, -6, 7, 42);
        // .lock: the power you set, a 6 px sun triangle pointing down from above the bar
        lockM = At(Pic(pad, "Lock", Tex(12, 6, (x, yy) => A(Sun, Cov(SdPoly(x, yy, new[] { new Vector2(0, 0), new Vector2(12, 0), new Vector2(6, 6) }))))).rectTransform, 0, -6, 12, 6);
        // .tapmark: where the last strike tap landed (mint when it was in the window)
        var tm = Pic(pad, "Tap", Tex(10, 7, (x, yy) => A(Color.white, Cov(SdPoly(x, yy, new[] { new Vector2(0, 0), new Vector2(10, 0), new Vector2(5, 5) })))));
        tapM = At(tm.rectTransform, 0, -8, 10, 7); tapRaw = tm;
        // .cursor: 6 px white bar, top/bottom -7 (44 high), radius 3, a 2 px ink ring and a 12 px white glow
        var cur = Pic(pad, "Cursor", Tex(34, 72, (x, yy) =>
        {
            float d = SdBox(x, yy, 17, 36, 3, 22, 3);
            var c = A(Color.white, .7f * Mathf.Exp(-Mathf.Max(0, d - 2) / 4f) * Mathf.Clamp01(1 - Mathf.Max(0, d - 2) / 12f));
            c = Over(c, Ink, Cov(d - 2)); return Over(c, Color.white, Cov(d));
        }));
        cursor = At(cur.rectTransform, 0, -21, 34, 72);
        // .pflag: the pin on the meter (short game and putts): a red pennant on a white pole above the bar, the pole down through it,
        // the distance beside it (amber when it's beyond the meter's reach)
        flagRT = RT("Flag", pad); At(flagRT, 0, -26, 2, 54);
        Texture2D Pennant(Color fill) => Tex(20, 24, (x, yy) =>
        {
            var c = Over(Color.clear, Color.white, Cov(SdSeg(x, yy, 2, 1, 2, 23) - 1.1f));
            float d = SdPoly(x, yy, new[] { new Vector2(3.2f, 1.5f), new Vector2(18.2f, 6.7f), new Vector2(3.2f, 11.9f) });
            return Over(Over(c, Ink, Cov(d - .5f)), fill, Cov(d + .5f));
        });
        flagTex = Pennant(Hex("#ff4d4d")); flagTexOver = Pennant(Hex("#ffb03a"));
        flagPic = Pic(flagRT, "Pennant", flagTex); At(flagPic.rectTransform, 0, 0, 20, 24);
        var pole = Box(flagRT, "Pole", 0, Color.white); At(pole.rectTransform, 1, 22, 2, 30);
        var ring = Box(pole.transform, "Ring", 0, A(Ink, .6f)); ring.transform.SetAsFirstSibling(); At(ring.rectTransform, -1, -1, 4, 32);
        flagT = Txt(flagRT, "Txt", fBold, 11, Color.white); At(flagT.rectTransform, 21, 0, 120, 14);
        flagRT.gameObject.SetActive(false);
    }
    RectTransform flagRT; RawImage flagPic; Texture2D flagTex, flagTexOver; Text flagT;
    // pos: where on the meter (0..1) the planned power sits, < 0 hides it; over: the pin is beyond the meter's reach
    public void SetFlag(float pos, string txt, bool over)
    {
        flagRT.gameObject.SetActive(pos >= 0); if (pos < 0) return;
        float pw = meterW - 4; flagRT.anchoredPosition = new Vector2(pos * pw - 2, 26);
        flagPic.texture = over ? flagTexOver : flagTex; Set(flagT, txt);
        bool flip = pos > .8f; flagT.alignment = flip ? TextAnchor.MiddleRight : TextAnchor.MiddleLeft;
        At(flagT.rectTransform, flip ? -124 : 21, 0, 120, 14);
    }
    RawImage tapRaw;

    // ---------- updates ----------
    static void Set(Text t, string s) { if (t.text != s) t.text = s; }
    public void SetTop(string course, int hole, string l1, string l2) { Set(courseT, course.ToUpperInvariant()); Set(holeN, hole.ToString()); Set(parT, l1); Set(strokeT, l2); }
    public void SetWind(int mph, float deg) { Set(windV, mph.ToString()); windArrow.localEulerAngles = new Vector3(0, 0, -deg); }
    public void SetClub(string id, string info, bool prevOK, bool nextOK)
    {
        Set(clubId, id); Set(clubInfo, info);
        float nw = Mathf.Max(84, Mathf.Max(clubId.preferredWidth, clubInfo.preferredWidth) + 12);
        At(clubNameRT, 28, 0, nw, 48); At(clubId.rectTransform, 0, 4, nw, 26); At(clubInfo.rectTransform, 0, 28, nw, 16);
        At(clubNextBg.rectTransform, 28 + nw, 0, 28, 48); At(clubNextT.rectTransform, 0, 0, 28, 46);
        float cw = 28 + nw + 28; clubPanel.sizeDelta = new Vector2(cw, 48);
        At(chipsRT, cw + 8, chipsRT.anchoredPosition.y * -1, chipsRT.sizeDelta.x, 48);
        clubPrevT.color = A(Cream, prevOK ? .9f : .25f); clubNextT.color = A(Cream, nextOK ? .9f : .25f);
    }
    public void SetLie(string name, Color c, string pin) { Set(lieT, name); lieDot.color = c; Set(pinT, pin); }
    // .shots: six 1fr cells and a .7fr power cell; .shots.bunker (in the sand by the green): Full, Splash, Pick, Blast and power
    void ShotRow(bool bunker)
    {
        if (bunker == bunkerRow) return; bunkerRow = bunker;
        string[] row = bunker ? new[] { "full", "splash", "pick", "blast" } : new[] { "full", "punch", "pitch", "chip", "flop", "spin" };
        float n = row.Length, cw = (shotsIW - 6 - n * 4) / (n + .7f);
        foreach (var kv in shotBtns) kv.Value.bg.gameObject.SetActive(Array.IndexOf(row, kv.Key) >= 0);
        for (int i = 0; i < row.Length; i++) { var b = shotBtns[row[i]]; At(b.bg.rectTransform, 3 + i * (cw + 4), 3, cw, 30); At(b.t.rectTransform, 0, 0, cw, 30); }
        float pbw = cw * .7f; At(powerBtn.rectTransform, 3 + n * (cw + 4), 3, pbw, 30); At(powerOn.rectTransform, 0, 0, pbw, 30); At(bolt.rectTransform, pbw / 2 - 8, 7, 16, 16);
    }
    // enabled: which shot types this club and lie allow (hud.js greys the rest out)
    public void SetShot(string stype, bool putter, bool aiming, bool pshot, Func<string, bool> enabled = null, bool bunker = false)
    {
        ShotRow(bunker);
        foreach (var kv in shotBtns)
        {
            bool on = !putter && kv.Key == stype, en = aiming && !putter && (enabled == null || enabled(kv.Key));
            kv.Value.bg.color = on ? Sun : Color.clear; kv.Value.t.color = on ? Ink : A(Cream, en ? .85f : .22f);
        }
        powerOn.enabled = pshot; bolt.texture = Icon(pshot ? "boltW" : "bolt");
    }
    public void SetSwing(string label, int style, bool enabled)   // style 0 sun, 1 power (orange), 2 impact (white)
    {
        Set(swingT, label);
        swingImg.color = A(style == 1 ? Hex("#ff8a4a") : style == 2 ? Color.white : Sun, enabled ? 1 : .45f);
        swingDrop.color = A(style == 1 ? Hex("#b44f1e") : style == 2 ? Hex("#9aa7b0") : Hex("#b8860f"), enabled ? 1 : .45f);
        swingT.color = A(Ink, enabled ? 1 : .45f);
    }
    public void SetHint(string s) => Set(hintT, s);
    public void SetFps(string s) => Set(fpsT, s);
    public void SetLabels(string a, string b, string c, string d) { Set(mLab[1], a.ToUpperInvariant()); Set(mLab[2], b.ToUpperInvariant()); Set(mLab[3], c.ToUpperInvariant()); Set(mLab[4], d.ToUpperInvariant()); }
    // pos: the cursor (0..1 of the meter), fillTo: where the fill ends, lockAt: the power mark (or <0), win: the perfect window
    // (meter units either side of the impact line), tap: the last strike's mark (or <0) and whether it was good
    public void SetMeter(float impact, float pos, float fillTo, float lockAt, float win, float tap, bool tapGood)
    {
        float pw = meterW - 4;
        cursor.anchoredPosition = new Vector2(pos * pw - 17, 21);
        float w = Mathf.Max(0, (fillTo - impact) * pw); w = Mathf.Min(w, fillMax);
        bool small = w < 11;
        fillCap.gameObject.SetActive(w > .5f && !small);
        if (small) { fillBody.sizeDelta = new Vector2(w, 22); fillImg.uvRect = new Rect(0, 0, 1, 1); }
        else
        {
            fillBody.sizeDelta = new Vector2(w - 11, 22); fillImg.uvRect = new Rect(0, 0, (w - 11) / w, 1);
            fillCap.anchoredPosition = new Vector2(impact * pw + w - 11, -4);
        }
        fillBody.gameObject.SetActive(w > .5f);
        lockM.gameObject.SetActive(lockAt >= 0); if (lockAt >= 0) lockM.anchoredPosition = new Vector2(lockAt * pw - 6, 6);
        sweet.anchoredPosition = new Vector2((impact - win) * pw, 0); sweet.sizeDelta = new Vector2(win * 2 * pw, 30);
        tapM.gameObject.SetActive(tap >= 0); if (tap >= 0) { tapM.anchoredPosition = new Vector2(tap * pw - 5, 8); tapRaw.color = tapGood ? Mint : Color.white; }
    }
    public void Tick(float dt)
    {
        if (toastT < 0) return;
        // @keyframes pop: 0 → scale .4 transparent; 12% → 1.08 opaque; 20% → 1; 78% hold; 100% → .96, 10 px up, transparent (1.6 s)
        toastT += dt; float u = toastT / 1.6f; float s, a, dy = 0;
        if (u < .12f) { float k = u / .12f; s = Mathf.Lerp(.4f, 1.08f, k); a = k; }
        else if (u < .2f) { s = Mathf.Lerp(1.08f, 1, (u - .12f) / .08f); a = 1; }
        else if (u < .78f) { s = 1; a = 1; }
        else if (u < 1) { float k = (u - .78f) / .22f; s = Mathf.Lerp(1, .96f, k); a = 1 - k; dy = 10 * k; }
        else { s = 1; a = 0; toastT = -1; }
        toastCG.alpha = a; toastRT.localScale = new Vector3(s, s, 1); toastRT.anchoredPosition = new Vector2(W / 2, -(Hh * .3f) - 50 + dy);
    }

    // ---------- icons (the web game's inline SVGs, drawn the same) ----------
    readonly Dictionary<string, Texture2D> icons = new Dictionary<string, Texture2D>();
    // ---------- the aim overlay (post-chain.js): white dots along the predicted flight, the pulsing gold landing ring, its yardage ----------
    RectTransform aimLayer; readonly List<RawImage> dots = new List<RawImage>(); int dotN; EllipseRing ringInk, ringGold; Text ringT; Texture2D dotTex;
    void BuildAim()
    {
        aimLayer = RT("AimLayer", root); At(aimLayer, 0, 0, W, Hh);
        dotTex = Tex(8, 8, (x, y) => A(Color.white, Cov(Mathf.Sqrt((x - 4) * (x - 4) + (y - 4) * (y - 4)) - 3.5f)));
        EllipseRing Ring(string n, Color c) { var r = RT(n, aimLayer).gameObject.AddComponent<EllipseRing>(); r.color = c; r.raycastTarget = false; r.rectTransform.pivot = new Vector2(.5f, .5f); r.rectTransform.sizeDelta = Vector2.zero; r.enabled = false; return r; }
        ringInk = Ring("RingInk", Ink); ringGold = Ring("RingGold", Sun);
        ringT = Txt(aimLayer, "RingT", fBold, 13, Cream); ringT.rectTransform.pivot = new Vector2(0, .5f); ringT.rectTransform.sizeDelta = new Vector2(80, 18);
        var o = ringT.gameObject.AddComponent<Outline>(); o.effectColor = Ink; o.effectDistance = new Vector2(1.5f, -1.5f); ringT.enabled = false;
    }
    // screen pixels (Unity's: y up) to the canvas (CSS px from the top left)
    Vector2 Css(Vector2 px) => new Vector2(px.x / K, -(Screen.height - px.y) / K);
    public void AimBegin() { dotN = 0; }
    public void AimDot(Vector2 px, float rCss, Color c)
    {
        if (dotN == dots.Count) { var d = Pic(aimLayer, "Dot", dotTex); d.rectTransform.pivot = new Vector2(.5f, .5f); dots.Add(d); }
        var im = dots[dotN++]; im.enabled = true; im.color = c; im.rectTransform.anchoredPosition = Css(px); im.rectTransform.sizeDelta = new Vector2(rCss * 2, rCss * 2);
    }
    // the ring: centre in screen px, radii in CSS px (already pulsed); label "" for none
    public void AimRing(Vector2 px, float rx, float ry, string label)
    {
        var c = Css(px);
        ringInk.enabled = ringGold.enabled = true;
        ringInk.rectTransform.anchoredPosition = ringGold.rectTransform.anchoredPosition = c;
        ringInk.Set(rx + 1, ry + 1, 3.5f); ringGold.Set(rx, ry, 2.5f);
        ringT.enabled = label != ""; Set(ringT, label); ringT.rectTransform.anchoredPosition = c + new Vector2(rx + 6, 0);
    }
    public void AimEnd(bool ring)
    {
        for (int i = dotN; i < dots.Count; i++) dots[i].enabled = false;
        if (!ring) { ringInk.enabled = ringGold.enabled = false; ringT.enabled = false; }
    }
    public void AimHide() { AimBegin(); AimEnd(false); }

    // ---------- the look button (.lookbtn): a round button above the bottom panel's right side; gold while looking ----------
    public Action onLook; Image lookBtn, lookDrop; RawImage lookIco;
    void BuildLook()
    {
        lookBtn = Box(root, "Look", 23, Panel); At(lookBtn.rectTransform, W - 12 - 46, Hh * (1 - BottomFrac) - 12 - 46, 46, 46); lookDrop = Drop(root, lookBtn.rectTransform, 23, 3, new Color(0, 0, 0, .28f));
        lookIco = Pic(lookBtn.transform, "Ico", Icon("eye")); At(lookIco.rectTransform, 11, 11, 24, 24);
        Press(lookBtn, () => onLook?.Invoke());
    }
    public void SetLook(bool shown, bool on)
    {
        if (lookBtn.gameObject.activeSelf != shown) { lookBtn.gameObject.SetActive(shown); lookDrop.gameObject.SetActive(shown); }
        var c = on ? Sun : Panel; if (lookBtn.color != c) { lookBtn.color = c; lookIco.texture = Icon(on ? "eyeInk" : "eye"); }
    }

    // ---------- the strike point popup (#impPop): drag the dot on the ball (top/back spin, draw/fade), pick the shot height ----------
    public Action<Vector2> onImp; public Action<int> onTraj; public Action onImpReset;
    RectTransform impPop, impDotRT; Text impDesc; readonly (Image b, Text t)[] trajB = new (Image, Text)[3]; RawImage spinDot;
    static readonly Color PaperInk = Hex("#12283b");
    public bool ImpOpen => impPop.gameObject.activeSelf;
    public void ShowImp(bool on) { if (impPop.gameObject.activeSelf != on) impPop.gameObject.SetActive(on); }
    void BuildImp()
    {
        // .imppop: paper, radius 18, padding 12 14, 210 wide, centred 10 above the bottom panel; head, a 150 ball, the height row, Reset / Done
        float w = 210, h = 12 + 44 + 8 + 150 + 8 + 32 + 8 + 32 + 12, top = Hh * (1 - BottomFrac) - 10 - h;
        var bg = Box(root, "ImpPop", 18, Cream); impPop = At(bg.rectTransform, (W - w) / 2, top, w, h); bg.raycastTarget = true;
        var hd = Txt(impPop, "H", fDisp, 20, PaperInk, TextAnchor.MiddleCenter); At(hd.rectTransform, 0, 12, w, 24); hd.text = "Strike point";
        impDesc = Txt(impPop, "D", fBody, 13, A(PaperInk, .75f), TextAnchor.MiddleCenter); At(impDesc.rectTransform, 0, 38, w, 18);
        // the ball: viewBox −60..60 drawn at 150 (1.25 px a unit): a shaded disc r 54, ink rim 2.5, dashed cross, the four labels
        float S = 150, k = S / 120;
        var ball = Pic(impPop, "Ball", Tex(S, S, (x, y) =>
        {
            float ux = x / k - 60, uy = y / k - 60, r = Mathf.Sqrt(ux * ux + uy * uy);
            float g = Mathf.Sqrt((ux + 86.4f) * (ux + 86.4f) + (uy + 91.8f) * (uy + 91.8f)) / 118.8f;   // ibg: cx −.3, cy −.35, r 1.1 of the ball's box
            var fill = g < .7f ? Color.Lerp(Color.white, Hex("#e7ecef"), g / .7f) : Color.Lerp(Hex("#e7ecef"), Hex("#b9c4cb"), Mathf.Clamp01((g - .7f) / .3f));
            var c = Over(Color.clear, fill, Cov((r - 54) * k));
            bool dash = Mathf.Repeat((Mathf.Abs(ux) < 1 ? uy : ux) + 54, 7) < 3;
            float cross = Mathf.Min(Mathf.Abs(ux), Mathf.Abs(uy)) * k - .6f; if (r < 54 && dash) c = Over(c, Hex("#9fb0bb"), Cov(cross));
            return Over(c, Ink, Cov((Mathf.Abs(r - 54) - 1.25f) * k));
        }));
        float bx = (w - S) / 2, by = 12 + 44 + 8; At(ball.rectTransform, bx, by, S, S); ball.raycastTarget = true;
        void Lab(string t, float ux, float uy) { var l = Txt(ball.transform, t, fBold, 11, Hex("#5b6b76"), TextAnchor.MiddleCenter); At(l.rectTransform, (ux + 60) * k - 40, (uy + 60) * k - 8, 80, 14); l.text = t; }
        Lab("TOPSPIN", 0, -43); Lab("BACKSPIN", 0, 44); Lab("DRAW", -44, 0); Lab("FADE", 44, 0);
        var dot = Pic(ball.transform, "Dot", Tex(22, 22, (x, y) => { float r = Mathf.Sqrt((x - 11) * (x - 11) + (y - 11) * (y - 11)); return Over(Over(Color.clear, Color.white, Cov(r - 11)), Coral, Cov(r - 8.75f)); }));
        impDotRT = dot.rectTransform; impDotRT.pivot = new Vector2(.5f, .5f); impDotRT.sizeDelta = new Vector2(22, 22);
        var dh = ball.gameObject.AddComponent<DragHandler>(); var brt = ball.rectTransform;
        dh.onMove = p =>
        {   // setFrom: the touch on the ball, in ball radii (44 units), kept inside the ball, to the nearest .05
            RectTransformUtility.ScreenPointToLocalPointInRectangle(brt, p, null, out var lp);
            float x = (lp.x / S - .5f) * 120 / 44, y = (lp.y / S + .5f) * 120 / 44, l = Mathf.Sqrt(x * x + y * y), kk = l > 1 ? 1 / l : 1;
            onImp?.Invoke(new Vector2(Mathf.Round(x * kk * 20) / 20, Mathf.Round(y * kk * 20) / 20));
        };
        // .trajseg: Low / Normal / High on #e3dccb, the chosen one ink with sun text
        float ty = by + S + 8, tw = w - 28;
        var seg = Box(impPop, "Traj", 10, Hex("#e3dccb")); At(seg.rectTransform, 14, ty, tw, 32);
        string[] tn = { "Low", "Normal", "High" }; float cw = (tw - 6 - 8) / 3;
        for (int i = 0; i < 3; i++)
        {
            int tj = i - 1; var b = Box(seg.transform, tn[i], 8, Color.clear); At(b.rectTransform, 3 + i * (cw + 4), 3, cw, 26);
            var t = Txt(b.transform, "T", fBold, 13, PaperInk, TextAnchor.MiddleCenter); At(t.rectTransform, 0, 0, cw, 26); t.text = tn[i];
            Press(b, () => onTraj?.Invoke(tj)); trajB[i] = (b, t);
        }
        // .impbtns: Reset (ink outline) and Done (ink, sun text)
        float yb = ty + 32 + 8;
        var rs = Box(impPop, "Reset", 10, Color.clear, 2, PaperInk); At(rs.rectTransform, w / 2 - 4 - 80, yb, 80, 32);
        var rt = Txt(rs.transform, "T", fBold, 14, PaperInk, TextAnchor.MiddleCenter); At(rt.rectTransform, 0, 0, 80, 32); rt.text = "Reset"; Press(rs, () => onImpReset?.Invoke());
        var dn = Box(impPop, "Done", 10, PaperInk); At(dn.rectTransform, w / 2 + 4, yb, 80, 32);
        var dt = Txt(dn.transform, "T", fBold, 14, Sun, TextAnchor.MiddleCenter); At(dt.rectTransform, 0, 0, 80, 32); dt.text = "Done"; Press(dn, () => ShowImp(false));
        impPop.gameObject.SetActive(false);
    }
    // drawImp + the spin button: the dot on the ball, the description, the chosen height
    public void SetImp(Vector2 imp, int traj, string desc, string shortTxt, bool putter)
    {
        impDotRT.anchoredPosition = new Vector2(75 + imp.x * 44 * 1.25f, -75 + imp.y * 44 * 1.25f); Set(impDesc, desc);
        for (int i = 0; i < 3; i++) { bool on = i - 1 == traj; trajB[i].b.color = on ? PaperInk : Color.clear; trajB[i].t.color = on ? Sun : PaperInk; }
        Set(spinT, putter ? "\u2014" : shortTxt.ToUpperInvariant());
        spinDot.enabled = !putter; spinDot.rectTransform.anchoredPosition = new Vector2(24 + (12 + imp.x * 6) * 22 / 24f, -(6 + (12 - imp.y * 6) * 22 / 24f));
    }

    Texture2D Icon(string n)
    {
        if (icons.TryGetValue(n, out var t)) return t;
        // all in the SVGs' own 24-unit viewBox, drawn into a 24-unit square (scaled to the element by the RawImage)
        Func<float, float, Color> f;
        switch (n)
        {
            case "arrow":   // M12 2 L18 11 H14 V22 H10 V11 H6 Z, fill #6cc8ff, stroke ink 1.2
                { var p = new[] { new Vector2(12, 2), new Vector2(18, 11), new Vector2(14, 11), new Vector2(14, 22), new Vector2(10, 22), new Vector2(10, 11), new Vector2(6, 11) };
                  f = (x, y) => { float d = SdPoly(x, y, p); return Over(Over(Color.clear, Ink, Cov(d - .6f)), SkyC, Cov(d + .6f)); }; break; }
            case "menu":    // three 2.4-wide lines
                f = (x, y) => A(Cream, Cov(Mathf.Min(SdSeg(x, y, 4, 7, 20, 7), Mathf.Min(SdSeg(x, y, 4, 12, 20, 12), SdSeg(x, y, 4, 17, 20, 17))) - 1.2f)); break;
            case "sound":
            case "mute":
                { var sp = new[] { new Vector2(4, 9), new Vector2(8, 9), new Vector2(13, 5), new Vector2(13, 19), new Vector2(8, 15), new Vector2(4, 15) }; bool on = n == "sound";
                  f = (x, y) =>
                  {
                      float d = SdPoly(x, y, sp);
                      if (on && x > 13) { float r = Mathf.Sqrt((x - 12) * (x - 12) + (y - 12) * (y - 12)); float a = Mathf.Abs(Mathf.Atan2(y - 12, x - 12));
                          if (a < .78f) d = Mathf.Min(d, Mathf.Min(Mathf.Abs(r - 5) - 1, Mathf.Abs(r - 8.5f) - 1)); }
                      if (!on) d = Mathf.Min(d, Mathf.Min(SdSeg(x, y, 16, 9, 22, 15), SdSeg(x, y, 22, 9, 16, 15)) - 1);
                      return A(Cream, Cov(d));
                  }; break; }
            case "map":     // M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z, M9 4v14 M15 6v14, stroke 2
                { var o = new[] { new Vector2(3, 6), new Vector2(9, 4), new Vector2(15, 6), new Vector2(21, 4), new Vector2(21, 18), new Vector2(15, 20), new Vector2(9, 18), new Vector2(3, 20), new Vector2(3, 6) };
                  f = (x, y) => A(Cream, Cov(Mathf.Min(SdPolyline(x, y, o), Mathf.Min(SdSeg(x, y, 9, 4, 9, 18), SdSeg(x, y, 15, 6, 15, 20))) - 1)); break; }
            case "eye":     // M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z, circle r 3.2, stroke 2 (the look button)
            case "eyeInk":
                { var ec = n == "eye" ? Cream : Ink;
                  f = (x, y) =>
                  {   // the almond: where two discs of radius 10.94 (centres 4.44 above and below) overlap
                      float d1 = Mathf.Sqrt((x - 12) * (x - 12) + (y - 16.44f) * (y - 16.44f)) - 10.94f, d2 = Mathf.Sqrt((x - 12) * (x - 12) + (y - 7.56f) * (y - 7.56f)) - 10.94f;
                      float r = Mathf.Sqrt((x - 12) * (x - 12) + (y - 12) * (y - 12));
                      return A(ec, Cov(Mathf.Min(Mathf.Abs(Mathf.Max(d1, d2)), Mathf.Abs(r - 3.2f)) - 1));
                  }; break; }
            case "chevL": f = (x, y) => A(Cream, Cov(SdPolyline(x, y, new[] { new Vector2(15, 5), new Vector2(8, 12), new Vector2(15, 19) }) - 1.5f)); break;
            case "chevR": f = (x, y) => A(Cream, Cov(SdPolyline(x, y, new[] { new Vector2(9, 5), new Vector2(16, 12), new Vector2(9, 19) }) - 1.5f)); break;
            case "ball":    // the strike-point ball: white disc, ink rim, cross hairs, the coral dot (ballN: no dot, it's drawn on top where the strike is)
            case "ballN":
                f = (x, y) =>
                {
                    float r = Mathf.Sqrt((x - 12) * (x - 12) + (y - 12) * (y - 12));
                    var c = Over(Color.clear, Ink, Cov(r - 9.75f)); c = Over(c, Color.white, Cov(r - 9));
                    c = Over(c, Hex("#c9d3da"), Cov(Mathf.Min(Mathf.Abs(x - 12), Mathf.Abs(y - 12)) - .4f) * (r < 8 ? 1 : 0));
                    return n == "ball" ? Over(c, Coral, Cov(r - 3)) : c;
                }; break;
            default:        // bolt (the power-shot toggle)
                { var p = new[] { new Vector2(13, 2), new Vector2(5, 13.5f), new Vector2(11, 13.5f), new Vector2(10, 22), new Vector2(19, 9.5f), new Vector2(13, 9.5f) };
                  var bc = n == "boltW" ? Color.white : Hex("#ffb36b"); f = (x, y) => A(bc, Cov(SdPoly(x, y, p))); break; }
        }
        float s = 24; var keep = K; K = keep * 2;   // icons drawn at 2x their CSS size: they're scaled down a little (26/24 etc.)
        t = Tex(s, s, f); K = keep; icons[n] = t; return t;
    }
}

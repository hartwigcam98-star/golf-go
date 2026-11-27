using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/* The home screen (the web game's #menuM, home-screen.js), the Courses tab: a paper card over the dark page, scrolling, with
     the golfer row (portrait, name, trait: change golfer), the course picture with its line (course · tees · par) and name,
     the US map with the states that have courses (the current course's state in coral) and a badge per state; tap a badge for that
     state's courses (a picture card each, the current one dark), then New round / Continue round / Play a hole (a grid of the 18).
   The pictures are the web's own (export_home.js: the map, rendered by the web game; COURSE_IMG; CHAR_PIC). Buttons fire on release
   (UI Button), so the card can be scrolled with a finger on them. What a tap means is up to the game: onHome("state:MN") etc. */
public partial class Hud
{
    public class HomeData
    {
        public string golferName, golferSub; public Texture golferPic;
        public Texture hero; public string heroLine, heroName;
        public string curState;                 // the current course's state (coral on the map)
        public string state;                    // the state whose courses are shown (null: the map)
        public List<(string id, string name, string town, Texture pic, bool on)> courses;
        public int[] holePars;                  // the hole picker (null: the main buttons)
        public string saveNote, warn; public bool hasSave;
        public string footer;
    }
    public Action<string> onHome;
    RectTransform home, homeContent;
    public bool HomeOpen => home != null;
    [Serializable] class MapState { public string name; public float[] box; }
    Dictionary<string, float[]> mapBoxes; float mapW = 330, mapH = 198;
    void LoadMap()
    {
        if (mapBoxes != null) return; mapBoxes = new Dictionary<string, float[]>();
        var ta = Resources.Load<TextAsset>("home/map"); if (ta == null) return;
        var j = (Dictionary<string, object>)GolfGo.Sim.MiniJson.Parse(ta.text);
        mapW = Convert.ToSingle(j["w"]); mapH = Convert.ToSingle(j["h"]);
        foreach (var kv in (Dictionary<string, object>)j["states"])
        {
            var b = (List<object>)((Dictionary<string, object>)kv.Value)["box"]; var f = new float[4]; for (int i = 0; i < 4; i++) f[i] = Convert.ToSingle(b[i]); mapBoxes[kv.Key] = f;
        }
    }
    public void HideHome() { if (home) UnityEngine.Object.Destroy(home.gameObject); home = null; homeContent = null; }
    static Texture2D heroShade;
    // a button that fires on release (scrolling over it doesn't press it)
    void Tap(Graphic g, string ev)
    {
        g.raycastTarget = true; var b = g.gameObject.AddComponent<Button>(); b.transition = Selectable.Transition.None; b.targetGraphic = g;
        var nav = b.navigation; nav.mode = Navigation.Mode.None; b.navigation = nav; b.onClick.AddListener(() => onHome?.Invoke(ev));
    }
    public void ShowHome(HomeData d, bool keepScroll = false)
    {
        float keepY = keepScroll && homeContent ? homeContent.anchoredPosition.y : 0;
        HideChoice(); HidePaper(); HideHome(); LoadMap();
        var bg = Box(root, "Home", 0, Hex("#0b1b28")); home = At(bg.rectTransform, 0, 0, W, Hh); bg.raycastTarget = true;
        var sa = Screen.safeArea; float sBot = sa.yMin / K;
        float cw = Mathf.Min(W - 24, 440), top = STop + 12, ch = Hh - top - sBot - 12;
        var card = Box(home, "Card", 22, PaperC); At(card.rectTransform, (W - cw) / 2, top, cw, ch); card.raycastTarget = true;
        card.gameObject.AddComponent<RectMask2D>();
        var ct = RT("Content", card.transform); homeContent = ct;
        var sr = card.gameObject.AddComponent<ScrollRect>(); sr.content = ct; sr.viewport = card.rectTransform; sr.horizontal = false; sr.vertical = true;
        sr.movementType = ScrollRect.MovementType.Elastic; sr.scrollSensitivity = 20; sr.inertia = true; sr.decelerationRate = .12f;
        float px = 18, iw = cw - 36, y = 18;

        // the title
        var tt = Txt(ct, "Title", fDisp, 30, PInk); At(tt.rectTransform, px, y, iw, 36); tt.text = "Golf Go"; y += 36 + 10;

        // the golfer row (#mGolfer)
        {
            var row = Box(ct, "Golfer", 14, PaperC, 2, PInk); At(row.rectTransform, px, y, iw, 62); Tap(row, "golfer");
            if (d.golferPic) { var pic = Pic(row.transform, "Pic", (Texture2D)d.golferPic); At(pic.rectTransform, 8, 8, 46, 46); }
            var nm = Txt(row.transform, "Name", fBody, 19, PInk); At(nm.rectTransform, 64, 9, iw - 100, 24); nm.text = d.golferName;
            var sb = Txt(row.transform, "Sub", fBody, 13, PMuted); At(sb.rectTransform, 64, 33, iw - 100, 18); sb.text = d.golferSub;
            var ch2 = Txt(row.transform, "Chev", fBody, 26, PMuted, TextAnchor.MiddleCenter); At(ch2.rectTransform, iw - 34, 0, 26, 62); ch2.text = "›";
            y += 62 + 12;
        }
        // the course's picture (#mHeroImg) with its line and name
        {
            float hh = Mathf.Round(iw * .5625f);
            var hb = Box(ct, "Hero", 14, PInk); At(hb.rectTransform, px, y, iw, hh);
            if (d.hero) { var hp = Pic(hb.transform, "Img", (Texture2D)d.hero); At(hp.rectTransform, 0, 0, iw, hh); }
            if (heroShade == null) heroShade = Tex(4, 64, (x, yy) => new Color(0, 0, 0, Mathf.SmoothStep(0, .62f, (yy / 64f - .35f) / .65f)));
            var sh = Pic(hb.transform, "Shade", heroShade); At(sh.rectTransform, 0, 0, iw, hh);
            var eb = Txt(hb.transform, "Line", fBold, 12, Sun); At(eb.rectTransform, 14, hh - 58, iw - 28, 16); eb.text = (d.heroLine ?? "").ToUpperInvariant();
            var nm = Txt(hb.transform, "Name", fBody, 30, Cream); At(nm.rectTransform, 14, hh - 42, iw - 28, 36); nm.text = d.heroName;
            y += hh + 14;
        }
        if (d.holePars != null)
        {   // Play a hole (#mHoles): the 18 in a grid, each with its par
            var back = Box(ct, "Back", 16, PaperC, 2, PInk); At(back.rectTransform, px, y, 78, 32); Tap(back, "holes-back");
            var bt = Txt(back.transform, "T", fBold, 15, PInk, TextAnchor.MiddleCenter); At(bt.rectTransform, 0, 0, 78, 32); bt.text = "‹ Back";
            var hdr = Txt(ct, "H", fBody, 22, PInk); At(hdr.rectTransform, px + 90, y, iw - 90, 32); hdr.text = "Play a hole"; y += 32 + 12;
            int cols = 6; float gw = (iw - (cols - 1) * 8) / cols, gh = 54;
            for (int i = 0; i < d.holePars.Length; i++)
            {
                float x = px + (i % cols) * (gw + 8), yy = y + (i / cols) * (gh + 8);
                var c = Box(ct, "Hole", 12, PaperC, 2, PInk); At(c.rectTransform, x, yy, gw, gh); Tap(c, "hole:" + i);
                var n = Txt(c.transform, "N", fDisp, 22, PInk, TextAnchor.MiddleCenter); At(n.rectTransform, 0, 4, gw, 28); n.text = (i + 1).ToString();
                var p = Txt(c.transform, "P", fBody, 11, PMuted, TextAnchor.MiddleCenter); At(p.rectTransform, 0, 32, gw, 16); p.text = d.holePars[i] > 0 ? "Par " + d.holePars[i] : "";
            }
            y += Mathf.Ceil(d.holePars.Length / (float)cols) * (gh + 8) + 8;
            var nt = Txt(ct, "Note", fBody, 13, PMuted, TextAnchor.UpperCenter); At(nt.rectTransform, px, y, iw, 36); nt.horizontalOverflow = HorizontalWrapMode.Wrap;
            nt.text = "Practice: one hole, no score kept. Your saved round stays as it is."; y += 40;
        }
        else
        {
            if (d.state == null)
            {   // the map (#usMap): the states with courses, a badge each to tap
                float mh = Mathf.Round(iw * mapH / mapW);
                var mt = Resources.Load<Texture2D>("home/map_" + (d.curState ?? "none")) ?? Resources.Load<Texture2D>("home/map_none");
                var mp = Pic(ct, "Map", mt); At(mp.rectTransform, px, y, iw, mh);
                foreach (var kv in mapBoxes)
                {
                    var f = kv.Value; float bx = px + f[0] * iw, by = y + f[1] * mh, bw = f[2] * iw, bh = f[3] * mh;
                    var hit = Box(ct, "Badge" + kv.Key, 0, Color.clear); At(hit.rectTransform, bx - 10, by - 10, bw + 20, bh + 20); Tap(hit, "state:" + kv.Key);
                }
                y += mh + 4;
                var cap = Txt(ct, "Cap", fBody, 13, PMuted, TextAnchor.MiddleCenter); At(cap.rectTransform, px, y, iw, 20); cap.text = "Tap a state to see its courses"; y += 20 + 14;
            }
            else
            {   // a state's courses (#stateView): ‹ Map, the state, how many; a picture card per course
                var back = Box(ct, "Back", 16, PaperC, 2, PInk); At(back.rectTransform, px, y, 70, 32); Tap(back, "map");
                var bt = Txt(back.transform, "T", fBold, 15, PInk, TextAnchor.MiddleCenter); At(bt.rectTransform, 0, 0, 70, 32); bt.text = "‹ Map";
                var sn = Txt(ct, "State", fBody, 24, PInk); At(sn.rectTransform, px + 82, y - 2, iw - 180, 36); sn.text = d.state;
                var cn = Txt(ct, "Count", fBold, 13, PMuted, TextAnchor.MiddleRight); At(cn.rectTransform, px + iw - 100, y, 100, 32);
                cn.text = d.courses.Count + (d.courses.Count == 1 ? " course" : " courses"); y += 32 + 12;
                float gw = (iw - 10) / 2, ph = Mathf.Round((gw - 12) * .5625f), gh = 6 + ph + 6 + 22 + 16 + 8;
                for (int i = 0; i < d.courses.Count; i++)
                {
                    var c0 = d.courses[i]; float x = px + (i % 2) * (gw + 10), yy = y + (i / 2) * (gh + 10);
                    var c = Box(ct, "Course", 14, c0.on ? PInk : PaperC, 2, PInk); At(c.rectTransform, x, yy, gw, gh); Tap(c, "course:" + c0.id);
                    if (c0.pic) { var pc = Pic(c.transform, "Pic", (Texture2D)c0.pic); At(pc.rectTransform, 6, 6, gw - 12, ph); }
                    var n = Txt(c.transform, "N", fBody, 17, c0.on ? Cream : PInk, TextAnchor.MiddleCenter); At(n.rectTransform, 4, 6 + ph + 4, gw - 8, 22); n.text = c0.name;
                    var tw = Txt(c.transform, "T", fBody, 12, c0.on ? A(Cream, .75f) : PMuted, TextAnchor.MiddleCenter); At(tw.rectTransform, 4, 6 + ph + 26, gw - 8, 16); tw.text = c0.town;
                    FitText(n, gw - 8);
                }
                y += Mathf.Ceil(d.courses.Count / 2f) * (gh + 10) + 6;
            }
            // the buttons (#mMain)
            if (!string.IsNullOrEmpty(d.saveNote))
            {
                var sn2 = Txt(ct, "Save", fBody, 13, PMuted, TextAnchor.UpperCenter); sn2.horizontalOverflow = HorizontalWrapMode.Wrap; sn2.text = d.saveNote;
                float h2 = TextH(sn2, iw); At(sn2.rectTransform, px, y, iw, h2 + 2); y += h2 + 8;
            }
            void Primary(string label, string ev)
            {
                var b = Box(ct, "Primary", 16, PInk); At(b.rectTransform, px, y, iw, 54); Drop(ct, b.rectTransform, 16, 4, Hex("#050e16")); Tap(b, ev);
                var t = Txt(b.transform, "T", fDisp, 24, Sun, TextAnchor.MiddleCenter); At(t.rectTransform, 0, 0, iw, 54); t.text = label; y += 54 + 12;
            }
            void Ghost(string label, string ev)
            {
                var b = Box(ct, "Ghost", 14, Color.clear, 2, PInk); At(b.rectTransform, px, y, iw, 46); Tap(b, ev);
                var t = Txt(b.transform, "T", fDisp, 19, PInk, TextAnchor.MiddleCenter); At(t.rectTransform, 0, 0, iw, 46); t.text = label; y += 46 + 10;
            }
            if (d.hasSave) { Primary("Continue round", "continue"); Ghost("New round", "new"); }
            else Primary("New round", "new");
            if (!string.IsNullOrEmpty(d.warn))
            {
                var w = Txt(ct, "Warn", fBold, 13, PCoral, TextAnchor.UpperCenter); w.horizontalOverflow = HorizontalWrapMode.Wrap; w.text = d.warn;
                float h3 = TextH(w, iw); At(w.rectTransform, px, y - 4, iw, h3 + 2); y += h3 + 8;
            }
            Ghost("Play a hole", "holes");
        }
        if (!string.IsNullOrEmpty(d.footer)) { var ft = Txt(ct, "Foot", fBody, 12, PMuted, TextAnchor.MiddleCenter); At(ft.rectTransform, px, y + 4, iw, 18); ft.text = d.footer; y += 26; }
        At(ct, 0, 0, cw, y + 18);
        if (keepY > 0) ct.anchoredPosition = new Vector2(0, Mathf.Min(keepY, Mathf.Max(0, y + 18 - ch)));
    }
    // the download overlay (the web's #cdlM): the course, a bar, what's come in, Cancel
    RectTransform load; RectTransform loadBar; Text loadT; float loadW;
    public bool LoadOpen => load != null;
    public void ShowLoad(string title, string sub, Action cancel)
    {
        HideLoad();
        var dim = Box(root, "Load", 0, new Color(6 / 255f, 18 / 255f, 28 / 255f, .6f)); load = At(dim.rectTransform, 0, 0, W, Hh); dim.raycastTarget = true;
        float cw = Mathf.Min(W - 32, 380), px = 20, iw = cw - 40, y = 22;
        var card = Box(load, "Card", 22, PaperC); var ct = card.transform;
        var h = Txt(ct, "T", fDisp, 26, PInk); At(h.rectTransform, px, y, iw, 32); h.text = title; y += 32 + 6;
        var sb = Txt(ct, "S", fBody, 14, PMuted, TextAnchor.UpperLeft); sb.horizontalOverflow = HorizontalWrapMode.Wrap; sb.text = sub; float sh = TextH(sb, iw); At(sb.rectTransform, px, y, iw, sh + 2); y += sh + 14;
        var track = Box(ct, "Track", 6, A(PInk, .12f)); At(track.rectTransform, px, y, iw, 12); loadW = iw;
        loadBar = Box(track.transform, "Bar", 6, PInk).rectTransform; At(loadBar, 0, 0, 12, 12); y += 12 + 8;
        loadT = Txt(ct, "P", fBold, 13, PInk); At(loadT.rectTransform, px, y, iw, 18); loadT.text = "Starting…"; y += 18 + 14;
        var b = Box(ct, "Cancel", 14, Color.clear, 2, PInk); At(b.rectTransform, px, y, iw, 46);
        var bt = Txt(b.transform, "T", fDisp, 19, PInk, TextAnchor.MiddleCenter); At(bt.rectTransform, 0, 0, iw, 46); bt.text = "Cancel"; Press(b, () => cancel?.Invoke()); y += 46 + 20;
        At(card.rectTransform, (W - cw) / 2, Mathf.Max(STop + 16, (Hh - y) / 2), cw, y);
    }
    public void SetLoad(float f, string text) { if (load == null) return; loadBar.sizeDelta = new Vector2(Mathf.Max(12, loadW * Mathf.Clamp01(f)), 12); Set(loadT, text); }
    public void HideLoad() { if (load) UnityEngine.Object.Destroy(load.gameObject); load = null; }
    // shrink a one-line label until it fits (long course names on the cards)
    void FitText(Text t, float w) { for (int s = t.fontSize; s > 11 && t.preferredWidth > w; s--) t.fontSize = s - 1; }
}

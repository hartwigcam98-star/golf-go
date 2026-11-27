using System.Collections.Generic;
using UnityEngine;

/* The home screen's side in the game (home-screen.js, save-file.js): what it shows (the golfer, the course, the map or a state's
   courses, the saved round) and what its taps do: pick a course, start a new round or carry on the saved one, play one hole
   (practice: no score kept, the saved round untouched). While it's up the 3D view stops drawing. */
public partial class HoleTest
{
    bool practice, homeUp, newArmed; string homeState; bool homeHoles;
    void ShowHome() { homeUp = true; newArmed = false; homeHoles = false; homeState = null; RefreshHome(false); }
    void RefreshHome(bool keep)
    {
        CancelInvoke(); hud.AimHide(); hud.HideStats();
        if (cam) cam.enabled = false;
        string gName = System.Array.Find(Golfers, g => g[0] == golferId)?[1] ?? golferId;
        var ci = CourseOf(CourseId); var T = Tips; var sv = LoadSave();
        var d = new Hud.HomeData
        {
            golferName = gName, golferSub = TraitShort(golferId) + " · change golfer", golferPic = Resources.Load<Texture2D>("golfers/" + golferId + "_pic"),
            hero = Resources.Load<Texture2D>(CourseId + "/hero"), heroLine = T?.line ?? ci?.name, heroName = ci?.name ?? CourseId,
            curState = ci?.state, hasSave = sv != null,
            footer = "Golf Go · Unity · " + Courses.Length + (Courses.Length == 1 ? " course" : " courses")
        };
        if (sv != null)
        {
            var sc = CourseOf(sv.course); int thru = 0, diff = 0; for (int k = 0; k < 18; k++) if (sv.scores[k] > 0) { thru++; diff += sv.scores[k] - sv.pars[k]; }
            d.saveNote = "Your round at " + (sc?.name ?? sv.course) + ": hole " + (sv.hi + 1) + ", stroke " + (sv.mid ? sv.strokes + 1 : 1) + (thru > 0 ? " · " + DiffStr(diff) + " through " + thru : "");
            if (newArmed) d.warn = "Tap New round again to start over at " + (ci?.name ?? CourseId) + ": the saved round ends.";
        }
        if (homeHoles) d.holePars = ParsFull();
        else if (homeState != null)
        {
            d.state = StateName(homeState); d.courses = new List<(string, string, string, Texture, bool)>();
            foreach (var c in Courses) if (c.state == homeState)
                {
                    string town = c.town.Contains(",") ? c.town.Substring(0, c.town.LastIndexOf(',')) : c.town;
                    if (!CourseStore.Ready(c.id)) town = CourseStore.Known(c.id) ? "↓ " + CourseStore.MB(CourseStore.Size(c.id)) + " · " + town : "Not in this build";
                    d.courses.Add((c.id, c.name, town, Resources.Load<Texture2D>(c.id + "/hero"), c.id == CourseId));
                }
        }
        hud.ShowHome(d, keep);
    }
    void HideHome() { homeUp = false; hud.HideHome(); if (cam) cam.enabled = true; }
    static string StateName(string st) => st == "WI" ? "Wisconsin" : st == "MN" ? "Minnesota" : st == "SC" ? "South Carolina" : st == "AL" ? "Alabama" : st == "AZ" ? "Arizona" : st == "FL" ? "Florida" : st == "FR" ? "France" : st;
    static string TraitShort(string id) => id == "ch06" ? "Pure striker" : id == "ch28" ? "Pro swing" : id == "ch42" ? "Range rat" : "Golfer";
    void HomeEvent(string e)
    {
        SFX?.Tick();
        if (e == "golfer")
        {
            var opts = new List<(string, string, bool)>(); foreach (var g in Golfers) opts.Add((g[1], (g[0] == golferId ? "Playing now · " : "") + Trait(g[0]), g[0] == golferId));
            hud.ShowChoice("Golfer", "Who's playing?", null, opts, k => { if (Golfers[k][0] != golferId) LoadGolfer(Golfers[k][0]); PlaceGolfer(); RefreshHome(true); });
            return;
        }
        if (e.StartsWith("state:")) { homeState = e.Substring(6); homeHoles = false; }
        else if (e == "map") homeState = null;
        else if (e.StartsWith("course:"))
        {
            string id = e.Substring(7);
            if (!CourseStore.Ready(id)) { AskDownload(id, () => { SetCourse(id); newArmed = false; RefreshHome(true); }); return; }
            if (id != CourseId) { SetCourse(id); newArmed = false; }
        }
        else if (e == "holes") homeHoles = true;
        else if (e == "holes-back") homeHoles = false;
        else if (e.StartsWith("hole:")) { PlayHole(int.Parse(e.Substring(5))); return; }
        else if (e == "continue")
        {
            var sv = LoadSave(); if (sv == null) return;
            if (!CourseStore.Ready(sv.course)) { AskDownload(sv.course, () => HomeEvent("continue")); return; }
            HideHome(); ResumeRound(sv); hud.Toast("WELCOME BACK", CourseName + " · hole " + (hi + 1), Hud.Mint); return; }
        else if (e == "new")
        {
            if (LoadSave() != null && !newArmed) { newArmed = true; RefreshHome(true); return; }
            ClearSave(); HideHome(); NewRound(); return;
        }
        RefreshHome(e.StartsWith("course:") || e == "holes" || e == "holes-back");
    }
    // a course not on the phone yet: its size, then the download with a bar (the web's courseGate / #cdlM)
    void AskDownload(string id, System.Action then)
    {
        var ci = CourseOf(id); string nm = ci?.name ?? id;
        if (!CourseStore.Known(id)) { hud.Toast("NOT HERE YET", nm + " isn't in this build", Hud.Coral); return; }
        var opts = new List<(string, string, bool)> { ("Download", CourseStore.MB(CourseStore.Size(id)) + " · kept on this phone after this", true), ("Not now", "", false) };
        hud.ShowChoice("New course", nm, "First time on this course: download it to play.", opts, k =>
        {
            if (k != 0) { RefreshHome(true); return; }
            hud.ShowLoad("Loading " + nm, "First time on this course: it’s saved on this phone after this.", () => CourseStore.Cancel());
            CourseStore.Download(id, (ok, err) =>
            {
                hud.HideLoad();
                if (ok) then(); else { hud.Toast("NOT DOWNLOADED", err ?? "Try again", Hud.Coral); RefreshHome(true); }
            });
        });
    }
    // Play a hole (the web's practice mode): one hole of the current course, a fresh seed and weather, no score kept
    void PlayHole(int i)
    {
        HideHome(); practice = true; roundSeed = Random.Range(1, 1000000000); roundDiff = 0; NewWeather();
        LoadHole(Mathf.Clamp(i, 0, 17));
    }
    void PracticeDone()
    {
        cardUp = true; var btn = new List<string>(); if (canReplay) btn.Add("~▶ Watch replay");
        btn.Add("!Play it again"); if (hi < 17) btn.Add("~Next hole"); btn.Add("_Home");
        var c = new Hud.Paper { eyebrow = "Practice · " + CourseName + " · Hole " + (hi + 1), title = Cap1(ScoreName(strokes, D.par)), note = strokes + (strokes == 1 ? " stroke" : " strokes") + " on a par " + D.par + ".", buttons = btn.ToArray() };
        hud.ShowPaper(c, k =>
        {
            var a = btn[k].Substring(1); cardUp = false;
            if (a.EndsWith("Watch replay")) { StartReplay(PracticeDone); return; }
            if (a == "Play it again") LoadHole(hi); else if (a == "Next hole") LoadHole(hi + 1); else ShowHome();
        });
    }
}

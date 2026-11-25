using System;

namespace GolfGo.Sim
{
    /* Stage 1 of the port: the swing (full shots), from the web game's strikeShot / perfectWin / shotMods / lieMul (save-file.js,
       state.js), line for line and with the same dice, so the same tap and seed give the same shot. The player's golfer and bag
       are neutral here (cmod: carry, err, win, curve, wind, spin all 1; perf 1.03, bite 1) and he swings right-handed.
       Short-game shots, putts and the rivals come in later stages. */
    public class ShotIn
    {
        public double bx, by, aim, power; public double? e;     // e: the tap's distance from the impact line (meter units); null = no tap
        public string club = "7I", lie = "fairway", stype = "full";
        public double impX, impY; public int traj; public bool pshot, aiTurn, onTeeBox;
        public double windA, windMph;
    }
    public class Flight
    {
        public double sx, sy, y0, dx, dy, px, py, carry, lat, wx, wy, apex, T, rollMul, rel, back, full;
        public bool fly; public int perfect; public double missBy; public bool miss; public string club, stype;
        // flightS / arcH / flightPos (save-file.js)
        public const double DRAG = 1.1; static readonly double DRAG_N = 1 - Math.Exp(-DRAG);
        public static double S(double u) => u <= 1 ? (1 - Math.Exp(-DRAG * u)) / DRAG_N : 1 + (u - 1) * DRAG * Math.Exp(-DRAG) / DRAG_N;
        public static double ArcH(double s) => 2.802 * s * (1 - s) * (1 + .8 * s);
        public (double x, double y, double Y) Pos(double u)
        {
            double s = S(u);
            return (sx + dx * carry * s + px * lat * s * s + wx * s * s, sy + dy * carry * s + py * lat * s * s + wy * s * s, y0 + apex * ArcH(s));
        }
        public static double Time(double carry, double apex) => Math.Max(.6, .6 * Math.Sqrt(Math.Max(apex, .1)) + carry / 85);
    }

    public class Strike
    {
        readonly Tuning T; readonly Course C; readonly System.Collections.Generic.Dictionary<string, Club> clubs = new System.Collections.Generic.Dictionary<string, Club>();
        public Strike(Tuning t, Course c) { T = t; C = c; foreach (var k in t.Clubs()) clubs[k.id] = k; }
        public Club Club(string id) => clubs[id];

        static bool IsShort(string st) => st != "full" && st != "punch";   // (isShort: the short-game shot types)
        bool BunkerT(string st) => st == "splash" || st == "pick" || st == "blast";

        // lieMul (state.js)
        public double LieMul(Club c, string lie, string stype, bool onTee)
        {
            if (c.id == "1W" && lie != "tee" && lie != "sand" && lie != "fescue" && lie != "dirt" && !onTee) return lie == "fairway" ? .96 : lie == "cut" ? .92 : .75;
            if (lie == "sand" && BunkerT(stype)) return 1;
            if (lie == "sand") return T.Get("SAND_C", c.Tid) ?? .6;
            if (lie == "fescue") return T.Get("FES_C", c.Tid) ?? .6;
            if (lie == "dirt") return T.Get("DIRT_C", c.Tid) ?? .7;
            if (lie == "rough") return T.Get("LIE_T", "rough", c.Group).Value * (c.Tid == "5W" ? 1.04 : 1);
            if (lie == "cut") return T.Get("LIE_T", "cut", c.Group).Value;
            return 1;
        }
        static readonly System.Collections.Generic.Dictionary<string, double> LIE_VG = new System.Collections.Generic.Dictionary<string, double> { { "wood", 1.25 }, { "hyb", 1 }, { "long", 1.1 }, { "mid", .9 }, { "short", .75 }, { "gap", .7 }, { "sand", .7 } };
        public double LieVar(Club c, string lie) { var v = T.Get("LIE_V", lie); return v.HasValue && v.Value != 0 ? v.Value * LIE_VG[c.Group] : 0; }
        public double LieErr(Club c, string lie) => T.Get("LIE_E", lie, c.Group) ?? (lie == "sand" ? 1.6 : 1);

        // stance (state.js): the ground's slope along and across the line, with a small dead zone
        public (double along, double side) Stance(double bx, double by, double aim)
        {
            var (dx, dy) = M.Dir(aim); double px = -dy, py = dx, r = 1.6;
            double gx = (C.HAt(bx + r, by) - C.HAt(bx - r, by)) / (2 * r), gy = (C.HAt(bx, by + r) - C.HAt(bx, by - r)) / (2 * r);
            double along = gx * dx + gy * dy, side = gx * px + gy * py;
            Func<double, double> dz = v => Math.Abs(v) < .022 ? 0 : v - M.Sign(v) * .022;
            return (dz(along), dz(side));
        }
        static double ClubBack(Club c) => c.kind == "wood" ? (c.id == "1W" || c.id == "MD" ? 0 : .15) : c.kind == "hybrid" ? .35 : c.kind == "iron" ? (c.id == "3I" || c.id == "4I" || c.id == "5I" || c.id == "DI" ? .75 : 1) : 1;
        public class Mods { public double carry, apex, roll, wind, curve, win, back; }
        // shotMods (state.js)
        public Mods ShotMods(Club c, ShotIn s)
        {
            if (c.putter) return new Mods { carry = 1, apex = 1, roll = 1, curve = 0, win = 1, back = 0, wind = 1 };
            int tj = s.traj; double bl = IsShort(s.stype) ? 1 : (T.Get("BACK_LIE", s.lie) ?? 1);
            var S = Stance(s.bx, s.by, s.aim); double ix = s.impX, iy = s.impY, ps = s.pshot ? 1 : 0;
            double sa = M.Clamp(S.along, -.15, .15), ss = M.Clamp(S.side, -.15, .15);
            double? spk = T.Get("SPIN_K", s.stype);
            return new Mods
            {
                carry = (1 + .15 * ps) * (1 - sa * 1.1) * (1 - Math.Abs(ix) * .04) * (iy < 0 ? 1 + iy * .04 : 1) * (tj > 0 ? .97 : 1),
                apex = (1 + sa * 1.8) * (1 - .08 * ps) * (tj > 0 ? 1.3 : tj < 0 ? .68 : 1),
                roll = (1 - sa * 1.5) * (iy > 0 ? 1 + .9 * iy : 1 + .72 * iy * (spk ?? 1) * bl * ClubBack(c)) * (tj > 0 ? .55 : tj < 0 ? 1.6 : 1),
                wind = tj > 0 ? 1.35 : tj < 0 ? .55 : 1,
                curve = ix * .085 - ss * .55 - sa * .12,
                win = (ps != 0 ? .72 : 1) * (tj != 0 ? .9 : 1) * M.Clamp(1 - (Math.Abs(S.along) + Math.Abs(S.side)) * 2.2, .6, 1),
                back = iy < -.5 && spk == null && bl * ClubBack(c) >= .5 ? (-iy - .5) * 2 * bl * ClubBack(c) : 0
            };
        }
        bool ApprShot(Club c, string st) => !c.putter && !IsShort(st) && (c.kind == "wedge" || c.kind == "iron" || c.kind == "hybrid");
        double ApprK(Club c) => c.kind == "wedge" ? .016 : c.kind == "iron" ? .02 : .024;
        // perfectWin / perfectWinBase (state.js)
        public double PerfectWin(Club c, ShotIn s)
        {
            double k = s.aiTurn ? 1 : .8;
            if (c.putter) return .026 * k;
            bool sh = IsShort(s.stype);
            double b = ((s.lie == "sand" && !BunkerT(s.stype) && !sh) || (s.lie == "dirt" && !sh)) ? T.Num("SAND_WIN")
                : (s.lie == "rough" || s.lie == "sand" || s.lie == "fescue" || s.lie == "dirt") ? .018 : s.lie == "cut" ? .022 : .024;
            b *= T.ShotK(s.stype, "win") * k;
            bool tight = ApprShot(c, s.stype) || (!sh && c.kind == "wood" && s.lie == "tee");
            return b * ShotMods(c, s).win * 1 * (tight ? T.Num("APPR_WIN") : 1);
        }
        // shotApex (state.js)
        public double ShotApex(Club c, double carry, ShotIn s) => c.apex * T.ShotK(s.stype, "a") * Math.Sqrt(M.Clamp(carry / (c.carry * T.ShotK(s.stype, "c")), .2, 1)) * (s.impY > 0 ? 1 - .22 * s.impY : 1 - .14 * s.impY);

        // strikeShot (save-file.js), full swings: Math.random is the seeded Rng, drawn in the same order
        public Flight Hit(ShotIn s, int seed)
        {
            var R = new Rng(seed); var club = Club(s.club); string lie = s.lie; double power = s.power; double? e0 = s.e;
            if (IsShort(s.stype) || club.putter) throw new NotSupportedException("short game and putting come in later stages");
            bool miss = e0 == null; int perfect = 0; double missBy = 0, e = 0;
            bool HARSH = !s.aiTurn;
            if (miss)
            {
                e = (R.Next() < .5 ? -1 : 1) * (HARSH ? .09 + R.Next() * .1 : .07 + R.Next() * .08);
                power *= HARSH ? .3 + R.Next() * .15 : .45; missBy = HARSH ? .06 : 0;
            }
            else
            {
                e = e0.Value; double w = PerfectWin(club, s), ae = Math.Abs(e);
                if (ae <= w) { perfect = ae <= w * .5 ? 2 : 1; e = HARSH && perfect == 1 ? M.Sign(e) * (ae - w * .5) * .45 : 0; }
                else { missBy = ae - w; e = HARSH ? M.Sign(e) * (.018 + (ae - w) * 2.6) + (R.Next() - .5) * (ae - w) * 1.4 : M.Sign(e) * (.012 + (ae - w) * 1.6); }
            }
            string st = s.stype;
            const double perf = 1.03, bite = 1;
            bool perfTee = perfect == 2 && club.kind == "wood";
            double perfBite = perfect == 2 && !perfTee ? 1 - M.Clamp((perf - 1) * 5 * bite, 0, .6) : 1;
            double lm = LieMul(club, lie, st, s.onTeeBox) * (1 + (R.Next() * 2 - 1) * LieVar(club, lie));
            double em = LieErr(club, lie) * T.ShotK(st, "e") * (club.id == "1W" && lie != "tee" && !s.onTeeBox ? 1.3 : 1);
            var Mv = ShotMods(club, s);
            if (s.pshot && perfect != 2) Mv.carry *= (1 + .15 * (perfect == 1 ? .5 : 0)) / 1.15;
            double flyer = st != "punch" && T.Obj("FLYER") != null && T.Obj("FLYER").ContainsKey(lie) ? T.Get("FLYER", lie, club.Group).Value : 1;
            double fat = 0;
            if (lie == "sand" && !BunkerT(st) && !miss && missBy > 0 && e > 0) { var f = (System.Collections.Generic.List<object>)T.Raw("SAND_FAT"); fat = M.Clamp(Convert.ToDouble(f[0]) + missBy * Convert.ToDouble(f[1]), 0, Convert.ToDouble(f[2])); }
            else if (lie == "dirt" && !miss && missBy > 0 && e > 0) { var f = (System.Collections.Generic.List<object>)T.Raw("DIRT_FAT"); fat = M.Clamp(Convert.ToDouble(f[0]) + missBy * Convert.ToDouble(f[1]), 0, Convert.ToDouble(f[2])); }
            // apprDisp
            double adC = 1, adL = 0;
            if (ApprShot(club, st)) { double k = ApprK(club) * (perfect == 2 ? .5 : perfect == 1 ? .8 : 1) * 1; adC = 1 + R.Gauss() * k * .9; adL = R.Gauss() * k; }
            double clubCarry = club.carry;
            double carry = adC * 1 * 1 * Math.Max(2, clubCarry * lm * T.ShotK(st, "c") * power * Mv.carry * (perfTee ? perf : 1)
                * (1 - (HARSH ? Math.Min(.32, missBy * 3.6 * 1) : Math.Min(.16, missBy * 1.6))) * (1 - fat));
            var (dx, dy) = M.Dir(s.aim); double px = -dy, py = dx;
            double lat = -e * 1.8 * em * carry * 1 * 1 + Mv.curve * 1 * carry + adL * carry;
            var (wxu, wyu) = M.Dir(s.windA); double wk = s.windMph * .85 * (carry / 200) * club.loft * T.ShotK(st, "w") * Mv.wind * 1;
            double thin = HARSH ? Math.Min(1, missBy / .06) : 0;
            double apex = ShotApex(club, carry, s) * Mv.apex * (1 - .3 * thin);
            var F = new Flight
            {
                sx = s.bx, sy = s.by, y0 = C.HAt(s.bx, s.by) + .03, dx = dx, dy = dy, px = px, py = py, carry = carry, lat = lat, wx = wxu * wk, wy = wyu * wk, apex = apex,
                T = Flight.Time(carry, apex),
                rollMul = Mv.roll * (1 + .7 * thin) * (flyer > 1 ? 1 - (1 - perfBite) * .5 : perfBite) * flyer,
                rel = 0, back = Mv.back * 1 * (1 - .8 * thin), fly = flyer > 1 && lie != "cut",
                full = clubCarry * lm * T.ShotK(st, "c") * Mv.carry,
                perfect = perfect, missBy = missBy, miss = miss, club = club.id, stype = st
            };
            return F;
        }
    }
}

using System;

namespace GolfGo.Sim
{
    /* the golfer's own game (golfers.js charMods): six stats 1-10, each turned into -2..+2 (d10), and a trait (fx). The bag is the
       standard bag (Cam, Nov 25: no bag customisation in the Unity game), whose effects are all neutral, so cmod() = charMods here.
       CharMods.Neutral (all stats at the middle, no trait) is the neutral golfer the parity cases were first recorded with. */
    public class CharMods
    {
        public double pow, ctl, imp, sg, putt, spin;   // d10 values
        public double fxIron, fxWood, fxPutw = 1, fxFlop, fxSgw = 1, fxCarry, fxWind = 1, fxPerf; public bool fxBomb, fxGrind;
        public static readonly CharMods Neutral = new CharMods();
        static double D10(double v) => (v - 1) / 9 * 4 - 2;
        public static CharMods Of(int pow, int ctl, int imp, int sg, int putt, int spin) => new CharMods { pow = D10(pow), ctl = D10(ctl), imp = D10(imp), sg = D10(sg), putt = D10(putt), spin = D10(spin) };
        // the three golfers in the Unity game (golfers.js CHARS)
        public static CharMods For(string id)
        {
            switch (id)
            {
                case "ch06": { var m = Of(8, 8, 5, 3, 3, 6); m.fxIron = .85; return m; }    // Dex: Pure striker, irons and hybrids stray 15% less
                case "ch28": { var m = Of(8, 8, 5, 3, 5, 4); m.fxWood = .85; return m; }    // Andre: Pro swing, driver and woods stray 15% less
                case "ch42": { var m = Of(8, 3, 8, 5, 3, 6); m.fxPerf = 1.05; return m; }   // Danny: Range rat, perfect strikes +5% with woods
                default: return Neutral;
            }
        }
        /* the bag (golfers.js bagFx, bagWrap): the gear the player picked (driver & woods, irons & hybrid, wedges, putter, ball) */
        public string drv = "std", irn = "std", wdg = "std", ptr = "std", ball = "std";
        public CharMods WithBag(string d, string i, string w, string p, string b) { var m = (CharMods)MemberwiseClone(); m.drv = d; m.irn = i; m.wdg = w; m.ptr = p; m.ball = b; return m; }
        // the putter: the line (putt, by the distance to the pin in yards) and the meter's fineness (puttM)
        public double PuttB(double d) => Putt * (ptr == "blade" ? 1.15 : ptr == "mallet" ? .9 : ptr == "lock" ? (d < 4 ? .8 : d > 10 ? 1.15 : 1) : 1);
        public double PuttM(double d) => ptr == "blade" ? .85 : ptr == "mallet" ? 1.25 : ptr == "lock" && d > 10 ? 1.4 : 1;
        static bool W(Club c) => c.kind == "wood"; static bool I(Club c) => c.kind == "iron" || c.kind == "hybrid"; static bool Wd(Club c) => c.kind == "wedge";
        static readonly System.Collections.Generic.HashSet<string> SHORTN = new System.Collections.Generic.HashSet<string> { "chip", "pitch", "spin", "flop" };
        double BCarry(Club c) { if (c.putter) return 0; double a = 0; if (W(c)) a += drv == "bomb" ? .05 : drv == "max" ? -.035 : 0; if (I(c)) a += irn == "cav" ? .03 : irn == "forged" ? -.02 : 0; a += ball == "dist" ? .02 : ball == "ure" ? -.02 : 0; return a; }
        double BErr(Club c) => W(c) ? (drv == "bomb" ? 1.1 : drv == "max" ? .85 : 1) : 1;
        double BWin(Club c, string st)
        {
            if (c.putter) return 1; double m = 1; bool full = !Strike.IsShort(st);
            if (W(c) && full && drv == "shape") m *= .9; if (I(c) && full && irn == "blade") m *= .92;
            if (Wd(c)) { if (Strike.BunkerT(st)) m *= wdg == "high" ? 1.15 : wdg == "low" ? .85 : 1; if (st == "flop" || st == "spin") m *= wdg == "high" ? .8 : wdg == "low" ? 1.2 : 1; }
            return m;
        }
        double BCurve(Club c) { double m = 1; if (W(c) && drv == "shape") m *= 1.4; if (I(c)) m *= irn == "cav" ? .8 : irn == "forged" ? 1.15 : irn == "blade" ? 1.35 : 1; if (ball == "low") m *= .7; return m; }
        double BSpin(Club c) { double m = 1; if (Wd(c)) m *= wdg == "milled" ? 1.3 : wdg == "low" ? 1.1 : 1; m *= ball == "ure" ? 1.15 : ball == "dist" ? .85 : 1; return m; }
        double BWind => ball == "low" ? .8 : ball == "dist" ? 1.05 : 1;
        double BMis(Club c) => Wd(c) && wdg == "milled" ? 1.2 : 1;
        double BMisFull(Club c) => W(c) && drv == "max" ? .5 : I(c) ? (irn == "cav" ? .7 : irn == "blade" ? 1.2 : 1) : 1;
        public double Bite(Club c) => I(c) && irn == "blade" ? 2 : 1;
        public double Roll(Club c, string t)
        {
            double m = 1; bool sh = SHORTN.Contains(t);
            if (!sh) { if (W(c) && drv == "bomb") m *= 1.1; if (I(c)) m *= irn == "cav" ? 1.25 : irn == "forged" ? .85 : 1; m *= ball == "ure" ? .9 : ball == "low" ? 1.2 : 1; }
            else { if (Wd(c) && wdg == "milled") m *= .7; m *= ball == "dist" ? 1.25 : ball == "ure" ? .85 : ball == "low" ? 1.1 : 1; }
            return m;
        }
        public double SgLie(Club c) => Wd(c) ? (wdg == "high" ? .6 : wdg == "low" ? 1.4 : 1) : 1;

        public double Carry(Club c) => (1 + .025 * pow + (fxBomb && c.kind == "wood" ? .05 : 0) + (fxCarry != 0 ? fxCarry - 1 : 0)) + BCarry(c);
        public double Err(Club c, string stype) => (Strike.IsShort(stype) && !c.putter ? Math.Max(.5, 1 - .06 * sg)
            : Math.Max(.5, 1 - .08 * ctl - ((c.kind == "iron" || c.kind == "hybrid") && fxIron != 0 ? 1 - fxIron : 0) - (c.kind == "wood" && fxWood != 0 ? 1 - fxWood : 0))) * BErr(c);
        public double Win(Club c, string stype) => (c.putter ? (1 + .15 * putt) * fxPutw : Strike.IsShort(stype) ? (1 + .1 * sg) * (stype == "flop" && fxFlop != 0 ? fxFlop : 1) * fxSgw : 1 + .07 * imp) * BWin(c, stype);
        public double CurveC(Club c) => Curve * BCurve(c);
        public double SpinC(Club c) => Spin * BSpin(c);
        public double WindB => Wind * BWind;
        public double MisC(Club c) => Mis * BMis(c);
        public double MisFullC(Club c) => MisFull * BMisFull(c);
        public double WinPutt => (1 + .15 * putt) * fxPutw;
        public double Curve => 1 + .08 * spin;
        public double Spin => 1 + .15 * spin;
        public double Wind => fxWind;
        public double Putt => Math.Max(.5, 1 - .07 * putt);
        public double Mis => (1 - .1 * sg) * (fxGrind ? .7 : 1) * (fxBomb ? 1.25 : 1);
        public double SgVar => Math.Max(.4, 1 - .15 * sg);
        public double PuttD => Math.Max(.4, 1 - .15 * putt);
        public double MisFull => (fxGrind ? .7 : 1) * (fxBomb ? 1.15 : 1);
        public double Perf => fxPerf != 0 ? fxPerf : 1.03;
    }
}

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
        public double Carry(Club c) => 1 + .025 * pow + (fxBomb && c.kind == "wood" ? .05 : 0) + (fxCarry != 0 ? fxCarry - 1 : 0);
        public double Err(Club c, string stype) => Strike.IsShort(stype) && !c.putter ? Math.Max(.5, 1 - .06 * sg)
            : Math.Max(.5, 1 - .08 * ctl - ((c.kind == "iron" || c.kind == "hybrid") && fxIron != 0 ? 1 - fxIron : 0) - (c.kind == "wood" && fxWood != 0 ? 1 - fxWood : 0));
        public double Win(Club c, string stype) => c.putter ? (1 + .15 * putt) * fxPutw : Strike.IsShort(stype) ? (1 + .1 * sg) * (stype == "flop" && fxFlop != 0 ? fxFlop : 1) * fxSgw : 1 + .07 * imp;
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

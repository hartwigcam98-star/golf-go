/* ---------- sky dome, cloud noise and the post-processing chain (bloom, ambient occlusion, sun glare, anti-aliasing, grade) ---------- */
let CLOUDS_COV=.3;

const POST={ok:false,want:true,active:false,hdr:false,om:0,W:0,H:0,T:{},P:{},aoOn:true};
const P_ACES=`vec3 aces(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}`;

(()=>{
const $=id=>document.getElementById(id);
const cv=$('c'), sctx=cv.getContext('2d');
/* Oct 2026: notes when anything is drawn on the overlay, so a frame with nothing on it skips wiping an already empty full-screen
   canvas (which the browser would otherwise treat as changed and composite again) */
const SCX={drew:true};for(const k of['fill','stroke','fillRect','strokeRect','fillText','strokeText','drawImage','putImageData']){const f=sctx[k];sctx[k]=function(){SCX.drew=true;return f.apply(this,arguments);};}
const glc=$('gl');
const TAU=Math.PI*2, DEG=Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dirOf=a=>[Math.sin(a),-Math.cos(a)];
const angTo=(x1,y1,x2,y2)=>Math.atan2(x2-x1,-(y2-y1));
const hyp=Math.hypot;
const smooth=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t);};
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}


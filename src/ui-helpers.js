/* ---------- ui helpers ---------- */
const el={toast:$('toast'),t1:document.querySelector('#toast .t1'),t2:document.querySelector('#toast .t2')};
var TOASTF=0;
function toast(a,b='',col='#ffc93c'){if(G.aiTurn&&MATCH.on&&MATCH.r){const n=rn(MATCH.r);if(a!==n.toUpperCase()&&!(b&&b.startsWith(n)))b=b&&!/tap|timing|touch/i.test(b)?n+' \u00b7 '+b:n;}el.t1.textContent=a;el.t1.style.color=col;el.t2.textContent=b;
  /* swapping pops restarts it with no forced layout; a second message before the swap is drawn keeps it (swapping back would
     look unchanged to the browser and the newer message would never show) */
  const now=performance.now();if(TOASTF&&now-TOASTF<100)return;TOASTF=now;requestAnimationFrame(()=>{TOASTF=0;});
  const t=el.toast,nx=t.classList.contains('show')?'show2':'show';t.classList.remove('show','show2');t.classList.add(nx);}
const cache={};function setT(id,v){if(cache[id]!==v){cache[id]=v;$(id).textContent=v;if(id==='pinTxt')fitChip($(id));}}
/* the pin chip on a narrow phone: a long readout ("Pin 404 yds \u25bc110 ft") used to be clipped to "\u25bc11"; shrink the text to fit
   (drop the "yds" first, then shrink the text, down to about 70%) */
function fitChip(el){el.style.fontSize='';const ov=()=>el.scrollWidth>el.clientWidth+1;if(!ov())return;
  el.textContent=el.textContent.replace(' yds','').replace(' \u00b7 plays ',' \u2192 ');const f0=parseFloat(getComputedStyle(el).fontSize)||14;let f=f0;
  while(f>f0*.72&&ov()){f-=.5;el.style.fontSize=f+'px';}}
window.addEventListener('resize',()=>{const e=document.getElementById('pinTxt');if(e&&cache.pinTxt){e.textContent=cache.pinTxt;fitChip(e);}});
function scoreName(strokes,par){const d=strokes-par;if(strokes===1)return'HOLE IN ONE!';if(d<=-3)return'ALBATROSS!';if(d===-2)return'EAGLE!';if(d===-1)return'BIRDIE!';if(d===0)return'PAR';if(d===1)return'BOGEY';if(d===2)return'DOUBLE BOGEY';if(d===3)return'TRIPLE BOGEY';return'+'+d;}


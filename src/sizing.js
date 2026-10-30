/* ---------- sizing ---------- */
let DPR_CAP=2;
function resize(){
  /* the controls changing height (a hint wrapping to two lines) also lands here: only a real change of screen size rebuilds the canvases */
  const d0=Math.min(DPR_CAP,window.devicePixelRatio||1),w0=cv.clientWidth,h0=cv.clientHeight,same=d0===dpr&&w0===W&&h0===H&&cv.width===Math.round(w0*d0)&&cv.height===Math.round(h0*d0);
  dpr=d0;W=w0;H=h0;
  if(!same)for(const c of[cv,glc]){c.width=Math.round(W*dpr);c.height=Math.round(H*dpr);}
  const tp=document.querySelector('.top').getBoundingClientRect();topH=tp.bottom+6;
  if(typeof MCLK==='object'&&MCLK)MCLK.w=0;
  const inner=document.querySelector('.bottom .inner').getBoundingClientRect();botH=inner.height>0?H-inner.top+8:96;   /* spectating hides the controls */
  if(R3.on&&!same)r3Resize();
}
window.addEventListener('resize',resize);
if(window.ResizeObserver)new ResizeObserver(resize).observe(document.querySelector('.bottom'));


/* Course QA */
(ids)=>{const g=window.__golf,out=[];
for(const cid of ids){g.setCourse(cid);for(let hi=0;hi<TB.length;hi++){g.startHole(hi);const h=G.hole,L=h.lg,nx=L.nx,ny=L.ny,C=L.code;
  const idx=(x,y)=>{const i=Math.floor(x-L.x0+.5),j=Math.floor(y-L.y0+.5);return i<0||j<0||i>=nx||j>=ny?-1:j*nx+i;};
  const f=[],pin=h.pin,pk=idx(pin[0],pin[1]);
  const gc=new Uint8Array(nx*ny);let area=0;
  if(pk<0||C[pk]!==4)f.push('pin not on green ('+(pk<0?'off map':LIE_CODES[C[pk]])+')');
  else{const st=[pk];gc[pk]=1;while(st.length){const k=st.pop();area++;const i=k%nx,j=(k/nx)|0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const a=i+di,b=j+dj;if(a<0||b<0||a>=nx||b>=ny)continue;const q=b*nx+a;if(!gc[q]&&C[q]===4){gc[q]=1;st.push(q);}}}}
  if(area&&area<180)f.push('tiny green '+area+' sq yd');if(area>2600)f.push('huge green '+area+' sq yd');
  const seen=new Uint8Array(nx*ny),blobs=[];const pi=Math.floor(pin[0]-L.x0+.5),pj=Math.floor(pin[1]-L.y0+.5);
  for(let j=Math.max(0,pj-45);j<Math.min(ny,pj+46);j++)for(let i=Math.max(0,pi-45);i<Math.min(nx,pi+46);i++){const k0=j*nx+i;if(seen[k0]||(C[k0]!==5&&C[k0]!==6))continue;
    const ty=C[k0],st=[k0];seen[k0]=1;let n=0,eG=0,eAll=0,minD=1e9;
    while(st.length){const k=st.pop();n++;const a=k%nx,b=(k/nx)|0;minD=Math.min(minD,Math.hypot(a-pi,b-pj));
      for(const[di,dj]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=a+di,y=b+dj;if(x<0||y<0||x>=nx||y>=ny)continue;const q=y*nx+x;if(C[q]===ty){if(!seen[q]){seen[q]=1;st.push(q);}}else{eAll++;if(gc[q])eG++;}}}
    if(n>=2)blobs.push({ty:LIE_CODES[ty],n,share:eAll?eG/eAll:0,minD:+minD.toFixed(1)});}
  for(const b of blobs){if(b.share>=.5)f.push(b.ty+' inside green ('+b.n+' sq yd, '+Math.round(b.share*100)+'% ringed by green)');else if(b.minD<4)f.push(b.ty+' '+b.minD+' yd from pin');}
  if(area){let md=1e9;for(let j=Math.max(0,pj-12);j<Math.min(ny,pj+13);j++)for(let i=Math.max(0,pi-12);i<Math.min(nx,pi+13);i++){if(!gc[j*nx+i])md=Math.min(md,Math.hypot(i-pi,j-pj));}if(md<2.5)f.push('pin '+md.toFixed(1)+' yd from green edge');}
  const bad={};for(const t of h.trees||[]){const k=idx(t.x,t.y);if(k<0)continue;const c=C[k];if(c>=2&&c<=5){const nm=LIE_CODES[c];(bad[nm]=bad[nm]||[]).push(Math.round(t.r));}}
  for(const nm in bad){if(nm==='fairway'&&bad[nm].length<3)continue;f.push(bad[nm].length+' tree'+(bad[nm].length>1?'s':'')+' on '+nm);}
  const t0=(h.line&&h.line[0])||[0,0],tk=idx(t0[0],t0[1]);const tl=tk<0?'off map':LIE_CODES[C[tk]];if(tl!=='tee'&&tl!=='fairway')f.push('tee spot on '+tl);
  let ps=null;try{const e=.6;const hz=(x,y)=>(h.gg&&typeof hFineH==='function')?hFineH(h,x,y):hAt(x,y);ps=Math.hypot(hz(pin[0]+e,pin[1])-hz(pin[0]-e,pin[1]),hz(pin[0],pin[1]+e)-hz(pin[0],pin[1]-e))/(2*e)*100;}catch(err){}
  const len=Math.round((h.line||[]).reduce((a,p,i,arr)=>i?a+Math.hypot(p[0]-arr[i-1][0],p[1]-arr[i-1][1]):0,0));
  out.push({c:cid,h:hi+1,par:h.par,len,area,pinSlope:ps==null?null:+ps.toFixed(2),f});}}
return out;}

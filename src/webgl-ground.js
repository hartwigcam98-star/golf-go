/* ---------- WebGL ground ---------- */
const GL={gl:null,prog:null,vb:null,ib:null,nIdx:0,frame:null,tex:null,u:{},a:{},aniso:null,uint:null};
/* green slope map: RG = downhill direction, B = steepness on the colour scale, A = putting-surface mask */
function buildSlopeTex(h){const gl=GL.gl,g=h.green,m=2,ppy=3,x0=g.bb[0]-m,y0=g.bb[1]-m,w=g.bb[2]-g.bb[0]+2*m,hh=g.bb[3]-g.bb[1]+2*m,nx=Math.ceil(w*ppy),ny=Math.ceil(hh*ppy);
  const d=new Uint8Array(nx*ny*4);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=x0+(i+.5)/ppy,y=y0+(j+.5)/ppy,o=(j*nx+i)*4;const[gx,gy]=gradAt(x,y),mg=hyp(gx,gy);
    const dx=mg>.004?-gx/mg:0,dy=mg>.004?-gy/mg:0,k=clamp((mg*100-SLOPE_LO)/(SLOPE_HI-SLOPE_LO),0,1),pd=polyDist(g,x,y,3);
    d[o]=Math.round((dx*.5+.5)*255);d[o+1]=Math.round((dy*.5+.5)*255);d[o+2]=Math.round(k*255);d[o+3]=Math.round(clamp((-pd-.15)/.7,0,1)*255);}
  if(GL.slTex)GL.slTex.dispose();GL.slTex=r3DataTex(d,nx,ny);R3.GU.slT.value=GL.slTex;R3.GU.SLB.value.set(x0,y0,nx/ppy,ny/ppy);
  {const hz=new Float32Array(nx*ny);let lo=1e9;for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const v=hFineH(h,x0+(i+.5)/ppy,y0+(j+.5)/ppy);hz[j*nx+i]=v;if(v<lo)lo=v;}
   const hv=new Uint16Array(nx*ny);for(let k=0;k<hv.length;k++)hv[k]=THREE.DataUtils.toHalfFloat(Math.min(60000,hz[k]-lo));
   const t=new THREE.DataTexture(hv,nx,ny,THREE.RedFormat,THREE.HalfFloatType);t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;if(GL.slHt)GL.slHt.dispose();GL.slHt=t;R3.GU.slHt.value=t;}
  GL.slH=h;GL.slR=[x0,y0,nx/ppy,ny/ppy];}
function slopeWanted(){const h=G.hole;if(!h||G.state==='intro'||G.state==='card')return false;const aiming=aimingState()&&!G.overview;
  return G.lie==='green'||(aiming&&curClub().putter)||(aiming&&!curClub().putter&&isShort()&&pinDist()<=40)||(G.state==='roll'&&G.fromLie==='green')||(!!G.fc&&G.state==='aim'&&G.fc.dist<120&&hyp(G.fc.tx-h.pin[0],G.fc.tz-h.pin[1])<50)||(!!G.fc&&G.state==='aim'&&!G.fc.fly&&typeof R3!=='undefined'&&R3.on&&!curClub().putter&&G.fc.dist<160);}


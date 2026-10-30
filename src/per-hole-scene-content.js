/* ---- per-hole scene content ---- */
function r3Dispose(o){if(!o)return;R3.scene.remove(o);if(o.geometry)o.geometry.dispose();}
function r3Add(geo,mat,{cast=false,recv=true,order=0,depth=null}={}){const m=new THREE.Mesh(geo,mat);m.castShadow=cast;m.receiveShadow=recv;m.renderOrder=order;if(depth)m.customDepthMaterial=depth;R3.scene.add(m);return m;}
/* ---- waterfalls (Oct 23): the falling sheet and the foam pool are a separate mesh with a moving-water shader (streaks run down the
   sheet, foam rings spread across the pool); the rocks they fall over are in the hole's structures. courseFeel2 fills h._wfs. ---- */
const R3_WF_VS=`attribute vec2 wuv;attribute float wk;varying vec2 vU;varying float vK;void main(){vU=wuv;vK=wk;gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}`;
const R3_WF_FS=`uniform float t;varying vec2 vU;varying float vK;
float wh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float wn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(wh(i),wh(i+vec2(1.,0.)),f.x),mix(wh(i+vec2(0.,1.)),wh(i+vec2(1.,1.)),f.x),f.y);}
void main(){if(vK<.9){float a=vU.x,s=vU.y,sp=1.6+vK*1.4;
    float f1=wn(vec2(a*9.+vK*7.,s*4.-t*sp*1.9)),f2=wn(vec2(a*21.+3.,s*10.-t*sp*3.)),st=smoothstep(.38,.92,f1*.62+f2*.38);
    vec3 c=mix(vec3(.36,.52,.6),vec3(.95,.97,1.),clamp(.2+st*.8+s*s*.55,0.,1.));
    float edge=smoothstep(0.,.2,a)*smoothstep(1.,.8,a)*(.75+.25*wn(vec2(a*5.,s*3.-t*2.)));
    gl_FragColor=vec4(c,clamp((.55+.35*st+.25*s)*edge*smoothstep(0.,.05,s)*(1.-vK*.4),0.,1.));}
  else{float r=vU.x,an=vU.y,ring=.5+.5*sin(r*24.-t*6.5),fz=wn(vec2(an*7.,r*5.-t*1.4));
    float foam=pow(max(0.,1.-r),1.4)*(.5+.5*fz)*(.65+.35*ring);gl_FragColor=vec4(vec3(.93,.96,.98),clamp(foam,0.,.95));}}`;
/* lettered signs on landmark buildings (Mystic Lake's hotel tower): plain white capitals on a dark panel, a canvas texture on a plane
   just off the wall; the building itself is in the hole's structures, courseFeel2 fills h._signs */
function r3Signs(h){for(const m of R3.signMeshes||[]){R3.scene.remove(m);m.geometry.dispose();}R3.signMeshes=[];const L=h._signs;if(!L||!L.length)return;const T=THREE;R3.signTex=R3.signTex||{};
  for(const sg of L){const ch=Math.round(1024*(sg.hgt||sg.w*170/1024)/sg.w),key=sg.text+'|'+(sg.bg||'')+'|'+(sg.fg||'')+'|'+ch;let tx=R3.signTex[key];if(!tx){const c=document.createElement('canvas');c.width=1024;c.height=ch;const g=c.getContext('2d');g.fillStyle=sg.bg||'#1d2a36';g.fillRect(0,0,1024,ch);
      const FN=sg.font||'800 %px "Helvetica Neue",Arial,sans-serif',fnt=n=>FN.replace('%',n);g.fillStyle=sg.fg||'#ffffff';g.textAlign='center';g.textBaseline='middle';let fs=Math.round(ch*.72);g.font=fnt(fs);while(g.measureText(sg.text).width>940&&fs>40){fs-=4;g.font=fnt(fs);}
      g.fillText(sg.text,512,ch*.53);tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=Math.min(8,R3.renderer.capabilities.getMaxAnisotropy());R3.signTex[key]=tx;}
    R3.signMats=R3.signMats||{};const mat=R3.signMats[key]||(R3.signMats[key]=new T.MeshBasicMaterial({map:tx,toneMapped:true}));
    const m=new T.Mesh(new T.PlaneGeometry(sg.w,sg.hgt||sg.w*170/1024),mat);m.position.set(sg.x,sg.y,sg.z);m.rotation.y=Math.atan2(sg.nx,sg.nz);R3.scene.add(m);R3.signMeshes.push(m);}}
function r3Waterfalls(h){r3Dispose(R3.wfMesh);R3.wfMesh=null;const L=h._wfs;R3.wfN=(L?L.length:0)+100*((h._signs||[]).length);try{r3Signs(h);}catch(e){console.warn('sign',e);}if(!L||!L.length)return;const T=THREE,P=[],U=[],K=[],I=[];
  const vtx=(p,u,k)=>{P.push(p[0],p[1],p[2]);U.push(u[0],u[1]);K.push(k);return P.length/3-1;};
  for(const w of L){const{x,z,ux,uz,top,bot}=w,S=w.S||1,px=-uz,pz=ux;
    // two layers of the falling sheet: it leaves the lip, arcs out and drops into the pool
    for(const k of[0,.4]){const SN=14,AN=6,o=k?.12:0,base=P.length/3;
      for(let i=0;i<=SN;i++){const sv=i/SN,v=(-.35+2.15*Math.pow(sv,.8))*S+o,y=top-(top-bot)*Math.pow(sv,1.5),fw=(1.05+.45*sv)*(k?.82:1)*S;
        for(let j=0;j<=AN;j++){const a=j/AN,u=(a-.5)*2*fw;vtx([x+px*u+ux*v,y+(k?.04:0),z+pz*u+uz*v],[a,sv],k);}}
      for(let i=0;i<SN;i++)for(let j=0;j<AN;j++){const q=base+i*(AN+1)+j;I.push(q,q+1,q+AN+2,q,q+AN+2,q+AN+1);}}
    // the foam pool where it lands
    {const cx=x+ux*1.9*S,cz=z+uz*1.9*S,RN=6,AN=20,base=P.length/3;
      for(let i=0;i<=RN;i++){const r=i/RN,rr=(.25+2.6*r)*S;for(let j=0;j<=AN;j++){const an=j/AN*TAU;vtx([cx+Math.cos(an)*rr*1.1,bot+.05,cz+Math.sin(an)*rr*.9],[r,j/AN],1);}}
      for(let i=0;i<RN;i++)for(let j=0;j<AN;j++){const q=base+i*(AN+1)+j;I.push(q,q+1,q+AN+2,q,q+AN+2,q+AN+1);}}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setAttribute('wuv',new T.Float32BufferAttribute(U,2));geo.setAttribute('wk',new T.Float32BufferAttribute(K,1));geo.setIndex(I);geo.computeBoundingSphere();
  if(!R3.wfMat)R3.wfMat=new T.ShaderMaterial({uniforms:{t:{value:0}},vertexShader:R3_WF_VS,fragmentShader:R3_WF_FS,transparent:true,depthWrite:false,side:T.DoubleSide});
  const m=new T.Mesh(geo,R3.wfMat);m.renderOrder=7;m.frustumCulled=true;R3.scene.add(m);R3.wfMesh=m;}
function r3SetHole(h,canvas){const T=THREE,GU=R3.GU;
  GU.bkOn.value=0;if(typeof B10BAKE!=='undefined'&&B10BAKE.courses)for(const c in B10BAKE.courses)for(const k in B10BAKE.courses[c].holes||{}){const o=B10BAKE.courses[c].holes[k];if(o.tex&&o!==b10K()){o.tex.dispose();o.tex=null;o.ok=0;}}   // one hole's map on the GPU at a time
  if(b10Hole()){const K=b10K(),hi=G.hi;GU.bkB.value.set(K.b[0],K.b[1],K.b[2],K.b[3]);GU.bkK.value.set(B10BAKE.k[0],B10BAKE.k[1]);
    const on=()=>{if(b10K()===K&&G.hi===hi){GU.bkT.value=K.tex;GU.bkOn.value=1;}};
    if(!K.tex){K.tex=new T.TextureLoader().load(K.png,()=>{K.ok=1;on();});K.tex.flipY=false;K.tex.colorSpace=T.NoColorSpace;K.tex.anisotropy=4;}else if(K.ok)on();}
  if(GU.gTex.value)GU.gTex.value.dispose();GU.gTex.value=r3CanvasTex(canvas);
  const b=h.bounds;GU.gB.value.set(b[0],b[1],b[2]-b[0],b[3]-b[1]);
  // the mowing frame buildTerrain paints its stripes in (canvas rotated by h.axis, a compass angle, so fairway stripes run across the hole; the green's 4-yd stripes 0.6 rad round from that)
  {const a=h.axis||0,st=(typeof turfOf==='function'?turfOf().st:null)||[11,1,0,1],g=h.green;GU.rlS.value.set(Math.cos(a),Math.sin(a),st[0]||11,st[1]>0?1:0);
   if(g&&Number.isFinite(g.x)&&st[3]>0)GU.rlG.value.set(g.x,g.y,Math.cos(a+.6),Math.sin(a+.6));else GU.rlG.value.set(0,0,0,0);}
  if(typeof turfOf==='function'){const k=turfOf().k;R3.tK.value.set(k[0],k[1],k[2],k[3]);}
  // surface weights
  { const L=h.lg,d=new Uint8Array(L.nx*L.ny*4),CV=(()=>{try{return groundCover(h);}catch(e){return null;}})();   // r short grass, g rough, b fescue, none = sand; alpha marks the putting surface
    for(let k=0;k<L.code.length;k++){const v=L.code[k],o=k*4;d[o]=(v>=2&&v<=4||v===6)?255:v===7?150:0;d[o+1]=v===1?255:v===7?105:0;d[o+2]=v===0&&CUR.scen!=='desert'?255:0;d[o+3]=v===4?255:0;if(v===5||(CV&&CV[k])){d[o]=0;d[o+1]=0;d[o+2]=0;}}
    if(GU.gSurf.value)GU.gSurf.value.dispose();GU.gSurf.value=r3DataTex(d,L.nx,L.ny);GU.gSB.value.set(L.x0,L.y0,L.nx,L.ny); }
  // terrain from the height grid (full resolution on the phone's GPU is fine with 32-bit indices)
  r3Dispose(R3.terrain);
  { const g=h.hg;let k=1;while(Math.ceil(g.nx/k)*Math.ceil(g.ny/k)>140000)k++;
    const nx=Math.floor((g.nx-1)/k)+1,ny=Math.floor((g.ny-1)/k)+1,st=g.st*k,pos=new Float32Array(nx*ny*3),nor=new Float32Array(nx*ny*3);
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=g.x0+i*st,y=g.y0+j*st,Hh=g.data[(j*k)*g.nx+i*k];const hx=hAtH(h,x+1,y)-hAtH(h,x-1,y),hy=hAtH(h,x,y+1)-hAtH(h,x,y-1);
      const o=(j*nx+i)*3;pos[o]=x;pos[o+1]=Hh;pos[o+2]=y;const l=Math.hypot(hx/2,1,hy/2);nor[o]=-hx/2/l;nor[o+1]=1/l;nor[o+2]=-hy/2/l;}
    const id=new Uint32Array((nx-1)*(ny-1)*6);let q=0;for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,bb=a+1,c=a+nx,d=c+1;id[q++]=a;id[q++]=c;id[q++]=bb;id[q++]=bb;id[q++]=c;id[q++]=d;}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('normal',new T.BufferAttribute(nor,3));geo.setIndex(new T.BufferAttribute(id,1));geo.computeBoundingSphere();
    R3.terrain=r3Add(geo,R3.mat.ground,{recv:true});
    const hd=new Float32Array(nx*ny);for(let q2=0;q2<nx*ny;q2++)hd[q2]=pos[q2*3+1];
    if(R3.hT)R3.hT.dispose();R3.hT=new T.DataTexture(hd,nx,ny,T.RedFormat,T.FloatType);R3.hT.minFilter=R3.hT.magFilter=T.NearestFilter;R3.hT.needsUpdate=true;
    R3.GRU.hT.value=R3.hT;R3.GRU.hB.value.set(g.x0,g.y0,st,nx);R3.GRU.hN.value=ny; }
  r3Surround(h);
  // green slope map
  buildSlopeTex(h);
  r3Water(h);try{r3Waterfalls(h);R3.wfFor=h;}catch(e){console.warn('wf',e);}r3FlagSet(CUR&&CUR.id);r3Warm();if(!R3.warmQ&&!R3.warmDone)setTimeout(r3WarmStart,400);}
function r3Warm(){try{const vis=[];R3.scene.traverse(o=>{if(!o.visible&&(o.isMesh||o.isSkinnedMesh)){vis.push(o);o.visible=true;}});
  if(R3G.lods)for(const l of R3G.lods)l.geo.instanceCount=Math.max(1,l.geo.instanceCount);
  R3.renderer.compile(R3.scene,R3.cam);
  if(R3.water){const rd=R3.renderer,wv=R3.water.visible;R3.water.visible=false;rd.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,1,0),0)];rd.compile(R3.scene,R3.cam);rd.clippingPlanes=[];R3.water.visible=wv;}
  R3.scene.traverse(o=>{const m=o.material;if(!m)return;for(const k of['map','normalMap'])if(m[k]&&m[k].image&&!m[k].__up){m[k].__up=1;try{R3.renderer.initTexture(m[k]);}catch(e){}}});
  for(const o of vis)o.visible=false;}catch(e){console.warn('[warm]',e);}}
/* ===================== course flags (v88) =====================
   Each course flies its own original flag: colours and a simple emblem drawn from the place (pines in the north woods,
   a heron in the lowcountry, a stone cairn at StoneRidge...). None copies a club's real logo, and there is no lettering.
   The flag is a small cloth that streams downwind and ripples harder in a stronger wind. */
const R3_FLAGS={
  troy:{bg:'#1f4e3d',fg:'#f3e9cf',ac:'#d9a441',m:'stream'},      stoneridge:{bg:'#56626c',fg:'#f2f2ee',ac:'#c8b273',m:'cairn'},
  caledonia:{bg:'#2e5233',fg:'#f4f1e6',ac:'#a7b59a',m:'oak'},     trueblue:{bg:'#1d4f9c',fg:'#ffffff',ac:'#f2c14e',m:'heron'},
  heritage:{bg:'#6d1f2b',fg:'#f6ead5',ac:'#d8b45a',m:'magnolia'}, pawplant:{bg:'#0f6e6e',fg:'#ffffff',ac:'#e7d39a',m:'palmetto'},
  rossbridge:{bg:'#33415c',fg:'#e9e4d8',ac:'#b98b4e',m:'bridge'}, legislator:{bg:'#7a1f1f',fg:'#f5ecd9',ac:'#d6b25e',m:'column'},
  judge:{bg:'#1f2f4f',fg:'#f5ecd9',ac:'#d6b25e',m:'scales'},      senator:{bg:'#2f4a2f',fg:'#f5ecd9',ac:'#d6b25e',m:'dome'},
  sandvalley:{bg:'#d6b071',fg:'#5a3b1e',ac:'#fff4dc',m:'dunes'},  mammoth:{bg:'#4a3726',fg:'#f1e3c4',ac:'#c9a46a',m:'tusks'},
  lido:{bg:'#0e3b5c',fg:'#f7f1e3',ac:'#7fb3d5',m:'shell'},        sedge:{bg:'#6f7d33',fg:'#f7f3e0',ac:'#3e4a1c',m:'sedge'},
  wilderness:{bg:'#203b2b',fg:'#e8efe6',ac:'#9fc3b0',m:'compass'},quarry:{bg:'#3b3b3b',fg:'#e6e2da',ac:'#c0632c',m:'rock'},
  legend:{bg:'#14324a',fg:'#eef3f6',ac:'#7ea6c2',m:'peaks'},      crsc:{bg:'#8a4b2a',fg:'#f6e7d0',ac:'#e0a35b',m:'canyon'},
  crls:{bg:'#355e3b',fg:'#f2eedb',ac:'#b7c48c',m:'loblolly'},     deacon:{bg:'#4b2e1e',fg:'#f2e2c4',ac:'#c98a3a',m:'lodge'},
  lehman:{bg:'#1e5a7a',fg:'#f2f5f0',ac:'#e0b04a',m:'fish'},       maddens:{bg:'#7d2a1d',fg:'#f5ead6',ac:'#e2b261',m:'paddles'},
  pines:{bg:'#1d3d2a',fg:'#e9f0e4',ac:'#9cbf8d',m:'pines3'},      preserve:{bg:'#2c4a5a',fg:'#f4f4ef',ac:'#9fb8a8',m:'loon'},
  orangeburg:{bg:'#7a2233',fg:'#fbeff0',ac:'#5f8f4e',m:'rose'},  santee:{bg:'#20453f',fg:'#eef2e6',ac:'#8fb8a8',m:'cypress'},  wyboo:{bg:'#14466b',fg:'#f6f3e8',ac:'#e3b24a',m:'heron'},
  valley:{bg:'#5a2e1f',fg:'#f3e6cf',ac:'#e08a3c',m:'furnace'},
  ridge:{bg:'#2d3b2a',fg:'#eef0e4',ac:'#c9a24a',m:'ridge'},
  gnlinks:{bg:'#1f3d5c',fg:'#f2efe6',ac:'#c8a24a',m:'heron'},  gnlake:{bg:'#1f5a6a',fg:'#eef4f2',ac:'#e0b04a',m:'heron'},  lookout:{bg:'#8a3b24',fg:'#f6ead8',ac:'#3f6a3c',m:'saguaro'},  wigwam:{bg:'#b5862c',fg:'#fdf6e6',ac:'#2f5a3a',m:'sun'},  dove:{bg:'#4d5d73',fg:'#f3eee4',ac:'#d9a25c',m:'dove'},
  interlachen:{bg:'#1d3b2f',fg:'#f4efe0',ac:'#c9a24a',m:'lilypad'},  windsong:{bg:'#6b4a2b',fg:'#f6eedc',ac:'#7f9a52',m:'windmill'},  hazeltine:{bg:'#14365a',fg:'#f3f1e8',ac:'#b8963e',m:'bridge'},
  slmh:{bg:'#3c4a5c',fg:'#eef1f4',ac:'#b9c3cc',m:'heartlake'},  slbm:{bg:'#2f4a3a',fg:'#eef2ea',ac:'#a9b6be',m:'silverlakes'},
  mystic:{bg:'#2c3e63',fg:'#f2efe4',ac:'#d9a441',m:'meadow'},  legends:{bg:'#20402e',fg:'#f3eedc',ac:'#c9a24a',m:'laurel'},  chaska:{bg:'#7a2e2a',fg:'#f6eee0',ac:'#6f8f5a',m:'townhall'},
  prestwick:{bg:'#2b3a6b',fg:'#f3efe4',ac:'#3f7a4a',m:'thistle'},
  royal:{bg:'#3b2160',fg:'#f6efdc',ac:'#d4a83a',m:'crown'},
  farmlinks:{bg:'#2f4a2a',fg:'#f4eee0',ac:'#b03a2e',m:'barn'},
  desertcanyon:{bg:'#9a4a2c',fg:'#f7ecd9',ac:'#4f6b3e',m:'canyon'},
  jewel:{bg:'#2b2f6b',fg:'#f4f1e6',ac:'#3fa58f',m:'gem'},  ridges:{bg:'#5b3a24',fg:'#f3ecdc',ac:'#7fa36a',m:'ridge'},  edinburgh:{bg:'#1f3357',fg:'#f2efe6',ac:'#b8323a',m:'castle'},  willingers:{bg:'#3a5a3c',fg:'#f1eedf',ac:'#a8743a',m:'cattail'},  northfork:{bg:'#1d5560',fg:'#f2f0e4',ac:'#d7b24a',m:'fork'},
  jacks:{bg:'#2c4a2e',fg:'#f2eee2',ac:'#c8342c',m:'pines3'},
  dacotah:{bg:'#6b4a2b',fg:'#f3ead8',ac:'#c9a24a',m:'ridge'},
  baker:{bg:'#8e2a22',fg:'#f4efe6',ac:'#2f5a3a',m:'barn'},
  kingsnorth:{bg:'#1f3d2b',fg:'#f2ead6',ac:'#c8102e',m:'crown'},
  lawsonia:{bg:'#3b4a2a',fg:'#efe8d4',ac:'#b5873a',m:'meadow'},
  sentryworld:{bg:'#14335c',fg:'#f4f1e8',ac:'#d6262f',m:'rose'},
  rushcreek:{bg:'#1f3a5f',fg:'#f2efe6',ac:'#6b2d5c',m:'thistle'}};
function r3FlagStyle(id){return R3_FLAGS[id]||{bg:'#ff6a48',fg:'#ffffff',ac:'#ffd23c',m:''};}
// emblems, drawn in a box about 100 units across centred on the origin
const R3_EMB={
// Minnesota five: gem (The Jewel), castle (Edinburgh USA), cattail (Willinger's), fork (Links at Northfork); Ridges at Sand Creek uses ridge
gem(g,c){g.fillStyle=c.fg;g.beginPath();g.moveTo(-34,-12);g.lineTo(-20,-30);g.lineTo(20,-30);g.lineTo(34,-12);g.lineTo(0,36);g.closePath();g.fill();
  g.strokeStyle=c.bg;g.lineWidth=2.6;g.lineJoin='round';g.beginPath();g.moveTo(-34,-12);g.lineTo(34,-12);g.moveTo(-20,-30);g.lineTo(-10,-12);g.lineTo(0,-30);g.lineTo(10,-12);g.lineTo(20,-30);
  g.moveTo(-10,-12);g.lineTo(0,36);g.lineTo(10,-12);g.moveTo(-34,-12);g.lineTo(0,36);g.lineTo(34,-12);g.stroke();
  g.fillStyle=c.ac;g.beginPath();g.moveTo(-20,-30);g.lineTo(-10,-12);g.lineTo(0,-30);g.closePath();g.fill();g.beginPath();g.moveTo(0,-30);g.lineTo(10,-12);g.lineTo(20,-30);g.closePath();g.fill();},
castle(g,c){g.fillStyle=c.fg;g.fillRect(-36,-6,72,40);
  for(const x of[-36,-24,-12,0,12,24])g.fillRect(x,-14,8,10);
  g.fillRect(-46,-26,18,60);g.fillRect(28,-26,18,60);for(const x of[-46,-39,-32,28,35,42])g.fillRect(x,-33,4,8);
  g.fillStyle=c.bg;g.beginPath();g.moveTo(-9,34);g.lineTo(-9,14);g.arc(0,14,9,Math.PI,0);g.lineTo(9,34);g.fill();
  g.fillRect(-39,-14,5,9);g.fillRect(35,-14,5,9);
  g.strokeStyle=c.ac;g.lineWidth=3;g.beginPath();g.moveTo(0,-6);g.lineTo(0,-40);g.stroke();g.fillStyle=c.ac;g.beginPath();g.moveTo(0,-40);g.lineTo(16,-34);g.lineTo(0,-28);g.fill();},
cattail(g,c){g.strokeStyle=c.fg;g.lineCap='round';g.lineWidth=3;
  for(const[x,h,a]of[[-16,-30,-.12],[0,-40,0],[16,-26,.14]]){g.beginPath();g.moveTo(x*.4,36);g.quadraticCurveTo(x,10,x+a*40,h);g.stroke();}
  g.fillStyle=c.ac;for(const[x,h,a]of[[-16,-30,-.12],[0,-40,0],[16,-26,.14]]){g.save();g.translate(x+a*34,h+10);g.rotate(a);g.beginPath();g.ellipse(0,0,4.6,11,0,0,Math.PI*2);g.fill();g.restore();}
  g.strokeStyle=c.fg;g.lineWidth=2.4;for(const s of[-1,1]){g.beginPath();g.moveTo(0,36);g.quadraticCurveTo(s*18,16,s*34,4);g.stroke();}
  g.strokeStyle=c.ac;g.lineWidth=3;g.beginPath();for(let x=-40;x<=40;x+=2)g.lineTo(x,40+Math.sin(x*.3)*2);g.stroke();},
fork(g,c){g.strokeStyle=c.fg;g.lineCap='round';g.lineJoin='round';g.lineWidth=11;
  g.beginPath();g.moveTo(0,40);g.quadraticCurveTo(0,10,-6,0);g.quadraticCurveTo(-18,-20,-38,-34);g.stroke();
  g.beginPath();g.moveTo(-6,0);g.quadraticCurveTo(14,-14,34,-36);g.stroke();
  g.strokeStyle=c.ac;g.lineWidth=3;g.beginPath();g.moveTo(0,40);g.quadraticCurveTo(0,10,-6,0);g.quadraticCurveTo(-18,-20,-38,-34);g.moveTo(-6,0);g.quadraticCurveTo(14,-14,34,-36);g.stroke();
  g.fillStyle=c.ac;g.beginPath();g.moveTo(26,10);g.lineTo(26,34);g.stroke();g.beginPath();g.moveTo(26,10);g.lineTo(40,15);g.lineTo(26,20);g.fill();},
// (no new emblems: Desert Canyon uses canyon)
barn(g,c){g.fillStyle=c.ac;g.beginPath();g.moveTo(-26,24);g.lineTo(-26,-2);g.lineTo(-14,-16);g.lineTo(2,-16);g.lineTo(14,-2);g.lineTo(14,24);g.closePath();g.fill();
    g.fillStyle=c.fg;g.fillRect(-10,6,12,18);g.strokeStyle=c.ac;g.lineWidth=2;g.beginPath();g.moveTo(-10,6);g.lineTo(2,24);g.moveTo(2,6);g.lineTo(-10,24);g.stroke();
    g.fillStyle=c.fg;g.fillRect(-7,-9,6,6);g.fillStyle=c.fg;g.fillRect(17,-10,11,34);g.beginPath();g.arc(22.5,-10,5.5,Math.PI,0);g.fill();
    g.strokeStyle=c.bg;g.lineWidth=1.2;for(const y of[-2,6,14])g.beginPath(),g.moveTo(17,y),g.lineTo(28,y),g.stroke();},
crown(g,c){g.fillStyle=c.ac;g.beginPath();g.moveTo(-26,22);g.lineTo(-30,-14);g.lineTo(-14,4);g.lineTo(0,-24);g.lineTo(14,4);g.lineTo(30,-14);g.lineTo(26,22);g.closePath();g.fill();
    g.fillStyle=c.fg;g.fillRect(-26,16,52,9);for(const[x,y]of[[-30,-16],[0,-27],[30,-16]]){g.beginPath();g.arc(x,y,5,0,Math.PI*2);g.fill();}
    g.fillStyle=c.bg;for(const x of[-14,0,14]){g.beginPath();g.arc(x,9,3.2,0,Math.PI*2);g.fill();}},
thistle(g,c){g.strokeStyle=c.ac;g.lineWidth=3.5;g.lineCap='round';g.beginPath();g.moveTo(0,40);g.lineTo(0,2);g.moveTo(0,26);g.quadraticCurveTo(-18,22,-24,10);g.moveTo(0,20);g.quadraticCurveTo(18,16,24,4);g.stroke();
    g.fillStyle=c.ac;g.beginPath();g.ellipse(0,-2,11,9,0,0,Math.PI*2);g.fill();
    g.fillStyle=c.fg;g.beginPath();g.moveTo(-12,-6);for(let k=0;k<=8;k++){const x=-12+k*3,y=-14-((k%2)?14:6);g.lineTo(x,y);}g.lineTo(12,-6);g.closePath();g.fill();},
meadow(g,c){g.fillStyle=c.ac;g.beginPath();g.arc(16,-18,11,0,Math.PI*2);g.fill();
    g.strokeStyle=c.fg;g.lineWidth=3;g.lineCap='round';g.beginPath();for(const x of[-28,-18,-8,2,12,22,30]){const h=18+((x*7)%9+9)%9;g.moveTo(x,36);g.quadraticCurveTo(x-4,36-h/2,x+(x%2?5:-5),36-h);}g.stroke();
    g.beginPath();g.moveTo(-36,38);g.lineTo(36,38);g.stroke();},
  laurel(g,c){g.strokeStyle=c.fg;g.lineWidth=3;g.lineCap='round';g.fillStyle=c.fg;
    for(const s of[-1,1]){g.beginPath();g.arc(0,4,28,s<0?Math.PI*.55:Math.PI*.45,s<0?Math.PI*1.3:-Math.PI*.3,s>0);g.stroke();
      for(let k=0;k<6;k++){const a=Math.PI/2+s*(0.35+k*0.32),x=Math.cos(a)*28,y=4+Math.sin(a)*28;g.save();g.translate(x,y);g.rotate(a+s*0.9);g.beginPath();g.ellipse(0,0,8,3.5,0,0,Math.PI*2);g.fill();g.restore();}}
    g.fillStyle=c.ac;g.beginPath();g.arc(0,2,9,0,Math.PI*2);g.fill();},
  townhall(g,c){g.fillStyle=c.fg;g.fillRect(-26,6,52,30);g.beginPath();g.moveTo(-30,8);g.lineTo(0,-10);g.lineTo(30,8);g.closePath();g.fill();
    g.fillRect(-6,-34,12,26);g.beginPath();g.moveTo(-8,-32);g.lineTo(0,-46);g.lineTo(8,-32);g.closePath();g.fill();
    g.fillStyle=c.bg;for(const x of[-17,-3,11])g.fillRect(x,16,7,10);g.fillStyle=c.ac;g.beginPath();g.arc(0,-20,3.5,0,Math.PI*2);g.fill();},
heartlake(g,c){g.fillStyle=c.fg;g.beginPath();g.moveTo(0,22);g.bezierCurveTo(-34,-2,-24,-34,0,-16);g.bezierCurveTo(24,-34,34,-2,0,22);g.closePath();g.fill();
    g.strokeStyle=c.bg;g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(-2,-14);g.lineTo(4,-2);g.lineTo(-4,6);g.lineTo(2,18);g.stroke();
    g.strokeStyle=c.ac;g.lineWidth=3.5;g.beginPath();for(const y of[32,41]){g.moveTo(-32,y);g.quadraticCurveTo(-22,y-6,-12,y);g.quadraticCurveTo(-2,y+6,8,y);g.quadraticCurveTo(18,y-6,30,y);}g.stroke();},
  silverlakes(g,c){g.fillStyle=c.ac;g.beginPath();g.moveTo(-38,14);g.lineTo(-14,-22);g.lineTo(0,-6);g.lineTo(14,-28);g.lineTo(38,14);g.closePath();g.fill();
    g.fillStyle=c.fg;g.beginPath();g.moveTo(14,-28);g.lineTo(22,-16);g.lineTo(16,-18);g.lineTo(10,-12);g.lineTo(8,-19);g.closePath();g.fill();
    g.strokeStyle=c.fg;g.lineWidth=3.5;g.lineCap='round';g.beginPath();for(const y of[24,34]){g.moveTo(-34,y);g.quadraticCurveTo(-24,y-6,-14,y);g.quadraticCurveTo(-4,y+6,6,y);g.quadraticCurveTo(16,y-6,32,y);}g.stroke();},
lilypad(g,c){g.fillStyle=c.fg;g.beginPath();g.moveTo(0,4);g.arc(0,4,30,-1.25,-1.9+2*Math.PI,false);g.closePath();g.fill();
    g.strokeStyle=c.bg;g.lineWidth=2;g.beginPath();for(const a of[-.4,.5,1.4,2.3,3.2]){g.moveTo(0,4);g.lineTo(Math.cos(a)*24,4+Math.sin(a)*24);}g.stroke();
    g.fillStyle=c.ac;g.beginPath();g.arc(14,-26,7,0,Math.PI*2);g.fill();g.fillStyle=c.fg;g.beginPath();g.arc(14,-26,3,0,Math.PI*2);g.fill();},
  windmill(g,c){g.fillStyle=c.fg;g.beginPath();g.moveTo(-9,40);g.lineTo(-4,-8);g.lineTo(4,-8);g.lineTo(9,40);g.closePath();g.fill();
    g.save();g.translate(0,-12);for(let k=0;k<4;k++){g.rotate(Math.PI/2);g.beginPath();g.moveTo(2,-3);g.lineTo(34,-9);g.lineTo(34,3);g.lineTo(2,3);g.closePath();g.fill();}g.restore();
    g.fillStyle=c.ac;g.beginPath();g.arc(0,-12,4.5,0,Math.PI*2);g.fill();
    g.strokeStyle=c.ac;g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(-34,40);g.quadraticCurveTo(-20,32,-6,40);g.moveTo(6,40);g.quadraticCurveTo(20,32,34,40);g.stroke();},
saguaro(g,c){g.fillStyle=c.fg;const col=(x,y,w,h)=>{g.beginPath();g.moveTo(x-w,y+h);g.lineTo(x-w,y+w);g.arc(x,y+w,w,Math.PI,0);g.lineTo(x+w,y+h);g.closePath();g.fill();};
    col(0,-40,8,78);g.fillRect(-26,0,26,10);col(-22,-22,7,30);g.fillRect(0,-8,24,10);col(20,-30,7,30);
    g.strokeStyle=c.ac;g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(-36,40);g.lineTo(36,40);g.stroke();},
  sun(g,c){g.fillStyle=c.fg;g.beginPath();g.arc(0,-4,16,0,Math.PI*2);g.fill();g.strokeStyle=c.fg;g.lineWidth=4;g.lineCap='round';
    for(let k=0;k<12;k++){const a=k*Math.PI/6;g.beginPath();g.moveTo(Math.cos(a)*22,-4+Math.sin(a)*22);g.lineTo(Math.cos(a)*(k%2?30:34),-4+Math.sin(a)*(k%2?30:34));g.stroke();}
    g.strokeStyle=c.ac;g.lineWidth=3.5;g.beginPath();g.moveTo(-38,38);g.lineTo(-14,22);g.lineTo(0,32);g.lineTo(18,16);g.lineTo(38,38);g.stroke();},
  dove(g,c){g.fillStyle=c.fg;g.beginPath();g.ellipse(-2,6,22,11,-.2,0,Math.PI*2);g.fill();g.beginPath();g.arc(18,-6,8,0,Math.PI*2);g.fill();
    g.beginPath();g.moveTo(25,-6);g.lineTo(34,-3);g.lineTo(25,-1);g.fill();
    g.beginPath();g.moveTo(-8,0);g.quadraticCurveTo(-10,-34,10,-38);g.quadraticCurveTo(4,-14,8,2);g.closePath();g.fill();
    g.beginPath();g.moveTo(-22,8);g.lineTo(-40,0);g.lineTo(-38,16);g.closePath();g.fill();
    g.fillStyle=c.bg;g.beginPath();g.arc(20,-8,1.8,0,Math.PI*2);g.fill();
    g.strokeStyle=c.ac;g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(-30,36);g.quadraticCurveTo(0,26,30,36);g.stroke();},
furnace(g,c){g.fillStyle=c.fg;g.beginPath();g.moveTo(-26,36);g.lineTo(-16,-8);g.lineTo(16,-8);g.lineTo(26,36);g.closePath();g.fill();
    g.fillRect(-9,-30,18,24);g.fillStyle=c.bg;g.beginPath();g.arc(0,28,9,Math.PI,0);g.lineTo(9,36);g.lineTo(-9,36);g.closePath();g.fill();
    g.fillStyle=c.ac;g.beginPath();g.arc(0,30,5,0,Math.PI*2);g.fill();
    g.strokeStyle=c.ac;g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(2,-34);g.bezierCurveTo(14,-42,0,-48,12,-56);g.stroke();},
  ridge(g,c){g.fillStyle=c.ac;g.beginPath();g.moveTo(-44,30);g.lineTo(-18,-18);g.lineTo(-4,4);g.lineTo(14,-30);g.lineTo(44,30);g.closePath();g.fill();
    g.fillStyle=c.fg;g.beginPath();g.moveTo(14,-30);g.lineTo(22,-14);g.lineTo(10,-10);g.lineTo(4,-12);g.closePath();g.fill();
    g.strokeStyle=c.fg;g.lineWidth=3;g.beginPath();g.moveTo(14,-30);g.lineTo(14,-48);g.stroke();g.fillStyle=c.fg;g.beginPath();g.moveTo(14,-48);g.lineTo(28,-43);g.lineTo(14,-38);g.closePath();g.fill();},
rose(g,c){g.strokeStyle=c.ac;g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(0,14);g.quadraticCurveTo(4,28,0,40);g.stroke();
    g.fillStyle=c.ac;for(const s of[-1,1]){g.beginPath();g.ellipse(9*s,28,10,5,s*-.5,0,Math.PI*2);g.fill();}
    g.fillStyle=c.fg;for(let k=0;k<6;k++){g.save();g.translate(0,-8);g.rotate(k*Math.PI/3+.3);g.beginPath();g.ellipse(0,-12,10,14,0,0,Math.PI*2);g.fill();g.restore();}
    g.strokeStyle=c.bg;g.lineWidth=2.6;g.beginPath();for(let a=0;a<12;a+=.25){const r=1.6*a;g.lineTo(Math.cos(a)*r,-8+Math.sin(a)*r);}g.stroke();},
  cypress(g,c){g.fillStyle=c.fg;g.beginPath();g.moveTo(-14,30);g.quadraticCurveTo(-6,22,-5,4);g.lineTo(5,4);g.quadraticCurveTo(6,22,14,30);g.closePath();g.fill();
    g.beginPath();g.moveTo(0,-40);g.quadraticCurveTo(20,-18,18,6);g.quadraticCurveTo(0,12,-18,6);g.quadraticCurveTo(-20,-18,0,-40);g.fill();
    g.strokeStyle=c.ac;g.lineWidth=3.5;g.lineCap='round';for(const[y,w]of[[34,40],[42,28]]){g.beginPath();for(let x=-w;x<=w;x+=2)g.lineTo(x,y+Math.sin(x*.25)*2);g.stroke();}},
  pine(g,c,x=0,y=0,s=1){g.fillStyle=c.fg;g.fillRect(x-3*s,y+24*s,6*s,12*s);for(const[t,w,h]of[[-38,16,22],[-22,24,26],[-4,32,30]]){g.beginPath();g.moveTo(x,y+t*s);g.lineTo(x+w*s,y+(t+h)*s);g.lineTo(x-w*s,y+(t+h)*s);g.closePath();g.fill();}},
  pines3(g,c){R3_EMB.pine(g,{fg:c.ac},-24,8,.72);R3_EMB.pine(g,{fg:c.ac},24,8,.72);R3_EMB.pine(g,c,0,0,1);},
  stream(g,c){g.lineCap='round';g.lineWidth=7;[[-18,c.fg],[0,c.ac],[18,c.fg]].forEach(([y,col])=>{g.strokeStyle=col;g.beginPath();for(let x=-40;x<=40;x+=2)g.lineTo(x,y+Math.sin(x*.11)*7);g.stroke();});},
  cairn(g,c){[[0,30,30,9],[2,13,23,8],[-1,-2,17,7],[1,-15,12,6],[0,-26,7,5]].forEach(([x,y,rx,ry],i)=>{g.fillStyle=i%2?c.ac:c.fg;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();});},
  oak(g,c){g.fillStyle=c.fg;g.beginPath();g.moveTo(-6,38);g.lineTo(-4,4);g.lineTo(4,4);g.lineTo(6,38);g.fill();
    for(const[x,y,r]of[[-24,-6,15],[0,-16,19],[24,-6,15],[-12,6,13],[12,6,13]]){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}
    g.strokeStyle=c.ac;g.lineWidth=2.4;g.lineCap='round';for(const x of[-30,-20,-6,8,20,30]){g.beginPath();g.moveTo(x,12);g.quadraticCurveTo(x+2,20,x-1,27+Math.abs(x)%7);g.stroke();}},
  heron(g,c){g.strokeStyle=c.fg;g.fillStyle=c.fg;g.lineCap='round';g.beginPath();g.ellipse(4,8,20,10,-.35,0,Math.PI*2);g.fill();
    g.lineWidth=6;g.beginPath();g.moveTo(-10,2);g.bezierCurveTo(-26,-6,-4,-20,-14,-32);g.stroke();g.beginPath();g.arc(-14,-33,5,0,Math.PI*2);g.fill();
    g.strokeStyle=c.ac;g.lineWidth=3;g.beginPath();g.moveTo(-18,-33);g.lineTo(-34,-30);g.stroke();g.beginPath();g.moveTo(2,16);g.lineTo(-2,40);g.moveTo(9,16);g.lineTo(10,40);g.stroke();
    g.strokeStyle=c.fg;g.lineWidth=4;g.beginPath();g.moveTo(22,10);g.lineTo(36,18);g.stroke();},
  magnolia(g,c){g.fillStyle=c.fg;for(let k=0;k<5;k++){g.save();g.rotate(k*Math.PI*2/5);g.beginPath();g.ellipse(0,-20,11,20,0,0,Math.PI*2);g.fill();g.restore();}g.fillStyle=c.ac;g.beginPath();g.arc(0,0,9,0,Math.PI*2);g.fill();},
  palmetto(g,c){g.strokeStyle=c.fg;g.lineCap='round';g.lineWidth=7;g.beginPath();g.moveTo(4,40);g.quadraticCurveTo(-4,10,2,-12);g.stroke();g.lineWidth=5;
    for(let k=0;k<9;k++){const a=-Math.PI+.15+k*(Math.PI-.3)/8,ex=2+Math.cos(a)*34,ey=-12+Math.sin(a)*24+(Math.abs(Math.cos(a))*14);g.beginPath();g.moveTo(2,-12);g.quadraticCurveTo(2+Math.cos(a)*20,-12+Math.sin(a)*22,ex,ey);g.stroke();}
    g.fillStyle=c.ac;g.beginPath();g.arc(2,-12,5,0,Math.PI*2);g.fill();},
  bridge(g,c){g.strokeStyle=c.fg;g.lineCap='round';g.lineWidth=6;g.beginPath();g.arc(0,22,38,Math.PI*1.08,Math.PI*1.92);g.stroke();g.fillStyle=c.fg;g.fillRect(-42,4,84,6);
    g.lineWidth=2.4;for(let x=-24;x<=24;x+=12){g.beginPath();g.moveTo(x,4);g.lineTo(x,22-Math.sqrt(Math.max(0,38*38-x*x))+2);g.stroke();}
    g.strokeStyle=c.ac;g.lineWidth=3;for(const y of[24,33]){g.beginPath();for(let x=-34;x<=34;x+=2)g.lineTo(x,y+Math.sin(x*.25)*2);g.stroke();}},
  column(g,c){g.fillStyle=c.fg;g.fillRect(-20,-36,40,7);g.fillRect(-15,-29,30,4);g.fillRect(-12,-25,24,52);g.fillRect(-17,27,34,5);g.fillRect(-22,32,44,6);
    g.fillStyle=c.bg;for(const x of[-6,0,6])g.fillRect(x-1.2,-22,2.4,46);g.fillStyle=c.ac;g.beginPath();g.arc(-17,-32,4,0,Math.PI*2);g.arc(17,-32,4,0,Math.PI*2);g.fill();},
  scales(g,c){g.fillStyle=c.fg;g.fillRect(-3,-30,6,62);g.fillRect(-18,32,36,6);g.fillRect(-34,-26,68,5);g.beginPath();g.arc(0,-33,5,0,Math.PI*2);g.fill();
    g.strokeStyle=c.fg;g.lineWidth=2;for(const sx of[-1,1]){g.beginPath();g.moveTo(sx*31,-22);g.lineTo(sx*21,6);g.moveTo(sx*31,-22);g.lineTo(sx*41,6);g.stroke();
      g.fillStyle=c.ac;g.beginPath();g.moveTo(sx*31-13,6);g.quadraticCurveTo(sx*31,20,sx*31+13,6);g.closePath();g.fill();}},
  dome(g,c){g.fillStyle=c.fg;g.beginPath();g.arc(0,2,26,Math.PI,0);g.fill();g.fillRect(-30,2,60,6);g.fillRect(-34,26,68,7);
    for(let x=-26;x<=26;x+=10.4)g.fillRect(x-2.5,8,5,18);g.fillRect(-4,-34,8,10);g.beginPath();g.arc(0,-24,6,Math.PI,0);g.fill();
    g.fillStyle=c.ac;g.beginPath();g.arc(0,-38,3.5,0,Math.PI*2);g.fill();},
  dunes(g,c){g.fillStyle=c.ac;g.beginPath();g.arc(14,-10,15,0,Math.PI*2);g.fill();g.fillStyle=c.fg;
    g.beginPath();g.moveTo(-46,34);g.quadraticCurveTo(-18,-14,10,34);g.fill();g.globalAlpha=.75;g.beginPath();g.moveTo(-8,34);g.quadraticCurveTo(22,0,46,34);g.fill();g.globalAlpha=1;},
  tusks(g,c){g.fillStyle=c.fg;for(const sx of[-1,1]){g.beginPath();g.moveTo(sx*4,34);g.bezierCurveTo(sx*44,30,sx*46,-12,sx*14,-36);g.bezierCurveTo(sx*30,-10,sx*26,20,sx*4,22);g.closePath();g.fill();}
    g.fillStyle=c.ac;g.beginPath();g.ellipse(0,30,10,7,0,0,Math.PI*2);g.fill();},
  shell(g,c){g.fillStyle=c.fg;g.beginPath();g.moveTo(0,30);g.arc(0,30,44,Math.PI*1.12,Math.PI*1.88);g.closePath();g.fill();
    g.strokeStyle=c.bg;g.lineWidth=3;for(let k=1;k<8;k++){const a=Math.PI*1.12+k*(Math.PI*.76)/8;g.beginPath();g.moveTo(0,30);g.lineTo(Math.cos(a)*42,30+Math.sin(a)*42);g.stroke();}
    g.fillStyle=c.ac;g.fillRect(-9,26,18,9);},
  sedge(g,c){g.strokeStyle=c.fg;g.lineCap='round';g.lineWidth=4;for(let k=-5;k<=5;k++){const a=k*.17;g.beginPath();g.moveTo(k*2,36);g.quadraticCurveTo(k*7,6,Math.sin(a)*44+k*3,-36+Math.abs(k)*4);g.stroke();}
    g.fillStyle=c.ac;for(const[x,y]of[[-6,-30],[9,-24],[-18,-18]]){g.beginPath();g.ellipse(x,y,3,7,0,0,Math.PI*2);g.fill();}},
  compass(g,c){g.strokeStyle=c.ac;g.lineWidth=3;g.beginPath();g.arc(0,0,30,0,Math.PI*2);g.stroke();
    const star=(r1,r2,rot,col)=>{g.fillStyle=col;g.beginPath();for(let k=0;k<8;k++){const r=k%2?r2:r1,a=rot+k*Math.PI/4;g.lineTo(Math.sin(a)*r,-Math.cos(a)*r);}g.closePath();g.fill();};
    star(26,6,Math.PI/4,c.ac);star(40,8,0,c.fg);},
  rock(g,c){const P=[[-30,10],[-18,-24],[10,-30],[32,-6],[26,24],[-6,32]];g.fillStyle=c.fg;g.beginPath();P.forEach(p=>g.lineTo(...p));g.closePath();g.fill();
    g.strokeStyle=c.ac;g.lineWidth=3;g.beginPath();g.moveTo(-18,-24);g.lineTo(-2,-2);g.lineTo(10,-30);g.moveTo(-2,-2);g.lineTo(32,-6);g.moveTo(-2,-2);g.lineTo(-6,32);g.moveTo(-2,-2);g.lineTo(-30,10);g.stroke();},
  peaks(g,c){g.fillStyle=c.ac;g.beginPath();g.moveTo(-44,30);g.lineTo(-14,-20);g.lineTo(14,30);g.fill();g.fillStyle=c.fg;g.beginPath();g.moveTo(-18,30);g.lineTo(14,-32);g.lineTo(46,30);g.fill();
    g.fillStyle=c.bg;g.beginPath();g.moveTo(14,-32);g.lineTo(5,-14);g.lineTo(11,-18);g.lineTo(16,-12);g.lineTo(22,-17);g.closePath();g.fill();},
  canyon(g,c){g.fillStyle=c.ac;g.beginPath();g.arc(0,4,16,0,Math.PI*2);g.fill();g.fillStyle=c.fg;
    g.beginPath();g.moveTo(-46,34);g.lineTo(-46,-14);g.lineTo(-30,-14);g.lineTo(-26,4);g.lineTo(-14,6);g.lineTo(-10,34);g.fill();
    g.beginPath();g.moveTo(46,34);g.lineTo(46,-20);g.lineTo(32,-20);g.lineTo(26,-2);g.lineTo(14,2);g.lineTo(10,34);g.fill();},
  loblolly(g,c){g.fillStyle=c.fg;g.fillRect(-3,-6,6,44);for(const[x,y,rx,ry]of[[-14,-22,16,8],[12,-28,18,8],[-2,-38,14,7],[16,-14,11,6],[-20,-10,10,5]]){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();}
    g.strokeStyle=c.fg;g.lineWidth=3;g.beginPath();g.moveTo(0,-4);g.lineTo(-16,-12);g.moveTo(0,-14);g.lineTo(14,-18);g.stroke();},
  lodge(g,c){g.fillStyle=c.fg;g.fillRect(-28,0,56,32);g.beginPath();g.moveTo(-38,4);g.lineTo(0,-30);g.lineTo(38,4);g.fill();g.fillRect(16,-26,8,18);
    g.fillStyle=c.ac;g.fillRect(-7,12,14,20);g.fillRect(-22,8,9,9);g.fillRect(13,8,9,9);g.fillStyle=c.bg;for(let y=4;y<32;y+=7)g.fillRect(-28,y,56,1.2);g.fillStyle=c.ac;g.fillRect(-7,12,14,20);},
  fish(g,c){g.fillStyle=c.fg;g.beginPath();g.ellipse(-4,0,30,13,0,0,Math.PI*2);g.fill();g.beginPath();g.moveTo(22,0);g.lineTo(42,-16);g.lineTo(38,0);g.lineTo(42,16);g.closePath();g.fill();
    g.beginPath();g.moveTo(-14,-11);g.lineTo(-2,-24);g.lineTo(10,-11);g.fill();g.fillStyle=c.ac;g.beginPath();g.arc(-24,-3,3.4,0,Math.PI*2);g.fill();
    g.strokeStyle=c.ac;g.lineWidth=2;for(const x of[-8,0,8]){g.beginPath();g.moveTo(x,-9);g.lineTo(x+4,8);g.stroke();}},
  paddles(g,c){for(const sx of[-1,1]){g.save();g.rotate(sx*.62);g.fillStyle=c.fg;g.fillRect(-2.6,-40,5.2,58);g.beginPath();g.ellipse(0,26,9,17,0,0,Math.PI*2);g.fill();g.fillStyle=c.ac;g.fillRect(-6,-42,12,6);g.restore();}},
  loon(g,c){g.strokeStyle=c.ac;g.lineWidth=3;for(const y of[22,30]){g.beginPath();for(let x=-40;x<=40;x+=2)g.lineTo(x,y+Math.sin(x*.2+y)*2);g.stroke();}
    g.fillStyle=c.fg;g.beginPath();g.ellipse(4,8,28,11,0,0,Math.PI*2);g.fill();g.beginPath();g.moveTo(-14,4);g.quadraticCurveTo(-22,-10,-16,-16);g.lineTo(-8,-14);g.quadraticCurveTo(-8,-2,-4,2);g.fill();
    g.beginPath();g.arc(-14,-16,7,0,Math.PI*2);g.fill();g.beginPath();g.moveTo(-20,-17);g.lineTo(-34,-13);g.lineTo(-20,-13);g.fill();
    g.fillStyle=c.bg;for(let x=0;x<24;x+=6)for(let y=2;y<12;y+=5){g.fillRect(x,y,2.6,2.6);}}};
function r3FlagCanvas(id){const c=r3FlagStyle(id),cv=document.createElement('canvas');cv.width=256;cv.height=160;const g=cv.getContext('2d');
  g.fillStyle=c.bg;g.fillRect(0,0,256,160);g.strokeStyle=c.ac;g.lineWidth=5;g.strokeRect(9,9,238,142);
  const f=R3_EMB[c.m];if(f){g.save();g.translate(128,80);g.scale(1.25,1.25);g.lineJoin='round';f(g,c);g.restore();}return cv;}
function r3FlagMesh(){if(R3.flag)return R3.flag;const T=THREE,geo=new T.PlaneGeometry(1,1,12,4);geo.translate(.5,0,0);
  const mat=r3Patch(new T.MeshStandardMaterial({side:T.DoubleSide,roughness:.85,metalness:0}),{twoSided:true});
  const m=r3Add(geo,mat,{cast:true});m.frustumCulled=false;m.visible=false;R3.flag=m;R3.flagBase=Float32Array.from(geo.attributes.position.array);return m;}
function r3FlagSet(id){const m=r3FlagMesh();if(R3.flagId===id)return;R3.flagId=id;if(m.material.map)m.material.map.dispose();m.material.map=r3CanvasTex(r3FlagCanvas(id),{srgb:true});m.material.map.flipY=true;   /* canvas rows run top-down */m.material.needsUpdate=true;}
// place and ripple the flag on the flagstick at (px,top,pz); ps scales it up with distance like the stick
function r3FlagPose(px,top,pz,ps){const m=r3FlagMesh();r3FlagSet(CUR&&CUR.id);m.visible=true;
  const w=G.wind||{a:0,mph:0},mph=(w.mph||0)*(1+.22*Math.sin(T*.41)*Math.sin(T*1.7+.6)),calm=clamp(1-mph/4,0,1),sway=Math.sin(T*1.3)*.35*calm+Math.sin(T*.7)*.12;
  const d=dirOf(w.a),base=Math.atan2(d[1],d[0]),a=mph>0?base+sway:Math.sin(T*.9)*.6;
  m.position.set(px,top-.2*ps,pz);m.rotation.set(0,-a,0);m.scale.set(.64*ps,.4*ps,.64*ps);
  const P=m.geometry.attributes.position,B=R3.flagBase,amp=.035+.0075*Math.min(mph,16),fq=6+mph*.35,droop=.18*calm;
  for(let i=0;i<P.count;i++){const u=B[i*3],v=B[i*3+1];P.array[i*3]=u*(1-.08*calm);P.array[i*3+1]=v-droop*u*u;P.array[i*3+2]=amp*Math.sin(u*7.5-T*fq+v*1.4)*Math.pow(u,.8);}
  P.needsUpdate=true;m.geometry.computeVertexNormals();}
/* Background shader warm-up (v81). three.js only finishes compiling a shader the first time it's drawn, so a round's first
   frames (and the first hole with water, whose reflection pass needs clip-plane variants) used to stall for seconds.
   While the menu is up, draw every mesh into a tiny off-screen target a few at a time per frame, plain and with the
   reflection clip plane, then every post-processing pass, so the stalls are spread across idle menu frames instead. */
function r3WarmStart(){if(R3.warmQ||!R3.renderer||!R3.scene)return;const L=[];
  R3.scene.traverse(o=>{if(o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||o.isPoints||o.isLine)L.push(o);});
  const jobs=[];for(const clip of[false,true])for(let i=0;i<L.length;i+=3)jobs.push({clip,objs:L.slice(i,i+3)});
  if(R3.post&&R3.post.m)for(const k in R3.post.m)jobs.push({post:k});
  jobs.push({shadow:true,objs:L});   // the sun's shadow pass has its own depth programs (one per kind of caster): never drawn above
  /* Oct 2026: the quality levels the game may step to mid-round use other shadow settings (soft or hard edges, which trees cast),
     and each needed new shadow programs the moment it switched (a 150-270 ms hitch mid-round): build those here too */
  // (done per hole by r3LvlWarm, once that hole's own trees and objects are in the scene)
  R3.warmQ=jobs;R3.warmN=jobs.length;
  /* small targets in the same formats the game really draws into (half-float colour; the scene's multisampling; plain 8-bit for
     the occlusion and final passes): phone GPUs build a pipeline per program *and* target format, so warming into one generic
     target left part of the work for the first real frames */
  {const T3=THREE,q=r3Q(),ty=R3.hf?T3.HalfFloatType:T3.UnsignedByteType,mk=(o)=>new T3.WebGLRenderTarget(16,16,Object.assign({type:ty,colorSpace:T3.NoColorSpace,depthBuffer:false,stencilBuffer:false},o));
   R3.warmT={scene:mk({depthBuffer:true,samples:q.msaa||0}),clip:mk({depthBuffer:true}),half:mk({}),byte:mk({type:T3.UnsignedByteType})};R3.warmRT=R3.warmT.scene;}
  const step=()=>{if(!R3.warmQ)return;const t0=performance.now(),idle=!G.hole||G.state==='intro'||G.state==='card'||COVERS.some(m=>!m.hidden);while(R3.warmQ.length&&performance.now()-t0<(idle?40:12)){r3WarmJob(R3.warmQ.shift());}
    if(R3.warmQ.length)requestAnimationFrame(step);else r3WarmEnd();};
  requestAnimationFrame(step);}
/* each hole's set-up queues the neighbouring quality levels' shadow programs, built a level per frame while the hole's intro card
   is up (whatever is left goes at Tee off); once built, a level costs only a quick shadow pass */
function r3LvlWarm(){if(!R3.renderer||!R3.scene)return;const base=R3.q==='high'?0:1,cur=R3.perf||0,Q=[];
  for(let l=Math.max(0,cur-1);l<=Math.min(R3_LMAX-base,cur+2);l++)if(l!==cur)Q.push(l);R3.lvlQ=Q;
  const step=()=>{if(!R3.lvlQ||!R3.lvlQ.length)return;if(G.state!=='intro'&&!COVERS.some(m=>!m.hidden)){return;}r3WarmJob({lvl:R3.lvlQ.shift()});if(R3.lvlQ.length)requestAnimationFrame(step);};
  requestAnimationFrame(()=>requestAnimationFrame(step));}   // after the hole's first frame is on screen
function r3WarmEnd(){R3.warmQ=null;R3.warmDone=1;if(R3.warmT)for(const k in R3.warmT)R3.warmT[k].dispose();R3.warmT=null;R3.warmRT=null;}
/* post passes' uniforms are empty until a pass first runs: fill them with stand-ins so the warm-up draw can go through (it used to
   throw on the first vector, after compiling but before the pass was ever drawn) */
const R3_WARM_V3=new Set(['K','sunP','dofP']),R3_WARM_N=new Set(['hdr','aoOn','bloomK','expo','asp','fxaaOn']);
function r3WarmUniforms(m){const T3=THREE;for(const k in m.uniforms){const u=m.uniforms[k];if(u.value!==null&&u.value!==undefined)continue;
  u.value=k==='px'||k==='dir'?new T3.Vector2(1/16,0):R3_WARM_V3.has(k)?new T3.Vector3():R3_WARM_N.has(k)?0:(R3.warmTex||(R3.warmTex=r3DataTex(new Uint8Array(4),1,1)));}}
function r3WarmJob(j){const rd=R3.renderer,prev=rd.getRenderTarget(),pc=rd.clippingPlanes;
  if(j.lvl!==undefined){const P0=R3.perf,ty=rd.shadowMap.type;try{R3.perf=j.lvl;r3LiteShadows();if(R3T.groups)r3TreeLOD(true);rd.shadowMap.type=r3Q().soft?THREE.PCFSoftShadowMap:THREE.PCFShadowMap;
      const L=[];R3.scene.traverse(o=>{if(o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||o.isPoints||o.isLine)L.push(o);});r3WarmJob({shadow:true,objs:L});rd.compile(R3.scene,R3.cam);}finally{R3.perf=P0;r3LiteShadows();if(R3T.groups)r3TreeLOD(true);rd.shadowMap.type=ty;rd.shadowMap.needsUpdate=true;}return;}
  try{
  if(j.post){const P=R3.post,m=P.m[j.post];r3WarmUniforms(m);P.quad.material=m;rd.setRenderTarget(j.post==='ao'||j.post==='aob'||j.post==='final'?R3.warmT.byte:R3.warmT.half);rd.render(P.scene,P.cam);return;}
  if(j.shadow&&R3.shc&&R3.shc.qs)rd.compile(R3.shc.qs,R3.shc.qc);
  const sv=[];R3.scene.traverse(o=>{if(o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||o.isPoints||o.isLine){sv.push([o,o.visible]);o.visible=false;}});
  const tw=[];for(const o of j.objs){o.visible=true;let q=o.parent;while(q){if(!q.visible){tw.push(q);q.visible=true;}q=q.parent;}
    if(j.shadow&&!o.castShadow&&(o.isMesh||o.isSkinnedMesh||o.isInstancedMesh)){tw.push(['cs',o,false]);o.castShadow=true;}   // things that only cast now and then (a club, the lite trees) need their shadow programs too
    tw.push(['fc',o,o.frustumCulled]);o.frustumCulled=false;
    if(o.isInstancedMesh&&o.count===0){tw.push(['cnt',o,0]);o.count=1;}
    if(o.geometry&&o.geometry.isInstancedBufferGeometry&&!o.geometry.instanceCount){tw.push(['ic',o.geometry,o.geometry.instanceCount]);o.geometry.instanceCount=1;}}
  rd.clippingPlanes=j.clip?[new THREE.Plane(new THREE.Vector3(0,1,0),0)]:[];
  const sm=rd.shadowMap.autoUpdate;rd.shadowMap.autoUpdate=false;if(j.shadow){rd.shadowMap.needsUpdate=true;if(R3.shc){R3.shc.mode=null;R3.shc.valid=false;}}
  rd.setRenderTarget(j.clip?R3.warmT.clip:R3.warmT.scene);rd.render(R3.scene,R3.cam);rd.shadowMap.autoUpdate=sm;if(j.shadow)rd.shadowMap.needsUpdate=true;   // the real shadows are redrawn next frame
  for(const t of tw){if(Array.isArray(t)){if(t[0]==='fc')t[1].frustumCulled=t[2];else if(t[0]==='cs')t[1].castShadow=t[2];else if(t[0]==='cnt')t[1].count=t[2];else t[1].instanceCount=t[2];}else t.visible=false;}
  for(const[o,v]of sv)o.visible=v;
 }catch(e){console.warn('[warm]',e);}finally{rd.clippingPlanes=pc;rd.setRenderTarget(prev);}}
function r3Surround(h){const T=THREE;r3Dispose(R3.skirt);r3Dispose(R3.flat);
  const Wd=WIDE||DEM,T0=h.T0,b=h.bounds;const X0=Wd.x0-T0[0],Y0=Wd.y0-T0[1],X1=X0+Wd.dx*(Wd.nc-1),Y1=Y0+Wd.dy*(Wd.nr-1),st=R3.perf>=3?30:20;
  const nx=Math.floor((X1-X0)/st)+1,ny=Math.floor((Y1-Y0)/st)+1,pos=new Float32Array(nx*ny*3),nor=new Float32Array(nx*ny*3),HH=new Float32Array(nx*ny);const hasS=!!CUR.surr;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=X0+i*st,y=Y0+j*st;let Hh=demRel(h,x,y)-.35;const dB=Math.max(b[0]-x,x-b[2],b[1]-y,y-b[3],0);
    if(hasS&&dB>330){const k=surrAt(x+T0[0],y+T0[1]);if(k==='wood'||(CUR.scen==='lowcountry'&&k==='open'))Hh+=(CUR.scen==='lowcountry'?16:11)*smooth(330,470,dB);}HH[j*nx+i]=Hh;}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const o=(j*nx+i)*3,k=j*nx+i,hl=HH[k-(i>0?1:0)],hr=HH[k+(i<nx-1?1:0)],hd=HH[k-(j>0?nx:0)],hu=HH[k+(j<ny-1?nx:0)];
    pos[o]=X0+i*st;pos[o+1]=HH[k];pos[o+2]=Y0+j*st;const a=-(hr-hl)/(2*st),c=-(hu-hd)/(2*st),l=Math.hypot(a,1,c);nor[o]=a/l;nor[o+1]=1/l;nor[o+2]=c/l;}
  const ids=[];const inB=(x,y)=>x>b[0]+4&&x<b[2]-4&&y>b[1]+4&&y<b[3]-4;
  for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const x=X0+i*st,y=Y0+j*st;if(inB(x,y)&&inB(x+st,y)&&inB(x,y+st)&&inB(x+st,y+st))continue;const a=j*nx+i,bq=a+1,c=a+nx,d=c+1;ids.push(a,c,bq,bq,c,d);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('normal',new T.BufferAttribute(nor,3));geo.setIndex(ids);geo.computeBoundingSphere();
  R3.skirt=r3Add(geo,R3.mat.groundFar,{recv:false});
  let rim=0,n=0;for(let i=0;i<nx;i++){rim+=HH[i]+HH[(ny-1)*nx+i];n+=2;}rim/=n;const S2=20000,f=[];
  const quad=(x0,z0,x1,z1)=>{for(const[x,z]of[[x0,z0],[x1,z0],[x1,z1],[x0,z0],[x1,z1],[x0,z1]])f.push(x,rim-2,z);};
  quad(X0-S2,Y0-S2,X1+S2,Y0);quad(X0-S2,Y1,X1+S2,Y1+S2);quad(X0-S2,Y0,X0,Y1);quad(X1,Y0,X1+S2,Y1);
  const fg=new T.BufferGeometry();fg.setAttribute('position',new T.BufferAttribute(new Float32Array(f),3));fg.computeVertexNormals();
  for(let i=0;i<f.length/3;i++)fg.attributes.normal.setXYZ(i,0,1,0);
  R3.flat=r3Add(fg,R3.mat.groundFar,{recv:false});
  if(CUR.surr){const bx=CUR.surr.box;R3.GU.gSS.value.set(bx[0]-T0[0],bx[1]-T0[1],bx[2]-bx[0],bx[3]-bx[1]);R3.GU.gStex.value=SURR.tex||null;}else R3.GU.gSS.value.set(0,0,0,0);}
function r3Water(h){const T=THREE;r3Dispose(R3.water);R3.water=null;const pos=[],uv=[];
  // a falling creek: split its triangles to ~5 yd so the surface follows the same level the ground under it does
  const sub=(a,b,c,o)=>{const l1=hyp(b[0]-a[0],b[1]-a[1]),l2=hyp(c[0]-b[0],c[1]-b[1]),l3=hyp(a[0]-c[0],a[1]-c[1]),M=Math.max(l1,l2,l3);if(M<5||o.length>60000){o.push([a,b,c]);return;}
    if(M===l1){const m=[(a[0]+b[0])/2,(a[1]+b[1])/2];sub(a,m,c,o);sub(m,b,c,o);}else if(M===l2){const m=[(b[0]+c[0])/2,(b[1]+c[1])/2];sub(a,b,m,o);sub(a,m,c,o);}else{const m=[(c[0]+a[0])/2,(c[1]+a[1])/2];sub(a,b,m,o);sub(m,b,c,o);}};
  for(const w of h.water){const y=(w.lvl!==undefined?w.lvl:-1.1)+.14;let tr=earClip(w.pts);if(w.lv){const o=[];for(const[a,b,c]of tr)sub(a,b,c,o);tr=o;}for(const[a,b,c]of tr)for(const p of[a,c,b]){pos.push(p[0],w.lv?wLvl(w,p[0],p[1])+.14:y,p[1]);uv.push(p[0]/14,p[1]/14);}}
  if(!pos.length)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(pos),3));g.setAttribute('uv',new T.BufferAttribute(new Float32Array(uv),2));
  const nor=new Float32Array(pos.length);for(let i=1;i<nor.length;i+=3)nor[i]=1;g.setAttribute('normal',new T.BufferAttribute(nor,3));
  const tg=new Float32Array(pos.length/3*4);for(let i=0;i<tg.length;i+=4){tg[i]=1;tg[i+3]=1;}g.setAttribute('tangent',new T.BufferAttribute(tg,4));g.computeBoundingSphere();
  R3.water=r3Add(g,R3.mat.water,{recv:true,order:5});}
// trees/houses/structures (9-float verts), distant trees, leaf cards (11-float verts)
function r3SetTrees(out,fo,fol,bark){r3Dispose(R3.trees);r3Dispose(R3.far);r3Dispose(R3.fol);r3Dispose(R3.bark);R3.trees=R3.far=R3.fol=R3.bark=null;
  if(bark&&bark.length){const g=r3Geo(bark,11);g.computeTangents?0:0;R3.bark=r3Add(g,R3.mat.bark,{cast:true,recv:true});}
  if(out&&out.length)R3.trees=r3Add(r3Geo(out,9),R3.mat.tree,{cast:true,recv:true});
  if(fo&&fo.length)R3.far=r3Add(r3Geo(fo,9),R3.mat.far,{cast:false,recv:false});
  if(fol&&fol.length)R3.fol=r3Add(r3Geo(fol,11),R3.mat.leaf,{cast:true,recv:true,depth:R3.leafDepth});
  if(b10Hole())for(const m of[R3.bark,R3.trees,R3.fol])if(m)m.castShadow=false;
  if(typeof r3TreeFlush==='function')r3TreeFlush();}
function r3SetGrass(out){r3Dispose(R3.grass);R3.grass=null;if(R3G.lods)return;if(out&&out.length)R3.grass=r3Add(r3Geo(out,9),R3.mat.grass,{cast:false,recv:true});}


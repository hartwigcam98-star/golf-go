/* ---------- render ---------- */
/*@data R3TEX*/
/*@data R3BOSS*/

/* ===================== motion-captured golfer (Mixamo "Boss" + golf clips) =====================
   A skinned character replaces the jointed figure. The power meter scrubs the backswing, the strike plays the
   captured downswing (retracing the backswing for short swings) and the follow-through. The club is not in the
   capture, so it is attached to the lead hand and solved so the head sits behind the ball at address and meets
   it at impact. Rig space is Mixamo's: centimetres, y up, target along +z, ball on the -x side. */
const R3B={};
function r3b64(s,T){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new T(u.buffer);}
function r3GolferInit(){if(typeof R3BOSS==='undefined')return;r3GolferBuild(R3BOSS,null);}
// the saved golfer is loaded once the renderer is switched on (r3GolferSet needs R3.on)
function r3GolferRestore(){try{const id=CHAR_ID;if(localStorage.getItem('golf-char')!==id)localStorage.setItem('golf-char',id);if(id&&id!=='boss')r3GolferSet(id,ok=>{if(!ok){try{CHAR_ID='boss';localStorage.setItem('golf-char','boss');golferRow();toast('COULD NOT LOAD','Your golfer did not download, playing as The Boss.','#ff9b6a');}catch(e){}}});}catch(e){}}
// build (or rebuild) the skinned golfer from a character record; clips come from the Boss, retargeted when needed
/* a soft fill from the camera's side on the golfer only, so faces aren't lost in shadow when the sun is behind him (Oct 19 2026) */
const R3_GFILL={value:.3};
function r3GolferBuild(D,cid){const T=THREE,nb=D.names.length;
  if(R3B.acc){for(const a of R3B.acc){a.parent&&a.parent.remove(a);a.geometry.dispose();a.material.dispose();}R3B.acc=null;}
  if(R3B.mesh){R3.scene.remove(R3B.mesh);R3.scene.remove(R3B.root);R3B.mesh.geometry.dispose();for(const k of['map','normalMap'])if(R3B.mat[k]&&!R3B.mat[k].userData.keep)R3B.mat[k].dispose();R3B.mat.dispose();}
  const lt=r3b64(D.lt,Float32Array),inv=r3b64(D.inv,Float32Array);
  const bones=[];for(let k=0;k<nb;k++){const b=new T.Bone();b.name=D.names[k];b.position.set(lt[k*3],lt[k*3+1],lt[k*3+2]);bones.push(b);if(D.parent[k]>=0)bones[D.parent[k]].add(b);}
  const root=new T.Group();root.matrixAutoUpdate=false;root.add(bones[0]);R3.scene.add(root);
  const invs=[];for(let k=0;k<nb;k++){const m=new T.Matrix4();m.fromArray(inv,k*16);m.transpose();invs.push(m);}
  // mesh (quantised in the exporter)
  const M=D.mesh,n=M.n,pq=r3b64(M.p,Uint16Array),pos=new Float32Array(n*3);for(let i=0;i<n*3;i++){const a=i%3;pos[i]=M.lo[a]+pq[i]/65535*(M.hi[a]-M.lo[a]);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));
  g.setAttribute('normal',new T.BufferAttribute(r3b64(M.nr,Int8Array),3,true));
  const uq=r3b64(M.uv,Uint16Array),uv=new Float32Array(n*2);for(let i=0;i<n*2;i++)uv[i]=uq[i]/65535;g.setAttribute('uv',new T.BufferAttribute(uv,2));
  const si=r3b64(M.si,Uint8Array),si16=new Uint16Array(si.length);si16.set(si);g.setAttribute('skinIndex',new T.BufferAttribute(si16,4));
  if(D.lg&&D.lg.girth&&D.lg.girth!==1){const gr=D.lg.girth,w8=r3b64(M.sw,Uint8Array),tb=new Set(['Hips','Spine','Spine1','Spine2'].map(nm=>D.names.indexOf(nm)));let cz=0,cn=0;const tw=new Float32Array(n);
    for(let i=0;i<n;i++){let t=0;for(let q=0;q<4;q++)if(tb.has(si[i*4+q]))t+=w8[i*4+q]/255;tw[i]=t;if(t>.6){cz+=pos[i*3+2];cn++;}}cz/=Math.max(1,cn);
    for(let i=0;i<n;i++){if(tw[i]<=0)continue;const f=1+(gr-1)*tw[i];pos[i*3]*=f;pos[i*3+2]=cz+(pos[i*3+2]-cz)*(1+(f-1)*1.15);}}
  g.setAttribute('skinWeight',new T.BufferAttribute(r3b64(M.sw,Uint8Array),4,true));
  const pt=r3b64(M.pt,Uint8Array),ptf=new Float32Array(n);for(let i=0;i<n;i++)ptf[i]=pt[i];g.setAttribute('part',new T.BufferAttribute(ptf,1));
  g.setIndex(new T.BufferAttribute(M.i32?r3b64(M.idx,Uint32Array):r3b64(M.idx,Uint16Array),1));g.computeBoundingSphere();g.boundingSphere.radius=1e6;
  // textures
  const tex=(src,srgb)=>{const im=new Image(),t=new T.Texture(im);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=4;im.onload=()=>{t.needsUpdate=true;};im.src=src;return t;};
  const pm=D.pmean||[[.5,.5,.5]],pmk=k=>pm[k]||pm[0];
  const TU={gFill:R3_GFILL,tTop:{value:new T.Vector4(1,1,1,0)},tPants:{value:new T.Vector4(1,1,1,0)},tHat:{value:new T.Vector4(1,1,1,0)},tSkin:{value:new T.Vector4(1,1,1,0)},
    tShoe:{value:new T.Vector4(1,1,1,0)},tSock:{value:new T.Vector4(1,1,1,0)},tSock2:{value:new T.Vector4(1,1,1,0)},tLeg:{value:new T.Vector4(1,1,1,0)},tHair:{value:new T.Vector4(1,1,1,0)},tPlaid:{value:new T.Vector4(1,1,1,0)},tHide:{value:0},tHideY:{value:-1e9},
    pmTop:{value:new T.Vector3(...pmk(0))},pmPants:{value:new T.Vector3(...pmk(9))},pmHat:{value:new T.Vector3(...pmk(5))},pmSkin:{value:new T.Vector3(...pmk(3))},
    pmShoe:{value:new T.Vector3(...pmk(20))},pmSock:{value:new T.Vector3(...pmk(21))},pmLeg:{value:new T.Vector3(...pmk(24))},pmLeg2:{value:new T.Vector3(...pmk(25))},pmHair:{value:new T.Vector3(...pmk(23))}};
  // the diffuse map is kept per character so swapping golfers between turns (Challenge V2) does not flash untextured
  if(!D._map){D._map=tex(D.tex.d,true);D._map.userData.keep=true;}
  const mo={map:D._map,roughness:.72,metalness:0};if(D.tex.n)mo.normalMap=tex(D.tex.n,false);if(D.alpha){mo.alphaTest=.5;mo.side=T.DoubleSide;}
  const mat=r3Patch(new T.MeshStandardMaterial(mo),{golfer:true,uniforms:TU});
  const mesh=new T.SkinnedMesh(g,mat);mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;
  const sk=new T.Skeleton(bones,invs);mesh.bind(sk,new T.Matrix4());R3.scene.add(mesh);mesh.visible=false;root.visible=true;
  // clips
  const src=cid?(D._rt||(D._rt=r3Retarget(D))):R3BOSS.clips;   // retargeted once per character
  const clips={};for(const k in src){const c=src[k];clips[k]={...c,Q:c.Q||r3b64(c.q,Int16Array),QS:c.QS||r3b64(c.qs,Int16Array),HIP:c.HIP||r3b64(c.hip,Float32Array),na:c.anim.length};}
  Object.assign(R3B,{axm:cid?r3AxMap(D):null,root,bones,mesh,mat,TU,clips,nb,cid:cid||'boss',idx:Object.fromEntries(D.names.map((s,i)=>[s,i])),pa:new Float32Array(nb*4),pb:new Float32Array(nb*4),ha:[0,0,0],hb:[0,0,0],cache:{},tor:null,torH:null});
  R3B.lg=D.lg||null;R3B.hideY=-1e9;try{R3B.acc=r3LegAcc(D,bones,invs,g);}catch(e){console.error('[legend acc]',e);R3B.acc=null;}
  R3.boss=R3B;if(typeof R3R!=='undefined')R3R.key=null;}
/* a legend's hat and sunglasses, sized from the head in the bind pose (rig space: cm, y up, facing +z) and parented to the Head bone */
function r3LegAcc(D,bones,invs,g){const L=D.lg;if(!L||!(L.hat||L.shades||L.belt))return null;const T=THREE,hk=D.names.indexOf('Head');if(hk<0)return null;
  const P=g.attributes.position.array,SI=g.attributes.skinIndex.array,SW=g.attributes.skinWeight.array,PT=g.attributes.part.array,n=P.length/3;
  const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];let cnt=0;
  for(let i=0;i<n;i++){let b=-1,w=-1;for(let k=0;k<4;k++)if(SW[i*4+k]>w){w=SW[i*4+k];b=SI[i*4+k];}if(b!==hk||w<180||PT[i]===22)continue;cnt++;for(let a=0;a<3;a++){mn[a]=Math.min(mn[a],P[i*3+a]);mx[a]=Math.max(mx[a],P[i*3+a]);}}
  if(cnt<50)return null;
  // the skull, from the head's own skin (no hair, no ears): crown height, and the head's width, depth and centre at the hat band
  let top=-1e9;for(let i=0;i<n;i++)if(PT[i]===3&&SI[i*4]===hk&&SW[i*4]>180)top=Math.max(top,P[i*3+1]);
  const band=(y0,y1)=>{let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9,c=0;for(let i=0;i<n;i++){const y=P[i*3+1];if(PT[i]!==3||y<y0||y>y1)continue;let b=-1,w=-1;for(let k=0;k<4;k++)if(SW[i*4+k]>w){w=SW[i*4+k];b=SI[i*4+k];}if(b!==hk)continue;
    c++;x0=Math.min(x0,P[i*3]);x1=Math.max(x1,P[i*3]);z0=Math.min(z0,P[i*3+2]);z1=Math.max(z1,P[i*3+2]);}return c>10?{cx:(x0+x1)/2,cz:(z0+z1)/2,ax:(x1-x0)/2,az:(z1-z0)/2}:null;};
  const hb=band(top-10.5,top-7.5)||{cx:(mn[0]+mx[0])/2,cz:(mn[2]+mx[2])/2-1,ax:(mx[0]-mn[0])*.45,az:(mx[2]-mn[2])*.42};
  const{cx,cz}=hb,hr=L.hat&&!L.hide?.9:.5,ax=hb.ax+hr,az=hb.az+hr;   // (a little room for the hair under it)
  // a brim: a curved strip off the front of the band ellipse, pitched down, its sides curling down a touch
  const brimGeo=(y,len,span,pitch,curl)=>{const NU=24,NV=4,pos=[],idx=[];
    for(let i=0;i<=NU;i++){const u=-1+2*i/NU,th=u*span,ex=Math.sin(th)*ax,ez=Math.cos(th)*az,nx=Math.sin(th)/ax,nz=Math.cos(th)/az,nl=Math.hypot(nx,nz),L2=len*Math.sqrt(Math.max(0,1-Math.pow(Math.abs(u),2.4)))+.4;
      for(let j=0;j<=NV;j++){const v=j/NV,d=L2*v;pos.push(cx+ex+nx/nl*d,y-Math.sin(pitch)*d-curl*u*u*v*v*len*.5,cz+ez+nz/nl*d*Math.cos(pitch));}}
    for(let i=0;i<NU;i++)for(let j=0;j<NV;j++){const a=i*(NV+1)+j,b2=a+NV+1;idx.push(a,b2,a+1,a+1,b2,b2+1);}
    const g2=new T.BufferGeometry();g2.setAttribute('position',new T.Float32BufferAttribute(pos,3));g2.setIndex(idx);g2.computeVertexNormals();return g2;};
  const out=[],mat=c=>r3Patch(new T.MeshStandardMaterial({color:new T.Color(c),roughness:.8,metalness:0,side:T.DoubleSide}),{});
  const add=(geo,c,m2)=>{geo.applyMatrix4(invs[hk]);const m=new T.Mesh(geo,m2||mat(c));m.castShadow=true;m.frustumCulled=false;bones[hk].add(m);out.push(m);return m;};
  const rimY=top-(L.hat==='flat'?6.6:L.hat==='visor'?7.4:7.4);R3B.hideY=L.hat?rimY+.4:-1e9;
  // scalp shell: the MakeHuman hairs cut the scalp away under them; a hair-coloured skull just inside the skin fills the gaps
  if(L.hair){const shell=new T.SphereGeometry(1,28,14,0,Math.PI*2,0,Math.PI*.62);
    shell.scale(hb.ax-.6,9.4,hb.az-.7);shell.rotateX(-.42);shell.translate(cx,top-9.8,cz-.4);add(shell,null,r3Patch(new T.MeshStandardMaterial({color:new T.Color(L.hair).multiplyScalar(.92),roughness:.95,metalness:0}),{})).castShadow=false;}
  if(L.hat==='cap'){   // six-panel cap: a crown that sits on the skull, its peak curved and pitched a little down
    const ry=top-rimY+.7,dome=new T.SphereGeometry(1,32,12,0,Math.PI*2,0,Math.PI/2);dome.scale(ax*1.02,ry,az*1.03);dome.translate(cx,rimY,cz-.3);add(dome,L.hatc);
    add(brimGeo(rimY+.3,7.2,.95,.2,.55),L.hatc);
    const btn=new T.SphereGeometry(.7,8,6);btn.scale(1,.5,1);btn.translate(cx,rimY+ry,cz-.3);add(btn,L.hatc);}
  if(L.hat==='flat'){   // flat cap: low and flat, sloping down to a short snap peak
    const dome=new T.SphereGeometry(1,32,10,0,Math.PI*2,0,Math.PI/2);dome.scale(ax*1.12,top-rimY+.6,az*1.2);dome.rotateX(.24);dome.translate(cx,rimY-.2,cz+1.4);add(dome,L.hatc);
    add(brimGeo(rimY-.9,4.4,.85,.38,.12),L.hatc);}
  if(L.hat==='visor'){const bandG=new T.CylinderGeometry(1,1,3.4,40,1,true);bandG.scale(ax*1.02,1,az*1.02);bandG.translate(cx,rimY+1.7,cz);add(bandG,L.hatc);
    add(brimGeo(rimY+.3,7,1,.22,.5),L.hatc);}
  if(L.belt){const hk2=D.names.indexOf('Hips');let wy=-1e9;
    // where the shirt ends: a low percentile of the shirt's height near the middle of the body (the hem), the belt sits just over it
    {const ys=[];for(let i=0;i<n;i++)if(PT[i]===0&&Math.abs(P[i*3])<12)ys.push(P[i*3+1]);if(ys.length>40){ys.sort((p1,p2)=>p1-p2);wy=ys[Math.floor(ys.length*.03)]+4.5;}}
    if(wy>-1e8){let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(let i=0;i<n;i++){const y=P[i*3+1];if(Math.abs(y-(wy-2.5))>2.5||(PT[i]!==9&&PT[i]!==0))continue;x0=Math.min(x0,P[i*3]);x1=Math.max(x1,P[i*3]);z0=Math.min(z0,P[i*3+2]);z1=Math.max(z1,P[i*3+2]);}
      if(x1>x0){const bt=new T.CylinderGeometry(1,1,4,32,1,true);bt.scale((x1-x0)/2*1.04,1,(z1-z0)/2*1.06);bt.translate((x0+x1)/2,wy-2.5,(z0+z1)/2);bt.applyMatrix4(invs[hk2]);
        const m=new T.Mesh(bt,mat(L.belt));m.material.side=T.DoubleSide;m.castShadow=false;m.frustumCulled=false;bones[hk2].add(m);out.push(m);}}}
  if(L.shades){   // aviators: teardrop lenses in thin gold wire, a double bridge, arms back to the ears
    const ey=top-11.6;let fz=-1e9;for(let i=0;i<n;i++){const y=P[i*3+1];if(PT[i]!==3||Math.abs(y-ey)>1.2||Math.abs(P[i*3]-cx)>3.6||Math.abs(P[i*3]-cx)<2)continue;fz=Math.max(fz,P[i*3+2]);}
    if(fz>-1e8){const lens=new T.MeshStandardMaterial({color:new T.Color('#1d2a24'),roughness:.3,metalness:.35,side:T.DoubleSide});r3Patch(lens,{});const gold='#c9a85a';const wire=r3Patch(new T.MeshStandardMaterial({color:new T.Color(gold),roughness:.3,metalness:.9}),{});
      const z0=fz+.9;
      for(const sd of[-1,1]){const sh2=new T.Shape(),N=28,pts=[];
        for(let k=0;k<=N;k++){const t=k/N*Math.PI*2,x=Math.cos(t),y=Math.sin(t);const w=y<0?(1+.25*Math.max(0,-x*sd)):1;pts.push([x*2.7*(y<0?1.04:1),y*(y<0?2.5*w:1.9)]);}   // teardrop: deeper toward the outside
        pts.forEach(([x,y],k)=>k?sh2.lineTo(x,y):sh2.moveTo(x,y));
        const lx=cx+sd*3.25,lg=new T.ShapeGeometry(sh2,1);lg.scale(sd,1,1);lg.rotateY(sd*.18);lg.translate(lx,ey-.2,z0);add(lg,null,lens);
        const rg=new T.BufferGeometry().setFromPoints(pts.map(([x,y])=>new T.Vector3(x,y,0)));const tube=new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(([x,y])=>new T.Vector3(x,y,0)),true),40,.09,4,true);
        tube.scale(sd,1,1);tube.rotateY(sd*.18);tube.translate(lx,ey-.2,z0+.05);add(tube,null,wire);
        const arm=new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(cx+sd*5.9,ey+1.3,z0-.6),new T.Vector3(cx+sd*(ax-.2),ey+1.2,cz+2),new T.Vector3(cx+sd*(ax-.6),ey-.4,cz-1.5)]),10,.11,4,false);add(arm,null,wire);}
      for(const dy of[1.4,.5]){const br=new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(cx-.75,ey+dy,z0+.15),new T.Vector3(cx,ey+dy+.25,z0+.45),new T.Vector3(cx+.75,ey+dy,z0+.15)]),6,.08,4,false);add(br,null,wire);}}}
  return out;}
/* Boss clips onto another Mixamo rig: each joint keeps its world rotation relative to the bind pose, hips scaled by leg length */
/* hand-made touches (crouch, breath, the fist's finger curl) turn bones about axes in the Boss's bone frames. Other bodies'
   bones can sit in other frames (Blender-built MakeHuman bodies roll theirs differently), so each axis is carried into the
   body's own frame through the two rest poses: then the same touch turns his bone the same way in the world. */
function r3AxMap(D){const T=THREE,B=R3BOSS,bI=Object.fromEntries(B.names.map((s,i)=>[s,i])),rq=(inv,k)=>{const m=new T.Matrix4().fromArray(inv,k*16).transpose().invert(),q=new T.Quaternion();m.decompose(new T.Vector3(),q,new T.Vector3());return q;};
  const iB=r3b64(B.inv,Float32Array),iC=r3b64(D.inv,Float32Array);return D.names.map((n,k)=>{const j=bI[n];if(j===undefined)return null;const m=rq(iC,k).invert().multiply(rq(iB,j));return Math.abs(m.w)>.9999?null:m;});}
// a bone's axis given in the Boss's bone frame, as a world direction for this body (see r3AxMap)
function r3bDir(k,ax,o){const a=r3bAx(k,ax);return(o||new THREE.Vector3()).set(a[0],a[1],a[2]).transformDirection(R3B.bones[k].matrixWorld);}
// (the remapped axis is scratch: every caller reads it straight away)
function r3bAx(k,ax){const m=R3B.axm&&R3B.axm[k];if(!m)return ax;const v=R3B_AXV.set(ax[0],ax[1],ax[2]).applyQuaternion(m),o=R3B_AXO;o[0]=v.x;o[1]=v.y;o[2]=v.z;return o;}
const R3B_AXV=new THREE.Vector3(),R3B_AXO=[0,0,0];
function r3Retarget(D){const T=THREE,B=R3BOSS,nbB=B.names.length,nb=D.names.length;
  const rot=(inv,k)=>{const m=new T.Matrix4().fromArray(inv,k*16).transpose().invert(),q=new T.Quaternion(),p=new T.Vector3();m.decompose(p,q,new T.Vector3());return{q,p};};
  const iB=r3b64(B.inv,Float32Array),iC=r3b64(D.inv,Float32Array),RB=[],RC=[];for(let k=0;k<nbB;k++)RB.push(rot(iB,k));for(let k=0;k<nb;k++)RC.push(rot(iC,k));
  const bI=Object.fromEntries(B.names.map((s,i)=>[s,i])),map=D.names.map(s=>bI[s]??-1);
  const hB=RB[bI.Hips].p.y,hC=RC[D.names.indexOf('Hips')].p.y,sc=hC/hB;
  const RBi=RB.map(r=>r.q.clone().invert()),RCi=RC.map(r=>r.q.clone().invert());
  const out={},WB=[],WC=[];for(let k=0;k<nbB;k++)WB.push(new T.Quaternion());for(let k=0;k<nb;k++)WC.push(new T.Quaternion());
  const ql=new T.Quaternion(),tmp=new T.Quaternion();
  for(const ck in B.clips){const c=B.clips[ck],Qa=r3b64(c.q,Int16Array),QS=r3b64(c.qs,Int16Array),H=r3b64(c.hip,Float32Array),na=c.anim.length,n=c.n;
    const Q=new Int16Array(n*nb*4),HC=new Float32Array(n*3),qb=new Float32Array(nbB*4);
    for(let f=0;f<n;f++){for(let k=0;k<nbB*4;k++)qb[k]=QS[k]/32767;for(let j=0;j<na;j++){const k=c.anim[j];for(let e=0;e<4;e++)qb[k*4+e]=Qa[(f*na+j)*4+e]/32767;}
      for(let k=0;k<nbB;k++){ql.set(qb[k*4],qb[k*4+1],qb[k*4+2],qb[k*4+3]).normalize();const p=B.parent[k];if(p>=0)WB[k].copy(WB[p]).multiply(ql);else WB[k].copy(ql);}
      for(let k=0;k<nb;k++){const p=D.parent[k],jb=map[k];
        if(jb>=0)WC[k].copy(WB[jb]).multiply(RBi[jb]).multiply(RC[k].q);
        else if(p>=0)WC[k].copy(WC[p]).multiply(RCi[p]).multiply(RC[k].q);else WC[k].copy(RC[k].q);
        if(p>=0)tmp.copy(WC[p]).invert().multiply(WC[k]);else tmp.copy(WC[k]);
        const o=(f*nb+k)*4;Q[o]=Math.round(tmp.x*32767);Q[o+1]=Math.round(tmp.y*32767);Q[o+2]=Math.round(tmp.z*32767);Q[o+3]=Math.round(tmp.w*32767);}
      for(let e=0;e<3;e++)HC[f*3+e]=H[f*3+e]*sc;}
    for(let f=1;f<n;f++)for(let k=0;k<nb;k++){const a=(f*nb+k)*4,b=((f-1)*nb+k)*4;if(Q[a]*Q[b]+Q[a+1]*Q[b+1]+Q[a+2]*Q[b+2]+Q[a+3]*Q[b+3]<0)for(let e=0;e<4;e++)Q[a+e]=-Q[a+e];}
    const all=[...Array(nb).keys()],c2={...c,anim:all,Q,QS:Q.slice(0,nb*4),HIP:HC};delete c2.q;delete c2.qs;delete c2.hip;
    if(c.mark)c2.mark=[c.mark[0],c.mark[1].map(v=>v*sc)];out[ck]=c2;}
  return out;}

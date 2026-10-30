/* ---- camera straight from V, sun shadow box following the view ---- */
function r3Camera(){const c=R3.cam,n=.3,f=30000,Kx=2*V.f/W,Ky=2*V.f/H,Kz=1-2*V.cy/H;
  const m=c.matrixWorld;m.set(V.R[0],V.U[0],-V.F[0],V.E[0], V.R[1],V.U[1],-V.F[1],V.E[1], V.R[2],V.U[2],-V.F[2],V.E[2], 0,0,0,1);
  c.matrixWorldInverse.copy(m).invert();c.position.set(V.E[0],V.E[1],V.E[2]);
  c.projectionMatrix.set(Kx,0,0,0, 0,Ky,-Kz,0, 0,0,-(f+n)/(f-n),-2*f*n/(f-n), 0,0,-1,0);c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
  c.near=n;c.far=f;c.aspect=W/H;c.fov=2*Math.atan((H/2)/V.f)*180/Math.PI;
  const U=R3.U;U.E.value.set(...V.E);U.R.value.set(...V.R);U.U.value.set(...V.U);U.Fw.value.set(...V.F);U.K.value.set(Kx,Ky,Kz);U.ctime.value=T;U.cloudOn.value=CLOUDS_COV;}
function r3Shadow(){const s=R3.sun,q=r3Q();
  if(R3.GU.bkOn.value&&R3.b10cast!==G.hole&&b10Hole()){R3.b10cast=G.hole;   // Blender trial: the baked map has the static shadows, so trees and buildings leave the live shadow map
    for(const g of R3T.groups||[])for(const im of g.full.concat(g.lite))im.castShadow=false;for(const m of[R3.bark,R3.trees,R3.fol])if(m)m.castShadow=false;if(R3.shc)R3.shc.valid=false;}if(s.shadow.mapSize.x!==q.shadow){s.shadow.mapSize.set(q.shadow,q.shadow);if(s.shadow.map){s.shadow.map.dispose();s.shadow.map=null;}}
  R3.renderer.shadowMap.type=q.soft?THREE.PCFSoftShadowMap:THREE.PCFShadowMap;
  const wide=G.overview||G.state==='intro'||G.state==='card';let C,Rr,Dd;
  let C0,C1,C2;   // (plain numbers: this ran every frame and made a dozen small arrays)
  if(G.fc&&G.state==='aim'&&!wide){const f=G.fc;Rr=Math.ceil(clamp(f.dist*.9,72,300)/8)*8;Dd=Math.max(140,Rr*1.6);C0=cam.L[0];C1=cam.L[1];C2=cam.L[2];}   // radius in 8 yd steps (zooming the look view redrew every tree's shadow each frame)
  else{const fx=V.F[0],fz=V.F[2],fl=Math.hypot(fx,fz)||1;Rr=wide?Math.min(420,Math.max(160,G.hole.len*.62)):(q.shadow>=2048?100:72);const ahead=wide?G.hole.len*.35:Rr*.62;
    const cx=(wide?0:V.E[0])+fx/fl*ahead,cz=(wide?0:V.E[2])+fz/fl*ahead;C0=cx;C1=hAt(cx,cz);C2=cz;Dd=wide?600:140;}
  /* Oct 2026: a sticky shadow box. It followed the view to the texel, so every aim drag and every frame of a flight moved it, and
     each move redraws every tree into the shadow map (the cached trees only last while the box is still): the full redraws were
     the most common hitch while aiming (55-100 ms on phones). Now the box only moves once the view's centre is 8% of its radius
     away (6 yd on phones), so it stays put for several degrees of aiming; the shadows still cover the view with room to spare. */
  {const K=R3.shBox||(R3.shBox={x:0,y:0,z:0,r:0,ok:false});
    if(!K.ok||K.r!==Rr||Math.hypot(C0-K.x,C2-K.z)>Rr*.08||window.__noShBox){K.x=C0;K.y=C1;K.z=C2;K.r=Rr;K.ok=true;}
    C0=K.x;C1=K.y;C2=K.z;}
  // snap to shadow texels so edges do not shimmer as the camera moves
  const z0=-SUN[0],z1=-SUN[1],z2=-SUN[2],l=Math.hypot(z2,0,-z0),x0=z2/l,x1=0/l,x2=-z0/l,y0=z1*x2-z2*x1,y1=z2*x0-z0*x2,y2=z0*x1-z1*x0;
  const tx=2*Rr/s.shadow.mapSize.x;const a=Math.round((C0*x0+C1*x1+C2*x2)/tx)*tx,b=Math.round((C0*y0+C1*y1+C2*y2)/tx)*tx,cz=Math.round((C0*z0+C1*z1+C2*z2)/2)*2;   /* along the sun too (2 yd steps), so a still view keeps the same shadow camera */
  const Cs0=x0*a+y0*b+z0*cz,Cs1=x1*a+y1*b+z1*cz,Cs2=x2*a+y2*b+z2*cz;
  s.target.position.set(Cs0,Cs1,Cs2);s.position.set(Cs0+SUN[0]*Dd,Cs1+SUN[1]*Dd,Cs2+SUN[2]*Dd);s.target.updateMatrixWorld();s.updateMatrixWorld();
  const oc=s.shadow.camera;oc.left=-Rr;oc.right=Rr;oc.top=Rr;oc.bottom=-Rr;oc.near=1;oc.far=Dd*2;oc.updateProjectionMatrix();}


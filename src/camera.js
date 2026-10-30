/* ---------- camera (behind the golfer) ---------- */
/* address views for full shots: 0 the standard view, 1 and 2 closer down-the-line views that keep the whole golfer in frame */
let FLY_TV=false;try{FLY_TV=localStorage.getItem('golf-flycam')==='tv';}catch(e){}
let CAMV=0;try{CAMV=Math.max(0,Math.min(2,+localStorage.getItem('golf-camv')||0));}catch(e){}
const CAMV_SET=[null,{back:8.6,ht:3.4,lk:.6},{back:6.2,ht:2.5,lk:.4}];
/* the closer address views frame the shot exactly like the standard view (camera straight behind the ball, target line in the
   middle, golfer to the left), just nearer and lower; the look point comes in a little so the golfer stays well in frame */
function camAddress(x,y,aim){const V2=CAMV_SET[CAMV];if(!V2)return null;const[dx,dz]=dirOf(aim),g0=hAt(x,y),D=Math.max(previewDist(),2);
  const look=Math.max(8,Math.min(70,D*.6)*V2.lk),lx=x+dx*look,lz=y+dz*look,ex=x-dx*V2.back,ez=y-dz*V2.back;
  return{E:[ex,Math.max(hAt(ex,ez)+.7,g0+V2.ht),ez],L:[lx,hAt(lx,lz)*.6+g0*.4,lz]};}
function camCycle(){CAMV=(CAMV+1)%3;try{localStorage.setItem('golf-camv',String(CAMV));}catch(e){}sfx.tick();}
function camTarget(){
  if(G.drop)return dropCam();
  if(G.replay)return replayCam();
  if(G.hole&&G.hole.range&&!G.rangeFollow&&G.golferAt&&(G.state==='flight'||G.state==='bounce'||G.state==='roll'||G.state==='wait')){const ga=G.golferAt,[ax,az]=dirOf(ga.aim),g0=hAt(ga.x,ga.y);return{E:[ga.x-ax*12,g0+4.2,ga.y-az*12],L:[ga.x+ax*90,g0+6,ga.y+az*90]};}   // the range: the view stays at the golfer
  {const tv=r3TvCam();if(tv)return tv;}
  const h=G.hole,b=G.ball,gb=hAt(b.x,b.y);
  if(G.overview||G.state==='intro'||G.state==='card'){
    const[ax,az]=dirOf(h.axis),L=Math.max(160,h.len);
    const sway=Math.sin(T*.25)*L*.04;const[px,pz]=[-az,ax];
    return{E:[-ax*L*.35+px*sway,L*.8,-az*L*.35+pz*sway],L:[ax*L*.5,0,az*L*.5]};
  }
  if(G.fc&&G.state==='aim'){const f=G.fc,pt=f.read?READ_PITCH:lookPitch(f.dist),[fx,fz]=dirOf(f.yaw),ty=hAt(f.tx,f.tz),hz=f.dist*Math.cos(pt);
    // look a little past the marker so it sits low in the frame with the ground beyond it in view (the green read view looks straight at its middle)
    const ah=curClub().putter||f.read?0:f.dist*.2,ax2=f.tx+fx*ah,az2=f.tz+fz*ah;
    const E1=[f.tx-fx*hz,ty+f.dist*Math.sin(pt),f.tz-fz*hz],L1=[ax2,ty*.6+hAt(ax2,az2)*.4,az2];
    const F=f.fly;if(!F)return{E:E1,L:L1};
    // along the shot: the camera rides up over the ball's path and comes down behind the landing spot
    const t=clamp(F.t,0,1),s=t*t*(3-2*t),sl=1-Math.pow(1-t,2.2),c=hyp(f.tx-F.bx,f.tz-F.bz),arc=Math.sin(Math.PI*s)*Math.min(26,4+c*.1);
    const lp=(a,b,k)=>a.map((v,i)=>v+(b[i]-v)*k);const E=lp(F.from.E,E1,s);E[1]+=arc;
    return{E,L:lp(F.from.L,L1,sl),fly:true};}
  if(aimingState()){
    const[dx,dz]=dirOf(G.aim),D=Math.max(previewDist(),2);
    if(curClub().putter){const back=2.4+D*.2,ht=1.25+D*.11,look=1+D*.55;const lx=b.x+dx*look,lz=b.y+dz*look;return{E:[b.x-dx*back,gb+ht,b.y-dz*back],L:[lx,hAt(lx,lz),lz]};}
    {const ca=camAddress(b.x,b.y,G.aim);if(ca)return ca;}
    const look=Math.min(70,D*.6),lx=b.x+dx*look,lz=b.y+dz*look;return{E:[b.x-dx*13,gb+5.4,b.y-dz*13],L:[lx,hAt(lx,lz)*.6+gb*.4,lz]};
  }
  if((G.state==='flight'||G.state==='roll')&&G.golferAt&&G.followT>0&&G.followT<(G.launchAt||0)+.4){const ga=G.golferAt,[ax,az]=dirOf(ga.aim),g0=hAt(ga.x,ga.y);if(G.fromLie!=='green'){const ca=camAddress(ga.x,ga.y,ga.aim);if(ca)return ca;}return{E:[ga.x-ax*13,g0+5.4,ga.y-az*13],L:[ga.x+ax*40,g0,ga.y+az*40]};}
  const[dx,dz]=dirOf(G.shotRot);
  if(G.state==='holed'){const p=h.pin,gp=hAt(p[0],p[1]);return{E:[p[0]-dx*4.5,gp+2.2,p[1]-dz*4.5],L:[p[0],gp,p[1]]};}
  if(G.state==='flight')return{E:[b.x-dx*31,G.bY*.55+gb*.45+9,b.y-dz*31],L:[b.x+dx*8,G.bY*.85+gb*.15,b.y+dz*8],zoom:TRZ};   // trailing the ball, a little wider (Flight zoom setting)
  const putt=G.fromLie==='green';const back=putt?6:20,ht=putt?2.8:7;
  return{E:[b.x-dx*back,gb+ht,b.y-dz*back],L:[b.x,gb,b.y],zoom:putt?1:TRZ};
}
function stepCam(dt){
  const t=camTarget();if(t.cut){cam.E=t.E.slice();cam.L=t.L.slice();}
  const lk=G.fc&&G.state==='aim',flyK=lk&&!!G.fc.fly,kE=1-Math.exp(-dt*(flyK?40:lk?9:G.state==='flight'?2.6:aimingState()?5:3)),kL=1-Math.exp(-dt*(flyK?40:lk?9:G.state==='flight'?9:5));
  for(let i=0;i<3;i++){cam.E[i]+=(t.E[i]-cam.E[i])*kE;cam.L[i]+=(t.L[i]-cam.L[i])*kL;}
  cam.E[1]=Math.max(hAt(cam.E[0],cam.E[2])+.7,cam.E[1]);
  /* Oct 2026: the same maths written into V's own arrays (they were new arrays every frame); nothing keeps V.E/F/R/U across frames */
  if(!V.E||V.E===cam.E)V.E=[0,0,0];if(!V.F)V.F=[0,0,1];if(!V.R)V.R=[1,0,0];if(!V.U)V.U=[0,1,0];
  const f=V.F,r=V.R,u=V.U;let f0=cam.L[0]-cam.E[0],f1=cam.L[1]-cam.E[1],f2=cam.L[2]-cam.E[2];const fl=hyp(f0,f1,f2)||1;f[0]=f0/fl;f[1]=f1/fl;f[2]=f2/fl;
  const r0=-f[2],r2=f[0],rl=hyp(r0,r2)||1;r[0]=r0/rl;r[1]=0;r[2]=r2/rl;
  u[0]=r[1]*f[2]-r[2]*f[1];u[1]=r[2]*f[0]-r[0]*f[2];u[2]=r[0]*f[1]-r[1]*f[0];
  V.E[0]=cam.E[0];V.E[1]=cam.E[1];V.E[2]=cam.E[2];
  V.cy=(topH+(H-botH))/2;
  V.f=Math.min((H/2)/Math.tan(31*DEG),(W/2)/Math.tan(24*DEG));cam.zm=(cam.zm||1)+((t.zoom||1)-(cam.zm||1))*(t.cut?1:1-Math.exp(-dt*3));V.f*=cam.zm;
  V.yaw=angTo(cam.E[0],cam.E[2],cam.L[0],cam.L[2]);
}
const PJ=[0,0,0,0];
function projTo(x,y,z,o){const dx=x-V.E[0],dy=y-V.E[1],dz=z-V.E[2];const cz=dx*V.F[0]+dy*V.F[1]+dz*V.F[2];if(cz<.3)return null;const cx=dx*V.R[0]+dy*V.R[1]+dz*V.R[2],cy=dx*V.U[0]+dy*V.U[1]+dz*V.U[2];const k=V.f/cz;o[0]=W/2+cx*k;o[1]=V.cy-cy*k;o[2]=cz;o[3]=k;return o;}   // proj into a reused array (per-frame loops)
function proj(x,y,z){const dx=x-V.E[0],dy=y-V.E[1],dz=z-V.E[2];const cz=dx*V.F[0]+dy*V.F[1]+dz*V.F[2];if(cz<.3)return null;const cx=dx*V.R[0]+dy*V.R[1]+dz*V.R[2],cy=dx*V.U[0]+dy*V.U[1]+dz*V.U[2];const k=V.f/cz;return[W/2+cx*k,V.cy-cy*k,cz,k];}
/* free-look camera for scouting before a shot: orbit a point on the ground; the view tilts down as you zoom out */
/* green slope colour scale, in percent grade */
const SLOPE_LO=2,SLOPE_HI=11;let slopeShown=false;
/* Scout cam (PGA 2K style): the eye flies the camera out along the shot to a close, low view of the landing spot.
   Three zoom steps (pinch): close, medium, wide. One finger: sideways turns round the marker, up/down looks further or nearer. */
function lookPitch(d){return clamp(.3+d/350,.3,1.2);}
function scoutCarry(){const q=G.landPt;return q?hyp(q[0]-G.ball.x,q[1]-G.ball.y):40;}
function scoutLevels(){if(curClub().putter)return[24,48,96];const cy=scoutCarry(),d0=clamp(7+cy*.055+Math.max(0,cy-180)*.04,11,25);/* long shots sit a little further back */return[d0,d0*2.4,d0*5.5];}
function scoutSetLvl(l){const f=G.fc;if(!f)return;f.lvl=clamp(l??0,0,2);f.distT=f.read?f.readD*[1,1.6,2.4][f.lvl]:scoutLevels()[f.lvl];}
function lookClamp(){const f=G.fc,h=G.hole;if(!f||!h)return;f.dist=clamp(f.dist,2,460);
  const ax=G.ball.x,az=G.ball.y,bx=h.pin[0],bz=h.pin[1],vx=bx-ax,vz=bz-az,l2=vx*vx+vz*vz||1,t=clamp(((f.tx-ax)*vx+(f.tz-az)*vz)/l2,0,1);
  const cx=ax+vx*t,cz=az+vz*t,ox=f.tx-cx,oz=f.tz-cz,d=Math.hypot(ox,oz),R=150;if(d>R){f.tx=cx+ox*R/d;f.tz=cz+oz*R/d;}}
function lookStart(){if(G.state!=='aim'||G.aiTurn||!G.hole)return false;G.overview=false;if(R3.on)try{r3RoutineSkip();}catch(e){}   /* the eye ends his walk-up / green read, like a tap on the picture (its camera held the view until it finished) */
  $('impPop').hidden=true;
  if(!G.fc){const q=G.landPt||[G.ball.x,G.ball.y],L=scoutLevels();
    G.fc={tx:q[0],tz:q[1],yaw:G.aim,yawOff:0,dist:L[0],distT:L[0],lvl:0,pz:1,follow:true,pan:0,
      fly:{t:0,dir:1,dur:.55+Math.min(.5,scoutCarry()/500),from:{E:[...cam.E],L:[...cam.L]},bx:G.ball.x,bz:G.ball.y}};
    /* Oct 24 2026 (Pappa): with the putter the ring sits at the full-stroke reach, well past the hole, and the eye used to fly out to it
       and leave the cup at the bottom of the screen. Putting, it looks at the cup instead, from behind the ball's line, close enough to
       see the cup and the line into it; pinch and drag work as before. */
    if(curClub().putter&&G.hole.pin){const f=G.fc,p=G.hole.pin,d=hyp(p[0]-G.ball.x,p[1]-G.ball.y);f.tx=p[0];f.tz=p[1];f.follow=false;f.lvl=null;
      if(d>1)f.yaw=angTo(G.ball.x,G.ball.y,p[0],p[1]);f.dist=f.distT=clamp(d*.55+3,5,30);}
    lookClamp();sfx.tick();}
  else if(G.fc.fly&&G.fc.fly.dir<0)G.fc.fly.dir=1;   // tapped again while flying back: turn round
  return true;}
/* Done: fly back to the golfer along the same path, then hand the camera back */
function lookEnd(){const f=G.fc;if(!f)return;sfx.tick();
  // where the address camera wants to be now (the aim may have changed while scouting)
  let from=f.from0;try{G.fc=null;const t=camTarget();from={E:[...t.E],L:[...t.L]};}catch(e){}G.fc=f;
  if(!f.fly)f.fly={t:1,dir:-1,dur:.5+Math.min(.45,scoutCarry()/550),from:from||{E:[...cam.E],L:[...cam.L]},bx:G.ball.x,bz:G.ball.y};else{f.fly.dir=-1;if(from)f.fly.from=from;}}
function lookPan(px,py){const f=G.fc;if(!f)return;if(f.follow){f.pan+=Math.hypot(px,py);if(f.pan<26)return;f.follow=false;}const s=f.dist/V.f,sp=Math.max(Math.sin(lookPitch(f.dist)),.3),[fx,fz]=dirOf(f.yaw);
  f.tx+=fz*px*s+fx*py*s/sp;f.tz+=-fx*px*s+fz*py*s/sp;lookClamp();}
// pinch / wheel: steps between the three views once the gesture has gone far enough
// v110: pinch / wheel zooms smoothly (no steps) from close to the cup (2 yd) out to the whole hole; once zoomed by hand, club changes no longer re-frame it
function lookZoom(k){const f=G.fc;if(!f||!isFinite(k)||k<=0)return;f.lvl=null;f.distT=clamp((f.distT||f.dist)*k,2,460);}
// turning round the marker keeps it following the shot
function lookTurn(a){const f=G.fc;if(!f)return;if(f.follow)f.yawOff=(f.yawOff||0)+a;else f.yaw+=a;}
/* v96 green read view: around the green, scouting flies to a steep, nearly top-down view of the stretch from the ball to the hole,
   turned so the ball is at the bottom and the hole at the top: the slope grid reads like a map (arrows downhill, red where steep) */
const READ_PITCH=1.15,READ_NEAR=45;
const nearGreen=()=>!!G.hole&&(G.lie==='green'||pinDist()<=READ_NEAR);
function readFrame(f){const p=G.hole.pin,b=G.ball,d=hyp(p[0]-b.x,p[1]-b.y);
  f.tx=b.x+(p[0]-b.x)*.55;f.tz=b.y+(p[1]-b.y)*.55;f.yaw=d>1?angTo(b.x,b.y,p[0],p[1]):f.yaw;f.yawOff=0;
  f.readD=clamp(d*1.25+9,13,62);f.distT=f.readD;f.lvl=0;f.read=true;f.follow=false;f.pan=0;f.turn=0;}
function lookGreen(){if(!lookStart())return;const f=G.fc,p=G.hole.pin,b=G.ball,d=hyp(p[0]-b.x,p[1]-b.y);
  f.read=false;f.tx=p[0];f.tz=p[1];f.yaw=d>2?angTo(b.x,b.y,p[0],p[1]):f.yaw;f.distT=G.lie==='green'||d<30?22:42;f.lvl=0;f.follow=false;lookClamp();sfx.tick();}
function lookRead(){if(!lookStart())return;const f=G.fc;if(f.read){lookGreen();return;}
  readFrame(f);lookClamp();sfx.tick();}
function lookLanding(){if(!lookStart())return;const f=G.fc;f.read=false;G.landPt=G.landPt||[G.ball.x,G.ball.y];const q=G.landPt||[G.ball.x,G.ball.y];f.tx=q[0];f.tz=q[1];f.yaw=G.aim;f.yawOff=0;scoutSetLvl(0);f.follow=true;f.pan=0;f.turn=0;lookClamp();sfx.tick();}
function groundEllipse(x,z,r,minPx){
  const y=hAt(x,z)+.02,c=proj(x,y,z);if(!c)return null;
  const fh=[V.F[0],V.F[2]];const l=hyp(fh[0],fh[1])||1;
  const a=proj(x+fh[0]/l*r,y,z+fh[1]/l*r),b=proj(x-fh[0]/l*r,y,z-fh[1]/l*r);
  let rx=r*c[3],ry=(a&&b)?Math.abs(a[1]-b[1])/2:rx*.3;
  if(rx<minPx){ry*=minPx/rx;rx=minPx;}
  return{x:c[0],y:c[1],rx,ry:Math.max(ry,1),z:c[2],k:c[3]};
}


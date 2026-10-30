/* ---- arm IK: hands onto the club, and arms kept outside the (much rounder than the actor's) torso ---- */
function r3bWP(b,o){return b.getWorldPosition(o||new THREE.Vector3());}
/* scratch for the arm IK, which runs several times a frame whenever the golfer is on screen: same sums as before, without
   a fresh vector or quaternion for every step (that garbage is what brings on the collector's pauses) */
const R3B_V3=()=>new THREE.Vector3(),R3B_Q=()=>new THREE.Quaternion();
const R3B_AIM={p:R3B_V3(),a:R3B_V3(),b:R3B_V3(),dq:R3B_Q(),wq:R3B_Q(),pq:R3B_Q()};
const R3B_IKS={hq:R3B_Q(),lq:R3B_Q(),A:R3B_V3(),E:R3B_V3(),Wr:R3B_V3(),M:R3B_V3(),W2:R3B_V3(),palm:R3B_V3(),off:R3B_V3(),T:R3B_V3(),n:R3B_V3(),pole:R3B_V3(),t:R3B_V3(),E2:R3B_V3()};
function r3bAim(bone,from,to){// rotate bone (world) so that the direction bone->from becomes bone->to
  const S=R3B_AIM,p=r3bWP(bone,S.p),a=S.a.copy(from).sub(p).normalize(),b=S.b.copy(to).sub(p).normalize();if(a.dot(b)>.99999)return;
  const dq=S.dq.setFromUnitVectors(a,b),wq=bone.getWorldQuaternion(S.wq),pq=bone.parent.getWorldQuaternion(S.pq);
  bone.quaternion.copy(pq.invert().multiply(dq.multiply(wq)));bone.updateMatrixWorld(true);}
function r3bIK(side,palmTarget){const I=R3B.idx,B=R3B.bones,up=B[I[side+'Arm']],lo=B[I[side+'ForeArm']],hd=B[I[side+'Hand']],mid=B[I[side+'HandMiddle1']],S=R3B_IKS;
  const hq=hd.getWorldQuaternion(S.hq);
  const A=r3bWP(up,S.A),E=r3bWP(lo,S.E),Wr=r3bWP(hd,S.Wr),palm=S.palm.copy(Wr).add(r3bWP(mid,S.M)).multiplyScalar(.5),off=S.off.copy(palm).sub(Wr);
  const T=S.T.copy(palmTarget).sub(off);const l1=E.distanceTo(A),l2=Wr.distanceTo(E);let d=T.distanceTo(A);const dmax=(l1+l2)*.999,dmin=Math.abs(l1-l2)+.5;
  const n=S.n.copy(T).sub(A);if(d>dmax){n.setLength(dmax);T.copy(A).add(n);d=dmax;}if(d<dmin){n.setLength(dmin);T.copy(A).add(n);d=dmin;}n.normalize();
  const pole=side==='Right'&&R3B.armPole?S.pole.copy(R3B.armPole):S.pole.copy(E).sub(A);pole.sub(S.t.copy(n).multiplyScalar(pole.dot(n)));if(pole.lengthSq()<1e-6)pole.set(0,-1,0);pole.normalize();
  const x=(l1*l1-l2*l2+d*d)/(2*d),hh=Math.sqrt(Math.max(l1*l1-x*x,0)),E2=S.E2.copy(A).add(S.t.copy(n).multiplyScalar(x)).add(pole.multiplyScalar(hh));
  r3bAim(up,E,E2);r3bAim(lo,r3bWP(hd,S.W2),T);
  const lq=lo.getWorldQuaternion(S.lq);hd.quaternion.copy(lq.invert().multiply(hq));hd.updateMatrixWorld(true);}
// body clearance against the character's own skinned torso: arm points must stay outside the torso surface,
// measured radially from the spine axis (the Boss is far rounder than the mocap actor)
function r3bTorsoInit(){const g=R3B.mesh.geometry,pt=g.attributes.part.array,si=g.attributes.skinIndex.array,sw=g.attributes.skinWeight.array,I=R3B.idx;
  const tor=new Set(['Hips','Spine','Spine1','Spine2'].map(n=>I[n]));const ids=[];
  for(let i=0;i<pt.length;i++){if(pt[i]!==0&&pt[i]!==9)continue;let w=0;for(let e=0;e<4;e++)if(tor.has(si[i*4+e]))w+=sw[i*4+e]/255;if(w>.5)ids.push(i);}
  const st=Math.max(1,Math.floor(ids.length/450));R3B.tor=ids.filter((_,k)=>k%st===0);R3B.torH=new Float32Array(R3B.tor.length*3);
  // per torso point, fixed for the character: its bind-space position and its (up to four) bones and weights
  const M=R3B.mesh,n=R3B.tor.length,v=new THREE.Vector3(),wi=new THREE.Vector4(),ww=new THREE.Vector4();R3B.torB=new Float64Array(n*3);R3B.torI=new Int32Array(n*4);R3B.torW=new Float64Array(n*4);
  for(let k=0;k<n;k++){const i=R3B.tor[k];v.fromBufferAttribute(g.attributes.position,i).applyMatrix4(M.bindMatrix);R3B.torB[k*3]=v.x;R3B.torB[k*3+1]=v.y;R3B.torB[k*3+2]=v.z;
    wi.fromBufferAttribute(g.attributes.skinIndex,i);ww.fromBufferAttribute(g.attributes.skinWeight,i);for(let e=0;e<4;e++){R3B.torI[k*4+e]=wi.getComponent(e);R3B.torW[k*4+e]=ww.getComponent(e);}}}
function r3bClear(reuse){const I=R3B.idx,B=R3B.bones,M=R3B.mesh;if(!R3B.tor)r3bTorsoInit();
  const C=R3B_CL,a0=r3bWP(B[I.Hips],C.a0),a1=r3bWP(B[I.Spine2],C.a1),ax=a1.sub(a0).normalize();
  const fw=r3bDir(I.Spine1,R3B_FWD,C.fw);fw.sub(C.t.copy(ax).multiplyScalar(fw.dot(ax))).normalize();const sd=C.sd.copy(ax).cross(fw);
  const v=C.v,polar=(p,o)=>{const d=C.d.copy(p).sub(a0),h=d.dot(ax);d.sub(C.t.copy(ax).multiplyScalar(h));o[0]=h;o[1]=Math.atan2(d.dot(sd),d.dot(fw));o[2]=d.length();return d;};
  const TH=R3B.torH,o=C.o;if(!reuse){   // skin the torso points to this pose (bind matrix is identity; the mesh's own mirror for a left-hander is left out, as three.js cancels it when it draws) (the same sums three.js does per vertex, with each bone's matrix worked out once)
    const sk=M.skeleton,TB=R3B.torB,TI=R3B.torI,TW=R3B.torW,done=C.done,mats=C.mats,b=C.b,u=C.u;done.length=0;
    for(let k=0;k<R3B.tor.length;k++){b.set(TB[k*3],TB[k*3+1],TB[k*3+2]);v.set(0,0,0);
      for(let e=0;e<4;e++){const w=TW[k*4+e];if(w!==0){const bi=TI[k*4+e];if(!done[bi]){done[bi]=true;(mats[bi]||(mats[bi]=new THREE.Matrix4())).multiplyMatrices(sk.bones[bi].matrixWorld,sk.boneInverses[bi]);}v.addScaledVector(u.copy(b).applyMatrix4(mats[bi]),w);}}
      polar(v,o);TH[k*3]=o[0];TH[k*3+1]=o[1];TH[k*3+2]=o[2];}}
  let best=0,dir=null;const P=C.P,p=C.p,q=C.q;
  for(let si=0;si<R3B_SIDES.length;si++){const side=R3B_SIDES[si];B[I[side+'Arm']].getWorldPosition(P[0]);B[I[side+'ForeArm']].getWorldPosition(P[1]);B[I[side+'Hand']].getWorldPosition(P[2]);
    for(let ci=0;ci<R3B_CLPTS.length;ci++){const cp=R3B_CLPTS[ci],i0=cp[0],i1=cp[1],t=cp[2],r=cp[3];p.copy(P[i0]).lerp(P[i1],t);const rd=polar(p,q);let R=-1;
      for(let k=0;k<R3B.tor.length;k++){if(Math.abs(TH[k*3]-q[0])>6)continue;let da=Math.abs(TH[k*3+1]-q[1]);if(da>Math.PI)da=2*Math.PI-da;if(da>.28)continue;if(TH[k*3+2]>R)R=TH[k*3+2];}
      if(R>0){const need=R+r-q[2];if(need>best){best=need;dir=C.dir.copy(rd).normalize();}}}}
  const res=C.res;res.need=best;res.fw=dir||fw;return res;}
// scratch for r3bClear (it runs up to three times a frame)
const R3B_FWD=[0,0,1],R3B_SIDES=['Left','Right'],R3B_CLPTS=[[0,1,.8,6],[1,1,0,6],[1,2,.5,5.5],[1,2,1,5]];
const R3B_CL={t:new THREE.Vector3(),sd:new THREE.Vector3(),v:new THREE.Vector3(),d:new THREE.Vector3(),b:new THREE.Vector3(),u:new THREE.Vector3(),p:new THREE.Vector3(),dir:new THREE.Vector3(),
  P:[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],o:[0,0,0],q:[0,0,0],done:[],mats:[],
  a0:new THREE.Vector3(),a1:new THREE.Vector3(),fw:new THREE.Vector3(),res:{need:0,fw:null}};
// palms onto the grip line from Hpalm along cd (rig space), pushed clear of the torso; returns the corrected grip point
const R3B_ARS={Hg:new THREE.Vector3(),cdv:new THREE.Vector3(),push:new THREE.Vector3(),g2:new THREE.Vector3(),t:new THREE.Vector3(),u:new THREE.Vector3(),Rp:new THREE.Vector3(),Rm:new THREE.Vector3()};
function r3bArms(H,cd,free){const S=R3B_ARS,Hg=S.Hg.set(H[0],H[1],H[2]),cdv=S.cdv.set(cd[0],cd[1],cd[2]),push=S.push.set(0,0,0);
  let Rp=null;if(free){const I=R3B.idx,B=R3B.bones;Rp=r3bWP(B[I.RightHand],S.Rp).add(r3bWP(B[I.RightHandMiddle1],S.Rm)).multiplyScalar(.5);if(R3B.rpOv)Rp=R3B.rpOv(Rp);}
  const set=()=>{const g2=S.g2.copy(Hg).add(push);r3bIK('Left',g2);r3bIK('Right',free?S.t.copy(Rp).add(push):S.t.copy(g2).add(S.u.copy(cdv).multiplyScalar(R3B_GRIP)));return g2;};
  for(let it=0;it<(window.__noIK?0:3);it++){const c2=r3bClear(it>0);if(c2.need<.3)break;push.add(c2.fw.multiplyScalar(Math.min(c2.need,R3B.pushCap??14)));set();}
  const g=set();R3B.lastPush=push.length();return[g.x,g.y,g.z];}
const r3bT=(R,v)=>[R[0][0]*v[0]+R[0][1]*v[1]+R[0][2]*v[2],R[1][0]*v[0]+R[1][1]*v[1]+R[1][2]*v[2],R[2][0]*v[0]+R[2][1]*v[1]+R[2][2]*v[2]];      // R^T v (rows of R^T are the columns)
const r3bR=(R,v)=>[R[0][0]*v[0]+R[1][0]*v[1]+R[2][0]*v[2],R[0][1]*v[0]+R[1][1]*v[1]+R[2][1]*v[2],R[0][2]*v[0]+R[1][2]*v[1]+R[2][2]*v[2]];      // R v
// club solve for a clip and a club length (cm): directions in the lead-hand frame at address and at impact
function r3bClub(ck,Lc){const key=ck+'|'+Lc;if(R3B.cache[key])return R3B.cache[key];const c=R3B.clips[ck],q=R3B.pa,h=R3B.ha,pt=ck==='putt'?0:3;R3B.pushCap=ck==='putt'?R3B_PUTT_PUSH:null;
  const at=(t,solve)=>{r3bPose(c,t,q,h);r3bApply(q,h);const H0=r3bHands();let d=solve(H0.H),g=H0.H;
    for(let k=0;k<2;k++){r3bPose(c,t,q,h);r3bApply(q,h);r3bHands();g=r3bArms(H0.H,d);d=solve(g);}return{H:g,R:H0.R,d};};
  // impact: head on the ground, a touch behind the hands
  const I=at(c.imp,H=>{const y=H[1]-2,dx=Math.sqrt(Math.max(Lc*Lc-y*y,1));return nrm(sub([H[0]-dx,2,H[2]-pt],H));});
  const Pimp=add(I.H,mul(I.d,Lc));Pimp[1]=2;
  // address: head just behind the impact point
  const A=at(c.addr,H=>{const za=Pimp[2]-pt-H[2],y=H[1]-2,dx=Math.sqrt(Math.max(Lc*Lc-y*y-za*za,1));return nrm(sub([H[0]-dx,2,H[2]+za],H));});
  const tI=nrm(sub([0,0,1],mul(I.d,I.d[2]))),tA=nrm(sub([0,0,1],mul(A.d,A.d[2])));
  R3B.pushCap=null;return R3B.cache[key]={dI:r3bT(I.R,I.d),dA:r3bT(A.R,A.d),fI:r3bT(I.R,tI),fA:r3bT(A.R,tA),Pimp};}
function r3bBackT(c,x){const t=clamp(x,0,1)*20,i=Math.floor(t),a=t-i;return i>=20?c.bt[20]:c.bt[i]*(1-a)+c.bt[i+1]*a;}
const R3B_GRIP=8.5;
// backswing shape: wrist set happens between these shares of the backswing; hands pushed out this far (cm) through the takeaway
const R3B_SET=[.32,.72],R3B_WIDTH=9;
// address reference for the backswing set: lead forearm orientation and club direction at address (rig space), per clip and club length
function r3bAddrRef(ck,c,S,Lc){const key='ar|'+ck+'|'+Math.round(Lc);if(R3B.cache[key])return R3B.cache[key];
  r3bPose(c,c.addr,R3B.pb,R3B.hb);r3bApply(R3B.pb,R3B.hb);const h=r3bHands(),I=R3B.idx;
  return R3B.cache[key]={q:R3B.bones[I.LeftForeArm].getWorldQuaternion(new THREE.Quaternion()),cd:r3bR(h.R,S.dA)};}
// putting: arms hang (little torso-clearance push) and a slightly shorter shaft from the lead palm, so he stands
// over the ball with the putter fairly upright instead of reaching for it
let R3B_PUTT_L=.80,R3B_PUTT_PUSH=0;
const R3B_RELAX=1.0;
const R3B_TWIRL_FT=10;   // twirl when the pure approach finishes within this many feet
const R3B_TWIRL_T=.85,R3B_TWIRL_N=1,R3B_TWIRL_HOLD=.6;   // club twirl after a pure approach that comes down close (G.twirl): seconds, turns
/* the birdie fist pump: the free (right) hand comes up to shoulder height, two sharp pulls down, a beat, then back.
   Keys are palm offsets from the right shoulder in the body frame [up, forward, out to the side] (cm). */
/* v71 rework, after the classic golf celebration (the "uppercut" fist pump): the fist drops and cocks low by the hip, drives up
   through an uppercut to chin height in front, then yanks down and back to the hip with the elbow driving into the side; twice,
   the second the bigger yank, held clenched for a beat. The whole body goes with it: knees bend and the hips drop into a crouch,
   the chest folds over a little, and each yank bounces the crouch deeper. */
const R3B_PUMP=[[0,'rest'],[.28,[-34,4,12]],[.46,[2,20,4]],[.6,[-16,15,6]],[.76,[0,19,5]],[.92,[-18,14,7]],[1.6,[-17,14,7]],[2.2,'rest']];
const R3B_PUMP_DROP=10,R3B_PUMP_FLEX=.2;   // crouch: hip drop (cm) and chest fold (rad) at full weight
function r3bCrouchW(t){const g=(c,w)=>Math.exp(-(((t-c)/w)**2));return clamp(smooth(.18,.5,t)*(1-smooth(1.55,2.15,t))+.35*g(.62,.07)+.45*g(.94,.08),0,1.4);}
// two-bone leg IK: put the foot (ankle) back on its spot after the hips drop, knee bending forward
function r3bLegIK(side,T){const I=R3B.idx,B=R3B.bones,up=B[I[side+'UpLeg']],lo=B[I[side+'Leg']],ft=B[I[side+'Foot']];if(!up||!lo||!ft)return;
  const fq=ft.getWorldQuaternion(new THREE.Quaternion()),A=r3bWP(up),E=r3bWP(lo),F=r3bWP(ft);
  const l1=E.distanceTo(A),l2=F.distanceTo(E);let d=T.distanceTo(A);const n=T.clone().sub(A);const dmax=(l1+l2)*.999;if(d>dmax)d=dmax;n.normalize();
  const fw=r3bDir(I.Spine2,[0,0,1]);fw.y=0;fw.normalize();
  const pole=E.clone().sub(A).addScaledVector(fw,8);pole.sub(n.clone().multiplyScalar(pole.dot(n)));if(pole.lengthSq()<1e-6)pole.copy(fw);pole.normalize();
  const x=(l1*l1-l2*l2+d*d)/(2*d),hh=Math.sqrt(Math.max(l1*l1-x*x,0)),E2=A.clone().add(n.clone().multiplyScalar(x)).add(pole.multiplyScalar(hh)),Tt=A.clone().add(n.clone().multiplyScalar(d));
  r3bAim(up,E,E2);r3bAim(lo,r3bWP(ft),Tt);const lq=lo.getWorldQuaternion(new THREE.Quaternion());ft.quaternion.copy(lq.invert().multiply(fq));ft.updateMatrixWorld(true);}
function r3bPumpW(t){return smooth(.05,.3,t)*(1-smooth(1.6,2.1,t));}
// celebrations on slimmer bodies: the mocap's free forearm splays out to the side (the Boss's belly turns it in),
// so swing the free hand in across the front of the body, keeping the elbow where it is
let R3B_TUCK=.8,R3B_FIST=.5;
function r3bTuckHand(Rp){const I=R3B.idx,B=R3B.bones,A=r3bWP(B[I.RightArm]),E=r3bWP(B[I.RightForeArm]),sd=A.clone().sub(r3bWP(B[I.LeftArm])).normalize(),
  up=r3bWP(B[I.Neck]).sub(r3bWP(B[I.Hips])).normalize(),fw=new THREE.Vector3().crossVectors(up,sd).normalize(),d=Rp.clone().sub(E),s=d.dot(sd)+.15*d.length();
  let P=Rp;if(s>0){const L=d.length(),n=d.addScaledVector(sd,-s*R3B_TUCK).addScaledVector(fw,s*R3B_TUCK*.5);n.setLength(L);P=E.clone().add(n);}
  // a raised hand comes in to a compact fist in front of the chest instead of hanging out at arm's length
  const al=E.distanceTo(A)+r3bWP(B[I.RightHand]).distanceTo(E),h=P.clone().sub(A).dot(up),w=R3B_FIST*smooth(-.75*al,-.4*al,h)*(1-smooth(-.2*al,0,h));   // (not a hand raised to wave or wipe the brow)
  if(w<=0)return P;const C=A.clone().addScaledVector(fw,.38*al).addScaledVector(up,-.3*al).addScaledVector(sd,-.12*al);return P.lerp(C,w);}
function r3bPumpHand(Rp,t){const I=R3B.idx,B=R3B.bones,S=r3bWP(B[I.RightArm]),Ls=r3bWP(B[I.LeftArm]);
  const sd=S.clone().sub(Ls);sd.y=0;sd.normalize();const fw=r3bDir(I.Spine2,[0,0,1]);fw.y=0;fw.normalize();
  const at=k=>{const v=R3B_PUMP[k][1];return v==='rest'?Rp.clone():S.clone().add(new THREE.Vector3(0,v[0],0)).addScaledVector(fw,v[1]).addScaledVector(sd,v[2]);};
  R3B.armPole=t>.12&&t<2.1?new THREE.Vector3(0,-1,0).addScaledVector(fw,-.55):null;
  const K=R3B_PUMP;if(t<=0)return Rp;let k=0;while(k<K.length-2&&t>K[k+1][0])k++;const u=smooth(K[k][0],K[k+1][0],Math.min(t,K[K.length-1][0]));
  const p=at(k).lerp(at(k+1),u);if(t>.95&&t<1.55)p.y+=Math.sin(t*38)*.8;return p;}   // a little shake in the clenched pull
// clench the right hand (finger curl about each joint's local axis)
// rotate one bone's local quaternion by a small angle about a local axis (q * dq)
function r3bRotL(q,k,ax,ang){ax=r3bAx(k,ax);const s=Math.sin(ang/2),c=Math.cos(ang/2),x=q[k*4],y=q[k*4+1],z=q[k*4+2],ww=q[k*4+3],ux=ax[0]*s,uy=ax[1]*s,uz=ax[2]*s;
  q[k*4]=ww*ux+x*c+y*uz-z*uy;q[k*4+1]=ww*uy-x*uz+y*c+z*ux;q[k*4+2]=ww*uz+x*uy-y*ux+z*c;q[k*4+3]=ww*c-x*ux-y*uy-z*uz;}
function r3bFist(q,w){if(w<=0)return;const I=R3B.idx;
  const rot=(k,ax,ang)=>{ax=r3bAx(k,ax);const s=Math.sin(ang/2),c=Math.cos(ang/2),x=q[k*4],y=q[k*4+1],z=q[k*4+2],ww=q[k*4+3],ux=ax[0]*s,uy=ax[1]*s,uz=ax[2]*s;
    q[k*4]=ww*ux+x*c+y*uz-z*uy;q[k*4+1]=ww*uy-x*uz+y*c+z*ux;q[k*4+2]=ww*uz+x*uy-y*ux+z*c;q[k*4+3]=ww*c-x*ux-y*uy-z*uz;};
  for(const f of['Index','Middle','Ring','Pinky'])for(const j of[1,2,3])rot(I['RightHand'+f+j],R3B_FIST_AX,(j===1?1.2:1.35)*w);
  for(const j of[2,3])rot(I['RightHandThumb'+j],R3B_FIST_AX,.5*w);}
let R3B_FIST_AX=[0,0,1];   // seconds into the post-swing clip a held finish relaxes to (club down, watching)
// idle life on held poses: a slow breath through the chest and a faint weight shift (w: 0..1)
function r3bBreathe(q,h,w){const I=R3B.idx,ph=T*1.9,a=Math.sin(ph)*.012*w,b=Math.sin(T*.73+1)*.006*w;
  const rot=(k,ax,ang)=>{ax=r3bAx(k,ax);const s=Math.sin(ang/2),c=Math.cos(ang/2),x=q[k*4],y=q[k*4+1],z=q[k*4+2],ww=q[k*4+3],ux=ax[0]*s,uy=ax[1]*s,uz=ax[2]*s;   // q * dq (local axis)
    q[k*4]=ww*ux+x*c+y*uz-z*uy;q[k*4+1]=ww*uy-x*uz+y*c+z*ux;q[k*4+2]=ww*uz+x*uy-y*ux+z*c;q[k*4+3]=ww*c-x*ux-y*uy-z*uz;};
  rot(I.Spine1,[1,0,0],-a*.6);rot(I.Spine2,[1,0,0],-a);rot(I.Neck,[1,0,0],a*.8);rot(I.Spine,[0,1,0],b);h[1]+=Math.sin(ph)*.25*w;h[0]+=Math.sin(T*.73+1)*.35*w;}   // cm from the lead palm down the grip to the trail palm
const R3B_CFG={full:['drive',1,1],flop:['drive',1,1],punch:['drive',.6,.5],pitch:['chip',1,1],chip:['chip',.62,.62],spin:['chip',1,1],splash:['drive',.8,.85],pick:['chip',1,1],blast:['drive',.65,.7]};
// returns false when the character is not available (the old figure is drawn instead)
function r3Golfer(ga){R3B.ballAt=null;if(!R3B.mesh||(G.aiTurn&&!G.aiChar))return false;   // original-ladder rivals keep their jointed figure; Challenge V2 rivals are golfers
  const club=G.state==='aim'||aimingState()?G.clubIdx:(G.swingClub??G.clubIdx),putt=club===PUTTER,type=aimingState()?G.stype:(G.swingType||'full');
  const[ck,back,end]=putt?['putt',1,1]:(R3B_CFG[type]||R3B_CFG.full);const c=R3B.clips[ck],m=G.meter;
  const Lm=putt?R3B_PUTT_L:clubLen(club)*.9,Lc=Lm*100/.94;const S=r3bClub(ck,Math.round(Lc));
  const qa=R3B.pa,ha=R3B.ha,qb=R3B.pb,hb=R3B.hb;let wI=0;   // wI: club direction blend, address (0) -> impact (1)
  const bFrac=b=>putt?.12+.88*b:b*back;
  let routine=null,post=false,hold=0,twU=-1,wU=0,wW=0;const SP=R3B.bsp||(R3B.bsp={x:0,v:0,T:-9,live:false,xs:1,X:null});
  if(G.state==='aim'&&!G.aiTurn&&R3R.on&&Math.abs(G.aim-R3R.aim)>1e-4)R3R.on=false;          // the player started aiming: skip the routine
  if(R3R.on&&G.state==='aim'&&r3RoutineKey()!==R3R.key)R3R.on=false;
  if(G.state==='aim'&&!R3R.on){const want=r3RoutineWanted(),key=r3RoutineKey();if(want&&key!==R3R.key){R3R.key=key;Object.assign(R3R,r3RoutineBuild(want,S,ck),{on:true,t:0,seg:null,aim:G.aim});}}
  const dtR=clamp(T-(R3R.tPrev??T),0,.1);R3R.tPrev=T;
  if(G.state==='aim'&&R3R.on)routine=r3RoutinePose(dtR,ck,S,qa,ha);
  const swingSeg=!!(routine&&routine.swing);if(swingSeg)wI=routine.wI||0;
  R3B.rpOv=null;R3B.armPole=null;
  if(routine){}
  else if(r3PostLive(dtR)){const P=R3R.post,r=P.r,pc=R3B.clips[r.clip];
    if(!P.X){const fin=r3bHipAt(ck,c.fin),st=r3bHipAt(r.clip,pc.t0+r.t0);P.X=r3bAlign(st,fin,r.face?-st.yaw:undefined);}
    const tt=r.twirl?Math.min(Math.max(0,P.t-R3B_TWIRL_HOLD)*.8,R3B_RELAX):Math.max(0,Math.min(P.t,r.loop?r.dur-.001:1e9)),Lp=(pc.n-1)/pc.fps-r.t0;r3bPose(pc,pc.t0+r.t0+(r.loop?tt%Lp:tt),qa,ha);
    if(r.twirl)twU=clamp((P.t-R3B_TWIRL_HOLD)/R3B_TWIRL_T,0,1);
    R3B.rpOv=r.pump?(Rp=>r3bPumpHand(Rp,P.t)):R3B.cid!=='boss'?r3bTuckHand:null;if(r.pump)r3bFist(qa,r3bPumpW(P.t));
    if(r.travel){const k=Math.floor(tt/Lp),H=pc.HIP,e=(pc.n-1)*3;ha[0]+=k*(H[e]-H[0]);ha[2]+=k*(H[e+2]-H[2]);}
    r3bXf(qa,ha,P.X);wI=1;post=true;
    if(r.blendIn&&P.t<r.blendIn){r3bPose(c,c.fin,qb,hb);r3bBlend(qa,ha,qb,hb,1-smooth(0,r.blendIn,P.t));}   // ease out of the stroke's finish
    R3B.footT=null;if(r.pump){const cw=r3bCrouchW(P.t);if(cw>.001){const I=R3B.idx,B=R3B.bones;   // feet stay put while he sinks into the crouch
      r3bApply(qa,ha);R3B.root.matrix.identity();R3B.root.matrixWorld.identity();B[0].updateMatrixWorld(true);R3B.footT=[r3bWP(B[I.LeftFoot]),r3bWP(B[I.RightFoot])];
      ha[1]-=R3B_PUMP_DROP*cw;r3bRotL(qa,I.Spine,[1,0,0],R3B_PUMP_FLEX*.35*cw);r3bRotL(qa,I.Spine1,[1,0,0],R3B_PUMP_FLEX*.35*cw);r3bRotL(qa,I.Spine2,[1,0,0],R3B_PUMP_FLEX*.3*cw);r3bRotL(qa,I.Neck,[1,0,0],-R3B_PUMP_FLEX*.4*cw);}}}   // (travel: root motion carries over from loop to loop)
  else if(aimingState()){const b=swAfter()?0:G.state==='power'?(m.pos-IMPACT)/(1-IMPACT):G.state==='acc'?(typeof p2m==='function'?p2m(m.power):m.power):0;
    // the backswing chases the meter on a soft spring (a little lag, a small settle at the top) instead of being scrubbed by it
    if(G.state==='aim'){SP.x=0;SP.v=0;}else{const tg=clamp(b,0,1),K=150,D=2*Math.sqrt(K)*.6;for(let n=Math.ceil(dtR/.008),i=0;i<n;i++){const h=dtR/n;SP.v+=(K*(tg-SP.x)-D*SP.v)*h;SP.x+=SP.v*h;}}
    SP.T=T;SP.live=false;r3bPose(c,r3bBackT(c,bFrac(clamp(SP.x,0,1.04))),qa,ha);
    if(!putt){const xb=bFrac(clamp(SP.x,0,1));wU=1-smooth(R3B_SET[0],R3B_SET[1],xb);wW=smooth(.04,.3,xb)*(1-smooth(.72,1,xb));}hold=G.state==='aim'?1:G.state==='acc'?.5:0;}
  else if(G.followT>0){const la0=G.launchAt||(putt?PUTT_IMPACT:IMPACT_T),bk=Math.max(0,la0-(putt?PUTT_IMPACT:IMPACT_T)),fT=G.followT-bk,la=la0-bk,b0=clamp(G.swingBack||1,0,1);
    if(bk>.001&&!SP.live){SP.live=true;SP.xs=b0;}   // swing test: the backswing is played below, after the tap
    if(!SP.live){SP.live=true;SP.xs=T-SP.T<.3?clamp(SP.x,0,1):b0;}
    const x=bFrac(SP.xs),tb=r3bBackT(c,x);
    // downswing: partial swings drop into the real downswing part-way down (no rewind along the backswing path)
    if(fT<0){const xb=bFrac(b0*smooth(0,1,1+fT/bk));r3bPose(c,r3bBackT(c,xb),qa,ha);if(!putt){wU=1-smooth(R3B_SET[0],R3B_SET[1],xb);wW=smooth(.04,.3,xb)*(1-smooth(.72,1,xb));}}
    else if(fT<la){const u=fT/la,tm=c.top+(c.imp-c.top)*clamp(1-x,0,1)*.85;r3bPose(c,tm+(c.imp-tm)*u,qa,ha);r3bPose(c,tb,qb,hb);r3bBlend(qa,ha,qb,hb,1-smooth(0,.4,u));wI=smooth(.2,1,u);
      if(!putt){const k=1-smooth(0,.4,u);wU=(1-smooth(R3B_SET[0],R3B_SET[1],x))*k;wW=smooth(.04,.3,x)*(1-smooth(.72,1,x))*k;}}
    // follow-through: real-time out of impact, easing into the finish rather than stopping dead
    else{const tEnd=c.imp+(c.fin-c.imp)*(putt?.3+.7*b0:end),sp=Math.max(tEnd-c.imp,.05),z=(fT-la)/sp,zz=z<.7?z:.7+.3*(1-Math.exp(-(z-.7)/.3));
      r3bPose(c,c.imp+sp*zz,qa,ha);wI=1;const hz=clamp((z-1.4)/1.2,0,1);hold=hz;
      // a full finish is held, then relaxes: club comes down and he watches it (the start of the post-swing clip)
      const pc=R3B.clips.postswing;if(pc&&!putt&&end===1&&ck==='drive'){const t2=G.twirl?-1:fT-la-sp*1.6-1.2;if(t2>0){if(!SP.X){const fin=r3bHipAt(ck,c.fin),st=r3bHipAt('postswing',pc.t0);SP.X=r3bAlign(st,fin);}
        r3bPose(pc,pc.t0+Math.min(t2*.8,R3B_RELAX),qb,hb);r3bXf(qb,hb,SP.X);r3bBlend(qa,ha,qb,hb,smooth(0,.6,t2));}}}}
  else{r3bPose(c,c.addr,qa,ha);hold=1;}
  if(!(G.followT>0)||aimingState())SP.X=null;
  if(hold>0&&!swingSeg)r3bBreathe(qa,ha,hold);
  const AR=(wU>.001||wW>.001)?r3bAddrRef(ck,c,S,Lc):null;
  r3bApply(qa,ha);const hd0=r3bHands();if(post&&R3B.footT){r3bLegIK('Left',R3B.footT[0]);r3bLegIK('Right',R3B.footT[1]);}const hd=hd0;
  // the club comes from the lead hand's frame; both palms are then put on the grip, pushed clear of the body
  const slerpV=(a,b,w)=>nrm(lerp3(a,b,w));const dl=slerpV(S.dA,S.dI,wI),fl=slerpV(S.fA,S.fI,wI);
  let cdR=r3bR(hd.R,dl);const twirling=twU>0&&twU<1;
  // backswing width: the club stays set at its address angle to the lead forearm through the takeaway (no early wrist cock)
  // and only hinges from about halfway back; the hands are pushed out away from the chest so the arc stays wide
  if(AR){const I=R3B.idx,B=R3B.bones;
    if(wU>.001){const qN=B[I.LeftForeArm].getWorldQuaternion(new THREE.Quaternion()),dq=qN.multiply(AR.q.clone().invert()),v=new THREE.Vector3(...AR.cd).applyQuaternion(dq);cdR=nrm(lerp3(cdR,[v.x,v.y,v.z],wU));}
    if(wW>.001){const ch=r3bWP(B[I.Spine2]),d=new THREE.Vector3(hd.H[0]-ch.x,hd.H[1]-ch.y,hd.H[2]-ch.z).normalize();hd.H=[hd.H[0]+d.x*R3B_WIDTH*wW,hd.H[1]+d.y*R3B_WIDTH*wW,hd.H[2]+d.z*R3B_WIDTH*wW];}}
  // the club twirl: the trail hand lets go and the club spins once round the lead forearm as it comes down from the finish
  if(twirling){const I=R3B.idx,B=R3B.bones,ax=r3bWP(B[I.LeftHand]).sub(r3bWP(B[I.LeftForeArm])).normalize(),th=TAU*R3B_TWIRL_N*smooth(0,1,twU);
    const v=new THREE.Vector3(...cdR).applyAxisAngle(ax,th);cdR=[v.x,v.y,v.z];}
  R3B.pushCap=putt&&!post&&!(routine&&!swingSeg)?R3B_PUTT_PUSH:null;hd.H=r3bArms(hd.H,cdR,!!((routine&&!swingSeg)||post||twirling));R3B.pushCap=null;const push={length:()=>R3B.lastPush};
  // place the rig so that the impact point lands on the ball: rig x -> away from the ball, y up, z -> target
  // a left-hander (lg.lefty) is the whole rig mirrored across the target line: he stands on the other side of the ball and swings the other way
  const sg=R3B.lg&&R3B.lg.lefty?-1:1;if(R3B.mesh.scale.x!==sg)R3B.mesh.scale.x=sg;   // the mesh's own mirror only flips which faces are front (it cancels in the skinning)
  const[ax,az]=dirOf(ga.aim),u=[ax,0,az],f=[-az*sg,0,ax*sg],k=.94/100;const P=S.Pimp;
  const bx=ga.x,bz=ga.y,ox=bx-(P[0]*-f[0]+P[2]*u[0])*k,oz=bz-(P[0]*-f[2]+P[2]*u[2])*k,oy=hAt(bx,bz)-.02;R3B.org=[ox,oy,oz,bx,bz];
  const X=[-f[0]*k,0,-f[2]*k],Y=[0,k,0],Z=[u[0]*k,0,u[2]*k];
  R3B.root.matrix.set(X[0],Y[0],Z[0],ox, X[1],Y[1],Z[1],oy, X[2],Y[2],Z[2],oz, 0,0,0,1);R3B.root.matrixWorld.copy(R3B.root.matrix);R3B.bones[0].updateMatrixWorld(true);
  R3B.mesh.visible=true;{const e=R3B.bones[0].matrixWorld.elements;R3B.hipW=[e[12],e[13],e[14]];}
  // look/outfit tint
  const LK=G.look||LOOK_ME,TU=R3B.TU,tc=(u2,hex,s)=>{const c2=hexc(hex);u2.value.set(c2[0],c2[1],c2[2],s);};
  const tw=R3B.cid==='boss'?1:0;
  if(R3B.lg){const Lg=R3B.lg;tc(TU.tTop,Lg.top,1);tc(TU.tPants,Lg.pants,.94);tc(TU.tHat,'#ffffff',0);tc(TU.tShoe,Lg.shoe||'#f4f4f2',Lg.shoe?.85:0);
    tc(TU.tSock,Lg.sock||Lg.pants,Lg.sock?.9:.88);tc(TU.tSock2,Lg.sock2||'#ffffff',Lg.sock2?1:0);tc(TU.tLeg,Lg.pants,.97);tc(TU.tHair,Lg.hair||'#ffffff',Lg.hair?.95:0);tc(TU.tPlaid,Lg.plaid||'#ffffff',Lg.plaid?1:0);TU.tHide.value=1;TU.tHideY.value=R3B.hideY??-1e9;}
  else{tc(TU.tTop,LK.top,.85*tw);tc(TU.tPants,LK.pants,.8*tw);tc(TU.tHat,LK.hat,.85*tw);TU.tShoe.value.w=0;TU.tSock.value.w=0;TU.tSock2.value.w=0;TU.tLeg.value.w=0;TU.tHair.value.w=0;TU.tPlaid.value.w=0;TU.tHide.value=0;}
  // club: lead-hand frame direction, blended from its address solve to its impact solve through the downswing
  const W=p=>[ox+(p[0]*X[0]+p[2]*Z[0]),oy+p[1]*k,oz+(p[0]*X[2]+p[2]*Z[2])],Wd=v=>nrm([v[0]*X[0]+v[2]*Z[0],v[1]*k,v[0]*X[2]+v[2]*Z[2]]);
  let cd=Wd(cdR);const fd0=Wd(r3bR(hd.R,fl)),grip=W(hd.H);
  // routines: carry the club calmly (shaft angled down and ahead, smoothed, never below the turf), easing into the address angle at the end
  if((routine&&!swingSeg)||(post&&!R3R.post.r.twirl)){const fv=r3bDir(0,[0,0,1]),fw=nrm([fv.x,0,fv.z]);let tgt=nrm(add(mul(fw,.5),[0,-.87,0]));
    if(routine&&routine.blend){const left=routine.t1-(routine.t0+(R3R.t-routine.at)),w=1-clamp(left/.9,0,1);tgt=nrm(lerp3(tgt,cd,w*w));}
    const k=1-Math.exp(-dtR*7);R3B.cdS=R3B.cdS&&R3B.cdS.on?R3B.cdS:{on:true,v:tgt};R3B.cdS.v=nrm(lerp3(R3B.cdS.v,tgt,k));cd=R3B.cdS.v;
    const gy=hAt(grip[0],grip[2])+.03;if(grip[1]+cd[1]*Lm<gy){const dy=clamp((gy-grip[1])/Lm,-1,1),hz=Math.hypot(cd[0],cd[2])||1,sh=Math.sqrt(1-dy*dy);cd=[cd[0]/hz*sh,dy,cd[2]/hz*sh];}
    // the tee-up: the ball rides in his right hand until he sets it down
    if(routine&&routine.clip==='teeup'&&routine.t0+(R3R.t-routine.at)<R3B.clips.teeup.mark[0]){const I=R3B.idx,a=R3B.bones[I.RightHand].matrixWorld.elements,b2=R3B.bones[I.RightHandMiddle1].matrixWorld.elements;
      R3B.ballAt=[(a[12]+b2[12])/2,(a[13]+b2[13])/2-.03,(a[14]+b2[14])/2];}}
  else if(R3B.cdS)R3B.cdS.on=false;
  const chead=add(grip,mul(cd,Lm));
  R3B.dbg={grip,chead,ball:[bx,hAt(bx,bz),bz],wI,S,push:push.length()};const fd=nrm(sub(fd0,mul(cd,dot3(fd0,cd))));const C_SHAFT=hexc('#c9d3da'),C_HEAD=hexc('#23292e');
  cylAB(add(grip,mul(cd,-.04)),chead,.011,C_SHAFT);cylAB(add(grip,mul(cd,-.045)),add(grip,mul(cd,.2)),.015,hexc('#1d1f22'));
  const toe=mul(nrm(cross(cd,fd)),sg);
  drawClubHead(chead,cd,fd,toe,CLUBS[club],grip);
  return true;}

/* ===================== pre- and post-shot routines with broadcast cuts =====================
   Tee shots: tee-up, then the walk-in set-up. Putts outside 8 ft: a read (standing or crouched) then the walk-in.
   Each routine segment is laid down so it ends exactly on the swing's address (or, for the tee-up, so the ball
   goes down exactly where the ball sits); the cuts between segments hide the jumps. Any tap skips straight to
   the shot. After a tee shot, once the ball stops, the camera cuts back to the golfer collecting his tee. */
const R3R={on:false,key:null,post:{on:false,t:0,E:null}};
function r3bYaw(q4,k){const x=q4[k*4],y=q4[k*4+1],z=q4[k*4+2],w=q4[k*4+3];const fx=2*(x*z+w*y),fz=1-2*(x*x+y*y);return Math.atan2(fx,fz);}
function r3bHipAt(ck,t){const c=R3B.clips[ck],q=R3B.pb,h=R3B.hb;r3bPose(c,t,q,h);return{p:[h[0],h[1],h[2]],yaw:r3bYaw(q,0)};}
function r3bAlign(src,dst,th){if(th===undefined)th=dst.yaw-src.yaw;const c=Math.cos(th),s=Math.sin(th),rx=src.p[0]*c+src.p[2]*s,rz=-src.p[0]*s+src.p[2]*c;return{th,c,s,tx:dst.p[0]-rx,tz:dst.p[2]-rz};}
// carry a pose through a yaw + slide on the floor (applied to the hips bone)
function r3bXf(q,h,X){if(!X)return;const x=h[0],z=h[2];h[0]=x*X.c+z*X.s+X.tx;h[2]=-x*X.s+z*X.c+X.tz;
  const hy=Math.sin(X.th/2),hw=Math.cos(X.th/2),a=q[0],b=q[1],cq=q[2],d=q[3];   // qy * q
  q[0]=hw*a+hy*cq;q[1]=hw*b+hy*d;q[2]=hw*cq-hy*a;q[3]=hw*d-hy*b;}
const R3R_PUTTS={preputt:[[1.0,5.0],[8.6,10.8]],preputt2:[[1.4,6.0],[8.4,10.6]]};
function r3RoutineWanted(){if(G.state!=='aim'||G.fc||G.overview||G.replay||!G.hole||(G.hole.range&&G.rangeN))return null;
  if(G.strokes===0&&G.lie==='tee'&&G.clubIdx!==PUTTER){if(G.hole.par===3){if(R3R.p3For!==G.hole){R3R.p3For=G.hole;R3R.p3Yes=window.__p3force??Math.random()<.35;}if(R3R.p3Yes)return'p3';}return'tee';}
  if(G.clubIdx===PUTTER&&G.lie==='green'&&pinDist()>8/3)return'putt';return null;}
function r3RoutineKey(){return[G.hi,G.strokes,G.ball.x.toFixed(2),G.ball.y.toFixed(2),G.aiTurn?1:0].join('|');}
function r3RoutineSkip(){if(!R3R.on)return false;R3R.on=false;return true;}
function r3RoutineBusy(){if(R3R.on&&(G.aiSkip||G.state!=='aim'))R3R.on=false;return R3R.on;}
// build the segment list for this shot (rig space alignments need the club solve for the address and ball spot)
/* par 3s, some of the time: the full routine from a real round (phone video, tracked, then laid onto the swing clip):
   tee it up, a run of rehearsal swings beside the ball, the walk-in, then a long, still settle over it. A tap skips it, like the others. */
const R3_P3REH=[0,0,0,-.01,-.01,-.02,-.04,-.05,-.06,-.08,-.09,-.09,-.1,-.1,-.1,-.09,-.09,-.08,-.08,-.08,-.08,-.09,-.1,-.12,-.15,-.18,-.21,-.24,-.28,-.31,-.34,-.37,-.4,-.43,-.45,-.46,-.48,-.49,-.49,-.49,-.49,-.48,-.48,-.47,-.46,-.44,-.43,-.42,-.41,-.4,-.39,-.39,-.39,-.39,-.39,-.39,-.4,-.41,-.42,-.43,-.44,-.46,-.47,-.48,-.49,-.49,-.49,-.49,-.49,-.48,-.47,-.46,-.44,-.42,-.4,-.38,-.36,-.33,-.3,-.27,-.24,-.21,-.18,-.15,-.12,-.09,-.06,-.04,-.03,-.01,-.01,0,0,0,0,0,0,0,0,0,0,0,-.01,-.01,-.02,-.03,-.05,-.08,-.12,-.16,-.2,-.25,-.3,-.36,-.4,-.45,-.49,-.52,-.55,-.57,-.58,-.59,-.6,-.59,-.59,-.58,-.56,-.54,-.51,-.48,-.44,-.4,-.36,-.32,-.27,-.22,-.18,-.13,-.09,-.06,-.04,-.02,0,.01,.03,.04,.06,.07,.08,.09,.1,.1,.1,.09,.08,.07,.06,.04,.03,.02,.01,.01,0,0,0,-.01,-.02,-.03,-.06,-.09,-.13,-.19,-.24,-.31,-.37,-.43,-.48,-.53,-.56,-.59,-.6,-.61,-.62,-.62,-.62,-.61,-.6,-.59,-.57,-.56,-.55,-.53,-.52,-.51,-.5,-.49,-.49,-.49,-.49,-.5,-.51,-.52,-.54,-.56,-.59,-.61,-.64,-.67,-.7,-.72,-.73,-.74,-.74,-.74,-.73,-.7,-.67,-.63,-.58,-.51,-.43,-.35,-.27,-.19,-.11,-.04,.02,.07,.11,.15,.19,.22,.25,.28,.3,.32,.33,.34,.35,.35,.34,.34,.33,.32,.3,.29,.27,.25,.23,.21,.18,.16,.13,.11,.08,.06,.04,.02,0,-.02,-.05,-.09,-.14,-.21,-.28,-.35,-.42,-.49,-.55,-.6,-.64,-.67,-.69,-.7,-.7,-.7,-.69,-.67,-.65,-.63,-.6,-.58,-.55,-.53,-.51,-.49,-.48,-.48,-.47,-.47,-.48,-.49,-.5,-.52,-.54,-.57,-.59,-.62,-.65,-.68,-.7,-.71,-.71,-.71,-.69,-.67,-.64,-.6,-.55,-.48,-.41,-.34,-.26,-.19,-.13,-.07,-.03,.01,.04,.07,.09,.11,.13,.15,.16,.16,.16,.16,.15,.14,.13,.11,.09,.07,.05,.03,.01,0,-.02,-.05,-.09,-.14,-.2,-.27,-.35,-.42,-.48,-.54,-.59,-.62,-.64,-.66,-.66,-.66,-.64,-.61,-.57,-.52,-.45,-.37,-.29,-.21,-.13,-.06,0,.05,.09,.13,.17,.2,.23,.26,.28,.3,.31,.32,.33,.34,.34,.34,.33,.33,.32,.31,.3,.29,.28,.26,.25,.23,.22,.2,.19,.18,.16,.15,.14,.13,.12,.1,.09,.08,.07,.05,.04,.03,.02,.02,.01,.01,0,0,0,0];
function r3RoutineBuild(kind,S,ck){const segs=[];
  if(kind==='tee'){const dc=R3B.clips[ck];const addr=r3bHipAt(ck,dc.addr),end=r3bHipAt('setup',6.0);const XB=r3bAlign(end,addr);
    const mk=R3B.clips.teeup.mark;const XA=r3bAlign({p:mk[1],yaw:0},{p:S.Pimp,yaw:0},XB.th);
    segs.push({clip:'teeup',t0:.3,t1:4.2,X:XA,cam:'tee'},{clip:'setup',t0:1.0,t1:6.0,X:XB,cam:'dtl',blend:.45});}
  else if(kind==='p3'){const dc=R3B.clips[ck];const addr=r3bHipAt(ck,dc.addr),end=r3bHipAt('setup',6.0);const XB=r3bAlign(end,addr);
    const mk=R3B.clips.teeup.mark;const XA=r3bAlign({p:mk[1],yaw:0},{p:S.Pimp,yaw:0},XB.th),n=R3_P3REH.length;
    segs.push({clip:'teeup',t0:.3,t1:4.2,X:XA,cam:'tee'},
      {clip:'drive',t0:0,t1:(n-1)/30,X:{th:0,c:1,s:0,tx:42,tz:-105},cam:'reh',scrub:R3_P3REH,swing:true},
      {clip:'setup',t0:2.4,t1:6.0,X:XB,cam:'dtl',blend:.45},
      {clip:ck,t0:dc.addr,t1:dc.addr+6.4,X:null,cam:'face',hold:true,swing:true});}
  else{const nm=Math.random()<.5?'preputt':'preputt2',P=R3R_PUTTS[nm],addr=r3bHipAt(ck,R3B.clips[ck].addr),end=r3bHipAt(nm,P[1][1]);const X=r3bAlign(end,addr);
    segs.push({clip:nm,t0:P[0][0],t1:P[0][1],X,cam:'read'},{clip:nm,t0:P[1][0],t1:P[1][1],X,cam:'putt',blend:.45});}
  let t=0;for(const s of segs){s.at=t;t+=s.t1-s.t0;}return{segs,dur:t};}
// pose for the routine at its own clock; returns the segment (or null when finished)
function r3RoutinePose(dt,ck,S,qa,ha){const R=R3R;if(!R.on)return null;R.t+=dt;if(R.t>=R.dur){R.on=false;return null;}
  let sg=R.segs[0];for(const s of R.segs)if(R.t>=s.at)sg=s;if(sg!==R.seg){R.seg=sg;R.cutPending=true;}
  const lt=R.t-sg.at,ct=sg.hold?sg.t0:sg.t0+lt,c0=R3B.clips[sg.clip];sg.wI=0;
  if(sg.scrub){   // one smoothed swing coordinate at 30/s (u<0 backswing, u>0 through), read with a cubic so the motion stays fluid
    const A=sg.scrub,n=A.length,f=clamp(lt*30,0,n-1),i=Math.floor(f),a=f-i,at=k=>A[clamp(k,0,n-1)],u=cr4(at(i-1),at(i),at(i+1),at(i+2),a);
    const W=.07,w=smooth(-W,W,u),tb=c0.top*clamp(-u,0,1),tt=c0.imp+(c0.fin-c0.imp)*clamp(u,0,1);
    if(w<=0)r3bPose(c0,tb,qa,ha);else if(w>=1)r3bPose(c0,tt,qa,ha);
    else{r3bPose(c0,tb,qa,ha);r3bPose(c0,tt,R3B.pb,R3B.hb);r3bBlend(qa,ha,R3B.pb,R3B.hb,w);}   // through the bottom: address pose <-> impact pose
    sg.wI=w;}
  else r3bPose(c0,ct,qa,ha);
  r3bXf(qa,ha,sg.X);
  if(sg.blend){const left=sg.t1-ct;if(left<sg.blend){const c=R3B.clips[ck];r3bPose(c,c.addr,R3B.pb,R3B.hb);r3bBlend(qa,ha,R3B.pb,R3B.hb,1-left/sg.blend);}}
  return sg;}
// pick a camera spot around a subject: clear of trees, with a clear view, and with the sun behind the camera
function r3PickCam(T,dist,ht,yaws){const h=G.hole,trees=h.allTrees||h.trees||[],sh=nrm([SUN[0],0,SUN[2]]);let best=null;
  yaws.forEach((a,i)=>{const ex=T[0]+Math.sin(a)*dist,ez=T[2]-Math.cos(a)*dist;let sc=i*.6;
    const v=nrm([T[0]-ex,0,T[2]-ez]);const back=v[0]*sh[0]+v[2]*sh[2];sc+=back>0?back*9:0;   // looking into the sun: subject in silhouette
    const lie=lieAt(ex,ez);if(lie==='water')sc+=30;
    for(const t of trees){const tx=t.x-ex,tz=t.y-ez,d=Math.hypot(tx,tz);if(d<t.r+2.5)sc+=25;
      const vx=T[0]-ex,vz=T[2]-ez,vl2=vx*vx+vz*vz,k=clamp((tx*vx+tz*vz)/vl2,0,1);if(k>.05&&k<.95&&Math.hypot(ex+vx*k-t.x,ez+vz*k-t.y)<t.r*.9)sc+=15;}
    if(!best||sc<best.sc)best={sc,E:[ex,Math.max(hAt(ex,ez)+.6,T[1]+ht),ez]};});
  return best.E;}
// broadcast cameras for the routine and the post-shot cut (world space; returns a camTarget-style object)
function r3RoutineCam(){const R=R3R,P=R.post;
  if(P.on&&(G.state==='wait'||G.state==='holed')&&P.t>=0&&R3B.hipW){const h=R3B.hipW,r=P.r;
    if(!P.E){const a0=P.aim,cand=(r.cams||(r.face?[.45,-.45,.85,-.85,0,1.3,-1.3]:[.6,1.1,1.6,2.2,-.6,-1.1,-1.6,3.14,0])).map(d=>a0+d);P.E=r3PickCam([h[0],h[1],h[2]],r.dist,.45,cand);P.cut=true;}
    if(r.travel&&!P.H0)P.H0=[h[0],h[2]];const dE=r.travel?[h[0]-P.H0[0],h[2]-P.H0[1]]:[0,0];   // travelling reactions: the camera dollies alongside
    const o={E:[P.E[0]+dE[0],P.E[1],P.E[2]+dE[1]],L:[h[0],h[1]+r.ly,h[2]],cut:!!P.cut||!!r.travel,zoom:1.35};P.cut=false;return o;}
  if(P.on&&G.state!=='wait'&&G.state!=='holed')P.on=false;
  if(!R.on||!R.seg||!R3B.hipW||G.state!=='aim')return null;const sg=R.seg,h=R3B.hipW,b=[G.ball.x,hAt(G.ball.x,G.ball.y),G.ball.y],[ax,az]=dirOf(R.aim),u=[ax,0,az],f=[-az,0,ax];
  let E,L,zoom=1;
  if(sg.cam==='tee'){if(!R.teeE||R.teeSeg!==sg){R.teeSeg=sg;const a0=Math.atan2(u[0]+f[0]*.6,-(u[2]+f[2]*.6));R.teeE=r3PickCam(b,4.2,1.05,[0,.5,-.5,1,-1,1.5,2.5].map(d=>a0+d));}E=[...R.teeE];L=[(b[0]+h[0])/2,b[1]+.55,(b[2]+h[2])/2];zoom=1.15;}
  else if(sg.cam==='dtl'){E=[b[0]-u[0]*6.2-f[0]*.5,b[1]+1.6,b[2]-u[2]*6.2-f[2]*.5];L=[h[0]+u[0]*1.5,b[1]+.85,h[2]+u[2]*1.5];zoom=1.25;}
  else if(sg.cam==='reh'||sg.cam==='face'){if(!sg.camH)sg.camH=[...h];const H=sg.camH;   // a still camera while he swings (the hips move; the camera shouldn't)
    if(sg.cam==='reh'){E=[H[0]-u[0]*5.4+f[0]*.9,b[1]+1.45,H[2]-u[2]*5.4+f[2]*.9];L=[H[0]+u[0]*1.2,b[1]+.8,H[2]+u[2]*1.2];zoom=1.15;}
    else{E=[H[0]+f[0]*3.6+u[0]*.6,b[1]+1.05,H[2]+f[2]*3.6+u[2]*.6];L=[H[0],b[1]+.75,H[2]];zoom=1.2;}}
  else if(sg.cam==='read'){E=[h[0]-u[0]*2.6+f[0]*.7,b[1]+1.25,h[2]-u[2]*2.6+f[2]*.7];L=[h[0]+u[0]*3.5,b[1]+.35,h[2]+u[2]*3.5];zoom=1.1;}
  else return null;
  E[1]=Math.max(E[1],hAt(E[0],E[2])+.5);const o={E,L,cut:!!R.cutPending,zoom};R.cutPending=false;return o;}
/* ---- reactions: once the ball is settled the camera cuts back to the golfer. Tee shots: he collects his tee.
   Otherwise a nod (stuck it close, birdie), a head shake (bunker, fescue), a slump (water, OB, a missed tiddler)
   or, for an eagle or an ace, a dance. Clips: the three.js examples' Mixamo-rig Xbot and Michelle, retargeted. ---- */
const R3_REACT={tee:{clip:'postswing',t0:.6,dur:3.4,dist:4.2,ly:.2},
  nod:{clip:'nod',t0:0,dur:1.8,face:1,dist:3,ly:.5},shake:{clip:'shake',t0:.1,dur:2.3,face:1,dist:3,ly:.5},
  slump:{clip:'slump',t0:0,dur:2.4,face:1,dist:3.6,ly:.35},samba:{clip:'samba',t0:0,dur:3.8,face:1,dist:4.6,ly:.1},
  // the user's Mixamo downloads (anim/mkreact3.py)
  robot:{clip:'robot',t0:0,dur:5.6,face:1,dist:4.8,ly:.2},uprock:{clip:'uprock',t0:0,dur:3.6,face:1,dist:4.2,ly:.3,loop:1},freeze:{clip:'freeze',t0:0,dur:4.8,face:1,dist:5,ly:.1},
  break90:{clip:'break90',t0:0,dur:2,face:1,dist:4.2,ly:.3,loop:1},strut:{clip:'strut',t0:0,dur:2.8,face:1,dist:4.6,ly:.4,loop:1,travel:1,cams:[1.57,-1.57,1.25,-1.25,1.9,-1.9]},
  // v67 downloads: the putt and bad-shot clips start from the stroke's own finish, so they keep his facing (no `face`); the camera sits down the line toward the hole, where he turns to celebrate or stalks off
  puttwin:{clip:'puttwin',t0:0,dur:5.6,dist:4.2,ly:.3,cams:[-.4,0,-.8,.4,-1.2]},badshot:{clip:'badshot',t0:0,dur:4.4,dist:4.4,ly:.4,cams:[0,.4,-.4,.8,-.8]},
  angry:{clip:'angry',t0:0,dur:2.3,face:1,dist:3.2,ly:.5},
  // v94 download (Golf Putt Victory, second take): short birdie putts (12 ft and in, not a gimme): steps in, picks the ball out, raises an arm
  puttwin2:{clip:'puttwin2',t0:.2,dur:6.8,dist:4.2,ly:.3,cams:[-.4,0,-.8,.4,-1.2]},
  runman:{clip:'fastrun',t0:0,dur:1.6,face:1,dist:6.5,ly:.45,loop:1,travel:1,blendIn:.3,cams:[1.57,-1.57,1.25,-1.25,1.9,-1.9]},
  fistpump:{clip:'idle',t0:0,dur:2.3,face:1,dist:3.2,ly:.55,pump:1},
  // the club twirl after a pure approach finishes close: he holds the finish, spins the club once round the lead hand as it comes down
  twirl:{clip:'postswing',t0:0,dur:2.4,dist:4,ly:.6,twirl:1,blendIn:.5,cams:[0,.35,-.35,.7,-.7]},
  rejected:{clip:'rejected',t0:0,dur:4.6,face:1,dist:3.6,ly:.4},thinkshake:{clip:'thinkshake',t0:0,dur:3,face:1,dist:3.2,ly:.5}};
function r3ReactOK(){return!!(R3.on&&R3B.mesh&&!G.aiTurn&&!G.aiSkip&&G.golferAt&&G.mode!=='spectate'&&G.mode!=='highlight'&&!G.replay);}   // still plays (at normal speed) after a fast-forwarded shot
// start a reaction after `delay` seconds; returns how long it holds the screen (0 when it won't play)
function r3React(kind,delay){const r=R3_REACT[kind];if(!r||!r3ReactOK()||!R3B.clips[r.clip])return 0;delay=delay||0;
  R3R.post={on:true,t:-delay,E:null,aim:G.golferAt.aim,r,kind};return delay+r.dur;}
// advances the reaction clock; true while the golfer should be in his reaction
// still mid-reaction (the hole-out flow waits for the dance to finish before the replay or the card)
function r3ReactBusy(){const P=R3R.post;return!!(P&&P.on&&P.t<P.r.dur-.05&&(G.state==='wait'||G.state==='holed'));}
// a tap during a reaction: end it, and cut short the wait that was held for it (the next shot, the replay or the card comes next)
function r3SkipReact(){const P=R3R.post;if(!R3.on||!P||!P.on||(G.state!=='wait'&&G.state!=='holed'))return false;
  P.on=false;if(G.waitFn&&G.waitT>.25)G.waitT=.25;return true;}
function r3PostLive(dt){const P=R3R.post;if(!P.on)return false;if(G.state!=='wait'&&G.state!=='holed'){P.on=false;return false;}
  P.t+=dt;if(P.t>P.r.dur+.6){P.on=false;return false;}return P.t>=0;}
function r3ReactPick(){const L=lieAt(G.ball.x,G.ball.y),fl=G.fromLie,ft=pinDist()*3,coin=Math.random()<.5;
  if(G.twirl&&G.swingType!=='putt'&&L==='green'&&ft<=R3B_TWIRL_FT)return'twirl';   // pure approach, stuck close
  if(G.swingType==='putt'){const f0=hyp(G.prev.x-G.hole.pin[0],G.prev.y-G.hole.pin[1])*3;return f0<12&&ft>4?['slump','thinkshake','angry'][Math.floor(Math.random()*3)]:null;}   // a makeable putt missed (inside 4 ft is a gimme)
  if((L==='sand'&&fl!=='sand')||(L==='fescue'&&fl!=='fescue'))return coin?'shake':'thinkshake';
  if(G.lastMiss&&fl!=='green')return coin?'badshot':'thinkshake';                       // mishit
  if(L==='green'&&fl!=='green'&&ft<=6)return'strut';                      // stuck it
  if(L==='green'&&fl!=='green'&&ft<=12)return'nod';
  if(fl==='tee'&&G.lastPerf===2&&L==='fairway')return'strut';             // pured the drive down the middle
  return fl==='tee'?'tee':null;}
function r3PostCutTime(base){if(!r3ReactOK())return base;const k=r3ReactPick();if(!k)return base;return Math.max(base,r3React(k,k==='tee'?0:.35));}

/*@data R3LEAF*/

/* ===================== species trees (instanced) =====================
   Each species is a few detailed prototypes (bark limbs + filler masses + leaf cards) built once at a reference
   size and drawn with InstancedMesh: one draw per prototype part, every tree a rotated, scaled, tinted copy.
   Species follow the setting: willows and cottonwoods by the water, spruce and maples by the homes, oak-savanna
   mixes in the woods, bur oaks standing alone in the prairie, windbreak rows of spruce and pine on the links. */
const R3T={use:false,list:[],meshes:[],protos:null};
const R3T_COURSES={troy:1,stoneridge:1,caledonia:1,trueblue:1,rossbridge:1,senator:1,judge:1,legislator:1,sandvalley:1,mammoth:1,lido:1,sedge:1,wilderness:1,quarry:1,legend:1,crsc:1,crls:1,heritage:1,pawplant:1,deacon:1,lehman:1,maddens:1,pines:1,preserve:1,orangeburg:1,santee:1,wyboo:1,valley:1,ridge:1,gnlinks:1,gnlake:1,lookout:1,wigwam:1,dove:1,interlachen:1,windsong:1,hazeltine:1,slmh:1,slbm:1,mystic:1,legends:1,chaska:1,prestwick:1,royal:1,farmlinks:1,desertcanyon:1,jewel:1,ridges:1,edinburgh:1,willingers:1,northfork:1,jacks:1,dacotah:1,baker:1,kingsnorth:1,lawsonia:1,sentryworld:1,rushcreek:1};
// north woods of the Iron Range: aspen, birch, spruce and pine, some maple
const R3T_NORTH={wilderness:1,quarry:1,legend:1,deacon:1,lehman:1,maddens:1,pines:1,preserve:1,jacks:1,baker:1,lawsonia:1,sentryworld:1,rushcreek:1};
// central Wisconsin sand barrens: red and jack pine plantations with scrub oak, a little aspen and birch
const R3T_BARRENS={sandvalley:1,mammoth:1,lido:1,sedge:1};
const R3T_AZ={wigwam:1};   // Phoenix parkland resorts (filled in with the courses)
const R3T_SOUTH={rossbridge:1,senator:1,judge:1,legislator:1,crsc:1,crls:1,pawplant:1,orangeburg:1,santee:1,wyboo:1,valley:1,ridge:1,gnlinks:1,gnlake:1,slmh:1,slbm:1,farmlinks:1,kingsnorth:1};
const R3T_SP={
  buroak:{kind:'broad',shape:'spread',trunkH:3.1,trunkR:.75,crownY:7.2,W:10.5,H:5.2,limbs:7,clusters:12,rc:[3.1,4.1],dens:24,cols:['#2c4a22','#3a5f2e','#53783a'],bark:'#4a3b2e'},
  oak:{kind:'broad',shape:'oval',trunkH:3.5,trunkR:.65,crownY:7.8,W:8.6,H:6.4,limbs:6,clusters:11,rc:[2.9,3.8],dens:24,cols:['#2f5428','#3f6c31','#5a8a40'],bark:'#4f3826'},
  maple:{kind:'broad',shape:'oval',trunkH:3.6,trunkR:.55,crownY:8.2,W:7.4,H:7.4,limbs:6,clusters:11,rc:[2.7,3.5],dens:26,cols:['#2f6b2c','#437f33','#5f9d42'],bark:'#5b3e27',fall:['#8a3b1f','#b5532a','#d9793a']},
  cottonwood:{kind:'broad',shape:'tall',trunkH:5.6,trunkR:.85,crownY:12,W:9,H:9.5,limbs:8,clusters:14,rc:[2.9,3.9],dens:18,cols:['#3a5f30','#4f7639','#6d9248'],bark:'#9a9188'},
  willow:{kind:'broad',shape:'weep',trunkH:2.6,trunkR:.7,crownY:6.4,W:8.4,H:6,limbs:7,clusters:12,rc:[2.8,3.6],dens:18,cols:['#5a7832','#789a42','#9bb85c'],bark:'#5a4c3a'},
  aspen:{kind:'broad',shape:'slim',trunkH:4.2,trunkR:.3,crownY:8.4,W:4.6,H:8.2,limbs:5,clusters:10,rc:[1.9,2.6],dens:26,cols:['#5c8838','#78a248','#9ac25e'],bark:'#d9d6c6',stems:1},
  birch:{kind:'broad',shape:'slim',trunkH:3.4,trunkR:.27,crownY:7.4,W:5.6,H:7.4,limbs:6,clusters:11,rc:[2,2.7],dens:24,cols:['#5f8a34','#7aa545','#98bf5c'],bark:'#ece8de',stems:3},
  spruce:{kind:'conifer',shape:'spruce',Ht:16.5,base:5.2,cols:['#1d3a2e','#284b3a','#3a5f4a'],bark:'#4b3a2c'},
  pine:{kind:'conifer',shape:'whitepine',Ht:17,base:6,cols:['#21452e','#2d583a','#3f6c4a'],bark:'#4e3522'},
  redcedar:{kind:'conifer',shape:'cedar',Ht:9.5,base:2.6,cols:['#2a4224','#38532f','#4c693a'],bark:'#6e4a35'},
  // Lowcountry
  liveoak:{kind:'broad',shape:'spread',trunkH:2.4,trunkR:1.05,crownY:6.2,W:13.5,H:4.6,limbs:8,clusters:15,rc:[3,4],dens:22,cols:['#33452a','#435a33','#5f7446'],bark:'#4a3d32',moss:1},
  magnolia:{kind:'broad',shape:'oval',trunkH:2.6,trunkR:.5,crownY:7,W:6.6,H:9,limbs:6,clusters:12,rc:[2.4,3.1],dens:30,cols:['#1c3520','#28472b','#3f6339'],bark:'#5a554d'},
  waxmyrtle:{kind:'broad',shape:'oval',trunkH:1.2,trunkR:.22,crownY:3.4,W:5,H:3.6,limbs:5,clusters:7,rc:[1.6,2.1],dens:26,cols:['#3b5530','#4f6b3a','#6a8648'],bark:'#6b6158',stems:3},
  lpine:{kind:'conifer',shape:'loblolly',Ht:21,base:4.6,cols:['#2c4a2a','#3b5e33','#557a44'],bark:'#5a4130'},
  baldcypress:{kind:'conifer',shape:'spruce',Ht:15,base:4,cols:['#46663a','#5a7d44','#769855'],bark:'#7a5a44',airy:1},
  // central Alabama
  sweetgum:{kind:'broad',shape:'tall',trunkH:4.6,trunkR:.5,crownY:10,W:7,H:9,limbs:6,clusters:12,rc:[2.5,3.3],dens:26,cols:['#2f5a2a','#41733a','#5d9149'],bark:'#5a4a3c'},
  tulip:{kind:'broad',shape:'tall',trunkH:7,trunkR:.6,crownY:14,W:7.4,H:9.5,limbs:6,clusters:12,rc:[2.6,3.4],dens:24,cols:['#3e6a2e','#548a3c','#74a851'],bark:'#6b6156'},
  wateroak:{kind:'broad',shape:'oval',trunkH:3.4,trunkR:.7,crownY:8.4,W:10,H:7.2,limbs:7,clusters:13,rc:[2.8,3.7],dens:26,cols:['#29482a','#3a5f34','#527a44'],bark:'#4b4038'},
  dogwood:{kind:'broad',shape:'spread',trunkH:1.6,trunkR:.25,crownY:4,W:5.2,H:3,limbs:5,clusters:7,rc:[1.5,2],dens:26,cols:['#3d5f30','#53793e','#6f9550'],bark:'#5e554c'},
  palmetto:{kind:'palm',Ht:9,cols:['#4f6b33','#647f3e','#7f9850'],bark:'#7d7262'},
  // Arizona (v108): Sonoran desert and the Phoenix resorts
  mesquite:{kind:'broad',shape:'spread',trunkH:1.6,trunkR:.4,crownY:3.6,W:7.4,H:3.4,limbs:6,clusters:9,rc:[1.9,2.6],dens:16,cols:['#4f5a34','#646f42','#7c8752'],bark:'#4a3a2e',stems:2},
  paloverde:{kind:'broad',shape:'spread',trunkH:1.4,trunkR:.32,crownY:3.4,W:6.6,H:3.6,limbs:6,clusters:9,rc:[1.8,2.4],dens:14,cols:['#7e8e48','#95a656','#aebd6c'],bark:'#7f9a52',stems:3},
  ironwood:{kind:'broad',shape:'oval',trunkH:1.5,trunkR:.4,crownY:3.8,W:6.2,H:4.2,limbs:6,clusters:9,rc:[1.8,2.4],dens:20,cols:['#4a5640','#5e6a51','#768263'],bark:'#5b5048',stems:2},
  eucalyptus:{kind:'broad',shape:'tall',trunkH:6.5,trunkR:.6,crownY:13,W:7.2,H:10,limbs:6,clusters:12,rc:[2.4,3.2],dens:18,cols:['#53684e','#6a8063','#869a7c'],bark:'#d8cdb9'},
  fanpalm:{kind:'palm',Ht:17,cols:['#4a6634','#5f7c40','#7b9550'],bark:'#8a7c66'},
  saguaro:{kind:'cactus',Ht:9.5,cols:['#4a663b','#4f6d3f','#5d7d4a'],bark:'#5a7a47'}};
// each species' leaves come from its own cell of the leaf atlas (4x4): leaf shape, size and twig habit to match the tree
const R3T_CELL={buroak:0,oak:1,maple:2,sweetgum:3,cottonwood:4,aspen:4,willow:5,magnolia:6,tulip:7,birch:8,liveoak:9,waxmyrtle:9,pine:10,lpine:10,spruce:11,redcedar:11,baldcypress:11,palmetto:12,dogwood:13,wateroak:15,mesquite:13,paloverde:13,ironwood:9,eucalyptus:5,fanpalm:12,saguaro:0};
for(const k in R3T_SP)R3T_SP[k].cell=R3T_CELL[k];
const R3T_RECT=[];for(let i=0;i<16;i++){const c=i%4,r=i>>2;R3T_RECT.push([c/4+.003,r/4+.003,(c+1)/4-.003,(r+1)/4-.003]);}
const R3T_MOSS=[.503,.753,.622,.997],R3T_WSTR=[.628,.753,.747,.997];
// --- primitive builders: bark (pos,nor,col,uv = 11 floats), masses (9), leaf cards (11) ---
function r3tCyl(out,A,B,r0,r1,sides,col,v0){const ax=nrm(sub(B,A)),L=len3(sub(B,A)),p=perpOf(ax),q=cross(ax,p),Ur=Math.max(1,Math.round(TAU*r0/.8));
  for(let i=0;i<sides;i++){const a0=i/sides*TAU,a1=(i+1)/sides*TAU,c0=add(mul(p,Math.cos(a0)),mul(q,Math.sin(a0))),c1=add(mul(p,Math.cos(a1)),mul(q,Math.sin(a1)));
    const P=[add(A,mul(c0,r0)),add(A,mul(c1,r0)),add(B,mul(c1,r1)),add(B,mul(c0,r1))],N=[c0,c1,c1,c0],u0=i/sides*Ur,u1=(i+1)/sides*Ur,vt=v0+L/(TAU*r0/Ur);
    const UV=[[u0,v0],[u1,v0],[u1,vt],[u0,vt]],dk=mul(col,.8);
    for(const k of[0,2,1,0,3,2])out.push(...P[k],...N[k],...(k<2?dk:col),...UV[k]);}
  return v0+L/(TAU*r0/Ur);}
const R3T_ICO=(()=>{const t=(1+Math.sqrt(5))/2,V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(nrm);
  const F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];return F.map(f=>f.map(i=>V[i]));})();
function r3tMass(out,C,rx,ry,rz,lo,hi,R){for(const f of R3T_ICO){const P=[],Nn=[],Cc=[];for(const v of f){const d=1+.22*(R()-.5);P.push([C[0]+v[0]*rx*d,C[1]+v[1]*ry*d,C[2]+v[2]*rz*d]);
    Nn.push(nrm([v[0]/rx,v[1]/ry,v[2]/rz]));const k=clamp(v[1]*.5+.5,0,1);Cc.push(mul(lerp3(lo,hi,k),.55+.3*k));}
  for(let k=0;k<3;k++)out.push(...P[k],...Nn[k],...Cc[k]);}}
function r3tCard(out,C,u,v,n,col,cell){const[u0,vt,u1,vb]=Array.isArray(cell)?cell:R3T_RECT[cell|0];const P=[sub(sub(C,u),v),sub(add(C,u),v),add(add(C,u),v),add(sub(C,u),v)],UV=[[u0,vb],[u1,vb],[u1,vt],[u0,vt]];
  for(const k of[0,1,2,0,2,3])out.push(...P[k],...n,...col,...UV[k]);}
// leaf cards scattered over a cluster's surface; normals blend out from the crown centre for soft, rounded light
function r3tLeaves(out,Cc,rc,crownC,n,cols,R,o={}){const[lo,base,hi]=cols,cR=o.crownR||rc*2.5;
  for(let i=0;i<n;i++){let d=nrm([R()*2-1,R()*1.6-.5,R()*2-1]);const C=add(Cc,mul(d,rc*(.55+R()*.45)));const sz=rc*(.34+R()*.18)*(o.size||1);
    const out2=nrm(sub(C,crownC)),nn=nrm(add(mul(out2,.65),add(mul(d,.25),[0,.25,0])));
    let t1=cross(nn,[0,1,0]);if(len3(t1)<.1)t1=[1,0,0];t1=nrm(t1);const t2=cross(nn,t1),a=R()*TAU;
    let u=mul(add(mul(t1,Math.cos(a)),mul(t2,Math.sin(a))),sz),v=mul(add(mul(t1,-Math.sin(a)),mul(t2,Math.cos(a))),sz);
    const k=clamp((C[1]-crownC[1])/(rc*2)+.5,0,1)*.6+clamp(dot3(out2,[0,0,0])+.4,0,1)*.0+.2*R();const cc=mul(k>.55?lerp3(base,hi,(k-.55)/.45):lerp3(lo,base,k/.55),.86+R()*.28);
    // ambient occlusion: cards deep in a cluster, toward the crown core or facing down sit in the crown's own shade
    const ao=clamp(.62+.3*len3(sub(C,Cc))/rc+.2*len3(sub(C,crownC))/cR-(d[1]<-.2?.08:0),.62,1.15);
    r3tCard(out,C,u,v,nn,mul(cc,ao),o.cell);}}
// a hanging strand (willow): a long vertical card
function r3tStrand(out,top,len,w,col,R,cell){const a=R()*TAU,u=[Math.cos(a)*w,0,Math.sin(a)*w],v=[0,len/2,0],C=sub(top,[0,len/2,0]),n=nrm([Math.sin(a),.3,-Math.cos(a)]);r3tCard(out,C,u,v,n,col,cell);
  r3tCard(out,C,[-u[2],0,u[0]],v,nrm([Math.cos(a),.3,Math.sin(a)]),mul(col,.92),cell);}
function r3tBroad(S,seed){const R=rng(seed),bark=[],mass=[],leaf=[],cols=S.cols.map(hexc),bk=hexc(S.bark),lean=[(R()-.5)*.8,(R()-.5)*.8];
  const stems=S.stems||1,top=[lean[0],S.trunkH,lean[1]];
  for(let s=0;s<stems;s++){const a=s/stems*TAU+R(),off=stems>1?[Math.cos(a)*.5,0,Math.sin(a)*.5]:[0,0,0];const T2=add(top,stems>1?[Math.cos(a)*1.4,S.trunkH*.15*R(),Math.sin(a)*1.4]:[0,0,0]);
    r3tCyl(bark,off,T2,S.trunkR*(stems>1?.8:1),S.trunkR*.62,8,bk,0);r3tCyl(bark,T2,add(T2,[0,S.crownY-S.trunkH,0]),S.trunkR*.6,S.trunkR*.25,6,bk,0);}
  const trunkN=bark.length;const cc=[0,S.crownY,0];const cl=[];const sp=S.shape;
  for(let i=0;i<S.clusters;i++){const a=i/S.clusters*TAU*1.618*1.618+R()*.6,ring=sp==='spread'?.55+R()*.45:sp==='slim'?R()*.7:.25+R()*.7;
    let x=Math.cos(a)*S.W*.5*ring,z=Math.sin(a)*S.W*.5*ring,y=S.crownY+(R()-.5)*S.H*(sp==='spread'?.45:.75);
    if(sp==='spread')y-=ring*1.2;if(sp==='weep')y+=(1-ring)*1.2;if(sp==='tall')y+=(R()-.3)*S.H*.25;
    cl.push([x,y,z]);}
  // limbs from the trunk head out to the clusters, crooked on the savanna oaks
  for(const C of cl){const st=[lean[0]*.9,S.trunkH*(.75+R()*.25),lean[1]*.9],mid=add(lerp3(st,C,.5),[(R()-.5)*(sp==='spread'?2:1),sp==='spread'?-.6:.3,(R()-.5)*(sp==='spread'?2:1)]);
    const v=r3tCyl(bark,st,mid,S.trunkR*.42,S.trunkR*.28,5,bk,0);r3tCyl(bark,mid,lerp3(mid,C,.85),S.trunkR*.28,S.trunkR*.12,5,bk,v);}
  for(const C of cl){const rc=S.rc[0]+R()*(S.rc[1]-S.rc[0]);r3tMass(mass,C,rc*.72,rc*.6,rc*.72,mul(cols[0],.8),cols[1],R);
    r3tLeaves(leaf,C,rc,cc,Math.round(S.dens*(rc/3.3)**2),cols,R,{cell:S.cell,crownR:S.W*.5+S.rc[1]});
    if(S.moss){for(let k=0;k<6;k++){const a=R()*TAU,r=rc*(.35+R()*.55);r3tStrand(leaf,[C[0]+Math.cos(a)*r,C[1]-rc*.35,C[2]+Math.sin(a)*r],1.6+R()*2.6,.32+R()*.2,mul(hexc('#a3ab95'),.74+R()*.2),R,R3T_MOSS);}}
    if(sp==='weep'){for(let k=0;k<9;k++){const a=R()*TAU,r=rc*(.5+R()*.5);r3tStrand(leaf,[C[0]+Math.cos(a)*r,C[1]-rc*.2,C[2]+Math.sin(a)*r],2.5+R()*3.5,.55+R()*.3,mul(lerp3(cols[1],cols[2],R()),.95),R,R3T_WSTR);}}}
  return{bark,mass,leaf,trunkN};}
function r3tConifer(S,seed){const R=rng(seed),bark=[],mass=[],leaf=[],cols=S.cols.map(hexc),bk=hexc(S.bark),H=S.Ht*(.92+R()*.16);
  r3tCyl(bark,[0,0,0],[0,H*.92,0],S.base*.09,S.base*.03,7,bk,0);const trunkN=bark.length;
  if(S.shape==='spruce'){const tiers=Math.round(H/.95);
    for(let i=0;i<tiers;i++){const t=i/tiers,y=1.2+t*(H-1.6),rad=S.base*(1-t)**1.08*(.9+R()*.2)+.35;
      if(i%2===0)r3tMass(mass,[0,y+.2,0],rad*.62,.75,rad*.62,mul(cols[0],.75),cols[0],R);
      const n=Math.max(5,Math.round(rad*3.2));for(let k=0;k<n;k++){const a=k/n*TAU+R()*.5,dir=[Math.cos(a),0,Math.sin(a)],tg=[-Math.sin(a),0,Math.cos(a)];
        const C=[dir[0]*rad*.55,y,dir[2]*rad*.55],u=mul(nrm(add(dir,[0,-.42,0])),rad*.55),v=mul(tg,Math.max(.6,rad*.34));
        r3tCard(leaf,C,u,v,nrm(add(dir,[0,.8,0])),mul(lerp3(cols[1],cols[2],t*.6+R()*.3),(S.airy?1.6:1.45)*(.82+.3*t)),S.cell);}}}
  else if(S.shape==='whitepine'){const tiers=6+Math.floor(R()*3);
    for(let i=0;i<tiers;i++){const t=i/tiers,y=H*(.3+.66*t),rad=S.base*(1-.75*t)*(.7+R()*.5),arms=3+Math.floor(R()*3);
      for(let k=0;k<arms;k++){const a=R()*TAU,dir=[Math.cos(a),0,Math.sin(a)],end=[dir[0]*rad,y+(R()-.3)*.8,dir[2]*rad];
        r3tCyl(bark,[0,y-.3,0],end,S.base*.035,S.base*.012,4,bk,0);
        r3tMass(mass,end,rad*.28+.4,.5,rad*.28+.4,mul(cols[0],.8),cols[1],R);
        for(let m=0;m<8;m++){const b=a+(R()-.5)*1.4,d2=[Math.cos(b),0,Math.sin(b)],C=add(end,[d2[0]*(R()*rad*.35),R()*.5,d2[2]*(R()*rad*.35)]);
          r3tCard(leaf,C,mul(nrm(add(d2,[0,-.15+(R()-.5)*.8,0])),rad*.32+.7),mul(nrm([-d2[2],(R()-.5)*2.4,d2[0]]),rad*.22+.5),nrm(add(d2,[0,1.2,0])),mul(lerp3(cols[1],cols[2],R()*.6),1.22),S.cell);}}}}
  else if(S.shape==='loblolly'){const c0=H*.62;
    for(let i=0;i<9;i++){const t=i/9,y=c0+t*(H-c0)*.9,a=R()*TAU,len=S.base*(1-t*.6)*(.6+R()*.5),end=[Math.cos(a)*len,y+.6+R()*.8,Math.sin(a)*len];
      r3tCyl(bark,[0,y,0],end,S.base*.05,S.base*.02,4,bk,0);r3tMass(mass,end,len*.3+.5,.7,len*.3+.5,mul(cols[0],.85),cols[1],R);
      for(let m=0;m<10;m++){const b=a+(R()-.5)*1.8,d2=[Math.cos(b),0,Math.sin(b)],C=add(end,[d2[0]*R()*len*.45,R()*.9-.2,d2[2]*R()*len*.45]);
        r3tCard(leaf,C,mul(nrm(add(d2,[0,.1+(R()-.5)*.8,0])),len*.38+.9),mul(nrm([-d2[2],(R()-.5)*2.4,d2[0]]),len*.26+.7),nrm(add(d2,[0,1.1,0])),mul(lerp3(cols[1],cols[2],R()*.6),1.22),S.cell);}}}
  else{// red cedar: a dense dark flame
    for(let i=0;i<7;i++){const t=i/7,y=1.1+t*(H-1.8),rad=S.base*Math.sin(Math.PI*(.12+.88*(1-t)*.92))*(.85+R()*.3)+.2;
      r3tMass(mass,[(R()-.5)*.3,y,(R()-.5)*.3],rad,1.2,rad,mul(cols[0],.8),cols[1],R);
      for(let k=0;k<9;k++){const a=R()*TAU,dir=[Math.cos(a),(R()-.4)*.6,Math.sin(a)],C=add([0,y,0],mul(dir,rad*.85));
        r3tCard(leaf,C,mul(nrm(add(dir,[0,.6,0])),rad*.45+.3),mul([-Math.sin(a),0,Math.cos(a)],rad*.3+.25),nrm(add(dir,[0,.5,0])),mul(lerp3(cols[1],cols[2],R()*.5),1.35),S.cell);}}}
  return{bark,mass,leaf,trunkN};}
function r3tPalm(S,seed){const R=rng(seed),bark=[],mass=[],leaf=[],cols=S.cols.map(hexc),bk=hexc(S.bark),H=S.Ht*(.8+R()*.4),lean=[(R()-.5)*1.4,(R()-.5)*1.4];
  let prev=[0,0,0];const segs=6;for(let i=1;i<=segs;i++){const t=i/segs,p=[lean[0]*t*t,H*t,lean[1]*t*t];r3tCyl(bark,prev,p,.42-.08*t,.4-.08*t,7,mul(bk,i%2?1:.86),0);prev=p;}
  const top=prev;r3tMass(mass,add(top,[0,.2,0]),.9,.8,.9,mul(cols[0],.7),cols[0],R);
  const n=16;for(let k=0;k<n;k++){const a=k/n*TAU+R()*.3,up=k%3===0?.5:k%3===1?.05:-.45,dir=nrm([Math.cos(a),up,Math.sin(a)]),len=2.6+R()*.9;
    const C=add(top,mul(dir,len*.55)),u=mul(nrm(add(dir,[0,-.25,0])),len*.62),v=mul(nrm(cross(dir,[0,1,0])),1.05);
    r3tCard(leaf,C,u,v,nrm(add([0,1,0],mul(dir,.4))),mul(lerp3(cols[1],cols[2],R()),1.45),S.cell);r3tCard(leaf,C,u,mul(v,.75),nrm(add([0,1,0],mul(dir,.4))),mul(lerp3(cols[0],cols[1],R()),1.35),S.cell);}
  return{bark,mass,leaf};}
function r3tCactus(S,seed){const R=rng(seed),bark=[],col=hexc(S.bark),H=S.Ht*(.75+R()*.45),r=.34;let v=0;
  v=r3tCyl(bark,[0,-.3,0],[0,H*.92,0],r,r*.92,10,col,v);r3tCyl(bark,[0,H*.92,0],[0,H,0],r*.92,r*.45,10,col,v);
  const n=Math.floor(R()*4);for(let k=0;k<n;k++){const a=R()*TAU,h0=H*(.35+R()*.3),d=[Math.cos(a),0,Math.sin(a)],out=.55+R()*.35,up=1.4+R()*2.4,ra=r*.72;
    const A=[d[0]*r*.6,h0,d[2]*r*.6],B=[d[0]*(r+out),h0+.25,d[2]*(r+out)],C=[B[0],B[1]+up,B[2]];
    r3tCyl(bark,A,B,ra,ra,8,col,0);r3tCyl(bark,B,C,ra,ra*.92,8,col,0);r3tCyl(bark,C,[C[0],C[1]+.18,C[2]],ra*.92,ra*.45,8,col,0);}
  return{bark,mass:[],leaf:[],H};}
function r3tProtos(){if(R3T.protos)return R3T.protos;const P={};let seed=811;
  for(const k in R3T_SP){const S=R3T_SP[k];P[k]=[0,1,2].map(v=>{const g=S.kind==='broad'?r3tBroad(S,seed+=37):S.kind==='palm'?r3tPalm(S,seed+=37):S.kind==='cactus'?r3tCactus(S,seed+=37):r3tConifer(S,seed+=37);return g;});
    if(S.fall)P[k+'_fall']=[0,1].map(()=>r3tBroad({...S,cols:S.fall},seed+=37));}
  if(b10On()&&typeof B10TREES!=='undefined')b10Trees(P);   // Blender trial: broadleaf trees grown for the trial, light baked in Blender
  for(const k in P)for(const g of P[k]){const L=g.leaf,out=[],R=rng(9173);
    for(let c=0;c<L.length;c+=66){if(R()>.4)continue;let cx=0,cy=0,cz=0;for(let v=0;v<6;v++){cx+=L[c+v*11]/6;cy+=L[c+v*11+1]/6;cz+=L[c+v*11+2]/6;}
      for(let v=0;v<6;v++){const o=c+v*11;out.push(cx+(L[o]-cx)*1.58,cy+(L[o+1]-cy)*1.58,cz+(L[o+2]-cz)*1.58);for(let e=3;e<11;e++)out.push(L[o+e]);}}
    g.lite={bark:g.bark.slice(0,g.trunkN||g.bark.length),mass:g.mass,leaf:out};}
  for(const k in P)for(const g of P[k]){let m=0;for(const a of[g.leaf,g.mass]){const st=a===g.leaf?11:9;for(let i=0;i<a.length;i+=st)m=Math.max(m,Math.hypot(a[i],a[i+2]));}if(m<.5)for(let i=0;i<g.bark.length;i+=11)m=Math.max(m,Math.hypot(g.bark[i],g.bark[i+2]));g.reach=m;}
  return R3T.protos=P;}
// species from the setting (only on the courses this has been tuned for)
function r3TreeSpecies(h){R3T.use=R3.on&&!!R3T_COURSES[CUR.id];R3T.h=h;if(!R3T.use)return;if(!h.naipDone){h.naipDone=1;r3NaipApply(h);}const links=CUR.scen==='links',R=rng(((h.T0?h.T0[0]:0)*7+(h.par||4)*131)|0);
  const nearW=(x,y,d)=>(h.water||[]).some(w=>polyDist(w,x,y,d+1)<d),nearH=(x,y,d)=>(h.houses||[]).some(q=>hyp(q.x-x,q.y-y)<d)||(h.buildings||[]).some(q=>!q.club&&polyDist(q,x,y,d+1)<d);
  const inWood=(x,y)=>(h.woods||[]).some(P=>inPoly(P,x,y));
  const grove=(x,y)=>Math.sin(x*.045+y*.031)*Math.sin(x*.027-y*.052)>.45;   // aspen groves come in patches
  const low=CUR.scen==='lowcountry',south=!!R3T_SOUTH[CUR.id];
  const pickSouth=(t,ctx)=>{const q=R();
    if(ctx==='water')return q<.4?'willow':q<.7?'wateroak':q<.85?'sweetgum':'baldcypress';
    if(ctx==='yard')return q<.3?'wateroak':q<.5?'dogwood':q<.65?'magnolia':q<.85?'sweetgum':'lpine';
    if(ctx==='wood')return q<.45?'lpine':q<.6?'wateroak':q<.72?'sweetgum':q<.82?'tulip':q<.9?'oak':q<.95?'maple':'dogwood';
    if(ctx==='row')return q<.55?'lpine':q<.8?'wateroak':'sweetgum';
    return q<.4?'wateroak':q<.65?'lpine':q<.8?'sweetgum':q<.9?'oak':'dogwood';};
  const pickLow=(t,ctx)=>{const q=R();
    if(ctx==='water')return q<.5?'baldcypress':q<.75?'waxmyrtle':'palmetto';
    if(ctx==='yard')return q<.3?'palmetto':q<.55?'magnolia':q<.85?'liveoak':'waxmyrtle';
    if(ctx==='wood')return q<.55?'lpine':q<.75?'liveoak':q<.85?'oak':q<.93?'magnolia':'waxmyrtle';
    if(ctx==='row')return q<.6?'lpine':'liveoak';
    return q<.5?'liveoak':q<.8?'lpine':'palmetto';};
  const barrens=!!R3T_BARRENS[CUR.id],north=!!R3T_NORTH[CUR.id],desert=CUR.scen==='desert',az=!!R3T_AZ[CUR.id];
  const pickDesert=(t,ctx)=>{const q=R();
    if(ctx==='water')return q<.45?'fanpalm':q<.7?'eucalyptus':q<.88?'mesquite':'paloverde';
    if(ctx==='yard')return q<.3?'fanpalm':q<.6?'paloverde':q<.85?'mesquite':'eucalyptus';
    if(ctx==='row')return q<.5?'fanpalm':'mesquite';
    return q<.38?'mesquite':q<.72?'paloverde':q<.9?'ironwood':'fanpalm';};
  const pickAZ=(t,ctx)=>{const q=R();
    if(ctx==='water')return q<.4?'fanpalm':q<.7?'eucalyptus':'willow';
    if(ctx==='yard')return q<.35?'fanpalm':q<.6?'eucalyptus':q<.8?'pine':'mesquite';
    if(ctx==='row')return q<.55?'fanpalm':q<.8?'eucalyptus':'pine';
    return q<.3?'eucalyptus':q<.52?'pine':q<.7?'fanpalm':q<.85?'mesquite':'oak';};
  const pickNorth=(t,ctx)=>{const q=R();
    if(ctx==='water')return q<.35?'willow':q<.65?'aspen':q<.85?'birch':'spruce';
    if(ctx==='yard')return q<.35?'spruce':q<.6?'birch':q<.8?'maple':'pine';
    if(ctx==='wood'){if(grove(t.x,t.y)&&q<.5)return'aspen';return q<.25?'spruce':q<.45?'pine':q<.62?'birch':q<.8?'aspen':q<.92?'maple':'redcedar';}
    if(ctx==='row')return q<.45?'spruce':q<.7?'pine':'birch';
    return q<.3?'aspen':q<.55?'spruce':q<.75?'birch':q<.9?'pine':'maple';};
  const pickBarrens=(t,ctx)=>{const q=R();
    if(ctx==='water')return q<.4?'willow':q<.7?'aspen':'cottonwood';
    if(ctx==='yard')return q<.45?'pine':q<.7?'oak':q<.85?'birch':'spruce';
    if(ctx==='wood'){if(grove(t.x,t.y)&&q<.35)return'aspen';return q<.62?'pine':q<.82?'oak':q<.9?'buroak':q<.96?'birch':'redcedar';}
    if(ctx==='row')return q<.7?'pine':'oak';
    return q<.45?'oak':q<.75?'pine':q<.9?'buroak':'redcedar';};
  const scm=CUR.id==='santee'||CUR.id==='wyboo'||CUR.id==='orangeburg';
  const pick=(t,ctx)=>{if(t.preset)return t.preset;if(desert)return pickDesert(t,ctx);if(scm&&!t.con&&ctx!=='wood'&&R()<.22)return'liveoak';if(az)return pickAZ(t,ctx);if(barrens)return pickBarrens(t,ctx);if(north)return pickNorth(t,ctx);if(low)return pickLow(t,ctx);if(south)return pickSouth(t,ctx);const q=R();
    if(ctx==='water')return q<.55?'willow':'cottonwood';
    if(ctx==='yard')return q<.35?'spruce':q<.65?'maple':q<.85?'oak':'birch';
    if(ctx==='wood'){if(grove(t.x,t.y)&&q<.7)return'aspen';return q<.28?'buroak':q<.48?'oak':q<.66?'maple':q<.76?'pine':q<.84?'aspen':q<.9?'birch':'redcedar';}
    if(ctx==='row')return links?(q<.5?'spruce':q<.75?'pine':'cottonwood'):(q<.4?'oak':q<.6?'buroak':q<.75?'maple':'pine');
    return links?(q<.35?'cottonwood':q<.65?'buroak':q<.82?'spruce':'redcedar'):(q<.62?'buroak':q<.74?'oak':q<.86?'redcedar':'cottonwood');};
  const ctxOf=(t,isFar)=>{if(nearW(t.x,t.y,isFar?14:22))return'water';if(nearH(t.x,t.y,isFar?28:34))return'yard';if(t.deco)return inWood(t.x,t.y)?'wood':'row';
    if(isFar&&t.k)return t.k==='wood'?'wood':t.k==='yard'?'yard':'open';return inWood(t.x,t.y)?'wood':'open';};
  const CON={spruce:1,pine:1,redcedar:1,lpine:1,baldcypress:1};
  const fit=(t,sp)=>{if(!t.naip||t.preset||desert||az)return(az&&t.con&&t.naip&&!t.preset)?(R()<.6?'pine':'eucalyptus'):sp;
    // the photo test misses most of the pines out here (they read as bright as the oaks), so trust the setting more
    if(north){if(t.con)return CON[sp]?sp:(t.r>6.2?'pine':'spruce');const q=R();return CON[sp]?(q<.4?'aspen':q<.75?'birch':'maple'):sp;}
    if(barrens){if(t.con)return CON[sp]?sp:(t.r<3.6?'redcedar':'pine');const q=R();return q<.55?'pine':CON[sp]?(q<.85?'oak':'buroak'):sp;}
    if(t.con){if(CON[sp])return sp;return low||south?(south&&t.r<3.8?'redcedar':'lpine'):(t.r>6.2?'pine':t.r<3.8?'redcedar':'spruce');}
    if(!CON[sp])return sp;const q=R();return south?(q<.4?'wateroak':q<.6?'sweetgum':q<.75?'tulip':q<.9?'oak':'dogwood'):low?(q<.55?'liveoak':q<.75?'oak':q<.9?'magnolia':'waxmyrtle'):(q<.35?'buroak':q<.6?'oak':q<.8?'maple':'cottonwood');};
  for(const t of h.allTrees||[]){t.sp=fit(t,pick(t,ctxOf(t,false)));t.fall=t.sp==='maple'&&R()<.18;}
  for(const t of h.farTrees||[]){const c=ctxOf(t,true);t.sp=fit(t,pick(t,c));}}
// buildTreeMesh hands its trees here instead of building them
function r3TreeTake(t){if(!R3T.use||!R3T_SP[t.sp])return false;R3T.list.push(t);return true;}
/* Oct 28 2026: the ball meets the tree that is drawn. A tree's crown in play used to be a cylinder of 0.8 x its photo radius from
   3 yds up to 2 + 1.35 r; the drawn crowns are narrower (about 40% of that cylinder was empty air, more beside the fairways where
   crowns are trimmed back from the line of play), and a dead snag has no leaves at all, so balls were knocked down by "ghost" leaves.
   r3tProf: the variant's foliage (leaves + leaf masses) radius in 0.5-unit height bands, widened by one band either side. */
function r3tProf(v){if(v.prof)return v.prof;const B=.5,raw=[];
  for(const a of[v.leaf,v.mass]){const st=a===v.leaf?11:9;for(let k=0;k<a.length;k+=st){const bi=Math.floor(a[k+1]/B);if(bi<0)continue;raw[bi]=Math.max(raw[bi]||0,Math.hypot(a[k],a[k+2]));}}
  const n=raw.length,r=new Float32Array(n);let max=0;for(let i=0;i<n;i++){r[i]=Math.max(raw[i-1]||0,raw[i]||0,raw[i+1]||0);max=Math.max(max,r[i]);}
  return v.prof={B,r,max};}
// the drawn crown's radius (yds) at height ht (yds above the tree's ground), or null for a tree drawn without a known shape
function treeCrown(t,ht){if(!t.cp)return null;const bi=Math.floor(ht/t.cs[1]/t.cp.B);return(t.cp.r[bi]||0)*t.cs[0];}
function r3TreeFlush(){for(const m of R3T.meshes){R3.scene.remove(m);m.geometry.dispose();}R3T.meshes=[];R3T.groups=[];R3T.lodRef=null;r3tFarBuild(R3T.use&&R3T.h?R3T.h.farTrees:null);if(!R3T.use||!R3T.list.length)return;
  const P=r3tProtos(),T=THREE,groups={};
  for(const t of R3T.list){const key=t.sp+(t.fall?'_fall':''),vs=P[key]||P[t.sp],vi=Math.floor((t.shade||0)*97)%vs.length;(groups[key+'|'+vi]=groups[key+'|'+vi]||{v:vs[vi],ts:[]}).ts.push(t);}
  const q=new T.Quaternion(),s=new T.Vector3(),p=new T.Vector3(),up=new T.Vector3(0,1,0);
  for(const k in groups){const{v,ts}=groups[k];const n=ts.length,M=new Float32Array(n*16),C=new Float32Array(n*3),m4=new T.Matrix4();
    ts.forEach((t,i)=>{const sc=(t.vs||(t.r||9)/10)*(.9+((t.shade*13)%1)*.22);q.setFromAxisAngle(up,(t.shade||0)*TAU*7.3);
      let sh=sc;const H=R3T.h;if(H&&H.lg&&lieCodeAt(H,t.x,t.y)>=0){const room=dplayAt(H,t.x,t.y)+2.5;if(v.reach*sh>room)sh=Math.max(.35,room/v.reach);}
      const tall=R3T_SP[t.sp]&&R3T_SP[t.sp].kind==='broad'?1.22:1.08;s.set(sh,sc*tall*(.92+((t.shade*29)%1)*.16),sh);
      t.cp=r3tProf(v);t.cs=[sh,s.y];t.cr=t.cp.max*sh;   // the crown as drawn, for the ball (treeCrown)
      p.set(t.x,(t.gh!==undefined?t.gh:hAt(t.x,t.y))-.15,t.y);m4.compose(p,q,s);m4.toArray(M,i*16);const tn=.88+((t.shade*53)%1)*.24,hv=((t.shade*31)%1)-.5;C[i*3]=tn*(1+hv*.1);C[i*3+1]=tn;C[i*3+2]=tn*(.96+((t.shade*7)%1)*.08)*(1-hv*.12);});
    /* Oct 2026: the instanced species meshes used to share the tree and bark materials with the merged R3.trees / R3.bark meshes;
       three.js then re-resolved the program on every draw as it flipped between instanced and not (CPU and garbage every frame).
       Same settings and patch, so the same shaders. */
    const mI=R3.mat,treeI=mI.treeI||(mI.treeI=r3Patch(mI.tree.clone(),{fade:true,translucent:true})),barkI=mI.barkI||(mI.barkI=r3Patch(mI.bark.clone(),{fade:true}));
    const set=src=>[[src.bark,11,barkI],[src.mass,9,treeI],[src.leaf,11,R3.mat.sleaf]].filter(x=>x[0].length).map(([arr,stride,mat])=>{
      const im=new T.InstancedMesh(r3Geo(new Float32Array(arr),stride),mat,n);im.count=0;im.visible=false;im.castShadow=!b10Hole();im.receiveShadow=true;im.userData.shStatic=true;
      if(mat===R3.mat.sleaf)im.customDepthMaterial=R3.sleafDepth;im.setColorAt(0,new T.Color(1,1,1));R3.scene.add(im);R3T.meshes.push(im);return im;});
    R3T.groups.push({ts,M,C,full:set(v),lite:set(v.lite)});}
  R3T.list=[];r3LiteShadows();r3TreeLOD(true);}
// full detail within ~140 yds of the camera, the lighter version beyond (re-sorted when the camera has moved a fair way)
const R3T_NEAR=140;
function r3TreeLOD(force){if(!R3T.groups||!R3T.groups.length)return;const ex=V.E?V.E[0]:0,ez=V.E?V.E[2]:0,r=R3T.lodRef;
  const wide=G.overview||G.state==='intro'||G.state==='card';
  /* Oct 2026 perf: trees well outside the view (behind the camera, off to the sides) are left out of the draw and the shadow pass.
     The kept cone is the screen's width plus 30 degrees each side, and everything within 60 yds stays (its shadow can reach the view). */
  const fx=V.F?V.F[0]:0,fz=V.F?V.F[2]:1,fh=Math.hypot(fx,fz),cull=!wide&&fh>.45&&V.f>0&&!window.__noCull,ang=Math.atan2(fx,fz),hf=Math.atan((W/2)/(V.f||1)),cosL=Math.cos(Math.min(1.5,hf+.52));
  if(!force&&r&&r.wide===wide&&r.cull===cull&&Math.hypot(ex-r.x,ez-r.z)<22&&(!cull||(Math.abs(Math.atan2(Math.sin(ang-r.ang),Math.cos(ang-r.ang)))<.17&&Math.abs(hf-r.hf)<.03)))return;
  R3T.lodRef={x:ex,z:ez,wide,cull,ang,hf};const Q=r3Q(),far2=Q.far&&!wide?Q.far*Q.far:1e12,near2=(wide?0:(Q.near||R3T_NEAR))**2,ux=fx/(fh||1),uz=fz/(fh||1);let kept=0,all=0;if(R3.shc)R3.shc.valid=false;
  for(const g of R3T.groups){let nf=0,nl=0;const n=g.ts.length;
    for(let i=0;i<n;i++){const t=g.ts[i],dx=t.x-ex,dz=t.y-ez,d2=dx*dx+dz*dz;all++;if(d2>far2||(cull&&d2>3600&&(dx*ux+dz*uz)<cosL*Math.sqrt(d2)))continue;kept++;
      const dst=d2<near2?g.full:g.lite,k=d2<near2?nf++:nl++;
      for(const im of dst){im.instanceMatrix.array.set(g.M.subarray(i*16,i*16+16),k*16);im.instanceColor.array.set(g.C.subarray(i*3,i*3+3),k*3);}}
    for(const[set,c]of[[g.full,nf],[g.lite,nl]])for(const im of set){im.count=c;im.visible=c>0;im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true;if(c)im.computeBoundingSphere();}}R3T.kept=[kept,all];}


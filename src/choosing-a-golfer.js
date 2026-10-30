/* ---- choosing a golfer: the Boss is built in; the others are loaded on demand from char_<id>.js ---- */
const R3CHARS={};let R3CHAR_WANT=null;
let R3CHAR_CB=null;
function R3CHAR(D){R3CHARS[D.id]=D;r3LegWrap(D);
  if(R3CHAR_WANT===D.id||(R3CHAR_WANT&&LEG_BASE[R3CHAR_WANT]===D.id)){const cb=R3CHAR_CB,w=R3CHAR_WANT;R3CHAR_CB=null;r3GolferSet(w,cb);}}
// legends share their base body's file: the wrapper borrows its mesh, texture and retargeted clips and adds the outfit (lg)
function r3LegWrap(B){if(typeof LEGENDS==='undefined')return;for(const L of LEGENDS){if(L.base!==B.id||R3CHARS[L.id])continue;
  const W={...B,id:L.id,lg:L.lg},sc=L.lg.scale||1;
  if(sc!==1){const f32=a=>{const u=new Uint8Array(a.buffer);let t='';for(let i=0;i<u.length;i+=8192)t+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(t);};
    const lt=r3b64(B.lt,Float32Array);for(let i=0;i<lt.length;i++)lt[i]*=sc;W.lt=f32(lt);
    const inv=r3b64(B.inv,Float32Array);for(let i=0;i<inv.length;i+=16){inv[i+3]*=sc;inv[i+7]*=sc;inv[i+11]*=sc;}W.inv=f32(inv);
    W.mesh={...B.mesh,lo:B.mesh.lo.map(v=>v*sc),hi:B.mesh.hi.map(v=>v*sc)};}
  for(const k of sc!==1?['_map']:['_rt','_map'])Object.defineProperty(W,k,{get:()=>B[k],set:v=>{B[k]=v;},enumerable:false});R3CHARS[L.id]=W;}}
window.R3CHAR=R3CHAR;
function r3GolferSet(id,cb){if(!R3.on||typeof R3BOSS==='undefined')return;
  if(id==='boss'||!id){if(R3B.cid!=='boss')r3GolferBuild(R3BOSS,null);cb&&cb(true);return;}
  if(R3CHARS[id]){if(R3B.cid!==id)try{r3GolferBuild(R3CHARS[id],id);}catch(e){console.error('[golfer]',e);r3GolferBuild(R3BOSS,null);}R3CHAR_WANT=null;cb&&cb(true);return;}
  R3CHAR_WANT=id;R3CHAR_CB=cb||null;const fid=LEG_BASE[id]||id;if(document.getElementById('chs_'+fid))return;
  r3CharFetch(fid,()=>R3CHAR_WANT===id,ok=>{if(!ok&&R3CHAR_WANT===id){const c=R3CHAR_CB;R3CHAR_WANT=null;R3CHAR_CB=null;c&&c(false);}});}   // on success the file itself calls R3CHAR, which switches to it
// download a character's file. Phones sometimes rename uploads (char_brute.js -> "char brute.js"), so the usual spellings are tried in turn
// bodies the legends wear carry part labels (Oct 2026): ask for the labelled file (?v=) so a phone's older cached copy is not used
const CHAR_V={mh_tyger:'m4',mh_jack:'m4',mh_arnie:'m4',mh_phil:'m4',mh_rory:'m4',mh_scotty:'m4',mh_seve:'m4',mh_barry:'m4',mh_hoagan:'m4',mh_payne:'m4',ch12:'lg2',remy:'lg2',ch01:'lg2',ch08:'lg2',ch42:'lg2',ch23:'lg2',ch28:'lg2',mx_joe:'lg2',ch17:'lg2'};
function r3CharFetch(id,keepTrying,done){const q=CHAR_V[id]?'?v='+CHAR_V[id]:'',names=['char_'+id+'.js'+q,'char%20'+id+'.js'+q,'char'+id+'.js'+q,'char-'+id+'.js'+q];let k=0;
  const tryNext=()=>{const s=document.createElement('script');s.id='chs_'+id;s.src=names[k];s.onload=()=>done(true);
    s.onerror=()=>{s.remove();if(++k<names.length&&keepTrying()){tryNext();return;}done(false);};document.head.appendChild(s);};
  tryNext();}
// load a character's file without switching to it (Challenge V2 preloads the rival and your golfer)
function r3CharLoad(id,cb){if(!id||id==='boss'||R3CHARS[id]){cb&&cb(true);return;}
  {const fid=LEG_BASE[id];if(fid){r3CharLoad(fid,ok=>cb&&cb(ok&&!!R3CHARS[id]));return;}}
  if(document.getElementById('chs_'+id)){const t0=Date.now(),w=()=>{if(R3CHARS[id])cb&&cb(true);else if(Date.now()-t0>20000)cb&&cb(false);else setTimeout(w,200);};w();return;}
  r3CharFetch(id,()=>true,ok=>cb&&cb(ok&&!!R3CHARS[id]));}
// pose of a clip at time t (clip seconds) into q (bone quaternions) and h (hips translation)
function r3bPose(c,t,q,h){const f=clamp((t-c.t0)*c.fps,0,c.n-1),i0=Math.floor(f),i1=Math.min(c.n-1,i0+1),a=f-i0,nb=R3B.nb;
  for(let k=0;k<nb;k++){q[k*4]=c.QS[k*4]/32767;q[k*4+1]=c.QS[k*4+1]/32767;q[k*4+2]=c.QS[k*4+2]/32767;q[k*4+3]=c.QS[k*4+3]/32767;}
  const v=R3B_PV;for(let j=0;j<c.na;j++){const k=c.anim[j],o0=(i0*c.na+j)*4,o1=(i1*c.na+j)*4;let l=0;
    for(let e=0;e<4;e++){v[e]=(c.Q[o0+e]*(1-a)+c.Q[o1+e]*a)/32767;l+=v[e]*v[e];}l=Math.sqrt(l)||1;for(let e=0;e<4;e++)q[k*4+e]=v[e]/l;}
  for(let e=0;e<3;e++)h[e]=c.HIP[i0*3+e]*(1-a)+c.HIP[i1*3+e]*a;}
const R3B_PV=new Float64Array(4);
function r3bBlend(qa,ha,qb,hb,w){if(w<=0)return;const nb=R3B.nb;for(let k=0;k<nb;k++){let d=0;for(let e=0;e<4;e++)d+=qa[k*4+e]*qb[k*4+e];const s=d<0?-1:1;let l=0;
    for(let e=0;e<4;e++){qa[k*4+e]=qa[k*4+e]*(1-w)+qb[k*4+e]*s*w;l+=qa[k*4+e]*qa[k*4+e];}l=Math.sqrt(l)||1;for(let e=0;e<4;e++)qa[k*4+e]/=l;}
  for(let e=0;e<3;e++)ha[e]=ha[e]*(1-w)+hb[e]*w;}
function r3bApply(q,h){const B=R3B.bones;for(let k=0;k<R3B.nb;k++)B[k].quaternion.set(q[k*4],q[k*4+1],q[k*4+2],q[k*4+3]);B[0].position.set(h[0],h[1],h[2]);}
// hands (grip) and the lead-hand rotation in rig space for the current pose
function r3bHands(){const I=R3B.idx,B=R3B.bones;R3B.root.matrix.identity();R3B.root.matrixWorld.identity();B[0].updateMatrixWorld(true);
  const l=B[I.LeftHand].matrixWorld.elements,m=B[I.LeftHandMiddle1].matrixWorld.elements;
  const H=[(l[12]+m[12])/2,(l[13]+m[13])/2,(l[14]+m[14])/2];   // lead palm: the top of the grip
  const R=[];for(const c of[0,4,8]){const s=Math.hypot(l[c],l[c+1],l[c+2]);R.push([l[c]/s,l[c+1]/s,l[c+2]/s]);}   // columns
  return{H,R};}

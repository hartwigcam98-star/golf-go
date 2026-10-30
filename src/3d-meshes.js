/* ---------- 3D meshes: trees, flag, cup, ball and the golfer ---------- */
const M3={prog:null,u:{},a:{},meshes:{},trees:null,treeCount:0};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot3=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len3=a=>Math.hypot(a[0],a[1],a[2]),nrm=a=>{const l=len3(a)||1;return[a[0]/l,a[1]/l,a[2]/l];};
const rotAx=(v,a,t)=>{const c=Math.cos(t),s=Math.sin(t),k=cross(a,v),d=dot3(a,v);return[v[0]*c+k[0]*s+a[0]*d*(1-c),v[1]*c+k[1]*s+a[1]*d*(1-c),v[2]*c+k[2]*s+a[2]*d*(1-c)];};
const lerp3=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
function hexc(h){return[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255];}
// geometry builders push [pos, normal, colour] triangles into a flat array
function pushTri(out,a,b,c,col,na,nb,nc){const n=na?null:nrm(cross(sub(b,a),sub(c,a)));for(const[p,q]of[[a,na||n],[b,nb||n],[c,nc||n]])out.push(p[0],p[1],p[2],q[0],q[1],q[2],col[0],col[1],col[2]);}
function geoCylinder(out,seg,col,caps=true){for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU;const c0=[Math.cos(a0),0,Math.sin(a0)],c1=[Math.cos(a1),0,Math.sin(a1)];
  const p00=c0,p01=[c0[0],1,c0[2]],p10=c1,p11=[c1[0],1,c1[2]];pushTri(out,p00,p11,p10,col,c0,c1,c1);pushTri(out,p00,p01,p11,col,c0,c0,c1);
  if(caps){pushTri(out,[0,1,0],p11,p01,col,[0,1,0],[0,1,0],[0,1,0]);pushTri(out,[0,0,0],p00,p10,col,[0,-1,0],[0,-1,0],[0,-1,0]);}}}
function geoSphere(out,la,lo,col){for(let i=0;i<la;i++)for(let j=0;j<lo;j++){const P=(ii,jj)=>{const t=ii/la*Math.PI,f=jj/lo*TAU;return[Math.sin(t)*Math.cos(f),Math.cos(t),Math.sin(t)*Math.sin(f)];};
  const a=P(i,j),b=P(i+1,j),c=P(i+1,j+1),d=P(i,j+1);pushTri(out,a,c,b,col,a,c,b);pushTri(out,a,d,c,col,a,d,c);}}
function geoBox(out,col){const F=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[0,1,0],[1,0,0]]];
  for(const[n,u,v]of F){const c=mul(n,.5),q=(s,t)=>add(c,add(mul(u,s*.5),mul(v,t*.5)));pushTri(out,q(-1,-1),q(1,-1),q(1,1),col,n,n,n);pushTri(out,q(-1,-1),q(1,1),q(-1,1),col,n,n,n);}}
function icoTris(detail){const t=(1+Math.sqrt(5))/2;let V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(nrm);
  let F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]].map(f=>f.map(i=>V[i]));
  for(let d=0;d<detail;d++){const nf=[];for(const[a,b,c]of F){const ab=nrm(lerp3(a,b,.5)),bc=nrm(lerp3(b,c,.5)),ca=nrm(lerp3(c,a,.5));nf.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);}F=nf;}return F;}
const ICO0=icoTris(0),ICO1=icoTris(1);
function geoConeAt(out,T,br,hh,col,y0){const n=7;for(let i=0;i<n;i++){const a0=i/n*TAU,a1=(i+1)/n*TAU;const b0=T(Math.cos(a0)*br,y0,Math.sin(a0)*br),b1=T(Math.cos(a1)*br,y0,Math.sin(a1)*br),tp=T(0,y0+hh,0);pushTri(out,b0,tp,b1,mul(col,1.05),nrm([Math.cos(a0),.5,Math.sin(a0)]),[0,1,0],nrm([Math.cos(a1),.5,Math.sin(a1)]));}}
// trees for a hole merged into one static mesh: faceted leafy trees and pines
function buildTreeMesh(h){
  const out=[],R=rng(77),bark=[];if(R3.on){r3TreeSpecies(h);R3T.list=[];}const bv=(p,n,c,u,v)=>bark.push(...p,...n,...c,u,v);
  const PAL={oak:[['#2b5424','#3a6a2c','#50823a'],['#2f5a28','#3f7030','#58893f']],
    maple:[['#2f6b2c','#437f33','#5f9d42'],['#346f2a','#4c8a34','#69a846'],['#8a3b1f','#b5532a','#d9793a']],
    birch:[['#5f8a34','#7aa545','#98bf5c']],pine:[['#1d4a2a','#245836','#2c6740']]};
  const h3=v=>{const x=Math.sin(v[0]*12.9898+v[1]*78.233+v[2]*37.719)*43758.5453;return x-Math.floor(x);};
  const tri=(a,b,c,na,nb,nc,ca,cb,cc)=>{out.push(...a,...na,...ca,...b,...nb,...cb,...c,...nc,...cc);};
  const trunk=(t,T,tr,th,col,lean=[0,0])=>{for(let i=0;i<7;i++){const a0=i/7*TAU,a1=(i+1)/7*TAU;const c0=[Math.cos(a0),Math.sin(a0)],c1=[Math.cos(a1),Math.sin(a1)];
    const B0=T(c0[0]*tr,0,c0[1]*tr),B1=T(c1[0]*tr,0,c1[1]*tr),T0=T(c0[0]*tr*.7+lean[0],th,c0[1]*tr*.7+lean[1]),T1=T(c1[0]*tr*.7+lean[0],th,c1[1]*tr*.7+lean[1]);
    const n0=[c0[0],.15,c0[1]],n1=[c1[0],.15,c1[1]],dk=mul(col,.78);const Ur=Math.max(1,Math.round(TAU*tr/.8)),u0=i/7*Ur,u1=(i+1)/7*Ur,vt=th/(TAU*tr/Ur);
    bv(B0,n0,dk,u0,0);bv(T1,n1,col,u1,vt);bv(B1,n1,dk,u1,0);bv(B0,n0,dk,u0,0);bv(T0,n0,col,u0,vt);bv(T1,n1,col,u1,vt);}};
  const blob=(T,bx,by,bz,rx,ry,rz,set,ico)=>{const base=hexc(set[1]),hi=hexc(set[2]),lo=hexc(set[0]),tv=.9+.2*R();
    for(const f of ico){const P=[],Nn=[],Cc=[];for(const v of f){const d=1+.2*(h3(v)-.5);P.push(T(bx+v[0]*rx*d,by+v[1]*ry*d,bz+v[2]*rz*d));
        Nn.push(nrm([v[0]/rx+.25*(h3([v[1],v[2],v[0]])-.5)/rx,v[1]/ry,v[2]/rz+.25*(h3([v[2],v[0],v[1]])-.5)/rz]));
        const k=clamp(v[1]*.5+.5,0,1),ao=.55+.45*k,cc=k>.6?lerp3(base,hi,(k-.6)/.4):lerp3(lo,base,k/.6);Cc.push(mul(cc,ao*tv*(.92+.16*h3(mul(v,3)))));}
      tri(P[0],P[1],P[2],Nn[0],Nn[1],Nn[2],Cc[0],Cc[1],Cc[2]);}};
  const fol=[];
  const card=(C,u,v,n,col,atlas)=>{const u0=atlas?.505:.005,u1=atlas?.995:.495;const P=[add(add(C,mul(u,-1)),mul(v,-1)),add(add(C,u),mul(v,-1)),add(add(C,u),v),add(add(C,mul(u,-1)),v)],UV=[[u0,.99],[u1,.99],[u1,.01],[u0,.01]];
    for(const k of[0,1,2,0,2,3])fol.push(...P[k],...n,...col,...UV[k]);};
  const leaves=(T,bx,by,bz,rx,ry,rz,set,count)=>{const lo=hexc(set[0]),base=hexc(set[1]),hi=hexc(set[2]);
    for(let i=0;i<count*1.5;i++){let d=nrm([R()*2-1,R()*1.5-.45,R()*2-1]);const C=T(bx+d[0]*rx*.9,by+d[1]*ry*.9,bz+d[2]*rz*.9),sz=(rx+ry+rz)/3*(.36+R()*.22)*.86;
      const n=nrm(add(d,[R()-.5,R()-.5,R()-.5]));let t1=cross(n,[0,1,0]);if(len3(t1)<.1)t1=[1,0,0];t1=nrm(t1);const t2=cross(n,t1),a=R()*TAU;
      const u=mul(add(mul(t1,Math.cos(a)),mul(t2,Math.sin(a))),sz),v=mul(add(mul(t1,-Math.sin(a)),mul(t2,Math.cos(a))),sz);
      const k=clamp(d[1]*.5+.5,0,1),cc=mul(k>.55?lerp3(base,hi,(k-.55)/.45):lerp3(lo,base,k/.55),.82+R()*.3);card(C,u,v,nrm(add(mul(d,.8),mul(n,.2))),cc,false);}};
  const pineTier=(T,y0,br,hh,col)=>{const n=11;for(let i=0;i<n;i++){const a0=i/n*TAU,a1=(i+1)/n*TAU,j0=i%2?.8:1,j1=(i+1)%2?.8:1;
    const b0=T(Math.cos(a0)*br*j0,y0-(i%2?0:.35),Math.sin(a0)*br*j0),b1=T(Math.cos(a1)*br*j1,y0-((i+1)%2?0:.35),Math.sin(a1)*br*j1),tp=T(0,y0+hh,0);
    const n0=nrm([Math.cos(a0),.6,Math.sin(a0)]),n1=nrm([Math.cos(a1),.6,Math.sin(a1)]),nt=[0,1,0];tri(b0,tp,b1,n0,nt,n1,mul(col,.62),mul(col,1.08),mul(col,.62));
    tri(b0,b1,T(0,y0-.2,0),[0,-1,0],[0,-1,0],[0,-1,0],mul(col,.45),mul(col,.45),mul(col,.45));}
    // needle sprays hanging off the tier
    const m=12;for(let i=0;i<m;i++){const a=i/m*TAU+R()*.4,rad=[Math.cos(a),0,Math.sin(a)],tg=[-Math.sin(a),0,Math.cos(a)];
      const C=T(rad[0]*br*.62,y0+hh*.12,rad[2]*br*.62),u=mul(nrm(add(rad,[0,-.35,0])),br*.5),v=mul(tg,br*.32);card(C,u,v,nrm(add(rad,[0,.7,0])),mul(col,1.5+R()*.4),true);}};
  for(const t of h.allTrees){if(r3TreeTake(t))continue;
    const gh=t.gh||0,r=t.r,sp=t.sp||(t.shade>.62?'pine':'oak');
    const T=(x,y,z)=>[t.x+x,gh+y,t.y+z];
    if(sp==='pine'){const col=hexc(PAL.pine[0][Math.floor(R()*3)]);trunk(t,T,.45,3,hexc('#4e3522'));
      for(let k=0;k<5;k++){const br=r*(.74-k*.13),y0=1.8+k*r*.36,hh=r*.72;pineTier(T,y0,br,hh,mul(col,.9+k*.06));}}
    else if(sp==='birch'){const set=PAL.birch[0],bark=hexc('#ece8de');
      for(let k=0;k<3;k++){const a=k/3*TAU+t.shade*6,lx=Math.cos(a)*.9,lz=Math.sin(a)*.9;trunk(t,(x,y,z)=>T(x+(k?Math.cos(a)*.6:0),y,z+(k?Math.sin(a)*.6:0)),.28,r*.9+3,bark,[lx,lz]);}
      blob(T,0,r*.6+4,0,r*.42,r*.6,r*.42,[set[0],set[0],set[1]],ICO1);leaves(T,0,r*.62+4,0,r*.55,r*.78,r*.55,set,Math.round(r*3.4));}
    else if(sp==='maple'){const set=PAL.maple[t.shade<.12?2:(t.shade<.56?0:1)];trunk(t,T,.5,4.2,hexc('#5b3e27'));
      blob(T,0,4+r*.62,0,r*.6,r*.66,r*.6,[set[0],set[0],set[1]],ICO1);leaves(T,0,4+r*.64,0,r*.8,r*.88,r*.8,set,Math.round(r*4.2));leaves(T,-r*.3,4+r*1.05,r*.15,r*.45,r*.45,r*.45,set,Math.round(r*1.4));}
    else if(sp==='lpine'){const col=hexc(['#3b5a2a','#44632f','#35522a'][Math.floor(R()*3)]),th=r*1.6+8;trunk(t,T,.42,th,hexc('#5a4130'),[(t.shade-.5)*1.2,(R()-.5)*1.2]);
      blob(T,(t.shade-.5)*1.2,th+r*.18,0,r*.55,r*.3,r*.55,[mul(col,.7),col,mul(col,1.3)].map(c=>'#'+c.map(v=>Math.round(clamp(v,0,1)*255).toString(16).padStart(2,'0')).join('')),ICO1);
      leaves(T,(t.shade-.5)*1.2,th+r*.22,0,r*.7,r*.36,r*.7,['#2f4a22','#3f5f2c','#5a7a3c'],Math.round(r*2.4));}
    else if(sp==='liveoak'){const set=['#34462a','#435a33','#5f7446'];trunk(t,T,.9,2.6,hexc('#4a3d32'));
      for(const[a,l]of[[0,1],[2.1,.9],[4.2,1.1]]){const bx=Math.cos(a+t.shade*6)*r*.55*l,bz=Math.sin(a+t.shade*6)*r*.55*l;trunk(t,(x,y,z)=>T(x+bx*y/4,y+2.4,z+bz*y/4),.35,3,hexc('#4a3d32'));}
      blob(T,0,3.6+r*.32,0,r*1.25,r*.38,r*1.2,[set[0],set[0],set[1]],ICO1);leaves(T,0,3.7+r*.34,0,r*1.45,r*.48,r*1.4,set,Math.round(r*5.2));
      // Spanish moss: grey-green strands hanging from the underside of the canopy
      for(let i=0;i<Math.round(r*3);i++){const a=R()*TAU,d=Math.sqrt(R())*r*1.15,x=Math.cos(a)*d,z=Math.sin(a)*d,y0=3.3+r*.18,len=.9+R()*1.6,w=.18+R()*.16;
        const C=T(x,y0-len/2,z),u=[w,0,0],v=[0,len/2,0];card(C,u,v,[0,0,1],mul(hexc('#9aa38e'),.85+R()*.25),true);card(C,[0,0,w],v,[1,0,0],mul(hexc('#8c9682'),.85+R()*.25),true);}}
    else{const set=PAL.oak[t.shade<.5?0:1];trunk(t,T,.75,3.6,hexc('#4f3826'));
      blob(T,0,3.4+r*.5,0,r*.8,r*.46,r*.76,[set[0],set[0],set[1]],ICO1);leaves(T,0,3.4+r*.52,0,r*1.02,r*.62,r*.98,set,Math.round(r*4.6));leaves(T,r*.45,3.4+r*.8,-r*.3,r*.55,r*.38,r*.55,set,Math.round(r*1.5));leaves(T,-r*.5,3.4+r*.64,r*.35,r*.5,r*.35,r*.5,set,Math.round(r*1.4));}
  }
  // homes of the surrounding neighbourhood (front nine)
  for(const q of h.houses||[]){const c=Math.cos(q.rot),sn=Math.sin(q.rot),gh=(q.gh||0)-.3;
    const P=(x,y,z)=>[q.x+x*c-z*sn,gh+y,q.y+x*sn+z*c];const wall=hexc(q.col),roof=hexc(q.roof),hw=q.w/2,hd=q.d/2,wh=3.4,rh=2.8;
    const quad=(a,b2,c2,d2,col)=>{pushTri(out,a,b2,c2,col);pushTri(out,a,c2,d2,col);};
    quad(P(-hw,0,-hd),P(hw,0,-hd),P(hw,wh,-hd),P(-hw,wh,-hd),wall);quad(P(hw,0,hd),P(-hw,0,hd),P(-hw,wh,hd),P(hw,wh,hd),mul(wall,.9));
    quad(P(-hw,0,hd),P(-hw,0,-hd),P(-hw,wh,-hd),P(-hw,wh,hd),mul(wall,.8));quad(P(hw,0,-hd),P(hw,0,hd),P(hw,wh,hd),P(hw,wh,-hd),mul(wall,.95));
    pushTri(out,P(-hw,wh,-hd),P(hw,wh,-hd),P(0,wh+rh,-hd),wall);pushTri(out,P(hw,wh,hd),P(-hw,wh,hd),P(0,wh+rh,hd),mul(wall,.9));
    quad(P(-hw-.4,wh-.2,-hd-.4),P(-hw-.4,wh-.2,hd+.4),P(0,wh+rh,hd+.4),P(0,wh+rh,-hd-.4),roof);quad(P(hw+.4,wh-.2,hd+.4),P(hw+.4,wh-.2,-hd-.4),P(0,wh+rh,-hd-.4),P(0,wh+rh,hd+.4),mul(roof,.85));
    for(const wx of[-hw*.55,hw*.55]){const g2=hexc('#2c3a46');quad(P(wx-1,1.4,hd+.05),P(wx+1,1.4,hd+.05),P(wx+1,2.6,hd+.05),P(wx-1,2.6,hd+.05),g2);quad(P(wx+1,1.4,-hd-.05),P(wx-1,1.4,-hd-.05),P(wx-1,2.6,-hd-.05),P(wx+1,2.6,-hd-.05),g2);}}
  buildStructures(h,out);
  // wisps of native fescue so the tall grass reads up close
  const b=h.bounds,area=(b[2]-b[0])*(b[3]-b[1]),n=Math.min(9000,area/4);const gold=['#c6ae5c','#d8c37a','#a89449','#b9a45c'];
  for(let i=0;i<n;i++){const x=b[0]+R()*(b[2]-b[0]),z=b[1]+R()*(b[3]-b[1]);
    if(lieCodeAt(h,x,z)!==0||dplayAt(h,x,z)<1.5)continue;
    const y=hAtH(h,x,z),hh=.55+R()*.6,col=hexc(gold[Math.floor(R()*4)]),base=mul(col,.72);
    for(let k=0;k<3;k++){const a=R()*TAU,dx=Math.cos(a)*.14,dz=Math.sin(a)*.14,lx=(R()-.5)*.35,lz=(R()-.5)*.35;
      out.push(x-dx,y,z-dz,0,1,0,...base, x+dx,y,z+dz,0,1,0,...base, x+lx,y+hh,z+lz,0,1,0,...col);}}
  M3.trees=null;
  const fo=[];for(const t of (R3.on&&R3T.use?[]:h.farTrees||[])){const gh=t.gh||0,r=t.r,T=(x,y,z)=>[t.x+x,gh+y,t.y+z];
    if(t.sp==='lpine'){const th=r*1.6+8,col=hexc(['#3b5a2a','#44632f','#35522a'][Math.floor(t.shade*3)]);for(let i=0;i<4;i++){const a0=i/4*TAU,a1=(i+1)/4*TAU,c0=[Math.cos(a0)*.4,Math.sin(a0)*.4],c1=[Math.cos(a1)*.4,Math.sin(a1)*.4];pushTri(fo,T(c0[0],0,c0[1]),T(c1[0],th,c1[1]),T(c1[0],0,c1[1]),hexc('#5a4130'));pushTri(fo,T(c0[0],0,c0[1]),T(c0[0],th,c0[1]),T(c1[0],th,c1[1]),hexc('#5a4130'));}
      for(const f of ICO0){const P=f.map(v=>T(v[0]*r*.6,th+r*.2+v[1]*r*.32,v[2]*r*.6)),N=f.map(v=>nrm([v[0],v[1]*1.8,v[2]])),Cc=f.map(v=>mul(col,.75+.3*clamp(v[1]*.5+.5,0,1)));fo.push(...P[0],...N[0],...Cc[0],...P[1],...N[1],...Cc[1],...P[2],...N[2],...Cc[2]);}}
    else if(t.sp==='pine'||t.sp==='spruce'||t.sp==='redcedar'||t.sp==='baldcypress'){const col=hexc(PAL.pine[0][Math.floor(t.shade*3)]);trunk(t,T,.4,2.2,hexc('#4e3522'));geoConeAt(fo,T,r*.62,r*2.1,mul(col,.95),1.6);}
    else{const set=t.sp==='liveoak'?['#34462a','#435a33','#5f7446']:t.sp==='maple'?PAL.maple[t.shade<.15?2:0]:PAL.oak[t.shade<.5?0:1];const tr=[];if(t.sp==='liveoak'){t.r*=1.25;}
      for(let i=0;i<4;i++){const a0=i/4*TAU,a1=(i+1)/4*TAU,c0=[Math.cos(a0)*.55,Math.sin(a0)*.55],c1=[Math.cos(a1)*.55,Math.sin(a1)*.55];pushTri(fo,T(c0[0],0,c0[1]),T(c1[0],3.6,c1[1]),T(c1[0],0,c1[1]),hexc('#4f3826'));pushTri(fo,T(c0[0],0,c0[1]),T(c0[0],3.6,c0[1]),T(c1[0],3.6,c1[1]),hexc('#4f3826'));}
      const base=hexc(set[1]),lo=hexc(set[0]),hi=hexc(set[2]),sy=r*.55,sx=r*.85;
      for(const f of ICO0){const P=f.map(v=>T(v[0]*sx,3.3+r*.5+v[1]*sy,v[2]*sx)),N=f.map(v=>nrm([v[0]/sx,v[1]/sy,v[2]/sx])),C=f.map(v=>{const k=clamp(v[1]*.5+.5,0,1);return mul(k>.6?lerp3(base,hi,(k-.6)/.4):lerp3(lo,base,k/.6),.75+.25*k);});
        fo.push(...P[0],...N[0],...C[0],...P[1],...N[1],...C[1],...P[2],...N[2],...C[2]);}}}
  r3SetTrees(out,fo,fol,bark);
}
function earClip(pts){const P=pts.slice();let area=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];area+=a[0]*b[1]-b[0]*a[1];}if(area<0)P.reverse();
  const tris=[],cr=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);let guard=0;
  while(P.length>3&&guard++<5000){let cut=false;for(let i=0;i<P.length;i++){const a=P[(i+P.length-1)%P.length],b=P[i],c=P[(i+1)%P.length];if(cr(a,b,c)<=0)continue;
    let inside=false;for(const q of P){if(q===a||q===b||q===c)continue;if(cr(a,b,q)>0&&cr(b,c,q)>0&&cr(c,a,q)>0){inside=true;break;}}
    if(inside)continue;tris.push([a,b,c]);P.splice(i,1);cut=true;break;}if(!cut)break;}
  if(P.length===3)tris.push([P[0],P[1],P[2]]);return tris;}
function drawMesh(mesh,Mx,Nx,tint,alpha=1){r3Push(mesh,Mx,tint,alpha);}
// model matrix from an origin and three orthogonal (scaled) axis vectors
// the matrix is scratch: every caller hands it straight to drawMesh, which copies it (the old normal matrix was never read)
const BASIS_M=new Float32Array(16),BASIS_R=[BASIS_M,null];
function basisM(o,X,Y,Z){const M=BASIS_M;M[0]=X[0];M[1]=X[1];M[2]=X[2];M[3]=0;M[4]=Y[0];M[5]=Y[1];M[6]=Y[2];M[7]=0;M[8]=Z[0];M[9]=Z[1];M[10]=Z[2];M[11]=0;M[12]=o[0];M[13]=o[1];M[14]=o[2];M[15]=1;return BASIS_R;}
function perpOf(a){const t=Math.abs(a[1])<.9?[0,1,0]:[1,0,0];return nrm(cross(a,t));}
function cylAB(A,B,r,col,alpha){const Y=sub(B,A);if(len3(Y)<1e-4)return;const X=mul(perpOf(nrm(Y)),r),Z=mul(nrm(cross(X,Y)),r);const[M,N]=basisM(A,X,Y,Z);drawMesh(M3.meshes.cyl,M,N,col,alpha);}
function sphAt(C,rx,ry,rz,col,X=[1,0,0],Y=[0,1,0],Z=[0,0,1],alpha){const[M,N]=basisM(C,mul(X,rx),mul(Y,ry),mul(Z,rz));drawMesh(M3.meshes.sph,M,N,col,alpha);}
function boxAt(C,X,Y,Z,col){const[M,N]=basisM(C,X,Y,Z);drawMesh(M3.meshes.box,M,N,col);}


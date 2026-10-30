/* ---- post chain: bright pass + 3-level bloom, depth AO, final (FXAA, AO, bloom, ACES, sun glare, grade, vignette, dither) ---- */
const R3_PV=`varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}`;
function r3PostInit(){const T=THREE,P=R3.post={dirty:true,rt:{},m:{}};
  const tri=new T.BufferGeometry();tri.setAttribute('position',new T.BufferAttribute(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));
  P.quad=new T.Mesh(tri);P.quad.frustumCulled=false;P.scene=new T.Scene();P.scene.add(P.quad);P.cam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const mk=(name,fs,us)=>{const u={};for(const k of us)u[k]={value:null};P.m[name]=new T.ShaderMaterial({uniforms:u,vertexShader:R3_PV,fragmentShader:'varying vec2 vUv;'+fs,depthTest:false,depthWrite:false});};
  mk('bright',`uniform sampler2D src;uniform vec2 px;uniform float hdr;
    void main(){vec3 c=(texture2D(src,vUv+px*vec2(-.5,-.5)).rgb+texture2D(src,vUv+px*vec2(.5,-.5)).rgb+texture2D(src,vUv+px*vec2(-.5,.5)).rgb+texture2D(src,vUv+px*vec2(.5,.5)).rgb)*.25;
     float l=max(max(c.r,c.g),c.b);float k=hdr>.5?max(l-1.9,0.)/max(l,1e-4):smoothstep(.9,1.,l)*.6;c*=k;c=min(c,vec3(30.));gl_FragColor=vec4(c,1.);}`,['src','px','hdr']);
  mk('down',`uniform sampler2D src;uniform vec2 px;void main(){gl_FragColor=vec4((texture2D(src,vUv+px*vec2(-.5,-.5)).rgb+texture2D(src,vUv+px*vec2(.5,-.5)).rgb+texture2D(src,vUv+px*vec2(-.5,.5)).rgb+texture2D(src,vUv+px*vec2(.5,.5)).rgb)*.25,1.);}`,['src','px']);
  mk('blur',`uniform sampler2D src;uniform vec2 dir;void main(){vec3 c=texture2D(src,vUv).rgb*.227;
     c+=(texture2D(src,vUv+dir*1.385).rgb+texture2D(src,vUv-dir*1.385).rgb)*.316;c+=(texture2D(src,vUv+dir*3.231).rgb+texture2D(src,vUv-dir*3.231).rgb)*.0703;gl_FragColor=vec4(c,1.);}`,['src','dir']);
  const DEPTH=`uniform sampler2D dep;uniform vec3 K;float lz(float d){float z=d*2.-1.;return 18000.0/(30000.3-z*29999.7);}
    vec3 vp(vec2 q){float z=lz(texture2D(dep,q).r);vec2 n=q*2.-1.;return vec3(n.x*z/K.x,(n.y-K.z)*z/K.y,z);}`;
  mk('ao',DEPTH+`uniform vec2 px;
    float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){float d0=texture2D(dep,vUv).r;if(d0>.99999){gl_FragColor=vec4(1.);return;}
     vec3 P=vp(vUv);if(P.z>140.){gl_FragColor=vec4(1.);return;}
     vec3 px1=vp(vUv+vec2(px.x,0.)),px0=vp(vUv-vec2(px.x,0.)),py1=vp(vUv+vec2(0.,px.y)),py0=vp(vUv-vec2(0.,px.y));
     vec3 dx=abs(px1.z-P.z)<abs(P.z-px0.z)?px1-P:P-px0,dy=abs(py1.z-P.z)<abs(P.z-py0.z)?py1-P:P-py0;
     vec3 N=normalize(cross(dx,dy));if(dot(N,P)>0.)N=-N;
     float Rw=clamp(P.z*.05,.45,3.);vec2 rad=vec2(K.x,K.y)*.5*Rw/P.z;
     if(rad.x<px.x*1.5){gl_FragColor=vec4(1.);return;}
     float a0=h(gl_FragCoord.xy)*6.2832,occ=0.,bias=.004*P.z+.01;
     for(int i=0;i<12;i++){float t=(float(i)+.5)/12.;float a=a0+t*6.2832*3.;vec2 o=vec2(cos(a),sin(a))*rad*t;
       vec3 v=vp(vUv+o)-P;float vv=dot(v,v);occ+=max(dot(v,N)-bias,0.)/(vv+.02*Rw*Rw)*max(0.,1.-vv/(Rw*Rw));}
     float ao=pow(max(0.,1.-2.2*Rw*occ/12.),1.6);
     ao=mix(ao,1.,smoothstep(70.,140.,P.z));gl_FragColor=vec4(vec3(ao),1.);}`,['dep','K','px']);
  mk('aob',DEPTH+`uniform sampler2D src;uniform vec2 dir;
    void main(){float z0=lz(texture2D(dep,vUv).r),s=0.,w=0.;
     for(int i=-3;i<=3;i++){vec2 q=vUv+dir*float(i)*1.5;float z=lz(texture2D(dep,q).r),k=exp(-abs(z-z0)/(.04*z0+.05))*(1.-abs(float(i))/4.5);s+=texture2D(src,q).r*k;w+=k;}
     gl_FragColor=vec4(vec3(s/max(w,1e-4)),1.);}`,['dep','K','src','dir']);
  mk('final',P_ACES+DEPTH+`uniform sampler2D scene,b1,b2,b3,ao,dof;uniform vec2 px;uniform float hdr,aoOn,bloomK,expo,asp,fxaaOn;uniform vec3 sunP,dofP;
    vec3 lin(vec2 q){return texture2D(scene,q).rgb;}
    float lu(vec3 c){if(hdr>.5)c=c/(1.+c);return dot(c,vec3(.299,.587,.114));}
    vec3 fxaa(){vec3 cM=lin(vUv);if(fxaaOn<.5)return cM;vec3 cNW=lin(vUv+vec2(-px.x,px.y)),cNE=lin(vUv+px),cSW=lin(vUv-px),cSE=lin(vUv+vec2(px.x,-px.y));
     float lM=lu(cM),lNW=lu(cNW),lNE=lu(cNE),lSW=lu(cSW),lSE=lu(cSE);
     float mn=min(lM,min(min(lNW,lNE),min(lSW,lSE))),mx=max(lM,max(max(lNW,lNE),max(lSW,lSE)));
     if(mx-mn<max(.03,mx*.12))return cM;
     vec2 d=vec2(-((lNW+lNE)-(lSW+lSE)),(lNW+lSW)-(lNE+lSE));float red=max((lNW+lNE+lSW+lSE)*.03125,1./128.);
     float rc=1./(min(abs(d.x),abs(d.y))+red);d=clamp(d*rc,-8.,8.)*px;
     vec3 A=.5*(lin(vUv+d*(1./3.-.5))+lin(vUv+d*(2./3.-.5)));vec3 B=A*.5+.25*(lin(vUv-d*.5)+lin(vUv+d*.5));
     float lB=lu(B);return(lB<mn||lB>mx)?A:B;}
    float hsh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    ${GLSL_GRADE}
    void main(){vec3 c=fxaa();
     if(dofP.z>0.){float z=lz(texture2D(dep,vUv).r),fz=dofP.x;float k=smoothstep(fz*1.35,fz*3.2,z)+(1.-smoothstep(fz*.3,fz*.62,z));
       c=mix(c,texture2D(dof,vUv).rgb,clamp(k,0.,1.)*dofP.z);}
     if(aoOn>.5)c*=mix(1.,texture2D(ao,vUv).r,.85);
     vec3 bl=texture2D(b1,vUv).rgb*.42+texture2D(b2,vUv).rgb*.38+texture2D(b3,vUv).rgb*.5;c+=bl*bloomK;
     if(hdr>.5)c=sqrt(aces(c*expo));
     if(sunP.z>0.){float v=0.;for(int i=0;i<5;i++){vec2 o=(i==0?vec2(0.):i==1?vec2(-4.,-4.):i==2?vec2(4.,-4.):i==3?vec2(-4.,4.):vec2(4.,4.))*px;vec3 q=lin(sunP.xy+o);v+=step(hdr>.5?8.:.995,max(q.r,max(q.g,q.b)));}v=v/5.*sunP.z;
       vec2 dd=(vUv-sunP.xy)*vec2(asp,1.);float r=length(dd);c+=vec3(1.,.88,.66)*v*(.2*exp(-r*9.)+.06*exp(-r*2.2));
       vec2 ax=vec2(.5)-sunP.xy;
       for(int k=0;k<4;k++){float t=.55+float(k)*.42;vec2 gp=sunP.xy+ax*t*2.;float sz=.025+.03*float(k==2)+.012*float(k);float gr=length((vUv-gp)*vec2(asp,1.));
         vec3 tn=k==0?vec3(.9,.7,.4):k==1?vec3(.4,.8,.6):k==2?vec3(.5,.6,1.):vec3(1.,.5,.4);c+=tn*v*.045*smoothstep(sz,sz*.55,gr);}}
     c=grade(c);
     vec2 vq=(vUv-.5)*vec2(asp,1.)*1.25;c*=1.-.26*smoothstep(.35,1.05,dot(vq,vq)*1.6);
     c+=(hsh(gl_FragCoord.xy)-.5)/255.;
     gl_FragColor=vec4(c,1.);}`,['scene','b1','b2','b3','ao','px','hdr','aoOn','bloomK','expo','asp','sunP','fxaaOn','dep','K','dof','dofP']);}
function r3PostTargets(){const T=THREE,P=R3.post,q=r3Q(),sz=R3.szV||(R3.szV=new T.Vector2());R3.renderer.getDrawingBufferSize(sz);const w=sz.x,h=sz.y;
  const dep=!!q.ao||R3.tv.dof>0;if(!P.dirty&&P.w===w&&P.h===h&&P.msaa===q.msaa&&P.dep===dep)return;if(typeof HTR==='object')HTR.m+='rt:'+(P.dirty?'d':'')+(P.w!==w||P.h!==h?'s':'')+(P.msaa!==q.msaa?'m':'')+(P.dep!==dep?'p':'')+' ';for(const k in P.rt)P.rt[k].dispose();P.rt={};P.w=w;P.h=h;P.msaa=q.msaa;P.dep=dep;P.dirty=false;
  const type=R3.hf?T.HalfFloatType:T.UnsignedByteType;P.hdr=!!R3.hf;
  const rt=(W2,H2,o={})=>new T.WebGLRenderTarget(Math.max(1,W2),Math.max(1,H2),{type:o.type||type,format:T.RGBAFormat,colorSpace:T.NoColorSpace,depthBuffer:!!o.depth,stencilBuffer:false,samples:o.samples||0,minFilter:T.LinearFilter,magFilter:T.LinearFilter,generateMipmaps:false});
  const s=P.rt.scene=rt(w,h,{depth:true,samples:q.msaa});if(dep)s.depthTexture=new T.DepthTexture(w,h,T.UnsignedIntType);
  // only the buffers this quality level draws into are made (a change of level comes back through here)
  if(q.bloom){for(const[n,d]of[['b1',1],['b2',2],['b3',3]]){P.rt[n+'a']=rt(w>>d,h>>d);P.rt[n+'b']=rt(w>>d,h>>d);}}
  else P.rt.b1a=P.rt.b2a=P.rt.b3a=rt(1,1);   // stand-ins: the final pass still names them, at zero strength
  if(R3.tv.dof>0){P.rt.dfa=rt(w>>1,h>>1);P.rt.dfb=rt(w>>2,h>>2);P.rt.dfc=rt(w>>2,h>>2);}
  if(q.ao){P.rt.aoa=rt(w>>1,h>>1,{type:T.UnsignedByteType});P.rt.aob=rt(w>>1,h>>1,{type:T.UnsignedByteType});}}
/* a depth buffer nothing reads afterwards: tell the GPU not to write it back to memory (phone GPUs keep it on chip otherwise) */
function r3DropDepth(rt){if(!rt||rt.depthTexture||rt.samples>0)return;const gl=R3.renderer.getContext();if(gl.invalidateFramebuffer)gl.invalidateFramebuffer(gl.FRAMEBUFFER,[gl.DEPTH_ATTACHMENT]);}
function r3Pass(name,target,set){const P=R3.post,m=P.m[name];set(m.uniforms);P.quad.material=m;R3.renderer.setRenderTarget(target||null);R3.renderer.render(P.scene,P.cam);}
const R3_V2=[];function r3V2(k,x,y){return(R3_V2[k]||(R3_V2[k]=new THREE.Vector2())).set(x,y);}
function r3Post(){const P=R3.post,q=r3Q(),t=P.rt,w=P.w,h=P.h,hd=P.hdr?1:0;
  const blank=t.b1a.texture;
  if(q.bloom){r3Pass('bright',t.b1a,u=>{u.src.value=t.scene.texture;u.px.value=r3V2(1,1/w,1/h);u.hdr.value=hd;});
    const blur=(a,b)=>{r3Pass('blur',b,u=>{u.src.value=a.texture;u.dir.value=r3V2(2,1/a.width,0);});r3Pass('blur',a,u=>{u.src.value=b.texture;u.dir.value=r3V2(3,0,1/a.height);});};
    blur(t.b1a,t.b1b);r3Pass('down',t.b2a,u=>{u.src.value=t.b1a.texture;u.px.value=r3V2(4,1/t.b1a.width,1/t.b1a.height);});blur(t.b2a,t.b2b);
    r3Pass('down',t.b3a,u=>{u.src.value=t.b2a.texture;u.px.value=r3V2(5,1/t.b2a.width,1/t.b2a.height);});blur(t.b3a,t.b3b);}
  const Kv=(R3.KV||(R3.KV=new THREE.Vector3())).set(2*V.f/W,2*V.f/H,1-2*V.cy/H);
  if(q.ao){r3Pass('ao',t.aoa,u=>{u.dep.value=t.scene.depthTexture;u.K.value=Kv;u.px.value=r3V2(6,1/t.aoa.width,1/t.aoa.height);});
    r3Pass('aob',t.aob,u=>{u.dep.value=t.scene.depthTexture;u.K.value=Kv;u.src.value=t.aoa.texture;u.dir.value=r3V2(7,1/t.aoa.width,0);});
    r3Pass('aob',t.aoa,u=>{u.dep.value=t.scene.depthTexture;u.K.value=Kv;u.src.value=t.aob.texture;u.dir.value=r3V2(8,0,1/t.aoa.height);});}
  // depth of field for the broadcast shots: a soft quarter-res copy blended in by distance from the focus
  const tv=R3.tv,dofWant=0;   // depth of field off: it misreads depth on iPhone Safari and murks the whole frametv.dof+=(dofWant-tv.dof)*.08;if(tv.dof<.01)tv.dof=0;
  if(tv.dof>0&&t.dfa){r3Pass('down',t.dfa,u=>{u.src.value=t.scene.texture;u.px.value=r3V2(9,1/w,1/h);});
    r3Pass('down',t.dfb,u=>{u.src.value=t.dfa.texture;u.px.value=r3V2(10,1/t.dfa.width,1/t.dfa.height);});
    r3Pass('blur',t.dfc,u=>{u.src.value=t.dfb.texture;u.dir.value=r3V2(11,1.4/t.dfb.width,0);});r3Pass('blur',t.dfb,u=>{u.src.value=t.dfc.texture;u.dir.value=r3V2(12,0,1.4/t.dfb.height);});}
  const fY=G.state==='flight'?G.bY:hAt(G.ball.x,G.ball.y),fD=Math.max(4,hyp(G.ball.x-V.E[0],fY-V.E[1],G.ball.y-V.E[2]));
  let sp=(R3.SPV||(R3.SPV=new THREE.Vector3())).set(0,0,0);const s=proj(V.E[0]+SUN[0]*4000,V.E[1]+SUN[1]*4000,V.E[2]+SUN[2]*4000);
  if(s&&s[0]>-40&&s[0]<W+40&&s[1]>-40&&s[1]<H+40){const edge=clamp(Math.min(s[0]+40,W+40-s[0],s[1]+40,H+40-s[1])/120,0,1);sp.set(s[0]/W,1-s[1]/H,edge);}
  r3Pass('final',null,u=>{u.scene.value=t.scene.texture;u.b1.value=q.bloom?t.b1a.texture:blank;u.b2.value=t.b2a.texture;u.b3.value=t.b3a.texture;u.ao.value=q.ao?t.aoa.texture:blank;
    u.px.value=r3V2(13,1/w,1/h);u.hdr.value=1;u.aoOn.value=q.ao?1:0;u.bloomK.value=q.bloom?(P.hdr?.55:.35):0;u.expo.value=.97*R3.expoK;u.asp.value=W/H;u.sunP.value=sp;u.fxaaOn.value=q.msaa?0:1;
    u.dep.value=t.scene.depthTexture||blank;u.K.value=Kv;u.dof.value=tv.dof>0&&t.dfb?t.dfb.texture:blank;u.dofP.value=(R3.DPV||(R3.DPV=new THREE.Vector3())).set(fD,0,tv.dof*.45);});}

function r3Reflect(){const q=r3Q(),WU=R3.WU;WU.rfOn.value=0;if(!q.ao||!R3.water||!G.hole||G.overview){R3.rfHave=false;return;}
  // the pond nearest to the view, if it is on screen
  let best=null;for(const w of G.hole.water){if(w.lv)continue;const y=(w.lvl!==undefined?w.lvl:-1.1)+.14,c=proj(w.x,y,w.y);const d=Math.min(hyp(w.x-V.E[0],w.y-V.E[2]),polyDist(w,V.E[0],V.E[2],400));if(V.E[1]<y+.5||d>300)continue;
    const on=c&&c[0]>-W&&c[0]<2*W&&c[1]>-H&&c[1]<2*H;const sc=d*(on?1:4);if(!best||sc<best.sc)best={y,sc};}
  if(!best||best.sc>900)return;R3.rfN=(R3.rfN||0)+1;if(R3.rfHave&&R3.rfY===best.y&&(R3.camStill?R3.rfN%3!==0:R3.rfN%2!==0)){WU.rfOn.value=1;return;}R3.rfY=best.y;R3.rfHave=true;
  const l=best.y,T3=THREE,P=R3.post,rd=R3.renderer;
  if(!P.rf||P.rf.width!==P.w>>1){if(P.rf)P.rf.dispose();P.rf=new T3.WebGLRenderTarget(Math.max(1,P.w>>1),Math.max(1,P.h>>1),{type:R3.hf?T3.HalfFloatType:T3.UnsignedByteType,depthBuffer:true,colorSpace:T3.NoColorSpace});}
  const E0=V.E,F0=V.F,R0=V.R;const E1=[E0[0],2*l-E0[1],E0[2]],F1=[F0[0],-F0[1],F0[2]],R1=[R0[0],-R0[1],R0[2]],U1=cross(R1,F1);
  const n=.3,f=30000,Kx=2*V.f/W,Ky=2*V.f/H,Kz=1-2*V.cy/H,mc=R3.mcam||(R3.mcam=new T3.PerspectiveCamera());mc.matrixAutoUpdate=false;mc.matrixWorldAutoUpdate=false;
  mc.matrixWorld.set(R1[0],U1[0],-F1[0],E1[0], R1[1],U1[1],-F1[1],E1[1], R1[2],U1[2],-F1[2],E1[2], 0,0,0,1);mc.matrixWorldInverse.copy(mc.matrixWorld).invert();mc.position.set(...E1);
  mc.projectionMatrix.copy(R3.cam.projectionMatrix);mc.projectionMatrixInverse.copy(R3.cam.projectionMatrixInverse);
  const U=R3.U;U.E.value.set(...E1);U.R.value.set(...R1);U.U.value.set(...U1);U.Fw.value.set(...F1);
  const wv=R3.water.visible,gv=R3.grass&&R3.grass.visible;R3.water.visible=false;if(R3.grass)R3.grass.visible=false;const glv=(R3G.lods||[]).map(l=>l.m.visible);for(const l of R3G.lods||[])l.m.visible=false;
  const fade=U.r3fade.value;U.r3fade.value=0;rd.clippingPlanes=[new T3.Plane(new T3.Vector3(0,1,0),-l+.05)];
  rd.setRenderTarget(P.rf);rd.clear(true,true,false);rd.render(R3.scene,mc);r3DropDepth(P.rf);rd.clippingPlanes=[];
  R3.water.visible=wv;if(R3.grass)R3.grass.visible=gv;(R3G.lods||[]).forEach((l,i)=>l.m.visible=glv[i]);U.r3fade.value=fade;
  U.E.value.set(...V.E);U.R.value.set(...V.R);U.U.value.set(...V.U);U.Fw.value.set(...V.F);
  WU.rfM.value.multiplyMatrices(mc.projectionMatrix,mc.matrixWorldInverse);WU.rfT.value=P.rf.texture;WU.rfOn.value=1;}
/* scouting a shot: a slope grid round the landing spot (the green keeps its own finer grid) */
function r3ScoutSlope(){const f=G.fc,h=G.hole;if(!f||!h||G.state!=='aim'||curClub().putter||f.fly)return false;
  if(lieAt(f.tx,f.tz)==='green'||polyDist(h.green,f.tx,f.tz,3)<2)return false;
  const S=R3.scS||(R3.scS={}),RD=20,ppy=1.5;
  if(!S.tex||S.h!==h||Math.hypot(f.tx-S.cx,f.tz-S.cz)>4){const cx=f.tx,cz=f.tz,x0=cx-RD,y0=cz-RD,n=Math.round(2*RD*ppy),d=new Uint8Array(n*n*4);
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=x0+(i+.5)/ppy,y=y0+(j+.5)/ppy,o=(j*n+i)*4,[gx,gy]=gradAt(x,y),mg=hyp(gx,gy);
      const dx=mg>.004?-gx/mg:0,dy=mg>.004?-gy/mg:0,k=clamp((mg*100-SLOPE_LO)/(SLOPE_HI-SLOPE_LO),0,1),r=hyp(x-cx,y-cz),L=lieAt(x,y);
      d[o]=Math.round((dx*.5+.5)*255);d[o+1]=Math.round((dy*.5+.5)*255);d[o+2]=Math.round(k*255);d[o+3]=L==='water'||L==='ob'?0:Math.round(clamp((RD*.92-r)/(RD*.4),0,1)*255);}
    if(S.tex)S.tex.dispose();S.tex=r3DataTex(d,n,n);S.h=h;S.cx=cx;S.cz=cz;S.R=[x0,y0,2*RD,2*RD];}
  return true;}
/* Oct 2026 perf: shadow cache. While the sun's view of the course stays put (aiming, the swing meter), the trees' part of the
   shadow map is kept, and each update only puts it back (one flat pass) and redraws the things that move (golfer, club, flag, ball) on top. */
function r3ShcStatic(o){return o===R3.trees||o===R3.bark||o===R3.fol||!!o.userData.shStatic;}
function r3ShcInit(){const rd=R3.renderer,sm=rd.shadowMap;if(sm.__shc||window.__noShc)return;sm.__shc=1;const orig=sm.render,T3=THREE;
  const C=R3.shc={valid:false,mode:null,sig:'',rt:null,st:[],n:{dyn:0,cap:0,full:0}};
  // the restore pass: the kept map's packed depth goes back into both the colour and the depth buffer
  const qm=new T3.ShaderMaterial({uniforms:{tMap:{value:null}},vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:'#include <packing>\nuniform sampler2D tMap;void main(){vec4 c=texelFetch(tMap,ivec2(gl_FragCoord.xy),0);gl_FragDepth=unpackRGBAToDepth(c);gl_FragColor=c;}',
    depthTest:true,depthWrite:true,depthFunc:T3.AlwaysDepth,blending:T3.NoBlending,toneMapped:false});
  const qg=new T3.BufferGeometry();qg.setAttribute('position',new T3.BufferAttribute(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));
  const qmesh=new T3.Mesh(qg,qm);qmesh.frustumCulled=false;C.qs=new T3.Scene();C.qs.add(qmesh);C.qc=new T3.OrthographicCamera(-1,1,1,-1,0,1);C.qm=qm;
  const cast=(list,v)=>{for(const o of list)o.castShadow=v;};
  const noClear=f=>{const c=rd.clear;rd.clear=function(){};try{f();}finally{rd.clear=c;}};
  sm.render=function(lights,scene,cam){if(scene!==R3.scene)return orig.call(this,lights,scene,cam);
    const mode=C.mode,sh=R3.sun&&R3.sun.shadow,live=this.enabled&&(this.needsUpdate||this.autoUpdate)&&lights.length;C.mode=null;
    if(!live)return orig.call(this,lights,scene,cam);
    if(mode==='dyn'){C.n.dyn++;cast(C.st,false);try{noClear(()=>orig.call(this,lights,scene,cam));}finally{cast(C.st,true);}return;}
    if(mode!=='cap'||!sh||!sh.map){C.n.full++;if(typeof HTR==='object')HTR.m+='shF ';return orig.call(this,lights,scene,cam);}
    // capture: the still things alone, kept (colour only: it holds the packed depth); then the moving things over them
    const st=[],dy=[];scene.traverse(o=>{if(o.castShadow&&(o.isMesh||o.isLine||o.isPoints))(r3ShcStatic(o)?st:dy).push(o);});
    cast(dy,false);try{orig.call(this,lights,scene,cam);}finally{cast(dy,true);}
    const m=sh.map;if(!C.rt||C.rt.width!==m.width||C.rt.height!==m.height){if(C.rt)C.rt.dispose();C.rt=new T3.WebGLRenderTarget(m.width,m.height,{minFilter:T3.NearestFilter,magFilter:T3.NearestFilter,depthBuffer:false});rd.initRenderTarget(C.rt);}
    const P=rd.properties,gl=rd.getContext(),fa=P.get(m).__webglFramebuffer,fb=P.get(C.rt).__webglFramebuffer;C.valid=false;
    if(fa&&fb){gl.disable(gl.SCISSOR_TEST);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fa);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,fb);   // raw binds (three's cache can't be trusted for the read binding), then a state reset
      gl.blitFramebuffer(0,0,m.width,m.height,0,0,m.width,m.height,gl.COLOR_BUFFER_BIT,gl.NEAREST);C.valid=C.blitOK!==undefined?C.blitOK:(C.blitOK=gl.getError()===0);const crt=rd.getRenderTarget(),cf=rd.getActiveCubeFace(),cm=rd.getActiveMipmapLevel();rd.resetState();rd.setRenderTarget(crt,cf,cm);}
    C.st=st;C.n.cap++;C.map=m;if(typeof HTR==='object')HTR.m+='shCap ';
    this.needsUpdate=true;cast(st,false);try{noClear(()=>orig.call(this,lights,scene,cam));}finally{cast(st,true);}};}
// each frame, before anything is drawn: full / capture / put back the kept trees and redraw only what moves
function r3ShcPlan(){const C=R3.shc,rd=R3.renderer;if(!C)return;if(window.__shcOff){C.mode=null;C.valid=false;return;}if(!rd.shadowMap.needsUpdate){C.mode=null;return;}
  const s=R3.sun,sh=s.shadow,sc=sh.camera,K=C.sigK||(C.sigK=new Float64Array(9));   // the sun's view as numbers (was a string each update)
  let same=C.sigOK===true;const vals=C.sigV||(C.sigV=[0,0,0,0,0,0,0,0,0]);vals[0]=s.position.x;vals[1]=s.position.y;vals[2]=s.position.z;vals[3]=s.target.position.x;vals[4]=s.target.position.z;vals[5]=sc.right;vals[6]=sc.far;vals[7]=sh.mapSize.x;vals[8]=rd.shadowMap.type;
  for(let i=0;i<9;i++){const v=Math.round(vals[i]*1000);if(K[i]!==v){same=false;K[i]=v;}}C.sigOK=true;if(!same)C.valid=false;
  if(same&&C.valid&&C.rt&&sh.map===C.map&&sh.map.width===C.rt.width){
    {const ac=rd.autoClear,rt=rd.getRenderTarget();rd.autoClear=false;C.qm.uniforms.tMap.value=C.rt.texture;rd.setRenderTarget(sh.map);rd.render(C.qs,C.qc);rd.setRenderTarget(rt);rd.autoClear=ac;}
    rd.shadowMap.needsUpdate=true;C.mode='dyn';}
  /* Oct 2026: with the sticky shadow box a move is a one-off, so keep the trees from the first draw after it (it used to wait for a
     second update with the same box, drawing every tree twice per move); a box that moves update after update still draws in full */
  else{C.chg=same?0:(C.chg||0)+1;C.mode=C.chg<=1?'cap':null;}}
function r3Hold(){if(!swAfter()||!R3.on||G.aiTurn||G.replay||!(G.state==='power'||G.state==='acc')){R3.holdSig=null;return false;}
  // the camera settles on the address view by easing: once it's within a few millimetres of the last drawn picture, hold that picture
  const H0=R3.holdSig;if(H0&&Math.abs(V.E[0]-H0[0])+Math.abs(V.E[1]-H0[1])+Math.abs(V.E[2]-H0[2])<.004&&Math.abs(V.F[0]-H0[3])+Math.abs(V.F[1]-H0[4])+Math.abs(V.F[2]-H0[5])<2e-4)return true;
  const K=R3.holdK||(R3.holdK=new Float64Array(6));K[0]=V.E[0];K[1]=V.E[1];K[2]=V.E[2];K[3]=V.F[0];K[4]=V.F[1];K[5]=V.F[2];R3.holdSig=K;return false;}
function r3Render(){const rd=R3.renderer;if(!G.hole)return;R3.sun.intensity=SUN_COL[0]*Math.PI*R3.sunK;R3.scene.environmentIntensity=R3.envK;
  r3Camera();r3Shadow();r3PoolsBegin();r3Dynamic();r3PoolsEnd();
  // green slope grid: fade and orientation, exactly as before
  { const h=G.hole,GU=R3.GU,want=slopeWanted(),now=performance.now(),dtf=Math.min(.5,(now-(R3.tPrev||now))/1000);R3.tPrev=now;GL.slFade=(GL.slFade||0)+((want?1:0)-(GL.slFade||0))*(1-Math.exp(-dtf*7));if(GL.slFade<.003)GL.slFade=0;
    GU.slOn.value=GL.slH===h?GL.slFade:0;
    const moving=G.state==='flight'||G.state==='bounce'||G.state==='roll'||G.state==='holed';const o=G.state==='replay'&&G.golferAt?G.golferAt:moving&&G.prev?G.prev:G.ball;
    const dx=h.pin[0]-o.x,dz=h.pin[1]-o.y,l=Math.hypot(dx,dz);if(l>.3||!GL.slRotV)GL.slRotV=l>.3?[dx/l,dz/l]:[1,0];GU.slRot.value.set(GL.slRotV[0],GL.slRotV[1]);GU.slMode.value=window.__slMode!==undefined?window.__slMode:(R3.slMode||0);GU.slBall.value.set(o.x,o.y,l);GU.SLPX.value=1/(V.f||600); }
  { const GU=R3.GU,sc=r3ScoutSlope(),keep=!sc&&R3.scOn&&GL.slFade>0&&!slopeWanted();
    if((sc||keep)&&R3.scS&&R3.scS.tex){GU.slT.value=R3.scS.tex;GU.SLB.value.set(...R3.scS.R);const[ax,az]=dirOf(G.aim);GU.slRot.value.set(ax,az);GU.slOn.value=GL.slFade;GU.SLG.value=2;R3.scOn=true;}
    else if(R3.scOn){R3.scOn=false;GU.slT.value=GL.slTex;GU.SLG.value=1;if(GL.slR)GU.SLB.value.set(...GL.slR);} }
  if(R3.waterN){R3.waterN.offset.set(T*.012,T*.007);}if(R3.WU)R3.WU.wT.value=T;
  if(typeof r3TreeLOD==='function')r3TreeLOD(false);if(typeof r3ReedLOD==='function')r3ReedLOD(false);r3GrassUpdate();{const now2=performance.now(),dt2=Math.min(.1,(now2-(R3.tTr||now2))/1000);R3.tTr=now2;r3Tracer(dt2);}r3PostTargets();{const sk=R3.shK||(R3.shK=new Float64Array(6));let same=R3.shKok===true;for(let i=0;i<6;i++){const v=Math.round((i<3?V.E[i]:V.F[i-3])*1000);if(sk[i]!==v){same=false;sk[i]=v;}}R3.shKok=true;   /* the view to the mm, as numbers (it was a string built every frame) */
    const still=same&&G.state==='aim'&&!(typeof R3R!=='undefined'&&R3R.on)&&!G.fc;
    R3.camStill=same;R3.shN=(R3.shN||0)+1;const shEv=r3Q().shEv||2;rd.shadowMap.needsUpdate=G.state==='power'||G.state==='acc'||(!still&&(R3.shN%shEv===0||G.state==='intro'))||R3.shN%(shEv*3)===0;   /* during the meter every frame, so frames cost the same and the cursor moves evenly */
    r3ShcInit();r3ShcPlan();}r3Reflect();
  rd.setRenderTarget(R3.post.rt.scene);rd.setClearColor(0x000000,1);rd.clear(true,true,false);rd.render(R3.scene,R3.cam);r3DropDepth(R3.post.rt.scene);
  r3Post();}

/* ===================== GPU grass field =====================
   Blade tiles are laid around the ball and the camera every frame. Each blade finds its own ground height,
   surface (rough / fescue) and colour in the vertex shader, so the field follows the course exactly and
   fades out where the mown grass begins. Density thins with distance; three tile densities keep the vertex
   count down. */
const R3G={S:4,caps:[110,64,36,18,8],on:true};
function r3GrassGeo(cap,seed){const T=THREE,S=R3G.S,n=Math.round(cap*S*S),R=rng(seed),simple=cap<12;
  const vpb=simple?3:5,pos=new Float32Array(n*vpb*3),bl=new Float32Array(n*vpb*4),idx=[];
  const shape=simple?[[-1,0],[1,0],[0,1]]:[[-1,0],[1,0],[-.72,.5],[.72,.5],[0,1]];
  for(let i=0;i<n;i++){const ox=R()*S,oz=R()*S,a=R(),b=R(),rank=(i+.5)/n;
    for(let k=0;k<vpb;k++){const o=(i*vpb+k);pos[o*3]=shape[k][0];pos[o*3+1]=shape[k][1];pos[o*3+2]=rank;bl[o*4]=ox;bl[o*4+1]=oz;bl[o*4+2]=a;bl[o*4+3]=b;}
    const q=i*vpb;if(simple)idx.push(q,q+1,q+2);else idx.push(q,q+1,q+2,q+1,q+3,q+2,q+2,q+3,q+4);}
  const g=new T.InstancedBufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('bl',new T.BufferAttribute(bl,4));
  g.setIndex(new T.BufferAttribute(n*vpb>65535?new Uint32Array(idx):new Uint16Array(idx),1));
  const to=new T.InstancedBufferAttribute(new Float32Array(1200*2),2);to.setUsage(T.DynamicDrawUsage);g.setAttribute('tileOff',to);g.instanceCount=0;
  g.boundingSphere=new T.Sphere(new T.Vector3(),1e6);return g;}
const R3_GRASS_VS_HEAD=`attribute vec4 bl;attribute vec2 tileOff;uniform sampler2D hT,gSurf,gTex;uniform vec4 hB,gSB,gB,gC0,gC1,gD,wV,tK;uniform float hN,gCap;uniform sampler2D noiseT;varying vec3 vGc;
  float r3h(vec2 q){vec2 f=(q-hB.xy)/hB.z;f=clamp(f,vec2(0.),vec2(hB.w-1.001,hN-1.001));ivec2 i=ivec2(floor(f));vec2 t=f-vec2(i);
    float a=texelFetch(hT,i,0).r,b=texelFetch(hT,i+ivec2(1,0),0).r,c=texelFetch(hT,i+ivec2(0,1),0).r,d=texelFetch(hT,i+ivec2(1,1),0).r;
    return mix(mix(a,b,t.x),mix(c,d,t.x),t.y);}
  float r3dens(float d,vec4 C){return 1.-smoothstep(C.z,C.w,d);}`;
const R3_GRASS_VS=`
  vec2 gq=tileOff+bl.xy;
  float dd0=length(gq-gC0.xy),dd1=length(gq-gC1.xy);
  float dens=max(r3dens(dd0,gC0),r3dens(dd1,gC1))*gD.x;          // blades per m^2 wanted here
  float keep=step(position.z*gCap,dens);
  vec4 sw=vec4(0.);
  if(keep>0.){vec2 su=(gq-gSB.xy+.5)/gSB.zw;if(su.x>=0.&&su.y>=0.&&su.x<=1.&&su.y<=1.)sw=textureLod(gSurf,su,0.);}
  vec3 gW=vec3(0.,-1e5,0.);vec3 objectNormal=vec3(0.,1.,0.);vGc=vec3(0.);
  if(keep*(sw.g+sw.b)>0.){                                        // only blades that grow here do the rest of the work
  float ra=bl.z,rb=bl.w;
  float hR=sw.g*mix(.075,.155,rb)*tK.z,hF=sw.b*mix(.3,.82,rb*rb);
  vec2 cl=textureLod(noiseT,gq/17.,0.).rg;
  float fw=sw.b/(sw.g+sw.b+1e-4)*(1.-gD.y);   // how much this blade is fescue (not on desert courses)
  float hgt=max(hR,hF)*(.55+.9*cl.x)*mix(1.,.45+1.1*smoothstep(.3,.75,textureLod(noiseT,gq/4.3+.31,0.).r),fw);   // fescue grows in tussocks
  float nb=length(gq-gD.zw);hgt*=mix(.22,1.,smoothstep(.35,.8,nb));   // let the ball sit up in the rough
  float thin=clamp(sqrt(gD.x/max(dens,1.)),1.,3.2);
  float wdt=mix(.011,.009,sw.b)*thin*(.8+.4*ra)*step(.004,hgt);
  float ang=ra*6.2832;vec2 fd=vec2(cos(ang),sin(ang)),sd=vec2(-fd.y,fd.x);
  float t=position.y;
  float lean=(rb-.5)*.9+sw.b*.35;
  float gust=sin(ctime*1.7+gq.x*.35+gq.y*.27)*.5+sin(ctime*2.9+gq.x*.8)*.25;
  vec2 bend=fd*lean*hgt+wV.xy*(wV.z*(.35+.65*gust))*hgt*(1.+.7*fw);
  gW=vec3(gq.x,r3h(gq)-.015,gq.y);
  gW.xz+=sd*position.x*wdt*(1.-t*.8)+bend*t*t;
  gW.y+=hgt*t*(1.-.18*dot(bend,bend)/max(hgt*hgt,1e-4));
  vec3 bn=normalize(vec3(fd.x,0.,fd.y)-vec3(bend.x,0.,bend.y)*2.*t);
  objectNormal=normalize(mix(bn,vec3(0.,1.,0.),.55+.25*t));
  vec3 gc=textureLod(gTex,(gq-gB.xy)/gB.zw,1.).rgb;gc=mix(vec3(dot(gc,vec3(.299,.587,.114))),gc,.78)*.9;
  vec3 tip=mix(gc*vec3(1.18,1.26,1.02),vec3(.86,.78,.5),min(1.,sw.b*.55*tK.w+sw.g*max(0.,tK.w-1.)*.5));
  vec3 cc=mix(gc*.42,tip,smoothstep(0.,1.,t))*(.84+.32*rb)*(.86+.28*cl.y);
  if(fw>.01){float gold=smoothstep(.35,.8,fract(ra*7.31+cl.y*.7))*clamp(.35+.4*tK.w,0.,1.);   // some stems still green, some gone to golden seed
    vec3 fb=vec3(.28,.33,.18),fm=mix(vec3(.5,.57,.34),vec3(.68,.62,.38),gold),ft=mix(vec3(.66,.68,.45),vec3(.9,.81,.55),gold);
    vec3 fc=(t<.6?mix(fb,fm,t/.6):mix(fm,ft,(t-.6)/.4))*(.86+.28*rb)*(.9+.2*cl.y);cc=mix(cc,fc,fw);}
  vGc=cc*cc;}`;
function r3GrassInit(){const T=THREE;
  R3.GRU={bkOn:R3.GU.bkOn,bkT:R3.GU.bkT,bkB:R3.GU.bkB,bkK:R3.GU.bkK,tK:R3.tK,hT:{value:null},hB:{value:new T.Vector4()},hN:{value:1},gC0:{value:new T.Vector4()},gC1:{value:new T.Vector4()},gD:{value:new T.Vector4(R3G.caps[0],0,1e5,1e5)},wV:{value:new T.Vector4()},
    gSurf:R3.GU.gSurf,gSB:R3.GU.gSB,gTex:R3.GU.gTex,gB:R3.GU.gB};
  R3G.lods=R3G.caps.map((cap,k)=>{const geo=r3GrassGeo(cap,901+k*77);
    const mat=r3Patch(new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:.88,metalness:0}),{grass:true,twoSided:true,translucent:true,uniforms:{...R3.GRU,gCap:{value:cap}}});
    const m=new THREE.Mesh(geo,mat);m.frustumCulled=false;m.receiveShadow=true;m.castShadow=false;m.visible=false;R3.scene.add(m);return{cap,geo,m,list:[]};});}
// which tiles, at which density, this frame
function r3GrassUpdate(){if(!R3G.lods)return;const L=R3G.lods;for(const l of L){l.m.visible=false;l.geo.instanceCount=0;}
  const h=G.hole,q=r3Q();if(!h||!R3.hT||!q.grass||G.overview||G.state==='intro'||G.state==='card')return;
  const f=G.fc&&G.state==='aim'?G.fc:null;if(f&&f.dist>140)return;
  const U=R3.GRU,k=q.grass;const bx=G.ball.x,bz=G.ball.y;
  // two density centres: the ball (or the look-at point) and the ground under the camera
  const c0=f?[f.tx,f.tz]:[bx,bz],r00=14*k,r01=46*k;const ex=V.E[0],ez=V.E[2],eh=V.E[1]-hAt(ex,ez);
  const c1=[ex+V.F[0]*6,ez+V.F[2]*6],r10=eh<12?10*k:0,r11=eh<12?30*k:0;
  U.gC0.value.set(c0[0],c0[1],r00,r01);U.gC1.value.set(c1[0],c1[1],r10,Math.max(r11,.01));U.gD.value.set(R3G.caps[0],CUR.scen==='desert'?1:0,bx,bz);
  const wd=dirOf(G.wind?G.wind.a:0),ws=clamp((G.wind?G.wind.mph:0)/16,0,1);U.wV.value.set(wd[0],wd[1],.12+.5*ws,0);
  const S=R3G.S,D0=R3G.caps[0];
  // nothing that decides the tiles has moved since the last frame (the usual case while aiming): keep the same tiles
  { const g=R3G.sig||(R3G.sig=new Float64Array(24)),n=[k,c0[0],c0[1],r00,r01,c1[0],c1[1],r10,r11,ex,ez,V.E[1],V.F[0],V.F[1],V.F[2],V.R[0],V.R[2],W,V.f,D0,S];let same=R3G.sigH===h&&R3G.cnt&&R3G.cnt.length===L.length;
    for(let i=0;i<n.length;i++){if(g[i]!==n[i]){same=false;g[i]=n[i];}}
    if(same){for(let i=0;i<L.length;i++){L[i].geo.instanceCount=R3G.cnt[i];L[i].m.visible=R3G.cnt[i]>0;}return;}R3G.sigH=null; }
  const dens=(d,r0,r1)=>r1<=0?0:1-smooth(r0,r1,d);
  let I0=1e9,I1=-1e9,J0=1e9,J1=-1e9;for(const[c,r1]of[[c0,r01],[c1,r11]]){if(r1<=0)continue;I0=Math.min(I0,Math.floor((c[0]-r1)/S));I1=Math.max(I1,Math.floor((c[0]+r1)/S));J0=Math.min(J0,Math.floor((c[1]-r1)/S));J1=Math.max(J1,Math.floor((c[1]+r1)/S));}
  const NI=Math.max(1,I1-I0+1),need=NI*Math.max(1,J1-J0+1);if(!R3G.stamp||R3G.stamp.length<need)R3G.stamp=new Int32Array(need*2);const stp=R3G.stamp,sv=R3G.sv=((R3G.sv|0)+1)&0x3fffffff||1;
  const tryTile=(i,j)=>{const key=(i-I0)+(j-J0)*NI;if(stp[key]===sv)return;stp[key]=sv;
    const x=i*S,z=j*S,cx=x+S/2,cz=z+S/2,rr=S*.71;
    const a0=cx-c0[0],b0=cz-c0[1],a1=cx-c1[0],b1=cz-c1[1],d0=Math.max(0,Math.sqrt(a0*a0+b0*b0)-rr),d1=Math.max(0,Math.sqrt(a1*a1+b1*b1)-rr);
    const want=Math.max(dens(d0,r00,r01),dens(d1,r10,r11))*D0;if(want<.4)return;
    // view test: keep tiles in front of the camera and inside the horizontal field of view (with margin)
    const dx=cx-ex,dz=cz-ez,dy=hAt(cx,cz)-V.E[1];const cz2=dx*V.F[0]+dy*V.F[1]+dz*V.F[2];
    if(Math.sqrt(dx*dx+dz*dz)>rr+2){if(cz2<-rr)return;const cxs=dx*V.R[0]+dz*V.R[2],sx=Math.abs(cxs)/Math.max(cz2,.5);if(sx>(W/2)/V.f*1.25+rr/Math.max(cz2,.5))return;}
    if(!r3GrassTileHas(h,i,j))return;
    let lv=L.length-1;while(lv>0&&L[lv].cap<want)lv--;const l=L[lv];if(l.geo.instanceCount>=1200)return;
    const a=l.geo.attributes.tileOff.array;a[l.geo.instanceCount*2]=x;a[l.geo.instanceCount*2+1]=z;l.geo.instanceCount++;};
  for(const[c,r1]of[[c0,r01],[c1,r11]]){if(r1<=0)continue;const i0=Math.floor((c[0]-r1)/S),i1=Math.floor((c[0]+r1)/S),j0=Math.floor((c[1]-r1)/S),j1=Math.floor((c[1]+r1)/S);
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)tryTile(i,j);}
  for(const l of L){if(l.geo.instanceCount){l.m.visible=true;l.geo.attributes.tileOff.needsUpdate=true;}}
  R3G.cnt=L.map(l=>l.geo.instanceCount);R3G.sigH=h;}

/* ===================== TV broadcast presentation =====================
   A shot director that cuts from the down-the-line view to a camera placed near where the ball will come down
   (greenside for approaches), a glowing ball tracer, and a touch of depth of field on those shots. */
R3.tv={f:null,cam:null,cutDone:false,land:null,trail:null,fade:0,dof:0};
function r3TvPlan(f){// where does this flight come down?
  let u=.5,p=flightPos(f,u);for(;u<2.4;u+=.01){p=flightPos(f,u);if(p[2]<=hAt(p[0],p[1])+.03)break;}
  const lx=p[0],lz=p[1],carry=hyp(lx-f.sx,lz-f.sy);const d=travelDir(f,Math.min(u,1)),s=[-d[1],d[0]],h=G.hole,pin=h.pin;
  const nearPin=hyp(lx-pin[0],lz-pin[1])<45;
  const cands=nearPin?[[d[0]*30+s[0]*9,d[1]*30+s[1]*9,4.2],[d[0]*30-s[0]*9,d[1]*30-s[1]*9,4.2],[s[0]*26+d[0]*12,s[1]*26+d[1]*12,6]]
    :[[s[0]*30+d[0]*16,s[1]*30+d[1]*16,6.5],[-s[0]*30+d[0]*16,-s[1]*30+d[1]*16,6.5],[d[0]*42,d[1]*42,7]];
  let best=null;
  for(const[ox,oz,ht]of cands){const ex=lx+ox,ez=lz+oz;let sc=0;const lie=lieAt(ex,ez);if(lie==='water')sc+=40;if(lie==='ob')sc+=8;
    for(const t of h.allTrees||h.trees){const tx=t.x-ex,tz=t.y-ez,dd=Math.hypot(tx,tz);if(dd<t.r+3)sc+=30;
      // trees between the camera and the landing spot block the view
      const vx=lx-ex,vz=lz-ez,vl=Math.hypot(vx,vz),k=clamp((tx*vx+tz*vz)/(vl*vl),0,1),px=ex+vx*k-t.x,pz=ez+vz*k-t.y;if(k>.05&&k<.95&&Math.hypot(px,pz)<t.r*.9)sc+=12;}
    if(!best||sc<best.sc)best={sc,E:[ex,Math.max(hAt(ex,ez),hAt(lx,lz))+ht,ez]};}
  return{land:[lx,lz],carry,E:best.E,uLand:u};}
function r3TvCam(){const tv=R3.tv,st=G.state;
  if(!R3.on||G.replay||G.overview){tv.cam=null;return null;}
  {const rc=typeof r3RoutineCam==='function'?r3RoutineCam():null;if(rc){tv.cam=null;return rc;}}
  if(G.flight&&G.flight!==tv.f){const f=G.flight;tv.f=f;tv.cutDone=false;tv.trail=f;tv.fade=1;tv.hole=G.hole;
    const pl=r3TvPlan(f);tv.plan=pl.carry>95&&!f.club.putter?pl:null;}
  if(st==='aim'||st==='power'||st==='acc'||st==='intro'||st==='card'){tv.cam=null;tv.f=G.flight||null;return null;}
  if(typeof FLY_TV!=='undefined'&&!FLY_TV){tv.cam=null;return null;}   // trailing the ball: the game's own camera follows it all the way
  const pl=tv.plan;if(!pl||!tv.f||!(st==='flight'||st==='bounce'||st==='roll'||st==='wait'))return null;
  const f=tv.f;if(!tv.cutDone&&G.flight===f&&f.u<=.34&&G.golferAt&&G.followT>=(G.launchAt||0)+.25){
    // down the line: stay behind the player and watch the ball climb away, tracer drawing behind it
    const ga=G.golferAt,[ax,az]=dirOf(ga.aim),g0=hAt(ga.x,ga.y);return{E:[ga.x-ax*11,g0+3.2,ga.y-az*11],L:[G.ball.x,G.bY*.8+g0*.2,G.ball.y],zoom:1+f.u*.9};}
  if(!tv.cutDone){if(!(G.flight===f&&f.u>.34))return null;tv.cutDone=true;tv.cam=pl.E;
    const bY=G.flight?G.bY:hAt(G.ball.x,G.ball.y);return{E:[...pl.E],L:[G.ball.x,bY,G.ball.y],cut:true,zoom:r3TvZoom(pl.E)};}
  const bY=st==='flight'?G.bY:hAt(G.ball.x,G.ball.y);return{E:[...tv.cam],L:[G.ball.x,bY,G.ball.y],zoom:r3TvZoom(tv.cam)};}
function r3TvZoom(E){const d=hyp(G.ball.x-E[0],G.ball.y-E[2]);return clamp(d/32,1,1.9);}
// tracer ribbon along the flight path, rebuilt each frame
function r3TracerInit(){const T=THREE,N=160,g=new T.BufferGeometry();
  g.setAttribute('position',new T.BufferAttribute(new Float32Array(N*2*3),3).setUsage(T.DynamicDrawUsage));g.setAttribute('uv',new T.BufferAttribute(new Float32Array(N*2*2),2).setUsage(T.DynamicDrawUsage));
  const id=[];for(let i=0;i<N-1;i++){const a=i*2;id.push(a,a+1,a+2,a+1,a+3,a+2);}g.setIndex(id);g.boundingSphere=new T.Sphere(new T.Vector3(),1e6);
  const m=new T.ShaderMaterial({uniforms:{col:{value:new T.Vector3(2.4,.34,.1)},op:{value:1}},transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,side:T.DoubleSide,
    vertexShader:`varying vec2 vu;void main(){vu=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vu;uniform vec3 col;uniform float op;void main(){float a=1.-pow(abs(vu.y*2.-1.),2.);float core=smoothstep(.55,1.,a);
      vec3 c=col*a+vec3(1.3,.55,.3)*core;c*=smoothstep(0.,.06,vu.x)*op;gl_FragColor=vec4(c,1.);}`});
  const mesh=new T.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=6;mesh.visible=false;R3.scene.add(mesh);R3.tracer={mesh,g,N};}
function r3Tracer(dt){const tr=R3.tracer,tv=R3.tv;if(!tr)return;tr.mesh.visible=false;const f=tv.trail;
  const st=G.state;if(f&&(tv.hole!==G.hole||st==='intro'||st==='card')){tv.trail=null;return;}
  if(!f||G.replay||G.overview||f.club.putter||(typeof R3R!=='undefined'&&R3R.post.on&&R3R.post.t>=0))return;
  if(st==='aim'||st==='power'||st==='acc'){tv.fade=Math.max(0,tv.fade-dt*1.5);if(tv.fade<=0){tv.trail=null;return;}}
  const u1=Math.min(f.u,tv.plan?tv.plan.uLand:f.u);if(u1<.01)return;
  const N=tr.N,P=tr.g.attributes.position.array,UV=tr.g.attributes.uv.array;
  // the ribbon only changes while the ball is still flying or the camera moves
  if(tr.kf===f&&tr.ku===u1&&tr.ke0===V.E[0]&&tr.ke1===V.E[1]&&tr.ke2===V.E[2]){tr.mesh.material.uniforms.op.value=tv.fade;tr.mesh.visible=true;return;}
  tr.kf=f;tr.ku=u1;tr.ke0=V.E[0];tr.ke1=V.E[1];tr.ke2=V.E[2];
  const p=tr.sp||(tr.sp=[0,0,0]),pn=tr.sn||(tr.sn=[0,0,0]),pp=tr.sq||(tr.sq=[0,0,0]),q=tr.sr||(tr.sr=[0,0,0]);   // reused each frame (no garbage)
  for(let i=0;i<N;i++){const u=u1*i/(N-1);flightPosTo(f,u,p);q[0]=p[0];q[1]=p[2];q[2]=p[1];
    flightPosTo(f,Math.min(u1,u+.01),pn);flightPosTo(f,Math.max(0,u-.01),pp);let tx=pn[0]-pp[0],ty=pn[2]-pp[2],tz=pn[1]-pp[1];
    const cx=V.E[0]-q[0],cy=V.E[1]-q[1],cz=V.E[2]-q[2],cd=Math.hypot(cx,cy,cz)||1;let sx=ty*cz-tz*cy,sy=tz*cx-tx*cz,sz=tx*cy-ty*cx;const sl=Math.hypot(sx,sy,sz)||1;
    const w=Math.max(.05,cd*.0032);sx*=w/sl;sy*=w/sl;sz*=w/sl;
    const o=i*6,o2=i*4;P[o]=q[0]-sx;P[o+1]=q[1]-sy;P[o+2]=q[2]-sz;P[o+3]=q[0]+sx;P[o+4]=q[1]+sy;P[o+5]=q[2]+sz;UV[o2]=i/(N-1);UV[o2+1]=0;UV[o2+2]=i/(N-1);UV[o2+3]=1;}
  tr.g.attributes.position.needsUpdate=true;tr.g.attributes.uv.needsUpdate=true;tr.mesh.material.uniforms.op.value=tv.fade;tr.mesh.visible=true;}

// leaf atlas at twice the old resolution, same layout: a broadleaf cluster (left) and a pine spray (right)
function r3LeafAtlas(){const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d'),R=rng(4242);
  g.lineCap='round';
  for(let i=0;i<9;i++){const a=R()*TAU,l=120+R()*70;g.strokeStyle='rgb(92,72,52)';g.lineWidth=3.5;g.beginPath();g.moveTo(256,256);const mx=256+Math.cos(a)*l*.5+(R()-.5)*30,my=256+Math.sin(a)*l*.5+(R()-.5)*30;
    g.quadraticCurveTo(mx,my,256+Math.cos(a)*l,256+Math.sin(a)*l);g.stroke();}
  const leaf=(x,y,rot,L,Wd,v,dark)=>{g.save();g.translate(x,y);g.rotate(rot);const gr=g.createLinearGradient(0,-Wd,0,Wd);
    const k=dark?.62:1;gr.addColorStop(0,`rgb(${v*.8*k|0},${v*.94*k|0},${v*.66*k|0})`);gr.addColorStop(.5,`rgb(${v*.97*k|0},${v*k|0},${v*.8*k|0})`);gr.addColorStop(1,`rgb(${v*.74*k|0},${v*.86*k|0},${v*.6*k|0})`);
    g.fillStyle=gr;g.beginPath();g.moveTo(-L,0);g.bezierCurveTo(-L*.4,-Wd*1.25,L*.45,-Wd*1.05,L,0);g.bezierCurveTo(L*.45,Wd*1.05,-L*.4,Wd*1.25,-L,0);g.fill();
    g.strokeStyle='rgba(40,50,20,.28)';g.lineWidth=1.1;g.beginPath();g.moveTo(-L*.95,0);g.lineTo(L*.9,0);g.stroke();
    g.lineWidth=.6;for(let t=-.6;t<.8;t+=.3){g.beginPath();g.moveTo(L*t,0);g.lineTo(L*(t+.22),-Wd*.7);g.moveTo(L*t,0);g.lineTo(L*(t+.22),Wd*.7);g.stroke();}g.restore();};
  // inner (shadowed) leaves first, then the sunlit outer ones
  for(let pass=0;pass<2;pass++)for(let i=0;i<(pass?420:260);i++){const a=R()*TAU,r=Math.sqrt(R())*(pass?206:170),x=256+Math.cos(a)*r,y=256+Math.sin(a)*r*.95;
    const v=Math.round(150+R()*105),L=10+R()*9,Wd=L*(.38+R()*.14);leaf(x,y,a+(R()-.5)*1.6,L,Wd,v,pass===0);}
  g.save();g.translate(512,0);g.strokeStyle='rgb(110,85,60)';g.lineWidth=5;g.beginPath();g.moveTo(28,256);g.quadraticCurveTo(250,246,488,256);g.stroke();
  for(let i=0;i<900;i++){const t=R(),x=28+t*460,s=R()<.5?-1:1,len=(1-t*.55)*(80+R()*100),a=s*(.45+R()*.65),v=Math.round(130+R()*120);
    g.strokeStyle=`rgb(${v*.82|0},${v},${v*.78|0})`;g.lineWidth=1.6+R()*.8;g.beginPath();g.moveTo(x,256+s*R()*5);g.quadraticCurveTo(x+Math.cos(a)*len*.3,256+Math.sin(a)*len*.55,x+Math.cos(a)*len*.55,256+Math.sin(a)*len);g.stroke();}
  g.restore();return c;}

function r3GrassTileHas(h,i,j){if(R3G.maskH!==h){R3G.maskH=h;R3G.mask=new Map();}const key=i*100003+j;let v=R3G.mask.get(key);if(v!==undefined)return v;
  const S=R3G.S;v=false;for(let a=0;a<=S&&!v;a+=1)for(let b=0;b<=S;b+=1){const c=lieCodeAt(h,i*S+a,j*S+b);if((c===1||(c===0&&CUR.scen!=='desert'))&&!coverAt(h,i*S+a,j*S+b)){v=true;break;}}R3G.mask.set(key,v);return v;}


function drawRangeLabels(){const h=G.hole;if(!h.range||!h.targets)return;sctx.font='700 13px "Barlow Semi Condensed",system-ui,sans-serif';sctx.textAlign='center';sctx.textBaseline='middle';
  const boxes=[],hit=(x,y,w)=>boxes.some(b=>Math.abs(b[0]-x)<(b[2]+w)/2+3&&Math.abs(b[1]-y)<22);   // nearest first; a label that would cover another moves up once, or is left out
  for(const t of h.targets.slice().sort((a,b)=>a.d-b.d)){const g=hAt(t.x,t.y),top=proj(t.x,g+2.6,t.y);if(!top)continue;
    const tx=Math.round(hyp(t.x,t.y))+'y',w=sctx.measureText(tx).width+18;let y=top[1]-16;if(hit(top[0],y,w)){y-=22;if(hit(top[0],y,w))continue;}boxes.push([top[0],y,w]);
    sctx.fillStyle='rgba(12,30,46,.85)';sctx.beginPath();sctx.roundRect(top[0]-w/2,y-10,w,20,10);sctx.fill();
    sctx.fillStyle=t.col;sctx.beginPath();sctx.arc(top[0]-w/2+8,y,3,0,TAU);sctx.fill();sctx.fillStyle='#fff6dc';sctx.fillText(tx,top[0]+3,y);}}
function drawPinLabel(){
  if(G.hole.range)return;const h=G.hole,px=h.pin[0],pz=h.pin[1],gp=hAt(px,pz);const pc=proj(px,gp,pz);if(!pc)return;const ps=Math.max(1,30/(2.6*pc[3]));
  const top=proj(px,gp+2.6*ps,pz);if(!top||G.inCup||(aimingState()&&curClub().putter))return;
  const tx=Math.round(pinDist())+'y';sctx.font='700 13px "Barlow Semi Condensed",system-ui,sans-serif';const w=sctx.measureText(tx).width+14;
  sctx.fillStyle='rgba(12,30,46,.85)';sctx.beginPath();sctx.roundRect(top[0]-w/2,top[1]-26,w,20,10);sctx.fill();
  sctx.fillStyle='#fff6dc';sctx.textAlign='center';sctx.textBaseline='middle';sctx.fillText(tx,top[0],top[1]-16);
}
function renderScene(){
  sctx.setTransform(dpr,0,0,dpr,0,0);if(SCX.drew){sctx.clearRect(0,0,W,H);SCX.drew=false;}
  const h=G.hole;if(!h)return;
  const aiming=aimingState()&&!G.overview,club=curClub();
  const gB=hAt(G.ball.x,G.ball.y);
  // flowing dots show which way the green falls
  slopeShown=slopeWanted();
  if(slopeShown&&!GL.slOK){
    const g=h.green;
    for(let x=g.bb[0];x<=g.bb[2];x+=1.5)for(let y=g.bb[1];y<=g.bb[3];y+=1.5){
      if(!inPoly(g,x,y)||polyDist(g,x,y,2)>-.5)continue;
      const[gx,gy]=gradAt(x,y);const mag=hyp(gx,gy);if(mag<.004)continue;const c=-gx/mag,s=-gy/mag;
      const ph=((T*.5*Math.min(2,mag*GACC/.4)+(x*c+y*s)/8)%1+1)%1,o=(ph-.5)*1.4;
      const qx=x+c*o,qy=y+s*o;const p=proj(qx,hAt(qx,qy)+.03,qy);if(!p||p[2]>80)continue;
      // colour by steepness: green (gentle) -> yellow -> orange -> red (severe)
      const k=clamp((mag*100-SLOPE_LO)/(SLOPE_HI-SLOPE_LO),0,1),al=.9*Math.sin(ph*Math.PI),r=clamp(.08*p[3],1.3,4);
      sctx.fillStyle='rgba(8,20,30,'+al*.55+')';sctx.beginPath();sctx.arc(p[0],p[1]+.6,r+1,0,TAU);sctx.fill();
      sctx.fillStyle='hsla('+Math.round(125*(1-k))+',95%,'+(56-k*4)+'%,'+al+')';
      sctx.beginPath();sctx.arc(p[0],p[1],r,0,TAU);sctx.fill();
    }
  }
  for(const f of G.fx){const e=groundEllipse(f.x,f.y,f.type==='splash'?2+f.t*8:.6+f.t*3,4);if(!e)continue;const a=1-f.t;sctx.lineWidth=2;
    sctx.strokeStyle=f.type==='sand'?'rgba(240,224,171,'+a+')':'rgba(255,255,255,'+a*.8+')';
    for(let i=0;i<(f.type==='splash'?4:1);i++){sctx.beginPath();sctx.ellipse(e.x,e.y,e.rx*(1+i*.4),e.ry*(1+i*.4),0,0,TAU);sctx.stroke();}}
  // aim: predicted arc (terrain-aware) and landing ring
  if(aiming){
    const Mv=club.putter?null:shotMods(),D=previewDist()*(Mv?Mv.carry:1),[dx,dz]=dirOf(G.aim),pxv=-dz,pzv=dx,cv=Mv?Mv.curve*D:0;let mx,mz,landD;
    if(club.putter){
      mx=G.ball.x+dx*D;mz=G.ball.y+dz*D;landD=D;
      for(let i=1;i<=30;i++){const u=i/30,qx=G.ball.x+dx*D*u,qz=G.ball.y+dz*D*u;const p=projTo(qx,hAt(qx,qz)+.05,qz,PJ);if(p){sctx.fillStyle='rgba(255,255,255,.9)';sctx.beginPath();sctx.arc(p[0],p[1],clamp(.06*p[3],1.4,3),0,TAU);sctx.fill();}}
    }else if(isShort()&&G.swMax){
      const P=shortPlan(),c2=P.carry,y0=gB+.03,ap=shotApex(club,c2)*Mv.apex;
      for(let i=1;i<=60;i++){const u=i/36,qx=G.ball.x+dx*c2*u,qz=G.ball.y+dz*c2*u,Y=y0+ap*arcH(u);if(u>.5&&Y<=hAt(qx,qz))break;const p=projTo(qx,Y,qz,PJ);if(p){sctx.fillStyle='rgba(255,255,255,.9)';sctx.beginPath();sctx.arc(p[0],p[1],clamp(.06*p[3],1.4,3),0,TAU);sctx.fill();}}
      mx=P.land[0];mz=P.land[1];landD=hyp(mx-G.ball.x,mz-G.ball.y);
    }else{
      const y0=gB+.03,wv=[dx,dz],wkD=D*windAlong(G.aim);let u=0;mx=G.ball.x;mz=G.ball.y;   // v93: the wind makes it fly longer or shorter (distance only; no sideways drift in the preview)
      for(let i=1;i<=90;i++){u=i/36;const qx=G.ball.x+dx*D*u+pxv*cv*u*u+wv[0]*wkD*u*u,qz=G.ball.y+dz*D*u+pzv*cv*u*u+wv[1]*wkD*u*u,Y=y0+shotApex(club,D)*Mv.apex*arcH(u),gnd=hAt(qx,qz);mx=qx;mz=qz;
        if(u>.5&&Y<=gnd)break;const p=projTo(qx,Y,qz,PJ);if(p&&i%1===0){sctx.fillStyle='rgba(255,255,255,.9)';sctx.beginPath();sctx.arc(p[0],p[1],clamp(.06*p[3],1.4,3),0,TAU);sctx.fill();}}
      landD=hyp(mx-G.ball.x,mz-G.ball.y);
    }
    G.landPt=[mx,mz];const e=groundEllipse(mx,mz,club.putter?.35:3,13);G.landE=e;
    if(e){const pulse=1+Math.sin(T*4)*.08;sctx.lineWidth=3.5;sctx.strokeStyle='#0f2233';sctx.beginPath();sctx.ellipse(e.x,e.y,e.rx*pulse+1,e.ry*pulse+1,0,0,TAU);sctx.stroke();
      sctx.lineWidth=2.5;sctx.strokeStyle='#ffc93c';sctx.beginPath();sctx.ellipse(e.x,e.y,e.rx*pulse,e.ry*pulse,0,0,TAU);sctx.stroke();
      const txt=G.fc&&G.fc.follow&&!club.putter?'':club.putter?Math.round(landD*3)+' ft':Math.round(landD)+' y';sctx.font='700 13px "Barlow Semi Condensed",system-ui,sans-serif';sctx.textAlign='left';sctx.textBaseline='middle';
      sctx.lineWidth=3;sctx.strokeStyle='#0f2233';sctx.strokeText(txt,e.x+e.rx+6,e.y);sctx.fillStyle='#fff6dc';sctx.fillText(txt,e.x+e.rx+6,e.y);}
  }
  const flameKind=G.state==='replay'?(G.lastShot&&G.lastShot.flame):G.flame;
  if(flameKind&&G.trail.length>1)drawFlames(flameKind);
  if(!R3.on&&G.trail.length>1){sctx.lineCap='round';let prev=null;G.trail.forEach((p,i)=>{const s=proj(p.x,p.Y+.05,p.y);if(s&&prev){sctx.strokeStyle='rgba(255,255,255,'+(i/G.trail.length*.7)+')';sctx.lineWidth=clamp(.08*s[3],1,4)*(.4+i/G.trail.length);sctx.beginPath();sctx.moveTo(prev[0],prev[1]);sctx.lineTo(s[0],s[1]);sctx.stroke();}prev=s;});}
  drawRangeLabels();drawPinLabel();
  if(MATCH.on&&MATCH.P&&G.state!=='intro'&&G.state!=='card'&&!G.overview){const o=MATCH.P[1-MATCH.turn];if(o&&!o.done&&o.strokes>0){const q=proj(o.ball.x,hAt(o.ball.x,o.ball.y)+.3,o.ball.y);
    if(q&&q[2]<450&&q[1]>topH&&q[1]<H-botH){const tx=MATCH.turn===0?rn(MATCH.r):'You';sctx.font='700 12px "Barlow Semi Condensed",system-ui,sans-serif';const w=sctx.measureText(tx).width+12;
      sctx.fillStyle=MATCH.turn===0?'rgba(120,30,40,.85)':'rgba(12,30,46,.85)';sctx.beginPath();sctx.roundRect(q[0]-w/2,q[1]-24,w,17,8.5);sctx.fill();sctx.fillStyle='#fff6dc';sctx.textAlign='center';sctx.textBaseline='middle';sctx.fillText(tx,q[0],q[1]-15.5);}}}
  if(G.overview){sctx.fillStyle='rgba(9,24,36,.8)';const tx='Whole hole · tap to return';sctx.font='700 13px "Barlow Semi Condensed",system-ui,sans-serif';const w=sctx.measureText(tx).width+24;sctx.beginPath();sctx.roundRect(W/2-w/2,topH+6,w,26,13);sctx.fill();sctx.fillStyle='#fff6dc';sctx.textAlign='center';sctx.textBaseline='middle';sctx.fillText(tx,W/2,topH+19);}
}
const FLAME_COL={blue:['rgba(235,248,255,','rgba(90,175,255,','rgba(40,70,255,'],red:['rgba(255,247,205,','rgba(255,150,40,','rgba(225,40,20,']};
const FLAME_PTS=[],FLAME_TR=[];   // reused points for the flame trail (no garbage per frame)
function drawFlames(kind){const raw=G.trail,C=FLAME_COL[kind];if(!C)return;const tr=FLAME_TR;tr.length=0;const m=Math.min(raw.length,24);
  for(let i=raw.length-m;i<raw.length;i++){const a=raw[Math.max(0,i-1)],b=raw[i];for(let j=1;j<=3;j++){const t=j/3,o=FLAME_PTS[tr.length]||(FLAME_PTS[tr.length]={x:0,y:0,Y:0});o.x=a.x+(b.x-a.x)*t;o.y=a.y+(b.y-a.y)*t;o.Y=a.Y+(b.Y-a.Y)*t;tr.push(o);}}const n=tr.length;
  sctx.save();sctx.globalCompositeOperation='lighter';
  for(let i=n-1;i>=0;i--){const p=tr[tr.length-1-i],air=p.Y-hAt(p.x,p.y);if(air<.25)continue;
    const s=proj(p.x,p.Y+.05,p.y);if(!s)continue;const k=i/n,fade=Math.min(1,air/1.2);
    const fl=.8+.25*Math.sin(T*47+i*1.9)+.15*Math.sin(T*23+i*.7);
    const r=clamp(2*s[3],10,30)*Math.pow(1-k,.8)*fl;
    const jx=Math.sin(T*31+i*2.3)*r*.18,jy=-k*r*.35+Math.cos(T*27+i)*r*.12;
    const g=sctx.createRadialGradient(s[0]+jx,s[1]+jy,0,s[0]+jx,s[1]+jy,r);
    const a=(1-k)*.42*fade;g.addColorStop(0,C[0]+a+')');g.addColorStop(.35,C[1]+a*.85+')');g.addColorStop(.75,C[2]+a*.45+')');g.addColorStop(1,C[2]+'0)');
    sctx.fillStyle=g;sctx.beginPath();sctx.arc(s[0]+jx,s[1]+jy,r,0,TAU);sctx.fill();}
  const h=tr[tr.length-1];if(h&&h.Y-hAt(h.x,h.y)>.25){const s=proj(h.x,h.Y+.05,h.y);if(s){const r=clamp(1.3*s[3],8,40)*(1+.15*Math.sin(T*60));
    const g=sctx.createRadialGradient(s[0],s[1],0,s[0],s[1],r);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.4,C[1]+'.6)');g.addColorStop(1,C[2]+'0)');
    sctx.fillStyle=g;sctx.beginPath();sctx.arc(s[0],s[1],r,0,TAU);sctx.fill();}}
  sctx.restore();}
function render(){
  let stash=null;
  if(G.replay){const r=G.replay,rp=replayPoint(Math.max(0,r.t));stash={ball:G.ball,bY:G.bY,state:G.state,inCup:G.inCup,trail:G.trail};
    G.ball={x:rp.x,y:rp.y};G.bY=rp.Y;G.state='bounce';G.inCup=G.lastShot.holed&&r.t>=r.dur;
    const tr=[];for(const q of G.lastShot.rec){if(q.t>r.t)break;tr.push(q);}G.trail=tr.slice(-70);}
  if(!r3Hold())r3Render();renderScene();
  if(stash){Object.assign(G,stash);G.state='replay';
    sctx.setTransform(dpr,0,0,dpr,0,0);sctx.font='700 13px "Barlow Semi Condensed",system-ui,sans-serif';const tx=SPEC.on?'\u25B6 '+SPEC.name+' \u00b7 hole '+(SPEC.hi+1)+' \u00b7 shot '+(SPEC.k+1)+' \u00b7 tap to skip':'\u25B6 REPLAY \u00b7 tap to skip',w=sctx.measureText(tx).width+26;
    if(!REC.on){sctx.fillStyle='rgba(180,34,58,.9)';sctx.beginPath();sctx.roundRect(W/2-w/2,topH+6,w,26,13);sctx.fill();sctx.fillStyle='#fff';sctx.textAlign='center';sctx.textBaseline='middle';sctx.fillText(tx,W/2,topH+19);}}
  if(REC.on)recFrame();
}

/* Oct 28 2026 hitches (Cam's phone: ~0.1 s stalls with the game's own frame work at ~2 ms and the page free, in every state, with
   ~45 DOM changes logged before each): updHud runs every frame and re-set hidden / disabled / aria-* on ~45 buttons and panels even
   when nothing changed, and every one of those is a real change to an iPhone (mutation records, style invalidation, layer updates).
   Setting one of these to the value it already has is now skipped, for the whole page. */
(()=>{try{const hd=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'hidden');
  if(hd&&hd.set)Object.defineProperty(HTMLElement.prototype,'hidden',{get:hd.get,set(v){if(this.hasAttribute('hidden')!==!!v)hd.set.call(this,v);},configurable:true,enumerable:hd.enumerable});
  for(const C of [HTMLButtonElement,HTMLInputElement,HTMLSelectElement,HTMLTextAreaElement]){const dd=Object.getOwnPropertyDescriptor(C.prototype,'disabled');
    if(dd&&dd.set)Object.defineProperty(C.prototype,'disabled',{get:dd.get,set(v){if(this.hasAttribute('disabled')!==!!v)dd.set.call(this,v);},configurable:true,enumerable:dd.enumerable});}
  const sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){if(this.getAttribute(n)===String(v))return;return sa.call(this,n,v);};}catch(e){}})();

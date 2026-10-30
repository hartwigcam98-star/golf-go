/* ---- sky: the old single-scatter sky + clouds, drawn as a full-screen triangle behind everything ---- */
function r3SkyMat(env){const T=THREE;
  return new T.ShaderMaterial({uniforms:R3.U,depthTest:false,depthWrite:false,
    vertexShader:env?`varying vec3 vd;void main(){vd=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
      :`varying vec2 nd;void main(){nd=position.xy;gl_Position=vec4(position.xy,1.,1.);}`,
    fragmentShader:env?`varying vec3 vd;uniform vec3 E;${GLSL_LIGHT}
      void main(){vec3 d=normalize(vd);vec3 c=skyFull(d,0.);if(d.y<0.)c=mix(fogCol(d),vec3(.05,.07,.04),clamp(-d.y*6.,0.,1.));gl_FragColor=vec4(c,1.);}`
      :`varying vec2 nd;uniform vec3 E,R,U,Fw,K;${GLSL_LIGHT}
      void main(){vec3 d=normalize(Fw+R*(nd.x/K.x)+U*((nd.y-K.z)/K.y));vec3 c=skyFull(d,60.);
       if(d.y<0.)c=fogCol(d)*mix(1.,.8,clamp(-d.y*8.,0.,1.));gl_FragColor=vec4(c,1.);}`});}

function r3Noise(){const S=256,d=new Uint8Array(S*S*4);
  const oct=[[4,.5],[8,.27],[16,.14],[32,.07],[64,.035]],lat=(p,seed)=>{const a=new Float32Array(p*p),R=rng(seed);for(let i=0;i<p*p;i++)a[i]=R();return a;};
  const LA=oct.map(([p],k)=>lat(p,11+k*7)),LB=oct.map(([p],k)=>lat(p,91+k*13));
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){let a=0,b=0,ws=0;
    for(let k=0;k<oct.length;k++){const[p,w]=oct[k],fx=x/S*p,fy=y/S*p,i=Math.floor(fx),j=Math.floor(fy),tx=fx-i,ty=fy-j,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),i1=(i+1)%p,j1=(j+1)%p;
      const g=A=>(A[j*p+i]*(1-sx)+A[j*p+i1]*sx)*(1-sy)+(A[j1*p+i]*(1-sx)+A[j1*p+i1]*sx)*sy;a+=g(LA[k])*w;b+=g(LB[k])*w;ws+=w;}
    const o=(y*S+x)*4;d[o]=clamp((a/ws-.5)*1.6+.5,0,1)*255;d[o+1]=clamp((b/ws-.5)*1.6+.5,0,1)*255;d[o+2]=0;d[o+3]=255;}
  return{d,S};}
// tileable ripple normals for the water
function r3WaterNormals(){const S=256,h=new Float32Array(S*S),R=rng(515);
  const waves=[];for(let i=0;i<24;i++){const a=R()*TAU,k=(1+Math.floor(R()*6))*TAU/S*(i<8?1:2),kx=Math.round(Math.cos(a)*k*S/TAU)*TAU/S,ky=Math.round(Math.sin(a)*k*S/TAU)*TAU/S;waves.push([kx,ky,R()*TAU,1/(1+i*.35)]);}
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){let v=0;for(const[kx,ky,p,a]of waves)v+=Math.sin(kx*x+ky*y+p)*a;h[y*S+x]=v;}
  const d=new Uint8Array(S*S*4);for(let y=0;y<S;y++)for(let x=0;x<S;x++){const hx=h[y*S+(x+1)%S]-h[y*S+(x+S-1)%S],hy=h[((y+1)%S)*S+x]-h[((y+S-1)%S)*S+x];
    let nx=-hx*.18,ny=-hy*.18,nz=1;const l=Math.hypot(nx,ny,nz);const o=(y*S+x)*4;d[o]=(nx/l*.5+.5)*255;d[o+1]=(ny/l*.5+.5)*255;d[o+2]=(nz/l*.5+.5)*255;d[o+3]=255;}
  return r3DataTex(d,S,S,{mip:true,repeat:true});}

function r3Init(){const T=window.THREE;if(!T)return false;
  const renderer=new T.WebGLRenderer({canvas:glc,antialias:false,alpha:false,depth:false,stencil:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
  if(!renderer.capabilities.isWebGL2)return false;
  renderer.autoClear=false;renderer.outputColorSpace=T.LinearSRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  try{renderer.domElement.addEventListener('webglcontextrestored',()=>setTimeout(r3Refresh,50));}catch(e){}   /* see r3Refresh */
  R3.renderer=renderer;R3.hf=renderer.extensions.has('EXT_color_buffer_float')||renderer.extensions.has('EXT_color_buffer_half_float');
  const nz=r3Noise();R3.noise=r3DataTex(nz.d,nz.S,nz.S,{mip:true,repeat:true});
  R3.U={E:{value:new T.Vector3()},R:{value:new T.Vector3()},U:{value:new T.Vector3()},Fw:{value:new T.Vector3()},K:{value:new T.Vector3()},
    ctime:{value:0},cloudOn:{value:CLOUDS_COV},noiseT:{value:R3.noise},sunDir:{value:new T.Vector3(...SUN)},sunCol:{value:new T.Vector3(...SUN_COL)},skyCol:{value:new T.Vector3(...SKY_COL)},fogC:{value:new T.Vector3(...FOG_C)},
    shOn:{value:0},texel:{value:1},om:{value:2},shadowMap:{value:null},r3fade:{value:0},wxG:{value:0},rlOn:{value:1}};
  const scene=new T.Scene();R3.scene=scene;
  const cam=new T.PerspectiveCamera(50,1,.3,30000);cam.matrixAutoUpdate=false;cam.matrixWorldAutoUpdate=false;R3.cam=cam;
  // sky behind everything
  const tri=new T.BufferGeometry();tri.setAttribute('position',new T.BufferAttribute(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));
  const sky=new T.Mesh(tri,r3SkyMat(false));sky.frustumCulled=false;sky.renderOrder=-1000;scene.add(sky);R3.sky=sky;
  // sun (shadows follow the camera) and image-based light from the sky itself
  const sun=new T.DirectionalLight(new T.Color(1,SUN_COL[1]/SUN_COL[0],SUN_COL[2]/SUN_COL[0]),SUN_COL[0]*Math.PI);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;sun.shadow.radius=2;
  scene.add(sun);scene.add(sun.target);R3.sun=sun;
  const env=new T.Scene(),envSky=new T.Mesh(new T.SphereGeometry(50,48,24),r3SkyMat(true));envSky.material.side=T.BackSide;env.add(envSky);
  R3.envScene=env;r3EnvBuild();
  scene.environmentIntensity=1;
  // detail textures and leaf atlas from the existing canvas painters
  R3.det={};for(const k of['short','rough','fescue','sand'])R3.det[k]=r3CanvasTex(makeDetail(k),{repeat:true});
  R3.leaf=r3CanvasTex(r3LeafAtlas(),{srgb:true});R3.waterN=r3WaterNormals();
  // photographed detail textures (ambientCG / Poly Haven, CC0), embedded as JPEG
  R3.ptex={};R3.pOn={value:0};let pend=0;
  if(typeof R3TEX!=='undefined')for(const k in R3TEX){pend++;const im=new Image(),t=new T.Texture(im);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.NoColorSpace;t.generateMipmaps=true;
    t.minFilter=T.LinearMipmapLinearFilter;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());R3.ptex[k]=t;
    im.onload=()=>{t.needsUpdate=true;if(--pend===0){R3.pOn.value=1;if(R3.mat&&R3.mat.bark)R3.mat.bark.needsUpdate=true;if(R3.mat&&R3.mat.barkI)R3.mat.barkI.needsUpdate=true;}};im.src=R3TEX[k];}
  // materials
  R3.tK={value:new T.Vector4(1,1,1,1)};
  R3.GU={bkOn:{value:0},bkT:{value:null},bkB:{value:new T.Vector4(0,0,1,1)},bkK:{value:new T.Vector2(1,.8)},gTex:{value:null},gSurf:{value:null},dShort:{value:R3.det.short},dRough:{value:R3.det.rough},dFes:{value:R3.det.fescue},dSand:{value:R3.det.sand},gStex:{value:null},slT:{value:null},slHt:{value:null},slMode:{value:0},slBall:{value:new T.Vector3()},
    gB:{value:new T.Vector4()},gSB:{value:new T.Vector4()},rlS:{value:new T.Vector4()},rlG:{value:new T.Vector4()},gSS:{value:new T.Vector4()},SLB:{value:new T.Vector4()},slRot:{value:new T.Vector2(1,0)},gMode:{value:1},pOn:R3.pOn,pG:{value:R3.ptex.g||null},pGN:{value:R3.ptex.gn||null},pS:{value:R3.ptex.s||null},pSN:{value:R3.ptex.sn||null},slOn:{value:0},slDk:{value:typeof GRDK!=='undefined'&&GRDK?1:0},SLG:{value:1},SLPX:{value:.002},tK:R3.tK};
  const GUfar={...R3.GU,gMode:{value:0}};
  R3.WU={rfT:{value:null},rfM:{value:new T.Matrix4()},rfOn:{value:0},wT:{value:0}};
  R3.mat={
    ground:r3Patch(new T.MeshStandardMaterial({roughness:.93,metalness:0}),{ground:true,uniforms:R3.GU}),
    groundFar:r3Patch(new T.MeshStandardMaterial({roughness:.95,metalness:0}),{ground:true,uniforms:GUfar}),
    tree:r3Patch(new T.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:0}),{fade:true,translucent:true}),
    bark:r3Patch(new T.MeshStandardMaterial({vertexColors:true,color:new T.Color(2.5,2.5,2.5),map:R3.ptex.b||null,normalMap:R3.ptex.bn||null,normalScale:new T.Vector2(1.2,1.2),roughness:.92,metalness:0}),{fade:true}),
    far:r3Patch(new T.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:0}),{nocloud:false}),
    leaf:r3Patch(new T.MeshStandardMaterial({vertexColors:true,map:R3.leaf,alphaTest:.5,side:T.DoubleSide,roughness:.8,metalness:0}),{fade:true,wind:1,translucent:true,twoSided:true}),
    grass:r3Patch(new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.9,metalness:0}),{twoSided:true}),
    water:r3Patch(new T.MeshStandardMaterial({color:new T.Color(.012,.03,.034),roughness:.04,metalness:0,transparent:true,opacity:.9,depthWrite:false,envMapIntensity:1.1}),{water:true,uniforms:R3.WU}),
    matte:r3Patch(new T.MeshStandardMaterial({roughness:.75,metalness:0})),
    satin:r3Patch(new T.MeshStandardMaterial({roughness:.5,metalness:0})),
    gloss:r3Patch(new T.MeshStandardMaterial({roughness:.22,metalness:0})),
    blob:new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.16,depthWrite:false})};
  R3.leafDepth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:R3.leaf,alphaTest:.5,side:T.DoubleSide});
  // species leaf atlas: photographed twigs and leaves (Poly Haven, CC0) and species leaf shapes, WebP with alpha
  {const im=new Image(),t=new T.Texture(im);t.flipY=false;t.colorSpace=T.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;
    t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());R3.sleaf=t;
    if(typeof R3LEAF!=='undefined'){im.onload=()=>{t.needsUpdate=true;R3.sleafOK=1;if(typeof r3tImpBake==='function')r3tImpBake();};im.src=B10&&window.B10LEAF?window.B10LEAF:R3LEAF;}}   // (Blender trial: leaf sprays rendered in Blender)
  R3.mat.sleaf=r3Patch(new T.MeshStandardMaterial({vertexColors:true,map:R3.sleaf,alphaTest:.5,side:T.DoubleSide,roughness:.72,metalness:0}),{fade:true,wind:1,translucent:.5,twoSided:true,leafmip:true});
  R3.sleafDepth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:R3.sleaf,alphaTest:.5,side:T.DoubleSide});
  // unit primitives for the golfer, flag and ball (instanced each frame)
  const W1=[1,1,1];R3.geo={cyl:r3Unit(d=>geoCylinder(d,16,W1)),sph:r3Unit(d=>geoSphere(d,14,20,W1)),box:r3Unit(d=>geoBox(d,W1))};
  M3.meshes={cyl:'cyl',sph:'sph',box:'box'};
  r3GrassInit();r3TracerInit();try{r3GolferInit();}catch(e){console.error('[golfer]',e);}
  // post-processing
  r3PostInit();
  GL.slOK=true;
  try{const v=localStorage.getItem('golf-gfx');if(v==='fast')R3.q='fast';}catch(e){}
  try{const pv=JSON.parse(localStorage.getItem('golf-perf2')||'null');if(pv&&pv.l>0){R3.perf=Math.min(R3_LMAX-1,pv.l-(Date.now()-(pv.t||0)>2*864e5?1:0));}}catch(e){}   // start where this phone settled last time (eased one step after two days); the steady-30 cap is not carried over: each session earns it again only if it's still slow (v120)
  /* phones and tablets start on Fast (High is a tap away in the pause menu and is remembered). Done once per device: a phone that
     was on High by default moves to Fast, and any automatic step-down it had settled on is eased by the same one level */
  try{if(!localStorage.getItem('golf-gfx-set')){localStorage.setItem('golf-gfx-set','auto');
    if(!DESK&&R3.q==='high'){R3.q='fast';if(R3.perf>0){R3.perf--;localStorage.setItem('golf-perf2',JSON.stringify({l:R3.perf,t:Date.now()}));}}}}catch(e){}
  R3.on=true;r3Resize();r3RoundWx();try{r3GolferRestore();}catch(e){}return true;}
// image-based light from the current sky (rebuilt when the weather changes)
function r3EnvBuild(){const T=THREE,keep=R3.U.E.value.clone();R3.U.E.value.set(0,0,0);R3.U.cloudOn.value=CLOUDS_COV;const pm=R3.pmrem||(R3.pmrem=new T.PMREMGenerator(R3.renderer));   /* kept for the session: disposing it threw away its shaders, so every new round recompiled them (v81) */
  /* the sky is drawn into one cube map kept for the session and filtered with fromCubemap: fromScene builds and disposes
     its own background material on every call, so each new round recompiled a shader mid-start (v81) */
  if(!R3.envCube){R3.envCube=new T.WebGLCubeRenderTarget(256,{type:T.HalfFloatType,generateMipmaps:false});R3.envCam=new T.CubeCamera(.1,200,R3.envCube);}
  R3.envCam.update(R3.renderer,R3.envScene);R3.envRT=pm.fromCubemap(R3.envCube.texture,R3.envRT||null);R3.scene.environment=R3.envRT.texture;R3.U.E.value.copy(keep);}

/* ---- shader patches shared by every lit material: world position, moving cloud shadows, our sky-coloured haze, dither fade ---- */
const R3_FRAG_HEAD=`varying vec3 r3wp;uniform vec3 E;uniform float r3fade;
${GLSL_LIGHT}
`;
function r3Patch(mat,o={}){const key='r3'+(o.golfer?'B':'')+(o.grass?'G':'')+(o.twoSided?'2':'')+(o.ground?'g':'')+(o.fade?'f':'')+(o.wind?'w'+o.wind:'')+(o.nocloud?'n':'')+(o.water?'W':'')+(o.translucent?'t'+o.translucent:'')+(o.leafmip?'m':'')+(o.imp?'I':'');
  mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,R3.U);if(o.uniforms)Object.assign(sh.uniforms,o.uniforms);
    let vs=sh.vertexShader,fs=sh.fragmentShader;
    vs=vs.replace('#include <common>','#include <common>\nvarying vec3 r3wp;uniform float ctime;');
    if(o.wind)vs=vs.replace('#include <begin_vertex>',`#include <begin_vertex>
      { vec4 wq=vec4(transformed,1.);
      #ifdef USE_INSTANCING
        wq=instanceMatrix*wq;
      #endif
        wq=modelMatrix*wq;float hh=clamp((transformed.y)*.04,0.,1.);
        transformed.x+=sin(ctime*1.3+wq.x*.21+wq.z*.17)*.07*hh;transformed.z+=cos(ctime*1.1+wq.z*.19)*.05*hh; }`);
    vs=vs.replace('#include <project_vertex>',`#include <project_vertex>
      { vec4 r3w=vec4(transformed,1.);
      #ifdef USE_INSTANCING
        r3w=instanceMatrix*r3w;
      #endif
        r3wp=(modelMatrix*r3w).xyz; }`);
    if(o.golfer){vs=vs.replace('#include <common>','#include <common>\nattribute float part;flat varying float vPart;varying vec3 vOb;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPart=part;vOb=position;');
      fs=fs.replace('#include <common>','#include <common>\nflat varying float vPart;varying vec3 vOb;uniform vec4 tTop,tPants,tHat,tSkin,tShoe,tSock,tSock2,tLeg,tHair,tPlaid;uniform vec3 pmTop,pmPants,pmHat,pmSkin,pmShoe,pmSock,pmLeg,pmLeg2,pmHair;uniform float tHide,tHideY,gFill;').replace('#include <opaque_fragment>','outgoingLight+=diffuseColor.rgb*gFill*(.3+.7*max(dot(normal,normalize(vViewPosition)),0.));\n#include <opaque_fragment>').replace('#include <map_fragment>',`#include <map_fragment>
        { float p=floor(vPart+.5);vec4 tt=vec4(0.);vec3 pm=vec3(.5);
          if(p>21.5&&p<22.5&&tHide>.5&&vOb.y>tHideY)discard;   // a legend's own hat replaces the body's baked headgear (hair under the hat: only what the hat covers)
          if(p<.5){tt=tTop;pm=pmTop;}else if(abs(p-9.)<.1){tt=tPants;pm=pmPants;if(tPlaid.w>0.){float a=step(.62,fract(vOb.y/5.5)),b=step(.62,fract((vOb.x+vOb.z)/5.5));tt.rgb=mix(tt.rgb,tPlaid.rgb,.45*max(a,b)+.25*a*b);}}else if(abs(p-5.)<.1){tt=tHat;pm=pmHat;}
          else if(abs(p-20.)<.1){tt=tShoe;pm=pmShoe;}
          else if(abs(p-24.)<.1){tt=tLeg;pm=pmLeg;}
          else if(abs(p-23.)<.1){tt=tHair;pm=pmHair;}   // bare legs (shorts) covered by long trousers
          else if(abs(p-25.)<.1){tt=tSock.w>0.&&tSock2.w>0.?tSock:tLeg;pm=pmLeg2;if(tSock2.w>0.){float a=(vOb.y+(vOb.x+vOb.z)*.9)/4.2,b=(vOb.y-(vOb.x+vOb.z)*.9)/4.2;if(mod(floor(a)+floor(b),2.)>.5)tt.rgb=tSock2.rgb;}}
          else if(abs(p-21.)<.1){tt=tSock;pm=pmSock;if(tSock2.w>0.){float a=(vOb.y+(vOb.x+vOb.z)*.9)/4.2,b=(vOb.y-(vOb.x+vOb.z)*.9)/4.2;if(mod(floor(a)+floor(b),2.)>.5)tt.rgb=tSock2.rgb;}}
          if(tt.w>0.){vec3 lw=vec3(.2126,.7152,.0722);vec3 pl=pow(pm,vec3(2.2));float r=dot(diffuseColor.rgb,lw)/max(dot(pl,lw),.01);if(tHide>.5)r=clamp(r,.45,1.5);
            vec3 tl=tt.rgb*tt.rgb;diffuseColor.rgb=mix(diffuseColor.rgb,tl*r,tt.w);} }`);}
    if(o.grass){vs=vs.replace('#include <common>','#include <common>\n'+R3_GRASS_VS_HEAD).replace('#include <beginnormal_vertex>',R3_GRASS_VS).replace('#include <begin_vertex>','vec3 transformed=gW;');
      fs=fs.replace('#include <common>','#include <common>\nvarying vec3 vGc;').replace('#include <color_fragment>','diffuseColor.rgb*=vGc;');}
    fs=fs.replace('#include <common>','#include <common>\n'+R3_FRAG_HEAD+(o.ground?GLSL_NOISE+R3_GROUND_HEAD:''));
    if(o.fade)fs=fs.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      if(r3fade>0.){float dd=length(r3wp-E);if(dd<r3fade&&mod(floor(gl_FragCoord.x)+floor(gl_FragCoord.y),3.)<2.)discard;}`);
    if(o.ground){fs=fs.replace('#include <map_fragment>',R3_GROUND_BODY);

      // micro relief: the grass/sand detail becomes a bump so the sun rakes across it; greens and fairway a touch glossier than rough
      fs=fs.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        { float bh=r3bump*.035;vec3 dpx=dFdx(-vViewPosition),dpy=dFdy(-vViewPosition);vec3 r1=cross(dpy,normal),r2=cross(normal,dpx);float dt=dot(dpx,r1);
          vec3 gr=sign(dt)*(dFdx(bh)*r1+dFdy(bh)*r2);normal=normalize(abs(dt)*normal-gr); }
        if(r3nk>.001){vec3 nw0=inverseTransformDirection(normal,viewMatrix);vec3 Tt=normalize(vec3(1.,0.,0.)-nw0*nw0.x),Bb=cross(Tt,nw0);
          vec3 tn=normalize(mix(vec3(0.,0.,1.),r3nm,r3nk));vec3 nw=normalize(Tt*tn.x+Bb*tn.y+nw0*tn.z);normal=normalize((viewMatrix*vec4(nw,0.)).xyz);}`);
      fs=fs.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=gMode>.5?clamp(.97-.2*r3w.r-.04*r3w.g,.72,.97):.95;');}
    // Blender trial: light baked in Cycles (r = sun, g = sky) over the hole, on the ground and the grass blades; static scenery
    // then casts no live shadows there (r3Shadow)
    if(o.ground||o.grass)fs=fs.replace('#include <common>','#include <common>\nuniform float bkOn;uniform sampler2D bkT;uniform vec4 bkB;uniform vec2 bkK;').replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
      if(bkOn>.5){vec2 bu=(r3wp.xz-bkB.xy)/bkB.zw;if(bu.x>0.&&bu.x<1.&&bu.y>0.&&bu.y<1.){vec4 bk=texture2D(bkT,bu);
        reflectedLight.directDiffuse*=mix(1.,bk.r,bkK.x);reflectedLight.directSpecular*=bk.r;reflectedLight.indirectDiffuse*=mix(1.,bk.g,bkK.y);}}`);
    // alpha-tested foliage: hold the alpha up in the smaller mips so far crowns keep their coverage instead of thinning out
    if(o.leafmip)fs=fs.replace('#include <map_fragment>',`#include <map_fragment>
      { vec2 ts=vec2(textureSize(map,0))*vMapUv;vec2 qx=dFdx(ts),qy=dFdy(ts);float lod=.5*log2(max(max(dot(qx,qx),dot(qy,qy)),1e-6));diffuseColor.a*=1.+max(lod,0.)*.2; }`);
    if(o.imp){vs=R3T_IMP_VS(vs);fs=fs.replace('#include <common>','#include <common>\nvarying vec3 vImpC;').replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb*=vImpC;');}
    // thin blades and leaf cards: light both faces the same way (no back-face normal flip)
    if(o.twoSided)fs=fs.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n normal=normalize(vNormal);nonPerturbedNormal=normal;');
    if(o.water)fs=fs.replace('#include <common>',`#include <common>
uniform sampler2D rfT;uniform mat4 rfM;uniform float rfOn,wT;
float wHash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float wNoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(wHash(i),wHash(i+vec2(1.,0.)),u.x),mix(wHash(i+vec2(0.,1.)),wHash(i+vec2(1.,1.)),u.x),u.y);}`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      { /* v108: calm water - two drifting layers of soft ripples, fading with distance */
        vec2 p=r3wp.xz;vec2 g=(vec2(wNoise(p*.7+vec2(wT*.25,0.)),wNoise(p*.7+vec2(0.,wT*.2)+5.))-.5)*.6;
        g+=(vec2(wNoise(p*2.9-vec2(wT*.5,wT*.15)),wNoise(p*2.9+vec2(wT*.3,-wT*.45)+9.))-.5)*.3;
        g*=1./(1.+length(r3wp-E)*.015);normal=normalize(normal+mat3(viewMatrix)*vec3(g.x,0.,g.y)*.11); }`)
      .replace('#include <lights_fragment_maps>',`#include <lights_fragment_maps>
      if(rfOn>.5){vec4 pc=rfM*vec4(r3wp,1.);vec2 ru=pc.xy/pc.w*.5+.5;vec3 nw=inverseTransformDirection(normal,viewMatrix);ru+=nw.xz*.035;
        vec3 rc=texture2D(rfT,clamp(ru,.001,.999)).rgb;radiance=mix(radiance,rc,.9);}`);
    if(!o.nocloud)fs=fs.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
      { float cs=cloudShadow(r3wp);reflectedLight.directDiffuse*=cs;reflectedLight.directSpecular*=cs; }`);
    if(o.translucent)fs=fs.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
      { vec3 vv=normalize(E-r3wp);reflectedLight.directDiffuse+=diffuseColor.rgb*sunCol*${typeof o.translucent==='number'?o.translucent.toFixed(2):'.3'}*pow(max(dot(-vv,sunDir),0.),${typeof o.translucent==='number'?'3.':'4.'}); }`);
    fs=fs.replace('#include <fog_fragment>',`{ float dd=length(r3wp-E);gl_FragColor.rgb=mix(gl_FragColor.rgb,fogCol(normalize(r3wp-E)),fogAmt(dd)); }`);
    sh.vertexShader=vs;sh.fragmentShader=fs;};
  mat.customProgramCacheKey=()=>key;return mat;}


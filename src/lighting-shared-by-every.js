/* ---------- lighting shared by every shader: low afternoon sun, sky fill, shadows, filmic tone curve ---------- */
const SUN=(()=>{const v=[-.52,.58,.63],l=Math.hypot(...v);return v.map(x=>x/l);})();
const SUN_COL=[1.5,1.36,1.12],SKY_COL=[.34,.42,.55],FOG_C=[.83,.89,.92];
const GLSL_GRADE=`vec3 grade(vec3 c){float l=dot(c,vec3(.2126,.7152,.0722));
  float gd=clamp((c.g-max(c.r,c.b))*4.,0.,1.);
  c=mix(c,vec3(mix(c.r,c.g,.16),c.g*.96,c.b*.94),gd*.75);
  c=mix(vec3(l),c,1.-.14*gd);
  c=mix(c,c*c*(3.-2.*c),.34);
  c*=mix(vec3(.97,.99,1.04),vec3(1.03,1.01,.965),smoothstep(.2,.85,l));
  return c;}`;
const GLSL_LIGHT=`
uniform sampler2D shadowMap,noiseT;uniform float shOn,texel,om,ctime,cloudOn,wxG,rlOn;uniform vec3 sunDir,sunCol,skyCol,fogC;
float unpack(vec4 c){return dot(c,vec4(1.,1./255.,1./65025.,1./16581375.));}
float shadowAt(vec4 lp,float bias){vec3 s=lp.xyz*.5+.5;if(shOn<.5||s.x<0.||s.x>1.||s.y<0.||s.y>1.||s.z>1.)return 1.;
  float edge=smoothstep(0.,.1,min(min(s.x,1.-s.x),min(s.y,1.-s.y)));float sum=0.;
  for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){float d=unpack(texture2D(shadowMap,s.xy+vec2(float(i),float(j))*texel));sum+=(s.z-bias>d)?0.:1.;}
  return mix(1.,sum/9.,edge);}
vec3 toLin(vec3 c){return c*c;}
/* sky: a simple single-scatter look (deep blue overhead, pale haze at the horizon, warm glow round the sun), linear HDR */
vec3 skyBase(vec3 d){float y=clamp(d.y,0.,1.),mu=max(dot(d,sunDir),0.);
  vec3 zen=vec3(.028,.095,.34),hor=vec3(.56,.69,.86);
  vec3 c=mix(hor,zen,pow(y,.38));c=mix(c,vec3(dot(c,vec3(.3,.55,.15)))*vec3(.98,1.,1.04)*1.12,wxG);
  c*=1.+.18*mu*mu*(1.-y);
  c+=vec3(1.,.83,.58)*(.22*pow(mu,6.)+.6*pow(mu,48.)+2.5*pow(mu,600.))*(1.-.4*y);
  return c;}
/* clouds live on a plane 1.8 km up; the same field casts moving shadows on the course */
const float CLOUD_H=1800.;
vec2 cloudUV(vec2 xz){return xz/11000.+vec2(ctime*.0011,ctime*.0005);}
float cLo(){return mix(.64,.47,cloudOn);}
float cloudN(vec2 uv){return texture2D(noiseT,uv).r*.62+texture2D(noiseT,uv*2.63+vec2(.31,.17)).g*.27+texture2D(noiseT,uv*6.1+vec2(.73,.41)).r*.11;}
float cloudD(vec2 uv){float l=cLo();return smoothstep(l,l+.09,cloudN(uv));}
float cloudShadow(vec3 wp){if(cloudOn<.01)return 1.;vec2 uv=cloudUV(wp.xz+sunDir.xz*(CLOUD_H-wp.y)/max(sunDir.y,.2));
  float n=texture2D(noiseT,uv).r*.62+texture2D(noiseT,uv*2.63+vec2(.31,.17)).g*.27+.055;float l=cLo();return 1.-.6*smoothstep(l-.01,l+.1,n);}
vec3 skyFull(vec3 d,float disc){vec3 c=skyBase(d);float mu=dot(d,sunDir);
  c+=vec3(1.,.96,.88)*smoothstep(.99988,.99994,mu)*disc;
  if(cloudOn>.01&&d.y>.004){vec2 xz=E.xz+d.xz/(d.y+.012)*CLOUD_H;vec2 uv=cloudUV(xz);
    float n=cloudN(uv),cl=cLo(),den=smoothstep(cl,cl+.09,n);
    if(den>.001){vec2 ts=normalize(sunDir.xz+vec2(1e-4))*.012;float n2=cloudN(uv+ts),n3=cloudN(uv+ts*2.2);
      float lit=clamp(1.-((n2-n)*9.+(n3-n)*5.),0.,1.3);float thick=smoothstep(cl,cl+.2,n);
      float mu2=max(mu,0.);
      vec3 sunLit=vec3(1.3,1.28,1.24)*(.78+.42*lit)+vec3(1.,.85,.6)*pow(mu2,5.)*.8*(1.-thick*.6);
      vec3 shade=vec3(.5,.56,.67)*(.8+.3*d.y);
      vec3 cc=mix(shade,sunLit,clamp(lit*.8+.25-thick*.35,0.,1.));
      float fade=smoothstep(.004,.22,d.y);
      c=mix(c,cc,den*fade*.97);}}
  return c;}
/* aerial perspective: summer air lightens and blues distant tree lines (about a fifth at 500 yd, two fifths at 1000) */
float fogAmt(float dist){return rlOn>.5?1.-exp(-max(dist-60.,0.)/1900.):1.-exp(-max(dist-80.,0.)/3400.);}
vec3 fogCol(vec3 v){return skyBase(normalize(vec3(v.x,.035,v.z)));}
vec3 aces(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
/* the colour grade (display space) is shared with the post pass so both paths look alike */
${GLSL_GRADE}
vec3 outCol(vec3 c){if(om>1.5)return c;c=sqrt(aces(c));return om>.5?c:grade(c);}
vec3 finish(vec3 c,float dist){return outCol(c);}
vec3 finishW(vec3 c,float dist,vec3 wp){vec3 v=normalize(wp-E);return outCol(mix(c,fogCol(v),fogAmt(dist)));}
`;
const GLSL_NOISE=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}`;



/* ---- ground: the painted course, detail textures per surface, the slope grid on the green ---- */
const R3_GROUND_HEAD=`float r3bump=0.;vec4 r3w=vec4(0.);vec3 r3nm=vec3(0.,0.,1.);float r3nk=0.;uniform sampler2D pG,pGN,pS,pSN;uniform float pOn;uniform vec4 tK;uniform sampler2D gTex,gSurf,dShort,dRough,dFes,dSand,gStex,slT,slHt;uniform vec4 gB,gSB,gSS,SLB;uniform float slMode;uniform vec3 slBall;uniform vec2 slRot;uniform float gMode,slOn,SLG,SLPX,slDk;uniform vec4 rlS,rlG;`;
const R3_GROUND_BODY=`
  vec3 c;vec2 q=r3wp.xz;float dist=length(r3wp-E);
  vec2 su=(q-gSS.xy)/max(gSS.zw,vec2(1.));
  if(gMode>.5){c=texture2D(gTex,(q-gB.xy)/gB.zw).rgb;}else if(gSS.z>0.&&su.x>0.&&su.y>0.&&su.x<1.&&su.y<1.){c=texture2D(gStex,su).rgb;}else{c=mix(vec3(.25,.34,.18),vec3(.33,.42,.22),vnoise(q*.01)*.7+hash(floor(q*.05))*.3);}
  c=mix(vec3(dot(c,vec3(.299,.587,.114))),c,.78)*.9;
  float m=vnoise(q*.045)*.6+vnoise(q*.19)*.4;c*=.9+.2*m;
  vec4 w=gMode>.5?texture2D(gSurf,(q-gSB.xy+.5)/gSB.zw):vec4(.25,.45,.1,0.);float ws=max(0.,1.-w.r-w.g-w.b);
  // detail lookups only for the surfaces actually present at this pixel (explicit gradients keep the filtering exact at the edges)
  vec2 dqx=dFdx(q),dqy=dFdy(q);
  #define R3TG(t,u,k) textureGrad(t,u,dqx/(k),dqy/(k))
  float dS=0.,dR=0.,dF=0.,dD=0.;
  if(w.r>.002)dS=R3TG(dShort,q/1.2,1.2).r*.6+R3TG(dShort,q/3.1+.37,3.1).r*.4;
  if(w.g>.002)dR=R3TG(dRough,q/1.7,1.7).r*.6+R3TG(dRough,q/4.3+.61,4.3).r*.4;
  if(w.b>.002)dF=R3TG(dFes,q/2.8,2.8).r*.65+R3TG(dFes,q/7.9+.23,7.9).r*.35;
  if(ws>.002&&pOn<.5)dD=R3TG(dSand,q/1.1,1.1).r*.6+R3TG(dSand,q/3.7+.5,3.7).r*.4;
  float det=(w.r*dS*1.25+w.g*dR*1.3+w.b*dF*1.6+ws*dD*1.)*2.-(w.r*1.25+w.g*1.3+w.b*1.6+ws);
  if(pOn>.5){
    // photographed turf and sand as detail: colour ratios multiply the painted course, their normal maps light the micro relief
    vec2 qr=vec2(q.x*.8-q.y*.6,q.x*.6+q.y*.8);vec2 rx=vec2(dqx.x*.8-dqx.y*.6,dqx.x*.6+dqx.y*.8),ry=vec2(dqy.x*.8-dqy.y*.6,dqy.x*.6+dqy.y*.8);
    float nzm=smoothstep(.3,.7,vnoise(q*.07));
    float gw=w.a,kga=mix(1.7,1.05,gw)*mix(tK.x,1.,gw),kgb=mix(3.9,2.6,gw)*mix(tK.x,1.,gw);vec2 ga=q/kga,gb2=qr/kgb+.37,sa=q/2.4,sb=qr/5.3+.61;
    float fd=1.-smoothstep(40.,220.,dist),kg=(w.r*.9+w.g)*fd*mix(tK.y,1.,gw),ks=ws*fd;
    vec3 pg=vec3(1.),ps=vec3(1.);
    if(kg>.001)pg=mix(textureGrad(pG,ga,dqx/kga,dqy/kga).rgb,textureGrad(pG,gb2,rx/kgb,ry/kgb).rgb,nzm)*2.5;
    if(ks>.001)ps=mix(textureGrad(pS,sa,dqx/2.4,dqy/2.4).rgb,textureGrad(pS,sb,rx/5.3,ry/5.3).rgb,nzm)*2.5;
    vec3 pgl=mix(vec3(dot(pg,vec3(.333))),pg,mix(.55,.35,gw));kg*=mix(1.,.6,gw)*(rlOn>.5?mix(.78,.75,gw):1.);
    c*=mix(vec3(1.),pgl,kg*1.1)*mix(vec3(1.),ps,ks);
    det=(w.b*dF*1.6)*2.-(w.b*1.6)+(w.r*(dS*2.-1.)*.35+w.g*(dR*2.-1.)*.4);
    r3nk=(1.-smoothstep(10.,70.,dist))*min(1.,w.r*mix(.8,.45,gw)+w.g+ws*.9);
    if(r3nk>.001){vec3 ng=vec3(0.,0.,1.),ns=vec3(0.,0.,1.);
      if(w.r+w.g>.002)ng=mix(textureGrad(pGN,ga,dqx/kga,dqy/kga).rgb,textureGrad(pGN,gb2,rx/kgb,ry/kgb).rgb,nzm)*2.-1.;
      if(ws>.002)ns=mix(textureGrad(pSN,sa,dqx/2.4,dqy/2.4).rgb,textureGrad(pSN,sb,rx/5.3,ry/5.3).rgb,nzm)*2.-1.;
      float wn=w.r+w.g+ws+1e-4;r3nm=normalize((ng*(w.r+w.g)+ns*ws)/wn);}}
  c*=1.+det*1.45*(1.-smoothstep(30.,190.,dist));r3bump=det*(1.-smoothstep(12.,60.,dist));r3w=vec4(w.rgb,ws);
  if(rlOn>.5&&gMode>.5){
    if(dist<90.)c*=1.+(vnoise(q*.75)-.5)*.07*(w.r*(1.-w.a)+w.g)*(1.-smoothstep(25.,90.,dist));   // clumps a yard or so across, near you only
    /* bunkers read as sand, not paper: a touch darker, with soft rake furrows close by that the sun picks out (two rake directions in drifts) */
    if(ws>.002){c*=mix(1.,.9,ws);float fr=(1.-smoothstep(4.,13.,dist))*smoothstep(.6,.95,ws);
      if(fr>.001){float p1=dot(q,vec2(.8,.6))/.14,p2=dot(q,vec2(-.45,.89))/.14,fq=max(fwidth(p1),fwidth(p2));fr*=1.-smoothstep(.25,.5,fq);
        float j=vnoise(q*1.3)*2.5,rk=mix(sin(p1*6.2832+j),sin(p2*6.2832+j),smoothstep(.35,.65,vnoise(q*.03)))*fr*(.55+.45*vnoise(q*.4));r3bump+=rk*.13;c*=1.+rk*.008;}}}
  c*=mix(vec3(1.),vec3(1.05,1.03,.9),smoothstep(.55,.8,vnoise(q*.013))*.5*(w.r+w.g));
  if(gMode>.5&&slOn>.002){vec2 sv=(q-SLB.xy)/SLB.zw;if(sv.x>0.&&sv.y>0.&&sv.x<1.&&sv.y<1.){vec4 s=texture2D(slT,sv);float a=s.a*slOn;
    if(a>.003){float k=s.b;vec3 g0=vec3(.08,.95,.42),g1=vec3(1.,.9,.08),g2=vec3(1.,.48,.04),g3=vec3(1.,.08,.08);
      vec3 rc=k<.34?mix(g0,g1,k/.34):k<.67?mix(g1,g2,(k-.34)/.33):mix(g2,g3,(k-.67)/.33);
      vec2 gq=vec2(dot(q,slRot),dot(q,vec2(-slRot.y,slRot.x)))/SLG,gf=abs(fract(gq-.5)-.5);
      vec2 fw=max(fwidth(gq),vec2(.03));
      vec2 ln=1.-smoothstep(fw*.35,fw*1.9,gf),ln2=1.-smoothstep(fw*.9,fw*3.,gf);float Lf=(1.-smoothstep(.22,.45,max(fw.x,fw.y)))*(1.-smoothstep(50.,90.,dist));
      /* Oct 2026 (player note), the Darker grid setting (slDk): a soft dark edge either side of each line, so yellow and green lines still read on a bright green far off */
      vec2 hl=1.-smoothstep(fw*1.2,fw*4.2,gf);float far=smoothstep(10.,35.,dist)*slDk;c*=1.-slDk*(.26+.12*far)*max(hl.x,hl.y)*Lf*a;
      /* the grid lines run with the slope: bright dashes march along each line toward lower ground, faster the more it breaks.
         Each 1-yd stretch of line between crossings reads the slope at its middle, so the dashes never smear. */
      vec2 pr=vec2(-slRot.y,slRot.x);float dfd=1.-smoothstep(30.,60.,dist);
      float lx=0.,ly=0.;
      for(int ax=0;ax<2;ax++){float lw=ax==0?ln.x:ln.y;if((ax==0?ln2.x:ln2.y)<.01)continue;
        float along=ax==0?gq.y:gq.x,across=ax==0?gq.x:gq.y;vec2 sc2=ax==0?vec2(floor(across+.5),floor(along)+.5):vec2(floor(along)+.5,floor(across+.5));
        vec2 cw=(sc2.x*slRot+sc2.y*pr)*SLG;vec4 sq=texture2D(slT,clamp((cw-SLB.xy)/SLB.zw,0.,1.));vec2 d2=sq.rg*2.-1.;float l2=length(d2);
        float comp=l2>.3?(ax==0?dot(d2,pr):dot(d2,slRot))/l2:0.;float m=smoothstep(.12,.45,abs(comp))*dfd*(1.-smoothstep(.07,.16,max(fw.x,fw.y)));
        float ph=fract(along-ctime*(.25+2.6*sq.b)*comp);if(comp<0.)ph=1.-ph;
        float dash=smoothstep(.4,.88,ph)*(1.-smoothstep(.88,.98,ph));
        float lw2=ax==0?ln2.x:ln2.y;float v=max(lw*mix(.62,.45,m),lw2*1.45*dash*m);if(ax==0)lx=v;else ly=v;}
      float L=max(lx,ly)*Lf;float hi=max(lx,ly)>.62?1.:0.;
      vec3 rcd=mix(rc,rc*rc,.55)*.82,lc=mix(mix(c*1.1,rc*.85,.75),mix(c*.9,rcd,.8),slDk),lb=rc*1.55+.16;c=mix(c,mix(lc,lb,clamp((max(lx,ly)-.62)/.75,0.,1.)),clamp(L*a*(1.+.4*far),0.,1.));}}}
  if(rlOn>.5&&gMode>.5){
    /* mown stripes are light on the blades, not paint: grass mown away from you shows its pale sides, grass mown toward you its darker
       tips, so a stripe swaps shade as you walk round it and fades looking straight down. Same frame and width buildTerrain paints. */
    vec3 vw=r3wp-E;float hz=length(vw.xz);vec2 vd=vw.xz/max(hz,1e-3);float grz=clamp(hz/max(length(vw),1e-3),0.,1.);
    if(rlS.w>.5&&rlS.z>0.){float ph=(q.y*rlS.x-q.x*rlS.y)/rlS.z,fp=max(fwidth(ph),1e-4);float par=-clamp(sin(3.14159*ph)/(fp*4.7),-1.,1.);
      c*=1.+.06*par*dot(vd,rlS.xy)*grz*w.r*(1.-w.a);}
    if(dot(rlG.zw,rlG.zw)>.5){vec2 dg=q-rlG.xy;float ph=(dg.y*rlG.z-dg.x*rlG.w)/4.,fp=max(fwidth(ph),1e-4);float par=clamp(sin(3.14159*ph)/(fp*4.7),-1.,1.);
      c*=1.+.035*par*dot(vd,rlG.zw)*grz*w.a*(1.-smoothstep(35.,55.,length(dg)));}}
  diffuseColor.rgb=c*c;
  diffuseColor.rgb*=1.;`;


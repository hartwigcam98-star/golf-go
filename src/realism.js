/* ---------- realism: procedural detail textures, surface map, foliage cards, 3D grass ---------- */
const RL={det:{},surf:null,leaf:null,fol:null,folProg:null,folU:null,folA:null,folDepth:null,folDU:null,folDA:null,grass:null};
function wrapDraw(S,fn){for(const ox of[-S,0,S])for(const oy of[-S,0,S])fn(ox,oy);}
function makeDetail(kind){
  const S=512,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d',{willReadFrequently:true});const R=rng(kind.length*131+7);
  const base={short:128,rough:112,fescue:118,sand:128}[kind];g.fillStyle=`rgb(${base},${base},${base})`;g.fillRect(0,0,S,S);g.lineCap='round';
  if(kind==='sand'){
    for(let i=0;i<9;i++){const y0=R()*S,amp=6+R()*10,f=(1+Math.floor(R()*3))*TAU/S;g.strokeStyle=`rgba(${R()<.5?90:170},${R()<.5?90:170},${R()<.5?90:170},.08)`;g.lineWidth=5+R()*8;
      for(const oy of[-S,0,S]){g.beginPath();for(let x=0;x<=S;x+=8)g.lineTo(x,y0+oy+Math.sin(x*f)*amp);g.stroke();}}
    const id=g.getImageData(0,0,S,S),d=id.data;for(let k=0;k<d.length;k+=4){const v=(R()-.5)*70+(R()<.02?(R()-.5)*120:0);d[k]+=v;d[k+1]+=v;d[k+2]+=v;}g.putImageData(id,0,0);
  }else{
    const cfg={short:{n:34000,l:[3,8],w:1,lean:.35,v:[88,175]},rough:{n:26000,l:[8,20],w:1.4,lean:.5,v:[70,185]},fescue:{n:9000,l:[22,60],w:1.3,lean:.9,v:[70,200]}}[kind];
    // dark gaps between blades first, then the blades
    for(let i=0;i<cfg.n*.25;i++){const x=R()*S,y=R()*S,r=1+R()*3;g.fillStyle='rgba(20,20,20,.18)';wrapDraw(S,(ox,oy)=>{if(Math.abs(x+ox-S/2)<S/2+r&&Math.abs(y+oy-S/2)<S/2+r){g.beginPath();g.arc(x+ox,y+oy,r,0,TAU);g.fill();}});}
    for(let i=0;i<cfg.n;i++){const x=R()*S,y=R()*S,l=cfg.l[0]+R()*(cfg.l[1]-cfg.l[0]),a=(R()-.5)*cfg.lean,v=Math.round(cfg.v[0]+R()*(cfg.v[1]-cfg.v[0]));
      g.strokeStyle=`rgb(${v},${v},${v})`;g.lineWidth=cfg.w*(.6+R()*.8);const tx=Math.sin(a)*l,ty=-Math.cos(a)*l,bend=(R()-.5)*l*.3;
      wrapDraw(S,(ox,oy)=>{if(x+ox>-l&&x+ox<S+l&&y+oy>-l&&y+oy<S+l){g.beginPath();g.moveTo(x+ox,y+oy);g.quadraticCurveTo(x+ox+tx*.5+bend,y+oy+ty*.5,x+ox+tx,y+oy+ty);g.stroke();}});}
  }
  return c;
}
// 3D blades of rough and tall fescue around the ball
function buildGrassPatch(h,cx,cz){if(RL.noGrass||(R3.on&&R3G.lods))return;const out=[],R=rng(((cx*131)|0)^((cz*977)|0));const Rr=26;
  for(let i=0;i<70000;i++){const a=R()*TAU,r=Rr*Math.sqrt(R()),x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,code=lieCodeAt(h,x,z);
    let ht,w,c0,c1;
    if(code===1){if(R()>.55)continue;ht=.07+R()*.09;w=.022;c0=[.2,.33,.13];c1=[.42,.6,.27];}
    else if(code===0){if(CUR.scen==='desert'){if(R()>.03)continue;ht=.12+R()*.22;w=.03;c0=[.3,.33,.2];c1=[.52,.55,.36];}else{if(R()>.5)continue;ht=.28+R()*.6;w=.02;c0=[.36,.33,.18];c1=[.84,.76,.48];}}
    else continue;
    if(hyp(x-cx,z-cz)<.5)continue;
    const y=hAtH(h,x,z)-.01,ba=R()*TAU,bx=Math.cos(ba)*w,bz=Math.sin(ba)*w,lx=(R()-.5)*ht*.6,lz=(R()-.5)*ht*.6,tint=.8+R()*.35;
    const n=[lx*.5,1,lz*.5],A=mul(c0,tint),B=mul(c1,tint);
    out.push(x-bx,y,z-bz,...n,...A, x+bx,y,z+bz,...n,...A, x+lx,y+ht,z+lz,...n,...B);}
  r3SetGrass(out);RL.grassAt=[cx,cz];}



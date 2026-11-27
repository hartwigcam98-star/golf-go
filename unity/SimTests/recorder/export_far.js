/* the web game's far trees (real-tree-positions-from.js r3tFarBuild): billboard pictures of the tree models beyond the hole.
   trees/imp.png: the picture atlas (r3tImpBake, 8 x 8 cells of 224 px, sRGB, row 0 = the atlas's first row as WebGL stores it)
   hNN_far.bytes: int32 n, then n * 14 float32: position (3, the web's world), size (w, h, flip, 0), atlas rect (4), tint (3) */
const fs=require('fs'),path=require('path'),boot=require('./boot.js');
(async()=>{const OUT=process.argv[3],CID=process.argv[4]||'troy';const g=await boot(process.argv[2]);let atlas=fs.existsSync(path.join(process.env.GGTREES||path.join(OUT,'..','trees'),'imp.png'));   // (the picture atlas is the same for every course: made once)
  for(let i=0;i<18;i++){
    const r=JSON.parse(await g.ev(`(()=>{G.mode='practice';setCourse('${CID}',false);startHole(${i});$('introM').hidden=true;
      const m=R3T.far;if(!m)return JSON.stringify({n:0});const ge=m.geometry,n=ge.instanceCount,a=k=>Array.from(ge.attributes[k].array);
      let img=null;if(!${atlas}){r3tImpBake();const I=r3tImpInfo(),rt=I.rt,w=rt.width,h=rt.height,px=new Uint8Array(w*h*4);R3.renderer.readRenderTargetPixels(rt,0,0,w,h,px);img={w,h,d:Array.from(px)};}
      return JSON.stringify({n,P:a('iP'),S:a('iS'),R:a('iR'),C:a('iC'),img});})()`));
    const b=Buffer.alloc(4+r.n*56);b.writeInt32LE(r.n,0);
    for(let k=0;k<r.n;k++){const v=[...r.P.slice(k*3,k*3+3),...r.S.slice(k*4,k*4+4),...r.R.slice(k*4,k*4+4),...r.C.slice(k*3,k*3+3)];v.forEach((x,j)=>b.writeFloatLE(x,4+k*56+j*4));}
    fs.writeFileSync(path.join(OUT,'h'+String(i+1).padStart(2,'0')+'_far.bytes'),b);console.log(i+1,r.n,'far trees');
    if(r.img&&!atlas){atlas=true;fs.writeFileSync(path.join(process.env.GGTREES||path.join(OUT,'..','trees'),'imp.bytes'),Buffer.from(r.img.d));console.log('atlas',r.img.w,r.img.h);}}
  console.log('errs',g.errs.slice(0,3));await g.close();})();

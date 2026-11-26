/* everything the web game builds round a hole into its one vertex-coloured mesh (3d-meshes.js: houses, the clubhouse and other
   structures, bridges, course props, fescue wisps: R3.trees, drawn with R3.mat.tree), per hole: hNN_built.bytes =
   int32 n, float32 min x, y, z, step x, y, z, then n * (uint16 x, y, z quantised, int8 nx, ny, nz, uint8 r, g, b): the web's 3D world */
const fs=require('fs'),path=require('path'),boot=require('./boot.js');
(async()=>{const OUT=process.argv[3];const g=await boot(process.argv[2]);
  for(let i=0;i<18;i++){
    const r=JSON.parse(await g.ev(`(()=>{G.mode='practice';setCourse('troy',false);startHole(${i});$('introM').hidden=true;
      const m=R3.trees;if(!m)return JSON.stringify({n:0});const a=m.geometry.attributes,n=a.position.count,p=[],q=[],c=[];
      // (interleaved: read each attribute through its accessors; colours are already squared into linear light by r3Geo)
      for(let k=0;k<n;k++){p.push(a.position.getX(k),a.position.getY(k),a.position.getZ(k));q.push(a.normal.getX(k),a.normal.getY(k),a.normal.getZ(k));c.push(a.color.getX(k),a.color.getY(k),a.color.getZ(k));}
      return JSON.stringify({n,p,q,c});})()`));
    const n=r.n,hd=Buffer.alloc(28);hd.writeInt32LE(n,0);
    let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(let k=0;k<n;k++)for(let j=0;j<3;j++){const v=r.p[k*3+j];mn[j]=Math.min(mn[j],v);mx[j]=Math.max(mx[j],v);}
    const st=mn.map((v,j)=>Math.max(1e-6,(mx[j]-v)/65535));for(let j=0;j<3;j++){hd.writeFloatLE(n?mn[j]:0,4+j*4);hd.writeFloatLE(st[j],16+j*4);}
    const b=Buffer.alloc(n*12);
    for(let k=0;k<n;k++){const o=k*12;for(let j=0;j<3;j++)b.writeUInt16LE(Math.round((r.p[k*3+j]-mn[j])/st[j]),o+j*2);
      for(let j=0;j<3;j++)b.writeInt8(Math.max(-127,Math.min(127,Math.round(r.q[k*3+j]*127))),o+6+j);
      for(let j=0;j<3;j++)b.writeUInt8(Math.max(0,Math.min(255,Math.round(r.c[k*3+j]*255))),o+9+j);}
    fs.writeFileSync(path.join(OUT,'h'+String(i+1).padStart(2,'0')+'_built.bytes'),Buffer.concat([hd,b]));
    let cmax=0;for(const v of r.c)cmax=Math.max(cmax,v);console.log(i+1,n,'verts, colour max',cmax.toFixed(2));}
  console.log('errs',g.errs.slice(0,3));await g.close();})();

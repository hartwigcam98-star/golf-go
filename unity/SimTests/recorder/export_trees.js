/* the web game's species trees (arm-ik.js R3T): every tree model a Troy hole draws (each species version, re-shaped to its measured
   crown base: r3tWarp), full and lite, and each hole's trees (which model, where, turned and sized, tinted).
   trees/<key>.bytes: 6 parts (full bark, mass, leaf; lite bark, mass, leaf), each int32 vertex count then per vertex
     float32 x, y, z (the web's 3D world: x east, y up, z south), int8 nx, ny, nz, pad, uint8 r, g, b (colour / 2 * 255), pad, float32 u, v
   hNN_trees.bytes: int32 groups; per group: int32 key length + key (ascii), int32 n, then n * 9 float32: x, y, z, rotY, sx, sy, r, g, b
   trees/bark.png, bark_n.png (raw data), leaves.png (the species leaf atlas, sRGB, flipY false)                                    */
const fs=require('fs'),path=require('path'),boot=require('./boot.js');
(async()=>{const OUT=process.argv[3],CID=process.argv[4]||'troy',TOUT=path.join(OUT,'..','trees');fs.mkdirSync(TOUT,{recursive:true});const g=await boot(process.argv[2]);const done=new Set();
  const safe=k=>k.replace(/\|/g,'_').replace(/#/g,'-');
  for(let i=0;i<18;i++){
    const r=JSON.parse(await g.ev(`(()=>{G.mode='practice';setCourse('${CID}',false);startHole(${i});$('introM').hidden=true;
      const P=r3tProtos(),gs=[];
      for(const gp of R3T.groups){const t=gp.ts[0],key=t.sp+(t.fall?'_fall':''),vs=P[key]||P[t.sp];let gk,v;
        if(t.mh){const lv=[...new Set(vs.filter(g=>!g.snag))],wi=Math.floor((t.shade||0)*97)%lv.length,bk=r3tBucket(t.mb/t.mh);gk=key+'|L'+wi+'#'+bk;v=r3tWarp(lv[wi],gk,bk);}
        else{const vi=Math.floor((t.shade||0)*97)%vs.length;gk=key+'|'+vi;v=vs[vi];}
        const ts=[];for(let k=0;k<gp.ts.length;k++){const e=gp.M.subarray(k*16,k*16+16);ts.push([e[12],e[13],e[14],Math.atan2(-e[2],e[0]),Math.hypot(e[0],e[1],e[2]),Math.hypot(e[4],e[5],e[6]),gp.C[k*3],gp.C[k*3+1],gp.C[k*3+2]]);}
        gs.push({gk,ts,geo: [v.bark,v.mass,v.leaf,v.lite.bark,v.lite.mass,v.lite.leaf].map(a=>Array.from(a))});}
      return JSON.stringify(gs);})()`));
    const parts=[];const hb=Buffer.alloc(4);hb.writeInt32LE(r.length,0);parts.push(hb);
    for(const gp of r){const kb=Buffer.from(gp.gk,'ascii'),h=Buffer.alloc(8+kb.length);h.writeInt32LE(kb.length,0);kb.copy(h,4);h.writeInt32LE(gp.ts.length,4+kb.length);parts.push(h);
      const tb=Buffer.alloc(gp.ts.length*36);gp.ts.forEach((t,k)=>t.forEach((v,j)=>tb.writeFloatLE(v,k*36+j*4)));parts.push(tb);
      if(!done.has(gp.gk)){done.add(gp.gk);const ps=[];
        gp.geo.forEach((a,pi)=>{const st=pi%3===1?9:11,n=a.length/st,b=Buffer.alloc(4+n*28);b.writeInt32LE(n,0);
          for(let k=0;k<n;k++){const o=k*st,w=4+k*28;b.writeFloatLE(a[o],w);b.writeFloatLE(a[o+1],w+4);b.writeFloatLE(a[o+2],w+8);
            for(let j=0;j<3;j++)b.writeInt8(Math.max(-127,Math.min(127,Math.round(a[o+3+j]*127))),w+12+j);
            for(let j=0;j<3;j++)b.writeUInt8(Math.max(0,Math.min(255,Math.round(a[o+6+j]/2*255))),w+16+j);
            b.writeFloatLE(st===11?a[o+9]:0,w+20);b.writeFloatLE(st===11?a[o+10]:0,w+24);}
          ps.push(b);});
        fs.writeFileSync(path.join(TOUT,safe(gp.gk)+'.bytes'),Buffer.concat(ps));}}
    fs.writeFileSync(path.join(OUT,'h'+String(i+1).padStart(2,'0')+'_trees.bytes'),Buffer.concat(parts));
    console.log(i+1,r.length,'groups',r.reduce((s,q)=>s+q.ts.length,0),'trees, library',done.size);}
  const tx=JSON.parse(await g.ev(`(()=>{const cv=im=>{const c=document.createElement('canvas');c.width=im.naturalWidth||im.width;c.height=im.naturalHeight||im.height;c.getContext('2d').drawImage(im,0,0);return c.toDataURL('image/png');};
    return JSON.stringify({b:R3.ptex.b&&cv(R3.ptex.b.image),bn:R3.ptex.bn&&cv(R3.ptex.bn.image),l:cv(R3.sleaf.image)});})()`));
  for(const[k,n]of[['b','bark'],['bn','bark_n'],['l','leaves']])if(tx[k])fs.writeFileSync(path.join(TOUT,n+'.png'),Buffer.from(tx[k].split(',')[1],'base64'));
  console.log('errs',g.errs.slice(0,3));await g.close();})();

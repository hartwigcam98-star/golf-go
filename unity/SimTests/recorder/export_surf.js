// only the surface maps (hNN_surf.png), raw: node export_surf.js <site> <out> [course]
const fs=require('fs'),path=require('path'),boot=require('./boot.js'),png=require('./png_raw.js');
(async()=>{const OUT=process.argv[3],CID=process.argv[4]||'troy';const g=await boot(process.argv[2]);
  for(let i=0;i<18;i++){const nn=String(i+1).padStart(2,'0');
    const s=JSON.parse(await g.ev(`(()=>{G.mode='practice';setCourse('${CID}',false);startHole(${i});$('introM').hidden=true;const im=R3.GU.gSurf.value.image;
      return JSON.stringify({w:im.width,h:im.height,d:Array.from(new Uint8Array(im.data.buffer,im.data.byteOffset,im.data.byteLength))});})()`));
    fs.writeFileSync(path.join(OUT,'h'+nn+'_surf.png'),png(s.w,s.h,Uint8Array.from(s.d)));console.log(nn,s.w,s.h);}
  await g.close();})();

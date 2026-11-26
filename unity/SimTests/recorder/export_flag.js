// the course's flag picture (r3FlagCanvas: colours, border and emblem) as a PNG for Unity: node export_flag.js <site> <out.png> [course]
const fs=require('fs'),boot=require('./boot.js');
(async()=>{const g=await boot(process.argv[2]);const id=process.argv[4]||'troy';
  const u=await g.ev(`r3FlagCanvas('${id}').toDataURL('image/png')`);fs.writeFileSync(process.argv[3],Buffer.from(u.split(',')[1],'base64'));
  console.log('flag',id,fs.statSync(process.argv[3]).size);await g.close();})();

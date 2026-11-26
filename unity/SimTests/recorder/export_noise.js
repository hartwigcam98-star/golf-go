// the web game's noise texture (sky.js r3Noise: 256 x 256 RGBA, repeating), raw bytes, row 0 first
const fs=require('fs'),boot=require('./boot.js');
(async()=>{const g=await boot(process.argv[2]);const r=JSON.parse(await g.ev(`(()=>{const t=R3.noise.image;return JSON.stringify({w:t.width,h:t.height,d:Array.from(t.data)});})()`));
  fs.writeFileSync(process.argv[3],Buffer.from(r.d));console.log(r.w,r.h,r.d.length);await g.close();})();

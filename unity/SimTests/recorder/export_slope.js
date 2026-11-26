/* the green slope map (webgl-ground.js buildSlopeTex) for each hole, written raw: hNN_slope.bytes = 4 float32 (x0, y0, w, h: SLB) +
   2 int32 (nx, ny) + nx*ny RGBA8 (RG downhill direction, B steepness on the colour scale, A the putting-surface mask), row 0 = y0 */
const fs=require('fs'),path=require('path'),boot=require('./boot.js');
(async()=>{const OUT=process.argv[3]||'out',course=process.argv[4]||'troy';const g=await boot(process.argv[2]||'/home/claude/golf-go');
  for(let i=0;i<18;i++){
    const r=JSON.parse(await g.ev(`(()=>{G.mode='practice';setCourse('${course}',false);startHole(${i});$('introM').hidden=true;
      const h=G.hole;if(GL.slH!==h)buildSlopeTex(h);const t=GL.slTex,im=t.image;return JSON.stringify({R:GL.slR,nx:im.width,ny:im.height,d:Array.from(im.data)});})()`));
    const hd=Buffer.alloc(24);hd.writeFloatLE(r.R[0],0);hd.writeFloatLE(r.R[1],4);hd.writeFloatLE(r.R[2],8);hd.writeFloatLE(r.R[3],12);hd.writeInt32LE(r.nx,16);hd.writeInt32LE(r.ny,20);
    fs.writeFileSync(path.join(OUT,'h'+String(i+1).padStart(2,'0')+'_slope.bytes'),Buffer.concat([hd,Buffer.from(r.d)]));console.log(i+1,r.nx+'x'+r.ny,r.R.map(v=>v.toFixed(1)).join(','));}
  console.log('errs',g.errs.length);await g.close();})();

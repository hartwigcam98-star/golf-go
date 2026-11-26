// (re-run: node unity/SimTests/recorder/export_look.js . unity/Assets/Resources/troy [course id])
/* Stage 6 exporter: what the web game draws on top of the ground, per hole, from its own 3D scene (R3):
     hNN_look.json   water: the surface the game builds (r3Water: every pond's outline ear-clipped, creeks split to ~5 yd and set to
                     the level the ground under them falls to), as triangles in the game's 3D world (x east, y up, z south), and the
                     main water level (the most common one, for the reflection's mirror plane)                                     */
const fs = require('fs'), path = require('path'), boot = require('./boot.js');
const SITE = process.argv[2], OUT = process.argv[3], CID = process.argv[4] || 'troy';
(async () => {
  const g = await boot(SITE);
  const n = JSON.parse(await g.ev(`(()=>{Math.random=rng(99);G.mode='practice';G.pinSeed=424242;setCourse('${CID}',false);return JSON.stringify(TB.length);})()`));
  for (let i = 0; i < n; i++) {
    const nn = String(i + 1).padStart(2, '0');
    const look = await g.ev(`(()=>{startHole(${i});$('introM').hidden=true;try{R3R.on=false;}catch(e){}
      try{r3Water(G.hole);}catch(e){}
      const w=R3.water,out={water:null,level:null};
      if(w&&w.geometry){const P=w.geometry.attributes.position.array,arr=Array.from(P,v=>+v.toFixed(3));out.water=arr;
        const lv={};for(let k=1;k<arr.length;k+=3){const y=arr[k].toFixed(2);lv[y]=(lv[y]||0)+1;}out.level=+Object.entries(lv).sort((a,b)=>b[1]-a[1])[0][0];}
      return JSON.stringify(out);})()`);
    fs.writeFileSync(path.join(OUT, 'h' + nn + '_look.json'), look);
    const L = JSON.parse(look); console.log('hole', i + 1, 'water triangles', L.water ? L.water.length / 9 : 0, 'level', L.level);
  }
  console.log('errors', g.errs.slice(0, 3)); await g.close();
})();

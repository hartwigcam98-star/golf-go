// (re-run: node unity/SimTests/recorder/export_look.js . unity/Assets/Resources/troy [course id])
/* Stage 6 exporter: what the web game draws on top of the ground, per hole, from its own 3D scene (R3):
     hNN_look.json   water: the surface the game builds (r3Water: every pond's outline ear-clipped, creeks split to ~5 yd and set to
                     the level the ground under them falls to), as triangles in the game's 3D world (x east, y up, z south), and the
                     main water level (the most common one, for the reflection's mirror plane); the ground shader's settings (gB the
                     course map's rect, gSB the surface map's rect, rlS mown stripes, rlG the green's stripes, tK turf tints, gSS the
                     surroundings map's rect); the skirt (r3Surround: the land round the hole: a 20-yd grid's heights; quads wholly inside the hole's rect less 4 yd are left out)
     hNN_surf.png    the ground shader's surface map (gSurf: per yard, r short grass, g rough, b fescue, a green; what's left: sand)
   and once per course: det_short/rough/fescue/sand.png (the tiling detail textures), turf_g/gn/s/sn.jpg (the photographed turf and
   sand and their normal maps), surround.png (gStex, the surroundings' colours)                                                    */
const fs = require('fs'), path = require('path'), boot = require('./boot.js');
const SITE = process.argv[2], OUT = process.argv[3], CID = process.argv[4] || 'troy';
(async () => {
  const g = await boot(SITE);
  const n = JSON.parse(await g.ev(`(()=>{Math.random=rng(99);G.mode='practice';G.pinSeed=424242;setCourse('${CID}',false);return JSON.stringify(TB.length);})()`));
  for (let i = 0; i < n; i++) {
    const nn = String(i + 1).padStart(2, '0');
    const look = await g.ev(`(()=>{startHole(${i});$('introM').hidden=true;try{R3R.on=false;}catch(e){}
      try{r3Water(G.hole);}catch(e){}
      const w=R3.water,out={water:null,level:null};const GU=R3.GU,V=k=>GU[k]&&GU[k].value&&GU[k].value.toArray?GU[k].value.toArray():null;
      out.gB=V('gB');out.gSB=V('gSB');out.rlS=V('rlS');out.rlG=V('rlG');out.tK=V('tK');out.gSS=V('gSS');out.pOn=GU.pOn?GU.pOn.value:null;
      if(R3.skirt){const P=R3.skirt.geometry.attributes.position.array,x0=P[0],y0=P[2];let nx=1;while(nx*3<P.length&&Math.abs(P[nx*3+2]-y0)<1e-6)nx++;   // a regular grid: keep its heights
        const st=P[3]-P[0],h=[];for(let k=1;k<P.length;k+=3)h.push(+P[k].toFixed(2));out.skirt={x0,y0,st:+st.toFixed(4),nx,ny:h.length/nx,h};}
      if(w&&w.geometry){const P=w.geometry.attributes.position.array,arr=Array.from(P,v=>+v.toFixed(3));out.water=arr;
        const lv={};for(let k=1;k<arr.length;k+=3){const y=arr[k].toFixed(2);lv[y]=(lv[y]||0)+1;}out.level=+Object.entries(lv).sort((a,b)=>b[1]-a[1])[0][0];}
      return JSON.stringify(out);})()`);
    fs.writeFileSync(path.join(OUT, 'h' + nn + '_look.json'), look);
    // the surface map (a data texture) as a PNG
    const surf = await g.ev(`(()=>{const t=R3.GU.gSurf.value,im=t.image,c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d'),d=x.createImageData(im.width,im.height);
      d.data.set(im.data.length===d.data.length?im.data:new Uint8ClampedArray(im.data.buffer));x.putImageData(d,0,0);return JSON.stringify({png:c.toDataURL('image/png'),flipY:!!t.flipY,w:im.width,h:im.height});})()`);
    const S = JSON.parse(surf); fs.writeFileSync(path.join(OUT, 'h' + nn + '_surf.png'), Buffer.from(S.png.split(',')[1], 'base64'));
    if (i === 0) {   // the course's shared textures
      const tx = JSON.parse(await g.ev(`(()=>{const GU=R3.GU,o={};const cv=im=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);return c;};
        for(const[k,n,f]of[['dShort','det_short','png'],['dRough','det_rough','png'],['dFes','det_fescue','png'],['dSand','det_sand','png'],['pG','turf_g','jpeg'],['pGN','turf_gn','jpeg'],['pS','turf_s','jpeg'],['pSN','turf_sn','jpeg'],['gStex','surround','png']]){
          const t=GU[k]&&GU[k].value;if(!t||!t.image)continue;o[n]={d:cv(t.image).toDataURL('image/'+f,.92),f,flipY:!!t.flipY};}
        return JSON.stringify(o);})()`));
      for (const n in tx) fs.writeFileSync(path.join(OUT, n + (tx[n].f === 'jpeg' ? '.jpg' : '.png')), Buffer.from(tx[n].d.split(',')[1], 'base64'));
      console.log('shared textures', Object.keys(tx).map(n => n + (tx[n].flipY ? '' : ' (no flipY)')).join(', '));
      console.log('surface map flipY', S.flipY, S.w + 'x' + S.h);
    }
    const L = JSON.parse(look); console.log('hole', i + 1, 'water triangles', L.water ? L.water.length / 9 : 0, 'level', L.level, 'skirt', L.skirt ? L.skirt.nx + 'x' + L.skirt.ny : 0, 'gSB', JSON.stringify(L.gSB), 'rlS', JSON.stringify(L.rlS));
  }
  console.log('errors', g.errs.slice(0, 3)); await g.close();
})();

// (re-run: node unity/SimTests/recorder/export_course.js . unity/Assets/Resources/troy [course id])
/* Stage 5 exporter: every hole of a course from the web game, headless, for the Unity game. Per hole NN (01..18):
     hNN.json        what Unity draws and the sim's ground: course, hole, par, len, pin, tee [x, y, aim], hg / gg heights (full
                     precision), lg + lieNames (the course map's lie codes), tex (the ground texture's rect), green outline,
                     trees [x, y, r, gh, top, cb, conifer] x n, the centreline segs [x, y, a, L, s0] (h.at / alongCl), line0
     hNN_sim.json    what GolfGo.Sim needs (as record_land.js): the lie grid with dirt under the trees, trees with crown profiles,
                     cart paths, the course's surface tables, sand, heights beyond the grid
     hNN_ground.jpg  the course map texture (buildTerrain's canvas)
     hNN_light.png   the Blender-baked light (b10/light/<course>/hNN.webp) as Unity's x2 detail grey: .5(.4+.6(.1+.9R))(.75+.25G)
   Pins: the round's pin with pinSeed 424242 (the same as the parity cases).                                                   */
const fs = require('fs'), path = require('path'), boot = require('./boot.js');
const SITE = process.argv[2], OUT = process.argv[3], CID = process.argv[4] || 'troy';
(async () => {
  const g = await boot(SITE);
  fs.mkdirSync(OUT, { recursive: true });
  const n = JSON.parse(await g.ev(`(()=>{Math.random=rng(99);G.mode='practice';G.pinSeed=424242;G.scores=[];setCourse('${CID}',false);return JSON.stringify({n:TB.length,name:CUR.name||CUR.id});})()`));
  console.log(CID, n);
  for (let i = 0; i < n.n; i++) {
    const nn = String(i + 1).padStart(2, '0');
    const hole = await g.ev(`(()=>{startHole(${i});$('introM').hidden=true;try{R3R.on=false;}catch(e){}prepareShot();const h=G.hole,b=h.bounds;
      const grid=q=>q?{x0:q.x0,y0:q.y0,st:q.st,nx:q.nx,ny:q.ny,data:Array.from(q.data)}:null;
      const green=[];for(const p of (h.green&&h.green.pts)||h.green||[])green.push(p[0],p[1]);
      const trees=[];for(const t of h.trees)trees.push(+t.x.toFixed(2),+t.y.toFixed(2),+t.r.toFixed(2),+t.gh.toFixed(2),+(t.mh||0).toFixed(2),+(t.cb||0).toFixed(2),t.con?1:0);
      return JSON.stringify({course:CUR.name||'${CID}',hole:${i + 1},par:h.par,len:h.len,pin:h.pin,tee:[G.ball.x,G.ball.y,G.aim],
        hg:grid(h.hg),gg:grid(h.gg),lg:{x0:h.lg.x0,y0:h.lg.y0,nx:h.lg.nx,ny:h.lg.ny,data:Array.from(h.lg.code)},lieNames:LIE_CODES,
        tex:{x0:b[0],y0:b[1],w:b[2]-b[0],h:b[3]-b[1]},green,trees,segs:h.segs.map(s=>[s.x,s.y,s.a,s.L,s.s0]),line0:(h.line&&h.line[0])||[0,0]});})()`);
    fs.writeFileSync(path.join(OUT, 'h' + nn + '.json'), hole);
    const sim = await g.ev(`(()=>{const h=G.hole,L=h.lg,names=['ob',...LIE_CODES.filter((v,i,a)=>a.indexOf(v)===i)];if(!names.includes('dirt'))names.push('dirt');if(!names.includes('path'))names.push('path');
    const lie=new Array(L.nx*L.ny);for(let j=0;j<L.ny;j++)for(let i=0;i<L.nx;i++){const n=lieAt(L.x0+i,L.y0+j);lie[j*L.nx+i]=names.indexOf(n);}
    const cpArr=cp=>{if(!cp)return null;const r=[];const ks=Object.keys(cp.r).map(Number);const n=ks.length?Math.max(...ks)+1:0;for(let k=0;k<n;k++)r.push(cp.r[k]||0);return{B:cp.B,r};};
    const trees=h.trees.map(t=>({x:t.x,y:t.y,r:t.r,cr:t.cr||0,mh:t.mh||0,gh:t.gh,con:t.con?1:0,cactus:t.cactus?1:0,vs:t.vs||1,cp:cpArr(t.cp),cs:t.cs||null}));
    return JSON.stringify({lieNames:names,lg:{x0:L.x0,y0:L.y0,nx:L.nx,ny:L.ny,data:lie},trees,paths:h.paths||[],bkF:!!h.bkF,
      MU,HOP_E,SURF,MU_REST,MU_REST_FW,CUP,CAPV,GACC,GIMME_YD,PATH_HW,PATH_ON,bury:bkSand().bury,sandRel:bkSand().rel,
      wide:(()=>{const g=h.hg,st=4,m=200,x0=g.x0-m,y0=g.y0-m,nx=Math.ceil(((g.nx-1)*g.st+2*m)/st)+1,ny=Math.ceil(((g.ny-1)*g.st+2*m)/st)+1,d=new Array(nx*ny);
        for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)d[j*nx+i]=+hAt(x0+i*st,y0+j*st).toFixed(3);return{x0,y0,st,nx,ny,data:d};})(),
      chk:{hAt:[hAt(500,-100),hAt(300,-300)],grad:gradAt(300,-300)}});})()`);
    fs.writeFileSync(path.join(OUT, 'h' + nn + '_sim.json'), sim);
    // the ground texture: the web game's own canvas
    const jpg = await g.ev(`(()=>{const c=buildTerrain(G.hole);return c.toDataURL('image/jpeg',.9);})()`);
    fs.writeFileSync(path.join(OUT, 'h' + nn + '_ground.jpg'), Buffer.from(jpg.split(',')[1], 'base64'));
    // the baked light, converted for Unity's x2 detail map
    const lt = await g.ev(`new Promise(res=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
        const d=x.getImageData(0,0,c.width,c.height),a=d.data;for(let k=0;k<a.length;k+=4){const R=a[k]/255,Gn=a[k+1]/255,v=.5*(.4+.6*(.1+.9*R))*(.75+.25*Gn),q=Math.round(v*255);a[k]=a[k+1]=a[k+2]=q;a[k+3]=255;}
        x.putImageData(d,0,0);res(JSON.stringify({png:c.toDataURL('image/png'),w:c.width,h:c.height}));};im.onerror=()=>res(JSON.stringify({err:1}));im.src='b10/light/${CID}/h${nn}.webp';})`);
    const L = JSON.parse(lt);
    if (!L.err) fs.writeFileSync(path.join(OUT, 'h' + nn + '_light.png'), Buffer.from(L.png.split(',')[1], 'base64'));
    console.log('hole', i + 1, 'par', JSON.parse(hole).par, 'light', L.err ? 'none' : L.w + 'x' + L.h);
  }
  // the light maps' rects (they can differ from the ground texture's)
  try { fs.copyFileSync(path.join(SITE, 'b10/light', CID, 'bounds.json'), path.join(OUT, 'light_bounds.json')); } catch (e) { }
  console.log('errors', g.errs.slice(0, 3));
  await g.close();
})();

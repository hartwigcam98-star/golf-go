// node gal.js <port> <mode cand|before|after> <cid,cid,...> <outdir>   (serve the mkhook.py copy on <port>)
// cand: three candidate cameras per course -> <outdir>/<cid>_c<k>.png and <outdir>/cands.json
//   c0 the close course-side view of the clubhouse, c1 a wider, higher view from out on the home hole (more course, trees and
//   light in frame), c2 the best view from a different side (>= 60 degrees away)
// before/after: shoot with <outdir>/cams.json (picked from the candidates) -> <outdir>/<cid>_<mode>.png
// One browser per course (a fresh page each time keeps memory flat and one bad course from stopping the rest).
const { chromium } = require('playwright'); const fs = require('fs');
const [port, mode, ids, outdir] = process.argv.slice(2); fs.mkdirSync(outdir, { recursive: true });
const CF = outdir + (mode === 'cand' ? '/cands.json' : '/cams.json');
const rd = () => fs.existsSync(CF) ? JSON.parse(fs.readFileSync(CF, 'utf8')) : {};
async function one(cid) {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const p = await b.newPage({ viewport: { width: 760, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(u => !u.href.startsWith('http://localhost'), r => r.abort());
    await p.addInitScript(() => { window.__noPerf = 1; try { localStorage.setItem('golf-news-seen', 'zzzz'); localStorage.setItem('golf-gfx', 'high'); } catch (e) {} });
    await p.goto(`http://localhost:${port}/index.html${mode === 'before' ? '?b10=0' : ''}`, { waitUntil: 'domcontentloaded', timeout: 240000 }); await p.waitForTimeout(10000);
    await p.addStyleTag({ content: '#game *{visibility:hidden!important} #game canvas{visibility:visible!important} #game #c{visibility:hidden!important} .modal{display:none!important}' });
    await p.evaluate(() => window.__ev(`(()=>{const o=R3.U&&R3.U.r3fade;if(o)Object.defineProperty(o,'value',{get(){return 0},set(v){}});$('menuM').hidden=true;G.paused=false;return 1;})()`));
    const ALL = rd(); const cam0 = mode === 'cand' ? null : ALL[cid];
    if (mode !== 'cand' && !cam0) { console.log(cid, 'no camera'); return; }
    const r = await p.evaluate(([cid, cam0]) => window.__ev(`(()=>{setCourse(${JSON.stringify(cid)},false);G.mode='practice';
      let hi=${cam0 ? cam0.hi : -1};if(hi<0){let best=null;for(let i=0;i<TB.length;i++){const h=buildHole(TB[i],i),L=h.line||[];for(const q of (h.buildings||[]))if(q.club&&!q.lmHide){let md=1e9;for(let k=0;k+1<L.length;k++){const a=L[k],b=L[k+1],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy||1;let t=((q.x-a[0])*dx+(q.y-a[1])*dy)/l2;t=Math.max(0,Math.min(1,t));md=Math.min(md,Math.hypot(a[0]+dx*t-q.x,a[1]+dy*t-q.y));}const sc=md-Math.sqrt(q.area)*.5;if(!best||sc<best.sc)best={i,sc};}}
        if(!best&&CLUBMODEL[${JSON.stringify(cid)}])best={i:0};if(!best)return {none:1};hi=best.i;}
      window.__HI=hi;startHole(hi);return {hi};})()`), [cid, cam0]);
    if (r.none) { console.log(cid, 'no clubhouse'); return; }
    for (let t = 0; t < 60; t++) { await p.waitForTimeout(1000); if (await p.evaluate(() => window.__ev('!!(G.hole&&G.hole.T0)'))) break; }
    await p.waitForTimeout(8000);
    let cams = [cam0];
    if (mode === 'cand') cams = await p.evaluate(() => window.__ev(`(()=>{const h=G.hole,T0=h.T0;
      let q=(h.buildings||[]).filter(q=>q.club&&!q.lmHide).sort((a,b)=>b.area-a.area)[0];let qx,qy,sz,eave;
      if(CLUBMODEL[CUR.id]&&!q){const M=CLUBMODEL[CUR.id];qx=M.o[0]-T0[0];qy=M.o[1]-T0[1];sz=60;eave=6;}else{qx=q.x;qy=q.y;sz=Math.max(q.bb[2]-q.bb[0],q.bb[3]-q.bb[1]);eave=(q.rec&&q.rec[0])||4;}
      const L=h.line||[];let md=1e9,mp=null;for(let k=0;k+1<L.length;k++){const a=L[k],b=L[k+1],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy||1;let t=((qx-a[0])*dx+(qy-a[1])*dy)/l2;t=Math.max(0,Math.min(1,t));const px=a[0]+dx*t,py=a[1]+dy*t,d=Math.hypot(qx-px,qy-py);if(d<md){md=d;mp=[px,py];}}
      let ux=mp[0]-qx,uy=mp[1]-qy;const ul=Math.hypot(ux,uy)||1;ux/=ul;uy/=ul;const a0=Math.atan2(uy,ux),TR=(h.trees||[]),BS=(h.buildings||[]);
      const sees=(ex,ey,near)=>{let pen=0;const sx=qx-ex,sy=qy-ey,sl=Math.hypot(sx,sy);
        for(const t of TR){const tx=t.x-ex,ty=t.y-ey,pr=(tx*sx+ty*sy)/sl;if(pr<-3||pr>sl-sz*.35)continue;const pd=Math.abs(tx*sy-ty*sx)/sl;const rr=(t.r||3)+1.2;if(pd<rr)pen+=pr<near?3:1;}
        for(const B of BS){if(B===q)continue;const bx=B.x-ex,by=B.y-ey,pr=(bx*sx+by*sy)/sl;if(pr<0||pr>sl-sz*.4)continue;const pd=Math.abs(bx*sy-by*sx)/sl;if(pd<Math.sqrt(B.area||50)*.6)pen+=4;}
        if(h.water&&h.water.some(w=>inPoly(w,ex,ey)))pen+=.5;return pen;};
      const search=(dms,fh,das,dmin,dmax)=>{let best=null;for(const da of das)for(const dm of dms){const d=Math.max(dmin,Math.min(dmax,sz*dm*1.15)),a=a0+da*Math.PI/180,ex=qx+Math.cos(a)*d,ey=qy+Math.sin(a)*d;
          if(BS.some(b=>inPoly(b,ex,ey)))continue;const sc=sees(ex,ey,15)*10+Math.abs(da)/30+Math.abs(dm-dms[0])*2;if(!best||sc<best.sc)best={sc,ex,ey,d,da};}
        if(!best)return null;const g0=hAt(qx,qy),ge=hAt(best.ex,best.ey);
        return {hi:window.__HI,da:best.da,E:[best.ex+T0[0],Math.max(ge+1.7,g0+eave*.55)+best.d*fh,best.ey+T0[1]],L:[qx+T0[0],g0+eave*.5,qy+T0[1]]};};
      const A=[0,20,-20,40,-40,60,-60,90,-90,135,-135,180];
      const c0=search([1,1.25,.8,1.5],.12,A,45,120);
      const c1=search([2,2.4,1.7,2.8],.2,[0,15,-15,30,-30,45,-45],90,210);
      const c2=search([1.3,1.6,1.1],.16,A.filter(a=>c0&&Math.abs(((a-c0.da+540)%360)-180)>=60),55,150);
      return [c0,c1,c2].filter(Boolean);})()`));
    const meta = await p.evaluate(() => window.__ev('({name:CUR.name,town:CUR.town,ord:Object.keys(COURSES).indexOf(CUR.id)})'));
    const out = [];
    for (let k = 0; k < cams.length; k++) {
      const C = cams[k];
      await p.evaluate(([C]) => window.__ev(`(()=>{const h=G.hole,T0=h.T0;$('introM').hidden=true;const C=${JSON.stringify(C)};
        const E=[C.E[0]-T0[0],C.E[1],C.E[2]-T0[1]],Lk=[C.L[0]-T0[0],C.L[1],C.L[2]-T0[1]];
        G.ball.x=E[0];G.ball.y=E[2];camTarget=()=>({E:[...E],L:[...Lk]});cam.E=[...E];cam.L=[...Lk];G.state='aim';return 1;})()`), [C]);
      await p.waitForTimeout(k ? 5000 : 8000);
      const f = mode === 'cand' ? `${outdir}/${cid}_c${k}.png` : `${outdir}/${cid}_${mode}.png`;
      await p.screenshot({ path: f, timeout: 300000 }); out.push(C);
    }
    if (mode === 'cand') { const A = rd(); A[cid] = out.map(c => Object.assign(c, meta)); fs.writeFileSync(CF, JSON.stringify(A)); }
    console.log(cid, mode, 'hole', cams[0].hi + 1, out.length, 'shots', errs.length ? 'ERR ' + errs[0] : '');
  } catch (e) { console.log(cid, mode, 'FAILED', String(e.message || e).split('\n')[0]); }
  finally { await b.close(); }
}
(async () => { for (const cid of ids.split(',')) await one(cid); })();

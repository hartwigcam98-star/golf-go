// (re-run: node unity/SimTests/recorder/bake_golfer.js . unity/Assets/Resources/golfers ch06 ch28 ch42)
/* Stage 6 recorder: the web game's golfers for Unity, recorded from the game itself (its retargeted clips, arm/leg IK, club solve).
   Per golfer <id>:
     <id>.json       the skinned body as the game builds it: bone names, parents, bind (inverse) matrices, rest local positions,
                     vertices (rig cm, three.js axes), normals, uvs, skin indices/weights, triangles, alpha-tested or not
     <id>_tex.png    its texture (the game's own map)
     <id>_swing.json the swing, recorded in the game: for every swing (ck = drive/chip/putt) and club the game uses it with,
                     the backswing by meter position (x 0..1.04 in .04 steps: the pose for bFrac(x) on a full-length swing), and
                     the downswing, impact and finish for three backswings (swingBack .4/.7/1) and each finish length (end) the
                     shot types use, sampled every 1/60 s to 0.6 s then every 1/15 s to 4 s. A frame: every bone's local
                     quaternion (int16), the hips' local position, and the club (grip, head, shaft dir, face dir, toe) in the
                     ball frame (x: away from the target line on the golfer's side... see below), plus each rig's root placement.
   The ball frame: origin at the ball on the ground, axes f = (cos a, 0, sin a), up, u = (sin a, 0, -cos a) in the game's 3D world
   (x east, y up, z south), i.e. coordinates (dot f, up, dot u); u is the aim direction.                                          */
const fs = require('fs'), path = require('path'), boot = require('./boot.js');
const SITE = process.argv[2], OUT = process.argv[3], IDS = process.argv.slice(4);
(async () => {
  const g = await boot(SITE);
  fs.mkdirSync(OUT, { recursive: true });
  await g.ev(`(()=>{Math.random=rng(99);G.mode='practice';G.pinSeed=424242;setCourse('troy',false);startHole(0);$('introM').hidden=true;try{R3R.on=false;}catch(e){}prepareShot();
    window.__CL=null;const dch=drawClubHead;drawClubHead=(chead,cd,fd,toe,c,grip)=>{window.__CL=[chead,cd,fd,toe,grip];return dch(chead,cd,fd,toe,c,grip);};return 'ok';})()`);
  for (const id of IDS) {
    // load the golfer (the game fetches its file and switches to it)
    await g.ev(`new Promise(res=>{r3GolferSet('${id}',ok=>res(String(ok)));setTimeout(()=>res('timeout'),20000);})`);
    for (let k = 0; k < 200; k++) { if (await g.ev(`R3B.cid==='${id}'`)) break; await new Promise(r => setTimeout(r, 100)); }
    const cid = await g.ev(`R3B.cid`); if (cid !== id) { console.log('could not load', id, cid); continue; }
    // the body
    const body = await g.ev(`(()=>{const M=R3B.mesh,gm=M.geometry,A=gm.attributes,B=R3B.bones,sk=M.skeleton;
      const b64=a=>{const u=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s);};
      const f32=a=>b64(a instanceof Float32Array?a:new Float32Array(a));
      const par=B.map(b=>B.indexOf(b.parent));
      const W=A.skinWeight.array,wn=W instanceof Float32Array?'f32':'u8';
      return JSON.stringify({id:'${id}',names:B.map(b=>b.name),parent:par,inv:f32(new Float32Array(sk.boneInverses.flatMap(m=>m.elements))),
        restPos:f32(new Float32Array(B.flatMap(b=>b.position.toArray()))),n:A.position.count,pos:f32(A.position.array),nrm:A.normal?f32(A.normal.array):null,uv:f32(A.uv.array),
        si:b64(new Uint16Array(A.skinIndex.array)),sw:wn==='f32'?f32(W):b64(new Uint8Array(W)),swType:wn,idx:b64(new Uint32Array(gm.index.array)),
        alpha:!!(M.material.alphaTest>0),double:M.material.side===THREE.DoubleSide,bindMatrixIdentity:M.bindMatrix.equals(new THREE.Matrix4()),meshScaleX:M.scale.x,rootIsParent:B[0].parent===R3B.root});})()`);
    fs.writeFileSync(path.join(OUT, id + '.json'), body);
    const tex = await g.ev(`(()=>{const im=R3B.mesh.material.map.image,c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);return c.toDataURL('image/png');})()`);
    fs.writeFileSync(path.join(OUT, id + '_tex.png'), Buffer.from(tex.split(',')[1], 'base64'));
    // the swing
    const swing = await g.ev(`(()=>{
      const out={id:'${id}',nb:R3B.bones.length,rigs:[]};
      const ball={x:G.ball.x,y:G.ball.y},aim=0,a=aim,f=[Math.cos(a),0,Math.sin(a)],u=[Math.sin(a),0,-Math.cos(a)];
      const o=()=>[ball.x,hAt(ball.x,ball.y),ball.y],L=p=>{const O=o(),d=[p[0]-O[0],p[1]-O[1],p[2]-O[2]];return[d[0]*f[0]+d[2]*f[2],d[1],d[0]*u[0]+d[2]*u[2]];},Ld=v=>[v[0]*f[0]+v[2]*f[2],v[1],v[0]*u[0]+v[2]*u[2]];
      const q16=new Int16Array(R3B.bones.length*4);
      const b64=a=>{const uu=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);let s='';for(let i=0;i<uu.length;i+=8192)s+=String.fromCharCode.apply(null,uu.subarray(i,i+8192));return btoa(s);};
      let posDev=0;const rest=R3B.bones.map(b=>b.position.toArray());
      const frame=()=>{const B=R3B.bones;for(let i=0;i<B.length;i++){const q=B[i].quaternion;q16[i*4]=Math.round(q.x*32767);q16[i*4+1]=Math.round(q.y*32767);q16[i*4+2]=Math.round(q.z*32767);q16[i*4+3]=Math.round(q.w*32767);
          if(i>0){const p=B[i].position;posDev=Math.max(posDev,Math.abs(p.x-rest[i][0]),Math.abs(p.y-rest[i][1]),Math.abs(p.z-rest[i][2]));}}
        const C=window.__CL||[[0,0,0],[0,-1,0],[0,0,1],[1,0,0],[0,0,0]],h=B[0].position;
        return{q:b64(q16),h:[+h.x.toFixed(3),+h.y.toFixed(3),+h.z.toFixed(3)],c:[...L(C[4]),...L(C[0]),...Ld(C[1]),...Ld(C[2]),...Ld(C[3])].map(v=>+v.toFixed(4))};};
      const ga={x:ball.x,y:ball.y,aim};
      const call=()=>{R3R.on=false;R3R.post.on=false;R3R.tPrev=T;window.__CL=null;r3Golfer(ga);return frame();};
      const SH=SHOTS,ix=id=>CI(id),PT=PUTTER;
      // the rigs: swing (ck) and club; each with the finish lengths its shot types use
      const want=[];const add=(ck,ci,type,back,end)=>{let r=want.find(w=>w.ck===ck&&w.ci===ci);if(!r)want.push(r={ck,ci,types:[]});if(!r.types.find(t=>t.back===back&&t.end===end))r.types.push({type,back,end});else r.types.find(t=>t.back===back&&t.end===end).also=(r.types.find(t=>t.back===back&&t.end===end).also||[]).concat(type);};
      for(const t in R3B_CFG){const[ck,back,end]=R3B_CFG[t];const cl=SH[t].clubs.length?SH[t].clubs:[ix('SW')];for(const ci of (t==='splash'||t==='blast'||t==='pick'?[ix('SW')]:cl))add(ck,ci,t,back,end);}
      add('putt',PT,'putt',1,1);
      for(const w of want){
        const putt=w.ck==='putt';G.clubIdx=w.ci;G.swingClub=w.ci;G.aiTurn=false;G.twirl=false;
        const fullT=putt?'full':(w.ck==='drive'?'full':'pitch');G.stype=fullT;G.swingType=fullT;
        const rig={ck:w.ck,club:CLUBS[w.ci].id,putter:putt,len:clubLen(w.ci),back:[],swings:[]};
        // backswing: the pose for meter x (the spring held at x)
        G.state='power';G.followT=0;
        for(let k=0;k<=26;k++){const x=k*.04;R3B.bsp={x,v:0,T:-9,live:false,xs:1,X:null};rig.back.push(call());}
        rig.root=R3B.org?L([R3B.org[0],R3B.org[1],R3B.org[2]]):null;rig.k=.94/100;
        // downswing to finish: per finish length (shot types), three backswings
        const times=[];for(let t=1/60;t<=.6+1e-9;t+=1/60)times.push(+t.toFixed(4));for(let t=.6+1/15;t<=4+1e-9;t+=1/15)times.push(+t.toFixed(4));rig.times=times;
        for(const ty of w.types){const sw={type:ty.type,also:ty.also||[],back:ty.back,end:ty.end,levels:[]};
          G.stype=ty.type;G.swingType=putt?'putt':ty.type;
          for(const b0 of [.4,.7,1]){const fr=[];R3B.bsp={x:b0,v:0,T:-9,live:false,xs:1,X:null};G.state='flight';G.swingBack=b0;G.launchAt=putt?PUTT_IMPACT:IMPACT_T;
            for(const t of times){G.followT=t;fr.push(call());}
            sw.levels.push({b0,frames:fr});R3B.bsp=null;}
          rig.swings.push(sw);}
        G.state='aim';G.followT=0;out.rigs.push(rig);}
      out.impactT=IMPACT_T;out.puttImpactT=PUTT_IMPACT;out.posDev=posDev;
      return JSON.stringify(out);})()`);
    fs.writeFileSync(path.join(OUT, id + '_swing.json'), swing);
    const S = JSON.parse(swing);
    console.log(id, 'bones', S.nb, 'rigs', S.rigs.length, S.rigs.map(r => r.ck + ':' + r.club + '(' + r.swings.map(s => s.type).join('/') + ')').join(' '), 'bone pos drift', S.posDev, 'MB', (swing.length / 1e6).toFixed(1), 'body MB', (body.length / 1e6).toFixed(1));
  }
  console.log('errors', g.errs.slice(0, 5));
  await g.close();
})();

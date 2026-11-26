/* The web game's sounds rendered offline for Unity (sound.js, exactly as the game builds them): the game's own sfx code is run
   into an OfflineAudioContext with its master bus (gain 2.2 into the compressor), its timers folded into the offline timeline,
   and each result saved as a 16-bit mono WAV. Parameters the game varies per shot (strike quality, cup variant, bird song) are
   rendered as a set of variants; volumes are applied in Unity.  node render_sfx.js <site> <out dir> */
const fs=require('fs'),path=require('path'),boot=require('./boot.js');
function wav(f32,sr){const n=f32.length,b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);
  b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++)b.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(f32[i]*32767))),44+i*2);return b;}
(async()=>{const OUT=process.argv[3];fs.mkdirSync(OUT,{recursive:true});const g=await boot(process.argv[2]);
  // the list: name, seconds, code run at time 0
  const L=[];
  for(const k of['wood','hybrid','iron','wedge','putter'])[.05,.35,.62,.86,1].forEach((q,i)=>L.push(['strike_'+k+'_'+i,k==='putter'?.5:1.6,`playImpact('${k}',${q},1)`]));
  L.push(['turf',.3,'playTurf(1,1)'],['sand',.6,'playSand(1)'],['swoosh',.35,'playSwoosh(1)']);
  for(const h of[0,1])for(const v of[0,1,2])L.push(['cup_'+h+'_'+v,1.1,`playBuf(cupBuf(${h},${v}),${h?.8:.75})`]);
  for(const k of['land','splash','lip','tree','rim','miss','nice','tick','fanfare'])L.push([k,k==='fanfare'?.9:k==='splash'?.8:.6,`sfx.${k}()`]);
  L.push(['pin',.3,'sfx.pin(1)'],['plop_soft',.3,'sfx.plop(true)'],['plop_hard',1.2,'sfx.plop(false)'],['flutter',.6,'sfx.flutter(1)'],['rustle',.7,'sfx.rustle(1)'],
    ['flame_red',1.2,'sfx.flame(true)'],['flame_blue',1.2,'sfx.flame(false)']);
  for(let i=0;i<4;i++)L.push(['amb_chickadee_'+i,2.6,'ambChickadee()']);
  for(let i=0;i<6;i++)L.push(['amb_robin_'+i,2.4,'ambRobin()']);
  for(let i=0;i<2;i++)L.push(['amb_loon_'+i,3.4,'ambLoon()']);
  for(let i=0;i<4;i++)L.push(['amb_mock_'+i,2.4,'ambMock()']);
  L.push(['amb_mower',14.5,'ambMower()'],['amb_quail',.8,'ambQuail()'],['amb_wren',1,'ambWren()']);
  await g.ev(`(()=>{window.__SFX={};return 1})()`);
  // the recorded strikes decode once (any context's buffers play in another at the same rate)
  // (the page's clock is paused by boot.js, so the wait for the decode is polled from here, not with the page's timers)
  await g.ev(`(()=>{const off=new OfflineAudioContext(1,44100,44100);S.ctx=off;S.on=true;S.clips={};realStrike('wood');return 1;})()`);
  for(let i=0;i<200;i++){if(await g.ev(`!!(S.clips.iron&&S.clips.driver)`))break;await new Promise(r=>setTimeout(r,100));}
  console.log('clips decoded',await g.ev(`!!(S.clips.iron&&S.clips.driver)`));
  for(const[name,len,code]of L){
    const d=await g.ev(`(async()=>{const SR=44100,off=new OfflineAudioContext(1,Math.ceil(${len}*SR),SR);let OFF=0;
      Object.defineProperty(off,'currentTime',{get:()=>OFF});
      const c=off.createDynamicsCompressor();c.threshold.value=-14;c.knee.value=8;c.ratio.value=6;c.attack.value=.002;c.release.value=.12;const out=off.createGain();out.gain.value=2.2;out.connect(c).connect(off.destination);
      const keepClips=S.clips;S.ctx=off;S.out=out;S.on=true;S.ib={};S.nb=null;S.turf=S.sand=S.sw=S.rus=null;S.clips=keepClips;AMB.bus=out;
      const st0=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(w,...r){return st0.call(this,w===undefined?OFF:w,...r);};
      const st1=window.setTimeout;window.setTimeout=(fn,ms)=>{const o=OFF;OFF=o+(ms||0)/1000;try{fn();}finally{OFF=o;}return 0;};
      try{${code};}finally{window.setTimeout=st1;AudioBufferSourceNode.prototype.start=st0;}
      const buf=await off.startRendering();const a=buf.getChannelData(0);let pk=0;for(const x of a)pk=Math.max(pk,Math.abs(x));
      return {pk,d:Array.from(a,x=>Math.round(x*10000)/10000)};})()`);
    const f=Float32Array.from(d.d);fs.writeFileSync(path.join(OUT,name+'.wav'),wav(f,44100));console.log(name,len,'peak',d.pk.toFixed(3));}
  await g.close();})();

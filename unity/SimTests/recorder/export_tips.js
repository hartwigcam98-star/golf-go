// the course's hole tips and intro eyebrow (TB[i].tip, courseLine()) for Unity: node export_tips.js <site> <out.json> [course]
const fs=require('fs'),boot=require('./boot.js');
(async()=>{const g=await boot(process.argv[2]);const id=process.argv[4]||'troy';
  const j=await g.ev(`(()=>{setCourse('${id}',false);G.mode='round';return JSON.stringify({line:courseLine(),name:CUR.name,fine:'Unofficial re-creation built from the mapped course layout (© OpenStreetMap contributors), USGS 3DEP elevation and published hole descriptions. Not affiliated with '+(COURSES[CUR.id].name||'the club').split(' · ')[0]+'.',tips:TB.map(h=>h.tip),par:TB.map(h=>h.par)});})()`);
  fs.writeFileSync(process.argv[3],j);console.log(j.slice(0,400));await g.close();})();

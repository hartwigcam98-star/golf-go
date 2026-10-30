// Refreshes pipeline/ranges/courses.json (each course's id, name, town, greens and pins, for the range job) from the game page.
// usage (repo root): node pipeline/ranges/courses_json.js [index.html] [greens.js ground.js trees.js are not needed]
const fs=require('fs'),vm=require('vm'),path=require('path');
const page=process.argv[2]||'index.html',ctx={};vm.createContext(ctx);
let s=fs.readFileSync(page,'utf8');
// the repo page keeps its big data lines in data/ (tools/datafiles.py): read the all-in-one page they pack into
if(s.includes('/*@data '))s=require('child_process').execSync('python3 '+JSON.stringify(path.join(__dirname,'../../tools/datafiles.py'))+' --repo '+JSON.stringify(path.dirname(path.resolve(page)))+' pack',{encoding:'utf8',maxBuffer:1<<30});
for(const m of s.matchAll(/^let ([A-Z][A-Z0-9_]*)=(.*)$/gm)){try{vm.runInContext('var '+m[1]+'='+m[2],ctx);}catch(e){}}
const out=[];
for(const m of s.matchAll(/^\s*([a-z0-9_]+):\{([^\n]*?)\bid:'([a-z0-9_]+)'([^\n]*?)course:(COURSE_[A-Z0-9_]+)/gm)){
  const line=m[0],id=m[3],C=ctx[m[5]];if(!C||!C.holes)continue;
  const nm=(/name:("[^"]*"|'[^']*')/.exec(line)||[])[1],tw=(/town:("[^"]*"|'[^']*')/.exec(line)||[])[1];
  out.push({id,name:eval(nm),town:eval(tw),pins:C.holes.map(h=>h.pin),greens:(C.polys.green||[]).map(P=>{let x=0,y=0;for(const q of P){x+=q[0];y+=q[1];}return[+(x/P.length).toFixed(1),+(y/P.length).toFixed(1)];}),hasRange:(C.polys.range||[]).length});}
fs.writeFileSync(path.join(__dirname,'courses.json'),JSON.stringify(out));console.log(out.length,'courses');

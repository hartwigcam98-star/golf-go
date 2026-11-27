// the home screen's pieces for Unity, from the web game's own menu (home-screen.js): node export_home.js <site> <course ids, comma> [golfer ids, comma]
//   Resources/home/map_<ST>.png  the US map with the states that have Unity's courses (green), <ST> highlighted as the current course's state
//                                (map_none.png: none), the dots and the state badges, as the web draws it (#usMap), 2x
//   Resources/home/map.json      the map picture's size and each state badge's box (fractions of the picture), its name and its courses
//   Resources/courses.json       the courses in Unity, in order: id, name, town, state
//   Resources/golfers/<id>_pic.jpg  the golfers' portraits (CHAR_PIC)
const fs=require('fs'),path=require('path'),boot=require('./boot.js');
(async()=>{const SITE=process.argv[2],IDS=process.argv[3].split(','),GOL=(process.argv[4]||'ch06,ch28,ch42').split(',');
  const R=path.join(SITE,'unity/Assets/Resources'),H=path.join(R,'home');fs.mkdirSync(H,{recursive:true});
  const g=await boot(SITE);
  const info=JSON.parse(await g.ev(`(()=>{const L=${JSON.stringify(IDS)},M=US_MAP,has={};for(const id of L){const s=stateOf(id);(has[s]=has[s]||[]).push(id);}
    let vx0=115,vy0=20,vx1=980,vy1=540;for(const k in has){const b=stBox(k);vx0=Math.min(vx0,b[0]-12);vy0=Math.min(vy0,b[1]-12);vx1=Math.max(vx1,b[2]+12);vy1=Math.max(vy1,b[3]+12);}
    const vb=vx0+' '+vy0+' '+(vx1-vx0)+' '+(vy1-vy0);let h='<svg viewBox="'+vb+'">';
    for(const k in M.st)h+='<path d="'+M.st[k]+'"'+(has[k]?' class="has" data-st="'+k+'"':'')+'/>';
    const seen={};for(const id in M.dots){if(!L.includes(id))continue;const[x,y]=M.dots[id],key=x+','+y;if(seen[key])continue;seen[key]=1;h+='<circle class="dot" cx="'+x+'" cy="'+y+'" r="9"/>';}
    const BADGE={WI:[650,175],MN:[545,135],SC:[855,425],AL:[700,470],AZ:[198,470],FR:[912,498]};
    for(const k in has){let b=BADGE[k];if(!b){const q=stBox(k);b=[(q[0]+q[2])/2,(q[1]+q[3])/2];}const t=k+' · '+has[k].length,w=t.length*14+22;h+='<g class="badge" data-st="'+k+'"><rect x="'+(b[0]-w/2)+'" y="'+(b[1]-20)+'" width="'+w+'" height="40" rx="20"/><text x="'+b[0]+'" y="'+b[1]+'">'+t+'</text></g>';}
    document.querySelectorAll('.modal,[id$="M"]').forEach(m=>m.hidden=true);$('menuM').hidden=false;try{setTab('courses');}catch(e){}$('mapView').hidden=false;$('stateView').hidden=true;
    $('usMap').innerHTML=h+'</svg>';
    const courses=L.map(id=>({id,name:COURSES[id].name,town:COURSES[id].town,state:stateOf(id)}));
    return JSON.stringify({has,courses,names:Object.fromEntries(Object.keys(has).map(k=>[k,ST_NAME[k]||k]))});})()`));
  const page=g.page;const el=await page.$('#usMap');
  const box=await el.boundingBox();const out={w:box.width,h:box.height,states:{}};
  for(const k in info.has){const b=await (await page.$('#usMap g.badge[data-st="'+k+'"]')).boundingBox();
    out.states[k]={name:info.names[k],courses:info.has[k],box:[(b.x-box.x)/box.width,(b.y-box.y)/box.height,b.width/box.width,b.height/box.height]};}
  for(const k of ['none',...Object.keys(info.has)]){
    await g.ev(`(()=>{document.querySelectorAll('#usMap path.has').forEach(p=>p.classList.toggle('cur',p.dataset.st==='${k}'));return 1;})()`);
    await el.screenshot({path:path.join(H,'map_'+k+'.png'),omitBackground:true});}
  fs.writeFileSync(path.join(H,'map.json'),JSON.stringify(out));
  fs.writeFileSync(path.join(R,'courses.json'),JSON.stringify({courses:info.courses}));
  for(const id of GOL){const u=await g.ev(`CHAR_PIC['${id}']||''`);if(u)fs.writeFileSync(path.join(R,'golfers',id+'_pic.jpg'),Buffer.from(u.split(',')[1],'base64'));}
  console.log(JSON.stringify(out),info.courses.length,'courses');await g.close();})();

(()=>{if(window.__skip)return null;return (()=>{const h=G.hole,g=h.hg,r=a=>Array.from(a,x=>Math.round(x*1000)/1000);const protos=[],pid=new Map(),groups=[];
   for(const gr of R3T.groups){const v=gr.full.length?null:null;}
   const P=r3tProtos();const byKey={};for(const k in P)P[k].forEach((v,i)=>byKey[k+'|'+i]=v);
   for(const gr of R3T.groups){let key=null;const t=gr.ts[0];const k0=t.sp+(t.fall?'_fall':''),vs=P[k0]||P[t.sp],vi=Math.floor((t.shade||0)*97)%vs.length;key=(P[k0]?k0:t.sp)+'|'+vi;
     if(!pid.has(key)){const v=byKey[key];pid.set(key,protos.length);protos.push({key,bark:r(v.bark),mass:r(v.mass),leaf:r(v.leaf)});}
     groups.push({p:pid.get(key),M:r(gr.M),xs:gr.ts.map(t=>[t.x,t.y])});}
   const b=h.bounds,far=(h.farTrees||[]).filter(t=>t.x>b[0]-40&&t.x<b[2]+40&&t.y>b[1]-40&&t.y<b[3]+40).map(t=>[t.x,t.y,t.r,t.gh!==undefined?t.gh:hAt(t.x,t.y),t.sp]);
   const og=R3.trees.geometry,op=og.attributes.position.array,oc=og.attributes.color.array;
   return {bounds:b,T0:h.T0,SUN,hg:{nx:g.nx,ny:g.ny,st:g.st,x0:g.x0,y0:g.y0,data:r(g.data)},protos,groups,far,out:{pos:r(op),col:r(oc)},
     water:(h.water||[]).map(w=>w.map?w.map(p=>[p[0],p[1]]):w),club:(h.buildings||[]).filter(q=>q.club).map(q=>({x:q.x,y:q.y,bb:q.bb}))};})()})()
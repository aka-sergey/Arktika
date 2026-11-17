// «Резюме»: расшифровка взносов инвестора сходится с суммой взносов, а вложения по статьям — с оплатами в модели
require('../src/engine.js'); const fs=require('fs'); const S=globalThis.Sim;
const src=fs.readFileSync(__dirname+'/test_excel.js','utf8'); const a=src.indexOf('const mk='), b=src.indexOf('(async()=>');
const SC=new Function('S', src.slice(a,b)+'; return SC;')(S);
try{ const d=JSON.parse(fs.readFileSync(__dirname+'/../scenarios.json','utf8')); Object.entries(d.scenarios||{}).forEach(([nm,x])=>{ const s=x.s||x.scenario||x; if(s&&!s.name) s.name=nm; if(!s||!s.p) return; const z=S.defaults(); const m=JSON.parse(JSON.stringify(s)); m.p=Object.assign({},z.p,m.p);
  (m.capex||[]).forEach(c=>{ if(c.cat==='Линии') c.cat='Линии розлива'; if(c.cat==='Оборудование') c.cat='Вспомогательное оборудование цеха'; }); if(!m.utypes.find(u=>u.id==='P')) m.utypes.push(z.utypes.find(u=>u.id==='P'));
  z.mats.forEach(t=>{ if(!m.mats.find(q=>q.key===t.key)) m.mats.push(t); }); m.contrib=m.contrib||{}; SC['сайт: '+(x.name||s.name)]=m; }); }catch(e){ console.log('scenarios.json не прочитан:',e.message); }
let bad=0; const f=v=>(v/1e6).toFixed(2);
for(const [n,s] of Object.entries(SC)){ const res=S.sim(s), sp=S.investSplit(s,res), k=res.k;
  if(!sp){ console.log(n.padEnd(46),'взносов нет'); continue; }
  const capSum=Object.values(sp.cap).reduce((q,v)=>q+v,0), e1=Math.abs(sp.check), e2=Math.abs(capSum-sp.capT), e3=Math.abs(sp.capT+sp.capAfter-k.capexTotal);
  const ok=e1<0.5&&e2<0.5&&e3<0.5; if(!ok) bad++;
  console.log((ok?'ok  ':'BAD ')+n.padEnd(46),'взносы',f(k.invest),'= CAPEX',f(sp.capT),'+ OPEX',f(sp.opx),'(тара',f(sp.tara),'ФОТ',f(sp.fot),'прочее',f(sp.oth),'− пост.',f(sp.rec)+')','+ остаток',f(sp.cash),sp.pay?'+ выплаты '+f(sp.pay):'','| T='+sp.T,'| невязка',e1.toFixed(3),e2.toFixed(3),e3.toFixed(3));
}
console.log(bad?('ОШИБОК: '+bad):'все сходится'); process.exit(bad?1:0);

// Структура цены: раскладка на бутылки сходится с моделью (EBITDA и прибыль за вычетом амортизации), части цены в сумме дают цену
require('../src/engine.js'); const S=globalThis.Sim; const fs=require('fs');
const mk=f=>{const s=S.defaults(); f&&f(s); return s;}, B=(type,qty,month)=>({id:'b'+Math.random(),type,qty,month});
const SC={ base:mk(), glass:mk(s=>{s.p.glass=1;}), f075:mk(s=>{s.p.sh05=0.2;s.p.sh07=0.26;}), only075:mk(s=>{s.p.sh03=0;s.p.sh05=0;s.p.sh07=1;s.p.sh10=0;}), fg:mk(s=>{s.p.fg_days=20;}),
  idx_year:mk(s=>{s.p.idx_rep=1;}), late:mk(s=>{s.p.start_m=30;}), cheap:mk(s=>{s.p.p03=50;s.p.p05=70;s.p.p10=90;}),
  osn:mk(s=>{s.batches.push(B('B',60,8)); s.plan.push({id:'p2',month:8,liters:260000}); s.p.shifts=3;}), units:mk(s=>{s.batches.push(B('B',10,9),B('A',5,30)); s.plan.push({id:'p2',month:9,liters:62700});}),
  am:mk(s=>{s.p.am_eq=10;s.p.am_rep=3;s.p.am_mold=1; s.capex.push({id:'z',cat:'Пресс-формы',name:'Форма',amount:900000,month:2,day:10,reserve:true});}), rr:mk(s=>{s.p.rr03=189;s.p.rr05=289;s.p.rr10=399;}) };
try { const d=JSON.parse(fs.readFileSync(process.argv[2]||__dirname+'/../scenarios.json','utf8')); Object.keys(d.scenarios).forEach((n,i)=>{ const z=S.defaults(), s=JSON.parse(JSON.stringify(d.scenarios[n])), had=s.p.chz!=null; s.p=Object.assign({},z.p,s.p); if(!had) s.p.chz=0; z.mats.forEach(t=>{ if(!s.mats.find(q=>q.key===t.key)) s.mats.push(t); }); s.contrib=s.contrib||{}; s.batches=s.batches||[]; SC['файл'+(i+1)]=s; }); } catch(e) { console.log('файл сценариев не прочитан:',e.message); }
let bad=0;
for (const n of Object.keys(SC)) { const s=SC[n], r=S.sim(s), P=S.unitPeriods(r); let worst=0, wp=0, ws=0;
  for (const k of ['y1','y5','all']) { const u=S.unit(s,r,P[k][0],P[k][1]); if(!(u.B>0)) continue;
    worst=Math.max(worst,Math.abs(u.check)); wp=Math.max(wp,Math.abs(u.profitUnit-u.profitModel));
    u.fm.forEach(f=>{ const parts=f.vat+f.tare.total+f.energy+f.staffP+f.staffO+f.rent+f.maint+f.dep+f.logist+f.returns+f.mkt+f.tax+f.profit; ws=Math.max(ws,Math.abs(parts-f.price));
      const t=f.tare; ws=Math.max(ws,Math.abs(t.bottle+t.cap+t.label+t.chz+t.pack+t.tray+t.pallet-t.total), Math.abs(f.net-f.cogs-f.gross), Math.abs(f.rrp>0?f.rrp-f.price-f.retail:0)); }); }
  const d=S.depr(s), base=d.base.eq+d.base.rep+d.base.mold+d.base.none, ok=worst<0.01&&wp<0.01&&ws<1e-6&&Math.abs(base-r.k.capexTotal)<0.01; if(!ok) bad++;
  console.log((ok?'ok  ':'НЕ СОШЛОСЬ  ')+n.padEnd(10),'| EBITDA модель − раскладка, ₽:',worst.toFixed(4),'| прибыль:',wp.toFixed(4),'| части цены:',ws.toExponential(1),'| база амортизации − вложения, ₽:',(base-r.k.capexTotal).toFixed(2)); }
console.log(bad?'ЕСТЬ РАСХОЖДЕНИЯ: '+bad:'все сходится'); process.exitCode=bad?1:0;

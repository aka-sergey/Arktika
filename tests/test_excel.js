require('../src/engine.js'); require('../src/meta.js'); require('../src/excel.js'); const ExcelJS=require('exceljs'); const fs=require('fs');
const S=globalThis.Sim;
const mk=(f)=>{const s=S.defaults(); f&&f(s); return s;};
const B=(type,qty,month)=>({id:'b'+Math.random(),type,qty,month});
const SC={
 base: mk(),
 units10: mk(s=>{s.batches.push(B('B',10,9)); s.plan.push({id:'p2',month:9,liters:62700});}),
 units_noplan: mk(s=>{s.batches.push(B('B',10,9));}),
 early: mk(s=>{s.batches.push(B('B',5,1),B('A',3,2),B('B',4,20)); s.utypes[0].start=20; s.utypes[1].start=4; s.utypes[1].price=800000; s.plan.push({id:'p2',month:6,liters:40000},{id:'p3',month:20,liters:70000});}),
 fg: mk(s=>{s.p.fg_days=20; s.p.caution=0.8;}),
 overplan: mk(s=>{s.plan=[{id:'a',month:1,liters:60000}];}),
 line: mk(s=>{s.batches.push(B('B',40,6)); s.plan.push({id:'p2',month:6,liters:160000});}),
 staff: mk(s=>{s.staff.push({id:'e1',name:'Маркетолог',group:'office',salary:110000,from:5,to:14}); s.staff[10].to=8; s.staff.splice(3,1); s.capex.push({id:'c1',cat:'Оборудование',name:'Погрузчик',amount:1800000,month:7,day:12,reserve:true}); s.capex[s.capex.length-2].reserve=true;}),
 payout: mk(s=>{s.p.payout_on=1; s.p.payout_keep=2; s.batches.push(B('B',10,9)); s.plan.push({id:'p2',month:9,liters:62700}); s.contrib={1:20000000,3:5000000};}),
 mats: mk(s=>{s.mats[0].lead=4; s.mats[0].ship=250000; s.mats[1].moq=100000; s.mats[2].moq=30000; s.mats[2].lead=2; s.mats[2].first=2; s.mats[3].moq=33; s.mats[4].lead=2; s.p.start_m=5; s.p.idx_m=10; s.p.defer=0.8; s.p.mkt_n=0; s.p.vat_thr=5000000;}),
 pallets: mk(s=>{Object.assign(s.p,{pal_w:1000,pal_h:1400,pal_kg:600,d03:58,h03:180,pk03:20,d05:68,h05:230,pk05:6,d10:88,h10:290,pk10:8,pallet_price:700,stretch_per:0.5,stretch_price:350,sh03:0.3,sh05:0.3,sh10:0.4});}),
};
(async()=>{ const out={};
 for(const [n,s] of Object.entries(SC)){ const res=S.sim(s); const b=globalThis.Xls.build(ExcelJS,s,res,[{t:'12.11 19:00',text:'тест',dInv:1,dPb:0}]);
   await b.wb.xlsx.writeFile(`x_${n}.xlsx`); if(!globalThis.__P) globalThis.__P={}; globalThis.__P[n]={bpp:['03','05','10'].map(t=>b.P['bpp'+t]), pal:res.prices.pal.map(x=>x.bottles)};
   const m={}; for(const k of Object.keys(b.R)){ const kk=k.endsWith('_ord')?null:k; }
   const eng={}; for(const k of Object.keys(b.R)){ if(res.m[k]) eng[k]=res.m[k]; else if(k.endsWith('_ord')) eng[k]=res.ord[k.slice(0,-4)]; else if(k.endsWith('_stock')) eng[k]=res.stockEnd[k.slice(0,-6)]; }
   out[n]={pp:globalThis.__P[n],R:b.R,eng,invest:res.k.invest,pb:res.k.paybackM,alerts:res.alerts.map(a=>a.text)}; }
 fs.writeFileSync('x_reg.json',JSON.stringify(out)); console.log('written',Object.keys(SC).length);
})();

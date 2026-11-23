require('../src/engine.js'); require('../src/meta.js'); require('../src/excel.js'); const ExcelJS=require('exceljs'); const JSZip=require('jszip'); const fs=require('fs');
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
 staff: mk(s=>{s.staff.push({id:'e1',name:'Маркетолог',group:'office',salary:110000,from:5,to:14}); s.staff[10].to=8; s.staff.splice(3,1); s.capex.push({id:'c1',cat:'Вспомогательное оборудование цеха',name:'Погрузчик',amount:1800000,month:7,day:12,reserve:true}); s.capex[s.capex.length-2].reserve=true;}),
 payout: mk(s=>{s.p.payout_on=1; s.p.payout_keep=2; s.batches.push(B('B',10,9)); s.plan.push({id:'p2',month:9,liters:62700}); s.contrib={1:20000000,3:5000000};}),
 mats: mk(s=>{s.mats[0].lead=4; s.mats[0].ship=250000; s.mats[1].moq=100000; s.mats[2].moq=30000; s.mats[2].lead=2; s.mats[2].first=2; s.mats[3].moq=33; s.mats[4].lead=2; s.p.start_m=5; s.p.idx_m=10; s.p.defer=0.8; s.p.mkt_n=0; s.p.vat_thr=5000000;}),
 pilot: mk(s=>{const P=s.utypes.find(z=>z.id==='P'); P.start=6; P.l=45; s.utypes[0].start=12; [['Элемент теплообменного устройства',1850000,1],['Плата блока управления',420000,2],['Клапаны шаровые с электроприводом',380000,2],['Сварка',260000,3],['Медные трубы',510000,3]].forEach((r,i)=>s.capex.splice(5+i,0,{id:'pd'+i,cat:'Установки очистки',name:r[0],amount:r[1],month:r[2],day:12,reserve:i%2===0,auto:null})); s.batches.push(B('A',5,12)); s.plan.push({id:'p2',month:12,liters:24000});}),
 tray: mk(s=>{s.p.tray=12; s.p.pk10=8;}),
 glass: mk(s=>{s.p.glass=1;}),
 glass2: mk(s=>{Object.assign(s.p,{glass:1,tray:14,gb03:11.5,gb05:19,gb10:41,gw03:190,gw05:340,gw10:610,gcap:1.2,gd03:62,gh03:205,gpk03:20,gd05:70,gh05:240,gpk05:12,gd10:90,gh10:310,gpk10:6,pal_kg:800,waste:0.04,sh03:0.2,sh05:0.5,sh10:0.3}); const gb=s.mats.find(x=>x.key==='gb'), gc=s.mats.find(x=>x.key==='gcap'); gb.moq=20000; gb.lead=2; gb.ship=80000; gb.first=2; gc.moq=150000; gc.lead=3; s.mats[0].moq=10000; s.batches.push(B('B',10,9)); s.plan.push({id:'p2',month:9,liters:62700});}),
 idx_year: mk(s=>{s.p.idx_rep=1; s.p.idx_m=9; s.p.cost_idx=0.09; s.p.price_idx=0.06;}),
 nopay: mk(s=>{s.plan=[{id:'a',month:1,liters:9000}];}),
 late: mk(s=>{s.batches.push(B('B',6,40)); s.plan.push({id:'p9',month:40,liters:45000}); s.capex.push({id:'c9',cat:'Прочее',name:'Вторая очередь склада',amount:4000000,month:38,day:10,reserve:true}); s.staff.push({id:'e9',name:'Оператор линии 3',group:'prod',salary:70000,from:40,to:60});}),
 vat7: mk(s=>{s.batches.push(B('B',16,12)); s.plan.push({id:'p7',month:13,liters:85000});}),
 osn: mk(s=>{s.batches.push(B('B',50,14)); s.plan.push({id:'p8',month:15,liters:210900}); s.p.shifts=2;}),
 osn_mid: mk(s=>{s.batches.push(B('B',30,20)); s.plan.push({id:'p9',month:21,liters:150000}); s.p.osn_in=0.6; s.p.idx_rep=1;}),
 f075_glass: mk(s=>{s.p.glass=1; s.p.sh03=0.15;s.p.sh05=0.30;s.p.sh07=0.45;s.p.sh10=0.10;}),
 f075_pet: mk(s=>{s.p.sh03=0.10;s.p.sh05=0.30;s.p.sh07=0.50;s.p.sh10=0.10; s.p.tray=9; s.p.p07=185; s.p.w07=47;}),
 no1l: mk(s=>{s.p.glass=1; s.p.sh03=0.20;s.p.sh05=0.35;s.p.sh07=0.45;s.p.sh10=0;}),
 no1l_3f: mk(s=>{s.p.sh03=0.30;s.p.sh05=0.70;s.p.sh07=0;s.p.sh10=0;}),
 only075: mk(s=>{s.p.glass=1; s.p.sh03=0;s.p.sh05=0;s.p.sh07=1;s.p.sh10=0; s.p.pal_w=1000;}),
 chz: mk(s=>{s.p.label=7.5; s.p.chz=1.22; s.p.rr05=289; s.p.am_eq=8;}),
 chz_old: mk(s=>{s.p.label=10; delete s.p.chz;}),
 pallets: mk(s=>{Object.assign(s.p,{pal_w:1000,pal_h:1400,pal_kg:600,d03:58,h03:180,pk03:20,d05:68,h05:230,pk05:6,d10:88,h10:290,pk10:8,pallet_price:700,stretch_per:0.5,stretch_price:350,sh03:0.3,sh05:0.3,sh10:0.4});}),
};
(async()=>{ const out={};
 for(const [n,s] of Object.entries(SC)){ const res=S.sim(s); const b=globalThis.Xls.build(ExcelJS,s,res,[{t:'12.11 19:00',text:'тест',dInv:1,dPb:0}]);
   { const raw=await b.wb.xlsx.writeBuffer(), o=await globalThis.Xls.addCharts(JSZip,raw,b.charts,'nodebuffer'); if(o.charts!==b.charts.items.length) { console.log('ДИАГРАММЫ НЕ ВСТАВЛЕНЫ:',n,o.error); process.exitCode=1; } fs.writeFileSync(`x_${n}.xlsx`,o.buf); } if(!globalThis.__P) globalThis.__P={}; globalThis.__P[n]={bpp:S.FMT.map(f=>f[0]).map(t=>b.P['bpp'+t]), pal:res.prices.pal.map(x=>x.bottles), m:S.FMT.map(f=>f[0]).map(t=>b.P['m'+t]), mEng:res.prices.m, kg:S.FMT.map(f=>f[0]).map(t=>b.P['pkg'+t]), kgEng:res.prices.pal.map(x=>x.kg)};
   const m={}; for(const k of Object.keys(b.R)){ const kk=k.endsWith('_ord')?null:k; }
   const eng={}; for(const k of Object.keys(b.R)){ if(res.m[k]) eng[k]=res.m[k]; else if(k.endsWith('_ord')) eng[k]=res.ord[k.slice(0,-4)]; else if(k.endsWith('_stock')) eng[k]=res.stockEnd[k.slice(0,-6)]; else if(k==='use_pet') eng[k]=res.useBy.pf; else if(k==='use_gl') eng[k]=res.useBy.gb; }
   out[n]={pp:globalThis.__P[n],R:b.R,eng,K:b.K,kv:{invest:res.k.invest,peak:res.k.peak,pb_n:res.k.paybackM||null,cum:res.k.cumEnd,payout:res.k.payout,profit:res.k.profitTotal,ebitda:res.k.ebitdaTotal,ebm:res.k.ebm,util:res.k.maxUtil,cash:res.k.cashEnd,irr:res.k.irr},yrows:b.years,yv:res.k.years,checks:b.checks,invest:res.k.invest,pb:res.k.paybackM,alerts:res.alerts.map(a=>a.text)}; }
 fs.writeFileSync('x_reg.json',JSON.stringify(out)); console.log('written',Object.keys(SC).length);
})();

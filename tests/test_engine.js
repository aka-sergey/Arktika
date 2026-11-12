require('../src/engine.js'); const v7=require('./v7.json'); const S=globalThis.Sim;
const s=S.defaults(); s.p.pallet_price=0; s.p.stretch_price=0;
s.capex.forEach(c=>{ if(['Ремонт','Оборудование','Техника и мебель','Разрешения и бренд'].includes(c.cat)||/Спецодежда|Бренд-стойки/.test(c.name)) c.month=2; });
const r=S.sim(s); let worst=0; const map={cap_ord:r.ord.cap,pf_ord:r.ord.pf};
for(const k of Object.keys(v7)){const a=map[k]||r.m[k]; const d=Math.max(...a.map((x,i)=>Math.abs(x-v7[k][i]))); worst=Math.max(worst,d); if(d>0.01) console.log('РАСХОЖДЕНИЕ',k,d);}
console.log('регрессия к V7 (паллеты 0 ₽, вложения в декабре): макс. расхождение, ₽:',worst.toFixed(4),'| внести',(r.k.invest/1e6).toFixed(3));
const b=S.sim(S.defaults());
console.log('новая база: внести',(b.k.invest/1e6).toFixed(2),'| окупаемость',b.k.paybackM,b.k.paybackEst,'| прибыль 2028',(b.k.profit28/1e6).toFixed(2),'| тревоги',b.alerts.map(a=>a.text));
console.log('паллета:',b.prices.pal.map(x=>`${x.packs} уп × ${x.layers} сл (выс ${x.byH}, вес ${x.byKg}) = ${x.bottles} бут, ${Math.round(x.kg)} кг`).join(' | '));
console.log('паллет в месяц на полном ходу:',b.m.pallets[10].toFixed(1),'| стрейч кг',(b.m.pallets[10]*0.35).toFixed(1),'| заказы паллет',b.ord.pallet.slice(0,12).join(','),'| стрейч',b.ord.stretch.slice(0,12).join(','));
console.log('мин. запас по дням:',Object.fromEntries(S.defaults().mats.map(m=>[m.key,Math.round(Math.min(...b.d[m.key]))])));

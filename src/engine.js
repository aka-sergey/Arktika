/* ===== РАСЧЁТНОЕ ЯДРО: сценарий -> помесячный расчёт (как в Excel) + подневная раскладка ===== */
(function (g) {
  const N = 26, Y0 = 2026, M0 = 10;
  const MON = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const MONTHS = [];
  { let d0 = 0;
    for (let i = 1; i <= N; i++) {
      const d = new Date(Date.UTC(Y0, M0 + i - 1, 1)), y = d.getUTCFullYear(), m = d.getUTCMonth();
      const nd = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      MONTHS.push({ i, y, m, nd, d0, label: MON[m] + ' ' + y, short: MON[m] }); d0 += nd;
    } }
  const DAYS = MONTHS[N - 1].d0 + MONTHS[N - 1].nd;
  const dayOf = (i, dom) => { const mm = MONTHS[i - 1]; return mm.d0 + Math.min(Math.max(1, dom), mm.nd) - 1; };
  const dateOf = (day) => { let k = 0; while (k < N - 1 && MONTHS[k + 1].d0 <= day) k++; const mm = MONTHS[k]; return { i: mm.i, dom: day - mm.d0 + 1, y: mm.y, m: mm.m, text: (day - mm.d0 + 1) + ' ' + MON[mm.m] + ' ' + mm.y }; };
  let uid = 1; const id = () => 'x' + (uid++);

  function defaults() {
    return {
      name: 'База',
      p: {
        k_use: 0.95, days: 30, lead: 2,
        bph: 1000, hours: 8, shifts: 1, wdays: 21, eff: 0.85,
        start_m: 4, first_share: 0.5, ramp1: 0.30, ramp2: 1, ramp3: 1, caution: 1,
        sh03: 0.16, sh05: 0.46, sh10: 0.38, p03: 100, p05: 160, p10: 220, defer: 0.5, fg_days: 0,
        usd: 84, cap_usd: 0.178, cap_vat: 0.22, w03: 37, w05: 43, w10: 55, pf_kg: 320, label: 10, pack: 0.5,
        waste: 0.02, energy: 9, logist: 0.08, returns: 0.005, mkt_pct: 0.03, mkt_launch: 1500000, mkt_start: 2, mkt_n: 3,
        pilots: 120000, pilots_m: 4,
        tax_k: 1.13, rent: 350000, rent_start: 1, maint: 250000, maint_start: 3, other: 133000,
        idx_m: 15, cost_idx: 0.08, price_idx: 0.05, contingency: 0.10,
        vat_thr: 20000000, vat_rate: 0.05, usn_rate: 0.05, usn_min: 0.01, vat7_thr: 250000000, usn_lim: 450000000,
        reserve_m: 1, payout_on: 0, payout_keep: 3,
        pal_w: 800, pal_h: 1600, pal_kg: 1000, d03: 60, h03: 170, pk03: 12, d05: 65, h05: 215, pk05: 12, d10: 82, h10: 270, pk10: 6,
        pallet_price: 450, stretch_per: 0.35, stretch_price: 300
      },
      utypes: [{ id: 'A', name: 'ТИП-А30', l: 30, price: 480000, start: 30 }, { id: 'B', name: 'ТИП-Б130', l: 130, price: 900000, start: 0 }],
      staff: [
        ['Директор', 'office', 200000, 1], ['Продажи', 'office', 120000, 1], ['Бухгалтер', 'office', 90000, 1], ['Закупки и логистика', 'office', 90000, 1],
        ['Начальник производства — технолог', 'prod', 120000, 3], ['Оператор линии 1', 'prod', 65000, 3], ['Оператор линии 2', 'prod', 65000, 3],
        ['Оператор водоподготовки', 'prod', 60000, 3], ['Лаборант', 'prod', 55000, 3], ['Кладовщик', 'prod', 50000, 3], ['Грузчик 1', 'prod', 42500, 3], ['Грузчик 2', 'prod', 42500, 3]
      ].map(a => ({ id: id(), name: a[0], group: a[1], salary: a[2], from: a[3], to: N })),
      capex: [
        ['Линии', 'Линии выдува и розлива — аванс 30 %', 2646000, 1, 10, true],
        ['Линии', 'Линии — остаток 70 %', 6174000, 2, 10, true],
        ['Линии', 'Линии — таможня, ввозной НДС, брокер, доставка до Иваново', 4688600, 3, 15, true],
        ['Установки очистки', 'Установки очистки на старте — 50 % при заказе', 0, 1, 10, true, 'units0'],
        ['Установки очистки', 'Установки очистки на старте — 50 % при поставке', 0, 3, 10, true, 'units0'],
        ['Ремонт', 'Ремонт помещения под пищевое производство (стены, пол, зонирование, канализация)', 1500000, 2, 20, true],
        ['Ремонт', 'Электромонтаж: щиты, кабельные трассы, подключение оборудования', 400000, 2, 20, true],
        ['Ремонт', 'Кондиционирование и вентиляция цеха', 600000, 2, 20, true],
        ['Оборудование', 'Накопительные ёмкости 3 м³ с насосами и обвязкой, 2 шт', 340000, 2, 20, true],
        ['Оборудование', 'Линия групповой термоусадочной упаковки (трей-формер + термотоннель)', 1800000, 2, 20, true],
        ['Оборудование', 'Штабелёр электрический самоходный', 450000, 2, 20, true],
        ['Оборудование', 'Тележки гидравлические, 2 шт', 50000, 2, 20, true],
        ['Оборудование', 'Обмотчик паллет (стрейч) и стреппинг-инструмент', 250000, 2, 20, true],
        ['Оборудование', 'Паллеты оборотные для склада, 100 шт', 120000, 3, 20, true],
        ['Оборудование', 'Стеллажи складские', 300000, 2, 20, true],
        ['Оборудование', 'Собственная лаборатория (pH, TDS, мутномер, микробиология)', 1200000, 2, 20, true],
        ['Оборудование', 'Озонаторы и бактерицидные лампы', 100000, 2, 20, true],
        ['Оборудование', 'Компрессор 30 бар с осушителем (если не входит в линию)', 0, 2, 20, true],
        ['Пресс-формы', 'Пресс-форма крышки (1 500 $ + НДС 22 %)', 153720, 2, 10, true],
        ['Пресс-формы', 'Пресс-форма бутылки 0,3 л', 0, 2, 10, true], ['Пресс-формы', 'Пресс-форма бутылки 0,5 л', 0, 2, 10, true], ['Пресс-формы', 'Пресс-форма бутылки 1,0 л', 0, 2, 10, true],
        ['Пресс-формы', 'Пресс-форма преформы у литейщика (если нужен нестандартный вес)', 0, 2, 10, true],
        ['Техника и мебель', 'Компьютеры и ноутбуки, 5 шт', 350000, 1, 20, true],
        ['Техника и мебель', 'МФУ, 2 шт', 80000, 1, 20, true],
        ['Техника и мебель', 'Мебель офиса и лаборатории', 300000, 1, 20, true],
        ['Техника и мебель', 'Сейф', 30000, 1, 20, true],
        ['Техника и мебель', 'Видеонаблюдение (16 камер, регистратор)', 250000, 2, 20, true],
        ['Техника и мебель', 'Охранная и пожарная сигнализация', 200000, 2, 20, true],
        ['Техника и мебель', 'Сканеры для «Честного знака», 2 шт', 120000, 3, 20, true],
        ['Разрешения и бренд', 'Промдизайн бутылки и бренд-айдентика', 300000, 2, 20, true],
        ['Разрешения и бренд', 'Товарный знак (пошлины и юрист)', 60000, 2, 20, true],
        ['Разрешения и бренд', 'Декларация соответствия и протоколы испытаний', 150000, 3, 20, true],
        ['Разрешения и бренд', 'Разработка и внедрение ХАССП', 150000, 3, 20, true],
        ['Разрешения и бренд', 'Регистрация в «Честном знаке», интеграция с 1С и линией', 100000, 3, 20, true],
        ['Прочее', 'Спецодежда, 15 комплектов', 120000, 3, 20, true],
        ['Прочее', 'Бренд-стойки для точек продаж, 20 шт', 300000, 4, 20, true],
        ['Прочее', 'Депозит по аренде', 532500, 1, 5, false],
        ['Прочее', 'Вход в Азбуку Вкуса (листинг, маркетинг)', 1500000, 12, 10, false]
      ].map(a => ({ id: id(), cat: a[0], name: a[1], amount: a[2], month: a[3], day: a[4], reserve: a[5], auto: a[6] || null })),
      batches: [],
      plan: [{ id: id(), month: 1, liters: 25650 }],
      mats: [
        { key: 'cap', name: 'Крышки', unit: 'шт', moq: 60000, lead: 3, first: 2, ship: 0, arrive1: 3 },
        { key: 'pf', name: 'Преформы', unit: 'шт', moq: 60000, lead: 1, first: 3, ship: 0, arrive1: 0 },
        { key: 'label', name: 'Этикетки', unit: 'шт', moq: 60000, lead: 1, first: 3, ship: 0, arrive1: 0 },
        { key: 'pallet', name: 'Паллеты', unit: 'шт', moq: 100, lead: 1, first: 3, ship: 0, arrive1: 0 },
        { key: 'stretch', name: 'Стрейч-плёнка', unit: 'кг', moq: 50, lead: 1, first: 3, ship: 0, arrive1: 0 }
      ],
      contrib: {}
    };
  }

  function prices(p) {
    const bpl = p.sh03 / 0.3 + p.sh05 / 0.5 + p.sh10 / 1;
    const cap = p.cap_usd * p.usd * (1 + p.cap_vat);
    const pf = [p.w03, p.w05, p.w10].map(w => w / 1000 * p.pf_kg);
    const pfAvg = bpl ? (p.sh03 / 0.3 * pf[0] + p.sh05 / 0.5 * pf[1] + p.sh10 * pf[2]) / bpl : 0;
    const m = pf.map(x => x + cap + p.label + p.pack);
    const pal = pallet(p), vol = [0.3, 0.5, 1], sh = [p.sh03, p.sh05, p.sh10];
    const palPerL = pal.reduce((a, x, i) => a + (x.bottles > 0 ? sh[i] / vol[i] / x.bottles : 0), 0); // паллет на литр разлитой воды
    return { bpl, cap, pf, pfAvg, m, pal, palPerL, mat: { cap: cap, pf: pfAvg, label: p.label, pallet: p.pallet_price, stretch: p.stretch_price } };
  }
  const PACK = { 6: 3, 8: 4, 12: 4, 20: 5, 24: 6 }; // бутылок в упаковке -> бутылок в ряду
  function pallet(p) { // сколько бутылок встаёт на паллету: упаковки в слое x слоёв (по высоте и по весу)
    const L = 1200, W = p.pal_w;
    return [['03', 0.3, p.w03], ['05', 0.5, p.w05], ['10', 1, p.w10]].map(a => {
      const d = p['d' + a[0]], h = p['h' + a[0]], pk = p['pk' + a[0]], pc = PACK[pk] || 4, prw = pk / pc, x = pc * d, y = prw * d;
      const packs = (x > 0 && y > 0) ? Math.max(Math.floor(L / x) * Math.floor(W / y), Math.floor(L / y) * Math.floor(W / x)) : 0, perLayer = packs * pk, kg1 = a[1] + a[2] / 1000;
      const byH = h > 0 ? Math.floor(p.pal_h / h) : 0, byKg = perLayer > 0 ? Math.floor(p.pal_kg / (perLayer * kg1)) : 0, layers = Math.max(0, Math.min(byH, byKg));
      return { packs, perLayer, byH, byKg, layers, bottles: perLayer * layers, kg: perLayer * layers * kg1, pc, pr: prw };
    });
  }

  function sim(s) {
    const p = s.p, pr = prices(p), bpl = pr.bpl;
    const Z = () => new Array(N).fill(0);
    const keys = ['startL', 'pallets', 'newL', 'cap_l', 'plan_l', 'prod_l', 'sold_l', 'fg_l', 'lost_l', 'line_util', 'b03', 'b05', 'b10', 'bottles', 'prod_b', 'use_pcs',
      'rev', 'receipts', 'rec_ytd', 'vat_rate', 'vat', 'rev_net', 'materials', 'energy', 'staff', 'rent', 'maint', 'other', 'mkt', 'logist', 'returns', 'opex', 'ebitda', 'usn', 'profit',
      'capex_sched', 'new_pay', 'contingency', 'capex', 'wc_pay', 'wc_use', 'wc', 'wc_cum', 'cf', 'cum_cf', 'contrib', 'reserve', 'fixed', 'need', 'payout', 'cash', 'inv_cum', 'headcount'];
    const m = {}; keys.forEach(k => m[k] = Z());
    const yr = i => MONTHS[i - 1].y;
    const idxc = i => i >= p.idx_m ? 1 + p.cost_idx : 1, idxp = i => i >= p.idx_m ? 1 + p.price_idx : 1;
    const lineCapB = p.bph * p.hours * p.shifts * p.wdays * p.eff, lineCapL = bpl ? lineCapB / bpl : 0;
    const plan = s.plan.slice().sort((a, b) => a.month - b.month);
    const UT = {}; s.utypes.forEach(t => { UT[t.id] = t; });
    const startCost = s.utypes.reduce((a, t) => a + (+t.start || 0) * (+t.price || 0), 0), startL = s.utypes.reduce((a, t) => a + (+t.start || 0) * (+t.l || 0), 0);
    const bL = b => (UT[b.type] ? +UT[b.type].l : 0) || 0, bP = b => (UT[b.type] ? +UT[b.type].price : 0) || 0;
    const capexAmt = c => c.auto === 'units0' ? startCost * 0.5 : (+c.amount || 0);
    const cnt = {}; s.utypes.forEach(t => { cnt[t.id] = Z(); });
    // --- 1. мощность, производство, продажи, склад готовой продукции
    let fg = 0;
    for (let i = 1; i <= N; i++) {
      const k = i - 1;
      m.startL[k] = i >= p.start_m ? startL : 0;
      m.newL[k] = i >= p.start_m ? s.batches.reduce((a, b) => a + (b.month <= i ? b.qty * bL(b) : 0), 0) : 0;
      s.utypes.forEach(t => { cnt[t.id][k] = i >= p.start_m ? (+t.start || 0) + s.batches.reduce((a, b) => a + (b.type === t.id && b.month <= i ? b.qty : 0), 0) : 0; });
      m.cap_l[k] = (m.startL[k] + m.newL[k]) * p.k_use * p.days;
      let base = 0; plan.forEach(st => { if (st.month <= i) base = +st.liters || 0; });
      const st = p.start_m, ramp = i < st ? 0 : i === st ? p.ramp1 * p.first_share : i === st + 1 ? p.ramp2 : i === st + 2 ? p.ramp3 : 1;
      m.plan_l[k] = base * ramp * p.caution;
      const want = Math.max(0, m.plan_l[k] * (1 + p.fg_days / 30) - fg);
      const wantCap = Math.min(m.cap_l[k], want);
      m.line_util[k] = lineCapB ? wantCap * bpl / lineCapB : 0;
      m.prod_l[k] = Math.min(wantCap, lineCapL);
      m.sold_l[k] = Math.min(m.plan_l[k], fg + m.prod_l[k]);
      m.lost_l[k] = m.plan_l[k] - m.sold_l[k];
      fg = fg + m.prod_l[k] - m.sold_l[k]; m.fg_l[k] = fg;
      m.b03[k] = m.sold_l[k] * p.sh03 / 0.3; m.b05[k] = m.sold_l[k] * p.sh05 / 0.5; m.b10[k] = m.sold_l[k] * p.sh10;
      m.bottles[k] = m.b03[k] + m.b05[k] + m.b10[k];
      m.prod_b[k] = m.prod_l[k] * bpl; m.use_pcs[k] = m.prod_b[k] / (1 - p.waste); m.pallets[k] = m.prod_l[k] * pr.palPerL;
      m.rev[k] = (m.b03[k] * p.p03 + m.b05[k] * p.p05 + m.b10[k] * p.p10) * idxp(i);
    }
    // --- 2. закупки материалов: заказ покрывает расход на `lead` месяцев вперёд, целыми партиями
    const ord = {}, stockEnd = {}, useBy = {};
    s.mats.forEach(mt => { useBy[mt.key] = mt.key === 'pallet' ? m.pallets : mt.key === 'stretch' ? m.pallets.map(x => x * p.stretch_per) : m.use_pcs; });
    s.mats.forEach(mt => { const U = useBy[mt.key];
      const o = Z(); let sum = 0, cum = 0; const se = Z();
      for (let i = 1; i <= N; i++) {
        if (i >= mt.first && mt.moq > 0) {
          const h = i + mt.lead; let need = 0;
          for (let j = 1; j <= Math.min(N, h); j++) need += U[j - 1];
          need += Math.max(0, h - N) * U[N - 1];
          o[i - 1] = Math.ceil(Math.max(0, need - sum) / mt.moq - 1e-9) * mt.moq; sum += o[i - 1];
        }
        cum += U[i - 1]; se[i - 1] = sum - cum;
      }
      ord[mt.key] = o; stockEnd[mt.key] = se;
    });
    // --- 3. деньги
    let prevRev = 0, ytd = 0, cash = 0, cum = 0, wcc = 0, inv = 0;
    const recYear = {};
    for (let i = 1; i <= N; i++) { const k = i - 1; m.receipts[k] = m.rev[k] * (1 - p.defer) + prevRev * p.defer; prevRev = m.rev[k]; recYear[yr(i)] = (recYear[yr(i)] || 0) + m.receipts[k]; }
    for (let i = 1; i <= N; i++) {
      const k = i - 1, ic = idxc(i);
      const ytdPrev = (i > 1 && yr(i) === yr(i - 1)) ? ytd : 0; ytd = ytdPrev + m.receipts[k]; m.rec_ytd[k] = ytd;
      m.vat_rate[k] = i === 1 ? 0 : ((ytdPrev > p.vat_thr || (recYear[yr(i) - 1] || 0) > p.vat_thr) ? p.vat_rate : 0);
      m.vat[k] = m.rev[k] * m.vat_rate[k] / (1 + m.vat_rate[k]); m.rev_net[k] = m.rev[k] - m.vat[k];
      const pb = [m.prod_l[k] * p.sh03 / 0.3, m.prod_l[k] * p.sh05 / 0.5, m.prod_l[k] * p.sh10];
      m.materials[k] = (pb[0] * pr.m[0] + pb[1] * pr.m[1] + pb[2] * pr.m[2]) / (1 - p.waste) * ic + (i === p.pilots_m ? p.pilots : 0) + m.pallets[k] * (p.pallet_price + p.stretch_per * p.stretch_price) * ic;
      m.energy[k] = m.cap_l[k] * p.energy * ic;
      let fot = 0, hc = 0; s.staff.forEach(e => { if (i >= e.from && i <= e.to) { fot += +e.salary || 0; hc++; } });
      m.headcount[k] = hc; m.staff[k] = fot * p.tax_k * ic;
      m.rent[k] = (i >= p.rent_start ? p.rent : 0) * ic; m.maint[k] = (i >= p.maint_start ? p.maint : 0) * ic; m.other[k] = p.other * ic;
      m.mkt[k] = ((p.mkt_n > 0 && i >= p.mkt_start && i < p.mkt_start + p.mkt_n) ? p.mkt_launch / p.mkt_n : 0) + m.rev_net[k] * p.mkt_pct;
      m.logist[k] = m.rev[k] * p.logist; m.returns[k] = m.rev[k] * p.returns;
      m.opex[k] = m.materials[k] + m.energy[k] + m.staff[k] + m.rent[k] + m.maint[k] + m.other[k] + m.mkt[k] + m.logist[k] + m.returns[k];
      m.ebitda[k] = m.rev_net[k] - m.opex[k];
      m.usn[k] = Math.max(p.usn_rate * Math.max(0, m.ebitda[k]), p.usn_min * m.receipts[k]);
      m.profit[k] = m.ebitda[k] - m.usn[k];
      let sched = 0, schedRes = 0; s.capex.forEach(c => { if (c.month === i) { const a = capexAmt(c); sched += a; if (c.reserve) schedRes += a; } });
      let np = 0; s.batches.forEach(b => { const a = 0.5 * b.qty * bP(b); if (b.month === i) np += a; if (b.month === i + p.lead) np += a; if (i === 1 && b.month >= 1 && b.month <= p.lead) np += a; });
      m.capex_sched[k] = sched; m.new_pay[k] = np; m.contingency[k] = p.contingency * (schedRes + np); m.capex[k] = sched + np + m.contingency[k];
      let pay = 0, used = 0;
      s.mats.forEach(mt => { const q = ord[mt.key][k]; pay += q * pr.mat[mt.key] * ic + ((q > 0 && i > mt.first) ? (+mt.ship || 0) : 0); used += useBy[mt.key][k] * pr.mat[mt.key]; });
      m.wc_pay[k] = pay; m.wc_use[k] = used * ic; m.wc[k] = pay - m.wc_use[k]; wcc += m.wc[k]; m.wc_cum[k] = wcc;
      m.cf[k] = m.receipts[k] - m.opex[k] - m.vat[k] - m.usn[k] - m.capex[k] - m.wc[k]; cum += m.cf[k]; m.cum_cf[k] = cum;
      m.fixed[k] = m.staff[k] + m.rent[k] + m.maint[k] + m.other[k]; m.reserve[k] = p.reserve_m * m.fixed[k];
      m.contrib[k] = +s.contrib[i] || 0;
      m.need[k] = Math.max(0, m.reserve[k] - (cash + m.cf[k] + m.contrib[k]));
      const pre = cash + m.cf[k] + m.contrib[k] + m.need[k];
      m.payout[k] = (p.payout_on && m.need[k] === 0 && m.contrib[k] === 0 && i > p.start_m) ? Math.max(0, pre - Math.max(p.payout_keep, p.reserve_m) * m.fixed[k]) : 0;
      cash = pre - m.payout[k]; m.cash[k] = cash; inv += m.contrib[k] + m.need[k]; m.inv_cum[k] = inv;
    }
    // --- 4. по дням: деньги, склад
    const d = { cash: new Float64Array(DAYS), fg: new Float64Array(DAYS), out: new Float64Array(DAYS), inn: new Float64Array(DAYS) };
    s.mats.forEach(mt => { d[mt.key] = new Float64Array(DAYS); d[mt.key + '_way'] = new Float64Array(DAYS); });
    const ev = [], flow = new Float64Array(DAYS);
    const add = (day, amt, kind, label, ref) => { flow[day] += amt; if (kind) ev.push({ day, amt, kind, label, ref }); };
    for (let i = 1; i <= N; i++) {
      const k = i - 1, mm = MONTHS[k], ic = idxc(i);
      if (m.contrib[k] + m.need[k] > 0) add(dayOf(i, 1), m.contrib[k] + m.need[k], 'invest', 'Взнос инвестора');
      if (m.payout[k] > 0) add(dayOf(i, 31), -m.payout[k], 'payout', 'Возврат инвестору');
      if (m.staff[k]) { add(dayOf(i, 10), -m.staff[k] / 2, 'pay', 'Зарплата и взносы (1-я половина)'); add(dayOf(i, 25), -m.staff[k] / 2, 'pay', 'Зарплата и взносы (2-я половина)'); }
      if (m.rent[k]) add(dayOf(i, 1), -m.rent[k], 'pay', 'Аренда');
      if (m.vat[k] + m.usn[k]) add(dayOf(i, 28), -(m.vat[k] + m.usn[k]), 'pay', 'Налоги (НДС и УСН)');
      s.capex.forEach(c => { if (c.month === i && capexAmt(c)) add(dayOf(i, c.day || 10), -capexAmt(c), 'capex', c.name, c.id); });
      s.batches.forEach(b => { const a = 0.5 * b.qty * bP(b); if (!a) return;
        if (b.month === i) add(dayOf(i, 10), -a, 'capex', 'Новые установки ×' + b.qty + ' — 50 % при запуске', b.id);
        if (b.month === i + p.lead) add(dayOf(i, 10), -a, 'capex', 'Новые установки ×' + b.qty + ' — 50 % при заказе', b.id);
        if (i === 1 && b.month >= 1 && b.month <= p.lead) add(dayOf(i, 10), -a, 'capex', 'Новые установки ×' + b.qty + ' — 50 % при заказе', b.id); });
      if (m.contingency[k]) add(dayOf(i, 20), -m.contingency[k], 'pay', 'Резерв на непредвиденное');
      s.mats.forEach(mt => { const q = ord[mt.key][k]; if (q > 0) add(dayOf(i, 15), -(q * pr.mat[mt.key] * ic + (i > mt.first ? (+mt.ship || 0) : 0)), 'buy', mt.name + ': партия ' + Math.round(q).toLocaleString('ru-RU') + ' ' + (mt.unit || 'шт'), mt.key); });
      const even = (m.receipts[k] - (m.opex[k] - m.staff[k] - m.rent[k] - m.wc_use[k])) / mm.nd;
      for (let x = 0; x < mm.nd; x++) flow[mm.d0 + x] += even;
      for (let x = 0; x < mm.nd; x++) { d.inn[mm.d0 + x] += m.receipts[k] / mm.nd; }
    }
    { let c = 0; for (let x = 0; x < DAYS; x++) { c += flow[x]; d.cash[x] = c; } }
    for (let i = 1; i <= N; i++) { const k = i - 1, mm = MONTHS[k], f0 = k ? m.fg_l[k - 1] : 0; for (let x = 0; x < mm.nd; x++) d.fg[mm.d0 + x] = (f0 + (m.fg_l[k] - f0) * (x + 1) / mm.nd) * bpl; }
    const arrivals = [];
    s.mats.forEach(mt => {
      const arr = new Float64Array(DAYS), ordd = new Float64Array(DAYS); let firstDone = false;
      for (let i = 1; i <= N; i++) { const q = ord[mt.key][i - 1]; if (q <= 0) continue;
        let am = i + mt.lead; if (!firstDone && mt.arrive1) am = Math.max(i, mt.arrive1); firstDone = true;
        ordd[dayOf(i, 15)] += q;
        if (am <= N) { const ad = Math.max(dayOf(am, 1), dayOf(i, 15)); arr[ad] += q; arrivals.push({ day: ad, key: mt.key, name: mt.name, qty: q }); } }
      let on = 0, way = 0;
      for (let i = 1; i <= N; i++) { const mm = MONTHS[i - 1], u = useBy[mt.key][i - 1] / mm.nd;
        for (let x = 0; x < mm.nd; x++) { const day = mm.d0 + x; way += ordd[day]; on += arr[day]; way -= arr[day]; on -= u; d[mt.key][day] = on; d[mt.key + '_way'][day] = way; } }
    });
    // --- 5. итоги и тревоги
    const firstIdx = (f) => { for (let k = 0; k < N; k++) if (f(k)) return k + 1; return 0; };
    const ebitdaM = firstIdx(k => m.ebitda[k] > 0 && m.rev[k] > 0 && (k === 0 || m.ebitda[k - 1] <= 0));
    const paybackM = firstIdx(k => k > 0 && m.cum_cf[k] >= 0 && m.cum_cf[k - 1] < 0);
    const avg12 = m.cf.slice(-12).reduce((a, b) => a + b, 0) / 12;
    const paybackEst = paybackM || (avg12 > 0 ? N + Math.ceil(-m.cum_cf[N - 1] / avg12) : 0);
    const sum = a => a.reduce((x, y) => x + y, 0), sumY = (a, y) => a.reduce((x, v, k) => x + (MONTHS[k].y === y ? v : 0), 0);
    let minCash = Infinity, minCashDay = 0; for (let x = 0; x < DAYS; x++) if (d.cash[x] < minCash) { minCash = d.cash[x]; minCashDay = x; }
    const invest = sum(m.need) + sum(m.contrib);
    const k = {
      invest, peak: -Math.min(0, Math.min.apply(null, m.cum_cf)), ebitdaM, paybackM, paybackEst, minCash, minCashDay,
      lastInvM: (() => { let r = 0; for (let q = 0; q < N; q++) if (m.need[q] + m.contrib[q] > 0) r = q + 1; return r; })(),
      rev27: sumY(m.rev_net, 2027), rev28: sumY(m.rev_net, 2028), profit27: sumY(m.profit, 2027), profit28: sumY(m.profit, 2028),
      cumEnd: m.cum_cf[N - 1], cashEnd: m.cash[N - 1], payout: sum(m.payout), maxUtil: Math.max.apply(null, m.line_util), wcMax: Math.max.apply(null, m.wc_cum),
      opexTotal: sum(m.opex), capexTotal: sum(m.capex), fotTotal: sum(m.staff), headMax: Math.max.apply(null, m.headcount),
      lostL: sum(m.lost_l), rec27: recYear[2027] || 0, rec28: recYear[2028] || 0, sharesOk: Math.abs(p.sh03 + p.sh05 + p.sh10 - 1) < 1e-4,
      cost: pr, lineCapB
    };
    const al = [];
    if (!k.sharesOk) al.push({ lvl: 'err', day: 0, text: 'Доли 0,3 / 0,5 / 1,0 л в сумме не 100 %' });
    s.mats.forEach(mt => { for (let x = 0; x < DAYS; x++) if (d[mt.key][x] < -0.5) { al.push({ lvl: 'err', day: x, text: mt.name + ' закончились ' + dateOf(x).text + ' — закажите раньше или больше' }); break; } });
    { const q = firstIdx(z => m.line_util[z] > 1.0001); if (q) al.push({ lvl: 'warn', day: dayOf(q, 1), text: 'Линия розлива не успевает с ' + MONTHS[q - 1].label + ' (' + Math.round(k.maxUtil * 100) + ' %) — нужна вторая смена' }); }
    { const q = firstIdx(z => m.lost_l[z] > 1 && z + 1 > p.start_m); if (q) al.push({ lvl: 'warn', day: dayOf(q, 1), text: 'С ' + MONTHS[q - 1].label + ' план продаж выше производства — недопродано ' + Math.round(k.lostL).toLocaleString('ru-RU') + ' л за период' }); }
    { const q = firstIdx(z => m.fg_l[z] > 2 * Math.max(1, m.plan_l[z]) && m.plan_l[z] > 0); if (q) al.push({ lvl: 'warn', day: dayOf(q, 1), text: 'Склад готовой воды больше двух месяцев продаж с ' + MONTHS[q - 1].label }); }
    if (minCash < -1) al.push({ lvl: 'warn', day: minCashDay, text: 'Кассовый разрыв внутри месяца: ' + dateOf(minCashDay).text + ' на счёте ' + Math.round(minCash / 1000).toLocaleString('ru-RU') + ' тыс. ₽ — увеличьте неснижаемый остаток' });
    const recMax = Math.max(k.rec27, k.rec28);
    if (recMax > p.usn_lim) al.push({ lvl: 'err', day: 0, text: 'Доход за год выше лимита УСН — налоги в расчёте занижены' });
    else if (recMax > p.vat7_thr) al.push({ lvl: 'warn', day: 0, text: 'Доход за год выше порога — НДС будет 7 %, поменяйте ставку' });
    s.capex.forEach(c => { if (!(c.month >= 1 && c.month <= N)) al.push({ lvl: 'err', day: 0, text: 'Вложение «' + c.name + '»: месяц оплаты вне периода' }); });
    return { m, d, ev, arrivals, ord, stockEnd, useBy, cnt, k, alerts: al, prices: pr };
  }
  g.Sim = { N, MONTHS, DAYS, MON, dayOf, dateOf, defaults, sim, prices, pallet, PACK, id };
})(typeof window !== 'undefined' ? window : globalThis);

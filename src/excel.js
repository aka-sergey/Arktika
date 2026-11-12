/* ===== ВЫГРУЗКА В EXCEL: те же правила, что в ядре, записаны формулами ===== */
(function (g) {
  const L = n => { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; } return s; };
  const FMT = { int: '#,##0', money: '#,##0', pct: '0%', pct1: '0.0%', dec1: '0.0', dec2: '0.00', dec3: '0.000', month: '0', opt: '0', txt: '@' };
  const C = { pri: 'FF00533E', inp: 'FFFFF2CC', tot: 'FFE2EFDA', grey: 'FF6B7770', line: 'FFB7C9C0', err: 'FFF8D7DA', white: 'FFFFFFFF' };
  function build(ExcelJS, s, res, journal) {
    const S = g.Sim, Meta = g.Meta, N = S.N, p = s.p;
    const wb = new ExcelJS.Workbook(); wb.creator = 'АРКТИКА — бизнес-игра'; wb.calcProperties.fullCalcOnLoad = true;
    const fill = c => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } });
    const put = (ws, addr, v, o) => { o = o || {}; const c = ws.getCell(addr);
      c.value = (typeof v === 'string' && v[0] === '=') ? { formula: v.slice(1) } : v;
      c.font = { name: 'Arial', size: o.size || 10, bold: !!o.bold, color: { argb: o.color || 'FF1B2A24' }, italic: !!o.italic };
      if (o.fmt) c.numFmt = FMT[o.fmt] || o.fmt;
      if (o.kind === 'input') c.fill = fill(C.inp);
      if (o.kind === 'total') { c.fill = fill(C.tot); c.font.bold = true; }
      if (o.kind === 'head') { c.fill = fill(C.pri); c.font = { name: 'Arial', size: 10, bold: true, color: { argb: C.white } }; }
      if (o.kind === 'note') c.font = { name: 'Arial', size: 9, italic: true, color: { argb: C.grey } };
      c.alignment = { horizontal: o.h || (typeof v === 'number' || (typeof v === 'string' && v[0] === '=') ? 'center' : 'left'), vertical: 'middle', wrapText: !!o.wrap };
      return c; };
    const band = (ws, r, text, c1, c2) => { for (let c = c1; c <= c2; c++) put(ws, L(c) + r, c === c1 ? text : '', { kind: 'head' }); };
    const q = n => "'" + n + "'!";

    /* ---------- листы-списки ---------- */
    const SP = 8; // запасные пустые строки под ручное добавление в Excel
    // Персонал: A должность, B группа, C оклад, D с месяца, E по месяц, F.. месяцы
    const wsS = wb.addWorksheet('Персонал', { views: [{ showGridLines: false, state: 'frozen', xSplit: 5, ySplit: 4 }] });
    put(wsS, 'A1', 'Персонал — оклады до налогов (gross) и месяцы работы', { bold: true, size: 14, color: C.pri });
    put(wsS, 'A2', 'Жёлтое — ввод. Месяц — номер от 1 (ноя 2026) до ' + N + ' (дек 2028). Новых людей вписывайте в пустые жёлтые строки.', { kind: 'note' });
    ['Должность', 'Группа', 'Оклад, ₽/мес', 'С месяца №', 'По месяц №'].forEach((t, k) => put(wsS, L(k + 1) + 4, t, { kind: 'head' }));
    put(wsS, 'A3', '№ месяца', { kind: 'note' });
    S.MONTHS.forEach(mm => { put(wsS, L(5 + mm.i) + 3, mm.i, { fmt: 'int', kind: 'note' }); put(wsS, L(5 + mm.i) + 4, mm.label, { kind: 'head', h: 'center' }); });
    const s0 = 5, s1 = s0 + s.staff.length + SP - 1, sT = s1 + 1;
    for (let r = s0; r <= s1; r++) { const e = s.staff[r - s0];
      put(wsS, 'A' + r, e ? e.name : null, { kind: 'input' }); put(wsS, 'B' + r, e ? (e.group === 'office' ? 'Офис' : 'Производство') : null, { kind: 'input' });
      put(wsS, 'C' + r, e ? e.salary : null, { kind: 'input', fmt: 'money' }); put(wsS, 'D' + r, e ? e.from : null, { kind: 'input', fmt: 'int' }); put(wsS, 'E' + r, e ? e.to : null, { kind: 'input', fmt: 'int' });
      for (let i = 1; i <= N; i++) { const c = L(5 + i); put(wsS, c + r, `=IF(AND(${c}$3>=$D${r},${c}$3<=$E${r},$D${r}>0),$C${r},0)`, { fmt: 'money' }); } }
    put(wsS, 'A' + sT, 'ИТОГО оклады за месяц', { kind: 'total' }); ['B', 'C', 'D', 'E'].forEach(c => put(wsS, c + sT, '', { kind: 'total' }));
    for (let i = 1; i <= N; i++) { const c = L(5 + i); put(wsS, c + sT, `=SUM(${c}${s0}:${c}${s1})`, { kind: 'total', fmt: 'money' }); }
    put(wsS, 'A' + (sT + 1), 'Человек в штате', {}); for (let i = 1; i <= N; i++) { const c = L(5 + i); put(wsS, c + (sT + 1), `=COUNTIF(${c}${s0}:${c}${s1},">0")`, { fmt: 'int' }); }
    wsS.getColumn(1).width = 38; wsS.getColumn(2).width = 15; [3, 4, 5].forEach(c => wsS.getColumn(c).width = 13); for (let i = 1; i <= N; i++) wsS.getColumn(5 + i).width = 11;

    // Вложения: A статья, B резерв, C сумма, D месяц, E день
    const wsC = wb.addWorksheet('Вложения', { views: [{ showGridLines: false, state: 'frozen', ySplit: 4 }] });
    put(wsC, 'A1', 'Вложения в основные средства — сумма и месяц оплаты', { bold: true, size: 14, color: C.pri });
    put(wsC, 'A2', '«Резерв» = Да: на строку начисляется резерв на непредвиденное. День оплаты нужен только для подневного графика в игре.', { kind: 'note' });
    ['Статья', 'Резерв?', 'Сумма, ₽', 'Месяц №', 'День', 'Категория'].forEach((t, k) => put(wsC, L(k + 1) + 4, t, { kind: 'head' }));
    const c0 = 5, c1 = c0 + s.capex.length + SP - 1;
    for (let r = c0; r <= c1; r++) { const e = s.capex[r - c0];
      put(wsC, 'A' + r, e ? e.name : null, { kind: 'input' });
      const cb = put(wsC, 'B' + r, e ? (e.reserve ? 'Да' : 'Нет') : null, { kind: 'input', h: 'center' }); cb.dataValidation = { type: 'list', allowBlank: true, formulae: ['"Да,Нет"'] };
      if (e && e.auto === 'units0') put(wsC, 'C' + r, `=SUMPRODUCT(${q('Установки')}$C$5:$C$${4 + s.utypes.length},${q('Установки')}$D$5:$D$${4 + s.utypes.length})*0.5`, { fmt: 'money' }); else put(wsC, 'C' + r, e ? (+e.amount || 0) : null, { kind: 'input', fmt: 'money' });
      const cm = put(wsC, 'D' + r, e ? e.month : null, { kind: 'input', fmt: 'int' }); cm.dataValidation = { type: 'whole', operator: 'between', allowBlank: true, formulae: [1, N] };
      put(wsC, 'E' + r, e ? (e.day || 10) : null, { kind: 'input', fmt: 'int' }); put(wsC, 'F' + r, e ? (e.cat || 'Прочее') : null, { kind: 'input' }); }
    put(wsC, 'A' + (c1 + 1), 'ИТОГО по списку', { kind: 'total' }); put(wsC, 'B' + (c1 + 1), '', { kind: 'total' }); put(wsC, 'C' + (c1 + 1), `=SUM(C${c0}:C${c1})`, { kind: 'total', fmt: 'money' });
    wsC.getColumn(1).width = 70; wsC.getColumn(2).width = 10; wsC.getColumn(3).width = 16; wsC.getColumn(4).width = 10; wsC.getColumn(5).width = 8; wsC.getColumn(6).width = 22;

    // Установки: сверху типы (A тип, B л/сутки, C цена, D штук на старте), ниже партии (A тип, B штук, C месяц, D л/сутки и E цена — подтягиваются по типу)
    const wsU = wb.addWorksheet('Установки', { views: [{ showGridLines: false }] });
    put(wsU, 'A1', 'Установки очистки воды — типы и партии докупки', { bold: true, size: 14, color: C.pri });
    put(wsU, 'A2', 'Типы: производительность, цена и сколько штук стоит на старте. Стартовые оплачиваются двумя строками на листе «Вложения».', { kind: 'note' });
    ['Тип установки', 'Литров в сутки с одной', 'Цена одной, ₽', 'Штук на старте'].forEach((t, k) => put(wsU, L(k + 1) + 4, t, { kind: 'head' }));
    const t0 = 5, t1 = t0 + s.utypes.length - 1;
    s.utypes.forEach((t, k) => { const r = t0 + k; put(wsU, 'A' + r, t.name, { kind: 'input', bold: true }); put(wsU, 'B' + r, +t.l || 0, { kind: 'input', fmt: 'int' }); put(wsU, 'C' + r, +t.price || 0, { kind: 'input', fmt: 'money' }); put(wsU, 'D' + r, +t.start || 0, { kind: 'input', fmt: 'int' }); });
    const uh = t1 + 3;
    put(wsU, 'A' + (uh - 1), 'Партии докупки: тип, сколько штук и месяц запуска. Литры и цена подтягиваются из таблицы типов. Оплата 50 % при заказе и 50 % в месяц запуска.', { kind: 'note' });
    ['Тип (как в таблице выше)', 'Штук', 'Месяц запуска №', 'Литров в сутки с одной', 'Цена одной, ₽'].forEach((t, k) => put(wsU, L(k + 1) + uh, t, { kind: 'head' }));
    const u0 = uh + 1, u1 = u0 + s.batches.length + SP - 1, TY = `$A$${t0}:$C$${t1}`, tname = id => { const t = s.utypes.find(x => x.id === id); return t ? t.name : null; };
    for (let r = u0; r <= u1; r++) { const e = s.batches[r - u0];
      const ca = put(wsU, 'A' + r, e ? tname(e.type) : null, { kind: 'input' }); ca.dataValidation = { type: 'list', allowBlank: true, formulae: [`$A$${t0}:$A$${t1}`] };
      put(wsU, 'B' + r, e ? e.qty : null, { kind: 'input', fmt: 'int' }); put(wsU, 'C' + r, e ? e.month : null, { kind: 'input', fmt: 'int' });
      put(wsU, 'D' + r, `=IFERROR(VLOOKUP($A${r},${TY},2,0),0)`, { fmt: 'int' }); put(wsU, 'E' + r, `=IFERROR(VLOOKUP($A${r},${TY},3,0),0)`, { fmt: 'money' }); }
    wsU.getColumn(1).width = 28; [2, 3, 4, 5].forEach(c => wsU.getColumn(c).width = 24);

    // Продажи: A с месяца, B литров в месяц
    const wsP = wb.addWorksheet('Продажи', { views: [{ showGridLines: false, state: 'frozen', ySplit: 4 }] });
    put(wsP, 'A1', 'План продаж — литров в месяц на полном ходу', { bold: true, size: 14, color: C.pri });
    put(wsP, 'A2', 'Каждая строка — новый уровень плана с указанного месяца. Строки должны идти по возрастанию месяца. Разгон первых месяцев и коэффициент осторожности — на листе «Кейс».', { kind: 'note' });
    ['С месяца №', 'План, литров в месяц'].forEach((t, k) => put(wsP, L(k + 1) + 4, t, { kind: 'head' }));
    const plan = s.plan.slice().sort((a, b) => a.month - b.month), q0 = 5, q1 = q0 + plan.length + SP - 1;
    for (let r = q0; r <= q1; r++) { const e = plan[r - q0]; put(wsP, 'A' + r, e ? e.month : null, { kind: 'input', fmt: 'int' }); put(wsP, 'B' + r, e ? e.liters : null, { kind: 'input', fmt: 'int' }); }
    wsP.getColumn(1).width = 16; wsP.getColumn(2).width = 26;

    /* ---------- главный лист ---------- */
    const ws = wb.addWorksheet('Кейс', { properties: { tabColor: { argb: C.pri } } });
    wb.views = [{ activeTab: 4 }];
    const C0 = 5, col = i => L(C0 + i - 1), CF = col(1), CL = col(N);
    ws.getColumn(1).width = 2; ws.getColumn(2).width = 58; ws.getColumn(3).width = 12; ws.getColumn(4).width = 16; for (let i = 1; i <= N; i++) ws.getColumn(C0 + i - 1).width = 12;
    put(ws, 'B1', 'АРКТИКА · завод воды, Иваново — сценарий «' + s.name + '»', { bold: true, size: 16, color: C.pri });
    put(ws, 'B2', 'Выгружено из бизнес-игры. Жёлтое — ввод, белое — формулы. Списки людей, вложений, установок и плана продаж — на соседних листах. Месяц 1 = ноябрь 2026.', { kind: 'note' });
    const P = {}; let r = 4;
    const param = (key, label, unit, val, fmt, hint, calc) => { put(ws, 'B' + r, label); put(ws, 'C' + r, unit, { kind: 'note', h: 'center' }); put(ws, 'D' + r, val, { fmt, kind: calc ? null : 'input' }); if (hint) put(ws, 'E' + r, hint, { kind: 'note' }); P[key] = '$D$' + r; r++; };
    Meta.groups.forEach(gr => {
      band(ws, r, gr.title, 2, 14); r++;
      gr.items.forEach(it => param(it[0], it[1], it[2], p[it[0]], it[3], it[4]));
      if (gr.id === 'prod') param('line_cap', 'Мощность линии в месяц', 'бут', `=${P.bph}*${P.hours}*${P.shifts}*${P.wdays}*${P.eff}`, 'int', 'Считается', true);
      if (gr.id === 'pallet') ['03', '05', '10'].forEach((t, k) => { const nm = ['0,3', '0,5', '1,0'][k], vol = [0.3, 0.5, 1][k], d = P['d' + t], pk = P['pk' + t];
        param('pc' + t, 'Бутылка ' + nm + ' л: бутылок в ряду упаковки', 'шт', `=IF(${pk}=6,3,IF(${pk}=8,4,IF(${pk}=12,4,IF(${pk}=20,5,6))))`, 'int', 'Считается', true);
        const a = `(${P['pc' + t]}*${d})`, b = `(${pk}/${P['pc' + t]}*${d})`;
        param('lay' + t, 'Бутылка ' + nm + ' л: бутылок в одном слое паллеты', 'шт', `=IF(${d}<=0,0,MAX(INT(1200/${a})*INT(${P.pal_w}/${b}),INT(1200/${b})*INT(${P.pal_w}/${a}))*${pk})`, 'int', 'Упаковки в слое × бутылок в упаковке', true);
        param('bpp' + t, 'Бутылка ' + nm + ' л: бутылок на паллете', 'шт', `=IF(OR(${P['lay' + t]}=0,${P['h' + t]}<=0),0,${P['lay' + t]}*MAX(0,MIN(INT(${P.pal_h}/${P['h' + t]}),INT(${P.pal_kg}/(${P['lay' + t]}*(${vol}+${P['w' + t]}/1000))))))`, 'int', 'Слоёв — сколько проходит по высоте и по весу', true); });
      if (gr.id === 'sales') param('bpl', 'Бутылок на литр воды', 'шт/л', `=${P.sh03}/0.3+${P.sh05}/0.5+${P.sh10}/1`, 'dec3', 'Считается', true);
      if (gr.id === 'bottle') {
        param('cap_rub', 'Крышка: цена в рублях с НДС', '₽/шт', `=${P.cap_usd}*${P.usd}*(1+${P.cap_vat})`, 'dec2', 'Считается', true);
        param('pf03', 'Преформа 0,3 л: цена', '₽/шт', `=${P.w03}/1000*${P.pf_kg}`, 'dec2', 'Считается: вес × цена за кг', true);
        param('pf05', 'Преформа 0,5 л: цена', '₽/шт', `=${P.w05}/1000*${P.pf_kg}`, 'dec2', '', true);
        param('pf10', 'Преформа 1,0 л: цена', '₽/шт', `=${P.w10}/1000*${P.pf_kg}`, 'dec2', '', true);
        param('pf_avg', 'Преформа: средняя цена по долям бутылок', '₽/шт', `=IF(${P.bpl}=0,0,(${P.sh03}/0.3*${P.pf03}+${P.sh05}/0.5*${P.pf05}+${P.sh10}/1*${P.pf10})/${P.bpl})`, 'dec2', 'Считается', true);
        ['03', '05', '10'].forEach((t, k) => param('m' + t, 'ИТОГО материалы на бутылку ' + ['0,3', '0,5', '1,0'][k] + ' л', '₽', `=${P['pf' + t]}+${P.cap_rub}+${P.label}+${P.pack}`, 'dec1', 'Преформа + крышка + этикетка + упаковка', true));
      }
      r++;
    });
    band(ws, r, 'Запас материалов: партия, срок заказа, первый заказ', 2, 14); r++;
    s.mats.forEach(mt => {
      param(mt.key + '_moq', mt.name + ': партия заказа', mt.unit || 'шт', mt.moq, 'int', 'Заказываем целыми партиями');
      param(mt.key + '_lead', mt.name + ': заказ и оплата за сколько месяцев до расхода', 'мес', mt.lead, 'int', '');
      param(mt.key + '_first', mt.name + ': первый заказ в месяце №', '№', mt.first, 'int', '');
      param(mt.key + '_ship', mt.name + ': транспорт одной следующей партии', '₽', +mt.ship || 0, 'money', 'Добавляется к каждому заказу, кроме первого');
    });
    r++;
    // ссылки на листы-списки
    const RS = (c) => `${q('Персонал')}${c}`, V = c => `${q('Вложения')}$${c}$${c0}:$${c}$${c1}`, U = c => `${q('Установки')}$${c}$${u0}:$${c}$${u1}`, PL = c => `${q('Продажи')}$${c}$${q0}:$${c}$${q1}`;
    
    band(ws, r, 'Расчёт по месяцам — любую белую ячейку можно перебить фактом', 2, C0 + N - 1); r++;
    const T0 = r;
    put(ws, 'B' + T0, '№ месяца', { kind: 'note' }); put(ws, 'B' + (T0 + 1), 'Месяц', { bold: true }); put(ws, 'B' + (T0 + 2), 'Год', { kind: 'note' }); put(ws, 'D' + (T0 + 1), 'Итого', { kind: 'head', h: 'center' });
    S.MONTHS.forEach(mm => { const c = col(mm.i); put(ws, c + T0, mm.i, { kind: 'note', fmt: 'int', h: 'center' }); put(ws, c + (T0 + 1), mm.label, { kind: 'head', h: 'center' }); put(ws, c + (T0 + 2), mm.y, { kind: 'note', fmt: '0', h: 'center' }); });
    const MROW = T0, YROW = T0 + 2; r = T0 + 3;
    ws.views = [{ showGridLines: false, state: 'frozen', xSplit: 4, ySplit: T0 + 2 }];
    const R = {}, M = c => `${c}$${MROW}`, Y = c => `${c}$${YROW}`, MR = `$${CF}$${MROW}:$${CL}$${MROW}`;
    const idc = c => `IF(${M(c)}>=${P.idx_m},1+${P.cost_idx},1)`, idp = c => `IF(${M(c)}>=${P.idx_m},1+${P.price_idx},1)`;
    const row = (key, label, unit, fn, fmt, kind, total) => { R[key] = r; put(ws, 'B' + r, label, { kind: kind === 'total' ? 'total' : null }); put(ws, 'C' + r, unit, { kind: kind === 'total' ? 'total' : 'note', h: 'center' });
      for (let i = 1; i <= N; i++) { const c = col(i), pc = i > 1 ? col(i - 1) : null; put(ws, c + r, fn(i, c, pc), { fmt: fmt || 'money', kind }); }
      const t = total === undefined ? 'SUM' : total; if (t) put(ws, 'D' + r, t === 'LAST' ? `=${CL}${r}` : `=${t}(${CF}${r}:${CL}${r})`, { fmt: fmt || 'money', kind: 'total' }); r++; };
    const sub = t => { put(ws, 'B' + r, t, { bold: true, color: C.pri }); r++; };
    const X = (c, k) => c + R[k];

    sub('Мощность, производство и продажи');
    const TS = c => `${q('Установки')}$${c}$${t0}:$${c}$${t1}`;
    row('startL', 'Стартовые установки дают, литров в сутки (лист «Установки»)', 'л/сут', (i, c) => `=IF(${M(c)}>=${P.start_m},SUMPRODUCT(${TS('B')},${TS('D')}),0)`, 'int', null, 'LAST');
    row('newL', 'Новые установки дают, литров в сутки (лист «Установки»)', 'л/сут', (i, c) => `=IF(${M(c)}>=${P.start_m},SUMPRODUCT((${U('C')}<=${M(c)})*(${U('C')}>=1)*${U('B')}*${U('D')}),0)`, 'int', null, 'LAST');
    row('cap_l', 'Мощность по воде', 'л', (i, c) => `=(${X(c, 'startL')}+${X(c, 'newL')})*${P.k_use}*${P.days}`, 'int');
    row('plan_base', 'План продаж на полном ходу (лист «Продажи»)', 'л', (i, c) => `=IFERROR(INDEX(${PL('B')},MATCH(${M(c)},${PL('A')},1)),0)`, 'int', null, null);
    row('ramp', 'Разгон продаж × осторожность', '%', (i, c) => `=IF(${M(c)}<${P.start_m},0,IF(${M(c)}=${P.start_m},${P.ramp1}*${P.first_share},IF(${M(c)}=${P.start_m}+1,${P.ramp2},IF(${M(c)}=${P.start_m}+2,${P.ramp3},1))))*${P.caution}`, 'pct', null, null);
    row('plan_l', 'План продаж', 'л', (i, c) => `=${X(c, 'plan_base')}*${X(c, 'ramp')}`, 'int');
    R.fg_l = r + 4; // строка склада готовой воды — ниже, нужна для ссылки на прошлый месяц
    row('want', 'Нужно разлить (план + целевой запас − склад), не больше мощности', 'л', (i, c, pc) => `=MIN(${X(c, 'cap_l')},MAX(0,${X(c, 'plan_l')}*(1+${P.fg_days}/30)-${pc ? pc + R.fg_l : 0}))`, 'int');
    row('line_util', 'Загрузка линии (больше 100 % — не успеваем)', '%', (i, c) => `=IF(${P.line_cap}=0,0,${X(c, 'want')}*${P.bpl}/${P.line_cap})`, 'pct', null, 'MAX');
    row('prod_l', 'Разлито воды', 'л', (i, c) => `=MIN(${X(c, 'want')},IF(${P.bpl}=0,0,${P.line_cap}/${P.bpl}))`, 'int');
    row('sold_l', 'Продано воды', 'л', (i, c, pc) => `=MIN(${X(c, 'plan_l')},${pc ? pc + R.fg_l : 0}+${X(c, 'prod_l')})`, 'int');
    row('fg_l', 'Склад готовой воды на конец месяца', 'л', (i, c, pc) => `=${pc ? pc + R.fg_l : 0}+${X(c, 'prod_l')}-${X(c, 'sold_l')}`, 'int', null, 'LAST');
    row('lost_l', 'Недопродано (план выше производства)', 'л', (i, c) => `=${X(c, 'plan_l')}-${X(c, 'sold_l')}`, 'int');
    row('b03', 'Продано бутылок 0,3 л', 'шт', (i, c) => `=${X(c, 'sold_l')}*${P.sh03}/0.3`, 'int');
    row('b05', 'Продано бутылок 0,5 л', 'шт', (i, c) => `=${X(c, 'sold_l')}*${P.sh05}/0.5`, 'int');
    row('b10', 'Продано бутылок 1,0 л', 'шт', (i, c) => `=${X(c, 'sold_l')}*${P.sh10}/1`, 'int');
    row('bottles', 'Продано бутылок всего', 'шт', (i, c) => `=${X(c, 'b03')}+${X(c, 'b05')}+${X(c, 'b10')}`, 'int', 'total');
    row('use_pcs', 'Расход комплектов материалов (разлито бутылок + брак)', 'шт', (i, c) => `=${X(c, 'prod_l')}*${P.bpl}/(1-${P.waste})`, 'int');
    const pp = (t, v) => `IF(${P['bpp' + t]}=0,0,${P['sh' + t]}/${v}/${P['bpp' + t]})`;
    row('pallets', 'Паллет под разлитую воду', 'шт', (i, c) => `=${X(c, 'prod_l')}*(${pp('03', 0.3)}+${pp('05', 0.5)}+${pp('10', 1)})`, 'dec1');
    row('stretch_use', 'Расход стрейч-плёнки', 'кг', (i, c) => `=${X(c, 'pallets')}*${P.stretch_per}`, 'dec1');
    sub('Выручка и деньги от покупателей');
    row('rev', 'Выручка с НДС', '₽', (i, c) => `=(${X(c, 'b03')}*${P.p03}+${X(c, 'b05')}*${P.p05}+${X(c, 'b10')}*${P.p10})*${idp(c)}`, 'money', 'total');
    row('receipts', 'Поступления денег', '₽', (i, c, pc) => `=${X(c, 'rev')}*(1-${P.defer})` + (pc ? `+${X(pc, 'rev')}*${P.defer}` : ''));
    row('rec_ytd', 'Поступления с начала года', '₽', (i, c, pc) => pc ? `=IF(${Y(c)}=${Y(pc)},${pc}${r},0)+${X(c, 'receipts')}` : `=${X(c, 'receipts')}`, 'money', null, null);
    row('vat_rate', 'Ставка НДС в этом месяце', '%', (i, c, pc) => pc ? `=IF(OR(IF(${Y(c)}=${Y(pc)},${X(pc, 'rec_ytd')},0)>${P.vat_thr},SUMIF($${CF}$${YROW}:$${CL}$${YROW},${Y(c)}-1,$${CF}$${R.receipts}:$${CL}$${R.receipts})>${P.vat_thr}),${P.vat_rate},0)` : '=0', 'pct', null, null);
    row('vat', 'НДС к уплате', '₽', (i, c) => `=${X(c, 'rev')}*${X(c, 'vat_rate')}/(1+${X(c, 'vat_rate')})`);
    row('rev_net', 'Выручка без НДС', '₽', (i, c) => `=${X(c, 'rev')}-${X(c, 'vat')}`, 'money', 'total');
    sub('Расходы');
    row('materials', 'Материалы на разлитое (с браком), паллеты, стрейч и пилотные партии', '₽', (i, c) => `=${X(c, 'prod_l')}*(${P.sh03}/0.3*${P.m03}+${P.sh05}/0.5*${P.m05}+${P.sh10}/1*${P.m10})/(1-${P.waste})*${idc(c)}+IF(${M(c)}=${P.pilots_m},${P.pilots},0)+${X(c, 'pallets')}*(${P.pallet_price}+${P.stretch_per}*${P.stretch_price})*${idc(c)}`);
    row('energy', 'Электричество и вода', '₽', (i, c) => `=${X(c, 'cap_l')}*${P.energy}*${idc(c)}`);
    row('staff', 'Персонал (оклады с листа «Персонал» × взносы)', '₽', (i, c) => `=${RS(L(5 + i) + sT)}*${P.tax_k}*${idc(c)}`);
    row('rent', 'Аренда', '₽', (i, c) => `=IF(${M(c)}>=${P.rent_start},${P.rent},0)*${idc(c)}`);
    row('maint', 'Обслуживание производства', '₽', (i, c) => `=IF(${M(c)}>=${P.maint_start},${P.maint},0)*${idc(c)}`);
    row('other', 'Прочие расходы', '₽', (i, c) => `=${P.other}*${idc(c)}`);
    row('mkt', 'Маркетинг (запуск + % выручки)', '₽', (i, c) => `=IF(AND(${P.mkt_n}>0,${M(c)}>=${P.mkt_start},${M(c)}<${P.mkt_start}+${P.mkt_n}),${P.mkt_launch}/MAX(1,${P.mkt_n}),0)+${X(c, 'rev_net')}*${P.mkt_pct}`);
    row('logist', 'Логистика и бонусы сетям', '₽', (i, c) => `=${X(c, 'rev')}*${P.logist}`);
    row('returns', 'Возвраты и списания', '₽', (i, c) => `=${X(c, 'rev')}*${P.returns}`);
    row('opex', 'ИТОГО операционные расходы', '₽', (i, c) => `=SUM(${X(c, 'materials')}:${X(c, 'returns')})`, 'money', 'total');
    row('ebitda', 'EBITDA (выручка без НДС − расходы)', '₽', (i, c) => `=${X(c, 'rev_net')}-${X(c, 'opex')}`, 'money', 'total');
    row('usn', 'УСН', '₽', (i, c) => `=MAX(${P.usn_rate}*MAX(0,${X(c, 'ebitda')}),${P.usn_min}*${X(c, 'receipts')})`);
    row('profit', 'ПРИБЫЛЬ после налогов', '₽', (i, c) => `=${X(c, 'ebitda')}-${X(c, 'usn')}`, 'money', 'total');
    sub('Вложения в основные средства');
    row('capex_sched', 'Вложения по списку (лист «Вложения»)', '₽', (i, c) => `=SUMIF(${V('D')},${M(c)},${V('C')})`);
    row('new_pay', 'Новые установки — оплата (50 % при заказе, 50 % при запуске)', '₽', (i, c) => `=0.5*(SUMPRODUCT((${U('C')}=${M(c)})*${U('B')}*${U('E')})+SUMPRODUCT((${U('C')}=${M(c)}+${P.lead})*${U('B')}*${U('E')})` + (i === 1 ? `+SUMPRODUCT((${U('C')}>=1)*(${U('C')}<=${P.lead})*${U('B')}*${U('E')})` : '') + ')');
    row('contingency', 'Резерв на непредвиденное', '₽', (i, c) => `=${P.contingency}*(SUMIFS(${V('C')},${V('D')},${M(c)},${V('B')},"Да")+${X(c, 'new_pay')})`);
    row('capex', 'ИТОГО вложения в основные средства', '₽', (i, c) => `=${X(c, 'capex_sched')}+${X(c, 'new_pay')}+${X(c, 'contingency')}`, 'money', 'total');
    sub('Запас материалов (платим заранее, целыми партиями)');
    const priceRef = { cap: P.cap_rub, pf: P.pf_avg, label: P.label, pallet: P.pallet_price, stretch: P.stretch_price }, useRow = k => k === 'pallet' ? R.pallets : k === 'stretch' ? R.stretch_use : R.use_pcs;
    s.mats.forEach(mt => { const k = mt.key, U_ = useRow(k), un = mt.unit || 'шт';
      row(k + '_ord', mt.name + ': заказано и оплачено', un, (i, c, pc) => `=IF(OR(${M(c)}<${P[k + '_first']},${P[k + '_moq']}<=0),0,CEILING(MAX(0,SUMIF(${MR},"<="&(${M(c)}+${P[k + '_lead']}),$${CF}$${U_}:$${CL}$${U_})+MAX(0,${M(c)}+${P[k + '_lead']}-${N})*$${CL}$${U_}` + (pc ? `-SUM($${CF}${r}:${pc}${r})` : '') + `),${P[k + '_moq']}))`, 'int');
      row(k + '_stock', mt.name + ': запас на складе и в пути', un, (i, c) => `=SUM($${CF}${R[k + '_ord']}:${c}${R[k + '_ord']})-SUM($${CF}${U_}:${c}${U_})`, 'int', null, 'MIN'); });
    row('wc_pay', 'Оплата закупок материалов и транспорта', '₽', (i, c) => '=' + s.mats.map(mt => `${X(c, mt.key + '_ord')}*${priceRef[mt.key]}*${idc(c)}+IF(AND(${X(c, mt.key + '_ord')}>0,${M(c)}>${P[mt.key + '_first']}),${P[mt.key + '_ship']},0)`).join('+'));
    row('wc_use', 'Израсходовано со склада (уже сидит в «Материалах»)', '₽', (i, c) => `=(${s.mats.map(mt => c + useRow(mt.key) + '*' + priceRef[mt.key]).join('+')})*${idc(c)}`);
    row('wc', 'ИЗМЕНЕНИЕ ЗАПАСА за месяц (плюс — докупили, минус — израсходовали больше)', '₽', (i, c) => `=${X(c, 'wc_pay')}-${X(c, 'wc_use')}`, 'money', 'total');
    row('wc_cum', 'Деньги в запасе материалов (накопленно)', '₽', (i, c, pc) => (pc ? `=${pc}${r}+` : '=') + X(c, 'wc'), 'money', null, 'MAX');
    sub('Деньги и взносы инвестора');
    row('cf', 'Денежный поток (поступления − расходы − налоги − вложения − запас)', '₽', (i, c) => `=${X(c, 'receipts')}-${X(c, 'opex')}-${X(c, 'vat')}-${X(c, 'usn')}-${X(c, 'capex')}-${X(c, 'wc')}`, 'money', 'total');
    row('cum_cf', 'Накопленный денежный поток (без денег инвестора)', '₽', (i, c, pc) => (pc ? `=${pc}${r}+` : '=') + X(c, 'cf'), 'money', null, 'MIN');
    row('contrib', 'Инвестор уже внёс — факт (вписывайте сюда)', '₽', (i) => +s.contrib[i] || 0, 'money', 'input');
    row('fixed', 'Постоянные расходы месяца (персонал, аренда, обслуживание, прочие)', '₽', (i, c) => `=${X(c, 'staff')}+${X(c, 'rent')}+${X(c, 'maint')}+${X(c, 'other')}`);
    row('reserve', 'Неснижаемый остаток', '₽', (i, c) => `=${P.reserve_m}*${X(c, 'fixed')}`, 'money', null, null);
    R.cash = r + 2;
    row('need', 'ИНВЕСТОР ВНОСИТ В ЭТОМ МЕСЯЦЕ — ПЛАН (Итого = сколько ещё внести)', '₽', (i, c, pc) => `=MAX(0,${X(c, 'reserve')}-(${pc ? pc + R.cash : 0}+${X(c, 'cf')}+${X(c, 'contrib')}))`, 'money', 'total');
    row('payout', 'Возврат инвестору (свободные деньги сверх подушки)', '₽', (i, c, pc) => `=IF(AND(${P.payout_on}=1,${X(c, 'need')}=0,${X(c, 'contrib')}=0,${M(c)}>${P.start_m}),MAX(0,${pc ? pc + R.cash : 0}+${X(c, 'cf')}+${X(c, 'contrib')}+${X(c, 'need')}-MAX(${P.payout_keep},${P.reserve_m})*${X(c, 'fixed')}),0)`);
    row('cash', 'ДЕНЬГИ НА СЧЁТЕ на конец месяца', '₽', (i, c, pc) => `=${pc ? pc + R.cash : 0}+${X(c, 'cf')}+${X(c, 'contrib')}+${X(c, 'need')}-${X(c, 'payout')}`, 'money', 'total', 'LAST');
    row('inv_cum', 'Внесено инвестором накопленно (факт + план)', '₽', (i, c) => `=SUM($${CF}${R.contrib}:${c}${R.contrib})+SUM($${CF}${R.need}:${c}${R.need})`, 'money', null, 'LAST');
    row('pb_flag', 'Окупились: накопленный поток впервые ≥ 0 (служебная)', '', (i, c, pc) => pc ? `=IF(AND(${X(c, 'cum_cf')}>=0,${X(pc, 'cum_cf')}<0),1,0)` : '=0', '0', null, null);
    row('eb_flag', 'EBITDA впервые > 0 (служебная)', '', (i, c, pc) => `=IF(AND(${X(c, 'ebitda')}>0,${X(c, 'rev')}>0,${pc ? X(pc, 'ebitda') + '<=0' : 'TRUE'}),1,0)`, '0', null, null);
    const TEND = r;
    // итоги и проверки справа от пульта
    const rng = k => `$${CF}$${R[k]}:$${CL}$${R[k]}`, labels = `$${CF}$${T0 + 1}:$${CL}$${T0 + 1}`, years = `$${CF}$${YROW}:$${CL}$${YROW}`;
    band(ws, 4, 'Итоги сценария', 16, 25);
    const kp = [
      ['ОБЩАЯ СУММА ВЛОЖЕНИЙ ИНВЕСТОРА, ₽', `=SUM(${rng('contrib')})+SUM(${rng('need')})`, 'money'],
      ['Пиковая потребность в деньгах, ₽', `=-MIN(0,MIN(${rng('cum_cf')}))`, 'money'],
      ['EBITDA в плюс с', `=IFERROR(INDEX(${labels},MATCH(1,${rng('eb_flag')},0)),"не в горизонте")`, 'txt'],
      ['Окупаемость (накопленный поток ≥ 0)', `=IFERROR(INDEX(${labels},MATCH(1,${rng('pb_flag')},0)),"за горизонтом")`, 'txt'],
      ['Накопленный поток на конец 2028, ₽', `=${CL}${R.cum_cf}`, 'money'],
      ['Возвращено инвестору, ₽', `=SUM(${rng('payout')})`, 'money'],
      ['Прибыль после налогов 2027, ₽', `=SUMIF(${years},2027,${rng('profit')})`, 'money'],
      ['Прибыль после налогов 2028, ₽', `=SUMIF(${years},2028,${rng('profit')})`, 'money'],
      ['Максимальная загрузка линии', `=MAX(${rng('line_util')})`, 'pct'],
      ['Деньги на счёте на конец 2028, ₽', `=${CL}${R.cash}`, 'money']];
    kp.forEach((a, k) => { put(ws, 'P' + (5 + k), a[0]); ws.mergeCells(`P${5 + k}:U${5 + k}`); put(ws, 'V' + (5 + k), a[1], { fmt: a[2], bold: true, color: C.pri, h: 'right' }); ws.mergeCells(`V${5 + k}:Y${5 + k}`); });
    const H0 = 5 + kp.length + 1; band(ws, H0, 'Проверки — во всех строках должно быть OK', 16, 25);
    const rec = y => `SUMIF(${years},${y},${rng('receipts')})`;
    const ch = [
      ['Доли бутылок в сумме 100 %', `=IF(ABS(${P.sh03}+${P.sh05}+${P.sh10}-1)<0.0001,"OK","ОШИБКА: сумма долей не 100 %")`],
      ['Все вложения попали в график оплат', `=IF(ABS(SUM(${rng('capex_sched')})-SUM(${V('C')}))<1,"OK","ОШИБКА: месяц оплаты пустой или вне 1–${N}")`],
      ...s.mats.map(mt => [mt.name + ': запас не уходит в минус', `=IF(MIN(${rng(mt.key + '_stock')})<-0.5,"ОШИБКА: не хватает — партия или месяц 1-го заказа","OK")`]),
      ['Линия розлива успевает', `=IF(MAX(${rng('line_util')})>1.0001,"ВНИМАНИЕ: линия не успевает","OK")`],
      ['План продаж обеспечен производством', `=IF(SUM(${rng('lost_l')})>1,"ВНИМАНИЕ: план выше производства","OK")`],
      ['Доход за год в пределах УСН и НДС 5 %', `=IF(MAX(${rec(2027)},${rec(2028)})>${P.usn_lim},"ВНИМАНИЕ: выше лимита УСН",IF(MAX(${rec(2027)},${rec(2028)})>${P.vat7_thr},"ВНИМАНИЕ: НДС будет 7 %","OK"))`]];
    ch.forEach((a, k) => { put(ws, 'P' + (H0 + 1 + k), a[0]); ws.mergeCells(`P${H0 + 1 + k}:U${H0 + 1 + k}`); put(ws, 'V' + (H0 + 1 + k), a[1], { bold: true, h: 'left' }); ws.mergeCells(`V${H0 + 1 + k}:Y${H0 + 1 + k}`); });
    ws.addConditionalFormatting({ ref: `V${H0 + 1}:V${H0 + ch.length}`, rules: [{ type: 'cellIs', operator: 'notEqual', formulae: ['"OK"'], priority: 1, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: C.err } }, font: { color: { argb: 'FFB00020' }, bold: true } } }] });
    ws.addConditionalFormatting({ ref: `${CF}${R.need}:${CL}${R.need}`, rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: [0], priority: 2, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFC6E0B4' } }, font: { bold: true } } }] });
    ws.addConditionalFormatting({ ref: `${CF}${R.line_util}:${CL}${R.line_util}`, rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: [1], priority: 3, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFE699' } } } }] });

    /* ---------- по дням (значения) ---------- */
    if (res) {
      const wsD = wb.addWorksheet('По дням', { views: [{ showGridLines: false, state: 'frozen', ySplit: 3 }] });
      put(wsD, 'A1', 'Подневная раскладка — значения из игры (не формулы)', { bold: true, size: 14, color: C.pri });
      put(wsD, 'A2', 'Зарплата — 10-го и 25-го, аренда — 1-го, закупки материалов — 15-го, налоги — 28-го, взнос инвестора — 1-го; остальное равномерно по дням. Итог месяца совпадает с листом «Кейс».', { kind: 'note' });
      const hd = ['Дата', 'Деньги на счёте, ₽', 'Готовая вода, бутылок'].concat(s.mats.map(mt => mt.name + ' на складе, ' + (mt.unit || 'шт')), s.mats.map(mt => mt.name + ' в пути, ' + (mt.unit || 'шт')), ['Событие дня']);
      hd.forEach((t, k) => put(wsD, L(k + 1) + 3, t, { kind: 'head', wrap: true }));
      const evd = {}; res.ev.forEach(e => { if (e.kind !== 'pay') (evd[e.day] = evd[e.day] || []).push(e.label + ': ' + Math.round(e.amt).toLocaleString('ru-RU') + ' ₽'); });
      for (let x = 0; x < S.DAYS; x++) { const dt = S.dateOf(x), rr = 4 + x;
        const c = wsD.getCell('A' + rr); c.value = new Date(Date.UTC(dt.y, dt.m, dt.dom)); c.numFmt = 'dd.mm.yyyy';
        const vals = [res.d.cash[x], res.d.fg[x]].concat(s.mats.map(mt => res.d[mt.key][x]), s.mats.map(mt => res.d[mt.key + '_way'][x]));
        vals.forEach((v, k) => { const cc = wsD.getCell(L(k + 2) + rr); cc.value = Math.round(v); cc.numFmt = '#,##0'; });
        if (evd[x]) wsD.getCell(L(vals.length + 2) + rr).value = evd[x].join('; '); }
      wsD.getColumn(1).width = 12; for (let k = 2; k <= hd.length - 1; k++) wsD.getColumn(k).width = 18; wsD.getColumn(hd.length).width = 90;
    }
    /* ---------- журнал и справка ---------- */
    const wsJ = wb.addWorksheet('Журнал', { views: [{ showGridLines: false }] });
    put(wsJ, 'A1', 'Журнал изменений сценария «' + s.name + '»', { bold: true, size: 14, color: C.pri });
    ['Когда', 'Что изменили', 'Вложения инвестора, Δ ₽', 'Окупаемость, Δ мес'].forEach((t, k) => put(wsJ, L(k + 1) + 3, t, { kind: 'head' }));
    (journal || []).forEach((j, k) => { put(wsJ, 'A' + (4 + k), j.t); put(wsJ, 'B' + (4 + k), j.text); put(wsJ, 'C' + (4 + k), Math.round(j.dInv || 0), { fmt: '+#,##0;-#,##0;0' }); put(wsJ, 'D' + (4 + k), j.dPb || 0, { fmt: '+0;-0;0' }); });
    wsJ.getColumn(1).width = 18; wsJ.getColumn(2).width = 80; wsJ.getColumn(3).width = 24; wsJ.getColumn(4).width = 20;
    const wsH = wb.addWorksheet('Как читать', { views: [{ showGridLines: false }] });
    put(wsH, 'A1', 'Как читать этот файл', { bold: true, size: 14, color: C.pri });
    (g.DOC_XLSX || []).forEach((t, k) => { put(wsH, 'A' + (3 + k), t, { wrap: true, bold: /^[А-ЯЁ0-9 «»—,.]+$/.test(t) && t.length < 60 }); });
    wsH.getColumn(1).width = 130;
    return { wb, R, P, T0, TEND, lists: { s0, s1, sT, c0, c1, u0, u1, q0, q1, t0, t1 } };
  }
  g.DOC_XLSX = [
    'ЧТО ЭТО', 'Файл выгружен из бизнес-игры «АРКТИКА». Расчёт в игре и формулы здесь — одни и те же правила, итоги совпадают.',
    'ЛИСТЫ', '«Кейс» — параметры (сверху) и расчёт по месяцам (ниже). Справа от параметров — итоги и проверки.',
    '«Персонал» — список людей: оклад, с какого и по какой месяц работает. «Кейс» берёт отсюда сумму окладов за месяц.',
    '«Вложения» — список покупок и платежей: сумма, месяц, начислять ли резерв 10 % на непредвиденное.', '«Установки» — два типа установок (ТИП-А30 и ТИП-Б130): литры, цена, сколько на старте; ниже — партии докупки по типам.',
    '«Продажи» — план продаж в литрах в месяц; каждая строка задаёт новый уровень с указанного месяца.',
    '«По дням» — подневные остатки денег и склада (значения, не формулы). «Журнал» — что и когда меняли в игре.',
    'ЦВЕТА', 'Жёлтое — ввод. Белое — формулы. Зелёное — итоги. Любую белую ячейку в таблице по месяцам можно перебить фактом.',
    'ГЛАВНЫЕ СТРОКИ', '«Инвестор вносит в этом месяце — план»: сколько внести, чтобы на счёте остался неснижаемый остаток. Столбец «Итого» — общая сумма.',
    '«Накопленный денежный поток (без денег инвестора)»: сколько проект заработал или потратил с первого дня. Стал ≥ 0 — проект окупился.',
    '«Склад готовой воды»: разлито минус продано. Растёт — производим больше, чем продаём.',
    '«Запас на складе и в пути» по крышкам, преформам, этикеткам, паллетам и стрейч-плёнке: не должен уходить в минус.', 'Бутылок на паллете считается из размеров бутылки, упаковки и ограничений паллеты по высоте и весу — блок «Паллеты и размеры бутылок».',
    'УПРОЩЕНИЯ', 'Материалы списываются в расходы при розливе, деньги за них уходят при оплате партии. Амортизации нет — считаем деньги.',
    'Взносы на зарплату — одним коэффициентом. НДС 5 % после 20 млн ₽ поступлений с начала года. УСН 5 % от прибыли месяца, минимум 1 % поступлений.'
  ];
  g.Xls = { build };
})(typeof window !== 'undefined' ? window : globalThis);

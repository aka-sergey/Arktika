/* PDF-презентация сценария: 8 слайдов 16:9. Рисуется библиотекой jsPDF прямо в браузере, шрифт Golos Text встроен (pdffont.js).
   Вход — готовые числа из расчёта (см. presData в ui.js); здесь только вёрстка. */
(function (g) {
  'use strict';
  const W = 960, H = 540, MX = 48;
  const C = { ink: '#0B0E11', muted: '#5B6472', line: '#D5DAE2', soft: '#EDEFF3', bg: '#FFFFFF', brand: '#0A7A54', brandSoft: '#DAF2E8', red: '#C01F38', redSoft: '#FBE0E4', blue: '#2E75B6', bar: '#A9C4D4', green2: '#8FCDB3', amber: '#C2570A' };
  const nf0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }), nf1 = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const clean = t => String(t).replace(/[   ]/g, ' ').replace(/(^|[\s(])-(?=\d)/g, '$1−').replace(/≈ ?/g, 'около ');
  const mln = v => clean(nf1.format(v / 1e6)) + ' млн ₽', rub = v => clean(nf0.format(Math.round(v))) + ' ₽', pct = v => clean(nf1.format(v * 100)) + ' %', num1 = v => clean(nf1.format(v));

  function build(JsPDF, font, d) {
    const doc = new JsPDF({ orientation: 'landscape', unit: 'pt', format: [W, H], compress: true });
    doc.addFileToVFS('GolosText-Regular.ttf', font.r); doc.addFont('GolosText-Regular.ttf', 'Golos', 'normal');
    doc.addFileToVFS('GolosText-SemiBold.ttf', font.b); doc.addFont('GolosText-SemiBold.ttf', 'Golos', 'bold');
    doc.setProperties({ title: 'АРКТИКА — завод воды. Сценарий «' + d.name + '»', subject: 'Финансовая модель на 5 лет', creator: 'АРКТИКА · бизнес-игра' });
    doc.setLineJoin('round'); doc.setLineCap('round');
    const TOTAL = 8; let page = 0;

    // --- примитивы
    const T = (t, x, y, o) => { o = o || {}; doc.setFont('Golos', o.bold ? 'bold' : 'normal'); doc.setFontSize(o.size || 12); doc.setTextColor(o.color || C.ink); doc.text(clean(t), x, y, { align: o.align || 'left' }); };
    const tw = (t, size, bold) => { doc.setFont('Golos', bold ? 'bold' : 'normal'); doc.setFontSize(size); return doc.getTextWidth(clean(t)); };
    const wrap = (t, w, size, bold) => { doc.setFont('Golos', bold ? 'bold' : 'normal'); doc.setFontSize(size); return doc.splitTextToSize(clean(t), w); };
    const P = (t, x, y, w, o) => { o = o || {}; const size = o.size || 12, lh = o.lh || size * 1.4, ls = wrap(t, w, size, o.bold); ls.forEach((l, i) => T(l, x, y + i * lh, o)); return y + ls.length * lh; };
    const fit = (t, w, size, bold) => { let s = clean(t); if (tw(s, size, bold) <= w) return s; while (s.length > 3 && tw(s + '…', size, bold) > w) s = s.slice(0, -1); return s.replace(/[\s,:;(—]+$/, '') + '…'; };
    const box = (x, y, w, h, fill, r) => { doc.setFillColor(fill); if (r) doc.roundedRect(x, y, w, h, r, r, 'F'); else doc.rect(x, y, w, h, 'F'); };
    const ln = (x1, y1, x2, y2, col, lw, dash) => { doc.setDrawColor(col || C.line); doc.setLineWidth(lw || 0.75); doc.setLineDashPattern(dash || [], 0); doc.line(x1, y1, x2, y2); doc.setLineDashPattern([], 0); };
    const poly = (pts, col, lw, fill) => { if (pts.length < 2) return; const rel = []; for (let i = 1; i < pts.length; i++) rel.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
      if (fill) { doc.setFillColor(fill); doc.lines(rel, pts[0][0], pts[0][1], [1, 1], 'F', true); } else { doc.setDrawColor(col); doc.setLineWidth(lw || 2); doc.lines(rel, pts[0][0], pts[0][1], [1, 1], 'S', false); } };

    function slide(title, sub) {
      if (page) doc.addPage([W, H], 'landscape'); page++;
      box(0, 0, W, H, C.bg); box(0, 0, W, 6, C.brand);
      T(title, MX, 58, { size: 26, bold: true }); if (sub) T(sub, MX, 80, { size: 12.5, color: C.muted });
      ln(MX, H - 34, W - MX, H - 34, C.line, 0.5);
      T(fit('АРКТИКА — завод воды. Сценарий «' + d.name + '»', W - 2 * MX - 60, 9.5), MX, H - 19, { size: 9.5, color: C.muted }); T(page + ' / ' + TOTAL, W - MX, H - 19, { size: 9.5, color: C.muted, align: 'right' });
    }
    // плашки с цифрами в ряд
    function stats(items, x, y, w, h) { const gap = 12, cw = (w - gap * (items.length - 1)) / items.length;
      items.forEach((it, i) => { const cx = x + i * (cw + gap); box(cx, y, cw, h, C.soft, 6); T(fit(it[0], cw - 24, 10.5), cx + 12, y + 20, { size: 10.5, color: C.muted }); T(fit(it[1], cw - 24, 19, true), cx + 12, y + 45, { size: 19, bold: true, color: it[3] || C.ink }); if (it[2]) T(fit(it[2], cw - 24, 10), cx + 12, y + 61, { size: 10, color: C.muted }); }); }
    // «красивая» шкала
    function scale(lo, hi) { if (hi - lo < 1) { hi = lo + 1; } const span = hi - lo, raw = span / 5, p10 = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(q => q * p10).find(q => q >= raw) || 10 * p10;
      const a = Math.floor(lo / st) * st, b = Math.ceil(hi / st) * st, ticks = []; for (let v = a; v <= b + st / 2; v += st) ticks.push(Math.abs(v) < st / 1e6 ? 0 : v); return { a, b, ticks, st }; }
    /* график по месяцам или по годам: столбики и линии на одной шкале, млн ₽ */
    function chart(x, y, w, h, o) {
      const L = 46, B = 26, Tp = 26, px = x + L, py = y + Tp, pw = w - L - 6, ph = h - Tp - B, n = o.n;
      let lo = 0, hi = 0; (o.bars || []).concat(o.lines || []).forEach(sr => sr.data.forEach(v => { if (v < lo) lo = v; if (v > hi) hi = v; }));
      const sc = scale(lo / 1e6, hi / 1e6), Y = v => py + ph - (v / 1e6 - sc.a) / (sc.b - sc.a) * ph, step = pw / n, X = i => px + step * (i + 0.5);
      // легенда
      let lx = px; (o.bars || []).map(sr => [sr, 0]).concat((o.lines || []).map(sr => [sr, 1])).forEach(a => { const sr = a[0]; if (a[1]) ln(lx, y + 9, lx + 16, y + 9, sr.color, 2.5); else box(lx + 2, y + 4, 11, 10, sr.color, 1.5); T(sr.name, lx + 21, y + 13, { size: 10, color: C.muted }); lx += 21 + tw(sr.name, 10) + 18; });
      T('млн ₽', x + L - 8, y + 13, { size: 9, color: C.muted, align: 'right' });
      // сетка
      const dec = sc.st < 1 ? (sc.st < 0.1 ? 2 : 1) : 0;
      sc.ticks.forEach(v => { const yy = Y(v * 1e6); ln(px, yy, px + pw, yy, v === 0 ? C.muted : C.line, v === 0 ? 0.9 : 0.5); T(clean(v.toFixed(dec).replace('.', ',')), px - 8, yy + 3.2, { size: 9, color: C.muted, align: 'right' }); });
      // подписи по оси
      if (o.years) o.years.forEach((yv, i) => T(String(yv), X(i), py + ph + 16, { size: 10.5, color: C.ink, align: 'center', bold: true }));
      else o.months.forEach((mm, i) => { if (mm.m === 0) { ln(px + step * i, py, px + step * i, py + ph + 5, C.line, 0.6); T(String(mm.y), X(i) + step * 5.5, py + ph + 16, { size: 10.5, bold: true, align: 'center' }); } });
      if (!o.years && o.months[0].m !== 0) T(String(o.months[0].y), px, py + ph + 16, { size: 10.5, bold: true, color: C.muted });
      if (o.area) { const sr = o.area, pts = sr.data.map((v, i) => [X(i), Y(Math.min(0, v))]); poly([[X(0), Y(0)]].concat(pts, [[X(n - 1), Y(0)]]), null, 0, C.redSoft); ln(px, Y(0), px + pw, Y(0), C.muted, 0.9); }
      // столбики
      const nb = (o.bars || []).length; (o.bars || []).forEach((sr, bi) => { const bw = o.years ? Math.min(34, step * 0.8 / nb) : Math.max(1.5, step * 0.62 / nb), off = (bi - (nb - 1) / 2) * (bw + (o.years ? 3 : 0));
        sr.data.forEach((v, i) => { const y0 = Y(0), y1 = Y(v); doc.setFillColor(v < 0 && sr.neg ? sr.neg : sr.color); doc.rect(X(i) + off - bw / 2, Math.min(y0, y1), bw, Math.max(0.6, Math.abs(y1 - y0)), 'F'); }); });
      (o.lines || []).forEach(sr => poly(sr.data.map((v, i) => [X(i), Y(v)]), sr.color, sr.w || 2.4));
      (o.marks || []).forEach(mk => { const mx = X(mk.i), my = Y(mk.v); doc.setFillColor(mk.color || C.brand); doc.circle(mx, my, 4.2, 'F'); doc.setFillColor('#FFFFFF'); doc.circle(mx, my, 1.7, 'F'); if (!mk.text) return;
        const wT = tw(mk.text, 10.5, true) + 14, right = mk.left ? mx - wT - 9 < px : mx + wT + 10 < px + pw, bx = right ? mx + 9 : mx - 9 - wT, by = mk.below ? my + 8 : my - 27; box(bx, by, wT, 18, mk.color || C.brand, 4); T(mk.text, bx + 7, by + 12.6, { size: 10.5, bold: true, color: '#FFFFFF' }); });
    }
    /* таблица: cols = [{t, w, a}], rows = [{c:[...], kind}] */
    function table(x, y, cols, rows, o) { o = o || {}; const rh = o.rh || 24, size = o.size || 11, wAll = cols.reduce((q, c) => q + c.w, 0); let cy = y;
      box(x, cy, wAll, rh, C.soft); let cx = x; cols.forEach(c => { T(c.t, c.a === 'r' ? cx + c.w - 8 : cx + 8, cy + rh / 2 + 3.6, { size: size - 1, color: C.muted, align: c.a === 'r' ? 'right' : 'left', bold: true }); cx += c.w; }); cy += rh;
      rows.forEach(r => { if (r.kind === 'total') box(x, cy, wAll, rh, C.brandSoft); if (r.kind === 'hl') box(x, cy, wAll, rh, '#F3FAF7'); cx = x;
        cols.forEach((c, i) => { const bold = r.kind === 'total' || r.kind === 'head' || (r.bold && i === 0), pad = 8 + (i === 0 ? (r.indent || 0) : 0), col = r.kind === 'sub' && i > 0 ? C.muted : (r.color && i > 0 ? r.color : C.ink);
          T(fit(r.c[i], c.w - pad - 8, size, bold), c.a === 'r' ? cx + c.w - 8 : cx + pad, cy + rh / 2 + 3.8, { size, bold, color: i === 0 && r.kind === 'sub' ? C.ink : col, align: c.a === 'r' ? 'right' : 'left' }); cx += c.w; });
        ln(x, cy + rh, x + wAll, cy + rh, C.line, 0.4); cy += rh; });
      return cy; }

    const k = d.k, mm = d.months, n = mm.length;

    /* 1. Титул */
    page = 1; box(0, 0, W, H, C.bg); box(600, 0, 360, H, C.brand);
    T('АРКТИКА', MX, 190, { size: 64, bold: true }); T('Завод по очистке и розливу воды, Иваново', MX, 226, { size: 19 });
    box(MX, 252, 56, 4, C.brand);
    T('Финансовая модель на 5 лет', MX, 290, { size: 14, color: C.muted }); T(d.period, MX, 310, { size: 14, color: C.muted });
    T(fit('Сценарий «' + d.name + '»', 500, 16, true), MX, 420, { size: 16, bold: true }); T('Сформировано ' + d.today, MX, 442, { size: 11.5, color: C.muted });
    [['Вносит инвестор', mln(k.invest), k.lastInv ? 'последний взнос — ' + k.lastInv : 'взносы не нужны'],
      ['Окупаемость', k.pbN ? 'на ' + k.pbN + '-м месяце' : 'не за 5 лет', k.pbN ? k.pbLabel : (k.pbEst ? 'по текущему темпу — ' + k.pbEst : 'проект не выходит в плюс')],
      ['IRR за 5 лет', k.irr === null ? 'нет' : pct(k.irr), k.irr === null ? 'поток не выходит в плюс' : 'годовых']].forEach((a, i) => { const y = 120 + i * 130;
      T(a[0], 640, y, { size: 13, color: '#BFE6D6' }); T(fit(a[1], 280, 34, true), 640, y + 40, { size: 34, bold: true, color: '#FFFFFF' }); T(a[2], 640, y + 62, { size: 12.5, color: '#BFE6D6' }); if (i < 2) ln(640, y + 86, 912, y + 86, '#3C9C7C', 0.6); });

    /* 2. Итог в цифрах */
    slide('Итог в цифрах', 'Расчёт на 60 месяцев: ' + d.period);
    const tiles = [['Вносит инвестор', mln(k.invest), k.lastInv ? 'последний взнос — ' + k.lastInv : 'взносы не нужны'],
      ['Окупаемость', k.pbN ? 'на ' + k.pbN + '-м месяце' : 'не за 5 лет', k.pbN ? k.pbLabel + ' — накопленный поток выходит в плюс' : (k.pbEst ? 'по текущему темпу — ' + k.pbEst : 'проект не выходит в плюс')],
      ['IRR проекта за 5 лет', k.irr === null ? 'нет' : pct(k.irr), 'годовых, по денежному потоку всех 60 месяцев'],
      ['Прибыль за 5 лет', mln(k.profit), 'после налогов'], ['EBITDA за 5 лет', mln(k.ebitda), 'маржа ' + pct(k.ebm) + ' к выручке без НДС'], ['Минимум на счёте', mln(k.minCash), k.minCashDate]];
    { const gx = 16, gy = 16, tw_ = (W - 2 * MX - 2 * gx) / 3, th = 132;
      tiles.forEach((a, i) => { const x = MX + (i % 3) * (tw_ + gx), y = 104 + Math.floor(i / 3) * (th + gy); box(x, y, tw_, th, i === 1 ? C.brandSoft : C.soft, 8);
        T(a[0], x + 18, y + 30, { size: 12.5, color: C.muted }); T(fit(a[1], tw_ - 36, 31, true), x + 18, y + 76, { size: 31, bold: true, color: i === 1 && k.pbN ? C.brand : (a[1].charAt(0) === '−' ? C.red : C.ink) }); P(a[2], x + 18, y + 100, tw_ - 36, { size: 11, color: C.muted, lh: 14 }); }); }
    P(d.lead, MX, 426, W - 2 * MX, { size: 13.5, lh: 20 });

    /* 3. На что идут деньги инвестора */
    slide('На что идут деньги инвестора', d.inv.length ? 'Срок — пока инвестор вносит деньги: по ' + k.lastInv : '');
    if (d.inv.length) {
      const rows = d.inv.map(r => ({ c: [r[0].replace(/^Прочее: .*депозит$/, 'Прочее: пресс-формы, техника, разрешения').replace(/^Прочее: аренда.*$/, 'Прочее: аренда, энергия, маркетинг, налоги и другое'), rub(r[1]), k.invest > 0 ? pct(r[1] / k.invest) : ''], kind: r[2] === 0 ? 'total' : r[2] === 1 ? 'head' : 'sub', indent: r[2] === 2 ? 16 : 0 }));
      const rh = Math.min(26, 360 / (rows.length + 1));
      table(MX, 100, [{ t: 'Статья', w: 384 }, { t: 'Сумма', w: 120, a: 'r' }, { t: 'Доля', w: 60, a: 'r' }], rows, { rh, size: rh < 22 ? 10 : 11 });
      // справа — три части одной полосой
      const sx = 640, sw = 272, parts = d.inv.filter(r => r[2] === 1 && r[1] > 0), tot = parts.reduce((q, r) => q + r[1], 0), cols = [C.amber, C.blue, C.green2, C.muted];
      T('Из чего складываются взносы', sx, 116, { size: 12.5, bold: true }); let bx = sx;
      parts.forEach((r, i) => { const w = sw * r[1] / tot; box(bx, 130, Math.max(1, w - 2), 30, cols[i % 4], 3); bx += w; });
      let ly = 188; parts.forEach((r, i) => { box(sx, ly - 9, 11, 11, cols[i % 4], 2); T(pct(r[1] / k.invest), sx + 20, ly, { size: 15, bold: true }); T(mln(r[1]), sx + sw, ly, { size: 12, color: C.muted, align: 'right' });
        ly = P(r[0].replace(' до самоокупаемости', '').replace(/ на конец .*/, ''), sx + 20, ly + 16, sw - 20, { size: 11, color: C.muted, lh: 14 }) + 14; });
      P(d.invNote, sx, Math.max(ly + 4, 360), sw, { size: 10.5, color: C.muted, lh: 14.5 });
    } else P('В этом сценарии взносы инвестора не нужны: проект с первого месяца покрывает расходы сам.', MX, 130, 600, { size: 14 });

    /* 4. Окупаемость */
    slide('Окупаемость', 'Накопленный денежный поток без денег инвестора: пересёк ноль — вложения вернулись');
    let low = 0; d.s.cum.forEach((v, i) => { if (v < d.s.cum[low]) low = i; });
    stats([['Окупаемость', k.pbN ? k.pbLabel : 'не за 5 лет', k.pbN ? 'на ' + k.pbN + '-м месяце из 60' : (k.pbEst ? 'по текущему темпу — ' + k.pbEst : ''), k.pbN ? C.brand : C.red],
      ['Самая глубокая точка', mln(d.s.cum[low]), mm[low].label], ['Накопленный поток за 5 лет', (k.cumEnd > 0 ? '+' : '') + mln(k.cumEnd), 'на конец ' + mm[n - 1].label, k.cumEnd < 0 ? C.red : C.ink], ['Вносит инвестор', mln(k.invest), k.lastInv ? 'последний взнос — ' + k.lastInv : '']], MX, 96, W - 2 * MX, 72);
    chart(MX, 182, W - 2 * MX, 314, { n, months: mm, area: { data: d.s.cum }, bars: [{ name: 'Денежный поток за месяц', data: d.s.cf, color: C.bar }], lines: [{ name: 'Накопленный денежный поток', data: d.s.cum, color: C.brand, w: 2.8 }],
      marks: [{ i: low, v: d.s.cum[low], color: C.red }].concat(k.pbN ? [{ i: k.pbN - 1, v: d.s.cum[k.pbN - 1], text: 'окупаемость: ' + k.pbLabel, left: true }] : []) });

    /* 5. Деньги на счёте и взносы */
    slide('Деньги на счёте и взносы инвестора', 'Инвестор вносит ровно столько, чтобы на счёте оставался неснижаемый остаток');
    stats([['Вносит инвестор', mln(k.invest), k.lastInv ? 'последний взнос — ' + k.lastInv : 'взносы не нужны'], ['Минимум на счёте', mln(k.minCash), k.minCashDate, k.minCash < 0 ? C.red : C.ink],
      ['Деньги на счёте в конце', mln(k.cashEnd), mm[n - 1].label], ['Возвращено инвестору', mln(k.payout), k.payout > 0 ? 'за 5 лет' : 'возврат в модели выключен']], MX, 96, W - 2 * MX, 72);
    chart(MX, 182, W - 2 * MX, 314, { n, months: mm, bars: [], lines: [{ name: 'Внесено инвестором накопленно', data: d.s.invCum, color: C.red }, { name: 'Деньги на счёте на конец месяца', data: d.s.cash, color: C.blue }] });

    /* 6. Выручка, расходы, EBITDA */
    slide('Выручка, расходы и EBITDA', 'По месяцам. EBITDA — выручка без НДС минус операционные расходы, до налога УСН');
    stats([['Выручка без НДС за 5 лет', mln(k.rev), ''], ['EBITDA за 5 лет', mln(k.ebitda), 'маржа ' + pct(k.ebm), k.ebitda < 0 ? C.red : C.ink], ['EBITDA в плюсе', k.ebLabel || 'не за 5 лет', k.ebLabel ? 'с этого месяца' : ''], ['Прибыль за 5 лет', mln(k.profit), 'после налогов', k.profit < 0 ? C.red : C.ink]], MX, 96, W - 2 * MX, 72);
    chart(MX, 182, W - 2 * MX, 314, { n, months: mm, bars: [{ name: 'EBITDA', data: d.s.ebitda, color: C.green2, neg: '#E8A2AD' }], lines: [{ name: 'Выручка без НДС', data: d.s.rev, color: C.brand }, { name: 'Операционные расходы', data: d.s.opex, color: C.red }] });

    /* 7. По годам */
    slide('По годам', '2026 год — два месяца (ноябрь и декабрь), 2031 — десять (по октябрь)');
    { const sg = v => mln(v), yr = d.years, rows = yr.map(y => ({ c: [String(y[0]) + (k.pbYear === y[0] ? '  — окупаемость' : ''), String(y[1]), sg(y[2]), sg(y[3]), y[2] > 0 ? pct(y[4]) : '—', sg(y[5]), sg(y[6]), sg(y[7])], bold: true, kind: k.pbYear === y[0] ? 'hl' : '' }));
      rows.push({ c: ['Итого', String(n), sg(k.rev), sg(k.ebitda), pct(k.ebm), sg(k.profit), sg(k.cumEnd), sg(k.cumEnd)], kind: 'total' });
      const yEnd = table(MX, 96, [{ t: 'Год', w: 150 }, { t: 'Месяцев', w: 70, a: 'r' }, { t: 'Выручка без НДС', w: 122, a: 'r' }, { t: 'EBITDA', w: 110, a: 'r' }, { t: 'Маржа', w: 70, a: 'r' }, { t: 'Прибыль после налогов', w: 132, a: 'r' }, { t: 'Денежный поток', w: 106, a: 'r' }, { t: 'Накопленный поток', w: 104, a: 'r' }], rows, { rh: 22, size: 10.5 });
      chart(MX, yEnd + 14, W - 2 * MX, H - 40 - yEnd - 18, { n: yr.length, years: yr.map(y => y[0]), bars: [{ name: 'EBITDA', data: yr.map(y => y[3]), color: C.green2 }, { name: 'Прибыль после налогов', data: yr.map(y => y[5]), color: C.brand }, { name: 'Денежный поток', data: yr.map(y => y[6]), color: C.blue }], lines: [] }); }

    /* 8. Допущения */
    slide('На чём стоит расчёт', 'Главные допущения сценария. Полный список — в файле Excel');
    { const colW = (W - 2 * MX - 2 * 28) / 3, ys = [98, 98, 98], bottom = H - 42;
      d.assume.forEach(gp => { const ci = gp.col, x = MX + ci * (colW + 28); let y = ys[ci]; if (y + 60 > bottom) return;
        T(gp.title, x, y + 12, { size: 13, bold: true, color: C.brand }); ln(x, y + 20, x + colW, y + 20, C.brand, 1); y += 39;
        gp.rows.forEach(r => { const ls = wrap(r[1], colW, 11.5, true).slice(0, 2); if (y + 15 * ls.length > bottom) return; T(fit(r[0], colW, 10), x, y, { size: 10, color: C.muted }); ls.forEach((l, i) => T(l, x, y + 15 + i * 14.5, { size: 11.5, bold: true })); y += 15 + ls.length * 14.5 + 6.5; }); ys[ci] = y + 10; }); }
    return doc;
  }
  g.Pres = { build };
})(typeof window !== 'undefined' ? window : globalThis);

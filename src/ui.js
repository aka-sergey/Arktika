/* ===== ЭКРАН ИГРЫ ===== */
(function () {
  const S = window.Sim, Meta = window.Meta, N = S.N, MONTHS = S.MONTHS, DAYS = S.DAYS;
  const $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const nf0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }), nf1 = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const rub = v => nf0.format(Math.round(v)) + ' ₽', mln = v => nf1.format(v / 1e6) + ' млн ₽', pcs = v => nf0.format(Math.round(v));
  const short = v => { const a = Math.abs(v); return a >= 1e6 ? nf1.format(v / 1e6) + ' млн' : a >= 1e4 ? nf0.format(v / 1e3) + ' тыс.' : nf0.format(v); };
  const trim = (v, d) => String(+(+v).toFixed(d)).replace('.', ',');
  const show = (v, f) => v == null || v === '' ? '' : f === 'pct' ? trim(v * 100, 2) : f === 'pct1' ? trim(v * 100, 3) : (f === 'money' || f === 'int') ? nf0.format(v) : f === 'dec1' ? trim(v, 2) : f === 'dec2' ? trim(v, 3) : f === 'dec3' ? trim(v, 4) : String(v);
  const parse = (t, f) => { let x = parseFloat(String(t).replace(/[\s  ₽%]/g, '').replace(',', '.')); if (!isFinite(x)) return null; if (f === 'pct' || f === 'pct1') x /= 100; if (f === 'int' || f === 'month') x = Math.round(x); return x; };
  const mLabel = i => i >= 1 && i <= N ? MONTHS[i - 1].label : (() => { const d = new Date(Date.UTC(2026, 10 + i - 1, 1)); return S.MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); })();
  const disp = (v, f) => f === 'month' ? mLabel(v) : (f === 'pct' || f === 'pct1') ? show(v, f) + ' %' : f === 'money' ? rub(v) : f === 'bool' ? (v ? 'да' : 'нет') : f === 'group' ? (v === 'office' ? 'офис' : 'производство') : show(v, f);
  const newId = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const stamp = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return z(d.getDate()) + '.' + z(d.getMonth() + 1) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()); };

  /* ---------- тема: тёмная по умолчанию, выбор запоминается в браузере ---------- */
  const TKEY = 'vodaGame.theme'; let theme = 'dark';
  try { const t = localStorage.getItem(TKEY); if (t === 'light' || t === 'dark') theme = t; } catch (e) { }
  const ICON = { dark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/></svg>', light: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.2A8 8 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2z"/></svg>' };
  function applyTheme() { document.documentElement.setAttribute('data-theme', theme); const b = $('b-theme'); if (b) { b.innerHTML = ICON[theme]; b.setAttribute('aria-label', theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'); b.title = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'; } }
  applyTheme();
  /* ---------- состояние ---------- */
  const LS = 'vodaGame.v1', BASE_S = S.defaults(), BASE = S.sim(BASE_S);
  let st = { s: clone(BASE_S), journal: [], saved: {}, best: null, tab: 'charts', zoom: 'm', lev: {} }, undo = [];
  function migrate(s) { // сценарии, сохранённые прежней версией игры, приводим к новой структуре
    const old = s.p || {};
    if (!s.utypes) { s.utypes = clone(BASE_S.utypes); if (old.units0 != null) s.utypes[0].start = old.units0; if (old.l_unit) s.utypes[0].l = old.l_unit; if (old.unit_price) s.utypes[0].price = old.unit_price;
      (s.batches || []).forEach(b => { if (b.type) return; if (b.l === s.utypes[0].l) b.type = 'A'; else { b.type = 'B'; if (b.l) s.utypes[1].l = b.l; if (b.price) s.utypes[1].price = b.price; } delete b.l; delete b.price; }); }
    s.batches = s.batches || []; s.p = Object.assign({}, BASE_S.p, old); ['units0', 'l_unit', 'unit_price'].forEach(k => { delete s.p[k]; });
    BASE_S.mats.forEach(mt => { const x = s.mats.find(z => z.key === mt.key); if (!x) s.mats.push(clone(mt)); else if (!x.unit) x.unit = mt.unit; });
    const big = s.capex.findIndex(c => /^Ремонт, электрика/.test(c.name) && c.amount === 9620000);
    if (big >= 0) { const det = BASE_S.capex.filter(c => ['Ремонт', 'Оборудование', 'Техника и мебель', 'Разрешения и бренд'].includes(c.cat) || /Спецодежда|Бренд-стойки|преформы у литейщика/.test(c.name)).map(c => Object.assign(clone(c), { id: newId() })); s.capex.splice(big, 1, ...det); }
    s.capex.forEach(c => { if (!c.cat) { const b = BASE_S.capex.find(z => z.name === c.name); c.cat = b ? b.cat : /Лини/.test(c.name) ? 'Линии' : /Установк/.test(c.name) ? 'Установки очистки' : /Пресс-форма/.test(c.name) ? 'Пресс-формы' : 'Прочее'; } });
    return s;
  }
  try { const o = JSON.parse(localStorage.getItem(LS) || 'null'); if (o && o.s && o.s.p && o.s.staff && o.s.capex && o.s.mats) { Object.assign(st, o); migrate(st.s); Object.keys(st.saved || {}).forEach(n => migrate(st.saved[n])); } } catch (e) { st.s = clone(BASE_S); }
  let res = S.sim(st.s);
  const persist = () => { try { localStorage.setItem(LS, JSON.stringify({ s: st.s, journal: st.journal.slice(0, 200), saved: st.saved, best: st.best, tab: st.tab, zoom: st.zoom, lev: st.lev })); } catch (e) { } };
  function act(text, fn) {
    const before = res.k; undo.push(JSON.stringify({ s: st.s, journal: st.journal })); if (undo.length > 60) undo.shift();
    fn(st.s); res = S.sim(st.s);
    st.journal.unshift({ t: stamp(), text, dInv: res.k.invest - before.invest, dPb: (res.k.paybackEst && before.paybackEst) ? res.k.paybackEst - before.paybackEst : 0, pbNow: res.k.paybackEst, pbWas: before.paybackEst });
    afterChange();
  }
  function afterChange() {
    if (res.k.paybackM > 0 && res.alerts.every(a => a.lvl !== 'err') && (!st.best || res.k.invest < st.best.invest - 1)) st.best = { invest: res.k.invest, name: st.s.name, pb: res.k.paybackM };
    persist(); setTimeout(rerender, 0);
  }
  function rerender() { const a = document.activeElement, fid = a && a.id; render(); if (fid) { const e = $(fid); if (e && e.focus) e.focus(); } }
  let toastT = 0; const toast = t => { const e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { e.hidden = true; }, 3600); };

  /* ---------- цвета «тепловой карты»: зелёный → жёлтый → красный ---------- */
  const HG = [22, 199, 132], HY = [240, 185, 11], HR = [234, 57, 67], HNeutral = () => theme === 'light' ? [212, 217, 225] : [38, 45, 56];
  const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t)), rgb = c => 'rgb(' + c.join(',') + ')';
  const heatC = t => { t = clamp(t, 0, 1); return t < 0.5 ? mix(HG, HY, t * 2) : mix(HY, HR, (t - 0.5) * 2); }, heat = t => rgb(heatC(t));
  const inkOn = c => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) > 120 ? '#0B0E11' : '#FFFFFF';
  /* ---------- табло ---------- */
  function renderScore() {
    const k = res.k, b = BASE.k;
    const dInv = k.invest - b.invest, dPb = (k.paybackEst && b.paybackEst) ? k.paybackEst - b.paybackEst : 0;
    const back = k.invest > 0 ? clamp((k.cashEnd + k.payout) / k.invest, 0, 1) : 1;
    let status;
    if (k.paybackM) status = 'Цель достигнута: проект окупается в ' + mLabel(k.paybackM) + ' — это месяц ' + k.paybackM + ' из ' + N + '. Теперь снижайте бюджет.';
    else status = 'Пока не окупается: к декабрю 2028 не хватает ' + mln(-k.cumEnd) + (k.paybackEst ? '. По текущему темпу — ' + mLabel(k.paybackEst) + '.' : '. Проект не выходит в плюс.');
    const d = (v, good, txt) => `<span class="delta ${Math.abs(v) < 1e-9 ? '' : good ? 'good' : 'bad'}">${txt}</span>`;
    const md = dInv === 0 ? 'как в базе' : (dInv > 0 ? '+' : '−') + mln(Math.abs(dInv)).replace(' ₽', '') + ' к базе';
    const pd = !dPb ? (k.paybackEst ? 'как в базе' : '') : (dPb < 0 ? 'на ' + (-dPb) + ' мес. раньше базы' : 'на ' + dPb + ' мес. позже базы');
    $('score').innerHTML = `
      <div class="goal ${k.paybackM ? 'ok' : ''}"><span class="eyebrow">Цель игры</span><b>Окупиться до декабря 2028 с минимальным бюджетом</b><span class="verdict"><i class="led"></i>${k.paybackM ? 'Цель достигнута' : 'Не окупается'}</span><span class="status">${esc(status)}</span>
        <div class="debt" title="Деньги на счёте в конце 2028 плюс выплаты инвестору — к сумме вложений"><i style="width:${(back * 100).toFixed(1)}%;background:${heat(1 - back)}"></i></div>
        <span class="status">К концу 2028 проект возвращает ${Math.round(back * 100)} % вложенного${k.payout > 0 ? ' · инвестору выплачено ' + mln(k.payout) : ''}</span></div>
      <div class="metric"><span class="lab">Вносит инвестор</span><span class="val">${nf1.format(k.invest / 1e6)} <small>млн ₽</small></span>${d(dInv, dInv < 0, md)}</div>
      <div class="metric"><span class="lab">Окупаемость</span><span class="val">${k.paybackM ? esc(mLabel(k.paybackM)) : k.paybackEst ? '≈ ' + esc(mLabel(k.paybackEst)) : 'нет'}</span>${d(dPb, dPb < 0, pd || (k.paybackM ? '' : 'за пределами 26 месяцев'))}</div>
      <div class="metric"><span class="lab">Минимум на счёте</span><span class="val">${short(k.minCash)} <small>₽</small></span>${d(k.minCash < 0 ? 1 : 0, false, esc(S.dateOf(k.minCashDay).text))}</div>
      <div class="metric"><span class="lab">Прибыль за 2028</span><span class="val">${nf1.format(k.profit28 / 1e6)} <small>млн ₽</small></span>${d(k.profit28 - b.profit28, k.profit28 > b.profit28, Math.abs(k.profit28 - b.profit28) < 1 ? 'как в базе' : (k.profit28 > b.profit28 ? '+' : '−') + mln(Math.abs(k.profit28 - b.profit28)).replace(' ₽', '') + ' к базе')}</div>`;
    const ms = [
      ['Окупиться за 26 месяцев', k.paybackM > 0], ['Бюджет ниже базового', k.invest < b.invest - 1], ['EBITDA в плюсе в первые 3 месяца продаж', k.ebitdaM > 0 && k.ebitdaM <= st.s.p.start_m + 2],
      ['Склад материалов без дефицита', !res.alerts.some(a => a.lvl === 'err' && /закончились/.test(a.text))], ['Без кассовых разрывов', k.minCash >= 0],
      ['Продано всё по плану', k.lostL <= 1], ['Линия успевает', k.maxUtil <= 1.0001], ['Инвестору возвращено всё вложенное', k.payout >= k.invest && k.invest > 0]];
    $('missions').innerHTML = ms.map(a => `<span class="chip ${a[1] ? 'done' : ''}"><i>${a[1] ? '✓' : ''}</i>${esc(a[0])}</span>`).join('') +
      (st.best ? `<span class="chip record"><i>★</i>Рекорд: ${mln(st.best.invest)} при окупаемости в ${esc(mLabel(st.best.pb))} («${esc(st.best.name)}»)</span>` : '');
    $('alerts').innerHTML = res.alerts.map(a => `<div class="alert ${a.lvl === 'err' ? 'err' : ''}"><b>${a.lvl === 'err' ? 'Ошибка' : 'Внимание'}</b><span>${esc(a.text)}</span></div>`).join('');
  }

  /* ---------- лента времени ---------- */
  let PPD = 1, curDay = null, evByDay = {}, playT = 0, drag = null, LAY = [];
  function stepPath(arr, y0, h, mn, mx, close) {
    const sy = v => (y0 + h - (v - mn) / ((mx - mn) || 1) * h).toFixed(1); let d = '', last = null;
    for (let i = 0; i < arr.length; i++) { const y = sy(arr[i]); if (y !== last) { d += (d ? 'L' : 'M') + (i * PPD).toFixed(1) + ',' + (last === null ? y : last) + 'L' + (i * PPD).toFixed(1) + ',' + y; last = y; } }
    d += 'L' + (arr.length * PPD).toFixed(1) + ',' + last;
    if (close) { const b = sy(Math.max(mn, 0)); d += 'L' + (arr.length * PPD).toFixed(1) + ',' + b + 'L0,' + b + 'Z'; }
    return d;
  }
  const amax = a => { let m = -Infinity; for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i]; return m; }, amin = a => { let m = Infinity; for (let i = 0; i < a.length; i++) if (a[i] < m) m = a[i]; return m; };
  function renderTimeline() {
    const sc = $('tl-scroll'), avail = sc.clientWidth || 900, s = st.s, m = res.m, d = res.d;
    PPD = st.zoom === 'm' ? Math.max(1.45, avail / DAYS) : st.zoom === 'w' ? 7 : 24;
    const W = Math.ceil(DAYS * PPD), X = x => x * PPD;
    const lanes = [{ k: 'axis', h: 44 }, { k: 'cash', h: 104, t: 'Деньги на счёте', s: 'до ' + short(amax(d.cash)) + ' ₽' }, { k: 'pays', h: 56, t: 'Крупные платежи', s: 'техника и сырьё' }, { k: 'fg', h: 54, t: 'Готовая вода', s: 'до ' + short(amax(d.fg)) + ' бут.' }]
      .concat(s.mats.map((mt, q) => ({ k: 'mat', mt, h: q < 3 ? 54 : 40, t: mt.name, s: 'до ' + short(amax(d[mt.key])) + ' ' + (mt.unit || 'шт') })),
        [{ k: 'units', h: 52, t: 'Очистка воды', s: 'до ' + pcs(amax(m.startL.map((u, i) => u + m.newL[i]))) + ' л/сут' }, { k: 'staff', h: Math.max(40, s.staff.length * 15 + 8), t: 'Люди', s: 'до ' + res.k.headMax + ' чел.' }]);
    let y = 0; lanes.forEach(l => { l.y = y; y += l.h + 12; }); const H = y; LAY = lanes;
    const g = [];
    // сетка и ось
    MONTHS.forEach(mm => { const x = X(mm.d0).toFixed(1), yr = mm.m === 0 || mm.i === 1;
      g.push(`<line x1="${x}" x2="${x}" y1="${yr ? 0 : 18}" y2="${H}" stroke="var(--line)" stroke-width="${yr ? 1.4 : 0.7}"/>`);
      g.push(`<text x="${+x + 3}" y="13" class="${yr ? 't-ink t-b' : ''}">${st.zoom === 'm' ? mm.short + (yr ? ' ' + String(mm.y).slice(2) : '') : mm.label}</text>`); });
    if (st.zoom !== 'm') for (let x = 0; x < DAYS; x++) { const dt = S.dateOf(x); if (st.zoom === 'd') g.push(`<text x="${X(x) + PPD / 2}" y="27" text-anchor="middle" style="font-size:9px">${dt.dom}</text>`); else if ((x % 7) === 0) g.push(`<line x1="${X(x)}" x2="${X(x)}" y1="18" y2="24" stroke="var(--line)"/>`); }
    const dia = (day, col, title) => { const x = X(day) + PPD / 2, yy = 36; return `<path d="M${x},${yy - 6}l6,6l-6,6l-6,-6z" fill="${col}"><title>${esc(title)}</title></path>`; };
    g.push(dia(S.dayOf(s.p.start_m, 1), 'var(--amber)', 'Старт продаж: ' + mLabel(s.p.start_m)));
    if (res.k.ebitdaM) g.push(dia(S.dayOf(res.k.ebitdaM, 15), 'var(--brand)', 'EBITDA в плюсе с ' + mLabel(res.k.ebitdaM)));
    if (res.k.paybackM) g.push(dia(S.dayOf(res.k.paybackM, 28), 'var(--gold)', 'Окупаемость: ' + mLabel(res.k.paybackM)));
    evByDay = {}; res.ev.forEach(e => { (evByDay[e.day] = evByDay[e.day] || []).push(e); });
    res.arrivals.forEach(a => { (evByDay[a.day] = evByDay[a.day] || []).push({ kind: 'arr', label: a.name + ': пришла партия', qty: a.qty }); });
    lanes.forEach(l => {
      const y0 = l.y, h = l.h; if (l.k === 'axis') return;
      g.push(`<line x1="0" x2="${W}" y1="${y0 + h + 6}" y2="${y0 + h + 6}" stroke="var(--line)" stroke-width=".7"/>`);
      if (l.k === 'cash') {
        const mx = Math.max(1, amax(d.cash)), mn = Math.min(0, amin(d.cash)), top = y0 + 18, hh = h - 18;
        g.push(`<path d="${stepPath(d.cash, top, hh, mn, mx, true)}" fill="var(--brand-soft)" stroke="none"/><path d="${stepPath(d.cash, top, hh, mn, mx, false)}" fill="none" stroke="var(--brand)" stroke-width="1.6"/>`);
        if (mn < 0) { const zy = top + hh - (0 - mn) / (mx - mn) * hh; g.push(`<line x1="0" x2="${W}" y1="${zy}" y2="${zy}" stroke="var(--red)" stroke-dasharray="4 3"/>`); }
        res.ev.forEach(e => { const x = X(e.day) + PPD / 2;
          if (e.kind === 'invest') g.push(`<path d="M${x},${y0 + 3}l5,9h-10z" fill="var(--brand)"><title>Взнос инвестора ${rub(e.amt)}</title></path><text x="${x + 7}" y="${y0 + 12}" class="t-ink t-b">${nf1.format(e.amt / 1e6)}</text>`);
          if (e.kind === 'payout') g.push(`<path d="M${x},${y0 + 12}l5,-9h-10z" fill="var(--gold)"><title>Возврат инвестору ${rub(-e.amt)}</title></path>`); });
      }
      if (l.k === 'pays') {
        const big = res.ev.filter(e => e.kind === 'capex' || e.kind === 'buy'), mx = Math.max(1, ...big.map(e => -e.amt)), bw = clamp(PPD, 3, 10), seen = {};
        big.forEach(e => { const n = seen[e.day] = (seen[e.day] || 0) + 1, bh = Math.max(3, Math.sqrt(-e.amt / mx) * (h - 4)), x = X(e.day) + (PPD - bw) / 2 + (n - 1) * 3;
          const dr = e.kind === 'capex' && s.capex.some(c => c.id === e.ref) ? ` data-drag="capex:${e.ref}"` : '';
          g.push(`<rect x="${x.toFixed(1)}" y="${(y0 + h - bh).toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" rx="1.5" fill="${e.kind === 'capex' ? 'var(--accent)' : 'var(--water)'}"${dr}><title>${esc(e.label)} — ${rub(-e.amt)}${dr ? ' · потяните, чтобы перенести оплату' : ''}</title></rect>`); });
      }
      if (l.k === 'fg') { const mx = Math.max(1, amax(d.fg)); g.push(`<path d="${stepPath(d.fg, y0 + 4, h - 4, 0, mx, true)}" fill="var(--water-soft)"/><path d="${stepPath(d.fg, y0 + 4, h - 4, 0, mx, false)}" fill="none" stroke="var(--water)" stroke-width="1.4"/>`); }
      if (l.k === 'mat') { const a = d[l.mt.key], wy = d[l.mt.key + '_way'], mx = Math.max(1, amax(a), amax(wy)), mn = Math.min(0, amin(a));
        g.push(`<path d="${stepPath(a, y0 + 6, h - 6, mn, mx, true)}" fill="${mn < 0 ? 'var(--red-soft)' : 'var(--water-soft)'}"/><path d="${stepPath(a, y0 + 6, h - 6, mn, mx, false)}" fill="none" stroke="${mn < 0 ? 'var(--red)' : 'var(--water)'}" stroke-width="1.4"/>`);
        g.push(`<path d="${stepPath(wy, y0 + 6, h - 6, mn, mx, false)}" fill="none" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3"/>`);
        res.arrivals.forEach(ar => { if (ar.key === l.mt.key) g.push(`<circle cx="${X(ar.day) + PPD / 2}" cy="${y0 + 3}" r="2.6" fill="var(--water)"><title>${esc(ar.name)}: пришло ${pcs(ar.qty)} ${l.mt.unit || 'шт'}</title></circle>`); }); }
      if (l.k === 'units') { const v = m.startL.map((u, i) => u + m.newL[i]), mx = Math.max(1, amax(v)), dd = new Float64Array(DAYS); MONTHS.forEach((mm, i) => dd.fill(v[i], mm.d0, mm.d0 + mm.nd));
        g.push(`<path d="${stepPath(dd, y0 + 14, h - 14, 0, mx, true)}" fill="var(--brand-soft)"/><path d="${stepPath(dd, y0 + 14, h - 14, 0, mx, false)}" fill="none" stroke="var(--brand)" stroke-width="1.4"/>`);
        g.push(`<text x="${X(S.dayOf(s.p.start_m, 1)) + 4}" y="${y0 + h - 4}" class="t-ink">${esc(s.utypes.filter(u => u.start > 0).map(u => u.start + ' × ' + tShort(u)).join(' + ') || 'нет стартовых установок')}</text>`);
        const seenB = {}; s.batches.forEach(b => { const u = tOf(s, b.type), n = seenB[b.month] = (seenB[b.month] || 0) + 1, x = X(S.dayOf(clamp(b.month, 1, N), 1)) + (n - 1) * 24; g.push(`<g data-drag="batch:${b.id}"><circle cx="${x}" cy="${y0 + 12}" r="11" fill="var(--brand)"/><text x="${x}" y="${y0 + 15.5}" text-anchor="middle" class="t-on t-b" style="pointer-events:none">+${b.qty}</text><text x="${x + 14}" y="${y0 + 15.5}" class="t-ink" style="font-size:9.5px;pointer-events:none">${esc(tShort(u))}</text><title>Партия ${esc(u.name)}: ${b.qty} шт по ${u.l} л, запуск ${mLabel(b.month)} · потяните, чтобы перенести</title></g>`); }); }
      if (l.k === 'staff') s.staff.forEach((e, i) => { const x1 = X(MONTHS[clamp(e.from, 1, N) - 1].d0), mt = MONTHS[clamp(e.to, 1, N) - 1], x2 = X(mt.d0 + mt.nd), yy = y0 + 2 + i * 15, off = e.group === 'office';
        g.push(`<rect x="${x1}" y="${yy}" width="${Math.max(4, x2 - x1)}" height="11" rx="3" fill="${off ? 'var(--office-soft)' : 'var(--brand-soft)'}" stroke="${off ? 'var(--office)' : 'var(--brand)'}" stroke-width=".8" data-drag="staff:${e.id}:from"><title>${esc(e.name)} — ${rub(e.salary)} в месяц · потяните, чтобы сдвинуть выход</title></rect>`);
        g.push(`<rect x="${x2 - 6}" y="${yy}" width="6" height="11" rx="2" fill="${off ? 'var(--office)' : 'var(--brand)'}" data-drag="staff:${e.id}:to" style="cursor:ew-resize"><title>Потяните, чтобы изменить последний месяц работы</title></rect>`);
        g.push(`<text x="${x1 + 5}" y="${yy + 8.6}" class="t-ink" style="font-size:9.5px;pointer-events:none">${esc(e.name)}</text>`); });
    });
    g.push(`<line id="cur" x1="0" x2="0" y1="18" y2="${H}" stroke="var(--ink)" stroke-width="1" opacity="0" style="pointer-events:none"/>`);
    $('tl-svg').innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Лента времени: деньги, склад, мощность и люди по дням">${g.join('')}</svg>`;
    $('tl-labels').style.height = H + 'px';
    $('tl-labels').innerHTML = lanes.filter(l => l.t).map(l => `<div style="top:${l.y + 2}px"><b>${esc(l.t)}</b><span>${esc(l.s)}</span></div>`).join('');
    $('legend').innerHTML = [['var(--brand)', 'деньги, мощность, производство'], ['var(--accent)', 'платежи за оборудование'], ['var(--water)', 'вода и материалы на складе, оплата партий'], ['var(--office)', 'офис'], ['var(--amber)', '◆ старт продаж'], ['var(--brand)', '◆ EBITDA в плюсе'], ['var(--gold)', '◆ окупаемость, ▼ возврат инвестору']].map(a => `<span><i style="background:${a[0]}"></i>${a[1]}</span>`).join('') + '<span>▲ взнос инвестора, млн ₽ · пунктир — материалы в пути · всё с подсказкой можно тянуть мышью</span>';
    ['m', 'w', 'd'].forEach(z => $('z-' + z).setAttribute('aria-pressed', String(st.zoom === z)));
    const canScroll = W > avail + 2; $('b-left').hidden = $('b-right').hidden = !canScroll; $('tl-svg').classList.toggle('scrollable', canScroll);
    if (curDay != null) showTip(curDay);
  }
  function showTip(day, follow) {
    curDay = day; const cur = $('cur'), tip = $('tip'), sc = $('tl-scroll'); if (!cur) return;
    const x = day * PPD + PPD / 2; cur.setAttribute('x1', x); cur.setAttribute('x2', x); cur.setAttribute('opacity', '.55');
    const dt = S.dateOf(day), k = dt.i - 1, m = res.m, d = res.d;
    const evs = (evByDay[day] || []).map(e => `<li><span>${esc(e.label)}</span><span>${e.kind === 'arr' ? '+' + pcs(e.qty) + ' шт' : (e.amt > 0 ? '+' : '−') + short(Math.abs(e.amt)) + ' ₽'}</span></li>`).join('');
    tip.innerHTML = `<h4>${esc(dt.text)} · месяц ${dt.i}</h4><dl><dt>На счёте</dt><dd>${rub(d.cash[day])}</dd><dt>Готовая вода</dt><dd>${pcs(d.fg[day])} бут.</dd>` +
      st.s.mats.map(mt => `<dt>${esc(mt.name)}</dt><dd>${pcs(d[mt.key][day])}${d[mt.key + '_way'][day] > 0.5 ? ' <span style="color:var(--muted)">+' + short(d[mt.key + '_way'][day]) + ' в пути</span>' : ''}</dd>`).join('') +
      `<dt>Установки</dt><dd>${st.s.utypes.map(u => esc(tShort(u)) + ': ' + res.cnt[u.id][k]).join(' · ')}</dd><dt>Людей</dt><dd>${m.headcount[k]}</dd><dt>Выручка месяца</dt><dd>${short(m.rev[k])} ₽</dd><dt>Поток месяца</dt><dd>${m.cf[k] < 0 ? '−' : '+'}${short(Math.abs(m.cf[k]))} ₽</dd></dl>` + (evs ? '<ul>' + evs + '</ul>' : '');
    tip.hidden = false;
    if (follow) { if (x > sc.scrollLeft + sc.clientWidth - 60 || x < sc.scrollLeft) sc.scrollLeft = Math.max(0, x - sc.clientWidth / 2); }
    let left = x + 14; if (left + 262 > sc.scrollLeft + sc.clientWidth) left = x - 264; tip.style.left = Math.max(sc.scrollLeft + 4, left) + 'px';
  }
  function stopPlay() { clearInterval(playT); playT = 0; $('b-play').textContent = '► Проиграть'; }
  function play() { if (playT) { stopPlay(); return; } let day = (curDay == null || curDay >= DAYS - 2) ? 0 : curDay; const step = st.zoom === 'd' ? 1 : st.zoom === 'w' ? 2 : 4;
    $('b-play').textContent = '❚❚ Пауза'; playT = setInterval(() => { day += step; if (day >= DAYS) { stopPlay(); return; } showTip(day, true); }, 45); }
  function dayAt(e) { const svg = $('tl-svg').firstChild; return clamp(Math.floor((e.clientX - svg.getBoundingClientRect().left) / PPD), 0, DAYS - 1); }
  function initTimelineEvents() {
    const host = $('tl-svg');
    const sc = $('tl-scroll'); let pan = null;
    host.addEventListener('pointerdown', e => { const t = e.target.closest('[data-drag]');
      if (!t) { if (e.pointerType !== 'touch' && e.button === 0 && sc.scrollWidth > sc.clientWidth + 2) { pan = { x0: e.clientX, sl: sc.scrollLeft, moved: false }; try { host.setPointerCapture(e.pointerId); } catch (x) { } stopPlay(); } return; } const a = t.dataset.drag.split(':'); drag = { kind: a[0], id: a[1], part: a[2], m0: S.dateOf(dayAt(e)).i, month: null }; try { host.setPointerCapture(e.pointerId); } catch (x) { } e.preventDefault(); stopPlay(); });
    host.addEventListener('pointermove', e => { if (!host.firstChild) return;
      if (pan) { const dx = e.clientX - pan.x0; if (Math.abs(dx) > 3) { pan.moved = true; host.classList.add('panning'); $('tip').hidden = true; } if (pan.moved) sc.scrollLeft = pan.sl - dx; return; }
      const day = dayAt(e);
      if (drag) { drag.month = S.dateOf(day).i; const cur = $('cur'), x = MONTHS[drag.month - 1].d0 * PPD; cur.setAttribute('x1', x); cur.setAttribute('x2', x); cur.setAttribute('opacity', '1'); const tip = $('tip'); tip.innerHTML = '<h4>Перенести на ' + esc(mLabel(drag.month)) + '</h4>'; tip.hidden = false; tip.style.left = Math.max($('tl-scroll').scrollLeft + 4, x + 12) + 'px'; }
      else if (!playT) showTip(day); });
    const end = () => { if (pan) { pan = null; host.classList.remove('panning'); return; } if (!drag) return; const dg = drag; drag = null; if (dg.month && dg.month !== dg.m0) applyDrag(dg); else $('tip').hidden = true; };
    host.addEventListener('pointerup', end); host.addEventListener('pointercancel', () => { drag = null; pan = null; host.classList.remove('panning'); });
    host.addEventListener('pointerleave', () => { if (!playT && !drag) { $('tip').hidden = true; const c = $('cur'); if (c) c.setAttribute('opacity', '0'); curDay = null; } });
    let rt = 0; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(renderTimeline, 150); });
  }
  function applyDrag(dg) {
    const s = st.s, mo = dg.month;
    if (dg.kind === 'capex') { const c = s.capex.find(x => x.id === dg.id); if (c && c.month !== mo) act(`«${c.name}»: оплата перенесена с ${mLabel(c.month)} на ${mLabel(mo)}`, () => { c.month = mo; }); }
    if (dg.kind === 'batch') { const b = s.batches.find(x => x.id === dg.id); if (b && b.month !== mo) act(`Партия ${tOf(s, b.type).name} ×${b.qty}: запуск перенесён с ${mLabel(b.month)} на ${mLabel(mo)}`, () => { b.month = mo; }); }
    if (dg.kind === 'staff') { const e = s.staff.find(x => x.id === dg.id); if (!e) return;
      if (dg.part === 'to') { const v = Math.max(mo, e.from); if (v !== e.to) act(`${e.name}: работает по ${mLabel(v)} (было по ${mLabel(e.to)})`, () => { e.to = v; }); }
      else { const v = Math.min(mo, e.to); if (v !== e.from) act(`${e.name}: выходит с ${mLabel(v)} (было с ${mLabel(e.from)})`, () => { e.from = v; }); } }
  }

  /* ---------- вкладки ---------- */
  const TABS = [['charts', 'Графики'], ['people', 'Люди'], ['capex', 'Вложения'], ['units', 'Установки и линия'], ['sales', 'Продажи и цены'], ['bottle', 'Бутылка'], ['stock', 'Склад и паллеты'], ['costs', 'Расходы'], ['money', 'Налоги и инвестор'], ['levers', 'Рычаги'], ['scn', 'Сценарии'], ['journal', 'Журнал'], ['rules', 'Правила игры']];
  const CATS = ['Линии', 'Установки очистки', 'Ремонт', 'Оборудование', 'Пресс-формы', 'Техника и мебель', 'Разрешения и бренд', 'Прочее'];
  const BT = [['03', '0,3 л', 0.3, 96], ['05', '0,5 л', 0.5, 122], ['10', '1,0 л', 1, 152]];
  const monthSel = (id, bind, v) => `<select id="${id}" data-bind="${bind}" data-fmt="month">${MONTHS.map(mm => `<option value="${mm.i}"${mm.i === v ? ' selected' : ''}>${mm.label}</option>`).join('')}</select>`;
  const num = (id, bind, v, f) => `<input class="num" id="${id}" data-bind="${bind}" data-fmt="${f}" inputmode="decimal" autocomplete="off" value="${esc(show(v, f))}">`;
  function pIn(k) { const mt = Meta.by[k], f = mt.fmt, v = st.s.p[k];
    if (f === 'month') return monthSel('p-' + k, 'p:' + k, v);
    if (f === 'opt') return `<select id="p-${k}" data-bind="p:${k}" data-fmt="int">${mt.opts.map(o => `<option value="${o[0]}"${o[0] === v ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    if (k === 'payout_on') return `<select id="p-${k}" data-bind="p:${k}" data-fmt="int"><option value="0"${!v ? ' selected' : ''}>Нет</option><option value="1"${v ? ' selected' : ''}>Да</option></select>`;
    return num('p-' + k, 'p:' + k, v, f); }
  const pUnit = k => { const mt = Meta.by[k], f = mt.fmt; return (f === 'pct' || f === 'pct1') ? '%' : (f === 'month' || f === 'opt' || k === 'payout_on') ? '' : mt.unit; };
  function fields(gid, notes) { // параметры группы: карточки-столбики по подгруппам
    const items = Meta.groups.find(g => g.id === gid).items.map(it => Meta.by[it[0]]).filter(mt => mt.sub !== 'Бутылки'), subs = []; items.forEach(mt => { if (!subs.includes(mt.sub)) subs.push(mt.sub); });
    return '<div class="grps">' + subs.map(sb => `<section class="grp"><h4>${esc(sb)}${notes && notes[sb] ? `<span>${esc(notes[sb])}</span>` : ''}</h4>` + items.filter(mt => mt.sub === sb).map(mt => { const u = pUnit(mt.key);
      return `<div class="fr"><label for="p-${mt.key}">${esc(mt.label)}${mt.hint ? `<small>${esc(mt.hint)}</small>` : ''}</label><div class="in">${pIn(mt.key)}${u ? `<span class="u">${esc(u)}</span>` : ''}</div></div>`; }).join('') + '</section>').join('') + '</div>';
  }
  function colSvg(segs, hpx, cap) { // столбик-диаграмма: сегменты снизу вверх [доля, цвет, подпись]
    return `<div class="col" style="height:${hpx}px">${cap ? `<span class="colcap">${cap}</span>` : ''}<div class="colbar">${segs.map(g => `<i style="height:${(clamp(g[0], 0, 1) * 100).toFixed(2)}%;background:${g[1]}" title="${esc(g[2] || '')}">${g[0] * hpx >= 15 && g[3] ? `<em>${g[3]}</em>` : ''}</i>`).join('')}</div></div>`;
  }
  const brow = (lab, val, dot) => `<div class="br"><span>${dot ? `<i style="background:${dot}"></i>` : ''}${lab}</span><span>${val}</span></div>`;
  const bin = (k) => `<span class="in">${pIn(k)}<span class="u">${esc(pUnit(k))}</span></span>`;
  const tOf = (s, id) => s.utypes.find(t => t.id === id) || { name: '?', l: 0, price: 0 };
  const tShort = t => String(t.name).replace(/^ТИП-/i, '');
  const capAt = (s, mo) => (s.utypes.reduce((a, t) => a + t.start * t.l, 0) + s.batches.reduce((a, b) => a + (b.month <= mo ? b.qty * tOf(s, b.type).l : 0), 0)) * s.p.k_use * s.p.days;
  const scale = (s, k, v) => { s.p[k] = +(s.p[k] * (1 + v / 100)).toFixed(4); };
  const addUnits = (id) => (s, v) => { v = Math.round(v); if (v <= 0) return; s.batches.push({ id: newId(), type: id, qty: v, month: 10 }); const cap = Math.round(capAt(s, 10)), ex = s.plan.find(q => q.month === 10); if (ex) ex.liters = cap; else s.plan.push({ id: newId(), month: 10, liters: cap }); };
  const LEVERS = [
    { a: () => 'Отпускные цены', u: '%', d: 10, f: (s, v) => { ['p03', 'p05', 'p10'].forEach(k => { s.p[k] = Math.round(s.p[k] * (1 + v / 100)); }); } },
    { a: () => 'Продажи к плану', u: '%', d: -10, f: (s, v) => scale(s, 'caution', v) },
    { a: () => 'Цена крышки', u: '%', d: -30, f: (s, v) => scale(s, 'cap_usd', v) },
    { a: () => 'Цена преформы', u: '%', d: -30, f: (s, v) => { s.p.pf_kg = Math.round(s.p.pf_kg * (1 + v / 100)); } },
    { a: () => 'Цена этикетки', u: '%', d: -50, f: (s, v) => scale(s, 'label', v) },
    { a: () => 'Оклады всем', u: '%', d: -10, f: (s, v) => { s.staff.forEach(e => { e.salary = Math.round(e.salary * (1 + v / 100)); }); } },
    { a: () => 'Логистика и бонусы сетям', u: 'п.п.', d: -2, f: (s, v) => { s.p.logist = Math.max(0, +(s.p.logist + v / 100).toFixed(4)); } },
    { a: () => 'Аренда', u: '%', d: -20, f: (s, v) => { s.p.rent = Math.round(s.p.rent * (1 + v / 100)); } },
    { a: () => 'Маркетинг запуска', u: '%', d: -50, f: (s, v) => { s.p.mkt_launch = Math.round(s.p.mkt_launch * (1 + v / 100)); } },
    { a: () => 'Оборудование и ремонт', u: '%', d: -10, f: (s, v) => { s.capex.forEach(c => { if (!c.auto) c.amount = Math.round(c.amount * (1 + v / 100)); }); } },
    { a: s => 'Докупить ' + tOf(s, 'B').name + ' с августа 2027 и поднять план продаж', u: 'шт', d: 10, f: addUnits('B'), abs: true },
    { a: s => 'Докупить ' + tOf(s, 'A').name + ' с августа 2027 и поднять план продаж', u: 'шт', d: 10, f: addUnits('A'), abs: true }
  ];
  const levVal = i => (st.lev && st.lev[i] != null) ? st.lev[i] : LEVERS[i].d;
  const levText = (i, s) => { const lv = LEVERS[i], v = levVal(i); return lv.abs ? lv.a(s) + ': ' + v + ' ' + lv.u : lv.a(s) + ' ' + (v > 0 ? '+' : '−') + trim(Math.abs(v), 2) + ' ' + lv.u; };
  function squarify(items, x, y, w, h) { // раскладка «квадратами» (treemap): площади пропорциональны суммам
    const out = [], tot = items.reduce((a, b) => a + b.v, 0); if (!tot || w <= 0 || h <= 0) return out;
    let rest = items.map(it => ({ it, a: it.v / tot * w * h })), X = x, Y = y, Wd = w, Hd = h;
    const worst = (row, side) => { const s = row.reduce((a, b) => a + b.a, 0), mx = Math.max(...row.map(r => r.a)), mn = Math.min(...row.map(r => r.a)); return Math.max(side * side * mx / (s * s), s * s / (side * side * mn)); };
    while (rest.length) { const side = Math.min(Wd, Hd); let row = [rest[0]], k = 1;
      while (k < rest.length && worst(row.concat([rest[k]]), side) <= worst(row, side)) { row.push(rest[k]); k++; }
      const s = row.reduce((a, b) => a + b.a, 0), th = s / side; let off = 0;
      row.forEach(r => { const len = r.a / th; if (Wd >= Hd) out.push({ it: r.it, x: X, y: Y + off, w: th, h: len }); else out.push({ it: r.it, x: X + off, y: Y, w: len, h: th }); off += len; });
      if (Wd >= Hd) { X += th; Wd -= th; } else { Y += th; Hd -= th; } rest = rest.slice(k); }
    return out;
  }
  function spend(upto, s, res) { // куда ушли деньги за месяцы 1..upto: [название, группа, сумма]
    const p = s.p, m = res.m, c = res.k.cost, ic = i => i >= p.idx_m ? 1 + p.cost_idx : 1, sumTo = a => a.slice(0, upto).reduce((x, y) => x + y, 0), out = [];
    const startCost = s.utypes.reduce((a, x) => a + x.start * x.price, 0), byCat = {};
    s.capex.forEach(x => { if (x.month >= 1 && x.month <= upto) byCat[x.cat || 'Прочее'] = (byCat[x.cat || 'Прочее'] || 0) + (x.auto ? startCost * 0.5 : (+x.amount || 0)); });
    Object.keys(byCat).forEach(k => out.push([k === 'Прочее' ? 'Депозит и вход в сети' : k, 'Вложения', byCat[k]]));
    out.push(['Докупка установок', 'Вложения', sumTo(m.new_pay)], ['Резерв на непредвиденное', 'Вложения', sumTo(m.contingency)]);
    let off = 0, prd = 0; for (let i = 1; i <= upto; i++) s.staff.forEach(e => { if (i >= e.from && i <= e.to) { const v = e.salary * p.tax_k * ic(i); if (e.group === 'office') off += v; else prd += v; } });
    out.push(['Зарплаты офиса', 'Люди', off], ['Зарплаты производства', 'Люди', prd]);
    const use = (key, price) => { let v = 0; for (let i = 1; i <= upto; i++) v += res.useBy[key][i - 1] * price * ic(i); return v; };
    let pack = 0; for (let i = 1; i <= upto; i++) pack += m.use_pcs[i - 1] * p.pack * ic(i);
    out.push(['Крышки', 'Материалы', use('cap', c.mat.cap)], ['Преформы', 'Материалы', use('pf', c.mat.pf)], ['Этикетки', 'Материалы', use('label', c.mat.label)], ['Упаковка, паллеты, стрейч', 'Материалы', pack + use('pallet', c.mat.pallet) + use('stretch', c.mat.stretch) + (upto >= p.pilots_m ? p.pilots : 0)]);
    out.push(['Запас материалов на складе', 'Материалы', Math.max(0, sumTo(m.wc))]);
    out.push(['Логистика и бонусы сетям', 'Продажи', sumTo(m.logist)], ['Маркетинг', 'Продажи', sumTo(m.mkt)], ['Возвраты и списания', 'Продажи', sumTo(m.returns)]);
    out.push(['Аренда', 'Постоянные', sumTo(m.rent)], ['Электричество и вода', 'Постоянные', sumTo(m.energy)], ['Обслуживание производства', 'Постоянные', sumTo(m.maint)], ['Прочие расходы', 'Постоянные', sumTo(m.other)]);
    out.push(['Налоги (НДС и УСН)', 'Налоги', sumTo(m.vat) + sumTo(m.usn)]);
    return out.filter(a => a[2] > 0.5).sort((a, b) => b[2] - a[2]);
  }
  function chartsPanel() {
    const m = res.m, k = res.k, W = 960, H = 330, L = 64, R = 18, T = 26, B = 34, pw = W - L - R, ph = H - T - B;
    const cum = m.cum_cf, cf = m.cf, lo = Math.min(0, ...cum, ...cf), hi = Math.max(0, ...cum, ...cf), span = (hi - lo) || 1;
    const X = i => L + (i + 0.5) * pw / N, Y = v => T + (hi - v) / span * ph, y0 = Y(0), bw = pw / N * 0.5;
    const stepv = (() => { const raw = span / 6, e = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / e; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * e; })();
    let g = ''; for (let v = Math.ceil(lo / stepv) * stepv; v <= hi + 1; v += stepv) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${Math.abs(v) < 1 ? 'var(--muted)' : 'var(--line)'}" stroke-width="${Math.abs(v) < 1 ? 1 : 0.8}" stroke-dasharray="${Math.abs(v) < 1 ? '' : '2 5'}"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${nf0.format(v / 1e6)}</text>`;
    MONTHS.forEach((mm, i) => { if (i % 2 === 0 || mm.m === 0) g += `<text x="${X(i)}" y="${H - 12}" text-anchor="middle" class="${mm.m === 0 || i === 0 ? 't-ink t-b' : ''}">${mm.short}${mm.m === 0 || i === 0 ? ' ' + String(mm.y).slice(2) : ''}</text>`; });
    const pts = cum.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)), line = 'M' + pts.join('L'), area = line + `L${X(N - 1)},${y0}L${X(0)},${y0}Z`;
    g += `<defs><clipPath id="cpos"><rect x="0" y="0" width="${W}" height="${y0}"/></clipPath><clipPath id="cneg"><rect x="0" y="${y0}" width="${W}" height="${H}"/></clipPath>
      <linearGradient id="gneg" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${T + ph}"><stop offset="0" stop-color="#F6465D" stop-opacity=".05"/><stop offset="1" stop-color="#F6465D" stop-opacity=".42"/></linearGradient>
      <linearGradient id="gpos" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${T}"><stop offset="0" stop-color="#16C784" stop-opacity=".05"/><stop offset="1" stop-color="#16C784" stop-opacity=".42"/></linearGradient>
      <filter id="glow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    g += `<path d="${area}" fill="url(#gpos)" clip-path="url(#cpos)"/><path d="${area}" fill="url(#gneg)" clip-path="url(#cneg)"/>`;
    cf.forEach((v, i) => { g += `<rect x="${X(i) - bw / 2}" y="${Math.min(Y(v), y0)}" width="${bw}" height="${Math.max(1, Math.abs(Y(v) - y0))}" fill="${v >= 0 ? 'var(--brand)' : 'var(--red)'}" opacity=".5"/>`; });
    g += `<g filter="url(#glow)"><path d="${line}" fill="none" stroke="var(--brand)" stroke-width="2.4" stroke-linejoin="round" clip-path="url(#cpos)"/><path d="${line}" fill="none" stroke="var(--red)" stroke-width="2.4" stroke-linejoin="round" clip-path="url(#cneg)"/></g>`;
    const pi = cum.indexOf(Math.min(...cum)); if (cum[pi] < 0) g += `<circle cx="${X(pi)}" cy="${Y(cum[pi])}" r="5" fill="var(--red)"/><text x="${X(pi) + 12}" y="${Y(cum[pi]) - 12}" class="t-ink t-b">Дно: −${mln(-cum[pi])}, ${mLabel(pi + 1)}</text>`;
    if (k.paybackM) { const i = k.paybackM - 1; g += `<path d="M${X(i)},${y0 - 9}l8,9l-8,9l-8,-9z" fill="var(--gold)"/><text x="${X(i)}" y="${y0 - 16}" text-anchor="middle" class="t-ink t-b">Окупаемость: ${mLabel(k.paybackM)}</text>`; }
    else g += `<text x="${W - R - 4}" y="${Y(cum[N - 1]) - 10}" text-anchor="end" class="t-ink t-b">Дек. 2028: −${mln(-cum[N - 1])}${k.paybackEst ? ' · по темпу окупится ≈ ' + mLabel(k.paybackEst) : ''}</text>`;
    cum.forEach((v, i) => { g += `<rect x="${X(i) - pw / N / 2}" y="${T}" width="${pw / N}" height="${ph}" fill="transparent"><title>${mm_(i)}: накоплено ${v < 0 ? '−' : '+'}${mln(Math.abs(v))}, за месяц ${cf[i] < 0 ? '−' : '+'}${mln(Math.abs(cf[i]))}</title></rect>`; });
    const upto = (st.tmAll || !k.lastInvM) ? N : k.lastInvM, items = spend(upto, st.s, res), tot = items.reduce((a, b) => a + b[2], 0), delta = st.tmCol === 'delta';
    const base = {}; spend(upto, BASE_S, BASE).forEach(a => { base[a[0]] = a[2]; }); const baseTot = Object.keys(base).reduce((a, n) => a + base[n], 0);
    const dOf = a => base[a[0]] ? (a[2] - base[a[0]]) / base[a[0]] : 1;
    const colOf = a => { if (!delta) return heatC(Math.log10(Math.max(1, a[2] / tot * 100)) / Math.log10(25)); const d = dOf(a); return Math.abs(d) < 0.0005 ? HNeutral() : mix(HNeutral(), d > 0 ? HR : HG, clamp(Math.abs(d) / 0.10, 0.25, 1)); };
    const boxes = squarify(items.map(a => ({ n: a[0], g: a[1], v: a[2], a })), 0, 0, 100, 46);
    const groups = {}; items.forEach(a => { groups[a[1]] = (groups[a[1]] || 0) + a[2]; });
    const sgn = d => Math.abs(d) < 0.0005 ? '0 %' : (d > 0 ? '+' : '−') + (Math.abs(d) * 100 < 10 ? (Math.abs(d) * 100).toFixed(1).replace('.', ',') : Math.round(Math.abs(d) * 100)) + ' %';
    const mx = Math.max(1, ...cf.map(Math.abs));
    return `<h3>Окупаемость: накопленный денежный поток без денег инвестора</h3>
      <p>Линия показывает, сколько проект потратил и заработал с первого дня. Красная зона — проект должен инвестору; самая глубокая точка — максимум вложенного. Линия пересекла ноль — вложения вернулись. Столбики — денежный поток каждого месяца.</p>
      <div class="chartbox"><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="График окупаемости"><text x="${L - 8}" y="14" text-anchor="end">млн ₽</text>${g}</svg></div>
      <h3>Денежный поток по месяцам, млн ₽</h3>
      <div class="chartbox"><div class="strip">${cf.map((v, i) => { const col = mix(HNeutral(), v >= 0 ? HG : HR, clamp(0.25 + 0.75 * Math.sqrt(Math.abs(v) / mx), 0, 1)); return `<div style="background:${rgb(col)};color:${inkOn(col)}" title="${mm_(i)}: ${v < 0 ? '−' : '+'}${mln(Math.abs(v))}"><b>${(v / 1e6).toFixed(Math.abs(v) >= 9.95e6 ? 0 : 1).replace('.', ',').replace('-', '−')}</b><span>${MONTHS[i].short}${MONTHS[i].m === 0 || i === 0 ? ' ' + String(MONTHS[i].y).slice(2) : ''}</span></div>`; }).join('')}</div></div>
      <h3>Куда уходят деньги</h3>
      <p>Площадь плитки — доля в общих тратах. ${delta ? 'Цвет — изменение к базовому сценарию: зелёная плитка стала дешевле, красная — дороже, серая не изменилась.' : 'Цвет — «жар»: чем больше денег съедает статья, тем краснее; мелкие статьи зелёные.'}</p>
      <div class="row"><div class="seg" role="group" aria-label="Период"><button data-act="tm:0" aria-pressed="${!st.tmAll}">Пока вносит инвестор: ${MONTHS[0].label} — ${mLabel(k.lastInvM || N)}</button><button data-act="tm:1" aria-pressed="${!!st.tmAll}">Все 26 месяцев</button></div>
        <div class="seg" role="group" aria-label="Цвет плиток"><button data-act="tmc:heat" aria-pressed="${!delta}">Цвет: размер траты</button><button data-act="tmc:delta" aria-pressed="${delta}">Цвет: изменение к базе</button></div>
        <span class="heatleg">${delta ? 'дешевле' : 'мало'}<i style="background:linear-gradient(90deg,${rgb(HG)},${delta ? rgb(HNeutral()) : rgb(HY)},${rgb(HR)})"></i>${delta ? 'дороже' : 'много'}</span></div>
      <p style="font-family:var(--mono);color:var(--ink)">ВСЕГО ЗА ПЕРИОД: ${mln(tot)}${delta && baseTot ? ' · к базе ' + sgn((tot - baseTot) / baseTot) + ' (' + ((tot - baseTot) >= 0 ? '+' : '−') + mln(Math.abs(tot - baseTot)) + ')' : ''}</p>
      <div class="treemap">` + boxes.map(b => { const big = b.w > 11 && b.h > 9, mid = b.w > 5.5 && b.h > 4.2, col = colOf(b.it.a), d = dOf(b.it.a);
        return `<div class="tm ${big ? 'big' : mid ? 'mid' : 'tiny'}" style="left:${b.x.toFixed(3)}%;top:${(b.y / 46 * 100).toFixed(3)}%;width:${Math.min(b.w, 100 - b.x).toFixed(3)}%;height:${(Math.min(b.h, 46 - b.y) / 46 * 100).toFixed(3)}%;background:${rgb(col)};color:${inkOn(col)}" title="${esc(b.it.n)} — ${mln(b.it.v)} · ${(b.it.v / tot * 100).toFixed(1)} % всех трат · к базе ${sgn(d)}">${big || mid ? `<b>${esc(b.it.n)}</b><em style="font-size:min(${big ? 30 : 13}px,${(b.w * 0.19).toFixed(2)}cqw)">${nf1.format(b.it.v / 1e6)} млн</em><span>${delta ? sgn(d) + ' к базе' : Math.round(b.it.v / tot * 100) + ' %'}</span>` : ''}</div>`; }).join('') + `</div>
      <p style="font-family:var(--mono);font-size:12px">${Object.keys(groups).sort((a, b) => groups[b] - groups[a]).map(n => `${n.toUpperCase()} ${nf1.format(groups[n] / 1e6)} млн · ${Math.round(groups[n] / tot * 100)} %`).join('  |  ')}</p>
      <div class="tbl"><table><thead><tr><th>№</th><th>Статья</th><th>Группа</th><th class="r">Сумма</th><th class="r">Доля</th><th class="r">Накопленно</th><th class="r">К базе</th></tr></thead><tbody>` +
        (() => { let acc = 0; return items.map((a, i) => { acc += a[2]; const d = dOf(a); return `<tr><td class="calc">${i + 1}</td><td>${esc(a[0])}</td><td class="calc">${a[1]}</td><td class="r">${mln(a[2])}</td><td class="r calc">${(a[2] / tot * 100).toFixed(1).replace('.', ',')} %</td><td class="r calc">${Math.round(acc / tot * 100)} %</td><td class="r" style="color:${Math.abs(d) < 0.0005 ? 'var(--muted)' : d > 0 ? 'var(--red)' : 'var(--brand)'}">${sgn(d)}</td></tr>`; }).join(''); })() + `</tbody></table></div>`;
  }
  const mm_ = i => MONTHS[i].label;
  function panel() {
    const s = st.s, p = s.p, m = res.m, k = res.k, t = st.tab, ic = i => i >= p.idx_m ? 1 + p.cost_idx : 1, c = k.cost, last = N - 1;
    if (t === 'charts') return chartsPanel();
    if (t === 'people') {
      const cost = e => { let x = 0; for (let i = e.from; i <= e.to; i++) x += e.salary * p.tax_k * ic(i); return x; };
      const fot = g => s.staff.filter(e => e.group === g).reduce((a, e) => a + e.salary, 0);
      return `<p>Каждый человек — полоска на ленте. Оклад до налогов; взносы добавляются коэффициентом ${show(p.tax_k, 'dec2')} (вкладка «Расходы»). Список — пример: ФОТ разложен по ролям из вашего плана, поправьте оклады под себя.</p>
      <div class="tbl"><table><thead><tr><th>Должность</th><th>Группа</th><th class="r">Оклад, ₽/мес</th><th>Работает с</th><th>по</th><th class="r">Стоит за период</th><th></th></tr></thead><tbody>` +
        s.staff.map(e => `<tr><td class="name"><input id="st-${e.id}-name" data-bind="staff:${e.id}:name" value="${esc(e.name)}" maxlength="60"></td><td class="mo"><select id="st-${e.id}-group" data-bind="staff:${e.id}:group" data-fmt="group"><option value="office"${e.group === 'office' ? ' selected' : ''}>Офис</option><option value="prod"${e.group === 'prod' ? ' selected' : ''}>Производство</option></select></td><td class="n">${num('st-' + e.id + '-salary', 'staff:' + e.id + ':salary', e.salary, 'money')}</td><td class="mo">${monthSel('st-' + e.id + '-from', 'staff:' + e.id + ':from', e.from)}</td><td class="mo">${monthSel('st-' + e.id + '-to', 'staff:' + e.id + ':to', e.to)}</td><td class="r calc">${short(cost(e))} ₽</td><td><button class="x" data-act="del:staff:${e.id}" aria-label="Удалить ${esc(e.name)}">×</button></td></tr>`).join('') +
        `</tbody><tfoot><tr><td>Всего ${s.staff.length} чел.</td><td></td><td class="r">${rub(fot('office') + fot('prod'))}</td><td colspan="2">офис ${short(fot('office'))} · производство ${short(fot('prod'))}</td><td class="r">${mln(k.fotTotal)}</td><td></td></tr></tfoot></table></div>
      <div class="row"><button class="btn" data-act="add:staff">＋ Добавить человека</button></div>`;
    }
    if (t === 'capex') {
      const startCost = s.utypes.reduce((a, x) => a + x.start * x.price, 0), amt = x => x.auto ? startCost * 0.5 : (+x.amount || 0);
      const cats = CATS.concat(s.capex.map(x => x.cat || 'Прочее').filter(x => !CATS.includes(x)).filter((x, i, a) => a.indexOf(x) === i));
      const rowsOf = cat => s.capex.filter(x => (x.cat || 'Прочее') === cat);
      return `<p>Каждая строка — отдельный платёж: сумма, месяц и день оплаты. Жёлтые столбики на дорожке «Крупные платежи» можно перетаскивать по месяцам. Строки с нулём — заготовки: впишите сумму, когда узнаете цену.</p>
      <p><b>Что такое «Резерв».</b> Галочка значит: к этой строке добавить ${show(p.contingency, 'pct')} % сверху на непредвиденное — подорожание, доставку, монтаж, курс. Строка 1 000 000 ₽ с галочкой обойдётся в ${nf0.format(1e6 * (1 + p.contingency))} ₽. Снимайте галочку там, где сумма твёрдая и удорожания не будет: депозит, договор с фиксированной ценой. Сам процент меняется во вкладке «Расходы».</p>
      <div class="tbl"><table><thead><tr><th>Статья</th><th class="r">Сумма, ₽</th><th>Месяц оплаты</th><th class="r">День</th><th title="Добавить к строке резерв на непредвиденное">Резерв ${show(p.contingency, 'pct')} %</th><th>Раздел</th><th></th></tr></thead>` +
        cats.filter(cat => rowsOf(cat).length).map(cat => `<tbody><tr class="cat"><td>${esc(cat)}</td><td class="r">${rub(rowsOf(cat).reduce((a, x) => a + amt(x), 0))}</td><td colspan="5"></td></tr>` + rowsOf(cat).map(x => `<tr><td class="name"><input id="cx-${x.id}-name" data-bind="capex:${x.id}:name" value="${esc(x.name)}" maxlength="110"></td><td class="n">${x.auto ? `<span class="calc" title="Считается: штук на старте × цена типа × 50 % (вкладка «Установки и линия»)">${nf0.format(amt(x))}</span>` : num('cx-' + x.id + '-amount', 'capex:' + x.id + ':amount', x.amount, 'money')}</td><td class="mo">${monthSel('cx-' + x.id + '-month', 'capex:' + x.id + ':month', x.month)}</td><td style="width:66px">${num('cx-' + x.id + '-day', 'capex:' + x.id + ':day', x.day || 10, 'int')}</td><td><input type="checkbox" id="cx-${x.id}-reserve" data-bind="capex:${x.id}:reserve" data-fmt="bool"${x.reserve ? ' checked' : ''} aria-label="Добавить резерв на непредвиденное"></td><td class="mo"><select id="cx-${x.id}-cat" data-bind="capex:${x.id}:cat" data-fmt="txt">${cats.map(z => `<option${z === (x.cat || 'Прочее') ? ' selected' : ''}>${esc(z)}</option>`).join('')}</select></td><td>${x.auto ? '' : `<button class="x" data-act="del:capex:${x.id}" aria-label="Удалить">×</button>`}</td></tr>`).join('') + '</tbody>').join('') +
        `<tfoot><tr><td>Итого по списку</td><td class="r">${rub(s.capex.reduce((a, x) => a + amt(x), 0))}</td><td colspan="5">с резервом и докупкой установок: ${mln(k.capexTotal)}</td></tr></tfoot></table></div>
      <div class="row"><button class="btn" data-act="add:capex">＋ Добавить строку</button></div>`;
    }
    if (t === 'units') {
      const bought = id => s.batches.reduce((a, b) => a + (b.type === id ? b.qty : 0), 0);
      return `<p>Установок два типа. Для каждого задаются литры в сутки, цена и сколько штук стоит на старте. Докупка — партиями: тип, количество, месяц запуска. Кружки «+N» на дорожке «Очистка воды» можно тянуть по месяцам.</p>
      <h3>Типы установок</h3>
      <div class="tbl"><table><thead><tr><th>Тип</th><th class="r">Литров в сутки с одной</th><th class="r">Цена одной, ₽</th><th class="r">На старте, шт</th><th class="r">Докуплено</th><th class="r">Всего к дек. 2028</th><th class="r">Дают в сутки</th></tr></thead><tbody>` +
        s.utypes.map(u => `<tr><td class="name"><input id="ut-${u.id}-name" data-bind="ut:${u.id}:name" value="${esc(u.name)}" maxlength="30"></td><td class="n">${num('ut-' + u.id + '-l', 'ut:' + u.id + ':l', u.l, 'int')}</td><td class="n">${num('ut-' + u.id + '-price', 'ut:' + u.id + ':price', u.price, 'money')}</td><td class="n">${num('ut-' + u.id + '-start', 'ut:' + u.id + ':start', u.start, 'int')}</td><td class="r calc">${bought(u.id)}</td><td class="r calc">${u.start + bought(u.id)}</td><td class="r calc">${pcs((u.start + bought(u.id)) * u.l)} л</td></tr>`).join('') +
        `</tbody><tfoot><tr><td>Всего</td><td></td><td></td><td class="r">${s.utypes.reduce((a, u) => a + u.start, 0)}</td><td class="r">${s.batches.reduce((a, b) => a + b.qty, 0)}</td><td class="r">${s.utypes.reduce((a, u) => a + u.start + bought(u.id), 0)}</td><td class="r">${pcs(m.startL[last] + m.newL[last])} л</td></tr></tfoot></table></div>
      <h3>Партии докупки</h3><p>Новая мощность сама себя не продаёт: после добавления партии поднимите план продаж кнопкой в строке.</p>
      <div class="tbl"><table><thead><tr><th>Тип</th><th class="r">Штук</th><th>Месяц запуска</th><th class="r">Дают в сутки</th><th class="r">Сумма</th><th></th><th></th></tr></thead><tbody>` +
        (s.batches.length ? s.batches.map(b => { const u = tOf(s, b.type); return `<tr><td class="mo"><select id="bt-${b.id}-type" data-bind="batch:${b.id}:type" data-fmt="txt">${s.utypes.map(z => `<option value="${z.id}"${z.id === b.type ? ' selected' : ''}>${esc(z.name)}</option>`).join('')}</select></td><td class="n">${num('bt-' + b.id + '-qty', 'batch:' + b.id + ':qty', b.qty, 'int')}</td><td class="mo">${monthSel('bt-' + b.id + '-month', 'batch:' + b.id + ':month', b.month)}</td><td class="r calc">${pcs(b.qty * u.l)} л</td><td class="r calc">${short(b.qty * u.price)} ₽</td><td><button class="btn sm" data-act="plancap:${b.id}">Поднять план продаж до мощности</button></td><td><button class="x" data-act="del:batch:${b.id}" aria-label="Удалить партию">×</button></td></tr>`; }).join('') : '<tr><td colspan="7" class="calc">Партий докупки пока нет.</td></tr>') +
        `</tbody></table></div><div class="row">${s.utypes.map(u => `<button class="btn" data-act="add:batch:${u.id}">＋ Партия ${esc(u.name)}</button>`).join('')}<span style="color:var(--muted)">Мощность в декабре 2028: ${pcs(m.cap_l[last])} л в месяц · план продаж: ${pcs(m.plan_l[last])} л · линия вытянет ${pcs(k.lineCapB)} бутылок в месяц</span></div>
      ${fields('prod')}`;
    }
    if (t === 'sales') {
      const plan = s.plan.slice().sort((a, b) => a.month - b.month), sh = [p.sh03, p.sh05, p.sh10], pr = [p.p03, p.p05, p.p10], sold = [m.b03, m.b05, m.b10], sum = a => a.reduce((x, y) => x + y, 0);
      const revT = i => sold[i].reduce((a, x, q) => a + x * pr[i] * (q + 1 >= p.idx_m ? 1 + p.price_idx : 1), 0), revAll = revT(0) + revT(1) + revT(2), shSum = sh[0] + sh[1] + sh[2];
      const palOf = (lit, i) => c.pal[i].bottles ? lit * sh[i] / BT[i][2] / c.pal[i].bottles : 0;
      return `<h3>Три бутылки: доля, цена и что это даёт</h3>
      <div class="bcards">` + BT.map((b, i) => `<article class="bcard"><div class="bpic"><div class="cols2">${colSvg([[sh[i], 'var(--water)', 'Доля литров', Math.round(sh[i] * 100) + ' %']], 120, 'литры')}${colSvg([[revAll ? revT(i) / revAll : 0, 'var(--brand)', 'Доля выручки', (revAll ? Math.round(revT(i) / revAll * 100) : 0) + ' %']], 120, 'выручка')}</div><b>${b[1]}</b></div><div class="brows">
          ${brow('Доля литров', bin('sh' + b[0]))}${brow('Цена продажи с завода, с НДС', bin('p' + b[0]))}
          ${brow('В декабре 2028: бутылок', pcs(sold[i][last]))}${brow('В декабре 2028: паллет', nf1.format(palOf(m.sold_l[last], i)))}
          ${brow('За 26 месяцев: бутылок', pcs(sum(sold[i])))}${brow('За 26 месяцев: выручка', mln(revT(i)))}${brow('Доля в выручке', (revAll ? Math.round(revT(i) / revAll * 100) : 0) + ' %')}</div></article>`).join('') + `</div>
      <p class="${Math.abs(shSum - 1) < 1e-4 ? '' : 'bad'}">Сумма долей: ${show(shSum, 'pct')} %${Math.abs(shSum - 1) < 1e-4 ? '.' : ' — должно быть 100 %.'} Столбики: доля бутылки в литрах и в выручке. Цена за литр: ${BT.map((b, i) => b[1] + ' — ' + Math.round(pr[i] / b[2]) + ' ₽').join(', ')}.</p>
      <h3>План продаж</h3><p>Сколько литров в месяц вы продаёте на полном ходу. Каждая строка задаёт новый уровень с указанного месяца. План выше мощности — продажи теряются; ниже — установки простаивают.</p>
      <div class="tbl"><table><thead><tr><th>С месяца</th><th class="r">План, литров в месяц</th><th class="r">0,3 л, бут.</th><th class="r">0,5 л, бут.</th><th class="r">1,0 л, бут.</th><th class="r">Паллет в месяц</th><th class="r">Мощность, л</th><th></th></tr></thead><tbody>` +
        plan.map(q => `<tr><td class="mo">${monthSel('pl-' + q.id + '-month', 'plan:' + q.id + ':month', q.month)}</td><td class="n">${num('pl-' + q.id + '-liters', 'plan:' + q.id + ':liters', q.liters, 'int')}</td>${BT.map((b, i) => `<td class="r calc">${pcs(q.liters * sh[i] / b[2])}</td>`).join('')}<td class="r calc">${nf1.format(palOf(q.liters, 0) + palOf(q.liters, 1) + palOf(q.liters, 2))}</td><td class="r calc">${pcs(capAt(s, Math.max(q.month, p.start_m)))}</td><td>${plan.length > 1 ? `<button class="x" data-act="del:plan:${q.id}" aria-label="Удалить">×</button>` : ''}</td></tr>`).join('') +
        `</tbody></table></div><div class="row"><button class="btn" data-act="add:plan">＋ Новый уровень плана</button></div>${fields('sales')}`;
    }
    if (t === 'bottle') {
      const pr = [p.p03, p.p05, p.p10], cols = ['#EA3943', '#F5822A', '#F0B90B', '#8A94A3'], nm = ['Преформа', 'Крышка', 'Этикетка', 'Упаковка'], mxp = Math.max(1, ...pr);
      return `<p>Столбик — цена продажи с завода. Красно-жёлтые слои снизу — материалы: преформа, крышка, этикетка, упаковка. Зелёная часть — то, что остаётся на зарплаты, аренду, логистику, налоги и прибыль.</p>
      <div class="colchart">` + BT.map((b, i) => { const parts = [c.pf[i], c.cap, p.label, p.pack], tot = c.m[i], H = Math.round(240 * pr[i] / mxp);
          return `<div class="cc"><span class="cctop">${pr[i]} ₽</span>${colSvg(parts.map((x, j) => [pr[i] ? x / pr[i] : 0, cols[j], nm[j] + ' ' + nf1.format(x) + ' ₽', nf1.format(x)]).concat([[pr[i] ? Math.max(0, 1 - tot / pr[i]) : 0, 'var(--brand)', 'Остаётся ' + nf1.format(pr[i] - tot) + ' ₽', '<b>остаётся ' + nf1.format(pr[i] - tot) + ' ₽ · ' + (pr[i] ? Math.round((1 - tot / pr[i]) * 100) : 0) + ' %</b>']]), H)}<b>${b[1]}</b><span class="ccsub">материалы ${nf1.format(tot)} ₽</span></div>`; }).join('') +
        `<div class="legend ccleg">${nm.map((x, j) => `<span><i style="background:${cols[j]}"></i>${x}</span>`).join('')}<span><i style="background:var(--brand)"></i>остаётся вам</span></div></div>
      <div class="bcards">` + BT.map((b, i) => { const parts = [c.pf[i], c.cap, p.label, p.pack], tot = c.m[i], pl = c.pal[i];
          return `<article class="bcard solo"><div class="brows"><div class="br"><span><b style="font-family:var(--display);font-weight:500">${b[1]}</b></span><span></span></div>
          ${brow('Цена продажи с завода, с НДС', bin('p' + b[0]))}${brow('Вес преформы', bin('w' + b[0]))}
          ${brow('Преформа', nf1.format(parts[0]) + ' ₽', cols[0])}${brow('Крышка', nf1.format(parts[1]) + ' ₽', cols[1])}${brow('Этикетка', nf1.format(parts[2]) + ' ₽', cols[2])}${brow('Упаковка', nf1.format(parts[3]) + ' ₽', cols[3])}
          ${brow('<b>Материалы всего</b>', '<b>' + nf1.format(tot) + ' ₽</b>')}${brow('<b>Остаётся</b>', '<b>' + nf1.format(pr[i] - tot) + ' ₽ · ' + (pr[i] ? Math.round((1 - tot / pr[i]) * 100) : 0) + ' %</b>')}
          ${brow('Диаметр', bin('d' + b[0]))}${brow('Высота', bin('h' + b[0]))}${brow('Штук в упаковке', bin('pk' + b[0]))}
          ${brow('На паллете', pcs(pl.bottles) + ' бут. · ' + pcs(pl.kg) + ' кг')}</div></article>`; }).join('') + `</div>
      <p>Диаметр и высота бутылок — моя оценка по типовым бутылкам такого объёма. Впишите размеры из чертежа, когда утвердите форму: от них зависит, сколько встаёт на паллету.</p>${fields('bottle')}`;
    }
    if (t === 'stock') {
      const sh = [p.sh03, p.sh05, p.sh10], bp = [p.sh03 / 0.3, p.sh05 / 0.5, p.sh10].map(x => c.bpl ? x / c.bpl : 0), pf = s.mats.find(x => x.key === 'pf');
      const alt = S.pallet(Object.assign({}, p, { pal_w: p.pal_w === 800 ? 1000 : 800 })), altName = p.pal_w === 800 ? 'американской 1200 × 1000' : 'европаллете 1200 × 800';
      return `<p>Материалы покупаются целыми партиями и заранее: заказ покрывает расход на столько месяцев вперёд, сколько указано в столбце «за сколько месяцев». Оплата — 15-го числа месяца заказа. Первая партия крышек едет вместе с линией и приходит в ${mLabel(3)}.</p>
      <div class="tbl"><table><thead><tr><th>Материал</th><th class="r">Цена</th><th class="r">Партия</th><th class="r">Заказ за сколько месяцев</th><th>Первый заказ</th><th class="r">Транспорт следующих партий, ₽</th><th class="r">Расход в дек. 2028</th><th class="r">Куплено за период</th></tr></thead><tbody>` +
        s.mats.map(mt => `<tr><td><b>${esc(mt.name)}</b></td><td class="r calc">${nf1.format(c.mat[mt.key])} ₽/${mt.unit}</td><td class="n"><span class="in">${num('mt-' + mt.key + '-moq', 'mat:' + mt.key + ':moq', mt.moq, 'int')}<span class="u">${mt.unit}</span></span></td><td class="n">${num('mt-' + mt.key + '-lead', 'mat:' + mt.key + ':lead', mt.lead, 'int')}</td><td class="mo">${monthSel('mt-' + mt.key + '-first', 'mat:' + mt.key + ':first', mt.first)}</td><td class="n">${num('mt-' + mt.key + '-ship', 'mat:' + mt.key + ':ship', mt.ship, 'money')}</td><td class="r calc">${mt.unit === 'кг' ? nf1.format(res.useBy[mt.key][last]) : pcs(res.useBy[mt.key][last])} ${mt.unit}</td><td class="r calc">${pcs(res.ord[mt.key].reduce((a, b) => a + b, 0))} ${mt.unit}</td></tr>`).join('') +
        `</tbody></table></div><p>Партию преформ ${pcs(pf.moq)} шт заказывайте в пропорции продаж: 0,3 л — ${pcs(pf.moq * bp[0])}, 0,5 л — ${pcs(pf.moq * bp[1])}, 1,0 л — ${pcs(pf.moq * bp[2])} шт. В запасах материалов заморожено до ${mln(k.wcMax)}.</p>
      <h3>Сколько бутылок встаёт на паллету</h3>
      <p>Считается из размеров бутылки и упаковки: сколько упаковок помещается в слой и сколько слоёв проходит по высоте и по весу. Это оценка простой раскладкой рядами; смешанная раскладка иногда даёт на одну-две упаковки в слое больше.</p>
      <div class="tbl"><table><thead><tr><th>Бутылка</th><th class="r">Размер, мм</th><th class="r">В упаковке</th><th class="r">Упаковок в слое</th><th class="r">Бутылок в слое</th><th class="r">Слоёв</th><th class="r">Бутылок на паллете</th><th class="r">Вес груза</th><th>Что ограничивает</th><th class="r">На ${altName}</th><th class="r">Паллет в дек. 2028</th></tr></thead><tbody>` +
        BT.map((b, i) => { const x = c.pal[i]; return `<tr><td><b>${b[1]}</b></td><td class="r calc">⌀ ${p['d' + b[0]]} × ${p['h' + b[0]]}</td><td class="r calc">${p['pk' + b[0]]} (${x.pc} × ${x.pr})</td><td class="r calc">${x.packs}</td><td class="r calc">${x.perLayer}</td><td class="r calc">${x.layers}</td><td class="r"><b>${pcs(x.bottles)}</b></td><td class="r calc">${pcs(x.kg)} кг</td><td class="calc">${x.byKg < x.byH ? 'вес' : 'высота'}</td><td class="r calc">${pcs(alt[i].bottles)}</td><td class="r calc">${nf1.format(x.bottles ? m.prod_l[last] * sh[i] / b[2] / x.bottles : 0)}</td></tr>`; }).join('') +
        `</tbody><tfoot><tr><td colspan="10">Всего паллет в месяц на полном ходу</td><td class="r">${nf1.format(m.pallets[last])}</td></tr></tfoot></table></div>
      <p>Для сетей берите европаллету 1200 × 800: это стандарт приёмки распределительных центров в России. Американская (она же финская) 1200 × 1000 вмещает больше, но её принимают не везде. Размеры бутылок и число штук в упаковке меняются во вкладке «Бутылка». В разделе «Вложения» уже есть 100 оборотных паллет для своего склада — здесь считаются паллеты, которые уезжают к покупателю.</p>
      ${fields('pallet')}`;
    }
    if (t === 'costs') {
      const fixed = (m.rent[last] + m.maint[last] + m.other[last]), varr = m.energy[last] + m.logist[last] + m.returns[last] + m.rev_net[last] * p.mkt_pct;
      return `<p>Расходы, которые не привязаны к людям и оборудованию. Сгруппированы по тому, от чего зависят.</p>` + fields('costs', { 'Зависят от объёма и выручки': '≈ ' + short(varr) + ' ₽ в месяц на полном ходу', 'Запуск': 'разово ' + short(p.mkt_launch + p.pilots) + ' ₽', 'Постоянные каждый месяц': '≈ ' + short(fixed) + ' ₽ в месяц, без зарплат', 'Индексация и резерв': '' });
    }
    if (t === 'money') {
      const lastM = Math.min(N, Math.max(6, k.lastInvM + 1));
      return `<p>Игра сама считает, сколько инвестору внести в каждом месяце, чтобы на счёте оставался неснижаемый остаток. Когда деньги реально внесены — впишите факт, план пересчитается.</p>
      <div class="tbl"><table><thead><tr><th>Месяц</th><th class="r">Внести по плану, ₽</th><th class="r">Уже внесено — факт, ₽</th><th class="r">Внесено накопленно, ₽</th></tr></thead><tbody>` +
        MONTHS.slice(0, lastM).map(mm => `<tr><td>${mm.label}</td><td class="r calc">${m.need[mm.i - 1] > 0 ? nf0.format(m.need[mm.i - 1]) : '—'}</td><td class="n">${num('ct-' + mm.i, 'contrib:' + mm.i, m.contrib[mm.i - 1] || '', 'money')}</td><td class="r calc">${nf0.format(m.inv_cum[mm.i - 1])}</td></tr>`).join('') +
        `</tbody><tfoot><tr><td>Всего</td><td class="r">${rub(m.need.reduce((a, b) => a + b, 0))}</td><td class="r">${rub(m.contrib.reduce((a, b) => a + b, 0))}</td><td class="r">${rub(k.invest)}</td></tr></tfoot></table></div>${fields('tax')}`;
    }
    if (t === 'levers') {
      const rows = LEVERS.map((lv, i) => { const z = clone(s); lv.f(z, levVal(i)); const r = S.sim(z).k; return { i, lv, dCum: r.cumEnd - k.cumEnd, dInv: r.invest - k.invest, pb: r.paybackM, est: r.paybackEst }; }).sort((a, b) => b.dCum - a.dCum);
      const mx = Math.max(1, ...rows.map(r => Math.abs(r.dCum)));
      return `<p>Что сильнее всего сдвигает результат от текущего сценария. Впишите своё значение — полоса и цифры пересчитаются. Полоса показывает, на сколько изменится накопленный денежный поток к декабрю 2028. «Применить» делает ход, его можно отменить.</p>
      <div><div class="lever" style="color:var(--muted);font-size:12px"><span>Рычаг</span><span>На сколько</span><span>Накопленный поток к концу 2028</span><span>Бюджет, изменение</span><span>Окупаемость станет</span><span></span></div>` +
        rows.map(r => `<div class="lever"><span>${esc(r.lv.a(s))}</span><span class="in">${num('lv-' + r.i, 'lev:' + r.i, levVal(r.i), 'dec1')}<span class="u">${r.lv.u}</span></span><span class="track" title="${(r.dCum >= 0 ? '+' : '−') + mln(Math.abs(r.dCum))}"><i style="${r.dCum >= 0 ? 'left:50%' : 'right:50%'};width:${(Math.abs(r.dCum) / mx * 50).toFixed(1)}%;background:${r.dCum >= 0 ? 'var(--brand)' : 'var(--red)'}"></i></span><span>${(r.dInv >= 0 ? '+' : '−') + mln(Math.abs(r.dInv))}</span><span>${r.pb ? esc(mLabel(r.pb)) : r.est ? '≈ ' + esc(mLabel(r.est)) : 'нет'}</span><button class="btn sm" data-act="lever:${r.i}">Применить</button></div>`).join('') + '</div>';
    }
    if (t === 'scn') {
      const all = [['База (исходные цифры)', BASE.k], ['Сейчас на экране: ' + s.name, k]].concat(Object.keys(st.saved).map(n => [n, S.sim(st.saved[n]).k]));
      return `<p>Сохраняйте варианты под именами кнопкой «Сохранить сценарий» наверху и сравнивайте их здесь. Сценарии хранятся в этом браузере — у каждого участника свои.</p>
      <div class="tbl"><table><thead><tr><th>Сценарий</th><th class="r">Вносит инвестор</th><th>Окупаемость</th><th class="r">Прибыль 2028</th><th class="r">Минимум на счёте</th><th class="r">Людей</th></tr></thead><tbody>` +
        all.map(a => `<tr><td>${esc(a[0])}</td><td class="r">${mln(a[1].invest)}</td><td>${a[1].paybackM ? esc(mLabel(a[1].paybackM)) : a[1].paybackEst ? '≈ ' + esc(mLabel(a[1].paybackEst)) : 'нет'}</td><td class="r">${mln(a[1].profit28)}</td><td class="r">${short(a[1].minCash)} ₽</td><td class="r">${a[1].headMax}</td></tr>`).join('') + '</tbody></table></div>';
    }
    if (t === 'journal') {
      return `<p>Каждый ход записывается: что изменили и как это сдвинуло бюджет и окупаемость. Журнал уходит в Excel отдельным листом.</p>` +
        (st.journal.length ? `<div><div class="jr" style="color:var(--muted);font-size:12px"><span>Когда</span><span>Что изменили</span><span>Бюджет инвестора</span><span>Окупаемость</span></div>` + st.journal.map(j => `<div class="jr"><span>${esc(j.t)}</span><span>${esc(j.text)}</span><span class="delta ${Math.abs(j.dInv) < 1 ? '' : j.dInv < 0 ? 'good' : 'bad'}">${Math.abs(j.dInv) < 1 ? 'без изменений' : (j.dInv > 0 ? '+' : '−') + mln(Math.abs(j.dInv))}</span><span class="delta ${!j.dPb ? '' : j.dPb < 0 ? 'good' : 'bad'}">${!j.dPb ? (j.pbNow && !j.pbWas ? 'появилась' : !j.pbNow && j.pbWas ? 'пропала' : 'та же') : (j.dPb < 0 ? 'раньше на ' + (-j.dPb) : 'позже на ' + j.dPb) + ' мес.'}</span></div>`).join('') + `</div><div class="row"><button class="btn sm" data-act="clearj">Очистить журнал</button></div>` : '<p>Пока ходов нет. Измените что-нибудь — запись появится здесь.</p>');
    }
    return RULES;
  }
  const RULES = `<div class="rules">
    <div><h3>Цель</h3><p>Вы строите завод АРКТИКА и ведёте его 26 месяцев. Задача — чтобы проект вернул вложенное до декабря 2028, а инвестор внёс как можно меньше. Табло наверху всегда показывает оба числа и разницу с базовым сценарием.</p></div>
    <div><h3>Как играть</h3><ol><li>Посмотрите на ленту: когда уходят деньги, когда кончается запас, когда начинаются продажи.</li><li>Сделайте ход: поменяйте цифру во вкладке или перетащите элемент на ленте.</li><li>Табло покажет, что стало с бюджетом и окупаемостью. Ход записан в журнал.</li><li>Не понравилось — «Отменить ход». Понравилось — «Сохранить сценарий» под именем.</li><li>Вкладка «Рычаги» подсказывает, какой ход сейчас даёт больше всего; значение рычага можно вписать своё.</li></ol></div>
    <div><h3>Что можно менять</h3><ul><li><b>Люди</b> — добавить, убрать, сдвинуть выход, изменить оклад.</li><li><b>Вложения</b> — добавить или убрать строку, поменять сумму, дату и резерв.</li><li><b>Установки</b> — два типа: ТИП-А30 и ТИП-Б130; сколько на старте и партии докупки.</li><li><b>Продажи</b> — план в литрах, доли и цены трёх бутылок, разгон.</li><li><b>Бутылка</b> — вес преформы, цена крышки и этикетки, размеры и упаковка.</li><li><b>Склад и паллеты</b> — партии и сроки заказа материалов, тип паллеты.</li><li><b>Расходы и налоги</b> — аренда, маркетинг, подушка, возврат инвестору.</li></ul></div>
    <div><h3>Дорожки ленты</h3><ul><li><b>Деньги на счёте</b> — остаток по дням. Треугольник сверху — взнос инвестора, число рядом — млн ₽.</li><li><b>Крупные платежи</b> — жёлтые столбики: оборудование; бирюзовые: партии материалов. Высота — размер платежа.</li><li><b>Готовая вода</b> — бутылок на складе: разлито минус продано.</li><li><b>Крышки, преформы, этикетки, паллеты, стрейч-плёнка</b> — «пила»: партия пришла — вверх, розлив — вниз. Пунктир — оплачено, но ещё в пути.</li><li><b>Очистка воды</b> — литров в сутки со всех установок обоих типов.</li><li><b>Люди</b> — кто и с какого по какой месяц работает.</li></ul></div>
    <div><h3>Как считаются деньги</h3><ul><li>Инвестор вносит 1-го числа ровно столько, чтобы в конце месяца на счёте остался неснижаемый остаток.</li><li>Зарплата и взносы — 10-го и 25-го. Аренда — 1-го. Партии материалов — 15-го. Налоги — 28-го.</li><li>Выручка приходит равномерно по дням; часть — в следующем месяце (отсрочка покупателям).</li><li>Материалы попадают в расходы, когда воду разлили, а деньги уходят, когда оплатили партию.</li><li>«Резерв» у строки вложений добавляет к ней процент на непредвиденное; платится в том же месяце.</li><li>Окупаемость — месяц, когда накопленный денежный поток без денег инвестора стал неотрицательным.</li></ul></div>
    <div><h3>Производство и продажи</h3><ul><li>Мощность = сумма по типам (штук × литров в сутки) × коэффициент использования × дни.</li><li>Завод разливает столько, сколько нужно по плану продаж плюс целевой запас, но не больше мощности воды и линии.</li><li>Продано = меньшее из плана и того, что есть на складе с учётом розлива.</li><li>Докупили установки, но не подняли план продаж — мощность простаивает, деньги потрачены зря.</li></ul></div>
    <div><h3>Паллеты</h3><ul><li>Бутылок на паллете = упаковок в слое × штук в упаковке × слоёв.</li><li>Упаковок в слое — сколько прямоугольников упаковки встаёт рядами на 1200 × 800 или 1200 × 1000.</li><li>Слоёв — сколько проходит и по высоте груза, и по весу.</li><li>Паллеты и стрейч-плёнка расходуются на каждую разлитую паллету и покупаются партиями, как крышки.</li></ul></div>
    <div><h3>Тревоги</h3><ul><li><b>Материал закончился</b> — заказ сделан поздно или партия мала.</li><li><b>Кассовый разрыв</b> — в середине месяца на счёте минус, хотя в конце плюс. Увеличьте неснижаемый остаток.</li><li><b>Линия не успевает</b> — нужна вторая смена.</li><li><b>План выше производства</b> — не хватает воды или линии.</li><li><b>Лимиты УСН</b> — доход за год вышел за порог, налоги будут выше.</li></ul></div>
    <div><h3>Excel и допущения</h3><ul><li>«Скачать Excel» выгружает текущий сценарий: «Кейс» с формулами, «Персонал», «Вложения», «Установки» (типы и партии), «Продажи», подневные остатки, журнал и справку. Итоги в файле и на экране совпадают.</li><li>Обратно из Excel сценарий не загружается — правьте здесь, выгружайте заново.</li><li>Оклады по ролям, размеры бутылок, цены паллет и стрейч-плёнки — оценки; пресс-формы бутылок и транспорт крышек стоят нулями.</li><li>Амортизации нет: игра считает деньги, а не бухгалтерскую прибыль.</li></ul></div></div>`;

  function renderTabs() {
    $('tabs').innerHTML = TABS.map(a => `<button role="tab" id="tab-${a[0]}" aria-selected="${st.tab === a[0]}" data-act="tab:${a[0]}">${a[1]}</button>`).join('');
    $('panel').innerHTML = panel();
  }
  function renderHeader() {
    const names = Object.keys(st.saved), cur = st.s.name, known = cur === 'База' || names.includes(cur);
    $('scn').innerHTML = `<option value="База"${cur === 'База' ? ' selected' : ''}>База (исходные цифры)</option>` + names.map(n => `<option value="${esc(n)}"${n === cur ? ' selected' : ''}>${esc(n)}</option>`).join('') + (known ? '' : `<option value="${esc(cur)}" selected>${esc(cur)}</option>`);
    $('b-undo').disabled = !undo.length; $('b-del').disabled = !names.includes(cur);
  }
  function render() { renderHeader(); renderScore(); renderTimeline(); renderTabs(); }

  /* ---------- ввод ---------- */
  const LIST = { staff: 'staff', capex: 'capex', batch: 'batches', plan: 'plan' };
  const FLD = { type: 'тип', cat: 'раздел', start: 'штук на старте', name: 'название', group: 'группа', salary: 'оклад', from: 'работает с', to: 'работает по', amount: 'сумма', month: 'месяц', day: 'день оплаты', reserve: 'резерв', qty: 'штук', l: 'литров в сутки', price: 'цена', liters: 'план, л в месяц', moq: 'партия', lead: 'заказ за месяцев', first: 'первый заказ', ship: 'транспорт партии' };
  document.addEventListener('change', e => {
    const t = e.target, b = t.dataset && t.dataset.bind; if (t.id === 'scn') { loadScn(t.value); return; } if (!b) return;
    const a = b.split(':'), kind = a[0], id = a[1], field = a[2], f = t.dataset.fmt || 'txt', s = st.s;
    let v = t.type === 'checkbox' ? t.checked : (f === 'txt' || f === 'group') ? t.value.trim() : parse(t.value, f);
    if (kind === 'contrib' && t.value.trim() === '') v = 0;
    if (kind === 'lev') { if (v === null) { rerender(); return; } st.lev = st.lev || {}; st.lev[id] = v; persist(); renderTabs(); return; }
    if (v === null || v === '') { toast('Здесь нужно значение'); rerender(); return; }
    if (typeof v === 'number' && v < 0 && !(kind === 'p' && /idx/.test(id))) { toast('Отрицательные значения не подходят'); rerender(); return; }
    if (kind === 'p') { const mt = Meta.by[id], old = s.p[id]; if (old === v) { rerender(); return; } const dv = x => id === 'payout_on' ? (x ? 'да' : 'нет') : mt.opts ? ((mt.opts.find(o => o[0] === x) || [0, x])[1]) : disp(x, mt.fmt); act(`${mt.label}: ${dv(old)} → ${dv(v)}`, () => { s.p[id] = v; }); return; }
    if (kind === 'contrib') { const old = +s.contrib[id] || 0; if (old === v) return; act(`Факт взноса инвестора за ${mLabel(+id)}: ${rub(old)} → ${rub(v)}`, () => { if (v > 0) s.contrib[id] = v; else delete s.contrib[id]; }); return; }
    if (kind === 'mat') { const mt = s.mats.find(x => x.key === id), old = mt[field]; if (old === v) return; act(`${mt.name}, ${FLD[field]}: ${disp(old, f)} → ${disp(v, f)}`, () => { mt[field] = v; }); return; }
    if (kind === 'ut') { const u = s.utypes.find(x => x.id === id), old = u[field]; if (old === v) { rerender(); return; } act(field === 'name' ? `Тип установки переименован: ${old} → ${v}` : `${u.name}, ${FLD[field]}: ${disp(old, f)} → ${disp(v, f)}`, () => { u[field] = v; }); return; }
    const it = s[LIST[kind]].find(x => x.id === id); if (!it) return; const old = it[field];
    if (field === 'day') v = clamp(v, 1, 28); if (field === 'from' && v > it.to) v = it.to; if (field === 'to' && v < it.from) v = it.from;
    if (old === v) { rerender(); return; }
    const who = kind === 'staff' ? (it.name || 'Сотрудник') : kind === 'capex' ? '«' + it.name + '»' : kind === 'batch' ? 'Партия ' + tOf(s, it.type).name + ' ×' + it.qty : 'План продаж с ' + mLabel(it.month), dz = x => field === 'type' ? tOf(s, x).name : disp(x, f);
    act(field === 'name' ? `Переименовано: ${old} → ${v}` : `${who}, ${FLD[field]}: ${dz(old)} → ${dz(v)}`, () => { it[field] = v; });
  });
  function loadScn(name) { const src = name === 'База' ? BASE_S : st.saved[name]; if (!src) return; undo.push(JSON.stringify({ s: st.s, journal: st.journal })); st.s = migrate(clone(src)); st.s.name = name; st.journal = []; res = S.sim(st.s); afterChange(); toast('Открыт сценарий «' + name + '»'); }
  async function xlsx() {
    if (!window.ExcelJS) { toast('Не загрузилась библиотека Excel. Проверьте интернет и обновите страницу.'); return; }
    const btn = $('b-xlsx'); btn.disabled = true;
    try {
      const b = window.Xls.build(window.ExcelJS, st.s, res, st.journal.slice().reverse()), buf = await b.wb.xlsx.writeBuffer();
      const fname = 'АРКТИКА_' + st.s.name.replace(/[^0-9A-Za-zА-Яа-яЁё-]+/g, '_') + '.xlsx', blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      if (!(window.claude && window.claude.use)) { // страница открыта вне Claude (GitHub Pages, файл с диска): обычное скачивание браузером
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Файл Excel скачан'); return; }
      const dl = await window.claude.use('downloads');
      if (!dl) { toast('Скачивание недоступно в этом окне. Откройте страницу в Claude.'); return; }
      await dl.save({ filename: fname, data: blob }); toast('Файл Excel сохранён');
    } catch (err) { toast(err && err.code === 'declined' ? 'Сохранение отменено' : 'Не удалось сохранить файл' + (err && err.code ? ': ' + err.code : '')); }
    finally { btn.disabled = false; }
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act]'); if (!t) return; const a = t.dataset.act.split(':'), s = st.s, p = s.p;
    switch (a[0]) {
      case 'tab': st.tab = a[1]; persist(); renderTabs(); break;
      case 'zoom': st.zoom = a[1]; stopPlay(); persist(); renderTimeline(); $('tl-scroll').scrollLeft = 0; break;
      case 'play': play(); break;
      case 'theme': theme = theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(TKEY, theme); } catch (x) { } applyTheme(); render(); break;
      case 'pan': { const sc = $('tl-scroll'); stopPlay(); sc.scrollBy({ left: +a[1] * sc.clientWidth * 0.8, behavior: 'smooth' }); break; }
      case 'undo': if (undo.length) { const o = JSON.parse(undo.pop()); st.s = o.s; st.journal = o.journal; res = S.sim(st.s); persist(); render(); toast('Ход отменён'); } break;
      case 'reset': loadScn('База'); break;
      case 'save': $('savebox').hidden = false; $('b-save').hidden = true; $('scnname').value = s.name === 'База' ? '' : s.name; $('scnname').focus(); break;
      case 'savecancel': $('savebox').hidden = true; $('b-save').hidden = false; break;
      case 'saveok': { const n = $('scnname').value.trim(); if (!n || n === 'База') { toast('Дайте сценарию своё название'); break; } s.name = n; st.saved[n] = clone(s); $('savebox').hidden = true; $('b-save').hidden = false; if (st.best && res.k.paybackM && Math.abs(st.best.invest - res.k.invest) < 1) st.best.name = n; persist(); render(); toast('Сценарий «' + n + '» сохранён'); break; }
      case 'delscn': if (st.saved[s.name]) { const n = s.name; delete st.saved[n]; persist(); render(); toast('Сценарий «' + n + '» удалён из сохранённых'); } break;
      case 'xlsx': xlsx(); break;
      case 'clearj': st.journal = []; persist(); renderTabs(); break;
      case 'tm': st.tmAll = a[1] === '1'; renderTabs(); break;
      case 'tmc': st.tmCol = a[1]; renderTabs(); break;
      case 'lever': { const i = +a[1], v = levVal(i); if (!v) { toast('Впишите значение рычага'); break; } act('Рычаг: ' + levText(i, s), z => LEVERS[i].f(z, v)); break; }
      case 'plancap': { const b = s.batches.find(x => x.id === a[1]); if (!b) break; const mo = Math.max(b.month, p.start_m), cap = Math.round(capAt(s, mo)); act(`План продаж с ${mLabel(mo)} поднят до мощности: ${pcs(cap)} л в месяц`, () => { const ex = s.plan.find(q => q.month === mo); if (ex) ex.liters = cap; else s.plan.push({ id: newId(), month: mo, liters: cap }); }); break; }
      case 'add':
        if (a[1] === 'staff') act('Добавлен сотрудник: Новый сотрудник, 60 000 ₽', () => { s.staff.push({ id: newId(), name: 'Новый сотрудник', group: 'prod', salary: 60000, from: Math.max(1, p.start_m - 1), to: N }); });
        if (a[1] === 'capex') act('Добавлена строка вложений (сумма пока 0)', () => { s.capex.push({ id: newId(), cat: 'Прочее', name: 'Новая строка', amount: 0, month: 2, day: 10, reserve: true, auto: null }); });
        if (a[1] === 'batch') { const u = tOf(s, a[2]); act('Добавлена партия: 10 × ' + u.name + ', запуск ' + mLabel(10), () => { s.batches.push({ id: newId(), type: a[2], qty: 10, month: 10 }); }); }
        if (a[1] === 'plan') { const last = s.plan.slice().sort((x, y) => y.month - x.month)[0], mo = Math.min(N, last.month + 6); act('Добавлен уровень плана продаж с ' + mLabel(mo), () => { s.plan.push({ id: newId(), month: mo, liters: last.liters }); }); }
        break;
      case 'del': { const arr = s[LIST[a[1]]], it = arr.find(x => x.id === a[2]); if (!it) break;
        const txt = a[1] === 'staff' ? 'Убран сотрудник: ' + it.name + ', ' + rub(it.salary) : a[1] === 'capex' ? 'Убрана покупка «' + it.name + '», ' + rub(it.amount) : a[1] === 'batch' ? 'Убрана партия ' + tOf(s, it.type).name + ' ×' + it.qty + ' (' + mLabel(it.month) + ')' : 'Убран уровень плана продаж с ' + mLabel(it.month);
        act(txt, () => { arr.splice(arr.indexOf(it), 1); }); break; }
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches && e.target.matches('input[data-bind]')) e.target.blur(); if (e.key === 'Enter' && e.target.id === 'scnname') document.querySelector('[data-act="saveok"]').click(); });
  initTimelineEvents(); render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderTimeline);
})();

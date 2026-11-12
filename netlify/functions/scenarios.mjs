// Общие сценарии игры АРКТИКА: хранятся в Netlify Blobs, видны всем посетителям сайта.
//   GET    /api/scenarios          — список (название, автор, дата, итоги)
//   GET    /api/scenarios?id=...   — один сценарий целиком
//   POST   /api/scenarios          — опубликовать сценарий {name, author, code, scenario, kpi}
//   DELETE /api/scenarios?id=...   — скрыть сценарий (только с кодом владельца в заголовке x-admin-code, закодированным encodeURIComponent)
// Переменные окружения сайта (Project configuration → Environment variables):
//   TEAM_CODE  — если задан, публиковать можно только с этим кодом; если нет — публикация открыта всем
//   ADMIN_CODE — код владельца для удаления; если не задан, удаление через сайт выключено
import { getStore } from '@netlify/blobs';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const num = v => (typeof v === 'number' && isFinite(v)) ? v : 0;
const MAX_BYTES = 300000, MAX_LIST = 300;

export async function handle(req, store, env) {
  const url = new URL(req.url), id = url.searchParams.get('id'), teamCode = env.TEAM_CODE || '', adminCode = env.ADMIN_CODE || '';
  try {
    if (req.method === 'GET' && id) {
      const s = await store.get(id, { type: 'json' });
      return s ? json({ ok: true, id, scenario: s }) : json({ error: 'not_found' }, 404);
    }
    if (req.method === 'GET') {
      const { blobs } = await store.list();
      const rows = await Promise.all(blobs.slice(-MAX_LIST).map(async b => { const m = await store.getMetadata(b.key); return m && m.metadata ? Object.assign({ id: b.key }, m.metadata) : null; }));
      const items = rows.filter(Boolean).sort((a, b) => String(b.created).localeCompare(String(a.created)));
      return json({ ok: true, needCode: !!teamCode, canHide: !!adminCode, items });
    }
    if (req.method === 'POST') {
      const text = await req.text();
      if (text.length > MAX_BYTES) return json({ error: 'too_large' }, 413);
      let body; try { body = JSON.parse(text); } catch (e) { return json({ error: 'bad_json' }, 400); }
      if (teamCode && String(body.code || '') !== teamCode) return json({ error: 'bad_code' }, 403);
      const s = body.scenario;
      if (!(s && typeof s.p === 'object' && Array.isArray(s.staff) && Array.isArray(s.capex) && Array.isArray(s.mats))) return json({ error: 'bad_scenario' }, 400);
      const name = clean(body.name, 60), author = clean(body.author, 40);
      if (!name) return json({ error: 'no_name' }, 400);
      const k = body.kpi || {}, newId = Date.now().toString(36).padStart(9, '0') + Math.random().toString(36).slice(2, 7);
      s.name = name;
      await store.setJSON(newId, s, { metadata: { name, author, created: new Date().toISOString(), invest: num(k.invest), pb: num(k.pb), est: num(k.est), profit28: num(k.profit28) } });
      return json({ ok: true, id: newId });
    }
    if (req.method === 'DELETE' && id) {
      let given = ''; try { given = decodeURIComponent(req.headers.get('x-admin-code') || ''); } catch (e) { }
      if (!adminCode || given !== adminCode) return json({ error: 'forbidden' }, 403);
      await store.delete(id);
      return json({ ok: true });
    }
    return json({ error: 'method' }, 405);
  } catch (e) {
    return json({ error: 'server', message: String((e && e.message) || e) }, 500);
  }
}

export default async (req) => {
  const env = { TEAM_CODE: (globalThis.Netlify && Netlify.env.get('TEAM_CODE')) || process.env.TEAM_CODE, ADMIN_CODE: (globalThis.Netlify && Netlify.env.get('ADMIN_CODE')) || process.env.ADMIN_CODE };
  return handle(req, getStore({ name: 'scenarios', consistency: 'strong' }), env);
};

export const config = { path: '/api/scenarios' };

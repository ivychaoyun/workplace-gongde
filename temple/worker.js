// 線上版：Cloudflare Worker。網頁檔案由 public/ 提供，這裡只處理 /api/rap
import Anthropic from '@anthropic-ai/sdk';
import { writeRap } from './rap.js';

const json = (code, body) => new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== '/api/rap') return env.ASSETS.fetch(req);
    if (req.method !== 'POST') return json(405, { error: 'method' });
    // 只接受功德所自己網頁送來的請求，別的網站不能拿來用
    const origin = req.headers.get('origin');
    if (!origin || new URL(origin).host !== url.host) return json(403, { error: 'origin' });
    if (!env.ANTHROPIC_API_KEY) return json(503, { error: 'no_key' });
    const ip = req.headers.get('cf-connecting-ip') || 'anon';
    const { success } = await env.RAP_LIMIT.limit({ key: ip });
    if (!success) return json(429, { error: 'too_many' });
    const raw = await req.text();
    if (raw.length > 4000) return json(413, { error: 'too_long' });
    let complaint = '';
    try { complaint = String(JSON.parse(raw || '{}').complaint || '').trim().slice(0, 300); } catch { return json(400, { error: 'bad_json' }); }
    if (!complaint) return json(400, { error: 'empty' });
    try {
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 40_000, maxRetries: 1 });
      const rap = await writeRap(client, complaint);
      return rap ? json(200, rap) : json(422, { error: 'declined' });
    } catch (e) {
      console.error(e);
      return json(500, { error: 'server' });
    }
  },
};

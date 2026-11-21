// 職場功德所的小伺服器：送出網頁，並把使用者的職場抱怨交給 Claude 寫成 rap 歌詞。
// 本機測試用：在這個資料夾放 .env（ANTHROPIC_API_KEY=...），再執行 npm start。線上版是 worker.js
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { writeRap } from './rap.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 7310;
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ timeout: 40_000, maxRetries: 1 }) : null;

// 簡單的流量限制：每個 IP 10 分鐘內最多 8 首
const hits = new Map();
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 600_000);
  list.push(now); hits.set(ip, list);
  return list.length > 8;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/rap') {
      if (!client) return send(res, 503, { error: 'no_key' });
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      if (limited(ip)) return send(res, 429, { error: 'too_many' });
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 4000) return send(res, 413, { error: 'too_long' }); }
      const complaint = String(JSON.parse(raw || '{}').complaint || '').trim().slice(0, 300);
      if (!complaint) return send(res, 400, { error: 'empty' });
      const rap = await writeRap(client, complaint);
      return rap ? send(res, 200, rap) : send(res, 422, { error: 'declined' });
    }
    if (req.method === 'GET') {
      // 送出 public/ 裡的檔案（網頁、圖片），路徑不能跑出 public/
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/index.html';
      if (!path.extname(p)) p += '.html';
      const PUB = path.join(DIR, 'public'), file = path.join(PUB, p);
      if (file.startsWith(PUB + path.sep)) {
        try { return send(res, 200, await readFile(file), TYPES[path.extname(file)] || 'application/octet-stream'); } catch {}
      }
    }
    send(res, 404, { error: 'not_found' });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'server' });
  }
}).listen(PORT, () => console.log(`職場功德所 http://localhost:${PORT}${client ? '' : '（沒有 API key，歌詞會用備用版）'}`));

/* ask-aira.com — static site server + demo-request lead API
 * Plain Node http server (no framework) + pg for Postgres.
 * Static files live in ./public. Leads land in the `leads` table;
 * if the DB is unreachable they fall back to leads-fallback.jsonl
 * so no lead is ever lost.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const { Pool } = require('pg');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');
const FALLBACK_FILE = path.join(__dirname, 'leads-fallback.jsonl');

/* ---------- database ---------- */

let pool = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl: process.env.DATABASE_URL.includes('railway.internal')
      ? false
      : { rejectUnauthorized: false },
  });
} else {
  console.warn('[leads] DATABASE_URL not set — leads will be written to leads-fallback.jsonl only');
}

async function initDb() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id           SERIAL PRIMARY KEY,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      first_name   TEXT NOT NULL,
      last_name    TEXT NOT NULL,
      email        TEXT NOT NULL,
      company      TEXT NOT NULL,
      role         TEXT,
      company_size TEXT,
      interest     TEXT,
      message      TEXT,
      ip           TEXT,
      user_agent   TEXT
    )
  `);
  console.log('[leads] table ready');
}

async function saveLead(lead) {
  if (pool) {
    try {
      const r = await pool.query(
        `INSERT INTO leads (first_name, last_name, email, company, role, company_size, interest, message, ip, user_agent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [lead.first_name, lead.last_name, lead.email, lead.company, lead.role,
         lead.company_size, lead.interest, lead.message, lead.ip, lead.user_agent]
      );
      return { stored: 'db', id: r.rows[0].id };
    } catch (err) {
      console.error('[leads] DB insert failed, using fallback file:', err.message);
    }
  }
  await fsp.appendFile(FALLBACK_FILE, JSON.stringify({ ...lead, created_at: new Date().toISOString() }) + '\n');
  return { stored: 'file' };
}

/* ---------- validation (error copy per copy deck §8.4) ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateLead(b) {
  const errors = {};
  const s = (v) => (typeof v === 'string' ? v.trim().slice(0, 500) : '');
  const lead = {
    first_name: s(b.first_name),
    last_name: s(b.last_name),
    email: s(b.email).toLowerCase(),
    company: s(b.company),
    role: s(b.role),
    company_size: s(b.company_size),
    interest: s(b.interest),
    message: typeof b.message === 'string' ? b.message.trim().slice(0, 4000) : '',
  };
  if (!lead.first_name) errors.first_name = 'Please enter your name.';
  if (!lead.last_name) errors.last_name = 'Please enter your name.';
  if (!lead.email) errors.email = 'Please enter your work email.';
  else if (!EMAIL_RE.test(lead.email)) errors.email = 'Please enter a valid work email address.';
  if (!lead.company) errors.company = 'Please enter your company name.';
  return { lead, errors, ok: Object.keys(errors).length === 0 };
}

/* ---------- rate limiting (simple in-memory) ---------- */

const hits = new Map(); // ip -> [timestamps]
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 min
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // memory guard
  return list.length > 8; // max 8 submissions / 10 min / IP
}

function clientIp(req) {
  // Behind Railway's proxy the LAST x-forwarded-for entry is the one the
  // trusted proxy appended — earlier entries are client-supplied and spoofable.
  const xff = String(req.headers['x-forwarded-for'] || '');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.socket.remoteAddress || '';
}

/* ---------- static file serving ---------- */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json' });
}

function redirect(res, location) {
  send(res, 301, '', { Location: location, 'Cache-Control': 'no-cache' });
}

async function send404(req, res) {
  try {
    const nf = await fsp.readFile(path.join(PUBLIC_DIR, '404.html'));
    sendBody(req, res, 404, nf, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  } catch {
    send(res, 404, 'Not found', { 'Cache-Control': 'no-cache' });
  }
}

// gzip-aware body sender for text types
function sendBody(req, res, status, data, headers) {
  const type = headers['Content-Type'] || '';
  const wantsGzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
  const ext = '.' + (type.split('/')[1] || '').split(';')[0];
  const compressible = /^(text\/|application\/(json|xml|manifest))/.test(type) || type.includes('svg') || type.includes('javascript');
  if (wantsGzip && compressible && data.length > 1024) {
    data = zlib.gzipSync(data);
    headers['Content-Encoding'] = 'gzip';
  }
  headers['Vary'] = 'Accept-Encoding';
  send(res, status, data, headers);
}

async function serveStatic(req, res, urlPath) {
  // sanitize
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.includes('..') || p.includes('\0')) return send(res, 400, 'Bad request');

  // canonicalize: strip trailing slash (301) so one URL form is served
  if (p.length > 1 && p.endsWith('/')) return redirect(res, p.replace(/\/+$/, ''));
  // canonicalize: .html and /index variants 301 to the clean URL
  if (p === '/index.html' || p === '/index') return redirect(res, '/');
  if (p.endsWith('.html')) return redirect(res, p.slice(0, -5));

  if (p === '/') p = '/index.html';

  let filePath = path.join(PUBLIC_DIR, p);

  // clean URLs: /platform -> /platform.html, /docs -> /docs/index.html
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) filePath += '.html';
    else if (fs.existsSync(path.join(filePath, 'index.html'))) filePath = path.join(filePath, 'index.html');
  }

  // containment: must stay inside PUBLIC_DIR (trailing separator prevents /public-evil siblings)
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) return send(res, 400, 'Bad request');

  let stat;
  try {
    stat = await fsp.stat(filePath);
    if (!stat.isFile()) return send404(req, res);
  } catch {
    return send404(req, res);
  }

  // conditional GET: Last-Modified / If-Modified-Since -> 304
  const lastMod = stat.mtime.toUTCString();
  const ims = req.headers['if-modified-since'];
  if (ims && new Date(ims).getTime() >= Math.floor(stat.mtime.getTime() / 1000) * 1000) {
    return send(res, 304, '', { 'Last-Modified': lastMod });
  }

  try {
    const data = await fsp.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const cache = ext === '.html' ? 'no-cache' : 'public, max-age=86400';
    sendBody(req, res, 200, data, { 'Content-Type': type, 'Cache-Control': cache, 'Last-Modified': lastMod });
  } catch {
    return send404(req, res);
  }
}

/* ---------- request handling ---------- */

function readBody(req, res, limit = 64 * 1024) {
  return new Promise((resolve) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', (c) => {
      if (tooLarge) return;
      size += c.length;
      if (size > limit) {
        tooLarge = true;
        sendJson(res, 413, { ok: false, error: 'Request too large.' });
        req.resume(); // drain politely instead of destroying the socket
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(tooLarge ? null : Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(null));
  });
}

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';

  // security headers on everything
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  const pathname = url.split('?')[0];

  if (pathname === '/api/health') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    }
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/lead') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    }
    try {
      const ip = clientIp(req);
      if (rateLimited(ip)) {
        return sendJson(res, 429, { ok: false, error: 'Too many requests. Please try again in a few minutes.' });
      }
      const raw = await readBody(req, res);
      if (raw === null) return; // 413 already sent (or client error)
      let body;
      try { body = JSON.parse(raw); } catch { body = undefined; }
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return sendJson(res, 400, { ok: false, error: 'Invalid request.' });
      }

      // honeypot: bots fill the hidden "website" field — pretend success
      if (body.website) return sendJson(res, 200, { ok: true });

      const { lead, errors, ok } = validateLead(body);
      if (!ok) return sendJson(res, 422, { ok: false, errors });

      lead.ip = ip;
      lead.user_agent = String(req.headers['user-agent'] || '').slice(0, 300);
      const result = await saveLead(lead);
      console.log(`[leads] new lead: ${lead.email} (${lead.company}) → ${result.stored}${result.id ? ' #' + result.id : ''}`);
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error('[leads] error:', err.message);
      return sendJson(res, 500, { ok: false });
    }
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return serveStatic(req, res, url);
  }

  sendJson(res, 405, { ok: false, error: 'Method not allowed' });
});

initDb()
  .catch((e) => console.error('[leads] DB init failed (will retry on insert):', e.message))
  .finally(() => {
    server.listen(PORT, () => console.log(`ask-aira site listening on :${PORT}`));
  });

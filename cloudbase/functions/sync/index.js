// CloudBase sync 云函数 — 云存储版（node-sdk 2.11.0，app.uploadFile/downloadFile）
// 仅按 k=sha256(同步码) 存/取 AES-GCM 密文，服务端不解密。
const tcb = require('@cloudbase/node-sdk');
const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });

// 本环境静态存储桶（fileID 前缀，跨调用稳定）
const ENV_ID = 'wzx9823-d3gmk6n9d1e3e671a';
const BUCKET = '777a-wzx9823-d3gmk6n9d1e3e671a-1471241944';
const PREFIX = 'cloud://' + ENV_ID + '.' + BUCKET + '/syncblobs/';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};
function ok(statusCode, obj) {
  return { statusCode, headers: CORS, body: JSON.stringify(obj) };
}

function fileIDFor(k) { return PREFIX + k + '.json'; }
function cloudPathFor(k) { return 'syncblobs/' + k + '.json'; }

exports.main = async (event, context) => {
  try {
    const method = (event.httpMethod ||
      (event.requestContext && event.requestContext.http && event.requestContext.http.method) ||
      (event.requestContext && event.requestContext.method) || 'GET').toUpperCase();
    if (method === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

    if (method === 'POST' || method === 'PUT') {
      let raw = event.body || event.payload || '';
      if (raw && typeof raw === 'object') raw = JSON.stringify(raw);
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) { return ok(400, { ok: false, error: 'invalid json body' }); }
      const k = parsed && parsed.k;
      const data = parsed && parsed.data;
      if (!k || typeof data !== 'string') return ok(400, { ok: false, error: 'missing k or data' });
      await app.uploadFile({ cloudPath: cloudPathFor(k), fileContent: Buffer.from(data, 'utf8') });
      return ok(200, { ok: true, t: Date.now() });
    }

    // GET
    let k = (event.queryStringParameters && event.queryStringParameters.k) || null;
    if (!k && event.queryString) {
      const qs = String(event.queryString).startsWith('?') ? event.queryString : ('?' + event.queryString);
      try { k = new URL(qs, 'http://x').searchParams.get('k'); } catch (e) {}
    }
    if (!k) return ok(400, { ok: false, error: 'missing k' });

    try {
      const dl = await app.downloadFile({ fileID: fileIDFor(k) });
      const content = dl && dl.fileContent ? dl.fileContent.toString('utf8') : null;
      return ok(200, { ok: true, data: content, t: Date.now() });
    } catch (e) {
      // 文件不存在 → 视为空
      return ok(200, { ok: true, data: null });
    }
  } catch (e) {
    return ok(500, { ok: false, error: String((e && e.message) || e) });
  }
};

// 冻干工艺优化 Web · CloudBase 云同步后端
// 职责极简：按同步码哈希 k 存/取一段 AES-GCM 密文 blob。
// 服务端不持有同步码、不解密，仅做"按 key 存取"。端到端加密在客户端完成。
const cloud = require('@cloudbase/node-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const COLL = 'sync_blobs';

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function parseBody(event) {
  try {
    if (typeof event.body === 'string') return JSON.parse(event.body || '{}');
    if (event.body && typeof event.body === 'object') return event.body;
  } catch (e) {}
  return {};
}

function getQuery(event) {
  const qs = event.queryString;
  if (qs && typeof qs === 'object') return qs;
  if (event.queryStringParameters && typeof event.queryStringParameters === 'object') return event.queryStringParameters;
  return {};
}

exports.main = async (event, context) => {
  const headers = corsHeaders();
  const method = (event.httpMethod || event.method || 'GET').toUpperCase();

  // 预检
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: Object.assign({}, headers, { 'Content-Type': 'text/plain' }), body: '' };
  }

  try {
    if (method === 'POST') {
      const body = parseBody(event);
      const k = body.k;
      const data = body.data;
      if (!k || data == null) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, reason: 'missing k/data' }) };
      }
      const exist = await db.collection(COLL).doc(k).get();
      if (exist.data && exist.data.length) {
        await db.collection(COLL).doc(k).update({ data: { blob: data, updatedAt: Date.now() } });
      } else {
        await db.collection(COLL).doc(k).add({ _id: k, blob: data, updatedAt: Date.now() });
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // GET ?k=...
    const q = getQuery(event);
    const k = q.k || event.k;
    if (!k) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, reason: 'missing k' }) };
    }
    const res = await db.collection(COLL).doc(k).get();
    const blob = (res.data && res.data.length) ? res.data[0].blob : null;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(blob ? { ok: true, data: blob } : { ok: true })
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, reason: String((e && e.message) || e) }) };
  }
};

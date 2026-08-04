// ─────────────────────────────────────────────
//  Sesión firmada con HMAC. Sin dependencias.
//  Handlers en formato Node (req, res), que es
//  el que invoca Vercel en proyectos estáticos.
// ─────────────────────────────────────────────
import { createHmac, timingSafeEqual, randomBytes, scryptSync } from 'node:crypto';

const COOKIE_NAME = 'sb_admin';
const MAX_AGE = 60 * 60 * 8; // 8 horas

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('Falta la variable de entorno SESSION_SECRET (mínimo 16 caracteres).');
  }
  return s;
}

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64url = (str) =>
  Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function sign(data) {
  return b64url(createHmac('sha256', secret()).update(data).digest());
}

/** Compara dos textos en tiempo constante. */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) {
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export function createToken(user) {
  const payload = b64url(JSON.stringify({ u: user, exp: Date.now() + MAX_AGE * 1000 }));
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  if (!safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(fromB64url(payload).toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

/** Lee las cookies tanto de un req de Node como de un Request web. */
export function parseCookies(req) {
  let header = '';
  if (req?.headers?.get) header = req.headers.get('cookie') || '';
  else if (req?.headers) header = req.headers.cookie || '';
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// En Vercel siempre hay HTTPS, pero en `vercel dev` (http://localhost) el
// navegador descarta cualquier cookie marcada como Secure y el login se queda
// dando vueltas sin explicación. Por eso el flag es condicional.
const SECURE = process.env.VERCEL ? ' Secure;' : '';

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly;${SECURE} SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`;
}

export function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly;${SECURE} SameSite=Strict; Path=/; Max-Age=0`;
}

/** Devuelve la sesión si la petición está autenticada, si no null. */
export function getSession(req) {
  return verifyToken(parseCookies(req)[COOKIE_NAME]);
}

/**
 * Valida usuario y contraseña contra las variables de entorno.
 * Admite ADMIN_PASSWORD_HASH (formato scrypt "salt:hash") o ADMIN_PASSWORD en texto plano.
 */
export function checkCredentials(user, password) {
  const expectedUser = process.env.ADMIN_USER;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const plain = process.env.ADMIN_PASSWORD;

  if (!expectedUser || (!hash && !plain)) {
    throw new Error(
      'Faltan variables de entorno en Vercel: ADMIN_USER y ADMIN_PASSWORD (o ADMIN_PASSWORD_HASH).'
    );
  }
  if (typeof user !== 'string' || typeof password !== 'string') return false;

  const userOk = safeEqual(user.trim().toLowerCase(), expectedUser.trim().toLowerCase());

  let passOk = false;
  if (hash) {
    const [salt, digest] = hash.split(':');
    if (salt && digest) {
      passOk = safeEqual(scryptSync(password, salt, 32).toString('hex'), digest);
    }
  } else {
    passOk = safeEqual(password, plain);
  }
  return userOk && passOk;
}

/** Genera un hash scrypt para guardar en ADMIN_PASSWORD_HASH. */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

/* ═════════ AYUDANTES HTTP (formato Node) ═════════ */

/** Responde JSON. Siempre cierra la respuesta. */
export function sendJson(res, status, data, headers = {}) {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

/** Lee el cuerpo JSON, ya venga parseado por Vercel o como flujo. */
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Envuelve un handler para que ningún error quede sin respuesta.
 * Sin esto, una excepción produce un 500 vacío imposible de diagnosticar.
 */
export function withErrors(handler) {
  return async function (req, res) {
    try {
      await handler(req, res);
    } catch (err) {
      console.error('[api] Error no controlado:', err);
      if (!res.headersSent) {
        sendJson(res, 500, { error: err?.message || 'Error interno del servidor' });
      } else {
        res.end();
      }
    }
  };
}

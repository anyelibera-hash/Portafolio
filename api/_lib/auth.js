// ─────────────────────────────────────────────
//  Sesión firmada con HMAC. Sin dependencias.
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

/** Compara dos strings en tiempo constante. */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) {
    // Igual hacemos una comparación para no filtrar la longitud por tiempo.
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/** Crea el token de sesión: payload.firma */
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

export function parseCookies(request) {
  const header = request.headers.get('cookie') || '';
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`;
}

export function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

/** Devuelve la sesión si la petición está autenticada, si no null. */
export function getSession(request) {
  return verifyToken(parseCookies(request)[COOKIE_NAME]);
}

/**
 * Valida usuario y contraseña contra las variables de entorno.
 * Admite ADMIN_PASSWORD_HASH (formato scrypt: salt:hash) o ADMIN_PASSWORD en texto plano.
 */
export function checkCredentials(user, password) {
  const expectedUser = process.env.ADMIN_USER;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const plain = process.env.ADMIN_PASSWORD;

  if (!expectedUser || (!hash && !plain)) {
    throw new Error('Faltan las variables de entorno ADMIN_USER y ADMIN_PASSWORD.');
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
  // Evaluamos ambos siempre para no filtrar cuál falló.
  return userOk && passOk;
}

/** Genera un hash scrypt para guardar en ADMIN_PASSWORD_HASH. */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

/** Respuesta 401 estándar. */
export const unauthorized = () => json({ error: 'No autorizado' }, 401);

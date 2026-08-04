import {
  checkCredentials, createToken, sessionCookie, sendJson, readJson, withErrors,
} from './_lib/auth.js';

// Freno básico de fuerza bruta por instancia.
const attempts = new Map();
const WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function tooManyAttempts(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW) {
    attempts.set(ip, { count: 0, first: now });
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

function registerFailure(ip) {
  const rec = attempts.get(ip) || { count: 0, first: Date.now() };
  rec.count += 1;
  attempts.set(ip, rec);
}

export default withErrors(async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' });

  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim() || 'desconocida';

  if (tooManyAttempts(ip)) {
    return sendJson(res, 429, { error: 'Demasiados intentos fallidos. Espera 15 minutos.' });
  }

  const body = await readJson(req);
  if (!body) return sendJson(res, 400, { error: 'Petición inválida' });

  // Si faltan las variables de entorno, checkCredentials lanza un error
  // con el mensaje exacto y withErrors lo devuelve como JSON legible.
  const ok = checkCredentials(body.user, body.password);

  if (!ok) {
    registerFailure(ip);
    await new Promise((r) => setTimeout(r, 600));
    return sendJson(res, 401, { error: 'Usuario o contraseña incorrectos' });
  }

  attempts.delete(ip);
  return sendJson(res, 200, { ok: true, user: body.user }, {
    'set-cookie': sessionCookie(createToken(body.user)),
  });
});

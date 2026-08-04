import { checkCredentials, createToken, sessionCookie, json } from './_lib/auth.js';

// Freno básico de fuerza bruta por instancia (se reinicia con cada arranque en frío).
const attempts = new Map();
const WINDOW = 15 * 60 * 1000; // 15 min
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

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'desconocida';

  if (tooManyAttempts(ip)) {
    return json({ error: 'Demasiados intentos fallidos. Espera 15 minutos.' }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Petición inválida' }, 400);
  }

  try {
    const ok = checkCredentials(body?.user, body?.password);
    if (!ok) {
      registerFailure(ip);
      // Pequeño retardo para desalentar el barrido automático.
      await new Promise((r) => setTimeout(r, 600));
      return json({ error: 'Usuario o contraseña incorrectos' }, 401);
    }
    attempts.delete(ip);
    return json({ ok: true, user: body.user }, 200, {
      'set-cookie': sessionCookie(createToken(body.user)),
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

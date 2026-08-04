import { clearCookie, json } from './_lib/auth.js';

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
}

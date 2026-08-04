import { clearCookie, sendJson, withErrors } from './_lib/auth.js';

export default withErrors(async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' });
  return sendJson(res, 200, { ok: true }, { 'set-cookie': clearCookie() });
});

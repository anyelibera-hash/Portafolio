import { getSession, sendJson, withErrors } from './_lib/auth.js';

/** Revisa qué falta configurar en Vercel, sin revelar ningún valor. */
function revisarConfiguracion() {
  const faltan = [];
  const s = process.env.SESSION_SECRET;
  if (!s) faltan.push('SESSION_SECRET');
  else if (s.length < 16) faltan.push('SESSION_SECRET (demasiado corto, mínimo 16 caracteres)');
  if (!process.env.ADMIN_USER) faltan.push('ADMIN_USER');
  if (!process.env.ADMIN_PASSWORD && !process.env.ADMIN_PASSWORD_HASH) faltan.push('ADMIN_PASSWORD');
  const blobOk = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
  return { faltan, blobOk };
}

export default withErrors(async function handler(req, res) {
  let session = null;
  try {
    session = getSession(req);
  } catch {
    // SESSION_SECRET sin configurar: se reporta abajo, sin romper nada.
  }
  const { faltan, blobOk } = revisarConfiguracion();
  return sendJson(
    res,
    200,
    {
      authenticated: !!session,
      user: session?.u || null,
      configurado: faltan.length === 0,
      faltan,
      almacenamiento: blobOk,
    },
    { 'cache-control': 'no-store' }
  );
});

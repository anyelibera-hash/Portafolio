import { getSession, sendJson, readJson, withErrors } from './_lib/auth.js';

const PREFIJO = 'portafolio/';
const CONTENIDO = 'portafolio/content.json';

/** Solo aceptamos URLs del propio store y dentro de portafolio/. */
function urlDelStore(valor) {
  let u;
  try {
    u = new URL(String(valor));
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  if (!u.hostname.endsWith('.blob.vercel-storage.com')) return null;
  const pathname = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  if (!pathname.startsWith(PREFIJO)) return null;
  if (pathname === CONTENIDO) return null; // nunca borrar el contenido publicado
  return `${u.origin}${u.pathname}`;
}

export default withErrors(async function handler(req, res) {
  let session;
  try {
    session = getSession(req);
  } catch (err) {
    return sendJson(res, 500, { error: err.message });
  }
  if (!session) return sendJson(res, 401, { error: 'No autorizado' });

  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return sendJson(res, 500, { error: 'Vercel Blob no está configurado.' });
  }

  /* ── Listar archivos subidos ── */
  if (req.method === 'GET') {
    const { list } = await import('@vercel/blob');
    const folder = (req.query?.folder || '').toString();
    const prefix = folder ? `${PREFIJO}${folder}/` : PREFIJO;
    const { blobs } = await list({ prefix, limit: 1000 });
    const items = blobs
      .filter((b) => b.pathname !== CONTENIDO)
      .map((b) => ({
        url: b.url,
        pathname: b.pathname,
        name: b.pathname.split('/').pop(),
        folder: b.pathname.split('/')[1] || '',
        size: b.size,
        uploadedAt: b.uploadedAt,
      }))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    return sendJson(res, 200, { items }, { 'cache-control': 'no-store' });
  }

  /* ── Borrar uno o varios archivos ── */
  if (req.method === 'DELETE' || req.method === 'POST') {
    const body = await readJson(req);
    const pedidas = body?.urls ? [].concat(body.urls) : body?.url ? [body.url] : [];
    if (!pedidas.length) return sendJson(res, 400, { error: 'No se indicó ningún archivo' });

    const validas = [];
    const rechazadas = [];
    for (const v of pedidas) {
      const ok = urlDelStore(v);
      if (ok) validas.push(ok);
      else rechazadas.push(String(v));
    }
    if (!validas.length) {
      return sendJson(res, 400, {
        error: 'Ninguna URL es un archivo borrable de este portafolio.',
        rechazadas,
      });
    }

    const { del } = await import('@vercel/blob');
    // del() acepta un array, pero si una URL ya no existe conviene no tumbar el resto.
    const borradas = [];
    const fallidas = [];
    for (const u of validas) {
      try {
        await del(u);
        borradas.push(u);
      } catch (err) {
        fallidas.push({ url: u, error: err?.message || 'error desconocido' });
      }
    }
    return sendJson(res, 200, { ok: fallidas.length === 0, borradas, fallidas, rechazadas });
  }

  return sendJson(res, 405, { error: 'Método no permitido' });
});

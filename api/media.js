import { getSession, sendJson, readJson, withErrors } from './_lib/auth.js';

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
    const prefix = folder ? `portafolio/${folder}/` : 'portafolio/';
    const { blobs } = await list({ prefix, limit: 1000 });
    const items = blobs
      .filter((b) => b.pathname !== 'portafolio/content.json')
      .map((b) => ({
        url: b.url,
        pathname: b.pathname,
        name: b.pathname.split('/').pop(),
        size: b.size,
        uploadedAt: b.uploadedAt,
      }))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    return sendJson(res, 200, { items }, { 'cache-control': 'no-store' });
  }

  /* ── Borrar un archivo ── */
  if (req.method === 'DELETE') {
    const body = await readJson(req);
    if (!body?.url || !String(body.url).includes('.blob.vercel-storage.com')) {
      return sendJson(res, 400, { error: 'URL no válida' });
    }
    const { del } = await import('@vercel/blob');
    await del(body.url);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 405, { error: 'Método no permitido' });
});

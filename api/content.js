import { getSession, sendJson, readJson, withErrors } from './_lib/auth.js';

const BLOB_PATH = 'portafolio/content.json';

/**
 * El almacenamiento se carga de forma perezosa: si Vercel Blob todavía no
 * está configurado, la web pública sigue funcionando con el content.json
 * del repositorio (el navegador lo pide como respaldo).
 */
async function blob() {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    throw new Error(
      'Vercel Blob no está configurado. Créalo en Storage → Create Database → Blob.'
    );
  }
  return import('@vercel/blob');
}

export default withErrors(async function handler(req, res) {
  /* ── Lectura pública ── */
  if (req.method === 'GET') {
    try {
      const { list } = await blob();
      // limit: 1 era un fallo silencioso — si el store devolvía antes cualquier
      // otro blob con ese prefijo, `found` quedaba vacío y la web se iba al
      // respaldo del repositorio, perdiendo de vista lo publicado en el panel.
      const { blobs } = await list({ prefix: BLOB_PATH, limit: 100 });
      const found = blobs.find((b) => b.pathname === BLOB_PATH);
      if (!found) {
        // Nunca se ha publicado nada: que el navegador use /content.json
        return sendJson(res, 404, { error: 'Sin contenido publicado todavía', usarRespaldo: true });
      }
      const r = await fetch(`${found.url}?t=${Date.parse(found.uploadedAt) || Date.now()}`, {
        cache: 'no-store',
      });
      if (!r.ok) throw new Error('No se pudo leer el contenido guardado');
      const data = await r.json();
      res.setHeader('cache-control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=600');
      return sendJson(res, 200, data);
    } catch (err) {
      // Nunca rompemos la web pública por esto.
      return sendJson(res, 404, { error: err.message, usarRespaldo: true });
    }
  }

  /* ── Escritura protegida ── */
  if (req.method === 'PUT' || req.method === 'POST') {
    let session;
    try {
      session = getSession(req);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
    if (!session) return sendJson(res, 401, { error: 'No autorizado' });

    const body = await readJson(req);
    if (!body) return sendJson(res, 400, { error: 'JSON inválido' });

    const required = ['site', 'hero', 'about', 'projects', 'gallery', 'videos'];
    const missing = required.filter((k) => typeof body[k] !== 'object' || body[k] === null);
    if (missing.length) {
      return sendJson(res, 400, { error: `Faltan secciones: ${missing.join(', ')}` });
    }

    body.updatedAt = new Date().toISOString();
    body.updatedBy = session.u;

    const { put } = await blob();
    const saved = await put(BLOB_PATH, JSON.stringify(body, null, 2), {
      access: 'public',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });
    return sendJson(res, 200, { ok: true, updatedAt: body.updatedAt, url: saved.url });
  }

  return sendJson(res, 405, { error: 'Método no permitido' });
});

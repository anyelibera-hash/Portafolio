import { put, list } from '@vercel/blob';
import { getSession, json, unauthorized } from './_lib/auth.js';

const BLOB_PATH = 'portafolio/content.json';

/** Lee el contenido guardado en Blob; si no existe, usa el content.json del repositorio. */
async function readContent(request) {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    const blob = blobs.find((b) => b.pathname === BLOB_PATH);
    if (blob) {
      const res = await fetch(`${blob.url}?v=${Date.parse(blob.uploadedAt) || Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) return await res.json();
    }
  } catch {
    // Sin Blob configurado todavía → seguimos con el archivo del repositorio.
  }
  const seed = await fetch(new URL('/content.json', request.url), { cache: 'no-store' });
  if (!seed.ok) throw new Error('No se encontró el contenido base');
  return await seed.json();
}

export default async function handler(request) {
  // ── Lectura pública ──
  if (request.method === 'GET') {
    try {
      const content = await readContent(request);
      return json(content, 200, {
        'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=600',
      });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  // ── Escritura protegida ──
  if (request.method === 'PUT' || request.method === 'POST') {
    let session;
    try {
      session = getSession(request);
    } catch (err) {
      return json({ error: err.message }, 500);
    }
    if (!session) return unauthorized();

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'JSON inválido' }, 400);
    }

    // Validación mínima de forma para no guardar basura.
    const required = ['site', 'hero', 'about', 'projects', 'gallery', 'videos'];
    const missing = required.filter((k) => !body || typeof body[k] !== 'object');
    if (missing.length) {
      return json({ error: `Faltan secciones en el contenido: ${missing.join(', ')}` }, 400);
    }

    body.updatedAt = new Date().toISOString();
    body.updatedBy = session.u;

    try {
      const blob = await put(BLOB_PATH, JSON.stringify(body, null, 2), {
        access: 'public',
        contentType: 'application/json; charset=utf-8',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 0,
      });
      return json({ ok: true, updatedAt: body.updatedAt, url: blob.url });
    } catch (err) {
      return json({ error: `No se pudo guardar: ${err.message}` }, 500);
    }
  }

  return json({ error: 'Método no permitido' }, 405);
}

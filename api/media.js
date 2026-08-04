import { list, del } from '@vercel/blob';
import { getSession, json, unauthorized } from './_lib/auth.js';

export default async function handler(request) {
  let session;
  try {
    session = getSession(request);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
  if (!session) return unauthorized();

  // ── Listar archivos subidos ──
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const folder = url.searchParams.get('folder') || '';
    const prefix = folder ? `portafolio/${folder}/` : 'portafolio/';
    try {
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
      return json({ items }, 200, { 'cache-control': 'no-store' });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  // ── Borrar un archivo ──
  if (request.method === 'DELETE') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Petición inválida' }, 400);
    }
    if (!body?.url || !String(body.url).includes('.blob.vercel-storage.com')) {
      return json({ error: 'URL no válida' }, 400);
    }
    try {
      await del(body.url);
      return json({ ok: true });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }

  return json({ error: 'Método no permitido' }, 405);
}

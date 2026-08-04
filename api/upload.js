import { getSession, sendJson, readJson, withErrors } from './_lib/auth.js';

// El archivo se guarda tal cual: sin recomprimir, sin reescalar.
const ALLOWED = [
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v',
  'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
  'application/pdf',
];

export default withErrors(async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return sendJson(res, 500, {
      error: 'Vercel Blob no está configurado. Créalo en Storage → Create Database → Blob.',
    });
  }

  const body = await readJson(req);
  if (!body) return sendJson(res, 400, { error: 'Petición inválida' });

  const { handleUpload } = await import('@vercel/blob/client');

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = getSession(req);
        if (!session) throw new Error('No autorizado');

        let folder = 'media';
        try {
          const parsed = clientPayload ? JSON.parse(clientPayload) : {};
          if (['videos', 'gallery', 'projects', 'about', 'docs'].includes(parsed.folder)) {
            folder = parsed.folder;
          }
        } catch { /* carpeta por defecto */ }

        return {
          allowedContentTypes: ALLOWED,
          addRandomSuffix: true,
          maximumSizeInBytes: 500 * 1024 * 1024,
          pathname: `portafolio/${folder}/${String(pathname).replace(/^.*[\\/]/, '')}`,
          tokenPayload: JSON.stringify({ user: session.u, folder }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Subida completada:', blob.pathname);
      },
    });
    return sendJson(res, 200, result);
  } catch (err) {
    return sendJson(res, err.message === 'No autorizado' ? 401 : 400, { error: err.message });
  }
});

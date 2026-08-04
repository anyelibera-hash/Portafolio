import { handleUpload } from '@vercel/blob/client';
import { getSession, json } from './_lib/auth.js';

// Se guarda el archivo original tal cual: sin recomprimir, sin reescalar.
const ALLOWED = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'application/pdf',
];

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Petición inválida' }, 400);
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Solo un usuario con sesión válida puede obtener un token de subida.
        const session = getSession(request);
        if (!session) throw new Error('No autorizado');

        let folder = 'media';
        try {
          const parsed = clientPayload ? JSON.parse(clientPayload) : {};
          if (['videos', 'gallery', 'projects', 'about', 'docs'].includes(parsed.folder)) {
            folder = parsed.folder;
          }
        } catch {
          /* carpeta por defecto */
        }

        return {
          allowedContentTypes: ALLOWED,
          addRandomSuffix: true,
          maximumSizeInBytes: 500 * 1024 * 1024, // 500 MB
          pathname: `portafolio/${folder}/${pathname.replace(/^.*[\\/]/, '')}`,
          tokenPayload: JSON.stringify({ user: session.u, folder }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Subida completada:', blob.pathname, blob.url);
      },
    });

    return json(result);
  } catch (err) {
    const status = err.message === 'No autorizado' ? 401 : 400;
    return json({ error: err.message }, status);
  }
}

import { getSession, sendJson, readJson, withErrors } from './_lib/auth.js';

// El archivo se guarda tal cual: sin recomprimir, sin reescalar.
const ALLOWED = [
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v',
  'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
  'application/pdf',
];

// Carpetas válidas dentro del almacenamiento.
const CARPETAS = ['videos', 'gallery', 'projects', 'about', 'docs', 'media'];

/**
 * IMPORTANTE: @vercel/blob decide la ruta final con el `pathname` que manda
 * el navegador; lo que devuelva onBeforeGenerateToken se ignora. Por eso aquí
 * NO se reescribe la ruta: se valida la que llega y se rechaza si no encaja.
 */
function rutaValida(pathname) {
  const m = /^portafolio\/([a-z]+)\/([^/]+)$/.exec(String(pathname || ''));
  if (!m || !CARPETAS.includes(m[1])) return null;
  return { carpeta: m[1], nombre: m[2] };
}

export default withErrors(async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' });

  // handleUpload (subida directa desde el navegador) SIEMPRE necesita un
  // token estático para firmar los client tokens: OIDC/BLOB_STORE_ID no
  // sirve para este flujo, aunque sí sirve para put()/list()/del() del lado servidor.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return sendJson(res, 500, {
      error: 'Falta BLOB_READ_WRITE_TOKEN. El store de Blob está conectado por OIDC, pero handleUpload requiere un token estático: genéralo en el store y agrégalo como variable de entorno del proyecto, luego redeploy.',
    });
  }

  const body = await readJson(req);
  if (!body) return sendJson(res, 400, { error: 'Petición inválida' });

  const { handleUpload } = await import('@vercel/blob/client');

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const session = getSession(req);
        if (!session) throw new Error('No autorizado');

        const ruta = rutaValida(pathname);
        if (!ruta) {
          throw new Error(
            'Ruta de archivo no permitida. Recarga el panel con Ctrl+F5 y vuelve a intentarlo.'
          );
        }

        return {
          allowedContentTypes: ALLOWED,
          addRandomSuffix: true,
          maximumSizeInBytes: 500 * 1024 * 1024,
          tokenPayload: JSON.stringify({ user: session.u, carpeta: ruta.carpeta }),
        };
      },
      // Sin onUploadCompleted a propósito: ese callback obliga a Vercel Blob a
      // llamar de vuelta al despliegue y falla en local o con Deployment
      // Protection activa. No guardamos nada al terminar, así que no hace falta.
    });
    return sendJson(res, 200, result);
  } catch (err) {
    const msg = err?.message || 'No se pudo preparar la subida';
    return sendJson(res, msg === 'No autorizado' ? 401 : 400, { error: msg });
  }
});

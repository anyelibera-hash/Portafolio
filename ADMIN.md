# Panel de administración — guía de puesta en marcha

El portafolio ahora tiene un panel privado en **`tudominio.com/admin`** protegido con usuario y contraseña, sin Clerk ni servicios externos de login.

---

## 1. Configurar en Vercel (una sola vez)

### a) Crear el almacenamiento de archivos

1. Entra a tu proyecto en Vercel → pestaña **Storage** → **Create Database** → **Blob**
2. Ponle un nombre (por ejemplo `portafolio`) y elige acceso **Public**
3. Marca los entornos **Production** y **Preview**

Vercel añade sola la variable `BLOB_READ_WRITE_TOKEN`. No tienes que copiarla.

### b) Crear las variables de entorno

En **Settings → Environment Variables**, añade estas tres (entorno *Production*, y *Preview* si lo usas):

| Variable | Valor |
|---|---|
| `ADMIN_USER` | El usuario con el que entrarás. Ej.: `stefania` |
| `ADMIN_PASSWORD` | Tu contraseña. Usa una larga y que no repitas en otro sitio |
| `SESSION_SECRET` | Un texto aleatorio largo. Nunca lo escribas a mano |

Para generar el `SESSION_SECRET`, ejecuta esto en la terminal y pega el resultado:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Opcional, más seguro:** en vez de `ADMIN_PASSWORD` puedes guardar solo el hash.
> Ejecuta `node scripts/generar-hash.mjs "tu contraseña"`, guarda el resultado en
> `ADMIN_PASSWORD_HASH` y borra `ADMIN_PASSWORD`. Así tu contraseña no queda escrita
> en ningún lado, ni siquiera en el panel de Vercel.

### c) Publicar

```bash
git add .
git commit -m "Panel de administración editable"
git push
```

Vercel reconstruye solo. Entra a `tudominio.com/admin` y prueba tu usuario.

---

## 2. Cómo se usa

Cada sección de la web tiene su pantalla en el menú lateral: Portada, Sobre mí, Servicios, Proyectos, Galería, Videos, Experiencia, Herramientas, Educación, Contacto, Menú, Sitio & SEO, Pie y **Archivos**.

En las listas puedes:

- **Reordenar** — arrastra desde el icono `⠿` de la izquierda
- **Ocultar sin borrar** — el interruptor verde. Queda guardado pero no se ve en la web
- **Eliminar** — pide confirmación
- **Añadir** — botón al final de cada lista

Los cambios **no se publican hasta que pulsas "Publicar cambios"** en la barra inferior. También funciona `Ctrl+S`. Si te equivocas, "Descartar" deja todo como estaba en la última publicación.

### Contenido audiovisual

En **Videos**, cada elemento tiene dos modos:

- **Archivo de video** — subes el `.mp4` o `.mov`. Se guarda **el archivo original tal cual**: no se recomprime, no se baja la resolución, no se recorta. Límite de 500 MB por archivo.
- **Enlace de red social** — pegas la URL de Instagram, TikTok, YouTube, Vimeo o Facebook y el panel la convierte sola al formato correcto para incrustarla.

En **Galería** hay una zona de **subida rápida**: arrastra varias imágenes de golpe y se añaden todas. Después les pones título y etiqueta.

Cualquier campo de imagen o video acepta arrastrar y soltar el archivo encima.

### Borrar archivos del almacenamiento

Quitar una imagen de la galería la saca de la web, pero el archivo seguía ocupando espacio. Ahora:

- Al **eliminar un elemento** o pulsar **"Quitar"** en un campo de imagen, el panel te pregunta si quieres borrar también el archivo. Solo lo propone si ese archivo **ya no se usa en ninguna otra parte**, así que no puede romperte una imagen que estés reutilizando.
- La sección **Archivos** lista todo lo subido, marca cada uno como *En uso* o *Sin usar*, y tiene un botón para **borrar de golpe todo lo que no se usa**.

El borrado del almacenamiento es inmediato y **no se puede deshacer** (no depende de "Publicar cambios").

---

## 3. Cómo funciona por dentro

| Archivo | Para qué sirve |
|---|---|
| `content.json` | Todo el texto e imágenes del portafolio. Es el respaldo inicial |
| `assets/js/render.js` | Pinta la web a partir del contenido guardado |
| `assets/js/admin.js` | La lógica del panel |
| `admin.html` | La pantalla del panel |
| `api/login.js` · `logout.js` · `session.js` | Entrar y salir |
| `api/content.js` | Leer el contenido (público) y guardarlo (solo con sesión) |
| `api/upload.js` | Genera el permiso de subida y **valida la ruta**. El archivo va del navegador directo al almacenamiento |
| `api/media.js` | Listar y borrar archivos subidos (lo usa la sección Archivos) |

Todo lo que subes se guarda en `portafolio/<carpeta>/`, donde la carpeta depende de dónde lo subiste (`gallery`, `videos`, `projects`, `about`, `docs`). La ruta la arma el navegador y el servidor la comprueba: si no encaja, rechaza la subida.

**El HTML original sigue dentro de `index.html`.** Si un día el contenido guardado no cargara, la web se ve igual que ahora en vez de quedarse en blanco.

### Sobre la seguridad

- La contraseña se comprueba **en el servidor**. No está en el código que descarga el navegador
- La sesión va en una cookie `HttpOnly` firmada con HMAC-SHA256: no se puede falsificar sin el `SESSION_SECRET`, y JavaScript no puede leerla
- Dura 8 horas y luego pide entrar otra vez
- Tras 8 intentos fallidos bloquea 15 minutos
- Guardar contenido y subir archivos exige sesión válida; leer es público
- `/admin` lleva `noindex` y está excluido en `robots.txt`

---

## 4. Cosas a tener en cuenta

**Los videos que ya existen** siguen en el repositorio (`assets/videos/`, 139 MB) y funcionan igual. Solo lo que subas desde ahora va al almacenamiento nuevo.

**Tu almacenamiento tiene 1 GB.** Lo ves en Vercel → Storage → portafolio. Da para bastantes videos, pero si te acercas al límite, la alternativa es subir los pesados a YouTube o Instagram y usar el modo "enlace de red social", que además hace que la web cargue más rápido.

**Si alguna vez editas `admin.js` o `render.js` a mano**, sube el número del `?v=` en `admin.html` e `index.html`. Sin eso, los navegadores que ya visitaron la web seguirán usando la versión vieja guardada en caché.

**Si cambias `SESSION_SECRET`**, todas las sesiones abiertas se cierran. Es la forma de expulsar a alguien.

**Si olvidas la contraseña**, cámbiala en las variables de entorno de Vercel y vuelve a desplegar.

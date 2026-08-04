/* ═══════════════════════════════════════════════════════════
   admin.js — editor del portafolio
   ═══════════════════════════════════════════════════════════ */
import { upload } from 'https://esm.sh/@vercel/blob@2.6.1/client';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  kids.flat().forEach((k) => k != null && n.append(k.nodeType ? k : document.createTextNode(k)));
  return n;
};
const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const clone = (o) => JSON.parse(JSON.stringify(o));

const state = { content: null, original: null, dirty: false, section: 'hero' };

/* ═════════ ESQUEMA DE SECCIONES ═════════ */
const T = {
  text: 'text', area: 'area', html: 'html', url: 'url', color: 'color',
  icon: 'icon', tags: 'tags', bool: 'bool', media: 'media', video: 'video',
};

const SCHEMA = [
  {
    key: 'hero', label: 'Portada', icon: '★',
    desc: 'Lo primero que se ve al entrar. El nombre se anima letra por letra.',
    fields: [
      { k: 'pretitle', label: 'Antetítulo', t: T.text },
      { k: 'firstName', label: 'Nombre', t: T.text },
      { k: 'lastName', label: 'Apellido', t: T.text },
      { k: 'vertical', label: 'Texto vertical lateral', t: T.text },
      { k: 'tagline', label: 'Frase principal', t: T.html, hint: 'Puedes usar <em>cursiva</em> y <strong>negrita</strong>.' },
      { k: 'photo', label: 'Foto de portada', t: T.media, folder: 'about', accept: 'image/*' },
      { k: 'photoAlt', label: 'Descripción de la foto (accesibilidad)', t: T.text },
    ],
    lists: [
      { k: 'ctas', label: 'Botones', titleKey: 'label', subKey: 'href', addLabel: 'Añadir botón',
        fields: [
          { k: 'label', label: 'Texto', t: T.text },
          { k: 'href', label: 'Enlace', t: T.url },
          { k: 'icon', label: 'Icono', t: T.icon },
          { k: 'style', label: 'Estilo', t: T.text, hint: 'primary u outline' },
          { k: 'iconRight', label: 'Icono a la derecha', t: T.bool },
          { k: 'download', label: 'Es una descarga', t: T.bool },
        ] },
      { k: 'stats', label: 'Cifras', titleKey: 'label', subKey: 'value', addLabel: 'Añadir cifra',
        fields: [
          { k: 'value', label: 'Valor', t: T.text },
          { k: 'label', label: 'Etiqueta', t: T.text },
          { k: 'animate', label: 'Contar de 0 al número', t: T.bool },
        ] },
    ],
  },
  {
    key: 'about', label: 'Sobre mí', icon: '✎',
    fields: [
      { k: 'label', label: 'Etiqueta de sección', t: T.text },
      { k: 'title', label: 'Título', t: T.html, hint: 'Usa &lt;br&gt; para saltos de línea y &lt;em&gt; para la parte en cursiva.' },
      { k: 'photo', label: 'Foto', t: T.media, folder: 'about', accept: 'image/*' },
      { k: 'photoAlt', label: 'Descripción de la foto', t: T.text },
      { k: 'photoLabel', label: 'Pie de foto', t: T.text },
    ],
    paragraphs: { k: 'paragraphs', label: 'Párrafos' },
    lists: [
      { k: 'highlights', label: 'Tarjetas destacadas', titleKey: 'title', subKey: 'text', addLabel: 'Añadir tarjeta',
        fields: [
          { k: 'title', label: 'Título', t: T.text },
          { k: 'text', label: 'Texto', t: T.text },
        ] },
    ],
  },
  {
    key: 'services', label: 'Servicios', icon: '◈',
    fields: [
      { k: 'label', label: 'Etiqueta de sección', t: T.text },
      { k: 'title', label: 'Título', t: T.text },
    ],
    lists: [
      { k: 'items', label: 'Servicios', titleKey: 'title', subKey: 'text', addLabel: 'Añadir servicio',
        fields: [
          { k: 'icon', label: 'Icono', t: T.icon },
          { k: 'title', label: 'Título', t: T.text },
          { k: 'text', label: 'Descripción', t: T.area },
        ] },
    ],
  },
  {
    key: 'projects', label: 'Proyectos', icon: '▦',
    fields: [
      { k: 'label', label: 'Etiqueta de sección', t: T.text },
      { k: 'title', label: 'Título', t: T.text },
      { k: 'intro', label: 'Introducción', t: T.area },
    ],
    lists: [
      { k: 'items', label: 'Proyectos', titleKey: 'name', subKey: 'role', thumbKey: 'thumb', addLabel: 'Añadir proyecto',
        fields: [
          { k: 'name', label: 'Nombre', t: T.text },
          { k: 'role', label: 'Rol', t: T.text },
          { k: 'date', label: 'Fecha', t: T.text },
          { k: 'tag', label: 'Etiqueta', t: T.text },
          { k: 'tagColor', label: 'Color de la etiqueta', t: T.color },
          { k: 'thumb', label: 'Logo o miniatura', t: T.media, folder: 'projects', accept: 'image/*' },
          { k: 'thumbAlt', label: 'Descripción de la imagen', t: T.text },
          { k: 'gradient', label: 'Fondo de la miniatura', t: T.text, hint: 'Ej.: linear-gradient(135deg,#C41E24,#7A1010)' },
          { k: 'thumbFit', label: 'Ajuste', t: T.text, hint: '"logo" centra el logo, "cover" recorta la foto' },
          { k: 'desc', label: 'Descripción', t: T.area },
          { k: 'tools', label: 'Herramientas', t: T.tags },
          { k: 'result', label: 'Resultado', t: T.area },
        ] },
    ],
  },
  {
    key: 'gallery', label: 'Galería', icon: '❏',
    desc: 'Imágenes de la galería. Puedes subir varias a la vez arrastrándolas a la zona de abajo.',
    fields: [
      { k: 'label', label: 'Etiqueta de sección', t: T.text },
      { k: 'title', label: 'Título', t: T.text },
      { k: 'intro', label: 'Introducción', t: T.area },
      { k: 'toggleLabel', label: 'Texto del botón "ver más"', t: T.text },
    ],
    bulk: { folder: 'gallery', accept: 'image/*', label: 'Subir varias imágenes de una vez',
      make: (blob, name) => ({ id: uid('gal'), src: blob.url, alt: name, tag: '', title: name, visible: true }) },
    lists: [
      { k: 'items', label: 'Imágenes', titleKey: 'title', subKey: 'tag', thumbKey: 'src', addLabel: 'Añadir imagen',
        fields: [
          { k: 'src', label: 'Imagen', t: T.media, folder: 'gallery', accept: 'image/*' },
          { k: 'tag', label: 'Etiqueta', t: T.text, hint: 'Ej.: Fanéa · Instagram' },
          { k: 'title', label: 'Título', t: T.text },
          { k: 'alt', label: 'Descripción (accesibilidad)', t: T.text },
        ] },
    ],
  },
  {
    key: 'videos', label: 'Videos', icon: '▶',
    desc: 'Sube el archivo original (se guarda tal cual, sin recomprimir) o pega el enlace de Instagram, TikTok, YouTube o Vimeo.',
    fields: [
      { k: 'label', label: 'Etiqueta de sección', t: T.text },
      { k: 'title', label: 'Título', t: T.text },
    ],
    lists: [
      { k: 'items', label: 'Videos', titleKey: 'title', subKey: 'subtitle', addLabel: 'Añadir video',
        fields: [
          { k: '__source', label: 'Video', t: T.video },
          { k: 'title', label: 'Título', t: T.text },
          { k: 'subtitle', label: 'Subtítulo', t: T.text },
          { k: 'poster', label: 'Miniatura (opcional)', t: T.media, folder: 'videos', accept: 'image/*' },
        ] },
    ],
  },
  {
    key: 'experience', label: 'Experiencia', icon: '⌛',
    fields: [
      { k: 'label', label: 'Etiqueta de sección', t: T.text },
      { k: 'title', label: 'Título', t: T.text },
    ],
    lists: [
      { k: 'items', label: 'Trayectoria', titleKey: 'title', subKey: 'role', addLabel: 'Añadir experiencia',
        fields: [
          { k: 'date', label: 'Fecha', t: T.text },
          { k: 'place', label: 'Lugar', t: T.text },
          { k: 'title', label: 'Título', t: T.text },
          { k: 'role', label: 'Cargo', t: T.text },
          { k: 'desc', label: 'Descripción', t: T.area },
        ] },
    ],
  },
  {
    key: 'tools', label: 'Herramientas', icon: '⚙',
    fields: [
      { k: 'label', label: 'Etiqueta de sección', t: T.text },
      { k: 'title', label: 'Título', t: T.text },
    ],
    nested: {
      k: 'categories', label: 'Categorías', titleKey: 'label', addLabel: 'Añadir categoría',
      fields: [{ k: 'label', label: 'Nombre de la categoría', t: T.text }],
      child: { k: 'items', label: 'Herramientas', titleKey: 'name', addLabel: 'Añadir herramienta',
        fields: [
          { k: 'name', label: 'Nombre', t: T.text },
          { k: 'icon', label: 'Icono', t: T.icon },
          { k: 'color', label: 'Color', t: T.color },
        ] },
    },
  },
  {
    key: 'education', label: 'Educación', icon: '🎓',
    fields: [
      { k: 'label', label: 'Etiqueta de sección', t: T.text },
      { k: 'title', label: 'Título', t: T.text },
    ],
    lists: [
      { k: 'items', label: 'Formación', titleKey: 'title', subKey: 'place', addLabel: 'Añadir formación',
        fields: [
          { k: 'title', label: 'Título', t: T.text },
          { k: 'place', label: 'Institución', t: T.text },
          { k: 'detail', label: 'Detalle', t: T.text },
          { k: 'desc', label: 'Descripción', t: T.area },
          { k: 'status', label: 'Estado', t: T.text, hint: 'Ej.: En curso, Completado, Próximamente' },
          { k: 'statusIcon', label: 'Icono del estado', t: T.icon },
          { k: 'upcoming', label: 'Mostrar en gris (próximamente)', t: T.bool },
        ] },
    ],
  },
  {
    key: 'contact', label: 'Contacto', icon: '✉',
    fields: [
      { k: 'label', label: 'Etiqueta de sección', t: T.text },
      { k: 'title', label: 'Título', t: T.text },
      { k: 'text', label: 'Texto', t: T.area },
    ],
    sub: { k: 'availability', label: 'Disponibilidad', fields: [
      { k: 'status', label: 'Estado', t: T.text },
      { k: 'detail', label: 'Detalle', t: T.html, hint: 'Usa &lt;br&gt; para saltos de línea.' },
    ] },
    lists: [
      { k: 'links', label: 'Datos de contacto', titleKey: 'label', subKey: 'value', addLabel: 'Añadir dato',
        fields: [
          { k: 'label', label: 'Etiqueta', t: T.text },
          { k: 'value', label: 'Valor visible', t: T.text },
          { k: 'href', label: 'Enlace', t: T.url, hint: 'mailto:, tel: o https://' },
          { k: 'icon', label: 'Icono', t: T.icon },
        ] },
      { k: 'buttons', label: 'Botones', titleKey: 'label', subKey: 'href', addLabel: 'Añadir botón',
        fields: [
          { k: 'label', label: 'Texto', t: T.text },
          { k: 'href', label: 'Enlace', t: T.url },
          { k: 'icon', label: 'Icono', t: T.icon },
          { k: 'style', label: 'Estilo', t: T.text, hint: 'primary o light' },
          { k: 'download', label: 'Es una descarga', t: T.bool },
        ] },
    ],
  },
  {
    key: 'nav', label: 'Menú', icon: '☰',
    desc: 'Los enlaces de la barra superior y del menú móvil. Deben empezar por # y coincidir con una sección de la web.',
    fields: [
      { k: 'logo', label: 'Logo', t: T.text, hint: 'La primera letra va en redonda y el resto en cursiva.' },
      { k: 'ctaLabel', label: 'Texto del botón de CV', t: T.text },
    ],
    lists: [
      { k: 'links', label: 'Enlaces del menú', titleKey: 'label', subKey: 'href', addLabel: 'Añadir enlace',
        fields: [
          { k: 'label', label: 'Texto', t: T.text },
          { k: 'href', label: 'Destino', t: T.text, hint: '#sobre-mi, #servicios, #proyectos, #galeria, #videos, #experiencia, #herramientas, #educacion, #contacto' },
        ] },
    ],
  },
  {
    key: 'site', label: 'Sitio & SEO', icon: '🌐',
    desc: 'Título de la pestaña, descripción para Google y archivo del CV.',
    fields: [
      { k: 'title', label: 'Título de la pestaña', t: T.text },
      { k: 'description', label: 'Descripción para buscadores', t: T.area },
      { k: 'author', label: 'Autora', t: T.text },
      { k: 'ogTitle', label: 'Título al compartir', t: T.text },
      { k: 'ogDescription', label: 'Descripción al compartir', t: T.area },
      { k: 'cvUrl', label: 'Hoja de vida (PDF)', t: T.media, folder: 'docs', accept: 'application/pdf' },
    ],
  },
  {
    key: 'footer', label: 'Pie & Preloader', icon: '▁',
    fields: [
      { k: 'logo', label: 'Logo del pie', t: T.text },
      { k: 'text', label: 'Texto de copyright', t: T.text },
    ],
    lists: [
      { k: 'socials', label: 'Redes sociales', titleKey: 'href', subKey: 'icon', addLabel: 'Añadir red',
        fields: [
          { k: 'href', label: 'Enlace', t: T.url },
          { k: 'icon', label: 'Icono', t: T.icon },
        ] },
    ],
    extra: { key: 'preloader', label: 'Pantalla de carga', fields: [
      { k: 'name', label: 'Nombre animado', t: T.text },
      { k: 'subtitle', label: 'Subtítulo', t: T.text },
    ] },
  },
];

/* ═════════ API ═════════ */
async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
}

/* ═════════ AVISOS ═════════ */
let toastTimer;
function toast(msg, bad = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('bad', bad);
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 3600);
}

function markDirty(v = true) {
  state.dirty = v;
  $('#savebar').classList.toggle('on', v);
  const info = $('#savedInfo');
  if (v) info.innerHTML = '<span class="dot dirty"></span>Cambios sin publicar';
  else {
    const d = state.content?.updatedAt ? new Date(state.content.updatedAt) : null;
    info.innerHTML = '<span class="dot"></span>Publicado' + (d ? ` · ${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : '');
  }
}

window.addEventListener('beforeunload', (e) => {
  if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
});

/* ═════════ CAMPOS ═════════ */
function fieldWrap(label, control, hint) {
  return el('div', { className: 'field' },
    label ? el('label', { textContent: label }) : null,
    control,
    hint ? el('div', { className: 'hint', innerHTML: hint }) : null);
}

function buildField(obj, f, onChange) {
  const val = obj[f.k];

  if (f.t === T.bool) {
    const btn = el('button', { type: 'button', className: 'toggle' + (val ? ' on' : '') });
    btn.onclick = () => { obj[f.k] = !obj[f.k]; btn.classList.toggle('on', !!obj[f.k]); onChange(); };
    return el('div', { className: 'field', style: 'display:flex;align-items:center;gap:10px' },
      btn, el('label', { textContent: f.label, style: 'margin:0;text-transform:none;letter-spacing:0;font-size:13.5px;color:var(--charcoal)' }));
  }

  if (f.t === T.tags) return fieldWrap(f.label, tagsWidget(obj, f.k, onChange), f.hint);
  if (f.t === T.media) return fieldWrap(f.label, mediaWidget(obj, f.k, f, onChange), f.hint);
  if (f.t === T.video) return videoWidget(obj, onChange);

  if (f.t === T.color) {
    const isHex = /^#[0-9a-f]{3,8}$/i.test(val || '');
    const picker = el('input', { type: 'color', value: isHex ? val : '#965D28', style: 'width:46px;height:38px;padding:2px;border-radius:8px;border:1px solid var(--border);cursor:pointer;flex-shrink:0' });
    const text = el('input', { type: 'text', value: val || '', placeholder: '#965D28 o var(--accent)' });
    picker.oninput = () => { obj[f.k] = picker.value; text.value = picker.value; onChange(); };
    text.oninput = () => { obj[f.k] = text.value; if (/^#[0-9a-f]{6}$/i.test(text.value)) picker.value = text.value; onChange(); };
    return fieldWrap(f.label, el('div', { style: 'display:flex;gap:8px' }, picker, text), f.hint);
  }

  const isArea = f.t === T.area || f.t === T.html;
  const input = el(isArea ? 'textarea' : 'input', { value: val == null ? '' : val });
  if (!isArea) input.type = f.t === T.url ? 'text' : 'text';
  if (isArea) input.rows = f.t === T.html ? 3 : 4;
  input.oninput = () => { obj[f.k] = input.value; onChange(input.value); };

  let hint = f.hint;
  if (f.t === T.icon) {
    hint = hint || 'Clases de Font Awesome. Ej.: <code>fas fa-camera</code>, <code>fab fa-instagram</code>. <a href="https://fontawesome.com/search?ic=free" target="_blank" rel="noopener">Buscar iconos</a>';
    input.placeholder = 'fas fa-star';
  }
  return fieldWrap(f.label, input, hint);
}

function tagsWidget(obj, key, onChange) {
  if (!Array.isArray(obj[key])) obj[key] = [];
  const box = el('div', { className: 'tagbox' });
  const input = el('input', { placeholder: 'Escribe y pulsa Enter…' });
  const paint = () => {
    $$('.tag', box).forEach((n) => n.remove());
    obj[key].forEach((t, i) => {
      const rm = el('button', { type: 'button', textContent: '×', title: 'Quitar' });
      rm.onclick = () => { obj[key].splice(i, 1); paint(); onChange(); };
      box.insertBefore(el('span', { className: 'tag' }, t, rm), input);
    });
  };
  input.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const v = input.value.trim();
      if (v) { obj[key].push(v); input.value = ''; paint(); onChange(); }
    } else if (e.key === 'Backspace' && !input.value && obj[key].length) {
      obj[key].pop(); paint(); onChange();
    }
  };
  box.append(input);
  paint();
  return box;
}

/* ═════════ SUBIDA DE ARCHIVOS ═════════ */
const isVideo = (u) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u || '');
const isImage = (u) => /\.(jpe?g|png|webp|avif|gif)(\?|$)/i.test(u || '');
const isPdf = (u) => /\.pdf(\?|$)/i.test(u || '');

async function uploadFile(file, folder, onProgress) {
  return upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    clientPayload: JSON.stringify({ folder }),
    multipart: file.size > 15 * 1024 * 1024,
    onUploadProgress: (p) => onProgress && onProgress(p.percentage),
  });
}

function mediaWidget(obj, key, f, onChange) {
  const box = el('div', { className: 'media' });
  const prev = el('div', { className: 'media-prev' });
  const path = el('div', { className: 'path' });
  const bar = el('div', { className: 'bar' });
  const barIn = el('i');
  bar.append(barIn);

  const paint = () => {
    const v = obj[key] || '';
    prev.innerHTML = '';
    if (isImage(v)) prev.append(el('img', { src: v, style: 'width:100%;height:100%;object-fit:cover;border-radius:8px' }));
    else if (isVideo(v)) prev.textContent = '▶';
    else if (isPdf(v)) prev.textContent = '📄';
    else prev.textContent = v ? '◈' : '＋';
    path.textContent = v || 'Sin archivo';
  };

  const setVal = (v) => { obj[key] = v; paint(); onChange(); };

  const input = el('input', { type: 'file', accept: f.accept || '*/*', style: 'display:none' });
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    await doUpload(file);
    input.value = '';
  };

  async function doUpload(file) {
    bar.classList.add('on'); barIn.style.width = '0%';
    path.textContent = `Subiendo ${file.name}…`;
    try {
      const blob = await uploadFile(file, f.folder || 'media', (p) => { barIn.style.width = p + '%'; });
      setVal(blob.url);
      toast('Archivo subido sin pérdida de calidad.');
    } catch (err) {
      toast('No se pudo subir: ' + err.message, true);
      paint();
    } finally {
      bar.classList.remove('on');
    }
  }

  const btnUp = el('button', { type: 'button', className: 'btn sm', textContent: 'Subir archivo' });
  btnUp.onclick = () => input.click();
  const btnLink = el('button', { type: 'button', className: 'btn sm ghost', textContent: 'Pegar enlace' });
  btnLink.onclick = () => {
    const v = prompt('Pega la URL del archivo:', obj[key] || '');
    if (v != null) setVal(v.trim());
  };
  const btnDel = el('button', { type: 'button', className: 'btn sm danger', textContent: 'Quitar' });
  btnDel.onclick = () => setVal('');

  box.append(el('div', { className: 'media-row' }, prev,
    el('div', { className: 'media-info' }, path,
      el('div', { className: 'media-acts' }, btnUp, btnLink, btnDel))), bar, input);

  box.ondragover = (e) => { e.preventDefault(); box.classList.add('over'); };
  box.ondragleave = () => box.classList.remove('over');
  box.ondrop = (e) => {
    e.preventDefault(); box.classList.remove('over');
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  };

  paint();
  return box;
}

function videoWidget(item, onChange) {
  const wrap = el('div', { className: 'field' });
  const seg = el('div', { className: 'seg', style: 'margin-bottom:12px' });
  const slot = el('div');

  const bFile = el('button', { type: 'button', textContent: 'Archivo de video' });
  const bLink = el('button', { type: 'button', textContent: 'Enlace de red social' });

  const paint = () => {
    const mode = item.type === 'embed' ? 'embed' : 'file';
    bFile.classList.toggle('on', mode === 'file');
    bLink.classList.toggle('on', mode === 'embed');
    slot.innerHTML = '';
    if (mode === 'file') {
      slot.append(mediaWidget(item, 'src', { folder: 'videos', accept: 'video/*' }, onChange));
      slot.append(el('div', { className: 'hint', innerHTML: 'El archivo se guarda tal cual, sin recomprimir ni bajar la resolución. Máximo 500 MB.' }));
    } else {
      const inp = el('input', { type: 'text', value: item.embedUrl || '', placeholder: 'https://www.instagram.com/reel/…' });
      const out = el('div', { className: 'hint' });
      const show = () => {
        const u = toEmbed(inp.value);
        out.innerHTML = u ? `Se mostrará como: <code style="word-break:break-all">${u}</code>` : 'Pega el enlace de Instagram, TikTok, YouTube, Vimeo o Facebook.';
      };
      inp.oninput = () => { item.embedUrl = inp.value; show(); onChange(); };
      show();
      slot.append(inp, out);
    }
  };

  bFile.onclick = () => { item.type = 'file'; paint(); onChange(); };
  bLink.onclick = () => { item.type = 'embed'; paint(); onChange(); };
  seg.append(bFile, bLink);
  wrap.append(el('label', { textContent: 'Video' }), seg, slot);
  paint();
  return wrap;
}

function toEmbed(url) {
  if (!url) return '';
  const u = String(url).trim();
  let m;
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/))) return 'https://www.youtube.com/embed/' + m[1];
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return 'https://player.vimeo.com/video/' + m[1];
  if ((m = u.match(/tiktok\.com\/.*\/video\/(\d+)/))) return 'https://www.tiktok.com/embed/v2/' + m[1];
  if ((m = u.match(/instagram\.com\/(reel|p|tv)\/([\w-]+)/))) return `https://www.instagram.com/${m[1]}/${m[2]}/embed`;
  if (u.match(/facebook\.com\/.+\/videos\/(\d+)/)) return 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(u);
  return u;
}

/* ═════════ LISTAS ORDENABLES ═════════ */
function buildList(parent, cfg, onChange) {
  if (!Array.isArray(parent[cfg.k])) parent[cfg.k] = [];
  const arr = parent[cfg.k];
  const host = el('div');

  const repaint = () => { host.innerHTML = ''; paintItems(); };

  function paintItems() {
    if (!arr.length) {
      host.append(el('div', { className: 'empty', textContent: 'Todavía no hay elementos.' }));
    }
    arr.forEach((item, idx) => {
      const card = el('div', { className: 'item' + (item.visible === false ? ' hidden-item' : '') });
      card.draggable = false;

      const handle = el('span', { className: 'handle', textContent: '⠿', title: 'Arrastra para reordenar' });
      handle.onmousedown = () => { card.draggable = true; };
      handle.onmouseup = () => { card.draggable = false; };

      const thumbSrc = cfg.thumbKey ? item[cfg.thumbKey] : null;
      const thumb = thumbSrc && isImage(thumbSrc)
        ? el('img', { className: 'item-thumb', src: thumbSrc, loading: 'lazy' })
        : null;

      const title = el('div', { className: 'item-title' });
      const paintTitle = () => {
        title.innerHTML = '';
        title.append(item[cfg.titleKey] || '(sin título)');
        if (cfg.subKey) title.append(el('small', { textContent: item[cfg.subKey] || '' }));
      };
      paintTitle();

      const vis = el('button', { type: 'button', className: 'toggle' + (item.visible !== false ? ' on' : ''), title: 'Mostrar u ocultar en la web' });
      vis.onclick = (e) => {
        e.stopPropagation();
        item.visible = item.visible === false;
        vis.classList.toggle('on', item.visible !== false);
        card.classList.toggle('hidden-item', item.visible === false);
        onChange();
      };

      const del = el('button', { type: 'button', className: 'btn sm danger', textContent: 'Eliminar' });
      del.onclick = (e) => {
        e.stopPropagation();
        if (!confirm(`¿Eliminar "${item[cfg.titleKey] || 'este elemento'}"?`)) return;
        arr.splice(idx, 1); repaint(); onChange();
      };

      const chev = el('span', { className: 'chev', textContent: '▶' });
      const head = el('div', { className: 'item-head' }, handle, thumb, title, vis,
        el('div', { className: 'row-actions' }, del), chev);
      head.onclick = (e) => {
        if (e.target.closest('button')) return;
        card.classList.toggle('open');
      };

      const body = el('div', { className: 'item-body' });
      cfg.fields.forEach((f) => body.append(buildField(item, f, () => { paintTitle(); onChange(); })));

      if (cfg.child) {
        body.append(el('h3', { textContent: cfg.child.label, style: 'margin-top:18px' }));
        body.append(buildList(item, cfg.child, onChange));
      }

      card.append(head, body);

      /* arrastrar para reordenar */
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(idx));
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => { card.classList.remove('dragging'); card.draggable = false; });
      card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
      card.addEventListener('drop', (e) => {
        e.preventDefault(); card.classList.remove('drag-over');
        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (Number.isNaN(from) || from === idx) return;
        const [moved] = arr.splice(from, 1);
        arr.splice(idx, 0, moved);
        repaint(); onChange();
      });

      host.append(card);
    });

    const add = el('button', { type: 'button', className: 'btn ghost', textContent: '+ ' + (cfg.addLabel || 'Añadir') });
    add.onclick = () => {
      const blank = { id: uid(cfg.k), visible: true };
      cfg.fields.forEach((f) => { if (f.k !== '__source') blank[f.k] = f.t === T.tags ? [] : f.t === T.bool ? false : ''; });
      if (cfg.child) blank[cfg.child.k] = [];
      if (cfg.k === 'items' && cfg.fields.some((f) => f.t === T.video)) { blank.type = 'file'; blank.src = ''; blank.embedUrl = ''; }
      arr.push(blank); repaint(); onChange();
      const cards = $$('.item', host);
      cards[cards.length - 1]?.classList.add('open');
      cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    host.append(el('div', { className: 'addbar' }, add));
  }

  paintItems();
  return host;
}

/* ═════════ SUBIDA MASIVA ═════════ */
function bulkUploader(sec, onChange, repaint) {
  const cfg = sec.bulk;
  const box = el('div', { className: 'media', style: 'text-align:center;padding:24px' });
  const info = el('div', { style: 'font-size:13.5px;color:var(--muted);margin-bottom:10px' });
  info.textContent = 'Arrastra aquí tus archivos o pulsa el botón. Se suben en su calidad original.';
  const bar = el('div', { className: 'bar' });
  const barIn = el('i');
  bar.append(barIn);
  const input = el('input', { type: 'file', multiple: true, accept: cfg.accept, style: 'display:none' });
  const btn = el('button', { type: 'button', className: 'btn', textContent: cfg.label });
  btn.onclick = () => input.click();

  async function run(files) {
    const list = [...files];
    if (!list.length) return;
    bar.classList.add('on');
    let done = 0;
    for (const file of list) {
      info.textContent = `Subiendo ${done + 1} de ${list.length}: ${file.name}`;
      try {
        const blob = await uploadFile(file, cfg.folder, (p) => {
          barIn.style.width = ((done + p / 100) / list.length) * 100 + '%';
        });
        const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        state.content[sec.key].items.push(cfg.make(blob, name));
      } catch (err) {
        toast(`Falló ${file.name}: ${err.message}`, true);
      }
      done++;
    }
    bar.classList.remove('on');
    info.textContent = 'Arrastra aquí tus archivos o pulsa el botón. Se suben en su calidad original.';
    onChange(); repaint();
    toast(`${done} archivo(s) añadidos.`);
  }

  input.onchange = () => { run(input.files); input.value = ''; };
  box.ondragover = (e) => { e.preventDefault(); box.classList.add('over'); };
  box.ondragleave = () => box.classList.remove('over');
  box.ondrop = (e) => { e.preventDefault(); box.classList.remove('over'); run(e.dataTransfer.files); };
  box.append(info, btn, bar, input);
  return box;
}

/* ═════════ VISTA DE SECCIÓN ═════════ */
function renderSection(key) {
  state.section = key;
  const sec = SCHEMA.find((s) => s.key === key);
  const data = state.content[key] || (state.content[key] = {});
  $('#secTitle').textContent = sec.label;
  $$('.navitem').forEach((b) => b.classList.toggle('active', b.dataset.k === key));

  const view = $('#view');
  view.innerHTML = '';
  const onChange = () => markDirty(true);
  const repaint = () => renderSection(key);

  if (sec.desc) view.append(el('p', { className: 'section-desc', textContent: sec.desc }));

  if (sec.fields?.length) {
    const card = el('div', { className: 'card' }, el('h3', { textContent: 'Textos de la sección' }));
    const g = el('div', { className: 'grid2' });
    sec.fields.forEach((f) => {
      const node = buildField(data, f, onChange);
      if ([T.area, T.html, T.media, T.tags].includes(f.t)) { node.style.gridColumn = '1/-1'; }
      g.append(node);
    });
    card.append(g);
    view.append(card);
  }

  if (sec.paragraphs) {
    const card = el('div', { className: 'card' }, el('h3', { textContent: sec.paragraphs.label }));
    if (!Array.isArray(data.paragraphs)) data.paragraphs = [];
    const host = el('div');
    const paint = () => {
      host.innerHTML = '';
      data.paragraphs.forEach((p, i) => {
        const ta = el('textarea', { value: p, rows: 4 });
        ta.oninput = () => { data.paragraphs[i] = ta.value; onChange(); };
        const rm = el('button', { type: 'button', className: 'btn sm danger', textContent: 'Eliminar párrafo' });
        rm.onclick = () => { data.paragraphs.splice(i, 1); paint(); onChange(); };
        host.append(el('div', { className: 'field' }, ta, el('div', { style: 'margin-top:6px' }, rm)));
      });
      const add = el('button', { type: 'button', className: 'btn ghost', textContent: '+ Añadir párrafo' });
      add.onclick = () => { data.paragraphs.push(''); paint(); onChange(); };
      host.append(add);
    };
    paint();
    card.append(host, el('div', { className: 'hint', style: 'margin-top:8px', innerHTML: 'Puedes usar <strong>&lt;strong&gt;</strong> y <em>&lt;em&gt;</em> dentro del texto.' }));
    view.append(card);
  }

  if (sec.sub) {
    const card = el('div', { className: 'card' }, el('h3', { textContent: sec.sub.label }));
    const g = el('div', { className: 'grid2' });
    const obj = data[sec.sub.k] || (data[sec.sub.k] = {});
    sec.sub.fields.forEach((f) => g.append(buildField(obj, f, onChange)));
    card.append(g);
    view.append(card);
  }

  if (sec.extra) {
    const card = el('div', { className: 'card' }, el('h3', { textContent: sec.extra.label }));
    const g = el('div', { className: 'grid2' });
    const obj = state.content[sec.extra.key] || (state.content[sec.extra.key] = {});
    sec.extra.fields.forEach((f) => g.append(buildField(obj, f, onChange)));
    card.append(g);
    view.append(card);
  }

  if (sec.bulk) {
    const card = el('div', { className: 'card' }, el('h3', { textContent: 'Subida rápida' }));
    card.append(bulkUploader(sec, onChange, repaint));
    view.append(card);
  }

  (sec.lists || []).forEach((cfg) => {
    const count = (data[cfg.k] || []).length;
    view.append(el('h3', { textContent: `${cfg.label} (${count})`, style: 'margin:26px 0 12px;font-size:15px' }));
    view.append(buildList(data, cfg, onChange));
  });

  if (sec.nested) {
    view.append(el('h3', { textContent: sec.nested.label, style: 'margin:26px 0 12px;font-size:15px' }));
    view.append(buildList(data, sec.nested, onChange));
  }
}

/* ═════════ ARRANQUE ═════════ */
function buildNav() {
  const nav = $('#sidenav');
  nav.innerHTML = '';
  SCHEMA.forEach((s) => {
    const data = state.content[s.key] || {};
    const list = (s.lists || [])[0];
    const n = list && Array.isArray(data[list.k]) ? data[list.k].length : null;
    const b = el('button', { className: 'navitem', type: 'button' },
      el('span', { className: 'ico', textContent: s.icon }),
      s.label,
      n != null ? el('span', { className: 'count', textContent: String(n) }) : null);
    b.dataset.k = s.key;
    b.onclick = () => renderSection(s.key);
    nav.append(b);
  });
}

async function loadContent() {
  let data;
  try {
    data = await api('/api/content');
  } catch {
    // Todavía no se ha publicado nada desde el panel: partimos del contenido original.
    const res = await fetch('/content.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('No se encontró el contenido base (content.json)');
    data = await res.json();
    toast('Cargado el contenido original. Publica para guardarlo en el panel.');
  }
  state.content = data;
  state.original = clone(data);
  buildNav();
  renderSection(state.section);
  markDirty(false);
}

async function save() {
  const btn = $('#saveBtn');
  btn.disabled = true;
  const old = btn.textContent;
  btn.innerHTML = '<span class="spinner"></span> Publicando…';
  try {
    const res = await api('/api/content', { method: 'PUT', body: JSON.stringify(state.content) });
    state.content.updatedAt = res.updatedAt;
    state.original = clone(state.content);
    markDirty(false);
    toast('Publicado. Los cambios ya están en la web.');
  } catch (err) {
    toast('No se pudo publicar: ' + err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}

async function boot() {
  let s = null;
  try {
    s = await api('/api/session');
    if (s.authenticated) {
      $('#login').style.display = 'none';
      $('#app').classList.add('ready');
      await loadContent();
      return;
    }
  } catch { /* sin sesión */ }

  $('#login').style.display = 'grid';

  // Si falta configuración en Vercel, decirlo antes de que intente entrar.
  if (s && s.configurado === false) {
    const msg = $('#loginMsg');
    msg.className = 'msg err';
    msg.innerHTML =
      'Falta configurar en Vercel:<br><strong>' +
      s.faltan.map((f) => f.replace(/</g, '&lt;')).join('<br>') +
      '</strong><br><span style="font-size:12px">Settings → Environment Variables. Después haz Redeploy.</span>';
    $('#loginBtn').disabled = true;
  } else if (s && s.almacenamiento === false) {
    const msg = $('#loginMsg');
    msg.className = 'msg err';
    msg.style.background = '#FEF6E7';
    msg.style.color = '#8A5A0B';
    msg.style.borderColor = '#EDD9AE';
    msg.innerHTML =
      'Puedes entrar y editar textos, pero falta crear el almacenamiento ' +
      '<strong>Storage → Create Database → Blob</strong> para subir videos e imágenes.';
  }
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#loginMsg');
  const btn = $('#loginBtn');
  msg.className = 'msg';
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Entrando…';
  try {
    await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ user: $('#u').value, password: $('#p').value }),
    });
    $('#p').value = '';
    $('#login').style.display = 'none';
    $('#app').classList.add('ready');
    await loadContent();
  } catch (err) {
    msg.className = 'msg err';
    msg.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

$('#saveBtn').onclick = save;
$('#discardBtn').onclick = () => {
  if (!confirm('¿Descartar todos los cambios sin publicar?')) return;
  state.content = clone(state.original);
  buildNav();
  renderSection(state.section);
  markDirty(false);
};
$('#reloadBtn').onclick = async () => {
  if (state.dirty && !confirm('Tienes cambios sin publicar. ¿Recargar de todas formas?')) return;
  await loadContent();
  toast('Contenido recargado.');
};
$('#logoutBtn').onclick = async () => {
  if (state.dirty && !confirm('Tienes cambios sin publicar. ¿Salir igualmente?')) return;
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  state.dirty = false;
  location.reload();
};

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (state.dirty) save(); }
});

boot();

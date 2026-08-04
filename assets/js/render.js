/* ═══════════════════════════════════════════════════════════
   render.js — pinta el portafolio a partir de content.json
   El HTML estático de index.html queda como respaldo: si la
   carga falla, la web se sigue viendo exactamente igual.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── utilidades ── */
  const esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // Campos donde se permite HTML a propósito (<em>, <strong>, <br>).
  const rich = (s) => String(s == null ? '' : s);

  const $ = (sel, root) => (root || document).querySelector(sel);
  const shown = (arr) => (Array.isArray(arr) ? arr.filter((x) => x && x.visible !== false) : []);

  function setHTML(sel, html) {
    const el = $(sel);
    if (el) el.innerHTML = html;
    return el;
  }

  function setText(sel, value) {
    const el = $(sel);
    if (el && value != null && value !== '') el.textContent = value;
    return el;
  }

  /* ── convierte un enlace de red social en URL embebible ── */
  function toEmbedUrl(url) {
    if (!url) return '';
    const u = String(url).trim();
    let m;
    if ((m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/)))
      return 'https://www.youtube.com/embed/' + m[1];
    if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)))
      return 'https://player.vimeo.com/video/' + m[1];
    if ((m = u.match(/tiktok\.com\/.*\/video\/(\d+)/)))
      return 'https://www.tiktok.com/embed/v2/' + m[1];
    if ((m = u.match(/instagram\.com\/(reel|p|tv)\/([\w-]+)/)))
      return 'https://www.instagram.com/' + m[1] + '/' + m[2] + '/embed';
    if ((m = u.match(/facebook\.com\/.+\/videos\/(\d+)/)))
      return 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(u);
    return u;
  }
  window.toEmbedUrl = toEmbedUrl;

  /* ══════════════ SECCIONES ══════════════ */

  function renderHead(c) {
    if (!c.site) return;
    if (c.site.title) document.title = c.site.title;
    const meta = (sel, val) => {
      const el = document.querySelector(sel);
      if (el && val) el.setAttribute('content', val);
    };
    meta('meta[name="description"]', c.site.description);
    meta('meta[name="author"]', c.site.author);
    meta('meta[property="og:title"]', c.site.ogTitle);
    meta('meta[property="og:description"]', c.site.ogDescription);
  }

  function renderPreloader(c) {
    const p = c.preloader || {};
    if (p.name) {
      setHTML(
        '.loader-name',
        String(p.name).split('').map((ch) => `<span>${esc(ch === ' ' ? ' ' : ch)}</span>`).join('')
      );
    }
    setText('.loader-sub', p.subtitle);
  }

  function renderNav(c) {
    const nav = c.nav || {};
    const cv = (c.site && c.site.cvUrl) || '#';
    const links = shown(nav.links);
    if (!links.length) return;

    if (nav.logo) {
      const logoEl = $('.nav-logo');
      if (logoEl) {
        const l = String(nav.logo);
        logoEl.innerHTML = esc(l.charAt(0)) + `<em>${esc(l.slice(1))}</em>`;
      }
    }

    setHTML(
      '.nav-links',
      links.map((l) => `<a href="${esc(l.href)}" class="nav-link magnetic">${esc(l.label)}</a>`).join('') +
        `<a href="${esc(cv)}" download class="btn-primary magnetic"><i class="fas fa-download"></i>${esc(nav.ctaLabel || 'CV')}</a>`
    );

    setHTML(
      '#mobile-menu',
      `<button class="mobile-close" onclick="this.parentElement.classList.remove('open')">&times;</button>` +
        links
          .map(
            (l) =>
              `<a href="${esc(l.href)}" class="mobile-link" onclick="this.parentElement.classList.remove('open')">${esc(l.label)}</a>`
          )
          .join('') +
        `<a href="${esc(cv)}" download class="btn-primary" style="margin-top:12px;padding:14px 32px">Descargar CV</a>`
    );
  }

  function btn(b, extraClass) {
    const cls =
      b.style === 'primary' ? 'btn-primary' : b.style === 'light' ? 'btn-outline-light' : 'btn-outline';
    const icon = b.icon ? `<i class="${esc(b.icon)}"></i>` : '';
    const inner = b.iconRight ? `${esc(b.label)} ${icon}` : `${icon} ${esc(b.label)}`;
    return `<a href="${esc(b.href)}"${b.download ? ' download' : ''}${
      /^https?:/.test(b.href || '') ? ' target="_blank" rel="noopener"' : ''
    } class="${cls} magnetic${extraClass ? ' ' + extraClass : ''}">${inner}</a>`;
  }

  function renderHero(c) {
    const h = c.hero || {};
    setText('.hero-vertical', h.vertical);
    setText('.hero-pretitle span', h.pretitle);

    const first = $('#hero-first');
    const last = $('#hero-last');
    if (first && h.firstName) first.textContent = h.firstName;
    if (last && h.lastName) last.innerHTML = esc(h.lastName) + '<span class="accent-dot">.</span>';

    if (h.tagline) setHTML('.hero-tagline', rich(h.tagline));

    const photo = $('.hero-photo-inner img');
    if (photo && h.photo) {
      photo.src = h.photo;
      photo.alt = h.photoAlt || '';
    }

    const ctas = shown(h.ctas);
    if (ctas.length) setHTML('.hero-ctas', ctas.map((b) => btn(b)).join(''));

    const stats = shown(h.stats);
    if (stats.length) {
      setHTML(
        '.hero-stats',
        stats
          .map((s) => {
            const num = s.animate && /^\d+$/.test(String(s.value))
              ? `<div class="stat-number" data-count="${esc(s.value)}">0</div>`
              : `<div class="stat-number">${esc(s.value)}</div>`;
            return `<div class="reveal-up">${num}<div class="stat-label">${esc(s.label)}</div></div>`;
          })
          .join('')
      );
    }
  }

  function renderAbout(c) {
    const a = c.about || {};
    setText('#sobre-mi .section-label span', a.label);
    if (a.title) setHTML('#sobre-mi .about-text h2', rich(a.title));

    const img = $('.about-photo-img');
    if (img && a.photo) {
      img.src = a.photo;
      img.alt = a.photoAlt || '';
    }
    setText('.about-photo-label', a.photoLabel);

    const textEl = $('#sobre-mi .about-text');
    if (textEl && Array.isArray(a.paragraphs)) {
      textEl.querySelectorAll(':scope > p').forEach((p) => p.remove());
      const anchor = $('.about-highlights', textEl);
      a.paragraphs.forEach((t) => {
        const p = document.createElement('p');
        p.className = 'reveal-up';
        p.innerHTML = rich(t);
        textEl.insertBefore(p, anchor);
      });
    }

    const hl = shown(a.highlights);
    if (hl.length) {
      setHTML(
        '.about-highlights',
        hl.map((x) => `<div class="highlight-card reveal-up"><h4>${esc(x.title)}</h4><p>${esc(x.text)}</p></div>`).join('')
      );
    }
  }

  function renderServices(c) {
    const s = c.services || {};
    setText('#servicios .section-label span', s.label);
    setText('#servicios .section-title', s.title);
    const items = shown(s.items);
    if (!items.length) return;
    setHTML(
      '.services-grid',
      items
        .map(
          (i) =>
            `<div class="service-card reveal-up"><div class="service-icon"><i class="${esc(i.icon)}"></i></div><h3>${esc(
              i.title
            )}</h3><p>${esc(i.text)}</p></div>`
        )
        .join('')
    );
  }

  function renderProjects(c) {
    const p = c.projects || {};
    setText('#proyectos .section-label span', p.label);
    setText('#proyectos .section-title', p.title);
    setText('.projects-header > p', p.intro);

    const items = shown(p.items);
    if (!items.length) return;
    setHTML(
      '.projects-grid',
      items
        .map((it) => {
          const thumb = it.thumb
            ? `<img class="project-thumb-img${it.thumbFit === 'logo' ? ' logo-fit' : ''}" loading="lazy" decoding="async" src="${esc(
                it.thumb
              )}" alt="${esc(it.thumbAlt || it.name)}">`
            : '';
          const tools = (it.tools || []).length
            ? `<div class="project-tools-label">Herramientas</div><div class="project-tools">${(it.tools || [])
                .map((t) => `<span class="project-tool">${esc(t)}</span>`)
                .join('')}</div>`
            : '';
          const result = it.result
            ? `<div class="project-result"><div class="project-result-label">Resultado</div><p>${esc(it.result)}</p></div>`
            : '';
          return `<article class="project-card reveal-up">
        <div class="project-thumb" style="background:${esc(it.gradient || 'var(--charcoal)')}">${thumb}<div class="project-thumb-tint"></div></div>
        <div class="project-body">
          <div class="project-tags"><span class="project-tag" style="background:${esc(
            it.tagColor || 'var(--accent)'
          )}">${esc(it.tag)}</span><span class="project-date">${esc(it.date)}</span></div>
          <h3>${esc(it.name)}</h3>
          <div class="project-role">${esc(it.role)}</div>
          <p class="project-desc">${esc(it.desc)}</p>
          ${tools}${result}
        </div>
      </article>`;
        })
        .join('')
    );
  }

  function renderGallery(c) {
    const g = c.gallery || {};
    setText('#galeria .section-label span', g.label);
    setText('#galeria .section-title', g.title);
    setText('.gallery-header > p', g.intro);

    const items = shown(g.items);
    if (!items.length) return;
    setHTML(
      '.gallery-grid',
      items
        .map(
          (i) =>
            `<div class="gallery-item reveal-scale"><img loading="lazy" decoding="async" src="${esc(
              i.src
            )}" alt="${esc(i.alt || i.title || '')}"><div class="gallery-caption"><span class="gc-tag">${esc(
              i.tag
            )}</span><span class="gc-title">${esc(i.title)}</span></div><div class="gallery-overlay"><i class="fas fa-expand"></i></div></div>`
        )
        .join('')
    );

    const toggle = $('.gallery-toggle');
    if (toggle) {
      if (items.length > 12) {
        toggle.style.display = '';
        setHTML(
          '.gallery-toggle',
          `<button class="gallery-toggle-btn">${esc(g.toggleLabel || 'Ver todas las piezas')} (${items.length})</button>`
        );
        $('.gallery-toggle-btn').addEventListener('click', function () {
          $('.gallery-grid').classList.add('gallery-expanded');
          toggle.style.display = 'none';
        });
      } else {
        toggle.style.display = 'none';
        $('.gallery-grid').classList.add('gallery-expanded');
      }
    }
  }

  function renderVideos(c) {
    const v = c.videos || {};
    setText('#videos .section-label span', v.label);
    setText('#videos .section-title', v.title);

    const items = shown(v.items);
    if (!items.length) return;
    setHTML(
      '.videos-grid',
      items
        .map((i) => {
          let media;
          if (i.type === 'embed' && (i.embedUrl || i.src)) {
            const src = toEmbedUrl(i.embedUrl || i.src);
            media = `<iframe src="${esc(src)}" title="${esc(i.title)}" loading="lazy" frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen style="width:100%;height:100%;border:0;display:block"></iframe>`;
          } else {
            media = `<video controls preload="metadata" playsinline${
              i.poster ? ` poster="${esc(i.poster)}"` : ''
            }><source src="${esc(i.src)}" type="${esc(i.mime || 'video/mp4')}"></video>`;
          }
          return `<div class="video-card reveal-up"><div class="video-wrapper">${media}</div><div class="video-card-body"><h4>${esc(
            i.title
          )}</h4><span>${esc(i.subtitle || '')}</span></div></div>`;
        })
        .join('')
    );
  }

  function renderExperience(c) {
    const e = c.experience || {};
    setText('#experiencia .section-label span', e.label);
    setText('#experiencia .section-title', e.title);
    const items = shown(e.items);
    if (!items.length) return;
    setHTML(
      '#timeline',
      items
        .map(
          (i) =>
            `<div class="timeline-item reveal-up"><div class="timeline-dot"></div><div class="timeline-meta"><span class="timeline-date">${esc(
              i.date
            )}</span><span class="timeline-sep"></span><span class="timeline-place">${esc(
              i.place
            )}</span></div><h3>${esc(i.title)}</h3><div class="timeline-role">${esc(
              i.role
            )}</div><p class="timeline-desc">${esc(i.desc)}</p></div>`
        )
        .join('')
    );
  }

  function renderTools(c) {
    const t = c.tools || {};
    setText('#herramientas .section-label span', t.label);
    setText('#herramientas .section-title', t.title);
    const cats = shown(t.categories);
    const wrap = $('#tools-categories');
    if (!wrap || !cats.length) return;
    wrap.innerHTML = cats
      .map(
        (cat) =>
          `<div class="tools-category reveal-up"><div class="tools-category-label">${esc(
            cat.label
          )}</div><div class="tools-list">${(cat.items || [])
            .map(
              (i) =>
                `<span class="tool-badge"><i class="${esc(i.icon)}"${
                  i.color ? ` style="color:${esc(i.color)}"` : ''
                }></i>${esc(i.name)}</span>`
            )
            .join('')}</div></div>`
      )
      .join('');
  }

  function renderEducation(c) {
    const e = c.education || {};
    setText('#educacion .section-label span', e.label);
    setText('#educacion .section-title', e.title);
    const items = shown(e.items);
    if (!items.length) return;
    setHTML(
      '.edu-grid',
      items
        .map(
          (i) =>
            `<div class="edu-card${i.upcoming ? ' upcoming' : ''} reveal-up"><div class="edu-status"${
              i.upcoming ? ' style="color:var(--muted)"' : ''
            }><i class="${esc(i.statusIcon || 'fas fa-certificate')}"></i>${esc(i.status)}</div><h3>${esc(
              i.title
            )}</h3><p class="edu-place">${esc(i.place)}</p><p class="edu-detail">${esc(i.detail)}</p>${
              i.desc ? `<p class="edu-desc">${esc(i.desc)}</p>` : ''
            }</div>`
        )
        .join('')
    );
  }

  function renderContact(c) {
    const k = c.contact || {};
    setText('#contacto .section-label span', k.label);
    if (k.title) setHTML('.contact-left h2', esc(k.title) + '<span class="accent-dot">.</span>');
    setText('.contact-left > p', k.text);

    const links = shown(k.links);
    if (links.length) {
      setHTML(
        '.contact-links',
        links
          .map(
            (l) =>
              `<a href="${esc(l.href)}"${
                /^https?:/.test(l.href || '') ? ' target="_blank" rel="noopener"' : ''
              } class="contact-link reveal-up"><div class="contact-link-icon"><i class="${esc(
                l.icon
              )}"></i></div><div><div class="contact-link-label">${esc(
                l.label
              )}</div><div class="contact-link-value">${esc(l.value)}</div></div></a>`
          )
          .join('')
      );
    }

    const buttons = shown(k.buttons);
    const av = k.availability || {};
    if (buttons.length) {
      setHTML(
        '.contact-right',
        buttons
          .map((b, idx) =>
            idx === 0 && b.style === 'primary'
              ? `<a href="${esc(b.href)}" target="_blank" rel="noopener" class="btn-primary magnetic" style="justify-content:center;padding:20px 32px;font-size:13px"><i class="${esc(
                  b.icon
                )}"></i> ${esc(b.label)}</a>`
              : btn(b)
          )
          .join('') +
          `<div class="contact-availability"><div><span class="availability-dot"></span><span class="availability-status">${esc(
            av.status || ''
          )}</span></div><p class="availability-detail">${rich(av.detail || '')}</p></div>`
      );
    }
  }

  function renderFooter(c) {
    const f = c.footer || {};
    if (f.logo) {
      const el = $('.footer-logo');
      if (el) el.innerHTML = esc(String(f.logo).charAt(0)) + `<em>${esc(String(f.logo).slice(1))}</em>`;
    }
    setText('footer > p', f.text);
    const socials = shown(f.socials);
    if (socials.length) {
      setHTML(
        '.footer-socials',
        socials
          .map(
            (s) =>
              `<a href="${esc(s.href)}"${
                /^https?:/.test(s.href || '') ? ' target="_blank" rel="noopener"' : ''
              }><i class="${esc(s.icon)}"></i></a>`
          )
          .join('')
      );
    }
  }

  /* Si ya hay sesión abierta, el botón del pie dice "Panel" en vez de "Acceder". */
  async function updateAdminLink() {
    const link = $('#adminLink');
    if (!link) return;
    try {
      const res = await fetch('/api/session', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) return;
      const s = await res.json();
      if (s.authenticated) {
        const label = $('#adminLinkText');
        if (label) label.textContent = 'Panel';
        link.classList.add('is-logged');
        link.title = `Sesión iniciada como ${s.user}`;
      }
    } catch {
      /* sin conexión con la API: el botón sigue funcionando igual */
    }
  }

  /* ══════════════ ORQUESTADOR ══════════════ */

  function renderAll(c) {
    const steps = [
      renderHead, renderPreloader, renderNav, renderHero, renderAbout,
      renderServices, renderProjects, renderGallery, renderVideos,
      renderExperience, renderTools, renderEducation, renderContact, renderFooter,
    ];
    for (const step of steps) {
      try {
        step(c);
      } catch (err) {
        console.warn('[render] falló', step.name, err);
      }
    }
  }

  async function loadContent() {
    const sources = ['/api/content', '/content.json'];
    for (const url of sources) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data.hero) return data;
      } catch {
        /* probamos la siguiente fuente */
      }
    }
    return null;
  }

  window.PortfolioContent = {
    load: loadContent,
    render: renderAll,
    toEmbedUrl,
    async hydrate() {
      const c = await loadContent();
      if (c) {
        renderAll(c);
        window.__content = c;
      }
      updateAdminLink();
      return c;
    },
  };
})();

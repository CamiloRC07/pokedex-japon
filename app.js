/* ============================================================
    CONFIGURACIÓN — edita estos valores
============================================================ */
const CONFIG = {
  storeName:    'Yanmega Ofertas',
  instagramUser: 'yanmegaofertas',
  currency:     'CLP',
  inventoryUrl: 'inventory.json',
  delivery: [
    {
      icon: 'package',
      label: 'Starken',
      desc: 'A todo Chile · Costo por pagar en destino'
    },
    {
      icon: 'truck',
      label: 'Blue Express',
      desc: 'A todo Chile · $4.000 fijo'
    },
    {
      icon: 'zap',
      label: 'Paket',
      desc: 'Solo Santiago · $3.000 · Entrega al día siguiente (L-J)'
    },
    {
      icon: 'train-front',
      label: 'Metro',
      desc: 'Del Sol y San Joaquín · Horario a coordinar'
    },
    {
      icon: 'map-pin',
      label: 'Retiro',
      desc: 'Dirección a coordinar por Instagram'
    },
  ],

  payment: [
    { icon: 'building-2', label: 'Transferencia bancaria', soon: false },
    { icon: 'link',       label: 'Fintoc',                 soon: true  },
  ],

  about: {
    texto: 'Somos una tienda especializada en cultura japonesa y productos de colección. Cada producto es seleccionado con cuidado para ofrecerte la mejor calidad.',
    imagen: null,   // 'assets/about.webp' cuando tengas foto
  },

  encargos: {
    activo: true,
    descripcion: 'Importamos directamente desde Japón. Puedes solicitar productos específicos que no están en el inventario.',
    tiempoEstimado: '4 a 8 semanas',
    adelanto: 'Mitad por adelantado',
    cta: 'Espera más, ahorra más'
  },

  colecciones: [
    { slug: 'edicion-limitada', nombre: 'Edición Limitada', cover: null },
    { slug: 'pokemon-fit',      nombre: 'Pokémon Fit',           cover: null },
  ],

  faqs: [
    { q: '¿Cómo funciona un encargo?',       r: 'Nos escribes por Instagram con el producto que buscas, cotizamos el precio final con envío desde Japón y pagas un adelanto del 50%. El resto lo pagas cuando el producto llega a Chile.' },
    { q: '¿Cuánto demora un encargo',               r: 'Entre 4 y 8 semanas dependiendo del producto y la disponibilidad en Japón.' },
    { q: '¿Aceptan reservas de productos del inventario?', r: 'Sí, con un abono del 50%. Escríbenos por Instagram para coordinar.' },
    { q: '¿Qué pasa si el producto llega dañado?',      r: 'Revisamos cada producto antes de enviarlo. Si llega con daños de transporte, coordina con nosotros por Instagram.' },
    { q: '¿Cuánto demora el despacho?',          r: 'Starken y Blue Express demoran 2 a 4 días hábiles. Paket entrega al día siguiente en Santiago para compras de lunes a jueves.' },
    { q: '¿Puedo pagar en cuotas?',          r: 'Por ahora solo aceptamos transferencia bancaria. Pronto habilitaremos más métodos de pago.' },
  ],
};

/* ============================================================
    CATEGORÍAS
============================================================ */
const CATEGORIES = {
  todas:     { label: 'Inicio',     icon: iconHouse()                },
  peluches:  { label: 'Peluches',   icon: iconPanda()                },
  colgantes: { label: 'Colgantes',  icon: iconDroplets()             },
  tcg:       { label: 'TCG',        icon: iconGalleryHorizontalEnd() },
  figuras:   { label: 'Figuras',    icon: iconBoxes()                },
  gachapon:  { label: 'Gachapon',   icon: iconPiggyBank()            },
};

/* ============================================================
    ESTADO DE LA APP
============================================================ */
let inventory = [];

const state = {
  view:    'landing',   // 'landing' | 'category' | 'product' | 'search'
  cat:     null,        // slug de categoría activa
  product: null,        // id del producto activo
  query:   '',          // término de búsqueda
};

/* ============================================================
    FORMATO DE PRECIO
============================================================ */
function formatPrice(amount, currency = CONFIG.currency) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/* ============================================================
    ROUTER — history API
============================================================ */
function navigate(view, params = {}, pushHistory = true) {
  state.view    = view;
  state.cat     = params.cat     ?? null;
  state.product = params.product ?? null;
  state.query   = params.query   ?? '';

  // Actualizar tab activo en nav
  updateCategoryNav(view === 'category' ? state.cat : view === 'landing' ? 'todas' : null);

  // Construir URL limpia
  let url = '/';
  if (view === 'category') url = `/?cat=${state.cat}`;
  if (view === 'product')  url = `/?producto=${state.product}`;
  if (view === 'search')   url = `/?buscar=${encodeURIComponent(state.query)}`;
  if (view === 'info')     url = '/?info=true';
  if (view === 'coleccion') url = `/?coleccion=${state.cat}`;

  if (pushHistory) history.pushState({ view, ...params }, '', url);

  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('popstate', (e) => {
  if (e.state) {
    navigate(e.state.view, e.state, false);
  } else {
    navigate('landing', {}, false);
  }
});

/* ============================================================
    ACTUALIZAR NAV TABS
============================================================ */
function updateCategoryNav(activeCat) {
  document.querySelectorAll('#js-cat-tabs .category-nav__btn').forEach(btn => {
    const cat = btn.dataset.cat;
    btn.classList.toggle('active',
      (activeCat === 'todas' && cat === 'todas') ||
      (cat === activeCat)
    );
  });
}

/* ============================================================
    RENDER — despacha a la vista correcta
============================================================ */
function render() {
  const main = document.getElementById('js-main');
  let html = '';

  switch (state.view) {
    case 'landing':   html = renderLanding();   break;
    case 'category':  html = renderCategory();  break;
    case 'product':   html = renderProduct();   break;
    case 'search':    html = renderSearch();    break;
    case 'info':      html = renderInfo();      break;
    case 'coleccion': html = renderColeccion(); break;
    default:          html = renderLanding();
  }

  main.innerHTML = `<div class="container view">${html}</div>`;
  attachViewEvents();
}

/* ============================================================
    VISTA: LANDING
============================================================ */
function renderLanding() {
  const novedades  = inventory.filter(p => p.novedad    && p.stock);
  const destacados = inventory.filter(p => p.destacado  && p.stock);

  const heroHTML = `
    <div class="hero-strip">
      <p class="hero-strip__eyebrow">Bienvenido a</p>
      <h1 class="hero-strip__title">${CONFIG.storeName}</h1>
      <p class="hero-strip__sub">Encuentra peluches, figuras, TCG y más.</p>
    </div>`;

  const destacadosHTML = destacados.length ? `
    <div class="section-header">
      <h2 class="section-header__title">Destacados</h2>
    </div>
    <div class="destacados-grid">
      ${destacados.map(p => renderProductCard(p)).join('')}
    </div>
    <hr class="divider" />` : '';

  const novedadesHTML = novedades.length ? `
    <div class="section-header">
      <h2 class="section-header__title">Novedades</h2>
    </div>
    <div class="novedades-strip">
      ${novedades.map(p => renderProductCard(p)).join('')}
    </div>
    <hr class="divider" />` : '';

  const encargosHTML = CONFIG.encargos.activo ? `
    <div class="section-header">
      <h2 class="section-header__title">Encargos desde Japón</h2>
    </div>
    <div class="encargos-card">
      <div>
        <p class="encargos-card__title">¿No encuentras lo que buscas?</p>
        <p class="encargos-card__desc">${CONFIG.encargos.descripcion}</p>
        <div class="encargos-card__meta">
          <span class="encargos-chip">
            ${iconByName('clock')} ${CONFIG.encargos.tiempoEstimado}
          </span>
          <span class="encargos-chip">
            ${iconByName('handshake')} ${CONFIG.encargos.adelanto}
          </span>
          <span class="encargos-chip">
            ${iconByName('badge-dollar-sign')} ${CONFIG.encargos.cta}
          </span>
        </div>
      </div>
      <a href="https://ig.me/m/${CONFIG.instagramUser}"
          target="_blank" rel="noopener noreferrer"
          class="btn btn-primary">
        ${iconInstagram()} Consultar encargo
      </a>
    </div>
    <hr class="divider" />` : '';

  const coleccionesHTML = CONFIG.colecciones.length ? `
    <div class="section-header">
      <h2 class="section-header__title">Colecciones</h2>
    </div>
    <div class="colecciones-grid">
      ${CONFIG.colecciones.map(col => {
        const count = inventory.filter(p =>
          (p.colecciones ?? []).includes(col.slug)
        ).length;
        const coverHTML = col.cover
          ? `<img src="${col.cover}" alt="${escapeHtml(col.nombre)}" loading="lazy" />`
          : `<div class="coleccion-card__cover-placeholder">${iconByName('layers')}</div>`;
        return `
          <div class="coleccion-card" data-nav-coleccion="${col.slug}">
            <div class="coleccion-card__cover">${coverHTML}</div>
            <div class="coleccion-card__body">
              <p class="coleccion-card__name">${escapeHtml(col.nombre)}</p>
              <p class="coleccion-card__count">${count} producto${count !== 1 ? 's' : ''}</p>
            </div>
          </div>`;
      }).join('')}
    </div>
    <hr class="divider" />` : '';

  const categoryCardsHTML = Object.entries(CATEGORIES)
    .filter(([slug]) => slug !== 'todas')
    .map(([slug, { label, icon }]) => {
      const count = inventory.filter(p => p.categoria === slug).length;
      return `
        <button class="category-card" data-nav-cat="${slug}">
          <span class="category-card__icon">${icon}</span>
          <span class="category-card__label">${label}</span>
          <span class="category-card__count">${count} producto${count !== 1 ? 's' : ''}</span>
        </button>`;
    }).join('');

  const infoStripHTML = `
    <div class="info-strip">
      <div class="info-strip__text">
        <p class="info-strip__title">¿Primera vez?</p>
        <p class="info-strip__sub">Conoce cómo comprar, métodos de entrega y más.</p>
      </div>
      <button class="info-strip__btn" data-nav-info>Ver información</button>
    </div>`;

  return `
    ${heroHTML}
    ${destacadosHTML}
    ${novedadesHTML}
    ${encargosHTML}
    ${coleccionesHTML}
    <div class="section-header">
      <h2 class="section-header__title">Categorías</h2>
    </div>
    <div class="category-grid">
      ${categoryCardsHTML}
    </div>
    ${infoStripHTML}
  `;
}

/* ============================================================
    VISTA: CATEGORÍA
============================================================ */
function renderCategory() {
  const cat = CATEGORIES[state.cat];
  const productos = inventory.filter(p => p.categoria === state.cat);
  const disponibles = productos.filter(p => p.stock);
  const agotados    = productos.filter(p => !p.stock);
  const todos       = [...disponibles, ...agotados];

  const gridHTML = todos.length
    ? `<div class="product-grid">${todos.map(p => renderProductCard(p)).join('')}</div>`
    : `<div class="empty-state">
        <div class="empty-state__icon">${'📦'}</div>
        <p class="empty-state__title">Sin productos aún</p>
        <p class="empty-state__text">Pronto habrá novedades en esta categoría.</p>
      </div>`;

  return `
    <button class="back-btn" data-nav-back>
      ${iconArrowLeft()} Volver
    </button>
    <div class="section-header">
      <h2 class="section-header__title">${cat?.icon ?? ''} ${cat?.label ?? state.cat}</h2>
      <span class="section-header__count">${todos.length} producto${todos.length !== 1 ? 's' : ''}</span>
    </div>
    ${gridHTML}
  `;
}

/* ============================================================
    VISTA: PRODUCTO
============================================================ */
function renderProduct() {
  const p = inventory.find(prod => prod.id === state.product);
  if (!p) return renderNotFound();

  const allImgs = [p.imagenes.principal, ...(p.imagenes.galeria ?? [])];

  const thumbsHTML = allImgs.length > 1
    ? `<div class="product-detail__thumbs">
        ${allImgs.map((src, i) => `
          <button class="product-detail__thumb ${i === 0 ? 'active' : ''}" data-thumb="${src}" data-idx="${i}">
            <img src="${src}" alt="Vista ${i + 1}" loading="lazy" />
          </button>`).join('')}
      </div>`
    : '';

  const metaRowsHTML = Object.entries(p.detalles ?? {})
    .map(([k, v]) => `
      <div class="product-detail__meta-row">
        <span class="product-detail__meta-key">${capitalize(k)}</span>
        <span class="product-detail__meta-val">${v}</span>
      </div>`).join('');

  const igMsg = encodeURIComponent(`Hola! Me interesa: ${p.nombre}`);
  const igUrl = `https://ig.me/m/${CONFIG.instagramUser}`;

  const btnHTML = p.stock
  ? `<button class="btn btn-primary btn-full" id="js-ig-btn" data-ig-url="${igUrl}" data-ig-msg="${escapeHtml(`Hola! Me interesa: ${p.nombre}`)}">
        ${iconInstagram()} Consultar por este producto
      </button>
      <p class="text-sm text-muted" style="text-align:center;margin-top:8px;">
        Se copiará un mensaje · Pégalo al abrir el chat
      </p>`
  : `<button class="btn btn-primary btn-full" disabled>Sin stock</button>`;

  const shareBtn = `
  <button class="share-btn" id="js-share-btn">
    ${iconShare()}
  </button>`;

  return `
    <button class="back-btn" data-nav-back>
      ${iconArrowLeft()} Volver
    </button>

    <div class="product-detail">
      <!-- Galería -->
      <div class="product-detail__gallery">
        <div class="product-detail__main-img">
          <img
            id="js-main-img"
            src="${p.imagenes.principal}"
            alt="${p.nombre}"
            loading="eager"
          />
        </div>
        ${thumbsHTML}
      </div>

      <!-- Info -->
      <div class="product-detail__info">
        ${renderBadges(p)}

        <h1 class="product-detail__name">${p.nombre}</h1>

        <div class="product-detail__sep">
          <p class="product-detail__price">${formatPrice(p.precio, p.moneda)}</p>
          ${shareBtn}
        </div>

        <p class="product-detail__desc">${p.descripcion}</p>

        ${metaRowsHTML ? `<div class="product-detail__meta">${metaRowsHTML}</div>` : ''}

        <div>
          ${btnHTML}
        </div>
      </div>
    ${renderRelated(p)}
    </div>
  `;
}

/* ============================================================
    VISTA: BÚSQUEDA
============================================================ */
function renderSearch() {
  const q = state.query.trim().toLowerCase();
  if (!q) return renderLanding();

  const results = inventory.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    (p.tags ?? []).some(t => t.toLowerCase().includes(q))
  );

  const gridHTML = results.length
    ? `<div class="product-grid">${results.map(p => renderProductCard(p)).join('')}</div>`
    : `<div class="empty-state">
        <div class="empty-state__icon">🔍</div>
        <p class="empty-state__title">Sin resultados</p>
        <p class="empty-state__text">No encontramos productos para "<strong>${escapeHtml(state.query)}</strong>".</p>
      </div>`;

  return `
    <p class="search-results-label">
      Resultados para <strong>"${escapeHtml(state.query)}"</strong>
      ${results.length ? `— ${results.length} producto${results.length !== 1 ? 's' : ''}` : ''}
    </p>
    ${gridHTML}
  `;
}

/* ============================================================
    VISTA: INFORMACION
============================================================ */
function renderInfo() {
  const sections = [
    { id: 'como-comprar',  label: '¿Cómo comprar?' },
    { id: 'entrega',       label: 'Entrega'         },
    { id: 'pago',          label: 'Pago'            },
    { id: 'nosotros',      label: 'Nosotros'        },
    { id: 'faq',           label: 'FAQ'             },
  ];

  const navHTML = sections.map((s, i) => `
    <li>
      <button class="info-nav__btn ${i === 0 ? 'active' : ''}"
        data-info-section="${s.id}">${s.label}
      </button>
    </li>`).join('');

  const stepsHTML = [
    { n: 1, title: 'Explora',     desc: 'Navega por categorías o busca el producto que buscas.' },
    { n: 2, title: 'Consulta',    desc: 'Presiona "Consultar" en el producto. Se copia un mensaje automáticamente.' },
    { n: 3, title: 'Coordina',    desc: 'Pégalo en el chat de Instagram y coordinamos entrega y pago.' },
  ].map(s => `
    <div class="step-card">
      <div class="step-card__number">${s.n}</div>
      <p class="step-card__title">${s.title}</p>
      <p class="step-card__desc">${s.desc}</p>
    </div>`).join('');

  const deliveryHTML = CONFIG.delivery.map(d => `
    <div class="delivery-card">
      ${iconByName(d.icon)}
      <p class="delivery-card__label">${d.label}</p>
      <p class="delivery-card__desc">${d.desc}</p>
    </div>`).join('');

  const paymentHTML = CONFIG.payment.map(p => `
    <div class="payment-chip">
      ${iconByName(p.icon)}
      ${p.label}
      ${p.soon ? '<span class="payment-chip__soon">· Próximamente</span>' : ''}
    </div>`).join('');

  const aboutHTML = CONFIG.about.imagen
    ? `<div class="about-wrap has-image">
        <img class="about-img" src="${CONFIG.about.imagen}" alt="Sobre la tienda" />
        <p class="about-text">${CONFIG.about.texto}</p>
        </div>`
    : `<p class="about-text">${CONFIG.about.texto}</p>`;

  const faqHTML = CONFIG.faqs.map((f, i) => `
    <div class="faq-item" id="faq-${i}">
      <button class="faq-item__btn" data-faq="${i}">
        <span>${f.q}</span>
        ${iconByName('chevron-down')}
      </button>
      <div class="faq-item__body">
        <p>${f.r}</p>
      </div>
    </div>`).join('');

  return `
    <button class="back-btn" data-nav-back>
      ${iconArrowLeft()} Volver
    </button>

    <nav class="info-nav">
      <div class="container">
        <ul class="info-nav__list">${navHTML}</ul>
      </div>
    </nav>

    <div id="como-comprar" class="info-section">
      <h2 class="info-section__title">¿Cómo comprar?</h2>
      <div class="steps-grid">${stepsHTML}</div>
    </div>

    <div id="entrega" class="info-section">
      <h2 class="info-section__title">Métodos de entrega</h2>
      <div class="delivery-grid">${deliveryHTML}</div>
    </div>

    <div id="pago" class="info-section">
      <h2 class="info-section__title">Métodos de pago</h2>
      <div class="payment-list">${paymentHTML}</div>
    </div>

    <div id="nosotros" class="info-section">
      <h2 class="info-section__title">Sobre la tienda</h2>
      ${aboutHTML}
    </div>

    <div id="faq" class="info-section">
      <h2 class="info-section__title">Preguntas frecuentes</h2>
      <div class="faq-list">${faqHTML}</div>
    </div>
  `;
}

/* ============================================================
    NOT FOUND
============================================================ */
function renderNotFound() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">🤔</div>
      <p class="empty-state__title">Producto no encontrado</p>
      <p class="empty-state__text">Este producto ya no está disponible.</p>
      <br/>
      <button class="btn btn-ghost" data-nav-landing>Volver al inicio</button>
    </div>`;
}

/* ============================================================
    CARD DE PRODUCTO (reutilizable)
============================================================ */
function renderProductCard(p) {
  const firstBadge = p.novedad ? `<span class="badge badge--new">Nuevo</span>`
    : !p.stock ? `<span class="badge badge--out">Agotado</span>`
    : '';
  const badge = firstBadge ? `<div style="position:absolute;top:10px;left:10px;z-index:1">${firstBadge}</div>` : '';

  const imgHTML = p.imagenes?.principal
    ? `<img class="product-card__img" src="${p.imagenes.principal}" alt="${escapeHtml(p.nombre)}" loading="lazy" />`
    : `<div class="product-card__img-placeholder">📦</div>`;

  const priceHTML = p.stock
    ? `<span class="product-card__price">${formatPrice(p.precio, p.moneda)}</span>`
    : `<span class="product-card__out-of-stock">Sin stock</span>`;

  return `
    <article class="product-card" data-nav-product="${p.id}" role="button" tabindex="0" aria-label="${escapeHtml(p.nombre)}">
      <div class="product-card__img-wrap">
      ${badge}
      ${imgHTML}
      </div>
      <div class="product-card__body">
        <p class="product-card__name">${escapeHtml(p.nombre)}</p>
        ${priceHTML}
      </div>
    </article>`;
}

/* ============================================================
    VISTA: COLECCION
============================================================ */
function renderColeccion() {
  const col = CONFIG.colecciones.find(c => c.slug === state.cat);
  if (!col) return renderNotFound();

  const productos = inventory.filter(p =>
    (p.colecciones ?? []).includes(state.cat)
  );
  const disponibles = productos.filter(p => p.stock);
  const agotados    = productos.filter(p => !p.stock);
  const todos       = [...disponibles, ...agotados];

  const gridHTML = todos.length
    ? `<div class="product-grid">${todos.map(p => renderProductCard(p)).join('')}</div>`
    : `<div class="empty-state">
        <div class="empty-state__icon">${iconByName('layers')}</div>
        <p class="empty-state__title">Sin productos aún</p>
        <p class="empty-state__text">Esta colección no tiene productos todavía.</p>
        </div>`;

  return `
    <button class="back-btn" data-nav-back>
      ${iconArrowLeft()} Volver
    </button>
    <div class="section-header">
      <h2 class="section-header__title">${escapeHtml(col.nombre)}</h2>
      <span class="section-header__count">${todos.length} producto${todos.length !== 1 ? 's' : ''}</span>
    </div>
    ${gridHTML}
  `;
}

/* ============================================================
    EVENTOS DE VISTAS (delegación)
============================================================ */
function attachViewEvents() {
  const main = document.getElementById('js-main');

  // Click en card de producto
  main.addEventListener('click', handleViewClick);
  main.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') handleViewClick(e);
  });

  // Thumbnails en vista de producto
  main.querySelectorAll('.product-detail__thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const src = thumb.dataset.thumb;
      const mainImg = document.getElementById('js-main-img');
      if (mainImg) mainImg.src = src;
      main.querySelectorAll('.product-detail__thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  const shareBtn = main.querySelector('#js-share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const p = inventory.find(prod => prod.id === state.product);
      if (p) shareProduct(p);
    });
  }

  const igBtn = main.querySelector('#js-ig-btn');
  if (igBtn) {
    igBtn.addEventListener('click', async () => {
      const msg = igBtn.dataset.igMsg;
      const url = igBtn.dataset.igUrl;
      try {
        await navigator.clipboard.writeText(msg);
        showToast('✓ Mensaje copiado — pégalo en el chat');
      } catch {
        showToast('Abriendo Instagram...');
      }
      setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), 600);
    });
  }

  // Info nav — scroll suave a secciones
  main.querySelectorAll('.info-nav__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.infoSection;
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      main.querySelectorAll('.info-nav__btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // FAQ acordeón
  main.querySelectorAll('[data-faq]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      main.querySelectorAll('.faq-item').forEach(f => f.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

function handleViewClick(e) {
  const card    = e.target.closest('[data-nav-product]');
  const catBtn  = e.target.closest('[data-nav-cat]');
  const backBtn = e.target.closest('[data-nav-back]');
  const landBtn = e.target.closest('[data-nav-landing]');
  const colBtn  = e.target.closest('[data-nav-coleccion]');
  const infoBtn = e.target.closest('[data-nav-info]');

  if (card)    navigate('product',  { product: card.dataset.navProduct });
  if (catBtn)  navigate('category', { cat: catBtn.dataset.navCat });
  if (backBtn) history.back();
  if (landBtn) navigate('landing');
  if (colBtn) navigate('coleccion', { cat: colBtn.dataset.navColeccion });
  if (infoBtn) navigate('info');
}

/* ============================================================
    BUSCADOR
============================================================ */
function initSearch() {
  const input = document.getElementById('js-search-input');
  if (!input) return;

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();

    debounceTimer = setTimeout(() => {
      if (q.length >= 2) {
        navigate('search', { query: q });
      } else if (q.length === 0 && state.view === 'search') {
        navigate('landing');
      }
    }, 250);
  });

  // Limpiar búsqueda al hacer Enter vacío
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      navigate('landing');
      input.blur();
    }
  });
}

/* ============================================================
    NAVEGACIÓN POR TABS
============================================================ */
function initCategoryNav() {
  document.getElementById('js-cat-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    const cat = btn.dataset.cat;

    // Limpiar buscador al cambiar de tab
    const searchInput = document.getElementById('js-search-input');
    if (searchInput) searchInput.value = '';

    if (cat === 'todas') {
      navigate('landing');
    } else {
      navigate('category', { cat });
    }
  });
}

/* ============================================================
    HOME LINK (logo)
============================================================ */
function initHomeLink() {
  document.getElementById('js-home-link').addEventListener('click', (e) => {
    e.preventDefault();
    const searchInput = document.getElementById('js-search-input');
    if (searchInput) searchInput.value = '';
    navigate('landing');
  });
}

/* ============================================================
    INICIALIZAR UI ESTÁTICA
============================================================ */
function initStaticUI() {
  // Nombre de tienda
  const nameEl = document.getElementById('js-store-name');
  if (nameEl) nameEl.textContent = CONFIG.storeName;

  // Placeholder logo (inicial del nombre)
  const placeholder = document.getElementById('js-logo-placeholder');
  if (placeholder) placeholder.textContent = CONFIG.storeName.charAt(0).toUpperCase();

  // Footer
  const footerName = document.getElementById('js-footer-name');
  if (footerName) footerName.innerHTML =
  `© ${new Date().getFullYear()} ${CONFIG.storeName} · <button style="color:inherit;text-decoration:underline;font-size:inherit" data-nav-info>Información</button>`;

  // Título de la pestaña
  document.title = CONFIG.storeName;
}

function initCategoryTabs() {
  const list = document.getElementById('js-cat-tabs');
  const tabs = Object.entries(CATEGORIES)
    .map(([slug, { label, icon }]) => `
      <li class="category-nav__item">
        <button class="category-nav__btn" data-cat="${slug}">
          ${icon} ${label}
        </button>
      </li>`).join('');

  list.insertAdjacentHTML('beforeend', tabs);
  if (window.lucide) window.lucide.createIcons();
}

/* ============================================================
    DETECTAR RUTA INICIAL (deep links)
============================================================ */
function resolveInitialRoute() {
  const params = new URLSearchParams(window.location.search);

  if (params.has('producto')) {
    navigate('product', { product: params.get('producto') }, false);
  } else if (params.has('cat')) {
    navigate('category', { cat: params.get('cat') }, false);
  } else if (params.has('buscar')) {
    const q = params.get('buscar');
    const searchInput = document.getElementById('js-search-input');
    if (searchInput) searchInput.value = q;
    navigate('search', { query: q }, false);
  } else if (params.has('info')) {
    navigate('info', {}, false);
  } else if (params.has('coleccion')) {
    navigate('coleccion', { cat: params.get('coleccion') }, false);
  } else {
    navigate('landing', {}, false);
  }
}

/* ============================================================
    UTILIDADES
============================================================ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showToast(msg, duration = 2800) {
  let toast = document.getElementById('js-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'js-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('visible'), duration);
}

function renderBadges(p) {
  const BADGE_MAP = {
    novedad: { cls: 'badge--new',   label: 'Novedad' },
    oferta:  { cls: 'badge--sale',  label: 'Oferta'  },
    japon:   { cls: 'badge--japan', label: 'Japón'   },
    china:   { cls: 'badge--china', label: 'China'   },
  };

  const badges = [...(p.badges ?? [])];
  if (!p.stock) badges.unshift('agotado');

  if (!badges.length) return '';

  const items = badges.map(slug => {
    if (slug === 'agotado') {
      return `<span class="badge badge--out">Sin stock</span>`;
    }
    const b = BADGE_MAP[slug] ?? { cls: 'badge--default', label: capitalize(slug) };
    return `<span class="badge ${b.cls}">${b.label}</span>`;
  }).join('');

  return `<div class="badge-strip">${items}</div>`;
}

async function shareProduct(p) {
  const url = `${location.origin}${location.pathname}?producto=${p.id}`;
  const data = { title: p.nombre, text: p.descripcion, url };

  if (navigator.share) {
    try { await navigator.share(data); } catch { /* cancelado */ }
  } else {
    await navigator.clipboard.writeText(url);
    showToast('✓ Link copiado al portapapeles');
  }
}

function renderRelated(p) {
  const related = inventory
    .filter(x => x.categoria === p.categoria && x.id !== p.id)
    .slice(0, 8);
  if (!related.length) return '';

  return `
    <hr class="divider" />
    <div class="section-header">
      <h2 class="section-header__title">Más en ${CATEGORIES[p.categoria]?.label ?? p.categoria}</h2>
    </div>
    <div class="novedades-strip">
      ${related.map(r => renderProductCard(r)).join('')}
    </div>`;
}

/* ============================================================
    ÍCONOS SVG inline
============================================================ */
function iconArrowLeft() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>`;
}

function iconInstagram() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`;
}

function iconShare() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
}

function iconBug() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bug-icon lucide-bug"><path d="M12 20v-9"/><path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z"/><path d="M14.12 3.88 16 2"/><path d="M21 21a4 4 0 0 0-3.81-4"/><path d="M21 5a4 4 0 0 1-3.55 3.97"/><path d="M22 13h-4"/><path d="M3 21a4 4 0 0 1 3.81-4"/><path d="M3 5a4 4 0 0 0 3.55 3.97"/><path d="M6 13H2"/><path d="m8 2 1.88 1.88"/><path d="M9 7.13V6a3 3 0 1 1 6 0v1.13"/></svg>`;
}

function iconHouse() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-house-icon lucide-house"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;
}

function iconPanda() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-panda-icon lucide-panda"><path d="M11.25 17.25h1.5L12 18z"/><path d="m15 12 2 2"/><path d="M18 6.5a.5.5 0 0 0-.5-.5"/><path d="M20.69 9.67a4.5 4.5 0 1 0-7.04-5.5 8.35 8.35 0 0 0-3.3 0 4.5 4.5 0 1 0-7.04 5.5C2.49 11.2 2 12.88 2 14.5 2 19.47 6.48 22 12 22s10-2.53 10-7.5c0-1.62-.48-3.3-1.3-4.83"/><path d="M6 6.5a.495.495 0 0 1 .5-.5"/><path d="m9 12-2 2"/></svg>`;
}

function iconBoxes() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-boxes-icon lucide-boxes"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="m17 16.5-5-3"/><path d="m17 16.5 4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/><path d="M12 8 7.26 5.15"/><path d="m12 8 4.74-2.85"/><path d="M12 13.5V8"/></svg>`;
}

function iconGalleryHorizontalEnd() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gallery-horizontal-end-icon lucide-gallery-horizontal-end"><path d="M2 7v10"/><path d="M6 5v14"/><rect width="12" height="18" x="10" y="3" rx="2"/></svg>`;
}

function iconPiggyBank() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-piggy-bank-icon lucide-piggy-bank"><path d="M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z"/><path d="M16 10h.01"/><path d="M2 8v1a2 2 0 0 0 2 2h1"/></svg>`;
}

function iconDroplets() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-droplets-icon lucide-droplets"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>`;
}

function iconByName(name) {
  const icons = {
    'package':      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>`,
    'truck':        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/></svg>`,
    'zap':          `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    'train-front':  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/></svg>`,
    'map-pin':      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    'building-2':   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
    'link':         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    'chevron-down': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
    'clock':        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    'percent':      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
    'layers':       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    'handshake':    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-handshake-icon lucide-handshake"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg>`,
    'badge-dollar-sign': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-badge-dollar-sign-icon lucide-badge-dollar-sign"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>`,
    //
  };
  const svg = icons[name] ?? icons['package'];
  return svg.replace('<svg ', '<svg width="20" height="20" ');
}

/* ============================================================
    BOOTSTRAP
============================================================ */
async function init() {
  initStaticUI();
  initCategoryTabs();

  try {
    const res = await fetch(CONFIG.inventoryUrl);
    if (!res.ok) throw new Error('No se pudo cargar el inventario.');
    inventory = await res.json();
  } catch (err) {
    document.getElementById('js-main').innerHTML = `
      <div class="container">
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <p class="empty-state__title">Error al cargar</p>
          <p class="empty-state__text">${err.message}</p>
        </div>
      </div>`;
    return;
  }

  initCategoryNav();
  initSearch();
  initHomeLink();

  document.querySelector('footer').addEventListener('click', e => {
    if (e.target.closest('[data-nav-info]')) navigate('info');
  });

  resolveInitialRoute();
}

init();

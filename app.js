/* ============================================================
    CONFIGURACIÓN — edita estos valores
============================================================ */
const CONFIG = {
  storeName:    'Yanmega Ofertas',
  instagramUser: 'yanmegaofertas',
  currency:     'CLP',
  inventoryUrl: 'inventory.json',
};

/* ============================================================
    CATEGORÍAS
============================================================ */
const CATEGORIES = {
  todas:    { label: 'Inicio',    emoji: '🏠' },
  peluches: { label: 'Peluches',  emoji: '🧸' },
  tcg:      { label: 'TCG',       emoji: '🃏' },
  figuras:  { label: 'Figuras',   emoji: '🗿' },
  gachapon: { label: 'Gachapon',  emoji: '🎱' },
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
    case 'landing':   html = renderLanding();  break;
    case 'category':  html = renderCategory(); break;
    case 'product':   html = renderProduct();  break;
    case 'search':    html = renderSearch();   break;
    default:          html = renderLanding();
  }

  main.innerHTML = `<div class="container view">${html}</div>`;
  attachViewEvents();
}

/* ============================================================
    VISTA: LANDING
============================================================ */
function renderLanding() {
  const novedades = inventory.filter(p => p.novedad && p.stock);

  const categoryCardsHTML = Object.entries(CATEGORIES)
    .filter(([slug]) => slug !== 'todas')
    .map(([slug, { label, emoji }]) => {
      const count = inventory.filter(p => p.categoria === slug).length;
      return `
        <button class="category-card" data-nav-cat="${slug}">
          <span class="category-card__emoji">${emoji}</span>
          <span class="category-card__label">${label}</span>
          <span class="category-card__count">${count} producto${count !== 1 ? 's' : ''}</span>
        </button>`;
    }).join('');

  const novedadesHTML = novedades.length
    ? `
      <div class="section-header">
        <h2 class="section-header__title">Novedades</h2>
      </div>
      <div class="novedades-strip" id="js-novedades">
        ${novedades.map(p => renderProductCard(p)).join('')}
      </div>
      <hr class="divider" />`
    : '';

  return `
    <div class="hero-strip">
      <p class="hero-strip__eyebrow">Bienvenido a</p>
      <h1 class="hero-strip__title">${CONFIG.storeName}</h1>
      <p class="hero-strip__sub">Encuentra peluches, figuras, TCG y más.</p>
    </div>

    ${novedadesHTML}

    <div class="section-header">
      <h2 class="section-header__title">Categorías</h2>
    </div>
    <div class="category-grid">
      ${categoryCardsHTML}
    </div>
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
        <div class="empty-state__icon">${cat?.emoji ?? '📦'}</div>
        <p class="empty-state__title">Sin productos aún</p>
        <p class="empty-state__text">Pronto habrá novedades en esta categoría.</p>
      </div>`;

  return `
    <button class="back-btn" data-nav-back>
      ${iconArrowLeft()} Volver
    </button>
    <div class="section-header">
      <h2 class="section-header__title">${cat?.emoji ?? ''} ${cat?.label ?? state.cat}</h2>
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
}

function handleViewClick(e) {
  const card    = e.target.closest('[data-nav-product]');
  const catBtn  = e.target.closest('[data-nav-cat]');
  const backBtn = e.target.closest('[data-nav-back]');
  const landBtn = e.target.closest('[data-nav-landing]');

  if (card)    navigate('product',  { product: card.dataset.navProduct });
  if (catBtn)  navigate('category', { cat: catBtn.dataset.navCat });
  if (backBtn) history.back();
  if (landBtn) navigate('landing');
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
  if (footerName) footerName.textContent = `© ${new Date().getFullYear()} ${CONFIG.storeName}`;

  // Título de la pestaña
  document.title = CONFIG.storeName;
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

/* ============================================================
    BOOTSTRAP
============================================================ */
async function init() {
  initStaticUI();

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
  resolveInitialRoute();
}

init();

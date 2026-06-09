(function () {
  // ─── CONFIG ────────────────────────────────────────────────────────────────
  const SHOP_URL = 'https://loghomefloorplans.shop';
  const STOREFRONT_TOKEN = '6ee8c6b5fd28b442383d13f69f44e7bc'; // replace with your public token
  const API_VERSION = '2024-10';
  const COLLECTION_HANDLE = 'all';
  const PRODUCTS_PER_PAGE = 250;
  const ENDPOINT = `${SHOP_URL}/api/${API_VERSION}/graphql.json`;

  // ─── STATE ─────────────────────────────────────────────────────────────────
  let allProducts = [];
  let viewMode = 'photo'; // 'photo' | 'floorplan'
  let filterState = {
    size: 'all',
    style: 'any',
    bedrooms: 'any',
    bathrooms: 'any',
    stories: 'any',
    garage: 'any',
    basement: 'any',
    sort: 'default',
    q: ''
  };

  // ─── GRAPHQL ───────────────────────────────────────────────────────────────
  function buildQuery(cursor) {
    const after = cursor ? `, after: "${cursor}"` : '';
    return `{
      collection(handle: "${COLLECTION_HANDLE}") {
        products(first: ${PRODUCTS_PER_PAGE}${after}) {
          edges {
            node {
              id
              title
              handle
              tags
              featuredImage {
                url(transform: { maxWidth: 600 })
                altText
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              metafields(identifiers: [
                { namespace: "custom", key: "no_of_bedroom" }
                { namespace: "custom", key: "no_of_bathrooms" }
                { namespace: "custom", key: "no_of_stories" }
                { namespace: "custom", key: "sq_ft" }
                { namespace: "custom", key: "garage" }
                { namespace: "custom", key: "basement" }
                { namespace: "custom", key: "home_style" }
                { namespace: "custom", key: "project_name" }
                { namespace: "custom", key: "main_floor_plan" }
              ]) {
                namespace
                key
                value
                reference {
                  ... on MediaImage {
                    image {
                      url(transform: { maxWidth: 600 })
                      altText
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }`;
  }

  async function gql(query) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
      },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error('Storefront API error ' + res.status);
    return res.json();
  }

  async function fetchAllProducts() {
    const products = [];
    let cursor = null;
    let hasNext = true;
    while (hasNext) {
      const data = await gql(buildQuery(cursor));
      const col = data && data.data && data.data.collection;
      if (!col) break;
      col.products.edges.forEach(function (edge) {
        products.push(normalizeProduct(edge.node));
      });
      hasNext = col.products.pageInfo.hasNextPage;
      cursor = col.products.pageInfo.endCursor;
    }
    return products;
  }

  // ─── NORMALIZE ─────────────────────────────────────────────────────────────
  function normalizeProduct(node) {
    const mf = {};
    const mfRef = {};
    (node.metafields || []).forEach(function (m) {
      if (m) { mf[m.key] = m.value; mfRef[m.key] = m.reference; }
    });
    const fpRef = mfRef.main_floor_plan;
    const fpImage = fpRef && fpRef.image ? fpRef.image.url : '';

    // home_style can arrive as a JSON array string or a plain string
    let style = mf.home_style || '';
    if (style.startsWith('[')) {
      try { style = JSON.parse(style); } catch (e) { style = [style]; }
    } else {
      style = style ? [style] : [];
    }

    const sqft     = parseFloat(mf.sq_ft) || 0;
    const beds     = parseInt(mf.no_of_bedroom, 10) || 0;
    const baths    = parseFloat(mf.no_of_bathrooms) || 0;
    const stories  = parseFloat(mf.no_of_stories) || 0;
    const garage   = (mf.garage || '').toLowerCase();
    const basement = (mf.basement || '').toLowerCase();
    const price    = parseFloat((node.priceRange && node.priceRange.minVariantPrice && node.priceRange.minVariantPrice.amount) || 0);
    const tags     = node.tags || [];
    const isNew    = tags.indexOf('new') !== -1;
    const isADU    = style.some(function (s) { return s.toLowerCase() === 'adu'; }) || tags.indexOf('adu') !== -1;

    return {
      id:          node.id,
      title:       node.title,
      handle:      node.handle,
      tags:        tags,
      image:       node.featuredImage ? node.featuredImage.url : '',
      imageAlt:    node.featuredImage ? (node.featuredImage.altText || node.title) : node.title,
      fpImage:     fpImage,
      price:       price,
      sqft:        sqft,
      beds:        beds,
      baths:       baths,
      stories:     stories,
      garage:      garage,
      basement:    basement,
      style:       style,
      isNew:       isNew,
      isADU:       isADU,
      projectName: mf.project_name || ''
    };
  }

  // ─── FILTER ────────────────────────────────────────────────────────────────
  function applyFilters(products) {
    var fs = filterState;
    var result = products.filter(function (p) {

      // Size / sqft range
      if      (fs.size === 'adu')       { if (!p.isADU) return false; }
      else if (fs.size === 'u1000')     { if (p.sqft === 0 || p.sqft >= 1000) return false; }
      else if (fs.size === '1000-1500') { if (p.sqft < 1000 || p.sqft >= 1500) return false; }
      else if (fs.size === '1500-2500') { if (p.sqft < 1500 || p.sqft >= 2500) return false; }
      else if (fs.size === 'a2500')     { if (p.sqft < 2500) return false; }

      // Style
      if (fs.style !== 'any') {
        var match = p.style.some(function (s) {
          return s.toLowerCase() === fs.style.toLowerCase();
        });
        if (!match) return false;
      }

      // Bedrooms (minimum)
      if (fs.bedrooms !== 'any' && p.beds < parseInt(fs.bedrooms, 10)) return false;

      // Bathrooms (minimum)
      if (fs.bathrooms !== 'any' && p.baths < parseFloat(fs.bathrooms)) return false;

      // Stories (exact)
      if (fs.stories !== 'any' && p.stories !== parseFloat(fs.stories)) return false;

      // Garage
      if (fs.garage !== 'any' && p.garage !== fs.garage) return false;

      // Basement
      if (fs.basement !== 'any' && p.basement !== fs.basement) return false;

      // Text search
      if (fs.q) {
        var needle = fs.q.toLowerCase();
        var hay = [
          p.title,
          p.projectName,
          p.style.join(' '),
          String(p.beds),
          String(p.baths),
          String(p.sqft),
          p.tags.join(' ')
        ].join(' ').toLowerCase();
        if (hay.indexOf(needle) === -1) return false;
      }

      return true;
    });

    // Sort
    if      (fs.sort === 'name-asc')   result.sort(function (a, b) { return a.title.localeCompare(b.title); });
    else if (fs.sort === 'name-desc')  result.sort(function (a, b) { return b.title.localeCompare(a.title); });
    else if (fs.sort === 'size-asc')   result.sort(function (a, b) { return a.sqft - b.sqft; });
    else if (fs.sort === 'size-desc')  result.sort(function (a, b) { return b.sqft - a.sqft; });
    else if (fs.sort === 'price-asc')  result.sort(function (a, b) { return a.price - b.price; });
    else if (fs.sort === 'price-desc') result.sort(function (a, b) { return b.price - a.price; });

    return result;
  }

  // ─── RENDER HELPERS ────────────────────────────────────────────────────────
  function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  }

  function fmtBaths(n) {
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  }

  function fmtSqft(n) {
    return n > 0 ? n.toLocaleString() + ' sf' : '';
  }

  function fmtPrice(n) {
    return n > 0 ? '$' + n.toLocaleString() : '';
  }

  function renderCard(p) {
    var styleLabel = p.style.join(' · ');
    var specs = [];
    if (p.beds)  specs.push(p.beds + ' bd');
    if (p.baths) specs.push(fmtBaths(p.baths) + ' ba');
    if (p.sqft)  specs.push(fmtSqft(p.sqft));

    var isFPMode = viewMode === 'floorplan' && p.fpImage;
    var activeSrc = isFPMode ? p.fpImage : p.image;
    var imgClass = 'fp-card__img' + (isFPMode ? ' fp-card__img--contain' : '');
    var imgHtml = activeSrc
      ? '<img class="' + imgClass + '" src="' + activeSrc + '" alt="' + escAttr(p.imageAlt) + '" loading="lazy">'
      : '<div class="fp-card__img-placeholder"></div>';
    var fullLink = isFPMode
      ? '<button class="fp-card__full-link" type="button" data-fp-open="' + activeSrc + '">See full picture</button>'
      : '';

    return '<div class="fp-card" data-card-href="' + SHOP_URL + '/products/' + p.handle + '">'
      + '<div class="fp-card__media">'
        + imgHtml
        + (styleLabel ? '<span class="fp-card__badge">' + esc(styleLabel) + '</span>' : '')
        + (p.isNew    ? '<span class="fp-card__new">New</span>' : '')
        + fullLink
      + '</div>'
      + '<div class="fp-card__body">'
        + '<p class="fp-card__title">' + esc(toTitleCase(p.title)) + '</p>'
        + (specs.length ? '<p class="fp-card__specs">' + specs.join(' &middot; ') + '</p>' : '')
        + (fmtPrice(p.price) ? '<p class="fp-card__price">' + esc(fmtPrice(p.price)) + '</p>' : '')
      + '</div>'
    + '</div>';
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(str) { return esc(str); }

  // ─── RENDER GRID ───────────────────────────────────────────────────────────
  function renderGrid(products) {
    var grid  = document.getElementById('fp-grid');
    var count = document.getElementById('fp-count');
    if (!grid) return;

    if (products.length === 0) {
      grid.innerHTML = '<div class="fp-empty">No floor plans match your filters. <button class="fp-clear-btn" id="fp-clear">Clear filters</button></div>';
      var clearBtn = document.getElementById('fp-clear');
      if (clearBtn) clearBtn.addEventListener('click', clearFilters);
      if (count) count.textContent = '';
      return;
    }

    grid.innerHTML = products.map(renderCard).join('');
    if (count) count.textContent = products.length + ' plan' + (products.length === 1 ? '' : 's');

    grid.querySelectorAll('[data-fp-open]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openLightbox(btn.dataset.fpOpen);
      });
    });

    grid.querySelectorAll('[data-card-href]').forEach(function (card) {
      card.addEventListener('click', function () {
        window.open(card.dataset.cardHref, '_blank', 'noopener');
      });
    });
  }

  // ─── RENDER FILTERS ────────────────────────────────────────────────────────
  function chipGroup(label, filterId, options) {
    var chips = options.map(function (opt) {
      var on = filterState[filterId] === opt[0] ? ' fp-chip--on' : '';
      return '<button class="fp-chip' + on + '" data-filter="' + filterId + '" data-val="' + opt[0] + '">' + opt[1] + '</button>';
    }).join('');
    return '<div class="fp-filter-group">'
      + '<span class="fp-filter-group__label">' + label + '</span>'
      + '<div class="fp-chips">' + chips + '</div>'
      + '</div>';
  }

  function renderFilters() {
    var container = document.getElementById('fp-filters');
    if (!container) return;

    container.innerHTML =
      // Top row: search + sort + count
      '<div class="fp-top-row">'
        + '<input class="fp-search" type="search" id="fp-search" placeholder="Search plans…" autocomplete="off" value="' + escAttr(filterState.q) + '">'
        + '<select class="fp-sort" id="fp-sort">'
          + '<option value="default">Sort: Default</option>'
          + '<option value="name-asc">Name A–Z</option>'
          + '<option value="name-desc">Name Z–A</option>'
          + '<option value="size-asc">Size: Small first</option>'
          + '<option value="size-desc">Size: Large first</option>'
          + '<option value="price-asc">Price: Low to high</option>'
          + '<option value="price-desc">Price: High to low</option>'
        + '</select>'
        + '<span class="fp-count" id="fp-count"></span>'
      + '</div>'

      // Size chips
      + chipGroup('Size', 'size', [
          ['all',       'All'],
          ['adu',       'ADU'],
          ['u1000',     'Under 1,000 sf'],
          ['1000-1500', '1,000–1,500 sf'],
          ['1500-2500', '1,500–2,500 sf'],
          ['a2500',     '2,500+ sf']
        ])

      // Style chips
      + chipGroup('Style', 'style', [
          ['any',              'Any'],
          ['Mountain',         'Mountain'],
          ['ADU',              'ADU'],
          ['Barn',             'Barn'],
          ['Barndominium',     'Barndominium'],
          ['Ranch',            'Ranch'],
          ['Modern',           'Modern'],
          ['Garage',           'Garage'],
          ['Shade Structures', 'Shade Structures']
        ])

      // Row of smaller filter groups
      + '<div class="fp-filter-row">'
        + chipGroup('Beds', 'bedrooms', [['any','Any'],['1','1+'],['2','2+'],['3','3+'],['4','4+']])
        + chipGroup('Baths', 'bathrooms', [['any','Any'],['1','1+'],['2','2+'],['3','3+']])
        + chipGroup('Stories', 'stories', [['any','Any'],['1','1'],['1.5','1.5'],['2','2']])
        + chipGroup('Garage', 'garage', [['any','Any'],['yes','Yes'],['no','No']])
        + chipGroup('Basement', 'basement', [['any','Any'],['yes','Yes'],['no','No']])
      + '</div>'
      + '<div class="fp-view-row">'
        + '<button class="fp-view-toggle' + (viewMode === 'floorplan' ? ' fp-view-toggle--on' : '') + '" id="fp-view-toggle">'
            + (viewMode === 'floorplan' ? '&#128247; Photo View' : '&#9639; Floor Plan View')
          + '</button>'
      + '</div>';

    // Set sort value
    var sortEl = document.getElementById('fp-sort');
    if (sortEl) sortEl.value = filterState.sort;

    bindEvents();
  }

  // ─── EVENTS ────────────────────────────────────────────────────────────────
  function bindEvents() {
    var root = document.getElementById('floorplan-widget');
    if (!root) return;

    // Chip clicks — delegated from root
    root.addEventListener('click', function (e) {
      // Chip filter
      var btn = e.target.closest('.fp-chip');
      if (!btn) return;
      var filter = btn.dataset.filter;
      var val    = btn.dataset.val;
      if (!filter) return;
      filterState[filter] = val;
      btn.closest('.fp-chips').querySelectorAll('.fp-chip').forEach(function (b) {
        b.classList.toggle('fp-chip--on', b === btn);
      });
      update();
    });

    // Search
    var searchEl = document.getElementById('fp-search');
    if (searchEl) {
      var timer;
      searchEl.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          filterState.q = searchEl.value.trim();
          update();
        }, 250);
      });
    }

    // Sort
    var sortEl = document.getElementById('fp-sort');
    if (sortEl) {
      sortEl.addEventListener('change', function () {
        filterState.sort = sortEl.value;
        update();
      });
    }

    // Floor plan view toggle
    var toggleBtn = document.getElementById('fp-view-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        viewMode = viewMode === 'photo' ? 'floorplan' : 'photo';
        toggleBtn.innerHTML = viewMode === 'floorplan' ? '&#128247; Photo View' : '&#9639; Floor Plan View';
        toggleBtn.classList.toggle('fp-view-toggle--on', viewMode === 'floorplan');
        update();
      });
    }
  }

  // ─── CLEAR ─────────────────────────────────────────────────────────────────
  function clearFilters() {
    filterState = { size: 'all', style: 'any', bedrooms: 'any', bathrooms: 'any', stories: 'any', garage: 'any', basement: 'any', sort: 'default', q: '' };
    renderFilters();
    update();
  }

  // ─── LOADING / ERROR ───────────────────────────────────────────────────────
  function showLoading() {
    var grid = document.getElementById('fp-grid');
    if (grid) grid.innerHTML = '<div class="fp-loading"><span class="fp-spinner" aria-hidden="true"></span>Loading floor plans…</div>';
  }

  function showError(msg) {
    var grid = document.getElementById('fp-grid');
    if (grid) grid.innerHTML = '<div class="fp-error">' + esc(msg) + '</div>';
  }

  // ─── UPDATE ────────────────────────────────────────────────────────────────
  function update() {
    renderGrid(applyFilters(allProducts));
  }

  // ─── LIGHTBOX ──────────────────────────────────────────────────────────────
  function initLightbox() {
    var lb = document.createElement('div');
    lb.id        = 'fp-lightbox';
    lb.className = 'fp-lightbox';
    lb.setAttribute('aria-hidden', 'true');
    lb.innerHTML =
      '<div class="fp-lightbox__backdrop"></div>'
      + '<div class="fp-lightbox__frame">'
        + '<img class="fp-lightbox__img" id="fp-lb-img" src="" alt="Floor plan">'
      + '</div>'
      + '<button class="fp-lightbox__close" aria-label="Close">&times;</button>';
    document.body.appendChild(lb);

    lb.querySelector('.fp-lightbox__backdrop').addEventListener('click', closeLightbox);
    lb.querySelector('.fp-lightbox__close').addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });
  }

  function openLightbox(src) {
    var lb  = document.getElementById('fp-lightbox');
    var img = document.getElementById('fp-lb-img');
    if (!lb || !img) return;
    // Tell parent to expand the iframe to fill the viewport so position:fixed works
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'fp-lightbox-expand' }, '*');
    }
    img.src = src;
    lb.classList.add('fp-lightbox--open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    var lb = document.getElementById('fp-lightbox');
    if (!lb) return;
    lb.classList.remove('fp-lightbox--open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Tell parent to restore the iframe to its normal dimensions
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'fp-lightbox-shrink' }, '*');
    }
  }

  // ─── INIT ──────────────────────────────────────────────────────────────────
  async function init() {
    var root = document.getElementById('floorplan-widget');
    if (!root) return;

    initLightbox();
    renderFilters();
    showLoading();

    try {
      allProducts = await fetchAllProducts();
      update();
    } catch (err) {
      console.error('[FloorplanWidget]', err);
      showError('Unable to load floor plans. Please try again later.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

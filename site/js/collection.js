(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ALL = window.CBP_CATALOG || [];
  const CBP = window.CBP || { inr: n => '₹' + n.toLocaleString('en-IN'), isWished: () => false };
  const PER_PAGE = 16;

  const FACETS = {
    avail: { label: 'Availability', get: p => [p.inStock ? 'In Stock' : 'Out of Stock'], order: ['In Stock', 'Out of Stock'] },
    occasion: { label: 'Occasion', get: p => p.occasion },
    theme: { label: 'Theme', get: p => p.theme },
    size: { label: 'Size', get: p => p.size, sort: (a, b) => parseInt(a) - parseInt(b) || parseInt(a.split('×')[1]) - parseInt(b.split('×')[1]) },
    light: { label: 'Lighting', get: p => p.light, order: ['With light', 'Without light'] }
  };
  const PRICE_MIN = Math.floor(Math.min(...ALL.map(p => p.price)) / 50) * 50;
  const PRICE_MAX = Math.ceil(Math.max(...ALL.map(p => p.price)) / 50) * 50;

  /* ---------- State <-> URL ---------- */
  function readState() {
    const q = new URLSearchParams(location.search);
    const st = { sort: q.get('sort') || 'featured', page: Math.max(1, parseInt(q.get('page')) || 1), q: (q.get('q') || '').trim() };
    for (const k in FACETS) st[k] = q.getAll(k);
    st.min = clamp(parseInt(q.get('min')) || PRICE_MIN);
    st.max = clamp(parseInt(q.get('max')) || PRICE_MAX);
    return st;
  }
  function writeState(push) {
    const q = new URLSearchParams();
    if (state.q) q.set('q', state.q);
    for (const k in FACETS) state[k].forEach(v => q.append(k, v));
    if (state.min > PRICE_MIN) q.set('min', state.min);
    if (state.max < PRICE_MAX) q.set('max', state.max);
    if (state.sort !== 'featured') q.set('sort', state.sort);
    if (state.page > 1) q.set('page', state.page);
    const url = location.pathname + (q.toString() ? '?' + q : '') + location.hash;
    history[push ? 'pushState' : 'replaceState'](null, '', url);
  }
  const clamp = n => Math.min(PRICE_MAX, Math.max(PRICE_MIN, n));
  let state = readState();

  /* ---------- Filtering ---------- */
  function matches(p, skip) {
    if (state.q && !p.name.toLowerCase().includes(state.q.toLowerCase())) return false;
    if (skip !== 'price' && (p.price < state.min || p.price > state.max)) return false;
    for (const k in FACETS) {
      if (k === skip || !state[k].length) continue;
      const vals = FACETS[k].get(p);
      if (!state[k].some(v => vals.includes(v))) return false; // OR within a group, AND across groups
    }
    return true;
  }
  const SORTS = {
    featured: (a, b) => a.order - b.order,
    newest: (a, b) => b.created.localeCompare(a.created),
    'price-asc': (a, b) => a.price - b.price || a.order - b.order,
    'price-desc': (a, b) => b.price - a.price || a.order - b.order,
    az: (a, b) => a.name.localeCompare(b.name)
  };

  /* ---------- Facets ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function facetValues(k) {
    const f = FACETS[k];
    const vals = new Set(ALL.flatMap(f.get));
    (f.order || []).forEach(v => vals.add(v));
    let list = [...vals];
    if (f.order) list.sort((a, b) => f.order.indexOf(a) - f.order.indexOf(b));
    else if (f.sort) list.sort(f.sort);
    else list.sort((a, b) => ALL.filter(p => f.get(p).includes(b)).length - ALL.filter(p => f.get(p).includes(a)).length);
    return list;
  }
  function renderFacets() {
    for (const k in FACETS) {
      const box = $(`[data-facet="${k}"]`);
      if (!box) continue;
      const pool = ALL.filter(p => matches(p, k));
      box.innerHTML = facetValues(k).map((v, i) => {
        const n = pool.filter(p => FACETS[k].get(p).includes(v)).length;
        const on = state[k].includes(v);
        const id = `f-${k}-${i}`;
        if (k === 'light') {
          return `<label class="fchip" for="${id}"><input id="${id}" type="checkbox" name="${k}" value="${esc(v)}" ${on ? 'checked' : ''} ${!n && !on ? 'disabled' : ''}>
            <span><svg aria-hidden="true"><use href="#i-bulb"/></svg>${esc(v)} <em>(${n})</em></span></label>`;
        }
        return `<label class="fopt" for="${id}"><input id="${id}" type="checkbox" name="${k}" value="${esc(v)}" ${on ? 'checked' : ''} ${!n && !on ? 'disabled' : ''}>
          <span>${esc(v)} <em>(${n})</em></span></label>`;
      }).join('');
    }
    // price
    const lo = $('[data-price-min]'), hi = $('[data-price-max]');
    [lo, hi].forEach(r => { r.min = PRICE_MIN; r.max = PRICE_MAX; });
    lo.value = state.min; hi.value = state.max;
    paintPrice();
  }
  function paintPrice() {
    const lo = +$('[data-price-min]').value, hi = +$('[data-price-max]').value;
    const pct = v => ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
    const fill = $('[data-price-fill]');
    fill.style.left = pct(lo) + '%';
    fill.style.right = (100 - pct(hi)) + '%';
    $('[data-price-min-out]').textContent = CBP.inr(lo);
    $('[data-price-max-out]').textContent = CBP.inr(hi);
    $('[data-price-min]').setAttribute('aria-valuetext', CBP.inr(lo));
    $('[data-price-max]').setAttribute('aria-valuetext', CBP.inr(hi));
  }

  /* ---------- Cards ---------- */
  const img = (src, w) => `${src}&width=${w}`;
  function card(p, i) {
    const wished = CBP.isWished(p.id);
    const eager = i < 4 && state.page === 1;
    const sizes = p.size.length ? `<span>${p.size.length > 1 ? p.size.length + ' sizes' : p.size[0]}</span>` : '';
    const light = p.light.includes('With light') ? `<span class="m-light"><svg aria-hidden="true"><use href="#i-bulb"/></svg>Light option</span>` : '';
    return `<li class="ccard">
      <a class="ccard__media" href="../products/${p.id}.html" tabindex="-1" aria-hidden="true">
        ${p.isNew ? '<span class="ccard__badge">New</span>' : ''}
        <img src="${img(p.image, 400)}" srcset="${img(p.image, 300)} 300w, ${img(p.image, 400)} 400w, ${img(p.image, 600)} 600w"
             sizes="(min-width: 1200px) 230px, (min-width: 768px) 30vw, 46vw" width="400" height="448"
             ${eager ? '' : 'loading="lazy"'} alt="${esc(p.alt)}">
        ${p.image2 ? `<img class="alt" src="${img(p.image2, 400)}" width="400" height="448" loading="lazy" alt="" aria-hidden="true">` : ''}
      </a>
      <button class="ccard__wish" type="button" data-wish="${p.id}" aria-pressed="${wished}"
              aria-label="${wished ? 'Remove' : 'Add'} ${esc(p.name)} ${wished ? 'from' : 'to'} wishlist"><svg aria-hidden="true"><use href="#i-heart"/></svg></button>
      <div class="ccard__body">
        <h3 class="ccard__name"><a href="../products/${p.id}.html">${esc(p.name)}</a></h3>
        <p class="ccard__meta">${sizes}${light}</p>
        <div class="ccard__foot">
          <p class="ccard__price">${p.priceFrom ? '<small>From</small>' : ''}<span class="visually-hidden">Price </span>${CBP.inr(p.price)}</p>
          ${p.inStock
            ? `<button class="add-btn" type="button" data-add="${p.id}" aria-label="Add ${esc(p.name)} to cart"><svg aria-hidden="true"><use href="#i-cart"/></svg></button>`
            : '<span class="ccard__oos">Out of stock</span>'}
        </div>
      </div>
    </li>`;
  }

  /* ---------- Render ---------- */
  const grid = $('[data-grid]');
  function render({ scroll } = {}) {
    const list = ALL.filter(p => matches(p)).sort(SORTS[state.sort] || SORTS.featured);
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    state.page = Math.min(state.page, pages);
    const slice = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);

    grid.innerHTML = slice.map(card).join('');
    $('[data-empty]').hidden = list.length > 0;
    grid.hidden = list.length === 0;
    $('[data-count]').textContent = `${list.length} ${list.length === 1 ? 'Product' : 'Products'}${state.q ? ` for “${state.q}”` : ''}`;
    $$('[data-show-count]').forEach(b => { b.textContent = `Show ${list.length} ${list.length === 1 ? 'result' : 'results'}`; });
    $('[data-sort]').value = state.sort;
    renderFacets();
    renderChips();
    renderPager(pages);
    if (scroll) {
      const top = $('.results').getBoundingClientRect().top + scrollY - 100;
      if (scrollY > top) window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }

  function activeFilters() {
    const out = [];
    if (state.q) out.push({ k: 'q', v: state.q, label: `“${state.q}”` });
    for (const k in FACETS) state[k].forEach(v => out.push({ k, v, label: v }));
    if (state.min > PRICE_MIN || state.max < PRICE_MAX) out.push({ k: 'price', v: '', label: `${CBP.inr(state.min)} – ${CBP.inr(state.max)}` });
    return out;
  }
  function renderChips() {
    const act = activeFilters();
    const badge = $('[data-filter-badge]');
    badge.textContent = act.length; badge.hidden = !act.length;
    $('[data-chips]').innerHTML = act.map(f => `<li class="chip">${esc(f.label)}
      <button type="button" data-chip-k="${f.k}" data-chip-v="${esc(f.v)}" aria-label="Remove filter ${esc(f.label)}"><svg aria-hidden="true"><use href="#i-close"/></svg></button></li>`).join('')
      + (act.length > 1 ? '<li><button class="chip--clear" type="button" data-clear>Clear all</button></li>' : '');
  }
  function renderPager(pages) {
    const pager = $('[data-pager]');
    if (pages < 2) { pager.innerHTML = ''; return; }
    let html = `<button type="button" data-page="${state.page - 1}" aria-label="Previous page" ${state.page === 1 ? 'disabled' : ''}><svg aria-hidden="true"><use href="#i-arrow-left"/></svg></button>`;
    for (let i = 1; i <= pages; i++) {
      html += `<button type="button" data-page="${i}" ${i === state.page ? 'aria-current="page"' : ''} aria-label="Page ${i}">${i}</button>`;
    }
    html += `<button type="button" data-page="${state.page + 1}" aria-label="Next page" ${state.page === pages ? 'disabled' : ''}><svg aria-hidden="true"><use href="#i-chev-right"/></svg></button>`;
    pager.innerHTML = html;
  }

  /* ---------- Events ---------- */
  const form = $('[data-filter-form]');
  form.addEventListener('change', e => {
    const t = e.target;
    if (t.type !== 'checkbox') return;
    const k = t.name;
    state[k] = t.checked ? [...new Set([...state[k], t.value])] : state[k].filter(v => v !== t.value);
    state.page = 1;
    writeState(false);
    const id = t.id;
    render();
    const again = document.getElementById(id);
    again && again.focus();
  });

  const lo = $('[data-price-min]'), hi = $('[data-price-max]');
  [lo, hi].forEach(r => {
    r.addEventListener('input', () => {
      if (+lo.value > +hi.value - 50) (r === lo ? lo.value = +hi.value - 50 : hi.value = +lo.value + 50);
      paintPrice();
    });
    r.addEventListener('change', () => {
      state.min = clamp(+lo.value); state.max = clamp(+hi.value); state.page = 1;
      writeState(false);
      render();
      r.focus();
    });
  });

  $('[data-sort]').addEventListener('change', e => { state.sort = e.target.value; state.page = 1; writeState(false); render(); });

  document.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]');
    if (pg && !pg.disabled) { state.page = +pg.dataset.page; writeState(true); render({ scroll: true }); $('[data-pager] [aria-current]')?.focus(); return; }
    const chip = e.target.closest('[data-chip-k]');
    if (chip) {
      const { chipK: k, chipV: v } = chip.dataset;
      if (k === 'q') state.q = '';
      else if (k === 'price') { state.min = PRICE_MIN; state.max = PRICE_MAX; }
      else state[k] = state[k].filter(x => x !== v);
      state.page = 1; writeState(false); render();
      ($('[data-chips] button') || $('[data-sort]')).focus();
      return;
    }
    if (e.target.closest('[data-clear]')) {
      for (const k in FACETS) state[k] = [];
      state.q = ''; state.min = PRICE_MIN; state.max = PRICE_MAX; state.page = 1;
      writeState(false); render();
    }
  });

  window.addEventListener('popstate', () => { state = readState(); render(); });

  /* ---------- Mobile / tablet filter sheet ---------- */
  const filters = $('[data-filters]');
  const sheet = $('[data-filter-sheet]');
  const openBtn = $('[data-filter-open]');
  const sheetMode = matchMedia('(max-width: 1023px)');
  let backdrop = null;
  function syncSheetRole() {
    if (sheetMode.matches) { sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); }
    else { sheet.removeAttribute('role'); sheet.removeAttribute('aria-modal'); closeSheet(true); }
  }
  function openSheet() {
    filters.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('lock');
    backdrop = document.createElement('div');
    backdrop.className = 'filters__backdrop';
    backdrop.addEventListener('click', () => closeSheet());
    document.body.appendChild(backdrop);
    setTimeout(() => $('[data-filter-close]', sheet).focus(), 50);
  }
  function closeSheet(silent) {
    if (!filters.classList.contains('is-open')) return;
    filters.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('lock');
    backdrop && backdrop.remove(); backdrop = null;
    if (!silent) openBtn.focus();
  }
  openBtn.addEventListener('click', openSheet);
  $$('[data-filter-close]').forEach(b => b.addEventListener('click', () => closeSheet()));
  document.addEventListener('keydown', e => {
    if (!filters.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeSheet();
    if (e.key === 'Tab') {
      const f = $$('button:not([disabled]), input:not([disabled]), summary', sheet).filter(n => n.offsetParent);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  sheetMode.addEventListener('change', syncSheetRole);
  syncSheetRole();

  render();
})();

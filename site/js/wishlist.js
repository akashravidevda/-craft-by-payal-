(async () => {
  await window.CBP_READY;
  'use strict';

  const CBP = window.CBP;
  const grid = document.querySelector('[data-wish-grid]');
  const empty = document.querySelector('[data-wish-empty]');
  if (!CBP || !grid) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const img = (src, w) => window.CBP_IMAGE(src,w);

  function card(p) {
    return `<li class="ccard">
      <a class="ccard__media" href="${window.CBP_PRODUCT_URL(p)}" tabindex="-1" aria-hidden="true">
        <img src="${img(p.image, 400)}" width="400" height="448" loading="lazy" alt="${esc(p.alt || p.name)}">
      </a>
      <button class="ccard__wish" type="button" data-wish="${p.id}" aria-pressed="true" aria-label="Remove ${esc(p.name)} from wishlist"><svg aria-hidden="true"><use href="#i-heart"/></svg></button>
      <div class="ccard__body">
        <h3 class="ccard__name"><a href="${window.CBP_PRODUCT_URL(p)}">${esc(p.name)}</a></h3>
        <div class="ccard__foot">
          <p class="ccard__price">${p.priceFrom ? '<small>From</small>' : ''}<span class="visually-hidden">Price </span>${CBP.inr(p.price)}</p>
          <button class="add-btn" type="button" data-add="${p.id}" aria-label="Add ${esc(p.name)} to cart"><svg aria-hidden="true"><use href="#i-cart"/></svg></button>
        </div>
      </div>
    </li>`;
  }

  function render() {
    const items = CBP.wishlist().map(id => CBP.byId[id]).filter(Boolean);
    grid.innerHTML = items.map(card).join('');
    grid.hidden = !items.length;
    empty.hidden = !!items.length;
  }

  // main.js toggles the heart first; re-render afterwards so removed items disappear.
  grid.addEventListener('click', e => { if (e.target.closest('[data-wish]')) setTimeout(render, 0); });
  render();
})();

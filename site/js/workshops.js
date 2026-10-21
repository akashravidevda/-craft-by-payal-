// Workshop page: filter the workshop cards by format.
(() => {
  'use strict';
  const chips = [...document.querySelectorAll('[data-wfilter]')];
  const cards = [...document.querySelectorAll('[data-wgrid] .wcard')];
  if (!chips.length) return;
  chips.forEach(chip => chip.addEventListener('click', () => {
    const f = chip.dataset.wfilter;
    chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
    cards.forEach(card => { card.hidden = f !== 'all' && card.dataset.type !== f; });
  }));
})();

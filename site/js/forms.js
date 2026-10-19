// Contact and track-order forms: validate, then hand the message to WhatsApp (no server yet).
(() => {
  'use strict';

  const WA = 'https://wa.me/910000000000'; // TODO: Craft by Payal's real WhatsApp number (also in tools/shell.py)

  function wire(form, compose) {
    if (!form) return;
    const status = form.querySelector('[data-form-status]');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const bad = [...form.querySelectorAll('[required]')].filter(f => !f.value.trim());
      form.querySelectorAll('[aria-invalid]').forEach(f => f.removeAttribute('aria-invalid'));
      if (bad.length) {
        bad.forEach(f => f.setAttribute('aria-invalid', 'true'));
        status.textContent = 'Please fill in the highlighted fields.';
        status.classList.add('is-error');
        bad[0].focus();
        return;
      }
      status.classList.remove('is-error');
      const text = compose(new FormData(form));
      window.open(`${WA}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      status.textContent = 'WhatsApp opened with your message — just tap send.';
    });
  }

  wire(document.querySelector('[data-contact]'), f =>
    `Hi Craft by Payal! I'm ${f.get('name')} (${f.get('reach')}${f.get('phone') ? ', ' + f.get('phone') : ''}).\nTopic: ${f.get('topic')}\n\n${f.get('message')}`);

  wire(document.querySelector('[data-track]'), f =>
    `Hi Craft by Payal! Could I get an update on order ${f.get('order')}? My contact is ${f.get('phone')}.`);
})();

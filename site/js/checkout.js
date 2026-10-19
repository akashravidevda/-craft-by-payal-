// Cart page, checkout and order confirmation.
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const CBP = window.CBP;
  if (!CBP) return;
  const inr = CBP.inr;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const WA = 'https://wa.me/910000000000'; // TODO: Craft by Payal's real WhatsApp number (also in tools/shell.py)
  const session = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
  };

  /* ================= Payment adapter =================
     mode 'demo'  → shows a clearly-labelled simulator (no money taken).
     To go live with Razorpay:
       1. Create the order on your server (Razorpay Orders API) and return its id.
       2. Load https://checkout.razorpay.com/v1/checkout.js and replace start() with:
            new Razorpay({ key: 'rzp_live_…', amount: order.total * 100, currency: 'INR', order_id,
                           name: 'Craft by Payal', prefill: { email, contact },
                           handler: res => resolve({ ok: true, ref: res.razorpay_payment_id }),
                           modal: { ondismiss: () => resolve({ ok: false }) } }).open();
       3. Verify the payment signature on your server before marking the order paid. */
  const PAYMENT = {
    mode: 'demo',
    start(order) {
      return new Promise(resolve => {
        const box = $('[data-paydemo]');
        $('[data-pd-amount]', box).textContent = inr(order.total);
        box.hidden = false;
        document.body.classList.add('lock');
        $('[data-pd-ok]', box).focus();
        const done = ok => {
          box.hidden = true;
          document.body.classList.remove('lock');
          $('[data-pd-ok]', box).onclick = $('[data-pd-cancel]', box).onclick = null;
          resolve(ok ? { ok: true, ref: 'DEMO-' + Date.now().toString(36).toUpperCase() } : { ok: false });
        };
        $('[data-pd-ok]', box).onclick = () => done(true);
        $('[data-pd-cancel]', box).onclick = () => done(false);
        box.onkeydown = e => { if (e.key === 'Escape') done(false); };
      });
    }
  };

  /* ================= Order summary ================= */
  function renderSummary(lines, totals) {
    const list = $('[data-sum-items]');
    if (!list) return;
    list.innerHTML = lines.map(l => `<li class="osum__item">
        <span class="osum__img"><img src="${l.image}&width=120" alt="" width="56" height="56"><b>${l.qty}</b></span>
        <span class="osum__name">${esc(l.name)}${l.variant ? `<small>${esc(l.variant)}</small>` : ''}${l.note ? `<small class="osum__note">${esc(l.note)}</small>` : ''}</span>
        <span class="osum__price">${inr(l.qty * l.price)}</span>
      </li>`).join('');
    $('[data-sum-subtotal]').textContent = inr(totals.subtotal);
    $('[data-sum-shipping]').textContent = totals.shipping ? inr(totals.shipping) : 'Free';
    $('[data-sum-total]').textContent = inr(totals.total);
    const hint = $('[data-sum-hint]');
    if (hint) hint.textContent = totals.subtotal && totals.subtotal < CBP.FREE_SHIP
      ? `Add ${inr(CBP.FREE_SHIP - totals.subtotal)} more for free shipping.` : '';
  }
  const liveLines = () => CBP.cartLines().map(l => ({ key: l.key, id: l.id, name: l.p.name, image: l.p.image, variant: l.variant, note: l.note, qty: l.qty, price: l.price }));

  /* ================= Cart page ================= */
  const cartPage = $('[data-cart-page]');
  if (cartPage) {
    const renderCartPage = () => {
      const lines = liveLines();
      $('[data-cart-lines]').innerHTML = lines.map(l => `<li class="v2line">
          <a class="v2line__img" href="products/${l.id}.html"><img src="${l.image}&width=400" alt="${esc(l.name)}" width="260" height="260"></a>
          <div class="v2line__body">
            <div class="v2line__top">
              <div>
                <h2 class="v2line__name"><a href="products/${l.id}.html">${esc(l.name)}</a></h2>
                <p class="v2line__price">${inr(l.price)}</p>
                ${l.variant ? l.variant.split(' · ').map(v => `<p class="v2line__meta">${/in$/.test(v) ? 'Size' : 'Style'}: ${esc(v)}</p>`).join('') : '<p class="v2line__meta">Size &amp; style: confirmed on WhatsApp</p>'}
                ${l.note ? `<p class="v2line__meta v2line__note">${esc(l.note)}</p>` : ''}
              </div>
            </div>
            <div class="v2line__bottom">
              <div class="v2line__qty"><span class="v2line__label">Quantity</span>
                <div class="qty" role="group" aria-label="Quantity for ${esc(l.name)}">
                  <button type="button" data-line-qty="${l.key}" data-d="-1" aria-label="Decrease quantity">−</button>
                  <span aria-live="polite">${l.qty}</span>
                  <button type="button" data-line-qty="${l.key}" data-d="1" aria-label="Increase quantity">+</button>
                </div>
              </div>
              <button class="cline__remove" type="button" data-line-remove="${l.key}" aria-label="Remove ${esc(l.name)}"><svg aria-hidden="true"><use href="#i-trash"/></svg><span>Remove</span></button>
              <p class="v2line__total">${inr(l.qty * l.price)}</p>
            </div>
          </div>
        </li>`).join('');
      const countEl = $('[data-cart-count-text]');
      if (countEl) { const n = lines.reduce((t, l) => t + l.qty, 0); countEl.textContent = `${n} ${n === 1 ? 'item' : 'items'}`; }
      const empty = !lines.length;
      $('[data-cart-page-empty]').hidden = !empty;
      $('[data-cart-lines]').hidden = empty;
      $('.osum').hidden = empty;
      renderSummary(lines, CBP.totals());
    };
    cartPage.addEventListener('click', e => {
      const q = e.target.closest('[data-line-qty]');
      if (q) {
        const l = CBP.cartLines().find(x => x.key === q.dataset.lineQty);
        CBP.setQty(l.key, l.qty + +q.dataset.d);
        $(`[data-line-qty="${l.key}"][data-d="${q.dataset.d}"]`)?.focus();
      }
      const r = e.target.closest('[data-line-remove]');
      if (r) { CBP.setQty(r.dataset.lineRemove, 0); CBP.toast('Removed from cart'); $('[data-to-checkout], .co__back')?.focus(); }
    });
    CBP.onCartChange(() => setTimeout(renderCartPage, 0));
    renderCartPage();
  }

  /* ================= Checkout ================= */
  const form = $('[data-checkout]');
  if (form) {
    const refresh = () => {
      const lines = liveLines();
      const empty = !lines.length;
      form.hidden = empty;
      $('[data-co-empty]').hidden = !empty;
      renderSummary(lines, CBP.totals());
    };
    CBP.onCartChange(() => setTimeout(refresh, 0));
    refresh();

    // restore an in-progress draft (this tab only)
    const draft = session.get('cbp-checkout-draft') || {};
    for (const [k, v] of Object.entries(draft)) {
      const f = form.elements[k];
      if (!f) continue;
      if (f.type === 'checkbox') f.checked = !!v;
      else if (f instanceof RadioNodeList) f.value = v;
      else f.value = v;
    }
    form.addEventListener('input', () => {
      const d = Object.fromEntries(new FormData(form));
      d.hidePrice = form.elements.hidePrice.checked;
      session.set('cbp-checkout-draft', d);
    });

    const digits = v => v.replace(/\D/g, '');
    const rules = {
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      phone: v => /^[6-9]\d{9}$/.test(digits(v).replace(/^(91|0)(?=\d{10}$)/, '')),
      pin: v => /^[1-9]\d{5}$/.test(v.trim())
    };
    function setError(field, msg) {
      const wrap = field.closest('.field');
      let m = wrap.querySelector('.field__err');
      if (msg) {
        field.setAttribute('aria-invalid', 'true');
        if (!m) { m = document.createElement('span'); m.className = 'field__err'; m.id = `err-${field.name}`; wrap.appendChild(m); }
        m.textContent = msg;
        field.setAttribute('aria-describedby', m.id);
      } else {
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
        m && m.remove();
      }
    }
    function validate() {
      const errs = [];
      $$('[required]', form).forEach(f => {
        const v = f.value || '';
        const ok = v.trim() && (!rules[f.name] || rules[f.name](v));
        setError(f, ok ? '' : f.dataset.msg);
        if (!ok) errs.push(f);
      });
      return errs;
    }
    // re-check a field once the user leaves it (after a first submit attempt)
    let tried = false;
    form.addEventListener('focusout', e => { if (tried && e.target.matches('[required]')) validate(); });
    form.elements.pin.addEventListener('input', e => { e.target.value = digits(e.target.value).slice(0, 6); });

    function makeOrder() {
      const f = Object.fromEntries(new FormData(form));
      const lines = liveLines();
      const t = CBP.totals();
      const d = new Date();
      const id = `CBP${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        id, placedAt: d.toISOString(), payment: f.payment, status: 'placed',
        customer: { name: f.name.trim(), email: f.email.trim(), phone: digits(f.phone).slice(-10) },
        address: { line1: f.address1.trim(), line2: (f.address2 || '').trim(), city: f.city.trim(), state: f.state, pin: f.pin.trim() },
        gift: { needBy: f.needBy || '', occasion: f.occasion || '', message: (f.giftMsg || '').trim(), hidePrice: !!form.elements.hidePrice.checked },
        lines, ...t
      };
    }
    function finish(order) {
      session.set('cbp-last-order', order);
      sessionStorage.removeItem('cbp-checkout-draft');
      CBP.clearCart();
      location.href = 'order-confirmation.html';
    }

    const placeBtn = $('[data-place-order]');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      tried = true;
      const errs = validate();
      const box = $('[data-co-errors]');
      if (errs.length) {
        box.hidden = false;
        box.innerHTML = `<strong>Please check ${errs.length === 1 ? 'one field' : errs.length + ' fields'}:</strong><ul>${errs.map(f => `<li><a href="#" data-goto="${f.name}">${esc(f.dataset.msg)}</a></li>`).join('')}</ul>`;
        box.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        errs[0].focus({ preventScroll: true });
        return;
      }
      box.hidden = true;
      const order = makeOrder();
      if (order.payment === 'whatsapp') { finish(order); return; }
      placeBtn.disabled = true;
      placeBtn.firstChild.textContent = 'Opening secure payment… ';
      const res = await PAYMENT.start(order);
      placeBtn.disabled = false;
      placeBtn.firstChild.textContent = 'Place order ';
      if (res.ok) { order.status = 'paid'; order.paymentRef = res.ref; order.demo = PAYMENT.mode === 'demo'; finish(order); }
      else CBP.toast('Payment cancelled — your cart is saved.');
    });
    $('[data-co-errors]').addEventListener('click', e => {
      const a = e.target.closest('[data-goto]');
      if (a) { e.preventDefault(); form.elements[a.dataset.goto].focus(); }
    });
  }

  /* ================= Confirmation ================= */
  const done = $('[data-done]');
  if (done) {
    const o = session.get('cbp-last-order');
    if (!o) { $('[data-done-missing]').hidden = false; return; }
    done.hidden = false;
    const first = o.customer.name.split(' ')[0];
    $('[data-done-name]').textContent = first;
    $('[data-done-id]').textContent = o.id;
    const itemsText = o.lines.map(l => `• ${l.qty} × ${l.name}${l.variant ? ` (${l.variant})` : ''}${l.note ? ` — ${l.note}` : ''}`).join('\n');
    // TODO (go-live): orders must also be saved server-side (e.g. Shopify / your backend) and a confirmation email sent.
    // Until then the WhatsApp message is how the order details reach the studio, so it always carries the full order.
    const a0 = o.address;
    const details = [
      itemsText, '',
      `Total: ${inr(o.total)}${o.payment === 'online' ? (o.demo ? ' (test payment)' : ` — paid, ref ${o.paymentRef}`) : ''}`,
      `Deliver to: ${o.customer.name}, ${a0.line1}${a0.line2 ? ', ' + a0.line2 : ''}, ${a0.city}, ${a0.state} ${a0.pin}`,
      `Phone: ${o.customer.phone} · Email: ${o.customer.email}`,
      o.gift.needBy ? `Needed by: ${o.gift.needBy}` : '',
      o.gift.occasion ? `Occasion: ${o.gift.occasion}` : '',
      o.gift.message ? `Gift message: ${o.gift.message}` : '',
      o.gift.hidePrice ? 'Gift — please leave prices out of the parcel.' : ''
    ].filter((x, i) => x || i === 1).join('\n');
    const waOrder = `Hi Craft by Payal! I'd like to confirm my order ${o.id}.\n\n${details}\n\nI'll share my photos here.`;
    const waPhotos = `Hi Craft by Payal! I've placed order ${o.id}.\n\n${details}\n\nSharing my photos here.`;
    if (o.payment === 'whatsapp') {
      $('[data-done-eyebrow]').textContent = 'One last step';
      $('[data-done-lede]').textContent = 'Send your order to us on WhatsApp to confirm it. We\'ll reply with a design preview, then you can pay by UPI.';
      $('[data-done-actions]').innerHTML = `<a class="btn btn--coral" href="${WA}?text=${encodeURIComponent(waOrder)}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-whatsapp"/></svg> Send order on WhatsApp</a>
        <a class="btn-outline" href="collections/miniature-frame.html">Continue shopping</a>`;
    } else {
      $('[data-done-eyebrow]').textContent = o.demo ? 'Order placed · demo payment' : 'Payment received';
      $('[data-done-lede]').textContent = `We've received your order${o.demo ? ' (test payment — no money was taken)' : ''}. Next, send us your photos on WhatsApp so we can start your design preview.`;
      $('[data-done-actions]').innerHTML = `<a class="btn btn--coral" href="${WA}?text=${encodeURIComponent(waPhotos)}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-whatsapp"/></svg> Share photos on WhatsApp</a>
        <a class="btn-outline" href="collections/miniature-frame.html">Continue shopping</a>`;
    }
    const a = o.address;
    $('[data-done-addr]').innerHTML = `<strong>${esc(o.customer.name)}</strong><br>${esc(a.line1)}${a.line2 ? '<br>' + esc(a.line2) : ''}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.pin)}<br>${esc(o.customer.phone)} · ${esc(o.customer.email)}`
      + (o.gift.message ? `<p class="done__gift"><svg aria-hidden="true"><use href="#i-gift"/></svg> Gift message: “${esc(o.gift.message)}”</p>` : '');
    renderSummary(o.lines, o);
    document.title = `Order ${o.id} confirmed | Craft by Payal`;
  }
})();

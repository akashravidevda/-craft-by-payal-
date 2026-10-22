"""Cart, checkout and order-confirmation pages (imported by build_pages.py)."""
from shell import page
import html

E = html.escape

STATES = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
          "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
          "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
          "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
          "Uttar Pradesh", "Uttarakhand", "West Bengal"]

CSS = ("collection.css", "pages.css", "checkout.css")


DECOR = ('<svg class="co__leaf co__leaf--tr" aria-hidden="true"><use href="#botanical"/></svg>'
         '<svg class="co__leaf co__leaf--bl" aria-hidden="true"><use href="#botanical"/></svg>')


def steps(active):
    names = ["Cart", "Details", "Payment", "Confirmation"]
    out = []
    for i, n in enumerate(names):
        state = "done" if i < active else ("current" if i == active else "")
        cur = ' aria-current="step"' if i == active else ""
        mark = "✓" if i < active else str(i + 1)
        out.append(f'<li class="steps__item {state}"{cur}><span aria-hidden="true">{mark}</span>{n}</li>')
    return f'<ol class="steps" aria-label="Checkout progress">{"".join(out)}</ol>'


def summary_box(title="Order summary", cta=""):
    return f'''<aside class="osum" aria-labelledby="osum-title">
          <h2 id="osum-title" class="osum__title">{title}</h2>
          <ul class="osum__items" role="list" data-sum-items></ul>
          <dl class="osum__totals">
            <div><dt>Subtotal</dt><dd data-sum-subtotal>₹0</dd></div>
            <div><dt>Shipping</dt><dd data-sum-shipping>₹0</dd></div>
            <div class="osum__grand"><dt>Total</dt><dd data-sum-total>₹0</dd></div>
          </dl>
          <p class="osum__ship" data-sum-hint></p>
          {cta}
          <ul class="osum__trust" role="list">
            <li><svg aria-hidden="true"><use href="#i-shield"/></svg>Payment verified by the studio</li>
            <li><svg aria-hidden="true"><use href="#i-whatsapp"/></svg>Design preview before we build</li>
          </ul>
        </aside>'''


def checkout_page(crumbs):
    states = "".join(f"<option>{E(x)}</option>" for x in STATES)
    body = f'''{crumbs(("Home", "{P}index.html"), ("Cart", "{P}cart.html"), ("Checkout", ""))}
    <section class="co">
      {DECOR}
      <div class="container">
        {steps(1)}
        <h1 class="co__title">Checkout</h1>
        <p class="co__sub">Almost there! Share a few details to complete your order.</p>
        <div class="empty" data-co-empty hidden>
          <p class="script">Your cart is empty…</p>
          <a class="btn btn--coral" href="{{P}}collections/miniature-frame.html">Explore frames <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
        </div>
        <form class="co__grid" data-checkout novalidate>
          <div class="co__main">
            <div class="co__errors" role="alert" data-co-errors hidden></div>

            <fieldset class="co-card">
              <legend><span class="co-card__n">1</span>Contact</legend>
              <div class="field-row">
                <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" required data-msg="Enter a valid email address"></label>
                <label class="field"><span>Mobile (WhatsApp)</span><input name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="10-digit mobile" required data-msg="Enter a 10-digit Indian mobile number"></label>
              </div>
              <p class="hint hint--wa"><svg aria-hidden="true"><use href="#i-whatsapp"/></svg>We'll send your design preview and order updates on WhatsApp.</p>
            </fieldset>

            <fieldset class="co-card">
              <legend><span class="co-card__n">2</span>Delivery address</legend>
              <label class="field"><span>Full name</span><input name="name" type="text" autocomplete="name" required data-msg="Enter the recipient's name"></label>
              <label class="field"><span>Address</span><input name="address1" type="text" autocomplete="address-line1" placeholder="House no., building, street" required data-msg="Enter the delivery address"></label>
              <label class="field"><span>Area, landmark <em>(optional)</em></span><input name="address2" type="text" autocomplete="address-line2"></label>
              <div class="field-row field-row--3">
                <label class="field"><span>City</span><input name="city" type="text" autocomplete="address-level2" required data-msg="Enter the city"></label>
                <label class="field"><span>State</span><select name="state" autocomplete="address-level1" required data-msg="Choose a state"><option value="">Select</option>{states}</select></label>
                <label class="field"><span>PIN code</span><input name="pin" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="6" required data-msg="Enter a 6-digit PIN code"></label>
              </div>
            </fieldset>

            <fieldset class="co-card">
              <legend><span class="co-card__n">3</span>Gift &amp; occasion <em>(optional)</em></legend>
              <div class="field-row">
                <label class="field"><span>Need it by</span><input name="needBy" type="date"></label>
                <label class="field"><span>Occasion</span><select name="occasion"><option value="">Choose</option><option>Birthday</option><option>Anniversary</option><option>Wedding / Engagement</option><option>House warming</option><option>Baby shower / New baby</option><option>Festival</option><option>Other</option></select></label>
              </div>
              <div class="gift-row">
                <label class="field"><span>Gift message</span><textarea name="giftMsg" rows="2" maxlength="200" placeholder="We'll handwrite this on a card"></textarea></label>
                <span class="gift-row__art" aria-hidden="true"><svg><use href="#gift-art"/></svg></span>
              </div>
              <label class="check"><input type="checkbox" name="hidePrice"><span>This is a gift — don't include prices in the parcel</span></label>
            </fieldset>

            <fieldset class="co-card">
              <legend><span class="co-card__n">4</span>Payment</legend>

              <label class="paym">
                <input type="radio" name="payment" value="whatsapp">
                <span class="paym__body"><strong>Confirm on WhatsApp, pay by UPI</strong><span>Send your order to us on WhatsApp and pay by UPI once you've approved the design preview.</span></span>
              </label>
              <p class="field-hint field-hint--info"><svg aria-hidden="true"><use href="#i-info"/></svg>The studio confirms your order and verifies payment before production.</p>
            </fieldset>

            <p class="co__legal">By placing this order you agree to our <a href="{{P}}terms.html">Terms</a>, <a href="{{P}}shipping-policy.html">Shipping Policy</a> and <a href="{{P}}refund-policy.html">Returns &amp; Refunds</a>. Personalised items can't be returned.</p>
          </div>
          {summary_box(cta='<button class="btn btn--coral btn--block" type="submit" data-place-order>Place order <svg aria-hidden="true"><use href="#i-arrow"/></svg></button><a class="co__edit" href="{P}cart.html">Edit cart</a>')}
        </form>
      </div>
    </section>

'''
    page("checkout.html", title="Checkout | Craft by Payal", description="Complete your Craft by Payal order.",
         body=body, css=CSS, scripts=("config.js", "checkout.js"), body_class="page-info page-checkout", whatsapp=False)


def confirmation_page():
    body = f'''    <section class="co co--done">
      {DECOR}
      <div class="container">
        {steps(3)}
        <div class="done" data-done hidden>
          <div class="done__head">
            <svg class="done__art" aria-hidden="true"><use href="#wreath-check"/></svg>
            <svg class="done__corner done__corner--l" aria-hidden="true"><use href="#botanical"/></svg>
            <svg class="done__corner done__corner--r" aria-hidden="true"><use href="#botanical"/></svg>
            <svg class="done__flower" aria-hidden="true"><use href="#doodle-flower"/></svg>
            <p class="c-eyebrow" data-done-eyebrow>Order placed</p>
            <h1 class="co__title">Thank you, <span data-done-name></span>!</h1>
            <p class="done__lede" data-done-lede></p>
            <p class="done__id">Order number <strong data-done-id></strong></p>
            <div class="cta-band__btns done__btns" data-done-actions></div>
          </div>
          <div class="co__grid">
            <div class="co__main">
              <div class="co-card">
                <div class="co-card__top"><h2 class="co-card__h">What happens next</h2><p class="co-card__script" aria-hidden="true">Your gift journey with us <svg><use href="#doodle-heart"/></svg></p></div>
                <ol class="track-steps journey" role="list">
                  <li><svg aria-hidden="true"><use href="#i-check"/></svg><strong>Order placed</strong><span>We'll message you on WhatsApp.</span></li>
                  <li><svg aria-hidden="true"><use href="#i-whatsapp"/></svg><strong>Share photos</strong><span>Send us your photos and ideas.</span></li>
                  <li><svg aria-hidden="true"><use href="#i-pencil"/></svg><strong>Design preview</strong><span>You approve the design.</span></li>
                  <li><svg aria-hidden="true"><use href="#i-truck"/></svg><strong>Handcraft &amp; ship</strong><span>Tracking link sent to you.</span></li>
                </ol>
              </div>
              <div class="co-card co-card--addr">
                <h2 class="co-card__h"><svg class="co-card__pin" aria-hidden="true"><use href="#i-location"/></svg>Delivering to</h2>
                <address class="done__addr" data-done-addr></address>
                <svg class="done__house" aria-hidden="true"><use href="#house-art"/></svg>
              </div>
            </div>
            {summary_box("Your order")}
          </div>
        </div>
        <div class="empty" data-done-missing hidden>
          <h1 class="co__title">No recent order</h1>
          <p>If you've just ordered, check WhatsApp for our message — or track your order.</p>
          <a class="btn btn--coral" href="{{P}}track-order.html">Track an order <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
        </div>
      </div>
    </section>'''
    page("order-confirmation.html", title="Order Confirmed | Craft by Payal", description="Your Craft by Payal order confirmation.",
         body=body, css=CSS, scripts=("config.js", "checkout.js"), body_class="page-info page-checkout")


def build(crumbs):
    # the cart page now comes from v2_pages.py (rebuilt from the upgraded source cart)
    checkout_page(crumbs)
    confirmation_page()

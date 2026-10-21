"""Pages rebuilt from the Codex "next level" upgrades of the SOURCE site's pages
(design/source-*/upgraded.png + spec.json): product, cart, about, contact, FAQs, track order, policies.

Called from build_pages.py with that module as `B` (for page(), crumbs(), card(), inr(), img(), DATA, …).
Only layout/structure comes from the source concepts — all copy is Craft by Payal's own, and claims we
can't back up (ratings, sales counts, discounts, turnaround promises) are deliberately left out.
"""
import json

B = None  # set by build()


def E(s):
    return B.E(s)


# ------------------------------------------------------------------ shared bits
def help_band(title="Still need help?", text="For any questions, write to us or chat on WhatsApp — we're happy to help."):
    return f'''    <section class="v2-help">
      <div class="container"><div class="v2-help__inner">
        <div class="v2-help__mail">
          <svg class="v2-help__ic" aria-hidden="true"><use href="#i-mail"/></svg>
          <div><h2 class="v2-help__title">{title}</h2><p>{text}</p>
            <a class="v2-help__link" href="mailto:{B.EMAIL}"><svg aria-hidden="true"><use href="#i-mail"/></svg>{B.EMAIL}</a></div>
        </div>
        <div class="v2-help__chat">
          <span class="v2-help__wa" aria-hidden="true"><svg><use href="#i-whatsapp"/></svg></span>
          <div><p class="v2-help__title">Prefer to chat?</p><p>We reply fastest on WhatsApp.</p></div>
          <a class="btn btn--coral" href="{B.WA}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-whatsapp"/></svg> Chat on WhatsApp</a>
        </div>
      </div></div>
    </section>'''


# ------------------------------------------------------------------ product page
def product_page(p):
    kind = "miniature wall" if "wall" in p["name"].lower() else "miniature frame"
    images = p["images"] or [p["image"]]
    img = B.img
    slides = "\n".join(
        f'''            <li class="gal__slide"><img src="{img(src, 900)}" srcset="{img(src, 600)} 600w, {img(src, 900)} 900w, {img(src, 1300)} 1300w"
                 sizes="(min-width: 900px) 52vw, 100vw" width="900" height="840" {'fetchpriority="high"' if i == 0 else 'loading="lazy"'}
                 alt="{E(p["name"])} — photo {i + 1} of {len(images)}"></li>''' for i, src in enumerate(images))
    thumbs = "\n".join(
        f'''            <li><button class="gal__thumb" type="button" data-thumb="{i}" aria-label="Show photo {i + 1}" {'aria-current="true"' if i == 0 else ''}><img src="{img(src, 200)}" width="100" height="84" loading="lazy" alt=""></button></li>'''
        for i, src in enumerate(images)) if len(images) > 1 else ""
    phrases = {"Anniversary": "anniversaries", "Wedding & Engagement": "weddings and engagements", "Birthday": "birthdays",
               "Valentine's": "Valentine's Day", "Baby & Kids": "new arrivals and little ones",
               "Mother's & Father's Day": "Mother's and Father's Day", "Festive": "festive gifting", "House Warming": "house warmings"}
    occ_list = [phrases.get(o, o.lower()) for o in p["occasion"][:3]] or ["birthdays", "anniversaries", "every special day"]
    occ = occ_list[0] if len(occ_list) == 1 else ", ".join(occ_list[:-1]) + " and " + occ_list[-1]
    sizes_txt = (", ".join(p["size"][:-1]) + " and " + p["size"][-1]) if len(p["size"]) > 1 else (p["size"][0] if p["size"] else "")
    story_img = images[1] if len(images) > 1 else images[0]
    rel = "\n          ".join(rel_card(q) for q in B.related(p))
    first_occ = p["occasion"][0] if p["occasion"] else None
    data = {"id": p["id"], "name": p["name"], "variants": p["variants"]}

    acc = [
        ("i-box", "Product details", f"<p>A handmade {E(kind)} built around your memories — tiny furniture, shelves and photos arranged into a little world that's all yours. Perfect for {E(occ)}.</p>"),
        ("i-frame", "Dimensions", f"<p>{('Available in ' + E(sizes_txt) + '. ') if sizes_txt else ''}Choose your size above — not sure which? Ask us on WhatsApp and we'll suggest one for your photos.</p>"),
        ("i-pencil", "How personalisation works", '''<ol class="steps-mini"><li><strong>Order</strong> — pick your size and lighting, add names or notes.</li>
              <li><strong>Share</strong> — send your photos and ideas on WhatsApp.</li><li><strong>Preview</strong> — we share a design preview for your approval.</li>
              <li><strong>Handcraft &amp; ship</strong> — we build it by hand and pack it safely.</li></ol>'''),
        ("i-truck", "Shipping & returns", '<p>Every piece is made to order — we confirm your dispatch date on WhatsApp once your design is approved. Personalised frames can\'t be returned unless they arrive damaged. See our <a href="{P}shipping-policy.html">Shipping Policy</a> and <a href="{P}refund-policy.html">Returns &amp; Refunds</a>.</p>'),
        ("i-heart", "Care", "<p>Keep away from direct sunlight and moisture, and dust gently with a soft dry brush. Switch lights off when not in use.</p>"),
    ]
    acc_html = "\n".join(f'''            <details{" open" if i == 0 else ""}><summary><svg aria-hidden="true"><use href="#{ic}"/></svg>{E(t)}</summary><div class="v2acc__body">{b}</div></details>'''
                         for i, (ic, t, b) in enumerate(acc))

    body = f'''{B.crumbs(("Home", "{P}index.html"), ("Miniature Frame", "{P}collections/miniature-frame.html"), (p["name"], ""))}

    <section class="v2pdp" aria-labelledby="pdp-title">
      <div class="container v2pdp__grid">
        <div class="v2pdp__left">
          <div class="gal" data-gallery>
            <div class="gal__stage">
              {'<span class="ccard__badge gal__badge">New</span>' if p["isNew"] else ''}
              <ul class="gal__track" role="list" data-track tabindex="0" aria-label="Product photos">
{slides}
              </ul>
              {('<span class="gal__count" aria-hidden="true"><span data-gal-count>1</span> / ' + str(len(images)) + '</span>') if len(images) > 1 else ''}
              {'<button class="round-btn gal__nav gal__nav--prev" type="button" aria-label="Previous photo" data-gal-prev><svg aria-hidden="true"><use href="#i-arrow-left"/></svg></button><button class="round-btn gal__nav gal__nav--next" type="button" aria-label="Next photo" data-gal-next><svg aria-hidden="true"><use href="#i-arrow"/></svg></button>' if len(images) > 1 else ''}
            </div>
            {f'<ul class="gal__thumbs" role="list">{thumbs}</ul>' if thumbs else ''}
          </div>

          <aside class="v2story" aria-labelledby="story-title">
            <div class="v2story__copy">
              <h2 id="story-title" class="v2story__title">The story behind your miniature</h2>
              <p>Every frame tells a story — your people, your places and your happiest moments, crafted by hand with love. More than a gift, it's a way to relive what matters most, every day.</p>
              <a class="btn btn--coral btn--sm" href="{{P}}about.html">A gift that stays forever <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
            </div>
            <figure class="v2story__img"><img src="{img(story_img, 500)}" width="500" height="500" loading="lazy" alt="">
              <figcaption aria-hidden="true">Handcrafted with love</figcaption></figure>
          </aside>
        </div>

        <div class="v2pdp__info">
          {'<p class="v2pdp__tag">New design</p>' if p["isNew"] else '<p class="v2pdp__tag v2pdp__tag--soft">Handmade ' + E(kind) + '</p>'}
          <h1 id="pdp-title" class="v2pdp__title">{E(p["name"])}</h1>
          <p class="v2pdp__price"><span data-price>{B.inr(p["price"])}</span></p>
          <p class="v2pdp__note"><a href="{{P}}shipping-policy.html">Free shipping</a> on orders above ₹999 · Made to order</p>

          <form class="pdp__form v2pdp__form" data-pdp-form novalidate>
            <fieldset class="opt" data-opt="size" hidden><legend>Size</legend><div class="opt__list"></div></fieldset>
            <fieldset class="opt" data-opt="light" hidden><legend>Style</legend><div class="opt__list"></div></fieldset>

            <div class="v2pdp__fields">
              <label class="field"><span>Text <em>(names, a date or a short quote)</em></span>
                <input type="text" name="names" maxlength="80" placeholder="e.g. Riya &amp; Arjun · 14 Dec 2026" autocomplete="off"></label>
              <label class="field"><span>Special date <em>(optional)</em></span><input type="date" name="date"></label>
              <label class="field"><span>Message or details <em>(optional)</em></span>
                <textarea name="message" rows="2" maxlength="200" placeholder="Themes, colours, hobbies to include…"></textarea></label>
              <p class="perso__photos"><svg aria-hidden="true"><use href="#i-whatsapp"/></svg> <span>Photos: after you order, share them with us on <a href="{B.WA}" target="_blank" rel="noopener">WhatsApp</a> — we'll send a design preview before we build.</span></p>
            </div>

            <div class="v2pdp__buy">
              <div class="qty qty--lg" role="group" aria-label="Quantity">
                <button type="button" data-q="-1" aria-label="Decrease quantity">−</button>
                <span aria-live="polite" data-qty-out>1</span>
                <button type="button" data-q="1" aria-label="Increase quantity">+</button>
              </div>
              <button class="btn-outline v2pdp__add" type="submit" data-pdp-add {'disabled' if not p["inStock"] else ''}>{'Add to cart' if p["inStock"] else 'Out of stock'} </button>
              <button class="pdp__wish" type="button" data-wish="{p["id"]}" aria-pressed="false" aria-label="Add {E(p["name"])} to wishlist"><svg aria-hidden="true"><use href="#i-heart"/></svg></button>
            </div>
            <button class="btn btn--coral btn--block v2pdp__buynow" type="button" data-buy-now {'disabled' if not p["inStock"] else ''}>Buy it now <svg aria-hidden="true"><use href="#i-arrow"/></svg></button>
            <p class="pdp__status" role="status" aria-live="polite" data-pdp-status></p>
          </form>

          <ul class="v2trust" role="list">
            <li><svg aria-hidden="true"><use href="#i-heart-lg"/></svg><span>Handmade<br>with love</span></li>
            <li><svg aria-hidden="true"><use href="#i-whatsapp"/></svg><span>Design preview<br>on WhatsApp</span></li>
            <li><svg aria-hidden="true"><use href="#i-shield"/></svg><span>Secure<br>checkout</span></li>
          </ul>

          <div class="v2acc">
{acc_html}
          </div>
        </div>
      </div>
    </section>

    <section class="v2rel" aria-labelledby="rel-title">
      <div class="container">
        <div class="v2rel__head">
          <h2 id="rel-title" class="h2">You may also like</h2>
          <a class="v2rel__all" href="{{P}}collections/miniature-frame.html{('?occasion=' + first_occ.replace(' ', '+').replace('&', '%26')) if first_occ else ''}">View all <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
        </div>
        <ul class="v2rel__grid" role="list">
          {rel}
        </ul>
      </div>
    </section>
    <script>window.CBP_PRODUCT = {json.dumps(data, ensure_ascii=False)};</script>'''
    ld = {"@context": "https://schema.org", "@type": "Product", "name": p["name"], "image": images[:4],
          "brand": {"@type": "Brand", "name": "Craft by Payal"},
          "offers": {"@type": "AggregateOffer", "priceCurrency": "INR", "lowPrice": min(v["price"] for v in p["variants"]),
                     "highPrice": max(v["price"] for v in p["variants"]),
                     "availability": "https://schema.org/InStock" if p["inStock"] else "https://schema.org/OutOfStock"}}
    B.page(f"products/{p['id']}.html",
           title=f"{E(p['name'])} | Personalised Handmade Gift | Craft by Payal",
           description=f"Handmade, personalised {E(kind)} from Craft by Payal{(' — available in ' + E(sizes_txt)) if sizes_txt else ''}.",
           body=body, css=("collection.css", "pages.css", "v2.css"), scripts=("product.js",), body_class="page-product",
           head_extra=f'  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n',
           preload=f'  <link rel="preload" as="image" href="{img(images[0], 900)}" imagesrcset="{img(images[0], 600)} 600w, {img(images[0], 900)} 900w, {img(images[0], 1300)} 1300w" imagesizes="(min-width: 900px) 52vw, 100vw">\n')


def rel_card(q):
    return f'''<li class="v2rel__card">
            <a class="v2rel__img" href="{{P}}products/{q["id"]}.html"><img src="{B.img(q["image"], 400)}" width="400" height="360" loading="lazy" alt="{E(q["alt"])}"></a>
            <button class="v2rel__add" type="button" data-add="{q["id"]}" aria-label="Add {E(q["name"])} to cart"><svg aria-hidden="true"><use href="#i-cart"/></svg></button>
            <h3 class="v2rel__name"><a href="{{P}}products/{q["id"]}.html">{E(q["name"])}</a></h3>
            <p class="v2rel__price">{'From ' if q["priceFrom"] else ''}{B.inr(q["price"])}</p>
          </li>'''


# ------------------------------------------------------------------ cart
def cart_page():
    body = f'''    <section class="v2cart">
      <svg class="co__leaf co__leaf--tr" aria-hidden="true"><use href="#botanical"/></svg>
      <svg class="co__leaf co__leaf--bl" aria-hidden="true"><use href="#botanical"/></svg>
      <div class="container">
        <div class="v2cart__head">
          <div><h1 class="v2cart__title">Your cart</h1><p class="v2cart__count" data-cart-count-text>0 items</p></div>
          <a class="v2cart__continue" href="{{P}}collections/miniature-frame.html"><svg aria-hidden="true"><use href="#i-arrow-left"/></svg> Continue shopping</a>
        </div>
        <div class="v2cart__grid" data-cart-page>
          <div>
            <ul class="v2lines" role="list" data-cart-lines></ul>
            <div class="empty" data-cart-page-empty hidden>
              <p class="script">Your cart is waiting for a story…</p>
              <a class="btn btn--coral" href="{{P}}collections/miniature-frame.html">Explore frames <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
            </div>
          </div>
          <aside class="osum v2sum" aria-labelledby="osum-title">
            <h2 id="osum-title" class="osum__title">Order summary</h2>
            <ul class="osum__items" role="list" data-sum-items hidden></ul>
            <dl class="osum__totals">
              <div><dt>Subtotal</dt><dd data-sum-subtotal>₹0</dd></div>
              <div><dt>Shipping</dt><dd data-sum-shipping>₹0</dd></div>
              <div class="osum__grand"><dt>Estimated total</dt><dd data-sum-total>₹0</dd></div>
            </dl>
            <p class="osum__ship" data-sum-hint></p>
            <a class="btn btn--coral btn--block" href="{{P}}checkout.html" data-to-checkout>Check out securely <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
            <p class="v2sum__secure"><svg aria-hidden="true"><use href="#i-shield"/></svg> Secure checkout</p>
          </aside>
        </div>
        <ul class="v2strip" role="list">
          <li><span><svg aria-hidden="true"><use href="#i-shield"/></svg></span>Secure checkout</li>
          <li><span><svg aria-hidden="true"><use href="#i-truck"/></svg></span>Free shipping above ₹999</li>
          <li><span><svg aria-hidden="true"><use href="#i-heart-lg"/></svg></span>Handcrafted with care</li>
        </ul>
      </div>
    </section>'''
    B.page("cart.html", title="Your Cart | Craft by Payal", description="Review the frames in your cart.",
           body=body, css=("collection.css", "pages.css", "checkout.css", "v2.css"), scripts=("checkout.js",),
           body_class="page-info page-checkout", whatsapp=False)


# ------------------------------------------------------------------ about
def about():
    maker = '{P}assets/images/workshop-maker-1000.webp'
    maker_set = '{P}assets/images/workshop-maker-600.webp 600w, {P}assets/images/workshop-maker-1000.webp 1000w'
    picks = [q for q in B.DATA if q["id"] in ("mini-library", "her-happy-corner-miniature-frame", "museum-of-us-miniature-wall")]
    photo2 = picks[0]["images"][1] if picks and len(picks[0]["images"]) > 1 else B.DATA[0]["image"]
    photo3 = picks[-1]["image"] if picks else B.DATA[1]["image"]
    body = f'''{B.crumbs(("Home", "{P}index.html"), ("About", ""))}
    <section class="v2about-hero">
      <div class="container v2about-hero__grid">
        <div class="v2about-hero__copy">
          <p class="v2eyebrow">Our story</p>
          <h1 class="v2about-hero__title">Made by hand.<br>Meant for the heart.</h1>
          <p class="v2about-hero__lede">Craft by Payal is a small home studio where art, love and everyday moments turn into meaningful handcrafted gifts.</p>
          <a class="btn btn--coral" href="#maker">Meet the maker <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
          <p class="v2about-hero__note" aria-hidden="true"><svg><use href="#doodle-flower"/></svg>Little gifts.<br>Brighter moments.<br>Happier hearts. <svg class="doodle doodle--xs"><use href="#doodle-heart"/></svg></p>
        </div>
        <div class="v2about-hero__img"><img src="{maker}" srcset="{maker_set}" sizes="(min-width: 900px) 55vw, 100vw" width="1000" height="1500" fetchpriority="high"
             alt="Our maker sitting on the lawn beside a lit, yellow house-shaped miniature frame"></div>
      </div>
    </section>

    <section class="v2values" aria-label="What makes us different">
      <ul class="container v2values__grid" role="list">
        <li><svg aria-hidden="true"><use href="#i-heart-lg"/></svg><p><strong>100% handmade</strong><span>Every piece, by hand</span></p></li>
        <li><svg aria-hidden="true"><use href="#i-gift"/></svg><p><strong>Made just for you</strong><span>Your photos &amp; story</span></p></li>
        <li><svg aria-hidden="true"><use href="#i-truck"/></svg><p><strong>Packed with care</strong><span>Safe, gift-ready packaging</span></p></li>
      </ul>
    </section>

    <section class="v2maker" id="maker" aria-labelledby="maker-title">
      <div class="container v2maker__grid">
        <figure class="v2polaroid"><img src="{B.img(photo2, 700)}" width="700" height="700" loading="lazy" alt="A handmade house-shaped miniature library frame"><figcaption aria-hidden="true">made with heart</figcaption></figure>
        <div>
          <h2 id="maker-title" class="v2h2 v2h2--line">Hi, I'm Payal</h2>
          <!-- TODO: replace with Payal's own words — how the studio started, what she loves about making, years of experience. -->
          <p>Craft by Payal began with a simple idea: the little things in our lives deserve a place to live. Every frame starts with your photos and stories, and is built piece by piece — tiny furniture, little books, fairy lights — until it feels like home.</p>
          <p>Each piece is crafted with love, care and attention to detail, because handmade gifts have the power to make ordinary moments extraordinary.</p>
        </div>
      </div>
    </section>

    <section class="v2why" aria-labelledby="why-title">
      <div class="container v2why__grid">
        <div>
          <h2 id="why-title" class="v2h2">Why handmade feels different</h2>
          <p class="v2why__lede">Handmade gifts are more than products — they carry emotions, stories and a little piece of someone's heart.</p>
          <ul class="v2why__list" role="list">
            <li><span><svg aria-hidden="true"><use href="#i-gift"/></svg></span><div><h3>Thoughtfully personal</h3><p>Each piece is designed around your story, your people and your moments.</p></div></li>
            <li><span><svg aria-hidden="true"><use href="#i-heart-lg"/></svg></span><div><h3>Beautifully imperfect</h3><p>Not mass produced — made by real hands, with real care.</p></div></li>
            <li><span><svg aria-hidden="true"><use href="#i-leaf"/></svg></span><div><h3>Made to be remembered</h3><p>Gifts that stay on the shelf and in the heart for years.</p></div></li>
          </ul>
        </div>
        <figure class="v2polaroid v2polaroid--right"><img src="{B.img(photo3, 700)}" width="700" height="700" loading="lazy" alt="A white frame with tiny gold photo frames like a gallery wall"></figure>
      </div>
    </section>

    <section class="v2quote" aria-label="Our promise">
      <div class="container">
        <svg class="v2quote__leaf v2quote__leaf--l" aria-hidden="true"><use href="#botanical"/></svg>
        <svg class="v2quote__leaf v2quote__leaf--r" aria-hidden="true"><use href="#botanical"/></svg>
        <p class="v2quote__mark" aria-hidden="true">— ☾ —</p>
        <blockquote><p>The feeling of making something of your own is full of joy. Our mission is to turn your memories into tiny worlds you can hold.</p></blockquote>
        <p class="v2quote__script">Small details. Big emotions. <svg class="doodle doodle--sm" aria-hidden="true"><use href="#doodle-heart"/></svg></p>
        <p class="v2quote__by">— Craft by Payal</p>
      </div>
    </section>'''
    B.page("about.html", title="About Us | Craft by Payal",
           description="Craft by Payal is a small handmade studio turning your memories into personalised miniature frames.",
           body=body, css=("collection.css", "pages.css", "v2.css"), body_class="page-info", current="About")


# ------------------------------------------------------------------ contact
def contact():
    body = f'''    <section class="v2contact">
      <svg class="v2contact__leaf v2contact__leaf--l" aria-hidden="true"><use href="#branch"/></svg>
      <svg class="v2contact__leaf v2contact__leaf--r" aria-hidden="true"><use href="#branch"/></svg>
      <div class="container v2contact__grid">
        <div class="v2contact__copy">
          <p class="v2eyebrow">Contact us</p>
          <h1 class="v2contact__title">Let's create something <em>beautiful</em> together.</h1>
          <p class="v2contact__lede">Whether it's a custom gift, a question or a simple hello — we'd love to hear from you.</p>
          <ul class="v2contact__list" role="list">
            <li><span><svg aria-hidden="true"><use href="#i-mail"/></svg></span><div><a href="mailto:{B.EMAIL}"><strong>Email us</strong></a><p>{B.EMAIL}</p></div></li>
            <li><span><svg aria-hidden="true"><use href="#i-whatsapp"/></svg></span><div><a href="{B.WA}" target="_blank" rel="noopener"><strong>WhatsApp us</strong></a><p>The quickest way to reach us — photos welcome.</p></div></li>
            <li><span><svg aria-hidden="true"><use href="#i-location"/></svg></span><div><strong>Our studio</strong><p>India · shipping across India</p></div></li>
          </ul>
          <svg class="v2contact__gift" aria-hidden="true"><use href="#gift-art"/></svg>
        </div>
        <form class="v2contact__card" data-contact novalidate>
          <h2 class="v2contact__card-title">Send us a message</h2>
          <div class="field-row">
            <label class="field"><span>Name</span><input name="name" type="text" autocomplete="name" placeholder="Name" required></label>
            <label class="field"><span>Email *</span><input name="reach" type="email" autocomplete="email" placeholder="Email" required></label>
          </div>
          <label class="field"><span>Phone number</span><input name="phone" type="tel" autocomplete="tel" placeholder="Phone number"></label>
          <label class="field"><span>What's it about?</span>
            <select name="topic"><option>A custom frame idea</option><option>A question about a product</option><option>An existing order</option><option>Something else</option></select></label>
          <label class="field"><span>Tell us what you have in mind</span><textarea name="message" rows="4" placeholder="Tell us what you have in mind" required></textarea></label>
          <button class="btn btn--coral btn--block" type="submit">Send message <svg aria-hidden="true"><use href="#i-arrow"/></svg></button>
          <p class="form-note">This opens WhatsApp with your message ready to send.</p>
          <p class="form-status" role="status" aria-live="polite" data-form-status></p>
        </form>
      </div>
    </section>'''
    B.page("contact.html", title="Contact Us | Craft by Payal",
           description="Get in touch with Craft by Payal about custom miniature frames and orders.",
           body=body, css=("collection.css", "pages.css", "v2.css"), scripts=("forms.js",), body_class="page-info")


# ------------------------------------------------------------------ FAQs
FAQ_CATS = [
    ("i-pencil", "Ordering", [
        ("How do I send my photos?", "After you place your order, share your photos on WhatsApp. Clear, well-lit photos work best — we'll let you know if any need replacing."),
        ("Will I see a design before it's made?", "Yes. We share a design preview on WhatsApp and only start building once you're happy with it."),
        ("Can I change details after ordering?", "Small changes are fine before you approve the preview. Once building starts, changes may not be possible."),
    ]),
    ("i-gift", "Custom designs", [
        ("Can I ask for a completely custom design?", 'Absolutely. Tell us your idea on the <a href="{P}contact.html">contact page</a> or WhatsApp and we\'ll suggest a size and design.'),
        ("Can you add names, dates or a quote?", "Yes — add them in the Text field on the product page, or tell us on WhatsApp."),
    ]),
    ("i-shield", "Payment", [
        ("What payment methods do you accept?", "You can pay online with UPI, cards, net banking or wallets through our secure payment partner — or confirm on WhatsApp and pay by UPI after approving your design preview."),
    ]),
    ("i-truck", "Delivery", [
        ("How long does it take?", "Every frame is handmade to order. We'll confirm your dispatch date on WhatsApp once your design is approved — tell us if you have an occasion date in mind."),
        ("Do you ship across India?", 'Yes. See our <a href="{P}shipping-policy.html">Shipping Policy</a> for details.'),
        ("How is it packed?", "In padded, gift-ready packaging to keep the tiny details safe on the way."),
    ]),
    ("i-box", "Returns & care", [
        ("Can I return a personalised frame?", 'Because each piece is made just for you, personalised items can\'t be returned. If something arrives damaged, contact us right away — see <a href="{P}refund-policy.html">Returns &amp; Refunds</a>.'),
        ("How do I care for my frame?", "Keep it out of direct sunlight and away from moisture, and dust gently with a soft dry brush."),
    ]),
]


def faqs():
    cards = []
    for ci, (ic, cat, items) in enumerate(FAQ_CATS):
        qs = "".join(f'''<details class="v2faq__q" data-faq><summary>{E(q)}<svg aria-hidden="true"><use href="#i-chev-right"/></svg></summary><div class="v2faq__a"><p>{a}</p></div></details>''' for q, a in items)
        cards.append(f'''        <section class="v2faq__card" aria-labelledby="fc-{ci}" data-faq-card>
          <h2 id="fc-{ci}" class="v2faq__cat"><span><svg aria-hidden="true"><use href="#{ic}"/></svg></span>{E(cat)}</h2>
          {qs}
        </section>''')
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a.replace("{P}", "")}} for _, _, items in FAQ_CATS for q, a in items]}
    body = f'''    <section class="v2faq">
      <svg class="v2faq__leaf v2faq__leaf--l" aria-hidden="true"><use href="#botanical"/></svg>
      <svg class="v2faq__leaf v2faq__leaf--r" aria-hidden="true"><use href="#botanical"/></svg>
      <div class="container">
        <div class="v2faq__hero">
          <p class="v2eyebrow v2eyebrow--center">FAQs</p>
          <h1 class="v2faq__title">How can we help?</h1>
          <p class="v2faq__lede">Find quick answers about orders, personalisation, delivery, payments and more.</p>
          <form class="v2faq__search" role="search" data-faq-search>
            <label class="visually-hidden" for="faq-q">Search the FAQs</label>
            <svg aria-hidden="true"><use href="#i-search"/></svg>
            <input id="faq-q" type="search" placeholder="Search for answers… (e.g. photos, delivery, returns)" autocomplete="off">
            <button type="submit" aria-label="Search"><svg aria-hidden="true"><use href="#i-arrow"/></svg></button>
          </form>
          <p class="v2faq__result" role="status" aria-live="polite" data-faq-result></p>
        </div>
        <div class="v2faq__grid">
{chr(10).join(cards)}
        </div>
        <div class="v2faq__help">
          <p class="v2faq__lotus" aria-hidden="true"><svg><use href="#doodle-flower"/></svg></p>
          <h2 class="v2h2">Still need help?</h2>
          <p>We're here for you. Chat with us on WhatsApp for quick assistance.</p>
          <a class="v2pill" href="{B.WA}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-whatsapp"/></svg> Chat with us on WhatsApp <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
        </div>
      </div>
    </section>'''
    B.page("faqs.html", title="FAQs | Craft by Payal",
           description="Answers about ordering, personalising, delivery and care for Craft by Payal miniature frames.",
           body=body, css=("collection.css", "pages.css", "v2.css"), scripts=("faq.js",), body_class="page-info",
           head_extra=f'  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n')


# ------------------------------------------------------------------ track order
def track():
    body = f'''    <section class="v2track">
      <div class="v2track__art">
        <div class="v2track__copy">
          <p class="v2eyebrow v2eyebrow--line">Delivery, made simple</p>
          <h1 class="v2track__title">Where is my order?</h1>
          <p>Enter your details and we'll send you an update on WhatsApp — including your design preview and courier tracking once dispatched.</p>
        </div>
        <div class="v2track__illus" aria-hidden="true">
          <svg class="v2track__gift"><use href="#gift-art"/></svg>
          <svg class="v2track__sprig v2track__sprig--l"><use href="#botanical"/></svg>
          <svg class="v2track__sprig v2track__sprig--r"><use href="#botanical"/></svg>
          <span class="v2track__tag">Craft by Payal<br><small>handmade with love</small></span>
        </div>
      </div>
      <div class="v2track__side">
        <form class="v2track__card" data-track novalidate>
          <label class="field v2ifield"><span>Order number</span>
            <span class="v2ifield__wrap"><svg aria-hidden="true"><use href="#i-box"/></svg><input name="order" type="text" placeholder="e.g. CBP261018-4821" required></span></label>
          <label class="field v2ifield"><span>Email or phone number</span>
            <span class="v2ifield__wrap"><svg aria-hidden="true"><use href="#i-user"/></svg><input name="phone" type="text" autocomplete="tel" placeholder="you@example.com or 98765 43210" required></span></label>
          <p class="field-hint">Use the email or phone number from your order.</p>
          <button class="btn v2btn-dark btn--block" type="submit">Track my order <svg aria-hidden="true"><use href="#i-arrow"/></svg></button>
          <p class="form-status" role="status" aria-live="polite" data-form-status></p>
          <ul class="v2track__perks" role="list">
            <li><svg aria-hidden="true"><use href="#i-shield"/></svg>Private lookup</li>
            <li><svg aria-hidden="true"><use href="#i-whatsapp"/></svg>Update on WhatsApp</li>
          </ul>
          <p class="v2track__help">Need help? <a href="{{P}}contact.html">Contact us</a></p>
        </form>
      </div>
    </section>'''
    B.page("track-order.html", title="Track Your Order | Craft by Payal", description="Get an update on your Craft by Payal order.",
           body=body, css=("collection.css", "pages.css", "v2.css"), scripts=("forms.js",), body_class="page-info")


# ------------------------------------------------------------------ policies
POLICIES = {
    "shipping-policy.html": ("Shipping Policy", "Made to order, packed with care — here's how delivery works.", [
        ("i-gift", "Made to order", "Every Craft by Payal piece is handmade after you order and approve your design preview. We confirm your dispatch date on WhatsApp once building starts.", ""),
        ("i-map", "Where we ship", "We currently ship across India. [Confirm: international shipping on request?]", ""),
        ("i-truck", "Shipping charges", "Shipping is free on orders above ₹999. For smaller orders, a flat fee is shown at checkout. [Confirm amounts.]", "Free above ₹999"),
        ("i-clock", "Delivery times", "After dispatch, delivery usually takes [X–Y] working days depending on your location. You'll receive a courier tracking link.", ""),
        ("i-shield", "Damaged in transit", "We pack every frame carefully. If your order arrives damaged, please record an unboxing video and contact us within [48 hours] of delivery so we can help.", ""),
    ]),
    "refund-policy.html": ("Returns & Refunds", "Handmade with care. Clear policies, so you can order with confidence.", [
        ("i-clock", "Cancellations", "Orders can be cancelled for a full refund before we start building your design. Once work has begun, cancellation may not be possible. [Confirm the window.]", ""),
        ("i-box", "Returns & exchanges", "Because each frame is made specially for you with your photos and details, personalised items cannot be returned or exchanged.", ""),
        ("i-image", "Approval before dispatch", "For every order we share a design preview, and we only proceed after your confirmation — so everything is just right.", ""),
        ("i-shield", "Damaged or incorrect items", "If your order arrives damaged or isn't what you approved, contact us within [48 hours] of delivery with photos and an unboxing video. We'll repair, remake or refund as appropriate.", "Unboxing video needed"),
        ("i-gift", "Refund timing", "Approved refunds are made to the original payment method within [X] working days.", ""),
    ]),
    "privacy-policy.html": ("Privacy Policy", "Your photos and details are precious — here's how we look after them.", [
        ("i-user", "What we collect", "When you order or contact us, we collect your name, contact details, delivery address and the photos and details you share for personalisation.", ""),
        ("i-heart", "How we use it", "We use your information only to make and deliver your order, talk to you about it, and — if you subscribe — send occasional updates. You can unsubscribe at any time.", ""),
        ("i-image", "Your photos", "Photos you send are used only to create your frame. [Confirm: how long you keep them, and whether you ask permission before sharing finished work on social media.]", ""),
        ("i-shield", "Sharing", "We share details only with the services needed to run the shop — such as payment providers and courier partners. We never sell your data.", "Never sold"),
        ("i-box", "This website", "This site stores your cart and wishlist in your own browser so they're remembered between visits. [Add any analytics or cookies you enable.]", ""),
    ]),
    "terms.html": ("Terms & Conditions", "The simple rules that keep every order clear and fair.", [
        ("i-pencil", "About these terms", "By ordering from Craft by Payal you agree to these terms. [Add business name and address.]", ""),
        ("i-image", "Orders & design approval", "Your order is confirmed once payment is received. We build your frame after you approve the design preview — please check names, dates and spellings carefully.", ""),
        ("i-heart-lg", "Handmade nature", "Each piece is handmade, so small variations in colour, size and finish are part of its character. Photos are printed from the files you send, so quality depends on the originals.", ""),
        ("i-gift", "Prices", "Prices are in Indian Rupees (₹). [Confirm whether taxes are included.] The price at the time of your order applies.", ""),
        ("i-shield", "Your content & liability", "You confirm you have the right to use the photos and text you send us. Our liability is limited to the value of your order. [Have this reviewed by a legal adviser.]", ""),
    ]),
}


def policies():
    for path, (title, sub, sections) in POLICIES.items():
        slug = lambda h: h.lower().replace("&", "and").replace(" ", "-")
        nav = "".join(f'<li><a href="#{slug(h)}"><svg aria-hidden="true"><use href="#{ic}"/></svg>{E(h)}<svg class="v2pol__chev" aria-hidden="true"><use href="#i-chev-right"/></svg></a></li>' for ic, h, _, _ in sections)
        secs = "\n".join(f'''          <section class="v2pol__card" id="{slug(h)}">
            <span class="v2pol__ic v2pol__ic--{i % 4}"><svg aria-hidden="true"><use href="#{ic}"/></svg></span>
            <div><h2>{E(h)}</h2><p>{E(t)}</p></div>
            {f'<span class="v2pol__chip">{E(chip)}</span>' if chip else ''}
          </section>''' for i, (ic, h, t, chip) in enumerate(sections))
        body = f'''    <section class="v2pol-hero">
      <svg class="v2pol-hero__leaf v2pol-hero__leaf--l" aria-hidden="true"><use href="#branch"/></svg>
      <svg class="v2pol-hero__gift" aria-hidden="true"><use href="#gift-art"/></svg>
      <div class="container">
        <nav class="v2crumb" aria-label="Breadcrumb"><a href="{{P}}index.html">Home</a><svg aria-hidden="true"><use href="#i-chev-right"/></svg><span aria-current="page">{E(title)}</span></nav>
        <h1 class="v2pol-hero__title">{E(title)}</h1>
        <p class="v2pol-hero__divider" aria-hidden="true"><span></span><svg><use href="#doodle-heart"/></svg><span></span></p>
        <p class="v2pol-hero__sub">{E(sub)}</p>
      </div>
    </section>
    <section class="v2pol">
      <div class="container v2pol__grid">
        <aside class="v2pol__nav" aria-label="On this page">
          <h2 class="v2pol__nav-title">At a glance</h2>
          <ul role="list">{nav}</ul>
          <p class="v2pol__script" aria-hidden="true">Thoughtful gifts,<br>happier people <svg class="doodle doodle--xs"><use href="#doodle-heart"/></svg></p>
          <svg class="v2pol__sprig" aria-hidden="true"><use href="#botanical"/></svg>
        </aside>
        <div class="v2pol__cards">
          <p class="draft-note"><strong>Draft for review.</strong> Replace the items in [brackets] with Craft by Payal's real terms, and have this checked before launch.</p>
{secs}
          <p class="muted v2pol__date">Last updated: [date]</p>
        </div>
      </div>
    </section>
{help_band()}'''
        B.page(path, title=f"{title} | Craft by Payal", description=f"Craft by Payal {title.lower()}.",
               body=body, css=("collection.css", "pages.css", "v2.css"), body_class="page-info")


def build(module):
    global B
    B = module
    for p in B.DATA:
        product_page(p)
    cart_page(); about(); contact(); faqs(); track(); policies()

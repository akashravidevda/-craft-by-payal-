# Workshop — everything removed from the site

Recorded before removal so it can be restored later (all of it is also in git history,
commit `fd724c0` and earlier).

## 1. The Workshop page itself
- `site/workshop.html` — the whole page: hero ("Turn Your Imagination Into Miniature Magic"),
  "Choose Your Workshop" listing (5 sample workshops + filter), "What You'll Learn",
  "You'll Take Home", and the "Ready to make something tiny & meaningful?" banner.
- `tools/workshops.py` — the 5 sample workshops (online, in-person, 2 DIY kits, Beginners to Business).
- `site/js/workshops.js` — the workshop filter.
- `workshop()` and `workshop_cards()` in `tools/build_pages.py`.
- Workshop-only styles in `site/css/pages.css` and the homepage workshop styles in `site/css/styles.css`.

## 2. Navigation (every page)
- Header menu: **Workshop** link.
- Phone menu drawer: **Workshop** link.
- Footer → Quick Links: **Workshop** link.

## 3. Homepage
- The **"Miniature Frame Workshop"** section ("Turn Your Imagination Into Miniature Magic",
  Learn / Create polaroids, "Join Workshop" button).
- Sample review: *"Attended the workshop and it was such a wonderful experience."* → reworded.
- Newsletter text: *"…workshop dates, special offers…"* → reworded.

## 4. About page
- Values strip: **"Workshops — Learn to make your own"** item.
- "Hi, I'm Payal" text: the sentence about running workshops.
- The coral **"Come create with me"** band with the "Explore workshops" button.

## 5. Contact page
- Intro: *"…a custom gift, a workshop or a simple hello…"* → reworded.
- "What's it about?" dropdown: **Workshops** option.
- Page description mentioning workshops.

## 6. FAQs page
- The **Workshops** category ("Do I need any experience?", "When is the next workshop?").

## 7. Collection page
- Newsletter text: *"…special offers and workshop dates"* → reworded.

## Kept
- The photo `site/assets/images/workshop-maker-*.webp` (woman in the green kurta with the yellow house frame)
  — it's still used on the About page, it just isn't about workshops any more.

# Unified gift catalogue: local implementation and staging installation

The website uses one All Gifts catalogue. Gift type is the first filter. Existing miniature-frame.html and resin-art.html links open that catalogue with a preset; filters, search, sorting, pagination and browser Back preserve their state. Product links carry a validated return link to the selected catalogue view.

## Product discovery

Gift types are separate from occasions and product types. A resin coaster can appear under Resin Art and Birthday without becoming a separate product. Miniature Frames, Resin Art and Engagement Platters are enabled by default. Photo Hanging Frames and Gift Hampers stay disabled until ready. Navigation and homepage cards display enabled types with products. Empty presets retain their selection and show an empty state. Lighting appears only for an exclusively miniature selection. Price filters exclude unpriced previews.

The three Unsplash designs appear in the same local catalogue, wishlist and detail pages. They are labelled Preview only, have no price or ordering controls, and cart/checkout guards reject them. They appear only on localhost/loopback/file previews with RESIN_ART_SAMPLES enabled. They never enter Google Sheets or the cached API response and are absent from public release navigation. Replace them with approved real products to sell resin art. Source links are in site/assets/images/resin/Sources.md.

## Staging installation

Staging installation completed through the in-app browser on 23 Oct 2026. The website-connected deployment was upgraded from version 5 to version 8 without changing its URL, execution account or access. Vercel deployment and a new live checkout acceptance test were not performed. See STAGING-TAXONOMY-2026-10-23.md for verification and the remaining sidebar limitation.

1. Back up the staging spreadsheet and record its current Apps Script deployment version. Keep Shop Settings → Accept orders false.
2. Run `node tools/build_apps_script.cjs`. Replace the staging Code.gs with backend/google-sheets/deploy/Code.gs, and Owner.html and Upload.html with the matching deploy files. Replace the combined script rather than appending duplicate functions.
3. Run `migrateGiftTaxonomy` as the spreadsheet owner. It checks headers, appends missing collection columns, creates Shop Gift Types and Published Gift Types, and seeds five gift types. It preserves orders, payment records, stable product/variant IDs and previous publication snapshots.
4. The migration corrects the three known engagement-platter IDs using an exact legacy-ID map. Unfamiliar IDs or conflicting classifications require explicit owner review. Open Owner tools, click Migrate / refresh gift types, choose a category for each flagged product and confirm. Publishing is blocked while a published product needs review. Rerunning the migration preserves completed reviews.
5. Check names, categories, prices, variants, approved images and stock in Shop Products, Shop Variants and Shop Images. New products stay draft until approved. Use enabled IDs from Shop Gift Types in Collection; Product type and Care instructions are optional. Leave resin Lighting blank. Use Size for dimensions/pack options; otherwise use Standard. Do not add mock test fixtures to the real catalogue.
6. Validate and publish. Gift types and products become one publication snapshot. An interrupted publication keeps the previous public pointer; retry after fixing the error. Editable registry changes remain private until publication.
7. Update the existing staging web-app deployment to a new version, keeping its URL, execution account and access settings. Saving source does not update the API. Verify `?action=catalog` returns taxonomyVersion 2, schema 2, collectionSchema 1, giftTypes and correct collections.
8. Test miniature, resin and mixed synthetic orders in a controlled staging acceptance window, then close Accept orders again. Verify totals, one order after retry, Payment pending, WhatsApp text, owner payment verification and private tracking. Do not send WhatsApp messages or fulfil test orders.

## Registry fields

Shop Gift Types has ID, Name, Enabled (boolean), Sort order, optional HTTPS Image URL, Image alt and Description. Keep IDs stable; edit display names freely. Disable unused future types rather than deleting seeded rows. Publishing rejects products assigned to unknown or disabled types. Products in those categories must first move to draft or be reassigned.

Old catalogue responses remain readable. Exact known legacy IDs are classified locally; unknown legacy items display Other gifts until corrected. Modern API classifications take precedence. Only All Gifts is canonical and included in the sitemap; existing category entry URLs remain usable.

## Verification

Run:

```text
node tools/test-production.cjs
node tools/test-collections.cjs --browser
node tools/test-production-browser.cjs
node tools/test-products.cjs
node tools/test-resin-samples.cjs
python tools/build_collection.py
python tools/build_pages.py
python tools/check_site.py
```

Tests use isolated in-memory Sheets and routed browser fixtures. They cover migration/repeat/schema safety, classification review, publication atomicity, aliases, filters/history, preview restrictions, mixed carts, failed requests/lost responses, one-order retry, pending payment and owner verification. They do not replace real Google staging acceptance. Local screenshots are design/resin-unified-*.png.

For recovery, keep orders closed, restore the prior publication/deployment and preserve added columns and records. Do not install an older backend that rejects the extended headers. No order schema, quote, request-ID, payment or tracking migration is required.

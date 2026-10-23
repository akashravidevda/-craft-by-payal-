# Craft by Payal — backend handover

**Start here. Last verified: 23 October 2026.**

This file is for the next developer or coding model. It explains the existing system, the exact Google resources, what was actually tested, and what still needs work. Reading this file is not permission to deploy, send emails, verify payments or open orders. Follow the new owner's task instructions.

## 1. Understand the project in one minute

The website is plain HTML, CSS and JavaScript. Its backend is a Google Apps Script web app. The business data lives in Google Sheets.

The customer places an **order request**, then opens WhatsApp and presses Send. The website does **not** collect or verify a payment. The owner checks the actual payment separately.

There is no customer login module and no payment gateway. Website photo uploads were deliberately removed. If a product needs customer photos, the studio collects them in WhatsApp. Do not assume every product needs customisation.

The backend is installed in **staging**, not approved for unrestricted public launch. **Accept orders is false.** Do not turn it on just to make a test pass.

### The mental model

```text
Owner edits readable Shop tables in Google Sheets
    → publishCatalogue validates them
    → immutable Published tables receive a complete snapshot
    → CBP_PUBLICATION points to that snapshot
    → public Apps Script API returns the published catalogue
    → static website renders the products

Customer cart + delivery details
    → backend quote with trusted prices
    → backend create with the same persistent request ID on retry
    → Sheets saves order + items + notification jobs
    → browser shows Order request received (payment status is not displayed here)
    → customer opens WhatsApp and presses Send
    → studio confirms the request, payment and fulfilment
```

**Never equate order submission, a green tick, a completed progress step or a WhatsApp link with payment received.**

## 2. Exact resources — do not create replacements by accident

| Resource | Current value |
|---|---|
| Repository folder | `C:\Users\july2\OneDrive\Desktop\project\Craft_byPayal` |
| Staging spreadsheet | [Craft by Payal — Backend Staging — 22 Oct 2026](https://docs.google.com/spreadsheets/d/1McFjdhYeIX122j04rAYR6_HXYyGt4vcAVtWVJosTEFY/edit) |
| Apps Script project | [Existing staging project](https://script.google.com/home/projects/13-37aGS9B7W5IV0YoLu1qnV9xH0fgn4N9Q7MjOGSujO_2kiPV5qgyFIu/edit) |
| Project ID | `13-37aGS9B7W5IV0YoLu1qnV9xH0fgn4N9Q7MjOGSujO_2kiPV5qgyFIu` |
| Deployment version last verified | **8**, deployed 23 Oct 2026 |
| Deployment description | `Unified gift catalogue — reviewed taxonomy — 23 Oct 2026` |
| Execute as | Existing owner's account: `vishnuravidevda@gmail.com` |
| Web-app access | Anyone; existing setting retained |
| Publication snapshot last verified | `8f7735a6-cd33-4b5f-b631-825e5617e4c3` |
| Private spreadsheet backup | [Before gift-taxonomy migration](https://docs.google.com/spreadsheets/d/1oOWsmrrLDcY1GWnfyC54HZcCKYo0qV8U2WYaf6pH-hk/edit) |

Website API URL, copied exactly from `site/js/config.js`:

```text
https://script.google.com/macros/s/AKfycbxCQyaTV7hSbm_nTLmz_BTP3uGb8CarDLF6N9jLYldafd2hcDkkcimzmlQ1-PSZ_A_VQw/exec
```

Read-only catalogue check: append `?action=catalog` to this URL. Success is a JSON response with `ok: true`, `schema: 2`, `collectionSchema: 1`, `taxonomyVersion: 2`, `giftTypes` and `products`.

There are several other deployment entries in this project. **Select by matching the deployment ID in the URL above, not by the newest-looking name.** The website-connected deployment used version 5 before this update; it now uses version 8. The other entries were left alone.

These are historical verification values. Recheck the live state before changing it. Never reset a newer deployment, publication or order counter to the values in this document.

## 3. What is currently installed

- `Code.gs`, `Owner.html` and `Upload.html` were replaced in the existing Google project using the in-app browser.
- The entire final Code.gs, Owner.html and Upload.html contents were checked against the local deployment files through the editor clipboard.
- `closeStagingTestWindow` ran successfully. The owner diagnostic confirmed `acceptOrders: false`.
- A private spreadsheet copy was made before migrating. Source-file backups were also saved in a local temporary folder; temporary storage is not a long-term backup strategy.
- `migrateGiftTaxonomy` completed successfully.
- The three known platter product IDs were moved to `engagement-platter`.
- `bakers-deck` was reviewed using its saved description: a miniature showcase of a baker's shop shelf. Its `miniature-frame` classification was confirmed. A temporary helper used for this confirmation was removed before deployment.
- `publishCatalogue` completed successfully; there were no pending classification reviews afterward.
- Version 8 was deployed to the existing API URL. Account and access settings were preserved.
- The actual deployed API returned **42 products: 39 miniature-frame and 3 engagement-platter**; five registered gift types; no `preview-` products.
- The connected local website showed the mixed resin/platter cards with no catalogue warning after refresh.

**Not done in that installation:** a new live checkout acceptance test, a Vercel deployment, a payment, a customer message, or a launch approval. Do not describe mocked tests as real Google end-to-end verification.

## 4. Source files versus paste-ready files

| File | Purpose |
|---|---|
| `backend/google-sheets/Code.gs` | Maintained legacy entry points, helpers and compatibility code. It is only one source module. |
| `backend/google-sheets/Production.gs` | Maintained Sheets backend: tables, publication, quotes, orders, owner operations, migration and diagnostics. |
| `backend/google-sheets/CatalogSeed.gs` | Reference catalogue seed for deliberate imports. Not the current live source of product truth. |
| `backend/google-sheets/Owner.html` | Maintained owner sidebar HTML. Installed, but the standalone sidebar connection is unresolved. |
| `backend/google-sheets/Upload.html` | Maintained upload-retirement notice. Not an upload form. |
| `tools/build_apps_script.cjs` | Combines the three `.gs` source modules and copies the HTML files into `deploy/`. |
| `backend/google-sheets/deploy/Code.gs` | **The complete file to paste into Google's Code.gs.** Generated; do not maintain this alone. |
| `backend/google-sheets/deploy/Owner.html` | Paste into Google's HTML file named `Owner`. |
| `backend/google-sheets/deploy/Upload.html` | Paste into Google's HTML file named `Upload`. |
| `site/js/config.js` | Website API URL, schema setting, owner spreadsheet link and local sample flag. |
| `site/js/catalog-live.js` | API catalogue loading, compatibility/cache handling and managed product hydration. |
| `site/js/gift-catalogue.js` | Shared gift-type defaults, legacy mapping, cards and purchase guards. |
| `site/js/resin-samples.js` | Local-only, nonorderable Unsplash sample data. |
| `site/js/main.js` | Shared cart, cart snapshots, wishlist state and navigation. |
| `site/js/collection.js` | Gift-type filters, other facets, sorting, pagination and URL/history state. |
| `site/js/product.js` | Product options and add-to-cart; preview ordering stays disabled. |
| `site/js/checkout.js` | Draft/attempt persistence, quote/create calls, confirmation and tracking UI. |
| `tools/build_collection.py`, `tools/build_pages.py`, `tools/checkout_pages.py`, `tools/v2_pages.py`, `tools/shell.py` | Page generators/templates. Changes to generated HTML must also survive regeneration. |

Build command, from the repository root:

```powershell
node tools/build_apps_script.cjs
```

**Do not paste only the source `backend/google-sheets/Code.gs`. Do not append the combined deploy file beside duplicate Production.gs/CatalogSeed.gs copies in Google. Replace the complete Google Code.gs with the generated combined file.**

Saving source in Apps Script does not update a deployed `/exec` app. Changing a spreadsheet row does not automatically publish the catalogue. These are two different operations.

## 5. Which spreadsheet tables matter

Exact column headers and order are defined in `CBP_TABLES` in Production.gs. Do not rename, reorder or remove existing columns casually. Use additive migrations with preflight checks.

| Table | How to treat it |
|---|---|
| Shop Gift Types | Editable category registry. IDs, labels, Enabled booleans, sort order and optional category images. |
| Shop Products | Editable product rows: stable ID, name, description, state, collection and optional subtype/care fields. |
| Shop Variants | Editable purchasable choices: stable Variant ID, Product ID, size, lighting, price and availability. |
| Shop Images | Editable image URLs, alt text and ordering, linked by Product ID. |
| Shop Settings | Business/configuration values including Accept orders, shipping and Website URL. |
| Published Gift Types / Products / Variants / Images | Script-managed publication snapshots. Do not edit these to change live products. |
| Shop Orders | Saved orders, customer/delivery details, amounts and separate order/payment/production/delivery states. Private data. |
| Shop Order Items | Saved product/variant IDs, options, quantities, price and personalisation per order. |
| Shop Payments | Owner-verified payment records. A browser claim is not sufficient. |
| Shop Operations | Request IDs, fingerprints and recovery payloads. Script-managed; required for safe retries. |
| Shop Events | Audit events for owner and status actions. |
| Shop Notifications | Email job queue and retry/failure states. Running jobs can send real emails. |
| Shop Health | Diagnostic events and errors. |
| Shop Photos | Historical private photo records. Preserve them; uploads are retired. |
| Products / Orders / Summary | Legacy tables. Keep them for compatibility/history; do not confuse them with the Shop tables. |

Owners maintain readable cells. JSON still exists in API responses, the legacy Products table, browser storage and internal operation payloads. “Managed through Sheets” does not mean “delete all JSON from the software.”

There are preformatted/dropdown/checkbox rows. The first visible rows can look empty even when product records exist further down. Find the **Product ID**, or inspect the complete table; do not assume there are no products. Do not invent row numbers or insert duplicate records to fix an apparently blank area.

### Units and identifiers

- Sheet columns ending in **paise** store integers: ₹1,250 = **125000 paise**.
- The public product/quote JSON exposes prices in rupees. Preserve the conversions.
- `Product ID` is a stable slug, not the display name or sheet row number.
- `Variant ID` is a stable purchasable-option ID. Preserve it when editing prices or names.
- Internal order ID, displayed order number (`CBP-…`) and checkout request ID are different identifiers.
- Owner payment/production/shipment functions take the **internal Order ID**, not the displayed CBP number.

## 6. How to add or edit a real product

1. Edit **Shop Products**, not Published Products or the legacy JSON Products table.
2. Give a new product a unique stable lowercase hyphenated ID. Keep its State `draft` while preparing it.
3. Set Collection to an enabled gift-type ID. Enter an accurate name and description. Add Product type and Care instructions only when applicable.
4. Add at least one matching Shop Variants row with its own unique stable Variant ID. Set Price paise to the real integer price and Available to a boolean.
5. Use Size for dimensions/pack options; `Standard` is the neutral single-option label. Leave Lighting blank for resin. Do not invent a new variant dimension without implementing it throughout the stack.
6. Add approved public HTTPS product images in Shop Images, linked by Product ID, with stable Image IDs and alt text. Do not use private customer photos as catalogue images.
7. Review actual image rights, price, availability and description. Existing reference-store seed data is not automatic business approval.
8. Set State `published` when approved. Resolve any classification review before publishing.
9. Run `publishCatalogue` as the owner. Verify `?action=catalog`, then refresh the website.

To change an existing product, keep its Product ID and Variant IDs. Editing an editable row affects future publication; it must not rewrite historical order line prices.

### Gift types and resin previews

| ID | Default state |
|---|---|
| miniature-frame | Enabled |
| resin-art | Enabled, but currently zero real published resin products |
| engagement-platter | Enabled |
| photo-hanging-frame | Disabled until ready |
| gift-hamper | Disabled until ready |

The website has one **All Gifts** catalogue. `miniature-frame.html` and `resin-art.html` are preset entry routes into it. Gift type and occasion are different filters. Navigation displays enabled types with products. Disabled future types must not become misleading links.

Three Unsplash resin examples are merged into the normal catalogue only for local/loopback/file previews when `RESIN_ART_SAMPLES` is true. They have `preview-` IDs, Preview only badges, no price, and no purchase action. Wishlist and detail viewing are allowed. Photo credits are on detail pages. Public API verification found zero preview products.

**Do not publish the sample objects to Sheets, invent their prices or turn their arrow buttons into cart buttons.** To sell resin, add approved real products using the steps above.

## 7. Checkout contract — preserve this when changing anything

The public API supports these core schema-2 operations:

| Request | Purpose |
|---|---|
| GET `?action=catalog` | Read the published catalogue and shipping settings. |
| POST `action: 'quote'`, `order` | Validate the request and compute trusted totals. |
| POST `action: 'create'`, `requestId`, `order`, quote fields | Save/recover one order request. |
| POST `action: 'trackSecure'`, `orderId`, `token` | Read the limited guest-tracking result for an authorized link. |

The order contains `payment: 'whatsapp'`, customer/contact details, address, optional gift details and line items with `id`, `variantId`, `qty`, `note`. Preserve the internal payment value even though the customer-facing heading is Order confirmation.

The quote returns a fingerprint, token and expiry. Create sends them as `quoteFingerprint`, `quoteToken` and `quoteExpires`. Quotes last about 15 minutes. The server checks current published prices/availability and does not trust client-supplied totals.

### Why retries must reuse the same ID

```text
The server can save an order successfully, but the browser can lose the response.
That is an UNKNOWN RESULT, not proof that nothing was saved.

Retry the SAME request ID and SAME order details.
The server finds its Shop Operations record and returns/reconstructs the same order.
Do not generate a new request ID simply because the browser timed out.
```

Shop Operations stores a fingerprint and recovery payload. A reused request ID with different details is a conflict. Deterministic line/job IDs help avoid duplicate rows during recovery. `repairShopOrders` is the owner recovery function; inspect the current records before using it.

Browser state includes local cart snapshots and session keys such as `cbp-checkout-draft`, `cbp-pending-order` and `cbp-last-order`. The pending payload is saved before create. Retain the cart on failed/unknown requests and clear it only after confirmed success. Unavailable catalogue data must not silently delete a cart. Storage errors must not silently bypass duplicate protection.

### Success means this, and nothing more

New orders begin with:

| Field | Initial value |
|---|---|
| Order status | Awaiting confirmation |
| Payment status | Pending |
| Production status | Awaiting confirmation |
| Delivery status | Not dispatched |

UI progress: **Cart → Details → Order submitted**. Confirmation: **Order request received** and order number. The standalone “Payment pending” line was removed at the owner’s request; the backend still records Pending, and tracking reflects actual backend payment status. The WhatsApp link is prepared text; the customer must press Send. Sending it is not proof of payment or delivery.

## 8. Owner verification and delivery

Important functions in Production.gs:

| Function | What it does |
|---|---|
| `inspectGiftTaxonomy()` | Owner-only log of order acceptance, category registry, pending classifications and published-state product counts in editable rows. Counts are not proof that a new publication/deployment was released. |
| `getGiftTypeReview()` | Returns pending classification items and gift types. |
| `confirmGiftTypeAssignment(productId, giftType)` | Confirms one classification and clears its review flag. |
| `publishCatalogue()` | Validates editable data, writes snapshots, then changes the publication pointer. |
| `verifyOwnerPayment(orderId, reference)` | Records owner verification and changes Payment status to Verified paid. Only run after actual receipt verification. |
| `updateOwnerProduction(orderId, status)` | Applies allowed production transitions. Handcrafting/Ready require verified payment. |
| `updateOwnerShipment(orderId, state, url)` | Applies shipment transitions; dispatch requires production Ready. |
| `closeStagingTestWindow()` | Closes order acceptance in the named staging workbook. |
| `repairShopOrders()` | Attempts recovery of pending multi-table order operations. |
| `processShopJobs()` | Processes notification jobs; may send real customer/owner email. |
| `installShopJobs()` | Installs recurring notification processing; do not run casually. |
| `backupShop()` | Copies the spreadsheet to the private folder configured in Script Properties. Does not separately back up photo files. |

Production supports ready-made and custom paths. Do not force every item through photos/design/approval. Allowed production stages include Awaiting confirmation, Awaiting photos, Designing, Awaiting approval, Handcrafting and Ready; consult the transition map before changing it. Delivery states are separate: Not dispatched, Dispatched, Delivered, Returned.

The Apps Script function dropdown runs **zero-argument** functions. It cannot supply parameters to `verifyOwnerPayment`, `confirmGiftTypeAssignment`, etc. Selecting one and pressing Run is not a valid way to supply its arguments. Use a working authenticated owner interface, or a narrowly scoped, reviewed temporary wrapper in an authorized staging task. Remove such wrappers before deployment. Never put payment-confirmation shortcuts into a public endpoint.

## 9. Settings and secrets

| Location / key | Meaning and handling |
|---|---|
| Script Properties: `CBP_SPREADSHEET_ID` | Spreadsheet fallback for standalone execution. Verify before running write functions. |
| `CBP_PRODUCTION` | The string `true` switches doGet/doPost to the schema-2 handlers. This is a code mode, **not** approval to launch or proof that orders are open. |
| `CBP_OWNER_EMAIL` | Owner identity used for restricted functions. Account ownership is not transferred by forwarding this document. |
| `CBP_TOKEN_SECRET` | Private signing/derivation secret. Preserve it; do not paste it in chat, commit it, or reset it during routine updates. Changing it breaks signed quotes and derivation/recovery of guest access credentials. |
| `CBP_PUBLICATION` | Active catalogue snapshot pointer. Do not clear it or replace it with an old documented value without deliberate rollback. |
| `CBP_NEXT_ORDER` | Next displayed order-number counter. Never reset on routine setup/deployment. |
| `CBP_GIFT_TAXONOMY`, `CBP_GIFT_TYPE_REVIEW` | Migration marker and pending-review IDs. Do not manually erase flags to bypass review. |
| `CBP_BACKUP_FOLDER` | Private Drive folder ID required by backupShop. Missing during the latest installation. |
| `CBP_STAGING_ACCEPT_UNTIL` | Optional expiry for the staging order window. An expired value can block quotes even with Accept orders true. |
| Shop Settings: Accept orders | Boolean false until deliberate staging tests/approved launch. Not the text string `"true"`. |
| Shipping fee paise / Free shipping threshold paise | Last returned API values correspond to ₹99 / ₹999. They are inherited assumptions, not confirmed business rules. |
| Website URL | HTTPS storefront origin for customer tracking links. Confirm for actual hosting. |
| site/js/config.js | Public website settings. Never place private tokens or owner secrets here. |

## 10. Known gaps — tell the next person these explicitly

1. **Owner sidebar is not connected in this standalone project.** `openOwnerTools` raised `Cannot call SpreadsheetApp.getUi() from this context.` Installing Owner.html does not solve that. The sheet also has a custom menu, but that does not prove it belongs to the same script. Diagnose the actual bound project before copying code or properties. Do not create a second set of order counters, secrets or publication pointers by accident. A proper bound-sheet integration or authenticated owner interface remains needed.
2. **Automated backup folder is not configured.** backupShop raised an error for missing CBP_BACKUP_FOLDER. A private Sheets copy was created instead. Configure the destination and test restore before launch.
3. **Legacy shared-password routes remain in the code.** Production handlers still include listProducts/listOrders/saveProduct/updateStatus compatibility paths protected by OWNER_PASSWORD. Do not claim every management route uses Google identity. Inspect their data targets and authorization before launch; plan a compatible retirement/hardening rather than deleting them blindly. The legacy password must be treated as a secret; no value is reproduced here. Legacy status updates are not a replacement for verified payment, production and shipment functions.
4. **Old docs contain obsolete upload/setup guidance.** SETUP.md describes the old setup. PRODUCTION.md includes earlier uploads and “not deployed” statements. For current state, use this handover, the dated installation record and current source. Upload functions now reject; old photo records stay private. Do not restore uploads based on an old document.
5. **Real launch business details are unconfirmed.** The owner said they would provide the domain, WhatsApp number, support email, shipping rules and delivery/retention details later. Existing page text is not proof of confirmation. Keep orders closed until reviewed.
6. **Real staging checkout acceptance remains outstanding for this version.** Mocked tests pass, and the deployed catalogue was checked. That is not the same as testing a full new order on real Apps Script and final hosting.
7. **Google quotas and recovery limits remain.** Sheets is not a transactional database. Email delivery is not guaranteed exactly once after a crash. Basic email-based order limiting is not robust anti-abuse protection. Trigger permissions, notifications, backup restore, cancellation/refunds and retention processes still need launch review.
8. **No real resin stock has been added.** The category exists; the local images are previews. Do not describe it as a sellable resin inventory.

## 11. Safe update and deployment procedure

1. Read this file, the current source and the dated installation record. Check `git status`; existing uncommitted work may belong to the owner. Do not reset it.
2. Verify the signed-in Google account, exact project ID, spreadsheet and website-configured deployment ID. Use the **in-app browser** when working in their Google UI, as requested by the owner.
3. Record the current deployment version and publication pointer. Make a private backup before data/schema changes. Preserve current order data and signing secrets.
4. Keep order acceptance closed. Do not run `prepareStagingBackend` as a generic setup or migration step: it can import products, change draft/published states, publish and open a one-hour test window. Its environment guards must also match the actual workbook.
5. Edit maintained local sources; add only the migration needed by the actual change. `setupProduction`, legacy imports and migrations are not routine “refresh” buttons.
6. Run relevant isolated tests, then `node tools/build_apps_script.cjs`.
7. Replace Google Code.gs and the required HTML files from deploy/. Save; verify the contents and successful parsing. Preserve project properties and other deployment entries.
8. Run required owner migrations. For gift types, `migrateGiftTaxonomy` is additive/resumable and preflights headers. Known legacy IDs are mapped exactly; unfamiliar/conflicting classifications require review. Do not silence schema errors by deleting or reordering tables.
9. Review products, then run `publishCatalogue`. Snapshot writes happen before the pointer switch. A failed write should retain the last successful public pointer; inspect and retry rather than deleting partial history.
10. Deploy → Manage deployments → select the deployment matching site/js/config.js → Edit → New version → enter a meaningful description → Deploy. Preserve account/access unless a separately approved change requires otherwise. Saving alone is insufficient.
11. Read `?action=catalog` from the deployed `/exec` URL. Verify schema, taxonomy, category counts, stable IDs, prices, stock and absence of preview fixtures.
12. Refresh the actual website. Check catalogue, product details, cart and filters against live data. Existing pending checkouts and historical confirmations must remain recoverable.
13. For an explicitly authorized live staging order test, use controlled contact details, record any notification side effects, test retry recovery, and close acceptance afterward. Do not send WhatsApp messages, verify money or fulfil orders as a side effect of a catalogue test.
14. Write down what was actually done, what was mocked, what was verified live and what remains blocked. Do not deploy to Vercel unless that is part of the authorized task.

## 12. Tests and what they prove

Run from the repository root:

```powershell
node tools/test-production.cjs
node tools/test-collections.cjs --browser
node tools/test-production-browser.cjs
node tools/test-products.cjs
node tools/test-resin-samples.cjs
python tools/check_site.py
git diff --check
```

Backend tests use in-memory Google services; browser tests route requests to fixtures. They do not prove that live Google authorization, public access, triggers, quotas or final Vercel hosting work. Browser suites require Playwright and installed Chrome (or CHROME_PATH). A Python runtime must be on PATH or supplied explicitly.

Coverage includes catalogue publication, trusted prices, signed quotes, partial-write recovery, duplicate prevention, payment/production owner checks, taxonomy migration/review/snapshot safety, filters/history, previews, mixed carts and lost responses. Tests with legacy product editing do not certify the current standalone Owner sidebar.

For generated website changes:

```powershell
python tools/build_collection.py
python tools/build_pages.py
python tools/check_site.py
```

Rebuilding should preserve the intended changes. Latest site check reported zero errors, one existing admin multiple-H1 warning and eight TODO notes; those counts are observations, not permanent guarantees.

## 13. Quick troubleshooting

| Symptom | First checks |
|---|---|
| Edited product is not visible | Correct Shop table? State published? Valid enabled Collection? Valid variants/images? Publication completed? Correct API URL? Inspect deployed response before changing frontend code. |
| Source looks updated but API behaves old | A new deployment version was not selected, or a different deployment entry was updated. Match exact ID. |
| Resin missing on public website | Expected until real approved resin products are published. Local preview flag does not create real stock. |
| Quote says shop closed | Accept orders boolean and staging expiry; keep closed unless testing/launch is authorized. |
| Cart appears empty or order timed out | Check same origin/browser storage, catalogue warnings, session pending payload and server operation record. Never clear state or generate another request ID as the first fix. |
| Duplicate/uncertain order | Inspect request ID in Shop Operations and related Shop Orders/Items; retry/recover same attempt. Do not delete the recovery row. |
| Classification blocks publishing | Run inspectGiftTaxonomy; review the actual product; confirm correct type through an owner-authorized call. |
| Owner sidebar fails | Known standalone getUi limitation; do not repeatedly run setupProduction. |
| Backup fails | Configure a verified private CBP_BACKUP_FOLDER; spreadsheet copy is the manual alternative. |
| Emails not arriving | Inspect Shop Notifications and trigger execution/permissions/quota. Running the queue can send real mail. |
| Tracking says unpaid after someone edited Status | Payment status is separate. Verify actual receipt using verifyOwnerPayment; do not infer it from an arbitrary order-status string. |
| Header/schema error | Compare exact CBP_TABLES headers and stop the migration until discrepancy is understood. Preserve data. |

## 14. Rollback and ownership transfer

Close acceptance before investigating a failed release. Record orders created since the update. Restore compatible code/publication without overwriting newer customer records. Never restore an old workbook over new orders as a routine rollback. Preserve the extended schema and historical records. Version 5 was the prior deployment, but it predates the taxonomy update: assess compatibility before selecting it.

Forwarding this document does not grant Google permissions. An actual ownership/account transfer must separately cover spreadsheet access, Apps Script project/deployment ownership, Script Properties, Drive backups, triggers, notification sender permissions, hosting and account recovery. Do not put account credentials, token secrets, customer records or private guest-tracking URLs into the handover document.

## 15. Copy this instruction to the next coding model

> Work in the existing Craft_byPayal repository. First read BACKEND-HANDOVER.md and backend/google-sheets/STAGING-TAXONOMY-2026-10-23.md, then inspect the current maintained source and live state. The backend is an existing standalone Apps Script staging project, deployed as version 8 at the URL in site/js/config.js as last verified on 23 Oct 2026. Orders are closed. There is no gateway payment, customer login or website upload flow. Preserve request-ID retry recovery, server prices, guest tokens, existing orders and stable product/variant IDs. Edit source modules and rebuild deploy/Code.gs; do not paste only the legacy source Code.gs or duplicate the combined functions. Owner sidebar integration and automated backup-folder setup are known gaps. Legacy password-protected routes remain and require review before launch. Use the in-app browser for the owner's Google UI. Do only the newly assigned task; do not reset data, rotate secrets, send messages, verify payments, open orders or deploy to Vercel merely because this note describes those operations. State clearly which results were tested locally versus verified against Google.

Further context: `backend/google-sheets/STAGING-TAXONOMY-2026-10-23.md` is the latest installation record; `backend/google-sheets/RESIN-ART.md` explains the unified catalogue and taxonomy. Current source is authoritative for behavior; this note records verified state and intent as of its date. Ask the owner when a business decision is genuinely unknown, rather than inventing it.

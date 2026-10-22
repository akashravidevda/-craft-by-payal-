# Staging verification — 22 October 2026

Spreadsheet: https://docs.google.com/spreadsheets/d/1McFjdhYeIX122j04rAYR6_HXYyGt4vcAVtWVJosTEFY/edit

Apps Script: https://script.google.com/home/projects/13-37aGS9B7W5IV0YoLu1qnV9xH0fgn4N9Q7MjOGSujO_2kiPV5qgyFIu/edit

API (version 4): https://script.google.com/macros/s/AKfycbxCQyaTV7hSbm_nTLmz_BTP3uGb8CarDLF6N9jLYldafd2hcDkkcimzmlQ1-PSZ_A_VQw/exec

The user approved public API access, executing as the spreadsheet owner. The spreadsheet itself was verified private to its owner. The existing live backend was not replaced. `site/js/config.js` points to staging, including the private owner dashboard link.

## Verified against Google

- Setup and catalogue publication completed. 42 products published; heart-collage-miniature-wall and the-traveller-miniature-wall remain drafts because their images are local placeholders rather than public HTTPS images.
- Local collection loaded 42 products from the deployed API.
- Added Our Happy Place Miniature Wall, 10×12 in / Without light, to the cart. Checkout retained the item and showed ₹3,250 with free shipping under the provisional staging settings.
- Synthetic order CBP-1005 was created and confirmed. Customer name explicitly says STAGING TEST — Do not fulfil; contact/address data are test values. Do not contact, charge, produce or ship this order.
- Google Sheets owner sidebar displayed the saved order and correct amount.
- Synthetic payment reference STAGING-TEST-NO-MONEY-1005 changed its payment status to Verified paid. No actual payment occurred.
- Owner changed production to Designing; customer private tracking then displayed Designing and Verified paid.
- Order-specific upload page opened successfully with a valid link. Automated file selection timed out; actual browser-to-Drive upload remains unverified.
- Website admin page now opens the Google Sheets owner dashboard instead of showing the legacy password form for schema 2.

## Automated coverage

`node tools/test-production.cjs`, `node tools/test-production-browser.cjs`, and `node tools/test-products.cjs` passed. Coverage includes authoritative prices, signed quotes, authorization, partial-write recovery, idempotency, cart preservation during outages, lost-response retries, private token scopes, upload validation and reconciliation. Mock upload tests do not substitute for the pending real upload test.

## Before deployment

- Complete one real JPEG/PNG upload using CBP-1005's private upload link and verify its Shop Photos record and private Drive file.
- Notification delivery has not been tested. No notification jobs were deliberately sent and no scheduled job trigger was installed during this verification.
- Confirm business details, shipping prices, production/delivery estimates, image rights, policies and photo retention. Existing provisional website copy needs review.
- Keep Shop Settings → Accept orders false until release approval. `prepareStagingBackend` opens a one-hour test window; `closeStagingTestWindow` closes it. Do not use the staging backend for customer orders.
- Vercel deployment has not been performed. Choose and verify the production backend before launch.

Evidence is saved in `design/staging-deployed.jpg`, `design/staging-order-confirmation.jpg`, and `design/staging-owner-order.jpg`. Private tracking/upload tokens are intentionally excluded from this document.

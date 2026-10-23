# Sheets production backend — staging implementation

> Historical implementation notes. Read [BACKEND-HANDOVER.md](../../BACKEND-HANDOVER.md) first for the verified current state. The staging backend was updated to deployment version 8 on 23 Oct 2026, website uploads are retired, and the standalone Owner sidebar remains unresolved. Older upload/deployment instructions below are not the current operating procedure.

The plain HTML/CSS/JavaScript storefront uses readable Google Sheets tables. Apps Script validates catalogue publication, quotes and orders; Google Drive holds private customer photos. Owners do not maintain JSON product cells. Protected technical operation payloads remain structured internally for recovery. Customer accounts and gateway payments are excluded from this first release.

**The live Google deployment has not been changed. This implementation requires staging verification before launch.**

## Package

Run `node tools/build_apps_script.cjs`. In `deploy/`:

- Paste the combined `Code.gs` into the Apps Script Code.gs file. Do not also paste its source modules: that duplicates functions.
- Create HTML files named `Owner` and `Upload` using the supplied files.

Maintain Code.gs, Production.gs, CatalogSeed.gs, Owner.html and Upload.html in this folder, then rebuild the package. CatalogSeed.gs is a one-time import of the old reference catalogue; owners edit only readable sheet rows after migration.

## Stage safely

1. Make a private copy of the existing business spreadsheet and verify its sharing. Install the package in the copy's bound script. Do not run new migration code directly on the live order book.
2. Run `setupProduction` as the spreadsheet owner. It adds Shop/Published tabs, protects technical tables, configures dropdowns and creates a private photo folder. Existing tabs and counters are retained. Owner identity and a private token secret are stored in Script Properties.
3. Run `migrateLegacyProducts` first to import current JSON product overrides as draft rows. Run `importBundledCatalogue` next for missing catalogue products. Review reference photography, product descriptions and prices before publishing. Never assume imported content is approved for launch.
4. Optional: run `importLegacyOrderHistory` after backup. Legacy item descriptions are retained as text; unknown shipping breakdowns and payment states are marked for review. The original tables remain intact. Imported history does not automatically receive guest-access secrets.
5. Edit Shop Products, Shop Variants and Shop Images. Preserve their IDs. Mark reviewed products `published`, then use Craft by Payal → Validate and publish catalogue. The pointer changes only after all snapshot writes succeed.
6. Keep Shop Settings → Accept orders FALSE until business settings are confirmed. Shipping values are previous-site assumptions. Set Website URL to the HTTPS staging storefront origin for tracking links. Set CBP_BACKUP_FOLDER to a private backup folder in Script Properties.
7. Deploy the staging web app executing as the owner, with customer access to its public API and token-protected upload page. Do not share the spreadsheet or customer-photo folder publicly. Run `enableProduction` as owner and deploy a new version. `?action=catalog` must return schema 2.
8. Point a staging website copy's ORDER_API at that URL. The updated frontend requires CATALOG_SCHEMA 2 and blocks checkout against the legacy endpoint. Backend and website must be released together.
9. Allow orders only in staging during tests. Run `installShopJobs` as owner when ready to test scheduled notifications. All test email addresses must be controlled recipients.
10. Open the spreadsheet's Craft by Payal → Owner tools. The v2 website owner page points to Google Sheets instead of accepting the old shared password. Validate actual Google identity behaviour with the owner, another account and a signed-out browser.

## Implemented

- Readable Products, Variants, Images, Orders, Order Items, Payments, Operations, Events, Notifications, Photos, Settings and Health tabs.
- Versioned published catalogue, stable variant IDs and last-successful public catalogue cache.
- Cart snapshots preserve items even when catalogue requests fail without a cache. Unresolved options remain visible and cannot bypass server validation.
- Server pricing/shipping, 15-minute signed quotes and revalidation on order creation.
- Session-persisted request UUIDs and immutable checkout attempts; same-request retry returns the existing order after a lost response. Unknown outcomes never silently start another order.
- Short write locks and pending operation records; `repairShopOrders` recovers partial multi-table writes. Sheets is not a transactional database.
- Owner-only manual payment verification and separate payment, production and shipment states. Public payment-confirmation and unknown write actions are rejected in v2.
- Separate hashed/scoped guest tracking and upload credentials. Customer links use URL fragments; do not log or share them. Uploads expire after seven days and can be revoked.
- JPEG/PNG form-to-Blob upload, 5 MB client limit, configurable server count/size, basic byte-signature validation and private Drive files. Deterministic upload names and `repairShopPhotos` reconcile uncertain writes. This is not malware scanning/full image decoding; HEIC/video/PDF are unsupported.
- Background email jobs outside order locks; bounded retries and failures visible in the sheet. Exactly-once mail delivery is not guaranteed across a crash after sending.
- Manual spreadsheet backups to an explicit private destination. Photo backup is separate.

## Release gates still required

- Real Google staging tests: identity, cross-origin requests, Apps Script redirects/cold starts, trigger permissions and quotas.
- Mobile private upload tests in Edge, Android and iPhone/Safari, including interrupted uploads.
- Sharing/protection audit, account recovery, backup/restore drill and recovery of incomplete orders/uploads.
- Confirmed website domain, WhatsApp number, support email, shipping/tax rules, delivery estimates, return/privacy text and photo retention period. The owner will supply these later; keep order acceptance disabled meanwhile.
- Reconcile legacy order history before taking further payment or fulfilment action. Full initial static catalogue and spreadsheet overrides must be reviewed before publication.
- Define archival/retention rules for publication snapshots, operation logs, photos and backups. No irreversible automatic deletion is enabled.
- Complete cancellation/refund controls, status-triggered notification templates, a detailed health dashboard and the actual retention cleanup workflow before unrestricted launch.
- Abuse/capacity testing. The email-based order limit is only a basic safeguard, not robust edge/IP throttling. Google account quotas and public endpoint abuse remain platform constraints.
- Real product images/prices; removal of sample reviews and unfinished policy/newsletter content; full accessibility and performance checks.

## Verify locally

```
node tools/test-production.cjs
node tools/test-production-browser.cjs
node tools/test-products.cjs
python tools/check_site.py
node tools/build_apps_script.cjs
```

Tests use in-memory Sheets/Drive and mocked web endpoints. They do not send real emails, deploy code or alter Google data. Browser tests reproduce cached/uncached catalogue outages and a lost create-order response, verifying cart preservation and one order on retry.

## Cutover and rollback

Back up live data/files and record the active deployment, publication pointer, next order counter and website revision. Release only after staging gates pass. Cut over backend and frontend together, then perform a controlled real-hosting smoke test.

For rollback: stop accepting orders, reconcile records created after cutover, then restore compatible code. Never overwrite newer orders with an older workbook backup. Catalogue snapshots can be switched through an owner-controlled publication pointer without deleting them. Preserve the token secret; rotating it invalidates existing access credentials and signed quotes.

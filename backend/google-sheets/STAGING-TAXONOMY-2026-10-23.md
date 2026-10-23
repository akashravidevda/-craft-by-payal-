# Staging taxonomy installation — 23 Oct 2026

Installed through the signed-in Google account using the in-app browser.

- Replaced Code.gs, Owner.html and Upload.html with the deploy package. Verified the complete Code.gs and Owner.html source against the local files through the editor clipboard.
- Closed the staging order window with closeStagingTestWindow. inspectGiftTaxonomy subsequently reported acceptOrders false.
- Created a private spreadsheet copy before migration: https://docs.google.com/spreadsheets/d/1oOWsmrrLDcY1GWnfyC54HZcCKYo0qV8U2WYaf6pH-hk/edit . Remote source files were also backed up in a local temporary directory.
- Ran migrateGiftTaxonomy successfully. Reviewed bakers-deck using its saved description, which explicitly identifies a miniature baker-shop shelf showcase, and confirmed miniature-frame. Removed the one-time review helper before deployment. Final diagnostic reported no pending classification reviews.
- Ran publishCatalogue successfully. Published snapshot: 8f7735a6-cd33-4b5f-b631-825e5617e4c3.
- Updated the existing website-connected deployment from version 5 to version 8, description “Unified gift catalogue — reviewed taxonomy — 23 Oct 2026”. Preserved Execute as Me and Anyone access. Other deployment entries were left unchanged.
- Opened the configured API's action=catalog URL in the in-app browser. Verified ok true, schema 2, collectionSchema 1, taxonomyVersion 2, five gift types, 42 products (39 miniature-frame and 3 engagement-platter), and zero preview product IDs. Resin examples remain local only.
- Saved deployment confirmation screenshot: design/google-taxonomy-deployment.png.

## Remaining limitations

This is a standalone Apps Script project. openOwnerTools fails with “Cannot call SpreadsheetApp.getUi() from this context.” The updated HTML is installed, but opening the Owner sidebar from this standalone editor is not verified. Classification review was completed through an owner-only diagnostic and a temporary, explicitly scoped helper, which was removed before deployment. A separate bound-spreadsheet integration or authenticated owner interface is needed for that sidebar workflow.

The automated backupShop function also needs CBP_BACKUP_FOLDER configured. For this migration, a private spreadsheet copy was created through Sheets instead. No sharing permissions were changed.

No new customer order was submitted, no payment was verified, no customer notification was sent and no Vercel deployment was made in this installation. Order acceptance remains closed pending launch configuration and staging acceptance testing.

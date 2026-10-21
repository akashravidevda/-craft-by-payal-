# Order book in Google Sheets — setup (about 10 minutes)

When it's set up:
- every order on the website appears as a new row in a Google Sheet, with a short order number like **CBP-1001**;
- you update each order's **Status** from a dropdown (on your phone or computer);
- customers see that status on the website's **Track Order** page, and get an email when it changes.

You need a Google account. Use one that only the business owner controls.

---

## Step 1 — Create the sheet
1. Go to **sheets.google.com** and create a **blank spreadsheet**.
2. Name it **Craft by Payal — Orders**.

## Step 2 — Add the script
1. In the sheet, open **Extensions → Apps Script**.
2. Delete everything in the editor.
3. Open the file **`Code.gs`** (in this same folder), copy **all** of it, and paste it in.
4. Click the **💾 Save** icon.

## Step 3 — Run the setup once
1. At the top of the Apps Script editor, pick **`setup`** in the function dropdown and click **▶ Run**.
2. Google asks for permission → **Review permissions** → choose your account →
   if you see "Google hasn't verified this app", click **Advanced → Go to (project name)** → **Allow**.
   (This is your own script — it only works with this sheet and sends status emails from your account.)
3. Go back to the sheet: you'll now see an **Orders** tab (with a Status dropdown) and a **Summary** tab.

## Step 4 — Publish it for the website
1. In Apps Script click **Deploy → New deployment**.
2. Click the ⚙️ next to "Select type" → **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
4. Copy the **Web app URL** (it ends in `/exec`).

## Step 5 — Connect the website
1. Open **`site/js/config.js`**.
2. Paste the URL between the quotes:
   ```js
   ORDER_API: 'https://script.google.com/macros/s/XXXXXXXX/exec'
   ```
3. Save, commit and redeploy the site. Done!

## Step 6 — Test it
1. Place a test order on the website (choose "Confirm on WhatsApp").
2. Check the **Orders** sheet — a row like **CBP-1001** appears.
3. Change its **Status** to "Preview sent".
4. On the website's **Track Order** page, enter the order number and the mobile number — you'll see the new status.
5. Delete the test row afterwards.

---

## Using it day to day
| Column | What to do |
|---|---|
| **Status** | Pick the stage from the dropdown: Placed → Photos received → Preview sent → Approved → Handcrafting → Dispatched → Delivered (or Cancelled). The date updates and the customer gets an email. |
| **Tracking link** | Paste the courier link **before** setting Status to Dispatched — it goes into the email and the Track Order page. |
| **Preview link** | Optional: paste a link to the design preview (e.g. a Google Drive image shared "anyone with the link"). |
| **Private notes** | Only you see this. |
| **Summary tab** | Open orders, orders and revenue this month, and orders due in the next 7 days. |

"Pending payment" means the customer chose online payment but the payment hasn't completed yet.

## Good to know
- **If you edit `Code.gs` later**, publish the change with **Deploy → Manage deployments → ✏️ → Version: New version → Deploy** (the URL stays the same).
- To stop status emails, set `SEND_STATUS_EMAILS = false` at the top of `Code.gs`.
- Customers can only see an order's **status** — and only if they know both the order number and the mobile number. Names, addresses and prices never leave the sheet.
- Prices in the sheet come from the customer's browser. Until online payment is connected properly, check the total before you start work.

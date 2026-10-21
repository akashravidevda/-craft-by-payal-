/**
 * Craft by Payal — order book in Google Sheets.
 *
 * The website sends each new order here; the "Orders" sheet becomes the owner's dashboard.
 * Change an order's Status in the sheet and the customer's Track Order page shows it
 * (and, if enabled, the customer gets an email).
 *
 * Setup: see SETUP.md next to this file. In short: paste this into Extensions → Apps Script,
 * run `setup` once, then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 */

// ------------------------------------------------------------------ settings
var SHOP_NAME = 'Craft by Payal';
var SEND_STATUS_EMAILS = true;           // email the customer when you change their order's status
var ID_PREFIX = 'CBP-';                  // order numbers look like CBP-1001, CBP-1002, …
var FIRST_ORDER_NUMBER = 1001;

var STATUSES = ['Pending payment', 'Placed', 'Photos received', 'Preview sent', 'Approved',
                'Handcrafting', 'Dispatched', 'Delivered', 'Cancelled'];

// Column order of the Orders sheet (don't reorder after you start taking orders).
var COLUMNS = ['Order ID', 'Placed at', 'Status', 'Status updated', 'Name', 'Phone', 'Email',
               'Address', 'City', 'State', 'PIN', 'Items', 'Total (₹)', 'Payment', 'Payment ref',
               'Need by', 'Occasion', 'Gift message', 'Hide prices', 'Tracking link', 'Preview link', 'Private notes'];

// ------------------------------------------------------------------ one-time setup
function setup() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName('Orders') || ss.insertSheet('Orders');
  sh.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS])
    .setFontWeight('bold').setBackground('#F8D4CE');
  sh.setFrozenRows(1);
  sh.setColumnWidths(1, COLUMNS.length, 140);
  sh.setColumnWidth(col_('Items'), 320);
  sh.setColumnWidth(col_('Address'), 220);

  // Status dropdown
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  sh.getRange(2, col_('Status'), 2000, 1).setDataValidation(rule);

  // Status colours
  var colors = { 'Pending payment': '#FDE2A7', 'Placed': '#FFE9E5', 'Photos received': '#E8E1F6', 'Preview sent': '#DCEBFB',
                 'Approved': '#D6F0E3', 'Handcrafting': '#FBEED3', 'Dispatched': '#CDEFE4', 'Delivered': '#BFE6D5', 'Cancelled': '#E5E5E5' };
  var range = sh.getRange(2, col_('Status'), 2000, 1);
  var rules = Object.keys(colors).map(function (s) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(s).setBackground(colors[s]).setRanges([range]).build();
  });
  sh.setConditionalFormatRules(rules);

  // Summary sheet for a quick overview
  var sum = ss.getSheetByName('Summary') || ss.insertSheet('Summary');
  sum.clear();
  var s = "Orders!" + letter_('Status') + ":" + letter_('Status');
  var rows = [['Overview', ''],
              ['Open orders (not delivered / cancelled)', '=COUNTA(Orders!A2:A)-COUNTIF(' + s + ',"Delivered")-COUNTIF(' + s + ',"Cancelled")'],
              ['Orders this month', '=COUNTIFS(Orders!B2:B,">="&EOMONTH(TODAY(),-1)+1)'],
              ['Revenue this month (₹, excl. cancelled)', '=SUMIFS(Orders!' + letter_('Total (₹)') + '2:' + letter_('Total (₹)') + ',Orders!B2:B,">="&EOMONTH(TODAY(),-1)+1,' + s.replace(':', '2:') + ',"<>Cancelled")'],
              ['Due in the next 7 days', '=COUNTIFS(Orders!' + letter_('Need by') + '2:' + letter_('Need by') + ',"<="&TODAY()+7,Orders!' + letter_('Need by') + '2:' + letter_('Need by') + ',">="&TODAY(),' + s.replace(':', '2:') + ',"<>Delivered",' + s.replace(':', '2:') + ',"<>Cancelled")'],
              ['', ''], ['By status', '']];
  STATUSES.forEach(function (st) { rows.push([st, '=COUNTIF(' + s + ',"' + st + '")']); });
  sum.getRange(1, 1, rows.length, 2).setValues(rows);
  sum.getRange('A1').setFontWeight('bold').setFontSize(14);
  sum.getRange('A7').setFontWeight('bold');
  sum.setColumnWidth(1, 300);

  PropertiesService.getScriptProperties().setProperty('nextOrder', String(FIRST_ORDER_NUMBER));

  // Installable trigger so status changes can send emails
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'onStatusEdit') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onStatusEdit').forSpreadsheet(ss).onEdit().create();
  SpreadsheetApp.getUi && ss.toast('Order book is ready. Now deploy it as a web app.', SHOP_NAME, 8);
}

// ------------------------------------------------------------------ website → new order (POST)
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var body = JSON.parse(e.postData.contents || '{}');
    if (body.action === 'paid') return json_(markPaid_(body));
    var o = body.order || {};
    var err = validate_(o);
    if (err) return json_({ ok: false, error: err });

    var props = PropertiesService.getScriptProperties();
    var n = Number(props.getProperty('nextOrder') || FIRST_ORDER_NUMBER);
    props.setProperty('nextOrder', String(n + 1));
    var id = ID_PREFIX + n;

    var items = (o.lines || []).map(function (l) {
      return l.qty + ' × ' + l.name + (l.variant ? ' (' + l.variant + ')' : '') + (l.note ? ' — ' + l.note : '') + ' @ ₹' + l.price;
    }).join('\n');
    var status = o.payment === 'online' ? 'Pending payment' : 'Placed';
    var row = {
      'Order ID': id, 'Placed at': new Date(), 'Status': status, 'Status updated': new Date(),
      'Name': o.customer.name, 'Phone': "'" + o.customer.phone, 'Email': o.customer.email,
      'Address': [o.address.line1, o.address.line2].filter(String).join(', '), 'City': o.address.city,
      'State': o.address.state, 'PIN': "'" + o.address.pin, 'Items': items, 'Total (₹)': Number(o.total) || 0,
      'Payment': o.payment === 'online' ? 'Online' : 'WhatsApp / UPI', 'Payment ref': '',
      'Need by': o.gift && o.gift.needBy ? new Date(o.gift.needBy) : '', 'Occasion': (o.gift && o.gift.occasion) || '',
      'Gift message': (o.gift && o.gift.message) || '', 'Hide prices': o.gift && o.gift.hidePrice ? 'Yes' : '',
      'Tracking link': '', 'Preview link': '', 'Private notes': ''
    };
    sheet_().appendRow(COLUMNS.map(function (c) { return row[c]; }));
    return json_({ ok: true, id: id, status: status });
  } catch (x) {
    return json_({ ok: false, error: 'Server error' });
  } finally {
    lock.releaseLock();
  }
}

function markPaid_(body) {
  var r = findRow_(body.id, body.phone);
  if (!r) return { ok: false, error: 'Order not found' };
  var sh = sheet_();
  sh.getRange(r, col_('Payment ref')).setValue(String(body.ref || '').slice(0, 80));
  if (sh.getRange(r, col_('Status')).getValue() === 'Pending payment') {
    sh.getRange(r, col_('Status')).setValue('Placed');
    sh.getRange(r, col_('Status updated')).setValue(new Date());
  }
  return { ok: true };
}

// ------------------------------------------------------------------ website → track order (GET)
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action !== 'track') return json_({ ok: true, shop: SHOP_NAME });
  var r = findRow_(p.id, p.phone);
  if (!r) return json_({ ok: false, error: 'not_found' });
  var v = sheet_().getRange(r, 1, 1, COLUMNS.length).getValues()[0];
  var get = function (c) { return v[COLUMNS.indexOf(c)]; };
  // Only non-sensitive fields go back to the browser.
  return json_({
    ok: true, id: get('Order ID'), status: get('Status'), statuses: STATUSES,
    updated: fmt_(get('Status updated')), placed: fmt_(get('Placed at')),
    tracking: String(get('Tracking link') || ''), preview: String(get('Preview link') || ''),
    firstName: String(get('Name') || '').split(' ')[0]
  });
}

// ------------------------------------------------------------------ owner edits status → timestamp + email
function onStatusEdit(e) {
  var sh = e.range.getSheet();
  if (sh.getName() !== 'Orders' || e.range.getColumn() !== col_('Status') || e.range.getRow() < 2) return;
  var r = e.range.getRow();
  sh.getRange(r, col_('Status updated')).setValue(new Date());
  if (!SEND_STATUS_EMAILS) return;
  var email = sh.getRange(r, col_('Email')).getValue();
  if (!email) return;
  var id = sh.getRange(r, col_('Order ID')).getValue();
  var name = String(sh.getRange(r, col_('Name')).getValue()).split(' ')[0];
  var status = e.value;
  var extra = '';
  if (status === 'Dispatched') {
    var t = sh.getRange(r, col_('Tracking link')).getValue();
    if (t) extra = '\n\nTrack your parcel: ' + t;
  }
  if (status === 'Preview sent') {
    var pv = sh.getRange(r, col_('Preview link')).getValue();
    if (pv) extra = '\n\nSee your design preview: ' + pv;
  }
  MailApp.sendEmail({
    to: email,
    subject: SHOP_NAME + ' — order ' + id + ': ' + status,
    body: 'Hi ' + name + ',\n\nYour order ' + id + ' is now: ' + status + '.' + extra +
          '\n\nThank you for choosing ' + SHOP_NAME + ' 💛'
  });
}

// ------------------------------------------------------------------ helpers
function sheet_() { return SpreadsheetApp.getActive().getSheetByName('Orders'); }
function col_(name) { return COLUMNS.indexOf(name) + 1; }
function letter_(name) { return String.fromCharCode(64 + col_(name)); }
function digits_(s) { return String(s || '').replace(/\D/g, '').slice(-10); }
function fmt_(d) { return d instanceof Date ? Utilities.formatDate(d, Session.getScriptTimeZone(), 'd MMM yyyy') : String(d || ''); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function findRow_(id, phone) {
  id = String(id || '').trim().toUpperCase();
  phone = digits_(phone);
  if (!id || phone.length !== 10) return 0;
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var ids = sh.getRange(2, col_('Order ID'), last - 1, 1).getValues();
  var phones = sh.getRange(2, col_('Phone'), last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).toUpperCase() === id && digits_(phones[i][0]) === phone) return i + 2;
  }
  return 0;
}

function validate_(o) {
  if (!o.customer || !o.address || !o.lines || !o.lines.length) return 'Missing order details';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.customer.email || '')) return 'Invalid email';
  if (digits_(o.customer.phone).length !== 10) return 'Invalid phone';
  if (!/^[1-9]\d{5}$/.test(String(o.address.pin || ''))) return 'Invalid PIN';
  if (o.lines.length > 30) return 'Too many items';
  return '';
}

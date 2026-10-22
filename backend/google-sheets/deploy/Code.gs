// ===== Code.gs =====
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
var OWNER_PASSWORD = 'craftbypayal2025'; // change this to your own secret password

var STATUSES = ['Pending payment', 'Placed', 'Photos received', 'Preview sent', 'Approved',
                'Handcrafting', 'Dispatched', 'Delivered', 'Cancelled'];

// Column order of the Orders sheet (don't reorder after you start taking orders).
var COLUMNS = ['Order ID', 'Placed at', 'Status', 'Status updated', 'Name', 'Phone', 'Email',
               'Address', 'City', 'State', 'PIN', 'Items', 'Total (₹)', 'Payment', 'Payment ref',
               'Need by', 'Occasion', 'Gift message', 'Hide prices', 'Tracking link', 'Preview link', 'Private notes'];

// ------------------------------------------------------------------ one-time setup
function setup() {
  if (typeof cbpOwner_ === "function") cbpOwner_();
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

  if (!PropertiesService.getScriptProperties().getProperty('nextOrder')) {
    var next = FIRST_ORDER_NUMBER;
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function(row){var n=Number(String(row[0]).replace(/^CBP-/, ''));if(Number.isFinite(n))next=Math.max(next,n+1);});
    PropertiesService.getScriptProperties().setProperty('nextOrder', String(next));
  }

  // Installable trigger so status changes can send emails
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'onStatusEdit') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onStatusEdit').forSpreadsheet(ss).onEdit().create();
  SpreadsheetApp.getUi && ss.toast('Order book is ready. Now deploy it as a web app.', SHOP_NAME, 8);
}

// ------------------------------------------------------------------ website → new order (POST) + owner update status (POST)
function doPost(e) {
  if (PropertiesService.getScriptProperties().getProperty("CBP_PRODUCTION") === "true") return cbpPublicPost_(e);
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var body = JSON.parse(e.postData.contents || '{}');
    if (body.action === 'saveProduct') {
      if (body.pw !== OWNER_PASSWORD) return json_({ok:false,error:'Unauthorized'});
      return json_(saveProduct_(body));
    }
    if (body.action === 'paid') return json_({ok:false,error:'Payment must be verified by the owner.'});

    // Owner dashboard — update status
    if (body.action === 'updateStatus') {
      if (body.pw !== OWNER_PASSWORD) return json_({ ok: false, error: 'Unauthorized' });
      var sh = sheet_();
      var last = sh.getLastRow();
      if (last < 2) return json_({ ok: false, error: 'No orders' });
      var ids = sh.getRange(2, col_('Order ID'), last - 1, 1).getValues();
      var rowIdx = -1;
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]).toUpperCase() === String(body.id || '').toUpperCase()) { rowIdx = i + 2; break; }
      }
      if (rowIdx < 0) return json_({ ok: false, error: 'Order not found' });
      if (STATUSES.indexOf(body.status) < 0) return json_({ ok: false, error: 'Invalid status' });
      sh.getRange(rowIdx, col_('Status')).setValue(body.status);
      sh.getRange(rowIdx, col_('Status updated')).setValue(new Date());
      // Send email if enabled
      if (SEND_STATUS_EMAILS) {
        var email = sh.getRange(rowIdx, col_('Email')).getValue();
        var name = String(sh.getRange(rowIdx, col_('Name')).getValue()).split(' ')[0];
        var extra = '';
        if (body.status === 'Dispatched') { var t = sh.getRange(rowIdx, col_('Tracking link')).getValue(); if (t) extra = '\n\nTrack your parcel: ' + t; }
        if (body.status === 'Preview sent') { var pv = sh.getRange(rowIdx, col_('Preview link')).getValue(); if (pv) extra = '\n\nSee your design preview: ' + pv; }
        if (email) MailApp.sendEmail({ to: email, subject: SHOP_NAME + ' — order ' + body.id + ': ' + body.status,
          body: 'Hi ' + name + ',\n\nYour order ' + body.id + ' is now: ' + body.status + '.' + extra + '\n\nThank you for choosing ' + SHOP_NAME + ' 💛' });
      }
      return json_({ ok: true });
    }

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

// ------------------------------------------------------------------ website → track order (GET) + owner list (GET)
function doGet(e) {
  if (PropertiesService.getScriptProperties().getProperty("CBP_PRODUCTION") === "true") return cbpPublicGet_(e);
  var p = (e && e.parameter) || {};

  if (p.action === 'catalog') return json_({ok:true,products:productRows_()});
  if (p.action === 'listProducts') {
    if (p.pw !== OWNER_PASSWORD) return json_({ok:false,error:'Unauthorized'});
    return json_({ok:true,products:productRows_()});
  }

  // Owner dashboard — list all orders
  if (p.action === 'listOrders') {
    if (p.pw !== OWNER_PASSWORD) return json_({ ok: false, error: 'Unauthorized' });
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last < 2) return json_({ ok: true, orders: [], statuses: STATUSES });
    var vals = sh.getRange(2, 1, last - 1, COLUMNS.length).getValues();
    var orders = vals.map(function (v) {
      var get = function (c) { return v[COLUMNS.indexOf(c)]; };
      return {
        id: get('Order ID'), name: String(get('Name') || ''), status: get('Status'),
        placed: fmt_(get('Placed at')), updated: fmt_(get('Status updated')),
        total: get('Total (₹)'), items: String(get('Items') || '').split('\n').length
      };
    }).filter(function (o) { return o.id; }).reverse();
    return json_({ ok: true, orders: orders, statuses: STATUSES });
  }

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
  if (!e || !e.range) return;
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

// Product overrides are kept separately from the bundled catalogue. Hidden records
// remain public tombstones so the storefront can suppress their bundled versions.
function productsSheet_() {
  var ss=SpreadsheetApp.getActive();
  var sh=ss.getSheetByName('Products');
  if(!sh){sh=ss.insertSheet('Products');sh.appendRow(['Product ID','Product JSON','Updated at']);sh.setFrozenRows(1);}
  return sh;
}
function productRows_() {
  var sh=productsSheet_();
  if(sh.getLastRow()<2)return [];
  return sh.getRange(2,2,sh.getLastRow()-1,1).getValues().map(function(r){return JSON.parse(r[0]);});
}
function saveProduct_(body) {
  var p=body.product||{};
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id||'')||p.id.length>100)return {ok:false,error:'Use a short lowercase product ID with hyphens.'};
  if(typeof p.name!=='string'||!p.name.trim()||p.name.length>150)return {ok:false,error:'Enter a product name (up to 150 characters).'};
  if(typeof p.description!=='string'||p.description.length>5000)return {ok:false,error:'Description must be under 5,000 characters.'};
  if(!Array.isArray(p.images)||!p.images.length||p.images.length>8||p.images.some(function(u){return typeof u!=='string'||!/^https:\/\/[^\s<>"']+$/.test(u)||u.length>2000;}))return {ok:false,error:'Add one to eight public HTTPS image URLs.'};
  if(!Array.isArray(p.variants)||!p.variants.length||p.variants.length>40)return {ok:false,error:'Add between one and 40 variants.'};
  if(p.variants.some(function(v){return typeof v.price!=='number'||!isFinite(v.price)||v.price<=0||v.price>1000000||typeof v.size!=='string'||v.size.length>100||typeof v.light!=='string'||v.light.length>100||typeof v.available!=='boolean';}))return {ok:false,error:'Check variant names, prices and availability.'};
  var combos={};
  if(p.variants.some(function(v){var k=v.size+'|'+v.light;if(combos[k])return true;combos[k]=true;return false;}))return {ok:false,error:'Each size and lighting combination must be unique.'};
  var clean={id:p.id,name:p.name.trim(),description:p.description.trim(),images:p.images,
    variants:p.variants.map(function(v){return {size:v.size.trim(),light:v.light.trim(),price:v.price,available:v.available};}),
    visible:p.visible!==false,featured:p.featured===true,updated:new Date().toISOString()};
  ['occasion','theme'].forEach(function(k){clean[k]=Array.isArray(p[k])?p[k].slice(0,20).map(function(x){return String(x).slice(0,100);}):[];});
  clean.price=Math.min.apply(null,clean.variants.map(function(v){return v.price;}));
  clean.priceFrom=clean.variants.some(function(v){return v.price!==clean.price;});
  clean.inStock=clean.variants.some(function(v){return v.available;});
  clean.image=clean.images[0];clean.image2=clean.images[1]||'';clean.alt=clean.name;
  clean.size=clean.variants.map(function(v){return v.size;}).filter(String);
  clean.light=clean.variants.map(function(v){return v.light;}).filter(String);
  clean.created=p.created||new Date().toISOString().slice(0,10);clean.order=0;
  var sh=productsSheet_(),existing=productRows_(),index=existing.findIndex(function(x){return x.id===clean.id;});
  if(body.create&&index>=0)return {ok:false,error:'That product ID already exists. Choose another.'};
  if(index>=0&&body.updated!==existing[index].updated)return {ok:false,error:'This product changed in another session. Reload products before editing again.'};
  var row=[clean.id,JSON.stringify(clean),new Date()];
  if(row[1].length>45000)return {ok:false,error:'Product details are too long.'};
  if(index<0)sh.appendRow(row);else sh.getRange(index+2,1,1,3).setValues([row]);
  return {ok:true,product:clean};
}

// ===== Production.gs =====
/** Sheets production backend. Install beside Code.gs; see PRODUCTION.md. */
var CBP_TABLES = {
  'Shop Products':['Product ID','Name','Description','State','Featured','Occasions','Themes','Version','Updated at'],
  'Shop Variants':['Variant ID','Product ID','Size','Lighting','Price paise','Available'],
  'Shop Images':['Image ID','Product ID','URL','Alt text','Position'],
  'Published Products':['Publication','Product ID','Name','Description','Featured','Occasions','Themes','Version','Updated at'],
  'Published Variants':['Publication','Variant ID','Product ID','Size','Lighting','Price paise','Available'],
  'Published Images':['Publication','Image ID','Product ID','URL','Alt text','Position'],
  'Shop Orders':['Order ID','Order number','Request ID','Created at','Name','Phone','Email','Address','City','State','PIN','Subtotal paise','Shipping paise','Total paise','Order status','Payment status','Production status','Delivery status','Need by','Occasion','Gift message','Hide prices','Access hash','Upload hash','Upload expires','Tracking URL','Private notes'],
  'Shop Order Items':['Line ID','Order ID','Product ID','Variant ID','Name','Options','Quantity','Unit price paise','Personalisation'],
  'Shop Payments':['Payment ID','Order ID','Amount paise','Reference','Verified by','Verified at'],
  'Shop Operations':['Request ID','Fingerprint','State','Order ID','Payload','Updated at','Error'],
  'Shop Events':['Event ID','Order ID','Type','Actor','Created at','Details'],
  'Shop Notifications':['Job ID','Order ID','Event','State','Attempts','Next attempt','Claimed at','Error'],
  'Shop Photos':['Upload ID','Order ID','State','File ID','Name','Content hash','Type','Bytes','Created at'],
  'Shop Settings':['Key','Value'],
  'Shop Health':['Timestamp','Operation','Reference','Message']
};
function cbpProps_(){return PropertiesService.getScriptProperties();}
function cbpSS_(){var active=SpreadsheetApp.getActiveSpreadsheet();if(active)return active;var id=cbpProps_().getProperty('CBP_SPREADSHEET_ID');if(!id)cbpError_('NOT_CONFIGURED','Set up the bound spreadsheet before deploying.');return SpreadsheetApp.openById(id);}
function cbpError_(code,message){var e=new Error(message);e.code=code;throw e;}
function cbpId_(){return Utilities.getUuid();}
function cbpToken_(requestId,scope){var secret=cbpProps_().getProperty('CBP_TOKEN_SECRET');if(!secret)cbpError_('NOT_CONFIGURED','Token signing is not configured.');return cbpHash_(secret+':'+scope+':'+requestId);}
function cbpHash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s)).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function cbpSafe_(v){return typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?"'"+v:v;}
function cbpRows_(name){var sh=cbpSS_().getSheetByName(name);if(!sh)cbpError_('NOT_CONFIGURED','Run setupProduction in the staging spreadsheet first.');var values=sh.getDataRange().getValues(),keys=values.shift();return values.map(function(r,i){var o={_row:i+2};keys.forEach(function(k,j){o[k]=r[j];});return o;}).filter(function(r){return r[keys[0]]!=='';});}
function cbpAppend_(name,records){if(!records.length)return;var sh=cbpSS_().getSheetByName(name),keys=CBP_TABLES[name];sh.getRange(sh.getLastRow()+1,1,records.length,keys.length).setValues(records.map(function(r){return keys.map(function(k){return cbpSafe_(r[k]===undefined?'':r[k]);});}));}
function cbpUpdate_(name,record,patch){var sh=cbpSS_().getSheetByName(name),keys=CBP_TABLES[name],merged=Object.assign({},record,patch);sh.getRange(record._row,1,1,keys.length).setValues([keys.map(function(k){return cbpSafe_(merged[k]===undefined?'':merged[k]);})]);return merged;}
function cbpLock_(fn){var lock=LockService.getScriptLock();if(!lock.tryLock(3000))cbpError_('BUSY','The shop is busy. Retry this same request shortly.');try{return fn();}finally{lock.releaseLock();}}
function cbpSettings_(){var s={};cbpRows_('Shop Settings').forEach(function(r){s[r.Key]=r.Value;});return s;}
function cbpOwner_(){var active=Session.getActiveUser().getEmail(),owner=cbpProps_().getProperty('CBP_OWNER_EMAIL')||cbpSS_().getOwner().getEmail();if(!active||active!==owner)cbpError_('UNAUTHORIZED','Open these tools from the owner’s Google spreadsheet account.');return active;}
function cbpText_(v,max,label,required){if(typeof v!=='string'||v.length>max||(required&&!v.trim()))cbpError_('VALIDATION','Check '+label+'.');return v.trim();}
function cbpHttps_(s){return typeof s==='string'&&/^https:\/\/[^\s<>"']+$/.test(s)&&s.length<=2000;}
function cbpHealth_(operation,reference,message){try{cbpAppend_('Shop Health',[{'Timestamp':new Date(),'Operation':operation,'Reference':reference,'Message':String(message).slice(0,500)}]);}catch(ignored){}}
function onOpen(){SpreadsheetApp.getUi().createMenu('Craft by Payal').addItem('Owner tools','openOwnerTools').addItem('Validate and publish catalogue','publishCatalogue').addItem('Process pending notifications','processShopJobs').addItem('Repair pending orders','repairShopOrders').addItem('Create backup','backupShop').addToUi();}
function setupProduction(){
  cbpOwner_();
  Object.keys(CBP_TABLES).forEach(function(name){var sh=cbpSS_().getSheetByName(name);if(!sh){sh=cbpSS_().insertSheet(name);sh.appendRow(CBP_TABLES[name]);sh.setFrozenRows(1);sh.getRange(1,1,1,CBP_TABLES[name].length).setFontWeight('bold').setBackground('#F7D2B8');}else{var header=sh.getRange(1,1,1,CBP_TABLES[name].length).getValues()[0];if(JSON.stringify(header)!==JSON.stringify(CBP_TABLES[name]))cbpError_('SCHEMA','Unexpected columns in '+name+'. Migration stopped without changing that table.');}});
  if(!cbpRows_('Shop Settings').length)cbpAppend_('Shop Settings',[{Key:'Shipping fee paise',Value:9900},{Key:'Free shipping threshold paise',Value:99900},{Key:'Accept orders',Value:false},{Key:'Website URL',Value:''},{Key:'Upload max bytes',Value:5242880},{Key:'Upload max count',Value:10}]);
  if(!cbpProps_().getProperty('CBP_UPLOAD_ROOT')){var folder=DriveApp.createFolder('Craft by Payal - private order photos');cbpProps_().setProperty('CBP_UPLOAD_ROOT',folder.getId());}
  if(!cbpProps_().getProperty('CBP_NEXT_ORDER')){var next=Number(cbpProps_().getProperty('nextOrder')||1001),old=cbpSS_().getSheetByName('Orders');if(old&&old.getLastRow()>1)old.getRange(2,1,old.getLastRow()-1,1).getValues().forEach(function(r){var n=Number(String(r[0]).replace(/^CBP-/,''));if(Number.isFinite(n))next=Math.max(next,n+1);});cbpProps_().setProperty('CBP_NEXT_ORDER',String(next));}
  if(!cbpProps_().getProperty('CBP_TOKEN_SECRET'))cbpProps_().setProperty('CBP_TOKEN_SECRET',cbpId_()+cbpId_());
  cbpProps_().setProperty('CBP_OWNER_EMAIL',Session.getActiveUser().getEmail());
  ['Published Products','Published Variants','Published Images','Shop Operations','Shop Notifications','Shop Photos','Shop Health','Shop Events'].forEach(function(n){var sh=cbpSS_().getSheetByName(n);if(!sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).length){var protection=sh.protect().setDescription('Managed by Craft by Payal');protection.addEditor(Session.getEffectiveUser());protection.removeEditors(protection.getEditors().filter(function(u){return u.getEmail()!==Session.getEffectiveUser().getEmail();}));if(protection.canDomainEdit())protection.setDomainEdit(false);}});
  var dropdown=SpreadsheetApp.newDataValidation().requireValueInList(['draft','published','archived'],true).setAllowInvalid(false).build();cbpSS_().getSheetByName('Shop Products').getRange(2,4,2000,1).setDataValidation(dropdown);
  var checkbox=SpreadsheetApp.newDataValidation().requireCheckbox().build();cbpSS_().getSheetByName('Shop Products').getRange(2,5,2000,1).setDataValidation(checkbox);cbpSS_().getSheetByName('Shop Variants').getRange(2,6,2000,1).setDataValidation(checkbox);
  return {ok:true,message:'Production tables created. Existing tables and order counters were not changed.'};
}
function cbpCatalogueFrom_(prefix,publication){
  var live=prefix==='Published ',products=cbpRows_(prefix+'Products'),variants=cbpRows_(prefix+'Variants'),images=cbpRows_(prefix+'Images');
  if(live){products=products.filter(function(r){return r.Publication===publication;});variants=variants.filter(function(r){return r.Publication===publication;});images=images.filter(function(r){return r.Publication===publication;});}
  var ids={},vids={};
  var result=products.filter(function(p){return live||p.State==='published';}).map(function(p){
    var id=String(p['Product ID']);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)||ids[id])cbpError_('VALIDATION','Invalid or duplicate product ID: '+id);ids[id]=true;
    var name=cbpText_(p.Name,150,'product name',true),desc=cbpText_(p.Description,5000,'description',true);
    var vs=variants.filter(function(v){return v['Product ID']===id;}).map(function(v){var vid=String(v['Variant ID']),price=Number(v['Price paise']);if(!/^[a-zA-Z0-9_-]{1,100}$/.test(vid)||vids[vid]||!Number.isSafeInteger(price)||price<=0||price>100000000)cbpError_('VALIDATION','Check variant ID and price for '+id);vids[vid]=true;return {id:vid,size:cbpText_(v.Size,100,'size',true),light:cbpText_(v.Lighting,100,'lighting',false),price:price/100,available:v.Available===true};});
    var photos=images.filter(function(i){return i['Product ID']===id;}).sort(function(a,b){return Number(a.Position)-Number(b.Position);});
    if(!vs.length||vs.length>40||!photos.length||photos.length>8||photos.some(function(i){return !cbpHttps_(i.URL);}))cbpError_('VALIDATION','Add 1–40 variants and 1–8 HTTPS image links for '+id);
    var combos={};vs.forEach(function(v){var k=v.size+'|'+v.light;if(combos[k])cbpError_('VALIDATION','Duplicate size/lighting for '+id);combos[k]=true;});
    var available=vs.filter(function(v){return v.available;}),price=Math.min.apply(null,(available.length?available:vs).map(function(v){return v.price;}));
    return {id:id,name:name,description:desc,visible:true,managed:true,featured:p.Featured===true,variants:vs,images:photos.map(function(i){return i.URL;}),image:photos[0].URL,image2:photos[1]?photos[1].URL:'',alt:photos[0]['Alt text']||name,price:price,priceFrom:vs.some(function(v){return v.price!==price;}),inStock:!!available.length,size:vs.map(function(v){return v.size;}),light:vs.map(function(v){return v.light;}).filter(String),occasion:String(p.Occasions||'').split(',').map(function(s){return s.trim();}).filter(String),theme:String(p.Themes||'').split(',').map(function(s){return s.trim();}).filter(String),order:resultOrder_(p),created:'2026-01-01',version:String(p.Version||1)};
  });return result;
}
function resultOrder_(p){return p._row-2;}
function publishCatalogue(){cbpOwner_();return cbpLock_(function(){var products=cbpCatalogueFrom_('Shop '),version=cbpId_();if(!products.length)cbpError_('VALIDATION','Publish at least one product.');['Products','Variants','Images'].forEach(function(type){var source=cbpRows_('Shop '+type).filter(function(r){return products.some(function(p){return p.id===r['Product ID'];});});cbpAppend_('Published '+type,source.map(function(r){return Object.assign({},r,{Publication:version});}));});SpreadsheetApp.flush();cbpProps_().setProperty('CBP_PUBLICATION',version);return {ok:true,version:version,count:products.length};});}
function cbpCatalog_(){var version=cbpProps_().getProperty('CBP_PUBLICATION');if(!version)cbpError_('NOT_PUBLISHED','The shop catalogue is not published yet.');var cached=CacheService.getScriptCache().get('catalog:'+version),products=cached?JSON.parse(cached):cbpCatalogueFrom_('Published ',version);if(!cached){var encoded=JSON.stringify(products);if(encoded.length<85000)CacheService.getScriptCache().put('catalog:'+version,encoded,300);}var settings=cbpSettings_();return {ok:true,schema:2,version:version,products:products,shipping:{fee:Number(settings['Shipping fee paise'])/100,freeAbove:Number(settings['Free shipping threshold paise'])/100}};}
function cbpNormalOrder_(o){
  if(!o||!Array.isArray(o.lines)||!o.lines.length||o.lines.length>30)cbpError_('VALIDATION','Choose between one and 30 items.');
  if(o.payment!=='whatsapp')cbpError_('PAYMENT_DISABLED','Only owner-verified UPI/WhatsApp orders are enabled.');
  var c=o.customer||{},a=o.address||{},g=o.gift||{};
  var customer={name:cbpText_(c.name,150,'customer name',true),email:cbpText_(c.email,254,'email',true),phone:String(c.phone||'')};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)||!/^[6-9]\d{9}$/.test(customer.phone))cbpError_('VALIDATION','Check email and mobile number.');
  var address={line1:cbpText_(a.line1,300,'street address',true),line2:cbpText_(a.line2||'',300,'address line 2',false),city:cbpText_(a.city,100,'city',true),state:cbpText_(a.state,100,'state',true),pin:String(a.pin||'')};
  if(!/^[1-9]\d{5}$/.test(address.pin))cbpError_('VALIDATION','Check delivery PIN.');
  if(g.needBy&&!/^\d{4}-\d{2}-\d{2}$/.test(g.needBy))cbpError_('VALIDATION','Check requested date.');
  return {payment:'whatsapp',customer:customer,address:address,gift:{needBy:g.needBy||'',occasion:cbpText_(g.occasion||'',100,'occasion',false),message:cbpText_(g.message||'',1000,'gift message',false),hidePrice:g.hidePrice===true},lines:o.lines.map(function(l){if(!Number.isInteger(l.qty)||l.qty<1||l.qty>20)cbpError_('VALIDATION','Quantity must be between 1 and 20.');return {id:cbpText_(l.id,100,'product ID',true),variantId:cbpText_(l.variantId||'',100,'variant ID',true),qty:l.qty,note:cbpText_(l.note||'',1500,'personalisation',false)};})};
}
function cbpQuote_(input){var o=cbpNormalOrder_(input),catalog=cbpCatalog_(),settings=cbpSettings_();var stagingExpiry=cbpProps_().getProperty('CBP_STAGING_ACCEPT_UNTIL');if(settings['Accept orders']!==true||(stagingExpiry&&Number(stagingExpiry)<Date.now()))cbpError_('SHOP_CLOSED','The shop is not accepting orders yet.');var subtotal=0;var lines=o.lines.map(function(l){var p=catalog.products.find(function(p){return p.id===l.id;}),v=p&&p.variants.find(function(v){return v.id===l.variantId;});if(!v||!v.available)cbpError_('UNAVAILABLE','One of your selected options is no longer available. Review your cart.');var amount=Math.round(v.price*100);subtotal+=amount*l.qty;return Object.assign({},l,{name:p.name,image:p.image,managed:true,variant:[v.size,v.light].filter(Boolean).join(' · '),price:amount/100});});var fee=Number(settings['Shipping fee paise']),threshold=Number(settings['Free shipping threshold paise']);if(!Number.isSafeInteger(fee)||fee<0||!Number.isSafeInteger(threshold)||threshold<0)cbpError_('CONFIGURATION','Shipping settings need owner review.');var shipping=subtotal>=threshold?0:fee;var quote={lines:lines,subtotal:subtotal/100,shipping:shipping/100,total:(subtotal+shipping)/100,version:catalog.version};quote.fingerprint=cbpHash_(JSON.stringify({order:o,version:catalog.version,subtotal:subtotal,shipping:shipping}));quote.expiresAt=Date.now()+15*60000;quote.token=cbpHash_(cbpProps_().getProperty('CBP_TOKEN_SECRET')+':quote:'+quote.fingerprint+':'+quote.expiresAt);return {ok:true,schema:2,quote:quote};}
function cbpRecordOrder_(operation,o,quote,accessHash,uploadHash){
  var id=operation['Order ID'],orders=cbpRows_('Shop Orders'),order=orders.find(function(r){return r['Order ID']===id;});
  if(!order){var number=Number(cbpProps_().getProperty('CBP_NEXT_ORDER')||1001);cbpProps_().setProperty('CBP_NEXT_ORDER',String(number+1));cbpAppend_('Shop Orders',[{'Order ID':id,'Order number':'CBP-'+number,'Request ID':operation['Request ID'],'Created at':new Date(),Name:o.customer.name,Phone:o.customer.phone,Email:o.customer.email,Address:[o.address.line1,o.address.line2].filter(String).join(', '),City:o.address.city,State:o.address.state,PIN:o.address.pin,'Subtotal paise':Math.round(quote.subtotal*100),'Shipping paise':Math.round(quote.shipping*100),'Total paise':Math.round(quote.total*100),'Order status':'Awaiting confirmation','Payment status':'Pending','Production status':'Awaiting photos','Delivery status':'Not dispatched','Need by':o.gift.needBy,Occasion:o.gift.occasion,'Gift message':o.gift.message,'Hide prices':o.gift.hidePrice,'Access hash':accessHash,'Upload hash':uploadHash,'Upload expires':new Date(Date.now()+7*86400000)}]);order=cbpRows_('Shop Orders').find(function(r){return r['Order ID']===id;});}
  var existing=cbpRows_('Shop Order Items');cbpAppend_('Shop Order Items',quote.lines.map(function(l,i){return {'Line ID':id+'-'+i,'Order ID':id,'Product ID':l.id,'Variant ID':l.variantId,Name:l.name,Options:l.variant,Quantity:l.qty,'Unit price paise':Math.round(l.price*100),Personalisation:l.note};}).filter(function(l){return !existing.some(function(r){return r['Line ID']===l['Line ID'];});}));
  var jobs=cbpRows_('Shop Notifications');['customer-created','owner-created'].forEach(function(event){var job=id+':'+event;if(!jobs.some(function(j){return j['Job ID']===job;}))cbpAppend_('Shop Notifications',[{'Job ID':job,'Order ID':id,Event:event,State:'Pending',Attempts:0,'Next attempt':new Date()}]);});
  cbpUpdate_('Shop Operations',operation,{State:'Complete','Updated at':new Date(),Error:''});return order;
}
function cbpCreate_(body){
  if(!/^[a-f0-9-]{36}$/i.test(body.requestId||''))cbpError_('VALIDATION','A valid checkout request ID is required.');
  var o=cbpNormalOrder_(body.order),fingerprint=cbpHash_(JSON.stringify(o));
  return cbpLock_(function(){var op=cbpRows_('Shop Operations').find(function(r){return r['Request ID']===body.requestId;});var quote;
    if(op){if(op.Fingerprint!==fingerprint)cbpError_('CONFLICT','This checkout attempt belongs to different details. Check its result before starting another.');var payload=JSON.parse(op.Payload);quote=payload.quote;}
    else{quote=cbpQuote_(o).quote;if(!Number.isSafeInteger(body.quoteExpires)||body.quoteExpires<Date.now()||body.quoteExpires>Date.now()+16*60000||body.quoteToken!==cbpHash_(cbpProps_().getProperty('CBP_TOKEN_SECRET')+':quote:'+body.quoteFingerprint+':'+body.quoteExpires))cbpError_('QUOTE_EXPIRED','Your quote expired. Review prices again.');if(body.quoteFingerprint!==quote.fingerprint)cbpError_('QUOTE_CHANGED','Prices or availability changed. Review the updated quote.');var recent=cbpRows_('Shop Orders').filter(function(r){return r.Email===o.customer.email&&Date.now()-new Date(r['Created at']).getTime()<3600000;});if(recent.length>=5)cbpError_('RATE_LIMIT','Too many recent orders for this email. Contact the studio.');var access=cbpHash_(cbpToken_(body.requestId,'track')),upload=cbpHash_(cbpToken_(body.requestId,'upload'));var payload={order:o,quote:quote,accessHash:access,uploadHash:upload};if(JSON.stringify(payload).length>40000)cbpError_('VALIDATION','Order details are too long. Shorten personalisation notes.');cbpAppend_('Shop Operations',[{'Request ID':body.requestId,Fingerprint:fingerprint,State:'Pending','Order ID':cbpId_(),Payload:JSON.stringify(payload),'Updated at':new Date()}]);op=cbpRows_('Shop Operations').find(function(r){return r['Request ID']===body.requestId;});}
    var data=JSON.parse(op.Payload),order=op.State==='Complete'?cbpRows_('Shop Orders').find(function(o){return o['Order ID']===op['Order ID'];}):cbpRecordOrder_(op,data.order,data.quote,data.accessHash,data.uploadHash);if(!order)cbpError_('RECOVERY_REQUIRED','The order needs studio review before retrying.');
    return {ok:true,schema:2,id:order['Order number'],orderId:order['Order ID'],quote:quote,accessToken:cbpToken_(body.requestId,'track'),uploadToken:cbpToken_(body.requestId,'upload'),uploadUrl:ScriptApp.getService().getUrl()+'?page=upload',status:order['Order status']};
  });
}
function cbpAccessOrder_(id,token,upload){var order=cbpRows_('Shop Orders').find(function(r){return r['Order ID']===id;});if(!order||typeof token!=='string'||cbpHash_(token)!==order[upload?'Upload hash':'Access hash'])cbpError_('NOT_FOUND','Order access could not be verified.');if(upload&&(new Date(order['Upload expires']).getTime()<Date.now()||order['Order status']==='Cancelled'))cbpError_('EXPIRED','This upload link has expired. Contact the shop.');return order;}
function cbpTrack_(body){var o=cbpAccessOrder_(body.orderId,body.token,false);return {ok:true,schema:2,id:o['Order number'],status:o['Production status'],payment:o['Payment status'],delivery:o['Delivery status'],tracking:cbpHttps_(o['Tracking URL'])?o['Tracking URL']:'',firstName:String(o.Name).split(' ')[0],updated:String(o['Created at'])};}
function cbpDispatch_(body){if(!body||typeof body!=='object')cbpError_('VALIDATION','Invalid request.');switch(body.action){case 'quote':return cbpQuote_(body.order);case 'create':return cbpCreate_(body);case 'trackSecure':return cbpTrack_(body);case 'paid':cbpError_('FORBIDDEN','Payments are verified by the owner only.');default:cbpError_('UNKNOWN_ACTION','Unsupported request. Use owner tools in Google Sheets for management.');}}
function cbpPublicPost_(e){try{if(!e||!e.postData||e.postData.contents.length>100000)cbpError_('VALIDATION','Invalid or oversized request.');var body=JSON.parse(e.postData.contents||'{}');if(body.action==='saveProduct'){if(body.pw!==OWNER_PASSWORD)return json_({ok:false,error:'Unauthorized'});return json_(saveProduct_(body));}if(body.action==='updateStatus'){if(body.pw!==OWNER_PASSWORD)return json_({ok:false,error:'Unauthorized'});return json_(cbpUpdateOrderStatus_(body));}return json_(cbpDispatch_(body));}catch(err){var code=err.code||'SERVER_ERROR';if(code==='SERVER_ERROR')cbpHealth_('request','',err.message);return json_({ok:false,code:code,error:code==='SERVER_ERROR'?'The shop could not complete this request. Retry the same attempt.':err.message});}}
function cbpPublicGet_(e){var p=e&&e.parameter||{};try{if(p.page==='upload')return HtmlService.createHtmlOutputFromFile('Upload').setTitle('Share your photos | Craft by Payal');if(p.action==='catalog')return json_(cbpCatalog_());if(p.action==='listProducts'){if(p.pw!==OWNER_PASSWORD)return json_({ok:false,error:'Unauthorized'});return json_({ok:true,products:productRows_()});}if(p.action==='listOrders'){if(p.pw!==OWNER_PASSWORD)return json_({ok:false,error:'Unauthorized'});return json_(cbpListOrdersWeb_());}if(p.action==='track')return json_(cbpTrackPublic_(p.id,p.phone));return json_({ok:false,code:'UNSUPPORTED',error:'Use a secure order link or the Google Sheets owner tools.'});}catch(err){return json_({ok:false,code:err.code||'SERVER_ERROR',error:err.code?err.message:'The catalogue could not be loaded.'});}}
function cbpListOrdersWeb_(){var orders=[];var sh=cbpSS_().getSheetByName('Shop Orders');if(sh&&sh.getLastRow()>1){orders=cbpRows_('Shop Orders').map(function(o){return {id:o['Order number']||o['Order ID'],name:String(o.Name||''),status:o['Order status']||'Placed',placed:fmt_(o['Created at']),updated:fmt_(o['Created at']),total:(Number(o['Total paise'])||0)/100,items:1};});}else{var shOld=cbpSS_().getSheetByName('Orders');if(shOld&&shOld.getLastRow()>1){var vals=shOld.getRange(2,1,shOld.getLastRow()-1,COLUMNS.length).getValues();orders=vals.map(function(v){var get=function(c){return v[COLUMNS.indexOf(c)];};return {id:get('Order ID'),name:String(get('Name')||''),status:get('Status'),placed:fmt_(get('Placed at')),updated:fmt_(get('Status updated')),total:get('Total (₹)'),items:String(get('Items')||'').split('\n').length};}).filter(function(o){return o.id;});}}return {ok:true,orders:orders.slice(-100).reverse(),statuses:STATUSES};}
function cbpUpdateOrderStatus_(body){var id=String(body.id||'').trim().toUpperCase();var nextStatus=body.status;if(STATUSES.indexOf(nextStatus)<0)return {ok:false,error:'Invalid status'};var sh=cbpSS_().getSheetByName('Shop Orders');if(sh&&sh.getLastRow()>1){var orders=cbpRows_('Shop Orders');var o=orders.find(function(r){return String(r['Order number']).toUpperCase()===id||String(r['Order ID']).toUpperCase()===id;});if(o){cbpUpdate_('Shop Orders',o,{'Order status':nextStatus});cbpAppend_('Shop Events',[{'Event ID':cbpId_(),'Order ID':o['Order ID'],Type:'status-update',Actor:'web-admin','Created at':new Date(),Details:nextStatus}]);if(SEND_STATUS_EMAILS&&o.Email){try{MailApp.sendEmail({to:o.Email,subject:SHOP_NAME+' — order '+o['Order number']+': '+nextStatus,body:'Hi '+String(o.Name||'').split(' ')[0]+',\n\nYour order '+o['Order number']+' is now: '+nextStatus+'.\n\nThank you for choosing '+SHOP_NAME+' 💛'});}catch(e){cbpHealth_('email',o['Order number'],e.message);}}return {ok:true};}}var shOld=cbpSS_().getSheetByName('Orders');if(shOld&&shOld.getLastRow()>1){var ids=shOld.getRange(2,col_('Order ID'),shOld.getLastRow()-1,1).getValues();for(var i=0;i<ids.length;i++){if(String(ids[i][0]).toUpperCase()===id){var rowIdx=i+2;shOld.getRange(rowIdx,col_('Status')).setValue(nextStatus);shOld.getRange(rowIdx,col_('Status updated')).setValue(new Date());return {ok:true};}}}return {ok:false,error:'Order not found'};}
function cbpTrackPublic_(id,phone){id=String(id||'').trim().toUpperCase();phone=digits_(phone);if(!id||phone.length!==10)return {ok:false,error:'not_found'};var sh=cbpSS_().getSheetByName('Shop Orders');if(sh&&sh.getLastRow()>1){var orders=cbpRows_('Shop Orders');var o=orders.find(function(r){return (String(r['Order number']).toUpperCase()===id||String(r['Order ID']).toUpperCase()===id)&&digits_(r.Phone)===phone;});if(o){return {ok:true,id:o['Order number'],status:o['Order status']||'Placed',statuses:STATUSES,updated:fmt_(o['Created at']),placed:fmt_(o['Created at']),tracking:cbpHttps_(o['Tracking URL'])?o['Tracking URL']:'',preview:'',firstName:String(o.Name||'').split(' ')[0]};}}var shOld=cbpSS_().getSheetByName('Orders');if(shOld&&shOld.getLastRow()>1){var r=findRow_(id,phone);if(r){var v=shOld.getRange(r,1,1,COLUMNS.length).getValues()[0];var get=function(c){return v[COLUMNS.indexOf(c)];};return {ok:true,id:get('Order ID'),status:get('Status'),statuses:STATUSES,updated:fmt_(get('Status updated')),placed:fmt_(get('Placed at')),tracking:String(get('Tracking link')||''),preview:String(get('Preview link')||''),firstName:String(get('Name')||'').split(' ')[0]};}}return {ok:false,error:'not_found'};}
function repairShopOrders(){cbpOwner_();return cbpLock_(function(){var count=0;cbpRows_('Shop Operations').filter(function(o){return o.State!=='Complete';}).forEach(function(op){try{var data=JSON.parse(op.Payload);cbpRecordOrder_(op,data.order,data.quote,data.accessHash,data.uploadHash);count++;}catch(e){cbpHealth_('repair',op['Request ID'],e.message);}});return {ok:true,repaired:count};});}
function processShopJobs(){cbpOwner_();return cbpProcessJobs_();}
function cbpProcessJobs_(){
  var jobs=cbpLock_(function(){var now=Date.now();return cbpRows_('Shop Notifications').filter(function(j){return ((j.State==='Pending'||j.State==='Retry')&&new Date(j['Next attempt']).getTime()<=now)||(j.State==='Sending'&&now-new Date(j['Claimed at']).getTime()>600000);}).slice(0,10).map(function(j){return cbpUpdate_('Shop Notifications',j,{State:'Sending','Claimed at':new Date(),Attempts:Number(j.Attempts)+1});});});
  jobs.forEach(function(j){try{if(MailApp.getRemainingDailyQuota()<1)throw Error('Email quota exhausted');var o=cbpRows_('Shop Orders').find(function(o){return o['Order ID']===j['Order ID'];});var to=j.Event==='owner-created'?cbpProps_().getProperty('CBP_OWNER_EMAIL'):o.Email;MailApp.sendEmail({to:to,subject:'Craft by Payal — '+o['Order number'],body:cbpOrderEmail_(o,j.Event)});cbpUpdate_('Shop Notifications',j,{State:'Sent',Error:''});}catch(e){cbpUpdate_('Shop Notifications',j,{State:Number(j.Attempts)>=5?'Failed':'Retry','Next attempt':new Date(Date.now()+Math.min(86400000,Math.pow(2,Number(j.Attempts))*60000)),Error:'Delivery failed; review Apps Script execution history.'});}});return {ok:true,processed:jobs.length};
}
function installShopJobs(){cbpOwner_();if(!ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='cbpRunShopJobs_';}))ScriptApp.newTrigger('cbpRunShopJobs_').timeBased().everyMinutes(5).create();}
function cbpRunShopJobs_(){cbpProcessJobs_();}
function openOwnerTools(){cbpOwner_();SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutputFromFile('Owner').setTitle('Craft by Payal owner tools'));}
function getOwnerOverview(){cbpOwner_();return {ok:true,spreadsheetUrl:cbpSS_().getUrl(),orders:cbpRows_('Shop Orders').slice(-50).reverse().map(function(o){return {id:o['Order ID'],number:o['Order number'],name:o.Name,total:Number(o['Total paise'])/100,payment:o['Payment status'],production:o['Production status']};}),publication:cbpProps_().getProperty('CBP_PUBLICATION')||'Not published'};}
function verifyOwnerPayment(orderId,reference){var actor=cbpOwner_();cbpText_(reference,100,'payment reference',true);return cbpLock_(function(){var order=cbpRows_('Shop Orders').find(function(o){return o['Order ID']===orderId;});if(!order)cbpError_('NOT_FOUND','Order not found');var existing=cbpRows_('Shop Payments').find(function(p){return p['Order ID']===orderId;});if(!existing)cbpAppend_('Shop Payments',[{'Payment ID':cbpId_(),'Order ID':orderId,'Amount paise':order['Total paise'],Reference:reference,'Verified by':actor,'Verified at':new Date()}]);cbpUpdate_('Shop Orders',order,{'Payment status':'Verified paid'});cbpAppend_('Shop Events',[{'Event ID':cbpId_(),'Order ID':orderId,Type:'payment-verified',Actor:actor,'Created at':new Date(),Details:'Owner verified receipt'}]);return {ok:true};});}
function updateOwnerProduction(orderId,status){var actor=cbpOwner_();var flow=['Awaiting photos','Designing','Awaiting approval','Handcrafting','Ready'];if(flow.indexOf(status)<0)cbpError_('VALIDATION','Unknown production status');return cbpLock_(function(){var o=cbpRows_('Shop Orders').find(function(o){return o['Order ID']===orderId;});if(!o)cbpError_('NOT_FOUND','Order not found');if(status===o['Production status'])return {ok:true};if(flow.indexOf(status)!==flow.indexOf(o['Production status'])+1)cbpError_('TRANSITION','Move forward one production stage at a time.');cbpUpdate_('Shop Orders',o,{'Production status':status});cbpAppend_('Shop Events',[{'Event ID':cbpId_(),'Order ID':orderId,Type:'production',Actor:actor,'Created at':new Date(),Details:status}]);return {ok:true};});}
function backupShop(){cbpOwner_();var folderId=cbpProps_().getProperty('CBP_BACKUP_FOLDER');if(!folderId)cbpError_('CONFIGURATION','Set CBP_BACKUP_FOLDER to a private backup folder first.');var copy=DriveApp.getFileById(cbpSS_().getId()).makeCopy('Craft by Payal backup '+new Date().toISOString(),DriveApp.getFolderById(folderId));cbpHealth_('backup',copy.getId(),'Spreadsheet backup created; customer photo backup is separate.');return {ok:true};}
function submitOrderPhoto(form){
  var uploadId=String(form.uploadId||'');if(!/^[a-f0-9-]{36}$/i.test(uploadId))cbpError_('VALIDATION','Refresh the upload page and retry.');
  var order=cbpAccessOrder_(String(form.orderId||''),String(form.token||''),true),blob=form.photo,settings=cbpSettings_();
  if(!blob||typeof blob.getBytes!=='function')cbpError_('VALIDATION','Select a JPEG or PNG photo.');
  var bytes=blob.getBytes(),type=blob.getContentType(),limit=Number(settings['Upload max bytes']),max=Number(settings['Upload max count']);
  var jpg=bytes.length>3&&(bytes[0]&255)===255&&(bytes[1]&255)===216&&(bytes[2]&255)===255;
  var png=bytes.length>8&&[137,80,78,71,13,10,26,10].every(function(b,i){return (bytes[i]&255)===b;});
  if(!Number.isInteger(limit)||limit<1||!Number.isInteger(max)||max<1||!bytes.length||bytes.length>limit||!((type==='image/jpeg'&&jpg)||(type==='image/png'&&png)))cbpError_('VALIDATION','Choose a JPEG or PNG within the shop file size limit.');
  var digest=cbpHash_(Utilities.base64Encode(bytes)),record=cbpLock_(function(){var rows=cbpRows_('Shop Photos'),same=rows.find(function(r){return r['Upload ID']===uploadId;});
    if(same){if(same['Order ID']!==order['Order ID']||same['Content hash']!==digest)cbpError_('CONFLICT','This upload ID is already in use.');return same;}
    if(rows.filter(function(r){return r['Order ID']===order['Order ID']&&r.State!=='Failed';}).length>=max)cbpError_('LIMIT','This order has reached its photo limit. Contact the shop.');
    cbpAppend_('Shop Photos',[{'Upload ID':uploadId,'Order ID':order['Order ID'],State:'Reserved',Name:cbpText_(blob.getName()||'Customer photo',200,'photo filename',true),'Content hash':digest,Type:type,Bytes:bytes.length,'Created at':new Date()}]);return cbpRows_('Shop Photos').find(function(r){return r['Upload ID']===uploadId;});
  });
  if(record.State==='Complete')return {ok:true,message:'This photo was already received.'};
  cbpLock_(function(){var current=cbpRows_('Shop Photos').find(function(r){return r['Upload ID']===uploadId;});if(current.State==='Uploading'||current.State==='Complete')cbpError_('BUSY','This photo is being processed. Contact the studio if it does not finish.');cbpUpdate_('Shop Photos',current,{State:'Uploading'});});
  var root=DriveApp.getFolderById(cbpProps_().getProperty('CBP_UPLOAD_ROOT')),fileName=uploadId+(jpg?'.jpg':'.png'),matches=root.getFilesByName(fileName),file;
  try{file=matches.hasNext()?matches.next():root.createFile(blob.setName(fileName));cbpLock_(function(){var current=cbpRows_('Shop Photos').find(function(r){return r['Upload ID']===uploadId;});cbpUpdate_('Shop Photos',current,{State:'Complete','File ID':file.getId()});});return {ok:true,message:'Photo received privately by the studio.'};}
  catch(e){cbpHealth_('upload',uploadId,'Upload outcome requires reconciliation.');throw Error('We could not confirm this upload. Contact the studio before sending it again.');}
}
function repairShopPhotos(){cbpOwner_();var root=DriveApp.getFolderById(cbpProps_().getProperty('CBP_UPLOAD_ROOT'));return cbpLock_(function(){var count=0;cbpRows_('Shop Photos').filter(function(r){return r.State!=='Complete'&&Date.now()-new Date(r['Created at']).getTime()>600000;}).forEach(function(r){var files=root.getFilesByName(r['Upload ID']+(r.Type==='image/jpeg'?'.jpg':'.png'));cbpUpdate_('Shop Photos',r,files.hasNext()?{State:'Complete','File ID':files.next().getId()}:{State:'Failed'});count++;});return {ok:true,repaired:count};});}
function migrateLegacyProducts(){cbpOwner_();return cbpLock_(function(){var legacy=cbpSS_().getSheetByName('Products');if(!legacy||legacy.getLastRow()<2)return {ok:true,imported:0};var products=cbpRows_('Shop Products'),count=0;legacy.getRange(2,2,legacy.getLastRow()-1,1).getValues().forEach(function(row){var p=JSON.parse(row[0]);if(products.some(function(r){return r['Product ID']===p.id;}))return;cbpAppend_('Shop Products',[{'Product ID':p.id,Name:p.name,Description:p.description||p.name,State:p.visible===false?'archived':'draft',Featured:!!p.featured,Occasions:(p.occasion||[]).join(', '),Themes:(p.theme||[]).join(', '),Version:1,'Updated at':new Date()}]);cbpAppend_('Shop Variants',(p.variants||[]).map(function(v,i){return {'Variant ID':p.id+'-v'+i,'Product ID':p.id,Size:v.size||'Standard',Lighting:v.light||'','Price paise':Math.round(Number(v.price)*100),Available:!!v.available};}));cbpAppend_('Shop Images',(p.images||[p.image,p.image2].filter(Boolean)).map(function(url,i){return {'Image ID':p.id+'-photo'+i,'Product ID':p.id,URL:url,'Alt text':p.name,Position:i};}));count++;});return {ok:true,imported:count,message:'Imported as drafts. Review and publish explicitly.'};});}
function enableProduction(){cbpOwner_();cbpCatalog_();cbpProps_().setProperty('CBP_PRODUCTION','true');return {ok:true};}
function cbpImportProduct_(p){
  var products=cbpRows_('Shop Products'),exists=products.some(function(r){return r['Product ID']===p.id;});
  if(!exists)cbpAppend_('Shop Products',[{'Product ID':p.id,Name:p.name,Description:p.description||p.name,State:p.visible===false?'archived':'draft',Featured:!!p.featured,Occasions:(p.occasion||[]).join(', '),Themes:(p.theme||[]).join(', '),Version:1,'Updated at':new Date()}]);
  var variants=cbpRows_('Shop Variants');cbpAppend_('Shop Variants',(p.variants||[{size:'Standard',light:'',price:p.price,available:p.inStock!==false}]).map(function(v,i){return {'Variant ID':p.id+'-v'+i,'Product ID':p.id,Size:v.size||'Standard',Lighting:v.light||'','Price paise':Math.round(Number(v.price)*100),Available:!!v.available};}).filter(function(v){return !variants.some(function(r){return r['Variant ID']===v['Variant ID'];});}));
  var images=cbpRows_('Shop Images');cbpAppend_('Shop Images',(p.images||[p.image,p.image2].filter(Boolean)).map(function(url,i){return {'Image ID':p.id+'-photo'+i,'Product ID':p.id,URL:url,'Alt text':p.alt||p.name,Position:i};}).filter(function(image){return !images.some(function(r){return r['Image ID']===image['Image ID'];});}));
  return !exists;
}
function importBundledCatalogue(){cbpOwner_();return cbpLock_(function(){var imported=0;cbpSeed_().forEach(function(p){if(!cbpRows_('Shop Products').some(function(r){return r['Product ID']===p.id;})){cbpImportProduct_(p);imported++;}});return {ok:true,imported:imported,message:'Imported catalogue as drafts. Verify image rights, descriptions and prices before publishing.'};});}
function importLegacyOrderHistory(){cbpOwner_();return cbpLock_(function(){var old=cbpSS_().getSheetByName('Orders');if(!old||old.getLastRow()<2)return {ok:true,imported:0};var rows=old.getDataRange().getValues(),headers=rows.shift(),existing=cbpRows_('Shop Orders'),count=0;rows.forEach(function(row){function value(k){return row[headers.indexOf(k)]||'';}var number=String(value('Order ID'));if(!number||existing.some(function(o){return o['Order number']===number;}))return;var status=value('Status'),id='legacy-'+number;cbpAppend_('Shop Orders',[{'Order ID':id,'Order number':number,'Request ID':'legacy:'+number,'Created at':value('Placed at'),Name:value('Name'),Phone:String(value('Phone')),Email:value('Email'),Address:value('Address'),City:value('City'),State:value('State'),PIN:String(value('PIN')),'Subtotal paise':Math.round(Number(value('Total (₹)'))*100),'Shipping paise':0,'Total paise':Math.round(Number(value('Total (₹)'))*100),'Order status':status==='Cancelled'?'Cancelled':'Imported - review','Payment status':'Legacy - verify','Production status':['Photos received','Preview sent','Approved','Handcrafting'].indexOf(status)>=0?'Imported - review':'Awaiting photos','Delivery status':status==='Delivered'?'Delivered':status==='Dispatched'?'Dispatched':'Not dispatched','Need by':value('Need by'),Occasion:value('Occasion'),'Gift message':value('Gift message'),'Hide prices':value('Hide prices')==='Yes','Tracking URL':cbpHttps_(value('Tracking link'))?value('Tracking link'):'','Private notes':'Imported legacy record. Items and shipping breakdown require review. '+String(value('Private notes'))}]);cbpAppend_('Shop Order Items',[{'Line ID':id+'-legacy','Order ID':id,Name:'Legacy items — original text retained',Options:String(value('Items')),Quantity:1,'Unit price paise':Math.round(Number(value('Total (₹)'))*100)}]);count++;});return {ok:true,imported:count};});}
function updateOwnerShipment(orderId,state,url){var actor=cbpOwner_();if(['Not dispatched','Dispatched','Delivered','Returned'].indexOf(state)<0)cbpError_('VALIDATION','Unknown delivery status');if(url&&!cbpHttps_(url))cbpError_('VALIDATION','Use a public HTTPS courier tracking link.');return cbpLock_(function(){var o=cbpRows_('Shop Orders').find(function(o){return o['Order ID']===orderId;});if(!o)cbpError_('NOT_FOUND','Order not found');var allowed={'Not dispatched':['Dispatched'],'Dispatched':['Delivered','Returned'],'Delivered':['Returned'],'Returned':[]};if(state!==o['Delivery status']&&(allowed[o['Delivery status']]||[]).indexOf(state)<0)cbpError_('TRANSITION','Invalid shipment transition');if(state==='Dispatched'&&o['Production status']!=='Ready')cbpError_('TRANSITION','Mark production Ready before dispatching.');cbpUpdate_('Shop Orders',o,{'Delivery status':state,'Tracking URL':url||o['Tracking URL']});cbpAppend_('Shop Events',[{'Event ID':cbpId_(),'Order ID':orderId,Type:'shipment',Actor:actor,'Created at':new Date(),Details:state}]);return {ok:true};});}
function revokeOrderUploads(orderId){cbpOwner_();return cbpLock_(function(){var o=cbpRows_('Shop Orders').find(function(o){return o['Order ID']===orderId;});if(!o)cbpError_('NOT_FOUND','Order not found');cbpUpdate_('Shop Orders',o,{'Upload expires':new Date(0)});return {ok:true};});}

function cbpOrderEmail_(order,event){var text='Order '+order['Order number']+' has been received.\nPayment status: '+order['Payment status']+'.\nRequested dates require confirmation.';if(event==='customer-created'){var website=String(cbpSettings_()['Website URL']||'').replace(/\/$/,''),requestId=order['Request ID'];if(cbpHttps_(website))text+='\n\nPrivate order tracking: '+website+'/track-order.html#orderId='+encodeURIComponent(order['Order ID'])+'&token='+cbpToken_(requestId,'track');text+='\n\nPrivate photo upload (7 days): '+ScriptApp.getService().getUrl()+'?page=upload#orderId='+encodeURIComponent(order['Order ID'])+'&token='+cbpToken_(requestId,'upload')+'\nKeep these links private.';}return text;}
/** Only callable by the owner, and only in an explicitly named staging workbook. */
function prepareStagingBackend(){
  cbpOwner_();
  if(cbpSS_().getId()==='1c6zOVXDr1nXFn0ghfB8ph4eaR7SCyOU1MRGaxL3lj3c'||!/Backend Staging/.test(cbpSS_().getName()))cbpError_('STAGING_ONLY','This helper can run only in the isolated backend staging workbook.');
  migrateLegacyProducts();importBundledCatalogue();
  var stagingImages=cbpRows_('Shop Images'),stagingVariants=cbpRows_('Shop Variants');
  cbpRows_('Shop Products').forEach(function(p){
    if(p.State==='archived')return;
    var images=stagingImages.filter(function(i){return i['Product ID']===p['Product ID'];});
    var variants=stagingVariants.filter(function(v){return v['Product ID']===p['Product ID'];});
    var ready=images.length>0&&images.length<=8&&images.every(function(i){return cbpHttps_(i.URL);})&&variants.length>0&&variants.length<=40;
    cbpUpdate_('Shop Products',p,{State:ready?'published':'draft'});
    if(!ready)console.log('Kept as draft for catalogue review: '+p['Product ID']);
  });
  var publication=publishCatalogue();enableProduction();
  cbpProps_().setProperty('CBP_STAGING_ACCEPT_UNTIL',String(Date.now()+3600000));
  var setting=cbpRows_('Shop Settings').find(function(s){return s.Key==='Accept orders';});cbpUpdate_('Shop Settings',setting,{Value:true});
  console.log('Staging catalogue published: '+publication.count+' products. Order testing enabled for one hour only. No notification jobs were sent.');
  return publication;
}
function closeStagingTestWindow(){cbpOwner_();if(!/Backend Staging/.test(cbpSS_().getName()))cbpError_('STAGING_ONLY','Not the staging workbook.');var setting=cbpRows_('Shop Settings').find(function(s){return s.Key==='Accept orders';});cbpUpdate_('Shop Settings',setting,{Value:false});cbpProps_().deleteProperty('CBP_STAGING_ACCEPT_UNTIL');return {ok:true};}

// ===== CatalogSeed.gs =====
// One-time migration seed. Owners edit readable Shop tabs after import.
function cbpSeed_(){return [
  {
    "id": "miniature-frame",
    "name": "Our Happy Place Miniature Wall",
    "price": 3250,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/ChatGPT_Image_Dec_27_2025_01_31_15_PM.png?v=1767872983",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/87da3577-724c-4745-a124-5b6160d9f2d8.png?v=1775464720",
    "alt": "Our Happy Place Miniature Wall – handmade personalised miniature frame",
    "isNew": false,
    "created": "2023-11-27",
    "order": 0,
    "occasion": [
      "Anniversary",
      "Valentine's",
      "Festive"
    ],
    "theme": [
      "Couple"
    ],
    "size": [
      "10×12 in",
      "12×16 in",
      "12×18 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3800,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3900,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4450,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "Without light",
        "price": 4200,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "With light",
        "price": 4750,
        "available": true
      }
    ],
    "description": "Our Happy Place Miniature Wall",
    "featured": true,
    "visible": true
  },
  {
    "id": "the-wedding-miniature-wall-design-1",
    "name": "The Wedding Miniature Frame Design 1",
    "price": 2950,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/ChatGPT_Image_Feb_19_2026_11_03_23_AM.png?v=1771482624",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/IMG_20260123_145038_1.png?v=1771482624",
    "alt": "The Wedding Miniature Frame Design 1 – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-12",
    "order": 1,
    "occasion": [
      "Anniversary",
      "Wedding & Engagement"
    ],
    "theme": [
      "Couple"
    ],
    "size": [
      "10×12 in",
      "12×16 in",
      "12×18 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 2950,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3500,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3600,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4150,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "Without light",
        "price": 3900,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "With light",
        "price": 4450,
        "available": true
      }
    ],
    "description": "The Wedding Miniature Frame Design 1",
    "featured": false,
    "visible": true
  },
  {
    "id": "mini-home",
    "name": "Mini Home",
    "price": 2499,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/MINIHOME.jpg?v=1701199933",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/PSX_20241009_155823.jpg?v=1729232640",
    "alt": "Mini Home – handmade personalised miniature frame",
    "isNew": false,
    "created": "2023-11-29",
    "order": 2,
    "occasion": [
      "Anniversary",
      "House Warming"
    ],
    "theme": [
      "Family"
    ],
    "size": [
      "8×10 in",
      "10×12 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "8×10 in",
        "light": "Without light",
        "price": 2499,
        "available": true
      },
      {
        "size": "8×10 in",
        "light": "With light",
        "price": 2899,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3500,
        "available": true
      }
    ],
    "description": "Mini Home",
    "featured": false,
    "visible": true
  },
  {
    "id": "the-wedding-miniature-wall-design-5",
    "name": "The Wedding Miniature Wall Design 4",
    "price": 3600,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/ChatGPT_Image_Jan_19_2026_05_02_42_PM.png?v=1769064990",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/IMG_20260122_115532.png?v=1772277828",
    "alt": "The Wedding Miniature Wall Design 4 – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-12",
    "order": 3,
    "occasion": [
      "Anniversary",
      "Wedding & Engagement"
    ],
    "theme": [
      "Couple"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 3600,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 4150,
        "available": true
      }
    ],
    "description": "The Wedding Miniature Wall Design 4",
    "featured": false,
    "visible": true
  },
  {
    "id": "his-happy-corner-miniature-wall",
    "name": "His Happy Corner Miniature Frame",
    "price": 3250,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/IMG_20260313_112119.jpg?v=1773399903",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/9c6d5ae0-105b-41df-b84d-d3c0a754d10f.png?v=1779097288",
    "alt": "His Happy Corner Miniature Frame – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-04",
    "order": 4,
    "occasion": [
      "Birthday",
      "Valentine's",
      "Mother's & Father's Day",
      "Festive"
    ],
    "theme": [
      "Personal Corner"
    ],
    "size": [
      "10×12 in",
      "12×16 in",
      "12×18 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3800,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3900,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4450,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "Without light",
        "price": 4200,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "With light",
        "price": 4750,
        "available": true
      }
    ],
    "description": "His Happy Corner Miniature Frame",
    "featured": false,
    "visible": true
  },
  {
    "id": "her-happy-corner-miniature-frame",
    "name": "Her Happy Corner Miniature Frame",
    "price": 3250,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/IMG_20260309_153612.png?v=1773308305",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/IMG_20260311_122542.jpg?v=1773308305",
    "alt": "Her Happy Corner Miniature Frame – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-04",
    "order": 5,
    "occasion": [
      "Birthday",
      "Valentine's",
      "Mother's & Father's Day",
      "Festive"
    ],
    "theme": [
      "Personal Corner"
    ],
    "size": [
      "10×12 in",
      "12×16 in",
      "12×18 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3800,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3900,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4450,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "Without light",
        "price": 4200,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "With light",
        "price": 4750,
        "available": true
      }
    ],
    "description": "Her Happy Corner Miniature Frame",
    "featured": true,
    "visible": true
  },
  {
    "id": "celebration-miniature-wall-small",
    "name": "Celebration Miniature Frame Small",
    "price": 2150,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/rn-image_picker_lib_temp_21d40119-ae1c-461a-9177-9133aa80f2c0.jpg?v=1747311327",
    "image2": null,
    "alt": "Celebration Miniature Frame Small – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-03",
    "order": 6,
    "occasion": [
      "Birthday"
    ],
    "theme": [
      "Celebration"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 2150,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 2449,
        "available": true
      }
    ],
    "description": "Celebration Miniature Frame Small",
    "featured": false,
    "visible": true
  },
  {
    "id": "miniature-wall-small",
    "name": "Miniature Wall Small – Living Room",
    "price": 2150,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/MINIATUREWALLSMALL1.jpg?v=1701200503",
    "image2": null,
    "alt": "Miniature Wall Small – Living Room – handmade personalised miniature frame",
    "isNew": false,
    "created": "2023-11-29",
    "order": 7,
    "occasion": [
      "Anniversary",
      "House Warming"
    ],
    "theme": [
      "Celebration"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 2150,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 2499,
        "available": true
      }
    ],
    "description": "Miniature Wall Small – Living Room",
    "featured": false,
    "visible": true
  },
  {
    "id": "classical-theme-miniature-frame",
    "name": "Classical Theme Miniature Frame",
    "price": 2950,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/IMG_20260307_121322.jpg?v=1772872093",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/49a6f937-53f0-4697-bc33-3042c483a640_df9bea1b-438d-47e2-bb8c-ec58029b71b3.png?v=1779097116",
    "alt": "Classical Theme Miniature Frame – handmade personalised miniature frame",
    "isNew": false,
    "created": "2025-08-21",
    "order": 8,
    "occasion": [
      "Anniversary"
    ],
    "theme": [
      "Celebration"
    ],
    "size": [
      "10×12 in",
      "12×16 in",
      "12×18 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 2950,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3500,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3600,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4150,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "Without light",
        "price": 3900,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "With light",
        "price": 4450,
        "available": true
      }
    ],
    "description": "Classical Theme Miniature Frame",
    "featured": false,
    "visible": true
  },
  {
    "id": "our-happy-family-miniature-wall",
    "name": "Our Happy Family Miniature Wall",
    "price": 4150,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/1df2cb48-95e2-4e94-8d41-a644eaf7361f.png?v=1775039537",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/1776329773559.png?v=1776332777",
    "alt": "Our Happy Family Miniature Wall – handmade personalised miniature frame",
    "isNew": false,
    "created": "2023-11-27",
    "order": 9,
    "occasion": [
      "Anniversary",
      "Festive"
    ],
    "theme": [
      "Family"
    ],
    "size": [
      "12×18 in",
      "12×22 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "12×18 in",
        "light": "Without light",
        "price": 4150,
        "available": true
      },
      {
        "size": "12×22 in",
        "light": "Without light",
        "price": 4800,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "With light",
        "price": 4700,
        "available": true
      },
      {
        "size": "12×22 in",
        "light": "With light",
        "price": 5350,
        "available": true
      }
    ],
    "description": "Our Happy Family Miniature Wall",
    "featured": true,
    "visible": true
  },
  {
    "id": "engagement-platter-copy",
    "name": "Engagement Platter Design – 2",
    "price": 1999,
    "priceFrom": false,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/PSX_20240919_160800.jpg?v=1726812005",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/PSX_20240919_161512.jpg?v=1726812005",
    "alt": "Engagement Platter Design – 2 – handmade personalised miniature frame",
    "isNew": true,
    "created": "2024-09-20",
    "order": 10,
    "occasion": [
      "Wedding & Engagement"
    ],
    "theme": [
      "Couple"
    ],
    "size": [],
    "light": [],
    "variants": [
      {
        "size": null,
        "light": null,
        "price": 1999,
        "available": true
      }
    ],
    "description": "Engagement Platter Design – 2",
    "featured": false,
    "visible": true
  },
  {
    "id": "mothers-day-special-miniature-frame",
    "name": "Mother's Day Special Miniature Frame",
    "price": 2150,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/DSC1363.jpg?v=1775718807",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/PSX_20240419_230855.jpg?v=1775718807",
    "alt": "Mother's Day Special Miniature Frame – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-04-19",
    "order": 11,
    "occasion": [
      "Mother's & Father's Day"
    ],
    "theme": [
      "Family"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 2150,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 2449,
        "available": true
      }
    ],
    "description": "Mother's Day Special Miniature Frame",
    "featured": false,
    "visible": true
  },
  {
    "id": "mini-home-copy",
    "name": "Mini Home Big",
    "price": 3250,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/PSX_20241009_155823.jpg?v=1729232640",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/Gemini_Generated_Image_rvq626rvq626rvq6.png?v=1773645225",
    "alt": "Mini Home Big – handmade personalised miniature frame",
    "isNew": true,
    "created": "2024-10-18",
    "order": 12,
    "occasion": [
      "Anniversary",
      "House Warming"
    ],
    "theme": [
      "Family"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 3500,
        "available": true
      }
    ],
    "description": "Mini Home Big",
    "featured": false,
    "visible": true
  },
  {
    "id": "3-partition-miniature-wall",
    "name": "3 Partition Miniature Wall",
    "price": 6850,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/3PARTITIONMINIATUREWALL1.jpg?v=1710575572",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/3PARTITIONMINIATUREWALL2.jpg?v=1710575572",
    "alt": "3 Partition Miniature Wall – handmade personalised miniature frame",
    "isNew": false,
    "created": "2023-11-29",
    "order": 13,
    "occasion": [
      "Anniversary",
      "Wedding & Engagement"
    ],
    "theme": [
      "Celebration"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 6850,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 7500,
        "available": true
      }
    ],
    "description": "3 Partition Miniature Wall",
    "featured": false,
    "visible": true
  },
  {
    "id": "heart-collage-miniature-wall",
    "name": "Heart Collage Miniature Wall",
    "price": 1999,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "/assets/images/photo-coming-soon.png?v=1",
    "image2": null,
    "alt": "Heart Collage Miniature Wall – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-12",
    "order": 14,
    "occasion": [
      "Valentine's"
    ],
    "theme": [
      "Couple"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 1999,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 2449,
        "available": true
      }
    ],
    "description": "Heart Collage Miniature Wall",
    "featured": false,
    "visible": true
  },
  {
    "id": "the-wedding-miniature-wall-design-4",
    "name": "The Wedding Miniature Wall Design 3",
    "price": 2950,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/rn-image_picker_lib_temp_0782e179-da24-4b95-8cd4-c8995473a29a.png?v=1746786658",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/wedding-gift-3D-photo-frame.jpg?v=1746786658",
    "alt": "The Wedding Miniature Wall Design 3 – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-12",
    "order": 15,
    "occasion": [
      "Anniversary",
      "Wedding & Engagement"
    ],
    "theme": [
      "Couple"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 2950,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 3500,
        "available": true
      }
    ],
    "description": "The Wedding Miniature Wall Design 3",
    "featured": false,
    "visible": true
  },
  {
    "id": "teachers-miniature-wall",
    "name": "Teacher's Theme – Miniature Frame",
    "price": 3250,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/15c972d2-5e08-4ad9-9d68-fb4a88e66f26_2f87b26a-f83b-442a-b705-d01f09e66d96.png?v=1780398302",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/9b25d869-04bf-49f7-8ee5-5dbc31ede7b3.jpg?v=1780398302",
    "alt": "Teacher's Theme – Miniature Frame – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-12-16",
    "order": 16,
    "occasion": [],
    "theme": [
      "Profession"
    ],
    "size": [
      "10×12 in",
      "12×16 in",
      "12×18 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3800,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3900,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4450,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "Without light",
        "price": 4200,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "With light",
        "price": 4750,
        "available": true
      }
    ],
    "description": "Teacher's Theme – Miniature Frame",
    "featured": false,
    "visible": true
  },
  {
    "id": "the-wedding-miniature-wall-small",
    "name": "The Wedding Miniature Wall Small",
    "price": 1999,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/THEWEDDING_MINIATUREWALLSMALL.jpg?v=1707732618",
    "image2": null,
    "alt": "The Wedding Miniature Wall Small – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-12",
    "order": 17,
    "occasion": [
      "Anniversary",
      "Wedding & Engagement"
    ],
    "theme": [
      "Couple"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 1999,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 2449,
        "available": true
      }
    ],
    "description": "The Wedding Miniature Wall Small",
    "featured": false,
    "visible": true
  },
  {
    "id": "2-partition-miniature-wall",
    "name": "2 Partition Miniature Wall",
    "price": 5200,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/2PARTITIONMINIATUREWALL1.jpg?v=1701198424",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/2PARTITIONMINIATUREWALL2.jpg?v=1701198424",
    "alt": "2 Partition Miniature Wall – handmade personalised miniature frame",
    "isNew": false,
    "created": "2023-11-29",
    "order": 18,
    "occasion": [
      "Anniversary",
      "Wedding & Engagement"
    ],
    "theme": [
      "Celebration"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 5200,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 6000,
        "available": true
      }
    ],
    "description": "2 Partition Miniature Wall",
    "featured": false,
    "visible": true
  },
  {
    "id": "the-celebration-miniature-wall",
    "name": "The Celebration Miniature Frame",
    "price": 2950,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/ChatGPT_Image_Mar_13_2026_01_03_55_PM.png?v=1775042756",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/ChatGPT_Image_Mar_16_2026_10_58_08_AM.png?v=1773645595",
    "alt": "The Celebration Miniature Frame – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-04",
    "order": 19,
    "occasion": [
      "Birthday"
    ],
    "theme": [
      "Celebration"
    ],
    "size": [
      "10×12 in",
      "12×16 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 2950,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3500,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3600,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4150,
        "available": true
      }
    ],
    "description": "The Celebration Miniature Frame",
    "featured": false,
    "visible": true
  },
  {
    "id": "the-love-sofa-miniature-wall",
    "name": "The Love Sofa Miniature Wall",
    "price": 3250,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/ChatGPT_Image_Mar_16_2026_11_11_55_AM.png?v=1773645322",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/ChatGPT_Image_Mar_16_2026_11_33_05_AM.png?v=1773661334",
    "alt": "The Love Sofa Miniature Wall – handmade personalised miniature frame",
    "isNew": false,
    "created": "2023-11-27",
    "order": 20,
    "occasion": [
      "Anniversary",
      "Wedding & Engagement",
      "Valentine's"
    ],
    "theme": [
      "Couple"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 3800,
        "available": true
      }
    ],
    "description": "The Love Sofa Miniature Wall",
    "featured": false,
    "visible": true
  },
  {
    "id": "corporate-theme-miniature-frame-1",
    "name": "Office – Corporate Theme Miniature Frame",
    "price": 3250,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/5037ec61-2989-4de4-8fc6-68ebc03bcf74_b95d9b27-ce77-4247-babf-0c835ac2a805.png?v=1780463952",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/f6c65403-b297-4bd1-a723-6302ad344a23_fca382f4-92f4-405f-a649-cc2ac06111ea.png?v=1780463953",
    "alt": "Office – Corporate Theme Miniature Frame – handmade personalised miniature frame",
    "isNew": false,
    "created": "2026-06-03",
    "order": 21,
    "occasion": [],
    "theme": [
      "Profession"
    ],
    "size": [
      "10×12 in",
      "12×16 in",
      "12×18 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3800,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3900,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4450,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "Without light",
        "price": 4200,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "With light",
        "price": 4750,
        "available": true
      }
    ],
    "description": "Office – Corporate Theme Miniature Frame",
    "featured": false,
    "visible": true
  },
  {
    "id": "baby-1-year-frame",
    "name": "Baby 1 Year Frame",
    "price": 2350,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/Picsart_24-09-27_17-05-47-592.jpg?v=1727502966",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/Picsart_24-09-27_17-11-14-217.jpg?v=1727502967",
    "alt": "Baby 1 Year Frame – handmade personalised miniature frame",
    "isNew": true,
    "created": "2024-09-28",
    "order": 22,
    "occasion": [
      "Birthday",
      "Baby & Kids"
    ],
    "theme": [
      "Family"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 2350,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 2750,
        "available": true
      }
    ],
    "description": "Baby 1 Year Frame",
    "featured": false,
    "visible": true
  },
  {
    "id": "the-wedding-miniature-wall-design-7",
    "name": "The Wedding Miniature Wall Design 6",
    "price": 3600,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/ChatGPT_Image_Mar_17_2026_01_10_13_PM.png?v=1773737273",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/ChatGPT_Image_Mar_17_2026_01_22_32_PM.png?v=1773737273",
    "alt": "The Wedding Miniature Wall Design 6 – handmade personalised miniature frame",
    "isNew": false,
    "created": "2026-03-02",
    "order": 23,
    "occasion": [
      "Anniversary",
      "Wedding & Engagement"
    ],
    "theme": [
      "Couple"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 3600,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 4150,
        "available": true
      }
    ],
    "description": "The Wedding Miniature Wall Design 6",
    "featured": false,
    "visible": true
  },
  {
    "id": "mothers-day-special-miniature-frame-copy",
    "name": "Father's Day Special Miniature Frame",
    "price": 2150,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/DSC1410_e0f09dc0-5652-4add-85cc-d57bf3971493.jpg?v=1779706794",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/DSC1420.jpg?v=1779706795",
    "alt": "Father's Day Special Miniature Frame – handmade personalised miniature frame",
    "isNew": false,
    "created": "2026-05-25",
    "order": 24,
    "occasion": [
      "Mother's & Father's Day"
    ],
    "theme": [
      "Family"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 2150,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 2449,
        "available": true
      }
    ],
    "description": "Father's Day Special Miniature Frame",
    "featured": false,
    "visible": true
  },
  {
    "id": "miniature-home-3-partition",
    "name": "Miniature Home-3 Partition",
    "price": 7000,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/MINIATUREHOME-3PARTITION_1.png?v=1707738887",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/MINIATUREHOME-3PARTITION.jpg?v=1707738887",
    "alt": "Miniature Home-3 Partition – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-12",
    "order": 25,
    "occasion": [
      "House Warming"
    ],
    "theme": [
      "Family"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 7000,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 8000,
        "available": true
      }
    ],
    "description": "Miniature Home-3 Partition",
    "featured": false,
    "visible": true
  },
  {
    "id": "the-wedding-miniature-wall-design-2",
    "name": "The Wedding Miniature Wall Design 2",
    "price": 3600,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/THEWEDDING_MINIATUREWALLDESIGN2.jpg?v=1701197469",
    "image2": null,
    "alt": "The Wedding Miniature Wall Design 2 – handmade personalised miniature frame",
    "isNew": false,
    "created": "2023-11-29",
    "order": 26,
    "occasion": [
      "Anniversary",
      "Wedding & Engagement"
    ],
    "theme": [
      "Couple"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "With light",
        "price": 4150,
        "available": true
      },
      {
        "size": null,
        "light": "Without light",
        "price": 3600,
        "available": true
      }
    ],
    "description": "The Wedding Miniature Wall Design 2",
    "featured": false,
    "visible": true
  },
  {
    "id": "museum-of-us-miniature-wall",
    "name": "Museum of Us Miniature Wall",
    "price": 2950,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/b495868c-3c7b-4657-b489-629b381d4ab1.png?v=1776591338",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/29f133d7-b066-4f5e-9ab4-326a1edabda9.png?v=1776591338",
    "alt": "Museum of Us Miniature Wall – handmade personalised miniature frame",
    "isNew": true,
    "created": "2026-04-19",
    "order": 27,
    "occasion": [
      "Anniversary",
      "Valentine's"
    ],
    "theme": [
      "Couple"
    ],
    "size": [
      "10×12 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 2950,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3500,
        "available": true
      }
    ],
    "description": "Museum of Us Miniature Wall",
    "featured": true,
    "visible": true
  },
  {
    "id": "the-traveller-miniature-wall",
    "name": "The Traveller Miniature Wall",
    "price": 3900,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "/assets/images/photo-coming-soon.png?v=1",
    "image2": null,
    "alt": "The Traveller Miniature Wall – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-04",
    "order": 28,
    "occasion": [
      "Birthday"
    ],
    "theme": [
      "Personal Corner"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 3900,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 4350,
        "available": true
      }
    ],
    "description": "The Traveller Miniature Wall",
    "featured": false,
    "visible": true
  },
  {
    "id": "baby-birth-detail-miniature-frame-newborn-gift",
    "name": "Baby Birth Detail Miniature Frame",
    "price": 3250,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/Baby_birth_frame.jpg?v=1710499564",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/Baby-birth-miniature-frame.jpg?v=1710500119",
    "alt": "Baby Birth Detail Miniature Frame – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-03",
    "order": 29,
    "occasion": [
      "Birthday",
      "Baby & Kids"
    ],
    "theme": [
      "Family"
    ],
    "size": [
      "10×12 in",
      "12×16 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3800,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3900,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4450,
        "available": true
      }
    ],
    "description": "Baby Birth Detail Miniature Frame",
    "featured": false,
    "visible": true
  },
  {
    "id": "the-wedding-miniature-wall-design-6",
    "name": "The Wedding Miniature Wall Design 5",
    "price": 3600,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/Picsart_25-04-11_12-07-01-781.jpg?v=1744384269",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/rn-image_picker_lib_temp_d73b6376-3f3e-4fea-b55f-62fc962f0779.jpg?v=1744385000",
    "alt": "The Wedding Miniature Wall Design 5 – handmade personalised miniature frame",
    "isNew": true,
    "created": "2025-04-11",
    "order": 30,
    "occasion": [
      "Anniversary",
      "Wedding & Engagement"
    ],
    "theme": [
      "Couple"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 3600,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 4150,
        "available": true
      }
    ],
    "description": "The Wedding Miniature Wall Design 5",
    "featured": false,
    "visible": true
  },
  {
    "id": "baby-shower-miniature-wall",
    "name": "Baby Shower Miniature Frame",
    "price": 3600,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/BABYSHOWER_MINIATUREWALL_1.jpg?v=1707735318",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/BABYSHOWER_MINIATUREWALL_2.jpg?v=1707735318",
    "alt": "Baby Shower Miniature Frame – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-12",
    "order": 31,
    "occasion": [
      "Baby & Kids"
    ],
    "theme": [
      "Family"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 3600,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 4150,
        "available": true
      }
    ],
    "description": "Baby Shower Miniature Frame",
    "featured": false,
    "visible": true
  },
  {
    "id": "baby-nursery-miniature-wall",
    "name": "Kids Room Miniature Wall",
    "price": 3250,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/BABYNURSERY_MINIATUREWALL_1.jpg?v=1707237754",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/BABYNURSERY_MINIATUREWALL_2.jpg?v=1707237753",
    "alt": "Kids Room Miniature Wall – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-06",
    "order": 32,
    "occasion": [
      "Birthday",
      "Baby & Kids"
    ],
    "theme": [
      "Family"
    ],
    "size": [
      "10×12 in",
      "12×16 in",
      "12×18 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3800,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3900,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4450,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "Without light",
        "price": 4200,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "With light",
        "price": 4750,
        "available": true
      }
    ],
    "description": "Kids Room Miniature Wall",
    "featured": false,
    "visible": true
  },
  {
    "id": "shadow-box-cum-key-holder",
    "name": "Shadow Box cum Key Holder",
    "price": 3250,
    "priceFrom": false,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/SHADOWBOXCUMKEYHOLDER_1.jpg?v=1707480379",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/SHADOWBOXCUMKEYHOLDER_2.jpg?v=1707480380",
    "alt": "Shadow Box cum Key Holder – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-09",
    "order": 33,
    "occasion": [
      "House Warming"
    ],
    "theme": [
      "Celebration"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 3250,
        "available": true
      }
    ],
    "description": "Shadow Box cum Key Holder",
    "featured": false,
    "visible": true
  },
  {
    "id": "engagement-platter-design-3",
    "name": "Engagement Platter Design – 3",
    "price": 1650,
    "priceFrom": false,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/IMG_20251128_150358.jpg?v=1764332152",
    "image2": null,
    "alt": "Engagement Platter Design – 3 – handmade personalised miniature frame",
    "isNew": true,
    "created": "2025-11-28",
    "order": 34,
    "occasion": [
      "Wedding & Engagement"
    ],
    "theme": [
      "Couple"
    ],
    "size": [],
    "light": [],
    "variants": [
      {
        "size": null,
        "light": null,
        "price": 1650,
        "available": true
      }
    ],
    "description": "Engagement Platter Design – 3",
    "featured": false,
    "visible": true
  },
  {
    "id": "graduation-day-miniature-wall",
    "name": "Graduation Day Miniature Wall",
    "price": 2950,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/GRADUATIONDAY_MINIATUREWALL.jpg?v=1707735549",
    "image2": null,
    "alt": "Graduation Day Miniature Wall – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-12",
    "order": 35,
    "occasion": [],
    "theme": [
      "Profession"
    ],
    "size": [
      "10×12 in",
      "12×16 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 2950,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3500,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3600,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4150,
        "available": true
      }
    ],
    "description": "Graduation Day Miniature Wall",
    "featured": false,
    "visible": true
  },
  {
    "id": "doctors-theme-miniature-frame",
    "name": "Doctor's Theme Miniature Frame",
    "price": 3250,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/3485bb4b-0c9c-40f7-8b34-8228695c5d3b.png?v=1780396910",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/f9b70890-6fa1-4b99-a6e2-0cf8c4117584.png?v=1780396911",
    "alt": "Doctor's Theme Miniature Frame – handmade personalised miniature frame",
    "isNew": false,
    "created": "2026-06-02",
    "order": 36,
    "occasion": [],
    "theme": [
      "Profession"
    ],
    "size": [
      "10×12 in",
      "12×16 in",
      "12×18 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3800,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3900,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4450,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "Without light",
        "price": 4200,
        "available": true
      },
      {
        "size": "12×18 in",
        "light": "With light",
        "price": 4750,
        "available": true
      }
    ],
    "description": "Doctor's Theme Miniature Frame",
    "featured": false,
    "visible": true
  },
  {
    "id": "mini-library",
    "name": "Mini Library",
    "price": 2799,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/aa75d612-1c2e-4d58-b399-83e11f50b2af.png?v=1775545855",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/DSC1334.jpg?v=1775545855",
    "alt": "Mini Library – handmade personalised miniature frame",
    "isNew": false,
    "created": "2026-04-07",
    "order": 37,
    "occasion": [
      "Anniversary"
    ],
    "theme": [
      "Personal Corner"
    ],
    "size": [
      "8×10 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "8×10 in",
        "light": "Without light",
        "price": 2799,
        "available": true
      },
      {
        "size": "8×10 in",
        "light": "With light",
        "price": 3150,
        "available": true
      }
    ],
    "description": "Mini Library",
    "featured": true,
    "visible": true
  },
  {
    "id": "miniature-home-2-partition",
    "name": "Miniature Home-2 Partition",
    "price": 8000,
    "priceFrom": false,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/MINIATUREHOME-2PARTITION_1.png?v=1707738802",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/MINIATUREHOME-2PARTITION_2.jpg?v=1707738802",
    "alt": "Miniature Home-2 Partition – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-12",
    "order": 38,
    "occasion": [
      "House Warming"
    ],
    "theme": [
      "Family"
    ],
    "size": [],
    "light": [],
    "variants": [
      {
        "size": null,
        "light": null,
        "price": 8000,
        "available": true
      }
    ],
    "description": "Miniature Home-2 Partition",
    "featured": false,
    "visible": true
  },
  {
    "id": "mini-home-christmas-theme",
    "name": "Mini Home Christmas Theme",
    "price": 2499,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/MINIHOMECHRISTMASTHEME_1.jpg?v=1707739181",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/MINIHOMECHRISTMASTHEME_2.jpg?v=1707739181",
    "alt": "Mini Home Christmas Theme – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-12",
    "order": 39,
    "occasion": [
      "Festive",
      "House Warming"
    ],
    "theme": [
      "Family",
      "Celebration"
    ],
    "size": [],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": null,
        "light": "Without light",
        "price": 2499,
        "available": true
      },
      {
        "size": null,
        "light": "With light",
        "price": 2999,
        "available": true
      }
    ],
    "description": "Mini Home Christmas Theme",
    "featured": false,
    "visible": true
  },
  {
    "id": "the-baker-special-miniature-wall",
    "name": "The Baker Special Miniature Wall",
    "price": 3250,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/THEBAKERSPECIAL_MINIATUREWALL.jpg?v=1707735940",
    "image2": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/THEBAKERSPECIAL_MINIATUREWALL_2.jpg?v=1707735940",
    "alt": "The Baker Special Miniature Wall – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-12",
    "order": 40,
    "occasion": [],
    "theme": [
      "Profession"
    ],
    "size": [
      "10×12 in",
      "12×16 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3800,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3900,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4450,
        "available": true
      }
    ],
    "description": "The Baker Special Miniature Wall",
    "featured": false,
    "visible": true
  },
  {
    "id": "parents-to-be-miniature-wall",
    "name": "Parents to Be Miniature Wall",
    "price": 3250,
    "priceFrom": true,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/PARENTSTOBE_MINIATUREWALL_cb6d1fae-496c-492a-a6fa-c414409d7a59.jpg?v=1707735808",
    "image2": null,
    "alt": "Parents to Be Miniature Wall – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-12",
    "order": 41,
    "occasion": [
      "Baby & Kids"
    ],
    "theme": [
      "Family"
    ],
    "size": [
      "10×12 in",
      "12×16 in"
    ],
    "light": [
      "With light",
      "Without light"
    ],
    "variants": [
      {
        "size": "10×12 in",
        "light": "Without light",
        "price": 3250,
        "available": true
      },
      {
        "size": "10×12 in",
        "light": "With light",
        "price": 3800,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "Without light",
        "price": 3900,
        "available": true
      },
      {
        "size": "12×16 in",
        "light": "With light",
        "price": 4450,
        "available": true
      }
    ],
    "description": "Parents to Be Miniature Wall",
    "featured": false,
    "visible": true
  },
  {
    "id": "engagement-platter",
    "name": "Engagement Platter",
    "price": 4500,
    "priceFrom": false,
    "compareAt": null,
    "inStock": true,
    "image": "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/ENGAGEMENTPLATTER.jpg?v=1707732990",
    "image2": null,
    "alt": "Engagement Platter – handmade personalised miniature frame",
    "isNew": false,
    "created": "2024-02-12",
    "order": 42,
    "occasion": [
      "Wedding & Engagement"
    ],
    "theme": [
      "Couple"
    ],
    "size": [],
    "light": [],
    "variants": [
      {
        "size": null,
        "light": null,
        "price": 4500,
        "available": true
      }
    ],
    "description": "Engagement Platter",
    "featured": false,
    "visible": true
  }
];}

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');

function makeTestEnvironment(fileToLoad) {
  const tables = {};
  const props = {
    CBP_PRODUCTION: 'true',
    CBP_TOKEN_SECRET: 'test-secret-not-production',
    CBP_OWNER_EMAIL: 'owner@example.com'
  };
  const cache = {};
  let identity = 'owner@example.com';
  let sent = 0;

  const ss = {
    getOwner: () => ({ getEmail: () => 'owner@example.com' }),
    getSheetByName: n => tables[n] || null,
    insertSheet: n => {
      tables[n] = sheet(n, []);
      return tables[n];
    },
    getUrl: () => 'https://docs.google.com/spreadsheets/d/test/edit'
  };

  function sheet(name, headers) {
    const rows = headers.length ? [headers.slice()] : [];
    return {
      rows,
      getLastRow: () => rows.length,
      appendRow: r => rows.push(r.slice()),
      setFrozenRows: () => {},
      getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
      getRange: (r, c, n = 1, w = 1) => ({
        getValues: () => Array.from({ length: n }, (_, i) => Array.from({ length: w }, (_, j) => rows[r - 1 + i]?.[c - 1 + j] ?? '')),
        setValue: v => {
          if (!rows[r - 1]) rows[r - 1] = [];
          rows[r - 1][c - 1] = typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v;
        },
        setValues: values => {
          values.forEach((row, i) => {
            if (!rows[r - 1 + i]) rows[r - 1 + i] = [];
            row.forEach((v, j) => {
              rows[r - 1 + i][c - 1 + j] = typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v;
            });
          });
        }
      })
    };
  }

  const ctx = {
    console,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => props[k] ?? null,
        setProperty: (k, v) => (props[k] = String(v))
      })
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      getActive: () => ss,
      flush() {}
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: (d, tz, pattern) => '22 Oct 2026',
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_, s) => [...crypto.createHash('sha256').update(s).digest()],
      base64Encode: b => Buffer.from(b).toString('base64')
    },
    LockService: {
      getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {} })
    },
    CacheService: {
      getScriptCache: () => ({ get: k => cache[k], put: (k, v) => (cache[k] = v) })
    },
    Session: {
      getActiveUser: () => ({ getEmail: () => identity }),
      getScriptTimeZone: () => 'Asia/Kolkata'
    },
    ScriptApp: {
      getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/test/exec' })
    },
    MailApp: {
      getRemainingDailyQuota: () => 10,
      sendEmail: () => sent++
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: t => ({
        setMimeType: () => JSON.parse(t)
      })
    },
    HtmlService: {
      createHtmlOutputFromFile: f => ({ setTitle: t => ({ title: t, file: f }) })
    }
  };

  vm.createContext(ctx);

  if (fileToLoad) {
    vm.runInContext(fs.readFileSync(fileToLoad, 'utf8'), ctx);
  } else {
    vm.runInContext(fs.readFileSync('backend/google-sheets/Code.gs', 'utf8'), ctx);
    vm.runInContext(fs.readFileSync('backend/google-sheets/Production.gs', 'utf8'), ctx);
  }

  for (const [name, header] of Object.entries(ctx.CBP_TABLES)) {
    tables[name] = sheet(name, header);
  }

  ctx.cbpAppend_('Shop Settings', [
    { Key: 'Accept orders', Value: true },
    { Key: 'Shipping fee paise', Value: 9900 },
    { Key: 'Free shipping threshold paise', Value: 99900 }
  ]);
  ctx.cbpAppend_('Shop Products', [
    {
      'Product ID': 'gift',
      Name: 'Handmade gift',
      Description: 'A personal gift.',
      State: 'published',
      Featured: true,
      Occasions: 'Birthday',
      Themes: 'Family',
      Version: 1
    }
  ]);
  ctx.cbpAppend_('Shop Variants', [
    {
      'Variant ID': 'gift-small',
      'Product ID': 'gift',
      Size: 'Small',
      Lighting: 'Without light',
      'Price paise': 100000,
      Available: true
    }
  ]);
  ctx.cbpAppend_('Shop Images', [
    {
      'Image ID': 'gift-cover',
      'Product ID': 'gift',
      URL: 'https://example.com/gift.png',
      'Alt text': 'Handmade gift',
      Position: 0
    }
  ]);

  return { ctx, tables, props, sent: () => sent };
}

function runTests(label, filePath) {
  console.log(`\n=== Running tests for: ${label} ===`);
  const env = makeTestEnvironment(filePath);
  const { ctx, tables } = env;

  ctx.publishCatalogue();

  // Create a real order
  const order = {
    payment: 'whatsapp',
    customer: { name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210' },
    address: { line1: '404 MG Road', line2: '', city: 'Bangalore', state: 'Karnataka', pin: '560001' },
    gift: { occasion: 'Birthday', message: 'Happy Birthday!' },
    lines: [{ id: 'gift', variantId: 'gift-small', qty: 1, note: 'Custom note', price: 1000 }],
    total: 1000
  };
  const quote = ctx.cbpQuote_(order).quote;
  const created = ctx.cbpCreate_({
    action: 'create',
    requestId: crypto.randomUUID(),
    order,
    quoteFingerprint: quote.fingerprint,
    quoteExpires: quote.expiresAt,
    quoteToken: quote.token
  });

  assert(created.ok, 'Order creation should succeed');
  const orderNumber = created.id; // e.g. CBP-1001
  console.log(`✓ Order created: ${orderNumber}`);

  // Test 1: listOrders with wrong password
  const badAuth = ctx.doGet({ parameter: { action: 'listOrders', pw: 'wrong_pw' } });
  assert.equal(badAuth.ok, false, 'listOrders should reject wrong password');
  assert.equal(badAuth.error, 'Unauthorized', 'listOrders error should be Unauthorized');
  console.log('✓ listOrders rejects wrong password correctly');

  // Test 2: listOrders with correct password (craftbypayal2025)
  const ordersResp = ctx.doGet({ parameter: { action: 'listOrders', pw: 'craftbypayal2025' } });
  assert(ordersResp.ok, 'listOrders should succeed with correct password');
  assert(Array.isArray(ordersResp.orders), 'orders should be an array');
  assert.equal(ordersResp.orders.length, 1, 'should have 1 order');
  const o = ordersResp.orders[0];
  assert.equal(o.id, orderNumber);
  assert.equal(o.name, 'Priya Sharma');
  assert.equal(o.total, 1000); // 1000 (free shipping above 999)
  assert(ordersResp.statuses.includes('Placed'), 'statuses should include Placed');
  assert(ordersResp.statuses.includes('Handcrafting'), 'statuses should include Handcrafting');
  console.log(`✓ listOrders returned order details correctly: ID=${o.id}, Total=₹${o.total}`);

  // Test 3: updateStatus with wrong password
  const badUpdate = ctx.doPost({
    postData: { contents: JSON.stringify({ action: 'updateStatus', pw: 'wrong_pw', id: orderNumber, status: 'Handcrafting' }) }
  });
  assert.equal(badUpdate.ok, false);
  assert.equal(badUpdate.error, 'Unauthorized');
  console.log('✓ updateStatus rejects wrong password correctly');

  // Test 4: updateStatus with correct password
  const goodUpdate = ctx.doPost({
    postData: { contents: JSON.stringify({ action: 'updateStatus', pw: 'craftbypayal2025', id: orderNumber, status: 'Handcrafting' }) }
  });
  assert.equal(goodUpdate.ok, true, 'updateStatus should succeed');
  const checkUpdated = ctx.doGet({ parameter: { action: 'listOrders', pw: 'craftbypayal2025' } });
  assert.equal(checkUpdated.orders[0].status, 'Handcrafting', 'Order status should now be Handcrafting');
  console.log('✓ updateStatus updated status in Shop Orders to Handcrafting');

  // Test 5: public tracking by Order Number + Phone
  const trackValid = ctx.doGet({ parameter: { action: 'track', id: orderNumber, phone: '9876543210' } });
  assert.equal(trackValid.ok, true, 'Public track should succeed for correct order and phone');
  assert.equal(trackValid.status, 'Handcrafting', 'Track status should be Handcrafting');
  assert.equal(trackValid.firstName, 'Priya', 'First name should be Priya');
  console.log('✓ Public tracking found order and returned status: Handcrafting');

  // Test 6: public tracking with wrong phone
  const trackWrongPhone = ctx.doGet({ parameter: { action: 'track', id: orderNumber, phone: '9999999999' } });
  assert.equal(trackWrongPhone.ok, false);
  assert.equal(trackWrongPhone.error, 'not_found');
  console.log('✓ Public tracking rejects wrong phone');

  // Test 7: listProducts
  const prodResp = ctx.doGet({ parameter: { action: 'listProducts', pw: 'craftbypayal2025' } });
  assert.equal(prodResp.ok, true, 'listProducts should succeed');
  console.log('✓ listProducts succeeded');

  console.log(`>>> ALL CHECKS PASSED FOR: ${label} <<<\n`);
}

// Check unified deploy/Code.gs
runTests('deploy/Code.gs', 'backend/google-sheets/deploy/Code.gs');
// Check modular source files
runTests('Modular Code.gs + Production.gs', null);

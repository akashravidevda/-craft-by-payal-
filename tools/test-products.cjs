// Run: node tools/test-products.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../site');
const rows=[['Product ID','Product JSON','Updated at']];
const sh={getLastRow:()=>rows.length,appendRow:r=>rows.push(r),setFrozenRows:()=>{},getRange:(r,c,n=1,w=1)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+w)),setValues:values=>values.forEach((v,i)=>rows[r-1+i]=v)})};
const backend={PropertiesService:{getScriptProperties:()=>({getProperty:()=>null})},SpreadsheetApp:{getActive:()=>({getSheetByName:()=>sh})},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}};
vm.createContext(backend);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../backend/google-sheets/Code.gs'),'utf8'),backend);
const invoke=body=>backend.doPost({postData:{contents:JSON.stringify(body)}});
const pw=backend.OWNER_PASSWORD;
const fixture={id:'test-gift',name:'A gift <with> care',description:'A handmade test gift.',images:['https://example.com/gift.png'],variants:[{size:'Standard',light:'',price:1250,available:true}],visible:true,featured:true,occasion:['Birthday'],theme:['Family']};
assert.equal(invoke({action:'saveProduct',pw:'wrong',product:fixture}).ok,false);
assert.equal(invoke({action:'saveProduct',pw,product:{...fixture,variants:[{size:'x',light:'',price:-1,available:true}]}}).ok,false);
assert.equal(invoke({action:'saveProduct',pw,product:{...fixture,images:['javascript:bad']}}).ok,false);
assert.equal(invoke({action:'saveProduct',pw,product:{...fixture,variants:[fixture.variants[0],fixture.variants[0]]}}).ok,false);
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.route('https://shop.test/**',route=>{const u=new URL(route.request().url()),file=path.join(root,decodeURIComponent(u.pathname));if(!file.startsWith(root)||!fs.existsSync(file))return route.fulfill({status:404,body:''});const ext=path.extname(file);route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[ext]||'application/octet-stream'});});
await context.route('https://shop.test/js/config.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(root,'js/config.js'),'utf8').replace('CATALOG_SCHEMA: 2','CATALOG_SCHEMA: 1')}));
await context.route('https://script.google.com/**',async route=>{
 const req=route.request(),u=new URL(req.url());let d;
 if(req.method()==='POST')d=invoke(JSON.parse(req.postData()));
 else if(u.searchParams.get('action')==='listOrders')d={ok:u.searchParams.get('pw')===pw,orders:[],statuses:['Placed','Delivered']};
 else d=backend.doGet({parameter:Object.fromEntries(u.searchParams)});
 await route.fulfill({json:d});
});
await context.route('https://example.com/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#F7D2B8"/></svg>'}));
await context.route(/https:\/\/(fonts\.|cdn.shopify)/,r=>r.abort());
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('https://shop.test/admin.html');await page.locator('#pw-input').fill(pw);await page.locator('#login-form').evaluate(f=>f.requestSubmit());await page.locator('[data-section="products"]').click();await page.locator('#new-product').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#new-product').disabled);await page.locator('#new-product').click();
await page.locator('[name="name"]').fill(fixture.name);await page.locator('[name="id"]').fill(fixture.id);await page.locator('[name="description"]').fill(fixture.description);await page.locator('[name="images"]').fill(fixture.images[0]);await page.locator('[data-v="price"]').fill('1250');await page.locator('[name="featured"]').check();await page.locator('#save-product').click();await page.waitForFunction(()=>!document.querySelector('#product-editor').open);assert.equal(rows.length,2);
await page.locator('[data-edit="test-gift"]').click();await page.locator('[name="name"]').fill('Edited gift');await page.locator('#save-product').click();await page.waitForFunction(()=>!document.querySelector('#product-editor').open);assert.equal(JSON.parse(rows[1][1]).name,'Edited gift');
const stale=invoke({action:'saveProduct',pw,product:fixture,updated:'stale'});assert.equal(stale.ok,false);
await page.screenshot({path:path.resolve(__dirname,'../design/products-desktop.png'),fullPage:true});
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('[data-edit="test-gift"]').click();assert.equal(await page.locator('#product-editor').evaluate(el=>el.scrollWidth>el.clientWidth),false);await page.screenshot({path:path.resolve(__dirname,'../design/products-editor-mobile.png')});await page.locator('#cancel-product').click();
await page.goto('https://shop.test/index.html');await page.evaluate(()=>window.CBP_READY);assert.equal(await page.locator('[data-products]').getByText('Edited gift',{exact:true}).count(),1);
await page.goto('https://shop.test/collections/miniature-frame.html?q=Edited');await page.evaluate(()=>window.CBP_READY);await page.getByRole('link',{name:'Edited gift',exact:true}).click();await page.waitForURL('**/products/item.html?id=test-gift');await page.evaluate(()=>window.CBP_READY);assert.equal(await page.locator('#pdp-title').textContent(),'Edited gift');await page.locator('[data-pdp-add]').click();await page.goto('https://shop.test/cart.html');await page.evaluate(()=>window.CBP_READY);assert.equal(await page.locator('[data-cart-lines]').getByText('Edited gift',{exact:true}).count(),1);assert.match(await page.locator('[data-cart-lines] a').first().getAttribute('href'),/item.html\?id=test-gift/);
const saved=JSON.parse(rows[1][1]);assert.equal(invoke({action:'saveProduct',pw,product:{...saved,visible:false},updated:saved.updated}).ok,true);
await page.goto('https://shop.test/products/item.html?id=test-gift');await page.evaluate(()=>window.CBP_READY);assert.match(await page.locator('main').textContent(),/unavailable/);
await page.goto('https://shop.test/index.html');await page.evaluate(()=>window.CBP_READY);assert.equal(await page.locator('[data-products]').getByText('Edited gift',{exact:true}).count(),0);
assert.deepEqual(errors,[]);console.log('Passed: backend authorization, validation, conflict detection; owner sign-in, create/edit, persistence, mobile editor; home and collection listings, detail page, cart, hide product.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

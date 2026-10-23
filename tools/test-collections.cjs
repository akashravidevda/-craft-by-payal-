// Isolated data only: no Google writes, customer orders or outbound messages.
const {makeBackend}=require('./test-production.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');

function addResin(b){
 const c=b.c;
 c.cbpAppend_('Shop Products',[{'Product ID':'resin-test',Name:'Test resin coasters',Description:'Test fixture: set of coasters.',State:'published',Collection:'resin-art','Product type':'Coasters','Care instructions':'Test care instructions.',Occasions:'Birthday',Themes:'Home',Version:1}]);
 c.cbpAppend_('Shop Variants',[{'Variant ID':'resin-four','Product ID':'resin-test',Size:'Set of 4',Lighting:'','Price paise':75000,Available:true},{'Variant ID':'resin-six','Product ID':'resin-test',Size:'Set of 6',Lighting:'','Price paise':110000,Available:true}]);
 c.cbpAppend_('Shop Images',[{'Image ID':'resin-photo','Product ID':'resin-test',URL:'https://example.com/resin.png','Alt text':'Test resin coasters',Position:0}]);
}
function backendTests(){
 const b=makeBackend(),c=b.c;c.publishCatalogue();
 // Simulate the exact pre-collection headers, including published history.
 for(const n of ['Shop Products','Published Products'])b.tables[n].rows.forEach(r=>r.splice(-3));
 const before=JSON.stringify(b.tables['Shop Orders'].rows);
 assert.equal(c.migrateCollectionFields().columnsAdded,6);
 assert.equal(c.migrateCollectionFields().columnsAdded,0);
 assert.equal(c.cbpRows_('Shop Products')[0].Collection,'miniature-frame');
 assert.equal(c.cbpRows_('Published Products')[0].Collection,'miniature-frame');
 assert.equal(JSON.stringify(b.tables['Shop Orders'].rows),before);
 addResin(b);c.publishCatalogue();let cat=c.cbpCatalog_();assert.equal(cat.collectionSchema,1);assert.equal(cat.products.length,2);assert.equal(cat.products[1].collection,'resin-art');assert.equal(cat.products[1].careInstructions,'Test care instructions.');
 c.migrateCollectionFields();assert.equal(c.cbpRows_('Shop Products')[1].Collection,'resin-art');
 const publication=b.props.CBP_PUBLICATION;c.cbpUpdate_('Shop Products',c.cbpRows_('Shop Products')[1],{Collection:'bad'});assert.throws(()=>c.publishCatalogue(),/Choose Collection/);assert.equal(b.props.CBP_PUBLICATION,publication);
 c.cbpUpdate_('Shop Products',c.cbpRows_('Shop Products')[1],{Collection:'resin-art',State:'draft'});c.publishCatalogue();assert.equal(c.cbpCatalog_().products.length,1);
 // Unknown header stops both tables before any mutation.
 const bad=makeBackend();bad.tables['Shop Products'].rows.forEach(r=>r.splice(-3));bad.tables['Published Products'].rows[0][1]='Broken';const snapshot=JSON.stringify(bad.tables['Shop Products'].rows);assert.throws(()=>bad.c.migrateCollectionFields(),/Unexpected columns/);assert.equal(JSON.stringify(bad.tables['Shop Products'].rows),snapshot);
 // Interrupted migration resumes using actual headers rather than its property.
 const partial=makeBackend();for(const n of ['Shop Products','Published Products'])partial.tables[n].rows.forEach(r=>r.splice(-3));partial.failNext('Published Products');assert.throws(()=>partial.c.migrateCollectionFields(),/Injected/);partial.c.migrateCollectionFields();assert.equal(partial.c.cbpRows_('Shop Products')[0].Collection,'miniature-frame');
 // Taxonomy migration corrects only known IDs and requires explicit review for others.
 const t=makeBackend(),tc=t.c;tc.cbpAppend_('Shop Products',[{'Product ID':'engagement-platter-copy',Name:'Platter',Collection:'miniature-frame',State:'draft'},{'Product ID':'custom-unknown',Name:'Unknown',Collection:'resin-art',State:'draft'}]);
 const orders=JSON.stringify(t.tables['Shop Orders'].rows);let migration=tc.migrateGiftTaxonomy();
 assert.equal(tc.cbpRows_('Shop Products')[1].Collection,'engagement-platter');assert(migration.needsReview.includes('gift'));assert(migration.needsReview.includes('custom-unknown'));
 tc.confirmGiftTypeAssignment('gift','miniature-frame');tc.confirmGiftTypeAssignment('custom-unknown','resin-art');assert.equal(tc.getGiftTypeReview().products.length,0);
 tc.migrateGiftTaxonomy();assert.equal(tc.getGiftTypeReview().products.length,0);assert.equal(tc.cbpRows_('Shop Gift Types').length,5);assert.equal(JSON.stringify(t.tables['Shop Orders'].rows),orders);
 tc.publishCatalogue();assert.equal(tc.cbpCatalog_().taxonomyVersion,2);assert.equal(tc.cbpCatalog_().giftTypes.length,5);
 let reg=tc.cbpRows_('Shop Gift Types').find(r=>r.ID==='miniature-frame');tc.cbpUpdate_('Shop Gift Types',reg,{Name:'New type label'});assert.equal(tc.cbpCatalog_().giftTypes[0].name,'Miniature Frames');
 const pointer=t.props.CBP_PUBLICATION;t.failNext('Published Gift Types');assert.throws(()=>tc.publishCatalogue(),/Injected/);assert.equal(t.props.CBP_PUBLICATION,pointer);assert.equal(tc.cbpCatalog_().giftTypes[0].name,'Miniature Frames');tc.publishCatalogue();assert.equal(tc.cbpCatalog_().giftTypes[0].name,'New type label');
 tc.cbpUpdate_('Shop Gift Types',reg,{Enabled:false});assert.throws(()=>tc.publishCatalogue(),/Choose Collection/);
 const schema=makeBackend();schema.tables['Shop Gift Types'].rows[0][1]='Broken';schema.tables['Shop Products'].rows.forEach(r=>r.splice(-3));const unchanged=JSON.stringify(schema.tables);assert.throws(()=>schema.c.migrateGiftTaxonomy(),/Unexpected columns/);assert.equal(JSON.stringify(schema.tables),unchanged);
 console.log('Passed: taxonomy exact-ID migration; explicit unknown-product review; repeated migration; owner confirmation; registry snapshots and failed publication recovery; disabled types; schema preflight; orders unchanged.');
 console.log('Passed: collection migration, repeat/partial recovery, preflight safety, published snapshots, strict collections, draft isolation.');
}

async function browserTests(){
 const {chromium}=require('playwright');
 const b=makeBackend();addResin(b);b.c.publishCatalogue();let offline=false,legacy=false,malformed=false,empty=false,loseReply=false,promote=false;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://shop.test/**',route=>{const file=path.join(process.cwd(),'site',new URL(route.request().url()).pathname);let body=fs.readFileSync(file);if(file.endsWith('config.js')&&promote)body=body.toString().replace('RESIN_ART_ENABLED: false','RESIN_ART_ENABLED: true').replace("RESIN_ART_IMAGE: ''","RESIN_ART_IMAGE: 'https://example.com/approved-test-image.png'");return route.fulfill({body,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html'});});
 await page.route('https://script.google.com/**',route=>{
  const req=route.request();if(req.method()==='POST'){const d=JSON.parse(req.postData()),result=b.c.cbpPublicPost_({postData:{contents:req.postData()}});if(d.action==='create'&&loseReply){loseReply=false;return route.abort();}return route.fulfill({json:result});}
  if(offline)return route.abort();let data=JSON.parse(JSON.stringify(b.c.cbpCatalog_()));
  if(empty)data.products=data.products.filter(p=>p.collection!=='resin-art');
  if(legacy){delete data.taxonomyVersion;delete data.collectionSchema;data.products=data.products.filter(p=>p.collection==='miniature-frame');data.products.forEach(p=>delete p.collection);}
  if(malformed)delete data.products[1].collection;
  return route.fulfill({json:data});
 });
 await page.route(/https:\/\/(fonts\.|cdn.shopify|example.com)/,r=>r.abort());
 const go=async url=>{await page.goto('https://shop.test/'+url);await page.evaluate(()=>window.CBP_READY);await page.locator('[data-count]').filter({hasNotText:'Loading'}).waitFor();};
 await go('collections/miniature-frame.html');assert.equal(await page.locator('.ccard').count(),1);assert.match(await page.locator('[data-grid]').innerText(),/Handmade gift/);assert.doesNotMatch(await page.locator('[data-grid]').innerText(),/resin/);
 await go('collections/resin-art.html?light=With+light&page=999');assert.equal(await page.locator('.ccard').count(),1);assert.equal(await page.locator('[data-facet="light"]').isVisible(),false);assert.equal(await page.locator('[data-facet="subtype"]').isVisible(),true);assert.doesNotMatch(page.url(),/light=|page=999/);
 await page.getByRole('checkbox',{name:/Coasters/}).check();assert.equal(await page.locator('.ccard').count(),1);await page.getByRole('button',{name:'Clear All',exact:true}).first().click();assert.doesNotMatch(page.url(),/subtype=/);
 await go('collections/all.html');assert.equal(await page.locator('.ccard').count(),2);await page.getByRole('checkbox',{name:/Resin Art/}).check();assert.equal(await page.locator('.ccard').count(),1);await page.locator('[data-sort]').selectOption('price-desc');assert.match(page.url(),/sort=price-desc/);
 await go('collections/resin-art.html?q=unmatched');assert.equal(await page.locator('[data-empty]').isVisible(),true);assert.match(await page.locator('[data-empty]').innerText(),/No products match/);
 empty=true;await go('collections/resin-art.html');assert.equal(await page.locator('[data-empty]').isVisible(),true);assert.match(page.url(),/giftType=resin-art/);await page.screenshot({path:'design/resin-art-preview.png',fullPage:true});empty=false;
 legacy=true;await go('collections/all.html');assert.equal(await page.locator('.ccard').count(),1);assert.equal(await page.evaluate(()=>CBP_CATALOG[0].collection),'unclassified');legacy=false;
 await go('collections/all.html');malformed=true;await go('collections/resin-art.html');assert.equal(await page.locator('.ccard').count(),1);assert.equal(await page.locator('.catalog-notice').count(),1);malformed=false;
 offline=true;await go('collections/all.html');assert.equal(await page.locator('.ccard').count(),2);offline=false;
 await page.goto('https://shop.test/products/item.html?id=resin-test');await page.evaluate(()=>window.CBP_READY);assert.equal(await page.locator('#pdp-title').textContent(),'Test resin coasters');assert.equal(await page.locator('.crumbs li:nth-child(2) a').innerText(),'Resin Art');assert.equal(await page.locator('.perso__photos').count(),0);assert.equal(await page.locator('.v2rel').isVisible(),false);assert.match(await page.locator('.v2acc').innerText(),/Product details/);
 await page.getByRole('radio',{name:'Set of 6',exact:true}).check();await page.locator('[data-pdp-add]').click();assert.equal(await page.evaluate(()=>CBP.cartLines()[0].variantId),'resin-six');
 await go('collections/miniature-frame.html');assert.equal(await page.locator('[data-grid] [data-add]').count(),0);await page.getByRole('link',{name:'View details for Handmade gift',exact:true}).click();await page.evaluate(()=>window.CBP_READY);await page.locator('[data-pdp-add]').click();
 offline=true;await page.goto('https://shop.test/cart.html');await page.evaluate(()=>window.CBP_READY);assert.equal(await page.evaluate(()=>CBP.cartLines().length),2);offline=false;
 await page.goto('https://shop.test/checkout.html');await page.evaluate(()=>window.CBP_READY);
 for(const [name,value]of Object.entries({email:'mixed@example.com',phone:'9876543210',name:'Mixed Test',address1:'123 Test Road',city:'Mumbai',pin:'400001'}))await page.locator('[data-checkout] [name="'+name+'"]').fill(value);
 await page.locator('[name="state"]').selectOption({label:'Maharashtra'});loseReply=true;await page.locator('[data-place-order]').click();await page.waitForFunction(()=>document.querySelector('[data-co-errors]').textContent.includes('network'));await page.locator('[data-place-order]').click();await page.waitForURL('**/order-confirmation.html');await page.evaluate(()=>window.CBP_READY);assert.equal(b.tables['Shop Orders'].rows.length,2);assert.equal(b.tables['Shop Order Items'].rows.length,3);assert.equal(b.c.cbpRows_('Shop Orders')[0]['Total paise'],210000);assert.doesNotMatch(await page.locator('[data-done]').innerText(),/Payment pending|Payment received/i);assert.equal(b.c.cbpRows_('Shop Orders')[0]['Payment status'],'Pending');assert.equal(await page.getByRole('link',{name:'Upload photos privately'}).count(),0);
 const wa=new URL(await page.getByRole('link',{name:'Open WhatsApp to confirm'}).getAttribute('href')).searchParams.get('text');assert.match(wa,/Test resin coasters/);assert.match(wa,/Handmade gift/);
 for(const width of [390,768,1280]){await page.setViewportSize({width,height:900});await go('collections/resin-art.html');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`design/resin-art-${width}.png`,fullPage:true});}
 await page.goto('https://shop.test/index.html');await page.evaluate(()=>window.CBP_READY);assert.equal(await page.locator('[data-gift-type-menu] a').filter({hasText:'Resin Art'}).count(),2);
 await go('collections/all.html?giftType=resin-art');await page.locator('[data-sort]').selectOption('az');await page.goBack();assert.doesNotMatch(page.url(),/sort=az/);assert.equal(await page.locator('.ccard').count(),1);
 assert.deepEqual(errors,[]);console.log('Passed: unified catalogue entry presets, filters/URL state, legacy/cache outage, resin product/options, mixed-cart lost-response retry, neutral confirmation, mobile/tablet/desktop layout, registry navigation and browser history.');
 }finally{await browser.close();}
}
backendTests();if(process.argv.includes('--browser'))browserTests().catch(e=>{console.error(e);process.exitCode=1;});

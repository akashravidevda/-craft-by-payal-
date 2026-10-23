// Exercise checkout against an isolated in-memory backend, never the live shop.
const {makeBackend}=require('./test-production.cjs');
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const backend=makeBackend(),c=backend.c;c.publishCatalogue();
 let failCatalog=false,loseReply=false;const requests=[],errors=[];
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://shop.test/**',route=>{const file=path.join(process.cwd(),'site',decodeURIComponent(new URL(route.request().url()).pathname));return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html'});});
 await page.route('https://script.google.com/**',route=>{const req=route.request();if(req.method()==='POST'){const body=JSON.parse(req.postData());requests.push(body);const data=c.cbpPublicPost_({postData:{contents:req.postData()}});if(body.action==='create'&&loseReply){loseReply=false;return route.abort();}return route.fulfill({json:data});}return failCatalog?route.abort():route.fulfill({json:c.cbpCatalog_()});});
 await page.route(/https:\/\/(fonts\.|cdn.shopify|example.com)/,route=>route.abort());
 await page.goto('https://shop.test/index.html');await page.evaluate(()=>window.CBP_READY);await page.locator('[data-add="gift"]').click();assert.equal(await page.evaluate(()=>CBP.cartLines()[0].variantId),'gift-small');
 failCatalog=true;await page.goto('https://shop.test/checkout.html');await page.evaluate(()=>window.CBP_READY);assert.equal(await page.evaluate(()=>CBP.cartLines().length),1);assert.equal(await page.locator('[data-co-empty]').isVisible(),false);assert.equal(await page.locator('.catalog-notice').count(),1);
 await page.evaluate(()=>localStorage.removeItem('cbp-published-catalog-v2'));await page.reload();await page.evaluate(()=>window.CBP_READY);assert.equal(await page.evaluate(()=>CBP.cartLines()[0].unresolved),true);assert.equal(await page.evaluate(()=>CBP.cartLines()[0].p.name),'Handmade gift');
 failCatalog=false;await page.reload();await page.evaluate(()=>window.CBP_READY);
 assert.equal(await page.getByRole('button',{name:'Submit order request',exact:true}).count(),1);
 assert.equal(await page.getByRole('group',{name:'4 Order confirmation'}).count(),1);
 for(const [name,value]of Object.entries({email:'buyer@example.com',phone:'9876543210',name:'Test Buyer',address1:'123 Test Road',city:'Mumbai',pin:'400001'}))await page.locator('[data-checkout] [name="'+name+'"]').fill(value);
 await page.locator('[name="state"]').selectOption({label:'Maharashtra'});
 loseReply=true;await page.locator('[data-place-order]').click();await page.waitForFunction(()=>document.querySelector('[data-co-errors]').textContent.includes('network'));assert.equal(backend.tables['Shop Orders'].rows.length,2);const first=requests.find(r=>r.action==='create').requestId;assert.equal(await page.evaluate(()=>CBP.cartLines().length),1);
 await page.locator('[data-place-order]').click();await page.waitForURL('**/order-confirmation.html');await page.evaluate(()=>window.CBP_READY);assert.equal(backend.tables['Shop Orders'].rows.length,2);assert.equal(requests.filter(r=>r.action==='create').at(-1).requestId,first);assert.equal(await page.evaluate(()=>localStorage.getItem('cbp-cart')),'{}');
 assert.deepEqual(await page.locator('.steps__item').allTextContents(),['✓Cart','✓Details','3Order submitted']);
 assert.equal(await page.locator('[data-done-eyebrow]').textContent(),'Order request received');assert.equal(await page.locator('[data-done-payment]').count(),0);assert.doesNotMatch(await page.locator('[data-done]').innerText(),/Payment pending|Payment received/i);
 const text=new URL(await page.getByRole('link',{name:'Open WhatsApp to confirm'}).getAttribute('href')).searchParams.get('text');assert.match(text,/Order request/);assert.match(text,/Payment: Pending/);assert.doesNotMatch(text,/Paid online|Test payment/);
 assert.equal(await page.getByRole('link',{name:'Upload photos privately'}).count(),0);
 // Confirmation actions align at narrow, tablet and desktop widths.
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:900});
  const boxes=await page.locator('[data-done-actions] a').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,scroll:e.scrollWidth,client:e.clientWidth};}));
  assert.equal(boxes.length,3);assert(boxes.every(b=>b.h>=56&&b.scroll<=b.client+1));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(width<768){assert(Math.max(...boxes.map(b=>b.w))-Math.min(...boxes.map(b=>b.w))<1);assert(boxes.every(b=>Math.abs(b.x-boxes[0].x)<1));assert(boxes[1].y>=boxes[0].y+boxes[0].h+11);}
  else assert(boxes.every(b=>Math.abs(b.y-boxes[0].y)<1));
  await page.locator('[data-done-actions]').screenshot({path:`design/confirmation-actions-${width}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'design/whatsapp-order-mobile.png',fullPage:true});
 // Historical browser flags must not claim that payment was received.
 await page.evaluate(()=>{const o=JSON.parse(sessionStorage.getItem('cbp-last-order'));o.payment='online';o.status='paid';o.demo=true;o.uploadUrl='https://example.com/old-upload';o.uploadToken='historical-token';sessionStorage.setItem('cbp-last-order',JSON.stringify(o));});
 await page.setViewportSize({width:1280,height:900});await page.reload();await page.evaluate(()=>window.CBP_READY);assert.equal(await page.locator('[data-done-eyebrow]').textContent(),'Order request received');assert.equal(await page.locator('[data-done-payment]').count(),0);assert.doesNotMatch(await page.locator('[data-done]').innerText(),/Payment pending|Payment received/i);assert.equal(await page.getByRole('link',{name:'Open WhatsApp to confirm'}).count(),1);
 assert.equal(await page.getByRole('link',{name:'Upload photos privately'}).count(),0);await page.screenshot({path:'design/whatsapp-order-confirmation.png',fullPage:true});
 const track=await page.getByRole('link',{name:'Track this order'}).getAttribute('href');await page.goto('https://shop.test/'+track);await page.getByText('Pending',{exact:true}).waitFor();assert.equal(await page.getByText('Not dispatched',{exact:true}).count(),1);assert.deepEqual(errors,[]);
 console.log('Passed: mobile/desktop submission wording; historical payment flags; WhatsApp pending text; cart outage preservation; lost-response retry; single order; private upload and tracking; no browser errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

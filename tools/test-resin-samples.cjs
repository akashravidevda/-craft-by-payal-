const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));let samples=true;
 for(const origin of ['http://localhost:8000','https://shop.test'])await page.route(origin+'/**',route=>{
  const file=path.join(process.cwd(),'site',new URL(route.request().url()).pathname);let body=fs.readFileSync(file);if(file.endsWith('config.js')&&!samples)body=body.toString().replace('RESIN_ART_SAMPLES: true','RESIN_ART_SAMPLES: false');
  const type={'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'}[path.extname(file)]||'text/html';return route.fulfill({body,contentType:type});
 });
 await page.route('https://script.google.com/**',route=>route.fulfill({json:{ok:true,schema:1,products:[],shipping:{fee:99,freeAbove:999}}}));
 await page.route(/https:\/\/(fonts\.|cdn.shopify)/,route=>route.abort());
 const go=async url=>{await page.goto('http://localhost:8000/'+url);await page.evaluate(()=>CBP_READY);};
 await go('collections/resin-art.html');await page.locator('.ccard').last().waitFor();
 assert.equal(await page.locator('.ccard').count(),3);assert.equal(await page.locator('.shop').isVisible(),true);assert.equal(await page.locator('.resin-samples').count(),0);assert.equal(await page.locator('[data-grid] [data-add]').count(),0);assert.match(page.url(),/all.html\?giftType=resin-art/);
 assert.equal(await page.getByRole('checkbox',{name:/Miniature Frames/}).count(),1);assert.equal(await page.getByRole('checkbox',{name:/Engagement Platters/}).count(),1);
 await page.waitForFunction(()=>[...document.querySelectorAll('.ccard img')].every(e=>e.complete&&e.naturalWidth>0));
 const href=await page.locator('.ccard__name a').first().getAttribute('href');assert.match(decodeURIComponent(href),/return=\/collections\/all.html\?giftType=resin-art/);
 await page.locator('.ccard__wish').first().click();assert.equal(await page.evaluate(()=>CBP.isWished('ocean-shell-charms')),true);
 for(const width of [390,768,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`design/resin-unified-${width}.png`,fullPage:true});}
 await page.goto(new URL(href,'http://localhost:8000/collections/all.html').href);await page.evaluate(()=>CBP_READY);
 assert.equal(await page.locator('[data-pdp-add]:visible').count(),1);assert.equal(await page.getByRole('dialog').count(),0);
 await page.evaluate(()=>CBP.addToCart('ocean-shell-charms'));assert.equal(await page.evaluate(()=>CBP.cartLines().length),1);
 assert.match(await page.getByRole('link',{name:'Back to gifts',exact:true}).getAttribute('href'),/giftType=resin-art/);
 await go('collections/all.html?giftType=resin-art&min=0&max=10000');assert.equal(await page.locator('.ccard').count(),3);
 await go('collections/all.html?giftType=engagement-platter&giftType=resin-art');assert.equal(await page.locator('.ccard').count(),6);
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});const cards=await page.locator('.ccard').evaluateAll(es=>es.map(e=>({h:e.getBoundingClientRect().height,first:e.querySelector('.ccard__body').firstElementChild.tagName,media:e.querySelector('.ccard__media').getBoundingClientRect().height})));assert(cards.every(c=>c.first==='H3'));assert(Math.max(...cards.map(c=>c.h))-Math.min(...cards.map(c=>c.h))<2);assert(Math.max(...cards.map(c=>c.media))-Math.min(...cards.map(c=>c.media))<2);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`design/catalogue-matched-cards-${width}.png`,fullPage:true});}
 await go('collections/all.html?giftType=engagement-platter');assert.equal(await page.locator('.ccard').count(),3);
 await page.goto('https://shop.test/collections/all.html');await page.evaluate(()=>CBP_READY);assert.equal(await page.evaluate(()=>CBP_CATALOG.filter(p=>p.listingState==='preview').length),0);
 samples=false;await go('collections/all.html');assert.equal(await page.evaluate(()=>CBP_CATALOG.filter(p=>p.listingState==='preview').length),0);
 assert.deepEqual(errors,[]);console.log('Passed: unified cards and gift types; correct platter classification; local previews and photos; wishlist/detail/return flow; no preview orders or fake prices; price filter exclusion; production gate; responsive layouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

/* Shared catalogue overrides. Bundled products remain available if the service is offline. */
window.CBP_CATALOG_READY = (async () => {
  const api=(window.CBP_CONFIG||{}).ORDER_API;
  const base=window.CBP_CATALOG||[];
  window.CBP_PRODUCT_URL=(p,prefix='')=>p.managed?`${prefix}products/item.html?id=${encodeURIComponent(p.id)}`:`${prefix}products/${p.id}.html`;
  window.CBP_IMAGE=(url,width)=>{const u=new URL(url,location.href);if(u.hostname==='cdn.shopify.com')u.searchParams.set('width',width);return u.href;};
  const cacheKey='cbp-published-catalog-v2';
  let response=null;
  window.CBP_CATALOG_STATE={online:false,complete:false};
  if(api){try{
    const r=await fetch(api+'?action=catalog',{signal:AbortSignal.timeout(12000)});
    const d=await r.json();
    if(!d.ok||!Array.isArray(d.products))throw Error('Catalogue unavailable');
    response=d;window.CBP_CATALOG_STATE={online:true,complete:d.schema===2};
    try{localStorage.setItem(cacheKey,JSON.stringify(d));}catch{}
  }catch{try{response=JSON.parse(localStorage.getItem(cacheKey));}catch{}}}
  const overrides=response?.products||[];
  const complete=response?.schema===2;
  const map=new Map((complete?[]:base).map(p=>[p.id,p]));
  overrides.forEach(p=>{if(!/^[a-z0-9-]+$/.test(p.id))return;if(p.visible===false)map.delete(p.id);else map.set(p.id,{...p,managed:true});});
  window.CBP_CATALOG=[...map.values()];
  const featured=new Map((complete?[]:window.CBP_PRODUCTS||[]).map(p=>[p.id,p]));
  overrides.forEach(p=>{featured.delete(p.id);if(p.visible!==false&&p.featured)featured.set(p.id,{...p,managed:true});});
  window.CBP_PRODUCTS=[...featured.values()];
  window.CBP_SHIPPING=response?.shipping;
  if(api&&!window.CBP_CATALOG_STATE.online){
    const notice=document.createElement('p');notice.className='catalog-notice';notice.setAttribute('role','status');
    notice.textContent='Product updates are temporarily unavailable. Your cart is safe; prices and availability will be checked before ordering.';
    document.querySelector('main')?.prepend(notice);
  }
  const requested=location.pathname.endsWith('/products/item.html')?new URLSearchParams(location.search).get('id'):null;
  if(location.pathname.endsWith('/products/item.html')&&!requested){window.CBP_PRODUCT=null;document.querySelector('main').textContent='Choose a gift from our collection to view its details.';return;}
  const id=requested||window.CBP_PRODUCT?.id;
  if(!id)return;
  const hidden=overrides.some(p=>p.id===id&&p.visible===false);
  const p=window.CBP_CATALOG.find(p=>p.id===id);
  if(hidden||(requested&&!p)){
    const main=document.querySelector('main');main.replaceChildren();const h=document.createElement('h1');h.textContent='This gift is unavailable';const a=document.createElement('a');a.href='../collections/miniature-frame.html';a.textContent='Explore our other gifts';main.append(h,a);main.style.padding='60px 24px';window.CBP_PRODUCT=null;return;
  }
  if(!p?.managed)return;
  window.CBP_PRODUCT=p;
  document.title=p.name+' | Craft by Payal';
  document.querySelector('#pdp-title').textContent=p.name;
  document.querySelectorAll('[data-wish]').forEach(el=>{if(el.closest('.v2pdp__info')){el.dataset.wish=p.id;el.setAttribute('aria-label','Save '+p.name+' to wishlist');}});
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  document.querySelector('[data-track]').innerHTML=p.images.map((src,i)=>`<li class="gal__slide"><img src="${esc(src)}" alt="${esc(p.name)} — photo ${i+1}" width="900" height="840"></li>`).join('');
  document.querySelector('.gal__thumbs').innerHTML=p.images.map((src,i)=>`<li><button type="button" class="gal__thumb" data-thumb="${i}" aria-label="Show photo ${i+1}" ${i===0?'aria-current="true"':''}><img src="${esc(src)}" alt="" width="100" height="84"></button></li>`).join('');
  document.querySelector('.gal__count').innerHTML='<span data-gal-count>1</span> / '+p.images.length;
  const details=document.querySelectorAll('.v2acc__body');
  if(details[0])details[0].textContent=p.description;
  if(details[1])details[1].textContent='Available sizes: '+[...new Set(p.size)].join(', ')+'. Choose your size above.';
  const info=document.querySelector('.v2pdp__info');
  const desc=document.createElement('p');desc.textContent=p.description;desc.style.whiteSpace='pre-line';desc.style.margin='18px 0';info.querySelector('form').before(desc);
  document.querySelectorAll('.crumbs li:last-child,.breadcrumb li:last-child,.crumbs span:last-child,[aria-current="page"]').forEach(el=>el.textContent=p.name);
  document.querySelectorAll('script[type="application/ld+json"]').forEach(el=>el.remove());
})();

// Runs entirely in memory: no Google service calls, orders, files or emails.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
function makeBackend(){
 const tables={},props={CBP_PRODUCTION:'true',CBP_TOKEN_SECRET:'test-secret-not-production',CBP_OWNER_EMAIL:'owner@example.com'},cache={};let identity='owner@example.com',fault=null,sent=0;
 const ss={getOwner:()=>({getEmail:()=> 'owner@example.com'}),getSheetByName:n=>tables[n],getUrl:()=> 'https://docs.google.com/spreadsheets/d/test/edit'};
 function sheet(name,headers){const rows=[headers.slice()];return {rows,getLastColumn:()=>rows[0].length,getLastRow:()=>rows.length,getDataRange:()=>({getValues:()=>rows.map(r=>r.slice())}),getRange:(r,c,n=1,w=1)=>({getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>rows[r-1+i]?.[c-1+j]??'')),setValues:values=>{if(fault===name){fault=null;throw Error('Injected partial write');}values.forEach((row,i)=>{rows[r-1+i]??=[];row.forEach((v,j)=>rows[r-1+i][c-1+j]=typeof v==='string'&&v.startsWith("'")?v.slice(1):v);});}})};}
 const c={console,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]??null,setProperty:(k,v)=>props[k]=v})},SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush(){}},Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()],base64Encode:b=>Buffer.from(b).toString('base64')},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},CacheService:{getScriptCache:()=>({get:k=>cache[k],put:(k,v)=>cache[k]=v})},Session:{getActiveUser:()=>({getEmail:()=>identity})},ScriptApp:{getService:()=>({getUrl:()=> 'https://script.google.com/macros/s/test/exec'})},MailApp:{getRemainingDailyQuota:()=>10,sendEmail:()=>sent++},ContentService:{MimeType:{JSON:'json'},createTextOutput:t=>({setMimeType:()=>JSON.parse(t)})}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('backend/google-sheets/Code.gs','utf8'),c);vm.runInContext(fs.readFileSync('backend/google-sheets/Production.gs','utf8'),c);
 for(const [name,header]of Object.entries(c.CBP_TABLES))tables[name]=sheet(name,header);
 c.cbpAppend_('Shop Settings',[{Key:'Accept orders',Value:true},{Key:'Shipping fee paise',Value:9900},{Key:'Free shipping threshold paise',Value:99900}]);
 c.cbpAppend_('Shop Products',[{'Product ID':'gift',Collection:'miniature-frame',Name:'Handmade gift',Description:'A personal gift.',State:'published',Featured:true,Occasions:'Birthday',Themes:'Family',Version:1}]);
 c.cbpAppend_('Shop Variants',[{'Variant ID':'gift-small','Product ID':'gift',Size:'Small',Lighting:'Without light','Price paise':100000,Available:true},{'Variant ID':'gift-large','Product ID':'gift',Size:'Large',Lighting:'With light','Price paise':200000,Available:false}]);
 c.cbpAppend_('Shop Images',[{'Image ID':'gift-cover','Product ID':'gift',URL:'https://example.com/gift.png','Alt text':'Handmade gift',Position:0}]);
 return {c,tables,props,setIdentity:v=>identity=v,failNext:n=>fault=n,sent:()=>sent};
}
const {c,tables,props,setIdentity,failNext,sent}=makeBackend();
const order={payment:'whatsapp',customer:{name:'Akash',email:'akash@example.com',phone:'9876543210'},address:{line1:'123 Road',line2:'',city:'Mumbai',state:'Maharashtra',pin:'400001'},gift:{},lines:[{id:'gift',variantId:'gift-small',qty:2,note:'Names: A & P',price:1}],total:2};
c.publishCatalogue();const catalog=c.cbpCatalog_();assert.equal(catalog.schema,2);assert.equal(catalog.products.length,1);assert.equal(catalog.products[0].variants[0].id,'gift-small');
const quote=c.cbpQuote_(order).quote;assert.equal(quote.total,2000);assert.equal(quote.shipping,0);assert.equal(quote.lines[0].price,1000);
const make=()=>({action:'create',requestId:crypto.randomUUID(),order,quoteFingerprint:quote.fingerprint,quoteExpires:quote.expiresAt,quoteToken:quote.token});
assert.throws(()=>c.cbpQuote_({...order,lines:[{...order.lines[0],variantId:'gift-large'}]}),/no longer available/);
assert.throws(()=>c.cbpCreate_({...make(),quoteToken:'forged'}),/quote expired/);
const request=make();failNext('Shop Order Items');assert.throws(()=>c.cbpCreate_(request),/Injected/);assert.equal(tables['Shop Orders'].rows.length,2);assert.equal(tables['Shop Operations'].rows[1][2],'Pending');
const result=c.cbpCreate_(request);assert(result.ok);assert.equal(tables['Shop Orders'].rows.length,2);assert.equal(tables['Shop Order Items'].rows.length,2);assert.equal(c.cbpCreate_(request).id,result.id);assert.equal(tables['Shop Notifications'].rows.length,3);
assert.throws(()=>c.cbpCreate_({...request,order:{...order,customer:{...order.customer,name:'Other'}}}),/different details/);
assert.throws(()=>c.cbpTrack_({orderId:result.orderId,token:'invalid'}),/could not be verified/);
assert.equal(c.cbpTrack_({orderId:result.orderId,token:result.accessToken}).payment,'Pending');
assert.throws(()=>c.cbpAccessOrder_(result.orderId,result.accessToken,true),/could not be verified/);
assert.throws(()=>c.cbpDispatch_({action:'paid'}),/owner only/);
setIdentity('other@example.com');assert.throws(()=>c.verifyOwnerPayment(result.orderId,'TEST'),/owner/);assert.throws(()=>c.publishCatalogue(),/owner/);setIdentity('owner@example.com');
c.verifyOwnerPayment(result.orderId,'TEST');c.verifyOwnerPayment(result.orderId,'TEST');assert.equal(tables['Shop Payments'].rows.length,2);assert.equal(c.cbpTrack_({orderId:result.orderId,token:result.accessToken}).payment,'Verified paid');
c.updateOwnerProduction(result.orderId,'Designing');assert.throws(()=>c.updateOwnerProduction(result.orderId,'Ready'),/one production stage/);
c.cbpProcessJobs_();assert.equal(sent(),2);c.cbpProcessJobs_();assert.equal(sent(),2);
assert.equal(c.cbpPublicPost_({postData:{contents:JSON.stringify({action:'updateStatus',pw:'anything'})}}).ok,false);
const prior=props.CBP_PUBLICATION;c.cbpUpdate_('Shop Variants',c.cbpRows_('Shop Variants')[0],{'Price paise':-1});assert.throws(()=>c.publishCatalogue(),/variant/);assert.equal(props.CBP_PUBLICATION,prior);assert.equal(c.cbpCatalog_().products[0].price,1000);
assert.equal(c.cbpSafe_('=IMPORTXML("bad")').startsWith("'"),true);
console.log('Passed: readable catalogue publication; stable variants; trusted prices; signed quotes; unavailable variants; partial-write recovery; idempotency/conflicts; private scoped order tokens; owner authorization; payment verification; production transitions; notification jobs; atomic publication pointer; formula neutralization.');
module.exports={makeBackend};
assert.equal(result.uploadToken,undefined);assert.equal(result.uploadUrl,undefined);
const photoSnapshot=JSON.stringify(tables['Shop Photos']);assert.throws(()=>c.submitOrderPhoto({get photo(){throw Error('Read file');}}),/uploads are no longer available/);assert.equal(JSON.stringify(tables['Shop Photos']),photoSnapshot);assert.equal(c.repairShopPhotos().repaired,0);
console.log('Passed: retired uploads reject without accessing files or modifying photo records.');

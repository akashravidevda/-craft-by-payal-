// Rebuild a paste-ready Apps Script package; source modules remain the maintained files.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../backend/google-sheets'),out=path.join(root,'deploy');fs.mkdirSync(out,{recursive:true});
const files=['Code.gs','Production.gs','CatalogSeed.gs'];fs.writeFileSync(path.join(out,'Code.gs'),files.map(name=>'// ===== '+name+' =====\n'+fs.readFileSync(path.join(root,name),'utf8')).join('\n'));
for(const name of ['Owner.html','Upload.html'])fs.copyFileSync(path.join(root,name),path.join(out,name));
console.log('Prepared deploy/Code.gs, deploy/Owner.html and deploy/Upload.html. No Google deployment performed.');

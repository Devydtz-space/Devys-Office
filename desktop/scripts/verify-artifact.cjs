'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const asar=require('@electron/asar');
const root=path.resolve(__dirname,'..');const archive=path.join(root,'release/win-unpacked/resources/app.asar');
const files=['renderer/index.html','renderer/app.js','renderer/office.js','renderer/office-state.js','renderer/office.css','renderer/markdown.js','core/meetings.cjs','core/workspace.cjs','core/updates.cjs','electron/main.cjs'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');const results={version:require('../package.json').version,files:{}};
for(const file of files){const source=fs.readFileSync(path.join(root,file));const packaged=asar.extractFile(archive,file);if(sha(source)!==sha(packaged))throw Error('Packaged source mismatch: '+file);results.files[file]=sha(packaged);}
const installer=fs.readdirSync(path.join(root,'release')).find(x=>x.endsWith('-Setup.exe'));if(!installer)throw Error('Installer missing.');
const bytes=fs.readFileSync(path.join(root,'release',installer));const hash=crypto.createHash('sha512').update(bytes).digest('base64');const manifest=fs.readFileSync(path.join(root,'release/latest.yml'),'utf8');if(!manifest.includes(hash)||!manifest.includes(results.version)||!manifest.includes(installer))throw Error('Update manifest does not match installer.');
results.installer={name:installer,sha512:hash,bytes:bytes.length};fs.writeFileSync(path.join(root,'release/package-verification.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

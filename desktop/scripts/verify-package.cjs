'use strict';
const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
for(const p of ['electron/main.cjs','electron/preload.cjs','core/siwc.cjs','core/agents.cjs','core/computer.cjs','renderer/index.html','renderer/app.js','renderer/office.js','renderer/office-state.js','renderer/office.css','renderer/markdown.js','core/meetings.cjs','core/workspace.cjs','renderer/styles.css','renderer/devydtz-icon.png','build/icon.ico']){
 if(!fs.existsSync(path.join(root,p))||fs.statSync(path.join(root,p)).size===0){throw Error('Missing package content: '+p)}
}
const s=fs.readFileSync(path.join(root,'core/siwc.cjs'),'utf8');
if(!s.includes('createChatGPT')||!s.includes('displayName'))throw Error('ChatGPT integration missing expected SDK methods');
console.log('Package verification passed.');

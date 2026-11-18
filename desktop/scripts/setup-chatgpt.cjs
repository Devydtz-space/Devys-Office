'use strict';
const {spawnSync}=require('node:child_process');const {existsSync,mkdirSync}=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'),target=path.join(root,'vendor','sign-in-with-chatgpt-devkit');
function run(cmd,args,cwd=root){console.log('>',cmd,...args);const r=spawnSync(cmd,args,{cwd,stdio:'inherit',shell:process.platform==='win32'});if(r.status!==0)process.exit(r.status||1)}
if(!existsSync(path.join(target,'package.json'))){mkdirSync(path.dirname(target),{recursive:true});run('git',['clone','--depth=1','https://github.com/openai/sign-in-with-chatgpt-devkit.git',target])}
run('git',['fetch','--depth=1','origin','0a36fefeb913055c8c7a1a29b63d82b96b2e841a'],target);
run('git',['checkout','--detach','0a36fefeb913055c8c7a1a29b63d82b96b2e841a'],target);
run('npm',['ci'],target);
run('npm',['run','build','--workspace','@siwc/local'],target);
// --install-links copies the local package rather than using a symlink that can
// become invalid in the packaged Electron app.
run('npm',['install','--save','--install-links',path.join(target,'packages','local')]);
console.log('\nChatGPT DevKit installed. Open Devydtz Workforce and select Settings → Continue with ChatGPT.');

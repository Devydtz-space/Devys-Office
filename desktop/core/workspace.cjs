'use strict';
const fs=require('node:fs');const path=require('node:path');const {processRun}=require('./computer.cjs');
// Grants are session-only. Resolve symlinks before checking containment.
class Workspace {
 constructor({approve=async()=>false,audit=()=>{}}={}){this.root='';this.approve=approve;this.audit=audit;}
 grant(directory){const root=fs.realpathSync(directory);if(!fs.statSync(root).isDirectory()||root===path.parse(root).root)throw Error('Select a project folder, not a drive root.');this.root=root;this.audit('workspace.grant',root);return this.status();}
 revoke(){this.root='';return this.status();}
 status(){return {root:this.root,connected:Boolean(this.root),scope:'Selected project folder for this session. Writes and commands require approval.'};}
 resolve(relative,write=false){if(!this.root)throw Error('Select an authorized project folder in Computer first.');if(typeof relative!=='string'||path.isAbsolute(relative))throw Error('Use a relative project path.');const target=path.resolve(this.root,relative||'.');const rel=path.relative(this.root,target);if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('Path is outside the authorized folder.');if(rel.split(/[\\/]/).some(p=>/^\.env(?:\.|$)|^\.git$|^\.ssh$|^secrets?\.|credentials|\.pem$|\.key$/i.test(p)))throw Error('Credential and Git internals are not available to employee tools.');let existing=target;while(!fs.existsSync(existing)){const next=path.dirname(existing);if(next===existing)throw Error('Invalid project path.');existing=next;}const canonical=fs.realpathSync(existing);const realRel=path.relative(this.root,canonical);if(realRel.startsWith('..')||path.isAbsolute(realRel))throw Error('Symlink leaves the authorized folder.');if(!write&&!fs.existsSync(target))throw Error('Project path does not exist.');return target;}
 async execute(name,args={},signal){signal?.throwIfAborted();
  if(name==='workspace.list'){const target=this.resolve(args.path||'.');return fs.readdirSync(target,{withFileTypes:true}).filter(x=>!/^\.env|^\.git$|^\.ssh$|credentials|secrets?/i.test(x.name)).slice(0,150).map(x=>({name:x.name,directory:x.isDirectory()}));}
  if(name==='workspace.read'){const target=this.resolve(args.path);if(fs.statSync(target).size>200000)throw Error('File exceeds 200 KB.');this.audit(name,args.path);return {path:args.path,content:fs.readFileSync(target,'utf8')};}
  if(name==='workspace.write'){const target=this.resolve(args.path,true);if(typeof args.content!=='string'||args.content.length>200000)throw Error('Write exceeds 200 KB.');if(!await this.approve({kind:'write',path:target,content:args.content,before:fs.existsSync(target)?fs.readFileSync(target,'utf8').slice(0,200000):''}))throw Error('File change was not approved.');signal?.throwIfAborted();this.resolve(args.path,true);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,args.content,'utf8');this.audit(name,args.path);return {written:args.path,bytes:Buffer.byteLength(args.content)};}
  if(name==='workspace.test'){const cwd=this.resolve(args.path||'.');const command=String(args.command||'');if(!command||command.length>1000)throw Error('Provide the exact development command.');if(!await this.approve({kind:'command',path:cwd,command}))throw Error('Command was not approved.');signal?.throwIfAborted();this.resolve(args.path||'.');this.audit(name,command);return processRun(process.platform==='win32'?'cmd.exe':'/bin/sh',process.platform==='win32'?['/d','/s','/c',command]:['-c',command],{cwd,signal,timeout:120000});}
  throw Error('Unknown project tool.');
 }
}
module.exports={Workspace};

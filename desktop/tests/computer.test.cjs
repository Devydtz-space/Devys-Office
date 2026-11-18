'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const os=require('node:os'),fs=require('node:fs'),path=require('node:path');
const {ComputerControl,parseDecision,TOOL_NAMES}=require('../core/computer.cjs');
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'devy-pc-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const events=[];const pc=new ComputerControl({audit:e=>events.push(e),snapshotDir:dir});return {pc,dir,events};}
test('requires explicit confirmation and can be revoked',async t=>{
 const {pc}=setup(t);assert.equal(pc.status().granted,false);await assert.rejects(pc.execute('system_info',{}),/off/);assert.throws(()=>pc.enable('anything else'),/FULL ACCESS/);pc.enable('FULL ACCESS');assert.equal(pc.status().granted,true);const info=await pc.execute('system_info',{});assert.ok(info.cores>=1);pc.disable();assert.equal(pc.status().granted,false);await assert.rejects(pc.execute('system_info',{}),/off/);
});
test('local file tools read write list move delete',async t=>{
 const {pc,dir,events}=setup(t);pc.enable('FULL ACCESS');const sub=path.join(dir,'work');const original=path.join(sub,'notes.txt');const moved=path.join(sub,'moved.txt');await pc.execute('make_directory',{path:sub});await pc.execute('write_file',{path:original,content:'Hello from Devydtz'});await assert.rejects(pc.execute('write_file',{path:original,content:'bad'}),/exists/);const read=await pc.execute('read_file',{path:original});assert.equal(read.content,'Hello from Devydtz');let items=await pc.execute('list_files',{path:sub});assert.equal(items.entries[0].name,'notes.txt');await pc.execute('move_path',{from:original,to:moved});await pc.execute('delete_path',{path:moved});assert.equal(fs.existsSync(moved),false);assert.ok(events.length>=8);
});
test('shell command produces output and status',async t=>{
 const {pc}=setup(t);pc.enable('FULL ACCESS');const r=await pc.execute('run_command',{command:'echo devydtz-ready'});assert.equal(r.exitCode,0);assert.match(r.output,/devydtz-ready/);
});
test('invalid inputs and unknown action are rejected',async t=>{
 const {pc,dir}=setup(t);pc.enable('FULL ACCESS');await assert.rejects(pc.execute('remove_everything',{}),/Unsupported/);await assert.rejects(pc.execute('delete_path',{path:path.parse(dir).root}),/drive root/);await assert.rejects(pc.execute('write_file',{path:path.join(dir,'big'),content:'x'.repeat(600000)}),/limit/);
});
test('agent decisions parse strictly, including fenced JSON',()=>{
 assert.deepEqual(parseDecision('```json\n{"action":"call","tool":"system_info","args":{}}\n```'),{action:'call',tool:'system_info',args:{},reason:''});assert.deepEqual(parseDecision('{"action":"finish","summary":"Done"}'),{action:'finish',summary:'Done'});assert.throws(()=>parseDecision('{"action":"call","tool":"unsafe","args":{}}'),/invalid/);assert.ok(TOOL_NAMES.includes('screenshot'));
});

test('Windows window-management and input tools are exposed only during granted session',async t=>{
 const {dir}=setup(t);const pc=new ComputerControl({platform:'win32',snapshotDir:dir});let captured=[];
 pc.ps=async (script)=>{captured.push(script);return {exitCode:0,output:'[]',stderr:''}};
 assert.equal(pc.status().features.includes('ui_tree'),true);
 await assert.rejects(pc.execute('list_windows',{}),/off/);
 pc.enable('FULL ACCESS');
 await pc.execute('list_windows',{});
 await pc.execute('focus_window',{pid:1234});
 await pc.execute('ui_tree',{pid:1234,max:25});
 await pc.execute('mouse_scroll',{x:500,y:300,lines:-2});
 await pc.execute('mouse_drag',{fromX:1,fromY:2,toX:300,toY:400});
 assert.equal(captured.length,5);
 assert.match(captured[0],/Get-Process/);
 assert.match(captured[2],/UIAutomationClient/);
 pc.disable();
 await assert.rejects(pc.execute('list_windows',{}),/off/);
});

test('disabling full access cancels in-flight work',async t=>{
 const {pc}=setup(t);pc.enable('FULL ACCESS');
 const pending=pc.execute('run_command',{command:process.platform==='win32'?'ping -n 11 127.0.0.1 > nul':'sleep 10'});
 await new Promise(resolve=>setTimeout(resolve,75));
 pc.disable();
 await assert.rejects(pending,/Cancelled/);
});

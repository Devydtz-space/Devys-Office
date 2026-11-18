'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Store}=require('../core/store.cjs');
const {decision,executeTool,runToolChat,TOOL_DESCRIPTIONS}=require('../core/agent-tools.cjs');
function setup(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'devys-tools-'));return {store:new Store(dir),cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})}}
test('decision supports structured commands, normal prose and fenced JSON',()=>{
 assert.equal(decision('Hello').final,'Hello');
 assert.equal(decision('```json\n{"tool":"office.tasks.list","args":{}}\n```').tool,'office.tasks.list');
 assert.equal(decision('{"tool":"computer.run_command","args":{}}').tool,undefined);
 assert.equal(decision('{"final":"Great"}').final,'Great');
 assert.ok(!Object.hasOwn(TOOL_DESCRIPTIONS,'computer.run_command'));
});
test('all specialists can create and update Office tasks; completion still needs owner review',async()=>{const {store,cleanup}=setup();try{
 const task=await executeTool({name:'office.tasks.create',args:{title:'Fix the router',assignee:'atlas'},store,integrations:{},agentId:'devy'});
 assert.equal(task.assignee,'atlas');
 const updated=await executeTool({name:'office.tasks.update',args:{id:task.id,status:'review'},store,integrations:{},agentId:'ops'});
 assert.equal(updated.status,'review');
 await assert.rejects(executeTool({name:'office.tasks.update',args:{id:task.id,status:'done'},store,integrations:{},agentId:'ops'}),/human approval/);
 assert.equal((await executeTool({name:'office.tasks.list',args:{},store,integrations:{},agentId:'cipher'})).length,1);
 assert.equal(store.data.activity.filter(x=>x.type==='agent-tool').length,3);
}finally{cleanup()}});
test('tool-assisted chat executes one real action and makes its evidence available to the model',async()=>{const {store,cleanup}=setup();try{
 const seen=[];const provider={ask:async ({input})=>{seen.push(input);return {model:'test',text:seen.length===1?JSON.stringify({tool:'office.tasks.create',args:{title:'Review auth',assignee:'cipher'}}):'I created a review task for Cipher.'}}};
 const result=await runToolChat({provider,model:'test',instructions:'You are Devy',input:'Create a task for Cipher to review auth.',store,integrations:{},agentId:'devy'});
 assert.equal(result.toolEvents.length,1);assert.equal(store.data.tasks[0].assignee,'cipher');assert.match(seen[1],/EXECUTED TOOL/);assert.match(result.text,/review task/);
}finally{cleanup()}});
test('GitHub and Railway require existing authorization; no arbitrary external writes',async()=>{const {store,cleanup}=setup();try{
 const integrations={inspectGithubRepo:async()=>{throw Error('GitHub is not connected.')},inspectRailwayProject:async()=>{throw Error('Railway is not connected.')}};
 await assert.rejects(executeTool({name:'github.inspect',args:{repository:'Devydtz-space/Devys-Office'},store,integrations,agentId:'atlas'}),/not connected/);
 await assert.rejects(executeTool({name:'railway.inspect',args:{projectId:'9c33dce5-736b-49eb-8fb2-2c4475029140'},store,integrations,agentId:'ops'}),/not connected/);
 await assert.rejects(executeTool({name:'computer.run_command',args:{command:'whoami'},store,integrations,agentId:'devy'}),/Unsupported tool/);
}finally{cleanup()}});
test('all actions are bounded and cannot be repeated indefinitely',async()=>{const {store,cleanup}=setup();try{
 let calls=0;const provider={ask:async()=>{calls++;return {text:'{"tool":"office.tasks.list","args":{}}'}}};
 const r=await runToolChat({provider,model:'test',instructions:'',input:'List my tasks',store,integrations:{},agentId:'atlas'});
 assert.equal(r.toolEvents.length,3);assert.equal(calls,4);
}finally{cleanup()}});

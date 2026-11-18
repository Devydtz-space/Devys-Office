'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const {Store}=require('../core/store.cjs');
const make=()=>{const p=fs.mkdtempSync(path.join(os.tmpdir(),'devy-test-'));return {store:new Store(p),path:p}};
test('ships six specialized agents',()=>{const {store}=make();assert.equal(store.snapshot().agents.length,6);assert.ok(store.snapshot().agents.find(a=>a.id==='cipher'))});
test('persists tasks and updates',()=>{const {store,path:p}=make();const t=store.createTask({title:'Review login',assignee:'cipher'});store.updateTask(t.id,{status:'review'});const reload=new Store(p);assert.equal(reload.data.tasks[0].status,'review')});
test('rejects invalid tasks',()=>{const {store}=make();assert.throws(()=>store.createTask({title:'',assignee:'atlas'}));assert.throws(()=>store.createTask({title:'x',assignee:'bogus'}))});
test('approval resolves once',()=>{const {store}=make();const a=store.approval({title:'Deploy',description:'Ready?'});store.resolveApproval(a.id,'approved');assert.throws(()=>store.resolveApproval(a.id,'rejected'))});
test('messages are isolated by agent',()=>{const {store}=make();store.message('atlas','user','one');store.message('ops','user','two');assert.equal(store.data.conversations.atlas.length,1);assert.equal(store.data.conversations.ops[0].text,'two')});
test('custom employees and settings persist',()=>{const {store,path:p}=make();const a=store.createAgent({name:'Tester',role:'QA'});store.updateSettings({selectedAgent:a.id});assert.equal(new Store(p).data.settings.selectedAgent,a.id)});

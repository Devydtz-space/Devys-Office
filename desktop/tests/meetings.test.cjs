const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Store}=require('../core/store.cjs');const {Meetings}=require('../core/meetings.cjs');const {activity}=require('../renderer/office-state.js');
function setup(t,contribute){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'office-meeting-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const store=new Store(dir);return {dir,store,meetings:new Meetings({store,contribute})};}
test('meeting routes real contributions and final summary in order, persists after restart',async t=>{
 const calls=[];const {dir,store,meetings}=setup(t,async turn=>{calls.push(turn);return {text:`Evidence from ${turn.employee}`}});
 const m=meetings.create({title:'Release review',goal:'Inspect deployment readiness',participants:['atlas','cipher']});
 await meetings.run(m.id);assert.deepEqual(calls.map(c=>c.employee),['devy','atlas','cipher','devy']);assert.match(calls[2].input,/Evidence from atlas/);assert.equal(m.status,'review');assert.equal(m.summary,'Evidence from devy');
 const restored=new Store(dir);assert.equal(restored.data.meetings[0].minutes.length,4);assert.equal(restored.data.meetings[0].status,'review');assert.equal(store.data.tasks.length,0);
});
test('failed contribution is not fabricated; retry resumes at failed turn and includes follow-up',async t=>{
 let fail=true;const inputs=[];const {meetings}=setup(t,async turn=>{inputs.push(turn.input);if(turn.employee==='atlas'&&fail)throw Error('Model unavailable');return {text:'Verified output'}});
 const m=meetings.create({title:'Investigation',goal:'Review repository tests',participants:['atlas']});await meetings.run(m.id);assert.equal(m.status,'failed');assert.equal(m.minutes.length,1);assert.match(m.error,/unavailable/);meetings.note(m.id,'Check cancellation too');fail=false;await meetings.run(m.id);assert.equal(m.minutes.length,3);assert.match(inputs[2],/Check cancellation too/);
});
test('cancellation aborts provider and never records late results',async t=>{
 let resolve;const {meetings,store}=setup(t,()=>new Promise(r=>resolve=r));const m=meetings.create({title:'Cancel review',goal:'Inspect worker cancellation',participants:['atlas']});const pending=meetings.run(m.id);assert.equal(activity(store.data,'devy').kind,'working');assert.equal(activity(store.data,'atlas').kind,'waiting');meetings.cancel(m.id);resolve({text:'Late output'});await pending;assert.equal(m.status,'cancelled');assert.equal(m.minutes.length,0);assert.equal(activity(store.data,'devy').kind,'idle');
});
test('rejects unknown employees and duplicate active work',async t=>{const {meetings}=setup(t,async()=>({text:'ok'}));assert.throws(()=>meetings.create({title:'Meeting',goal:'Inspect code',participants:['unknown']}),/existing/);});
test('activity requires an actual active run and uses current specialist',()=>{const state={runs:[{id:'r',status:'running',agentId:'devy',currentAgentId:'atlas',kind:'team'}],activeRuns:['r']};assert.equal(activity(state,'atlas').kind,'working');assert.equal(activity(state,'devy').kind,'idle');state.activeRuns=[];assert.equal(activity(state,'atlas').kind,'idle');});

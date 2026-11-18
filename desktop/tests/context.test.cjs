'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {prepareContext,agentInstructions}=require('../core/context.cjs');
const {initialState}=require('../core/agents.cjs');
test('context includes project-specific and general notes but not other projects',()=>{const state=initialState();state.projects=[{id:'p1',name:'Site',description:'Portfolio'},{id:'p2',name:'Game',description:'Game'}];state.knowledge=[{id:'a',project:'Site',title:'Site note',body:'Portfolio copy'},{id:'b',project:'General',title:'Universal',body:'Secure defaults'},{id:'c',project:'Game',title:'Secret game',body:'Never appear'}];const result=prepareContext(state,state.agents[0],'Site');assert.match(result.context,/Portfolio copy/);assert.match(result.context,/Secure defaults/);assert.doesNotMatch(result.context,/Never appear/);assert.equal(result.documents.length,2);});
test('instructions explicitly identify external data as untrusted',()=>{const text=agentInstructions(initialState().agents[1]);assert.match(text,/untrusted data/);assert.match(text,/Never request or reveal API keys/);});
test('project brief is available to specialists without a Knowledge tab',()=>{
 const state=initialState();state.projects=[{id:'one',name:'Devydtz',description:'Portfolio',brief:'Use the clean interface; avoid noisy metrics.'}];
 const r=prepareContext(state,state.agents[0],'Devydtz');assert.match(r.context,/clean interface/);
});

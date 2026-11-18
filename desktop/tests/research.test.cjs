'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {publicTopic,fetchPublicReferences}=require('../core/research.cjs');
test('public research accepts encyclopedic questions and rejects private workspace requests',()=>{
 assert.equal(publicTopic('What is quantum computing?'),'quantum computing');
 assert.equal(publicTopic('Research Kubernetes'),'Kubernetes');
 for(const query of ['Explain my password','Research my devydtz railway project','Find information about https://secret.example','Tell me about token abcd1234','Review our private code'])assert.equal(publicTopic(query),'',query);
});
test('public encyclopedia results include grounded links and no arbitrary supplied URLs',async()=>{
 let called='';const r=await fetchPublicReferences('Explain quantum computing',{fetcher:async(url)=>{called=url;return {ok:true,json:async()=>({query:{search:[{pageid:123,title:'Quantum computing',snippet:'<b>Quantum</b> computing is a field.'}]}})}}});
 assert.ok(called.startsWith('https://en.wikipedia.org/w/api.php?'));
 assert.equal(r.references[0].url,'https://en.wikipedia.org/?curid=123');
 assert.match(r.context,/Quantum computing is a field/);assert.doesNotMatch(r.context,/<b>/);
});
test('provider error fails closed without inventing facts',async()=>{
 const r=await fetchPublicReferences('What is a computer',{fetcher:async()=>{throw Error('offline')}});
 assert.equal(r.references.length,0);assert.equal(r.context,'');assert.match(r.error,/offline/);
});

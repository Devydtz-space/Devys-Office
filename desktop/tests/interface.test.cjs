'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('visible navigation and command shortcuts do not expose Knowledge category',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../renderer/app.js'),'utf8');
 assert.doesNotMatch(code,/menu\('knowledge','Knowledge'/);
 assert.doesNotMatch(code,/\['knowledge','Knowledge','book'\]/);
 assert.doesNotMatch(code,/\['new-knowledge','Add knowledge','book'\]/);
});

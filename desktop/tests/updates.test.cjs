'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {createUpdateController,CHECK_EVERY_MS}=require('../core/updates.cjs');
function setup({platform='win32',packaged=true}={}){
 const emitter=new EventEmitter();let checks=0,installed=0;const timers=[];
 emitter.checkForUpdates=async()=>{checks++;emitter.emit('checking-for-update');emitter.emit('update-not-available')};
 emitter.quitAndInstall=()=>{installed++};
 const app={isPackaged:packaged,getVersion:()=> '0.8.0'};
 const ctl=createUpdateController({app,platform,emit:()=>{},updaterFactory:()=>emitter,setTimeoutFn:(f,ms)=>{timers.push({f,ms});return {unref(){}}},setIntervalFn:(f,ms)=>{timers.push({f,ms});return {unref(){}}}});
 return {ctl,emitter,timers,get checks(){return checks},get installed(){return installed}};
}
test('Windows packaged app checks GitHub updates automatically',async()=>{const x=setup();x.ctl.start();assert.equal(x.timers.length,2);assert.equal(x.timers[1].ms,CHECK_EVERY_MS);await x.ctl.check(true);assert.equal(x.checks,1);assert.equal(x.ctl.status().phase,'current')});
test('Downloads in background; only installs with explicit restart approval',()=>{const x=setup();x.ctl.start();x.emitter.emit('update-available',{version:'0.9.0'});x.emitter.emit('download-progress',{percent:58.25});assert.equal(x.ctl.status().percent,58);assert.throws(()=>x.ctl.install(),/No downloaded update/);x.emitter.emit('update-downloaded',{version:'0.9.0'});assert.equal(x.ctl.status().phase,'ready');x.ctl.install();assert.equal(x.installed,1)});
test('Does not run updater in dev mode or on non-Windows builds',async()=>{for(const opts of [{platform:'linux'},{packaged:false}]){const x=setup(opts);x.ctl.start();assert.equal(x.ctl.status().phase,'unavailable');await x.ctl.check(true);assert.equal(x.checks,0)}});
test('Update check and download errors are reported without crashing the app',async()=>{const x=setup();x.ctl.start();x.emitter.emit('error',new Error('Network unavailable'));assert.match(x.ctl.status().message,/Network unavailable/)});

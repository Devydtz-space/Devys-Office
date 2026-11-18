'use strict';
// The updater accepts release manifests only through the official GitHub release
// provider baked into this packaged application. No user-supplied URLs.
const CHECK_EVERY_MS=6*60*60*1000;
function createUpdateController({app,emit=()=>{},platform=process.platform,updaterFactory=()=>require('electron-updater').autoUpdater,setTimeoutFn=setTimeout,setIntervalFn=setInterval}){
 const enabled=platform==='win32'&&Boolean(app.isPackaged);
 let updater=null,checking=false,ready=false,interval=null;
 let data={phase:enabled?'idle':'unavailable',installedVersion:app.getVersion(),availableVersion:'',percent:0,message:enabled?'Updates are checked automatically.':'Updates are available in the installed Windows app.',checkedAt:null};
 function report(patch){data={...data,...patch};emit({...data});return {...data}}
 function status(){return {...data}}
 async function check(manual=false){
  if(!enabled)return status();
  if(!updater)throw new Error('Update service is not ready.');
  if(checking||ready||data.phase==='downloading')return status();
  checking=true;report({phase:'checking',message:manual?'Checking GitHub for the latest version…':'Checking for updates…',checkedAt:new Date().toISOString()});
  try {await updater.checkForUpdates();return status()}catch(e){report({phase:'error',message:'Update check failed: '+String(e?.message||e).slice(0,230)});return status()}finally{checking=false}
 }
 function install(){if(!ready||!updater)throw new Error('No downloaded update is ready to install.');report({phase:'installing',message:'Closing the app to install the update…'});updater.quitAndInstall(false,true);return status()}
 function start(){
  if(!enabled)return status();
  try{updater=updaterFactory();updater.autoDownload=true;updater.autoInstallOnAppQuit=false;updater.allowDowngrade=false;
   updater.on('checking-for-update',()=>report({phase:'checking',message:'Checking for updates…'}));
   updater.on('update-available',x=>report({phase:'downloading',availableVersion:String(x?.version||''),percent:0,message:'Downloading '+String(x?.version||'new version')+'…'}));
   updater.on('download-progress',x=>{const p=Math.min(100,Math.max(0,Number(x?.percent||0)));if(Math.abs(p-data.percent)>=2||p===100)report({phase:'downloading',percent:Math.round(p),message:'Downloading update · '+Math.round(p)+'%'})});
   updater.on('update-not-available',()=>report({phase:'current',message:'You have the latest published version.',availableVersion:'',percent:0}));
   updater.on('update-downloaded',x=>{ready=true;report({phase:'ready',availableVersion:String(x?.version||data.availableVersion),percent:100,message:'Update downloaded. Install when you are ready.'})});
   updater.on('error',e=>{checking=false;report({phase:'error',message:'Update error: '+String(e?.message||e).slice(0,230)})});
   const startTimer=setTimeoutFn(()=>{check(false).catch(()=>{})},15000);startTimer?.unref?.();
   interval=setIntervalFn(()=>{check(false).catch(()=>{})},CHECK_EVERY_MS);interval?.unref?.();
  }catch(e){report({phase:'error',message:'Updater unavailable: '+String(e?.message||e).slice(0,230)})}
  return status();
 }
 function stop(){if(interval)clearInterval(interval)}
 return {status,start,check,install,stop};
}
module.exports={createUpdateController,CHECK_EVERY_MS};

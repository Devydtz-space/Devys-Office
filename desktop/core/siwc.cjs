'use strict';
// Official DevKit only. Credentials are held in OS-encrypted storage on this computer.
// No browser cookie scraping and no remote transfer of subscription credentials.
const path=require('node:path');
class ChatGPTProvider {
 constructor({app,shell,safeStorage}){this.app=app;this.shell=shell;this.safeStorage=safeStorage;this.client=null;this.error='';this.models=[];}
 async init(){try{
  let sdk;try{sdk=await import('@siwc/local')}catch{this.error='ChatGPT DevKit is not installed. Run npm run setup:chatgpt, then restart the app.';return;}
  const storage=this.safeStorage;
  const secure=()=>this.app.isReady()&&storage.isEncryptionAvailable()&&(process.platform!=='linux'||['gnome_libsecret','kwallet','kwallet5','kwallet6'].includes(storage.getSelectedStorageBackend()));
  this.client=sdk.createChatGPT({appName:'Devydtz Workforce',appId:'devydtz-workforce',redirectPort:0,storageDir:path.join(this.app.getPath('userData'),'chatgpt'),credentialEncryption:{id:'electron-safe-storage-v1',isAvailable:secure,encrypt(value){if(!secure())throw new Error('Secure credential storage unavailable');return storage.encryptString(value)},decrypt(value){if(!secure())throw new Error('Secure credential storage unavailable');return storage.decryptString(Buffer.from(value))}},openBrowser:async url=>{const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='auth.openai.com')throw new Error('Unexpected ChatGPT sign-in host.');await this.shell.openExternal(url)}});
 }catch(e){this.error=e.message||String(e)}}
 async status(){if(!this.client)return {status:'unavailable',sharing:false,reason:this.error,models:[]};try{const session=await this.client.getSession();let reason=session.error?.message||'';if(session.sharing){try{this.models=await this.client.listModels()}catch(e){reason=e.message||String(e);}}else this.models=[];return {status:session.status,sharing:Boolean(session.sharing),reason,models:this.models.map(x=>({slug:x.slug,name:x.displayName||x.slug})),account:session.identity?.email||session.profileLabel||''};}catch(e){return {status:'error',sharing:false,reason:e.message,models:[]}}}
 async signIn(){if(!this.client)throw new Error(this.error||'ChatGPT DevKit unavailable.');await this.client.signIn();return this.status()}
 async disconnect(){if(!this.client)throw new Error('ChatGPT DevKit unavailable.');await this.client.disconnect();this.models=[];return this.status()}
 async ask({model,instructions,input,signal,onDelta}){if(!this.client)throw new Error(this.error||'ChatGPT DevKit unavailable.');const session=await this.client.getSession();if(!session.sharing)throw new Error('Connect ChatGPT and enable plan usage in Settings.');const choices=await this.client.listModels();const chosen=choices.find(x=>x.slug===model)||choices[0];if(!chosen)throw new Error('No compatible models available for this account.');const result=await this.client.streamResponse({model:chosen.slug,input:String(input).slice(0,26000),instructions:String(instructions).slice(0,9000),signal,onDelta});if(!result.text?.trim())throw new Error('Model returned an empty response.');return {text:result.text,model:chosen.slug};}
}
module.exports={ChatGPTProvider};

'use strict';
const {app,BrowserWindow,ipcMain,dialog,shell,Notification,globalShortcut,safeStorage,nativeTheme,clipboard}=require('electron');
const {join}=require('node:path');
const {writeFileSync,readFileSync,statSync}=require('node:fs');
const {Store}=require('../core/store.cjs');
const {ChatGPTProvider}=require('../core/siwc.cjs');
const {Integrations}=require('../core/integrations.cjs');
const {sanitizeText}=require('../core/agents.cjs');
const {ComputerControl,TOOL_GUIDE,parseDecision}=require('../core/computer.cjs');
const {OfficeBridge}=require('../core/office-bridge.cjs');
const {prepareContext,agentInstructions,findProject}=require('../core/context.cjs');
const {fetchPublicReferences}=require('../core/research.cjs');
const {runToolChat}=require('../core/agent-tools.cjs');
const {createUpdateController}=require('../core/updates.cjs');
const {Meetings}=require('../core/meetings.cjs');
const {Workspace}=require('../core/workspace.cjs');
if(process.env.WORKFORCE_TEST_DATA_DIR)app.setPath('userData',require('node:path').resolve(process.env.WORKFORCE_TEST_DATA_DIR));
let win,store,provider,integrations,computer,office,updates,meetings,workspace;
const active=new Map();
const allowHosts=new Set(['github.com','railway.com','dashboard.railway.com','devydtz.com','developers.openai.com','chatgpt.com']);
function trustedUrl(url){const u=new URL(url);if(u.protocol!=='https:'||!allowHosts.has(u.hostname))throw new Error('This external link is not approved.');return u.href;}
function snapshot(){return {...store.snapshot(),workspace:workspace?.status(),connections:integrations.status(),activeRuns:[...active.keys()],computer:computer.status(),office:office?.status()||{configured:false,online:false},updates:updates?.status()||{phase:'initializing',installedVersion:app.getVersion()}};}
function publish(){if(win&&!win.isDestroyed())win.webContents.send('workforce:state',snapshot());}
function runEvent(data){if(win&&!win.isDestroyed())win.webContents.send('workforce:run-event',data);}
function handle(name,fn){ipcMain.handle('workforce:'+name,async(event,...args)=>{if(event.sender!==win?.webContents||!event.senderFrame?.url.startsWith('file://'))throw new Error('Untrusted app request.');try{return await fn(...args)}catch(e){throw new Error(e?.message||String(e))}});}
async function createWindow(){win=new BrowserWindow({width:1450,height:920,minWidth:970,minHeight:650,backgroundColor:'#111318',show:false,title:'Devydtz Workforce',icon:join(__dirname,'../renderer/devydtz-icon.png'),autoHideMenuBar:true,titleBarStyle:'hidden',titleBarOverlay:{color:'#111318',symbolColor:'#a6acb8',height:42},webPreferences:{preload:join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.session.setPermissionRequestHandler((_wc,_p,cb)=>cb(false));
 win.once('ready-to-show',()=>win.show());await win.loadFile(join(__dirname,'../renderer/index.html'));
}
function startOperation(meta){if(active.size||meetings?.controllers.size||office?.currentJob)throw new Error('Another employee is already working. Finish or cancel that run first.');const controller=new AbortController();const r=store.startRun(meta);active.set(r.id,controller);publish();runEvent({id:r.id,status:'running',title:r.title});return {run:r,signal:controller.signal};}
function completeOperation(run,status,output='',error=''){active.delete(run.id);store.finishRun(run.id,{status,output,error});publish();runEvent({id:run.id,status,title:run.title,error});}
function projectInput(projectName){const name=projectName==='All projects'?'General':sanitizeText(projectName,70)||'General';return name;}
async function collectContext(agent,projectName,prompt=''){
 const local=prepareContext(store.data,agent,projectName);let connected={context:'',sources:[]};
 if(local.project)connected=await integrations.contextForProject(local.project,{...agent,tools:['github','railway']});
 const publicFacts=store.data.settings.publicResearch===false?{context:'',references:[]}:await fetchPublicReferences(prompt);
 return {context:[local.context,connected.context,publicFacts.context].filter(Boolean).join('\n\n'),sources:[...connected.sources,...publicFacts.references.map(r=>({kind:'wikipedia',ok:true,result:r}))],notes:local.documents};
}
async function aiReply(agentId,userText){const agent=store.data.agents.find(a=>a.id===agentId);if(!agent)throw new Error('Employee not found.');const question=sanitizeText(userText,12000);if(!question)throw new Error('Write a message first.');const project=projectInput(store.data.settings.activeProject);const {run,signal}=startOperation({kind:'chat',title:`Conversation with ${agent.name}`,project,agentId});store.message(agentId,'user',question);publish();
 try{const recent=(store.data.conversations[agentId]||[]).slice(-10).map(m=>`${m.role==='user'?'User':m.role==='assistant'?'Employee':'System'}: ${m.text}`).join('\n\n');const source=await collectContext(agent,project,question);const input=`${source.context}\n\nCONVERSATION:\n${recent}`;const result=await runToolChat({provider,model:store.data.settings.selectedModel,instructions:agentInstructions(agent),input,signal,store,integrations,workspace,agentId,onTool:event=>{store.addRunStep(run.id,{agentId,name:event.tool,status:event.ok?'completed':'failed',text:event.output});runEvent({id:run.id,status:'running',step:event.tool});publish()}});store.message(agentId,'assistant',result.text);store.addRunStep(run.id,{agentId,name:agent.name,status:'completed',text:result.text});completeOperation(run,'completed',result.text);return {...result,runId:run.id};}
 catch(error){const cancelled=signal.aborted;store.message(agentId,'system',`${cancelled?'Request cancelled':'Request failed'}: ${error.message||String(error)}`,'error');completeOperation(run,cancelled?'cancelled':'failed','',error.message||String(error));throw error;}}
async function runAssignedTask(taskId){const task=store.data.tasks.find(t=>t.id===taskId);if(!task)throw new Error('Task not found.');const agent=store.data.agents.find(a=>a.id===task.assignee);if(!agent)throw new Error('Assigned employee is missing.');const {run,signal}=startOperation({kind:'task',title:task.title,project:task.project,agentId:agent.id,taskId});store.updateTask(taskId,{status:'in-progress'});publish();
 try{const source=await collectContext(agent,task.project,task.title);const result=await runToolChat({provider,model:store.data.settings.selectedModel,instructions:agentInstructions(agent)+'\nPrepare a substantial, actionable work product and a clear validation checklist.',input:`${source.context}\n\nTASK: ${task.title}\nDETAILS: ${task.description||'(No additional details)'}`,signal,store,integrations,workspace,agentId:agent.id,onTool:event=>{store.addRunStep(run.id,{agentId:agent.id,name:event.tool,status:event.ok?'completed':'failed',text:event.output});runEvent({id:run.id,status:'running',step:event.tool});publish()}});store.addRunStep(run.id,{agentId:agent.id,name:agent.name,status:'completed',text:result.text});store.updateTask(taskId,{status:'review'});store.message(agent.id,'assistant',`Task completed: ${task.title}\n\n${result.text}`);store.approval({title:`Review: ${task.title}`,description:result.text,requestedBy:agent.id,taskId,runId:run.id});completeOperation(run,'completed',result.text);return {model:result.model,runId:run.id,text:result.text};}
 catch(error){store.updateTask(taskId,{status:'backlog'});completeOperation(run,signal.aborted?'cancelled':'failed','',error.message||String(error));throw error;}}
async function runTeam({goal,agentIds,project}){const message=sanitizeText(goal,4000);if(!message)throw new Error('Describe the work first.');const selected=(Array.isArray(agentIds)?agentIds:['devy','atlas','cipher']).slice(0,4);const team=[...new Set(selected)].map(id=>store.data.agents.find(a=>a.id===id)).filter(Boolean);if(team.length<2||team.length>4)throw new Error('Select two to four employees.');const projectName=projectInput(project||store.data.settings.activeProject);const {run,signal}=startOperation({kind:'team',title:message.slice(0,160),project:projectName,agentId:team[0].id});const results=[];
 try{for(const employee of team){if(signal.aborted)throw new Error('Cancelled.');const live=store.data.runs.find(r=>r.id===run.id);if(live)live.currentAgentId=employee.id;publish();runEvent({id:run.id,status:'running',title:run.title,step:`${employee.name} is working`});const source=await collectContext(employee,projectName,message);const previous=results.map(r=>`${r.name}:\n${r.text.slice(0,4800)}`).join('\n\n');const result=await runToolChat({provider,model:store.data.settings.selectedModel,instructions:agentInstructions(employee)+'\nContribute specifically from your professional role. Do not claim unperformed changes.',input:`${source.context}\n\nORIGINAL REQUEST:\n${message}\n\nPREVIOUS SPECIALISTS (review and improve, do not assume they are correct):\n${previous||'First assessment.'}`,signal,store,integrations,workspace,agentId:employee.id,onTool:event=>{store.addRunStep(run.id,{agentId:employee.id,name:event.tool,status:event.ok?'completed':'failed',text:event.output});runEvent({id:run.id,status:'running',step:event.tool});publish()}});results.push({agentId:employee.id,name:employee.name,text:result.text});store.addRunStep(run.id,{agentId:employee.id,name:employee.name,status:'completed',text:result.text});publish();}
 const full=results.map(r=>`${r.name} (${team.find(a=>a.id===r.agentId)?.role||'specialist'}):\n${r.text}`).join('\n\n――――\n\n');const task=store.createTask({title:message.slice(0,120),description:message,project:projectName,assignee:team[0].id,status:'review'});const persistedRun=store.data.runs.find(r=>r.id===run.id);if(persistedRun)persistedRun.taskId=task.id;store.approval({title:`Review team work: ${task.title}`,description:full,requestedBy:team[0].id,taskId:task.id,runId:run.id});completeOperation(run,'completed',full);return {runId:run.id,task,results};}
 catch(error){completeOperation(run,signal.aborted?'cancelled':'failed',results.map(r=>`${r.name}:\n${r.text}`).join('\n\n'),error.message||String(error));throw error;}}

async function computerAgentWork({agentId,prompt}){
 const employee=store.data.agents.find(a=>a.id===agentId);if(!employee)throw new Error('Employee not found.');
 const goal=sanitizeText(prompt,4500);if(!goal)throw new Error('Describe what to do on the computer.');
 computer.assertEnabled();
 const {run,signal}=startOperation({kind:'computer',title:goal.slice(0,160),project:'Local computer',agentId:employee.id});
 const observations=[];let final='';
 try{
  for(let iteration=0;iteration<12;iteration++){
   if(signal.aborted)throw new Error('Computer operation cancelled.');
   computer.assertEnabled();
   const transcript=observations.map((x,i)=>`STEP ${i+1}: ${x}`).join('\n\n').slice(-14000);
   const input=`USER REQUEST:\n${goal}\n\nCOMPUTER OBSERVATIONS:\n${transcript||'None yet.'}\n\nChoose the single next action or finish. Your response must be strictly valid JSON.`;
   runEvent({id:run.id,status:'running',step:`${employee.name} is deciding the next computer action`});
   const decisionRaw=await provider.ask({model:store.data.settings.selectedModel,instructions:`${agentInstructions(employee)}\n\nYou may control the user's Windows desktop because they enabled session Full Access in the local app. Do not claim actions without successful tool results. Never transfer files, tokens, or private data off-device without a direct user request. ${TOOL_GUIDE}`,input,signal});
   const next=parseDecision(decisionRaw.text);
   if(next.action==='finish'){final=next.summary;break;}
   runEvent({id:run.id,status:'running',step:`${employee.name}: ${next.tool}`});
   const outcome=await computer.execute(next.tool,next.args,signal);
   const safeOutcome={...outcome};if(safeOutcome.imageData)delete safeOutcome.imageData;
   const displayArgs={...next.args};for(const key of ['content','text'])if(typeof displayArgs[key]==='string')displayArgs[key]=`[${displayArgs[key].length} characters]`;const observation=`${next.tool} ${JSON.stringify(displayArgs).slice(0,1500)}\nRESULT: ${JSON.stringify(safeOutcome).slice(0,4500)}`;
   observations.push(observation);
   store.addRunStep(run.id,{agentId:employee.id,name:`${employee.name} · ${next.tool}`,status:'completed',text:observation});
   publish();
  }
  if(!final)final=`Execution reached the 12-action limit. Completed actions:\n${observations.map((o,i)=>`${i+1}. ${o.split('\n')[0]}`).join('\n')}\nReview the run log before proceeding.`;
  store.message(employee.id,'assistant',`Computer task: ${goal}\n\n${final}`);
  completeOperation(run,'completed',`${final}\n\n${observations.join('\n\n')}`);
  return {runId:run.id,summary:final,actions:observations.length};
 }catch(error){completeOperation(run,signal.aborted?'cancelled':'failed',observations.join('\n\n'),error.message||String(error));throw error;}
}

app.whenReady().then(async()=>{
 app.setAppUserModelId('com.devydtz.workforce');nativeTheme.themeSource='dark';store=new Store(app.getPath('userData'));provider=new ChatGPTProvider({app,shell,safeStorage});integrations=new Integrations({app,safeStorage});computer=new ComputerControl({clipboard,shell,snapshotDir:join(app.getPath('userData'),'captures'),audit:event=>{store.record('computer',event.message);store.save();publish();}});await provider.init();
 office=new OfficeBridge({dataDir:app.getPath('userData'),safeStorage,provider,model:()=>store.data.settings.selectedModel,onEvent:publish,canProcess:()=>!active.size&&!meetings?.controllers.size,runJob:async(job,signal)=>{const specialist=store.data.agents.find(a=>a.id===job.employee)||store.data.agents[0];return runToolChat({provider,model:store.data.settings.selectedModel,instructions:agentInstructions(specialist)+' Remote Office work: local file and command tools are unavailable.',input:String(job.prompt||'').slice(0,16000),signal,store,integrations,agentId:specialist.id,onTool:event=>{store.record('bridge-tool',event.tool,event.output);store.save();publish();}});}});
 office.load();office.start();
 workspace=new Workspace({audit:(type,message)=>{store.record(type,message);store.save();publish();},approve:async proposal=>{
  const detail=proposal.kind==='command'?`Folder: ${proposal.path}\n\nExact command:\n${proposal.command}\n\nThis command runs with your Windows user permissions.`:`File: ${proposal.path}\n\nBEFORE:\n${proposal.before}\n\nAFTER:\n${proposal.content}`;
  const response=await dialog.showMessageBox(win,{type:'question',title:'Employee requests approval',message:proposal.kind==='command'?'Run this development command?':'Apply this file change?',detail,buttons:['Cancel','Approve'],defaultId:0,cancelId:0,noLink:true});
  store.record('workspace.approval',(response.response===1?'Approved: ':'Rejected: ')+proposal.path);store.save();return response.response===1;
 }});
 handle('workspace-grant',async()=>{const result=await dialog.showOpenDialog(win,{title:'Authorize a local project folder for this session',properties:['openDirectory']});if(result.canceled)return workspace.status();const status=workspace.grant(result.filePaths[0]);publish();return status;});
 handle('workspace-revoke',()=>{const status=workspace.revoke();publish();return status;});
 meetings=new Meetings({store,publish,contribute:async({employee,input,signal})=>{
  const specialist=store.data.agents.find(a=>a.id===employee);const source=await collectContext(specialist,projectInput(store.data.settings.activeProject),input);
  return runToolChat({provider,model:store.data.settings.selectedModel,instructions:agentInstructions(specialist),input:source.context+'\n\n'+input,signal,store,integrations,workspace,agentId:employee,onTool:event=>{store.record('meeting-tool',event.tool,event.output);store.save();publish();}});
 }});
 handle('meeting-create',data=>meetings.create(data));
 handle('meeting-run',async id=>{if(active.size||meetings.controllers.size)throw Error('Wait for the current work to finish.');const status=await provider.status();if(!status.sharing)throw Error(status.reason||'Connect ChatGPT in Settings before running a meeting.');meetings.run(id).catch(error=>{store.record('meeting-error',error.message);publish()});return true;});
 handle('meeting-cancel',id=>meetings.cancel(id));handle('meeting-note',({id,text})=>meetings.note(id,text));
 handle('get-state',()=>snapshot());
 handle('updates-status',()=>updates?.status()||{phase:'initializing',installedVersion:app.getVersion()});
 handle('updates-check',()=>updates.check(true));handle('updates-install',()=>updates.install());
 handle('office-status',()=>office.status());handle('office-connect',data=>{const x=office.save(data);publish();return x});handle('office-disconnect',()=>{const x=office.clear();publish();return x});handle('office-check',async()=>{await office.poll();publish();return office.status()});
 handle('computer-status',()=>computer.status());
 handle('computer-enable',confirmation=>{const status=computer.enable(confirmation);publish();return status;});
 handle('computer-disable',()=>{const status=computer.disable();for(const controller of active.values())controller.abort();publish();return status;});
 handle('computer-tool',async({name,args})=>{const result=await computer.execute(name,args);publish();return result;});
 handle('computer-agent',data=>computerAgentWork(data));handle('get-ai',()=>provider.status());handle('sign-in',()=>provider.signIn());handle('sign-out',()=>provider.disconnect());
 handle('chat-rename',({agentId,threadId,title})=>{const r=store.renameChat(agentId,threadId,title);publish();return r;});
 handle('chat-edit',({agentId,messageId,text})=>{if(active.size||meetings.controllers.size)throw Error('Stop active work before editing.');store.editMessage(agentId,messageId);return aiReply(agentId,text);});
 handle('chat-new',agentId=>{if(active.size)throw Error('Stop active work first.');const res=store.startNewChat(agentId);publish();return res});handle('chat-open',({agentId,threadId})=>{if(active.size)throw Error('Stop active work first.');const res=store.restoreChat(agentId,threadId);publish();return res});
 handle('chat',({agentId,text})=>aiReply(agentId,text));handle('team-run',data=>runTeam(data));handle('task-run',id=>runAssignedTask(id));
 handle('cancel-run',id=>{const c=active.get(id);if(!c)return false;c.abort();return true;});
 handle('task-create',data=>{const r=store.createTask(data);publish();return r});handle('task-update',({id,patch})=>{const r=store.updateTask(id,patch);publish();return r});handle('task-delete',id=>{const r=store.deleteTask(id);publish();return r});
 handle('agent-create',data=>{const r=store.createAgent(data);publish();return r});handle('agent-update',({id,patch})=>{const r=store.updateAgent(id,patch);publish();return r});
 handle('project-create',data=>{const r=store.createProject(data);publish();return r});handle('project-update',({id,patch})=>{const r=store.updateProject(id,patch);publish();return r});handle('project-delete',id=>{const r=store.deleteProject(id);publish();return r});
 handle('knowledge-create',data=>{const r=store.createKnowledge(data);publish();return r});handle('knowledge-update',({id,patch})=>{const r=store.updateKnowledge(id,patch);publish();return r});handle('knowledge-delete',id=>{const r=store.deleteKnowledge(id);publish();return r});
 handle('approval-create',data=>{const r=store.approval(data);publish();return r});handle('approval-resolve',({id,status})=>{const r=store.resolveApproval(id,status);publish();return r});handle('settings-update',patch=>{const r=store.updateSettings(patch);publish();return r});
 handle('integration-save',async({kind,token})=>{const previous=integrations.set(kind,token);try{const r=await integrations.verify(kind);publish();return r}catch(e){integrations.restore(kind,previous);throw e}});
 handle('integration-remove',kind=>{integrations.remove(kind);publish();return true});handle('integration-status',()=>integrations.status());handle('integration-overview',()=>integrations.overview());
 handle('inspect-project',async id=>{const project=store.data.projects.find(p=>p.id===id);if(!project)throw new Error('Project not found.');const items=[];if(project.githubRepo){try{items.push(await integrations.inspectGithubRepo(project.githubRepo))}catch(e){items.push({provider:'github',error:e.message})}}if(project.railwayId){try{items.push(await integrations.inspectRailwayProject(project.railwayId))}catch(e){items.push({provider:'railway',error:e.message})}}return items;});
 handle('open-url',url=>shell.openExternal(trustedUrl(url)));
 handle('notify',({title,body})=>{if(!store.data.settings.notifications)return false;if(Notification.isSupported())new Notification({title:sanitizeText(title,100),body:sanitizeText(body,250)}).show();return true;});
 handle('export',async()=>{const out=await dialog.showSaveDialog(win,{defaultPath:'devydtz-workforce-backup.json',filters:[{name:'JSON',extensions:['json']}]});if(out.canceled||!out.filePath)return false;writeFileSync(out.filePath,JSON.stringify(store.snapshot(),null,2),{mode:0o600});return true;});
 handle('import',async()=>{const res=await dialog.showOpenDialog(win,{filters:[{name:'JSON',extensions:['json']}],properties:['openFile']});if(res.canceled)return false;const file=res.filePaths[0];if(statSync(file).size>8*1024*1024)throw new Error('Backup exceeds 8 MB limit.');store.import(JSON.parse(readFileSync(file,'utf8')));publish();return true;});
 globalShortcut.register('CommandOrControl+Shift+D',()=>{if(win){win.show();win.focus()}});await createWindow();updates=createUpdateController({app,emit:state=>{if(win&&!win.isDestroyed())win.webContents.send('workforce:update',state)}});updates.start();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
}).catch(e=>{dialog.showErrorBox('Devydtz Workforce',e.message||String(e));app.quit()});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});app.on('will-quit',()=>{for(const controller of active.values())controller.abort();office?.stop();meetings?.stop();updates?.stop();globalShortcut.unregisterAll()});

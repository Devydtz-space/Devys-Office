'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const call=(name,...args)=>ipcRenderer.invoke('workforce:'+name,...args);
const api={
 getUpdateStatus:()=>call('updates-status'),checkUpdates:()=>call('updates-check'),installUpdate:()=>call('updates-install'),
 officeStatus:()=>call('office-status'),officeConnect:data=>call('office-connect',data),officeDisconnect:()=>call('office-disconnect'),officeCheck:()=>call('office-check'),
 computerStatus:()=>call('computer-status'),computerEnable:confirmation=>call('computer-enable',confirmation),computerDisable:()=>call('computer-disable'),computerTool:(name,args)=>call('computer-tool',{name,args}),computerAgent:data=>call('computer-agent',data),
 createMeeting:data=>call('meeting-create',data),runMeeting:id=>call('meeting-run',id),cancelMeeting:id=>call('meeting-cancel',id),noteMeeting:(id,text)=>call('meeting-note',{id,text}),
 grantWorkspace:()=>call('workspace-grant'),revokeWorkspace:()=>call('workspace-revoke'),
 getState:()=>call('get-state'),getAI:()=>call('get-ai'),signIn:()=>call('sign-in'),signOut:()=>call('sign-out'),
 renameChat:(agentId,threadId,title)=>call('chat-rename',{agentId,threadId,title}),editMessage:(agentId,messageId,text)=>call('chat-edit',{agentId,messageId,text}),
 newChat:agentId=>call('chat-new',agentId),openChat:(agentId,threadId)=>call('chat-open',{agentId,threadId}),chat:(agentId,text)=>call('chat',{agentId,text}),teamRun:data=>call('team-run',data),runTask:id=>call('task-run',id),cancelRun:id=>call('cancel-run',id),
 createTask:data=>call('task-create',data),updateTask:(id,patch)=>call('task-update',{id,patch}),deleteTask:id=>call('task-delete',id),
 createAgent:data=>call('agent-create',data),updateAgent:(id,patch)=>call('agent-update',{id,patch}),
 createProject:data=>call('project-create',data),updateProject:(id,patch)=>call('project-update',{id,patch}),deleteProject:id=>call('project-delete',id),inspectProject:id=>call('inspect-project',id),
 createKnowledge:data=>call('knowledge-create',data),updateKnowledge:(id,patch)=>call('knowledge-update',{id,patch}),deleteKnowledge:id=>call('knowledge-delete',id),
 createApproval:data=>call('approval-create',data),resolveApproval:(id,status)=>call('approval-resolve',{id,status}),updateSettings:patch=>call('settings-update',patch),
 saveIntegration:(kind,token)=>call('integration-save',{kind,token}),removeIntegration:kind=>call('integration-remove',kind),getIntegrations:()=>call('integration-status'),getOverview:()=>call('integration-overview'),
 openUrl:url=>call('open-url',url),notify:(title,body)=>call('notify',{title,body}),exportData:()=>call('export'),importData:()=>call('import'),
 onState:cb=>{const fn=(_e,state)=>cb(state);ipcRenderer.on('workforce:state',fn);return()=>ipcRenderer.removeListener('workforce:state',fn)},
 onRunEvent:cb=>{const fn=(_e,data)=>cb(data);ipcRenderer.on('workforce:run-event',fn);return()=>ipcRenderer.removeListener('workforce:run-event',fn)},
 onUpdate:cb=>{const fn=(_e,data)=>cb(data);ipcRenderer.on('workforce:update',fn);return()=>ipcRenderer.removeListener('workforce:update',fn)}
};
contextBridge.exposeInMainWorld('devy',Object.freeze(api));

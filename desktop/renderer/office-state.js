(function(root){
 'use strict';
 function activity(state,id){
  if(state.office?.currentJob?.employee===id)return {kind:'working',label:'Office job',meeting:state.office.currentJob.kind==='meeting'};
  const meeting=(state.meetings||[]).find(m=>m.status==='running'&&m.participants.includes(id));
  if(meeting)return {kind:meeting.speaker===id?'working':'waiting',label:meeting.speaker===id?'Contributing':'Listening',meeting:true};
  const run=(state.runs||[]).find(r=>r.status==='running'&&(r.currentAgentId||r.agentId)===id&&(state.activeRuns||[]).includes(r.id));
  if(run)return {kind:'working',label:run.kind==='chat'?'Responding':'Working',meeting:false};
  if((state.approvals||[]).some(a=>a.status==='pending'&&a.requestedBy===id))return {kind:'review',label:'Awaiting review',meeting:false};
  const latest=(state.runs||[]).find(r=>r.agentId===id);
  if(latest&&['failed','interrupted'].includes(latest.status))return {kind:'blocked',label:latest.status==='failed'?'Needs attention':'Interrupted',meeting:false};
  return {kind:'idle',label:'Available',meeting:false};
 }
 const api={activity};if(typeof module!=='undefined')module.exports=api;else root.OfficeState=api;
})(typeof globalThis!=='undefined'?globalThis:this);

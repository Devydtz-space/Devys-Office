'use strict';
const {randomUUID}=require('node:crypto');
const {sanitizeText}=require('./agents.cjs');
// The scheduler owns real provider work; the renderer only observes persisted state.
class Meetings {
 constructor({store,contribute,publish=()=>{}}){Object.assign(this,{store,contribute,publish});this.controllers=new Map();this.store.data.meetings??=[];}
 save(){this.store.save();this.publish();}
 create({title,goal,participants}){
  title=sanitizeText(title,150);goal=sanitizeText(goal,4000);
  const ids=[...new Set(['devy',...(Array.isArray(participants)?participants:[])])];
  if(!title||goal.length<8)throw Error('Enter a title and a goal of at least eight characters.');
  if(ids.length<2||ids.length>6||ids.some(id=>!this.store.data.agents.some(a=>a.id===id)))throw Error('Choose two to six existing employees.');
  if(this.controllers.size)throw Error('Finish the current meeting first.');
  const m={id:randomUUID(),title,goal,participants:ids,status:'queued',speaker:null,minutes:[],notes:[],summary:'',error:'',createdAt:Date.now()};
  this.store.data.meetings.unshift(m);this.store.data.meetings=this.store.data.meetings.slice(0,100);this.save();return m;
 }
 note(id,text){const m=this.find(id);text=sanitizeText(text,2000);if(!text)throw Error('Write a follow-up first.');m.notes.push({text,at:Date.now()});this.save();return m;}
 find(id){const m=this.store.data.meetings.find(m=>m.id===id);if(!m)throw Error('Meeting not found.');return m;}
 cancel(id){const m=this.find(id);if(!['queued','running'].includes(m.status))throw Error('Meeting is not running.');m.status='cancelled';m.speaker=null;this.controllers.get(id)?.abort();this.save();}
 async run(id){const m=this.find(id);if(this.controllers.size)throw Error('Another meeting is running.');if(!['queued','failed','interrupted'].includes(m.status))throw Error('Meeting cannot be started in its current state.');const controller=new AbortController();this.controllers.set(id,controller);m.status='running';m.error='';this.save();
  try{
   const turns=[...m.participants.map(employee=>({employee,phase:employee==='devy'?'introduction':'contribution'})),{employee:'devy',phase:'summary'}];
   for(let i=m.minutes.length;i<turns.length;i++){
    controller.signal.throwIfAborted();const turn=turns[i];m.speaker=turn.employee;this.save();
    const instruction=turn.phase==='summary'?'Produce the final summary, decisions, concerns and proposed tasks. Distinguish proposals from executed work.':turn.phase==='introduction'?'Introduce the goal and delegate specific questions to the selected specialists.':'Investigate your assigned area with authorized tools, build on earlier findings, and identify evidence and blockers.';
    const input=`Meeting: ${m.title}\nGoal: ${m.goal}\nParticipants: ${m.participants.join(', ')}\n${instruction}\nPrevious contributions:\n${m.minutes.map(x=>x.employee+': '+x.text).join('\n\n').slice(-16000)}\nOwner follow-ups:\n${m.notes.map(n=>n.text).join('\n').slice(-4000)}`;
    const result=await this.contribute({employee:turn.employee,input,signal:controller.signal,meeting:m});controller.signal.throwIfAborted();
    if(!result?.text?.trim())throw Error('Employee returned no contribution.');
    m.minutes.push({...turn,text:result.text,at:Date.now()});if(turn.phase==='summary')m.summary=result.text;this.save();
   }
   m.status='review';m.speaker=null;this.save();
  }catch(error){m.status=controller.signal.aborted?'cancelled':'failed';m.error=error.message||String(error);m.speaker=null;this.save();}finally{this.controllers.delete(id);}
  return m;
 }
 stop(){for(const [id,c] of this.controllers){c.abort();const m=this.find(id);m.status='interrupted';m.speaker=null;}this.save();}
}
module.exports={Meetings};

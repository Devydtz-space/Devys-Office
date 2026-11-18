import {test,expect} from 'bun:test';
process.env.OFFICE_TEST='1';const {handle}=await import('../index.ts');
const origin='https://office.devydtz.com';
test('web meetings route introduction, specialists and summary with owner follow-ups',async()=>{
 const call=(path,method='GET',payload,headers={})=>handle(new Request(origin+path,{method,headers:{origin,...headers,...(payload?{'content-type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined}));
 const login=await call('/api/login','POST',{password:'test-password'});const csrf=(await login.json()).csrf;const auth={cookie:login.headers.get('set-cookie').split(';')[0],'x-office-csrf':csrf};const bridge={authorization:'Bearer office-bridge-test-only-secret-0123456789'};
 const created=await call('/api/meetings','POST',{topic:'Validate release',agenda:'Verify tests and packaging',participants:['atlas','cipher']},auth);expect(created.status).toBe(201);const {meeting}=await created.json();expect(meeting.turns).toEqual(['devy','atlas','cipher','devy']);
 await call('/api/meetings/'+meeting.id+'/note','POST',{text:'Inspect update integrity too'},auth);
 for(let i=0;i<4;i++){const {jobs}=await (await call('/api/bridge/jobs','GET',undefined,bridge)).json();const job=jobs.find(j=>j.prompt.includes('Validate release'));expect(job).toBeTruthy();if(i>0)expect(job.prompt).toContain('Inspect update integrity too');const completed=await call('/api/bridge/jobs/'+job.id+'/complete','POST',{reply:'Verified contribution '+i},bridge);expect(completed.status).toBe(200);}
 const state=await (await call('/api/state','GET',undefined,auth)).json();const result=state.meetings.find(m=>m.id===meeting.id);expect(result.status).toBe('review');expect(result.minutes.length).toBe(4);expect(result.decision).toBe('Verified contribution 3');expect(result.taskIds.length).toBe(0);
 await call('/api/meetings/'+meeting.id+'/close','POST',{},auth);
});

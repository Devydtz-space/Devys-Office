import {test,expect} from 'bun:test';
process.env.OFFICE_TEST='1';
const {handle}=await import('../index.ts');
test('health endpoint',async()=>{
 const r=await handle(new Request('http://localhost:3000/health'));
 expect(r.status).toBe(200);
 expect((await r.json()).ok).toBe(true);
});
test('private workspace requires auth',async()=>{
 const r=await handle(new Request('http://localhost:3000/api/state'));
 expect(r.status).toBe(401);
});
test('bridge rejects unauthenticated requests',async()=>{
 const r=await handle(new Request('http://localhost:3000/api/bridge/jobs'));
 expect(r.status).toBe(401);
});
test('owner login responds with secure cookie and CSRF',async()=>{
 const login=await handle(new Request('http://localhost:3000/api/login',{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':'127.0.0.100'},body:JSON.stringify({password:'test-password'})}));
 expect(login.status).toBe(200);
 expect(login.headers.get('set-cookie')).toContain('HttpOnly');
 const body=await login.json();
 expect(body.csrf).toBeTruthy();
});

import {timingSafeEqual} from 'node:crypto';

// This gate is independent of frontend visibility and rejects all requests
// unless the feature is deliberately enabled and a strong private test token
// is configured on the existing Vercel project.
export function instantAccessAllowed(headers:Record<string,unknown>,environment:NodeJS.ProcessEnv=process.env):boolean{
 if(environment.INSTANT_CHECKER_ENABLED!=='true')return false;
 // Public use requires a second, explicit production release switch.
 if(environment.INSTANT_CHECKER_PUBLIC_ENABLED==='true')return true;
 const expected=environment.INSTANT_CHECKER_TEST_TOKEN;
 if(!expected||expected.length<32||expected.length>256)return false;
 const raw=headers['x-instant-test-token'];
 if(typeof raw!=='string'||raw.length!==expected.length)return false;
 return timingSafeEqual(Buffer.from(raw,'utf8'),Buffer.from(expected,'utf8'));
}

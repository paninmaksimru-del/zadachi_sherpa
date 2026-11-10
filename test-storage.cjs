const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const fixture = JSON.parse(readFileSync(__dirname+'/data/report.json','utf8'));
let remote = structuredClone(fixture), sha = 'version-1', calls = [];
const ctx = vm.createContext({TextEncoder,TextDecoder,Uint8Array,btoa,atob,fetch:async(url,options)=>{
  calls.push({url,options});
  if(options.method==='GET') return {ok:true,json:async()=>({sha,content:Buffer.from(JSON.stringify(remote)).toString('base64')})};
  const body = JSON.parse(options.body);
  if(body.sha!==sha) return {ok:false,status:409};
  remote=JSON.parse(Buffer.from(body.content,'base64').toString('utf8')); sha='version-2';
  return {ok:true,json:async()=>({content:{sha}})};
}});
vm.runInContext(readFileSync(__dirname+'/dist/storage.js','utf8')+'; globalThis.store=repo;',ctx);
(async()=>{
 const store=ctx.store; store.token='fake-unit-test-token';
 const loaded=await store.load();
 assert.equal(loaded.tasks.length,30); assert.equal(loaded.bugs.length,9);
 loaded.tasks[0].name='Проверка UTF-8: ёж 🦔';
 await store.save(loaded); assert.equal(remote.tasks[0].name,loaded.tasks[0].name); assert.equal(store.sha,'version-2');
 const contentBefore=JSON.stringify(remote); sha='someone-elses-save';
 await assert.rejects(()=>store.save(loaded),/другой вкладке/);
 assert.equal(JSON.stringify(remote),contentBefore);
 assert.ok(calls.every(c=>c.url.startsWith('https://api.github.com/')));
 assert.ok(calls.every(c=>c.options.headers.Authorization==='Bearer fake-unit-test-token'));
 store.disconnect(); assert.equal(store.token,''); assert.equal(store.ready,false);
 await assert.rejects(()=>store.save(loaded),/Сначала/);
 console.log('PASS: initial data, Unicode roundtrip, version SHA, conflict preserves remote, token destination, disconnect');
})().catch(err=>{console.error(err);process.exitCode=1});

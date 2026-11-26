import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { searchChannels } from '../search.mjs';
import { classifyQuery, sourceFor } from '../analytics.mjs';
const scope=vm.createContext({});
for(const file of ['Allowlist.gs','Code.gs']) vm.runInContext(readFileSync(new URL('../analytics-backend/collector/'+file,import.meta.url),'utf8'),scope);
const normalize=(batch)=>JSON.parse(JSON.stringify(scope.normalizeBatch_(JSON.stringify(batch),Date.parse('2026-11-26T10:17:29Z'))));
test('Original lineup count and searches',()=>{
  assert.equal(searchChannels('').length,74);
  for(const [q,id] of [['ESPN','14'],['ESPN2','16'],['Nat Geo','57'],['HBO','54'],['Cartoon Network','29'],['CNN','25'],['HDMI 1','80'],['Catroon Network','29']])
    assert.equal(searchChannels(q)[0]?.id,id);
  for(const id of ['02','06','33','48','68','75','76']) assert.equal(searchChannels(id).length,0);
});
test('Allowlisted terms and normalized numeric aliases',()=>{
  for(const q of [' ESPN ','channel 14','roku','HBO','Nat Geo']) {
    const r=classifyQuery(q,searchChannels(q)); assert.ok(r.found&&r.term);
    assert.equal(normalize([['term',r.term,0]])[0][2],r.term);
  }
});
test('Never emit arbitrary guest text, including typos and accidental PII',()=>{
  for(const q of ['sample@example.com','ESPN sample@example.com','555-010-0967','https://example.com?q=name','Catroon Network','<svg onload=alert(1)>','my room number is 14']) {
    const r=classifyQuery(q,searchChannels(q)); assert.equal(r.term,'');
    assert.match(r.channel,/^(?:|\d\d)$/);
  }
});
test('Backend rejects unknown labels, identifiers, invalid values and excessive batches',()=>{
  for(const row of [['term','my private text',0],['source','https://example.com/path',0],['active','visible',8],['visitors','a1',0],
    ['selects','02',0],['load_ms','page',60001],['orientation','coordinates',0],['__proto__','',0]]) assert.throws(()=>normalize([row]));
  assert.throws(()=>normalize(Array(21).fill(['views','',0])));
});
test('Backend groups anonymous batches at hour granularity, activity at minute granularity',()=>{
  assert.deepEqual(normalize([['views','',0],['views','',0],['load_ms','page',150],['active','visible',0]]),
    [['2026-11-26T10:00Z','views','',2,0],['2026-11-26T10:00Z','load_ms','page',1,150],['2026-11-26T10:17Z','active','visible',1,0]]);
});
test('Source only returns fixed buckets, QR tagging never changes base URL',()=>{
  const url=new URL('https://paulhrios.github.io/beaver-creek-lodge-tv/');
  assert.equal(sourceFor(url,''),'Direct / unknown');
  assert.equal(sourceFor(url,'https://google.com/search?q=private'),'Search');
  assert.equal(sourceFor(url,'https://user.example/private/path'),'Other referral');
  url.searchParams.set('src','qr');
  assert.equal(sourceFor(url,''),'QR (tagged)');
});

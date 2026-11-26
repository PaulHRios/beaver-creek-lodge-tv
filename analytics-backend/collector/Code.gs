const EVENTS = Object.freeze({
  views:[''],sessions:['page'],searches:[''],no_results:[''],selects:'channel',
  match:'channel',term:'term',theme:['light','dark'],language:['en','es'],
  filter:['all','sports','news','entertainment','family','spanish','hotel','general'],clear:[''],
  device:['Phone','Tablet','Desktop / other'],os:['Android','iOS','iPadOS','Windows','macOS','ChromeOS','Linux','Other'],
  browser:'browser', resolution:['Under 500 CSS px','500–799 CSS px','800–1099 CSS px','1100+ CSS px'],
  orientation:['Portrait','Landscape'],device_language:'language',
  source:['QR (tagged)','Direct / unknown','Same site','Search','Social','Other referral'],
  load_ms:['page'],find_ms:['first_display','result_tap'],duration_ms:['visible'],
  error:['script','asset','promise'], active:['visible']
});
const BOUNDS = Object.freeze({load_ms:60000,find_ms:30000,duration_ms:1800000});
function doGet() {
  return ContentService.createTextOutput('TV guide metrics collector. No read access.');
}
function validLabel_(kind, label) {
  if (Array.isArray(kind)) return kind.includes(label);
  if (kind==='channel') return CHANNEL_IDS.includes(label);
  if (kind==='term') return TERMS.includes(label);
  if (kind==='language') return /^[a-z]{2}$|^other$/.test(label);
  if (kind==='browser') return /^(?:(?:Chrome|Safari|Edge|Opera|Samsung|Firefox) \d{1,3}|Other)$/.test(label);
  return false;
}
function normalizeBatch_(body, now) {
  if (typeof body!=='string'||body.length>4096) throw new Error('batch');
  const input=JSON.parse(body);
  if (!Array.isArray(input)||input.length<1||input.length>20) throw new Error('batch');
  const data=new Map();
  for (const row of input) {
    if (!Array.isArray(row)||row.length!==3) throw new Error('event');
    const [metric,label,value]=row;
    if (typeof metric!=='string'||!Object.prototype.hasOwnProperty.call(EVENTS,metric)||
        typeof label!=='string'||!validLabel_(EVENTS[metric],label)||
        !Number.isSafeInteger(value)||value<0||value>(BOUNDS[metric]||0)) throw new Error('event');
    const step=metric==='active'?60000:3600000;
    const bucket=new Date(Math.floor(now/step)*step).toISOString().slice(0,16)+'Z';
    const k=JSON.stringify([bucket,metric,label]);
    const aggregate=data.get(k)||[bucket,metric,label,0,0];
    aggregate[3]++; aggregate[4]+=value; data.set(k,aggregate);
  }
  return [...data.values()];
}
function doPost(e) {
  const reply = value => ContentService.createTextOutput(value);
  const now=Date.now();
  let rows;
  try {rows=normalizeBatch_(e?.postData?.contents,now);} catch {return reply('ignored');}
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(750)) return reply('busy');
  try {
    const store=PropertiesService.getScriptProperties();
    const hour=new Date(Math.floor(now/3600000)*3600000).toISOString().slice(0,13);
    const key='h:'+hour;
    let item=JSON.parse(store.getProperty(key)||'{"writes":0,"rows":{}}');
    if (item.writes>=250) return reply('limited');
    if (!item.writes) {
      const cutoff=new Date(now-93*86400000).toISOString().slice(0,13);
      const items=store.getProperties();
      const hours=Object.keys(items).filter(k=>k.startsWith('h:')).sort();
      let bytes=hours.reduce((n,k)=>n+3*(items[k].length+k.length),0);
      for (const k of hours) {
        if (k.slice(2)>=cutoff && bytes<=350000) break;
        store.deleteProperty(k);
        bytes-=3*(items[k].length+k.length);
      }
    }
    for (const [bucket,metric,label,count,sum] of rows) {
      const k=JSON.stringify([bucket.slice(11,16),metric,label]);
      const v=item.rows[k]||[0,0];
      v[0]+=count;v[1]+=sum;item.rows[k]=v;
    }
    item.writes++;
    const encoded=JSON.stringify(item);
    if (encoded.length>2800) return reply('limited');
    store.setProperty(key,encoded);
    return reply('ok');
  } catch {return reply('unavailable');}
  finally {lock.releaseLock();}
}

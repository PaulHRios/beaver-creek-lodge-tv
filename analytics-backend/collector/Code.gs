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
  let rows;
  try {rows=normalizeBatch_(e?.postData?.contents,Date.now());} catch {return reply('ignored');}
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) return reply('busy');
  try {
    const properties=PropertiesService.getScriptProperties();
    const id=properties.getProperty('SPREADSHEET_ID');
    if (!id) return reply('disabled');
    const today=new Date().toISOString().slice(0,10);
    const budget=(properties.getProperty('WRITE_BUDGET')||'').split(':');
    const count=budget[0]===today?Number(budget[1])||0:0;
    if (count>=3000) return reply('limited');
    const sheet=SpreadsheetApp.openById(id).getSheetByName('metrics');
    if (!sheet) return reply('disabled');
    const start=sheet.getLastRow()+1;
    const needed=start+rows.length-1-sheet.getMaxRows();
    if (needed>0) sheet.insertRowsAfter(sheet.getMaxRows(),Math.max(needed,500));
    // Prevent the sheet from interpreting timestamps or allowlisted labels as formulas/numbers.
    sheet.getRange(start,1,rows.length,3).setNumberFormat('@');
    sheet.getRange(start,1,rows.length,5).setValues(rows);
    properties.setProperty('WRITE_BUDGET',today+':'+(count+1));
    SpreadsheetApp.flush();
    return reply('ok');
  } catch {return reply('unavailable');}
  finally {lock.releaseLock();}
}
// Periodic owner-installed trigger. Fixed retention, never based on guest input.
function pruneMetrics_() {
  const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) return;
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const sheet=SpreadsheetApp.openById(id).getSheetByName('metrics');
    if (!sheet || sheet.getLastRow()<2) return;
    const cutoff=new Date(Date.now()-93*86400000).toISOString().slice(0,10);
    const values=sheet.getRange(2,1,sheet.getLastRow()-1,1).getDisplayValues();
    const index=values.findIndex(([bucket])=>bucket.slice(0,10)>=cutoff);
    const count=index===-1?values.length:index;
    if(count) sheet.deleteRows(2,count);
  } finally {lock.releaseLock();}
}

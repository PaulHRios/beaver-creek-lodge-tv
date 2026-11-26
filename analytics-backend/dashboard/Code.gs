// Deploy only as the owner, with access set to Only myself. The collector is a separate project.
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('TV Guide Analytics')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
function getDashboard(from,to) {
  const parse=(d)=>{
    if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('Invalid date');
    const day = Date.parse(d+'T00:00:00Z');
    if(!Number.isFinite(day)||new Date(day).toISOString().slice(0,10)!==d) throw new Error('Invalid date');
    return day;
  };
  const start=parse(from), end=parse(to), oneDay=86400000, span=end-start+oneDay;
  if(span<oneDay||span>93*oneDay) throw new Error('Select up to 93 days.');
  const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Analytics storage is not configured.');
  const sheet=SpreadsheetApp.openById(id).getSheetByName('metrics');
  const generatedAt=new Date().toISOString();
  const startPrior=new Date(start-span).toISOString().slice(0,10);
  const activeSince=new Date(Date.now()-30*60000).toISOString().slice(0,16)+'Z';
  const result=new Map();
  const size=sheet.getLastRow();
  if(size>1) for(const [bucket,metric,label,count,sum] of sheet.getRange(2,1,size-1,5).getValues()){
    const date=String(bucket).slice(0,10);
    if ((date<startPrior||date>to) && !(metric==='active'&&bucket>=activeSince)) continue;
    if(metric==='active'&&bucket<activeSince) continue;
    const k=JSON.stringify([bucket,metric,label]);
    const row=result.get(k)||{bucket,metric,label:String(label),count:0,sum:0};
    row.count+=Number(count)||0;row.sum+=Number(sum)||0;result.set(k,row);
  }
  return {generatedAt,rows:[...result.values()]};
}

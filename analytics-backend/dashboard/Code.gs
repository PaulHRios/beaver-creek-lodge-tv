// Append to the collector after its independent write-only version is deployed. Deploy this NEW version only as Only myself; never update the public deployment.
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
  const generatedAt=new Date().toISOString();
  const startPrior=new Date(start-span).toISOString().slice(0,10);
  const activeSince=new Date(Date.now()-30*60000).toISOString().slice(0,16)+'Z';
  const cutoff=new Date(Date.now()-93*oneDay).toISOString().slice(0,10);
  const rows=[];
  for (const [key,value] of Object.entries(PropertiesService.getScriptProperties().getProperties())) {
    if(!key.startsWith('h:')) continue;
    const date=key.slice(2,12);
    if(date<cutoff || date<startPrior || date>to) continue;
    for(const [fields,counts] of Object.entries(JSON.parse(value).rows)){
      const [time,metric,label]=JSON.parse(fields);
      const bucket=date+'T'+time+'Z';
      if(metric==='active'&&bucket<activeSince) continue;
      rows.push({bucket,metric,label,count:counts[0],sum:counts[1]});
    }
  }
  return {generatedAt,rows};
}

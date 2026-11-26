import { collectorUrl } from './analytics-config.mjs';
import { CHANNELS } from './channels.mjs';

const categories = new Set(['all','sports','news','entertainment','family','spanish','hotel','general']);
const indexes = new Map(CHANNELS.map(c => [c.id, c]));
const key = s => s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/ +/g,' ');
const allowed = new Map();
for (const channel of CHANNELS) for (const term of [channel.name, channel.identifier, ...channel.aliases]) {
  const label = key(term);
  if (!allowed.has(label)) allowed.set(label, {label, channel:channel.id});
  else if (allowed.get(label)?.channel !== channel.id) allowed.set(label, null);
}
for (const term of ['hdmi','hdmi1','hdmi 1','roku','netflix','youtube','streaming','stream','cast','chromecast'])
  allowed.set(term,{label:term, channel:'80'});

export function classifyQuery(raw, results) {
  const input = String(raw ?? '').trim();
  if (!input) return null;
  // Never return any substring from the guest input. Values originate in the lineup.
  const typed = key(input);
  const number = /^(?:(?:channel|ch|canal)\s*)?(\d{1,2})$/.exec(typed);
  const id = number ? number[1].padStart(2,'0') : '';
  const known = (indexes.has(id) ? {label:'ch '+id,channel:id} : allowed.get(typed)) ?? null;
  const found = results.length > 0;
  const result = results.length === 1 && indexes.has(results[0].id) ? results[0].id : '';
  return {found, channel: found ? (known && results.some(x=>x.id===known.channel) ? known.channel : result) : '', term:known?.label ?? ''};
}

export function sourceFor(url, referrer) {
  if (url.searchParams.get('src') === 'qr') return 'QR (tagged)';
  let host = '';
  try { host = new URL(referrer).hostname.toLowerCase(); } catch {}
  if (!host) return 'Direct / unknown';
  if (host === url.hostname) return 'Same site';
  if (/(^|\.)(google\.(com|ca|com\.mx|co\.uk)|bing\.com|duckduckgo\.com|search\.yahoo\.com)$/.test(host)) return 'Search';
  if (/(^|\.)(facebook\.com|instagram\.com|tiktok\.com|reddit\.com)$/.test(host)) return 'Social';
  return 'Other referral';
}

function deviceInfo() {
  const ua = navigator.userAgent;
  const tablet = /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (/Android/.test(ua) && !/Mobile/.test(ua));
  const os = tablet && /Macintosh|iPad/.test(ua) ? 'iPadOS' :
    /iPhone|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' :
      /CrOS/.test(ua) ? 'ChromeOS' : /Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const browser = [[/Edg(?:A|iOS)?\/(\d{1,3})/, 'Edge'],[/OPR\/(\d{1,3})/,'Opera'],[/SamsungBrowser\/(\d{1,3})/,'Samsung'],
    [/(?:Firefox|FxiOS)\/(\d{1,3})/,'Firefox'],[/(?:Chrome|CriOS)\/(\d{1,3})/,'Chrome'],[/Version\/(\d{1,3}).*Safari/,'Safari']]
    .map(([re,name]) => {const m=re.exec(ua);return m ? name+' '+m[1]:''}).find(Boolean) ?? 'Other';
  const small = Math.min(screen.width, screen.height), large = Math.max(screen.width,screen.height);
  return {
    device: tablet ? 'Tablet' : /Mobile|iPhone/.test(ua) ? 'Phone' : 'Desktop / other', os, browser,
    resolution: (small<500?'Under 500':small<800?'500–799':small<1100?'800–1099':'1100+')+' CSS px',
    orientation: innerWidth<innerHeight?'Portrait':'Landscape',
    device_language: (navigator.language || '').toLowerCase().split('-')[0].match(/^[a-z]{2}$/)?.[0] ?? 'other',
    source: sourceFor(new URL(location.href), document.referrer),
  };
}

export function initAnalytics(context) {
  const noop = () => {};
  const off = {search:noop, select:noop, interaction:noop, clear:noop};
  const live = location.origin === 'https://paulhrios.github.io' && location.pathname === '/beaver-creek-lodge-tv/';
  const signal = () => navigator.globalPrivacyControl === true || ['1','yes'].includes(navigator.doNotTrack || window.doNotTrack);
  const choice = () => {try { return localStorage.getItem('bcl-tv-privacy') !== 'off'; } catch { return false; }};
  if (!live || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(collectorUrl)) return off;
  const on = () => !signal() && choice();
  if (!on()) return off;
  const metrics = [];
  let searchPending, searchTimer, flushTimer, lastSearch = 0, searchStart = 0, firstResult = false;
  let sent = 0, visibleSince = document.hidden ? 0 : performance.now();
  function record(event,label='',value=0) {
    if (!on() || sent + metrics.length >= 240) return;
    metrics.push([event,label,value]);
    if (metrics.length >= 20) flush();
    else if (!flushTimer) flushTimer = setTimeout(flush,3000);
  }
  function flush() {
    clearTimeout(flushTimer);
    flushTimer = 0;
    if (!metrics.length) return;
    if (!on()) { metrics.length = 0; return; }
    const data = metrics.splice(0,20);
    sent += data.length;
    fetch(collectorUrl, {method:'POST', mode:'no-cors', credentials:'omit', referrerPolicy:'no-referrer',
      headers:{'Content-Type':'text/plain;charset=UTF-8'}, body:JSON.stringify(data), keepalive:true}).catch(noop);
  }
  const bounded = (v,max) => Math.max(0,Math.min(max,Math.round(v)));
  function commitSearch() {
    clearTimeout(searchTimer);
    if (!searchPending) return;
    const {found,channel,term,elapsed} = searchPending;
    searchPending = null;
    record('searches');
    if (found) {

      if (channel) record('match',channel);
      if (!firstResult) { record('find_ms','first_display',elapsed); firstResult = true; }
    } else record('no_results');
    if (term) record('term',term);
  }
  function finishVisible() {
    if (visibleSince) record('duration_ms','visible',bounded(performance.now()-visibleSince,1800000));
    visibleSince = 0;
  }
  record('views');
  record('sessions','page');
  for (const [event,label] of Object.entries(deviceInfo())) record(event,label);
  record('theme',context().theme);
  record('language',context().lang);
  const load = () => setTimeout(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav?.loadEventEnd > 0) record('load_ms','page',bounded(nav.loadEventEnd,60000));
  },0);
  if (document.readyState === 'complete') load(); else window.addEventListener('load',load,{once:true});
  window.addEventListener('error',e => record('error',e.target===window?'script':'asset'),true);
  window.addEventListener('unhandledrejection',() => record('error','promise'));
  if (!document.hidden) record('active','visible');
  setInterval(() => { if (!document.hidden) record('active','visible'); },60000);
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) { finishVisible(); commitSearch(); flush(); }
    else visibleSince = performance.now();
  });
  window.addEventListener('pagehide',()=>{finishVisible();commitSearch();flush();});
  return {
    search(raw, results) {
      const item = classifyQuery(raw, results);
      if (!item) {this.clear(false);return;}
      const now = performance.now();
      if (!searchStart || now-lastSearch > 8000) { searchStart = now; firstResult = false; }
      lastSearch = now;
      searchPending = {...item, elapsed:bounded(now-searchStart,30000)};
      clearTimeout(searchTimer);
      searchTimer = setTimeout(commitSearch,800);
    },
    select(id) {
      if (!indexes.has(id)) return;
      commitSearch();
      record('selects',id);
      if (searchStart && performance.now()-lastSearch<30000)
        record('find_ms','result_tap',bounded(performance.now()-searchStart,30000));
    },
    interaction(type,label) {
      if ((type==='theme' && ['light','dark'].includes(label)) ||
          (type==='language' && ['en','es'].includes(label)) ||
          (type==='filter' && categories.has(label))) record(type,label);
    },
    clear(emit=true) {
      commitSearch(); searchStart=0;lastSearch=0;firstResult=false;
      if (emit) record('clear');
    },
  };
}

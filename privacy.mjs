const button=document.querySelector('#analytics-choice'), status=document.querySelector('#analytics-status');
const blocked=()=>navigator.globalPrivacyControl===true||['1','yes'].includes(navigator.doNotTrack||window.doNotTrack);
function refresh() {
  try {
    const off = blocked() || localStorage.getItem('bcl-tv-privacy')==='off';
    button.hidden=blocked();
    button.textContent=off?'Enable analytics / Activar analítica':'Disable analytics / Desactivar analítica';
    status.textContent=blocked()?'Your browser blocks measurement. / Tu navegador bloquea la medición.':
      off?'Analytics disabled. / Analítica desactivada.':'Analytics enabled on this browser. / Analítica activada en este navegador.';
  } catch {button.hidden=true;status.textContent='Analytics disabled. / Analítica desactivada.';}
}
button.addEventListener('click',()=>{
  try { if (!blocked()) localStorage.setItem('bcl-tv-privacy',localStorage.getItem('bcl-tv-privacy')==='off'?'on':'off'); }
  finally { refresh(); }
});
refresh();

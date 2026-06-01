/* ════════════════════════════════════════════════════════════════════
 * edital-leis.js
 * ────────────────────────────────────────────────────────────────────
 * Edital verticalizado, leitura de leis, getEditalAtivo, configurações de edital/leis.
 *
 * IMPORTANTE: Este arquivo é parte do PROTOCOLO 01 (Estratégia B — Fase 1).
 * Todas as funções declaradas aqui são GLOBAIS (window.<nome>) por design.
 * NÃO converter para ESModules / IIFE / import-export sem refatoração ampla.
 * NÃO renomear funções (handlers inline no HTML dependem dos nomes atuais).
 * ════════════════════════════════════════════════════════════════════ */

function buildEdital(_force){
if(!_force&&!document.getElementById('tab-edital')?.classList.contains('active')) return;
const container=document.getElementById('edital-list');
const openGroups=new Set();
document.querySelectorAll('.disc-group-body.open').forEach(el=>openGroups.add(el.id));
container.innerHTML='';
getEditalAtivo().forEach(disc=>{
const allIds=[];
disc.topics.forEach(t=>{allIds.push(t.id);t.subs.forEach(s=>allIds.push(s.id));});
const total=allIds.length;
const estudados=allIds.filter(id=>ST.progresso[id+'_e']).length;
const pct=total>0?Math.round(estudados/total*100):0;
const wasOpen=openGroups.has('dgb-'+disc.id);
const group=document.createElement('div');
group.className='disc-group';
group.id='disc-group-'+disc.id;
group.innerHTML=`
<div class="disc-group-prog" style="height:3px;background:rgba(255,255,255,.07)">
<div class="disc-group-prog-fill" style="width:${pct}%"></div>
</div>
<div class="disc-group-header" onclick="toggleDiscGroup('${disc.id}')">
<div class="disc-group-name">${disc.name}</div>
<div class="disc-group-pct">${pct}%</div>
<svg class="disc-group-chev${wasOpen?' open':''}" viewBox="0 0 24 24"><polyline points="6,9 12,15 18,9"/></svg>
</div>
<div class="disc-group-body${wasOpen?' open':''}" id="dgb-${disc.id}"></div>`;
const body=group.querySelector('.disc-group-body');
disc.topics.forEach(topic=>{
const tEl=document.createElement('div');
tEl.className='topic-item';
const te=!!ST.progresso[topic.id+'_e'];
tEl.innerHTML=`
<div class="topic-main">
<div class="topic-text">${topic.text}</div>
<div class="topic-checks">
<div>
<div class="tcheck ${te?'estudado':''}" onclick="toggleCheck('${topic.id}','e')" title="Estudado" data-check-id="${topic.id}" data-check-type="e">
<svg viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
</div>
<div class="tcheck-label">E</div>
</div>
</div>
</div>`;
if(topic.subs.length>0){
const subList=document.createElement('div');
subList.className='subtopic-list';
topic.subs.forEach(sub=>{
const se=!!ST.progresso[sub.id+'_e'];
const sEl=document.createElement('div');
sEl.className='subtopic-item';
sEl.innerHTML=`
<div class="subtopic-text">${sub.text}</div>
<div class="subtopic-checks">
<div class="stcheck ${se?'estudado':''}" onclick="toggleCheck('${sub.id}','e')" title="Estudado" data-check-id="${sub.id}" data-check-type="e">
<svg viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
</div>
</div>`;
subList.appendChild(sEl);
});
tEl.appendChild(subList);
}
body.appendChild(tEl);
});
container.appendChild(group);
});
}
function toggleDiscGroup(id){
const body=document.getElementById('dgb-'+id);
const group=document.getElementById('disc-group-'+id);
const chev=group.querySelector('.disc-group-chev');
body.classList.toggle('open');
chev.classList.toggle('open');
}
function toggleCheck(id, type){
const key=id+'_'+type;
ST.progresso[key]=!ST.progresso[key];
const newState=ST.progresso[key];
saveState();
const clickedEl=document.querySelector(`[data-check-id="${id}"][data-check-type="${type}"]`);
if(clickedEl) clickedEl.classList.toggle('estudado', newState);
getEditalAtivo().forEach(disc=>{
disc.topics.forEach(topic=>{
if(!topic.subs.length) return;
const subIds=topic.subs.map(s=>s.id);
if(subIds.includes(id)){
const allDone=subIds.every(sid=>ST.progresso[sid+'_e']);
const anyDone=subIds.some(sid=>ST.progresso[sid+'_e']);
if(allDone && !ST.progresso[topic.id+'_e']){
ST.progresso[topic.id+'_e']=true;
saveState();
const parentEl=document.querySelector(`[data-check-id="${topic.id}"][data-check-type="e"]`);
if(parentEl) parentEl.classList.add('estudado');
} else if(!anyDone && ST.progresso[topic.id+'_e']){
ST.progresso[topic.id+'_e']=false;
saveState();
const parentEl=document.querySelector(`[data-check-id="${topic.id}"][data-check-type="e"]`);
if(parentEl) parentEl.classList.remove('estudado');
}
}
if(id===topic.id){
subIds.forEach(sid=>{
ST.progresso[sid+'_e']=newState;
const subEl=document.querySelector(`[data-check-id="${sid}"][data-check-type="e"]`);
if(subEl) subEl.classList.toggle('estudado', newState);
});
saveState();
}
});
});
getEditalAtivo().forEach(disc=>{
const allIds=[];
disc.topics.forEach(t=>{allIds.push(t.id);t.subs.forEach(s=>allIds.push(s.id));});
if(allIds.includes(id)){
const estudados=allIds.filter(i=>ST.progresso[i+'_e']).length;
const pct=allIds.length>0?Math.round(estudados/allIds.length*100):0;
const g=document.getElementById('disc-group-'+disc.id);
if(g){
const fill=g.querySelector('.disc-group-prog-fill');
if(fill) fill.style.width=pct+'%';
const pctEl=g.querySelector('.disc-group-pct');
if(pctEl) pctEl.textContent=pct+'%';
}
}
});
renderProgessoStats();
_registrarSessaoEdital(id, newState);
renderDashboard();
}
function renderProgessoStats(_force){
if(!_force&&!document.getElementById('tab-edital')?.classList.contains('active')) return;
const {total,estudados}=countProgresso();
const pct=total>0?Math.round(estudados/total*100):0;
const pendentes=total-estudados;
const pb=document.getElementById('prog-bar');if(pb) pb.style.width=pct+'%';
const pf=document.getElementById('prog-frac');if(pf) pf.textContent=estudados+'/'+total;
const pc=document.getElementById('prog-completos');if(pc) pc.textContent=estudados;
const pp=document.getElementById('prog-pendentes');if(pp) pp.textContent=pendentes;
}
function resetProgresso(){
if(!confirm('Limpar TODO o progresso do edital?')) return;
ST.progresso={};saveState();buildEdital();renderProgessoStats();renderDashboard();
}
function progSubAba(sub){
['lista','config'].forEach(s=>{
const p=document.getElementById('prog-painel-'+s); if(p) p.style.display='none';
const b=document.getElementById('prog-sub-'+s); if(b) b.classList.remove('active');
});
const p=document.getElementById('prog-painel-'+sub); if(p) p.style.display='block';
const b=document.getElementById('prog-sub-'+sub); if(b) b.classList.add('active');
if(sub==='lista'){buildEdital();renderProgessoStats();}
if(sub==='config') cfgEditalBuild();
}
const EDITAL_CFG_KEY = 'pmal26_edital_cfg';
function _editalCfgKey(){
  const id=typeof _concGetAtivo==='function'?_concGetAtivo():null;
  return id ? EDITAL_CFG_KEY+'_'+id : EDITAL_CFG_KEY;
}
function _editalCfgLoad(){
  try{
    const perConc=localStorage.getItem(_editalCfgKey());
    if(perConc) return JSON.parse(perConc);
    if(!localStorage.getItem('protocolo_concurso_ativo')){
      return JSON.parse(localStorage.getItem(EDITAL_CFG_KEY)||'null');
    }
    return null;
  }catch(e){return null;}
}
function _editalCfgSave(obj){
  try{localStorage.setItem(_editalCfgKey(),JSON.stringify(obj));}catch(e){}
}
function getEditalAtivo(){
// Usa _CM como fonte de verdade quando disponível
if(typeof _CM !== 'undefined' && _CM.edital && _CM.edital.length) return _CM.edital;
const cfg=_editalCfgLoad();
return cfg && cfg.edital ? cfg.edital : EDITAL;
}
(function(){
const cfg=_editalCfgLoad();
if(cfg&&cfg.edital){
EDITAL.length=0;
cfg.edital.forEach(d=>EDITAL.push(d));
}
})();
function cfgEditalBuild(){
const wrap=document.getElementById('cfg-edital-wrap'); if(!wrap) return;
wrap.innerHTML='';
const edital=getEditalAtivo();
edital.forEach((disc,di)=>{
wrap.appendChild(_cfgEditalDiscCard(disc,di,edital.length));
});
}
function _cfgEditalDiscCard(disc,di,total){
const isFirst=di===0;
const isLast=di===(total-1);
const btnUp=`<button onclick="cfgEditalSubir(${di})" title="Mover para cima"
style="background:none;border:1px solid var(--border2);border-radius:5px;color:${isFirst?'var(--dim)':'var(--gold)'};cursor:${isFirst?'default':'pointer'};font-size:.75rem;padding:1px 7px;line-height:1.4"
${isFirst?'disabled':''}>▲</button>`;
const btnDown=`<button onclick="cfgEditalDescer(${di})" title="Mover para baixo"
style="background:none;border:1px solid var(--border2);border-radius:5px;color:${isLast?'var(--dim)':'var(--gold)'};cursor:${isLast?'default':'pointer'};font-size:.75rem;padding:1px 7px;line-height:1.4"
${isLast?'disabled':''}>▼</button>`;
const posInput=`<input type="number" min="1" max="${total}" value="${di+1}" id="cfg-edital-pos-${di}"
title="Definir posição (pressione Enter)"
onkeydown="if(event.key==='Enter') cfgEditalMoverPara(${di}, this.value)"
style="width:42px;background:var(--surface2);border:1px solid var(--border2);border-radius:5px;color:var(--text);font-family:'Oswald',sans-serif;font-size:.7rem;font-weight:700;padding:1px 5px;text-align:center;outline:none;">`;
const card=document.createElement('div');
card.className='cfg-dia-card';
card.id='cfg-edital-disc-'+di;
card.innerHTML=`
<div class="cfg-dia-header" style="display:flex;align-items:center;gap:6px">
<span class="cfg-dia-label" style="flex:1">Disciplina ${di+1}</span>
<div style="display:flex;align-items:center;gap:4px">
${btnUp}
${posInput}
${btnDown}
</div>
<button id="cfg-edital-del-btn-${di}" onclick="cfgEditalDelDisc(${di})" style="background:none;border:1px solid transparent;color:var(--red);cursor:pointer;font-size:.9rem;padding:0 6px;margin-left:4px;border-radius:4px;transition:all .2s" title="Clique 2x para confirmar">🗑</button>
</div>
<div class="cfg-dia-body">
<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.25rem">Nome da disciplina</div>
<input class="sim-input" style="width:100%;margin-bottom:.65rem;font-size:.78rem" placeholder="Ex: Língua Portuguesa" id="cfg-edital-name-${di}" value="${escapeHtml(disc.name||'')}">
<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem">Tópicos</div>
<div id="cfg-edital-topics-${di}"></div>
<button onclick="cfgEditalAddTopic(${di})" style="background:rgba(96,165,250,.08);border:1px dashed rgba(96,165,250,.3);color:var(--blue);border-radius:7px;padding:.28rem .7rem;font-size:.62rem;font-family:'Oswald',sans-serif;font-weight:700;cursor:pointer;width:100%;text-transform:uppercase;letter-spacing:.05em;margin-top:.3rem">+ Tópico</button>
</div>`;
card.querySelector('#cfg-edital-topics-'+di).innerHTML='';
disc.topics.forEach((t,ti)=>{
card.querySelector('#cfg-edital-topics-'+di).appendChild(_cfgEditalTopicRow(di,ti,t));
});
return card;
}
function _cfgEditalTopicRow(di,ti,topic){
const wrap=document.createElement('div');
wrap.id='cfg-edital-topic-'+di+'-'+ti;
wrap.style.cssText='background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:.5rem .65rem;margin-bottom:.4rem';
wrap.innerHTML=`
<div style="display:flex;align-items:center;gap:6px;margin-bottom:.3rem">
<button id="cfg-edital-del-topic-${di}-${ti}" onclick="cfgEditalDelTopic(${di},${ti})" style="background:none;border:1px solid transparent;color:var(--red);cursor:pointer;font-size:.8rem;padding:0 2px;flex-shrink:0;border-radius:3px;transition:all .2s" title="Clique 2x para confirmar">✕</button>
<input class="sim-input" style="flex:1;font-size:.72rem" placeholder="Texto do tópico" id="cfg-edital-ttext-${di}-${ti}" value="${escapeHtml(topic.text||'')}">
</div>
<div id="cfg-edital-subs-${di}-${ti}" style="padding-left:1rem"></div>
<button onclick="cfgEditalAddSub(${di},${ti})" style="background:rgba(74,222,128,.06);border:1px dashed rgba(74,222,128,.25);color:var(--green);border-radius:5px;padding:.2rem .6rem;font-size:.58rem;font-family:'Oswald',sans-serif;font-weight:700;cursor:pointer;margin-top:.2rem;text-transform:uppercase;letter-spacing:.04em">+ Subtópico</button>`;
const subsWrap=wrap.querySelector('#cfg-edital-subs-'+di+'-'+ti);
(topic.subs||[]).forEach((s,si)=>{
subsWrap.appendChild(_cfgEditalSubRow(di,ti,si,s));
});
return wrap;
}
function _cfgEditalSubRow(di,ti,si,sub){
const row=document.createElement('div');
row.id='cfg-edital-sub-'+di+'-'+ti+'-'+si;
row.style.cssText='display:flex;align-items:center;gap:5px;margin-bottom:.3rem';
row.innerHTML=`
<button id="cfg-edital-del-sub-${di}-${ti}-${si}" onclick="cfgEditalDelSub(${di},${ti},${si})" style="background:none;border:1px solid transparent;color:var(--red);cursor:pointer;font-size:.75rem;padding:0 2px;flex-shrink:0;border-radius:3px;transition:all .2s" title="Clique uma vez para confirmar">✕</button>
<input class="sim-input" style="flex:1;font-size:.7rem" placeholder="Texto do subtópico" id="cfg-edital-stext-${di}-${ti}-${si}" value="${escapeHtml(sub.text||'')}">`;
return row;
}
function _cfgLerEditalDoDOM(){
const edital=getEditalAtivo();
edital.forEach((disc,di)=>{
const nameEl=document.getElementById('cfg-edital-name-'+di);
if(nameEl) disc.name=nameEl.value;
disc.topics.forEach((t,ti)=>{
const tEl=document.getElementById('cfg-edital-ttext-'+di+'-'+ti);
if(tEl) t.text=tEl.value;
(t.subs||[]).forEach((s,si)=>{
const sEl=document.getElementById('cfg-edital-stext-'+di+'-'+ti+'-'+si);
if(sEl) s.text=sEl.value;
});
});
});
return edital;
}
function cfgEditalSubir(di){
if(di===0) return;
const edital=_cfgLerEditalDoDOM();
[edital[di-1],edital[di]]=[edital[di],edital[di-1]];
_editalCfgSave({edital});
cfgEditalBuild();
setTimeout(()=>{ document.getElementById('cfg-edital-disc-'+(di-1))?.scrollIntoView({behavior:'smooth',block:'nearest'}); },50);
}
function cfgEditalDescer(di){
const edital=_cfgLerEditalDoDOM();
if(di>=edital.length-1) return;
[edital[di],edital[di+1]]=[edital[di+1],edital[di]];
_editalCfgSave({edital});
cfgEditalBuild();
setTimeout(()=>{ document.getElementById('cfg-edital-disc-'+(di+1))?.scrollIntoView({behavior:'smooth',block:'nearest'}); },50);
}
function cfgEditalMoverPara(di, novaPosStr){
const edital=_cfgLerEditalDoDOM();
let novaPos=parseInt(novaPosStr)-1;
novaPos=Math.max(0,Math.min(edital.length-1,novaPos));
if(novaPos===di) return;
const [item]=edital.splice(di,1);
edital.splice(novaPos,0,item);
_editalCfgSave({edital});
cfgEditalBuild();
setTimeout(()=>{ document.getElementById('cfg-edital-disc-'+novaPos)?.scrollIntoView({behavior:'smooth',block:'nearest'}); },50);
}
function cfgEditalAddDisc(){
const edital=_cfgLerEditalDoDOM();
edital.push({id:'disc_'+Date.now(),name:'',topics:[]});
_editalCfgSave({edital});
cfgEditalBuild();
setTimeout(()=>{ document.getElementById('cfg-edital-disc-'+(edital.length-1))?.scrollIntoView({behavior:'smooth',block:'nearest'}); },50);
}
function cfgEditalDelDisc(di){
const btn=document.getElementById('cfg-edital-del-btn-'+di);
if(!btn) return;
if(btn.dataset.confirmando==='1'){
  // Segunda vez — confirma
  const edital=getEditalAtivo();
  edital.splice(di,1);
  _editalCfgSave({edital});
  EDITAL.length=0; edital.forEach(d=>EDITAL.push(d));
  cfgEditalBuild();
  buildEdital(); renderProgessoStats();
} else {
  // Primeira vez — pede confirmação
  btn.dataset.confirmando='1';
  btn.textContent='Confirmar?';
  btn.style.background='rgba(248,113,113,.25)';
  btn.style.borderColor='rgba(248,113,113,.6)';
  setTimeout(()=>{
    if(btn.dataset.confirmando==='1'){
      btn.dataset.confirmando='';
      btn.textContent='🗑';
      btn.style.background='';
      btn.style.borderColor='';
    }
  },2500);
}
}
function cfgEditalAddTopic(di){
const edital=_cfgLerEditalDoDOM();
edital[di].topics.push({id:'t_'+Date.now(),text:'',subs:[]});
_editalCfgSave({edital});
const topicsWrap=document.getElementById('cfg-edital-topics-'+di); if(!topicsWrap) return;
const ti=edital[di].topics.length-1;
topicsWrap.appendChild(_cfgEditalTopicRow(di,ti,edital[di].topics[ti]));
}
function cfgEditalDelTopic(di,ti){
const bid='cfg-edital-del-topic-'+di+'-'+ti;
const btn=document.getElementById(bid);
if(!btn) return;
if(btn.dataset.confirmando==='1'){
  const edital=_cfgLerEditalDoDOM();
  edital[di].topics.splice(ti,1);
  _editalCfgSave({edital});
  EDITAL.length=0; edital.forEach(d=>EDITAL.push(d));
  cfgEditalBuild();
} else {
  btn.dataset.confirmando='1';
  btn.textContent='Ok?';
  btn.style.background='rgba(248,113,113,.25)';
  setTimeout(()=>{if(btn.dataset.confirmando==='1'){btn.dataset.confirmando='';btn.textContent='✕';btn.style.background='';}},2500);
}
}
function cfgEditalAddSub(di,ti){
const edital=_cfgLerEditalDoDOM();
if(!edital[di].topics[ti].subs) edital[di].topics[ti].subs=[];
edital[di].topics[ti].subs.push({id:'s_'+Date.now(),text:''});
_editalCfgSave({edital});
const subsWrap=document.getElementById('cfg-edital-subs-'+di+'-'+ti); if(!subsWrap) return;
const si=edital[di].topics[ti].subs.length-1;
subsWrap.appendChild(_cfgEditalSubRow(di,ti,si,edital[di].topics[ti].subs[si]));
}
function cfgEditalDelSub(di,ti,si){
const bid='cfg-edital-del-sub-'+di+'-'+ti+'-'+si;
const btn=document.getElementById(bid);
if(!btn) return;
if(btn.dataset.confirmando==='1'){
  const edital=_cfgLerEditalDoDOM();
  edital[di].topics[ti].subs.splice(si,1);
  _editalCfgSave({edital});
  EDITAL.length=0; edital.forEach(d=>EDITAL.push(d));
  cfgEditalBuild();
} else {
  btn.dataset.confirmando='1';
  btn.textContent='Ok?';
  btn.style.background='rgba(248,113,113,.25)';
  setTimeout(()=>{if(btn.dataset.confirmando==='1'){btn.dataset.confirmando='';btn.textContent='✕';btn.style.background='';}},2500);
}
}

function cfgEditalSalvar(){
const edital=getEditalAtivo();
edital.forEach((disc,di)=>{
const nameEl=document.getElementById('cfg-edital-name-'+di);
if(nameEl) disc.name=nameEl.value.trim()||disc.name;
disc.topics.forEach((t,ti)=>{
const tEl=document.getElementById('cfg-edital-ttext-'+di+'-'+ti);
if(tEl) t.text=tEl.value.trim()||t.text;
(t.subs||[]).forEach((s,si)=>{
const sEl=document.getElementById('cfg-edital-stext-'+di+'-'+ti+'-'+si);
if(sEl) s.text=sEl.value.trim()||s.text;
});
});
});
_editalCfgSave({edital});
EDITAL.length=0;
edital.forEach(d=>EDITAL.push(d));
_backupToast('✅ Edital salvo!','var(--green)');
buildEdital(); renderProgessoStats();
buildQuestoes(); renderQuestoes();
renderDashboard();
progSubAba('lista');
}
function getQuestoesFromEdital(){
// Usa _CM (ContestManager) se disponível; fallback para EDITAL global
var src = (typeof _CM !== 'undefined' && _CM.edital && _CM.edital.length)
  ? _CM.edital : EDITAL;
return src.map(disc=>{
const topics=[];
disc.topics.forEach(t=>{
if(t.subs&&t.subs.length>0){
t.subs.forEach(s=>topics.push({id:s.id, name:s.text}));
} else {
topics.push({id:t.id, name:t.text});
}
});
return {id:disc.id, name:disc.name, topics};
});
}
Object.defineProperty(window,'QUESTOES_MATERIAS',{
get(){ return getQuestoesFromEdital(); },
configurable:true
});
function getQKey(matId, topicIdOrIdx){
if(typeof topicIdOrIdx==='string') return 'qt_'+topicIdOrIdx;
const mat=(window.QUESTOES_MATERIAS||[]).find(m=>m.id===matId);
if(mat&&mat.topics[topicIdOrIdx]) return 'qt_'+mat.topics[topicIdOrIdx].id;
return 'qt_'+matId+'_'+topicIdOrIdx;
}
let qStatPeriodo='tudo', qStatMatId='todas';
function qStatSetPeriodo(btn){
document.querySelectorAll('[data-periodo]').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
qStatPeriodo=btn.dataset.periodo;
const cw=document.getElementById('qstat-custom-wrap');
if(cw) cw.style.display=qStatPeriodo==='custom'?'block':'none';
buildQuestoes();
}
function qStatSetMat(btn){
document.querySelectorAll('[data-mat]').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
qStatMatId='todas';
const sel=document.getElementById('qstat-mat-sel');
if(sel) sel.value='';
buildQuestoes();
}
function qStatSetMatSel(sel){
document.querySelectorAll('[data-mat]').forEach(b=>b.classList.remove('active'));
qStatMatId=sel.value||'todas';
buildQuestoes();
}
function _getPeriodoDates(){
const hoje=new Date(); hoje.setHours(0,0,0,0);
const hojeStr=hoje.toLocaleDateString('pt-BR');
const semIni=new Date(hoje); semIni.setDate(hoje.getDate()-hoje.getDay());
const mesIni=new Date(hoje.getFullYear(),hoje.getMonth(),1);
const customStr=(document.getElementById('qstat-custom-date')?.value||'');
let customDate=null;
if(customStr){const [y,m,d]=customStr.split('-');customDate=`${d}/${m}/${y}`;}
return {hojeStr,semIni,mesIni,customDate};
}
function _dataNoperiodo(dataStr){
if(qStatPeriodo==='tudo') return true;
if(!dataStr) return false;
const {hojeStr,semIni,mesIni,customDate}=_getPeriodoDates();
if(qStatPeriodo==='hoje') return dataStr===hojeStr;
if(qStatPeriodo==='custom') return dataStr===customDate;
const [dd,mm,yyyy]=dataStr.split('/');
const d=new Date(parseInt(yyyy),parseInt(mm)-1,parseInt(dd));
if(qStatPeriodo==='semana') return d>=semIni;
if(qStatPeriodo==='mes') return d>=mesIni;
return true;
}
function qStatGetBancoFiltrado(){
return ST.banco.filter(q=>{
if(!q.historico?.length) return false;
return q.historico.some(h=>_dataNoperiodo(h.data));
});
}
function qStatGetEntradas(q){
return (q.historico||[]).filter(h=>_dataNoperiodo(h.data));
}
function qStatGetLogPeriodo(key){
if(qStatPeriodo==='tudo'){
return ST.questoes[key]||{total:0,acertos:0};
}
const logs=(ST.questoesLog||{})[key]||[];
const filtrados=logs.filter(e=>_dataNoperiodo(e.data));
if(!filtrados.length) return {total:0,acertos:0};
const ult=filtrados[filtrados.length-1];
const prim=filtrados[0];
const allLogs=logs.sort((a,b)=>{
const [da,ma,ya]=a.data.split('/');
const [db,mb,yb]=b.data.split('/');
return new Date(ya,ma-1,da)-new Date(yb,mb-1,db);
});
const idxPrim=allLogs.indexOf(prim);
const anterior=idxPrim>0?allLogs[idxPrim-1]:{total:0,acertos:0};
const total=Math.max(0,ult.total-anterior.total);
const acertos=Math.max(0,ult.acertos-anterior.acertos);
return {total,acertos};
}

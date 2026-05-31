/* ════════════════════════════════════════════════════════════════════
 * cronograma.js
 * ────────────────────────────────────────────────────────────────────
 * Navegação de abas (goTab), countdown, cronograma e configuração de cronograma.
 *
 * IMPORTANTE: Este arquivo é parte do PROTOCOLO 01 (Estratégia B — Fase 1).
 * Todas as funções declaradas aqui são GLOBAIS (window.<nome>) por design.
 * NÃO converter para ESModules / IIFE / import-export sem refatoração ampla.
 * NÃO renomear funções (handlers inline no HTML dependem dos nomes atuais).
 * ════════════════════════════════════════════════════════════════════ */

function goTab(id){
// Persiste qualquer alteração pendente antes de trocar de aba
if(typeof _doSave==='function') _doSave();
document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
document.querySelectorAll('.sb-item').forEach(t=>t.classList.remove('active'));
const sec=document.getElementById('tab-'+id);if(sec)sec.classList.add('active');
const sbi=document.getElementById('sbtab-'+id);if(sbi)sbi.classList.add('active');
if(id==='dashboard'){
try{if(typeof _CM!=='undefined'&&_CM.leis&&_CM.leis.length){LEIS_LEITURA.length=0;_CM.leis.forEach(function(l){LEIS_LEITURA.push(l);});}}catch(e){}
renderDashboard(true);
}
if(id==='cronograma') buildCronograma(true);
if(id==='edital'){buildEdital(true);renderProgessoStats(true);}
if(id==='questoes'){buildQuestoes(true);renderQuestoes(true);}
if(id==='leitura'){
  // V2 reader — sync LEIS_LEITURA then build new reader
  try{
    if(typeof _CM!=='undefined'&&_CM.leis&&_CM.leis.length){
      LEIS_LEITURA.length=0;_CM.leis.forEach(l=>LEIS_LEITURA.push(l));
    } else if(typeof _leisCfgLoad==='function') {
      const _lc=_leisCfgLoad();
      if(_lc&&_lc.leis&&_lc.leis.length){LEIS_LEITURA.length=0;_lc.leis.forEach(l=>LEIS_LEITURA.push(l));}
    }
  }catch(e){}
  // Use new V2 reader if available, fall back to old
  if(typeof lnBuild==='function'){
    if(document.getElementById('ln-main')) { if(typeof lnRender==='function') lnRender(); }
    else setTimeout(lnBuild,30);
  } else {
    buildLeitura(true);renderLeituraGeral(true);
  }
}
if(id==='banco'){buildBancoCompleto();bqRenderStats(true);}
if(id==='erros'){goTab('banco');}
if(id==='flashcards'){buildFcDecks(true);fcPopularFiltros(true);}
if(id==='backup'){if(typeof buildProfile==='function'){buildProfile();if(typeof ppSwitchTab==='function')ppSwitchTab('dados');}else{buildBackupTab();}}
if(id==='perfil'){if(typeof buildProfile==='function') buildProfile();}
}
const PROVA_DATE = new Date('2026-07-19T08:00:00');
const START_DATE = new Date('2026-04-13T00:00:00');
function updateCountdown(){
const now=new Date();
const prova=_getProvaDate ? _getProvaDate() : PROVA_DATE;
const diff=prova-now;
const days=Math.max(0,Math.ceil(diff/(1000*60*60*24)));
document.querySelectorAll('#cd-days,#nav-days').forEach(el=>{if(el)el.textContent=days});
const _startD=window._START_OVERRIDE||START_DATE;
const totalDays=(prova-_startD)/(1000*60*60*24);
const elapsed=(now-_startD)/(1000*60*60*24);
const pct=Math.min(100,Math.max(0,Math.round(elapsed/totalDays*100)));
const bar=document.getElementById('cd-bar');
if(bar) bar.style.width=pct+'%';
const pt=document.getElementById('cd-pct-text');
if(pt) pt.textContent=pct+'% do tempo de preparação percorrido';
const lbl=document.getElementById('cd-prova-label');
if(lbl){
const meses=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const dataStr=prova.getDate()+' de '+meses[prova.getMonth()]+' de '+prova.getFullYear();
let conc=window._CONCURSO_OVERRIDE||'PMAL 2026';
let carg=window._CARGO_OVERRIDE||'';
try{
  const _cMeta=typeof _concGetMeta==='function'?_concGetMeta():[];
  const _cAtiv=typeof _concGetAtivo==='function'?_concGetAtivo():null;
  const _cObj=_cAtiv?_cMeta.find(c=>c.id===_cAtiv):null;
  if(_cObj&&_cObj.nome) conc=window._CONCURSO_OVERRIDE||_cObj.nome;
  if(_cObj&&_cObj.cargo) carg=window._CARGO_OVERRIDE||_cObj.cargo;
}catch(e){}
lbl.textContent='🎯 '+conc+(carg?' — '+carg:'')+' — '+dataStr;
}
}
updateCountdown();
const CICLO = [
{dia:1,label:'DOM',tasks:[
{id:'c1_1',cat:'Simulado',desc:'Realizar um simulado completo',type:'simulado'},
{id:'c1_2',cat:'Redação',desc:'Treinar redação dissertativa-argumentativa',type:'simulado'},
{id:'c1_3',cat:'Revisão Semanal',desc:'Revisar os principais pontos da semana',type:'revisao'},
]},
{dia:2,label:'SEG',tasks:[
{id:'c2_0',cat:'Extra',desc:'Direito Penal Militar — Ler assunto e marcações da semana anterior.',type:'revisao'},
{id:'c2_1',cat:'Português',desc:'1 Assunto Completo — Professor Alexandre Soares',type:'video'},
{id:'c2_2',cat:'Direito Penal Militar',desc:'1 PDF do Caveira — Marcações no material do Legislação 360',type:'leitura'},
{id:'c2_3',cat:'Leitura de Cabeceira',desc:'Lei de Drogas',type:'leitura'},
]},
{dia:3,label:'TER',tasks:[
{id:'c3_0',cat:'Extra',desc:'Português — Revisar um tema específico de maior dificuldade',type:'revisao'},
{id:'c3_1',cat:'Direito Penal',desc:'Vídeo aula + Anotações no material — Juliano Yamakaua (DSO)',type:'video'},
{id:'c3_2',cat:'Informática',desc:'1 Assunto Completo — Rani Passos',type:'video'},
{id:'c3_3',cat:'Leitura de Cabeceira',desc:'Abuso de Autoridade',type:'leitura'},
]},
{dia:4,label:'QUA',tasks:[
{id:'c4_0',cat:'Extra',desc:'Português — Revisar um tema específico de maior dificuldade',type:'revisao'},
{id:'c4_1',cat:'Direito Constitucional',desc:'1 Assunto Completo — Dal Piva',type:'video'},
{id:'c4_2',cat:'Legislação Institucional',desc:'1 Assunto Completo — Criação do Resumo',type:'leitura'},
{id:'c4_3',cat:'Leitura de Cabeceira',desc:'Estatuto do Desarmamento',type:'leitura'},
]},
{dia:5,label:'QUI',tasks:[
{id:'c5_0',cat:'Extra',desc:'Matemática — Revisar um tema específico de maior dificuldade',type:'revisao'},
{id:'c5_1',cat:'Português',desc:'1 Assunto Completo — Professor Alexandre Soares',type:'video'},
{id:'c5_2',cat:'Legislação Extravagante',desc:'1 Legislação completa — Criação do Resumo / Vídeo Aula',type:'leitura'},
{id:'c5_3',cat:'Leitura de Cabeceira',desc:'Crimes do ECA',type:'leitura'},
]},
{dia:6,label:'SEX',tasks:[
{id:'c6_0',cat:'Extra',desc:'Português — Revisar um tema específico de maior dificuldade',type:'revisao'},
{id:'c6_1',cat:'Matemática',desc:'1 Assunto Completo — Sandro Curió',type:'video'},
{id:'c6_2',cat:'Inglês',desc:'Traduzir 1 texto CESPE e Pesquisar significados',type:'leitura'},
{id:'c6_3',cat:'Leitura de Cabeceira',desc:'Crimes do CTB',type:'leitura'},
]},
{dia:7,label:'SÁB',tasks:[
{id:'c7_0',cat:'Extra',desc:'Matemática — Revisar um tema específico de maior dificuldade',type:'revisao'},
{id:'c7_1',cat:'Conhecimentos de Alagoas',desc:'1 Assunto Completo — Criação do Resumo',type:'leitura'},
{id:'c7_2',cat:'Sociologia & Filosofia',desc:'1 tópico completo — Youtube ou Outros',type:'video'},
{id:'c7_3',cat:'Leitura de Cabeceira',desc:'Crimes Hediondos',type:'leitura'},
]},
];
function isTaskObrigatoria(task){
if(task._opcio===true) return false;
if(task._opcio===false) return true;
return task.cat !== 'Extra' && task.cat !== 'Leitura de Cabeceira';
}
function isDiaCumprido(date, cicloDay){
const obrigatorias = cicloDay.tasks.filter(isTaskObrigatoria);
if(!obrigatorias.length) return false;
return obrigatorias.every(t => ST.cronograma[getTaskId(date, t.id)]);
}
function makeDate(y,m,d){return new Date(y,m-1,d);}
function dateRange(start, end){
const days=[];
let cur=new Date(start);
while(cur<=end){
days.push(new Date(cur));
cur.setDate(cur.getDate()+1);
}
return days;
}
const CRONOGRAMA_START = makeDate(2026,4,12);
const CRONOGRAMA_END   = makeDate(2026,7,19);
const ALL_DAYS = dateRange(CRONOGRAMA_START, CRONOGRAMA_END);
function _getCronStart(){ return window._CRON_START_OVERRIDE || CRONOGRAMA_START; }
function _getCronEnd(){   return window._CRON_END_OVERRIDE   || CRONOGRAMA_END; }
function _getCiclo(){     return window._CICLO_OVERRIDE       || CICLO; }
function _getProvaDate(){ return window._PROVA_OVERRIDE       || PROVA_DATE; }
function getCicloIndex(date){
const s=_getCronStart();
const startMs = Date.UTC(s.getFullYear(),s.getMonth(),s.getDate());
const dateMs  = Date.UTC(date.getFullYear(),date.getMonth(),date.getDate());
const diff = Math.round((dateMs - startMs)/(1000*60*60*24));
return ((diff % 7) + 7) % 7;
}
function getDayId(date){
const y=date.getFullYear();
const m=String(date.getMonth()+1).padStart(2,'0');
const d=String(date.getDate()).padStart(2,'0');
return 'd'+y+m+d;
}
function getTaskId(date, taskId){
return getDayId(date)+'_'+taskId;
}
function autoMarcarDomingo(tipo){
const hoje = new Date();
if(hoje.getDay() !== 0) return;
const cicloIdx = getCicloIndex(hoje);
if(cicloIdx !== 0) return;
const mapa = {
simulado: 'c1_1',
};
const taskId = mapa[tipo];
if(!taskId) return;
const tid = getTaskId(hoje, taskId);
if(ST.cronograma[tid]) return;
ST.cronograma[tid] = true;
saveState();
const toast = document.createElement('div');
const labels = {simulado:'Simulado'};
toast.textContent = '✅ '+labels[tipo]+' marcado no cronograma de hoje!';
toast.style.cssText='position:fixed;bottom:1.2rem;left:50%;transform:translateX(-50%);background:rgba(74,222,128,.15);border:1px solid rgba(74,222,128,.4);color:var(--green);font-family:Oswald,sans-serif;font-size:.72rem;font-weight:700;padding:.45rem 1.1rem;border-radius:99px;z-index:9999;text-align:center;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.4)';
document.body.appendChild(toast);
setTimeout(()=>toast.remove(), 3000);
}
const PT_WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function formatDate(d){
return d.getDate().toString().padStart(2,'0')+'/'+
(d.getMonth()+1).toString().padStart(2,'0')+'/'+d.getFullYear();
}
/* ─── Navegação semanal offset ─── */
let _cronWeekOffset = 0;
function cronNavSemana(dir){
  _cronWeekOffset += dir;
  buildCronograma(true);
}

/* ─── Data selecionada no strip ─── */
let _cronSelectedDay = null; // Date object

function _getWeekDates(){
  const today = new Date(); today.setHours(0,0,0,0);
  // Início da semana atual (segunda)
  const dow = today.getDay(); // 0=dom
  const diffToMon = (dow===0)?-6:(1-dow);
  const mon = new Date(today); mon.setDate(today.getDate()+diffToMon+(_cronWeekOffset*7));
  const days=[];
  for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);days.push(d);}
  return days;
}

function _buildWeekStrip(){
  const strip = document.getElementById('cron-week-strip');
  if(!strip) return;
  strip.innerHTML='';
  const today=new Date(); today.setHours(0,0,0,0);
  const days=_getWeekDates();
  // Label semana
  const label=document.getElementById('cron-week-label');
  if(label){
    if(_cronWeekOffset===0) label.textContent='Semana atual';
    else if(_cronWeekOffset===-1) label.textContent='Semana anterior';
    else if(_cronWeekOffset===1) label.textContent='Próxima semana';
    else {
      const m=days[0]; const fm=m.getDate()+'/'+(m.getMonth()+1);
      const e=days[6]; const fe=e.getDate()+'/'+(e.getMonth()+1);
      label.textContent=fm+' – '+fe;
    }
  }
  const abbrs=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const diasCompletos=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  days.forEach(date=>{
    const isToday=date.getTime()===today.getTime();
    const isSel=_cronSelectedDay&&date.getTime()===_cronSelectedDay.getTime();
    const cicloIdx=getCicloIndex(date);
    const cicloDay=_getCiclo()[cicloIdx];
    const obrig=cicloDay?cicloDay.tasks.filter(isTaskObrigatoria):[];
    const doneCount=obrig.filter(t=>ST.cronograma[getTaskId(date,t.id)]).length;
    const allDone=obrig.length>0&&doneCount===obrig.length;
    const cell=document.createElement('div');
    cell.className='cron-day-cell'+(isToday||isSel?' active':'')+(allDone?' done':'');
    const _pct=obrig.length>0?Math.round(doneCount/obrig.length*100):0;
    cell.innerHTML=`<div class="cron-day-header"><span class="cron-day-full">${diasCompletos[date.getDay()]}</span></div><div class="cron-day-body"><span class="cron-day-num">${date.getDate()}</span><span class="cron-day-mes">${meses[date.getMonth()]}</span></div><span class="cron-day-dot" data-pct="${_pct}">${allDone?'<svg viewBox="0 0 8 8" fill="none" style="width:7px;height:7px;opacity:.9"><polyline points="1,4 3,6.5 7,1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>':''}</span>`;
    cell.onclick=()=>{_cronSelectedDay=date;buildCronograma(true);};
    strip.appendChild(cell);
  });
}

function _buildMateriasDay(date){
  const matList=document.getElementById('cron-materias-list');
  if(!matList) return;
  matList.innerHTML='';
  const cicloIdx=getCicloIndex(date);
  const cicloDay=_getCiclo()[cicloIdx];
  if(!cicloDay||!cicloDay.tasks||cicloDay.tasks.length===0){
    matList.innerHTML='<div style="font-size:.72rem;color:var(--dim);font-style:italic;padding:.5rem 0">Nenhuma tarefa para este dia.</div>';
    return;
  }
  // Agrupar por cat
  const grupos={};
  cicloDay.tasks.filter(isTaskObrigatoria).forEach(t=>{
    if(!grupos[t.cat]) grupos[t.cat]={tasks:[],done:0};
    grupos[t.cat].tasks.push(t);
    if(ST.cronograma[getTaskId(date,t.id)]) grupos[t.cat].done++;
  });
  const barColors=['var(--blue)','var(--green)','#fbbf24','var(--purple)','var(--red)'];
  let ci=0;
  Object.entries(grupos).forEach(([cat,g])=>{
    const total=g.tasks.length;
    const done=g.done;
    const pct=total>0?Math.round((done/total)*100):0;
    const color=barColors[ci%barColors.length]; ci++;
    const card=document.createElement('div');
    card.className='cron-materia-card';
    card.style.borderLeftColor=color;
    card.innerHTML=`
<div class="cron-materia-header">
  <div>
    <div class="cron-materia-name">${cat}</div>
    <div class="cron-materia-sub">Tópicos: ${done}/${total}</div>
  </div>
  <div style="text-align:right">
    <span class="cron-materia-pct-label">Progresso</span>
    <span class="cron-materia-pct" style="color:${color}">${pct}%</span>
  </div>
</div>
<div class="cron-materia-bar-track"><div class="cron-materia-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
    matList.appendChild(card);
  });
}

function buildCronograma(_force){
if(!_force&&!document.getElementById('tab-cronograma')?.classList.contains('active')) return;
const today = new Date();
today.setHours(0,0,0,0);

// Define o dia selecionado padrão como hoje
if(!_cronSelectedDay){
  _cronSelectedDay=new Date(today);
}

// Constrói o strip semanal
_buildWeekStrip();

// Matérias do dia selecionado
_buildMateriasDay(_cronSelectedDay);

// Renderiza as tarefas do dia selecionado no cron-list
const container = document.getElementById('cron-list');
container.innerHTML='';
const selDate=_cronSelectedDay;
const cicloIdx = getCicloIndex(selDate);
const cicloDay = _getCiclo()[cicloIdx];
const dayId = getDayId(selDate);
const isToday = selDate.getTime()===today.getTime();
const allDone = isDiaCumprido(selDate, cicloDay);
const obrig = cicloDay.tasks.filter(isTaskObrigatoria);
const doneCount = obrig.filter(t=>ST.cronograma[getTaskId(selDate,t.id)]).length;
const card = document.createElement('div');
card.className='day-card'+(isToday?' today':'')+(allDone?' all-done':'');
card.id='daycard-'+dayId;
const badgeClass = isToday?'today-badge':(allDone?'done-badge':'');
card.innerHTML=`
<div class="day-header" onclick="toggleDayCard('${dayId}','${isToday}')">
<div class="day-header-left">
<div class="day-num-badge ${badgeClass}">DIA ${cicloIdx+1} · ${cicloDay.label}${isToday?' · HOJE':''}</div>
<div>
<div class="day-name">${PT_WEEKDAYS[selDate.getDay()]} — ${formatDate(selDate)}</div>
</div>
</div>
<div class="day-header-right">
${allDone?`<span class="day-done-tag">&#10003; Concluído</span>`:`<div class="day-task-count">${doneCount}<span style="opacity:.4">/${obrig.length}</span></div>`}
<svg class="day-chev open" viewBox="0 0 24 24"><polyline points="6,9 12,15 18,9"/></svg>
</div>
</div>
<div class="day-body open" id="body-${dayId}"></div>`;
container.appendChild(card);
const body = card.querySelector('.day-body');
cicloDay.tasks.forEach(task=>{
const tid = getTaskId(selDate,task.id);
const done = !!ST.cronograma[tid];
const taskEl = document.createElement('div');
const isOpcio = !isTaskObrigatoria(task);
taskEl.className='task-item'+(done?' done':'');
taskEl.id='task-'+tid;
taskEl.onclick=()=>toggleTask(selDate,task.id,dayId);
const badgeMap={leitura:'badge-leitura',questao:'badge-questao',video:'badge-video',revisao:'badge-revisao',simulado:'badge-simulado',resumo:'badge-resumo'};
const badgeLabels={leitura:'Leitura',questao:'Questão',video:'Vídeo',revisao:'Revisão',simulado:'Simulado',resumo:'Resumo'};
const typeCls = task.type ? (' task-cat--' + task.type) : '';
taskEl.innerHTML=`
<div class="task-check${done?' done':''}">
<svg viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#08081a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
</div>
<div class="task-info">
<div class="task-meta-row">
<span class="task-cat${typeCls}">${task.cat}</span>${isOpcio?'<span class="task-opc-pill">Opcional</span>':''}
</div>
<div class="task-desc">${task.desc}</div>
</div>
<span class="task-badge ${badgeMap[task.type]||'badge-leitura'}">${badgeLabels[task.type]||task.type}</span>`;
body.appendChild(taskEl);
});
}
function toggleDayCard(dayId, isToday){
const body=document.getElementById('body-'+dayId);
const card=document.getElementById('daycard-'+dayId);
const chev=card.querySelector('.day-chev');
body.classList.toggle('open');
chev.classList.toggle('open');
}
function toggleTask(date, taskId, dayId){
const tid=getTaskId(date,taskId);
ST.cronograma[tid]=!ST.cronograma[tid];
const taskEl=document.getElementById('task-'+tid);
const chk=taskEl.querySelector('.task-check');
const done=ST.cronograma[tid];
taskEl.classList.toggle('done',done);
chk.classList.toggle('done',done);
const card=document.getElementById('daycard-'+dayId);
if(card){
const cicloIdx=getCicloIndex(date);
const cicloDay=_getCiclo()[cicloIdx];
const obrig=cicloDay.tasks.filter(isTaskObrigatoria);
const doneCount=obrig.filter(t=>ST.cronograma[getTaskId(date,t.id)]).length;
const tc=card.querySelector('.day-task-count');
if(tc) tc.textContent=doneCount+'/'+obrig.length+' obrig.';
const allDone=isDiaCumprido(date,cicloDay);
card.classList.toggle('all-done',allDone);
const badge=card.querySelector('.day-num-badge');
if(badge&&!badge.classList.contains('today-badge')){
badge.classList.toggle('done-badge',allDone);
}
}
// Atualiza strip e matérias
_buildWeekStrip();
_buildMateriasDay(date);
const cicloIdx2=getCicloIndex(date);
const cicloDay2=_getCiclo()[cicloIdx2];
const taskInfo=cicloDay2&&cicloDay2.tasks.find(t=>t.id===taskId);
_registrarSessaoTarefa(date, tid, done, taskInfo?.desc||taskId, taskInfo?.cat||'');
if(document.getElementById('tab-dashboard')?.classList.contains('active')) renderDashboard(true);
buildFocoDia();
saveState();
}
function resetCronograma(){
if(!confirm('Reiniciar todo o cronograma?')) return;
ST.cronograma={};saveState();buildCronograma();renderDashboard();
}
function cronSubAba(sub){
['lista','config'].forEach(s=>{
const p=document.getElementById('cron-painel-'+s); if(p) p.style.display='none';
const b=document.getElementById('cron-sub-'+s); if(b) b.classList.remove('active');
});
const p=document.getElementById('cron-painel-'+sub); if(p) p.style.display='block';
const b=document.getElementById('cron-sub-'+sub); if(b) b.classList.add('active');
if(sub==='lista') buildCronograma();
if(sub==='config') cfgBuild();
try{ if(typeof topbarSubTabUpdate==='function') topbarSubTabUpdate('cronograma', sub); }catch(e){}
// Toggle Configurar / Voltar buttons
const btnCfg=document.getElementById('cron-sub-config');
const btnVolt=document.getElementById('cron-btn-voltar');
if(btnCfg&&btnVolt){
  if(sub==='config'){btnCfg.style.display='none';btnVolt.style.display='';}
  else{btnCfg.style.display='';btnVolt.style.display='none';}
}
}
// ── FASE 9.4.3: Cronograma global ────────────────────────────────────
// Chave única global — não depende mais do concurso ativo
var _CRON_CFG_GLOBAL_KEY = 'pmal26_cfg_global';

function _cfgKey(){
  // Mantido para compatibilidade, mas retorna sempre a chave global
  return _CRON_CFG_GLOBAL_KEY;
}
function _cfgLoad(){
  try{
    // 1. Tentar chave global nova
    var g = localStorage.getItem(_CRON_CFG_GLOBAL_KEY);
    if(g) return JSON.parse(g);
    // 2. Migração automática: buscar a melhor cfg existente entre os concursos
    var _migrou = _cronMigrarCfgLegada();
    if(_migrou) return _migrou;
    // 3. Fallback legado (sistema antigo sem multi-concurso)
    var leg = localStorage.getItem('pmal26_cfg');
    if(leg){
      var parsed = JSON.parse(leg);
      try{ localStorage.setItem(_CRON_CFG_GLOBAL_KEY, leg); }catch(e){}
      return parsed;
    }
    return null;
  }catch(e){return null;}
}
function _cfgSave(obj){
  // Salva sempre na chave global
  try{localStorage.setItem(_CRON_CFG_GLOBAL_KEY, JSON.stringify(obj));}catch(e){}
}

// Migra a melhor configuração de cronograma existente por concurso → global
// Chamada apenas uma vez na primeira inicialização após a atualização
function _cronMigrarCfgLegada(){
  try{
    var meta = JSON.parse(localStorage.getItem('protocolo_concursos_meta')||'[]');
    if(!meta.length) return null;
    // Preferir concurso ativo; depois o que tiver mais dados (ciclo com mais tarefas)
    var ativoId = localStorage.getItem('protocolo_concurso_ativo');
    var melhor = null, melhorScore = -1;
    meta.forEach(function(c){
      var raw = localStorage.getItem('pmal26_cfg_'+c.id);
      if(!raw) return;
      var cfg = null;
      try{ cfg = JSON.parse(raw); }catch(e){ return; }
      if(!cfg) return;
      // Score: ciclo com mais tarefas totais
      var score = 0;
      if(cfg.ciclo && Array.isArray(cfg.ciclo)){
        cfg.ciclo.forEach(function(d){ score += (d.tasks||[]).length; });
      }
      // Bonus para o concurso ativo
      if(c.id === ativoId) score += 1000;
      if(score > melhorScore){ melhor = cfg; melhorScore = score; }
    });
    if(melhor){
      try{ localStorage.setItem(_CRON_CFG_GLOBAL_KEY, JSON.stringify(melhor)); }catch(e){}
      return melhor;
    }
    return null;
  }catch(e){ return null; }
}
function getCicloAtivo(){
const cfg=_cfgLoad();
return cfg&&cfg.ciclo ? cfg.ciclo : CICLO;
}
function getDatasAtivas(){
const cfg=_cfgLoad();
return {
inicio: cfg&&cfg.inicio ? cfg.inicio : '2026-04-12',
prova:  cfg&&cfg.prova  ? cfg.prova  : '2026-07-19',
};
}
function cfgBuild(){
const datas=getDatasAtivas();
const ini=document.getElementById('cfg-data-inicio'); if(ini) ini.value=datas.inicio;
const prov=document.getElementById('cfg-data-prova'); if(prov) prov.value=datas.prova;
const conc=document.getElementById('cfg-concurso'); if(conc) conc.value=datas.concurso||'';
const carg=document.getElementById('cfg-cargo'); if(carg) carg.value=datas.cargo||'';
const wrap=document.getElementById('cfg-dias-wrap'); if(!wrap) return;
cfgBuildObjetivos();
wrap.innerHTML='';
const ciclo=getCicloAtivo();
const diasNome=['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
const diasFull=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
ciclo.forEach((dia,di)=>{
const card=document.createElement('div');
card.className='cfg-dia-card';
card.id='cfg-dia-'+di;
card.innerHTML=`
<div class="cfg-dia-header">
<span class="cfg-dia-label">${diasFull[di]}</span>
<span style="font-size:.65rem;color:rgba(255,255,255,.55)">${dia.tasks.length} tarefa(s)</span>
</div>
<div class="cfg-dia-body" id="cfg-body-${di}"></div>
<div style="padding:0 .85rem .65rem">
<button onclick="cfgAddTask(${di})" style="background:rgba(245,200,0,.08);border:1px dashed rgba(245,200,0,.3);color:var(--gold);border-radius:7px;padding:.32rem .8rem;font-size:.65rem;font-family:'Oswald',sans-serif;font-weight:700;cursor:pointer;width:100%;text-transform:uppercase;letter-spacing:.05em">+ Adicionar tarefa</button>
</div>`;
wrap.appendChild(card);
cfgRenderDia(di, dia.tasks);
});
}
const CFG_TIPOS = ['leitura','video','revisao','resumo','simulado'];
const CFG_TIPO_LABEL = {leitura:'Leitura',video:'Vídeo',revisao:'Revisão',resumo:'Resumo',simulado:'Simulado'};
function cfgRenderDia(di, tasks){
const body=document.getElementById('cfg-body-'+di); if(!body) return;
body.innerHTML='';
tasks.forEach((t,ti)=>{
const isOpcio = t.cat==='Extra'||t.cat==='Leitura de Cabeceira'||t._opcio===true;
const tipo = CFG_TIPOS.includes(t.type) ? t.type : 'leitura';
const row=document.createElement('div');
row.className='cfg-task-row';
row.id='cfg-task-'+di+'-'+ti;
row.innerHTML=`
<button class="cfg-task-del" onclick="cfgDelTask(${di},${ti})" title="Remover">✕</button>
<input class="sim-input" style="flex:0 0 100px;font-size:.72rem" placeholder="Categoria" value="${escapeHtml(t.cat||'')}" id="cfg-cat-${di}-${ti}">
<input class="sim-input" style="flex:1;font-size:.72rem" placeholder="Descrição da tarefa" value="${escapeHtml(t.desc||'')}" id="cfg-desc-${di}-${ti}">
<button class="cfg-task-type t-${tipo}" onclick="cfgCycleTipo(this,${di},${ti})" id="cfg-tipo-${di}-${ti}" data-tipo="${tipo}">${CFG_TIPO_LABEL[tipo]}</button>
<button class="cfg-task-opt ${isOpcio?'opcio':'obrig'}" onclick="cfgToggleOpcio(this,${di},${ti})" id="cfg-opt-${di}-${ti}">${isOpcio?'Opcional':'Obrig.'}</button>`;
body.appendChild(row);
});
}
function cfgCycleTipo(btn, di, ti){
const atual = btn.dataset.tipo || 'leitura';
const idx = CFG_TIPOS.indexOf(atual);
const proximo = CFG_TIPOS[(idx+1) % CFG_TIPOS.length];
btn.dataset.tipo = proximo;
CFG_TIPOS.forEach(tp => btn.classList.remove('t-'+tp));
btn.classList.add('t-'+proximo);
btn.textContent = CFG_TIPO_LABEL[proximo];
}
function cfgToggleOpcio(btn, di, ti){
btn.classList.toggle('obrig'); btn.classList.toggle('opcio');
btn.textContent=btn.classList.contains('opcio')?'Opcional':'Obrig.';
}
function _cfgGetCicloEditavel(){
return JSON.parse(JSON.stringify(getCicloAtivo()));
}
function cfgAddTask(di){
const ciclo=_cfgGetCicloEditavel();
ciclo[di].tasks.push({id:'c'+(di+1)+'_x'+Date.now(),cat:'',desc:'',type:'leitura',_opcio:false});
const cfg=_cfgLoad()||{}; cfg.ciclo=ciclo; _cfgSave(cfg);
window._CICLO_OVERRIDE=ciclo;
cfgRenderDia(di, ciclo[di].tasks);
}
function cfgDelTask(di, ti){
const ciclo=_cfgGetCicloEditavel();
ciclo[di].tasks.splice(ti,1);
const cfg=_cfgLoad()||{}; cfg.ciclo=ciclo; _cfgSave(cfg);
window._CICLO_OVERRIDE=ciclo;
cfgRenderDia(di, ciclo[di].tasks);
}
function cfgSalvarDatas(){
const ini=document.getElementById('cfg-data-inicio')?.value;
const prov=document.getElementById('cfg-data-prova')?.value;
const concurso=(document.getElementById('cfg-concurso')?.value||'').trim();
const cargo=(document.getElementById('cfg-cargo')?.value||'').trim();
if(!ini||!prov){alert('Preencha ambas as datas.');return;}
if(new Date(prov)<=new Date(ini)){alert('A data da prova precisa ser depois do início.');return;}
const cfg=_cfgLoad()||{};
cfg.inicio=ini; cfg.prova=prov;
if(concurso) cfg.concurso=concurso;
if(cargo) cfg.cargo=cargo;
_cfgSave(cfg);
_cfgAplicarDatas(ini, prov);
_cfgAplicarConcurso(cfg.concurso, cfg.cargo);
_backupToast('✅ Salvo!','var(--green)');
buildCronograma(); updateCountdown(); renderDashboard(); _aplicarObjetivoDia();
}
function _cfgAplicarConcurso(concurso, cargo){
window._CONCURSO_OVERRIDE=concurso||'';
window._CARGO_OVERRIDE=cargo||'';
}
function _cfgAplicarDatas(inicioStr, provaStr){
const [iy,im,id]=inicioStr.split('-').map(Number);
const [py,pm,pd]=provaStr.split('-').map(Number);
const ini=new Date(iy,im-1,id);
const diaSem=ini.getDay();
const dom=new Date(ini);
dom.setDate(ini.getDate()-diaSem);
window._CRON_START_OVERRIDE=dom;
window._CRON_END_OVERRIDE=new Date(py,pm-1,pd);
window._PROVA_OVERRIDE=new Date(py,pm-1,pd,8,0,0);
}
function cfgBuildObjetivos(){
const wrap=document.getElementById('cfg-objetivos-wrap');
if(!wrap) return;
const dias=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const cfg=_cfgLoad()||{};
const objs=cfg.objetivos||{};
wrap.innerHTML='';
dias.forEach((nome,i)=>{
  const val=objs[i]||'';
  const row=document.createElement('div');
  row.style.cssText='display:flex;align-items:center;gap:8px;';
  row.innerHTML=`
    <span style="font-family:'Oswald',sans-serif;font-size:.65rem;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.06em;min-width:58px;flex-shrink:0">${nome}</span>
    <input class="sim-input" id="cfg-obj-${i}" type="text" style="flex:1;font-size:.75rem"
      placeholder="Ex: Foco total em questões hoje!"
      value="${val.replace(/"/g,'&quot;')}">`;
  wrap.appendChild(row);
});
}

function cfgSalvarObjetivos(){
const dias=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const cfg=_cfgLoad()||{};
const objs={};
dias.forEach((_,i)=>{
  const v=(document.getElementById('cfg-obj-'+i)?.value||'').trim();
  if(v) objs[i]=v;
});
cfg.objetivos=objs;
_cfgSave(cfg);
_aplicarObjetivoDia();
_backupToast('✅ Objetivos salvos!','var(--green)');
}

function _aplicarObjetivoDia(){
const cfg=_cfgLoad()||{};
const objs=cfg.objetivos||{};
const diaSemana=new Date().getDay();
const texto=objs[diaSemana]||'Manter o foco e concluir todas as tarefas planejadas.';
['cron-objetivo-text','dash-objetivo-text'].forEach(id=>{
  const el=document.getElementById(id);
  if(el) el.textContent=texto;
});
}

function cfgSalvarCiclo(){
const ciclo=getCicloAtivo();
const novo=ciclo.map((dia,di)=>{
const tasks=[];
dia.tasks.forEach((t,ti)=>{
const cat=(document.getElementById('cfg-cat-'+di+'-'+ti)?.value||'').trim();
const desc=(document.getElementById('cfg-desc-'+di+'-'+ti)?.value||'').trim();
if(!cat&&!desc) return;
const btn=document.getElementById('cfg-opt-'+di+'-'+ti);
const isOpcio=btn&&btn.classList.contains('opcio');
const tipobtn=document.getElementById('cfg-tipo-'+di+'-'+ti);
const tipo=tipobtn?.dataset?.tipo||t.type||'leitura';
tasks.push({
id:t.id||'c'+(di+1)+'_'+ti,
cat:cat||'Tarefa',
desc:desc||'—',
type:tipo,
_opcio:isOpcio,
});
});
return {...dia, tasks};
});
const cfg=_cfgLoad()||{};
cfg.ciclo=novo;
_cfgSave(cfg);
window._CICLO_OVERRIDE=novo;
_backupToast('✅ Ciclo salvo!','var(--green)');
buildCronograma(); renderDashboard();
cronSubAba('lista');
}
(function(){
// Roda imediatamente (pode usar chave legada se concurso ainda não inicializado)
const datas=getDatasAtivas();
if(datas.inicio!=='2026-04-12'||datas.prova!=='2026-07-19'){
_cfgAplicarDatas(datas.inicio, datas.prova);
}
const cfg=_cfgLoad();
if(cfg&&cfg.ciclo) window._CICLO_OVERRIDE=cfg.ciclo;
if(cfg&&(cfg.concurso||cfg.cargo)) _cfgAplicarConcurso(cfg.concurso,cfg.cargo);
})();

// Re-aplica cfg após concInicializar ter definido o concurso ativo
// Garante que a chave per-concurso seja lida corretamente
function _reaplicarCfgConcurso(){
// FASE 9.4.3: Cronograma é global — ciclo e marcações NÃO mudam ao trocar concurso
// Esta função agora aplica apenas datas e nome/cargo do CONCURSO ATIVO (de _CM),
// mas NÃO recarrega o ciclo por concurso (ciclo vem da cfg global)
try{
  // Reler cfg global para garantir ciclo atualizado
  const cfg = _cfgLoad(); // agora sempre lê da chave global
  if(cfg && cfg.ciclo) window._CICLO_OVERRIDE = cfg.ciclo;
  // Datas e nome/cargo: preservar overrides já setados por concCarregarAtivo
  // (não sobrescrever aqui para evitar conflito com dados do meta do concurso)
}catch(e){}
}
const EDITAL = [
{id:'port',name:"Língua Portuguesa",topics:[
{id:'p1',text:"1 Compreensão e interpretação de textos de gêneros variados.",subs:[]},
{id:'p2',text:"2 Reconhecimento de tipos e gêneros textuais.",subs:[]},
{id:'p3',text:"3 Domínio da ortografia oficial.",subs:[]},
{id:'p4',text:"4 Domínio dos mecanismos de coesão textual.",subs:[{id:'p4_1',text:"4.1 Emprego de elementos de referenciação, substituição e repetição, de conectores e de outros elementos de sequenciação textual."},{id:'p4_2',text:"4.2 Emprego de tempos e modos verbais."}]},
{id:'p5',text:"5 Domínio da estrutura morfossintática do período.",subs:[{id:'p5_1',text:"5.1 Emprego das classes de palavras."},{id:'p5_2',text:"5.2 Relações de coordenação entre orações e entre termos da oração."},{id:'p5_3',text:"5.3 Relações de subordinação entre orações e entre termos da oração."},{id:'p5_4',text:"5.4 Emprego dos sinais de pontuação."},{id:'p5_5',text:"5.5 Concordância verbal e nominal."},{id:'p5_6',text:"5.6 Regência verbal e nominal."},{id:'p5_7',text:"5.7 Emprego do sinal indicativo de crase."},{id:'p5_8',text:"5.8 Colocação dos pronomes átonos."}]},
{id:'p6',text:"6 Reescrita de frases e parágrafos do texto.",subs:[{id:'p6_1',text:"6.1 Significação das palavras."},{id:'p6_2',text:"6.2 Substituição de palavras ou de trechos de texto."},{id:'p6_3',text:"6.3 Reorganização da estrutura de orações e de períodos do texto."},{id:'p6_4',text:"6.4 Reescrita de textos de diferentes gêneros e níveis de formalidade."}]}
]},
{id:'ing',name:"Língua Estrangeira (Inglês)",topics:[
{id:'i1',text:"1. Compreensão de textos em língua inglesa.",subs:[]},
{id:'i2',text:"2. Itens gramaticais relevantes para a compreensão dos conteúdos semânticos.",subs:[]}
]},
{id:'info',name:"Noções de Informática",topics:[
{id:'inf1',text:"1 Noções de sistema operacional (ambientes Linux e Windows).",subs:[]},
{id:'inf2',text:"2 Edição de textos, planilhas e apresentações (ambientes Microsoft Office e LibreOffice).",subs:[]},
{id:'inf3',text:"3 Redes de computadores.",subs:[{id:'inf3_1',text:"3.1 Conceitos básicos, ferramentas, aplicativos e procedimentos de Internet e intranet."},{id:'inf3_2',text:"3.2 Programas de navegação (Microsoft Internet Explorer, Mozilla Firefox e Google Chrome)."},{id:'inf3_3',text:"3.3 Programas de correio eletrônico (Outlook Express e Mozilla Thunderbird)."},{id:'inf3_4',text:"3.4 Sítios de busca e pesquisa na Internet."},{id:'inf3_5',text:"3.5 Grupos de discussão."},{id:'inf3_6',text:"3.6 Redes sociais."},{id:'inf3_7',text:"3.7 Computação na nuvem (cloud computing)."}]},
{id:'inf4',text:"4 Noções de organização e de gerenciamento de informações, arquivos, pastas e programas.",subs:[]},
{id:'inf5',text:"5 Segurança da informação.",subs:[{id:'inf5_1',text:"5.1 Procedimentos de segurança."},{id:'inf5_2',text:"5.2 Noções de vírus, worms e pragas virtuais."},{id:'inf5_3',text:"5.3 Aplicativos para segurança (antivírus, firewall, anti-spyware etc.)."},{id:'inf5_4',text:"5.4 Procedimentos de backup."},{id:'inf5_5',text:"5.5 Armazenamento de dados na nuvem (cloud storage)."}]}
]},
{id:'al',name:"Conhecimentos do Estado de Alagoas",topics:[
{id:'al1',text:"1 Formação histórica de Alagoas.",subs:[{id:'al1_1',text:"1.1 Colonização portuguesa."},{id:'al1_2',text:"1.2 Economia açucareira."},{id:'al1_3',text:"1.3 Emancipação política da Capitania de Pernambuco em 1817."},{id:'al1_4',text:"1.4 Elevação à Província em 1821."}]},
{id:'al2',text:"2 Quilombo dos Palmares.",subs:[{id:'al2_1',text:"2.1 Formação no período colonial."},{id:'al2_2',text:"2.2 Resistência à escravidão."},{id:'al2_3',text:"2.3 Liderança de Zumbi dos Palmares."}]},
{id:'al3',text:"3 Aspectos geográficos.",subs:[{id:'al3_1',text:"3.1 Litoral, Zona da Mata, Agreste e Sertão."},{id:'al3_2',text:"3.2 Rio São Francisco."}]},
{id:'al4',text:"4 Organização político-administrativa.",subs:[{id:'al4_1',text:"4.1 Maceió como capital estadual."},{id:'al4_2',text:"4.2 Municípios."},{id:'al4_3',text:"4.3 Poderes Executivo, Legislativo e Judiciário."}]},
{id:'al5',text:"5 Economia estadual.",subs:[{id:'al5_1',text:"5.1 Agroindústria canavieira."},{id:'al5_2',text:"5.2 Turismo."},{id:'al5_3',text:"5.3 Setor de serviços."}]},
{id:'al6',text:"6 Cultura e patrimônio.",subs:[{id:'al6_1',text:"6.1 Manifestações culturais populares."},{id:'al6_2',text:"6.2 Patrimônio histórico-cultural alagoano."}]}
]},
{id:'soc',name:"I — Sociologia",topics:[
{id:'s1',text:"1 A constituição do saber sociológico.",subs:[{id:'s1_1',text:"1.1 A sociologia como ciência."},{id:'s1_2',text:"1.2 Ciência e senso comum."},{id:'s1_3',text:"1.3 Subjetividade e objetividade."},{id:'s1_4',text:"1.4 A sociologia e as ciências sociais."},{id:'s1_5',text:"1.5 A questão metodológica nas ciências sociais e a pesquisa social."}]},
{id:'s2',text:"2 Estrutura e organização social.",subs:[{id:'s2_1',text:"2.1 Estrutura da sociedade."},{id:'s2_2',text:"2.2 Instituições sociais."},{id:'s2_3',text:"2.3 Classes sociais, estratificação e desigualdade: Karl Marx e Max Weber."},{id:'s2_4',text:"2.4 Classe social na sociedade ocidental atual: classes e estilos de vida."}]},
{id:'s3',text:"3 Problemas sociais contemporâneos.",subs:[{id:'s3_1',text:"3.1 Desigualdades sociais."},{id:'s3_2',text:"3.2 Exclusão social."},{id:'s3_3',text:"3.3 Preconceito e discriminação."},{id:'s3_4',text:"3.4 Movimentos sociais tradicionais e novos."},{id:'s3_5',text:"3.5 Gênero e envelhecimento."},{id:'s3_6',text:"3.6 Gênero e violência."},{id:'s3_7',text:"3.7 Cultura e consumo."},{id:'s3_8',text:"3.8 Violência e Estado."},{id:'s3_9',text:"3.9 Migrações."},{id:'s3_10',text:"3.10 Ética e cidadania."},{id:'s3_11',text:"3.11 Sociedade, trabalho e emprego, relações sociais e transformações do trabalho."},{id:'s3_12',text:"3.12 Os meios de comunicação e a questão ideológica."},{id:'s3_13',text:"3.13 O meio ambiente e o desenvolvimento tecnológico."},{id:'s3_14',text:"3.14 A globalização e os Estados nacionais."},{id:'s3_15',text:"3.15 Diversidade cultural e étnicas."},{id:'s3_16',text:"3.16 Religião e sociedade."},{id:'s3_17',text:"3.17 Metodologia de ensino de sociologia."}]}
]},
{id:'fil',name:"II — Filosofia",topics:[
{id:'f1',text:"1 Filosofia da ciência e teoria do conhecimento.",subs:[{id:'f1_1',text:"1.1 Pré-socráticos."},{id:'f1_2',text:"1.2 Sofistas."},{id:'f1_3',text:"1.3 Sócrates, Platão e Aristóteles."},{id:'f1_4',text:"1.4 Patrística (Agostinho)."},{id:'f1_5',text:"1.5 Escolástica (Tomás de Aquino)."},{id:'f1_6',text:"1.6 Racionalismo (Descartes)."},{id:'f1_7',text:"1.7 Empirismo (Bacon e Locke)."},{id:'f1_8',text:"1.8 Criticismo kantiano."},{id:'f1_9',text:"1.9 Idealismo hegeliano."},{id:'f1_10',text:"1.10 Materialismo histórico e dialético."},{id:'f1_11',text:"1.11 Fenomenologia."},{id:'f1_12',text:"1.12 Escola de Frankfurt e Teoria Crítica."},{id:'f1_13',text:"1.13 Popper, Bachelard, Kuhn, Feyerabend."}]},
{id:'f2',text:"2 Ética.",subs:[{id:'f2_1',text:"2.1 Origens da ética."},{id:'f2_2',text:"2.2 Questões de ética contemporânea."},{id:'f2_3',text:"2.3 Éticas deontológicas e éticas utilitaristas."},{id:'f2_4',text:"2.4 Ética, ciência e novas tecnologias."},{id:'f2_5',text:"2.5 Bioética."}]},
{id:'f3',text:"3 Filosofia política.",subs:[{id:'f3_1',text:"3.1 Pensamento político antigo (Platão, Aristóteles)."},{id:'f3_2',text:"3.2 Pensamento político em Maquiavel, Hobbes, Locke, Montesquieu, Rousseau, Kant, Hegel e Marx."},{id:'f3_3',text:"3.3 Pensamento político contemporâneo (Habermas)."}]},
{id:'f4',text:"4 Filosofia da linguagem (Locke, Rousseau, Wittgenstein e a filosofia analítica contemporânea).",subs:[]}
]},
{id:'bio',name:"I — Biologia",topics:[
{id:'bio1',text:"1 Seres vivos: classificação dos seres vivos.",subs:[]},
{id:'bio2',text:"2 Célula.",subs:[{id:'bio2_1',text:"2.1 Célula procariota e eucariota."},{id:'bio2_2',text:"2.2 Componentes morfológicos das células."},{id:'bio2_3',text:"2.3 Funções das estruturas celulares."}]},
{id:'bio3',text:"3 Tecidos animais: características estruturais e funcionais.",subs:[]},
{id:'bio4',text:"4 Morfologia e fisiologia humana.",subs:[{id:'bio4_1',text:"4.1 Morfologia, externa e interna."},{id:'bio4_2',text:"4.2 Fisiologia, nutrição, digestão, respiração, circulação e excreção."},{id:'bio4_3',text:"4.3 Sistemas de proteção, sustentação e locomoção."},{id:'bio4_4',text:"4.4 Sistemas nervoso e endócrino."}]},
{id:'bio5',text:"5 Ecologia.",subs:[{id:'bio5_1',text:"5.1 Relações tróficas entre os seres vivos."},{id:'bio5_2',text:"5.2 Biomas."},{id:'bio5_3',text:"5.3 Ciclos biogeoquímicos."},{id:'bio5_4',text:"5.4 Conservação e preservação da natureza, impacto humano, poluição e biocidas, ecossistemas e espécies ameaçadas de extinção, principalmente no Brasil."}]},
{id:'bio6',text:"6 Evolução dos seres vivos.",subs:[]},
{id:'bio7',text:"7 Reino vegetal.",subs:[{id:'bio7_1',text:"7.1 Funções vitais das plantas."},{id:'bio7_2',text:"7.2 Briófitas, pteridófitas, gimnospermas e angiospermas."}]},
{id:'bio8',text:"8 Reino Animal.",subs:[{id:'bio8_1',text:"8.1 Características gerais, reprodução, nutrição, locomoção e coordenação."},{id:'bio8_2',text:"8.2 Poríferos."},{id:'bio8_3',text:"8.3 Cnidários."},{id:'bio8_4',text:"8.4 Artrópodes."},{id:'bio8_5',text:"8.5 Moluscos."},{id:'bio8_6',text:"8.6 Equinodermos."},{id:'bio8_7',text:"8.7 Nematelmintos."},{id:'bio8_8',text:"8.8 Platelmintos."},{id:'bio8_9',text:"8.9 Anelídeos."},{id:'bio8_10',text:"8.10 Cordados."}]},
{id:'bio9',text:"9 Saúde, higiene e saneamento básico.",subs:[{id:'bio9_1',text:"9.1 Doenças adquiridas e transmissíveis: viroses, AIDS, dengue, poliomielite, tuberculose, sífilis, meningite meningocócica, cólera, tétano."},{id:'bio9_2',text:"9.2 Ciclo de vida, transmissão e profilaxia: raiva, sarampo, leptospirose, amebíase, malária, doença de chagas, verminoses, ascaridíase, teníase, cisticercose, esquistosomose e ancilostomose."},{id:'bio9_3',text:"9.3 As defesas do organismo, imunidade passiva e imunidade ativa."}]}
]},
{id:'fis',name:"II — Física",topics:[
{id:'fis1',text:"1 História e evolução das ideias da física.",subs:[{id:'fis1_1',text:"1.1 Cosmologia antiga."},{id:'fis1_2',text:"1.2 A física de Aristóteles."},{id:'fis1_3',text:"1.3 Origens da mecânica."},{id:'fis1_4',text:"1.4 Surgimento da teoria da relatividade e da teoria quântica."}]},
{id:'fis2',text:"2 Mecânica.",subs:[{id:'fis2_1',text:"2.1 Cinemática escalar, cinemática vetorial."},{id:'fis2_2',text:"2.2 Movimento circular."},{id:'fis2_3',text:"2.3 Leis de Newton e suas aplicações."},{id:'fis2_4',text:"2.4 Trabalho."},{id:'fis2_5',text:"2.5 Potência."},{id:'fis2_6',text:"2.6 Energia, conservação e suas transformações, impulso."},{id:'fis2_7',text:"2.7 Quantidade de movimento e conservação da quantidade de movimento."},{id:'fis2_8',text:"2.8 Gravitação universal."},{id:'fis2_9',text:"2.9 Estática dos corpos rígidos."},{id:'fis2_10',text:"2.10 Estática dos fluidos."},{id:'fis2_11',text:"2.11 Princípios de Pascal, Arquimedes e Stevin."}]},
{id:'fis3',text:"3 Termodinâmica.",subs:[{id:'fis3_1',text:"3.1 Calor e temperatura."},{id:'fis3_2',text:"3.2 Temperatura e dilatação térmica."},{id:'fis3_3',text:"3.3 Calor específico."},{id:'fis3_4',text:"3.4 Trocas de calor."},{id:'fis3_5',text:"3.5 Mudança de fase e diagramas de fases."},{id:'fis3_6',text:"3.6 Propagação do calor."},{id:'fis3_7',text:"3.7 Teoria cinética dos gases."},{id:'fis3_8',text:"3.8 Energia interna."},{id:'fis3_9',text:"3.9 Lei de Joule."},{id:'fis3_10',text:"3.10 Transformações gasosas."},{id:'fis3_11',text:"3.11 Leis da termodinâmica (entropia e entalpia)."},{id:'fis3_12',text:"3.12 Máquinas térmicas."},{id:'fis3_13',text:"3.13 Ciclo de Carnot."}]},
{id:'fis4',text:"4 Eletromagnetismo.",subs:[{id:'fis4_1',text:"4.1 Introdução à eletricidade."},{id:'fis4_2',text:"4.2 Campo elétrico."},{id:'fis4_3',text:"4.3 Lei de Gauss."},{id:'fis4_4',text:"4.4 Potencial elétrico."},{id:'fis4_5',text:"4.5 Corrente elétrica."},{id:'fis4_6',text:"4.6 Potência elétrica e resistores."},{id:'fis4_7',text:"4.7 Circuitos elétricos."},{id:'fis4_8',text:"4.8 Campo magnético."},{id:'fis4_9',text:"4.9 Lei de Ampère."},{id:'fis4_10',text:"4.10 Lei de Faraday."},{id:'fis4_11',text:"4.11 Propriedades elétricas e magnéticas dos materiais."},{id:'fis4_12',text:"4.12 Equações de Maxwell."},{id:'fis4_13',text:"4.13 Radiação."}]},
{id:'fis5',text:"5 Ondulatória.",subs:[{id:'fis5_1',text:"5.1 Movimento harmônico simples."},{id:'fis5_2',text:"5.2 Oscilações livres, amortecidas e forçadas."},{id:'fis5_3',text:"5.3 Ondas."},{id:'fis5_4',text:"5.4 Ondas sonoras e eletromagnéticas."},{id:'fis5_5',text:"5.5 Frequências naturais e ressonância."},{id:'fis5_6',text:"5.6 Óptica geométrica (reflexão e refração da luz)."},{id:'fis5_7',text:"5.7 Instrumentos ópticos (características e aplicações)."},{id:'fis5_8',text:"5.8 Óptica física: 5.8.1 Interferência. 5.8.2 Difração. 5.8.3 Polarização."}]},
{id:'fis6',text:"6 Física moderna.",subs:[{id:'fis6_1',text:"6.1 Introdução à relatividade especial."},{id:'fis6_2',text:"6.2 Transformação de Lorentz."},{id:'fis6_3',text:"6.3 Equivalência massa-energia."},{id:'fis6_4',text:"6.4 Natureza ondulatória-corpuscular da matéria."},{id:'fis6_5',text:"6.5 Teoria quântica da matéria e da radiação."},{id:'fis6_6',text:"6.6 Modelo do átomo de hidrogênio."},{id:'fis6_7',text:"6.7 Núcleo atômico."},{id:'fis6_8',text:"6.8 Energia nuclear."}]}
]},
{id:'qui',name:"III — Química",topics:[
{id:'qui1',text:"1 O mundo e suas transformações: história e importância da química.",subs:[]},
{id:'qui2',text:"2 Teoria Atômico-Molecular.",subs:[{id:'qui2_1',text:"2.1 Modelos atômicos (Dalton, Thomson, Rutherford e Bohr) e evolução dos conceitos de átomo."},{id:'qui2_2',text:"2.2 Os trabalhos de Faraday."},{id:'qui2_3',text:"2.3 Leis ponderais (Lavoisier, Proust, Dalton e Richter-Wenzel-Berzelius)."},{id:'qui2_4',text:"2.4 Leis volumétricas de Gay-Lussac."},{id:'qui2_5',text:"2.5 Lei de Avogadro."},{id:'qui2_6',text:"2.6 Conceitos decorrentes da Teoria Atômico-Molecular: unidade de massa atômica (u), quantidade de matéria, massa molar, volume molar."},{id:'qui2_7',text:"2.7 Fórmulas químicas."},{id:'qui2_8',text:"2.8 Cálculos estequiométricos."}]},
{id:'qui3',text:"3 Classificação periódica dos elementos químicos.",subs:[{id:'qui3_1',text:"3.1 Tabela Periódica: histórico e evolução."},{id:'qui3_2',text:"3.2 Classificação dos elementos em metais, não metais, semimetais e gases nobres."},{id:'qui3_3',text:"3.3 Configuração eletrônica dos elementos ao longo da Tabela Periódica."},{id:'qui3_4',text:"3.4 Propriedades periódicas e aperiódicas."}]},
{id:'qui4',text:"4 Radioatividade.",subs:[{id:'qui4_1',text:"4.1 Natureza das emissões radioativas."},{id:'qui4_2',text:"4.2 Leis da radioatividade."},{id:'qui4_3',text:"4.3 Cinética da desintegração radioativa."},{id:'qui4_4',text:"4.4 Fenômenos de fissão nuclear e fusão nuclear."},{id:'qui4_5',text:"4.5 Riscos e aplicações das reações nucleares."}]},
{id:'qui5',text:"5 Interações químicas.",subs:[{id:'qui5_1',text:"5.1 Ligações iônica, covalente e metálica."},{id:'qui5_2',text:"5.2 Forças intermoleculares."},{id:'qui5_3',text:"5.3 Geometria molecular: eletronegatividade e polaridade das ligações e das moléculas, Teoria da Repulsão dos Pares Eletrônicos, Teoria da Ligação de Valência e Sobreposição de Orbitais, orbitais híbridos e moleculares."},{id:'qui5_4',text:"5.4 Relação entre estrutura e propriedade das substâncias químicas."}]},
{id:'qui6',text:"6 Matéria e mudança de estado.",subs:[{id:'qui6_1',text:"6.1 Sólidos, líquidos, gases e outros estados da matéria (ideais e reais)."},{id:'qui6_2',text:"6.2 Características e propriedades de gases, líquidos e sólidos."},{id:'qui6_3',text:"6.3 Ligações químicas nos sólidos, líquidos e gases."},{id:'qui6_4',text:"6.4 Métodos de separação de misturas."}]},
{id:'qui7',text:"7 Funções químicas inorgânicas.",subs:[{id:'qui7_1',text:"7.1 Ácidos, bases, sais e óxidos: conceito, propriedades e nomenclatura."},{id:'qui7_2',text:"7.2 Hidretos, carbetos e nitretos: conceito, propriedades e nomenclatura."},{id:'qui7_3',text:"7.3 Principais reações envolvendo compostos inorgânicos."},{id:'qui7_4',text:"7.4 Balanceamento de equações."}]},
{id:'qui8',text:"8 Misturas e soluções.",subs:[{id:'qui8_1',text:"8.1 Relações de proporcionalidade entre solutos e solvente: concentração em quantidade de matéria, concentração em massa, fração em quantidade de matéria, fração em massa, fração em volume."},{id:'qui8_2',text:"8.2 Grandezas-padrão e unidades-padrão (SI) e sua relação com outras grandezas e unidades."},{id:'qui8_3',text:"8.3 Solubilidade."},{id:'qui8_4',text:"8.4 Propriedades coligativas."}]},
{id:'qui9',text:"9 Gases.",subs:[{id:'qui9_1',text:"9.1 Teoria cinética."},{id:'qui9_2',text:"9.2 Leis dos gases."},{id:'qui9_3',text:"9.3 Densidade dos gases."},{id:'qui9_4',text:"9.4 Difusão e efusão dos gases."},{id:'qui9_5',text:"9.5 Misturas gasosas."}]},
{id:'qui10',text:"10 Termoquímica.",subs:[{id:'qui10_1',text:"10.1 Energia e calor."},{id:'qui10_2',text:"10.2 Reações exotérmicas e endotérmicas."},{id:'qui10_3',text:"10.3 Entalpia, entropia e energia livre."},{id:'qui10_4',text:"10.4 Espontaneidade de uma reação."},{id:'qui10_5',text:"10.5 Entalpias de formação e de combustão das substâncias."},{id:'qui10_6',text:"10.6 Calor de reação em pressão constante e em volume constante."},{id:'qui10_7',text:"10.7 Lei de Hess."}]},
{id:'qui11',text:"11 Cinética química.",subs:[{id:'qui11_1',text:"11.1 Velocidades e mecanismos de reação."},{id:'qui11_2',text:"11.2 Equação de velocidade, teoria das colisões e complexo ativado."},{id:'qui11_3',text:"11.3 Influência da energia, da concentração, da pressão e dos catalisadores na velocidade das reações químicas."}]},
{id:'qui12',text:"12 Equilíbrio químico.",subs:[{id:'qui12_1',text:"12.1 Equilíbrio iônico em soluções aquosas, constante de equilíbrio."},{id:'qui12_2',text:"12.2 Equilíbrio ácido-base, hidrólise de sais, solução tampão, conceitos de Ka, Kb, Kh, pH, pOH e graus de dissociação e de hidrólise."},{id:'qui12_3',text:"12.3 Equilíbrio de precipitação, conceito de Kps."},{id:'qui12_4',text:"12.4 Deslocamento do equilíbrio."},{id:'qui12_5',text:"12.5 Lei da Diluição de Ostwald."},{id:'qui12_6',text:"12.6 Efeito do íon comum."},{id:'qui12_7',text:"12.7 Lei da Ação das Massas."}]},
{id:'qui13',text:"13 Eletroquímica.",subs:[{id:'qui13_1',text:"13.1 Potenciais de oxidação e redução."},{id:'qui13_2',text:"13.2 Espontaneidade de uma reação de oxirredução."},{id:'qui13_3',text:"13.3 Pilhas e acumuladores."},{id:'qui13_4',text:"13.4 Eletrólise."}]},
{id:'qui14',text:"14 Química orgânica.",subs:[{id:'qui14_1',text:"14.1 Propriedades fundamentais do átomo de carbono, hibridação, estados de oxidação de carbono, ligações sigma e pi, geometria molecular, classificação do átomo de carbono na cadeia carbônica, notação e nomenclatura dos principais radicais orgânicos."},{id:'qui14_2',text:"14.2 Notação, nomenclatura e propriedades físicas e químicas de hidrocarbonetos, haletos orgânicos, álcoois, fenóis, éteres, cetonas, aldeídos, ácidos carboxílicos, ésteres, anidridos, haletos de ácido, aminas, amidas, nitrilas, isonitrilas e nitrocompostos."},{id:'qui14_3',text:"14.3 Reatividade dos compostos orgânicos, reações de redução, oxidação, combustão, adição e substituição."},{id:'qui14_4',text:"14.4 Glicídeos, lipídeos, aminoácidos, proteínas, ácidos nucleicos."},{id:'qui14_5',text:"14.5 Tecnologias associadas à química orgânica: petroquímica, polímeros sintéticos, aditivos em alimentos, agroquímica, drogas, medicamentos e biotecnologia."}]}
]},
{id:'mat',name:"Matemática",topics:[
{id:'m1',text:"1 Aritmética: operações com números racionais.",subs:[]},
{id:'m2',text:"2 Álgebra.",subs:[{id:'m2_1',text:"2.1 Equações do 1º e do 2º graus."},{id:'m2_2',text:"2.2 Fatoração."},{id:'m2_3',text:"2.3 Produtos notáveis."}]},
{id:'m3',text:"3 Geometria.",subs:[{id:'m3_1',text:"3.1 Triângulos e quadriláteros."},{id:'m3_2',text:"3.2 Semelhança e congruência de triângulos."},{id:'m3_3',text:"3.3 Relações métricas no triângulo retângulo."},{id:'m3_4',text:"3.4 Relações trigonométricas."},{id:'m3_5',text:"3.5 Áreas das principais figuras planas."},{id:'m3_6',text:"3.6 Áreas e volume do cubo e do paralelepípedo."},{id:'m3_7',text:"3.7 Razão e proporção."},{id:'m3_8',text:"3.8 Regra de três simples e composta."},{id:'m3_9',text:"3.9 Porcentagem e juros simples e compostos."}]},
{id:'m4',text:"4 Conjuntos.",subs:[{id:'m4_1',text:"4.1 Representação de conjuntos."},{id:'m4_2',text:"4.2 Conjuntos unitários, vazio e universo."},{id:'m4_3',text:"4.3 Igualdade, subconjuntos, operações."},{id:'m4_4',text:"4.4 Conjuntos numéricos, intervalos e operações."}]},
{id:'m5',text:"5 Funções.",subs:[{id:'m5_1',text:"5.1 Par ordenado e produto cartesiano."},{id:'m5_2',text:"5.2 Noção de relação."},{id:'m5_3',text:"5.3 Noção de função."},{id:'m5_4',text:"5.4 Domínio de uma função real de variável real."},{id:'m5_5',text:"5.5 Gráfico de uma função."},{id:'m5_6',text:"5.6 Análise de gráficos."},{id:'m5_7',text:"5.7 Função bijetora, função inversa e função composta."}]},
{id:'m6',text:"6 Funções de 1º grau.",subs:[{id:'m6_1',text:"6.1 Função constante."},{id:'m6_2',text:"6.2 Estudo do sinal de uma função de 1º grau."},{id:'m6_3',text:"6.3 Inequações de 1º grau."}]},
{id:'m7',text:"7 Funções de 2º grau.",subs:[{id:'m7_1',text:"7.1 Aspectos introdutórios."},{id:'m7_2',text:"7.2 Gráfico de uma função do 2º grau."},{id:'m7_3',text:"7.3 Vértice de uma parábola."},{id:'m7_4',text:"7.4 Raízes de uma função de 2º grau."},{id:'m7_5',text:"7.5 Estudo do sinal de uma função de 2º grau."},{id:'m7_6',text:"7.6 Inequações de 2º grau."}]},
{id:'m8',text:"8 Funções exponenciais.",subs:[{id:'m8_1',text:"8.1 Conceito de função exponencial."},{id:'m8_2',text:"8.2 Gráfico de funções exponenciais."},{id:'m8_3',text:"8.3 Equações exponenciais."},{id:'m8_4',text:"8.4 Inequações exponenciais."}]},
{id:'m9',text:"9 Logaritmos.",subs:[{id:'m9_1',text:"9.1 Definição de logaritmo."},{id:'m9_2',text:"9.2 Propriedades dos logaritmos."},{id:'m9_3',text:"9.3 Mudança de base."},{id:'m9_4',text:"9.4 Sistemas de logaritmos."},{id:'m9_5',text:"9.5 Funções logarítmicas."},{id:'m9_6',text:"9.6 Inequações logarítmicas."}]},
{id:'m10',text:"10 Funções Trigonométricas.",subs:[{id:'m10_1',text:"10.1 Redução de arcos do 1º quadrante."},{id:'m10_2',text:"10.2 Operações com arcos."}]},
{id:'m11',text:"11 Progressões aritméticas e geométricas: conceito; classificação; fórmula do termo geral; representação genérica; soma dos n primeiros termos; soma dos infinitos termos de uma progressão geométrica.",subs:[]},
{id:'m12',text:"12 Matrizes.",subs:[{id:'m12_1',text:"12.1 Aspectos introdutórios."},{id:'m12_2',text:"12.2 Representação."},{id:'m12_3',text:"12.3 Matrizes especiais."},{id:'m12_4',text:"12.4 Matriz transposta."},{id:'m12_5',text:"12.5 Igualdade de matrizes."},{id:'m12_6',text:"12.6 Operações com matrizes."}]},
{id:'m13',text:"13 Determinantes.",subs:[{id:'m13_1',text:"13.1 Conceito."},{id:'m13_2',text:"13.2 Ordem do determinante."},{id:'m13_3',text:"13.3 Propriedades."},{id:'m13_4',text:"13.4 Discussão do sistema linear."},{id:'m13_5',text:"13.5 Sistema linear homogêneo."},{id:'m13_6',text:"13.6 Regras para cálculo do determinante."}]},
{id:'m14',text:"14 Sistemas lineares.",subs:[{id:'m14_1',text:"14.1 Introdução."},{id:'m14_2',text:"14.2 Equação linear."},{id:'m14_3',text:"14.3 Solução de um sistema linear."},{id:'m14_4',text:"14.4 Classificação de um sistema linear."},{id:'m14_5',text:"14.5 Discussão das soluções de um sistema linear."}]},
{id:'m15',text:"15 Geometria espacial.",subs:[{id:'m15_1',text:"15.1 Prisma."},{id:'m15_2',text:"15.2 Pirâmide."},{id:'m15_3',text:"15.3 Cilindro."},{id:'m15_4',text:"15.4 Cone."},{id:'m15_5',text:"15.5 Esfera."}]},
{id:'m16',text:"16 Geometria analítica.",subs:[{id:'m16_1',text:"16.1 Estudo do ponto."},{id:'m16_2',text:"16.2 Estudo da reta."},{id:'m16_3',text:"16.3 Estudo da circunferência."}]},
{id:'m17',text:"17 Números complexos.",subs:[{id:'m17_1',text:"17.1 Representação."},{id:'m17_2',text:"17.2 Operações na forma algébrica e trigonométrica."}]},
{id:'m18',text:"18 Análise combinatória.",subs:[{id:'m18_1',text:"18.1 Fatorial."},{id:'m18_2',text:"18.2 Permutação."},{id:'m18_3',text:"18.3 Combinação."},{id:'m18_4',text:"18.4 Arranjo."}]},
{id:'m19',text:"19 Binômio de Newton.",subs:[{id:'m19_1',text:"19.1 Número binomial."},{id:'m19_2',text:"19.2 Teorema de Newton para desenvolvimento do binômio (x + a)n."},{id:'m19_3',text:"19.3 Generalização."},{id:'m19_4',text:"19.4 Somatório."},{id:'m19_5',text:"19.5 Termo geral do binômio de Newton."}]},
{id:'m20',text:"20 Polinômios.",subs:[{id:'m20_1',text:"20.1 Conceito."},{id:'m20_2',text:"20.2 Identidade de polinômios."},{id:'m20_3',text:"20.3 Operações com polinômios."},{id:'m20_4',text:"20.4 Propriedades fundamentais da divisão de polinômios."},{id:'m20_5',text:"20.5 Raiz ou zero de um polinômio."},{id:'m20_6',text:"20.6 Fração polinomial e frações polinomiais idênticas."}]}
]},
{id:'dpenal',name:"Noções de Direito Penal",topics:[
{id:'dp1',text:"1 Parte geral do Código Penal Brasileiro (Título I ao III).",subs:[]},
{id:'dp2',text:"2 Crimes.",subs:[{id:'dp2_1',text:"2.1 Crimes contra a pessoa."},{id:'dp2_2',text:"2.2 Crimes contra o patrimônio."},{id:'dp2_3',text:"2.3 Crimes contra a administração pública."}]}
]},
{id:'dh',name:"Noções de Direitos Humanos",topics:[
{id:'dh1',text:"1 Conceito.",subs:[]},
{id:'dh2',text:"2 Evolução.",subs:[]},
{id:'dh3',text:"3 Abrangência.",subs:[]},
{id:'dh4',text:"4 Sistema de proteção.",subs:[]},
{id:'dh5',text:"5 Convenção Americana sobre Direitos Humanos (Pacto de São José e Decreto nº 678/1992).",subs:[]}
]},
{id:'dpp',name:"Noções de Processo Penal",topics:[
{id:'dpp1',text:"1 Inquérito policial.",subs:[]},
{id:'dpp2',text:"2 Ação penal.",subs:[]}
]},
{id:'dpm',name:"Direito Penal Militar",topics:[
{id:'dpm1',text:"1 Aplicação da lei penal militar.",subs:[]},
{id:'dpm2',text:"2 Crime.",subs:[]},
{id:'dpm3',text:"3 Imputabilidade penal.",subs:[]},
{id:'dpm4',text:"4 Concurso de agentes.",subs:[]},
{id:'dpm5',text:"5 Penas.",subs:[]},
{id:'dpm6',text:"6 Aplicação da pena.",subs:[]},
{id:'dpm7',text:"7 Suspensão condicional da pena.",subs:[]},
{id:'dpm8',text:"8 Livramento condicional.",subs:[]},
{id:'dpm9',text:"9 Penas acessórias.",subs:[]},
{id:'dpm10',text:"10 Efeitos da condenação.",subs:[]},
{id:'dpm11',text:"11 Medidas de segurança.",subs:[]},
{id:'dpm12',text:"12 Ação penal.",subs:[]},
{id:'dpm13',text:"13 Extinção da punibilidade.",subs:[]},
{id:'dpm14',text:"14 Crimes militares em tempo de paz.",subs:[]},
{id:'dpm15',text:"15 Crimes própria e impropriamente militares.",subs:[]},
{id:'dpm16',text:"16 Princípios constitucionais penais com reflexos na lei penal militar.",subs:[]}
]},
{id:'dppm',name:"Direito Processual Penal Militar",topics:[
{id:'dppm1',text:"1 Processo penal militar e sua aplicação.",subs:[]},
{id:'dppm2',text:"2 Polícia judiciária militar.",subs:[]},
{id:'dppm3',text:"3 Inquérito policial militar.",subs:[]},
{id:'dppm4',text:"4 Ação penal militar e seu exercício.",subs:[]},
{id:'dppm5',text:"5 Processo.",subs:[]},
{id:'dppm6',text:"6 Juiz, auxiliares e partes do processo.",subs:[]},
{id:'dppm7',text:"7 Denúncia.",subs:[]},
{id:'dppm8',text:"8 Questões prejudiciais.",subs:[]},
{id:'dppm9',text:"9 Exceções.",subs:[]},
{id:'dppm10',text:"10 Incidente de sanidade mental do acusado.",subs:[]},
{id:'dppm11',text:"11 Incidente de falsidade de documento.",subs:[]},
{id:'dppm12',text:"12 Medidas preventivas e assecuratórias.",subs:[]},
{id:'dppm13',text:"13 Providências que recaem sobre coisas.",subs:[]},
{id:'dppm14',text:"14 Providências que recaem sobre pessoas.",subs:[{id:'dppm14_1',text:"14.1 Prisão em flagrante."},{id:'dppm14_2',text:"14.2 Prisão preventiva."},{id:'dppm14_3',text:"14.3 Liberdade provisória."}]},
{id:'dppm15',text:"15 Citação, intimação e notificação.",subs:[]},
{id:'dppm16',text:"16 Atos probatórios.",subs:[{id:'dppm16_1',text:"16.1 Interrogatório."},{id:'dppm16_2',text:"16.2 Confissão."},{id:'dppm16_3',text:"16.3 Perícias e exames."},{id:'dppm16_4',text:"16.4 Testemunhas."},{id:'dppm16_5',text:"16.5 Acareação."},{id:'dppm16_6',text:"16.6 Reconhecimento de pessoa e coisa."},{id:'dppm16_7',text:"16.7 Documentos."},{id:'dppm16_8',text:"16.8 Indícios."}]},
{id:'dppm17',text:"17 Processos em espécie.",subs:[{id:'dppm17_1',text:"17.1 Processo ordinário."},{id:'dppm17_2',text:"17.2 Processos especiais."},{id:'dppm17_3',text:"17.3 Deserção de oficial e de praça."},{id:'dppm17_4',text:"17.4 Insubmissão."}]},
{id:'dppm18',text:"18 Nulidades.",subs:[]},
{id:'dppm19',text:"19 Recursos.",subs:[{id:'dppm19_1',text:"19.1 Regras gerais."},{id:'dppm19_2',text:"19.2 Recurso em sentido estrito."},{id:'dppm19_3',text:"19.3 Correição parcial."},{id:'dppm19_4',text:"19.4 Apelação."},{id:'dppm19_5',text:"19.5 Embargos."},{id:'dppm19_6',text:"19.6 Revisão."},{id:'dppm19_7',text:"19.7 Recurso extraordinário."},{id:'dppm19_8',text:"19.8 Reclamação."}]},
{id:'dppm20',text:"20 Execução.",subs:[{id:'dppm20_1',text:"20.1 Incidentes."},{id:'dppm20_2',text:"20.2 Suspensão condicional da pena."},{id:'dppm20_3',text:"20.3 Livramento condicional."},{id:'dppm20_4',text:"20.4 Indulto, comutação da pena, anistia e reabilitação."},{id:'dppm20_5',text:"20.5 Execução das medidas de segurança."}]},
{id:'dppm21',text:"21 Princípios constitucionais processuais com reflexos na lei processual penal militar.",subs:[]}
]},
{id:'dcf',name:"Noções de Direito Constitucional",topics:[
{id:'dcf1',text:"1 Constituição: conceito, conteúdo, estrutura e classificação. Supremacia da Constituição. Poder Constituinte. Interpretação e Aplicabilidade das Normas Constitucionais.",subs:[]},
{id:'dcf2',text:"2 Direitos e Garantias Fundamentais. Direitos e Deveres Individuais Difusos e Coletivos. Direitos Sociais.",subs:[]},
{id:'dcf3',text:"3 Organização do Estado Brasileiro; divisão espacial do poder; Estado Federal; União; Estados Federados; Distrito Federal; Municípios; intervenção federal; repartição de competências.",subs:[]},
{id:'dcf4',text:"4 Poder Legislativo. Organização. Funcionamento. Atribuições. Processo Legislativo.",subs:[]},
{id:'dcf5',text:"5 Poder Executivo. Presidente, Vice-Presidente da República e Ministros de Estado.",subs:[]},
{id:'dcf6',text:"6 Poder Judiciário. Garantias. Jurisdição. Organização. Órgãos e Competência.",subs:[]},
{id:'dcf7',text:"7 Funções essenciais à Justiça.",subs:[]},
{id:'dcf8',text:"8 Ministério Público. Natureza. Função. Autonomia. Atribuições.",subs:[]},
{id:'dcf9',text:"9 Ação Direta de Inconstitucionalidade. Ação Direta de Constitucionalidade.",subs:[]},
{id:'dcf10',text:"10 Ordem Econômica e Financeira. Atividade Econômica do Estado.",subs:[]},
{id:'dcf11',text:"11 Princípios constitucionais da seguridade social.",subs:[]},
{id:'dcf12',text:"12 Constituição do Estado de Alagoas.",subs:[]}
]},
{id:'dadm',name:"Noções de Direito Administrativo",topics:[
{id:'da1',text:"1 Princípios.",subs:[]},
{id:'da2',text:"2 Administração Pública na Constituição Federal de 1988.",subs:[]},
{id:'da3',text:"3 Regime jurídico Administrativo.",subs:[]},
{id:'da4',text:"4 Poderes da Administração Pública.",subs:[]},
{id:'da5',text:"5 Serviço Público.",subs:[]},
{id:'da6',text:"6 Poder de Polícia.",subs:[]},
{id:'da7',text:"7 Atos Administrativos.",subs:[]},
{id:'da8',text:"8 Contratos Administrativos.",subs:[]},
{id:'da9',text:"9 Licitação.",subs:[]},
{id:'da10',text:"10 Servidores públicos.",subs:[]},
{id:'da11',text:"11 Bens públicos.",subs:[]},
{id:'da12',text:"12 Administração direta e indireta.",subs:[]},
{id:'da13',text:"13 Controle da Administração Pública.",subs:[]},
{id:'da14',text:"14 Responsabilidade do Estado.",subs:[]}
]},
{id:'leginst',name:"Legislação Institucional",topics:[
{id:'lp1',text:"1 Lei Estadual nº 5.346/1992 (Estatuto dos Policiais Militares do Estado de Alagoas).",subs:[]},
{id:'lp2',text:"2 Decreto Estadual nº 37.042/1996 (Regulamento Disciplinar da PMAL).",subs:[]},
{id:'lp3',text:"3 Decreto-Lei nº 2.848/1940 e suas alterações (Parte geral do Código Penal): Títulos de I a III.",subs:[]}
]},
{id:'legat',name:"Legislação Extravagante",topics:[
{id:'la3',text:"1 Lei nº 7.716/1989 (crimes resultantes de preconceitos de raça ou de cor).",subs:[]},
{id:'la4',text:"2 Lei nº 8.072/1990 e Lei nº 8.930/1994 (crimes hediondos).",subs:[]},
{id:'la5',text:"3 Lei nº 12.850/2013 (crime organizado).",subs:[]},
{id:'la6',text:"4 Lei nº 9.455/1997 (crimes de tortura).",subs:[]},
{id:'la7',text:"5 Lei nº 9.605/1998 (crimes contra o meio ambiente).",subs:[]},
{id:'la8',text:"6 Lei nº 10.826/2003 (Estatuto do Desarmamento).",subs:[]},
{id:'la9',text:"7 Lei nº 11.343/2006 (Lei de Drogas).",subs:[]},
{id:'la10',text:"8 Lei nº 11.340/2006 (Lei Maria da Penha).",subs:[]},
{id:'la11',text:"9 Lei nº 9.503/1997 (Código de Trânsito Brasileiro).",subs:[]},
{id:'la12',text:"10 Lei nº 8.069/1990 (Estatuto da Criança e do Adolescente).",subs:[]},
{id:'la13',text:"11 Lei nº 13.869/2019 (abuso de autoridade).",subs:[]},
{id:'la14',text:"12 Lei nº 7.960/1989 (prisão temporária).",subs:[]},
{id:'la15',text:"13 Lei nº 9.099/1995 (juizados especiais).",subs:[]},
{id:'la16',text:"14 Lei nº 10.259/2001 (juizados especiais federais).",subs:[]}
]},
]; // fim EDITAL PMAL 2026
function getAllTopicIds(){
const ids=[];
getEditalAtivo().forEach(disc=>{
disc.topics.forEach(t=>{
ids.push(t.id);
t.subs.forEach(s=>ids.push(s.id));
});
});
return ids;
}
function countProgresso(){
const allIds=getAllTopicIds();
const total=allIds.length;
let estudados=0;
allIds.forEach(id=>{if(ST.progresso[id+'_e']) estudados++;});
return {total,estudados,completos:estudados};
}

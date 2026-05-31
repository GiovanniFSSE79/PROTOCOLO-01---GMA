/* ════════════════════════════════════════════════════════════════════
 * estatisticas-banco.js
 * ────────────────────────────────────────────────────────────────────
 * Estatísticas de questões (updateQ, calcTotais...), banco de questões,
 * flashcards, simulados, importação/exportação JSON/TXT.
 *
 * IMPORTANTE: Este arquivo é parte do PROTOCOLO 01 (Estratégia B — Fase 1).
 * Todas as funções declaradas aqui são GLOBAIS (window.<nome>) por design.
 * NÃO converter para ESModules / IIFE / import-export sem refatoração ampla.
 * NÃO renomear funções (handlers inline no HTML dependem dos nomes atuais).
 * ════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════
 * FASE 9.4.4 — Progresso de Questões por Concurso
 * Helpers de leitura/escrita + migração de dados legados.
 * ST.banco continua GLOBAL. ST.bancoProgressoPorConcurso é SHARED.
 * ════════════════════════════════════════════════════════════════════ */

/* ── Identificadores estáveis ──────────────────────────────────────── */
function bqGetConcursoAtivoId(){
  return (typeof _concGetAtivo === 'function') ? _concGetAtivo() : null;
}

function bqGetQuestaoId(q){
  if(!q) return null;
  return q.id || q.codigo || q._id || null;
}

/* ── Garantir objeto de progresso para um concurso ─────────────────── */
function bqEnsureProgressoConcurso(concursoId){
  if(!ST.bancoProgressoPorConcurso) ST.bancoProgressoPorConcurso = {};
  if(!concursoId) return;
  if(!ST.bancoProgressoPorConcurso[concursoId]){
    ST.bancoProgressoPorConcurso[concursoId] = {};
  }
}

/* ── Progresso padrão vazio ─────────────────────────────────────────── */
function bqProgressoDefault(){
  return {
    historico:           [],
    errouAlgumVez:       false,
    acertosConsecutivos: 0,
    massificada:         false,
    resolvida:           false,
    correta:             false,
    ultimaResposta:      null,
    ultimaData:          null,
    tentativas:          0,
    acertos:             0,
    erros:               0
  };
}

/* ── Obter progresso — com fallback para dados legados em q ─────────── */
// Flag removida — bqGetProgresso usa arquitetura global, sem sync por concurso
function bqGetProgresso(qOrId, concursoId){
  // AUDITORIA FINAL: arquitetura 100% global — lê campos diretos de q em ST.banco
  // bancoProgressoPorConcurso não é mais fonte. Ignorar cid completamente.
  if(!qOrId) return bqProgressoDefault();
  if(typeof qOrId === 'string'){
    // Chamado com ID string: buscar q em ST.banco
    var _qFound = (typeof ST !== 'undefined' && ST && ST.banco)
      ? ST.banco.find(function(b){ return b.id === qOrId; })
      : null;
    if(!_qFound) return bqProgressoDefault();
    qOrId = _qFound;
  }
  var q = qOrId;
  var base = bqProgressoDefault();
  if(Array.isArray(q.historico) && q.historico.length) base.historico = q.historico.slice();
  if(q.errouAlgumVez)            base.errouAlgumVez       = !!q.errouAlgumVez;
  if(q.acertosConsecutivos)      base.acertosConsecutivos  = q.acertosConsecutivos || 0;
  if(q.massificada)              base.massificada          = !!q.massificada;
  if(q.resolvida)                base.resolvida            = !!q.resolvida;
  if(q.correta !== undefined)    base.correta              = q.correta;
  if(q.ultimaResposta)           base.ultimaResposta       = q.ultimaResposta;
  if(q.ultimaData)               base.ultimaData           = q.ultimaData;
  if(q.tentativas)               base.tentativas           = q.tentativas || 0;
  if(q.acertos)                  base.acertos              = q.acertos    || 0;
  if(q.erros)                    base.erros               = q.erros      || 0;
  return base;
}

/* ── Helper de progresso global (FASE ESTABILIZAÇÃO) ────────────────
 * Lê diretamente de q.historico, q.errouAlgumVez etc. (campos globais).
 * bancoProgressoPorConcurso não é mais fonte principal.
 * ─────────────────────────────────────────────────────────────────── */
function bqGetResumoProgressoQuestao(q, cid) {
  // FASE ESTABILIZAÇÃO: ignorar cid, ler campos globais da questão
  return bqGetProgresso(q);
}


/* ── Gravar progresso global (FASE ESTABILIZAÇÃO) ───────────────────── */
function bqSetProgresso(qOrId, patch, concursoId){
  // FASE ESTABILIZAÇÃO: aplica patch nos campos globais da questão em ST.banco
  if(!qOrId || typeof qOrId === 'string') return;
  var q = qOrId;
  if(patch.historico      !== undefined) q.historico           = patch.historico;
  if(patch.errouAlgumVez  !== undefined) q.errouAlgumVez       = patch.errouAlgumVez;
  if(patch.acertosConsecutivos !== undefined) q.acertosConsecutivos = patch.acertosConsecutivos;
  if(patch.massificada    !== undefined) q.massificada         = patch.massificada;
  if(patch.resolvida      !== undefined) q.resolvida           = patch.resolvida;
  if(patch.correta        !== undefined) q.correta             = patch.correta;
  if(patch.ultimaResposta !== undefined) q.ultimaResposta      = patch.ultimaResposta;
  if(patch.ultimaData     !== undefined) q.ultimaData          = patch.ultimaData;
  if(patch.tentativas     !== undefined) q.tentativas          = patch.tentativas;
  if(patch.acertos        !== undefined) q.acertos             = patch.acertos;
  if(patch.erros          !== undefined) q.erros               = patch.erros;
}

/* ── Merge (alias de bqSetProgresso) ───────────────────────────────── */
function bqMergeProgresso(qOrId, patch, concursoId){
  bqSetProgresso(qOrId, patch, concursoId);
}

/* ── Histórico global ───────────────────────────────────────────────── */
function bqGetHistorico(qOrId, concursoId){
  // FASE ESTABILIZAÇÃO: retorna q.historico global
  if(!qOrId || typeof qOrId === 'string') return [];
  return qOrId.historico || [];
}

function bqAddHistorico(qOrId, entrada, concursoId){
  if(!qOrId || typeof qOrId === 'string') return;
  var q = qOrId;
  q.historico = (q.historico || []).concat([entrada]);
}

/* ── errouAlgumVez global ───────────────────────────────────────────── */
function bqQuestaoErrouAlgumVez(qOrId, concursoId){
  if(!qOrId || typeof qOrId === 'string') return false;
  return !!qOrId.errouAlgumVez;
}

/* ── Sessões por concurso ───────────────────────────────────────────── */
function bqGetSessoesConcurso(concursoId){
  // AUDITORIA FINAL: retorna ST.bancoSessoes global
  return Array.isArray(ST.bancoSessoes) ? ST.bancoSessoes : [];
}

function bqAddSessaoConcurso(sessao, concursoId){
  // AUDITORIA FINAL: sempre grava em ST.bancoSessoes global
  if(!Array.isArray(ST.bancoSessoes)) ST.bancoSessoes = [];
  ST.bancoSessoes.push(sessao);
}

// Helper de compatibilidade — retorna sessões do concurso ativo (com fallback legado)
// FASE 9.4.8: distingue "zerado explicitamente" (Array.isArray → [])
//             de "nunca inicializado" (null/undefined → usa fallback legado)
function bqGetBancoSessoesAtivas(){
  // FASE ESTABILIZAÇÃO: retorna ST.bancoSessoes global
  return (typeof ST !== 'undefined' && ST && ST.bancoSessoes) ? ST.bancoSessoes : [];
}

/* ── Migração de dados legados → concurso ativo atual ──────────────── */
function bqMigrarProgressoLegadoParaConcursoAtual(){
  // HOTFIX 9.4.17.5: migração por concurso, não global.
  // Usa flag por cid para migrar cada concurso apenas uma vez.
  // Isso permite que dados legados (q.historico global) sejam importados para
  // bancoProgressoPorConcurso[cid] do concurso ativo no momento da migração,
  // SEM vazar para outros concursos durante a renderização.
  var cid = bqGetConcursoAtivoId();
  if(!cid) return;

  // Flag por concurso: 'bancoProgressoMigradoV2_<cid>'
  var flagKey = 'bancoProgressoMigradoV2_' + cid;
  if(ST[flagKey]) return; // já migrado para este concurso

  bqEnsureProgressoConcurso(cid);
  var dest = ST.bancoProgressoPorConcurso[cid];
  var migrou = 0;

  (ST.banco || []).forEach(function(q){
    var qid = bqGetQuestaoId(q);
    if(!qid) return;
    // Se já tem dados reais no slot por concurso, não sobrescrever
    if(dest[qid]){
      var s = dest[qid];
      var temDados = (Array.isArray(s.historico) && s.historico.length > 0) ||
                     (s.tentativas && s.tentativas > 0) ||
                     s.errouAlgumVez;
      if(temDados) return;
    }

    // Verificar se q tem dados legados relevantes para migrar
    var temLegado = (Array.isArray(q.historico) && q.historico.length > 0)
                 || q.errouAlgumVez
                 || (q.acertosConsecutivos > 0)
                 || q.massificada;
    if(!temLegado) return;

    // Migrar dados legados para slot do concurso ativo
    var base = (typeof bqProgressoDefault === 'function') ? bqProgressoDefault() : {historico:[],tentativas:0,acertos:0,erros:0,errouAlgumVez:false,massificada:false,resolvida:false,correta:false};
    if(Array.isArray(q.historico) && q.historico.length) {
      base.historico = q.historico.slice();
      base.tentativas = q.historico.length;
      base.acertos    = q.historico.filter(function(h){ return h.acertou; }).length;
      base.erros      = q.historico.filter(function(h){ return !h.acertou; }).length;
    }
    if(q.errouAlgumVez)       base.errouAlgumVez       = !!q.errouAlgumVez;
    if(q.acertosConsecutivos) base.acertosConsecutivos  = q.acertosConsecutivos || 0;
    if(q.massificada)         base.massificada          = !!q.massificada;
    if(q.resolvida)           base.resolvida            = !!q.resolvida;
    if(q.correta)             base.correta              = !!q.correta;
    if(q.ultimaResposta)      base.ultimaResposta       = q.ultimaResposta;
    if(q.ultimaData)          base.ultimaData           = q.ultimaData;
    if(q.tentativas && !base.tentativas)  base.tentativas = q.tentativas || 0;
    if(q.acertos    && !base.acertos)     base.acertos    = q.acertos    || 0;
    if(q.erros      && !base.erros)       base.erros      = q.erros      || 0;

    dest[qid] = base;
    migrou++;
  });

  // Migrar sessões legadas → concurso ativo (somente se não houver sessões ainda)
  var sessAtual = ST.bancoSessoesPorConcurso && ST.bancoSessoesPorConcurso[cid];
  if((!sessAtual || !sessAtual.length) && ST.bancoSessoes && ST.bancoSessoes.length){
    if(!ST.bancoSessoesPorConcurso) ST.bancoSessoesPorConcurso = {};
    ST.bancoSessoesPorConcurso[cid] = ST.bancoSessoes.slice();
  }

  ST[flagKey] = true;
  // Manter flag legado por compatibilidade
  ST.bancoProgressoMigradoV1 = true;
  try{ saveState(); }catch(e){}
}

// AUDITORIA FINAL: migração legada desativada — arquitetura global não precisa de migração.
// bqMigrarProgressoLegadoParaConcursoAtual foi desativada pois bancoProgressoPorConcurso
// não é mais fonte de progresso. Questões leem q.* diretamente.


function buildQuestoes(_force){
if(!_force&&!document.getElementById('tab-questoes')?.classList.contains('active')) return;
const mats=window.QUESTOES_MATERIAS||[];
const sel=document.getElementById('qstat-mat-sel');
if(sel){
const prev=sel.value;
sel.innerHTML='<option value="">Selecionar matéria...</option>';
mats.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;sel.appendChild(o);});
if(prev) sel.value=prev;
}
const list=document.getElementById('questoes-list');
list.innerHTML='';
const bancoFiltrado=qStatGetBancoFiltrado();
let totalGeral=0, acertosGeral=0;
const matsParaMostrar=qStatMatId==='todas'?mats:mats.filter(m=>m.id===qStatMatId);
matsParaMostrar.forEach(mat=>{
const topicsData=mat.topics.map(topic=>{
const key=getQKey(mat.id, topic.id);
const acum=ST.questoes[key]||{total:0,acertos:0};
const qsBanco=bancoFiltrado.filter(q=>q.mat===mat.id&&(
!q.assunto||_assuntoMatch(q.assunto,topic.name)
));
let pTotalBanco=0,pAcertosBanco=0;
qsBanco.forEach(q=>{
const ents=qStatGetEntradas(q);
pTotalBanco+=ents.length;
pAcertosBanco+=ents.filter(e=>e.acertou).length;
});
const logPeriodo=qStatGetLogPeriodo(key);
const total=Math.max(pTotalBanco,logPeriodo.total);
const acertos=Math.max(pAcertosBanco,logPeriodo.acertos);
return {topicName:topic.name, topicId:topic.id, key, total, acertos, erros:total-acertos};
});
const matTotal=topicsData.reduce((a,t)=>a+t.total,0);
const matAcertos=topicsData.reduce((a,t)=>a+t.acertos,0);
const matRate=matTotal>0?Math.round(matAcertos/matTotal*100):0;
const matRateClass=matRate>=70?'high':matRate>=50?'mid':'low';
totalGeral+=matTotal; acertosGeral+=matAcertos;
const group=document.createElement('div');
group.className='q-mat-group';
group.innerHTML=`
<div class="q-mat-header" onclick="toggleQMat('${mat.id}')">
<div class="q-mat-name">${mat.name}</div>
<div class="q-mat-stats">
<div style="font-size:.6rem;color:var(--dim)">${matTotal}q · ${matAcertos}✓ · ${matTotal-matAcertos}✗</div>
<div class="q-disc-rate ${matRateClass}">${matTotal>0?matRate+'%':'—'}</div>
</div>
<svg class="q-mat-chev" viewBox="0 0 24 24"><polyline points="6,9 12,15 18,9"/></svg>
</div>
<div class="q-mat-body" id="qmb-${mat.id}"></div>`;
const body=group.querySelector('.q-mat-body');
topicsData.forEach(({topicName,topicId,key,total,acertos,erros})=>{
const rate=total>0?Math.round(acertos/total*100):0;
const rateClass=rate>=70?'high':rate>=50?'mid':'low';
const bc=rate>=70?'green':rate>=50?'yellow':'red';
const acum=ST.questoes[key]||{total:0,acertos:0};
const tEl=document.createElement('div');
tEl.className='q-topic-item';
tEl.innerHTML=`
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem;flex-wrap:wrap;gap:4px">
<div class="q-topic-name" style="flex:1">${topicName}</div>
<div style="display:flex;align-items:center;gap:8px">
${total>0?`<span style="font-size:.62rem;color:var(--muted)">${acertos}✓ ${erros}✗</span>`:''}
<div class="q-disc-rate ${rateClass}" style="min-width:36px;font-size:.8rem">${total>0?rate+'%':'—'}</div>
</div>
</div>
<div class="q-prog-track">
<div class="q-prog-fill prog-fill ${bc}" style="width:${rate}%"></div>
</div>
<div class="q-total" style="margin-top:.25rem">${total} questões · ${acertos} acertos · ${erros} erros
${qStatPeriodo!=='tudo'&&acum.total>0?`<span style="color:var(--dim)"> · (acumulado: ${acum.total} total, ${acum.acertos} acertos)</span>`:''}
</div>
${qStatPeriodo==='tudo'?`
<div class="q-topic-inputs" style="margin-top:.4rem">
<input class="q-input" type="number" min="0" placeholder="Feitas" value="${acum.total||''}"
oninput="updateQ('${key}','total',this.value,'${mat.id}')">
<span class="q-sep">✕</span>
<input class="q-input" type="number" min="0" placeholder="Erros" value="${acum.total>0?(acum.total-(acum.acertos||0)):''}"
oninput="updateQ('${key}','erros',this.value||'0','${mat.id}')">
</div>`:''}`;
body.appendChild(tEl);
});
list.appendChild(group);
if(qStatMatId!=='todas') body.classList.add('open');
});
let rateF, totalF, acertosF, errosF;
if(qStatPeriodo==='tudo'&&qStatMatId==='todas'){
const central=calcTotaisQuestoes();
totalF=central.totQ; acertosF=central.totA; errosF=central.erros; rateF=central.taxa;
} else {
totalF=totalGeral; acertosF=acertosGeral; errosF=totalGeral-acertosGeral;
rateF=totalGeral>0?Math.round(acertosGeral/totalGeral*100):0;
}
const tg=document.getElementById('q-total-geral');if(tg) tg.textContent=totalF;
const ag=document.getElementById('q-acerto-geral');if(ag) ag.textContent=totalF>0?rateF+'%':'—';
const eg=document.getElementById('q-erros-geral');if(eg) eg.textContent=errosF;
const bar=document.getElementById('q-bar-geral');if(bar) bar.style.width=rateF+'%';
const bl=document.getElementById('q-bar-label');if(bl) bl.textContent=rateF+'%';
}
function toggleQMat(id){
const body=document.getElementById('qmb-'+id);
const wrap=body.parentElement;
const chev=wrap.querySelector('.q-mat-chev');
body.classList.toggle('open');
chev.classList.toggle('open');
}
function updateQ(key, field, val, matId){
if(!ST.questoes[key]) ST.questoes[key]={total:0,acertos:0};
const n=parseInt(val)||0;
// UX: usuário digita ERROS, mas internamente o schema continua {total, acertos}.
// Regra de UX definida pelo usuário:
//   - Campo "Erros" vazio = 0 erros (acertos = total). NUNCA assume erros = total.
//   - Ao alterar "Feitas" sem ter informado "Erros" nesse momento, o sistema
//     interpreta como erros = 0 (acertos = total). Usuário ajusta depois se errou.
//   - Ao alterar "Erros", apenas recalcula acertos a partir do total atual.
if(field==='erros'){
  const tot=ST.questoes[key].total||0;
  const erros=Math.min(Math.max(n,0),tot); // erros não pode exceder total
  ST.questoes[key].acertos=tot-erros;
} else if(field==='total'){
  // Default: ao mudar o total, considera erros = 0 (acertos = total).
  // O usuário pode então informar quantos errou no campo ao lado.
  ST.questoes[key].total=n;
  ST.questoes[key].acertos=n; // acertos = total (erros = 0)
} else {
  ST.questoes[key][field]=n;
  if(ST.questoes[key].acertos>ST.questoes[key].total)
  ST.questoes[key].acertos=ST.questoes[key].total;
}
const hoje=new Date().toLocaleDateString('pt-BR');
if(!ST.questoesLog) ST.questoesLog={};
if(!ST.questoesLog[key]) ST.questoesLog[key]=[];
const existente=ST.questoesLog[key].find(e=>e.data===hoje);
if(existente){
existente.total=ST.questoes[key].total;
existente.acertos=ST.questoes[key].acertos;
} else {
ST.questoesLog[key].push({data:hoje, total:ST.questoes[key].total, acertos:ST.questoes[key].acertos});
}
saveState();
const topicItem=document.querySelector(`input[oninput*="'${key}'"]`)?.closest('.q-topic-item');
if(topicItem){
const q=ST.questoes[key];
const rate=q.total>0?Math.round(q.acertos/q.total*100):0;
const rateClass=rate>=70?'high':rate>=50?'mid':'low';
const bc=rate>=70?'green':rate>=50?'yellow':'red';
const rateEl=topicItem.querySelector('.q-disc-rate');
if(rateEl){rateEl.className=`q-disc-rate ${rateClass}`;rateEl.style.minWidth='36px';rateEl.style.fontSize='.8rem';rateEl.textContent=q.total>0?rate+'%':'—';}
const fill=topicItem.querySelector('.q-prog-fill');
if(fill){fill.className=`q-prog-fill prog-fill ${bc}`;fill.style.width=rate+'%';}
const tot=topicItem.querySelector('.q-total');
if(tot) tot.textContent=`${q.total} questões · ${q.acertos} acertos · ${q.total-q.acertos} erros`;
// IMPORTANTE: NÃO sincronizar o input "Erros" automaticamente quando o usuário
// altera o input "Feitas". Os dois inputs devem ser independentes. O usuário
// pode digitar Feitas=10 e só depois digitar Erros=2. Auto-sincronizar levaria
// a "Erros = total - 0 = total" enquanto digita, marcando 100% de erro.
}
const mat=(window.QUESTOES_MATERIAS||[]).find(m=>m.id===matId);
if(mat){
let matTotal=0,matAcertos=0;
mat.topics.forEach(topic=>{
const q=ST.questoes[getQKey(mat.id, topic.id)]||{total:0,acertos:0};
matTotal+=q.total; matAcertos+=q.acertos;
});
const matRate=matTotal>0?Math.round(matAcertos/matTotal*100):0;
const matRateClass=matRate>=70?'high':matRate>=50?'mid':'low';
const header=document.querySelector(`#qmb-${matId}`)?.previousElementSibling;
if(header){
const statsDiv=header.querySelector('.q-mat-stats');
if(statsDiv) statsDiv.innerHTML=`
<div style="font-size:.6rem;color:var(--dim)">${matTotal}q</div>
<div class="q-disc-rate ${matRateClass}">${matTotal>0?matRate+'%':'—'}</div>`;
}
}
renderQuestoes();
renderDashboard();
}
function calcTotaisQuestoes(){
let totQ=0, totA=0;
(window.QUESTOES_MATERIAS||[]).forEach(mat=>{
mat.topics.forEach(topic=>{
const q=ST.questoes[getQKey(mat.id, topic.id)]||{total:0,acertos:0};
totQ+=q.total; totA+=q.acertos;
});
});
return {totQ, totA, erros:totQ-totA, taxa:totQ>0?Math.round(totA/totQ*100):0};
}
function renderQuestoes(_force){
if(!_force&&!document.getElementById('tab-questoes')?.classList.contains('active')) return;
const {totQ,totA,erros,taxa}=calcTotaisQuestoes();
const tg=document.getElementById('q-total-geral');if(tg) tg.textContent=totQ;
const ag=document.getElementById('q-acerto-geral');if(ag) ag.textContent=totQ>0?taxa+'%':'—';
const eg=document.getElementById('q-erros-geral');if(eg) eg.textContent=erros;
const bar=document.getElementById('q-bar-geral');if(bar) bar.style.width=taxa+'%';
const bl=document.getElementById('q-bar-label');if(bl) bl.textContent=taxa+'%';
const dqtEl=document.getElementById('dash-q-total');if(dqtEl) dqtEl.textContent=totQ;
const daEl=document.getElementById('dash-acerto');if(daEl) daEl.textContent=totQ>0?taxa+'%':'—';
const dqeEl=document.getElementById('dash-q-erros');if(dqeEl) dqeEl.textContent=erros;
const dqbEl=document.getElementById('dash-q-bar');if(dqbEl) dqbEl.style.width=taxa+'%';
const dqblEl=document.getElementById('dash-q-bar-label');if(dqblEl) dqblEl.textContent=taxa+'%';
}
const LEIS_LEITURA = [
/* ── LEGISLAÇÃO INSTITUCIONAL ── */
{id:'leg_estat_pmal', name:'Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)',
arts:Array.from({length:135},(_,i)=>i+1)},
{id:'leg_rdpm', name:'Dec. Est. nº 37.042/1996 — Regulamento Disciplinar da PMAL (Arts. 1 a 107)',
arts:Array.from({length:107},(_,i)=>i+1)},
{id:'leg_org_pm', name:'Lei Federal nº 14.751/2023 — Lei Orgânica da Polícia Militar (Arts. 1 a 44)',
arts:Array.from({length:44},(_,i)=>i+1)},
/* ── CÓDIGO PENAL — Parte Geral ── */
{id:'cp_t1', name:'CP — Título I: Aplicação da Lei Penal (Arts. 1º a 12)',
arts:Array.from({length:12},(_,i)=>i+1)},
{id:'cp_t2', name:'CP — Título II: Do Crime (Arts. 13 a 25)',
arts:Array.from({length:13},(_,i)=>i+13)},
{id:'cp_t3', name:'CP — Título III: Imputabilidade Penal (Arts. 26 a 28)',
arts:Array.from({length:3},(_,i)=>i+26)},
/* ── LEGISLAÇÃO EXTRAVAGANTE ── */
{id:'lei_racismo', name:'Lei nº 7.716/1989 — Crimes de Preconceito de Raça ou Cor (Arts. 1 a 20)',
arts:Array.from({length:20},(_,i)=>i+1)},
{id:'lei_hed', name:'Lei nº 8.072/1990 — Crimes Hediondos (Arts. 1 a 12)',
arts:Array.from({length:12},(_,i)=>i+1)},
{id:'lei_org_crim', name:'Lei nº 12.850/2013 — Organizações Criminosas (Arts. 1 a 27)',
arts:Array.from({length:27},(_,i)=>i+1)},
{id:'lei_tortura', name:'Lei nº 9.455/1997 — Crimes de Tortura (Arts. 1 a 6)',
arts:Array.from({length:6},(_,i)=>i+1)},
{id:'lei_meio_amb', name:'Lei nº 9.605/1998 — Crimes contra o Meio Ambiente (Arts. 1 a 82)',
arts:Array.from({length:82},(_,i)=>i+1)},
{id:'lei_desarmamento', name:'Lei nº 10.826/2003 — Estatuto do Desarmamento (Arts. 1 a 37)',
arts:Array.from({length:37},(_,i)=>i+1)},
{id:'lei_drogas', name:'Lei nº 11.343/2006 — Lei de Drogas (Arts. 1 a 75)',
arts:Array.from({length:75},(_,i)=>i+1)},
{id:'lei_maria_penha', name:'Lei nº 11.340/2006 — Lei Maria da Penha (Arts. 1 a 46)',
arts:Array.from({length:46},(_,i)=>i+1)},
{id:'lei_ctb', name:'Lei nº 9.503/1997 — CTB — Crimes de Trânsito (Arts. 291 a 312)',
arts:Array.from({length:22},(_,i)=>i+291)},
{id:'lei_eca', name:'Lei nº 8.069/1990 — ECA — Crimes (Arts. 225 a 244-B)',
arts:Array.from({length:20},(_,i)=>i+225)},
{id:'lei_abuso_aut', name:'Lei nº 13.869/2019 — Abuso de Autoridade (Arts. 1 a 43)',
arts:Array.from({length:43},(_,i)=>i+1)},
{id:'lei_pris_temp', name:'Lei nº 7.960/1989 — Prisão Temporária (Arts. 1 a 7)',
arts:Array.from({length:7},(_,i)=>i+1)},
{id:'lei_jec', name:'Lei nº 9.099/1995 — Juizados Especiais (Arts. 1 a 97)',
arts:Array.from({length:97},(_,i)=>i+1)},
{id:'lei_jecf', name:'Lei nº 10.259/2001 — Juizados Especiais Federais (Arts. 1 a 27)',
arts:Array.from({length:27},(_,i)=>i+1)},
/* ── DIREITO PENAL MILITAR ── */
{id:'cpm_ap', name:'CPM — Título I: Aplicação da Lei Penal Militar (Arts. 1º a 28)',
arts:Array.from({length:28},(_,i)=>i+1)},
{id:'cpm_crime', name:'CPM — Título II: Do Crime (Arts. 29 a 47)',
arts:Array.from({length:19},(_,i)=>i+29)},
{id:'cpm_imput', name:'CPM — Título III: Imputabilidade Penal (Arts. 48 a 52)',
arts:Array.from({length:5},(_,i)=>i+48)},
{id:'cpm_concurso', name:'CPM — Concurso de Agentes (Arts. 53 a 54)',
arts:[53,54]},
{id:'cpm_penas', name:'CPM — Penas: Principais, Acessórias e Aplicação (Arts. 55 a 109)',
arts:Array.from({length:55},(_,i)=>i+55)},
{id:'cpm_condenacao', name:'CPM — Efeitos da Condenação e Medidas de Segurança (Arts. 110 a 120)',
arts:Array.from({length:11},(_,i)=>i+110)},
{id:'cpm_acao', name:'CPM — Ação Penal (Arts. 121 a 122)',
arts:[121,122]},
{id:'cpm_extincao', name:'CPM — Extinção da Punibilidade (Arts. 123 a 135)',
arts:Array.from({length:13},(_,i)=>i+123)},
{id:'cpm_crimes_paz', name:'CPM — Crimes Militares em Tempo de Paz (Arts. 136 a 299)',
arts:Array.from({length:164},(_,i)=>i+136)},
/* ── DIREITO PROCESSUAL PENAL MILITAR ── */
{id:'cppm_01', name:'CPPM — Processo Penal Militar e Aplicação (Arts. 1º a 6º)',
arts:Array.from({length:6},(_,i)=>i+1)},
{id:'cppm_02', name:'CPPM — Polícia Judiciária Militar (Arts. 7º a 8º)',
arts:[7,8]},
{id:'cppm_03', name:'CPPM — Inquérito Policial Militar (Arts. 9º a 28)',
arts:Array.from({length:20},(_,i)=>i+9)},
{id:'cppm_04', name:'CPPM — Ação Penal Militar (Arts. 29 a 37)',
arts:Array.from({length:9},(_,i)=>i+29)},
{id:'cppm_14_pess', name:'CPPM — Providências sobre Pessoas: Flagrante, Preventiva, Liberdade Provisória (Arts. 171 a 273)',
arts:Array.from({length:103},(_,i)=>i+171)},
{id:'cppm_men', name:'CPPM — Menagem (Arts. 263 a 269)',
arts:Array.from({length:7},(_,i)=>i+263)},
{id:'cppm_espec', name:'CPPM — Processos Especiais: Deserção e Insubmissão (Arts. 451 a 498)',
arts:Array.from({length:48},(_,i)=>i+451)},
{id:'cppm_conselho', name:'CPPM — Composição do Conselho Permanente e Especial de Justiça (Arts. 16 a 28)',
arts:Array.from({length:13},(_,i)=>i+16)},
/* ── DIREITOS HUMANOS ── */
{id:'cadh', name:'Convenção Americana sobre Direitos Humanos — Pacto de São José da Costa Rica (Arts. 1º a 82)',
arts:Array.from({length:82},(_,i)=>i+1)},
/* ── DIREITO CONSTITUCIONAL ── */
{id:'cf_t2', name:'CF/88 — Título II: Direitos e Garantias Fundamentais (Arts. 5º a 17)',
arts:Array.from({length:13},(_,i)=>i+5)},
{id:'cf_t5', name:'CF/88 — Título V: Defesa do Estado e das Instituições Democráticas (Arts. 136 a 144)',
arts:Array.from({length:9},(_,i)=>i+136)},
];
function getLeitKey(lawId, art){
return 'leit_'+lawId+'_'+art;
}
function buildLeitura(_force){
if(!_force&&!document.getElementById('tab-leitura')?.classList.contains('active')) return;
const container=document.getElementById('leitura-list');
container.innerHTML='';
LEIS_LEITURA.forEach(lei=>{
const total=lei.arts.length;
const lidos=lei.arts.filter(a=>ST.leitura[getLeitKey(lei.id,a)]).length;
const pct=total>0?Math.round(lidos/total*100):0;
const barColor=pct>=70?'#4ade80':pct>=40?'#60a5fa':'#f5c800';
const group=document.createElement('div');
group.className='leit-law-group';
group.id='leit-group-'+lei.id;
group.innerHTML=`
<div class="leit-prog-bar" style="height:3px;background:rgba(255,255,255,.07)">
<div class="leit-prog-fill" style="width:${pct}%;background:${barColor}"></div>
</div>
<div class="leit-law-header" onclick="toggleLeitGroup('${lei.id}')">
<div class="leit-law-name">${lei.name}</div>
<div style="display:flex;align-items:center;gap:8px">
<div style="font-size:.6rem;color:var(--dim)">${lidos}/${total}</div>
<div class="leit-law-pct">${pct}%</div>
</div>
<svg class="leit-law-chev" viewBox="0 0 24 24"><polyline points="6,9 12,15 18,9"/></svg>
</div>
<div class="leit-law-body" id="leitb-${lei.id}">
<div class="leit-art-grid" id="leitgrid-${lei.id}"></div>
</div>`;
container.appendChild(group);
const grid=group.querySelector('.leit-art-grid');
lei.arts.forEach(art=>{
const key=getLeitKey(lei.id,art);
const lido=!!ST.leitura[key];
const btn=document.createElement('div');
btn.className='leit-art-btn'+(lido?' lido':'');
btn.textContent='Art. '+art;
btn.id='leit-btn-'+lei.id+'_'+art;
btn.onclick=()=>toggleArt(lei.id,art);
grid.appendChild(btn);
});
});
}
function toggleLeitGroup(id){
const body=document.getElementById('leitb-'+id);
const group=document.getElementById('leit-group-'+id);
const chev=group.querySelector('.leit-law-chev');
body.classList.toggle('open');
chev.classList.toggle('open');
}
function toggleArt(lawId, art){
const lei=LEIS_LEITURA.find(l=>l.id===lawId);
if(!lei) return;
const artIdx=lei.arts.indexOf(art);
const currentlyLido=!!ST.leitura[getLeitKey(lawId,art)];
if(!currentlyLido){
for(let i=0;i<=artIdx;i++){
ST.leitura[getLeitKey(lawId,lei.arts[i])]=true;
const btn=document.getElementById('leit-btn-'+lawId+'_'+lei.arts[i]);
if(btn) btn.classList.add('lido');
}
} else {
for(let i=artIdx;i<lei.arts.length;i++){
ST.leitura[getLeitKey(lawId,lei.arts[i])]=false;
const btn=document.getElementById('leit-btn-'+lawId+'_'+lei.arts[i]);
if(btn) btn.classList.remove('lido');
}
}
saveState();
_registrarSessaoArtigo(lawId, art, !currentlyLido, lei.name||lawId);
const total=lei.arts.length;
const lidos=lei.arts.filter(a=>ST.leitura[getLeitKey(lawId,a)]).length;
const pct=total>0?Math.round(lidos/total*100):0;
const barColor=pct>=70?'#4ade80':pct>=40?'#60a5fa':'#f5c800';
const group=document.getElementById('leit-group-'+lawId);
if(group){
const fill=group.querySelector('.leit-prog-fill');
if(fill){fill.style.width=pct+'%';fill.style.background=barColor;}
const pctEl=group.querySelector('.leit-law-pct');
if(pctEl) pctEl.textContent=pct+'%';
const subEl=group.querySelector('[style*="color:var(--dim)"]');
if(subEl) subEl.textContent=lidos+'/'+total;
}
renderLeituraGeral();
renderDashboard();
}
function renderLeituraGeral(_force){
if(!_force&&!document.getElementById('tab-leitura')?.classList.contains('active')) return;
let total=0,lidos=0;
LEIS_LEITURA.forEach(lei=>{
lei.arts.forEach(a=>{
total++;
if(ST.leitura[getLeitKey(lei.id,a)]) lidos++;
});
});
const pct=total>0?Math.round(lidos/total*100):0;
const bar=document.getElementById('leit-geral-bar');if(bar) bar.style.width=pct+'%';
const frac=document.getElementById('leit-geral-frac');if(frac) frac.textContent=lidos+'/'+total+' ('+pct+'%)';
}
function resetLeitura(){
if(!confirm('Limpar toda a leitura registrada?')) return;
ST.leitura={};saveState();buildLeitura();renderLeituraGeral();renderDashboard();
}
function leitSubAba(sub){
['lista','config'].forEach(s=>{
const p=document.getElementById('leit-painel-'+s); if(p) p.style.display='none';
const b=document.getElementById('leit-sub-'+s); if(b) b.classList.remove('active');
});
const p=document.getElementById('leit-painel-'+sub); if(p) p.style.display='block';
const b=document.getElementById('leit-sub-'+sub); if(b) b.classList.add('active');
if(sub==='lista'){buildLeitura();renderLeituraGeral();}
if(sub==='config') cfgLeisBuild();
}
const LEIS_CFG_KEY = 'pmal26_leis_cfg';
function _leisCfgKey(){
  const id=typeof _concGetAtivo==='function'?_concGetAtivo():null;
  return id ? LEIS_CFG_KEY+'_'+id : LEIS_CFG_KEY;
}
function _leisCfgLoad(){
  try{
    const v=localStorage.getItem(_leisCfgKey());
    if(v) return JSON.parse(v);
    if(!localStorage.getItem('protocolo_concurso_ativo')) return JSON.parse(localStorage.getItem(LEIS_CFG_KEY)||'null');
    return null;
  }catch(e){return null;}
}
function _leisCfgSave(obj){
try{localStorage.setItem(_leisCfgKey(),JSON.stringify(obj));}catch(e){}
}
function getLeisAtivas(){
// Usa _CM como fonte de verdade quando disponível
if(typeof _CM !== 'undefined' && _CM.leis && _CM.leis.length) return _CM.leis;
const cfg=_leisCfgLoad();
return cfg && cfg.leis ? cfg.leis : LEIS_LEITURA;
}
(function(){
const cfg=_leisCfgLoad();
if(cfg&&cfg.leis){
LEIS_LEITURA.length=0;
cfg.leis.forEach(l=>LEIS_LEITURA.push(l));
}
})();
function _artsRange(ini,fim){
ini=parseInt(ini)||1; fim=parseInt(fim)||ini;
if(fim<ini) fim=ini;
return Array.from({length:fim-ini+1},(_,i)=>i+ini);
}
function cfgLeisBuild(){
const wrap=document.getElementById('cfg-leis-wrap'); if(!wrap) return;
wrap.innerHTML='';
const leis=getLeisAtivas();
leis.forEach((lei,li)=>{
wrap.appendChild(_cfgLeisCard(lei,li,leis.length));
});
}
function _cfgLeisCard(lei,li,total){
const ini=lei.arts&&lei.arts.length?lei.arts[0]:1;
const fim=lei.arts&&lei.arts.length?lei.arts[lei.arts.length-1]:1;
const isFirst=li===0;
const isLast=li===(total-1);
const card=document.createElement('div');
card.className='cfg-dia-card';
card.id='cfg-lei-'+li;
const btnUp=`<button onclick="cfgLeisSubir(${li})" title="Mover para cima"
style="background:none;border:1px solid var(--border2);border-radius:5px;color:${isFirst?'var(--dim)':'var(--gold)'};cursor:${isFirst?'default':'pointer'};font-size:.75rem;padding:1px 7px;line-height:1.4;transition:all .15s"
${isFirst?'disabled':''}>▲</button>`;
const btnDown=`<button onclick="cfgLeisDescer(${li})" title="Mover para baixo"
style="background:none;border:1px solid var(--border2);border-radius:5px;color:${isLast?'var(--dim)':'var(--gold)'};cursor:${isLast?'default':'pointer'};font-size:.75rem;padding:1px 7px;line-height:1.4;transition:all .15s"
${isLast?'disabled':''}>▼</button>`;
const posInput=`<input type="number" min="1" max="${total}" value="${li+1}" id="cfg-lei-pos-${li}"
title="Definir posição (pressione Enter)"
onkeydown="if(event.key==='Enter') cfgLeisMoverPara(${li}, this.value)"
style="width:42px;background:var(--surface2);border:1px solid var(--border2);border-radius:5px;color:var(--text);font-family:'Oswald',sans-serif;font-size:.7rem;font-weight:700;padding:1px 5px;text-align:center;outline:none;">`;
card.innerHTML=`
<div class="cfg-dia-header" style="display:flex;align-items:center;gap:6px">
<span class="cfg-dia-label" style="flex:1">Lei ${li+1}</span>
<div style="display:flex;align-items:center;gap:4px">
${btnUp}
${posInput}
${btnDown}
</div>
<button onclick="cfgLeisDelLei(${li})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.9rem;padding:0 4px;margin-left:4px" title="Remover lei">✕</button>
</div>
<div class="cfg-dia-body">
<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.25rem">Nome / identificação da lei</div>
<input class="sim-input" style="width:100%;margin-bottom:.65rem;font-size:.72rem" placeholder="Ex: CF/88 — Título I: Princípios Fundamentais (Arts. 1º a 4º)" id="cfg-lei-name-${li}" value="${escapeHtml(lei.name||'')}">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
<div>
<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.25rem">Art. inicial</div>
<input class="sim-input" type="number" min="1" style="width:100%;font-size:.78rem" id="cfg-lei-ini-${li}" value="${ini}">
</div>
<div>
<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.25rem">Art. final</div>
<input class="sim-input" type="number" min="1" style="width:100%;font-size:.78rem" id="cfg-lei-fim-${li}" value="${fim}">
</div>
</div>
<div class="cfg-lei-count-${li}" style="font-size:.62rem;color:var(--dim);margin-top:.4rem">${lei.arts?lei.arts.length:0} artigo(s)</div>
</div>`;
setTimeout(()=>{
['cfg-lei-ini-'+li,'cfg-lei-fim-'+li].forEach(id=>{
const el=document.getElementById(id);
if(el) el.addEventListener('input',()=>{
const iniV=parseInt(document.getElementById('cfg-lei-ini-'+li)?.value)||1;
const fimV=parseInt(document.getElementById('cfg-lei-fim-'+li)?.value)||1;
const countEl=document.querySelector('.cfg-lei-count-'+li);
if(countEl) countEl.textContent=Math.max(0,fimV-iniV+1)+' artigo(s)';
});
});
},0);
return card;
}
function _cfgLeisLerDOM(){
const leis=getLeisAtivas();
leis.forEach((lei,li)=>{
const n=document.getElementById('cfg-lei-name-'+li);
const ini=document.getElementById('cfg-lei-ini-'+li);
const fim=document.getElementById('cfg-lei-fim-'+li);
if(n) lei.name=n.value;
if(ini&&fim) lei.arts=_artsRange(ini.value,fim.value);
if(!lei.id) lei.id='lei_'+li+'_'+Date.now();
});
return leis;
}
function cfgLeisSubir(li){
if(li===0) return;
const leis=_cfgLeisLerDOM();
[leis[li-1],leis[li]]=[leis[li],leis[li-1]];
_leisCfgSave({leis});
cfgLeisBuild();
setTimeout(()=>{ document.getElementById('cfg-lei-'+(li-1))?.scrollIntoView({behavior:'smooth',block:'nearest'}); },50);
}
function cfgLeisDescer(li){
const leis=_cfgLeisLerDOM();
if(li>=leis.length-1) return;
[leis[li],leis[li+1]]=[leis[li+1],leis[li]];
_leisCfgSave({leis});
cfgLeisBuild();
setTimeout(()=>{ document.getElementById('cfg-lei-'+(li+1))?.scrollIntoView({behavior:'smooth',block:'nearest'}); },50);
}
function cfgLeisMoverPara(li, novaPosStr){
const leis=_cfgLeisLerDOM();
let novaPos=parseInt(novaPosStr)-1;
novaPos=Math.max(0,Math.min(leis.length-1,novaPos));
if(novaPos===li) return;
const [item]=leis.splice(li,1);
leis.splice(novaPos,0,item);
_leisCfgSave({leis});
cfgLeisBuild();
setTimeout(()=>{ document.getElementById('cfg-lei-'+novaPos)?.scrollIntoView({behavior:'smooth',block:'nearest'}); },50);
}
function cfgLeisAddLei(){
const leis=_cfgLeisLerDOM();
leis.push({id:'lei_'+Date.now(),name:'',arts:[1]});
_leisCfgSave({leis});
cfgLeisBuild();
setTimeout(()=>{ document.getElementById('cfg-lei-'+(leis.length-1))?.scrollIntoView({behavior:'smooth',block:'nearest'}); },50);
}
function cfgLeisDelLei(li){
if(!confirm('Remover esta lei?')) return;
const leis=_cfgLeisLerDOM();
leis.splice(li,1);
_leisCfgSave({leis});
cfgLeisBuild();
}
function cfgLeisSalvar(){
const leis=getLeisAtivas();
leis.forEach((lei,li)=>{
const nameEl=document.getElementById('cfg-lei-name-'+li);
const iniEl=document.getElementById('cfg-lei-ini-'+li);
const fimEl=document.getElementById('cfg-lei-fim-'+li);
if(nameEl) lei.name=nameEl.value.trim()||lei.name;
if(iniEl&&fimEl){
lei.arts=_artsRange(iniEl.value,fimEl.value);
}
if(!lei.id) lei.id='lei_'+li+'_'+Date.now();
});
_leisCfgSave({leis});
LEIS_LEITURA.length=0;
leis.forEach(l=>LEIS_LEITURA.push(l));
_backupToast('✅ Leis salvas!','var(--blue)');
buildLeitura(); renderLeituraGeral(); renderDashboard();
leitSubAba('lista');
}
const RESUMOS_MATERIAS=[
'Português','Matemática','Língua Inglesa','Informática',
'Conhecimentos de Alagoas','Sociologia & Filosofia',
'Direito Constitucional','Direito Administrativo',
'Direito Penal','Direito Processual Penal',
'Direito Penal Militar','Dir. Proc. Penal Militar',
'Direitos Humanos','Legislação PMAL','Legislação Extravagante'
];
let currentResMat=RESUMOS_MATERIAS[0];
let editingResId=null;
function buildResumos(){
const tabsEl=document.getElementById('res-mat-tabs');
const panelsEl=document.getElementById('res-panels');
tabsEl.innerHTML='';
panelsEl.innerHTML='';
RESUMOS_MATERIAS.forEach(mat=>{
const tab=document.createElement('button');
tab.className='res-mat-tab'+(mat===currentResMat?' active':'');
tab.textContent=mat;
tab.onclick=()=>{currentResMat=mat;buildResumos();};
tabsEl.appendChild(tab);
});
const panel=document.createElement('div');
panel.className='res-panel active';
const matKey=currentResMat.replace(/[^a-zA-Z0-9]/g,'_');
const resumosMat=ST.resumos[matKey]||[];
const formId='res-form-'+matKey;
panel.innerHTML=`
<div class="res-add-form" id="${formId}">
<div style="font-family:'Oswald',sans-serif;font-size:.72rem;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.6rem">${editingResId?'✏ Editar Resumo':'+ Novo Resumo — '+currentResMat}</div>
<div class="res-form-row">
<span class="res-label">Tópico</span>
<input class="res-input" id="res-topico" type="text" placeholder="Ex: Concordância Verbal...">
</div>
<div class="res-form-row" style="align-items:flex-start">
<span class="res-label" style="margin-top:.35rem">Conteúdo</span>
<textarea class="res-textarea" id="res-conteudo" placeholder="Cole ou escreva o resumo aqui. A formatação será preservada."></textarea>
</div>
<button class="btn-add" onclick="salvarResumo('${matKey}')">${editingResId?'💾 Salvar alterações':'+ Adicionar resumo'}</button>
${editingResId?`<button class="reset-btn" style="width:100%;margin-top:.4rem" onclick="cancelarEdicao('${matKey}')">Cancelar edição</button>`:''}
</div>
<div class="res-list" id="res-list-${matKey}"></div>`;
panelsEl.appendChild(panel);
if(editingResId){
const item=resumosMat.find(r=>r.id===editingResId);
if(item){
setTimeout(()=>{
const ti=document.getElementById('res-topico');
const co=document.getElementById('res-conteudo');
if(ti) ti.value=item.topico;
if(co) co.value=item.conteudo;
},0);
}
}
const lista=panel.querySelector('#res-list-'+matKey);
if(!resumosMat.length){
lista.innerHTML=`<div style="font-size:.75rem;color:var(--dim);font-style:italic;text-align:center;padding:1rem">Nenhum resumo ainda. Adicione o primeiro!</div>`;
} else {
resumosMat.forEach(item=>{
const card=document.createElement('div');
card.className='res-card';
card.innerHTML=`
<div class="res-card-header">
<div class="res-card-topic">${item.topico}</div>
<div class="res-card-actions">
<button class="res-card-btn" onclick="editarResumo('${matKey}','${item.id}')">✏ Editar</button>
<button class="res-card-btn del" onclick="deletarResumo('${matKey}','${item.id}')">✕ Excluir</button>
</div>
</div>
<div class="res-card-body">${escapeHtml(item.conteudo)}</div>`;
lista.appendChild(card);
});
}
}
function _assuntos(str){
if(!str) return [];
return str.split(';').map(s=>s.trim()).filter(Boolean);
}
function _assuntoMatch(itemAssunto, filtroAssunto){
if(!filtroAssunto) return true;
const lista=_assuntos(itemAssunto);
const f=filtroAssunto.toLowerCase();
return lista.some(a=>a.toLowerCase()===f||a.toLowerCase().includes(f)||f.includes(a.toLowerCase()));
}
function escapeHtml(text){
return (text||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function renderTexto(text){
if(!text) return '';
let t = text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
t = t.replace(/\*\*(.*?)\*\*/gs, (m,g1)=>'<strong>'+g1+'</strong>');
t = t.replace(/__(.*?)__/gs,         (m,g1)=>'<u>'+g1+'</u>');
t = t.replace(/_(.*?)_/gs,           (m,g1)=>'<em>'+g1+'</em>');
t = t.replace(/\n/g,'<br>');
return t;
}
function salvarResumo(matKey){
const topico=(document.getElementById('res-topico').value||'').trim();
const conteudo=(document.getElementById('res-conteudo').value||'').trim();
if(!topico||!conteudo){alert('Preencha o tópico e o conteúdo.');return;}
if(!ST.resumos[matKey]) ST.resumos[matKey]=[];
if(editingResId){
const idx=ST.resumos[matKey].findIndex(r=>r.id===editingResId);
if(idx>-1){ST.resumos[matKey][idx].topico=topico;ST.resumos[matKey][idx].conteudo=conteudo;}
editingResId=null;
} else {
ST.resumos[matKey].push({id:'r'+Date.now(),topico,conteudo});
}
saveState();
buildResumos();
}
function editarResumo(matKey,id){
editingResId=id;
buildResumos();
}
function cancelarEdicao(matKey){
editingResId=null;
buildResumos();
}
function deletarResumo(matKey,id){
if(!confirm('Excluir este resumo?')) return;
ST.resumos[matKey]=(ST.resumos[matKey]||[]).filter(r=>r.id!==id);
saveState();
buildResumos();
}
let simAtivoId = null;
function simSubAba(sub){
const paineis={resolver:'sim-painel-resolver',incluir:'sim-painel-incluir',papel:'sim-painel-papel',stats:'sim-painel-stats'};
const btns={resolver:'sim-sub-resolver',incluir:'sim-sub-incluir',papel:'sim-sub-papel',stats:'sim-sub-stats'};
Object.keys(paineis).forEach(k=>{
  const el=document.getElementById(paineis[k]);
  if(el) el.style.display=(k===sub)?'block':'none';
});
Object.keys(btns).forEach(k=>{
  const el=document.getElementById(btns[k]);
  if(el) el.classList.toggle('active',k===sub);
});
if(sub==='resolver'){buildSimList();renderSimStats();}
else if(sub==='incluir'){populateSimAtivoSel();populateSqmMatSel();}
else if(sub==='papel'){spInit();}
else if(sub==='stats'){simStInit();}
}
function renderSimStats(_force){
if(!_force&&!document.getElementById('tab-simulados')?.classList.contains('active')) return;
let simCount=0,simNotas=[],simMelhor=null;
ST.simulados.forEach(sim=>{
if(sim.resultados&&sim.resultados.length){
sim.resultados.forEach(r=>{
simCount++;
const nota=r.nota??r.acertos;
simNotas.push(nota);
if(simMelhor===null||nota>simMelhor) simMelhor=nota;
});
}
});
const simMedia=simNotas.length>0?Math.round(simNotas.reduce((a,b)=>a+b,0)/simNotas.length):null;
const st=document.getElementById('sim-stat-total');if(st) st.textContent=ST.simulados.length;
const sm=document.getElementById('sim-stat-melhor');if(sm) sm.textContent=simMelhor!==null?(simMelhor>=0?'+':'')+simMelhor:'—';
const smed=document.getElementById('sim-stat-media');if(smed) smed.textContent=simMedia!==null?(simMedia>=0?'+':'')+simMedia:'—';
}
function criarSimuladoVazio(){
const nome=(document.getElementById('sim-nome').value||'').trim();
if(!nome){alert('Digite um nome para o simulado.');return;}
if(ST.simulados.find(s=>s.nome===nome)){alert('Já existe um simulado com esse nome.');return;}
const id='s'+Date.now();
ST.simulados.push({id, nome, questoes:[], qtd:0, resultados:[]});
saveState();
document.getElementById('sim-nome').value='';
simAtivoId=id;
buildSimList(); renderSimStats();
populateSimAtivoSel();
const btn=document.querySelector('[onclick="criarSimuladoVazio()"]');
if(btn){const o=btn.textContent;btn.textContent='✓ Criado!';btn.style.background='var(--green)';setTimeout(()=>{btn.textContent=o;btn.style.background='';},1500);}
}
function populateSimAtivoSel(){
const sel=document.getElementById('sim-ativo-sel');
const prev=sel.value;
sel.innerHTML='<option value="">— Selecione um simulado —</option>';
ST.simulados.forEach(sim=>{
const opt=document.createElement('option');
opt.value=sim.id;
opt.textContent=`${sim.nome} (${sim.qtd} questões)`;
sel.appendChild(opt);
});
if(simAtivoId && ST.simulados.find(s=>s.id===simAtivoId)){
sel.value=simAtivoId;
trocarSimuladoAtivo();
} else if(prev && ST.simulados.find(s=>s.id===prev)){
sel.value=prev;
trocarSimuladoAtivo();
}
}
function trocarSimuladoAtivo(){
const sel=document.getElementById('sim-ativo-sel');
simAtivoId=sel.value||null;
const infoEl=document.getElementById('sim-ativo-info');
if(simAtivoId){
const sim=ST.simulados.find(s=>s.id===simAtivoId);
if(sim){
infoEl.style.display='block';
document.getElementById('sim-ativo-nome').textContent=sim.nome;
document.getElementById('sim-ativo-qtd').textContent=sim.qtd;
}
} else {
infoEl.style.display='none';
}
}
function simAbaManual(){
['sim-painel-manual','sim-painel-json','sim-painel-txt'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
document.getElementById('sim-painel-manual').style.display='block';
['sim-tab-manual','sim-tab-json','sim-tab-txt'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
document.getElementById('sim-tab-manual').classList.add('active');
}
function simAbaJSON(){
['sim-painel-manual','sim-painel-json','sim-painel-txt'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
document.getElementById('sim-painel-json').style.display='block';
['sim-tab-manual','sim-tab-json','sim-tab-txt'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
document.getElementById('sim-tab-json').classList.add('active');
}
function simAbaTXT(){
['sim-painel-manual','sim-painel-json','sim-painel-txt'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
document.getElementById('sim-painel-txt').style.display='block';
['sim-tab-manual','sim-tab-json','sim-tab-txt'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
document.getElementById('sim-tab-txt').classList.add('active');
}
function importarSimuladoTXT(){
if(!simAtivoId){alert('Selecione ou crie um simulado primeiro.');return;}
const fileInput=document.getElementById('sim-txt-file');
if(!fileInput||!fileInput.files.length){alert('Selecione um arquivo TXT.');return;}
const sim=ST.simulados.find(s=>s.id===simAtivoId);
if(!sim) return;
const reader=new FileReader();
reader.onload=e=>{
const txt=e.target.result;
const blocos=txt.split(/\n---\n|\n{2,}/).filter(b=>b.trim()&&!b.trim().startsWith('#'));
let count=0; const base=sim.questoes.length;
blocos.forEach(bloco=>{
if(!bloco.trim()||bloco.trim().startsWith('#')) return;
const campos=_parseTXTBloco(bloco);
const enunciado=(campos['ENUNCIADO']||'').trim();
if(!enunciado) return;
// Accept DISCIPLINA: (new label) or MATERIA: (legacy)
const matId=resolverMatId(campos['DISCIPLINA']||campos['MATERIA']||'');
const matObj=QUESTOES_MATERIAS.find(m=>m.id===matId);
const modelo=(campos['MODELO']||'CE').toUpperCase();
sim.questoes.push({
num: campos['NUM']?parseInt(campos['NUM']):(base+count+1),
codigo: campos['CODIGO']||campos['QUESTAO']||'',
banca: campos['BANCA']||'',
matId, materia: matObj?matObj.name:(campos['MATERIA']||''),
assunto: campos['ASSUNTO']||campos['TOPICO']||'',
enunciado,
textoRef: (campos['TEXTO_REF']||campos['TEXTO_REFERENCIA']||campos['REFERENCIA']||'').trim(),
tipo: modelo==='CE'?'CE':modelo==='ABCD'?'ABCD':'ABCDE',
questoes:(modelo==='ABCD'||modelo==='ABCDE')?_altsRead('sqm'):null,
gabarito: campos['GABARITO']||campos['RESPOSTA']||'',
gabarito_comentado: (campos['COMENTADO']||campos['GABARITO_COMENTADO']||'').trim(),
});
count++;
});
sim.qtd=sim.questoes.length;
saveState(); fileInput.value=''; buildSimList(); populateSimAtivoSel();
alert(`✅ ${count} questão(ões) importada(s) para "${sim.nome}"! Total: ${sim.qtd}`);
};
reader.readAsText(fileInput.files[0]);
}
function atualizarRespostaSim(){
const modelo=document.getElementById('sqm-modelo').value;
const sel=document.getElementById('sqm-gabarito');
sel.innerHTML='';
if(modelo==='CE'){
sel.innerHTML='<option value="C">Certo</option><option value="E">Errado</option><option value="ANULADA">⊘ Anulada</option>';
} else if(modelo==='ABCD'){
['A','B','C','D','ANULADA'].forEach(l=>sel.innerHTML+=`<option value="${l}">${l==='ANULADA'?'⊘ Anulada':l}</option>`);
} else {
['A','B','C','D','E','ANULADA'].forEach(l=>sel.innerHTML+=`<option value="${l}">${l==='ANULADA'?'⊘ Anulada':l}</option>`);
}
_altsShowHide('sqm', modelo);
}
function populateSqmMatSel(){
const sel=document.getElementById('sqm-mat');
if(!sel||sel.options.length>1) return;
QUESTOES_MATERIAS.forEach(m=>{
const opt=document.createElement('option');
opt.value=m.id; opt.textContent=m.name; sel.appendChild(opt);
});
const bsel=document.getElementById('sqm-banca');
if(bsel&&bsel.options.length<=1){
BANCAS.forEach(b=>{const o=document.createElement('option');o.value=b;o.textContent=b;bsel.appendChild(o);});
}
}
function adicionarQuestaoSimulado(){
if(!simAtivoId){alert('Selecione ou crie um simulado primeiro.');return;}
const enunciado=(document.getElementById('sqm-enunciado').value||'').trim();
if(!enunciado){alert('O enunciado é obrigatório.');return;}
const sim=ST.simulados.find(s=>s.id===simAtivoId);
if(!sim) return;
const modelo=document.getElementById('sqm-modelo').value;
const tipo=modelo==='CE'?'CE':'ABCDE';
const matId=document.getElementById('sqm-mat').value;
const matObj=QUESTOES_MATERIAS.find(m=>m.id===matId);
sim.questoes.push({
num: sim.questoes.length+1,
codigo: (document.getElementById('sqm-codigo').value||'').trim(),
banca: document.getElementById('sqm-banca')?.value||'',
matId,
materia: matObj?matObj.name:'',
assunto: (document.getElementById('sqm-assunto').value||'').trim(),
enunciado,
textoRef: (document.getElementById('sqm-texto-ref')?.value||'').trim(),
tipo,
gabarito: document.getElementById('sqm-gabarito').value,
gabarito_comentado: (document.getElementById('sqm-comentado').value||'').trim(),
});
sim.qtd=sim.questoes.length;
saveState();
document.getElementById('sqm-codigo').value='';
document.getElementById('sqm-assunto').value='';
document.getElementById('sqm-enunciado').value='';
document.getElementById('sqm-comentado').value='';
const tr=document.getElementById('sqm-texto-ref'); if(tr) tr.value='';
document.getElementById('sim-ativo-qtd').textContent=sim.qtd;
const opt=document.querySelector(`#sim-ativo-sel option[value="${simAtivoId}"]`);
if(opt) opt.textContent=`${sim.nome} (${sim.qtd} questões)`;
buildSimList();
const btn=document.getElementById('sqm-add-btn');
if(btn){const o=btn.textContent;btn.textContent='✓ Adicionada!';btn.style.background='var(--green)';setTimeout(()=>{btn.textContent=o;btn.style.background='';},1500);}
}
function importarSimuladoJSON(){
if(!simAtivoId){alert('Selecione ou crie um simulado primeiro.');return;}
const fileInput=document.getElementById('sim-json-file');
if(!fileInput.files.length){alert('Selecione um arquivo JSON.');return;}
const sim=ST.simulados.find(s=>s.id===simAtivoId);
if(!sim) return;
const reader=new FileReader();
reader.onload=e=>{
try{
const arr=JSON.parse(e.target.result);
if(!Array.isArray(arr)) throw new Error('JSON deve ser um array');
const base=sim.questoes.length;
arr.forEach((q,i)=>{
const matId=resolverMatId(q.materia||q.mat||'');
const matObj=QUESTOES_MATERIAS.find(m=>m.id===matId);
const modelo=(q.modelo||q.tipo||'CE').toUpperCase();
sim.questoes.push({
num: base+i+1,
codigo: q.codigo??'',
banca: q.banca||'',
matId,
materia: matObj?matObj.name:(q.materia||''),
assunto: q.assunto??q.topico??'',
enunciado: q.enunciado??q.texto??'',
textoRef: q.texto_ref||q.textoRef||q.texto_referencia||'',
tipo: modelo==='ABCDE'||modelo==='ABCD'?'ABCDE':'CE',
gabarito: q.gabarito??q.resposta??'',
gabarito_comentado: q.gabarito_comentado??q.comentario??'',
});
});
sim.qtd=sim.questoes.length;
saveState();
fileInput.value='';
buildSimList();
populateSimAtivoSel();
alert(`✅ ${arr.length} questão(ões) importada(s) para "${sim.nome}"! Total: ${sim.qtd}`);
}catch(err){alert('Erro no JSON: '+err.message);}
};
reader.readAsText(fileInput.files[0]);
}
function buildSimList(_force){
if(!_force&&!document.getElementById('tab-simulados')?.classList.contains('active')) return;
const el=document.getElementById('sim-list');
el.innerHTML='';
if(!ST.simulados.length){
el.innerHTML='<div style="font-size:.78rem;color:var(--dim);font-style:italic;text-align:center;padding:1rem">Nenhum simulado criado ainda.</div>';
return;
}
[...ST.simulados].reverse().forEach(sim=>{
const resultados=sim.resultados||[];
const ultRes=resultados.length?resultados[resultados.length-1]:null;
const isAtivo=sim.id===simAtivoId;
const jaRealizado=resultados.length>0;
const melhorNota=resultados.length?Math.max(...resultados.map(r=>r.nota??r.acertos??0)):null;
const notaColor=melhorNota===null?'var(--dim)':melhorNota>0?'var(--green)':melhorNota<0?'var(--red)':'var(--muted)';
const notaBadge=melhorNota!==null
?`<span style="font-size:.58rem;background:rgba(${melhorNota>0?'74,222,128':melhorNota<0?'248,113,113':'255,255,255'},.15);color:${notaColor};padding:1px 8px;border-radius:3px;border:1px solid ${notaColor};vertical-align:middle;margin-left:6px;font-family:'Oswald',sans-serif;font-weight:700">${melhorNota>=0?'+':''}${melhorNota} pts</span>`
:'';
let historicoHTML='';
if(resultados.length>0){
historicoHTML=`
<details style="margin-top:.4rem">
<summary style="font-size:.63rem;color:var(--muted);cursor:pointer;list-style:none">📋 ${resultados.length} tentativa(s)</summary>
<div style="margin-top:.4rem;display:flex;flex-direction:column;gap:.2rem">
${resultados.map((r,i)=>{
const n=r.nota??r.acertos??0;
const nc=n>0?'var(--green)':n<0?'var(--red)':'var(--muted)';
const tentId=r.id||'';
return `<div style="font-size:.63rem;display:flex;gap:5px;align-items:center;padding:.25rem .4rem;background:rgba(255,255,255,.03);border-radius:5px;flex-wrap:wrap">
<span style="font-family:'Oswald',sans-serif;font-weight:700;color:var(--gold);min-width:22px">#${i+1}</span>
<span style="background:rgba(${n>0?'74,222,128':n<0?'248,113,113':'255,255,255'},.12);color:${nc};border:1px solid ${n>0?'rgba(74,222,128,.3)':n<0?'rgba(248,113,113,.3)':'rgba(255,255,255,.15)'};border-radius:4px;padding:0 6px;font-family:'Oswald',sans-serif;font-weight:700">${n>=0?'+':''}${n} pts</span>
<span style="color:var(--green)">✓ ${r.acertos??0}</span>
<span style="color:var(--red)">✗ ${r.erros??0}</span>
<span style="color:var(--muted)">— ${r.brancos??0}</span>
<span style="color:var(--blue);margin-left:auto">⏱ ${fmtSecs(r.tempo||0)}</span>
<span style="color:var(--dim)">📅 ${r.data||''}</span>
${tentId?`<button onclick="excluirTentativa('${sim.id}','${tentId}')" style="background:rgba(248,113,113,.15);color:var(--red);border:1px solid rgba(248,113,113,.3);border-radius:4px;padding:1px 7px;font-size:.58rem;cursor:pointer;font-family:'Oswald',sans-serif;font-weight:700" title="Excluir esta tentativa">✕</button>`:''}
</div>`;
}).join('')}
</div>
</details>`;
}
const card=document.createElement('div');
card.className='sim-card';
if(isAtivo) card.style.borderColor='var(--gold)';
card.innerHTML=`
<div class="sim-card-info">
<div class="sim-card-name">
${sim.nome}
${isAtivo?`<span style="font-size:.55rem;background:var(--gold);color:#08081a;padding:1px 7px;border-radius:3px;vertical-align:middle;margin-left:4px">ATIVO</span>`:''}
${notaBadge}
</div>
<div class="sim-card-meta" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          ${sim.tipo==='papel'?'<span style="font-size:.55rem;background:rgba(167,139,250,.15);color:#a78bfa;border:1px solid rgba(167,139,250,.3);border-radius:4px;padding:1px 7px;font-family:Oswald,sans-serif;font-weight:700">📝 PAPEL</span>':''}
          ${sim.plataforma?`<span style="font-size:.6rem;color:var(--muted)">${sim.plataforma}</span><span style="color:var(--dim)">·</span>`:''}
          <span>${sim.qtd} questão(ões) · ${resultados.length} realização(ões)</span>
        </div>
${ultRes
?`<div class="sim-card-stats" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:.2rem">
<span style="background:rgba(${(ultRes.nota??0)>=0?'74,222,128':'248,113,113'},.12);color:${(ultRes.nota??0)>=0?'var(--green)':'var(--red)'};border:1px solid ${(ultRes.nota??0)>=0?'rgba(74,222,128,.3)':'rgba(248,113,113,.3)'};border-radius:5px;padding:1px 8px;font-family:'Oswald',sans-serif;font-size:.65rem;font-weight:700">${(ultRes.nota??0)>=0?'+':''}${ultRes.nota??0} pts</span>
<span style="background:rgba(74,222,128,.08);color:var(--green);border:1px solid rgba(74,222,128,.2);border-radius:5px;padding:1px 8px;font-size:.65rem">✓ ${ultRes.acertos??0} acertos</span>
<span style="background:rgba(248,113,113,.08);color:var(--red);border:1px solid rgba(248,113,113,.2);border-radius:5px;padding:1px 8px;font-size:.65rem">✗ ${ultRes.erros??0} erros</span>
<span style="background:rgba(255,255,255,.05);color:var(--muted);border:1px solid var(--border);border-radius:5px;padding:1px 8px;font-size:.65rem">— ${ultRes.brancos??0} em branco</span>
<span style="background:rgba(96,165,250,.08);color:var(--blue);border:1px solid rgba(96,165,250,.2);border-radius:5px;padding:1px 8px;font-size:.65rem">⏱ ${fmtSecs(ultRes.tempo||0)}</span>
<span style="background:rgba(255,255,255,.04);color:var(--dim);border:1px solid var(--border);border-radius:5px;padding:1px 8px;font-size:.65rem">📅 ${ultRes.data||''}</span>
</div>`
:`<div class="sim-card-stats" style="color:var(--dim)">Ainda não realizado</div>`}
${historicoHTML}
</div>
<div class="sim-card-actions">
${sim.tipo!=='papel'?`<button class="sim-btn start" onclick="abrirDuracaoModal('${sim.id}')" ${sim.qtd===0?'disabled style="opacity:.4;cursor:not-allowed"':''}>${jaRealizado?'↺ Novamente':'▶ Iniciar'}</button>`:''}
<button class="sim-btn" style="background:rgba(245,200,0,.1);color:var(--gold);border-color:rgba(245,200,0,.3)" onclick="abrirEdicaoSimulado('${sim.id}')">✏ Editar</button>
<button class="sim-btn" style="background:rgba(96,165,250,.15);color:var(--blue);border-color:rgba(96,165,250,.3)" onclick="exportarSimuladoTXT('${sim.id}')">↓ TXT</button>
<button class="sim-btn" style="background:rgba(74,222,128,.1);color:var(--green);border-color:rgba(74,222,128,.3)" onclick="exportarSimuladoJSON('${sim.id}')">↓ JSON</button>
<button class="sim-btn del" onclick="deletarSimulado('${sim.id}')">✕</button>
</div>`;
el.appendChild(card);
});
}
function deletarSimulado(id){
if(!confirm('Excluir este simulado e seu histórico?')) return;
ST.simulados=ST.simulados.filter(s=>s.id!==id);
if(simAtivoId===id) simAtivoId=null;
saveState();buildSimList();renderSimStats();populateSimAtivoSel();
}
let _editSimId=null;
function abrirEdicaoSimulado(id){
const sim=ST.simulados.find(s=>s.id===id);
if(!sim||!sim.questoes.length){alert('Simulado sem questões para editar.');return;}
_editSimId=id;
document.getElementById('edit-sim-nome-label').textContent=sim.nome;
const lista=document.getElementById('edit-sim-lista');
lista.innerHTML='';
const bancaOpts=BANCAS.map(b=>`<option value="${b}">${b}</option>`).join('');
const matOpts=QUESTOES_MATERIAS.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
const modeloOpts=`<option value="CE">Certo / Errado</option><option value="ABCD">A–D</option><option value="ABCDE">A–E</option>`;
sim.questoes.forEach((q,i)=>{
const tipo=q.tipo||'CE';
const gabOpts=tipo==='CE'
?'<option value="C">Certo</option><option value="E">Errado</option><option value="ANULADA">⊘ Anulada</option>'
:['A','B','C','D','E'].map(l=>`<option value="${l}">${l}</option>`).join('');
const div=document.createElement('div');
div.className='edit-section';
div.id=`esim-item-${i}`;
div.innerHTML=`
<!-- Header: número, código, banca -->
<div style="display:flex;align-items:center;gap:8px;margin-bottom:.65rem;flex-wrap:wrap">
<span style="font-family:'Oswald',sans-serif;font-size:.85rem;font-weight:700;color:var(--gold)">Q${q.num||i+1}</span>
<input type="text" id="esim-codigo-${i}" value="${q.codigo||''}" placeholder="Código da questão" class="sim-input" style="width:140px;font-size:.75rem">
<select id="esim-banca-${i}" class="sim-select" style="flex:1;min-width:160px;font-size:.75rem">
<option value="">— Banca —</option>${bancaOpts}
</select>
<button type="button" onclick="esimMoverQuestao(${i},-1)" title="Mover para cima" style="background:rgba(255,255,255,.08);border:1px solid var(--border2);color:var(--muted);border-radius:6px;padding:.25rem .55rem;cursor:pointer;font-size:.75rem" ${i===0?'disabled':''}>↑</button>
<button type="button" onclick="esimMoverQuestao(${i},1)" title="Mover para baixo" style="background:rgba(255,255,255,.08);border:1px solid var(--border2);color:var(--muted);border-radius:6px;padding:.25rem .55rem;cursor:pointer;font-size:.75rem" ${i===sim.questoes.length-1?'disabled':''}>↓</button>
<button type="button" onclick="esimInserirAntes(${i})" title="Inserir questão antes desta" style="background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.3);color:var(--blue);border-radius:6px;padding:.25rem .6rem;cursor:pointer;font-size:.7rem;font-family:'Oswald',sans-serif;font-weight:700">+ Antes</button>
<button type="button" onclick="esimExcluirQuestao(${i})" title="Excluir esta questão" style="background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);color:var(--red);border-radius:6px;padding:.25rem .6rem;cursor:pointer;font-size:.7rem;font-family:'Oswald',sans-serif;font-weight:700">🗑 Excluir</button>
</div>
<!-- Matéria + Assunto lado a lado -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:.65rem">
<div>
<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.25rem">Matéria</div>
<select id="esim-mat-${i}" class="sim-select" style="width:100%;font-size:.75rem" onchange="esimAtualizarGab(${i})">
<option value="">— Selecione —</option>${matOpts}
</select>
</div>
<div>
<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.25rem">Assunto</div>
<input type="text" id="esim-assunto-${i}" value="${escapeHtml(q.assunto||'')}" class="sim-input" style="width:100%;font-size:.75rem" placeholder="Ex: Interpretação de Texto">
</div>
</div>
<!-- Enunciado — largura total -->
<div style="margin-bottom:.65rem">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.25rem">
<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Enunciado</div>
<div class="fmt-toolbar" style="margin:0">
<button type="button" class="fmt-btn" onclick="fmtTexto('esim-enunciado-${i}','bold')"><strong>N</strong></button>
<button type="button" class="fmt-btn" onclick="fmtTexto('esim-enunciado-${i}','italic')"><em>I</em></button>
<button type="button" class="fmt-btn" onclick="fmtTexto('esim-enunciado-${i}','underline')"><u>S</u></button>
</div>
</div>
<textarea id="esim-enunciado-${i}" class="res-textarea" style="width:100%;min-height:120px;font-size:.8rem;line-height:1.7;resize:vertical" placeholder="Texto completo da questão...">${escapeHtml(q.enunciado||'')}</textarea>
</div>
<!-- Texto de Referência — largura total -->
<div style="margin-bottom:.65rem">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.25rem">
<div style="font-size:.6rem;color:var(--purple);text-transform:uppercase;letter-spacing:.06em">📄 Texto de Referência <span style="color:var(--dim)">(opcional)</span></div>
<div class="fmt-toolbar" style="margin:0">
<button type="button" class="fmt-btn" onclick="fmtTexto('esim-textoref-${i}','bold')"><strong>N</strong></button>
<button type="button" class="fmt-btn" onclick="fmtTexto('esim-textoref-${i}','italic')"><em>I</em></button>
<button type="button" class="fmt-btn" onclick="fmtTexto('esim-textoref-${i}','underline')"><u>S</u></button>
</div>
</div>
<textarea id="esim-textoref-${i}" class="res-textarea" style="width:100%;min-height:90px;font-size:.8rem;line-height:1.7;resize:vertical;border-color:rgba(167,139,250,.3);background:rgba(167,139,250,.04)" placeholder="Texto de apoio / texto-base (aparece colapsável na resolução)...">${escapeHtml(q.textoRef||'')}</textarea>
</div>
<!-- Modelo + Gabarito lado a lado -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:.65rem">
<div>
<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.25rem">Modelo</div>
<select id="esim-modelo-${i}" class="sim-select" style="width:100%;font-size:.75rem" onchange="esimAtualizarGab(${i})">
${modeloOpts}
</select>
</div>
<div>
<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.25rem">Gabarito</div>
<select id="esim-gabarito-${i}" class="sim-select" style="width:100%;font-size:.75rem">${gabOpts}</select>
</div>
</div>
<!-- Gabarito Comentado — largura total -->
<div>
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.25rem">
<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Gabarito Comentado</div>
<div class="fmt-toolbar" style="margin:0">
<button type="button" class="fmt-btn" onclick="fmtTexto('esim-comentado-${i}','bold')"><strong>N</strong></button>
<button type="button" class="fmt-btn" onclick="fmtTexto('esim-comentado-${i}','italic')"><em>I</em></button>
<button type="button" class="fmt-btn" onclick="fmtTexto('esim-comentado-${i}','underline')"><u>S</u></button>
</div>
</div>
<textarea id="esim-comentado-${i}" class="res-textarea" style="width:100%;min-height:90px;font-size:.8rem;line-height:1.7;resize:vertical" placeholder="Explicação detalhada da resposta...">${escapeHtml(q.gabarito_comentado||'')}</textarea>
</div>`;
lista.appendChild(div);
setTimeout(()=>{
const bsel=document.getElementById(`esim-banca-${i}`);
if(bsel) bsel.value=q.banca||'';
const msel=document.getElementById(`esim-mat-${i}`);
if(msel) msel.value=q.matId||'';
const modelo=document.getElementById(`esim-modelo-${i}`);
if(modelo){
modelo.value=tipo==='CE'?'CE':tipo==='ABCD'?'ABCD':'ABCDE';
}
const gab=document.getElementById(`esim-gabarito-${i}`);
if(gab) gab.value=q.gabarito||'';
},0);
});
document.getElementById('edit-simulado-overlay').classList.add('open');
}
function esimAtualizarGab(i){
const modelo=document.getElementById(`esim-modelo-${i}`)?.value||'CE';
const sel=document.getElementById(`esim-gabarito-${i}`);
if(!sel) return;
const prev=sel.value;
sel.innerHTML='';
if(modelo==='CE'){
sel.innerHTML='<option value="C">Certo</option><option value="E">Errado</option><option value="ANULADA">⊘ Anulada</option>';
} else {
['A','B','C','D','E','ANULADA'].forEach(l=>sel.innerHTML+=`<option value="${l}">${l==='ANULADA'?'⊘ Anulada':l}</option>`);
}
if(prev) sel.value=prev;
}
function salvarEdicaoSimulado(){
const sim=ST.simulados.find(s=>s.id===_editSimId);
if(!sim) return;
let alterados=0;
sim.questoes.forEach((q,i)=>{
const matId=document.getElementById(`esim-mat-${i}`)?.value||q.matId||'';
const matObj=QUESTOES_MATERIAS.find(m=>m.id===matId);
const modelo=document.getElementById(`esim-modelo-${i}`)?.value||'CE';
q.codigo   = (document.getElementById(`esim-codigo-${i}`)?.value||'').trim();
q.banca    = document.getElementById(`esim-banca-${i}`)?.value||'';
q.matId    = matId;
q.materia  = matObj?matObj.name:q.materia||'';
q.assunto  = (document.getElementById(`esim-assunto-${i}`)?.value||'').trim();
q.enunciado= (document.getElementById(`esim-enunciado-${i}`)?.value||'').trim();
q.textoRef = (document.getElementById(`esim-textoref-${i}`)?.value||'').trim();
q.tipo     = modelo==='CE'?'CE':'ABCDE';
q.gabarito = document.getElementById(`esim-gabarito-${i}`)?.value||'';
q.gabarito_comentado=(document.getElementById(`esim-comentado-${i}`)?.value||'').trim();
alterados++;
if(q.codigo||q.enunciado){
const orig=ST.banco.find(b=>
(q.codigo&&b.codigo===q.codigo)||(q.enunciado&&b.enunciado===q.enunciado)
);
if(orig){
orig.codigo=q.codigo; orig.banca=q.banca;
orig.mat=matId; orig.matNome=q.materia;
orig.assunto=q.assunto; orig.enunciado=q.enunciado;
orig.textoRef=q.textoRef; orig.tipo=q.tipo;
orig.gabarito=q.gabarito; orig.anotacao=q.gabarito_comentado;
}
}
});
saveState();
fecharEdicaoSimulado();
buildSimList(); buildBanco(); bqRenderStats();
const btn=document.querySelector('[onclick="salvarEdicaoSimulado()"]');
if(btn){const o=btn.textContent;btn.textContent=`✓ ${alterados} questão(ões) salvas!`;btn.style.background='var(--green)';setTimeout(()=>{btn.textContent=o;btn.style.background='';},2000);}
}
function fecharEdicaoSimulado(){
document.getElementById('edit-simulado-overlay').classList.remove('open');
_editSimId=null;
}
function esimExcluirQuestao(idx){
const sim=ST.simulados.find(s=>s.id===_editSimId); if(!sim) return;
if(!confirm(`Excluir a questão Q${idx+1} deste simulado?`)) return;
sim.questoes.splice(idx,1);
sim.questoes.forEach((q,i)=>q.num=i+1);
sim.qtd=sim.questoes.length;
saveState();
abrirEdicaoSimulado(_editSimId);
}
function esimMoverQuestao(idx, dir){
const sim=ST.simulados.find(s=>s.id===_editSimId); if(!sim) return;
const newIdx=idx+dir;
if(newIdx<0||newIdx>=sim.questoes.length) return;
[sim.questoes[idx],sim.questoes[newIdx]]=[sim.questoes[newIdx],sim.questoes[idx]];
sim.questoes.forEach((q,i)=>q.num=i+1);
saveState();
abrirEdicaoSimulado(_editSimId);
}
function esimInserirAntes(idx){
const sim=ST.simulados.find(s=>s.id===_editSimId); if(!sim) return;
const novaQ={
num:0, codigo:'', banca:'', matId:'', materia:'', assunto:'',
enunciado:'[Nova questão — edite aqui]', textoRef:'',
tipo:'CE', gabarito:'C', gabarito_comentado:''
};
sim.questoes.splice(idx,0,novaQ);
sim.questoes.forEach((q,i)=>q.num=i+1);
sim.qtd=sim.questoes.length;
saveState();
abrirEdicaoSimulado(_editSimId);
}
function _downloadFile(conteudo, nomeArquivo, tipo){
const blob=new Blob([conteudo],{type:tipo});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');
a.href=url; a.download=nomeArquivo; a.click();
setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function _questaoParaTXT(q, isSimulado=false){
const linhas=[];
if(q.num||isSimulado) linhas.push(`NUM: ${q.num||''}`);
if(q.codigo)   linhas.push(`CODIGO: ${q.codigo}`);
if(q.banca)    linhas.push(`BANCA: ${q.banca}`);
// DISCIPLINA: use matNome canônico para export — FASE 9.4.14
const _expMatNome = isSimulado
  ? (q.materia||q.matNome||'')
  : (typeof bqMatNome==='function'
      ? (bqMatNome(q.mat||'')||q.matNome||q.materia||q.mat||'')
      : (q.matNome||q.materia||q.mat||''));
linhas.push(`DISCIPLINA: ${_expMatNome}`);
if(q.assunto)     linhas.push(`ASSUNTO: ${q.assunto}`);
// New fields (Fase 6) — only emit if non-empty
if(q.leis)        linhas.push(`LEIS: ${q.leis}`);
if(q.ano)         linhas.push(`ANO: ${q.ano}`);
if(q.instituicao) linhas.push(`INSTITUICAO: ${q.instituicao}`);
if(q.cargo)       linhas.push(`CARGO: ${q.cargo}`);
if(q.nivel)       linhas.push(`NIVEL: ${q.nivel}`);
// MODALIDADE: visual label for tipo (backward compat: old importers see MODALIDADE:)
linhas.push(`MODALIDADE: ${q.tipo||'CE'}`);
linhas.push(`GABARITO: ${q.gabarito||''}`);
const enunciado=q.enunciado;
if(enunciado){
linhas.push(`ENUNCIADO_BEGIN`);
linhas.push(enunciado);
linhas.push(`ENUNCIADO_END`);
}
const textoRef=q.textoRef;
if(textoRef){
linhas.push(`TEXTO_REFERENCIA_BEGIN`);
linhas.push(textoRef);
linhas.push(`TEXTO_REFERENCIA_END`);
}
const comentado=isSimulado?(q.gabarito_comentado||q.anotacao):(q.anotacao||q.gabarito_comentado);
if(comentado){
linhas.push(`GABARITO_COMENTADO_BEGIN`);
linhas.push(comentado);
linhas.push(`GABARITO_COMENTADO_END`);
}
return linhas.join('\n');
}
function _parseTXTBloco(bloco){
const campos={};
const lines=bloco.trim().split('\n');
let modo=null, buffer=[];
const flush=()=>{
if(modo&&buffer.length>=0){
campos[modo]=buffer.join('\n');
modo=null; buffer=[];
}
};
for(const line of lines){
const t=line.trimEnd();
if(t==='ENUNCIADO_BEGIN'){flush();modo='ENUNCIADO';continue;}
if(t==='ENUNCIADO_END'){flush();continue;}
// Support both old TEXTO_REF_BEGIN and new TEXTO_REFERENCIA_BEGIN
if(t==='TEXTO_REF_BEGIN'||t==='TEXTO_REFERENCIA_BEGIN'){flush();modo='TEXTO_REF';continue;}
if(t==='TEXTO_REF_END'||t==='TEXTO_REFERENCIA_END'){flush();continue;}
// Support both old COMENTADO_BEGIN and new GABARITO_COMENTADO_BEGIN
if(t==='COMENTADO_BEGIN'||t==='GABARITO_COMENTADO_BEGIN'){flush();modo='COMENTADO';continue;}
if(t==='COMENTADO_END'||t==='GABARITO_COMENTADO_END'){flush();continue;}
if(modo){buffer.push(t);continue;}
const m=t.match(/^([A-ZÁÉÍÓÚ_0-9]+):\s*(.*)/i);
if(m) campos[m[1].toUpperCase()]=m[2].trim();
}
flush();
return campos;
}
function exportarSimuladoTXT(id){
const sim=ST.simulados.find(s=>s.id===id);
if(!sim||!sim.questoes.length){alert('Simulado vazio.');return;}
const blocos=[];
blocos.push(`# SIMULADO: ${sim.nome}`);
blocos.push(`# Gerado: ${new Date().toLocaleDateString('pt-BR')} | Questões: ${sim.qtd}`);
blocos.push('');
sim.questoes.forEach(q=>{
blocos.push(_questaoParaTXT(q, true));
blocos.push('---');
});
const nome=sim.nome.replace(/[^a-z0-9áéíóú ]/gi,'_').trim();
_downloadFile(blocos.join('\n'), `simulado_${nome}.txt`, 'text/plain;charset=utf-8');
}
function exportarSimuladoJSON(id){
const sim=ST.simulados.find(s=>s.id===id);
if(!sim||!sim.questoes.length){alert('Simulado vazio.');return;}
const exportObj={
nome: sim.nome,
qtd: sim.qtd,
exportado: new Date().toLocaleDateString('pt-BR'),
questoes: sim.questoes.map(q=>({
num: q.num,
codigo: q.codigo||'',
banca: q.banca||'',
materia: q.materia||'',
assunto: q.assunto||'',
modelo: q.tipo||'CE',
gabarito: q.gabarito||'',
enunciado: q.enunciado||'',
texto_ref: q.textoRef||'',
gabarito_comentado: q.gabarito_comentado||'',
})),
resultados: sim.resultados||[],
};
const nome=sim.nome.replace(/[^a-z0-9áéíóú ]/gi,'_').trim();
_downloadFile(JSON.stringify(exportObj,null,2), `simulado_${nome}.json`, 'application/json');
}
function exportarBancoTXT(){
if(!ST.banco.length){alert('Banco de questões está vazio.');return;}
// Respect Gerenciar filter cache if visible; otherwise use Caderno filters or all
const painelG=document.getElementById('bq-painel-gerenciar');
const isGerV=painelG&&painelG.style.display!=='none';
const filtradas=isGerV&&_bqGerFiltradas
  ? _bqGerFiltradas
  : (bqFiltrosAtivos.length?bqGetFiltradas():ST.banco);
if(!filtradas.length){alert('Nenhuma questão com os filtros atuais.');return;}
const blocos=[];
blocos.push(`# BANCO DE QUESTÕES — PMAL 2026`);
blocos.push(`# Exportado: ${new Date().toLocaleDateString('pt-BR')} | Total: ${filtradas.length} questão(ões)`);
if(bqFiltrosAtivos.length) blocos.push(`# Filtros: ${bqFiltrosAtivos.map(f=>f.label).join(' | ')}`);
blocos.push('');
filtradas.forEach(q=>{
blocos.push(_questaoParaTXT(q, false));
blocos.push('---');
});
const ts=new Date().toISOString().slice(0,10);
_downloadFile(blocos.join('\n'), `banco_questoes_${ts}.txt`, 'text/plain;charset=utf-8');
const info=document.getElementById('bq-export-info');
if(info){info.textContent=`✓ ${filtradas.length} questão(ões) exportada(s)`;setTimeout(()=>info.textContent='',3000);}
}
function exportarBancoJSON(){
if(!ST.banco.length){alert('Banco de questões está vazio.');return;}
// Respect Gerenciar filter cache if visible; otherwise use Caderno filters or all
const painelGJ=document.getElementById('bq-painel-gerenciar');
const isGerVJ=painelGJ&&painelGJ.style.display!=='none';
const filtradas=isGerVJ&&_bqGerFiltradas
  ? _bqGerFiltradas
  : (bqFiltrosAtivos.length?bqGetFiltradas():ST.banco);
if(!filtradas.length){alert('Nenhuma questão com os filtros atuais.');return;}
const exportObj={
sistema: 'PMAL 2026 — Banco de Questões',
versao: 1,
exportado: new Date().toLocaleDateString('pt-BR'),
total: filtradas.length,
filtros: bqFiltrosAtivos.map(f=>f.label),
questoes: filtradas.map(q=>{
// FASE 9.4.14: export usa código e nome canônicos
const _mc=q.mat||'';
const _mn=(typeof bqMateriaNome==='function')?bqMateriaNome(_mc):(q.matNome||'');
return ({
// Identification
codigo:      q.codigo||'',
banca:       q.banca||'',
mat:         _mc,
matNome:     _mn,
assunto:     q.assunto||'',
// New fields (Fase 6) — empty string if not set
leis:        q.leis||'',
ano:         q.ano||'',
instituicao: q.instituicao||'',
cargo:       q.cargo||'',
nivel:       q.nivel||'',
// Tipo: always stored as 'tipo' — not duplicated as 'modalidade'
tipo:        q.tipo||'CE',
// Content
gabarito:    q.gabarito||'',
enunciado:   q.enunciado||'',
textoRef:    q.textoRef||'',
anotacao:    q.anotacao||'',
// Provenance
origem:      q.origem||'manual',
origem_tipo: q.origem_tipo||'banco_global',
// Performance history (legado — mantido para retrocompatibilidade)
historico: (q.historico||[]).map(h=>({
  data:h.data, acertou:h.acertou, motivo:h.motivo||''
})),
acertosConsecutivos: q.acertosConsecutivos||0,
errouAlgumVez:       q.errouAlgumVez||false,
massificada:         q.massificada||false,
// FASE 9.4.9: progresso do concurso ativo
progressoConcursoAtivo: (typeof bqGetProgresso==='function') ? (()=>{
  var p=bqGetProgresso(q);
  return p && (p.historico||[]).length ? p : null;
})() : null,
});
})
};
const ts=new Date().toISOString().slice(0,10);
_downloadFile(JSON.stringify(exportObj,null,2), `banco_questoes_${ts}.json`, 'application/json');
const info=document.getElementById('bq-export-info');
if(info){info.textContent=`✓ ${filtradas.length} questão(ões) exportada(s)`;setTimeout(()=>info.textContent='',3000);}
}
function fmtSecs(s){
const h=Math.floor(s/3600);
const m=Math.floor((s%3600)/60);
const ss=s%60;
if(h>0) return `${h}h${m>0?m+'min':''}`;
if(m>0) return `${m}min${ss>0?ss+'s':''}`;
return ss+'s';
}
let simPendenteId=null;
function abrirDuracaoModal(id){
simPendenteId=id;
const sim=ST.simulados.find(s=>s.id===id);
if(!sim) return;
document.getElementById('dur-sim-info').textContent=`"${sim.nome}" · ${sim.qtd} questões`;
document.getElementById('duracao-modal').classList.add('open');
}
function fecharDuracaoModal(){
document.getElementById('duracao-modal').classList.remove('open');
simPendenteId=null;
}
let _durModoSelecionado='foco';
function durSetModo(modo){
_durModoSelecionado=modo;
const bf=document.getElementById('dur-modo-foco');
const bl=document.getElementById('dur-modo-lista');
if(bf){bf.className=modo==='foco'?'qc-nav-btn next':'qc-nav-btn';bf.style.cssText=modo==='foco'?'flex:1;font-size:.72rem;padding:.5rem':'flex:1;font-size:.72rem;padding:.5rem;background:rgba(255,255,255,.08);color:rgba(255,255,255,.7)';}
if(bl){bl.className=modo==='lista'?'qc-nav-btn next':'qc-nav-btn';bl.style.cssText=modo==='lista'?'flex:1;font-size:.72rem;padding:.5rem':'flex:1;font-size:.72rem;padding:.5rem;background:rgba(255,255,255,.08);color:rgba(255,255,255,.7)';}
}
function confirmarDuracao(secs){
const id=simPendenteId;
fecharDuracaoModal();
iniciarSimulado(id, secs);
}
function confirmarDuracaoCustom(){
const h=parseInt(document.getElementById('dur-custom-h').value)||0;
const m=parseInt(document.getElementById('dur-custom-m').value)||0;
const total=h*3600+m*60;
if(total<60){alert('Duração mínima: 1 minuto.');return;}
const id=simPendenteId;
fecharDuracaoModal();
iniciarSimulado(id, total);
}
let timerInterval=null, timerSecsLeft=0, timerTotal=0;
let simAtivo=null, questAtual=0, respostas=[];
let simModo='foco';
const MOTIVOS=['Erro de conceito','Distração','Não sabia'];
function iniciarSimulado(id, duracao){
simAtivo=ST.simulados.find(s=>s.id===id);
if(!simAtivo||!simAtivo.questoes||!simAtivo.questoes.length){
alert('Este simulado não tem questões cadastradas.');return;
}
timerSecsLeft=duracao; timerTotal=duracao; questAtual=0;
simModo=_durModoSelecionado||'foco';
respostas=simAtivo.questoes.map(q=>({
num: q.num, codigo: q.codigo||'', enunciado: q.enunciado||'',
banca: q.banca||'', textoRef: q.textoRef||'',
assunto: q.assunto||'', tipo: q.tipo||'CE',
mat: q.matId||resolverMatId(q.materia||''), matNome: q.materia||'',
gabOficialReal: q.gabarito||'', anotacao: q.gabarito_comentado||'',
resposta: '', gabOficial: '', acertou: null, motivo: '', _depois: false,
}));
document.getElementById('timer-sim-name').textContent=simAtivo.nome;
document.getElementById('timer-overlay').classList.add('open');
document.getElementById('btn-modo-foco').classList.toggle('active',simModo==='foco');
document.getElementById('btn-modo-lista').classList.toggle('active',simModo==='lista');
setModoSim(simModo);
startTimer();
}
function resolverMatId(nomeOuCodigo){
  if(!nomeOuCodigo) return '';
  const raw = String(nomeOuCodigo).trim();
  // FASE 9.4.14.1: aceitar apenas códigos canônicos novos
  // 1) Código direto (ex: "dconst", "leginst")
  if(typeof bqMateriaExiste==='function' && bqMateriaExiste(raw)) return raw;
  // 2) Nome visual canônico exato (ex: "Direito Constitucional")
  if(typeof bqMateriaLista==='function'){
    const lower = raw.toLowerCase();
    const found = bqMateriaLista().find(m => m.name.toLowerCase() === lower);
    if(found) return found.id;
    // 3) Nome visual canônico parcial (ex: "Direito Const" → dconst)
    const partial = bqMateriaLista().find(m => m.name.toLowerCase().includes(lower) || lower.includes(m.name.toLowerCase()));
    if(partial) return partial.id;
  }
  // Fallback: busca em QUESTOES_MATERIAS do edital (para compatibilidade com add manual via select)
  const lower = raw.toLowerCase();
  const fromEdital = QUESTOES_MATERIAS.find(m => m.name.toLowerCase()===lower || m.id===raw);
  // Só aceitar se o id do edital for um código canônico válido
  if(fromEdital && typeof bqMateriaExiste==='function' && bqMateriaExiste(fromEdital.id)) return fromEdital.id;
  return '';
}
function startTimer(){
clearInterval(timerInterval);
timerInterval=setInterval(()=>{
timerSecsLeft--;
updateTimerDisplay();
if(timerSecsLeft<=0){clearInterval(timerInterval);encerrarSimulado();}
},1000);
updateTimerDisplay();
}
function updateTimerDisplay(){
const h=Math.floor(timerSecsLeft/3600),m=Math.floor((timerSecsLeft%3600)/60),s=timerSecsLeft%60;
const el=document.getElementById('timer-clock');
el.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
el.className='timer-clock'+(timerSecsLeft<600?' danger':timerSecsLeft<1800?' warning':'');
const fill=document.getElementById('timer-progress-fill');
if(fill) fill.style.width=((timerSecsLeft/timerTotal)*100)+'%';
}
function simIrParaMat(matId){
if(!matId) return;
const idx=respostas.findIndex(r=>{
const rId=(window.QUESTOES_MATERIAS||[]).find(m=>m.id===r.mat||m.name===r.mat)?.id||r.mat;
return rId===matId;
});
if(idx>=0){
irParaQuestao(idx);
const sel=document.getElementById('sim-mat-nav-sel');
if(sel) setTimeout(()=>sel.value='',100);
} else {
alert('Nenhuma questão encontrada para esta matéria.');
}
}
function simPopularMatNav(){
const sel=document.getElementById('sim-mat-nav-sel');
if(!sel) return;
const mats=new Map();
respostas.forEach(r=>{
if(!r.mat) return;
const obj=(window.QUESTOES_MATERIAS||[]).find(m=>m.id===r.mat||m.name===r.mat);
const id=obj?obj.id:r.mat;
const nome=obj?obj.name:r.mat;
if(!mats.has(id)) mats.set(id,{nome,count:0});
mats.get(id).count++;
});
sel.innerHTML='<option value="">— Ir para matéria —</option>';
[...mats.entries()].sort((a,b)=>a[1].nome.localeCompare(b[1].nome)).forEach(([id,{nome,count}])=>{
const o=document.createElement('option');
o.value=id;
o.textContent=nome+' ('+count+'Q)';
sel.appendChild(o);
});
const wrap=document.getElementById('sim-mat-nav-wrap');
if(wrap) wrap.style.display=mats.size>1?'flex':'none';
}
function setModoSim(modo){
simModo=modo;
document.getElementById('btn-modo-foco').classList.toggle('active',modo==='foco');
document.getElementById('btn-modo-lista').classList.toggle('active',modo==='lista');
simPopularMatNav();
const map=document.getElementById('quest-map');
const navWrap=document.getElementById('quest-nav-wrap');
if(modo==='foco'){
map.style.display='';
navWrap.style.display='';
buildQuestMap();
renderQuestCard();
} else {
map.style.display='none';
navWrap.style.display='none';
const _mnw=document.getElementById('sim-mat-nav-wrap');
if(_mnw) _mnw.style.display='none';
renderModoLista();
}
updateDepoisSection();
updateQuestStats();
}
function buildQuestMap(){
const map=document.getElementById('quest-map');
map.innerHTML='';
respostas.forEach((r,i)=>{
const dot=document.createElement('div');
dot.id='qmap-'+i;
dot.textContent=r.num;
let cls='qmap-dot';
if(i===questAtual) cls+=' atual';
if(r._depois) cls+=' depois';
else if(r.resposta==='B') cls+=' branco';
else if(r.resposta) cls+=' respondida';
dot.className=cls;
dot.onclick=(()=>{const idx=i;return()=>irParaQuestao(idx);})();
map.appendChild(dot);
});
updateQuestStats();
}
function irParaQuestao(idx){
questAtual=idx;
buildQuestMap();
renderQuestCard();
}
function navQuest(dir){
questAtual=Math.max(0,Math.min(respostas.length-1,questAtual+dir));
buildQuestMap(); renderQuestCard();
}
function renderQuestCard(){
const card=document.getElementById('quest-card');
const navWrap=document.getElementById('quest-nav-wrap');
const r=respostas[questAtual];
const tipo=r.tipo||'CE';
const isLast=questAtual===respostas.length-1;
document.getElementById('quest-progress-label').textContent=`Questão ${questAtual+1} de ${respostas.length}`;
const pf=document.getElementById('quest-prog-fill');
if(pf) pf.style.width=Math.round((questAtual+1)/respostas.length*100)+'%';
const optsHTML=buildOptsHTML(r, tipo, questAtual);
const depoisClass=r._depois?'marcada':'';
const _matNomeDisplay=(()=>{
if(!r.mat) return '';
const m=QUESTOES_MATERIAS.find(x=>x.id===r.mat||x.name===r.mat);
return m?m.name:r.mat;
})();
card.innerHTML=`
<div class="qc-card" style="position:relative">
<button class="sim-lista-depois-btn ${depoisClass}" onclick="deixarParaDepois(${questAtual})" title="Deixar para depois">
${r._depois?'⏳ Para depois':'⏳ Depois'}
</button>
<div class="qc-header">
<span class="qc-num">${r.num}</span>
${r.codigo?`<span class="qc-codigo">${r.codigo}</span>`:''}
${r.banca?`<span style="font-size:.6rem;color:var(--blue);font-family:'Oswald',sans-serif;padding:2px 7px;background:rgba(96,165,250,.1);border-radius:4px">${r.banca}</span>`:''}
<div class="qc-mat">
${_matNomeDisplay
? `<span style="font-size:.65rem;color:var(--gold);font-family:'Oswald',sans-serif;font-weight:700">${escapeHtml(_matNomeDisplay)}</span>`
: `<select class="qc-mat-sel" style="margin:0;width:auto;flex:1" onchange="selecionarMatSim(this.value)"><option value="">— Matéria —</option>${QUESTOES_MATERIAS.map(m=>`<option value="${m.id}">${m.name}</option>`).join('')}</select>`
}
${r.assunto?`<span class="qc-mat-sep">›</span><span style="font-size:.65rem;color:rgba(255,255,255,.65)">${escapeHtml(r.assunto)}</span>`:''}
</div>
</div>
<div class="qc-body">
${r.textoRef?`
<details class="qc-texto-ref">
<summary>
<span>📄 TEXTO DE REFERÊNCIA</span>
<span class="tr-arrow">▼</span>
</summary>
<div class="qc-texto-ref-body">${renderTexto(r.textoRef)}</div>
</details>`:''}
${r.enunciado?`<div class="qc-enunciado">${renderTexto(r.enunciado)}</div>`:''}
<div class="qc-divider"></div>
${optsHTML}
</div>
</div>`;
navWrap.innerHTML=`
<button class="qc-nav-btn prev" onclick="navQuest(-1)" ${questAtual===0?'disabled':''}>← Anterior</button>
${isLast
?`<button class="qc-nav-btn finish" onclick="encerrarSimulado()">🏁 Encerrar</button>`
:`<button class="qc-nav-btn next" onclick="navQuest(1)">Próxima →</button>`}`;
}
function renderModoLista(){
const card=document.getElementById('quest-card');
card.innerHTML=`<div class="sim-lista-wrap" id="sim-lista-wrap"></div>
<div style="width:100%;max-width:620px;margin-top:.5rem">
<button class="qc-nav-btn finish" style="width:100%" onclick="encerrarSimulado()">🏁 Encerrar Simulado</button>
</div>`;
const wrap=document.getElementById('sim-lista-wrap');
respostas.forEach((r,i)=>{
const tipo=r.tipo||'CE';
const div=document.createElement('div');
div.className='sim-lista-item';
div.id='lista-item-'+i;
const depoisClass=r._depois?'marcada':'';
div.innerHTML=`
<div id="lista-anchor-${i}" class="sim-lista-anchor"></div>
<div class="qc-card" style="position:relative">
<button class="sim-lista-depois-btn ${depoisClass}" onclick="deixarParaDepois(${i})" id="depois-btn-lista-${i}">
${r._depois?'⏳ Para depois':'⏳ Depois'}
</button>
<div class="qc-header">
<span class="qc-num">${r.num}</span>
${r.codigo?`<span class="qc-codigo">${r.codigo}</span>`:''}
<div class="qc-mat">
<select class="qc-mat-sel" style="margin:0;width:auto;flex:1" onchange="selecionarMatSimLista(this.value,${i})">
<option value="">— Matéria —</option>
${QUESTOES_MATERIAS.map(m=>`<option value="${m.id}" ${r.mat===m.id?'selected':''}>${m.name}</option>`).join('')}
</select>
${r.assunto?`<span class="qc-mat-sep">›</span><span style="font-size:.65rem;color:rgba(255,255,255,.65)">${escapeHtml(r.assunto)}</span>`:''}
</div>
</div>
<div class="qc-body">
${r.textoRef?`
<details class="qc-texto-ref">
<summary>
<span>📄 TEXTO DE REFERÊNCIA</span>
<span class="tr-arrow">▼</span>
</summary>
<div class="qc-texto-ref-body">${renderTexto(r.textoRef)}</div>
</details>`:''}
${r.enunciado?`<div class="qc-enunciado">${renderTexto(r.enunciado)}</div>`:''}
<div class="qc-divider"></div>
${buildOptsHTML(r, tipo, i)}
</div>
</div>`;
wrap.appendChild(div);
});
}
function buildOptsHTML(r, tipo, idx){
const desc=r._descartadas||{};
let html='<div class="qc-opcoes-label">Selecione sua resposta</div>';
const qOpts=r.questoes||{};
function _opcao(letra, labelEl, extraStyle='', clickable=true){
const isDesc=desc[letra]===true;
const isSel = letra==='C'?r.resposta==='C':letra==='E'?r.resposta==='E':letra==='B'?r.resposta==='B':r.resposta===letra;
const selCls = letra==='C'&&isSel?'sel-certo':letra==='E'&&isSel?'sel-errado':letra==='B'&&isSel?'sel-branco':isSel?'sel-letra':'';
const descCls = isDesc&&!isSel?'descartada':'';
const onclick = isDesc||!clickable ? '' : `onclick="selecionarRespSimulado('${letra}',${idx})"`;
const tesoura = letra!=='B' ? `<button class="qc-tesoura-btn" onclick="event.stopPropagation();descartarOpcaoSim('${letra}',${idx})" title="${isDesc?'Restaurar opção':'Descartar opção'}">✂</button>` : '';
return `<div class="qc-opcao ${selCls} ${descCls}" ${onclick} style="${extraStyle}">${labelEl}${tesoura}</div>`;
}
if(tipo==='CE'){
html+=_opcao('C','<div class="qc-opcao-circulo">C</div><div class="qc-opcao-texto">Certo</div>');
html+=_opcao('E','<div class="qc-opcao-circulo">E</div><div class="qc-opcao-texto">Errado</div>');
html+=_opcao('B','<div class="qc-opcao-circulo" style="border-style:dashed">—</div><div class="qc-opcao-texto" style="color:var(--muted)">Em branco <span style="font-size:.65rem">(0 pts)</span></div>','opacity:.7',true);
} else {
const letras=tipo==='ABCD'?['A','B','C','D']:['A','B','C','D','E'];
letras.forEach(l=>{
const txt=qOpts[l]?renderTexto(qOpts[l]):'Alternativa '+l;
html+=_opcao(l,`<div class="qc-opcao-circulo">${l}</div><div class="qc-opcao-texto" style="text-align:left">${txt}</div>`);
});
}
return html;
}
function descartarOpcaoSim(letra, idx){
if(!respostas[idx]._descartadas) respostas[idx]._descartadas={};
const desc=respostas[idx]._descartadas;
desc[letra]=!desc[letra];
if(desc[letra] && respostas[idx].resposta===letra){
respostas[idx].resposta='';
updateQuestStats();
}
if(simModo==='foco'){
renderQuestCard();
} else {
const item=document.getElementById('lista-item-'+idx);
if(item){
const divider=item.querySelector('.qc-divider');
if(divider){
while(divider.nextSibling) divider.nextSibling.remove();
divider.insertAdjacentHTML('afterend', buildOptsHTML(respostas[idx], respostas[idx].tipo||'CE', idx));
}
}
}
}
function selecionarRespSimulado(val, idx){
respostas[idx].resposta=val;
respostas[idx]._depois=false;
updateQuestStats();
if(simModo==='foco'){
buildQuestMap();
renderQuestCard();
} else {
const item=document.getElementById('lista-item-'+idx);
if(item){
const tipo=respostas[idx].tipo||'CE';
const optsWrap=item.querySelector('.qc-body');
if(optsWrap){
const divider=optsWrap.querySelector('.qc-divider');
while(divider.nextSibling) divider.nextSibling.remove();
divider.insertAdjacentHTML('afterend', buildOptsHTML(respostas[idx], tipo, idx));
}
}
}
}
function selecionarMatSim(val){
respostas[questAtual].mat=val;
const m=QUESTOES_MATERIAS.find(q=>q.id===val);
if(m) respostas[questAtual].matNome=m.name;
}
function selecionarMatSimLista(val, idx){
respostas[idx].mat=val;
const m=QUESTOES_MATERIAS.find(q=>q.id===val);
if(m) respostas[idx].matNome=m.name;
}
function deixarParaDepois(idx){
respostas[idx]._depois=!respostas[idx]._depois;
if(respostas[idx]._depois) respostas[idx].resposta='';
updateDepoisSection();
if(simModo==='foco'){
buildQuestMap();
if(respostas[idx]._depois && questAtual < respostas.length - 1){
questAtual++;
}
renderQuestCard();
} else {
const btn=document.getElementById('depois-btn-lista-'+idx);
if(btn){
btn.className='sim-lista-depois-btn'+(respostas[idx]._depois?' marcada':'');
btn.textContent=respostas[idx]._depois?'⏳ Para depois':'⏳ Depois';
}
}
}
function _depoisCor(mat){
if(!mat) return {bg:'rgba(167,139,250,.18)',fg:'#c4b5fd',border:'rgba(167,139,250,.4)'};
const paleta=[
{bg:'rgba(96,165,250,.18)', fg:'#93c5fd',border:'rgba(96,165,250,.4)'},
{bg:'rgba(74,222,128,.15)', fg:'#86efac',border:'rgba(74,222,128,.35)'},
{bg:'rgba(245,200,0,.15)',  fg:'#fde68a',border:'rgba(245,200,0,.35)'},
{bg:'rgba(248,113,113,.15)',fg:'#fca5a5',border:'rgba(248,113,113,.35)'},
{bg:'rgba(167,139,250,.18)',fg:'#c4b5fd',border:'rgba(167,139,250,.4)'},
{bg:'rgba(251,146,60,.15)', fg:'#fdba74',border:'rgba(251,146,60,.35)'},
{bg:'rgba(34,211,238,.15)', fg:'#67e8f9',border:'rgba(34,211,238,.35)'},
{bg:'rgba(244,114,182,.15)',fg:'#f9a8d4',border:'rgba(244,114,182,.35)'},
{bg:'rgba(163,230,53,.13)', fg:'#bef264',border:'rgba(163,230,53,.33)'},
{bg:'rgba(192,132,252,.15)',fg:'#e879f9',border:'rgba(192,132,252,.35)'},
];
let h=0; for(let c of mat) h=(h*31+c.charCodeAt(0))&0xff;
return paleta[h%paleta.length];
}
function _depoisNomeMat(matId){
if(!matId) return '';
const mat=(window.QUESTOES_MATERIAS||[]).find(m=>m.id===matId);
return mat?mat.name:matId;
}
function updateDepoisSection(){
const depoisList=respostas.filter(r=>r._depois);
const section=document.getElementById('depois-section');
const lista=document.getElementById('depois-lista');
const count=document.getElementById('depois-count');
if(!section||!lista) return;
if(count) count.textContent=depoisList.length;
if(!depoisList.length){section.style.display='none';return;}
section.style.display='block';
lista.innerHTML='';
depoisList.forEach(r=>{
const i=respostas.indexOf(r);
const matNome=_depoisNomeMat(r.mat)||r.mat||'';
const cor=_depoisCor(r.mat||'default');
const tag=document.createElement('div');
tag.className='depois-tag';
tag.style.background=cor.bg;
tag.style.color=cor.fg;
tag.style.border='1px solid '+cor.border;
tag.innerHTML=
`<span style="font-weight:800;letter-spacing:.03em">Q${r.num}</span>`+
(matNome?` <span style="font-size:.58rem;opacity:.85">${escapeHtml(matNome.slice(0,22))}</span>`:'');
tag.title=`Q${r.num}${matNome?' — '+matNome:''} · Clique para ir`;
tag.onclick=()=>{
if(simModo==='lista'){
document.getElementById('lista-anchor-'+i)?.scrollIntoView({behavior:'smooth',block:'center'});
} else {
irParaQuestao(i);
}
};
lista.appendChild(tag);
});
}
function updateQuestStats(){
const total=respostas.length;
const respondidas=respostas.filter(r=>r.resposta&&r.resposta!=='B').length;
const branco=respostas.filter(r=>r.resposta==='B').length;
const depois=respostas.filter(r=>r._depois).length;
const el=document.getElementById('quest-stats-label');
if(el) el.innerHTML=`
<span style="color:var(--gold)">✓ ${respondidas}</span>
${branco?`<span style="color:var(--muted)"> — ${branco}</span>`:''}
${depois?`<span style="color:var(--purple)"> ⏳ ${depois}</span>`:''}`;
const todasResp=respondidas+branco;
const pct=total>0?Math.round(todasResp/total*100):0;
const bar=document.getElementById('quest-prog-fill');
if(bar) bar.style.width=pct+'%';
if(simModo==='lista'){
const lbl=document.getElementById('quest-progress-label');
if(lbl) lbl.textContent=`${todasResp} de ${total} respondidas`;
}
}
function selecionarMat(val){ selecionarMatSim(val); }
function encerrarSimulado(){
const pendentes=respostas.filter(r=>r._depois);
function _finalizar(){
clearInterval(timerInterval);
respostas.forEach(r=>{
if(!r.resposta) r.resposta='B';
if(r.gabOficialReal) r.gabOficial=r.gabOficialReal;
});
document.getElementById('timer-overlay').classList.remove('open');
abrirGabaritoModal();
}
if(pendentes.length>0){
const listaHtml=pendentes.map(r=>{
const cor=_depoisCor(r.mat||'');
return `<span style="display:inline-flex;align-items:center;gap:4px;background:${cor.bg};color:${cor.fg};border:1px solid ${cor.border};border-radius:5px;padding:2px 8px;font-size:.65rem;font-family:'Oswald',sans-serif;font-weight:700;margin:2px">Q${r.num}${r.mat?' · '+escapeHtml((_depoisNomeMat(r.mat)||r.mat).slice(0,18)):''}</span>`;
}).join('');
const titulo='⏳ Questões sem resposta';
const msg=`Você ainda tem <strong style="color:var(--gold)">${pendentes.length} questão(ões)</strong> marcada(s) para resolver depois:<br><br><div style="display:flex;flex-wrap:wrap;gap:2px;justify-content:center;margin:.5rem 0">${listaHtml}</div><br>O que deseja fazer?`;
const overlay=document.getElementById('confirm-modal-overlay');
const titulo_el=document.getElementById('confirm-modal-titulo');
const msg_el=document.getElementById('confirm-modal-msg');
const ok_el=document.getElementById('confirm-modal-ok');
titulo_el.textContent=titulo;
msg_el.innerHTML=msg;
ok_el.textContent='⬜ Deixar em branco e encerrar';
ok_el.style.background='rgba(248,113,113,.2)';
ok_el.style.borderColor='rgba(248,113,113,.5)';
ok_el.style.color='var(--red)';
ok_el.onclick=()=>{
pendentes.forEach(r=>{ r._depois=false; r.resposta='B'; });
fecharConfirmModal();
_finalizar();
};
const cancel_el=overlay.querySelector('button:last-of-type');
if(cancel_el){
cancel_el.textContent='↩ Voltar e resolver';
cancel_el.onclick=()=>{
fecharConfirmModal();
if(simModo==='foco'){
const idx=respostas.indexOf(pendentes[0]);
if(idx>=0) irParaQuestao(idx);
}
};
}
overlay.classList.add('open');
} else {
_finalizar();
}
}
function abrirGabaritoModal(){
const list=document.getElementById('gab-modal-list');
list.innerHTML='';
respostas.forEach((r,i)=>{
const div=document.createElement('div');
div.style.cssText='background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:.55rem .8rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap';
div.id=`gab-row-${i}`;
const tipo=r.tipo||'CE';
const gabOpts=tipo==='CE'
?['C','E'].map(l=>`<div class="gab-btn" id="gof-${i}-${l}" onclick="setGabOficial(${i},'${l}')" style="min-width:44px">${l==='C'?'✓ C':'✗ E'}</div>`).join('')
:['A','B','C','D','E'].map(l=>`<div class="gab-btn" id="gof-${i}-${l}" onclick="setGabOficial(${i},'${l}')">${l}</div>`).join('');
div.innerHTML=`
<span style="font-family:'Oswald',sans-serif;font-size:.72rem;font-weight:700;color:var(--gold);min-width:28px">Q${r.num}</span>
<span style="font-size:.65rem;color:var(--muted);flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${r.enunciado?escapeHtml(r.enunciado.slice(0,55))+'…':r.codigo||''}</span>
<span style="font-size:.6rem;color:var(--blue);min-width:48px">Resp: <strong>${r.resposta||'—'}</strong></span>
<div style="display:flex;gap:4px;flex-wrap:wrap">
${gabOpts}
<div class="gab-btn" id="gof-${i}-ANULADA" onclick="setGabOficial(${i},'ANULADA')"
style="min-width:62px;border-color:rgba(167,139,250,.4);color:rgba(167,139,250,.8);font-size:.65rem">
⊘ Anulada
</div>
</div>`;
list.appendChild(div);
if(r.gabOficial) setTimeout(()=>setGabOficial(i,r.gabOficial,true),0);
});
atualizarPreviewScore();
document.getElementById('gabarito-modal').classList.add('open');
}
function setGabOficial(idx, val, silent=false){
respostas[idx].gabOficial=val;
respostas[idx].anulada=(val==='ANULADA');
const r=respostas[idx];
const tipo=r.tipo||'CE';
const opts=tipo==='CE'?['C','E','ANULADA']:['A','B','C','D','E','ANULADA'];
opts.forEach(l=>{
const btn=document.getElementById(`gof-${idx}-${l}`);
if(!btn) return;
btn.style.background=''; btn.style.borderColor=''; btn.style.color='';
btn.classList.remove('active');
if(l===val){
if(l==='ANULADA'){
btn.style.background='rgba(167,139,250,.25)';
btn.style.borderColor='rgba(167,139,250,.7)';
btn.style.color='#c4b5fd';
} else {
const acertou=r.anulada?true:(r.resposta===val);
btn.style.background=acertou?'var(--green)':'var(--red)';
btn.style.borderColor=acertou?'var(--green)':'var(--red)';
btn.style.color='#fff';
}
btn.classList.add('active');
}
});
const row=document.getElementById(`gab-row-${idx}`);
if(row){
row.style.borderColor=val==='ANULADA'?'rgba(167,139,250,.5)':'var(--border)';
row.style.background=val==='ANULADA'?'rgba(167,139,250,.05)':'var(--surface)';
}
if(!silent) atualizarPreviewScore();
}
function atualizarPreviewScore(){
let acertos=0,erros=0,brancos=0,anuladas=0;
respostas.forEach(r=>{
const resp=r.resposta||'',gab=r.gabOficial||'',tipo=r.tipo||'CE';
if(r.anulada||gab==='ANULADA'){anuladas++;return;}
if(!resp||resp==='B'||!gab){brancos++;return;}
if(resp===gab){acertos++;}
else if(tipo==='CE'){erros++;}
else{brancos++;}
});
const nota=(acertos+anuladas)-erros;
const prev=document.getElementById('gab-preview-score');
if(prev) prev.innerHTML=`
<span style="color:var(--green)">✓ ${acertos} certos</span> &nbsp;
<span style="color:var(--red)">✗ ${erros} erros</span> &nbsp;
<span style="color:var(--muted)">— ${brancos} branco</span>
${anuladas?`&nbsp; <span style="color:#c4b5fd">⊘ ${anuladas} anulada(s) (+${anuladas}pts)</span>`:''}
&nbsp;→&nbsp; <strong style="color:${nota>=0?'var(--gold)':'var(--red)'}">Nota: ${nota>=0?'+':''}${nota}</strong>`;
}
function calcularResultadoFinal(){
const tempoGasto=timerTotal-timerSecsLeft;
let acertos=0,erros=0,brancos=0,anuladas=0;
respostas.forEach(r=>{
r.acertou=null;
const resp=r.resposta||'',gab=r.gabOficial||'',tipo=r.tipo||'CE';
if(r.anulada||gab==='ANULADA'){
anuladas++;
r.acertou=true;
r.anulada=true;
return;
}
if(!resp||resp==='B'||!gab){
brancos++;r.acertou=null;
} else if(resp===gab){
acertos++;r.acertou=true;
} else {
r.acertou=false;
if(tipo==='CE'){erros++;}
else{brancos++;}
}
});
const nota=(acertos+anuladas)-erros;
const total=respostas.length;
const porMat={};
respostas.forEach(r=>{
if(!r.mat||r.acertou===null) return;
if(!porMat[r.mat]) porMat[r.mat]={name:r.matNome||r.mat,acertos:0,erros:0,total:0};
porMat[r.mat].total++;
if(r.acertou) porMat[r.mat].acertos++;
else porMat[r.mat].erros++;
});
window._simResultTemp={simId:simAtivo.id,nota,acertos:acertos+anuladas,erros,brancos,anuladas,total,tempoGasto,porMat,respostas:[...respostas],data:new Date().toLocaleDateString('pt-BR')};
document.getElementById('gabarito-modal').classList.remove('open');
showDonutResult({
titulo:'🏆 Resultado do Simulado',
acertos:acertos+anuladas, erros, puladas:brancos, total, tempo:tempoGasto, nota, porMat,
anuladas,
questoes:respostas.map(r=>({
...r,questNum:r.num,gabOficial:r.gabOficial,
_acertou:r.acertou,_pulou:r.acertou===null
})),
saveBtnLabel:'💾 Salvar resultado',
onSave:salvarResultadoSimulado
});
}
function salvarResultadoSimulado(){
const d=window._simResultTemp;
if(!d) return;
const sim=ST.simulados.find(s=>s.id===d.simId);
if(!sim) return;
const tentativaId='tent_'+Date.now();
const questoesAfetadas=[];
if(!sim.resultados) sim.resultados=[];
sim.resultados.push({
id: tentativaId,
nota:d.nota, acertos:d.acertos, erros:d.erros, brancos:d.brancos,
total:d.total, tempo:d.tempoGasto, data:d.data,
questoesAfetadas
});
// Simulado é independente — não envia questões para o banco de erros nem para estatísticas gerais
autoMarcarDomingo('simulado');
_registrarSessao(
simAtivo?simAtivo.nome:'Simulado',
Object.values(d.porMat||{}).map(m=>m.name).join(', '),
d.acertos+(d.erros||0)+(d.brancos||0),
d.acertos,
d.tempoGasto||0
);
saveState();
buildSimList(); buildBanco(); bqRenderStats(); renderDashboard();
buildSessoesHistorico(); buildGraficoEvolucao();
alert('✅ Resultado salvo! Erros enviados para o Caderno de Erros.');
}
function excluirTentativa(simId, tentativaId){
if(!confirm('Excluir esta tentativa?\n\nAs questões que foram para o Caderno de Erros por causa desta tentativa também serão removidas (se a entrada veio apenas desta tentativa).')) return;
const sim=ST.simulados.find(s=>s.id===simId);
if(!sim) return;
const tent=sim.resultados.find(r=>r.id===tentativaId);
if(!tent){ alert('Tentativa não encontrada.'); return; }
if(tent.questoesAfetadas&&tent.questoesAfetadas.length){
tent.questoesAfetadas.forEach(({bancoId, tipo})=>{
const q=ST.banco.find(b=>b.id===bancoId);
if(!q) return;
if(tipo==='criada'){
_limparSessoesPorQuestao(bancoId);
ST.banco=ST.banco.filter(b=>b.id!==bancoId);
} else {
q.historico=(q.historico||[]).filter(h=>!h.id||!h.id.startsWith(tentativaId));
const errou=q.historico.some(h=>!h.acertou);
q.errouAlgumVez=errou;
if(!errou){
q.acertosConsecutivos=0;
q.massificada=false;
} else {
let consec=0;
q.historico.slice().reverse().forEach(h=>{
if(h.acertou) consec++;
else consec=0;
});
consec=0;
for(let k=q.historico.length-1;k>=0;k--){
if(q.historico[k].acertou) consec++;
else break;
}
q.acertosConsecutivos=consec;
if(consec>=3&&q.errouAlgumVez) q.massificada=true;
else q.massificada=false;
}
}
});
}
sim.resultados=sim.resultados.filter(r=>r.id!==tentativaId);
saveState();
buildSimList(); buildBanco(); bqRenderStats(); renderSimStats(); renderDashboard();
}
let errMatsSel=new Set();
function nextQuestNum(matId){
const count = ST.erros.filter(e => e.mat === matId).length;
return count + 1;
}
function initErrImportSelect(){}
const BANCAS=[
'CEBRASPE / CESPE','FGV','FCC','VUNESP','IDECAN','IBFC','AOCP','COPS-UEL',
'FEPESE','FUNDATEC','IADES','FUMARC','QUADRIX','MOVITAE','ACAFE','COMVEST',
'INSTITUTO AOCP','MSMA','NC-UFPR','OBJETIVA','FADESP','UFG','UEL',
'Inédita (Manual)','Inédita (QConcursos)','Inédita (Simulado)',
'Simulado PMAL','Outra'
];
let bqFiltrosAtivos=[];
let errStatusFiltro='todas';
function newQuestId(){ return 'q'+Date.now()+Math.random().toString(36).slice(2,6); }
function nextQuestNum(matId){
return ST.banco.filter(q=>q.mat===matId).length + 1;
}
// ═══ Estatísticas — Fase 8.2 (rebuilt from scratch) ════════════════════════
let _bqStPeriod = 'sempre';

function _bqStParseBR(s){
  if(!s||typeof s!=='string') return null;
  const p=s.split('/').map(Number);
  if(p.length<3||!p[0]||!p[1]||!p[2]) return null;
  const d=new Date(p[2],p[1]-1,p[0]); d.setHours(0,0,0,0);
  return isNaN(d.getTime())?null:d;
}
function _bqStCutoff(period){
  const t=new Date(); t.setHours(0,0,0,0);
  if(period==='hoje') return t;
  if(period==='7d'){  const d=new Date(t);d.setDate(d.getDate()-6);return d;}
  if(period==='30d'){ const d=new Date(t);d.setDate(d.getDate()-29);return d;}
  return null;
}
function _bqStInPeriod(h,cutoff){
  if(!cutoff) return true;
  const d=_bqStParseBR(h.data);
  return d&&d>=cutoff;
}
// Navigate to Caderno de Erros with smart filters from Foco Recomendado
function _bqGoFoco(matId, assunto, lei){
  // Redirect to Banco subaba (not Caderno), apply errei + focus filters
  bqSubAba('banco');
  setTimeout(()=>{
    bqBancoLimparFiltros();
    // Apply status: Errei
    document.querySelectorAll('#bq-painel-banco .bq-fv2-status').forEach(b=>b.classList.remove('active'));
    const erBtn=document.querySelector('#bq-painel-banco .bq-fv2-status[data-val="errei"]');
    if(erBtn){ erBtn.classList.add('active'); bqBancoStatusAtivo='errei'; }
    // Disciplina
    if(matId){ const f=document.getElementById('bq-banco-f-mat'); if(f){f.value=matId;bqBancoOnMatChange();} }
    // Assunto
    if(assunto){ const f=document.getElementById('bq-banco-f-assunto'); if(f&&!f.disabled) f.value=assunto; }
    // Lei
    if(lei){ const f=document.getElementById('bq-banco-f-leis'); if(f) f.value=lei; }
    bqBancoAdicionarFiltro();
    bqRenderBancoList();
    _bqBancoUpdateBtnText();
  },80);
}
// ── Zerar todo o histórico de desempenho do Banco de Questões ────────────────
// Preserva questões cadastradas; apaga apenas dados de desempenho
// ── FASE 9.4.8: helper para zerar progresso do concurso ativo ───────────────
function bqZerarProgressoConcursoAtual(){
  // FASE ESTABILIZAÇÃO: zera campos globais de todas as questões e ST.bancoSessoes
  (ST.banco||[]).forEach(function(q){
    q.historico           = [];
    q.tentativas          = 0;
    q.acertos             = 0;
    q.erros               = 0;
    q.resolvida           = false;
    q.correta             = null;
    q.errouAlgumVez       = false;
    q.acertosConsecutivos = 0;
    q.massificada         = false;
    q.ultimaResposta      = null;
    q.ultimaData          = null;
  });
  ST.bancoSessoes = [];
  ST.erros = [];
  // Limpar blocos de questões em sessoesDiarias
  if(ST.sessoesDiarias){
    Object.values(ST.sessoesDiarias).forEach(function(sd){
      if(!sd||!sd.questoes) return;
      sd.questoes.blocos  = (sd.questoes.blocos||[]).filter(function(b){
        return b.titulo &&
          !b.titulo.includes('Banco de Questões') &&
          !b.titulo.includes('Caderno de Erros')  &&
          !b.titulo.includes('Massificadas');
      });
      sd.questoes.total   = sd.questoes.blocos.reduce(function(a,b){return a+(b.total||0);},0);
      sd.questoes.acertos = sd.questoes.blocos.reduce(function(a,b){return a+(b.acertos||0);},0);
    });
  }
  saveState();
}

function bqZerarHistorico(){
  // FASE ESTABILIZAÇÃO: zera tudo globalmente
  const _msg =
    'Isso apagará TODO o progresso de Questões.\n\n' +
    'Serão zerados: histórico de respostas, tentativas, acertos,\n' +
    'erros, caderno de erros, massificações e sessões de todos os concursos.\n\n' +
    'As questões do banco global não serão apagadas.\n\n' +
    'Essa ação não poderá ser desfeita.';
  if(!confirm(_msg)) return;

  bqZerarProgressoConcursoAtual();

  // ── Persist + re-render ─────────────────────────────────────────────────
  bqRenderEstatisticas();
  // Refresh Banco list if visible
  if(typeof bqRenderBancoList === 'function') bqRenderBancoList();
  // Refresh Caderno list if visible
  if(typeof bqRender === 'function') bqRender();
  alert('Progresso do concurso ativo zerado. As questões foram mantidas. Outros concursos não foram afetados.');
}


// ══════════════════════════════════════════════════════════════
// FASE 9.3 — Resolução: Toolbar · Modos · Painéis · Timer
// ══════════════════════════════════════════════════════════════

// ── State ────────────────────────────────────────────────────
var rslFonteAtual  = 2;          // 0-3
var rslModoAtual   = 'foco';     // 'foco' | 'lista'
var rslPainelAberto= null;       // 'desemp' | 'timer' | 'fonte' | 'config' | null
var rslTimerSegs   = 7200;       // 120min default
var rslTimerRestante = 7200;
var rslTimerSegsTotaisUsados = 0;
var rslTimerSegsTotaisIniciais = 0;
var rslTimerUsado = false;
var rslTimerRodando  = false;
var rslTimerInterval = null;
var rslCfgHistorico  = true;   // exibir histórico anterior
var rslCfgAutoGab    = true;   // legado, não usado mais
var rslCfgBanca      = true;   // exibir banca
var rslCfgCodigo     = true;   // exibir código
var rslCfgMateria    = true;   // exibir matéria e assunto

// ── Panel toggle ─────────────────────────────────────────────
function rslTogglePanel(nome) {
  const ids = {desemp:'rsl-panel-desemp', timer:'rsl-panel-timer', fonte:'rsl-panel-fonte', config:'rsl-panel-config'};
  const btnIds = {desemp:'rsl-btn-desemp', timer:'rsl-btn-timer', fonte:'rsl-btn-fonte', config:'rsl-btn-config'};
  if (rslPainelAberto === nome) {
    rslClosePanel(); return;
  }
  // Close previous
  if (rslPainelAberto) {
    const prev = document.getElementById(ids[rslPainelAberto]);
    if (prev) prev.style.display = 'none';
    const prevBtn = document.getElementById(btnIds[rslPainelAberto]);
    if (prevBtn) prevBtn.classList.remove('active');
  }
  rslPainelAberto = nome;
  const el = document.getElementById(ids[nome]);
  if (el) el.style.display = 'flex';
  const btn = document.getElementById(btnIds[nome]);
  if (btn) btn.classList.add('active');
  // Update panel content
  if (nome === 'desemp') rslUpdateDesemp();
  if (nome === 'timer')  rslUpdateTimerPanel();
}
function rslClosePanel() {
  const ids = {desemp:'rsl-panel-desemp', timer:'rsl-panel-timer', fonte:'rsl-panel-fonte', config:'rsl-panel-config'};
  const btnIds = {desemp:'rsl-btn-desemp', timer:'rsl-btn-timer', fonte:'rsl-btn-fonte', config:'rsl-btn-config'};
  if (rslPainelAberto) {
    const el = document.getElementById(ids[rslPainelAberto]);
    if (el) el.style.display = 'none';
    const btn = document.getElementById(btnIds[rslPainelAberto]);
    if (btn) btn.classList.remove('active');
    rslPainelAberto = null;
  }
}

// ── Modo foco/lista ───────────────────────────────────────────
function rslToggleModo() {
  rslModoAtual = rslModoAtual === 'foco' ? 'lista' : 'foco';
  resol_modo_atual = rslModoAtual;
  const btn = document.getElementById('rsl-btn-modo');
  const backbar = document.getElementById('rsl-backbar');
  if (rslModoAtual === 'foco') {
    if (btn) { btn.title = 'Alternar para modo lista'; btn.classList.add('active'); }
    if (backbar) backbar.classList.add('visible');
    // Restore nav visibility before rendering
    const navEl = document.getElementById('resolucao-nav');
    if (navEl) navEl.style.display = '';
    renderResolCard();
  } else {
    if (btn) { btn.title = 'Alternar para modo foco'; btn.classList.remove('active'); }
    if (backbar) backbar.classList.remove('visible');
    renderResolLista();
  }
}
// Called by iniciarResolucao to sync backbar
function rslSyncModo() {
  const backbar = document.getElementById('rsl-backbar');
  if (backbar) {
    backbar.classList.toggle('visible', resol_modo_atual !== 'lista');
  }
  // Ensure donut/timer reflect fresh session data
  rslUpdateDesemp();
}

// ── Desempenho donut ──────────────────────────────────────────
function rslUpdateDesemp() {
  const total = resol_fila ? resol_fila.length : 0;
  const acertos = (typeof resol_acertos !== 'undefined') ? resol_acertos : 0;
  const erros   = (typeof resol_erros   !== 'undefined') ? resol_erros   : 0;
  const puladas = (typeof resol_puladas !== 'undefined') ? resol_puladas : 0;
  const respondidas = acertos + erros;
  const pct = respondidas > 0 ? Math.round(acertos / respondidas * 100) : 0;

  // Update text stats
  const upd = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  upd('rsl-ds-resp', respondidas);
  upd('rsl-ds-cert', acertos);
  upd('rsl-ds-err',  erros);
  upd('rsl-ds-pul',  puladas);
  upd('rsl-donut-pct-txt', pct + '%');

  // Update donut SVG arcs (circumference ≈ 2πr = 2π×38 ≈ 239)
  const circ = 239;
  const acertosArc = respondidas > 0 ? (acertos / respondidas * circ) : 0;
  const errosArc   = respondidas > 0 ? (erros   / respondidas * circ) : 0;
  const acEl = document.getElementById('rsl-donut-acertos-arc');
  const erEl = document.getElementById('rsl-donut-erros-arc');
  if (acEl) acEl.style.strokeDasharray = `${acertosArc.toFixed(1)} ${(circ - acertosArc).toFixed(1)}`;
  if (erEl) { erEl.style.strokeDasharray = `${errosArc.toFixed(1)} ${(circ - errosArc).toFixed(1)}`; erEl.style.strokeDashoffset = `-${acertosArc.toFixed(1)}`; }

  // Update timer mini-stats
  upd('rsl-tm-resp', respondidas);
  upd('rsl-tm-cert', acertos);
  upd('rsl-tm-err',  erros);
}

// ── Cronômetro ────────────────────────────────────────────────
function rslTimerRangeChange(val) {
  rslTimerSegs = val * 60;
  rslTimerRestante = rslTimerSegs;
  rslTimerSegsTotaisUsados = 0;
  rslTimerUsado = false;
  document.getElementById('rsl-timer-range-label').textContent = _rslFmtTime(rslTimerSegs);
  document.getElementById('rsl-timer-display').textContent = _rslFmtTime(rslTimerSegs);
}
function _rslFmtTime(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}
function rslTimerToggle() {
  if (rslTimerRodando) {
    clearInterval(rslTimerInterval); rslTimerInterval = null;
    rslTimerRodando = false;
    document.getElementById('rsl-timer-btn-ini').textContent = 'Retomar';
    document.getElementById('rsl-timer-state').textContent = 'Pausado';
  } else {
    if (rslTimerRestante <= 0) rslTimerRestante = rslTimerSegs;
    if (!rslTimerUsado) { rslTimerUsado = true; rslTimerSegsTotaisIniciais = rslTimerRestante; }
    rslTimerRodando = true;
    document.getElementById('rsl-timer-btn-ini').textContent = 'Pausar';
    document.getElementById('rsl-timer-btn-enc').disabled = false;
    document.getElementById('rsl-timer-state').textContent = 'Rodando';
    rslTimerInterval = setInterval(() => {
      rslTimerRestante--;
      rslTimerSegsTotaisUsados++;
      document.getElementById('rsl-timer-display').textContent = _rslFmtTime(rslTimerRestante);
      if (rslTimerRestante <= 0) {
        clearInterval(rslTimerInterval); rslTimerInterval = null;
        rslTimerRodando = false;
        document.getElementById('rsl-timer-display').textContent = '00:00';
        document.getElementById('rsl-timer-state').textContent = 'Encerrado';
        document.getElementById('rsl-timer-btn-ini').textContent = 'Iniciar';
      }
    }, 1000);
  }
}
function rslTimerStop() {
  clearInterval(rslTimerInterval); rslTimerInterval = null;
  rslTimerRodando = false; rslTimerRestante = 0;
  document.getElementById('rsl-timer-display').textContent = '00:00';
  document.getElementById('rsl-timer-state').textContent = 'Encerrado';
  document.getElementById('rsl-timer-btn-ini').textContent = 'Iniciar';
  document.getElementById('rsl-timer-btn-enc').disabled = true;
}
function rslUpdateTimerPanel() {
  document.getElementById('rsl-timer-display').textContent = _rslFmtTime(rslTimerRestante);
}

// ── Tema claro/escuro ─────────────────────────────────────────
function rslToggleTema() {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  const darkIcon  = document.getElementById('rsl-tema-icon-dark');
  const lightIcon = document.getElementById('rsl-tema-icon-light');
  if (darkIcon)  darkIcon.style.display  = isLight ? 'none' : '';
  if (lightIcon) lightIcon.style.display = isLight ? '' : 'none';
  // Persist
  try { localStorage.setItem('protocolo01_theme', isLight ? 'light' : 'dark'); } catch(e) {}
}

// ── Fonte ─────────────────────────────────────────────────────
const rslFonteLabels = ['Pequeno', 'Médio', 'Grande', 'Extra Grande'];
function rslSetFonte(level) {
  rslFonteAtual = level;
  const overlay = document.getElementById('resolucao-overlay');
  if (overlay) overlay.setAttribute('data-fonte', level);
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`rsl-fonte-${i}`);
    if (btn) btn.classList.toggle('active', i === level);
  }
  const lbl = document.getElementById('rsl-fonte-label');
  if (lbl) lbl.textContent = rslFonteLabels[level];
}

// ── Configurações ─────────────────────────────────────────────
function rslCfgChange() { rslCfgAplicar(); } // legado — redireciona para novo
function rslCfgAplicar() {
  // Ler checkboxes
  const chkH = document.getElementById('rsl-cfg-historico');
  const chkB = document.getElementById('rsl-cfg-banca');
  const chkC = document.getElementById('rsl-cfg-codigo');
  const chkM = document.getElementById('rsl-cfg-materia');
  rslCfgHistorico = chkH ? chkH.checked : true;
  rslCfgBanca     = chkB ? chkB.checked : true;
  rslCfgCodigo    = chkC ? chkC.checked : true;
  rslCfgMateria   = chkM ? chkM.checked : true;
  // Persistir
  try {
    localStorage.setItem('p01_cfg_historico', rslCfgHistorico ? '1' : '0');
    localStorage.setItem('p01_cfg_banca',     rslCfgBanca     ? '1' : '0');
    localStorage.setItem('p01_cfg_codigo',    rslCfgCodigo    ? '1' : '0');
    localStorage.setItem('p01_cfg_materia',   rslCfgMateria   ? '1' : '0');
  } catch(e) {}
  // Aplicar visualmente SEM re-renderizar (preserva estado, modo, seleção)
  rslCfgAplicarVisual();
}
function rslCfgAplicarVisual() {
  // Usar classes no overlay — CSS cuida da visibilidade (evita problemas com display inline)
  const ov = document.querySelector('.resolucao-overlay');
  if (!ov) return;
  // Histórico
  ov.classList.toggle('rsl-hide-historico', !rslCfgHistorico);
  // Banca — via classe no overlay
  ov.classList.toggle('rsl-hide-banca', !rslCfgBanca);
  // Código
  ov.classList.toggle('rsl-hide-codigo', !rslCfgCodigo);
  // Matéria
  ov.classList.toggle('rsl-hide-materia', !rslCfgMateria);
}
function rslCfgCarregar() {
  try {
    const h = localStorage.getItem('p01_cfg_historico');
    const b = localStorage.getItem('p01_cfg_banca');
    const c = localStorage.getItem('p01_cfg_codigo');
    const m = localStorage.getItem('p01_cfg_materia');
    rslCfgHistorico = h === null ? true : h === '1';
    rslCfgBanca     = b === null ? true : b === '1';
    rslCfgCodigo    = c === null ? true : c === '1';
    rslCfgMateria   = m === null ? true : m === '1';
  } catch(e) { rslCfgHistorico = rslCfgBanca = rslCfgCodigo = rslCfgMateria = true; }
  // Aplicar nos checkboxes
  const chk = (id, val) => { const el=document.getElementById(id); if(el) el.checked=val; };
  chk('rsl-cfg-historico', rslCfgHistorico);
  chk('rsl-cfg-banca',     rslCfgBanca);
  chk('rsl-cfg-codigo',    rslCfgCodigo);
  chk('rsl-cfg-materia',   rslCfgMateria);
}

// ── Patch iniciarResolucao hook ───────────────────────────────
// After iniciarResolucao sets up resol_fila, sync the UI
const _origIniciarResolucao = typeof iniciarResolucao !== 'undefined' ? iniciarResolucao : null;

// Called after the session starts to set up RSL UI state
function rslOnSessionStart() {
  rslModoAtual   = 'foco';
  resol_modo_atual = 'foco';
  rslPainelAberto = null;
  // Close any open panels
  ['desemp','timer','fonte','config'].forEach(n => {
    const el = document.getElementById('rsl-panel-' + n);
    if (el) el.style.display = 'none';
  });
  // Reset tool btn active states (exceto modo-btn)
  ['rsl-btn-desemp','rsl-btn-timer','rsl-btn-fonte','rsl-btn-config'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });
  // Backbar
  const backbar = document.getElementById('rsl-backbar');
  if (backbar) backbar.classList.add('visible');
  // Reset btn-modo style
  const modoBtn = document.getElementById('rsl-btn-modo');
  if (modoBtn) modoBtn.classList.add('active');
  // Set default font
  rslSetFonte(2);
  // Reset timer state
  rslTimerSegsTotaisUsados = 0;
  rslTimerSegsTotaisIniciais = 0;
  rslTimerUsado = false;
  rslTimerRodando = false;
  if (rslTimerInterval) { clearInterval(rslTimerInterval); rslTimerInterval = null; }
  rslTimerSegs = 7200;
  rslTimerRestante = 7200;
  const timerDisp = document.getElementById('rsl-timer-display');
  if (timerDisp) timerDisp.textContent = '120:00';
  const timerState = document.getElementById('rsl-timer-state');
  if (timerState) timerState.textContent = 'Parado';
  const timerBtnIni = document.getElementById('rsl-timer-btn-ini');
  if (timerBtnIni) timerBtnIni.textContent = 'Iniciar';
  const timerBtnEnc = document.getElementById('rsl-timer-btn-enc');
  if (timerBtnEnc) timerBtnEnc.disabled = true;
  const timerRange = document.getElementById('rsl-timer-range');
  if (timerRange) timerRange.value = 120;
  const timerLabel = document.getElementById('rsl-timer-range-label');
  if (timerLabel) timerLabel.textContent = '120:00';
  // Fechar donut-modal se estiver aberto de sessão anterior
  const _dmOld = document.getElementById('donut-modal-overlay');
  if (_dmOld) _dmOld.classList.remove('open');
  // Fechar resumo premium se estiver aberto
  const _rmOld = document.getElementById('rsl-resumo-overlay');
  if (_rmOld) _rmOld.classList.remove('open');
  // Carregar preferências
  if (typeof rslCfgCarregar === 'function') rslCfgCarregar();
  // Update donut
  rslUpdateDesemp();
}

// Hook: rslUpdateDesemp is called by buildResolMap after each answer
const _origBuildResolMap = typeof buildResolMap !== 'undefined' ? null : null;

function bqSetStatsPeriod(val,btn){
  _bqStPeriod=val;
  document.querySelectorAll('.bqs-pill').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  bqRenderEstatisticas();
}

function bqRenderEstatisticas(){
  // FASE 9.4.13.2: função robusta — sempre renderiza layout completo mesmo sem dados
  const el = document.getElementById('bq-stats-content');
  if(!el) return;
  // Topbar sempre correto
  try{ if(typeof topbarSubTabUpdate==='function') topbarSubTabUpdate('banco','stats'); }catch(e){}

  // ── Helpers ────────────────────────────────────────────────────────────────
  const safe0  = v => (isNaN(v) || v === null || v === undefined) ? 0 : v;
  const pct    = (a,t) => t > 0 ? Math.round(a/t*100) : 0;
  const colFor = v => v >= 75 ? '#3dd68c' : v >= 50 ? '#C6A15B' : '#f87171';
  const esc    = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // ── Period ─────────────────────────────────────────────────────────────────
  const period = typeof _bqStPeriod !== 'undefined' ? _bqStPeriod : 'sempre';
  const cutoff = (typeof _bqStCutoff === 'function') ? _bqStCutoff(period) : null;
  const periodLabel = {'hoje':'Hoje','7d':'Últimos 7 dias','30d':'Últimos 30 dias','sempre':'Todo período'}[period] || '';
  const pills = [['hoje','Hoje'],['7d','7 dias'],['30d','30 dias'],['sempre','Sempre']];
  const pillsHtml = pills.map(([v,l]) =>
    `<button class="bqs-pill${period===v?' active':''}" onclick="bqSetStatsPeriod('${v}',this)">${l}</button>`
  ).join('') +
  `<button class="bqs-zerar-btn" onclick="bqZerarHistorico()" title="Apagar histórico de desempenho">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
    Zerar Tudo
  </button>`;

  // ── Source data ────────────────────────────────────────────────────────────
  const banco = (typeof ST !== 'undefined' && ST && ST.banco) ? ST.banco : [];
  const _inPeriod = (typeof _bqStInPeriod === 'function') ? _bqStInPeriod : () => true;
  const _parseBR  = (typeof _bqStParseBR  === 'function') ? _bqStParseBR  : () => null;
  // FASE ESTABILIZAÇÃO: lê dados globais direto de q.historico e ST.bancoSessoes
  const _statCid = null; // não usado — arquitetura global
  const _getHist  = (q) => (q && Array.isArray(q.historico)) ? q.historico : [];
  const _getProg  = (q) => bqGetProgresso(q);

  // Sessões globais
  let _allBancoSessoes = [];
  try {
    _allBancoSessoes = ((typeof ST !== 'undefined' && ST && ST.bancoSessoes) ? ST.bancoSessoes : []).filter(s => s.total > 0);
  } catch(e) { console.warn('[bqStats] sessions error:', e.message); }

  // ── Aggregate ──────────────────────────────────────────────────────────────
  let totTent = 0, totAcertos = 0;
  const byMat = {}, byBanca = {};
  try {
    banco.forEach(q => {
      const mat   = q.matNome || q.mat || 'Sem disciplina';
      const banca = q.banca   || 'Sem banca';
      const hist  = _getHist(q).filter(h => _inPeriod(h, cutoff));
      if (!hist.length) return;
      if (!byMat[mat])    byMat[mat]   = {t:0,a:0,caderno:!!_getProg(q).errouAlgumVez};
      if (!byBanca[banca]) byBanca[banca] = {t:0,a:0};
      hist.forEach(h => {
        totTent++; byMat[mat].t++; byBanca[banca].t++;
        if (h.acertou) { totAcertos++; byMat[mat].a++; byBanca[banca].a++; }
      });
    });
  } catch(e) { console.warn('[bqStats] aggregate error:', e.message); }



  const aprovPct = pct(totAcertos, totTent);
  const aprovNull = totTent === 0;   // gauge shows zero state
  const totErros  = totTent - totAcertos;

  // ── Caderno ────────────────────────────────────────────────────────────────
  let cadernoHtml = '';
  try {
    const cErros = banco.filter(q => _getProg(q).errouAlgumVez);
    const cMass  = banco.filter(q => _getProg(q).massificada).length;
    let cErrando = 0, cAcert = 0;
    cErros.forEach(q => {
      if (_getProg(q).massificada) return;
      const u = _getHist(q).slice(-1)[0];
      if (u && u.acertou) cAcert++; else cErrando++;
    });
    const cTotal = cErros.length;
    const cRecovRate = cTotal > 0 ? Math.round((cMass + cAcert) / cTotal * 100) : 0;
    const recCol = colFor(cRecovRate);
    cadernoHtml = `<div class="bqs-cad-wrap">
      <div class="bqs-cad-sub">${cTotal ? 'Acompanhe sua recuperação nas questões que você já errou.' : 'Questões erradas aparecerão aqui automaticamente.'}</div>
      <div class="bqs-cad-stats">
        <div class="bqs-cad-stat"><div class="bqs-cad-val" style="color:#f87171">${cTotal}</div><div class="bqs-cad-lbl">No Caderno</div></div>
        <div class="bqs-cad-stat"><div class="bqs-cad-val" style="color:#f87171">${cErrando}</div><div class="bqs-cad-lbl">Ainda Errando</div></div>
        <div class="bqs-cad-stat"><div class="bqs-cad-val" style="color:#C6A15B">${cAcert}</div><div class="bqs-cad-lbl">Recuperando</div></div>
        <div class="bqs-cad-stat"><div class="bqs-cad-val" style="color:#a78bfa">${cMass}</div><div class="bqs-cad-lbl">Massificadas</div></div>
      </div>
      <div class="bqs-cad-recovery">
        <div class="bqs-cad-rec-hdr">
          <span class="bqs-cad-rec-label">Taxa de Recuperação</span>
          <span class="bqs-cad-rec-pct" style="color:${recCol}">${cRecovRate}%</span>
        </div>
        <div class="bqs-cad-bar-wrap"><div class="bqs-cad-bar-fill" style="width:${cRecovRate}%;background:${recCol}"></div></div>
      </div>
      ${cTotal ? `<button class="bqs-cad-revisar" onclick="_bqGoFoco('','','')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        Revisar Caderno
      </button>` : ''}
    </div>`;
  } catch(e) {
    console.warn('[bqStats] caderno error:', e.message);
    cadernoHtml = '<div class="bqs-cad-empty"><div class="bqs-cad-empty-title">Caderno de Erros</div></div>';
  }

  // ── Gauge SVG ─────────────────────────────────────────────────────────────
  let gaugeSVG = '', statsRow = '';
  try {
    const gaugeR = 80, gaugeCX = 100, gaugeCY = 92;
    const gaugePath = `M${gaugeCX-gaugeR},${gaugeCY} A${gaugeR},${gaugeR} 0 0,1 ${gaugeCX+gaugeR},${gaugeCY}`;
    const gaugeCirc = Math.round(Math.PI * gaugeR * 100) / 100;
    const gaugeDash = aprovNull ? '0' : (aprovPct/100 * gaugeCirc).toFixed(2);
    const gaugeCol  = aprovNull ? 'rgba(255,255,255,.2)' : colFor(aprovPct);
    const gaugeBadge = aprovNull ? '' : aprovPct>=75 ? 'FORTE' : aprovPct>=50 ? 'MELHORAR' : 'CRÍTICO';
    const gaugeBCls  = aprovNull ? '' : aprovPct>=75 ? 'bqs-badge--g' : aprovPct>=50 ? 'bqs-badge--y' : 'bqs-badge--r';
    // Light-mode aware gauge colors
    const _gaugeIsLt = document.body.classList.contains('light');
    const _gaugeTrail = _gaugeIsLt ? 'rgba(15,23,42,.12)' : 'rgba(255,255,255,.09)';
    const _gaugeLabel = _gaugeIsLt ? 'rgba(15,23,42,.45)' : 'rgba(255,255,255,.38)';
    gaugeSVG = aprovNull
      ? `<div class="bqs-gauge-empty">Nenhuma questão resolvida${period!=='sempre'?' neste período':' ainda'}.</div>`
      : `<div class="bqs-gauge-wrap2">
          <div class="bqs-gauge-outer">
            <svg viewBox="0 0 200 108" class="bqs-gauge2">
              <defs>
                <filter id="bqs-gauge-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur"/>
                  <feComposite in="blur" in2="SourceGraphic" operator="over"/>
                </filter>
              </defs>
              <path d="${gaugePath}" fill="none" stroke="${_gaugeTrail}" stroke-width="14" stroke-linecap="round"/>
              <path d="${gaugePath}" fill="none" stroke="${gaugeCol}" stroke-width="14" stroke-linecap="round"
                stroke-dasharray="${gaugeDash} ${gaugeCirc.toFixed(2)}" stroke-dashoffset="0" opacity="0.35"
                filter="url(#bqs-gauge-glow)"/>
              <path d="${gaugePath}" fill="none" stroke="${gaugeCol}" stroke-width="14" stroke-linecap="round"
                stroke-dasharray="${gaugeDash} ${gaugeCirc.toFixed(2)}" stroke-dashoffset="0"/>
              <text x="100" y="52" text-anchor="middle" font-family="Barlow,sans-serif" font-size="8.5"
                fill="${_gaugeLabel}" letter-spacing="1.5">ACERTO TOTAL</text>
              <text x="100" y="90" text-anchor="middle" font-family="Oswald,sans-serif" font-size="34"
                font-weight="700" fill="${gaugeCol}">${aprovPct}%</text>
            </svg>
          </div>
          ${gaugeBadge ? `<div class="bqs-gauge-badge-center"><span class="bqs-badge ${gaugeBCls}">${gaugeBadge}</span></div>` : ''}
        </div>`;
    const _tentCol   = _gaugeIsLt ? 'rgba(15,23,42,.65)' : 'rgba(255,255,255,.7)';
    const _tentBarCol = _gaugeIsLt ? 'rgba(15,23,42,.22)' : 'rgba(255,255,255,.25)';
    statsRow = `<div class="bqs-stats-row2">
      <div class="bqs-stat2">
        <div class="bqs-stat2-val" style="color:${_tentCol}">${totTent}</div>
        <div class="bqs-stat2-bar-wrap"><div class="bqs-stat2-bar" style="width:100%;background:${_tentBarCol}"></div></div>
        <div class="bqs-stat2-lbl">Tentativas</div>
      </div>
      <div class="bqs-stat2">
        <div class="bqs-stat2-val" style="color:#3dd68c">${totAcertos}</div>
        <div class="bqs-stat2-bar-wrap"><div class="bqs-stat2-bar" style="width:${aprovPct}%;background:#3dd68c"></div></div>
        <div class="bqs-stat2-lbl">Acertos</div>
      </div>
      <div class="bqs-stat2">
        <div class="bqs-stat2-val" style="color:#f87171">${totErros}</div>
        <div class="bqs-stat2-bar-wrap"><div class="bqs-stat2-bar" style="width:${pct(totErros,totTent)}%;background:#f87171"></div></div>
        <div class="bqs-stat2-lbl">Erros</div>
      </div>
    </div>`;
  } catch(e) {
    console.warn('[bqStats] gauge error:', e.message);
    gaugeSVG = '<div class="bqs-gauge-empty">0%</div>';
    statsRow  = '';
  }

  // ── Evolution chart ───────────────────────────────────────────────────────
  let chartHtml = '';
  try {
    const _isLt = document.body.classList.contains('light');
    const _cTent = _isLt ? '#94a3b8' : 'rgba(255,255,255,.55)';
    const legendHtml = `<span class="bqs-legend">
      <span class="bqs-leg-dot" style="background:${_cTent}"></span>Tentativas
      <span class="bqs-leg-dot" style="background:#3dd68c"></span>Acertos
      <span class="bqs-leg-dot" style="background:#f87171"></span>Erros
    </span>`;
    const hdrHtml = `<div class="bqs-card-hdr">
      <span class="bqs-card-title bqs-chart-title--neutral">Evolução — ${periodLabel}</span>
      ${legendHtml}
    </div>`;

    const sessData = {};
    _allBancoSessoes.forEach((s,i) => {
      const dt = _parseBR(s.data);
      if (cutoff && dt && dt < cutoff) return;
      const key = s.id || `s_${i}`;
      sessData[key] = { t:s.total, a:s.acertos, label_date:(s.data||'').slice(0,5), label_hora:s.hora||'', sortKey:s.timestamp||(dt?dt.getTime()+i:i) };
    });

    const sessKeys = Object.keys(sessData).sort((a,b) => sessData[a].sortKey - sessData[b].sortKey);

    if (!sessKeys.length) {
      chartHtml = `<div class="bqs-chart-card">${hdrHtml}<div class="bqs-chart-empty">Sem resoluções no período para exibir gráfico.</div></div>`;
    } else {
      const CW=560,CH=190,PAD_L=34,PAD_R=16,PAD_T=12,PAD_B=36;
      const _cG1=_isLt?'rgba(15,23,42,.14)':'rgba(255,255,255,.09)';
      const _cG2=_isLt?'rgba(15,23,42,.06)':'rgba(255,255,255,.025)';
      const _cVL=_isLt?'rgba(15,23,42,.06)':'rgba(255,255,255,.045)';
      const _cXL=_isLt?'rgba(15,23,42,.55)':'rgba(255,255,255,.35)';
      const _cYL=_isLt?'rgba(15,23,42,.45)':'rgba(255,255,255,.3)';
      const _cBX=_isLt?'rgba(15,23,42,.2)' :'rgba(255,255,255,.15)';
      const plotW=CW-PAD_L-PAD_R, plotH=CH-PAD_T-PAD_B;
      const rawMax = Math.max(...sessKeys.map(k=>sessData[k].t));
      const yMax = rawMax<=30 ? 30 : Math.ceil(rawMax/10)*10;
      const scaleY = v => PAD_T + plotH - Math.round(v/yMax*plotH);
      const baseY  = PAD_T + plotH;
      const n = sessKeys.length;
      const xOf = i => n<=1 ? (PAD_L+plotW) : (PAD_L + i/(n-1)*plotW);
      const smooth = pts => {
        if (!pts.length) return '';
        if (pts.length===1) return `M${pts[0][0]},${pts[0][1]}`;
        let d = `M${pts[0][0]},${pts[0][1]}`;
        for (let i=0;i<pts.length-1;i++) {
          const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
          const cp1x=p1[0]+(p2[0]-p0[0])/6, cp1y=p1[1]+(p2[1]-p0[1])/6;
          const cp2x=p2[0]-(p3[0]-p1[0])/6, cp2y=p2[1]-(p3[1]-p1[1])/6;
          d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
        }
        return d;
      };
      const area = pts => { const l=smooth(pts); return l ? l+` L${pts[pts.length-1][0].toFixed(1)},${baseY} L${pts[0][0].toFixed(1)},${baseY} Z` : ''; };
      const ptsTent  = sessKeys.map((k,i)=>[xOf(i),scaleY(sessData[k].t)]);
      const ptsAcert = sessKeys.map((k,i)=>[xOf(i),scaleY(sessData[k].a)]);
      const ptsErros = sessKeys.map((k,i)=>[xOf(i),scaleY(sessData[k].t-sessData[k].a)]);
      let yGrid='';
      for (let v=0;v<=yMax;v+=2) {
        const isPrim=(v%10===0), y=scaleY(v);
        yGrid+=`<line x1="${PAD_L}" y1="${y.toFixed(0)}" x2="${CW-PAD_R}" y2="${y.toFixed(0)}" stroke="${isPrim?_cG1:_cG2}" stroke-width="${isPrim?1:.5}"/>`;
        if(isPrim) yGrid+=`<text x="${PAD_L-4}" y="${(y+3).toFixed(0)}" text-anchor="end" font-size="9" fill="${_cYL}">${v}</text>`;
      }
      const vLines = sessKeys.map((_,i)=>`<line x1="${xOf(i).toFixed(1)}" y1="${PAD_T}" x2="${xOf(i).toFixed(1)}" y2="${baseY}" stroke="${_cVL}" stroke-width=".5"/>`).join('');
      const step = Math.max(1,Math.floor(n/8));
      const labelIdxs = new Set([n-1]); for(let i=0;i<n;i+=step) labelIdxs.add(i);
      const xLabels = [...labelIdxs].sort((a,b)=>a-b).map(i=>{
        const sd=sessData[sessKeys[i]], x=xOf(i).toFixed(1);
        return `<text x="${x}" y="${(CH-PAD_B+14).toFixed(0)}" text-anchor="middle" font-size="8" fill="${_cXL}">${sd.label_date}</text>${sd.label_hora?`<text x="${x}" y="${(CH-PAD_B+24).toFixed(0)}" text-anchor="middle" font-size="7.5" fill="${_cXL}">${sd.label_hora}</text>`:''}`;
      }).join('');
      const dots = (pts,col,r) => pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r}" fill="${col}"/>`).join('');
      chartHtml = `<div class="bqs-chart-card">${hdrHtml}<div class="bqs-chart-wrap">
        <svg viewBox="0 0 ${CW} ${CH}" preserveAspectRatio="xMidYMid meet" style="width:100%;display:block;overflow:visible">
          <defs>
            <linearGradient id="bqgt2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(255,255,255,.18)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></linearGradient>
            <linearGradient id="bqga2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(61,214,140,.4)"/><stop offset="100%" stop-color="rgba(61,214,140,.05)"/></linearGradient>
            <linearGradient id="bqge2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(248,113,113,.35)"/><stop offset="100%" stop-color="rgba(248,113,113,.05)"/></linearGradient>
          </defs>
          ${yGrid}${vLines}
          <line x1="${PAD_L}" y1="${baseY}" x2="${CW-PAD_R}" y2="${baseY}" stroke="${_cBX}" stroke-width="1"/>
          <path d="${area(ptsTent)}" fill="url(#bqgt2)"/>
          <path d="${area(ptsAcert)}" fill="url(#bqga2)"/>
          <path d="${area(ptsErros)}" fill="url(#bqge2)"/>
          <path d="${smooth(ptsTent)}" fill="none" stroke="${_cTent}" stroke-width="2" stroke-linecap="round"/>
          <path d="${smooth(ptsAcert)}" fill="none" stroke="#3dd68c" stroke-width="2" stroke-linecap="round"/>
          <path d="${smooth(ptsErros)}" fill="none" stroke="#f87171" stroke-width="1.5" stroke-linecap="round"/>
          ${dots(ptsTent,_cTent,2.5)}${dots(ptsAcert,'#3dd68c',2.5)}
          ${xLabels}
        </svg>
      </div></div>`;
    }
  } catch(e) {
    console.warn('[bqStats] chart error:', e.message);
    chartHtml = `<div class="bqs-chart-card"><div class="bqs-card-hdr"><span class="bqs-card-title">Evolução</span></div><div class="bqs-chart-empty">Sem dados.</div></div>`;
  }

  // ── Foco Recomendado ──────────────────────────────────────────────────────
  let focusHtml = '';
  try {
    const allMatStats = {};
    banco.forEach(q => {
      const mat = q.matNome||q.mat||'Sem disciplina';
      const _p  = _getProg(q);
      const _h  = _getHist(q);
      if (!allMatStats[mat]) allMatStats[mat]={t:0,a:0,caderno:!!_p.errouAlgumVez,matId:q.mat||''};
      _h.forEach(h => { allMatStats[mat].t++; if(h.acertou) allMatStats[mat].a++; });
    });
    const matArr = Object.entries(allMatStats)
      .filter(([,d])=>d.t>=2)
      .map(([n,d])=>{ const e=d.t-d.a, tx=d.t>0?e/d.t:0; return {n, pct:d.t>0?Math.round(d.a/d.t*100):0, t:d.t, a:d.a, erros:e, caderno:d.caderno, matId:d.matId, score:tx*100+e*3+(d.caderno?5:0)-d.a*.5}; })
      .sort((a,b)=>b.score-a.score);
    const weakMat = matArr[0];
    const hasHistory = banco.some(q => _getHist(q).length > 0);
    if (!weakMat || !hasHistory) {
      focusHtml = '<div class="bqs-focus-empty"><div class="bqs-focus-sub">Resolva questões para gerar uma recomendação inteligente.</div></div>';
    } else if (weakMat.pct >= 90) {
      focusHtml = `<div class="bqs-focus-prio">Bom desempenho geral!</div><div class="bqs-focus-sub">Continue resolvendo para refinar análise.</div>`;
    } else {
      let focusDetail = `${weakMat.erros} erros de ${weakMat.t} tentativas (${100-weakMat.pct}% de erro).`;
      focusHtml = `<div class="bqs-focus-prio">Prioridade: <strong>${esc(weakMat.n)}</strong></div>
        <div class="bqs-focus-sub">${focusDetail}</div>
        <button class="bqs-focus-revisar" onclick="bqSubAba('banco')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Revisar Agora
        </button>`;
    }
  } catch(e) {
    console.warn('[bqStats] focus error:', e.message);
    focusHtml = '<div class="bqs-focus-empty"><div class="bqs-focus-sub">Resolva questões para gerar uma recomendação inteligente.</div></div>';
  }

  // ── Desempenho por Matéria ────────────────────────────────────────────────
  let materiasHtml = '';
  try {
    const matArrDisplay = Object.entries(byMat)
      .filter(([,d])=>d.t>0)
      .map(([n,d])=>({n, pct:pct(d.a,d.t), t:d.t, a:d.a, caderno:d.caderno}))
      .sort((a,b)=>a.pct-b.pct);
    if (!matArrDisplay.length) {
      materiasHtml = '<div class="bqs-chart-empty">Nenhuma matéria com tentativas ainda.</div>';
    } else {
      materiasHtml = matArrDisplay.map(m => {
        const col = colFor(m.pct);
        const badge = m.pct>=75?'Forte':m.pct>=50?'Melhorar':'Crítico';
        const bdgCls = m.pct>=75?'bqs-badge--g':m.pct>=50?'bqs-badge--y':'bqs-badge--r';
        const miniH=14,miniW=32;
        const bars4=[Math.round(m.pct*.9),Math.round(m.pct*.75),Math.round(m.pct*.85),m.pct];
        const miniSvg=`<svg viewBox="0 0 ${miniW} ${miniH}" width="${miniW}" height="${miniH}">${bars4.map((v,i)=>`<rect x="${i*8}" y="${miniH-Math.round(v/100*miniH)}" width="6" height="${Math.round(v/100*miniH)}" rx="1" fill="${col}" opacity="${.5+i*.17}"/>`).join('')}</svg>`;
        return `<div class="bqs-mat-item">
          <div class="bqs-mat-left"><div class="bqs-mat-name">${esc(m.n)}</div><div class="bqs-mat-sub"><span class="bqs-badge ${bdgCls}">${badge}</span> ${m.t} tentativas</div></div>
          <div class="bqs-mat-right"><span class="bqs-mat-pct" style="color:${col}">${m.pct}%</span>${miniSvg}</div>
        </div>`;
      }).join('');
    }
  } catch(e) {
    console.warn('[bqStats] materias error:', e.message);
    materiasHtml = '<div class="bqs-chart-empty">Nenhuma matéria com tentativas ainda.</div>';
  }

  // ── Últimas Atividades ────────────────────────────────────────────────────
  let ultimasHtml = '';
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const relDate = dateStr => {
      const dt = _parseBR(dateStr); if(!dt) return dateStr||'';
      const diff = Math.round((today-dt)/86400000);
      return diff===0?'Hoje':diff===1?'Ontem':diff<=7?`Há ${diff} dias`:String(dateStr).slice(0,5);
    };
    const actRows = [];
    _allBancoSessoes.forEach(s => {
      const mats = s.materias && Object.keys(s.materias).length ? s.materias : null;
      if (mats) {
        Object.entries(mats).forEach(([mn,d]) => {
          actRows.push({mat:mn, pct:pct(d.acertos,d.total), total:d.total, acertos:d.acertos, dateStr:s.data, hora:s.hora||'', sortKey:s.timestamp||0});
        });
      } else {
        actRows.push({mat:s.origem==='caderno'?'Caderno de Erros':'Questões', pct:pct(s.acertos,s.total), total:s.total, acertos:s.acertos, dateStr:s.data, hora:s.hora||'', sortKey:s.timestamp||0});
      }
    });
    actRows.sort((a,b)=>b.sortKey-a.sortKey||b.hora.localeCompare(a.hora));
    const top4 = actRows.slice(0,4);
    if (!top4.length) {
      ultimasHtml = '<div class="bqs-last-empty">Nenhuma atividade registrada ainda.</div>';
    } else {
      const colAct = p => p>=75?'#3dd68c':p>=50?'#C6A15B':'#f87171';
      ultimasHtml = top4.map(r => `<div class="bqs-act-row">
        <div class="bqs-act-left"><span class="bqs-act-mat">${esc(r.mat)}</span><span class="bqs-act-meta">${relDate(r.dateStr)} · ${r.total===1?'1 questão':`${r.total} questões`}</span></div>
        <div class="bqs-act-right"><div class="bqs-act-bar-wrap"><div class="bqs-act-bar" style="width:${r.pct}%;background:${colAct(r.pct)}"></div></div><span class="bqs-act-pct" style="color:${colAct(r.pct)}">${r.pct}%</span></div>
      </div>`).join('');
    }
  } catch(e) {
    console.warn('[bqStats] atividades error:', e.message);
    ultimasHtml = '<div class="bqs-last-empty">Nenhuma atividade registrada ainda.</div>';
  }

  // ── Por Banca ─────────────────────────────────────────────────────────────
  let bancaHtml = '';
  try {
    const bancaArr = Object.entries(byBanca)
      .filter(([,d])=>d.t>0)
      .map(([n,d])=>({n, p:pct(d.a,d.t), t:d.t, a:d.a, e:d.t-d.a}))
      .sort((a,b)=>b.p-a.p||b.t-a.t);
    if (bancaArr.length) {
      const rows = bancaArr.map(r => {
        const col = colFor(r.p);
        const badge = r.p>=75?'FORTE':r.p>=50?'MELHORAR':'CRÍTICO';
        const bdgCls = r.p>=75?'bqs-badge--g':r.p>=50?'bqs-badge--y':'bqs-badge--r';
        return `<div class="bqs-banca-row2">
          <div class="bqs-banca-top"><span class="bqs-banca-name2">${esc(r.n)}</span><span class="bqs-badge ${bdgCls}">${badge}</span></div>
          <div class="bqs-banca-meta">${r.t} questão${r.t!==1?'s':''} · ${r.a} acerto${r.a!==1?'s':''} · ${r.e} erro${r.e!==1?'s':''}</div>
          <div class="bqs-banca-bar-row"><div class="bqs-banca-bar2"><div class="bqs-banca-fill2" style="width:${r.p}%;background:${col}"></div></div><span class="bqs-banca-pct2" style="color:${col}">${r.p}%</span></div>
        </div>`;
      }).join('');
      bancaHtml = `<div class="bqs-card">
        <div class="bqs-card-hdr"><span class="bqs-card-title">Por Banca</span></div>
        ${rows}
      </div>`;
    } else {
      bancaHtml = `<div class="bqs-card">
        <div class="bqs-card-hdr"><span class="bqs-card-title">Por Banca</span></div>
        <div class="bqs-banca-empty">Nenhuma banca com tentativas ainda.</div>
      </div>`;
    }
  } catch(e) {
    console.warn('[bqStats] banca error:', e.message);
    bancaHtml = '';
  }

  // ── ASSEMBLE — sempre renderiza, sem early return por dados zerados ────────
  el.innerHTML = `
  <div class="bqs-page">
    <div class="bqs-header">
      <span class="bqs-title">Desempenho</span>
      <div class="bqs-pills">${pillsHtml}</div>
    </div>
    <div class="bqs-main-grid">
      <div class="bqs-col-left">
        <div class="bqs-card bqs-card--main">
          <div class="bqs-card-hdr">
            <span class="bqs-card-title">Desempenho Geral</span>
            <span class="bqs-card-sub">${periodLabel}</span>
          </div>
          <div class="bqs-dg-body">${gaugeSVG}${statsRow}</div>
        </div>
        ${chartHtml}
        <div class="bqs-col-left-extra">
          <div class="bqs-card">
            <div class="bqs-card-hdr"><span class="bqs-card-title">Caderno de Erros</span></div>
            ${cadernoHtml}
          </div>
          ${bancaHtml}
        </div>
      </div>
      <div class="bqs-col-right">
        <div class="bqs-card bqs-card--focus">
          <div class="bqs-card-hdr"><span class="bqs-card-title">Foco Recomendado</span></div>
          ${focusHtml}
        </div>
        <div class="bqs-card">
          <div class="bqs-card-hdr"><span class="bqs-card-title">Desempenho por Matéria</span></div>
          ${materiasHtml}
        </div>
        <div class="bqs-card bqs-card--last">
          <div class="bqs-card-hdr"><span class="bqs-card-title">Últimas Atividades</span></div>
          ${ultimasHtml}
        </div>
      </div>
    </div>
  </div>`;
}



function bqSubAba(sub){
// futuro: exibir subaba 'gerenciar' apenas para role admin/moderador via Firebase RBAC
const paineis={
'banco':'bq-painel-banco',
'resolver':'bq-painel-resolver',
'adicionar':'bq-painel-adicionar',
'gerenciar':'bq-painel-gerenciar',
'stats':'bq-painel-stats'
};
Object.values(paineis).forEach(id=>{
const el=document.getElementById(id); if(el) el.style.display='none';
});
const alvo=paineis[sub];
const el=document.getElementById(alvo); if(el) el.style.display='block';
const btnMap={
banco:'bq-sub-banco',
resolver:'bq-sub-resolver',
adicionar:'bq-sub-adicionar',
gerenciar:'bq-sub-gerenciar',
stats:'bq-sub-stats'
};
Object.values(btnMap).forEach(id=>{
const btn=document.getElementById(id); if(btn) btn.classList.remove('active');
});
const btn=document.getElementById(btnMap[sub]); if(btn) btn.classList.add('active');
if(sub==='banco') buildBancoCompleto();
if(sub==='resolver') buildBanco();
if(sub==='gerenciar'){bqGerIniciarSelects();bqGerAplicarFiltros();}
if(sub==='adicionar') bqEscolherDestino('banco'); // init to Banco on open
if(sub==='stats') bqRenderEstatisticas();
try{ if(typeof topbarSubTabUpdate==='function') topbarSubTabUpdate('banco', sub); }catch(e){}
}
let _meMin=2;
function meSetMin(btn){
document.querySelectorAll('[data-min]').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
_meMin=parseInt(btn.dataset.min)||2;
const lbl=document.getElementById('me-min-label');if(lbl) lbl.textContent=_meMin;
buildMaisErradas();
}
function buildMaisErradas(){
const fmat=document.getElementById('me-f-mat');
if(fmat&&fmat.options.length<=1){
QUESTOES_MATERIAS.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;fmat.appendChild(o);});
}
const matFiltro=fmat?.value||'';
const motivoFiltro=document.getElementById('me-f-motivo')?.value||'';
// FASE 9.4.6: usar progresso do concurso ativo
let pool=ST.banco.filter(q=>{
const _p=(typeof bqGetProgresso==='function')?bqGetProgresso(q):q;
const _h=(typeof bqGetHistorico==='function')?bqGetHistorico(q):(q.historico||[]);
if(!_p.errouAlgumVez||!_h.length) return false;
const erros=_h.filter(h=>!h.acertou);
return erros.length>=_meMin;
});
if(matFiltro) pool=pool.filter(q=>q.mat===matFiltro);
if(motivoFiltro) pool=pool.filter(q=>{
const _h=(typeof bqGetHistorico==='function')?bqGetHistorico(q):(q.historico||[]);
return _h.some(h=>!h.acertou&&(h.motivo||'').toLowerCase().includes(motivoFiltro.toLowerCase()));
});
pool.sort((a,b)=>{
const _ha=(typeof bqGetHistorico==='function')?bqGetHistorico(a):(a.historico||[]);
const _hb=(typeof bqGetHistorico==='function')?bqGetHistorico(b):(b.historico||[]);
const ea=_ha.filter(h=>!h.acertou).length;
const eb=_hb.filter(h=>!h.acertou).length;
return eb-ea;
});
const totalErros=pool.reduce((acc,q)=>{
const _h=(typeof bqGetHistorico==='function')?bqGetHistorico(q):(q.historico||[]);
return acc+_h.filter(h=>!h.acertou).length;
},0);
const rt=document.getElementById('me-resumo-total');if(rt) rt.textContent=`${pool.length} questão(ões)`;
const re=document.getElementById('me-resumo-erros');if(re) re.textContent=`${totalErros} erros no total`;
const list=document.getElementById('me-list');
if(!list) return;
list.innerHTML='';
if(!pool.length){
list.innerHTML=`<div style="font-size:.78rem;color:var(--dim);font-style:italic;text-align:center;padding:2rem 1rem">
Nenhuma questão com ${_meMin}+ erros${matFiltro||motivoFiltro?' com esses filtros':''}.
</div>`;
return;
}
pool.forEach((q,rank)=>{
const erros=q.historico.filter(h=>!h.acertou);
const acertos=q.historico.filter(h=>h.acertou);
const taxa=q.historico.length>0?Math.round(acertos.length/q.historico.length*100):0;
const motivoCount={};
erros.forEach(h=>{
if(h.motivo){
const m=h.motivo.split(':')[0].trim();
motivoCount[m]=(motivoCount[m]||0)+1;
}
});
const motivoTop=Object.entries(motivoCount).sort((a,b)=>b[1]-a[1]).slice(0,3);
const card=document.createElement('div');
card.className='me-card';
card.innerHTML=`
<div class="me-card-header">
<div class="me-badge-erros">✗ ${erros.length}</div>
<div style="flex:1;min-width:0">
<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px">
${q.codigo?`<span class="err-card-num">${q.codigo}</span>`:''}
<span style="font-family:'Oswald',sans-serif;font-size:.75rem;font-weight:700;color:var(--gold)">${q.matNome||'—'}</span>
${q.banca?`<span style="font-size:.58rem;color:var(--blue);font-family:'Oswald',sans-serif">${q.banca}</span>`:''}
${q.massificada?'<span class="tag-massificada">✦ Massificada</span>':''}
</div>
${q.assunto?`<div style="font-size:.62rem;color:var(--muted);font-style:italic">${_assuntos(q.assunto).map(a=>escapeHtml(a)).join(' · ')}</div>`:''}
</div>
<div style="text-align:right;flex-shrink:0">
<div style="font-size:.62rem;color:var(--muted)">${q.historico.length} tentativas</div>
<div style="font-size:.72rem;font-weight:700;color:${taxa>=50?'var(--green)':'var(--red)'}">${taxa}% acerto</div>
</div>
</div>
${q.textoRef?`
<div style="padding:.5rem .9rem;border-bottom:1px solid rgba(248,113,113,.1)">
<details class="qc-texto-ref" style="margin:0">
<summary>
<span>📄 TEXTO DE REFERÊNCIA</span>
<span class="tr-arrow">▼</span>
</summary>
<div class="qc-texto-ref-body">${renderTexto(q.textoRef)}</div>
</details>
</div>`:''}
${q.enunciado?`
<div style="padding:.5rem .9rem;border-bottom:1px solid rgba(248,113,113,.1)">
<div style="font-size:.72rem;color:rgba(255,255,255,.75);line-height:1.6">${renderTexto(q.enunciado.slice(0,200))}${q.enunciado.length>200?'…':''}</div>
</div>`:''}
<div class="me-historico">
${motivoTop.length?`
<div style="margin-bottom:.6rem">
<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.3rem">Principais motivos de erro</div>
<div style="display:flex;flex-wrap:wrap;gap:4px">
${motivoTop.map(([m,n])=>`<span class="me-motivo-tag">${escapeHtml(m)} (${n}×)</span>`).join('')}
</div>
</div>`:''}
<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.4rem">Histórico completo</div>
${q.historico.slice().reverse().map(h=>{
if(!h.acertou){
return `<div class="me-erro-item">
<span class="me-erro-data">✗ ${h.data||'—'}</span>
<span class="me-erro-motivo">${h.motivo?escapeHtml(h.motivo):'<span style="color:var(--dim);font-style:italic">Motivo não registrado</span>'}</span>
</div>`;
} else {
return `<div class="me-acerto-item">
<span style="font-family:'Oswald',sans-serif;font-size:.62rem;color:var(--green);min-width:75px">✓ ${h.data||'—'}</span>
<span>Acertou${h.acertosConsecutivos?` · ${h.acertosConsecutivos}º seguido`:''}</span>
</div>`;
}
}).join('')}
${q.anotacao?`
<details style="margin-top:.5rem">
<summary style="font-size:.65rem;color:var(--blue);cursor:pointer;list-style:none">💬 Ver gabarito comentado</summary>
<div style="font-size:.7rem;color:rgba(255,255,255,.7);line-height:1.6;margin-top:.35rem;white-space:pre-wrap;padding:.4rem .5rem;background:rgba(96,165,250,.04);border-radius:6px">${renderTexto(q.anotacao)}</div>
</details>`:''}
</div>`;
list.appendChild(card);
});
}
function bqToggleStatus(btn){
document.querySelectorAll('#bq-painel-resolver .bq-fv2-status, #bq-painel-resolver .bq-status-btn').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
_bqErroBtnUpdate();
}
function initBancoSelects(){
const bsel=document.getElementById('bq-banca');
if(bsel&&bsel.options.length<=1) BANCAS.forEach(b=>{const o=document.createElement('option');o.value=b;o.textContent=b;bsel.appendChild(o);});
// FASE 9.4.14: usar lista canônica nos selects de adicionar questão
const _matsAdd=(typeof bqMateriaLista==='function')?bqMateriaLista():QUESTOES_MATERIAS;
const msel=document.getElementById('bq-mat');
if(msel&&msel.options.length<=1) _matsAdd.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;msel.appendChild(o);});
const fmat=document.getElementById('bq-f-mat');
if(fmat&&fmat.options.length<=1) _matsAdd.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;fmat.appendChild(o);});
const fbanca=document.getElementById('bq-f-banca');
if(fbanca&&fbanca.options.length<=1) BANCAS.forEach(b=>{const o=document.createElement('option');o.value=b;o.textContent=b;fbanca.appendChild(o);});
const efmat=document.getElementById('err-f-mat');
if(efmat&&efmat.options.length<=1) _matsAdd.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;efmat.appendChild(o);});
}
function bqAbaManual(){
['bq-painel-manual','bq-painel-json','bq-painel-txt'].forEach(id=>{
document.getElementById(id).style.display='none';});
document.getElementById('bq-painel-manual').style.display='block';
['bq-tab-manual','bq-tab-json','bq-tab-txt'].forEach(id=>document.getElementById(id).classList.remove('active'));
document.getElementById('bq-tab-manual').classList.add('active');
}
function bqAbaJSON(){
['bq-painel-manual','bq-painel-json','bq-painel-txt'].forEach(id=>{document.getElementById(id).style.display='none';});
document.getElementById('bq-painel-json').style.display='block';
['bq-tab-manual','bq-tab-json','bq-tab-txt'].forEach(id=>document.getElementById(id).classList.remove('active'));
document.getElementById('bq-tab-json').classList.add('active');
}
function bqAbaTXT(){
['bq-painel-manual','bq-painel-json','bq-painel-txt'].forEach(id=>{document.getElementById(id).style.display='none';});
document.getElementById('bq-painel-txt').style.display='block';
['bq-tab-manual','bq-tab-json','bq-tab-txt'].forEach(id=>document.getElementById(id).classList.remove('active'));
document.getElementById('bq-tab-txt').classList.add('active');
}
function _altsShowHide(prefix, modelo){
const wrap=document.getElementById(prefix+'-alts-wrap');
if(!wrap) return;
const isAlt=modelo==='ABCD'||modelo==='ABCDE';
wrap.style.display=isAlt?'block':'none';
const rowE=document.getElementById(prefix+'-alt-e')?.closest('.sim-form-row');
if(rowE) rowE.style.display=modelo==='ABCDE'?'flex':'none';
}
function _altsRead(prefix){
const alts={};
['a','b','c','d','e'].forEach(l=>{
const el=document.getElementById(prefix+'-alt-'+l);
if(el) alts[l.toUpperCase()]=el.value.trim();
});
return alts;
}
function _altsWrite(prefix, questoes){
if(!questoes) return;
['A','B','C','D','E'].forEach(l=>{
const el=document.getElementById(prefix+'-alt-'+l.toLowerCase());
if(el) el.value=questoes[l]||'';
});
}
function _altsClear(prefix){
['a','b','c','d','e'].forEach(l=>{
const el=document.getElementById(prefix+'-alt-'+l);
if(el) el.value='';
});
}
function bqAtualizarResposta(){
const modelo=document.getElementById('bq-modelo').value;
const sel=document.getElementById('bq-gabarito');
sel.innerHTML='';
if(modelo==='CE'){sel.innerHTML='<option value="C">Certo</option><option value="E">Errado</option><option value="ANULADA">⊘ Anulada</option>';}
else if(modelo==='ABCD'){['A','B','C','D','ANULADA'].forEach(l=>sel.innerHTML+=`<option value="${l}">${l==='ANULADA'?'⊘ Anulada':l}</option>`);}
else{['A','B','C','D','E','ANULADA'].forEach(l=>sel.innerHTML+=`<option value="${l}">${l==='ANULADA'?'⊘ Anulada':l}</option>`);}
_altsShowHide('bq', modelo);
}
function _registrarErroNaEstat(matId, assunto){
// Banco/caderno de erros tem estatísticas próprias — não afeta Estatística de Questões
}
// Fase 4: choose destination from visual cards
function bqEscolherDestino(dest) {
  const cardBanco   = document.getElementById('bq-dest-card-banco');
  const cardCaderno = document.getElementById('bq-dest-card-caderno');
  if(cardBanco)   cardBanco.classList.toggle('active',   dest==='banco');
  if(cardCaderno) cardCaderno.classList.toggle('active', dest==='caderno');
  // Sync hidden radio (preserves adicionarQuestaoManual logic)
  const radio = document.getElementById(dest==='caderno'?'bq-radio-erros':'bq-radio-banco');
  if(radio) radio.checked=true;
  // Update form title + subtitle
  const title    = document.getElementById('bq-form-title');
  const subtitle = document.getElementById('bq-form-subtitle');
  const btn      = document.getElementById('bq-add-btn');
  if(dest==='caderno'){
    if(title)    title.textContent='Adicionar ao Caderno de Erros';
    if(subtitle) subtitle.textContent='Questão entrará no banco já marcada como erro anterior.';
    if(btn){
      btn.textContent=''; // reset, will be set below
      btn.className='bq-submit-btn bq-submit-btn--caderno';
      btn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Adicionar ao Caderno de Erros';
    }
    // Hide JSON/TXT tabs — Caderno is manual-only for now
    ['bq-tab-json','bq-tab-txt'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
    bqAbaManual();
  } else {
    if(title)    title.textContent='Adicionar Questão';
    if(subtitle) subtitle.textContent='Questão será cadastrada na base geral para resolução futura.';
    if(btn){
      btn.className='bq-submit-btn bq-submit-btn--banco';
      btn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Adicionar Questão';
    }
    // Restore JSON/TXT tabs for Banco
    ['bq-tab-json','bq-tab-txt'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='';});
  }
}

function bqDestinoChange(){
const sel=document.querySelector('input[name="bq-destino"]:checked')?.value||'banco';
const lblB=document.getElementById('bq-dest-lbl-banco');
const lblE=document.getElementById('bq-dest-lbl-erros');
if(lblB){lblB.style.borderColor=sel==='banco'?'rgba(245,200,0,.45)':'var(--border)';lblB.style.background=sel==='banco'?'rgba(245,200,0,.07)':'var(--surface)';}
if(lblE){lblE.style.borderColor=sel==='erros'?'rgba(248,113,113,.45)':'var(--border)';lblE.style.background=sel==='erros'?'rgba(248,113,113,.07)':'var(--surface)';}
const btn=document.getElementById('bq-add-btn');
if(btn){btn.textContent=sel==='erros'?'+ Adicionar ao Caderno de Erros':'+ Adicionar Questão';btn.style.background=sel==='erros'?'var(--red)':'';}
}
function bqJsonDestinoChange(){
const sel=document.querySelector('input[name="bq-json-destino"]:checked')?.value||'banco';
const lblB=document.getElementById('bq-json-dest-lbl-banco');
const lblE=document.getElementById('bq-json-dest-lbl-erros');
if(lblB){lblB.style.borderColor=sel==='banco'?'rgba(245,200,0,.45)':'var(--border)';lblB.style.background=sel==='banco'?'rgba(245,200,0,.07)':'var(--surface)';}
if(lblE){lblE.style.borderColor=sel==='erros'?'rgba(248,113,113,.45)':'var(--border)';lblE.style.background=sel==='erros'?'rgba(248,113,113,.07)':'var(--surface)';}
}
function bqTxtDestinoChange(){
const sel=document.querySelector('input[name="bq-txt-destino"]:checked')?.value||'banco';
const lblB=document.getElementById('bq-txt-dest-lbl-banco');
const lblE=document.getElementById('bq-txt-dest-lbl-erros');
if(lblB){lblB.style.borderColor=sel==='banco'?'rgba(245,200,0,.45)':'var(--border)';lblB.style.background=sel==='banco'?'rgba(245,200,0,.07)':'var(--surface)';}
if(lblE){lblE.style.borderColor=sel==='erros'?'rgba(248,113,113,.45)':'var(--border)';lblE.style.background=sel==='erros'?'rgba(248,113,113,.07)':'var(--surface)';}
}
function _bqMontarFlags(destino, data){
// destino 'erros' = Caderno Pessoal: nasce como questão já errada (Fase 4)
if(destino==='erros'){
// FASE 9.4.9: manter legado em q E criar progresso no concurso ativo
// A questão entra em ST.banco com flags legadas (compatibilidade)
// E o progresso no concurso ativo é criado logo após ST.banco.push via _bqPosAdicionar
return {acertosConsecutivos:0, errouAlgumVez:true, massificada:false,
historico:[{data:data, acertou:false, motivo:'adicionada_ao_caderno', resp:''}]};
}
// destino 'banco' = Banco Global: questão nova, sem histórico
return {acertosConsecutivos:0, errouAlgumVez:false, massificada:false, historico:[]};
}

// FASE 9.4.9: chamado após ST.banco.push para popular progresso por concurso
function _bqPosAdicionar(novaQ, destino){
if(destino!=='erros') return;
if(typeof bqSetProgresso!=='function') return;
// Criar progresso no concurso ativo — questão nasce no Caderno deste concurso
var progresso = {
  historico: [{data:(novaQ.data||''), acertou:false, motivo:'adicionada_ao_caderno', resp:''}],
  errouAlgumVez: true, acertosConsecutivos: 0, massificada: false,
  tentativas: 1, acertos: 0, erros: 1
};
bqSetProgresso(novaQ.id, progresso);
}
function adicionarQuestaoManual(){
const matId=document.getElementById('bq-mat').value;
if(!matId){alert('Selecione a matéria.');return;}
const enunciado=(document.getElementById('bq-enunciado').value||'').trim();
if(!enunciado){alert('O enunciado é obrigatório.');return;}
const matObj=QUESTOES_MATERIAS.find(m=>m.id===matId);
const modelo=document.getElementById('bq-modelo').value;
const assunto=(document.getElementById('bq-assunto').value||'').trim();
const hoje=new Date().toLocaleDateString('pt-BR');
const destino=document.querySelector('input[name="bq-destino"]:checked')?.value||'banco';
const flags=_bqMontarFlags(destino,hoje);
// Novos campos opcionais — Fase 1
const _ano        = (document.getElementById('bq-ano')?.value||'').trim();
const _instituicao= (document.getElementById('bq-instituicao')?.value||'').trim();
const _cargo      = (document.getElementById('bq-cargo')?.value||'').trim();
const _nivel      = document.getElementById('bq-nivel')?.value||'';
const _leis       = (document.getElementById('bq-leis')?.value||'').trim();
// origem_tipo: Fase 4 — set by flow choice (bqEscolherDestino)
const _origem_tipo= destino==='erros'?'caderno_pessoal':'banco_global';
ST.banco.push({
id:newQuestId(),
codigo:(document.getElementById('bq-codigo').value||'').trim(),
banca:(document.getElementById('bq-banca').value||'').trim(),
mat:matId, matNome:matObj?matObj.name:(typeof bqMateriaNome==='function'?bqMateriaNome(matId):matId),
assunto,
enunciado,
textoRef:(document.getElementById('bq-texto-ref')?.value||'').trim(),
tipo:modelo==='CE'?'CE':modelo==='ABCD'?'ABCD':'ABCDE',
questoes:(modelo==='ABCD'||modelo==='ABCDE')?_altsRead('bq'):null,
gabarito:document.getElementById('bq-gabarito').value,
anotacao:(document.getElementById('bq-comentado').value||'').trim(),
origem:'manual', data:hoje,
// Novos campos opcionais (sempre com fallback '')
ano:_ano, instituicao:_instituicao, cargo:_cargo, nivel:_nivel, leis:_leis,
// origem_tipo: preparação RBAC — não altera lógica atual
origem_tipo:_origem_tipo,
...flags,
});
// FASE 9.4.14.1: normalizar matNome com nome canônico
if(typeof bqMateriaNome==='function'){
  const _q=ST.banco[ST.banco.length-1];
  const _n=bqMateriaNome(_q.mat);
  if(_n) _q.matNome=_n;
}
// FASE 9.4.9: popular progresso por concurso se destino=caderno
_bqPosAdicionar(ST.banco[ST.banco.length-1], destino);
saveState();
document.getElementById('bq-codigo').value='';
document.getElementById('bq-assunto').value='';
document.getElementById('bq-enunciado').value='';
document.getElementById('bq-comentado').value='';
const tr=document.getElementById('bq-texto-ref'); if(tr) tr.value='';
// Limpar novos campos opcionais
const _fano=document.getElementById('bq-ano'); if(_fano) _fano.value='';
const _fins=document.getElementById('bq-instituicao'); if(_fins) _fins.value='';
const _fcar=document.getElementById('bq-cargo'); if(_fcar) _fcar.value='';
const _fniv=document.getElementById('bq-nivel'); if(_fniv) _fniv.value='';
const _fle=document.getElementById('bq-leis'); if(_fle) _fle.value='';
_altsClear('bq');
buildBanco(); renderQuestoes(); renderDashboard();
const btn=document.getElementById('bq-add-btn');
if(btn){const o=btn.textContent;btn.textContent='✓ Adicionada!';btn.style.background='var(--green)';setTimeout(()=>{btn.textContent=o;btn.style.background='';},1500);}
}
function importarBancoJSON(){
const fi=document.getElementById('bq-json-file');
if(!fi.files.length){alert('Selecione um arquivo JSON.');return;}
const destino=document.querySelector('input[name="bq-json-destino"]:checked')?.value||'banco';
const reader=new FileReader();
reader.onload=e=>{
try{
const parsed=JSON.parse(e.target.result);
// CORREÇÃO: aceita dois formatos para retrocompatibilidade total:
//   1) Array puro de questões (formato manual / pré-correção)
//   2) Objeto envelopado com chave "questoes" (formato gerado por exportarBancoJSON)
let arr;
let isRoundTrip=false; // true quando o JSON veio de um export do próprio sistema
if(Array.isArray(parsed)){
  arr=parsed;
} else if(parsed && typeof parsed==='object' && Array.isArray(parsed.questoes)){
  arr=parsed.questoes;
  isRoundTrip=true;
} else {
  throw new Error('JSON deve ser um array de questões ou um objeto com a chave "questoes".');
}
const data=new Date().toLocaleDateString('pt-BR');
let _importSkipped=0;
arr.forEach(q=>{
const matId=resolverMatId(q.materia||q.mat||'');
// FASE 9.4.14.1: rejeitar matérias inválidas — sem conversão de legado
if(typeof bqValidarMateria==='function'){
  const _vr=bqValidarMateria(matId||q.mat||q.materia||'');
  if(!_vr.valid){
    console.warn('[BQ Import] Questão ignorada — matéria inválida:',q.mat||q.materia,'→',_vr.reason);
    _importSkipped++;
    return;
  }
}
const matObj=QUESTOES_MATERIAS.find(m=>m.id===matId);
const modelo=(q.modelo||q.tipo||'CE').toUpperCase();
const assunto=q.assunto||q.topico||'';
const flags=_bqMontarFlags(destino,data);
// Round-trip: se o JSON foi exportado pelo próprio sistema, preserva histórico/flags originais.
// Se for array puro (legado/manual), usa apenas as flags padrão de destino (banco/erros).
// Tipo: usar q.tipo se existir; se não, aceitar q.modalidade como alias; senão usa modelo derivado
// Nunca salvar campo 'modalidade' — internamente sempre 'tipo'
const tipoFinal = (() => {
  const raw = (q.tipo || q.modalidade || modelo || 'CE').toUpperCase();
  if(raw==='CE') return 'CE';
  if(raw==='ABCD') return 'ABCD';
  return 'ABCDE';
})();
// origem_tipo: campo preparatório RBAC — questões sem ele tratadas como 'banco_global'
const origemTipo = q.origem_tipo || (destino==='erros'?'caderno_pessoal':'banco_global');
const baseQuestao={
id:newQuestId(), codigo:q.codigo||'', banca:q.banca||'',
mat:matId, matNome:matObj?matObj.name:(q.materia||''),
assunto,
enunciado:q.enunciado||q.texto||'',
textoRef:q.texto_ref||q.textoRef||q.texto_referencia||'',
tipo:tipoFinal,   // sempre 'tipo' — nunca 'modalidade' no storage
gabarito:q.gabarito||q.resposta||'',
// anotacao: accept multiple key names for compatibility
anotacao:q.gabarito_comentado||q.anotacao||q.gabaritoComentado||q.comentario||'',
origem:isRoundTrip?(q.origem||'json'):'json', data,
// Novos campos opcionais (backward compatible — fallback '')
ano:q.ano||'', instituicao:q.instituicao||q.institution||'',
cargo:q.cargo||'', nivel:q.nivel||'', leis:q.leis||'',
origem_tipo:origemTipo,
...flags,
};
if(isRoundTrip){
  // Preserva campos legados para retrocompatibilidade
  if(Array.isArray(q.historico)) baseQuestao.historico=q.historico.map(h=>({
    data:h.data||'', acertou:!!h.acertou, motivo:h.motivo||''
  }));
  if(typeof q.acertosConsecutivos==='number') baseQuestao.acertosConsecutivos=q.acertosConsecutivos;
  if(typeof q.errouAlgumVez==='boolean') baseQuestao.errouAlgumVez=q.errouAlgumVez;
  if(typeof q.massificada==='boolean') baseQuestao.massificada=q.massificada;
}
ST.banco.push(baseQuestao);
// FASE 9.4.14.1: atualizar matNome com nome canônico (sem conversão de legado)
if(typeof bqMateriaNome==='function'){
  const _n=bqMateriaNome(baseQuestao.mat);
  if(_n) baseQuestao.matNome=_n;
}
// FASE 9.4.9: popular progresso por concurso ao importar
// Usar 'progressoConcursoAtivo' do export novo, ou fallback para historico/flags legados
if(typeof bqSetProgresso==='function' && typeof bqGetProgresso==='function'){
  const qid = baseQuestao.id;
  // Só popular se não houver progresso existente (não sobrescrever)
  var existente = bqGetProgresso(qid);
  var temExistente = existente && (existente.historico||[]).length > 0;
  if(!temExistente){
    // Preferir bloco de progresso do concurso ativo se disponível no export
    var src = (q.progressoConcursoAtivo && (q.progressoConcursoAtivo.historico||[]).length)
      ? q.progressoConcursoAtivo
      : (isRoundTrip && (baseQuestao.historico||[]).length)
        ? { historico: baseQuestao.historico,
            errouAlgumVez: baseQuestao.errouAlgumVez||false,
            acertosConsecutivos: baseQuestao.acertosConsecutivos||0,
            massificada: baseQuestao.massificada||false }
        : null;
    if(src) bqSetProgresso(qid, src);
  }
}
});
saveState(); fi.value=''; buildBanco(); buildBancoCompleto(); renderQuestoes(); renderDashboard();
const _importOk = arr.length - _importSkipped;
alert(`✅ ${_importOk} questão(ões) importada(s) para o ${destino==='erros'?'Caderno de Erros':'Questões'}!` + (_importSkipped?`\n⚠️ ${_importSkipped} ignorada(s) por matéria inválida — verifique o console.`:''));
}catch(err){alert('Erro no JSON: '+err.message);}
};
reader.readAsText(fi.files[0]);
}
function importarBancoTXT(){
const fi=document.getElementById('bq-txt-file');
if(!fi.files.length){alert('Selecione um arquivo TXT.');return;}
const destino=document.querySelector('input[name="bq-txt-destino"]:checked')?.value||'banco';
const reader=new FileReader();
reader.onload=e=>{
const txt=e.target.result;
const blocos=txt.split(/\n---\n|\n{2,}/).filter(b=>b.trim()&&!b.trim().startsWith('#'));
let count=0;
const data=new Date().toLocaleDateString('pt-BR');
blocos.forEach(bloco=>{
if(!bloco.trim()||bloco.trim().startsWith('#')) return;
const campos=_parseTXTBloco(bloco);
const enunciado=(campos['ENUNCIADO']||'').trim();
if(!enunciado) return;
// FASE 9.4.14.1: aceitar apenas código canônico novo
const matId=resolverMatId(campos['DISCIPLINA']||campos['MATERIA']||'');
if(typeof bqValidarMateria==='function'){
  const _vt=bqValidarMateria(matId||campos['DISCIPLINA']||campos['MATERIA']||'');
  if(!_vt.valid){
    console.warn('[BQ TXT Import] Bloco ignorado — mat inválida:',campos['DISCIPLINA']||campos['MATERIA'],'→',_vt.reason);
    return;
  }
}
const matObj=QUESTOES_MATERIAS.find(m=>m.id===matId);
const modelo=(campos['MODELO']||'CE').toUpperCase();
const assunto=campos['ASSUNTO']||campos['TOPICO']||'';
const flags=_bqMontarFlags(destino,data);
// MODALIDADE no TXT é alias de MODELO — mapeia para 'tipo' internamente
// Accept TIPO (current), MODALIDADE (Fase 1+), MODELO (legacy) — all map to 'tipo'
const tipoTXT = (() => {
  const raw = (campos['TIPO']||campos['MODALIDADE']||campos['MODELO']||'CE').toUpperCase();
  if(raw==='CE') return 'CE';
  if(raw==='ABCD') return 'ABCD';
  return 'ABCDE';
})();
const origemTipoTXT = destino==='erros'?'caderno_pessoal':'banco_global';
ST.banco.push({
id:newQuestId(),
codigo:campos['CODIGO']||campos['QUESTAO']||'',
banca:campos['BANCA']||'',
mat:matId, matNome:matObj?matObj.name:(campos['MATERIA']||''),
assunto,
enunciado,
textoRef:(campos['TEXTO_REF']||campos['TEXTO_REFERENCIA']||campos['REFERENCIA']||'').trim(),
tipo:tipoTXT,  // sempre 'tipo' — MODALIDADE/MODELO/TIPO são aliases de entrada
gabarito:campos['GABARITO']||campos['RESPOSTA']||'',
// GABARITO_COMENTADO (new) | COMENTADO (legacy) | GABARITO_COMENTADO_BEGIN block
anotacao:(campos['GABARITO_COMENTADO']||campos['COMENTADO']||'').trim(),
origem:'txt', data,
// Novos campos opcionais (backward compatible — fallback '')
ano:campos['ANO']||'',
instituicao:campos['INSTITUICAO']||campos['INSTITUIÇÃO']||'',
cargo:campos['CARGO']||'',
nivel:campos['NIVEL']||campos['NÍVEL']||'',
leis:campos['LEIS']||'',
origem_tipo:origemTipoTXT,
...flags,
});
// FASE 9.4.14: normalizar matéria para código canônico
// FASE 9.4.14.1: atualizar matNome com nome canônico
if(typeof bqMateriaNome==='function'){const _ql=ST.banco[ST.banco.length-1];const _nl=bqMateriaNome(_ql.mat);if(_nl)_ql.matNome=_nl;}
// FASE 9.4.9: popular progresso por concurso se destino=caderno
_bqPosAdicionar(ST.banco[ST.banco.length-1], destino);
count++;
});
saveState(); fi.value=''; buildBanco(); buildBancoCompleto(); renderQuestoes(); renderDashboard();
alert(`✅ ${count} questão(ões) importada(s) para o ${destino==='erros'?'Caderno de Erros':'Questões'}!`);
};
reader.readAsText(fi.files[0]);
}
// Caderno three-state button (mirrors _bqBancoBtnClick pattern)
function _bqErroBtnUpdate(){
const btn=document.getElementById('bq-erro-btn');
if(!btn) return;
const fields=['bq-f-mat','bq-f-assunto','bq-f-banca','bq-f-modelo','bq-f-nivel',
               'bq-f-ano','bq-f-instituicao','bq-f-cargo','bq-f-leis'];
const pwField=document.getElementById('bq-f-palavra');
const hasPending=fields.some(id=>{const el=document.getElementById(id);return el&&!el.disabled&&el.value;})
                 ||(pwField&&pwField.value.trim());
if(hasPending){
  btn.textContent='Adicionar Filtros';
} else if(bqFiltrosAtivos.length>0){
  btn.textContent='Resolver Questões';
} else {
  btn.textContent='Resolver sem Filtros';
}
}
function _bqErroBtnClick(){
const btn=document.getElementById('bq-erro-btn');
const label=btn?btn.textContent.trim():'';
if(label==='Adicionar Filtros'){
  bqAdicionarFiltro();
} else if(label==='Resolver Questões'){
  iniciarResolucaoCaderno();
} else {
  // Resolver sem Filtros — resolve all caderno questions
  const pool=ST.banco.filter(q=>(typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez));
  if(!pool.length){alert('Nenhuma questão no caderno de erros ainda.');return;}
  resol_modoMass=false; resol_modoBanco=false;
  abrirModoResolucaoModal(pool,'📕 Caderno de Erros');
}
}

function bqAdicionarFiltro(){
let adicionou=false;
const statusBtn=document.querySelector('.bq-fv2-status.active,.bq-status-btn.active');
const status=statusBtn?statusBtn.dataset.val:'';
const matId=document.getElementById('bq-f-mat')?.value||'';
const assunto=document.getElementById('bq-f-assunto')?.value||'';
const banca=document.getElementById('bq-f-banca')?.value||'';
const modelo=document.getElementById('bq-f-modelo')?.value||'';
const nivel=document.getElementById('bq-f-nivel')?.value||'';
const ano=document.getElementById('bq-f-ano')?.value||'';
const instituicao=document.getElementById('bq-f-instituicao')?.value||'';
const cargo=document.getElementById('bq-f-cargo')?.value||'';
const leis=document.getElementById('bq-f-leis')?.value||'';
const palavra=(document.getElementById('bq-f-palavra')?.value||'').trim();
if(status && status!=='todas'){
const labels={novas:'Não resolvidas',acertei:'Acertei',errei:'Errei',massificadas:'Massificadas'};
if(!bqFiltrosAtivos.find(f=>f.tipo==='status'&&f.valor===status)){
bqFiltrosAtivos=bqFiltrosAtivos.filter(f=>f.tipo!=='status');
bqFiltrosAtivos.push({tipo:'status',valor:status,label:'Status: '+labels[status]});
adicionou=true;
}
document.querySelectorAll('.bq-status-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
}
if(matId){
const matObj=QUESTOES_MATERIAS.find(m=>m.id===matId);
if(matObj && !bqFiltrosAtivos.find(f=>f.tipo==='mat'&&f.valor===matId)){
bqFiltrosAtivos.push({tipo:'mat',valor:matId,label:'Disciplina: '+matObj.name});
adicionou=true;
}
}
if(assunto){
if(!bqFiltrosAtivos.find(f=>f.tipo==='assunto'&&f.valor===assunto)){
_assuntos(assunto).forEach(a=>{
if(!bqFiltrosAtivos.find(f=>f.tipo==='assunto'&&f.valor===a))
bqFiltrosAtivos.push({tipo:'assunto',valor:a,label:'Assunto: '+a});
});
adicionou=true;
}
}
if(banca){
if(!bqFiltrosAtivos.find(f=>f.tipo==='banca'&&f.valor===banca)){
bqFiltrosAtivos.push({tipo:'banca',valor:banca,label:'Banca: '+banca});
adicionou=true;
}
}
if(modelo){
const mLabel=modelo==='CE'?'Certo/Errado':'Múltipla Escolha';
if(!bqFiltrosAtivos.find(f=>f.tipo==='modelo'&&f.valor===modelo)){
bqFiltrosAtivos=bqFiltrosAtivos.filter(f=>f.tipo!=='modelo');
bqFiltrosAtivos.push({tipo:'modelo',valor:modelo,label:'Modelo: '+mLabel});
adicionou=true;
}
}
if(palavra){
if(!bqFiltrosAtivos.find(f=>f.tipo==='palavra'&&f.valor===palavra)){
bqFiltrosAtivos.push({tipo:'palavra',valor:palavra,label:'Palavra: "'+palavra+'"'});
adicionou=true;
}
}
// New fields — Fase 7
if(nivel){const nLabels={fundamental:'Fundamental',medio:'Médio',superior:'Superior'};if(!bqFiltrosAtivos.find(f=>f.tipo==='nivel'&&f.valor===nivel)){bqFiltrosAtivos=bqFiltrosAtivos.filter(f=>f.tipo!=='nivel');bqFiltrosAtivos.push({tipo:'nivel',valor:nivel,label:'Nível: '+(nLabels[nivel]||nivel)});adicionou=true;}}
if(ano){if(!bqFiltrosAtivos.find(f=>f.tipo==='ano'&&f.valor===ano)){bqFiltrosAtivos=bqFiltrosAtivos.filter(f=>f.tipo!=='ano');bqFiltrosAtivos.push({tipo:'ano',valor:ano,label:'Ano: '+ano});adicionou=true;}}
if(instituicao){if(!bqFiltrosAtivos.find(f=>f.tipo==='instituicao'&&f.valor===instituicao)){bqFiltrosAtivos.push({tipo:'instituicao',valor:instituicao,label:'Instituição: '+instituicao});adicionou=true;}}
if(cargo){if(!bqFiltrosAtivos.find(f=>f.tipo==='cargo'&&f.valor===cargo)){bqFiltrosAtivos.push({tipo:'cargo',valor:cargo,label:'Cargo: '+cargo});adicionou=true;}}
if(leis){if(!bqFiltrosAtivos.find(f=>f.tipo==='leis'&&f.valor===leis)){bqFiltrosAtivos.push({tipo:'leis',valor:leis,label:'Lei: "'+leis+'"'});adicionou=true;}}
if(!adicionou){
alert('Selecione ao menos um filtro antes de adicionar.');
return;
}
['bq-f-mat','bq-f-assunto','bq-f-banca','bq-f-modelo','bq-f-nivel','bq-f-ano','bq-f-instituicao','bq-f-cargo','bq-f-leis'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
const fpal=document.getElementById('bq-f-palavra'); if(fpal) fpal.value='';
bqFiltradosCache=true;
bqRenderTags();
bqRender();
_bqErroBtnUpdate(); // shift to "Resolver Questões" after apply
}
function bqRemoverFiltro(idx){
bqFiltrosAtivos.splice(idx,1);
bqRenderTags(); bqRender();
_bqErroBtnUpdate();
}
function bqRenderTags(){
const wrap=document.getElementById('bq-filtros-ativos');
if(!wrap) return;
wrap.innerHTML='';
bqFiltrosAtivos.forEach((f,i)=>{
const tipoClass={status:'tag-status',mat:'tag-mat',banca:'tag-banca',modelo:'tag-modelo',palavra:'tag-palavra',assunto:'tag-mat'}[f.tipo]||'';
const tag=document.createElement('div');
tag.className=`bq-tag-ativo ${tipoClass}`;
tag.innerHTML=`${f.label}<span class="bq-tag-x" onclick="bqRemoverFiltro(${i})">✕</span>`;
wrap.appendChild(tag);
});
const resumo=document.getElementById('bq-filtro-resumo');
if(resumo){
if(bqFiltrosAtivos.length===0){
  resumo.textContent='';
} else {
  const n=bqGetFiltradas().length;
  resumo.textContent=`${bqFiltrosAtivos.length} filtro(s) ativo(s) — ${n} questão(ões)`;
}
}
_bqErroBtnUpdate();
}
function bqSetStatus(status,btn){  }
function bqLimparFiltros(){
bqFiltrosAtivos=[];
bqFiltradosCache=null;
['bq-f-mat','bq-f-assunto','bq-f-banca','bq-f-modelo','bq-f-nivel','bq-f-ano','bq-f-instituicao','bq-f-cargo','bq-f-leis'].forEach(id=>{
const el=document.getElementById(id); if(el)el.value='';
});
const pw=document.getElementById('bq-f-palavra'); if(pw) pw.value='';
document.querySelectorAll('#bq-painel-resolver .bq-fv2-status, .bq-status-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
bqOnMatChange(); // reset Assunto to disabled
bqRenderTags();
bqRender();
_bqErroBtnUpdate();
}
function bqGetFiltradas(){
// FASE 9.4.6: filtrar pelo progresso do concurso ativo
let pool=ST.banco.filter(q=>(typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez));
const activeStatus=document.querySelector('#bq-painel-resolver .bq-fv2-status.active, #bq-painel-resolver .bq-status-btn.active');
const statusVal=activeStatus?activeStatus.dataset.val:'todas';
if(statusVal&&statusVal!=='todas'){
  const ult=q=>{const _h=(typeof bqGetHistorico==='function')?bqGetHistorico(q):(q.historico||[]);return _h.length?_h[_h.length-1]:null;};
  if(statusVal==='errei')       pool=pool.filter(q=>bqContarErrosConsecutivos(q)>0);
  if(statusVal==='acertei')     pool=pool.filter(q=>{const u=ult(q);return u&&u.acertou===true;});
  if(statusVal==='massificadas') pool=pool.filter(q=>(typeof bqGetProgresso==='function'?bqGetProgresso(q):q).massificada);
}
// Also apply status if in bqFiltrosAtivos (legacy path)
for(const f of bqFiltrosAtivos){
  if(f.tipo!=='status') continue;
  const ult=q=>q.historico&&q.historico.length?q.historico[q.historico.length-1]:null;
  if(f.valor==='errei')       pool=pool.filter(q=>bqContarErrosConsecutivos(q)>0);
  if(f.valor==='acertei')     pool=pool.filter(q=>{const u=ult(q);return u&&u.acertou===true;});
  if(f.valor==='massificadas') pool=pool.filter(q=>q.massificada);
}
// Group non-status filters: OR within type, AND between types
const grupos={};
for(const f of bqFiltrosAtivos){
  if(f.tipo==='status') continue;
  if(!grupos[f.tipo]) grupos[f.tipo]=[];
  grupos[f.tipo].push(f.valor);
}
pool=pool.filter(q=>{
  for(const [tipo,valores] of Object.entries(grupos)){
    const passa=valores.some(val=>{
      switch(tipo){
        case 'mat':       return q.mat===val;
        case 'assunto':   return _assuntoMatch(q.assunto,val);
        case 'banca':     return q.banca===val;
        case 'modelo':    return (q.tipo||'').toUpperCase()===val.toUpperCase();
        case 'nivel':     return (q.nivel||'').toLowerCase()===(val||'').toLowerCase();
        case 'ano':       return (q.ano||'')===val;
        case 'instituicao': return (q.instituicao||'').toLowerCase().includes(val.toLowerCase());
        case 'cargo':     return (q.cargo||'').toLowerCase().includes(val.toLowerCase());
        case 'leis':      return (q.leis||'').toLowerCase().includes(val.toLowerCase());
        case 'palavra': {
          const kw=val.toLowerCase();
          return !!(q.enunciado?.toLowerCase().includes(kw)||q.codigo?.toLowerCase().includes(kw)||_assuntoMatch(q.assunto,kw));
        }
        default: return true;
      }
    });
    if(!passa) return false;
  }
  return true;
});
return pool;
}
function bqGetTag(q){
const h=q.historico||[];
const total=h.length;
if(!total) return `<span class="tag-nova">Nova</span>`;
const acertos=h.filter(x=>x.acertou).length;
const erros=h.filter(x=>!x.acertou).length;
const consec=q.acertosConsecutivos||0;
if(q.massificada) return `<span class="tag-massificada">✦ Massificada</span>`;
if(consec>=2) return `<span class="acertos-badge">✓ ${consec} acertos seguidos</span>`;
if(consec===1) return `<span class="acertos-badge">✓ 1º acerto</span>`;
if(erros>0&&acertos===0){
const s=erros===1?'vez':'vezes';
return `<span class="tag-errada">✗ Errei ${erros} ${s}</span>`;
}
if(erros>0){
const s=erros===1?'vez':'vezes';
return `<span class="tag-errada">✗ ${erros} erro(s)</span>`;
}
const s=total===1?'vez':'vezes';
return `<span class="tag-nova" style="color:var(--gold);background:rgba(245,200,0,.1);border-color:rgba(245,200,0,.3)">Resolvida ${total} ${s}</span>`;
}
// ── BANCO COMPLETO (nova aba principal) ──────────────────────────
let bqBancoFiltrosAtivos=[];
let bqBancoFiltradosCache=null;
let bqBancoStatusAtivo='todas';

function buildBancoCompleto(){
if(!document.getElementById('tab-banco')?.classList.contains('active')) return;
initBancoSelects();
bqRenderBancoStats();
bqBancoRenderTags();
bqRenderBancoList();
}

function bqRenderBancoStats(){
// FASE 9.4.6: usar progresso do concurso ativo para contadores do Caderno
const total=ST.banco.length;
const comHistorico=ST.banco.filter(q=>{const _h=(typeof bqGetHistorico==='function')?bqGetHistorico(q):(q.historico||[]);return _h.length>0;});
const acertadas=comHistorico.filter(q=>{
const _h=(typeof bqGetHistorico==='function')?bqGetHistorico(q):(q.historico||[]);
const _p=(typeof bqGetProgresso==='function')?bqGetProgresso(q):q;
const ult=_h[_h.length-1];
return ult&&ult.acertou&&!_p.errouAlgumVez;
}).length;
const comErro=ST.banco.filter(q=>(typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez)).length;
const novas=ST.banco.filter(q=>{const _h=(typeof bqGetHistorico==='function')?bqGetHistorico(q):(q.historico||[]);return !_h.length;}).length;
const bt=document.getElementById('bq-banco-total');if(bt) bt.textContent=total;
const ba=document.getElementById('bq-banco-acertos');if(ba) ba.textContent=total-comErro-novas;
const be=document.getElementById('bq-banco-erros');if(be) be.textContent=comErro;
const bn=document.getElementById('bq-banco-novas');if(bn) bn.textContent=novas;
}

function bqBancoToggleStatus(btn){
document.querySelectorAll('#bq-painel-banco .bq-status-btn, #bq-painel-banco .bq-fv2-status').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
bqBancoStatusAtivo=btn.dataset.val||'todas';
bqRenderBancoList();
}

// Stable onclick dispatcher for the banco main button (state changes dynamically)
function _bqBancoBtnClick(){
const btn=document.getElementById('bq-banco-buscar-btn');
const label=btn?btn.textContent.trim():'';
if(label==='Adicionar Filtros'){
  bqBancoAdicionarFiltro();
} else if(label==='Resolver Questões'){
  iniciarResolucaoBancoCompleto();
} else {
  // "Resolver sem Filtros" — resolve all
  _bqResolverTudo();
}
}

// Three-state button logic (Hotfix):
// State 1: no pending, no active filters → "Resolver sem Filtros" → resolve all
// State 2: pending selection in form     → "Adicionar Filtros"    → apply filters
// State 3: active filters, no pending    → "Resolver Questões"    → resolve filtered
function _bqBancoUpdateBtnText(){
const btn=document.getElementById('bq-banco-buscar-btn');
if(!btn) return;
const fields=['bq-banco-f-mat','bq-banco-f-assunto','bq-banco-f-banca','bq-banco-f-modelo',
               'bq-banco-f-nivel','bq-banco-f-ano','bq-banco-f-instituicao','bq-banco-f-cargo','bq-banco-f-leis'];
const pwField=document.getElementById('bq-banco-f-palavra');
const hasPending=fields.some(id=>{const el=document.getElementById(id);return el&&el.value;})
                 ||(pwField&&pwField.value.trim());
if(hasPending){
  // State 2: pending — apply filters
  btn.textContent='Adicionar Filtros';
  btn.onclick=function(){bqBancoAdicionarFiltro();};
  btn.style.background='';
} else if(bqBancoFiltrosAtivos.length>0){
  // State 3: filters applied — resolve filtered
  btn.textContent='Resolver Questões';
  btn.onclick=function(){iniciarResolucaoBancoCompleto();};
  btn.style.background='var(--green)';
} else {
  // State 1: no filters — resolve all
  btn.textContent='Resolver sem Filtros';
  btn.onclick=function(){_bqResolverTudo();};
  btn.style.background='';
}
}

// Helper: resolve all questions (no filter required)
function _bqResolverTudo(){
const todas=ST.banco.slice();
if(!todas.length){alert('Nenhuma questão no banco ainda.');return;}
resol_modoMass=false; resol_modoBanco=true;
abrirModoResolucaoModal(todas,'Questões');
}

function bqBancoOnMatChange(){
const fmat=document.getElementById('bq-banco-f-mat');
const matSel=fmat?.value||'';
const fassunto=document.getElementById('bq-banco-f-assunto');
if(fassunto){
  fassunto.innerHTML='';
  if(!matSel){
    // No disciplina — disable and show hint
    const o=document.createElement('option');
    o.value='';o.textContent='Selecione uma disciplina primeiro';
    fassunto.appendChild(o);
    fassunto.disabled=true;
    fassunto.style.opacity='.45';
    fassunto.style.cursor='not-allowed';
  } else {
    // Disciplina chosen — populate and enable
    const pool=ST.banco.filter(q=>q.mat===matSel&&q.assunto);
    const assuntos=[...new Set(pool.flatMap(q=>_assuntos(q.assunto)))].sort();
    const def=document.createElement('option');def.value='';def.textContent='Assunto';
    fassunto.appendChild(def);
    assuntos.forEach(a=>{const o=document.createElement('option');o.value=a;o.textContent=a;fassunto.appendChild(o);});
    fassunto.disabled=false;
    fassunto.style.opacity='';
    fassunto.style.cursor='';
  }
}
// Update button text when disciplina changes
_bqBancoUpdateBtnText();
}

function bqBancoAdicionarFiltro(){
let adicionou=false;
const matId    =document.getElementById('bq-banco-f-mat')?.value||'';
const assunto  =document.getElementById('bq-banco-f-assunto')?.value||'';
const banca    =document.getElementById('bq-banco-f-banca')?.value||'';
const modelo   =document.getElementById('bq-banco-f-modelo')?.value||'';
const nivel    =document.getElementById('bq-banco-f-nivel')?.value||'';
const ano      =document.getElementById('bq-banco-f-ano')?.value||'';
const instituicao=document.getElementById('bq-banco-f-instituicao')?.value||'';
const cargo    =document.getElementById('bq-banco-f-cargo')?.value||'';
const leis     =(document.getElementById('bq-banco-f-leis')?.value||'').trim(); // select or input both handled by .value
const palavra  =(document.getElementById('bq-banco-f-palavra')?.value||'').trim();
if(matId){const matObj=QUESTOES_MATERIAS.find(m=>m.id===matId);if(matObj&&!bqBancoFiltrosAtivos.find(f=>f.tipo==='mat'&&f.valor===matId)){bqBancoFiltrosAtivos.push({tipo:'mat',valor:matId,label:'Disciplina: '+matObj.name});adicionou=true;}}
if(assunto){if(!bqBancoFiltrosAtivos.find(f=>f.tipo==='assunto'&&f.valor===assunto)){_assuntos(assunto).forEach(a=>{if(!bqBancoFiltrosAtivos.find(f=>f.tipo==='assunto'&&f.valor===a))bqBancoFiltrosAtivos.push({tipo:'assunto',valor:a,label:'Assunto: '+a});});adicionou=true;}}
if(banca){if(!bqBancoFiltrosAtivos.find(f=>f.tipo==='banca'&&f.valor===banca)){bqBancoFiltrosAtivos.push({tipo:'banca',valor:banca,label:'Banca: '+banca});adicionou=true;}}
// Modalidade — filtra campo interno 'tipo'. Label visual é 'Modalidade', never 'modelo'
if(modelo){const mLabels={'CE':'Certo/Errado','ABCD':'A–D','ABCDE':'A–E'};const mLabel=mLabels[modelo]||modelo;if(!bqBancoFiltrosAtivos.find(f=>f.tipo==='modelo'&&f.valor===modelo)){bqBancoFiltrosAtivos=bqBancoFiltrosAtivos.filter(f=>f.tipo!=='modelo');bqBancoFiltrosAtivos.push({tipo:'modelo',valor:modelo,label:'Modalidade: '+mLabel});adicionou=true;}}
// Novos filtros — Fase 2
if(nivel){const nLabels={fundamental:'Fundamental',medio:'Médio',superior:'Superior'};if(!bqBancoFiltrosAtivos.find(f=>f.tipo==='nivel'&&f.valor===nivel)){bqBancoFiltrosAtivos=bqBancoFiltrosAtivos.filter(f=>f.tipo!=='nivel');bqBancoFiltrosAtivos.push({tipo:'nivel',valor:nivel,label:'Nível: '+(nLabels[nivel]||nivel)});adicionou=true;}}
if(ano){if(!bqBancoFiltrosAtivos.find(f=>f.tipo==='ano'&&f.valor===ano)){bqBancoFiltrosAtivos=bqBancoFiltrosAtivos.filter(f=>f.tipo!=='ano');bqBancoFiltrosAtivos.push({tipo:'ano',valor:ano,label:'Ano: '+ano});adicionou=true;}}
if(instituicao){if(!bqBancoFiltrosAtivos.find(f=>f.tipo==='instituicao'&&f.valor===instituicao)){bqBancoFiltrosAtivos.push({tipo:'instituicao',valor:instituicao,label:'Instituição: '+instituicao});adicionou=true;}}
if(cargo){if(!bqBancoFiltrosAtivos.find(f=>f.tipo==='cargo'&&f.valor===cargo)){bqBancoFiltrosAtivos.push({tipo:'cargo',valor:cargo,label:'Cargo: '+cargo});adicionou=true;}}
if(leis){if(!bqBancoFiltrosAtivos.find(f=>f.tipo==='leis'&&f.valor===leis)){bqBancoFiltrosAtivos.push({tipo:'leis',valor:leis,label:'Lei: "'+leis+'"'});adicionou=true;}}
if(palavra){if(!bqBancoFiltrosAtivos.find(f=>f.tipo==='palavra'&&f.valor===palavra)){bqBancoFiltrosAtivos.push({tipo:'palavra',valor:palavra,label:'Palavra: "'+palavra+'"'});adicionou=true;}}
if(!adicionou){alert('Selecione ao menos um filtro antes de adicionar.');return;}
['bq-banco-f-mat','bq-banco-f-assunto','bq-banco-f-banca','bq-banco-f-modelo',
 'bq-banco-f-nivel','bq-banco-f-ano','bq-banco-f-instituicao','bq-banco-f-cargo'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
['bq-banco-f-leis','bq-banco-f-palavra'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
bqBancoFiltradosCache=true;
bqBancoRenderTags();
bqRenderBancoList();
_bqBancoUpdateBtnText(); // shift to "Resolver Questões" after applying
}

function bqBancoRemoverFiltro(idx){bqBancoFiltrosAtivos.splice(idx,1);bqBancoRenderTags();bqRenderBancoList();_bqBancoUpdateBtnText();}

function bqBancoRenderTags(){
const wrap=document.getElementById('bq-banco-filtros-ativos');
if(!wrap) return;
wrap.innerHTML='';
bqBancoFiltrosAtivos.forEach((f,i)=>{
const tipoClass={mat:'tag-mat',banca:'tag-banca',modelo:'tag-modelo',palavra:'tag-palavra',assunto:'tag-mat',nivel:'tag-status',ano:'tag-status',instituicao:'tag-banca',cargo:'tag-banca',leis:'tag-mat'}[f.tipo]||'';
const tag=document.createElement('div');
tag.className=`bq-tag-ativo ${tipoClass}`;
tag.innerHTML=`${f.label}<span class="bq-tag-x" onclick="bqBancoRemoverFiltro(${i})">✕</span>`;
wrap.appendChild(tag);
});
const resumo=document.getElementById('bq-banco-filtro-resumo');
if(resumo){
// When no filters active: hide text (do not reveal total)
if(bqBancoFiltrosAtivos.length===0){
  resumo.textContent='';
} else {
  const n=bqBancoGetFiltradas().length;
  resumo.textContent=`${bqBancoFiltrosAtivos.length} filtro(s) ativo(s) — ${n} questão(ões)`;
}
}
// Update button text after tag render
_bqBancoUpdateBtnText();
}

function bqBancoLimparFiltros(){
bqBancoFiltrosAtivos=[];bqBancoFiltradosCache=null;bqBancoStatusAtivo='todas';
['bq-banco-f-mat','bq-banco-f-assunto','bq-banco-f-banca','bq-banco-f-modelo',
 'bq-banco-f-nivel','bq-banco-f-ano','bq-banco-f-instituicao','bq-banco-f-cargo','bq-banco-f-leis'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
const pw=document.getElementById('bq-banco-f-palavra');if(pw)pw.value='';
// Support both old .bq-status-btn and new .bq-fv2-status
document.querySelectorAll('#bq-painel-banco .bq-status-btn, #bq-painel-banco .bq-fv2-status').forEach((b,i)=>b.classList.toggle('active',i===0));
// Also reset Assunto to disabled state
bqBancoOnMatChange();
bqBancoRenderTags();
bqRenderBancoList();
_bqBancoUpdateBtnText(); // ensure State 1 after clearing
}

function bqBancoGetFiltradas(){
// Group filters by type: OR within same type, AND between different types
const grupos={};
for(const f of bqBancoFiltrosAtivos){
  if(!grupos[f.tipo]) grupos[f.tipo]=[];
  grupos[f.tipo].push(f.valor);
}
return ST.banco.filter(q=>{
  // Status filter (always AND — only one active at a time)
  // FASE 9.4.6: ler histórico e progresso do concurso ativo via helpers
  const _hist = (typeof bqGetHistorico==='function') ? bqGetHistorico(q) : (q.historico||[]);
  const _prog = (typeof bqGetProgresso==='function')  ? bqGetProgresso(q)  : q;
  const ult=_hist.length?_hist[_hist.length-1]:null;
  if(bqBancoStatusAtivo==='novas'    &&  _hist.length)              return false;
  if(bqBancoStatusAtivo==='resolvidas'&& !_hist.length)             return false;
  if(bqBancoStatusAtivo==='acertei'  &&!(ult&&ult.acertou))         return false;
  if(bqBancoStatusAtivo==='errei'    &&!_prog.errouAlgumVez)        return false;
  // For each filter type: question must match AT LEAST ONE value (OR within type)
  // All types must be satisfied (AND between types)
  for(const [tipo, valores] of Object.entries(grupos)){
    const passaAlgum = valores.some(val => {
      switch(tipo){
        case 'mat':       return q.mat===val;
        case 'assunto':   return _assuntoMatch(q.assunto,val);
        case 'banca':     return q.banca===val;
        case 'modelo': {
          const qt=(q.tipo||'').toUpperCase();
          return qt===val.toUpperCase();
        }
        case 'nivel':     return (q.nivel||'').toLowerCase()===(val||'').toLowerCase();
        case 'ano':       return (q.ano||'')===val;
        case 'instituicao': return (q.instituicao||'').toLowerCase().includes(val.toLowerCase());
        case 'cargo':     return (q.cargo||'').toLowerCase().includes(val.toLowerCase());
        case 'leis': {
          const kw=val.toLowerCase();
          return (q.leis||'').toLowerCase().includes(kw);
        }
        case 'palavra': {
          const kw=val.toLowerCase();
          return !!(q.enunciado?.toLowerCase().includes(kw)||q.codigo?.toLowerCase().includes(kw)||_assuntoMatch(q.assunto,kw));
        }
        default: return true;
      }
    });
    if(!passaAlgum) return false; // AND between types
  }
  return true;
});
}

function bqContarErrosConsecutivos(q){
// FASE 9.4.6: usar histórico do concurso ativo
const _hist=(typeof bqGetHistorico==='function')?bqGetHistorico(q):(q.historico||[]);
if(!_hist.length) return 0;
let count=0;
for(let i=_hist.length-1;i>=0;i--){
if(!_hist[i].acertou) count++; else break;
}
return count;
}

function bqGetPrioridade(q){
// Quanto mais erros consecutivos, maior a prioridade (número menor = mais urgente)
// FASE 9.4.6: usar histórico do concurso ativo
const _hist=(typeof bqGetHistorico==='function')?bqGetHistorico(q):(q.historico||[]);
const errosConsec=bqContarErrosConsecutivos(q);
const totalErros=_hist.filter(h=>!h.acertou).length||0;
return -(errosConsec*10+totalErros);
}

function bqRenderBancoList(){
// Fase 3: clean student view — show results only after filters are applied.
const resumo=document.getElementById('bq-banco-resumo');
if(!resumo) return;
// No filters active → clean state; do not reveal bank size or contents
if(!bqBancoFiltrosAtivos.length){
resumo.innerHTML='';
return;
}
if(!ST.banco.length){
resumo.innerHTML='<div style="font-size:.78rem;color:var(--dim);font-style:italic;text-align:center;padding:2rem 1rem">Nenhuma questão no banco ainda. Vá em <strong style="color:var(--gold)">+ Adicionar</strong> para incluir questões.</div>';
return;
}
const filtradas=bqBancoGetFiltradas();
resumo.innerHTML='';
if(!filtradas.length){
resumo.innerHTML='<div style="font-size:.78rem;color:var(--dim);font-style:italic;text-align:center;padding:1.5rem">Nenhuma questão encontrada com esses filtros.</div>';
return;
}
// Breakdown por disciplina/assunto — sem expor gabarito ou enunciado
const porMat={};
filtradas.forEach(q=>{
const mat=q.matNome||'Sem disciplina';
if(!porMat[mat]) porMat[mat]={total:0,novas:0,erradas:0,acertadas:0};
porMat[mat].total++;
if(!q.historico||!q.historico.length) porMat[mat].novas++;
else if((typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez)) porMat[mat].erradas++;
else porMat[mat].acertadas++;
});
const novas=filtradas.filter(q=>!q.historico||!q.historico.length).length;
const erradas=filtradas.filter(q=>(typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez)).length;
const acertadas=filtradas.filter(q=>{const _h=(typeof bqGetHistorico==='function'?bqGetHistorico(q):(q.historico||[]));const _p=(typeof bqGetProgresso==='function'?bqGetProgresso(q):q);return _h.length&&!_p.errouAlgumVez;}).length;
let html=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:.85rem .95rem;margin-bottom:.75rem">`;
html+=`<div style="font-family:'Oswald',sans-serif;font-size:.75rem;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.65rem">`;
html+=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
html+=`Questões Encontradas — ${filtradas.length} questão(ões)</div>`;
// Summary pills
html+=`<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:.7rem">`;
if(novas) html+=`<span style="font-size:.62rem;padding:3px 10px;border-radius:99px;background:rgba(96,165,250,.12);color:var(--blue);border:1px solid rgba(96,165,250,.3)">${novas} não resolvida(s)</span>`;
if(erradas) html+=`<span style="font-size:.62rem;padding:3px 10px;border-radius:99px;background:rgba(248,113,113,.12);color:var(--red);border:1px solid rgba(248,113,113,.3)">${erradas} com erro</span>`;
if(acertadas) html+=`<span style="font-size:.62rem;padding:3px 10px;border-radius:99px;background:rgba(74,222,128,.1);color:var(--green);border:1px solid rgba(74,222,128,.3)">${acertadas} acertada(s)</span>`;
html+=`</div>`;
// Per-subject breakdown (no gabarito/enunciado)
html+=`<div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.4rem;font-family:'Oswald',sans-serif;font-weight:600">Por disciplina</div>`;
html+=`<div style="display:flex;flex-direction:column;gap:.35rem">`;
Object.entries(porMat).forEach(([mat,data])=>{
html+=`<div style="display:flex;align-items:center;justify-content:space-between;padding:.35rem .65rem;border-radius:7px;background:rgba(255,255,255,.03);border:1px solid var(--border)">`;
html+=`<span style="font-size:.72rem;color:var(--text,rgba(255,255,255,.85));font-family:'Barlow',sans-serif">${mat}</span>`;
html+=`<span style="font-family:'Oswald',sans-serif;font-size:.75rem;font-weight:700;color:var(--gold)">${data.total}</span>`;
html+=`</div>`;
});
html+=`</div></div>`;
resumo.innerHTML=html;
}

// ─────────────────────────────────────────────────────────────────────────────
// bqRenderGerenciarList — futuro: exibir apenas para role admin/moderador via Firebase RBAC
// Mostra a lista completa com enunciado, gabarito e ações administrativas.
// ─────────────────────────────────────────────────────────────────────────────
// ─── Gerenciar filters — Fase 5 ────────────────────────────────────────────
function bqGerIniciarSelects(){
  // Populate dynamic selects from ST.banco values
  const matsComQ=new Set(ST.banco.map(q=>q.mat).filter(Boolean));
  // HOTFIX materias: usar TODAS as 23 matérias canônicas no Gerenciar
  const _matsParaSelect = (typeof bqMateriaLista==='function')
    ? bqMateriaLista(false) // todas as 23
    : (QUESTOES_MATERIAS || []);
  const gmat=document.getElementById('bq-ger-f-mat');
  if(gmat){
    const prev=gmat.value;
    gmat.innerHTML='<option value="">Disciplina</option>';
    (_matsParaSelect.length?_matsParaSelect:(QUESTOES_MATERIAS||[])).forEach(m=>{
      const o=document.createElement('option');o.value=m.id;o.textContent=m.name;gmat.appendChild(o);
    });
    if(prev&&matsComQ.has(prev)) gmat.value=prev;
  }
  const gbanca=document.getElementById('bq-ger-f-banca');
  if(gbanca){
    const prev=gbanca.value;
    gbanca.innerHTML='<option value="">Banca</option>';
    [...new Set(ST.banco.map(q=>q.banca||'').filter(Boolean))].sort().forEach(v=>{
      const o=document.createElement('option');o.value=v;o.textContent=v;gbanca.appendChild(o);
    });
    if(prev) gbanca.value=prev;
  }
  const gano=document.getElementById('bq-ger-f-ano');
  if(gano){
    const prev=gano.value;
    gano.innerHTML='<option value="">Ano</option>';
    [...new Set(ST.banco.map(q=>q.ano||'').filter(Boolean))].sort((a,b)=>b-a).forEach(v=>{
      const o=document.createElement('option');o.value=v;o.textContent=v;gano.appendChild(o);
    });
    if(prev) gano.value=prev;
  }
  const gins=document.getElementById('bq-ger-f-instituicao');
  if(gins){
    const prev=gins.value;
    gins.innerHTML='<option value="">Instituição</option>';
    [...new Set(ST.banco.map(q=>q.instituicao||'').filter(Boolean))].sort().forEach(v=>{
      const o=document.createElement('option');o.value=v;o.textContent=v;gins.appendChild(o);
    });
    if(prev) gins.value=prev;
  }
  const gcar=document.getElementById('bq-ger-f-cargo');
  if(gcar){
    const prev=gcar.value;
    gcar.innerHTML='<option value="">Cargo</option>';
    [...new Set(ST.banco.map(q=>q.cargo||'').filter(Boolean))].sort().forEach(v=>{
      const o=document.createElement('option');o.value=v;o.textContent=v;gcar.appendChild(o);
    });
    if(prev) gcar.value=prev;
  }
  const gleis=document.getElementById('bq-ger-f-leis');
  if(gleis&&gleis.tagName==='SELECT'){
    const prev=gleis.value;
    gleis.innerHTML='<option value="">Leis</option>';
    [...new Set(ST.banco.flatMap(q=>(q.leis||'').split(';').map(s=>s.trim())).filter(Boolean))].sort().forEach(v=>{
      const o=document.createElement('option');o.value=v;o.textContent=v;gleis.appendChild(o);
    });
    if(prev) gleis.value=prev;
  }
  // Init assunto disabled state
  bqGerOnMatChange();
}

function bqGerOnMatChange(){
  const matSel=(document.getElementById('bq-ger-f-mat')?.value||'');
  const fa=document.getElementById('bq-ger-f-assunto');
  if(!fa) return;
  fa.innerHTML='';
  if(!matSel){
    const o=document.createElement('option');o.value='';o.textContent='Selecione uma disciplina primeiro';
    fa.appendChild(o);fa.disabled=true;fa.style.opacity='.4';
  } else {
    const pool=ST.banco.filter(q=>q.mat===matSel&&q.assunto);
    const assuntos=[...new Set(pool.flatMap(q=>_assuntos(q.assunto)))].sort();
    const def=document.createElement('option');def.value='';def.textContent='Assunto';fa.appendChild(def);
    assuntos.forEach(a=>{const o=document.createElement('option');o.value=a;o.textContent=a;fa.appendChild(o);});
    fa.disabled=false;fa.style.opacity='';
  }
  bqGerAplicarFiltros();
}

function bqGerLimparFiltros(){
  ['bq-ger-f-mat','bq-ger-f-assunto','bq-ger-f-banca','bq-ger-f-modelo',
   'bq-ger-f-nivel','bq-ger-f-ano','bq-ger-f-instituicao','bq-ger-f-cargo','bq-ger-f-leis'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  ['bq-ger-f-codigo','bq-ger-f-palavra'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  bqGerOnMatChange(); // reset assunto to disabled
  bqGerAplicarFiltros();
}

function bqGerGetFiltradas(){
  const codigo   =(document.getElementById('bq-ger-f-codigo')?.value||'').trim().toLowerCase();
  const palavra  =(document.getElementById('bq-ger-f-palavra')?.value||'').trim().toLowerCase();
  const matId    = document.getElementById('bq-ger-f-mat')?.value||'';
  const assunto  = document.getElementById('bq-ger-f-assunto')?.value||'';
  const banca    = document.getElementById('bq-ger-f-banca')?.value||'';
  const modelo   = document.getElementById('bq-ger-f-modelo')?.value||'';
  const nivel    = document.getElementById('bq-ger-f-nivel')?.value||'';
  const ano      = document.getElementById('bq-ger-f-ano')?.value||'';
  const inst     = document.getElementById('bq-ger-f-instituicao')?.value||'';
  const cargo    = document.getElementById('bq-ger-f-cargo')?.value||'';
  const leis     = document.getElementById('bq-ger-f-leis')?.value||'';

  return ST.banco.filter(q=>{
    if(codigo  && !(q.codigo||'').toLowerCase().includes(codigo)) return false;
    if(matId   && q.mat!==matId) return false;
    if(assunto && !_assuntoMatch(q.assunto,assunto)) return false;
    if(banca   && q.banca!==banca) return false;
    if(modelo){
      const qt=(q.tipo||'').toUpperCase();
      if(modelo==='CE'&&qt!=='CE') return false;
      if(modelo==='ABCD'&&qt!=='ABCD') return false;
      if(modelo==='ABCDE'&&qt!=='ABCDE') return false;
    }
    if(nivel   && (q.nivel||'').toLowerCase()!==nivel.toLowerCase()) return false;
    if(ano     && (q.ano||'')!==ano) return false;
    if(inst    && !(q.instituicao||'').toLowerCase().includes(inst.toLowerCase())) return false;
    if(cargo   && !(q.cargo||'').toLowerCase().includes(cargo.toLowerCase())) return false;
    if(leis    && !(q.leis||'').toLowerCase().includes(leis.toLowerCase())) return false;
    if(palavra){
      const hay=[q.enunciado,q.assunto,q.matNome,q.banca,q.leis,q.instituicao,q.cargo,q.anotacao,q.textoRef,q.codigo]
                .map(s=>(s||'').toLowerCase()).join(' ');
      if(!hay.includes(palavra)) return false;
    }
    return true;
  });
}

let _bqGerFiltradas=null; // cache for export + resolver

function bqGerAplicarFiltros(){
  _bqGerFiltradas=bqGerGetFiltradas();
  const count=document.getElementById('bq-ger-count');
  if(count) count.textContent=_bqGerFiltradas.length+' questão(ões) encontrada(s)';
  bqRenderGerenciarList(_bqGerFiltradas);
}

// Resolve from Gerenciar (filtered or all)
function bqGerResolver(){
  const lista=_bqGerFiltradas&&_bqGerFiltradas.length?_bqGerFiltradas:ST.banco.slice();
  if(!lista.length){alert('Nenhuma questão disponível.');return;}
  resol_modoMass=false; resol_modoBanco=true;
  abrirModoResolucaoModal(lista,'Questões');
}

function bqRenderGerenciarList(){
const list=document.getElementById('bq-gerenciar-list');
if(!list) return;
if(!ST.banco.length){
list.innerHTML='<div style="font-size:.78rem;color:var(--dim);font-style:italic;text-align:center;padding:2rem 1rem">Nenhuma questão no banco ainda. Vá em <strong style="color:var(--gold)">+ Adicionar</strong> para incluir questões.</div>';
return;
}
list.innerHTML='';
// Accept filtradas from bqGerAplicarFiltros, or default to all ST.banco
const todas=arguments[0]||ST.banco;
todas.slice(0,200).forEach(q=>{
const tag=bqGetTag(q);
const erros=q.historico?.filter(h=>!h.acertou)||[];
const acertos=q.historico?.filter(h=>h.acertou)||[];
const errosConsec=bqContarErrosConsecutivos(q);
const priorBadge=errosConsec>=3?`<span style="font-size:.52rem;font-weight:700;padding:1px 7px;border-radius:99px;background:rgba(248,113,113,.25);color:var(--red);border:1px solid rgba(248,113,113,.5);text-transform:uppercase;letter-spacing:.05em;margin-left:4px">🔴 ${errosConsec} erros</span>`:
errosConsec>=2?`<span style="font-size:.52rem;font-weight:700;padding:1px 7px;border-radius:99px;background:rgba(248,113,113,.15);color:var(--red);border:1px solid rgba(248,113,113,.3);text-transform:uppercase;letter-spacing:.05em;margin-left:4px">⚠ ${errosConsec} erros</span>`:'';
const card=document.createElement('div');
card.className='err-card';
card.style.borderColor=errosConsec>=3?'rgba(248,113,113,.4)':q.massificada?'rgba(167,139,250,.3)':'';
card.innerHTML=`
<div class="err-card-header">
<div style="display:flex;align-items:center;gap:6px;flex:1;flex-wrap:wrap">
${q.codigo?`<span class="err-card-num">${q.codigo}</span>`:''}
<span class="err-card-mat">${q.matNome||'—'}</span>
${q.banca?`<span style="font-size:.58rem;color:var(--blue);font-family:'Oswald',sans-serif">${q.banca}</span>`:''}
${q.assunto?`<span style="font-size:.6rem;color:var(--muted);font-style:italic">${q.assunto}</span>`:''}
${tag}${priorBadge}
</div>
<div style="display:flex;gap:5px;align-items:center;flex-shrink:0">
<button class="sim-btn start" style="font-size:.58rem;padding:.25rem .6rem;border-radius:5px" onclick="iniciarResolucaoQuestaoUnica('${q.id}')">▶ Resolver</button>
<button class="err-del" onclick="deletarQuestao('${q.id}')" title="Remover do banco">✕</button>
</div>
</div>
<div class="err-card-body">
<div style="font-size:.62rem;color:var(--muted);margin-bottom:.35rem">
Modelo: <strong style="color:var(--blue)">${q.tipo}</strong>
&nbsp;·&nbsp; Gabarito: <strong style="color:var(--green)">${q.gabarito||'—'}</strong>
${erros.length?`&nbsp;·&nbsp; <span style="color:var(--red)">✗ ${erros.length} erro(s)</span>`:''}
${acertos.length?`&nbsp;·&nbsp; <span style="color:var(--green)">✓ ${acertos.length} acerto(s)</span>`:''}
${!q.historico?.length?'&nbsp;·&nbsp; <span style="color:var(--muted);font-style:italic">Não resolvida</span>':''}
</div>
${q.textoRef?`<details class="qc-texto-ref" style="margin-bottom:.5rem"><summary><span>📄 TEXTO DE REFERÊNCIA</span><span class="tr-arrow">▼</span></summary><div class="qc-texto-ref-body">${renderTexto(q.textoRef)}</div></details>`:''}
${q.enunciado?`<div style="font-size:.73rem;color:rgba(255,255,255,.82);line-height:1.6;padding:.55rem .7rem;background:rgba(255,255,255,.03);border-radius:7px;border-left:2px solid ${(typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez)?'var(--red)':(typeof bqGetHistorico==='function'?bqGetHistorico(q):(q.historico||[])).length?'var(--green)':'var(--border2)'};margin-bottom:.4rem">${renderTexto(q.enunciado.slice(0,300))}${q.enunciado.length>300?'…':''}</div>`:''}
${q.historico&&q.historico.length?`<details style="margin-top:.2rem"><summary style="font-size:.65rem;color:var(--muted);cursor:pointer;list-style:none">📋 Histórico (${q.historico.length} tentativa(s))</summary><div style="margin-top:.4rem;display:flex;flex-direction:column;gap:.25rem">${q.historico.slice().reverse().map(h=>`<div style="font-size:.65rem;color:${h.acertou?'var(--green)':'var(--red)'};padding:.2rem .5rem;background:rgba(255,255,255,.03);border-radius:5px;border-left:2px solid ${h.acertou?'var(--green)':'var(--red)'}"><strong>${h.data}</strong>: ${h.acertou?'✓ Acertei':'✗ Errei'}${h.motivo?`<span style="color:var(--muted)"> — ${escapeHtml(h.motivo)}</span>`:''}</div>`).join('')}</div></details>`:''}
${q.anotacao?`<details style="margin-top:.35rem"><summary style="font-size:.65rem;color:var(--blue);cursor:pointer;list-style:none">💬 Gabarito comentado</summary><div style="font-size:.7rem;color:rgba(255,255,255,.7);line-height:1.6;margin-top:.3rem">${renderTexto(q.anotacao)}</div></details>`:''}
</div>`;
list.appendChild(card);
});
if(todas.length>100){
list.innerHTML+=`<div style="font-size:.72rem;color:var(--muted);text-align:center;padding:.75rem">Exibindo 100 de ${todas.length}. Total no banco: ${todas.length}.</div>`;
}
}

function iniciarResolucaoQuestaoUnica(id){
const q=ST.banco.find(x=>x.id===id);
if(!q) return;
iniciarResolucaoBancoComLista([q]);
}

function iniciarResolucaoBancoCompleto(){
const filtradas=bqBancoGetFiltradas();
if(!filtradas.length){alert('Nenhuma questão selecionada com os filtros ativos.');return;}
iniciarResolucaoBancoComLista(filtradas);
}

// ── CADERNO DE ERROS ─────────────────────────────────────────────
function buildBanco(_force){
if(!_force&&!document.getElementById('tab-banco')?.classList.contains('active')) return;
initBancoSelects();
bqRenderStats();
bqRenderTags();
const list=document.getElementById('bq-list');
if(list && !bqFiltrosAtivos.length){
const total=ST.banco.filter(q=>(typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez)).length;
list.innerHTML=total
?'<div style="font-size:.78rem;color:var(--dim);font-style:italic;text-align:center;padding:2rem 1rem">Use os filtros e clique <strong style="color:var(--red)">+ Adicionar filtro</strong> para ver as questões do caderno de erros.</div>'
:'<div style="font-size:.78rem;color:var(--dim);font-style:italic;text-align:center;padding:2rem 1rem">Caderno de erros vazio! Resolva questões no banco e os erros aparecerão aqui automaticamente.</div>';
} else if(list){
bqRender();
}
}

function initBancoSelects(){
const matsComQ=new Set(ST.banco.map(q=>q.mat).filter(Boolean));
// FASE 9.4.14 / HOTFIX materias: usar TODAS as 23 matérias canônicas nos selects
// (não filtrar por matsComQ — o select deve mostrar todas, independente de ter questões)
const _matsSel = (typeof bqMateriaLista==='function')
  ? bqMateriaLista(false) // false = todas as 23, não só as presentes
  : (QUESTOES_MATERIAS || []);
const _orFallback = (lista) => lista.length ? lista : (QUESTOES_MATERIAS || []);
// Selects do caderno de erros
const fmat=document.getElementById('bq-f-mat');
if(fmat){
const prev=fmat.value;
fmat.innerHTML='<option value="">Disciplina</option>';
_orFallback(_matsSel).forEach(m=>{
const o=document.createElement('option');o.value=m.id;o.textContent=m.name;fmat.appendChild(o);
});
if(prev&&matsComQ.has(prev)) fmat.value=prev;
}
const bancasComQ=[...new Set(ST.banco.filter(q=>(typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez)).map(q=>q.banca).filter(Boolean))].sort();
const fbanca=document.getElementById('bq-f-banca');
if(fbanca){
const prev=fbanca.value;
fbanca.innerHTML='<option value="">Banca</option>';
bancasComQ.forEach(b=>{const o=document.createElement('option');o.value=b;o.textContent=b;fbanca.appendChild(o);});
if(prev&&bancasComQ.includes(prev)) fbanca.value=prev;
}
// Novos selects do Caderno — Fase 7
['bq-f-ano','bq-f-instituicao','bq-f-cargo'].forEach(id=>{
const el=document.getElementById(id); if(!el) return;
const prev=el.value;
const placeholder={'bq-f-ano':'Ano','bq-f-instituicao':'Instituição','bq-f-cargo':'Cargo'}[id];
const field={'bq-f-ano':'ano','bq-f-instituicao':'instituicao','bq-f-cargo':'cargo'}[id];
el.innerHTML=`<option value="">${placeholder}</option>`;
[...new Set(ST.banco.filter(q=>(typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez)).map(q=>q[field]||'').filter(Boolean))].sort().forEach(v=>{
  const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o);
});
if(prev) el.value=prev;
});
const fleis=document.getElementById('bq-f-leis');
if(fleis&&fleis.tagName==='SELECT'){
const prev=fleis.value;
fleis.innerHTML='<option value="">Leis</option>';
[...new Set(ST.banco.filter(q=>(typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez)).flatMap(q=>(q.leis||'').split(';').map(s=>s.trim())).filter(Boolean))].sort().forEach(v=>{
  const o=document.createElement('option');o.value=v;o.textContent=v;fleis.appendChild(o);
});
if(prev) fleis.value=prev;
}
bqOnMatChange(); // initialize Assunto disabled state
_bqErroBtnUpdate();
// Selects do banco completo
const bmat=document.getElementById('bq-banco-f-mat');
if(bmat){
const prev=bmat.value;
bmat.innerHTML='<option value="">Disciplina</option>';
_orFallback(_matsSel).forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;bmat.appendChild(o);});
if(prev&&matsComQ.has(prev)) bmat.value=prev;
// Initialize Assunto state based on whether a disciplina is already selected
bqBancoOnMatChange();
}
const bbanca=document.getElementById('bq-banco-f-banca');
if(bbanca){
const prev=bbanca.value;
bbanca.innerHTML='<option value="">Banca</option>';
[...new Set(ST.banco.map(q=>q.banca).filter(Boolean))].sort().forEach(b=>{const o=document.createElement('option');o.value=b;o.textContent=b;bbanca.appendChild(o);});
if(prev) bbanca.value=prev;
}
// Novos selects do banco — Fase 2 (populados dinamicamente com valores existentes)
const bano=document.getElementById('bq-banco-f-ano');
if(bano){
const prev=bano.value;
bano.innerHTML='<option value="">Ano</option>';
[...new Set(ST.banco.map(q=>q.ano||'').filter(Boolean))].sort((a,b)=>b-a).forEach(a=>{const o=document.createElement('option');o.value=a;o.textContent=a;bano.appendChild(o);});
if(prev) bano.value=prev;
}
const bins=document.getElementById('bq-banco-f-instituicao');
if(bins){
const prev=bins.value;
bins.innerHTML='<option value="">Instituição</option>';
[...new Set(ST.banco.map(q=>q.instituicao||'').filter(Boolean))].sort().forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;bins.appendChild(o);});
if(prev) bins.value=prev;
}
const bcar=document.getElementById('bq-banco-f-cargo');
if(bcar){
const prev=bcar.value;
bcar.innerHTML='<option value="">Cargo</option>';
[...new Set(ST.banco.map(q=>q.cargo||'').filter(Boolean))].sort().forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;bcar.appendChild(o);});
if(prev) bcar.value=prev;
}
// Leis — now a SELECT (populated from ST.banco q.leis values)
const bleis=document.getElementById('bq-banco-f-leis');
if(bleis && bleis.tagName==='SELECT'){
const prev=bleis.value;
bleis.innerHTML='<option value="">Leis</option>';
[...new Set(ST.banco.flatMap(q=>(q.leis||'').split(';').map(s=>s.trim())).filter(Boolean))].sort().forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;bleis.appendChild(o);});
if(prev) bleis.value=prev;
}
// Formulário de adicionar
const efmat=document.getElementById('err-f-mat');
if(efmat&&efmat.options.length<=1) QUESTOES_MATERIAS.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;efmat.appendChild(o);});
const bsel=document.getElementById('bq-banca');
if(bsel&&bsel.options.length<=1) BANCAS.forEach(b=>{const o=document.createElement('option');o.value=b;o.textContent=b;bsel.appendChild(o);});
const msel=document.getElementById('bq-mat');
if(msel&&msel.options.length<=1) (typeof bqMateriaLista==='function'?bqMateriaLista():QUESTOES_MATERIAS).forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;msel.appendChild(o);});
}

function bqOnMatChange(){
const matSel=(document.getElementById('bq-f-mat')?.value||'');
const fa=document.getElementById('bq-f-assunto');
if(!fa) return;
fa.innerHTML='';
if(!matSel){
  const o=document.createElement('option');o.value='';o.textContent='Selecione uma disciplina primeiro';
  fa.appendChild(o);fa.disabled=true;fa.style.opacity='.4';
} else {
  const pool=ST.banco.filter(q=>(typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez)&&q.mat===matSel&&q.assunto);
  const assuntos=[...new Set(pool.flatMap(q=>_assuntos(q.assunto)))].sort();
  const def=document.createElement('option');def.value='';def.textContent='Assunto';fa.appendChild(def);
  assuntos.forEach(a=>{const o=document.createElement('option');o.value=a;o.textContent=a;fa.appendChild(o);});
  fa.disabled=false;fa.style.opacity='';
}
_bqErroBtnUpdate();
}

function bqRenderStats(_force){
if(!_force&&!document.getElementById('tab-banco')?.classList.contains('active')) return;
const pool=ST.banco.filter(q=>(typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez));
const total=pool.length;
const mass=pool.filter(q=>(typeof bqGetProgresso==='function'?bqGetProgresso(q):q).massificada).length;
const ult=pool.filter(q=>{const _h=(typeof bqGetHistorico==='function')?bqGetHistorico(q):(q.historico||[]);return _h.length&&_h[_h.length-1].acertou;}).length;
const taxa=total>0?Math.round(ult/total*100):0;
const st=document.getElementById('bq-stat-total');if(st) st.textContent=total;
const sm=document.getElementById('bq-stat-mass');if(sm) sm.textContent=mass;
const stx=document.getElementById('bq-stat-taxa');if(stx) stx.textContent=total>0?taxa+'%':'—';
const et=document.getElementById('err-total');if(et) et.textContent=total;
const em=document.getElementById('err-massificadas');if(em) em.textContent=mass;
const etx=document.getElementById('err-taxa');if(etx) etx.textContent=total>0?taxa+'%':'—';
}

function bqRender(){
const list=document.getElementById('bq-list');
if(!list) return;
if(!bqFiltrosAtivos.length&&!bqFiltradosCache){
const total=ST.banco.filter(q=>(typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez)).length;
list.innerHTML=total
?'<div style="font-size:.78rem;color:var(--dim);font-style:italic;text-align:center;padding:2rem 1rem">Use os filtros e clique <strong style="color:var(--red)">+ Adicionar filtro</strong> para ver as questões.</div>'
:'<div style="font-size:.78rem;color:var(--dim);font-style:italic;text-align:center;padding:2rem 1rem">Caderno de erros vazio!</div>';
return;
}
let filtradas=bqGetFiltradas();
// Ordenar por prioridade se checkbox marcado
const ordenar=document.getElementById('bq-ordenar-prioridade')?.checked;
if(ordenar){
filtradas=filtradas.slice().sort((a,b)=>{
const ea=bqContarErrosConsecutivos(a);
const eb=bqContarErrosConsecutivos(b);
if(eb!==ea) return eb-ea;
const ta=a.historico?.filter(h=>!h.acertou).length||0;
const tb=b.historico?.filter(h=>!h.acertou).length||0;
return tb-ta;
});
}
list.innerHTML='';
if(!filtradas.length){
list.innerHTML='<div style="font-size:.78rem;color:var(--dim);font-style:italic;text-align:center;padding:1.5rem">Nenhuma questão encontrada com esses filtros.</div>';
return;
}
filtradas.slice(0,60).forEach(q=>{
const tag=bqGetTag(q);
const erros=q.historico?.filter(h=>!h.acertou)||[];
const acertos=q.historico?.filter(h=>h.acertou)||[];
const errosConsec=bqContarErrosConsecutivos(q);
const priorBadge=errosConsec>=3?`<span style="font-size:.52rem;font-weight:700;padding:1px 7px;border-radius:99px;background:rgba(248,113,113,.25);color:var(--red);border:1px solid rgba(248,113,113,.5);text-transform:uppercase;letter-spacing:.05em;margin-left:4px">🔴 ALTA PRIORIDADE</span>`:
errosConsec>=2?`<span style="font-size:.52rem;font-weight:700;padding:1px 7px;border-radius:99px;background:rgba(248,113,113,.15);color:var(--red);border:1px solid rgba(248,113,113,.3);text-transform:uppercase;letter-spacing:.05em;margin-left:4px">⚠ MÉDIA PRIORIDADE</span>`:'';
const card=document.createElement('div');
card.className='err-card';
card.style.borderColor=errosConsec>=3?'rgba(248,113,113,.5)':'';
card.innerHTML=`
<div class="err-card-header">
<div style="display:flex;align-items:center;gap:6px;flex:1;flex-wrap:wrap">
${q.codigo?`<span class="err-card-num">${q.codigo}</span>`:''}
<span class="err-card-mat">${q.matNome||'—'}</span>
${q.banca?`<span style="font-size:.58rem;color:var(--blue);font-family:'Oswald',sans-serif">${q.banca}</span>`:''}
${q.assunto?`<span style="font-size:.6rem;color:var(--muted);font-style:italic">${q.assunto}</span>`:''}
${tag}${priorBadge}
</div>
<div style="display:flex;gap:5px;align-items:center;flex-shrink:0">
<button class="sim-btn start" style="font-size:.58rem;padding:.25rem .6rem;border-radius:5px;background:var(--red)" onclick="iniciarResolucaoQuestaoUnica('${q.id}')">▶ Resolver</button>
<button class="err-del" onclick="deletarQuestao('${q.id}')" title="Remover do banco">✕</button>
</div>
</div>
<div class="err-card-body">
<div style="font-size:.62rem;color:var(--muted);margin-bottom:.35rem">
Modelo: <strong style="color:var(--blue)">${q.tipo}</strong>
&nbsp;·&nbsp; Gabarito: <strong style="color:var(--green)">${q.gabarito||'—'}</strong>
&nbsp;·&nbsp; <span style="color:var(--red)">✗ ${erros.length} erro(s)</span>
&nbsp;·&nbsp; <span style="color:var(--green)">✓ ${acertos.length} acerto(s)</span>
${errosConsec>0?`&nbsp;·&nbsp; <span style="color:var(--red);font-weight:700">${errosConsec} erro(s) consecutivo(s)</span>`:''}
</div>
${q.textoRef?`<details class="qc-texto-ref" style="margin-bottom:.5rem"><summary><span>📄 TEXTO DE REFERÊNCIA</span><span class="tr-arrow">▼</span></summary><div class="qc-texto-ref-body">${renderTexto(q.textoRef)}</div></details>`:''}
${q.enunciado?`<div style="font-size:.73rem;color:rgba(255,255,255,.82);line-height:1.6;padding:.55rem .7rem;background:rgba(255,255,255,.03);border-radius:7px;border-left:2px solid var(--red);margin-bottom:.4rem">${renderTexto(q.enunciado.slice(0,250))}${q.enunciado.length>250?'…':''}</div>`:''}
${q.historico&&q.historico.length?`
<details style="margin-top:.2rem">
<summary style="font-size:.65rem;color:var(--muted);cursor:pointer;list-style:none">📋 Histórico (${q.historico.length} tentativa(s))</summary>
<div style="margin-top:.4rem;display:flex;flex-direction:column;gap:.25rem">
${q.historico.slice().reverse().map(h=>`<div style="font-size:.65rem;color:${h.acertou?'var(--green)':'var(--red)'};padding:.2rem .5rem;background:rgba(255,255,255,.03);border-radius:5px;border-left:2px solid ${h.acertou?'var(--green)':'var(--red)'}"><strong>${h.data}</strong>: ${h.acertou?'✓ Acertei':'✗ Errei'}${h.motivo?`<span style="color:var(--muted)"> — ${escapeHtml(h.motivo)}</span>`:''}</div>`).join('')}
</div>
</details>`:''}
${q.anotacao?`<details style="margin-top:.35rem"><summary style="font-size:.65rem;color:var(--blue);cursor:pointer;list-style:none">💬 Gabarito comentado</summary><div style="font-size:.7rem;color:rgba(255,255,255,.7);line-height:1.6;margin-top:.3rem">${renderTexto(q.anotacao)}</div></details>`:''}
</div>`;
list.appendChild(card);
});
if(filtradas.length>60){
list.innerHTML+=`<div style="font-size:.72rem;color:var(--muted);text-align:center;padding:.75rem">Exibindo 60 de ${filtradas.length}. Refine os filtros para ver mais.</div>`;
}
}

let bqFiltradosCache=null;
function _limparSessoesPorQuestao(questaoId){
if(!ST.sessoesDiarias) return;
let alterou=false;
Object.entries(ST.sessoesDiarias).forEach(([dataStr,sd])=>{
if(!sd||!sd.questoes||!sd.questoes.blocos) return;
const antes=sd.questoes.blocos.length;
sd.questoes.blocos=sd.questoes.blocos.filter(b=>
!(b.questaoId===questaoId || b.id===questaoId)
);
if(sd.questoes.blocos.length!==antes){
sd.questoes.total   = sd.questoes.blocos.reduce((a,b)=>a+(b.total||0),0);
sd.questoes.acertos = sd.questoes.blocos.reduce((a,b)=>a+(b.acertos||0),0);
sd.questoes.duracao = sd.questoes.blocos.reduce((a,b)=>a+(b.duracao||0),0);
alterou=true;
}
if(_sessaoEstaVazia(sd)) delete ST.sessoesDiarias[dataStr];
else ST.sessoesDiarias[dataStr]=sd;
});
if(alterou){ saveState(); _buildSessoesLista(document.getElementById('bk-sessoes-list'),_bkSessPeriodo||0,true); }
}
function _limparSessoesPorFlashCard(cardId){
if(!ST.sessoesDiarias) return;
let alterou=false;
Object.entries(ST.sessoesDiarias).forEach(([dataStr,sd])=>{
if(!sd||!sd.flashcards) return;
const itens=sd.flashcards.itens||[];
const antes=itens.length;
sd.flashcards.itens=itens.filter(fc=>fc.cardId!==cardId);
if(sd.flashcards.itens.length!==antes){
sd.flashcards.revisoes = sd.flashcards.itens.length;
sd.flashcards.acertos  = sd.flashcards.itens.filter(fc=>fc.acertou).length;
alterou=true;
}
if(_sessaoEstaVazia(sd)) delete ST.sessoesDiarias[dataStr];
else ST.sessoesDiarias[dataStr]=sd;
});
if(alterou){ saveState(); _buildSessoesLista(document.getElementById('bk-sessoes-list'),_bkSessPeriodo||0,true); }
}
function _limparSessoesPorDeck(deckId){
if(!ST.sessoesDiarias) return;
let alterou=false;
Object.entries(ST.sessoesDiarias).forEach(([dataStr,sd])=>{
if(!sd||!sd.flashcards) return;
const itens=sd.flashcards.itens||[];
const antes=itens.length;
sd.flashcards.itens=itens.filter(fc=>fc.deckId!==deckId);
if(sd.flashcards.itens.length!==antes){
sd.flashcards.revisoes = sd.flashcards.itens.length;
sd.flashcards.acertos  = sd.flashcards.itens.filter(fc=>fc.acertou).length;
alterou=true;
}
if(_sessaoEstaVazia(sd)) delete ST.sessoesDiarias[dataStr];
else ST.sessoesDiarias[dataStr]=sd;
});
if(alterou){ saveState(); _buildSessoesLista(document.getElementById('bk-sessoes-list'),_bkSessPeriodo||0,true); }
}
function deletarQuestao(id){
if(!confirm('Remover esta questão do banco?')) return;
ST.banco=ST.banco.filter(q=>q.id!==id);
ST.erros=ST.erros.filter(e=>e.id!==id);
_limparSessoesPorQuestao(id);
// FASE 9.4.9: remover progresso órfão de todos os concursos
// Se a questão saiu do banco global, o progresso por concurso é inútil
if(ST.bancoProgressoPorConcurso){
  Object.keys(ST.bancoProgressoPorConcurso).forEach(function(cid){
    if(ST.bancoProgressoPorConcurso[cid]) delete ST.bancoProgressoPorConcurso[cid][id];
  });
}
// Sessões históricas são preservadas (registro de desempenho passado)
// mas seriam anônimas pois a questão sumiu do banco — comportamento aceitável
saveState();
// Re-render the currently visible panel immediately (Fase 5 fix)
const painelBanco   =document.getElementById('bq-painel-banco');
const painelResolver=document.getElementById('bq-painel-resolver');
const painelGer     =document.getElementById('bq-painel-gerenciar');
if(painelBanco&&painelBanco.style.display!=='none'){
  bqRenderBancoStats();
  bqBancoRenderTags();
  bqRenderBancoList();
  initBancoSelects(); // refresh selects so deleted values don't linger
} else if(painelGer&&painelGer.style.display!=='none'){
  bqGerIniciarSelects(); // refresh gerenciar selects
  bqGerAplicarFiltros(); // re-render list (remove deleted card immediately)
} else if(painelResolver&&painelResolver.style.display!=='none'){
  buildBanco(true);
}
bqRenderStats(true);
}
function iniciarResolucaoBanco(){
const pool=bqGetFiltradas();
if(!pool.length){alert('Nenhuma questão encontrada para os filtros selecionados.');return;}
iniciarResolucaoBancoComLista(pool);
}
function iniciarResolucaoBancoComLista(lista){
if(!lista||!lista.length){alert('Nenhuma questão para resolver.');return;}
resol_modoMass=false; resol_modoBanco=true;
abrirModoResolucaoModal(lista,'Questões');
}
function errSetStatus(s,btn){
errStatusFiltro=s;
document.querySelectorAll('#tab-erros .bq-filtro-btn').forEach(b=>b.classList.remove('active'));
if(btn) btn.classList.add('active');
buildBanco();
}
function errLimparFiltros(){
errStatusFiltro='todas';
document.querySelectorAll('#tab-erros .bq-filtro-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
if(document.getElementById('err-f-mat')) document.getElementById('err-f-mat').value='';
if(document.getElementById('err-f-assunto')) document.getElementById('err-f-assunto').value='';
buildBanco();
}
function iniciarResolucaoCaderno(){
const fmat=document.getElementById('err-f-mat')?.value||'';
let pool=ST.banco.filter(q=>(typeof bqQuestaoErrouAlgumVez==='function'?bqQuestaoErrouAlgumVez(q):q.errouAlgumVez));
if(fmat) pool=pool.filter(q=>q.mat===fmat);
if(errStatusFiltro==='normal') pool=pool.filter(q=>!q.massificada);
if(errStatusFiltro==='massificadas') pool=pool.filter(q=>q.massificada);
if(!pool.length){alert('Nenhuma questão no caderno com esses filtros.');return;}
resol_modoMass=false; resol_modoBanco=false;
abrirModoResolucaoModal(pool,'📕 Caderno de Erros');
}
function errAbaManual(){}
function errAbaJSON(){}
function atualizarOpcoesResposta(){}
function adicionarErroManual(){}
function importarErrosJSON(){}
function buildMassificadas(){}
function renderMassStats(){}
function limparFiltrosMat(){}
function limparFiltrosMatMass(){}
function iniciarResolucaoMassificadas(){
const pool=ST.banco.filter(q=>q.massificada);
if(!pool.length){alert('Nenhuma questão massificada ainda.');return;}
resol_modoMass=true; resol_modoBanco=false;
iniciarResolucao(pool,'🔥 Massificadas — revisão');
}
let _modoResolPool=[], _modoResolTitulo='';
function abrirModoResolucaoModal(pool, titulo){
_modoResolPool=pool; _modoResolTitulo=titulo;
const infoEl=document.getElementById('modo-resolucao-info');
if(infoEl) infoEl.textContent=`${pool.length} questão(ões) selecionada(s)`;
document.getElementById('modo-resolucao-modal').classList.add('open');
}
function confirmarModoResolucao(modo){
document.getElementById('modo-resolucao-modal').classList.remove('open');
document.getElementById('donut-modal-overlay').classList.remove('open');
resol_modo_atual=modo;
iniciarResolucao(_modoResolPool, _modoResolTitulo);
}
function voltarParaFiltros(){
if(!confirm('Voltar para os filtros? Seu progresso atual será perdido.')) return;
document.getElementById('resolucao-overlay').classList.remove('open');
buildBanco(); bqRenderStats(); renderDashboard();
}
let resol_modo_atual='foco';
let resol_acertos=0, resol_erros=0, resol_puladas=0;
let resol_modoMass=false, resol_modoBanco=false;
const MOTIVOS_ERRO=[
'Falta de atenção',
'Não sabia a resposta',
'Confundi algum termo',
'Erro de interpretação',
'Não lembrava o conteúdo',
'Pegadinha da banca',
];
function iniciarResolucao(pool, titulo){
resol_fila=pool.map(q=>({...q, _resposta:'', _confirmado:false, _acertou:null, _pulou:false, _motivo:'', _termoConfundido:''}));
resol_idx=0; resol_acertos=0; resol_erros=0; resol_puladas=0;
// RSL: initialize toolbar/backbar state
if(typeof rslOnSessionStart==='function') rslOnSessionStart();
document.getElementById('resolucao-title').textContent=titulo;
const lbl=document.getElementById('resolucao-progress-label');
if(lbl) lbl.textContent=`Questão 1 de ${resol_fila.length}`;
const fill=document.getElementById('resolucao-prog-fill');
if(fill) fill.style.width='0%';
const mini=document.getElementById('resolucao-progress-mini');
if(mini) mini.textContent=`1/${resol_fila.length}`;
const sl=document.getElementById('resolucao-stats-label');
if(sl) sl.innerHTML='';
const nav=document.getElementById('resolucao-nav');
if(nav) nav.style.display='';
const rb=document.getElementById('resolucao-result-box');
if(rb) rb.className='qc-result';
const _resolOv=document.getElementById('resolucao-overlay');
_resolOv.style.display='';
_resolOv.classList.add('open');
if(resol_modo_atual==='lista'){
if(nav) nav.style.display='none';
renderResolLista();
} else {
renderResolCard();
}
}
function renderResolLista(){
const nav=document.getElementById('resolucao-nav');
if(nav){
nav.style.display='none';
}
const resultBox=document.getElementById('resolucao-result-box');
if(resultBox) resultBox.className='qc-result';
// HOTFIX foco/lista: mostrar progresso real ao entrar no modo lista
const _resplbl = resol_acertos + resol_erros + resol_puladas;
const lbl=document.getElementById('resolucao-progress-label');
if(lbl) lbl.textContent=`${_resplbl > 0 ? _resplbl + ' de ' + resol_fila.length + ' respondidas' : resol_fila.length + ' questões — role para responder'}`;
const pf=document.getElementById('resolucao-prog-fill');
if(pf) pf.style.width=(_resplbl > 0 ? Math.round(_resplbl/resol_fila.length*100) : 0)+'%';
const card=document.getElementById('resolucao-card');
card.innerHTML='<div class="sim-lista-wrap" id="resol-lista-wrap"></div>';
const wrap=document.getElementById('resol-lista-wrap');
resol_fila.forEach((q,i)=>{
const tipo=q.tipo||'CE';
const div=document.createElement('div');
div.className='sim-lista-item';
div.id='resol-lista-item-'+i;
const orig=ST.banco.find(b=>b.id===q.id)||q;
const tagHTML=bqGetTag(orig);
let optsHTML='<div class="qc-opcoes-label">Selecione sua resposta</div>';
if(tipo==='CE'){
optsHTML+=`
<div class="qc-opcao" id="opt-lista-${i}-C" onclick="selecionarResolListaResp('C',${i})">
<div class="qc-opcao-circulo">C</div><div class="qc-opcao-texto">Certo</div></div>
<div class="qc-opcao" id="opt-lista-${i}-E" onclick="selecionarResolListaResp('E',${i})">
<div class="qc-opcao-circulo">E</div><div class="qc-opcao-texto">Errado</div></div>`;
} else {
['A','B','C','D','E'].forEach(l=>{
optsHTML+=`<div class="qc-opcao" id="opt-lista-${i}-${l}" onclick="selecionarResolListaResp('${l}',${i})">
<div class="qc-opcao-circulo">${l}</div><div class="qc-opcao-texto">Alternativa ${l}</div></div>`;
});
}
div.innerHTML=`
<div class="qc-card">
<div class="qc-header">
<span class="qc-num">${i+1}</span>
${q.codigo?`<span class="qc-codigo">${q.codigo}</span>`:''}
${q.banca?`<span style="font-size:.6rem;color:var(--blue);font-family:'Oswald',sans-serif;padding:2px 7px;background:rgba(96,165,250,.1);border-radius:4px">${q.banca}</span>`:''}
<div class="qc-mat" style="flex:1">
<span style="color:var(--gold);font-weight:600">${q.matNome||'—'}</span>
${q.assunto?`<span class="qc-mat-sep">›</span><span style="font-size:.65rem;color:rgba(255,255,255,.65)">${escapeHtml(q.assunto)}</span>`:''}
</div>
<span class="resol-status-tag">${tagHTML}</span>
</div>
<div class="qc-body">
${q.textoRef?`
<details class="qc-texto-ref">
<summary>
<span>📄 TEXTO DE REFERÊNCIA</span>
<span class="tr-arrow">▼</span>
</summary>
<div class="qc-texto-ref-body">${renderTexto(q.textoRef)}</div>
</details>`:''}
${q.enunciado?`<div class="qc-enunciado">${renderTexto(q.enunciado)}</div>`:''}
<div class="qc-divider"></div>
${optsHTML}
<div id="resol-lista-result-${i}" class="qc-result" style="margin-top:.5rem"></div>
<div style="margin-top:.65rem" id="resol-lista-btn-${i}">
<button class="qc-nav-btn confirmar" style="width:100%" onclick="confirmarResolListaResp(${i})">✓ Confirmar Resposta</button>
</div>
</div>
</div>`;
wrap.appendChild(div);
// HOTFIX foco/lista: restaurar estado visual de questão já respondida
if(q._confirmado){
  const btnEl2=document.getElementById('resol-lista-btn-'+i);
  if(btnEl2) btnEl2.style.display='none';
  const resultEl2=document.getElementById('resol-lista-result-'+i);
  if(resultEl2){
    const acertou2=(q._acertou===true);
    if(acertou2){
      resultEl2.className='qc-result acerto show';
      resultEl2.innerHTML=`<div class="qc-result-title" style="color:var(--green)">✓ Parabéns! Você acertou!</div>
<div style="font-size:.72rem;color:var(--muted)">Gabarito: <strong style="color:var(--green)">${q.gabarito}</strong></div>
${q.anotacao?`<details style="margin-top:.4rem"><summary style="font-size:.68rem;color:var(--blue);cursor:pointer;list-style:none">▶ Ver gabarito comentado</summary><div class="qc-result-gab">${renderTexto(q.anotacao)}</div></details>`:''}`;
    } else {
      resultEl2.className='qc-result erro show';
      resultEl2.innerHTML=`<div class="qc-result-title" style="color:var(--red)">✗ Resposta Incorreta</div>
<div style="font-size:.73rem;color:var(--muted)">Sua resposta: <strong style="color:var(--red)">${q._resposta||'—'}</strong> &nbsp;·&nbsp; Gabarito: <strong style="color:var(--green)">${q.gabarito||'—'}</strong></div>
${q.anotacao?`<details><summary style="font-size:.68rem;color:var(--blue);cursor:pointer;list-style:none">▶ Ver gabarito comentado</summary><div class="qc-result-gab" style="margin-top:.4rem;padding-top:.4rem;border-top:1px solid rgba(248,113,113,.2)">${renderTexto(q.anotacao)}</div></details>`:''}`;
    }
  }
  // Marcar a opção selecionada visualmente
  if(q._resposta){
    const tipo2=q.tipo||'CE';
    const opcoes2=div.querySelectorAll('.qc-opcao');
    const keys2=tipo2==='CE'?['C','E']:['A','B','C','D','E'];
    opcoes2.forEach((el2,ki)=>{
      if(keys2[ki]===q._resposta) el2.classList.add(tipo2==='CE'?(q._acertou?'sel-certo':'sel-errado'):'sel-letra');
    });
  }
}
});
}
function selecionarResolListaResp(val, idx){
resol_fila[idx]._resposta=val;
const item=document.getElementById('resol-lista-item-'+idx);
if(!item) return;
const tipo=resol_fila[idx].tipo||'CE';
item.querySelectorAll('.qc-opcao').forEach(el=>el.className='qc-opcao');
const opcoes=item.querySelectorAll('.qc-opcao');
const keys=tipo==='CE'?['C','E']:['A','B','C','D','E'];
opcoes.forEach((el,i)=>{
if(keys[i]===val) el.classList.add(tipo==='CE'?(val==='C'?'sel-certo':'sel-errado'):'sel-letra');
});
}
function confirmarResolListaResp(idx){
const q=resol_fila[idx];
if(!q._resposta){alert('Selecione uma resposta.');return;}
if(q._confirmado) return;
const acertou=q._resposta===q.gabarito;
q._confirmado=true; q._acertou=acertou;
if(acertou) resol_acertos++; else resol_erros++;
_atualizarOrigem(q, acertou);
const orig=ST.banco.find(b=>b.id===q.id)||q;
const btnEl=document.getElementById('resol-lista-btn-'+idx);
if(btnEl) btnEl.style.display='none';
const resultEl=document.getElementById('resol-lista-result-'+idx);
if(resultEl){
if(acertou){
resultEl.className='qc-result acerto show';
resultEl.innerHTML=`
<div class="qc-result-title" style="color:var(--green)">✓ Parabéns! Você acertou!</div>
<div style="font-size:.72rem;color:var(--muted)">Gabarito: <strong style="color:var(--green)">${q.gabarito}</strong>
${orig&&orig.acertosConsecutivos?`&nbsp;·&nbsp;<span style="color:var(--green)">✓ ${orig.acertosConsecutivos} seguido(s)</span>`:''}
${orig&&orig.massificada?' &nbsp;<span class="tag-massificada">✦ Massificada!</span>':''}
</div>
${q.anotacao?`<details style="margin-top:.4rem"><summary style="font-size:.68rem;color:var(--blue);cursor:pointer;list-style:none">▶ Ver gabarito comentado</summary><div class="qc-result-gab">${renderTexto(q.anotacao)}</div></details>`:''}`;
} else {
const motivoChips=MOTIVOS_ERRO.map((m,mi)=>
`<div class="motivo-chip" id="mc-lista-${idx}-${mi}" onclick="selecionarMotivoLista(${idx},${mi},'${m.replace(/'/g,"\\'")}')">${m}</div>`
).join('');
resultEl.className='qc-result erro show';
resultEl.innerHTML=`
<div class="qc-result-title" style="color:var(--red)">✗ Resposta Incorreta</div>
<div style="font-size:.73rem;color:var(--muted);margin-bottom:.4rem">
Sua resposta: <strong style="color:var(--red)">${q._resposta}</strong>
&nbsp;·&nbsp; Gabarito: <strong style="color:var(--green)">${q.gabarito||'—'}</strong>
</div>
${q.anotacao?`<details><summary style="font-size:.68rem;color:var(--blue);cursor:pointer;list-style:none">▶ Ver gabarito comentado</summary>
<div class="qc-result-gab" style="margin-top:.4rem;padding-top:.4rem;border-top:1px solid rgba(248,113,113,.2)">${renderTexto(q.anotacao)}</div></details>`:''}
<div style="margin-top:.6rem;padding-top:.6rem;border-top:1px solid rgba(248,113,113,.2)" id="motivo-section-lista-${idx}">
<div style="font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem">Por que errei?</div>
<div class="motivo-chips">${motivoChips}</div>
<div id="termo-wrap-lista-${idx}" style="display:none;margin-top:.3rem">
<input class="bq-search" id="termo-input-lista-${idx}" type="text" placeholder="Qual termo você confundiu?" style="font-size:.75rem">
</div>
<button class="qc-nav-btn confirmar" style="font-size:.65rem;padding:.35rem .6rem;margin-top:.4rem;width:auto" onclick="salvarMotivoLista(${idx})">💾 Salvar motivo</button>
</div>`;
}
}
updateResolProgress();
// HOTFIX foco/lista: atualizar toolbar Desempenho e mini-stats (igual ao modo Foco)
if(typeof rslUpdateDesemp === 'function') rslUpdateDesemp();
if(typeof buildResolMap === 'function') buildResolMap();
const item=document.getElementById('resol-lista-item-'+idx);
if(item){
const tagSpan=item.querySelector('.resol-status-tag');
if(tagSpan){
const orig2=ST.banco.find(b=>b.id===q.id)||q;
tagSpan.innerHTML=bqGetTag(orig2);
}
}
}
function updateResolProgress(){
const respondidas=resol_acertos+resol_erros+resol_puladas;
const sl=document.getElementById('resolucao-stats-label');
if(sl) sl.innerHTML=`<span style="color:var(--green)">✓${resol_acertos}</span> <span style="color:var(--red)">✗${resol_erros}</span>${resol_puladas?` <span style="color:var(--gold)">→${resol_puladas}</span>`:''}`;
const prog=document.getElementById('resolucao-progress-mini');
if(prog) prog.textContent=`${respondidas}/${resol_fila.length}`;
const lbl=document.getElementById('resolucao-progress-label');
if(lbl) lbl.textContent=`${respondidas} de ${resol_fila.length} respondidas`;
const pf=document.getElementById('resolucao-prog-fill');
if(pf) pf.style.width=Math.round(respondidas/resol_fila.length*100)+'%';
}
function _atualizarOrigem(q, acertou){
const orig=ST.banco.find(b=>b.id===q.id);
// FIX 9.2-C1: warn + graceful exit if question no longer in ST.banco
if(!orig){
  console.warn('[BQ] _atualizarOrigem: questão não encontrada em ST.banco',
    {id:q.id, codigo:q.codigo||'', enunciado:(q.enunciado||'').slice(0,60)});
  return;
}
// FIX 9.2-C2: motivo derived from context (q._motivo > mode > fallback)
const _motivo = (q._motivo&&q._motivo.trim())
  ? q._motivo
  : resol_modoMass ? 'massificacao'
  : resol_modoBanco ? 'banco'
  : 'caderno';
const _dataHoje = new Date().toLocaleDateString('pt-BR');
const _entrada  = { data:_dataHoje, resp:q._resposta, acertou, motivo:_motivo };

// ── FASE ESTABILIZAÇÃO: Escrever progresso global na questão em ST.banco ─
// Fonte única: campos diretos em orig (q em ST.banco)
orig.historico = orig.historico || [];
orig.historico.push(_entrada);
orig.tentativas = (orig.tentativas || 0) + 1;
if(acertou){
  orig.acertos = (orig.acertos || 0) + 1;
  orig.acertosConsecutivos = (orig.acertosConsecutivos || 0) + 1;
  if(orig.acertosConsecutivos >= 5 && orig.errouAlgumVez) orig.massificada = true;
} else {
  orig.erros = (orig.erros || 0) + 1;
  orig.errouAlgumVez = true;
  orig.acertosConsecutivos = 0;
  if(orig.massificada) orig.massificada = false;
}
orig.ultimaResposta = q._resposta;
orig.ultimaData     = _dataHoje;
orig.resolvida      = true;
orig.correta        = !!acertou;
saveState();
}
function buildResolMap(){
// RSL: update desempenho panel if open
if(typeof rslUpdateDesemp==='function') rslUpdateDesemp();
const prog=document.getElementById('resolucao-progress-mini');
if(prog) prog.textContent=`${resol_idx+1}/${resol_fila.length}`;
const sl=document.getElementById('resolucao-stats-label');
if(sl) sl.innerHTML=`<span style="color:var(--green)">✓${resol_acertos}</span> <span style="color:var(--red)">✗${resol_erros}</span> <span style="color:var(--gold)">→${resol_puladas}</span>`;
const pf=document.getElementById('resolucao-prog-fill');
if(pf) pf.style.width=Math.round((resol_idx+1)/resol_fila.length*100)+'%';
}
function irResolucao(idx){
resol_idx=idx;
document.getElementById('resolucao-result-box').className='qc-result';
buildResolMap(); renderResolCard();
}
function renderResolCard(){
const q=resol_fila[resol_idx];
const card=document.getElementById('resolucao-card');
const nav=document.getElementById('resolucao-nav');
const resultBox=document.getElementById('resolucao-result-box');
const isLast=resol_idx===resol_fila.length-1;
resultBox.className='qc-result';
// FIX 9.3.1: ensure nav is visible in foco mode (may have been hidden by lista mode or after confirming)
if(nav && resol_modo_atual !== 'lista') nav.style.display='';
// HOTFIX foco/lista: atualizar toolbar ao entrar em Foco (pode vir do Modo Lista)
if(typeof rslUpdateDesemp === 'function') rslUpdateDesemp();
document.getElementById('resolucao-progress-label').textContent=`Questão ${resol_idx+1} de ${resol_fila.length}`;
const tipo=q.tipo||'CE';
const optsHTML=_buildOpcsResol(q, tipo, resol_idx);
card.innerHTML=`
<div class="qc-card">
<div class="qc-header">
<span class="qc-num">${resol_idx+1}</span>
${q.codigo?`<span class="qc-codigo">${q.codigo}</span>`:''}
${q.banca?`<span style="font-size:.6rem;color:var(--blue);font-family:'Oswald',sans-serif;padding:2px 7px;background:rgba(96,165,250,.1);border-radius:4px">${q.banca}</span>`:''}
<div class="qc-mat" style="flex:1">
<span style="color:var(--gold);font-weight:600">${q.matNome||'—'}</span>
${q.assunto?`<span class="qc-mat-sep">›</span><span style="font-size:.65rem;color:rgba(255,255,255,.65)">${escapeHtml(q.assunto)}</span>`:''}
</div>
<span style="flex-shrink:0">${bqGetTag(ST.banco.find(b=>b.id===q.id)||q)}</span>
</div>
<div class="qc-body">
${q.textoRef?`
<details class="qc-texto-ref">
<summary>
<span>📄 TEXTO DE REFERÊNCIA</span>
<span class="tr-arrow">▼</span>
</summary>
<div class="qc-texto-ref-body">${renderTexto(q.textoRef)}</div>
</details>`:''}
${q.enunciado?`<div class="qc-enunciado">${renderTexto(q.enunciado)}</div>`:''}
<div class="qc-divider"></div>
${optsHTML}
</div>
</div>`;
nav.innerHTML=`
<button class="qc-nav-btn prev" onclick="irResolucao(${Math.max(0,resol_idx-1)})" ${resol_idx===0?'disabled':''} style="${resol_modo_atual!=='lista'?'display:none':''}">← Anterior</button>
<button class="qc-nav-btn pular" onclick="pularQuestao()" style="${resol_modo_atual!=='lista'?'display:none':''}">→ Pular</button>
<button class="qc-nav-btn confirmar" onclick="confirmarResolResposta()">✓ Confirmar Resposta</button>
${isLast?`<button class="qc-nav-btn finish" onclick="encerrarResolucao()">🏁 Encerrar</button>`:''}`;
// HOTFIX foco/lista: se a questão já foi respondida (vindo do Modo Lista), mostrar resultado
if(q._confirmado){
  const _navEl=document.getElementById('resolucao-nav');
  if(_navEl) _navEl.innerHTML=`${!isLast?'<button class="qc-nav-btn next" onclick="avancarResolucao()">Próxima →</button>':''}<button class="qc-nav-btn finish" onclick="encerrarResolucao()">🏁 Encerrar</button>`;
  if(q._acertou===true){
    resultBox.className='qc-result acerto show';
    const orig3=ST.banco.find(b=>b.id===q.id)||q;
    resultBox.innerHTML=`<div class="qc-result-title" style="color:var(--green)">✓ Parabéns! Você acertou!</div>
<div style="font-size:.72rem;color:var(--muted)">Gabarito correto: <strong style="color:var(--green)">${q.gabarito}</strong>${orig3&&orig3.acertosConsecutivos?` &nbsp;·&nbsp; <span style="color:var(--green)">✓ ${orig3.acertosConsecutivos} seguido(s)</span>`:''}</div>
${q.anotacao?`<div class="qc-result-gab" style="margin-top:.5rem;padding-top:.5rem;border-top:1px solid rgba(74,222,128,.2)">${renderTexto(q.anotacao)}</div>`:''}`;
  } else if(q._acertou===false){
    resultBox.className='qc-result erro show';
    resultBox.innerHTML=`<div class="qc-result-title" style="color:var(--red)">✗ Resposta Incorreta</div>
<div style="font-size:.73rem;color:var(--muted)">Sua resposta: <strong style="color:var(--red)">${q._resposta||'—'}</strong> &nbsp;·&nbsp; Gabarito: <strong style="color:var(--green)">${q.gabarito||'—'}</strong></div>
${q.anotacao?`<details><summary style="font-size:.68rem;color:var(--blue);cursor:pointer;list-style:none">▶ Ver gabarito comentado</summary><div class="qc-result-gab" style="margin-top:.4rem;padding-top:.4rem;border-top:1px solid rgba(248,113,113,.2)">${renderTexto(q.anotacao)}</div></details>`:''}`;
  }
}
}
function _buildOpcsResol(q, tipo, idx){
const desc=q._descartadas||{};
let html='<div class="qc-opcoes-label">Selecione sua resposta</div>';
function _opc(letra, labelEl){
const isDesc=desc[letra]===true;
const isSel=q._resposta===letra;
const selCls=letra==='C'&&isSel?'sel-certo':letra==='E'&&isSel?'sel-errado':isSel?'sel-letra':'';
const descCls=isDesc&&!isSel?'descartada':'';
const onclick=isDesc?'':`onclick="selecionarResolResposta('${letra}')"`;
const tesoura=`<button class="qc-tesoura-btn" onclick="event.stopPropagation();descartarOpcaoResol('${letra}',${idx})" title="${isDesc?'Restaurar':'Descartar opção'}">✂</button>`;
return `<div class="qc-opcao ${selCls} ${descCls}" ${onclick}>${labelEl}${tesoura}</div>`;
}
const qOpt=q.questoes||{};
if(tipo==='CE'){
html+=_opc('C','<div class="qc-opcao-circulo">C</div><div class="qc-opcao-texto">Certo</div>');
html+=_opc('E','<div class="qc-opcao-circulo">E</div><div class="qc-opcao-texto">Errado</div>');
} else {
const letrasR=tipo==='ABCD'?['A','B','C','D']:['A','B','C','D','E'];
letrasR.forEach(l=>{
const txt=qOpt[l]?renderTexto(qOpt[l]):'Alternativa '+l;
html+=_opc(l,`<div class="qc-opcao-circulo">${l}</div><div class="qc-opcao-texto" style="text-align:left">${txt}</div>`);
});
}
return html;
}
function descartarOpcaoResol(letra, idx){
const q=resol_fila[idx];
if(!q._descartadas) q._descartadas={};
q._descartadas[letra]=!q._descartadas[letra];
if(q._descartadas[letra]&&q._resposta===letra) q._resposta='';
renderResolCard();
}
function selecionarResolResposta(val){
resol_fila[resol_idx]._resposta=val;
renderResolCard();
}
function pularQuestao(){
const q=resol_fila[resol_idx];
q._confirmado=true; q._acertou=null; q._pulou=true;
resol_puladas++;
buildResolMap();
if(resol_idx<resol_fila.length-1){resol_idx++;renderResolCard();}
else encerrarResolucao();
}
function confirmarResolResposta(){
const q=resol_fila[resol_idx];
if(!q._resposta){alert('Selecione uma resposta antes de confirmar.');return;}
const acertou=q._resposta===q.gabarito;
q._confirmado=true; q._acertou=acertou;
if(acertou) resol_acertos++; else resol_erros++;
buildResolMap();
_atualizarOrigem(q, acertou);
const orig=ST.banco.find(b=>b.id===q.id)||q;
const nav=document.getElementById('resolucao-nav');
const resultBox=document.getElementById('resolucao-result-box');
const isLast=resol_idx===resol_fila.length-1;
if(acertou){
resultBox.className='qc-result acerto show';
resultBox.innerHTML=`
<div class="qc-result-title" style="color:var(--green)">✓ Parabéns! Você acertou!</div>
<div style="font-size:.72rem;color:var(--muted)">Gabarito correto: <strong style="color:var(--green)">${q.gabarito}</strong>
${orig&&orig.acertosConsecutivos?`&nbsp;·&nbsp;<span style="color:var(--green)">✓ ${orig.acertosConsecutivos} seguido(s)</span>`:''}
${orig&&orig.massificada?' &nbsp;<span class="tag-massificada">✦ Massificada!</span>':''}
</div>
${q.anotacao?`<div class="qc-result-gab" style="margin-top:.5rem;padding-top:.5rem;border-top:1px solid rgba(74,222,128,.2)">${renderTexto(q.anotacao)}</div>`:''}`;
nav.innerHTML=`
${!isLast?`<button class="qc-nav-btn next" onclick="avancarResolucao()">Próxima →</button>`:''}
<button class="qc-nav-btn finish" onclick="encerrarResolucao()">🏁 Encerrar</button>`;
} else {
const motivoChips=MOTIVOS_ERRO.map((m,i)=>
`<div class="motivo-chip" id="mc-${i}" onclick="selecionarMotivoResol(${i},'${m.replace(/'/g,"\\'")}')">${m}</div>`
).join('');
resultBox.className='qc-result erro show';
resultBox.innerHTML=`
<div class="qc-result-title" style="color:var(--red)">✗ Resposta Incorreta</div>
<div style="font-size:.73rem;color:var(--muted);margin-bottom:.5rem">
Sua resposta: <strong style="color:var(--red)">${q._resposta}</strong>
&nbsp;·&nbsp; Gabarito: <strong style="color:var(--green)">${q.gabarito||'—'}</strong>
</div>
${q.anotacao?`<details><summary style="font-size:.68rem;color:var(--blue);cursor:pointer;list-style:none">▶ Ver gabarito comentado</summary>
<div class="qc-result-gab" style="margin-top:.4rem;padding-top:.4rem;border-top:1px solid rgba(248,113,113,.2)">${renderTexto(q.anotacao)}</div></details>`:''}
<div style="margin-top:.65rem;padding-top:.6rem;border-top:1px solid rgba(248,113,113,.2)" id="motivo-section-foco">
<div style="font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem">Por que errei?</div>
<div class="motivo-chips">${motivoChips}</div>
<div id="termo-wrap" style="display:none;margin-top:.3rem">
<input class="bq-search" id="termo-input" type="text" placeholder="Qual termo você confundiu?" style="font-size:.75rem">
</div>
<button class="qc-nav-btn confirmar" style="font-size:.65rem;padding:.35rem .6rem;margin-top:.4rem;width:auto" onclick="salvarMotivoResol()">💾 Salvar motivo</button>
</div>`;
nav.innerHTML=`
${!isLast?`<button class="qc-nav-btn next" onclick="avancarResolucao()">Próxima →</button>`:''}
<button class="qc-nav-btn finish" onclick="encerrarResolucao()">🏁 Encerrar</button>`;
}
}
function selecionarMotivoLista(qIdx, mIdx, motivo){
document.querySelectorAll(`[id^="mc-lista-${qIdx}-"]`).forEach(c=>c.classList.remove('sel'));
const chip=document.getElementById(`mc-lista-${qIdx}-${mIdx}`);
if(chip) chip.classList.add('sel');
resol_fila[qIdx]._motivo=motivo;
const termoWrap=document.getElementById(`termo-wrap-lista-${qIdx}`);
if(termoWrap) termoWrap.style.display=motivo.includes('Confundi')?'block':'none';
}
function salvarMotivoLista(qIdx){
const q=resol_fila[qIdx];
const motivo=q._motivo||'';
const termo=(document.getElementById(`termo-input-lista-${qIdx}`)?.value||'').trim();
const fullMotivo=termo?`${motivo}: "${termo}"`:motivo;
const orig=ST.banco.find(b=>b.id===q.id);
if(orig&&orig.historico&&orig.historico.length){
orig.historico[orig.historico.length-1].motivo=fullMotivo;
saveState();
}
const motivoDiv=document.getElementById(`motivo-section-lista-${qIdx}`);
if(motivoDiv){
motivoDiv.innerHTML=`<div style="font-size:.68rem;color:var(--muted);margin-top:.4rem;padding-top:.4rem;border-top:1px solid rgba(248,113,113,.2)">
✓ Motivo salvo: <strong style="color:rgba(255,255,255,.75)">${fullMotivo||'(sem motivo)'}</strong>
</div>`;
}
}
function selecionarMotivoResol(idx, motivo){
document.querySelectorAll('.motivo-chip').forEach(c=>c.classList.remove('sel'));
document.getElementById('mc-'+idx).classList.add('sel');
resol_fila[resol_idx]._motivo=motivo;
const termoWrap=document.getElementById('termo-wrap');
if(termoWrap) termoWrap.style.display=motivo.includes('Confundi')?'block':'none';
}
function salvarMotivoResol(){
const q=resol_fila[resol_idx];
const motivo=q._motivo||(document.querySelector('.motivo-chip.sel')?.textContent||'');
const termo=(document.getElementById('termo-input')?.value||'').trim();
const fullMotivo=termo?`${motivo}: "${termo}"`:motivo;
const orig=ST.banco.find(b=>b.id===q.id);
if(orig&&orig.historico&&orig.historico.length){
orig.historico[orig.historico.length-1].motivo=fullMotivo;
saveState();
}
const motivoDiv=document.getElementById('motivo-section-foco');
if(motivoDiv){
motivoDiv.innerHTML=`<div style="font-size:.68rem;color:var(--muted);margin-top:.4rem;padding-top:.4rem;border-top:1px solid rgba(248,113,113,.2)">
✓ Motivo salvo: <strong style="color:rgba(255,255,255,.75)">${fullMotivo||'(sem motivo)'}</strong>
</div>`;
}
}
function avancarResolucao(){
document.getElementById('resolucao-result-box').className='qc-result';
if(resol_idx<resol_fila.length-1){resol_idx++;renderResolCard();}
else encerrarResolucao();
}
function _registrarQuestaoStat(matId, assunto, acertou){
const lista=_assuntos(assunto);
if(lista.length>1){
lista.forEach(a=>_registrarQuestaoStat(matId, a, acertou));
return;
}
if(!matId) return;
const mat=(window.QUESTOES_MATERIAS||[]).find(m=>m.id===matId);
if(!mat) return;
let topicId=mat.topics[0]?.id||'t0';
if(assunto){
const found=mat.topics.find(t=>
t.name.toLowerCase()===assunto.toLowerCase()||
assunto.toLowerCase().includes(t.name.toLowerCase())||
t.name.toLowerCase().includes(assunto.toLowerCase())
);
if(found) topicId=found.id;
}
const key=getQKey(matId, topicId);
if(!ST.questoes[key]) ST.questoes[key]={total:0,acertos:0};
ST.questoes[key].total++;
if(acertou) ST.questoes[key].acertos++;
const hoje=new Date().toLocaleDateString('pt-BR');
if(!ST.questoesLog) ST.questoesLog={};
if(!ST.questoesLog[key]) ST.questoesLog[key]=[];
const existente=ST.questoesLog[key].find(e=>e.data===hoje);
if(existente){
existente.total=ST.questoes[key].total;
existente.acertos=ST.questoes[key].acertos;
} else {
ST.questoesLog[key].push({data:hoje, total:ST.questoes[key].total, acertos:ST.questoes[key].acertos});
}
}
function encerrarResolucao(){
const _ov=document.getElementById('resolucao-overlay');
if(_ov){_ov.classList.remove('open');_ov.style.display='';}
// FASE ESTABILIZAÇÃO: encerrarResolucao salva em ST.bancoSessoes global
const _tot=resol_fila.filter(q=>!q._pulou&&q._acertou!==null).length;
const _ac=resol_fila.filter(q=>q._acertou===true).length;
const _pul=resol_fila.filter(q=>q._pulou).length;
const _tit=resol_modoMass?'Massificadas':(resol_modoBanco?'Questões':'Caderno de Erros');
const _mats=[...new Set(resol_fila.map(q=>q.matNome||q.mat).filter(Boolean))].join(', ');
try { _registrarSessao(_tit, _mats, _tot, _ac, 0); } catch(e) { console.warn('[P01] _registrarSessao falhou:', e); }
// ── Register global BancoSessao (SHARED_FIELD — survives contest switch) ──
if(_tot>0){
  try {
  if(!ST.bancoSessoes) ST.bancoSessoes=[];
  const _now=new Date();
  const _hora=_now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const _data=_now.toLocaleDateString('pt-BR');
  // Build per-matéria breakdown
  const _matsObj={};
  resol_fila.filter(q=>!q._pulou&&q._acertou!==null).forEach(q=>{
    const mn=q.matNome||q.mat||'Sem disciplina';
    if(!_matsObj[mn]) _matsObj[mn]={total:0,acertos:0};
    _matsObj[mn].total++;
    if(q._acertou) _matsObj[mn].acertos++;
  });
  // Deduplicate: same data+hora+total+acertos won't be added twice
  const _sessKey=`${_data}|${_hora}|${_tot}|${_ac}`;
  const _exists=ST.bancoSessoes.some(s=>s._key===_sessKey);
  const _novaSessao={
    _key:_sessKey,
    id:`bsess_${_now.getTime()}`,
    data:_data, hora:_hora, timestamp:_now.getTime(),
    origem:resol_modoBanco?'banco':'caderno',
    total:_tot, acertos:_ac, erros:_tot-_ac,
    materias:_matsObj,
    banca:(resol_fila[0]&&resol_fila[0].banca)||''
  };
  if(!_exists){
    // FASE ESTABILIZAÇÃO: gravar sessão em ST.bancoSessoes global
    ST.bancoSessoes.push(_novaSessao);
    if(typeof saveStateNow === 'function') saveStateNow(); else saveState();
  }
  } catch(e) { console.warn('[P01] encerrarResolucao bancoSessao:', e); }
}
if(window._revMode){
resol_fila.forEach(q=>{if(q._acertou!==null&&!q._pulou)_revAtualizar(q,q._acertou);});
window._revMode=false;
}
// FIX: ao resolver pelo Caderno de Erros, tb atualiza a Revisão Espaçada p/ questões pendentes hoje
if(!resol_modoMass&&!resol_modoBanco&&!window._revMode){
const _hojeRev=_revHoje();
resol_fila.forEach(q=>{
if(q._acertou!==null&&!q._pulou&&q.errouAlgumVez){
const _info=(ST.revisaoEspacada||{})[q.id];
if(!_info||!_info.proxima||_revParseData(_info.proxima)<=_hojeRev){
_revAtualizar(q,q._acertou);
}
}
});
}
// Banco/caderno de erros NÃO registra na Estatística de Questões (ela é manual)
const porMat={};
resol_fila.forEach(q=>{
if(!q.mat||q._pulou||q._acertou===null) return;
if(!porMat[q.mat]) porMat[q.mat]={name:q.matNome||q.mat,acertos:0,erros:0,total:0};
porMat[q.mat].total++;
if(q._acertou) porMat[q.mat].acertos++;
else porMat[q.mat].erros++;
});
const titulo=resol_modoMass?'🔥 Resultado — Massificadas':
resol_modoBanco?'Resultado — Questões':
'📕 Resultado — Caderno de Erros';
saveState();
// 9.3.7 / FASE 9.4.13 BUG 2 FIX: Mostrar resumo premium ANTES de qualquer rebuild do DOM
// Os rebuilds (buildBanco, bqRenderStats, etc.) são chamados apenas quando o usuário
// fechar o resumo via rslResumoVoltar(), para não destruir o overlay recém-aberto.
// HOTFIX: usar try/catch para garantir que erros anteriores não impeçam o resumo de aparecer
try {
if(typeof rslMostrarResumo==='function') rslMostrarResumo({
titulo,
acertos:resol_acertos,erros:resol_erros,puladas:resol_puladas||_pul,
total:resol_fila.length,porMat,
tempoUsado:rslTimerUsado?rslTimerSegsTotaisUsados:null
});
} catch(e) { console.error('[P01] rslMostrarResumo falhou:', e); }
// showDonutResult removido — usar apenas resumo premium (9.3.8.1)
// Os rebuilds são executados apenas se o overlay de resumo NÃO estiver aberto
// (caso rslMostrarResumo não exista ou overlay não foi encontrado):
const _rslOvNow = document.getElementById('rsl-resumo-overlay');
if (!_rslOvNow || !_rslOvNow.classList.contains('open')) {
  if(typeof buildBanco==='function')          buildBanco();
  if(typeof bqRenderStats==='function')       bqRenderStats();
  if(typeof buildQuestoes==='function')       buildQuestoes();
  if(typeof renderDashboard==='function')     renderDashboard();
  if(typeof buildSessoesHistorico==='function') buildSessoesHistorico();
  if(typeof buildGraficoEvolucao==='function') buildGraficoEvolucao();
}
}
let _donutQuestoes = {respondidas:[], corretas:[], erradas:[]};
function toggleDonutList(tipo){
const list = document.getElementById('donut-list-'+tipo);
const row  = document.getElementById('donut-row-'+tipo);
const isOpen = list.classList.contains('open');
['respondidas','corretas','erradas'].forEach(t=>{
document.getElementById('donut-list-'+t).classList.remove('open');
document.getElementById('donut-row-'+t).classList.remove('active');
});
if(!isOpen){
list.classList.add('open');
row.classList.add('active');
if(!list.children.length){
const qs = _donutQuestoes[tipo]||[];
if(!qs.length){
list.innerHTML='<div style="font-size:.72rem;color:var(--dim);font-style:italic;padding:.5rem .4rem">Nenhuma questão nessa categoria.</div>';
} else {
qs.forEach(q=>{
const el=document.createElement('div');
el.className='donut-q-item';
const gabClass = q._acertou===true?'certo':q._acertou===false?'errado':'pulado';
const gabLabel = q._acertou===true?'✓ CERTO':q._acertou===false?`✗ Gab: ${q.gabOficial||'—'}`:'→ PULADA';
el.innerHTML=`
<div class="donut-q-item-header">
<span class="donut-q-num" style="color:${q._acertou===true?'var(--green)':q._acertou===false?'var(--red)':'var(--gold)'}">Q.${q.questNum||q.num||'—'}</span>
${q.codigo?`<span style="font-size:.58rem;color:var(--blue);font-family:'Oswald',sans-serif">${q.codigo}</span>`:''}
<span class="donut-q-mat">${q.matNome||q.mat||'—'}</span>
<span class="donut-q-gab ${gabClass}">${gabLabel}</span>
</div>
${q.assunto?`<div style="font-size:.62rem;color:var(--muted);font-style:italic;margin-bottom:.3rem">${_assuntos(q.assunto).map(a=>escapeHtml(a)).join(' · ')}</div>`:''}
${q.enunciado?`<div class="donut-q-enunciado">${renderTexto(q.enunciado)}</div>`:'<div style="font-size:.68rem;color:var(--dim);font-style:italic">Sem enunciado.</div>'}
${(q._acertou===false&&q.anotacao)?`<details style="margin-top:.4rem"><summary style="font-size:.65rem;color:var(--blue);cursor:pointer;list-style:none">💬 Ver gabarito comentado</summary><div style="font-size:.7rem;color:rgba(255,255,255,.75);line-height:1.6;margin-top:.3rem">${renderTexto(q.anotacao)}</div></details>`:''}`;
list.appendChild(el);
});
}
}
}
}
function showDonutResult({titulo, acertos, erros, puladas=0, total, tempo=null, nota=null, anuladas=0, porMat=null, onSave, saveBtnLabel='💾 Salvar', questoes=null}){
const respondidas = acertos + erros;
const pct = respondidas > 0 ? Math.round(acertos / respondidas * 100) : 0;
const circum = 2 * Math.PI * 50;
const acertosArc = total > 0 ? (acertos / total) * circum : 0;
const errosArc   = total > 0 ? (erros   / total) * circum : 0;
const puladasArc = total > 0 ? (puladas / total) * circum : 0;
const donutAcertos = document.getElementById('donut-acertos');
const donutErros   = document.getElementById('donut-erros');
const donutPuladas = document.getElementById('donut-puladas');
donutAcertos.setAttribute('stroke-dasharray', `${acertosArc} ${circum - acertosArc}`);
donutAcertos.setAttribute('stroke-dashoffset', '0');
donutErros.setAttribute('stroke-dasharray', `${errosArc} ${circum - errosArc}`);
donutErros.setAttribute('stroke-dashoffset', String(-(acertosArc)));
if(donutPuladas){
donutPuladas.setAttribute('stroke-dasharray', `${puladasArc} ${circum - puladasArc}`);
donutPuladas.setAttribute('stroke-dashoffset', String(-(acertosArc + errosArc)));
const legendPul=document.getElementById('donut-legend-puladas');
if(legendPul) legendPul.style.display=puladas>0?'flex':'none';
}
const pctColor = pct>=70?'var(--green)':pct>=50?'#fbbf24':'var(--red)';
document.getElementById('donut-pct-text').textContent = pct+'%';
document.getElementById('donut-pct-text').style.color = pctColor;
document.getElementById('donut-modal-title').textContent = titulo||'Acompanhe o seu desempenho';
const notaGrande=document.getElementById('donut-nota-grande');
const notaGrandeVal=document.getElementById('donut-nota-grande-val');
if(notaGrande && nota!==null){
notaGrande.style.display='block';
notaGrandeVal.textContent=(nota>=0?'+':'')+nota;
notaGrandeVal.style.color=nota>0?'var(--green)':nota<0?'var(--red)':'var(--muted)';
} else if(notaGrande){
notaGrande.style.display='none';
}
document.getElementById('donut-respondidas').textContent = respondidas;
document.getElementById('donut-corretas').textContent    = acertos;
document.getElementById('donut-erradas').textContent     = erros;
document.getElementById('donut-puladas').textContent     = puladas;
document.getElementById('donut-row-puladas').style.display = puladas>0?'flex':'none';
const notaRow = document.getElementById('donut-row-nota');
if(nota!==null){
notaRow.style.display='flex';
const notaEl=document.getElementById('donut-nota');
notaEl.textContent=(nota>=0?'+':'')+nota;
notaEl.style.color=nota>0?'var(--green)':nota<0?'var(--red)':'var(--muted)';
} else { notaRow.style.display='none'; }
const tempoRow = document.getElementById('donut-row-tempo');
if(tempo!==null){
tempoRow.style.display='flex';
document.getElementById('donut-tempo').textContent=fmtSecs(tempo);
} else { tempoRow.style.display='none'; }
const extraEl=document.getElementById('donut-extra');
if(nota!==null){
const brancos_=puladas||0;
const anuladas_=anuladas||0;
extraEl.innerHTML=`
<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-bottom:.3rem">
<span style="color:var(--green);font-weight:700">✓ ${acertos} acertos (+${acertos})</span>
<span style="color:var(--dim)">·</span>
<span style="color:var(--red);font-weight:700">✗ ${erros} erros (-${erros})</span>
<span style="color:var(--dim)">·</span>
<span style="color:var(--muted)">— ${brancos_} em branco (0)</span>
${anuladas_?`<span style="color:var(--dim)">·</span><span style="color:#c4b5fd;font-weight:700">⊘ ${anuladas_} anulada(s) (+${anuladas_})</span>`:''}
</div>
<div style="font-size:.75rem;font-weight:700;color:${nota>0?'var(--green)':nota<0?'var(--red)':'var(--muted)'}">
Pontuação final: ${nota>=0?'+':''}${nota} pts de ${total}
</div>`;
} else {
const respondidas_=(acertos+erros);
extraEl.textContent=`${respondidas_} de ${total} questões respondidas · ${puladas||0} em branco`;
}
['respondidas','corretas','erradas'].forEach(t=>{
const l=document.getElementById('donut-list-'+t);
l.innerHTML=''; l.classList.remove('open');
document.getElementById('donut-row-'+t).classList.remove('active');
});
if(questoes){
_donutQuestoes.respondidas = questoes.filter(q=>q._acertou!==null&&!q._pulou);
_donutQuestoes.corretas    = questoes.filter(q=>q._acertou===true);
_donutQuestoes.erradas     = questoes.filter(q=>q._acertou===false);
} else {
_donutQuestoes = {respondidas:[], corretas:[], erradas:[]};
}
const matSection=document.getElementById('donut-mat-section');
const matList=document.getElementById('donut-mat-list');
if(porMat && Object.values(porMat).some(m=>m.total>0)){
matSection.style.display='block';
matList.innerHTML='';
Object.values(porMat).filter(m=>m.total>0).forEach(m=>{
const r=m.total>0?Math.round((m.acertos||0)/m.total*100):0;
const rc=r>=70?'var(--green)':r>=50?'#fbbf24':'var(--red)';
const el=document.createElement('div');
el.className='donut-mat-row';
const nota_mat=m.acertos-(m.erros||m.total-m.acertos);
const notaTxt=nota!==null?` · nota ${nota_mat>=0?'+':''}${nota_mat}`:'';
el.innerHTML=`<div class="donut-mat-name">${m.name}</div><div class="donut-mat-val" style="color:${rc}">${r}%${notaTxt}</div>`;
matList.appendChild(el);
});
} else {
matSection.style.display='none';
}
const actionsEl=document.getElementById('donut-actions');
actionsEl.innerHTML='';
if(onSave){
const btn=document.createElement('button');
btn.className='result-btn save';
btn.style.cssText='width:100%;background:var(--gold);color:#08081a;border:none;border-radius:8px;padding:.6rem;font-family:Oswald,sans-serif;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;cursor:pointer';
btn.textContent=saveBtnLabel;
btn.onclick=()=>{
const _dm=document.getElementById('donut-modal-overlay');
_dm.classList.remove('open');_dm.style.display='';
onSave();
};
actionsEl.appendChild(btn);
}
const closeBtn=document.createElement('button');
closeBtn.className='reset-btn';
closeBtn.style.cssText='width:100%;margin-top:.5rem';
closeBtn.textContent='Fechar';
closeBtn.onclick=()=>{
const _dm=document.getElementById('donut-modal-overlay');
_dm.classList.remove('open');
_dm.style.display='';
if(!onSave){ buildBanco();bqRenderStats();renderDashboard(); }
};
actionsEl.appendChild(closeBtn);
document.getElementById('donut-modal-overlay').classList.add('open');
}
let _editQuestaoId = null;
function abrirEdicaoQuestao(idOuCodigo){
const q = ST.banco.find(b=>b.id===idOuCodigo) ||
resol_fila.find(r=>r.id===idOuCodigo||r.codigo===idOuCodigo);
if(!q){alert('Questão não encontrada no banco.');return;}
const orig = ST.banco.find(b=>b.id===q.id) || q;
_editQuestaoId = orig.id;
const eqBanca=document.getElementById('eq-banca');
if(eqBanca&&eqBanca.options.length<=1){
BANCAS.forEach(b=>{const o=document.createElement('option');o.value=b;o.textContent=b;eqBanca.appendChild(o);});
}
const eqMat=document.getElementById('eq-mat');
if(eqMat&&eqMat.options.length<=1){
QUESTOES_MATERIAS.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;eqMat.appendChild(o);});
}
document.getElementById('eq-codigo').value   = orig.codigo||'';
document.getElementById('eq-assunto').value  = orig.assunto||'';
document.getElementById('eq-enunciado').value = orig.enunciado||'';
document.getElementById('eq-comentado').value = orig.anotacao||orig.gabarito_comentado||'';
const eqTR=document.getElementById('eq-texto-ref'); if(eqTR) eqTR.value=orig.textoRef||'';
if(eqBanca) eqBanca.value = orig.banca||'';
if(eqMat) eqMat.value = orig.mat||'';
const eqModelo=document.getElementById('eq-modelo');
if(eqModelo){
const tipo=orig.tipo||'CE';
const tipoEdit=tipo==='CE'?'CE':orig.questoes?.length===4||(orig.tipo==='ABCD')?'ABCD':'ABCDE';
eqModelo.value=tipoEdit;
eqAtualizarGabarito();
if(tipoEdit==='ABCD'||tipoEdit==='ABCDE'){
if(orig.questoes) _altsWrite('eq', orig.questoes);
} else {
_altsClear('eq');
}
}
const eqGab=document.getElementById('eq-gabarito');
if(eqGab) eqGab.value = orig.gabarito||'';
document.getElementById('edit-questao-overlay').classList.add('open');
}
function eqAtualizarGabarito(){
const modelo=document.getElementById('eq-modelo').value;
_altsShowHide('eq', modelo);
const sel=document.getElementById('eq-gabarito');
const prev=sel.value;
sel.innerHTML='';
if(modelo==='CE'){
sel.innerHTML='<option value="C">Certo</option><option value="E">Errado</option><option value="ANULADA">⊘ Anulada</option>';
} else if(modelo==='ABCD'){
['A','B','C','D','ANULADA'].forEach(l=>sel.innerHTML+=`<option value="${l}">${l==='ANULADA'?'⊘ Anulada':l}</option>`);
} else {
['A','B','C','D','E','ANULADA'].forEach(l=>sel.innerHTML+=`<option value="${l}">${l==='ANULADA'?'⊘ Anulada':l}</option>`);
}
if([...sel.options].some(o=>o.value===prev)) sel.value=prev;
}
function salvarEdicaoQuestao(){
if(!_editQuestaoId) return;
const orig=ST.banco.find(b=>b.id===_editQuestaoId);
if(!orig){alert('Questão não encontrada.');return;}
const modelo=document.getElementById('eq-modelo').value;
const matId=document.getElementById('eq-mat').value;
const matObj=QUESTOES_MATERIAS.find(m=>m.id===matId);
orig.codigo   = (document.getElementById('eq-codigo').value||'').trim();
orig.banca    = document.getElementById('eq-banca').value||'';
orig.mat      = matId;
orig.matNome  = matObj?matObj.name:'';
orig.assunto  = (document.getElementById('eq-assunto').value||'').trim();
orig.enunciado= (document.getElementById('eq-enunciado').value||'').trim();
const eqMod=document.getElementById('eq-modelo').value;
if(eqMod==='ABCD'||eqMod==='ABCDE') orig.questoes=_altsRead('eq');
else orig.questoes=null;
orig.tipo=eqMod==='CE'?'CE':eqMod==='ABCD'?'ABCD':'ABCDE';
orig.textoRef = (document.getElementById('eq-texto-ref')?.value||'').trim();
orig.tipo     = modelo==='CE'?'CE':'ABCDE';
orig.gabarito = document.getElementById('eq-gabarito').value;
orig.anotacao = (document.getElementById('eq-comentado').value||'').trim();
const filaQ=resol_fila.find(r=>r.id===_editQuestaoId);
if(filaQ){
Object.assign(filaQ, {
codigo:orig.codigo, banca:orig.banca, mat:orig.mat, matNome:orig.matNome,
assunto:orig.assunto, enunciado:orig.enunciado, textoRef:orig.textoRef, tipo:orig.tipo,
gabarito:orig.gabarito, anotacao:orig.anotacao
});
}
saveState();
fecharEdicaoQuestao();
if(resol_modo_atual==='lista'){
renderResolLista();
} else {
renderResolCard();
}
const btn=document.querySelector('[onclick="salvarEdicaoQuestao()"]');
if(btn){const o=btn.textContent;btn.textContent='✓ Salvo!';setTimeout(()=>btn.textContent=o,1500);}
}
function fecharEdicaoQuestao(){
document.getElementById('edit-questao-overlay').classList.remove('open');
_editQuestaoId=null;
}
function fmtTexto(inputId, tipo){
const ta=document.getElementById(inputId);
if(!ta) return;
const start=ta.selectionStart, end=ta.selectionEnd;
const sel=ta.value.substring(start,end);
const before=ta.value.substring(0,start);
const after=ta.value.substring(end);
let result='', newStart=start, newEnd=end;
if(tipo==='bold'){
if(sel) { result=`**${sel}**`; newEnd=start+result.length; }
else { result='**texto**'; newStart=start+2; newEnd=newStart+5; }
} else if(tipo==='italic'){
if(sel) { result=`_${sel}_`; newEnd=start+result.length; }
else { result='_texto_'; newStart=start+1; newEnd=newStart+5; }
} else if(tipo==='underline'){
if(sel) { result=`__${sel}__`; newEnd=start+result.length; }
else { result='__texto__'; newStart=start+2; newEnd=newStart+5; }
} else if(tipo==='bullet'){
const lines=sel?sel.split('\n'):[''];
result=lines.map(l=>`• ${l}`).join('\n');
newEnd=start+result.length;
} else if(tipo==='clear'){
result=(sel||ta.value).replace(/\*\*(.*?)\*\*/g,'$1').replace(/__(.*?)__/g,'$1').replace(/_(.*?)_/g,'$1').replace(/^• /gm,'');
if(!sel){ ta.value=result; ta.focus(); return; }
newEnd=start+result.length;
}
ta.value=before+result+after;
ta.focus();
ta.setSelectionRange(newStart, newEnd);
}
function openSearch(){
const overlay=document.getElementById('search-modal-overlay');
overlay.classList.add('open');
setTimeout(()=>document.getElementById('search-modal-input').focus(),50);
}
function closeSearch(){
document.getElementById('search-modal-overlay').classList.remove('open');
document.getElementById('search-modal-input').value='';
document.getElementById('search-modal-results').innerHTML='<div class="search-empty">Digite algo para pesquisar.</div>';
}
function closeSearchOutside(e){
if(e.target===document.getElementById('search-modal-overlay')) closeSearch();
}
document.addEventListener('keydown',e=>{if(e.key==='Escape') closeSearch();});
function doGlobalSearch(query){
const wrap=document.getElementById('search-modal-results');
if(!query||query.length<2){
wrap.innerHTML='<div class="search-empty">Digite ao menos 2 caracteres.</div>';
return;
}
const q=query.toLowerCase();
const results=[];
getEditalAtivo().forEach(disc=>{
disc.topics.forEach(t=>{
if(t.text.toLowerCase().includes(q))
results.push({origin:'Edital — '+disc.name,text:t.text,tab:'progresso'});
t.subs.forEach(s=>{
if(s.text.toLowerCase().includes(q))
results.push({origin:'Edital — '+disc.name,text:s.text,tab:'progresso'});
});
});
});
LEIS_LEITURA.forEach(lei=>{
if(lei.name.toLowerCase().includes(q))
results.push({origin:'Leitura',text:lei.name,tab:'leitura'});
});
QUESTOES_MATERIAS.forEach(mat=>{
if(mat.name.toLowerCase().includes(q))
results.push({origin:'Questões',text:mat.name,tab:'questoes'});
mat.topics.forEach(t=>{
if(t.toLowerCase().includes(q))
results.push({origin:'Questões — '+mat.name,text:t,tab:'questoes'});
});
});
_getCiclo().forEach(dia=>{
dia.tasks.forEach(t=>{
if(t.cat.toLowerCase().includes(q)||t.desc.toLowerCase().includes(q))
results.push({origin:'Cronograma — Dia '+dia.dia+' ('+dia.label+')',text:'['+t.cat+'] '+t.desc,tab:'cronograma'});
});
});
if(!results.length){
wrap.innerHTML='<div class="search-empty">Nenhum resultado para "'+escapeHtml(query)+'".</div>';
return;
}
wrap.innerHTML='<div style="font-size:.62rem;color:var(--muted);padding:.3rem .4rem .5rem">'+results.length+' resultado(s)</div>';
results.slice(0,40).forEach(r=>{
const el=document.createElement('div');
el.className='search-result-item';
el.onclick=()=>{goTab(r.tab);closeSearch();};
const hl=escapeHtml(r.text).replace(new RegExp('('+escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<span class="search-res-highlight">$1</span>');
el.innerHTML=`<div class="search-res-origin">${r.origin}</div><div class="search-res-text">${hl}</div>`;
wrap.appendChild(el);
});
}
function buildFocoDia(){
const hoje = new Date();
const todayStr = hoje.toLocaleDateString('pt-BR');
const cicloIdx = getCicloIndex(hoje);
const cicloDay = _getCiclo()[cicloIdx];
const tasksEl   = document.getElementById('dash-foco-tasks');
const atrasEl   = document.getElementById('dash-foco-atrasados');
const barEl     = document.getElementById('dash-foco-bar');
const fracEl    = document.getElementById('dash-foco-frac');
const conclEl   = document.getElementById('dash-foco-concluido');
const tituloEl  = document.getElementById('dash-foco-titulo');
if(!tasksEl) return;
const diasNome = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
if(tituloEl) tituloEl.textContent = '📋 ' + diasNome[hoje.getDay()] + ' — Tarefas de Hoje';
const obrig    = cicloDay.tasks.filter(isTaskObrigatoria);
const todas    = cicloDay.tasks;
tasksEl.innerHTML = '';
let feitas = 0;
todas.forEach(t => {
const isOpc = !isTaskObrigatoria(t);
const tid   = getTaskId(hoje, t.id);
const done  = !!ST.cronograma[tid];
if(!isOpc && done) feitas++;
const div = document.createElement('div');
div.className = 'foco-task' + (done ? ' done' : '') + (isOpc ? ' foco-task-opc' : '');
div.onclick = () => { toggleTask(hoje, t.id, getDayId(hoje)); };
div.innerHTML = `
<div class="foco-task-check">${done ? '✓' : ''}</div>
<span class="foco-task-cat">${t.cat}</span>
<span class="foco-task-desc">${t.desc}${isOpc ? ' <span class="foco-opc-badge">Opcional</span>' : ''}</span>`;
tasksEl.appendChild(div);
});
let revAtrasadas = 0;
try {
const hoje0 = new Date(); hoje0.setHours(0,0,0,0);
revAtrasadas = (ST.banco||[]).filter(q => {
if(!q.errouAlgumVez) return false;
const info = (ST.revisaoEspacada||{})[q.id];
if(!info || !info.proxima) return true;
const [dd,mm,yy] = info.proxima.split('/');
return new Date(+yy,+mm-1,+dd) <= hoje0;
}).length;
} catch(e){}
atrasEl.innerHTML = '';
const total = obrig.length;
const pct = total > 0 ? Math.round(feitas / total * 100) : 0;
if(barEl) barEl.style.width = pct + '%';
if(fracEl) fracEl.textContent = feitas + '/' + total + ' (' + pct + '%)';
if(barEl){
barEl.classList.remove('green','yellow','red');
barEl.classList.add(pct >= 100 ? 'green' : pct >= 50 ? 'yellow' : 'red');
}
if(conclEl){
const tudo = feitas === total && total > 0;
conclEl.style.display = tudo ? 'block' : 'none';
if(tudo && conclEl.style.display==='block'){
conclEl.querySelector('div:nth-child(3)').textContent =
todas.length > obrig.length
? 'Todas as tarefas obrigatórias concluídas! As opcionais ficam por sua conta 😄'
: 'Excelente disciplina. Continue assim, futuro policial!';
}
}
}
const _dashOpen = { grafico: false, sessoes: false, flashcards: false };
let _dashLastHash='';
function _dashHash(){
// Hash rápido dos dados relevantes do dashboard
const d=ST;
return (d.banco?.length||0)+'|'+(d.questoes?Object.keys(d.questoes).length:0)+'|'+
(d.progresso?Object.keys(d.progresso).length:0)+'|'+
(d.cronograma?Object.keys(d.cronograma).length:0)+'|'+
(d.sessoesDiarias?Object.keys(d.sessoesDiarias).length:0)+'|'+
(d.flashDecks?.length||0);
}

// ══════════════════════════════════════════════════════════════
// FASE 9.3.7 — RESUMO FINAL PREMIUM (inserido no final — seguro)
// ══════════════════════════════════════════════════════════════
function _rslFmtTimeLong(segs) {
  const h = Math.floor(segs / 3600), m = Math.floor((segs % 3600) / 60), s = segs % 60;
  if (h > 0) return h + 'h ' + String(m).padStart(2,'0') + 'min';
  if (m > 0) return m + 'min ' + String(s).padStart(2,'0') + 's';
  return s + 's';
}
function rslMostrarResumo({titulo, acertos, erros, puladas, total, porMat, tempoUsado}) {
  const overlay = document.getElementById('rsl-resumo-overlay');
  if (!overlay) return;
  const respondidas = acertos + erros;
  const pct = respondidas > 0 ? Math.round(acertos / respondidas * 100) : 0;
  const circ = 2 * Math.PI * 48;
  const acArc = respondidas > 0 ? (acertos / respondidas * circ) : 0;
  const erArc = respondidas > 0 ? (erros   / respondidas * circ) : 0;
  const arcAc = document.getElementById('rsl-resumo-arc-acertos');
  const arcEr = document.getElementById('rsl-resumo-arc-erros');
  if (arcAc) { arcAc.setAttribute('stroke-dasharray', acArc.toFixed(1) + ' ' + (circ-acArc).toFixed(1)); arcAc.setAttribute('stroke-dashoffset','0'); }
  if (arcEr) { arcEr.setAttribute('stroke-dasharray', erArc.toFixed(1) + ' ' + (circ-erArc).toFixed(1)); arcEr.setAttribute('stroke-dashoffset', String(-acArc.toFixed(1))); }
  const pctEl = document.getElementById('rsl-resumo-pct');
  if (pctEl) { pctEl.textContent = pct + '%'; pctEl.style.color = pct>=75?'var(--green)':pct>=50?'#fbbf24':'var(--red)'; }
  const titEl = document.getElementById('rsl-resumo-titulo');
  if (titEl) titEl.textContent = titulo || 'Resultado da Sessão';
  const origEl = document.getElementById('rsl-resumo-origem');
  if (origEl) origEl.textContent = resol_modoMass?'Massificação':resol_modoBanco?'Questões / Praticar':'Caderno de Erros';
  const upd = (id,val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  upd('rsl-resumo-total',total); upd('rsl-resumo-resp',respondidas);
  upd('rsl-resumo-acertos',acertos); upd('rsl-resumo-erros',erros); upd('rsl-resumo-puladas',puladas);
  const rowPul = document.getElementById('rsl-resumo-row-puladas');
  if (rowPul) rowPul.style.display = puladas>0?'flex':'none';
  const rowTempo = document.getElementById('rsl-resumo-row-tempo');
  const rowMedia = document.getElementById('rsl-resumo-row-media');
  if (tempoUsado && tempoUsado>0) {
    if (rowTempo) { rowTempo.style.display='flex'; upd('rsl-resumo-tempo',_rslFmtTimeLong(tempoUsado)); }
    if (respondidas>0 && rowMedia) { rowMedia.style.display='flex'; upd('rsl-resumo-media',_rslFmtTimeLong(Math.round(tempoUsado/respondidas))); }
  } else {
    if (rowTempo) rowTempo.style.display='none';
    if (rowMedia) rowMedia.style.display='none';
  }
  const matSec = document.getElementById('rsl-resumo-por-mat');
  const matList = document.getElementById('rsl-resumo-mat-list');
  if (porMat && matList && Object.values(porMat).some(m=>m.total>0)) {
    matSec.style.display='block'; matList.innerHTML='';
    Object.values(porMat).filter(m=>m.total>0).forEach(m=>{
      const r=m.total>0?Math.round((m.acertos||0)/m.total*100):0;
      const rc=r>=75?'var(--green)':r>=50?'#fbbf24':'var(--red)';
      const div=document.createElement('div'); div.className='rsl-resumo-mat-row';
      div.innerHTML='<span class="rsl-resumo-mat-name">'+m.name+'</span><span class="rsl-resumo-mat-pct" style="color:'+rc+'">'+r+'%</span>';
      matList.appendChild(div);
    });
  } else if (matSec) { matSec.style.display='none'; }
  overlay.classList.add('open');
}
function rslResumoVoltar() {
  // Fechar overlay do resumo premium
  const _rOv = document.getElementById('rsl-resumo-overlay');
  if (_rOv) _rOv.classList.remove('open');
  // Fechar donut-modal-overlay legado se aberto
  const _dm = document.getElementById('donut-modal-overlay');
  if (_dm) _dm.classList.remove('open');
  // FASE 9.4.13 BUG 2 FIX: executar rebuilds APÓS fechar o resumo
  // Isso garante que Estatísticas, Dashboard e Evolução recebam a sessão encerrada
  setTimeout(function() {
    if(typeof buildBanco==='function')            buildBanco();
    if(typeof bqRenderStats==='function')         bqRenderStats();
    if(typeof buildQuestoes==='function')         buildQuestoes();
    if(typeof renderDashboard==='function')       renderDashboard();
    if(typeof buildSessoesHistorico==='function') buildSessoesHistorico();
    if(typeof buildGraficoEvolucao==='function')  buildGraficoEvolucao();
  }, 50);
  // Voltar para Questões > Praticar usando goTab (mesma rota que goTab('banco'))
  if (typeof goTab === 'function') {
    goTab('banco');
  } else {
    // fallback: mostrar tab-banco diretamente
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const sec = document.getElementById('tab-banco');
    if (sec) sec.classList.add('active');
    document.querySelectorAll('.sb-item').forEach(t => t.classList.remove('active'));
    const sbi = document.getElementById('sbtab-banco');
    if (sbi) sbi.classList.add('active');
    if (typeof buildBanco === 'function') buildBanco();
    if (typeof bqRenderStats === 'function') bqRenderStats();
  }
}

/* ── Debug runtime — HOTFIX 9.4.17.4 ───────────────────────────────────
 * Usar no console: bqDebugStatsRuntime()
 * Mostra diagnóstico completo das fontes de progresso
 * ─────────────────────────────────────────────────────────────────── */
window.bqDebugStatsRuntime = function() {
  var cid = (typeof localStorage !== 'undefined') ? localStorage.getItem('protocolo_concurso_ativo') : null;
  var cidHelper = (typeof bqGetConcursoAtivoId === 'function') ? bqGetConcursoAtivoId() : 'n/a';
  var banco = (typeof ST !== 'undefined' && ST && ST.banco) ? ST.banco : [];
  var progConc = (typeof ST !== 'undefined' && ST && ST.bancoProgressoPorConcurso && cid) ? (ST.bancoProgressoPorConcurso[cid] || {}) : {};
  var sessPorConc = (typeof ST !== 'undefined' && ST && ST.bancoSessoesPorConcurso && cid) ? (ST.bancoSessoesPorConcurso[cid] || []) : [];
  var sessGlobal = (typeof ST !== 'undefined' && ST && ST.bancoSessoes) ? ST.bancoSessoes : [];

  // Progresso direto em q
  var qComHist = banco.filter(function(q){return Array.isArray(q.historico)&&q.historico.length>0;}).length;
  var qComTent = banco.filter(function(q){return q.tentativas>0;}).length;
  var qComAcertos = banco.filter(function(q){return q.acertos>0;}).length;
  var qComErros = banco.filter(function(q){return q.erros>0;}).length;
  var qResolvida = banco.filter(function(q){return q.resolvida;}).length;
  var qErrouAlgumVez = banco.filter(function(q){return q.errouAlgumVez;}).length;

  // Progresso por concurso
  var progKeys = Object.keys(progConc);
  var progComHist = progKeys.filter(function(k){return Array.isArray(progConc[k].historico)&&progConc[k].historico.length>0;}).length;
  var progTotTent = progKeys.reduce(function(a,k){return a+(progConc[k].tentativas||0);},0);
  var progTotAcertos = progKeys.reduce(function(a,k){return a+(progConc[k].acertos||0);},0);
  var progTotErros = progKeys.reduce(function(a,k){return a+(progConc[k].erros||0);},0);
  var progErrouAV = progKeys.filter(function(k){return progConc[k].errouAlgumVez;}).length;

  // Lógica do Praticar
  var pratNovas = banco.filter(function(q){return !q.historico||!q.historico.length;}).length;
  var pratAcertadas = banco.filter(function(q){return Array.isArray(q.historico)&&q.historico.length&&!q.errouAlgumVez;}).length;
  var pratErro = banco.filter(function(q){return q.errouAlgumVez;}).length;

  // Lógica bqRenderEstatisticas (nova, com helper)
  var statTotTent=0, statTotAcertos=0;
  banco.forEach(function(q){
    var r = (typeof bqGetResumoProgressoQuestao==='function') ? bqGetResumoProgressoQuestao(q,cid) : {historico:q.historico||[]};
    var hist = r.historico||[];
    hist.forEach(function(h){statTotTent++;if(h.acertou)statTotAcertos++;});
  });

  var result = {
    concurso: {localStorage: cid, helper: cidHelper},
    banco: {total: banco.length},
    progressoDiretoEmQ: {comHistorico:qComHist, comTentativas:qComTent, comAcertos:qComAcertos, comErros:qComErros, resolvidas:qResolvida, errouAlgumVez:qErrouAlgumVez},
    progressoPorConcurso: {keys:progKeys.length, comHistorico:progComHist, totTentativas:progTotTent, totAcertos:progTotAcertos, totErros:progTotErros, errouAlgumVez:progErrouAV},
    sessoes: {porConcurso:sessPorConc.length, global:sessGlobal.length},
    logicaPraticar: {novas:pratNovas, acertadas:pratAcertadas, comErro:pratErro},
    logicaEstatisticas: {totTent:statTotTent, totAcertos:statTotAcertos, totErros:statTotTent-statTotAcertos},
    windowST_defined: typeof window !== 'undefined' && window.ST !== undefined,
    ST_defined: typeof ST !== 'undefined'
  };

  console.info('[BQ DEBUG RUNTIME]', JSON.stringify(result, null, 2));

  // Amostra de questões com progresso
  var amostra = banco.filter(function(q){
    return (Array.isArray(q.historico)&&q.historico.length)||q.tentativas||q.acertos||q.erros||q.errouAlgumVez||
           (progConc[q.id]&&(progConc[q.id].tentativas||progConc[q.id].acertos||(Array.isArray(progConc[q.id].historico)&&progConc[q.id].historico.length)));
  }).slice(0,15).map(function(q){
    var r = (typeof bqGetResumoProgressoQuestao==='function') ? bqGetResumoProgressoQuestao(q,cid) : {};
    var slot = progConc[q.id]||{};
    return {id:q.id, codigo:q.codigo||'', mat:q.mat||'', matNome:q.matNome||'', qHistLen:Array.isArray(q.historico)?q.historico.length:0, qTent:q.tentativas||0, qAcertos:q.acertos||0, qErros:q.erros||0, qErrouAV:q.errouAlgumVez||false, slotHistLen:Array.isArray(slot.historico)?slot.historico.length:0, slotTent:slot.tentativas||0, resumoHistLen:(r.historico||[]).length, resumoTent:r.tentativas||0, resumoAcertos:r.acertos||0};
  });
  if(amostra.length) console.table(amostra);
  else console.info('[BQ DEBUG] Nenhuma questão com progresso encontrada.');

  return result;
};


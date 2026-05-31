/* ════════════════════════════════════════════════════════════════════
 * app.js
 * ────────────────────────────────────────────────────────────────────
 * Dashboard, backup completo (export/import), multi-concurso (CRUD), presets
 * (_injetarDadosGMA, _injetarDadosPMAL), bootstrap (_inicializarBaseData) e BASE_DATA.
 *
 * IMPORTANTE: Este arquivo é parte do PROTOCOLO 01 (Estratégia B — Fase 1).
 * Todas as funções declaradas aqui são GLOBAIS (window.<nome>) por design.
 * NÃO converter para ESModules / IIFE / import-export sem refatoração ampla.
 * NÃO renomear funções (handlers inline no HTML dependem dos nomes atuais).
 * ════════════════════════════════════════════════════════════════════ */

function renderDashboard(_force){
if(!_force&&!document.getElementById('tab-dashboard')?.classList.contains('active')) return;
// Só reconstrói se dados mudaram
const h=_dashHash();
if(!_force&&h===_dashLastHash) return;
_dashLastHash=h;
updateCountdown();
const {total,estudados}=countProgresso();
const pct=total>0?Math.round(estudados/total*100):0;
const ppEl=document.getElementById('dash-prog-pct');if(ppEl) ppEl.textContent=pct+'%';
const pbEl=document.getElementById('dash-prog-bar');if(pbEl) pbEl.style.width=pct+'%';
const pfEl=document.getElementById('dash-prog-frac');if(pfEl) pfEl.textContent=estudados+'/'+total;
const del=document.getElementById('dash-edital-list');
if(del){
del.innerHTML='';
requestAnimationFrame(()=>{
getEditalAtivo().forEach(disc=>{
const allIds=[];
disc.topics.forEach(t=>{allIds.push(t.id);t.subs.forEach(s=>allIds.push(s.id));});
const tot=allIds.length;
const est=allIds.filter(id=>ST.progresso[id+'_e']).length;
const p=tot>0?Math.round(est/tot*100):0;
const barC=p>=70?'var(--green)':p>=40?'var(--gold)':'var(--red)';
const el=document.createElement('div');
el.style.cssText='margin-bottom:.45rem';
el.innerHTML=`
<div style="display:flex;justify-content:space-between;font-size:.68rem;margin-bottom:3px">
<span style="color:rgba(255,255,255,.75);font-family:'Barlow',sans-serif">${disc.name}</span>
<span style="font-family:'Oswald',sans-serif;font-weight:700;color:${barC}">${p}% <span style="color:var(--dim);font-weight:400">${est}/${tot}</span></span>
</div>
<div class="prog-track" style="height:5px"><div class="prog-fill" style="width:${p}%;background:${barC};border-radius:99px"></div></div>`;
del.appendChild(el);
});

});}
const {totQ,totA,erros:totErros,taxa:qRate}=calcTotaisQuestoes();
const dqtEl=document.getElementById('dash-q-total');if(dqtEl) dqtEl.textContent=totQ;
const dqpEl=document.getElementById('dash-q-pct');if(dqpEl) dqpEl.textContent=totQ>0?qRate+'%':'—';
const dqeEl=document.getElementById('dash-q-erros');if(dqeEl) dqeEl.textContent=totErros;
const dqbEl=document.getElementById('dash-q-bar');if(dqbEl) dqbEl.style.width=qRate+'%';
const dqblEl=document.getElementById('dash-q-bar-label');if(dqblEl) dqblEl.textContent=qRate+'%';
const daEl=document.getElementById('dash-acerto');if(daEl) daEl.textContent=totQ>0?qRate+'%':'—';
const dql=document.getElementById('dash-questoes-list');
if(dql){
dql.innerHTML='';
(window.QUESTOES_MATERIAS||[]).forEach(mat=>{
let mTot=0,mAc=0;
mat.topics.forEach(topic=>{
const q=ST.questoes[getQKey(mat.id, topic.id)]||{total:0,acertos:0};
mTot+=q.total; mAc+=q.acertos;
});
const r=mTot>0?Math.round(mAc/mTot*100):0;
const rc=r>=70?'var(--green)':r>=50?'#fbbf24':'var(--red)';
const el=document.createElement('div');
el.className='disc-item';
el.style.cssText='padding:.6rem .85rem;margin-bottom:.35rem';
el.innerHTML=`
<div class="disc-header" style="margin-bottom:.35rem">
<div class="disc-name">${mat.name}</div>
<div style="font-family:'Oswald',sans-serif;font-size:.9rem;font-weight:700;color:${mTot>0?rc:'var(--dim)'}">${mTot>0?r+'%':'—'}</div>
</div>
<div class="disc-prog-track">
<div class="disc-prog-fill" style="width:${r}%;background:${rc}"></div>
</div>
<div class="disc-total">${mTot} questões · ${mAc} acertos · ${mTot-mAc} erros</div>`;
dql.appendChild(el);
});
}
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
const dsEl=document.getElementById('dash-sims');if(dsEl) dsEl.textContent=simCount;
const dstEl=document.getElementById('dash-sim-total');if(dstEl) dstEl.textContent=simCount;
const dsmEl=document.getElementById('dash-sim-melhor');if(dsmEl) dsmEl.textContent=simMelhor!==null?(simMelhor>=0?'+'+simMelhor:simMelhor):'—';
const dsmdEl=document.getElementById('dash-sim-media');if(dsmdEl) dsmdEl.textContent=simMedia!==null?(simMedia>=0?'+'+simMedia:simMedia):'—';
const dsl=document.getElementById('dash-sims-list');
if(dsl){
dsl.innerHTML='';
if(!ST.simulados.length){
dsl.innerHTML='<div style="font-size:.75rem;color:var(--dim);font-style:italic;padding:.5rem 0">Nenhum simulado cadastrado ainda.</div>';
} else {
ST.simulados.forEach(sim=>{
const ultRes=sim.resultados&&sim.resultados.length?sim.resultados[sim.resultados.length-1]:null;
const el=document.createElement('div');
el.className='disc-item';
el.style.cssText='padding:.6rem .85rem;margin-bottom:.35rem';
if(ultRes){
const nota=ultRes.nota??ultRes.acertos;
const notaC=nota>0?'var(--green)':nota<0?'var(--red)':'var(--muted)';
const allNotas=(sim.resultados||[]).map(r=>r.nota??r.acertos);
const melhor=Math.max(...allNotas);
el.innerHTML=`
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem">
<div style="font-family:'Oswald',sans-serif;font-size:.8rem;font-weight:700;color:#fff">${sim.nome}</div>
<div style="font-family:'Oswald',sans-serif;font-size:.9rem;font-weight:700;color:${notaC}">${nota>=0?'+':''}${nota}</div>
</div>
<div style="font-size:.62rem;color:var(--muted)">${sim.qtd} questões · ${sim.resultados.length} tentativa(s) · Melhor: ${melhor>=0?'+':''}${melhor} · Último: ${ultRes.data||''} · Tempo: ${fmtSecs(ultRes.tempo||0)}</div>`;
} else {
el.innerHTML=`
<div style="font-family:'Oswald',sans-serif;font-size:.8rem;font-weight:700;color:#fff;margin-bottom:.2rem">${sim.nome}</div>
<div style="font-size:.62rem;color:var(--dim);font-style:italic">${sim.qtd} questões · Ainda não realizado</div>`;
}
dsl.appendChild(el);
});
}
}
let leitTotal=0,leitLidos=0;
LEIS_LEITURA.forEach(lei=>lei.arts.forEach(a=>{
leitTotal++;
if(ST.leitura[getLeitKey(lei.id,a)]) leitLidos++;
}));
const leitPct=leitTotal>0?Math.round(leitLidos/leitTotal*100):0;
const dlpEl=document.getElementById('dash-leitura-pct');if(dlpEl) dlpEl.textContent=leitPct+'%';
const dlbEl=document.getElementById('dash-leit-bar');if(dlbEl) dlbEl.style.width=leitPct+'%';
const dlf=document.getElementById('dash-leit-frac');if(dlf) dlf.textContent=leitLidos+'/'+leitTotal+' ('+leitPct+'%)';
const dll=document.getElementById('dash-leitura-list');
if(dll){
dll.innerHTML='';
LEIS_LEITURA.forEach(lei=>{
const tot=lei.arts.length;
const lid=lei.arts.filter(a=>ST.leitura[getLeitKey(lei.id,a)]).length;
const p=tot>0?Math.round(lid/tot*100):0;
const barC=p>=70?'var(--green)':p>=40?'var(--blue)':'var(--gold)';
const el=document.createElement('div');
el.style.cssText='margin-bottom:.45rem';
el.innerHTML=`
<div style="display:flex;justify-content:space-between;font-size:.65rem;margin-bottom:3px">
<span style="color:rgba(255,255,255,.7)">${lei.name}</span>
<span style="font-family:'Oswald',sans-serif;font-weight:700;color:${barC}">${p}% <span style="color:var(--dim);font-weight:400">${lid}/${tot}</span></span>
</div>
<div class="prog-track" style="height:4px"><div class="prog-fill" style="width:${p}%;background:${barC};border-radius:99px"></div></div>`;
dll.appendChild(el);
});
}
buildFocoDia();
// Adia as partes mais pesadas para após o primeiro render
requestAnimationFrame(()=>{
buildSessoesHistorico();
if(_dashOpen&&_dashOpen.grafico) buildGraficoEvolucao();
if(_dashOpen&&_dashOpen.flashcards) renderDashFc();
backupRenderHistorico();
});
}
function _reconstruirUI(){
// Recarrega o ciclo do localStorage para garantir que qualquer configuração
// importada pelo backup seja refletida imediatamente
const cfgAtual = _cfgLoad();
if(cfgAtual && cfgAtual.ciclo){
window._CICLO_OVERRIDE = cfgAtual.ciclo;
} else {
window._CICLO_OVERRIDE = null;
}
// Reseta o dia selecionado para forçar rebuild a partir de hoje
_cronSelectedDay = null;
// Isolated rebuild — each module independently
[
  ['cronograma',  function(){ buildCronograma(true); }],
  ['edital',      function(){ buildEdital(true); renderProgessoStats(true); }],
  ['leitura',     function(){
    if(typeof lnBuild==='function'){
      var m=document.getElementById('ln-main');
      if(m){ if(typeof lnRender==='function') lnRender(); }
      else setTimeout(lnBuild,40);
    } else { buildLeitura(true); renderLeituraGeral(true); }
  }],
  ['banco',       function(){
    buildBanco(true); buildBancoCompleto(); bqRenderStats(true);
    // FASE 9.4.10: re-renderizar subabas ativas ao trocar concurso
    try{
      var statsPanel=document.getElementById('bq-painel-stats');
      if(statsPanel && statsPanel.style.display!=='none'){
        if(typeof bqRenderEstatisticas==='function') bqRenderEstatisticas();
      }
      var resolverPanel=document.getElementById('bq-painel-resolver');
      if(resolverPanel && resolverPanel.style.display!=='none'){
        if(typeof bqRender==='function') bqRender();
        if(typeof bqRenderStats==='function') bqRenderStats(true);
      }
    }catch(e){}
  }],
  ['flashcards',  function(){ buildFcDecks(true); fcPopularFiltros(true); }],
  ['dashboard',   function(){ renderDashboard(true); }],
].forEach(function(p){ try{ p[1](); } catch(e){ console.warn('[P01] Rebuild failed: '+p[0],e.message); } });
}
// ── P01 Bootstrap — isolated per module ─────────────────────────────
(function(){
  [
    ['cronograma',  function(){ buildCronograma(true); }],
    ['edital',      function(){ buildEdital(true); renderProgessoStats(true); }],
    ['leitura',     function(){
      if(typeof lnBuild==='function'){
        var m=document.getElementById('ln-main');
        if(m){if(typeof lnRender==='function') lnRender();}
        else setTimeout(lnBuild,40);
      } else { buildLeitura(true); renderLeituraGeral(true); }
    }],
    ['dashboard',   function(){ renderDashboard(true); }],
  ].forEach(function(p){ try{ p[1](); } catch(e){ console.warn('[P01] Boot failed: '+p[0],e.message); } });
})();
const REV_INTERVALOS = [1, 1, 3, 7, 14, 30, 60];
function _revHoje(){
const d=new Date(); d.setHours(0,0,0,0); return d;
}
function _revDataStr(date){
return date.toLocaleDateString('pt-BR');
}
function _revParseData(str){
if(!str) return new Date(0);
const [dd,mm,yyyy]=str.split('/');
return new Date(parseInt(yyyy),parseInt(mm)-1,parseInt(dd));
}
function _revGetInfo(q){
if(!ST.revisaoEspacada) ST.revisaoEspacada={};
if(!ST.revisaoEspacada[q.id]){
const h=q.historico||[];
const acertos=h.filter(e=>e.acertou).length;
const nivel=Math.min(acertos, REV_INTERVALOS.length-1);
ST.revisaoEspacada[q.id]={nivel, proxima:_revDataStr(_revHoje())};
}
return ST.revisaoEspacada[q.id];
}
function _revAtualizar(q, acertou){
const info=_revGetInfo(q);
if(acertou){
info.nivel=Math.min(info.nivel+1, REV_INTERVALOS.length-1);
} else {
info.nivel=0;
}
const prox=new Date(_revHoje());
prox.setDate(prox.getDate()+REV_INTERVALOS[info.nivel]);
info.proxima=_revDataStr(prox);
ST.revisaoEspacada[q.id]=info;
saveState();
}
function _revParaHoje(){
const hoje=_revHoje();
return ST.banco.filter(q=>{
if(!q.errouAlgumVez) return false;
const info=_revGetInfo(q);
return _revParseData(info.proxima)<=hoje;
});
}
function buildRevisaoEspacada(){
if(!ST.revisaoEspacada) ST.revisaoEspacada={};
const hoje=_revHoje();
const pool=ST.banco.filter(q=>q.errouAlgumVez);
const paraHoje=pool.filter(q=>_revParseData(_revGetInfo(q).proxima)<=hoje);
const dominadas=pool.filter(q=>_revGetInfo(q).nivel>=5);
const proximas7=pool.filter(q=>{
const p=_revParseData(_revGetInfo(q).proxima);
const d7=new Date(hoje); d7.setDate(hoje.getDate()+7);
return p>hoje&&p<=d7;
});
const eh=document.getElementById('rev-para-hoje');if(eh) eh.textContent=paraHoje.length;
const ed=document.getElementById('rev-dominadas');if(ed) ed.textContent=dominadas.length;
const ep=document.getElementById('rev-proximas');if(ep) ep.textContent=proximas7.length;
const ec=document.getElementById('rev-count-btn');if(ec) ec.textContent=paraHoje.length;
const agenda=document.getElementById('rev-agenda');
if(!agenda) return;
agenda.innerHTML='';
if(!pool.length){
agenda.innerHTML='<div style="font-size:.75rem;color:var(--dim);font-style:italic;text-align:center;padding:1rem">Nenhuma questão no caderno ainda.</div>';
return;
}
const ordenadas=[...pool].sort((a,b)=>_revParseData(_revGetInfo(a).proxima)-_revParseData(_revGetInfo(b).proxima));
ordenadas.slice(0,15).forEach(q=>{
const info=_revGetInfo(q);
const prox=_revParseData(info.proxima);
const diff=Math.round((prox-hoje)/(1000*60*60*24));
let badge,label;
if(diff<=0){badge='hoje';label='Hoje';}
else if(diff===1){badge='amanha';label='Amanhã';}
else if(info.nivel>=5){badge='dominada';label=`✦ Dominada · ${diff}d`;}
else{badge='futuro';label=`Em ${diff} dia${diff>1?'s':''}`;}
const div=document.createElement('div');
div.className='rev-item';
div.innerHTML=`
<span class="rev-badge ${badge}">${label}</span>
<span style="font-family:'Oswald',sans-serif;font-size:.68rem;font-weight:700;color:var(--gold)">${q.matNome||'—'}</span>
${q.assunto?`<span style="font-size:.62rem;color:var(--muted);font-style:italic">${escapeHtml(q.assunto)}</span>`:''}
<span style="font-size:.62rem;color:var(--dim);margin-left:auto">Nível ${info.nivel}/${REV_INTERVALOS.length-1}</span>`;
agenda.appendChild(div);
});
if(ordenadas.length>15){
agenda.innerHTML+=`<div style="font-size:.68rem;color:var(--dim);text-align:center;padding:.5rem">+${ordenadas.length-15} questões agendadas</div>`;
}
}
function iniciarRevisaoEspacada(){
const pool=_revParaHoje();
if(!pool.length){alert('Nenhuma questão para revisar hoje! Volte amanhã.');return;}
resol_modoMass=false; resol_modoBanco=false;
window._revMode=true;
abrirModoResolucaoModal(pool,'🧠 Revisão Espaçada');
}
function _sessDataHoje(){
return new Date().toLocaleDateString('pt-BR');
}
function _sessDataStr(date){
return date.toLocaleDateString('pt-BR');
}
function _getSessaoDia(dataStr){
if(!ST.sessoesDiarias) ST.sessoesDiarias={};
if(!ST.sessoesDiarias[dataStr]){
ST.sessoesDiarias[dataStr]={
data: dataStr,
questoes:{ total:0, acertos:0, duracao:0, blocos:[] },
tarefas:{ concluidas:0, itens:[] },
artigos:{ total:0, itens:[] },
edital:{ marcacoes:0 },
flashcards:{ revisoes:0, acertos:0 },
salvaManualmente: false,
criadoEm: new Date().toISOString()
};
}
return ST.sessoesDiarias[dataStr];
}
function _sessaoEstaVazia(sess){
if(!sess) return true;
const semQuestoes = (sess.questoes&&sess.questoes.total||0) === 0;
const semTarefas  = (sess.tarefas&&sess.tarefas.itens||[]).length === 0;
const semArtigos  = (sess.artigos&&sess.artigos.itens||[]).length === 0;
const semEdital   = (sess.edital&&sess.edital.itens||[]).length === 0 && (sess.edital&&sess.edital.marcacoes||0) === 0;
const semFc       = (sess.flashcards&&sess.flashcards.revisoes||0) === 0 && (sess.flashcards&&sess.flashcards.itens||[]).length === 0;
return semQuestoes && semTarefas && semArtigos && semEdital && semFc;
}
function _setSessaoDia(dataStr, sessao){
if(!ST.sessoesDiarias) ST.sessoesDiarias={};
if(_sessaoEstaVazia(sessao)){
delete ST.sessoesDiarias[dataStr];
} else {
ST.sessoesDiarias[dataStr]=sessao;
}
saveState();
}
function _registrarSessao(titulo, materia, total, acertos, duracao){
if(total<=0) return;
const dataStr=_sessDataHoje();
const sess=_getSessaoDia(dataStr);
const hora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
// Verifica se já existe bloco idêntico (mesmo titulo e hora) para não duplicar
const existente=sess.questoes.blocos.find(b=>b.titulo===titulo&&b.hora===hora);
if(existente){
// Atualiza bloco existente em vez de criar novo
existente.total=total; existente.acertos=acertos;
existente.taxa=total>0?Math.round(acertos/total*100):0;
} else {
sess.questoes.blocos.push({hora,titulo,materia,total,acertos,
taxa:total>0?Math.round(acertos/total*100):0,
duracao:duracao||0});
}
// Recalcula totais
sess.questoes.total=sess.questoes.blocos.reduce((a,b)=>a+(b.total||0),0);
sess.questoes.acertos=sess.questoes.blocos.reduce((a,b)=>a+(b.acertos||0),0);
sess.questoes.duracao=sess.questoes.blocos.reduce((a,b)=>a+(b.duracao||0),0);
_setSessaoDia(dataStr, sess);
// Atualiza ST.sessoes sem duplicar (máx 100)
if(!ST.sessoes) ST.sessoes=[];
const iEx=ST.sessoes.findIndex(s=>s.data===dataStr&&s.titulo===titulo);
const sessObj={id:iEx>=0?ST.sessoes[iEx].id:'sess_'+Date.now(),
data:dataStr,hora,titulo,materia,total,acertos,
duracao:duracao||0,taxa:total>0?Math.round(acertos/total*100):0};
if(iEx>=0) ST.sessoes[iEx]=sessObj;
else ST.sessoes.unshift(sessObj);
if(ST.sessoes.length>100) ST.sessoes=ST.sessoes.slice(0,100);
saveState();
}
function _registrarSessaoTarefa(date, taskId, done, taskDesc, taskCat){
const dataStr=_sessDataStr(date);
const sess=_getSessaoDia(dataStr);
sess.tarefas.itens=sess.tarefas.itens.filter(i=>i.tid!==taskId);
if(done){
sess.tarefas.itens.push({
tid: taskId,
hora: new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
desc: taskDesc||'',
cat: taskCat||''
});
}
sess.tarefas.concluidas=sess.tarefas.itens.length;
_setSessaoDia(dataStr, sess);
}
function _registrarSessaoArtigo(lawId, art, lido, lawName){
const dataStr=_sessDataHoje();
const sess=_getSessaoDia(dataStr);
sess.artigos.itens=sess.artigos.itens.filter(i=>!i.key.startsWith(lawId+'_art'));
const lei=LEIS_LEITURA.find(l=>l.id===lawId);
if(lei){
lei.arts.forEach(a=>{
if(ST.leitura[getLeitKey(lawId,a)]){
const k=lawId+'_art'+a;
sess.artigos.itens.push({
key: k, lei: lawName||lawId, art: a,
hora: new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
});
}
});
}
sess.artigos.total=sess.artigos.itens.length;
_setSessaoDia(dataStr, sess);
}
function _registrarSessaoEdital(id, marcado){
const dataStr=_sessDataHoje();
const sess=_getSessaoDia(dataStr);
if(!sess.edital.itens) sess.edital.itens=[];
sess.edital.itens=sess.edital.itens.filter(i=>i.id!==id);
if(marcado) sess.edital.itens.push({id, hora: new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});
sess.edital.marcacoes=sess.edital.itens.length;
_setSessaoDia(dataStr, sess);
}
function _registrarSessaoFlashcard(acertou, card, deckId){
const dataStr=_sessDataHoje();
const sess=_getSessaoDia(dataStr);
if(!sess.flashcards.itens) sess.flashcards.itens=[];
if(card && card.id){
sess.flashcards.itens.push({
cardId: card.id,
deckId: deckId||'',
acertou: !!acertou,
hora: new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
});
}
sess.flashcards.revisoes = sess.flashcards.itens.length;
sess.flashcards.acertos  = sess.flashcards.itens.filter(i=>i.acertou).length;
_setSessaoDia(dataStr, sess);
}
function salvarSessaoManual(){
const dataStr=_sessDataHoje();
const sess=_getSessaoDia(dataStr);
sess.salvaManualmente=true;
sess.ultimoSalvamento=new Date().toISOString();
_setSessaoDia(dataStr, sess);
buildSessoesHistorico();
buildGraficoEvolucao();
_backupToast('💾 Sessão de hoje salva!','var(--gold)');
}
function _initAutoSessaoMeiaNoite(){
function _agendarMeiaNoite(){
const agora=new Date();
const meianoite=new Date(agora);
meianoite.setDate(agora.getDate()+1);
meianoite.setHours(0,0,5,0);
const ms=meianoite-agora;
setTimeout(()=>{
const ontem=new Date(); ontem.setDate(ontem.getDate()-1);
const dataOntem=_sessDataStr(ontem);
_getSessaoDia(dataOntem);
saveState();
buildSessoesHistorico();
buildGraficoEvolucao();
_agendarMeiaNoite();
}, ms);
}
_agendarMeiaNoite();
}
_initAutoSessaoMeiaNoite();
let _bkSessPeriodo = 30;
function buildSessoesHistorico(_force){
if(!_force&&!document.getElementById('tab-backup')?.classList.contains('active')&&!document.getElementById('tab-dashboard')?.classList.contains('active')) return;
_buildSessoesLista(document.getElementById('dash-sessoes-list'), 30, false);
_buildSessoesLista(document.getElementById('bk-sessoes-list'), _bkSessPeriodo||0, true);
}
function _buildSessoesLista(list, limiteDias, isBackup){
if(!list) return;
if(ST.sessoesDiarias){
Object.keys(ST.sessoesDiarias).forEach(k=>{
if(_sessaoEstaVazia(ST.sessoesDiarias[k])) delete ST.sessoesDiarias[k];
});
}
const porData={};
(ST.sessoes||[]).forEach(s=>{
if(!porData[s.data]) porData[s.data]={questoesBlocos:[],tarefas:[],artigos:[],edital:0,fc:{rev:0,ac:0}};
porData[s.data].questoesBlocos.push(s);
});
const dias=Object.keys(ST.sessoesDiarias||{}).sort((a,b)=>{
const pa=a.split('/'), pb=b.split('/');
const da=new Date(pa[2],pa[1]-1,pa[0]), db=new Date(pb[2],pb[1]-1,pb[0]);
return db-da;
});
const temDiarias=dias.length>0;
const temLegado=(ST.sessoes||[]).length>0;
if(!temDiarias && !temLegado){
list.innerHTML='<div style="font-size:.75rem;color:var(--dim);font-style:italic;text-align:center;padding:1rem">Nenhuma sessão registrada ainda.</div>';
return;
}
const todasDatas=new Set([...dias, ...Object.keys(porData)]);
const hoje0=new Date(); hoje0.setHours(23,59,59,0);
const datasOrdenadas=[...todasDatas].sort((a,b)=>{
const pa=a.split('/'), pb=b.split('/');
const da=new Date(pa[2],pa[1]-1,pa[0]), db=new Date(pb[2],pb[1]-1,pb[0]);
return db-da;
}).filter(dataStr=>{
if(!limiteDias) return true;
const p=dataStr.split('/');
const d=new Date(p[2],p[1]-1,p[0]);
const diffDias=(hoje0-d)/(1000*60*60*24);
return diffDias<=limiteDias;
});
list.innerHTML='';
datasOrdenadas.forEach(dataStr=>{
const sd=ST.sessoesDiarias&&ST.sessoesDiarias[dataStr];
const legBlocks=(porData[dataStr]&&porData[dataStr].questoesBlocos)||[];
let qtotQ=0, qacQ=0, qdur=0;
const blocos=[];
if(sd){
qtotQ=sd.questoes.total||0;
qacQ=sd.questoes.acertos||0;
qdur=sd.questoes.duracao||0;
(sd.questoes.blocos||[]).forEach(b=>blocos.push(b));
} else {
legBlocks.forEach(b=>{qtotQ+=b.total;qacQ+=b.acertos;qdur+=b.duracao||0;blocos.push(b);});
}
const tarefas=sd?(sd.tarefas?.itens||[]):[];
const artigos=sd?(sd.artigos?.itens||[]):[];
const editalMarcacoes=sd?(sd.edital?.marcacoes||0):0;
const fcRev=sd?(sd.flashcards?.revisoes||0):0;
const fcAc=sd?(sd.flashcards?.acertos||0):0;
const temAtividade=qtotQ>0||tarefas.length>0||artigos.length>0||editalMarcacoes>0||fcRev>0;
if(!temAtividade) return;
const taxaDia=qtotQ>0?Math.round(qacQ/qtotQ*100):null;
const grupo=document.createElement('div');
grupo.style.cssText='margin-bottom:.85rem';
let headerPills='';
if(qtotQ>0) headerPills+=`<span style="font-size:.6rem;background:rgba(96,165,250,.1);color:var(--blue);border:1px solid rgba(96,165,250,.3);border-radius:4px;padding:1px 6px">📝 ${qtotQ} questões${taxaDia!==null?' · '+taxaDia+'%':''}</span>`;
if(tarefas.length>0) headerPills+=`<span style="font-size:.6rem;background:rgba(245,200,0,.1);color:var(--gold);border:1px solid rgba(245,200,0,.25);border-radius:4px;padding:1px 6px">✅ ${tarefas.length} tarefa(s)</span>`;
if(artigos.length>0) headerPills+=`<span style="font-size:.6rem;background:rgba(167,139,250,.1);color:var(--purple);border:1px solid rgba(167,139,250,.3);border-radius:4px;padding:1px 6px">📖 ${artigos.length} art.</span>`;
if(editalMarcacoes>0) headerPills+=`<span style="font-size:.6rem;background:rgba(74,222,128,.08);color:var(--green);border:1px solid rgba(74,222,128,.25);border-radius:4px;padding:1px 6px">📚 ${editalMarcacoes} edital</span>`;
if(fcRev>0) headerPills+=`<span style="font-size:.6rem;background:rgba(248,113,113,.08);color:var(--red);border:1px solid rgba(248,113,113,.25);border-radius:4px;padding:1px 6px">🃏 ${fcRev} fc</span>`;
grupo.innerHTML=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:.4rem;flex-wrap:wrap">
<span style="font-family:'Oswald',sans-serif;font-size:.72rem;font-weight:700;color:var(--gold)">${dataStr}</span>
<div style="display:flex;gap:4px;flex-wrap:wrap">${headerPills}</div>
</div>`;
blocos.forEach((b,bi)=>{
const c=b.taxa>=70?'var(--green)':b.taxa>=50?'var(--gold)':'var(--red)';
const card=document.createElement('div');
card.className='sessao-card';
card.innerHTML=`
<span class="sessao-data">${b.hora||''}</span>
<span class="sessao-mat">${escapeHtml(b.titulo||b.materia||'Questões')}</span>
<div class="sessao-pills">
<span style="font-size:.6rem;background:rgba(${b.taxa>=70?'74,222,128':b.taxa>=50?'245,200,0':'248,113,113'},.12);color:${c};border:1px solid ${c};border-radius:4px;padding:1px 7px;font-weight:700">${b.taxa}%</span>
<span style="font-size:.6rem;color:var(--green)">✓ ${b.acertos}</span>
<span style="font-size:.6rem;color:var(--red)">✗ ${b.total-b.acertos}</span>
${b.duracao?`<span style="font-size:.6rem;color:var(--blue)">⏱ ${fmtSecs(b.duracao)}</span>`:''}
${isBackup?`<button onclick="sessaoExcluirItem('${dataStr}','questao',${bi})" class="sess-del-btn" title="Excluir este registro de questões">✕</button>`:''}
</div>`;
grupo.appendChild(card);
});
if(tarefas.length>0){
const tCard=document.createElement('div');
tCard.className='sessao-card';
tCard.style.cssText='background:rgba(245,200,0,.04);border-color:rgba(245,200,0,.15)';
tCard.innerHTML=`
<span class="sessao-data" style="color:var(--gold)">Tarefas</span>
<div style="flex:1;font-size:.63rem;color:rgba(255,255,255,.7)">${tarefas.map((t,ti)=>
`<span style="display:inline-flex;align-items:center;margin-right:8px;gap:4px">✅ ${escapeHtml(t.cat?t.cat+': ':'')}${escapeHtml(t.desc||'')}${isBackup?`<button onclick="sessaoExcluirItem('${dataStr}','tarefa',${ti})" class="sess-del-btn-inline" title="Excluir esta tarefa">✕</button>`:''}</span>`
).join('')}</div>`;
grupo.appendChild(tCard);
}
if(artigos.length>0){
const porLei={};
artigos.forEach(a=>{
if(!porLei[a.lei]) porLei[a.lei]=[];
porLei[a.lei].push('Art.'+a.art);
});
const aCard=document.createElement('div');
aCard.className='sessao-card';
aCard.style.cssText='background:rgba(167,139,250,.04);border-color:rgba(167,139,250,.2)';
aCard.innerHTML=`
<span class="sessao-data" style="color:var(--purple)">Leitura</span>
<div style="flex:1;font-size:.63rem;color:rgba(255,255,255,.7)">${Object.entries(porLei).map(([lei,arts],li)=>`<span style="display:flex;align-items:center;gap:4px;margin-bottom:1px">${escapeHtml(lei)}: ${arts.slice(0,8).join(', ')}${arts.length>8?' ...+mais':''}${isBackup?`<button onclick="sessaoExcluirItem('${dataStr}','artigos_lei','${encodeURIComponent(lei)}')" class="sess-del-btn-inline" title="Excluir artigos desta lei">✕</button>`:''}</span>`).join('')}</div>
<div class="sessao-pills">
<span style="font-size:.6rem;color:var(--purple)">📖 ${artigos.length} art.</span>
${isBackup?`<button onclick="sessaoExcluirItem('${dataStr}','artigos',null)" class="sess-del-btn" title="Excluir todos os artigos desta sessão">✕ Todos</button>`:''}
</div>`;
grupo.appendChild(aCard);
}
list.appendChild(grupo);
});
if(datasOrdenadas.length>=30){
list.innerHTML+=`<div style="font-size:.68rem;color:var(--dim);text-align:center;padding:.5rem">Exibindo últimas 30 datas com atividade</div>`;
}
}
function sessaoExcluirItem(dataStr, tipo, idx){
const sd = ST.sessoesDiarias && ST.sessoesDiarias[dataStr];
if(tipo === 'questao'){
if(!sd || !sd.questoes || !sd.questoes.blocos) return;
if(!confirm('Excluir este registro de questões da sessão de '+dataStr+'?')) return;
sd.questoes.blocos.splice(idx, 1);
sd.questoes.total   = sd.questoes.blocos.reduce((a,b)=>a+(b.total||0), 0);
sd.questoes.acertos = sd.questoes.blocos.reduce((a,b)=>a+(b.acertos||0), 0);
sd.questoes.duracao = sd.questoes.blocos.reduce((a,b)=>a+(b.duracao||0), 0);
} else if(tipo === 'tarefa'){
if(!sd || !sd.tarefas || !sd.tarefas.itens) return;
const desc = sd.tarefas.itens[idx]?.desc || 'esta tarefa';
if(!confirm('Excluir "'+desc+'" da sessão de '+dataStr+'?')) return;
sd.tarefas.itens.splice(idx, 1);
sd.tarefas.concluidas = sd.tarefas.itens.length;
} else if(tipo === 'artigos'){
if(!sd || !sd.artigos) return;
if(!confirm('Excluir TODOS os artigos lidos registrados na sessão de '+dataStr+'?')) return;
sd.artigos.itens  = [];
sd.artigos.total  = 0;
} else if(tipo === 'artigos_lei'){
if(!sd || !sd.artigos || !sd.artigos.itens) return;
const leiNome = decodeURIComponent(idx);
if(!confirm('Excluir artigos de "'+leiNome+'" da sessão de '+dataStr+'?')) return;
sd.artigos.itens = sd.artigos.itens.filter(a => a.lei !== leiNome);
sd.artigos.total = sd.artigos.itens.length;
}
if(_sessaoEstaVazia(sd)){
delete ST.sessoesDiarias[dataStr];
} else {
ST.sessoesDiarias[dataStr] = sd;
}
saveState();
_buildSessoesLista(document.getElementById('bk-sessoes-list'), _bkSessPeriodo||0, true);
buildGraficoEvolucao();
_backupToast('✅ Item excluído da sessão!', 'var(--green)');
}
let _grafPeriodo=7;
function grafSetPeriodo(btn){
document.querySelectorAll('[data-periodo]').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
_grafPeriodo=parseInt(btn.dataset.periodo);
buildGraficoEvolucao();
}
function buildGraficoEvolucao(_force){
if(!_force&&!document.getElementById('tab-backup')?.classList.contains('active')&&!document.getElementById('tab-dashboard')?.classList.contains('active')) return;
_buildGrafico(document.getElementById('evolucao-chart'), document.getElementById('evolucao-vazio'));
_buildGrafico(document.getElementById('evolucao-chart-bk'), null);
}
function _buildGrafico(canvas, vazio){
if(!canvas) return;
const hoje=new Date(); hoje.setHours(23,59,59,0);
const inicio=new Date(hoje);
const dias=_grafPeriodo===90?90:_grafPeriodo;
inicio.setDate(hoje.getDate()-dias+1); inicio.setHours(0,0,0,0);
const porDia={};
for(let d=new Date(inicio);d<=hoje;d.setDate(d.getDate()+1)){
porDia[d.toLocaleDateString('pt-BR')]={total:0,acertos:0,tarefas:0,artigos:0,fc:0};
}
(ST.sessoes||[]).forEach(s=>{
if(porDia[s.data]!==undefined){
porDia[s.data].total+=s.total;
porDia[s.data].acertos+=s.acertos;
}
});
Object.entries(ST.sessoesDiarias||{}).forEach(([dataStr,sd])=>{
if(porDia[dataStr]===undefined) return;
if((sd.questoes?.total||0)>0){
porDia[dataStr].total=sd.questoes.total||0;
porDia[dataStr].acertos=sd.questoes.acertos||0;
}
porDia[dataStr].tarefas=(sd.tarefas?.concluidas||0);
porDia[dataStr].artigos=(sd.artigos?.total||0);
porDia[dataStr].fc=(sd.flashcards?.revisoes||0);
});
const labels=Object.keys(porDia);
const taxas=labels.map(d=>porDia[d].total>0?Math.round(porDia[d].acertos/porDia[d].total*100):null);
const totaisQ=labels.map(d=>porDia[d].total);
const totaisTarefas=labels.map(d=>porDia[d].tarefas);
const totaisArt=labels.map(d=>porDia[d].artigos);
const totaisFC=labels.map(d=>porDia[d].fc);
const temDados=totaisQ.some(t=>t>0)||totaisTarefas.some(t=>t>0)||totaisArt.some(t=>t>0)||totaisFC.some(t=>t>0);
if(!temDados){
canvas.style.display='none';
if(vazio) vazio.style.display='block';
const leg=document.getElementById('evolucao-legenda');if(leg) leg.style.display='none';
return;
}
canvas.style.display='block';
if(vazio) vazio.style.display='none';
const leg=document.getElementById('evolucao-legenda');if(leg) leg.style.display='flex';
const ctx=canvas.getContext('2d');
const W=canvas.offsetWidth||canvas.clientWidth||300;
canvas.width=W*window.devicePixelRatio||W;
canvas.height=200*window.devicePixelRatio||200;
ctx.scale(window.devicePixelRatio||1,window.devicePixelRatio||1);
const w=W, h=200;
ctx.clearRect(0,0,w,h);
const pad={t:14,r:16,b:28,l:38};
const cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
const n=labels.length;
const xStep=n>1?cw/(n-1):cw;
ctx.strokeStyle='rgba(255,255,255,.06)';
ctx.lineWidth=1;
[0,25,50,75,100].forEach(v=>{
const y=pad.t+ch-(v/100)*ch;
ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cw,y);ctx.stroke();
ctx.fillStyle='rgba(255,255,255,.3)';
ctx.font=`${10}px Barlow,sans-serif`;
ctx.textAlign='right';
ctx.fillText(v+'%',pad.l-4,y+3);
});
const maxQ=Math.max(...totaisQ,1);
totaisQ.forEach((t,i)=>{
if(!t) return;
const bh=Math.max(3,(t/maxQ)*(ch*0.32));
const x=pad.l+i*xStep-4;
ctx.fillStyle='rgba(96,165,250,.35)';
ctx.fillRect(x,pad.t+ch-bh,8,bh);
});
const pts=taxas.map((t,i)=>t!==null?{x:pad.l+i*xStep,y:pad.t+ch-(t/100)*ch}:null);
ctx.beginPath();
let started=false;
pts.forEach((p,i)=>{if(!p)return;if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);});
if(started){
const last=pts.filter(Boolean).pop();
const first=pts.filter(Boolean)[0];
ctx.lineTo(last.x,pad.t+ch);ctx.lineTo(first.x,pad.t+ch);ctx.closePath();
const grad=ctx.createLinearGradient(0,pad.t,0,pad.t+ch);
grad.addColorStop(0,'rgba(74,222,128,.22)');grad.addColorStop(1,'rgba(74,222,128,.01)');
ctx.fillStyle=grad;ctx.fill();
}
ctx.beginPath(); started=false;
pts.forEach(p=>{if(!p)return;if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);});
ctx.strokeStyle='rgba(74,222,128,.9)';ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
pts.forEach(p=>{if(!p)return;ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,Math.PI*2);ctx.fillStyle='#4ade80';ctx.fill();});
const maxT=Math.max(...totaisTarefas,1);
const ptsTar=totaisTarefas.map((t,i)=>t>0?{x:pad.l+i*xStep,y:pad.t+ch-(t/maxT)*(ch*0.45)}:null);
ctx.beginPath(); started=false;
ptsTar.forEach(p=>{if(!p)return;if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);});
if(started){ctx.strokeStyle='rgba(245,200,0,.75)';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.lineJoin='round';ctx.stroke();ctx.setLineDash([]);}
ptsTar.forEach(p=>{if(!p)return;ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle='rgba(245,200,0,.85)';ctx.fill();});
const maxA=Math.max(...totaisArt,1);
totaisArt.forEach((a,i)=>{
if(!a) return;
const y=pad.t+ch-(a/maxA)*(ch*0.35);
ctx.beginPath();
ctx.moveTo(pad.l+i*xStep, y-4);
ctx.lineTo(pad.l+i*xStep+4, y);
ctx.lineTo(pad.l+i*xStep, y+4);
ctx.lineTo(pad.l+i*xStep-4, y);
ctx.closePath();
ctx.fillStyle='rgba(167,139,250,.8)';
ctx.fill();
});
ctx.fillStyle='rgba(255,255,255,.35)';
ctx.font=`${9}px Barlow,sans-serif`;
ctx.textAlign='center';
const step=Math.max(1,Math.floor(n/7));
labels.forEach((l,i)=>{
if(i%step===0||i===n-1){
const parts=l.split('/');
ctx.fillText(`${parts[0]}/${parts[1]}`,pad.l+i*xStep,h-6);
}
});
}
populateSimAtivoSel();
populateSqmMatSel();
initBancoSelects();
initErrImportSelect();
bqRenderStats();
renderDashboard(true);
buildSessoesHistorico();
buildGraficoEvolucao();
if(!ST.flashDecks) ST.flashDecks=[];
const FC_TIPOS={
basico:{label:'Básico',cor:'var(--gold)',emoji:'📝'},
lacuna:{label:'Lacuna',cor:'var(--purple)',emoji:'[ ]'},
lista:{label:'Lista',cor:'var(--blue)',emoji:'📋'},
codigo:{label:'Código',cor:'#7dd3fc',emoji:'💻'},
imagem:{label:'Imagem',cor:'#f9a8d4',emoji:'🖼'},
conceito:{label:'Conceito',cor:'var(--green)',emoji:'🔑'},
artigo:{label:'Artigo',cor:'#fb923c',emoji:'⚖'},
traducao:{label:'Tradução',cor:'#34d399',emoji:'🌐'},
};
const FC_INT=[0,1,3,5];
let _fcDeckAtivo=null, _fcTipoAtivo='basico';
let _fcSessaoCards=[], _fcSessaoIdx=0, _fcFlipped=false;
let _fcSessaoStats={again:0,hard:0,good:0,easy:0};
let _fcImgBase64='', _fcRevisaoDecks=new Set(['TODOS']);
function _fcHoje(){const d=new Date();d.setHours(0,0,0,0);return d;}
function _fcDataStr(d){return d.toLocaleDateString('pt-BR');}
function _fcParse(s){if(!s)return new Date(0);const[dd,mm,yy]=s.split('/');return new Date(+yy,+mm-1,+dd);}
function fcGetSRS(card){
if(!card.srs) card.srs={nivel:0,proxima:_fcDataStr(_fcHoje()),historico:[],diasProx:0};
if(!card.srs.historico) card.srs.historico=[];
return card.srs;
}
function _fcEhDominado(card){
const hist=(fcGetSRS(card).historico)||[];
let consec=0;
for(let i=hist.length-1;i>=0;i--){
if(hist[i].rating===3) consec++;
else break;
}
return consec>=3;
}
function fcVencido(card){return _fcParse(fcGetSRS(card).proxima)<=_fcHoje();}
function fcProxLabel(card){
const d=Math.round((_fcParse(fcGetSRS(card).proxima)-_fcHoje())/86400000);
if(d<=0)return'🔴 hoje';if(d===1)return'🟡 amanhã';return'🔵 '+d+'d';
}
function fcAtualizarSRS(card, rating){
const srs=fcGetSRS(card);
if(!srs.historico) srs.historico=[];
const hist=srs.historico;
let incBom=0, incFacil=0;
for(let i=hist.length-1;i>=0;i--){
if(hist[i].rating===0) break;
if(hist[i].rating===2) incBom++;
if(hist[i].rating===3) incFacil++;
}
let diasAte=0;
if(rating===0){
srs.nivel=0;
diasAte=0;
incBom=0; incFacil=0;
} else if(rating===1){
srs.nivel=1;
diasAte=1;
} else if(rating===2){
srs.nivel=2;
diasAte=3+incBom;
} else {
srs.nivel=3;
diasAte=5+incFacil;
}
const prox=new Date(_fcHoje());
prox.setDate(prox.getDate()+diasAte);
srs.proxima=_fcDataStr(prox);
srs.historico.push({data:_fcDataStr(_fcHoje()), rating, dias:diasAte});
card.srs=srs;
}
function fcSubAba(sub){
['cards','revisao','stats','incluir','estudar'].forEach(s=>{
const p=document.getElementById('fc-painel-'+s);if(p)p.style.display='none';
const b=document.getElementById('fc-sub-'+s);if(b)b.classList.remove('active');
});
const p=document.getElementById('fc-painel-'+sub);if(p)p.style.display='block';
const b=document.getElementById('fc-sub-'+sub);
if(b){b.classList.add('active');if(sub!=='estudar')b.style.display='';}
if(sub==='cards'){buildFcDecks();fcPopularFiltros();}
if(sub==='revisao')buildFcRevisao();
if(sub==='stats')buildFcStats();
if(sub==='incluir')fcInitIncluir();
try{ if(typeof topbarSubTabUpdate==='function') topbarSubTabUpdate('flashcards', sub); }catch(e){}
}
function _fcNomeMat(id){
if(!id) return '';
const m=(window.QUESTOES_MATERIAS||[]).find(x=>x.id===id||x.name===id);
return m?m.name:id;
}
function _fcMatId(val){
if(!val) return val;
const m=(window.QUESTOES_MATERIAS||[]).find(x=>x.id===val||x.name===val);
return m?m.id:val;
}
function _fcMatMatch(cMatVal, filterMatId){
if(!filterMatId) return true;
if(!cMatVal) return false;
return _fcMatId(cMatVal)===filterMatId;
}
function fcPopularFiltros(_force){
if(!_force&&!document.getElementById('tab-flashcards')?.classList.contains('active')) return;
const matIds=new Set();
(ST.flashDecks||[]).forEach(d=>(d.cards||[]).forEach(c=>{
if(c.mat){
const norm=_fcMatId(c.mat);
matIds.add(norm||c.mat);
}
}));
const matsOrdenadas=[...matIds].map(id=>{
const nome=_fcNomeMat(id);
return {id, nome: nome||id};
}).sort((a,b)=>a.nome.localeCompare(b.nome));
const sm=document.getElementById('fc-filtro-mat');
if(sm){
const pv=sm.value;
sm.innerHTML='<option value="">Todas as matérias</option>';
matsOrdenadas.forEach(({id,nome})=>{
const o=document.createElement('option');
o.value=id; o.textContent=nome;
sm.appendChild(o);
});
if(pv&&[...sm.options].some(o=>o.value===pv)) sm.value=pv;
}
fcPopularAssuntos();
}
function fcPopularAssuntos(){
const mat=document.getElementById('fc-filtro-mat')?.value||'';
const sa=document.getElementById('fc-filtro-assunto');
if(!sa) return;
if(!mat){
sa.innerHTML='<option value="">— selecione a matéria —</option>';
sa.disabled=true;
sa.value='';
return;
}
sa.disabled=false;
const ass=new Set();
(ST.flashDecks||[]).forEach(d=>(d.cards||[]).forEach(c=>{
if(_fcMatMatch(c.mat, mat)&&c.assunto) c.assunto.split(';').map(s=>s.trim()).filter(Boolean).forEach(a=>ass.add(a));
}));
const pv=sa.value;
sa.innerHTML='<option value="">Todos os assuntos</option>';
[...ass].sort().forEach(a=>{
const o=document.createElement('option');
o.value=a; o.textContent=a;
sa.appendChild(o);
});
if(pv&&[...sa.options].some(o=>o.value===pv)) sa.value=pv;
}
function fcFiltroMatChange(){
fcPopularAssuntos();
fcFiltrarDecks();
}
function fcFiltrarDecks(){buildFcDecks();}
function fcLimparFiltros(){
['fc-filtro-mat','fc-filtro-tipo','fc-filtro-status'].forEach(id=>{
const el=document.getElementById(id); if(el) el.value='';
});
const sa=document.getElementById('fc-filtro-assunto');
if(sa){sa.innerHTML='<option value="">— selecione a matéria —</option>';sa.disabled=true;}
buildFcDecks();
}
function _fcDecksFiltrados(){
const mat   = document.getElementById('fc-filtro-mat')?.value||'';
const ass   = document.getElementById('fc-filtro-assunto')?.value||'';
const tipo  = document.getElementById('fc-filtro-tipo')?.value||'';
const status= document.getElementById('fc-filtro-status')?.value||'';
if(!mat&&!ass&&!tipo&&!status) return ST.flashDecks||[];
return (ST.flashDecks||[]).filter(d=>(d.cards||[]).some(c=>{
if(mat && !_fcMatMatch(c.mat, mat)) return false;
if(mat&&ass&&!_assuntoMatch(c.assunto,ass)) return false;
if(tipo&&(c.tipo||'basico')!==tipo) return false;
if(status==='hoje'&&!fcVencido(c)) return false;
if(status==='dominado'&&!_fcEhDominado(c)) return false;
if(status==='novo'&&(c.srs?.historico||[]).length>0) return false;
return true;
}));
}
function buildFcDecks(_force){
if(!_force&&!document.getElementById('tab-flashcards')?.classList.contains('active')) return;
_fcDecksMultiSelIniciado=false;
const list=document.getElementById('fc-deck-list');if(!list)return;
const todos=ST.flashDecks||[];
const totC=todos.reduce((a,d)=>a+(d.cards||[]).length,0);
const totH=todos.reduce((a,d)=>a+(d.cards||[]).filter(fcVencido).length,0);
const totD=todos.reduce((a,d)=>a+(d.cards||[]).filter(c=>_fcEhDominado(c)).length,0);
const etc=document.getElementById('fc-total-cards');if(etc)etc.textContent=totC;
const eph=document.getElementById('fc-para-hoje');if(eph)eph.textContent=totH;
const edo=document.getElementById('fc-dominados');if(edo)edo.textContent=totD;
const totN=todos.reduce((a,d)=>a+(d.cards||[]).filter(c=>!(c.srs?.historico?.length)).length,0);
const enov=document.getElementById('fc-hoje-novos');if(enov)enov.textContent=totN;
const totRev=todos.reduce((a,d)=>a+(d.cards||[]).filter(c=>c.srs?.historico?.length).length,0);
const efic=totC>0?Math.round((totRev/totC)*100):0;
const epct=document.getElementById('fc-efic-pct');if(epct)epct.textContent=efic+'%';
const ecirc=document.getElementById('fc-efic-circle');
if(ecirc){const circ=2*Math.PI*28;ecirc.style.strokeDashoffset=circ*(1-efic/100);}
// Próximas Revisões — próximos 5 dias
const proxRow=document.getElementById('fc-proximas-rev-row');
if(proxRow){
  const diasNomes=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const hojeDate=_fcHoje();
  const hojeTs=hojeDate.getTime();
  proxRow.innerHTML='';
  for(let i=0;i<5;i++){
    const dia=new Date(hojeTs+i*86400000);
    const isHoje=i===0;
    const nomeDia=isHoje?'HOJE':diasNomes[dia.getDay()];
    const count=todos.reduce((a,d)=>a+(d.cards||[]).filter(c=>{
      const prox=_fcParse(fcGetSRS(c).proxima);
      const proxTs=prox.getTime();
      const diaTs=hojeTs+i*86400000;
      const diaTsProx=hojeTs+(i+1)*86400000;
      if(isHoje) return proxTs<=hojeTs;
      return proxTs>=diaTs && proxTs<diaTsProx;
    }).length,0);
    proxRow.innerHTML+=`<div style="border-radius:8px;padding:.6rem .4rem;background:${isHoje?'rgba(253,196,2,.15)':'rgba(255,255,255,.03)'};border:1px solid ${isHoje?'rgba(253,196,2,.4)':'var(--border)'}">
      <div style="font-family:'Oswald',sans-serif;font-size:.6rem;font-weight:700;color:${isHoje?'var(--gold)':'var(--muted)'};text-transform:uppercase;letter-spacing:.06em;margin-bottom:.3rem${isHoje?';border-bottom:2px solid var(--gold);padding-bottom:.25rem':''}">${nomeDia}</div>
      <div style="font-family:'Oswald',sans-serif;font-size:1.4rem;font-weight:700;color:#fff;line-height:1">${count}</div>
      <div style="font-size:.55rem;color:var(--muted);margin-top:2px">cards</div>
    </div>`;
  }
}
fcRenderMultiSel();
fcInitDeckListEvents();
const decks=_fcDecksFiltrados();
if(!decks.length){
list.innerHTML='<div style="font-size:.78rem;color:var(--dim);font-style:italic;text-align:center;padding:2rem">Nenhum deck. Clique em <strong style="color:var(--gold)">+ Incluir Flash Card</strong> para começar.</div>';
return;
}
list.innerHTML='';
decks.forEach(deck=>{
const cards=deck.cards||[];
const hoje=cards.filter(fcVencido).length;
const dom=cards.filter(c=>_fcEhDominado(c)).length;
const nov=cards.filter(c=>!(c.srs?.historico?.length)).length;
const apren=Math.max(0,cards.length-dom-nov);
const grupos={};
cards.forEach(c=>{
const k=(c.mat||'Sem matéria')+'|||'+(c.assunto||'Sem assunto');
if(!grupos[k])grupos[k]={mat:c.mat||'Sem matéria',assunto:c.assunto||'Sem assunto',count:0,hoje:0};
grupos[k].count++;
if(fcVencido(c))grupos[k].hoje++;
});
const grupoHTML=Object.values(grupos).map(g=>`
<div style="display:flex;align-items:center;gap:8px;padding:.3rem .5rem;background:rgba(255,255,255,.03);border-radius:6px;margin-bottom:.2rem">
<span style="font-family:'Oswald',sans-serif;font-size:.65rem;font-weight:700;color:var(--gold);min-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(g.mat)}</span>
<span style="font-size:.62rem;color:var(--muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(g.assunto)}</span>
<span style="font-size:.65rem;color:rgba(255,255,255,.7);font-family:'Oswald',sans-serif;font-weight:700">${g.count}</span>
${g.hoje?`<span style="font-size:.58rem;background:rgba(248,113,113,.15);color:var(--red);border:1px solid rgba(248,113,113,.3);border-radius:4px;padding:0 5px;font-family:'Oswald',sans-serif;font-weight:700">🔴 ${g.hoje}</span>`:''}
</div>`).join('');
const div=document.createElement('div');
div.className='fc-deck-card';
div.innerHTML=`
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:${cards.length?'.6rem':'0'}">
<div style="flex:1;min-width:0">
<div class="fc-deck-name">${escapeHtml(deck.nome)}</div>
<div class="fc-deck-meta"><span>${cards.length} card${cards.length!==1?'s':''}</span><span>· ${deck.criado||''}</span></div>
<div class="fc-deck-badges" style="margin-top:.35rem">
${nov?`<span class="fc-badge novo">🆕 ${nov} novo${nov!==1?'s':''}</span>`:''}
${apren?`<span class="fc-badge aprendendo">📖 ${apren} aprendendo</span>`:''}
${dom?`<span class="fc-badge dominado">✦ ${dom} dominado${dom!==1?'s':''}</span>`:''}
${hoje?`<span class="fc-badge revisando">🔴 ${hoje} hoje</span>`:''}
</div>
</div>
<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
<button class="sim-btn start" data-action="estudar" data-id="${deck.id}" onclick="fcIniciarSessao('${deck.id}')" style="padding:.3rem .8rem;font-size:.68rem" ${!cards.length?'disabled':''}>▶ Estudar</button>
<button class="sim-btn" data-action="cards" data-id="${deck.id}" onclick="fcIrIncluir('${deck.id}')" style="padding:.3rem .8rem;font-size:.68rem;background:rgba(245,200,0,.1);color:var(--gold);border-color:rgba(245,200,0,.3)">+ Cards</button>
<button class="sim-btn" data-action="editar-deck" data-id="${deck.id}" onclick="fcEditarDeck('${deck.id}')" style="padding:.3rem .8rem;font-size:.68rem;background:rgba(96,165,250,.1);color:var(--blue);border-color:rgba(96,165,250,.3)">✏ Editar</button>
<button class="sim-btn del" data-action="del" data-id="${deck.id}" onclick="fcDeletarDeck('${deck.id}')" style="padding:.3rem .8rem;font-size:.68rem">🗑</button>
</div>
</div>
${cards.length?`
<details>
<summary style="font-size:.63rem;color:var(--muted);cursor:pointer;list-style:none;margin-bottom:.35rem">📊 ${Object.keys(grupos).length} grupo(s) por matéria/assunto</summary>
<div style="margin-top:.35rem">${grupoHTML}</div>
</details>`:''}`;
list.appendChild(div);
});
}
function buildFcRevisao(){
const decks=ST.flashDecks||[];
const totH=decks.reduce((a,d)=>a+(d.cards||[]).filter(fcVencido).length,0);
const totD=decks.reduce((a,d)=>a+(d.cards||[]).filter(c=>_fcEhDominado(c)).length,0);
const tot7=decks.reduce((a,d)=>a+(d.cards||[]).filter(c=>{const df=Math.round((_fcParse(fcGetSRS(c).proxima)-_fcHoje())/86400000);return df>0&&df<=7;}).length,0);
const eh=document.getElementById('fcrev-hoje');if(eh)eh.textContent=totH;
const ed=document.getElementById('fcrev-dom');if(ed)ed.textContent=totD;
const ep=document.getElementById('fcrev-prox');if(ep)ep.textContent=tot7;
const sel=document.getElementById('fcrev-deck-sel');if(!sel)return;
sel.innerHTML='';
const btnT=document.createElement('button');
btnT.className='bq-status-btn'+(_fcRevisaoDecks.has('TODOS')?' active':'');
btnT.textContent='Todos os decks';
btnT.onclick=()=>{_fcRevisaoDecks=new Set(['TODOS']);buildFcRevisao();};
sel.appendChild(btnT);
decks.forEach(d=>{
const btn=document.createElement('button');
const ativo=!_fcRevisaoDecks.has('TODOS')&&_fcRevisaoDecks.has(d.id);
btn.className='bq-status-btn'+(ativo?' active':'');
btn.textContent=d.nome;
btn.onclick=()=>{
_fcRevisaoDecks.delete('TODOS');
if(_fcRevisaoDecks.has(d.id))_fcRevisaoDecks.delete(d.id);
else _fcRevisaoDecks.add(d.id);
if(!_fcRevisaoDecks.size)_fcRevisaoDecks.add('TODOS');
buildFcRevisao();
};
sel.appendChild(btn);
});
const pool=_fcRevPool();
const cc=document.getElementById('fcrev-count');if(cc)cc.textContent=pool.length;
const agenda=document.getElementById('fcrev-agenda');if(!agenda)return;
agenda.innerHTML='';
if(!pool.length){
agenda.innerHTML='<div style="font-size:.75rem;color:var(--dim);font-style:italic;text-align:center;padding:1rem">Nenhum card para revisar hoje com este filtro.</div>';
return;
}
const todos=[];
decks.forEach(d=>{
if(!_fcRevisaoDecks.has('TODOS')&&!_fcRevisaoDecks.has(d.id))return;
(d.cards||[]).forEach(c=>{
const df=Math.round((_fcParse(fcGetSRS(c).proxima)-_fcHoje())/86400000);
todos.push({card:c,deck:d,df});
});
});
todos.sort((a,b)=>a.df-b.df);
todos.slice(0,20).forEach(({card,deck,df})=>{
let badge='futuro',label=df+'d';
if(df<=0){badge='hoje';label='Hoje';}
else if(df===1){badge='amanha';label='Amanhã';}
else if(fcGetSRS(card).nivel>=6){badge='dominada';label='✦ '+df+'d';}
const div=document.createElement('div');
div.className='rev-item';
div.innerHTML=`
<span class="rev-badge ${badge}">${label}</span>
<span style="font-family:'Oswald',sans-serif;font-size:.65rem;color:var(--gold);flex-shrink:0">${escapeHtml(deck.nome.slice(0,18))}</span>
${card.mat?`<span style="font-size:.6rem;color:var(--blue)">${escapeHtml((()=>{const m=(window.QUESTOES_MATERIAS||[]).find(x=>x.id===card.mat);return m?m.name:card.mat;})())}</span>`:''}
<span style="font-size:.7rem;color:rgba(255,255,255,.75);flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtml((card.frente||card.texto||card.numArt||'').replace(/<[^>]+>/g,'').replace(/\*\*(.*?)\*\*/g,'$1').slice(0,55))}</span>
<span style="font-size:.6rem;color:var(--dim)">Nv.${fcGetSRS(card).nivel}</span>`;
agenda.appendChild(div);
});
if(todos.length>20)agenda.innerHTML+=`<div style="font-size:.68rem;color:var(--dim);text-align:center;padding:.5rem">+${todos.length-20} cards</div>`;
}
function _fcRevPool(){
const pool=[];
(ST.flashDecks||[]).forEach(d=>{
if(!_fcRevisaoDecks.has('TODOS')&&!_fcRevisaoDecks.has(d.id))return;
(d.cards||[]).filter(fcVencido).forEach(c=>pool.push({card:{...c,_deckId:d.id},deckId:d.id}));
});
return pool;
}
function fcIniciarRevisao(){
const pool=_fcRevPool();
if(!pool.length){alert('Nenhum card para revisar hoje.');return;}
_fcDeckAtivo='__revisao__';
_fcSessaoCards=[...pool].sort(()=>Math.random()-.5).map(p=>({...p.card,_deckId:p.deckId}));
_fcIniciarComPool('🧠 Revisão Espaçada');
}
function fcInitIncluir(){
const sel=document.getElementById('fc-card-mat');
if(sel&&sel.options.length<=1)QUESTOES_MATERIAS.forEach(m=>{const o=document.createElement('option');o.value=m.name;o.textContent=m.name;sel.appendChild(o);});
fcPopularSelDeck();
}
function fcIrIncluir(deckId){_fcDeckAtivo=deckId;fcSubAba('incluir');}
function fcPopularSelDeck(){
const sel=document.getElementById('fc-sel-deck-ativo');if(!sel)return;
const prev=_fcDeckAtivo;
sel.innerHTML='<option value="">— selecione um deck —</option>';
(ST.flashDecks||[]).forEach(d=>{const o=document.createElement('option');o.value=d.id;o.textContent=d.nome;sel.appendChild(o);});
if(prev&&prev!=='__revisao__')sel.value=prev;
fcSelecionarDeckAtivo(sel.value);
}
function fcSelecionarDeckAtivo(id){
_fcDeckAtivo=id||null;
const wrap=document.getElementById('fc-add-card-wrap');
if(wrap)wrap.style.display=id?'block':'none';
if(id){fcAtualizarDeckInfo();fcRenderCardsDoDecks();}
}
function fcAtualizarDeckInfo(){
const deck=(ST.flashDecks||[]).find(d=>d.id===_fcDeckAtivo);if(!deck)return;
const nc=document.getElementById('fc-ativo-count');
if(nc)nc.textContent=deck.cards.length+' cards';
}
function fcCriarDeck(){
const nome=(document.getElementById('fc-deck-nome').value||'').trim();
if(!nome){alert('Digite o nome do deck.');return;}
if(!ST.flashDecks)ST.flashDecks=[];
const deck={id:'deck_'+Date.now(),nome,criado:new Date().toLocaleDateString('pt-BR'),cards:[]};
ST.flashDecks.push(deck);
_fcDeckAtivo=deck.id;
saveState();
document.getElementById('fc-deck-nome').value='';
fcPopularSelDeck();buildFcDecks();fcPopularFiltros();
const btn=document.querySelector('[onclick="fcCriarDeck()"]');
if(btn){const o=btn.textContent;btn.textContent='✓ Deck criado!';btn.style.background='var(--green)';setTimeout(()=>{btn.textContent=o;btn.style.background='';},1400);}
}
let _fcDecksMultiSel=new Set();
let _fcDecksMultiSelIniciado=false;
let _confirmCallback=null;
function abrirConfirmModal(titulo, msg, onOk, icon='⚠️', okLabel='Confirmar'){
document.getElementById('confirm-modal-icon').textContent=icon;
document.getElementById('confirm-modal-titulo').textContent=titulo;
document.getElementById('confirm-modal-msg').innerHTML=msg;
_confirmCallback=onOk;
const okBtn=document.getElementById('confirm-modal-ok');
okBtn.textContent=okLabel;
okBtn.style.background='';
okBtn.style.borderColor='';
okBtn.style.color='';
okBtn.className='sim-btn del';
okBtn.onclick=()=>{
const cb=_confirmCallback;
fecharConfirmModal();
if(cb) cb();
};
const cancelBtn=document.querySelector('#confirm-modal-overlay button:last-of-type');
if(cancelBtn){
cancelBtn.textContent='Cancelar';
cancelBtn.onclick=fecharConfirmModal;
}
document.getElementById('confirm-modal-overlay').classList.add('open');
}
function fecharConfirmModal(){
document.getElementById('confirm-modal-overlay').classList.remove('open');
_confirmCallback=null;
}
function fcDeletarDeck(id){
if(!id) return;
if(!ST.flashDecks) ST.flashDecks=[];
const idx=ST.flashDecks.findIndex(d=>d.id===id);
if(idx===-1) return;
const deck=ST.flashDecks[idx];
abrirConfirmModal(
'Excluir deck?',
'"'+deck.nome+'" será removido permanentemente ('+(deck.cards||[]).length+' cards).',
()=>{
_limparSessoesPorDeck(id);
ST.flashDecks.splice(idx,1);
if(_fcDeckAtivo===id) _fcDeckAtivo=null;
if(typeof _fcDecksMultiSel!=='undefined') _fcDecksMultiSel.delete(id);
saveState();
const list=document.getElementById('fc-deck-list');
if(list) delete list._fcEvt;
buildFcDecks();
fcPopularFiltros();
fcPopularSelDeck();
},
'🗑'
);
}
function fcDeletarDeckAtivo(){
if(!_fcDeckAtivo||_fcDeckAtivo==='__multi__'||_fcDeckAtivo==='__revisao__'){
alert('Selecione um deck para excluir.');return;
}
fcDeletarDeck(_fcDeckAtivo);
}
function fcRenderMultiSel(){
const decks=_fcDecksFiltrados();
const sel=document.getElementById('fc-sel-multi-decks');if(!sel)return;
sel.innerHTML='';
if(!decks.length){sel.innerHTML='<span style="font-size:.7rem;color:var(--dim);font-style:italic">Nenhum deck</span>';fcAtualizarContMulti();return;}
if(_fcDecksMultiSel.size===0&&!_fcDecksMultiSelIniciado){
decks.forEach(d=>_fcDecksMultiSel.add(d.id));
_fcDecksMultiSelIniciado=true;
}
const todosAtivo=decks.every(d=>_fcDecksMultiSel.has(d.id));
const btnT=document.createElement('button');
btnT.className='bq-status-btn'+(todosAtivo?' active':'');
btnT.textContent='Todos';
btnT.onclick=()=>{
if(todosAtivo){
_fcDecksMultiSel=new Set();
} else {
_fcDecksMultiSel=new Set();
decks.forEach(d=>_fcDecksMultiSel.add(d.id));
}
fcRenderMultiSel();
};
sel.appendChild(btnT);
decks.forEach(d=>{
const ativo=_fcDecksMultiSel.has(d.id);
const btn=document.createElement('button');
btn.className='bq-status-btn'+(ativo?' active':'');
btn.textContent=d.nome+(d.cards.length?' ('+d.cards.length+')':'');
btn.onclick=()=>{
if(_fcDecksMultiSel.has(d.id)){
_fcDecksMultiSel.delete(d.id);
} else {
_fcDecksMultiSel.add(d.id);
}
fcRenderMultiSel();
};
sel.appendChild(btn);
});
fcAtualizarContMulti();
}
function fcAtualizarContMulti(){
const decks=ST.flashDecks||[];
const mat=document.getElementById('fc-filtro-mat')?.value||'';
const ass=document.getElementById('fc-filtro-assunto')?.value||'';
let total=0;
decks.forEach(d=>{
if(!_fcDecksMultiSel.has(d.id))return;
(d.cards||[]).forEach(c=>{
if(mat&&c.mat!==mat)return;
if(ass&&!_assuntoMatch(c.assunto,ass))return;
total++;
});
});
const cc=document.getElementById('fc-sel-count');if(cc)cc.textContent=total;
}
function fcEstudarSelecionados(){
const decks=ST.flashDecks||[];
const mat   =document.getElementById('fc-filtro-mat')?.value||'';
const ass   =document.getElementById('fc-filtro-assunto')?.value||'';
const tipo  =document.getElementById('fc-filtro-tipo')?.value||'';
const status=document.getElementById('fc-filtro-status')?.value||'';
const pool=[];
decks.forEach(d=>{
if(!_fcDecksMultiSel.has(d.id))return;
(d.cards||[]).forEach(c=>{
if(mat&&!_fcMatMatch(c.mat,mat))return;
if(mat&&ass&&!_assuntoMatch(c.assunto,ass))return;
if(tipo&&(c.tipo||'basico')!==tipo)return;
if(status==='hoje'&&!fcVencido(c))return;
if(status==='dominado'&&!_fcEhDominado(c))return;
if(status==='novo'&&(c.srs?.historico||[]).length>0)return;
pool.push({...c,_deckId:d.id});
});
});
if(!pool.length){alert('Nenhum card encontrado para os filtros selecionados.');return;}
_fcDeckAtivo='__multi__';
_fcSessaoCards=[...pool].sort(()=>Math.random()-.5);
const nomes=[...new Set(decks.filter(d=>_fcDecksMultiSel.has(d.id)).map(d=>d.nome))];
const tituloDecks=nomes.length<=2?nomes.join(' + '):nomes.length+' decks';
const matNome=mat?_fcNomeMat(mat):'';
const sufixo=[matNome,ass].filter(Boolean).join(' / ');
_fcIniciarComPool('🎯 '+tituloDecks+(sufixo?' — '+sufixo:''));
}
function fcInitDeckListEvents(){
const list=document.getElementById('fc-deck-list');
if(!list||list._fcEvt)return;
list._fcEvt=true;
list.addEventListener('click',e=>{
const btn=e.target.closest('[data-action]');
if(!btn)return;
const action=btn.dataset.action;
const id=btn.dataset.id;
if(action==='estudar') fcIniciarSessao(id);
else if(action==='cards') fcIrIncluir(id);
else if(action==='del') fcDeletarDeck(id);
});
}
function fcSetTipo(btn){
document.querySelectorAll('[data-tipo]').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');_fcTipoAtivo=btn.dataset.tipo;
['basico','lacuna','lista','codigo','imagem','conceito','artigo','traducao'].forEach(t=>{
const el=document.getElementById('fc-form-'+t);if(el)el.style.display=t===_fcTipoAtivo?'block':'none';
});
}
function fcPreviewImagem(input){
const file=input.files[0];if(!file)return;
const reader=new FileReader();
reader.onload=e=>{
_fcImgBase64=e.target.result;
const prev=document.getElementById('fc-i-preview');const img=document.getElementById('fc-i-preview-img');
if(prev)prev.style.display='block';if(img)img.src=_fcImgBase64;
const b64=document.getElementById('fc-i-base64');if(b64)b64.value=_fcImgBase64;
};
reader.readAsDataURL(file);
}
function fcAdicionarCard(){
if(!_fcDeckAtivo||_fcDeckAtivo==='__revisao__'){alert('Selecione um deck.');return;}
const deck=(ST.flashDecks||[]).find(d=>d.id===_fcDeckAtivo);if(!deck)return;
const tipo=_fcTipoAtivo;
const card={id:'card_'+Date.now(),tipo};
const _rawMatInc=document.getElementById('fc-card-mat')?.value||'';
const _matObjInc=(window.QUESTOES_MATERIAS||[]).find(m=>m.id===_rawMatInc||m.name===_rawMatInc);
card.mat=_matObjInc?_matObjInc.id:_rawMatInc;
card.assunto=(document.getElementById('fc-card-assunto')?.value||'').trim();
const g=id=>(document.getElementById(id)?.value||'').trim();
const cl=(...ids)=>{ids.forEach(id=>{const el=document.getElementById(id);if(el){el.value='';if(el.tagName==='TEXTAREA')el.style.textAlign='';}});_fcResetAlnToolbars();}
if(tipo==='basico'){
if(!g('fc-b-frente')||!g('fc-b-verso')){alert('Preencha frente e verso.');return;}
card.frente=g('fc-b-frente');card.verso=g('fc-b-verso');card.dica=g('fc-b-dica');card.explicacao=g('fc-b-explicacao');
card.alinhFrente=_fcGetAln('fc-b-frente');card.alinhVerso=_fcGetAln('fc-b-verso');
cl('fc-b-frente','fc-b-verso','fc-b-dica','fc-b-explicacao');
}else if(tipo==='lacuna'){
const t=g('fc-l-texto');
if(!t||!t.includes('{{')){ alert('Use {{palavra}} para as lacunas.');return;}
card.texto=t;card.dica=g('fc-l-dica');
card.frente=t.replace(/\{\{(.*?)\}\}/g,'<span class="fc-lacuna-blank">_____</span>');
card.verso=t.replace(/\{\{(.*?)\}\}/g,'<strong style="color:var(--gold)">$1</strong>');
cl('fc-l-texto','fc-l-dica');
}else if(tipo==='lista'){
if(!g('fc-li-pergunta')||!g('fc-li-itens')){alert('Preencha pergunta e itens.');return;}
card.frente=g('fc-li-pergunta');
card.itens=g('fc-li-itens').split('\n').map(i=>i.trim()).filter(Boolean);
card.verso=card.itens.join('\n');
cl('fc-li-pergunta','fc-li-itens');
}else if(tipo==='codigo'){
if(!g('fc-c-pergunta')||!g('fc-c-codigo')){alert('Preencha pergunta e código.');return;}
card.frente=g('fc-c-pergunta');card.codigo=g('fc-c-codigo');card.verso=g('fc-c-codigo');
cl('fc-c-pergunta','fc-c-codigo');
}else if(tipo==='imagem'){
if(!g('fc-i-pergunta')){alert('Preencha a pergunta.');return;}
const url=g('fc-i-url'),b64=(document.getElementById('fc-i-base64')?.value||'');
if(!url&&!b64){alert('Adicione uma imagem.');return;}
card.frente=g('fc-i-pergunta');card.imagem=b64||url;card.verso=g('fc-i-resposta')||g('fc-i-pergunta');
cl('fc-i-pergunta','fc-i-url','fc-i-resposta');
if(document.getElementById('fc-i-base64'))document.getElementById('fc-i-base64').value='';
_fcImgBase64='';const prev=document.getElementById('fc-i-preview');if(prev)prev.style.display='none';
}else if(tipo==='conceito'){
if(!g('fc-co-termo')||!g('fc-co-def')){alert('Preencha termo e definição.');return;}
card.frente='O que é **'+g('fc-co-termo')+'**?';card.termo=g('fc-co-termo');
card.verso=g('fc-co-def');card.exemplo=g('fc-co-exemplo');
cl('fc-co-termo','fc-co-def','fc-co-exemplo');
}else if(tipo==='artigo'){
if(!g('fc-ar-num')||!g('fc-ar-texto')){alert('Preencha artigo e texto.');return;}
card.lei=g('fc-ar-lei');card.numArt=g('fc-ar-num');
card.frente=(g('fc-ar-lei')?g('fc-ar-lei')+' — ':'')+g('fc-ar-num');
card.verso=g('fc-ar-texto');card.macete=g('fc-ar-macete');
cl('fc-ar-lei','fc-ar-num','fc-ar-texto','fc-ar-macete');
}else if(tipo==="traducao"){
if(!g("fc-tr-original")||!g("fc-tr-traducao")){alert("Preencha a frase original e a tradução.");return;}
card.frente=g("fc-tr-original");
card.verso=g("fc-tr-traducao");
card.alinhFrente=_fcGetAln('fc-tr-original');
card.alinhVerso=_fcGetAln('fc-tr-traducao');
card.variacoes=g("fc-tr-variacoes").split("\n").map(l=>l.trim()).filter(Boolean);
card.dica=g("fc-tr-dica");
cl("fc-tr-original","fc-tr-traducao","fc-tr-variacoes","fc-tr-dica");
}
deck.cards.push(card);saveState();
fcAtualizarDeckInfo();fcRenderCardsDoDecks();buildFcDecks();fcPopularFiltros();
const btn=document.querySelector('[onclick="fcAdicionarCard()"]');
if(btn){const o=btn.textContent;btn.textContent='✓ Card adicionado!';btn.style.background='var(--green)';setTimeout(()=>{btn.textContent=o;btn.style.background='';},1200);}
}
function fcRenderCardsDoDecks(){
const deck=(ST.flashDecks||[]).find(d=>d.id===_fcDeckAtivo);
const list=document.getElementById('fc-cards-do-deck');if(!list||!deck)return;
list.innerHTML='';
if(!deck.cards.length){
list.innerHTML='<div style="font-size:.72rem;color:var(--dim);font-style:italic;padding:.5rem 0">Nenhum card ainda. Adicione o primeiro acima.</div>';
return;
}
const grupos={};
function _matNome(matId){
if(!matId) return 'Sem matéria';
const m=(window.QUESTOES_MATERIAS||[]).find(x=>
x.id===matId||x.name===matId||x.name.toLowerCase()===matId.toLowerCase()
);
return m?m.name:matId;
}
deck.cards.forEach(c=>{
const matKey=_matNome(c.mat);
const assKey=c.assunto||'Sem assunto';
if(!grupos[matKey])grupos[matKey]={};
if(!grupos[matKey][assKey])grupos[matKey][assKey]=[];
grupos[matKey][assKey].push(c);
});
const header=document.createElement('div');
header.style.cssText='display:flex;align-items:center;justify-content:space-between;font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.55rem;padding-bottom:.4rem;border-bottom:1px solid var(--border)';
header.innerHTML=`<span>${deck.cards.length} card${deck.cards.length!==1?'s':''} no deck</span><span>${Object.keys(grupos).length} matéria(s)</span>`;
list.appendChild(header);
Object.entries(grupos).forEach(([mat,assuntos])=>{
const totMat=Object.values(assuntos).reduce((a,v)=>a+v.length,0);
const matDiv=document.createElement('div');
matDiv.style.cssText='margin-bottom:.75rem';
matDiv.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;padding:.35rem .55rem;background:rgba(245,200,0,.06);border-radius:7px;margin-bottom:.35rem;cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
<span style="font-family:'Oswald',sans-serif;font-size:.72rem;font-weight:700;color:var(--gold)">${escapeHtml(mat)}</span>
<span style="font-size:.65rem;color:var(--muted)">${totMat} card${totMat!==1?'s':''}</span>
</div>
<div>`;
const innerDiv=matDiv.querySelector('div:last-child');
Object.entries(assuntos).forEach(([ass,cards])=>{
const assDiv=document.createElement('div');
assDiv.style.cssText='margin-bottom:.35rem;padding-left:.5rem;border-left:2px solid rgba(245,200,0,.2)';
assDiv.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;padding:.25rem .4rem;cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
<span style="font-size:.68rem;color:rgba(255,255,255,.7)">${escapeHtml(ass)}</span>
<span style="font-size:.62rem;color:var(--muted)">${cards.length} card${cards.length!==1?'s':''}</span>
</div>
<div style="display:none">`;
const cardsDiv=assDiv.querySelector('div:last-child');
cards.slice().reverse().forEach(c=>{
const info=FC_TIPOS[c.tipo]||FC_TIPOS.basico;
const cDiv=document.createElement('div');
cDiv.style.cssText='display:flex;align-items:center;gap:7px;padding:.35rem .5rem;background:var(--surface);border:1px solid var(--border);border-radius:7px;margin-bottom:.25rem';
cDiv.innerHTML=`
<span style="font-size:.7rem">${info.emoji}</span>
<span style="font-size:.65rem;color:${info.cor};font-family:'Oswald',sans-serif;font-weight:700;min-width:48px">${info.label}</span>
<span style="font-size:.7rem;color:rgba(255,255,255,.75);flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtml((c.frente||c.texto||c.numArt||'').replace(/<[^>]+>/g,'').replace(/\*\*(.*?)\*\*/g,'$1').slice(0,60))}</span>
<span style="font-size:.58rem;color:var(--dim);white-space:nowrap">${fcProxLabel(c)}</span>
<button onclick="fcAbrirModalCard('${deck.id}','${c.id}')" style="background:none;border:none;color:var(--blue);cursor:pointer;font-size:.82rem;padding:2px 5px;flex-shrink:0" title="Editar card">✏</button>
<button onclick="fcDeletarCard('${deck.id}','${c.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.82rem;padding:2px 5px;flex-shrink:0" title="Excluir card">✕</button>`;
cardsDiv.appendChild(cDiv);
});
assDiv.appendChild(document.createElement('div'));
innerDiv.appendChild(assDiv);
});
matDiv.appendChild(document.createTextNode(''));
list.appendChild(matDiv);
});
}
function fcDeletarCard(deckId,cardId){
if(!confirm('Remover este card?'))return;
const deck=(ST.flashDecks||[]).find(d=>d.id===deckId);if(!deck)return;
deck.cards=deck.cards.filter(c=>c.id!==cardId);
_limparSessoesPorFlashCard(cardId);
saveState();fcAtualizarDeckInfo();fcRenderCardsDoDecks();buildFcDecks();fcPopularFiltros();
}
let _fcEditDeckId  = null;
let _fcEditCardId  = null;
let _fcEditCardDeckId = null;
function fcEditarDeck(deckId){
const deck=(ST.flashDecks||[]).find(d=>d.id===deckId);
if(!deck) return;
_fcEditDeckId=deckId;
const inp=document.getElementById('fc-edit-deck-nome');
if(inp) inp.value=deck.nome||'';
const ov=document.getElementById('fc-edit-deck-overlay');
if(ov){ov.classList.add('open');setTimeout(()=>inp&&inp.focus(),100);}
}
function fcSalvarNomeDeck(){
const nome=(document.getElementById('fc-edit-deck-nome')?.value||'').trim();
if(!nome){alert('Informe o nome do deck.');return;}
const deck=(ST.flashDecks||[]).find(d=>d.id===_fcEditDeckId);
if(deck){deck.nome=nome;saveState();}
fcFecharEditDeck();
buildFcDecks();fcPopularFiltros();fcPopularSelDeck();
_backupToast('✅ Deck renomeado!','var(--green)');
}
function fcFecharEditDeck(){
const ov=document.getElementById('fc-edit-deck-overlay');
if(ov) ov.classList.remove('open');
_fcEditDeckId=null;
}
function fcAbrirModalCard(deckId, cardId){
const deck=(ST.flashDecks||[]).find(d=>d.id===deckId);
if(!deck) return;
const card=deck.cards.find(c=>c.id===cardId);
if(!card) return;
_fcEditDeckId=deckId;
_fcEditCardId=cardId;
const tipo=card.tipo||'basico';
const info=FC_TIPOS[tipo]||FC_TIPOS.basico;
const tit=document.getElementById('fc-edit-modal-title');
if(tit) tit.textContent='✏ Editar Card — '+info.emoji+' '+info.label;
const tipLabel=document.getElementById('fc-edit-tipo-label');
if(tipLabel){tipLabel.textContent=info.emoji+' '+info.label;tipLabel.style.color=info.cor;}
const matSel=document.getElementById('fc-edit-mat');
if(matSel){
matSel.innerHTML='<option value="">— opcional —</option>';
const _matNorm=(window.QUESTOES_MATERIAS||[]).find(m=>
m.id===card.mat || m.name===card.mat ||
m.name.toLowerCase()===card.mat?.toLowerCase()
);
const _cardMatId=_matNorm?_matNorm.id:(card.mat||'');
(window.QUESTOES_MATERIAS||[]).forEach(m=>{
const o=document.createElement('option');
o.value=m.id; o.textContent=m.name;
if(m.id===_cardMatId) o.selected=true;
matSel.appendChild(o);
});
}
const assEl=document.getElementById('fc-edit-assunto');
if(assEl) assEl.value=card.assunto||'';
['basico','lacuna','lista','codigo','imagem','conceito','artigo','traducao'].forEach(t=>{
const f=document.getElementById('fc-edit-form-'+t);
if(f) f.style.display=t===tipo?'block':'none';
});
const htmlToMd = v => (v||'')
.replace(/<strong[^>]*>(.*?)<\/strong>/gsi, '**$1**')
.replace(/<b[^>]*>(.*?)<\/b>/gsi,           '**$1**')
.replace(/<em[^>]*>(.*?)<\/em>/gsi,         '_$1_')
.replace(/<i[^>]*>(.*?)<\/i>/gsi,           '_$1_')
.replace(/<u[^>]*>(.*?)<\/u>/gsi,           '__$1__')
.replace(/<br\s*\/?>/gi,                    '\n')
.replace(/<[^>]+>/g,                         '');
const sv=(id,val)=>{ const el=document.getElementById(id); if(el) el.value=htmlToMd(val); };
if(tipo==='basico'){
sv('fc-edit-b-frente',     card.frente);
sv('fc-edit-b-verso',      card.verso);
sv('fc-edit-b-dica',       card.dica);
sv('fc-edit-b-explicacao', card.explicacao);
_fcRestaurarAlnToolbars({'fc-edit-b-frente':card.alinhFrente||'left','fc-edit-b-verso':card.alinhVerso||'left'});
} else if(tipo==='lacuna'){
sv('fc-edit-l-texto', card.texto);
sv('fc-edit-l-dica',  card.dica);
} else if(tipo==='lista'){
sv('fc-edit-li-pergunta', card.frente);
sv('fc-edit-li-itens',    (card.itens||[]).join('\n'));
} else if(tipo==='codigo'){
sv('fc-edit-c-pergunta', card.frente);
sv('fc-edit-c-codigo',   card.codigo);
} else if(tipo==='imagem'){
sv('fc-edit-i-pergunta', card.frente);
sv('fc-edit-i-url',      card.imagem&&!card.imagem.startsWith('data:')?card.imagem:'');
sv('fc-edit-i-resposta', card.verso);
sv('fc-edit-i-base64',   card.imagem&&card.imagem.startsWith('data:')?card.imagem:'');
const prev=document.getElementById('fc-edit-i-preview');
const img=document.getElementById('fc-edit-i-preview-img');
if(card.imagem&&prev&&img){img.src=card.imagem;prev.style.display='block';}
else if(prev) prev.style.display='none';
} else if(tipo==='conceito'){
const termoMatch=(card.frente||'').match(/\*\*(.*?)\*\*/);
sv('fc-edit-co-termo',   termoMatch?termoMatch[1]:(card.termo||''));
sv('fc-edit-co-def',     card.verso);
sv('fc-edit-co-exemplo', card.exemplo);
} else if(tipo==='artigo'){
sv('fc-edit-ar-lei',    card.lei);
sv('fc-edit-ar-num',    card.numArt);
sv('fc-edit-ar-texto',  card.verso);
sv('fc-edit-ar-macete', card.macete);
} else if(tipo==='traducao'){
sv('fc-edit-tr-original', card.frente);
sv('fc-edit-tr-traducao', card.verso);
const varTxt=document.getElementById('fc-edit-tr-variacoes');
if(varTxt) varTxt.value=(card.variacoes||[]).join('\n');
sv('fc-edit-tr-dica', card.dica);
}
setTimeout(()=>{
const campos=card.alinhCampos||{
'fc-edit-b-frente':card.alinhFrente||'left',
'fc-edit-b-verso' :card.alinhVerso ||'left'
};
document.querySelectorAll('#fc-edit-card-overlay .fc-aln-toolbar').forEach(tb=>{
const fid=tb.dataset.for; if(!fid) return;
const aln=campos[fid]||'left';
_fcAlnMap[fid]=aln;
tb.querySelectorAll('.fc-aln-btn').forEach(b=>b.classList.toggle('active',b.dataset.aln===aln));
const el=document.getElementById(fid);
if(el) el.style.textAlign=aln;
});
},50);
const ov=document.getElementById('fc-edit-card-overlay');
if(ov) ov.classList.add('open');
}
function fcEditPreviewImagem(input){
const file=input.files[0]; if(!file) return;
const reader=new FileReader();
reader.onload=e=>{
const b64=e.target.result;
const b64el=document.getElementById('fc-edit-i-base64'); if(b64el) b64el.value=b64;
const img=document.getElementById('fc-edit-i-preview-img');
const prev=document.getElementById('fc-edit-i-preview');
if(img){img.src=b64;}
if(prev) prev.style.display='block';
};
reader.readAsDataURL(file);
}
function fcSalvarEdicaoCard(){
const deck=(ST.flashDecks||[]).find(d=>d.id===_fcEditDeckId);
if(!deck) return;
const card=deck.cards.find(c=>c.id===_fcEditCardId);
if(!card) return;
const tipo=card.tipo||'basico';
const g=id=>(document.getElementById(id)?.value||'').trim();
const _rawMat = document.getElementById('fc-edit-mat')?.value||'';
const _matObj = (window.QUESTOES_MATERIAS||[]).find(m=>m.id===_rawMat||m.name===_rawMat);
card.mat = _matObj?_matObj.id:_rawMat;
card.assunto= g('fc-edit-assunto');
if(!card.alinhCampos) card.alinhCampos={};
document.querySelectorAll('#fc-edit-card-overlay .fc-aln-toolbar').forEach(tb=>{
const fid=tb.dataset.for; if(!fid) return;
const btn=tb.querySelector('.fc-aln-btn.active');
if(btn) card.alinhCampos[fid]=btn.dataset.aln;
});
// Mapear alinhFrente/alinhVerso para todos os tipos baseado nos campos corretos
const _tipoAtual=card.tipo||'basico';
const _mapFrente={
  'basico':'fc-edit-b-frente','lacuna':'fc-edit-l-texto','lista':'fc-edit-li-pergunta',
  'codigo':'fc-edit-c-pergunta','imagem':'fc-edit-i-pergunta','conceito':'fc-edit-co-termo',
  'artigo':'fc-edit-ar-texto','traducao':'fc-edit-tr-original'
};
const _mapVerso={
  'basico':'fc-edit-b-verso','lacuna':'fc-edit-l-texto','lista':'fc-edit-li-itens',
  'codigo':'fc-edit-c-codigo','imagem':'fc-edit-i-resposta','conceito':'fc-edit-co-def',
  'artigo':'fc-edit-ar-texto','traducao':'fc-edit-tr-traducao'
};
card.alinhFrente=card.alinhCampos[_mapFrente[_tipoAtual]]||card.alinhFrente||'left';
card.alinhVerso =card.alinhCampos[_mapVerso[_tipoAtual]] ||card.alinhVerso ||'left';
if(tipo==='basico'){
if(!g('fc-edit-b-frente')||!g('fc-edit-b-verso')){alert('Preencha frente e verso.');return;}
card.frente=g('fc-edit-b-frente');
card.verso =g('fc-edit-b-verso');
card.dica  =g('fc-edit-b-dica');
card.explicacao=g('fc-edit-b-explicacao');
card.alinhFrente=_fcGetAln('fc-edit-b-frente');card.alinhVerso=_fcGetAln('fc-edit-b-verso');
} else if(tipo==='lacuna'){
const t=g('fc-edit-l-texto');
if(!t||!t.includes('{{')){alert('Use {{palavra}} para as lacunas.');return;}
card.texto =t;
card.dica  =g('fc-edit-l-dica');
card.frente=t.replace(/\{\{(.*?)\}\}/g,'<span class="fc-lacuna-blank">_____</span>');
card.verso =t.replace(/\{\{(.*?)\}\}/g,'<strong style="color:var(--gold)">$1</strong>');
} else if(tipo==='lista'){
if(!g('fc-edit-li-pergunta')||!g('fc-edit-li-itens')){alert('Preencha pergunta e itens.');return;}
card.frente=g('fc-edit-li-pergunta');
card.itens =g('fc-edit-li-itens').split('\n').map(i=>i.trim()).filter(Boolean);
card.verso =card.itens.join('\n');
} else if(tipo==='codigo'){
if(!g('fc-edit-c-pergunta')||!g('fc-edit-c-codigo')){alert('Preencha pergunta e código.');return;}
card.frente=g('fc-edit-c-pergunta');
card.codigo=g('fc-edit-c-codigo');
card.verso =g('fc-edit-c-codigo');
} else if(tipo==='imagem'){
if(!g('fc-edit-i-pergunta')){alert('Preencha a pergunta.');return;}
const url=g('fc-edit-i-url'), b64=(document.getElementById('fc-edit-i-base64')?.value||'');
card.frente =g('fc-edit-i-pergunta');
card.imagem =b64||url||card.imagem;
card.verso  =g('fc-edit-i-resposta')||g('fc-edit-i-pergunta');
} else if(tipo==='conceito'){
if(!g('fc-edit-co-termo')||!g('fc-edit-co-def')){alert('Preencha termo e definição.');return;}
card.termo  =g('fc-edit-co-termo');
card.frente ='O que é **'+g('fc-edit-co-termo')+'**?';
card.verso  =g('fc-edit-co-def');
card.exemplo=g('fc-edit-co-exemplo');
} else if(tipo==='artigo'){
if(!g('fc-edit-ar-num')||!g('fc-edit-ar-texto')){alert('Preencha artigo e texto.');return;}
card.lei   =g('fc-edit-ar-lei');
card.numArt=g('fc-edit-ar-num');
card.frente=(g('fc-edit-ar-lei')?g('fc-edit-ar-lei')+' — ':'')+g('fc-edit-ar-num');
card.verso =g('fc-edit-ar-texto');
card.macete=g('fc-edit-ar-macete');
} else if(tipo==='traducao'){
if(!g('fc-edit-tr-original')||!g('fc-edit-tr-traducao')){alert('Preencha a frase e a tradução.');return;}
card.frente   =g('fc-edit-tr-original');
card.verso    =g('fc-edit-tr-traducao');
card.variacoes=(document.getElementById('fc-edit-tr-variacoes')?.value||'').split('\n').map(l=>l.trim()).filter(Boolean);
card.dica     =g('fc-edit-tr-dica');
card.alinhFrente=_fcGetAln('fc-edit-tr-original')||card.alinhFrente||'left';
card.alinhVerso =_fcGetAln('fc-edit-tr-traducao')||card.alinhVerso ||'left';
}
saveState();
fcFecharModalCard();
fcRenderCardsDoDecks();
buildFcDecks();
// Re-renderiza o card em exibição no modo estudo para refletir o novo alinhamento
if(typeof fcRenderCard === 'function' && document.getElementById('fc-scene')?.style.display !== 'none'){
// Atualiza o card atual na sessão com os dados recém salvos
const _deckAtualiz=(ST.flashDecks||[]).find(d=>d.id===_fcDeckAtivo);
if(_deckAtualiz && _fcSessaoCards[_fcSessaoIdx]){
const _cardAtualiz=_deckAtualiz.cards.find(c=>c.id===_fcSessaoCards[_fcSessaoIdx].id);
if(_cardAtualiz) _fcSessaoCards[_fcSessaoIdx]=Object.assign({},_cardAtualiz,{_deckId:_fcDeckAtivo});
}
fcRenderCard();
}
_backupToast('✅ Card atualizado!','var(--green)');
}
function fcFecharModalCard(){
const ov=document.getElementById('fc-edit-card-overlay');
if(ov) ov.classList.remove('open');
_fcEditCardId=null;
}
document.addEventListener('click', e=>{
if(e.target.id==='fc-edit-card-overlay') fcFecharModalCard();
if(e.target.id==='fc-edit-deck-overlay') fcFecharEditDeck();
});
function fcIniciarSessao(deckId){
const deck=(ST.flashDecks||[]).find(d=>d.id===deckId);
if(!deck||!deck.cards.length){alert('Nenhum card neste deck.');return;}
_fcDeckAtivo=deckId;
let pool=deck.cards.filter(fcVencido);
if(!pool.length)pool=[...deck.cards];
_fcSessaoCards=[...pool].sort(()=>Math.random()-.5).map(c=>({...c,_deckId:deckId}));
_fcIniciarComPool(deck.nome);
}
function _fcIniciarComPool(titulo){
_fcSessaoIdx=0;_fcSessaoStats={again:0,hard:0,good:0,easy:0};
document.getElementById('fc-sub-estudar').style.display='';
fcSubAba('estudar');
document.getElementById('fc-sess-titulo').textContent=titulo;
document.getElementById('fc-resultado').style.display='none';
document.getElementById('fc-scene').style.display='block';
document.getElementById('fc-rating-wrap').style.display='none';
document.getElementById('fc-nav-wrap').style.display='flex';
fcRenderCard();
}
function fcRenderCard(){
if(_fcSessaoIdx>=_fcSessaoCards.length){fcFimSessao();return;}
const card=_fcSessaoCards[_fcSessaoIdx];
const total=_fcSessaoCards.length;
_fcFlipped=false;
const pct=Math.round((_fcSessaoIdx/total)*100);
const fill=document.getElementById('fc-sess-fill');if(fill)fill.style.width=pct+'%';
const prog=document.getElementById('fc-sess-progresso');if(prog)prog.textContent=(_fcSessaoIdx+1)+' / '+total;
const wrap=document.getElementById('fc-card-wrap');if(wrap)wrap.classList.remove('flipped');
document.getElementById('fc-rating-wrap').style.display='none';
const info=FC_TIPOS[card.tipo]||FC_TIPOS.basico;
const tag=document.getElementById('fc-tipo-tag');
if(tag){tag.textContent=info.emoji+' '+info.label;tag.style.color=info.cor;tag.style.background='rgba(255,255,255,.06)';}
const _fcTipoRender=card.tipo||'basico';
const _fcMapFr={'basico':'fc-edit-b-frente','lacuna':'fc-edit-l-texto','lista':'fc-edit-li-pergunta','codigo':'fc-edit-c-pergunta','imagem':'fc-edit-i-pergunta','conceito':'fc-edit-co-termo','artigo':'fc-edit-ar-texto','traducao':'fc-edit-tr-original'};
const _fcMapBkGlobal={'basico':'fc-edit-b-verso','lacuna':'fc-edit-l-texto','lista':'fc-edit-li-itens','codigo':'fc-edit-c-codigo','imagem':'fc-edit-i-resposta','conceito':'fc-edit-co-def','artigo':'fc-edit-ar-texto','traducao':'fc-edit-tr-traducao'};
const front=document.getElementById('fc-front-content');
if(front){
const _alnF=(card.alinhCampos&&card.alinhCampos[_fcMapFr[_fcTipoRender]])||card.alinhFrente||'left';
front.style.textAlign=_alnF;
front.style.width='100%';
if(card.tipo==='imagem'){
front.innerHTML=`<div style="text-align:${_alnF};width:100%"><img src="${card.imagem}" class="fc-face-img" onerror="this.style.display='none'"><br>${renderTexto(card.frente)}</div>`;
} else if(card.tipo==='lacuna'){
const textoOrig=card.texto||card.frente||'';
const frenteHtml=textoOrig.replace(/\{\{(.*?)\}\}/g,'<span class="fc-lacuna-blank">_____</span>');
front.innerHTML=`<div style="text-align:${_alnF};width:100%">${renderTexto(frenteHtml)}</div>`;
} else {
front.innerHTML=`<div style="text-align:${_alnF};width:100%">${renderTexto(card.frente||card.texto||card.numArt||'')}</div>`;
}
}
const hint=document.getElementById('fc-hint-text');
if(hint)hint.textContent=(card.dica||card.macete)?'💡 '+(card.dica||card.macete):'';
const back=document.getElementById('fc-back-content');
if(back){
const _alnB=(card.alinhCampos&&card.alinhCampos[_fcMapBkGlobal[_fcTipoRender]])||card.alinhVerso||'left';
back.style.textAlign=_alnB;
back.style.width='100%';
if(card.tipo==='lista')back.innerHTML=`<div style="text-align:${_alnB};width:100%"><ul class="fc-face-lista">`+(card.itens||[]).map(it=>'<li>'+renderTexto(it)+'</li>').join('')+'</ul></div>';
else if(card.tipo==='codigo')back.innerHTML='<div class="fc-face-code">'+escapeHtml(card.codigo||card.verso||'')+'</div>';
else if(card.tipo==='traducao'){
let h='<div style="font-size:1.05rem;font-weight:700;color:var(--gold);margin-bottom:.5rem">'+renderTexto(card.verso||'')+'</div>';
if(card.dica) h+='<div style="font-size:.72rem;color:var(--muted);font-style:italic;margin-bottom:.4rem">💡 '+escapeHtml(card.dica)+'</div>';
if(card.variacoes&&card.variacoes.length>0){
h+=`<div style="margin-top:.65rem;padding-top:.5rem;border-top:1px solid rgba(255,255,255,.08)"><button onclick="event.stopPropagation();fcToggleVar(this)" style="background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.3);color:#34d399;border-radius:7px;padding:.22rem .8rem;font-size:.62rem;font-family:'Oswald',sans-serif;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:.05em">📖 Ver variações (${card.variacoes.length})</button><div class="fc-variacoes" style="display:none;margin-top:.5rem"><div style="font-family:'Oswald',sans-serif;font-size:.58rem;color:#34d399;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.35rem">VARIAÇÕES:</div>${card.variacoes.map(v=>{const pts=v.split('=');return `<div style="font-size:.78rem;color:rgba(255,255,255,.75);margin-bottom:.35rem;line-height:1.6">${pts[0]?'<span style="color:rgba(255,255,255,.9)">'+renderTexto(pts[0].trim())+'</span>':''}${pts[1]?' <span style="color:#34d399"> = '+renderTexto(pts[1].trim())+'</span>':''}</div>`;}).join('')}</div></div>`;
}
back.innerHTML=h;
}
else{
let h=`<div style="text-align:${_alnB};width:100%">`;
h+=renderTexto(card.verso||'');
if(card.exemplo)h+='<div style="margin-top:.5rem;font-size:.75rem;color:var(--dim);font-style:italic">Ex: '+renderTexto(card.exemplo)+'</div>';
if(card.tipo==='artigo'&&card.macete)h+='<div style="margin-top:.5rem;font-size:.75rem;color:var(--gold)">💡 '+renderTexto(card.macete)+'</div>';
h+='</div>';
if(card.explicacao) h+='<div class="fc-explicacao">'+renderTexto(card.explicacao)+'</div>';
back.innerHTML=h;
}
}
const srs=fcGetSRS(card);
const hist=srs.historico||[];
let incBom=0,incFacil=0;
for(let i=hist.length-1;i>=0;i--){
if(hist[i].rating===0) break;
if(hist[i].rating===2) incBom++;
if(hist[i].rating===3) incFacil++;
}
['again','hard','good','easy'].forEach((r,i)=>{
const el=document.getElementById('fc-time-'+r);
if(!el) return;
if(i===0) el.textContent='<1min';
else if(i===1) el.textContent='1d';
else if(i===2) el.textContent=(3+incBom)+'d';
else el.textContent=(5+incFacil)+'d';
});
_atualizarNavBtns();
_fcAplicarZoom();
}
let _fcZoom = 100;
const _fcAlnMap = {};
function fcSetAln(btn){
const toolbar = btn.closest('.fc-aln-toolbar');
if(!toolbar) return;
const fieldId = toolbar.dataset.for;
const aln = btn.dataset.aln;
toolbar.querySelectorAll('.fc-aln-btn').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
_fcAlnMap[fieldId] = aln;
const ta = document.getElementById(fieldId);
if(ta) ta.style.textAlign = aln;
}
function _fcGetAln(fieldId){ return _fcAlnMap[fieldId]||'left'; }
function _fcRestaurarAlnToolbars(alinhamentos){
if(!alinhamentos) return;
Object.entries(alinhamentos).forEach(([fieldId, aln])=>{
_fcAlnMap[fieldId]=aln;
const ta=document.getElementById(fieldId);
if(ta) ta.style.textAlign=aln;
document.querySelectorAll(`.fc-aln-toolbar[data-for="${fieldId}"] .fc-aln-btn`).forEach(b=>{
b.classList.toggle('active', b.dataset.aln===aln);
});
});
}
function _fcResetAlnToolbars(){
document.querySelectorAll('.fc-aln-toolbar').forEach(tb=>{
const fieldId=tb.dataset.for;
delete _fcAlnMap[fieldId];
tb.querySelectorAll('.fc-aln-btn').forEach(b=>{
b.classList.toggle('active', b.dataset.aln==='left');
});
const ta=document.getElementById(fieldId);
if(ta) ta.style.textAlign='left';
});
}
function _fcAplicarAlinhamento(){
}
const FC_ZOOM_STEPS = [70, 80, 90, 100, 115, 130, 150];
function fcZoom(dir){
const idx = FC_ZOOM_STEPS.indexOf(_fcZoom);
const newIdx = Math.max(0, Math.min(FC_ZOOM_STEPS.length-1, idx + dir));
_fcZoom = FC_ZOOM_STEPS[newIdx];
const lbl = document.getElementById('fc-zoom-label');
if(lbl) lbl.textContent = _fcZoom + '%';
_fcAplicarZoom();
}
function _fcAplicarZoom(){
const front = document.getElementById('fc-front-content');
const back  = document.getElementById('fc-back-content');
const hint  = document.getElementById('fc-hint-text');
const sz    = (_fcZoom / 100);
[front, back, hint].forEach(el=>{ if(el) el.style.fontSize = (0.95 * sz) + 'rem'; });
_fcAplicarAlinhamento();
_fcAtualizarSizer();
}
function _fcAtualizarSizer(){
const sizer = document.getElementById('fc-sizer');
if(!sizer) return;
const frontEl = document.getElementById('fc-front-content');
const backEl  = document.getElementById('fc-back-content');
const activeEl = _fcFlipped ? backEl : frontEl;
if(!activeEl) return;
const label = _fcFlipped
? '<span class="fc-face-label" style="color:var(--green)">VERSO</span>'
: '<span class="fc-face-label">FRENTE</span>';
sizer.innerHTML = label + activeEl.innerHTML;
sizer.style.fontSize = (0.95 * _fcZoom / 100) + 'rem';
sizer.style.textAlign = _fcFlipped
? (backEl?.style.textAlign||'left')
: (frontEl?.style.textAlign||'left');
// Após renderizar, garante que o container tem altura suficiente
// para o verso (evita borda sobrepondo botões quando verso é curto
// mas o container ficou com a altura da frente)
requestAnimationFrame(()=>{
  const container = document.querySelector('.fc-card-container');
  const frontFace  = document.getElementById('fc-front');
  const backFace   = document.getElementById('fc-back');
  if(container && frontFace && backFace){
    // Temporariamente mostra ambas para medir
    const origFrontVis = frontFace.style.visibility;
    const origBackVis  = backFace.style.visibility;
    frontFace.style.visibility = 'hidden';
    backFace.style.visibility  = 'hidden';
    frontFace.style.position   = 'relative';
    backFace.style.position    = 'relative';
    const hFront = frontFace.offsetHeight;
    const hBack  = backFace.offsetHeight;
    frontFace.style.position   = '';
    backFace.style.position    = '';
    frontFace.style.visibility = origFrontVis;
    backFace.style.visibility  = origBackVis;
    container.style.minHeight  = Math.max(hFront, hBack, 100) + 'px';
  }
});
}
function fcFlip(){
if(_fcSessaoIdx>=_fcSessaoCards.length) return;
if(!_fcFlipped){
_fcFlipped=true;
const wrap=document.getElementById('fc-card-wrap');if(wrap)wrap.classList.add('flipped');
document.getElementById('fc-rating-wrap').style.display='block';
document.getElementById('fc-flip-hint').style.opacity='0';
} else {
_fcFlipped=false;
const wrap=document.getElementById('fc-card-wrap');if(wrap)wrap.classList.remove('flipped');
document.getElementById('fc-rating-wrap').style.display='none';
document.getElementById('fc-flip-hint').style.opacity='1';
}
setTimeout(_fcAtualizarSizer, 50);
}
function fcEmbaralhar(){
// Embaralha os cards a partir da posição atual
const remaining=_fcSessaoCards.slice(_fcSessaoIdx);
for(let i=remaining.length-1;i>0;i--){
const j=Math.floor(Math.random()*(i+1));
[remaining[i],remaining[j]]=[remaining[j],remaining[i]];
}
_fcSessaoCards.splice(_fcSessaoIdx, remaining.length, ...remaining);
// Feedback visual no botão
const btn=document.getElementById('fc-btn-embaralhar');
if(btn){
const orig=btn.innerHTML;
btn.innerHTML='✅ Embaralhado!';
btn.style.color='var(--green)';
setTimeout(()=>{btn.innerHTML=orig;btn.style.color='';},1200);
}
fcRenderCard();
}

function fcPular(){
if(_fcSessaoIdx>=_fcSessaoCards.length) return;
_fcSessaoIdx++;
fcRenderCard();
_atualizarNavBtns();
}
function fcNavAnterior(){
if(_fcSessaoIdx<=0) return;
_fcSessaoIdx--;
fcRenderCard();
_atualizarNavBtns();
}
function _atualizarNavBtns(){
const btnAnt=document.getElementById('fc-btn-anterior');
if(btnAnt) btnAnt.style.opacity=_fcSessaoIdx<=0?'.3':'1';
}
function fcToggleVar(btn){
const div=btn.nextElementSibling;
if(!div) return;
const open=div.style.display==='block';
div.style.display=open?'none':'block';
btn.textContent=open?
btn.textContent.replace('▲','📖').replace('Esconder','Ver'):
btn.textContent.replace('📖','▲').replace('Ver','Esconder');
setTimeout(_fcAtualizarSizer, 30);
}
function fcAvaliar(rating){
const card=_fcSessaoCards[_fcSessaoIdx];
if(!card) return;
// Atualiza SRS e salva no deck original
fcAtualizarSRS(card, rating);
(ST.flashDecks||[]).forEach(d=>{
const orig=d.cards.find(c=>c.id===card.id);
if(orig) orig.srs=card.srs;
});
// Incrementa estatísticas da sessão
if(rating===0) _fcSessaoStats.again++;
else if(rating===1) _fcSessaoStats.hard++;
else if(rating===2) _fcSessaoStats.good++;
else if(rating===3) _fcSessaoStats.easy++;
// Registra na sessão
const _cardDeckId=(()=>{const d=(ST.flashDecks||[]).find(dk=>dk.cards.some(c=>c.id===card.id));return d?d.id:'';})();
_registrarSessaoFlashcard(rating>=2, card, _cardDeckId);
saveState();
// Navega: Errei = fica (volta pra fila), outros = avança
_fcSessaoIdx++;
fcRenderCard();_atualizarNavBtns();
}
function fcFimSessao(){
document.getElementById('fc-scene').style.display='none';
document.getElementById('fc-rating-wrap').style.display='none';
document.getElementById('fc-nav-wrap').style.display='none';
const fill=document.getElementById('fc-sess-fill');if(fill)fill.style.width='100%';
const prog=document.getElementById('fc-sess-progresso');if(prog)prog.textContent='Concluído — '+_fcSessaoCards.length+' cards';
const total=_fcSessaoCards.length;
const doc=document.getElementById('fc-resultado-stats');
const {again,hard,good,easy}=_fcSessaoStats;
if(doc)doc.innerHTML='<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:.4rem"><span style="color:var(--red)">✕ '+again+' errei</span><span style="color:var(--gold)">〜 '+hard+' difícil</span><span style="color:var(--blue)">✓ '+good+' bom</span><span style="color:var(--green)">★ '+easy+' fácil</span></div><span style="color:var(--muted)">Taxa de retenção: '+(total>0?Math.round((good+easy)/total*100):0)+'%</span>';
document.getElementById('fc-resultado').style.display='block';
buildFcDecks();
_registrarSessao('Flash Cards — '+((ST.flashDecks||[]).find(d=>d.id===(_fcDeckAtivo==='__revisao__'?null:_fcDeckAtivo))?.nome||'Revisão'),'',total,good+easy,0);
buildSessoesHistorico();
}
function fcReiniciarSessao(){
if(_fcDeckAtivo==='__revisao__')fcIniciarRevisao();
else if(_fcDeckAtivo)fcIniciarSessao(_fcDeckAtivo);
}
function fcEncerrarSessao(){
document.getElementById('fc-nav-wrap').style.display='none';
document.getElementById('fc-sub-estudar').style.display='none';
fcSubAba('cards');
}
let _fcStatPeriodo='tudo';
function fcStatSetPeriodo(btn){
document.querySelectorAll('[data-fcp]').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
_fcStatPeriodo=btn.dataset.fcp;
const cw=document.getElementById('fc-stat-custom-wrap');
if(cw) cw.style.display=_fcStatPeriodo==='custom'?'block':'none';
buildFcStats();
}
function _fcStatInPeriodo(dataStr){
if(_fcStatPeriodo==='tudo') return true;
if(!dataStr) return false;
const hoje=new Date(); hoje.setHours(0,0,0,0);
const hojeStr=hoje.toLocaleDateString('pt-BR');
const semIni=new Date(hoje); semIni.setDate(hoje.getDate()-hoje.getDay());
const mesIni=new Date(hoje.getFullYear(),hoje.getMonth(),1);
if(_fcStatPeriodo==='hoje') return dataStr===hojeStr;
const [dd,mm,yy]=dataStr.split('/');
const d=new Date(+yy,+mm-1,+dd);
if(_fcStatPeriodo==='semana') return d>=semIni;
if(_fcStatPeriodo==='mes') return d>=mesIni;
if(_fcStatPeriodo==='custom'){
const cv=document.getElementById('fc-stat-custom-date')?.value;
if(!cv) return false;
const [cy,cm,cd]=cv.split('-');
return dataStr===`${cd}/${cm}/${cy}`;
}
return true;
}
function buildFcStats(){
const dsel=document.getElementById('fc-stat-deck');
if(dsel){
const prev=dsel.value;
dsel.innerHTML='<option value="">Todos os decks</option>';
(ST.flashDecks||[]).forEach(d=>{
const o=document.createElement('option');o.value=d.id;o.textContent=d.nome;dsel.appendChild(o);
});
dsel.value=prev;
}
const deckFiltro=dsel?.value||'';
const decks=(ST.flashDecks||[]).filter(d=>!deckFiltro||d.id===deckFiltro);
let total=0, facil=0, bom=0, dificil=0, errei=0;
const porDia={};
const porDeck={};
let sessoesIds=new Set();
decks.forEach(deck=>{
let dTotal=0,dFacil=0,dBom=0,dDificil=0,dErrei=0;
(deck.cards||[]).forEach(card=>{
const srs=fcGetSRS(card);
(srs.historico||[]).forEach(h=>{
if(!_fcStatInPeriodo(h.data)) return;
total++;dTotal++;
if(h.rating===3){facil++;dFacil++;}
else if(h.rating===2){bom++;dBom++;}
else if(h.rating===1){dificil++;dDificil++;}
else{errei++;dErrei++;}
const d=h.data||'?';
if(!porDia[d])porDia[d]={total:0,bom:0};
porDia[d].total++;
if(h.rating>=2)porDia[d].bom++;
});
});
if(dTotal>0) porDeck[deck.id]={nome:deck.nome,total:dTotal,facil:dFacil,bom:dBom,dificil:dDificil,errei:dErrei,cards:(deck.cards||[]).length};
});
(ST.sessoes||[]).forEach(s=>{
if(deckFiltro&&!s.titulo.includes((ST.flashDecks||[]).find(d=>d.id===deckFiltro)?.nome||'__'))return;
if(!s.titulo.includes('Flash Cards'))return;
if(!_fcStatInPeriodo(s.data))return;
sessoesIds.add(s.id||s.data);
});
const niveis=[0,0,0,0,0,0,0,0];
const dominados=decks.reduce((a,d)=>{
(d.cards||[]).forEach(c=>{const n=fcGetSRS(c).nivel;niveis[n]=(niveis[n]||0)+1;});
return a+(d.cards||[]).filter(c=>_fcEhDominado(c)).length;
},0);
const vencidos=decks.reduce((a,d)=>a+(d.cards||[]).filter(fcVencido).length,0);
const retencao=total>0?Math.round((facil+bom)/total*100):0;
const s=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
s('fcs-total',total);
s('fcs-retencao',total>0?retencao+'%':'—');
s('fcs-sessoes',sessoesIds.size);
s('fcs-facil',facil);
s('fcs-bom',bom);
s('fcs-dificil',dificil);
s('fcs-errei',errei);
s('fcs-dominados',dominados);
s('fcs-vencidos',vencidos);
_fcDrawChart(porDia);
const tbl=document.getElementById('fc-stat-decks');
if(tbl){
if(!Object.keys(porDeck).length){
tbl.innerHTML='<div style="font-size:.72rem;color:var(--dim);font-style:italic;text-align:center;padding:1rem">Nenhuma atividade no período.</div>';
} else {
tbl.innerHTML='';
Object.values(porDeck).sort((a,b)=>b.total-a.total).forEach(d=>{
const ret=d.total>0?Math.round((d.facil+d.bom)/d.total*100):0;
const div=document.createElement('div');
div.style.cssText='background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.6rem .8rem;margin-bottom:.4rem';
div.innerHTML=`
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem;flex-wrap:wrap;gap:6px">
<span style="font-family:'Oswald',sans-serif;font-size:.78rem;font-weight:700;color:var(--gold)">${escapeHtml(d.nome)}</span>
<span style="font-size:.65rem;color:var(--muted)">${d.total} reviews · ${d.cards} cards</span>
</div>
<div style="display:flex;gap:5px;flex-wrap:wrap">
<span style="font-size:.63rem;background:rgba(${ret>=70?'74,222,128':ret>=50?'245,200,0':'248,113,113'},.12);color:${ret>=70?'var(--green)':ret>=50?'var(--gold)':'var(--red)'};border:1px solid ${ret>=70?'rgba(74,222,128,.3)':ret>=50?'rgba(245,200,0,.3)':'rgba(248,113,113,.3)'};border-radius:4px;padding:1px 7px;font-weight:700">${ret}% retenção</span>
<span style="font-size:.63rem;color:var(--green)">★ ${d.facil} fácil</span>
<span style="font-size:.63rem;color:var(--blue)">✓ ${d.bom} bom</span>
<span style="font-size:.63rem;color:var(--muted)">〜 ${d.dificil} difícil</span>
<span style="font-size:.63rem;color:var(--red)">✕ ${d.errei} errei</span>
</div>`;
tbl.appendChild(div);
});
}
}
const nvl=document.getElementById('fc-stat-niveis');
if(nvl){
const labels=['0 — Novo','1 — 1d','2 — 3d','3 — 7d','4 — 14d','5 — 30d','6 — 60d','7 — 120d'];
const cores=['rgba(255,255,255,.15)','rgba(248,113,113,.5)','rgba(245,200,0,.5)','rgba(96,165,250,.5)','rgba(167,139,250,.5)','rgba(74,222,128,.4)','rgba(74,222,128,.7)','rgba(74,222,128,1)'];
const totalCards=niveis.reduce((a,n)=>a+n,0);
nvl.innerHTML='';
if(!totalCards){
nvl.innerHTML='<div style="font-size:.72rem;color:var(--dim);font-style:italic;text-align:center;padding:.75rem">Nenhum card.</div>';
} else {
niveis.forEach((n,i)=>{
if(!n) return;
const pct=Math.round(n/totalCards*100);
const div=document.createElement('div');
div.style.cssText='margin-bottom:.35rem';
div.innerHTML=`
<div style="display:flex;justify-content:space-between;font-size:.65rem;color:rgba(255,255,255,.7);margin-bottom:.2rem">
<span>${labels[i]}</span><span style="font-family:'Oswald',sans-serif;font-weight:700">${n} cards (${pct}%)</span>
</div>
<div style="height:8px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden">
<div style="height:100%;width:${pct}%;background:${cores[i]};border-radius:99px;transition:width .4s"></div>
</div>`;
nvl.appendChild(div);
});
}
}
}
function _fcDrawChart(porDia){
const canvas=document.getElementById('fc-stat-chart');
const vazio=document.getElementById('fc-stat-chart-vazio');
if(!canvas) return;
if(!Object.keys(porDia).length){
canvas.style.display='none';if(vazio)vazio.style.display='block';return;
}
canvas.style.display='block';if(vazio)vazio.style.display='none';
const datas=Object.keys(porDia).sort((a,b)=>{
const [da,ma,ya]=a.split('/');const [db,mb,yb]=b.split('/');
return new Date(+ya,+ma-1,+da)-new Date(+yb,+mb-1,+db);
});
const totais=datas.map(d=>porDia[d].total);
const bons=datas.map(d=>porDia[d].bom);
const maxV=Math.max(...totais,1);
const n=datas.length;
const dpr=window.devicePixelRatio||1;
const W=canvas.offsetWidth||300;
canvas.width=W*dpr; canvas.height=130*dpr;
const ctx=canvas.getContext('2d');
ctx.scale(dpr,dpr);
const w=W,h=130;
ctx.clearRect(0,0,w,h);
const pad={t:10,r:12,b:24,l:30};
const cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
const barW=Math.max(4,Math.floor(cw/n)-2);
const step=cw/n;
ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;
[0,.25,.5,.75,1].forEach(v=>{
const y=pad.t+ch-(v*ch);
ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cw,y);ctx.stroke();
if(v>0){
ctx.fillStyle='rgba(255,255,255,.3)';ctx.font='9px Barlow,sans-serif';ctx.textAlign='right';
ctx.fillText(Math.round(v*maxV),pad.l-3,y+3);
}
});
totais.forEach((t,i)=>{
const bh=(t/maxV)*ch;
const x=pad.l+i*step+(step-barW)/2;
ctx.fillStyle='rgba(96,165,250,.25)';
ctx.fillRect(x,pad.t+ch-bh,barW,bh);
});
bons.forEach((b,i)=>{
const bh=(b/maxV)*ch;
const x=pad.l+i*step+(step-barW)/2;
ctx.fillStyle='rgba(74,222,128,.55)';
ctx.fillRect(x,pad.t+ch-bh,barW,bh);
});
ctx.fillStyle='rgba(255,255,255,.35)';ctx.font='9px Barlow,sans-serif';ctx.textAlign='center';
const stepLbl=Math.max(1,Math.floor(n/6));
datas.forEach((d,i)=>{
if(i%stepLbl===0||i===n-1){
const parts=d.split('/');
ctx.fillText(parts[0]+'/'+parts[1],pad.l+(i+.5)*step,h-5);
}
});
ctx.font='9px Barlow,sans-serif';ctx.textAlign='left';
ctx.fillStyle='rgba(96,165,250,.8)';ctx.fillText('▌ total',pad.l,pad.t-1);
ctx.fillStyle='rgba(74,222,128,.8)';ctx.fillText('▌ bom/fácil',pad.l+52,pad.t-1);
}
function sbToggle(){
const sb=document.getElementById('sidebar');
sb.classList.toggle('collapsed');
try{localStorage.setItem('pmal_sb',sb.classList.contains('collapsed')?'1':'0');}catch(e){}
}
function toggleTheme(){
const isLight=document.body.classList.toggle('light');
_applyThemeUI(isLight);
try{localStorage.setItem('pmal_theme',isLight?'light':'dark');}catch(e){}
// Re-render Estatísticas SVG se estiver ativa (cores inline dependem do tema)
try{
  const statsPanel=document.getElementById('bq-painel-stats');
  if(statsPanel && statsPanel.style.display!=='none'){
    if(typeof bqRenderEstatisticas==='function') bqRenderEstatisticas();
  }
}catch(e){}
}
function _applyThemeUI(isLight){
const sun=document.getElementById('icon-sun');
const moon=document.getElementById('icon-moon');
const label=document.getElementById('theme-label');
if(sun)  sun.style.display  = isLight ? 'none'  : 'block';
if(moon) moon.style.display = isLight ? 'block' : 'none';
if(label) label.textContent = isLight ? 'Escuro' : 'Claro';
}
(function(){
try{
if(localStorage.getItem('pmal_sb')==='1')
document.getElementById('sidebar').classList.add('collapsed');
const theme=localStorage.getItem('pmal_theme');
if(theme==='light'){
document.body.classList.add('light');
_applyThemeUI(true);
}
}catch(e){}
})();
const BACKUP_VERSION = '2';
const BACKUP_HIST_KEY = 'pmal26_backup_hist';
let _bkDados = null;
function bkSubAba(sub){
['exportar','importar','historico','sessoes'].forEach(s=>{
const p=document.getElementById('bk-painel-'+s); if(p) p.style.display='none';
const b=document.getElementById('bk-sub-'+s); if(b) b.classList.remove('active');
});
const p=document.getElementById('bk-painel-'+sub); if(p) p.style.display='block';
const b=document.getElementById('bk-sub-'+sub); if(b) b.classList.add('active');
if(sub==='exportar') bkRenderResumo();
if(sub==='historico') bkRenderHistorico();
if(sub==='sessoes'){ buildSessoesHistorico(); buildGraficoEvolucao(); }
}
function buildBackupTab(){
bkSubAba('exportar');
}
function dashToggleSection(id){
_dashOpen[id] = !_dashOpen[id];
const body  = document.getElementById('dash-'+id+'-body');
const chev  = document.getElementById('dash-'+id+'-chev');
if(body) body.style.display = _dashOpen[id] ? 'block' : 'none';
if(chev) chev.style.transform = _dashOpen[id] ? 'rotate(180deg)' : '';
if(_dashOpen[id]){
if(id==='grafico')    buildGraficoEvolucao();
if(id==='sessoes')    buildSessoesHistorico();
if(id==='flashcards') renderDashFc();
}
}
function bkSessSetPeriodo(btn){
document.querySelectorAll('[data-bkperiodo]').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
_bkSessPeriodo = parseInt(btn.dataset.bkperiodo);
buildSessoesHistorico();
}
function renderDashFc(){
const decks = ST.flashDecks||[];
const totCards = decks.reduce((a,d)=>a+(d.cards||[]).length, 0);
const totHoje  = decks.reduce((a,d)=>a+(d.cards||[]).filter(fcVencido).length, 0);
const totDom   = decks.reduce((a,d)=>a+(d.cards||[]).filter(c=>_fcEhDominado(c)).length, 0);
const elTotal = document.getElementById('dash-fc-total'); if(elTotal) elTotal.textContent=totCards;
const elHoje  = document.getElementById('dash-fc-hoje');  if(elHoje)  elHoje.textContent=totHoje;
const elDom   = document.getElementById('dash-fc-dom');   if(elDom)   elDom.textContent=totDom;
const list = document.getElementById('dash-fc-revisoes-list'); if(!list) return;
list.innerHTML='';
const paraHoje=[];
decks.forEach(d=>{
(d.cards||[]).forEach(c=>{
if(fcVencido(c)) paraHoje.push({card:c, deck:d});
});
});
if(!paraHoje.length){
list.innerHTML='<div style="font-size:.72rem;color:var(--green);font-style:italic;text-align:center;padding:.6rem 0">✅ Nenhuma revisão pendente para hoje!</div>';
return;
}
const porDeck={};
paraHoje.forEach(({card,deck})=>{
if(!porDeck[deck.id]) porDeck[deck.id]={nome:deck.nome,cards:[]};
porDeck[deck.id].cards.push(card);
});
Object.entries(porDeck).forEach(([deckId,{nome,cards}])=>{
const item=document.createElement('div');
item.style.cssText='display:flex;align-items:center;gap:8px;padding:.35rem .55rem;background:rgba(248,113,113,.07);border:1px solid rgba(248,113,113,.18);border-radius:8px;margin-bottom:.3rem';
item.innerHTML=`
<span style="font-size:.9rem">🔴</span>
<div style="flex:1;min-width:0">
<div style="font-family:'Oswald',sans-serif;font-size:.7rem;font-weight:700;color:rgba(255,255,255,.85);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtml(nome)}</div>
<div style="font-size:.62rem;color:var(--muted)">${cards.length} card${cards.length!==1?'s':''} para revisar</div>
</div>
<button onclick="fcIniciarSessao('${deckId}')" style="background:rgba(248,113,113,.15);border:1px solid rgba(248,113,113,.35);color:var(--red);border-radius:6px;padding:.22rem .6rem;font-size:.6rem;font-family:'Oswald',sans-serif;font-weight:700;cursor:pointer;white-space:nowrap;text-transform:uppercase;letter-spacing:.04em">▶ Revisar</button>`;
list.appendChild(item);
});
if(paraHoje.length>0){
const total=document.createElement('div');
total.style.cssText='font-size:.65rem;color:var(--muted);text-align:right;margin-top:.25rem;font-style:italic';
total.textContent=paraHoje.length+' card'+( paraHoje.length!==1?'s':'')+' no total';
list.appendChild(total);
}
}
function bkRenderResumo(){
const el=document.getElementById('bk-export-resumo'); if(!el) return;
const decks=ST.flashDecks||[];
const cards=decks.reduce((a,d)=>a+(d.cards||[]).length,0);
const temEdital=!!_editalCfgLoad();
const temLeis=!!(()=>{try{return JSON.parse(localStorage.getItem(_leisCfgKey())||'null');}catch(e){return null;}})();
const temCron=!!_cfgLoad();
el.innerHTML=`
<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 16px;font-size:.72rem">
<span style="color:var(--muted)">📋 Simulados</span><strong style="color:#fff">${(ST.simulados||[]).length}</strong>
<span style="color:var(--muted)">Questões</span><strong style="color:#fff">${(ST.banco||[]).length} questões</strong>
<span style="color:var(--muted)">🃏 Flash Cards</span><strong style="color:#fff">${cards} cards / ${decks.length} decks</strong>
<span style="color:var(--muted)">📆 Cronograma</span><strong style="color:#fff">${Object.keys(ST.cronograma||{}).length} marcações</strong>
<span style="color:var(--muted)">📖 Leitura das Leis</span><strong style="color:#fff">${Object.keys(ST.leitura||{}).length} artigos</strong>
<span style="color:var(--muted)">🕐 Sessões</span><strong style="color:#fff">${(ST.sessoes||[]).length} / ${Object.keys(ST.sessoesDiarias||{}).length} dias</strong>
<span style="color:var(--muted)">📊 Estat. Questões</span><strong style="color:#fff">${Object.keys(ST.questoes||{}).length} tópicos</strong>
<span style="color:var(--muted)">🔁 Revisão Espaçada</span><strong style="color:#fff">${Object.keys(ST.revisaoEspacada||{}).length} cards</strong>
<span style="color:var(--muted)">📝 Progresso</span><strong style="color:#fff">${Object.keys(ST.progresso||{}).length} itens</strong>
<span style="color:var(--muted)">📄 Resumos</span><strong style="color:#fff">${Object.keys(ST.resumos||{}).length} resumos</strong>
<span style="color:var(--muted)">⚙️ Cfg. Edital</span><strong style="color:${temEdital?'var(--green)':'var(--dim)'}">${temEdital?'✓ incluída':'—'}</strong>
<span style="color:var(--muted)">⚙️ Cfg. Leis</span><strong style="color:${temLeis?'var(--green)':'var(--dim)'}">${temLeis?'✓ incluída':'—'}</strong>
<span style="color:var(--muted)">⚙️ Cfg. Cronograma</span><strong style="color:${temCron?'var(--green)':'var(--dim)'}">${temCron?'✓ incluída':'—'}</strong>
</div>`;
}
function backupExportar(){
const agora=new Date();
const pad=n=>String(n).padStart(2,'0');
const ts=`${agora.getFullYear()}${pad(agora.getMonth()+1)}${pad(agora.getDate())}_${pad(agora.getHours())}${pad(agora.getMinutes())}`;
const decks=ST.flashDecks||[];
const editalCfg=_editalCfgLoad();
const leisCfg=(()=>{try{return JSON.parse(localStorage.getItem(_leisCfgKey())||'null');}catch(e){return null;}})();
const cronCfg=_cfgLoad();
// Garante que flashDecks está dentro de ST antes de serializar
if(!ST.flashDecks) ST.flashDecks=[];
// Salva o estado atual antes de exportar
concSalvarAtual();
const dadosCompletos=JSON.parse(JSON.stringify(ST));
// ── Coleta dados do sistema multi-concurso ──
const concMeta=_concGetMeta();
const concAtivo=_concGetAtivo();
const concDados={};
concMeta.forEach(c=>{concDados[c.id]=_concLoadData(c.id);});
const sharedDados=_sharedLoad();
// FASE 9.4.11: exportar cronograma global (chave pmal26_cfg_global)
const cronGlobal=(()=>{try{return JSON.parse(localStorage.getItem('pmal26_cfg_global')||'null');}catch(e){return null;}})();
// Exportar tema visual salvo
const temaSalvo=(()=>{try{return localStorage.getItem('pmal_theme')||null;}catch(e){return null;}})();
// CORREÇÃO ARQUITETURAL: coleta editalCfg, leisCfg e cronCfg de TODOS os concursos.
// Antes, o backup só salvava o config do concurso ativo, causando contaminação
// na importação (o config do ativo era aplicado em qualquer outro concurso ativo).
const editalCfgPorConcurso={};
const leisCfgPorConcurso={};
const cronCfgPorConcurso={};
concMeta.forEach(c=>{
  try{
    const ec=JSON.parse(localStorage.getItem('pmal26_edital_cfg_'+c.id)||'null');
    if(ec) editalCfgPorConcurso[c.id]=ec;
  }catch(e){}
  try{
    const lc=JSON.parse(localStorage.getItem('pmal26_leis_cfg_'+c.id)||'null');
    if(lc) leisCfgPorConcurso[c.id]=lc;
  }catch(e){}
  try{
    const cc=JSON.parse(localStorage.getItem('pmal26_cfg_'+c.id)||'null');
    if(cc) cronCfgPorConcurso[c.id]=cc;
  }catch(e){}
});
const payload={
_meta:{
versao:BACKUP_VERSION,
data:agora.toLocaleDateString('pt-BR'),
hora:agora.toLocaleTimeString('pt-BR'),
timestamp:agora.getTime(),
resumo:{
simulados:(ST.simulados||[]).length,
banco:(ST.banco||[]).length,
flashDecks:decks.length,
flashCards:decks.reduce((a,d)=>a+(d.cards||[]).length,0),
sessoes:(ST.sessoes||[]).length,
sessoesDiarias:Object.keys(ST.sessoesDiarias||{}).length,
cronTarefas:Object.keys(ST.cronograma||{}).length,
leituraArts:Object.keys(ST.leitura||{}).length,
questStat:Object.keys(ST.questoes||{}).length,
questoesLog:Object.keys(ST.questoesLog||{}).length,
revEsp:Object.keys(ST.revisaoEspacada||{}).length,
progresso:Object.keys(ST.progresso||{}).length,
resumos:Object.keys(ST.resumos||{}).length,
erros:(ST.erros||[]).length,
massificadas:(ST.massificadas||[]).length,
temEdital:!!editalCfg,
temLeisCfg:!!leisCfg,
temCronCfg:!!cronCfg,
totalConcursos:concMeta.length,
// FASE 9.4.11: novos campos de progresso por concurso
temCronGlobal:!!cronGlobal,
progressoPorConcurso:Object.keys(ST.bancoProgressoPorConcurso||{}).length,
sessoesPorConcurso:Object.keys(ST.bancoSessoesPorConcurso||{}).length,
}
},
dados:dadosCompletos,
// Campos top-level mantidos para retrocompatibilidade com importadores antigos
// (carregam o config do concurso ativo no momento do export)
editalCfg: editalCfg ? JSON.parse(JSON.stringify(editalCfg)) : null,
leisCfg: leisCfg ? JSON.parse(JSON.stringify(leisCfg)) : null,
cronCfg: cronCfg ? JSON.parse(JSON.stringify(cronCfg)) : null,
// ── Sistema multi-concurso ──
multiConcurso:{
meta: concMeta,
ativo: concAtivo,
dados: concDados,
shared: sharedDados,
// Novos campos: configs separados por concurso (resolve bug de contaminação na importação)
editalCfgPorConcurso: editalCfgPorConcurso,
leisCfgPorConcurso: leisCfgPorConcurso,
cronCfgPorConcurso: cronCfgPorConcurso,
// FASE 9.4.11: cronograma global e preferências visuais
cronGlobal: cronGlobal,
temaSalvo: temaSalvo,
}
};
const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');
a.href=url; a.download=`PMAL2026_backup_${ts}.json`; a.click();
URL.revokeObjectURL(url);
_backupToast('⬇ Backup completo exportado!','var(--green)');
}
function bkLerArquivo(input){
const file=input.files[0]; if(!file) return;
const reader=new FileReader();
reader.onload=e=>{
try{
const obj=JSON.parse(e.target.result);
_bkDados = obj._meta&&obj.dados ? obj : {_meta:{versao:'1',data:'?',hora:'?',timestamp:0,resumo:{}},dados:obj};
bkMostrarPrevia();
}catch(err){alert('Arquivo inválido ou corrompido.');}
};
reader.readAsText(file);
}
function bkMostrarPrevia(){
if(!_bkDados) return;
const m=_bkDados._meta; const d=_bkDados.dados; const r=m.resumo||{};
const sims       = r.simulados      ?? (d.simulados||[]).length;
const banco      = r.banco          ?? (d.banco||[]).length;
const decks      = r.flashDecks     ?? (d.flashDecks||[]).length;
const cards      = r.flashCards     ?? (d.flashDecks||[]).reduce((a,dk)=>a+(dk.cards||[]).length,0);
const sess       = r.sessoes        ?? (d.sessoes||[]).length;
const sessDiar   = r.sessoesDiarias ?? Object.keys(d.sessoesDiarias||{}).length;
const cron       = r.cronTarefas    ?? Object.keys(d.cronograma||{}).length;
const leit       = r.leituraArts    ?? Object.keys(d.leitura||{}).length;
const questStat  = r.questStat      ?? Object.keys(d.questoes||{}).length;
const questLog   = r.questoesLog    ?? Object.keys(d.questoesLog||{}).length;
const revEsp     = r.revEsp         ?? Object.keys(d.revisaoEspacada||{}).length;
const prog       = r.progresso      ?? Object.keys(d.progresso||{}).length;
const resumos    = r.resumos        ?? Object.keys(d.resumos||{}).length;
const erros      = r.erros          ?? (d.erros||[]).length;
const mass       = r.massificadas   ?? (d.massificadas||[]).length;
const temEdital  = r.temEdital      ?? !!_bkDados.editalCfg;
const temLeis    = r.temLeisCfg     ?? !!_bkDados.leisCfg;
const temCron    = r.temCronCfg     ?? !!_bkDados.cronCfg;
const prev=document.getElementById('bk-preview'); if(!prev) return;
prev.innerHTML=`
<div style="font-family:'Oswald',sans-serif;font-size:.68rem;color:var(--gold);font-weight:700;margin-bottom:.5rem">📦 Conteúdo do arquivo</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;font-size:.7rem">
<span style="color:var(--muted)">📅 Data:</span><strong style="color:#fff">${m.data} ${m.hora}</strong>
<span style="color:var(--muted)">📋 Simulados:</span><strong style="color:#fff">${sims}</strong>
<span style="color:var(--muted)">Questões:</span><strong style="color:#fff">${banco} questões</strong>
<span style="color:var(--muted)">🃏 Flash Cards:</span><strong style="color:#fff">${cards} em ${decks} decks</strong>
<span style="color:var(--muted)">🕐 Sessões de estudo:</span><strong style="color:#fff">${sess} sessões / ${sessDiar} dias</strong>
<span style="color:var(--muted)">📆 Cronograma:</span><strong style="color:#fff">${cron} marcações</strong>
<span style="color:var(--muted)">📖 Leitura das Leis:</span><strong style="color:#fff">${leit} artigos</strong>
<span style="color:var(--muted)">📊 Estat. Questões:</span><strong style="color:#fff">${questStat} tópicos / ${questLog} logs</strong>
<span style="color:var(--muted)">🔁 Revisão Espaçada:</span><strong style="color:#fff">${revEsp} cards</strong>
<span style="color:var(--muted)">📝 Progresso/Edital:</span><strong style="color:#fff">${prog} itens ${temEdital?'✓ cfg':'—'}</strong>
<span style="color:var(--muted)">📄 Resumos:</span><strong style="color:#fff">${resumos} resumos</strong>
<span style="color:var(--muted)">📕 Erros (legado):</span><strong style="color:#fff">${erros} · ${mass} massificadas</strong>
<span style="color:var(--muted)">⚙️ Cfg. Leis:</span><strong style="color:${temLeis?'var(--green)':'var(--dim)'}">${temLeis?'✓ incluída':'não encontrada'}</strong>
<span style="color:var(--muted)">⚙️ Cfg. Cronograma:</span><strong style="color:${temCron?'var(--green)':'var(--dim)'}">${temCron?'✓ incluída':'não encontrada'}</strong>
</div>`;
bkImpStep(2); bkModoChange();
}
function bkImpStep(n){
[1,2,3,4].forEach(i=>{
const el=document.getElementById('bk-imp-step'+i); if(el) el.style.display=i===n?'block':'none';
});
}
function bkModoChange(){
const cores={substituir:'var(--gold)',mesclar:'var(--blue)',diff:'var(--purple)'};
['substituir','mesclar','diff'].forEach(m=>{
const lbl=document.getElementById('bklbl-'+m); if(!lbl) return;
const radio=lbl.querySelector('input'); const active=radio&&radio.checked;
lbl.style.borderColor=active?cores[m]:'var(--border)';
lbl.style.background=active?'rgba(255,255,255,.03)':'var(--surface)';
});
}
function bkAvancar(){
if(!_bkDados){alert('Nenhum arquivo carregado.');return;}
const radio=document.querySelector('input[name="bk-modo"]:checked');
const modo=radio?radio.value:'substituir';
if(modo==='diff'){ bkGerarDiff(); bkImpStep(3); }
else { bkAplicar(modo); }
}
function bkGerarDiff(){
const list=document.getElementById('bk-diff-list'); if(!list) return;
const d=_bkDados.dados;
const itens=[];
const simAtualIds=new Set((ST.simulados||[]).map(s=>s.id));
const simBkIds=new Set((d.simulados||[]).map(s=>s.id));
(d.simulados||[]).forEach(s=>{
if(!simAtualIds.has(s.id)) itens.push({tipo:'inserir',cat:'Simulado',desc:s.nome||s.id});
else itens.push({tipo:'igual',cat:'Simulado',desc:s.nome||s.id});
});
[...simAtualIds].filter(id=>!simBkIds.has(id)).forEach(id=>{
const s=(ST.simulados||[]).find(x=>x.id===id);
itens.push({tipo:'remover',cat:'Simulado',desc:s?.nome||id});
});
const bancoAtualIds=new Set((ST.banco||[]).map(q=>q.id));
const bancoBkIds=new Set((d.banco||[]).map(q=>q.id));
const bInsert=(d.banco||[]).filter(q=>!bancoAtualIds.has(q.id)).length;
const bRemove=(ST.banco||[]).filter(q=>!bancoBkIds.has(q.id)).length;
const bEqual=(d.banco||[]).filter(q=>bancoAtualIds.has(q.id)).length;
if(bInsert) itens.push({tipo:'inserir',cat:'Banco de Questões',desc:`${bInsert} questão(ões) novas`});
if(bRemove) itens.push({tipo:'remover',cat:'Banco de Questões',desc:`${bRemove} questão(ões) removidas`});
if(bEqual)  itens.push({tipo:'igual',cat:'Banco de Questões',desc:`${bEqual} questão(ões) sem alteração`});
const deckAtualIds=new Set((ST.flashDecks||[]).map(dk=>dk.id));
const deckBkIds=new Set((d.flashDecks||[]).map(dk=>dk.id));
(d.flashDecks||[]).forEach(dk=>{
if(!deckAtualIds.has(dk.id)){
itens.push({tipo:'inserir',cat:'Flash Cards',desc:`Deck "${dk.nome}" (${(dk.cards||[]).length} cards)`});
} else {
const atual=(ST.flashDecks||[]).find(x=>x.id===dk.id);
const cardAtualIds=new Set((atual?.cards||[]).map(c=>c.id));
const novos=(dk.cards||[]).filter(c=>!cardAtualIds.has(c.id)).length;
const rem=(atual?.cards||[]).filter(c=>!(dk.cards||[]).find(x=>x.id===c.id)).length;
if(novos||rem) itens.push({tipo:'alterar',cat:'Flash Cards',desc:`Deck "${dk.nome}": +${novos} cards, -${rem} cards`});
else itens.push({tipo:'igual',cat:'Flash Cards',desc:`Deck "${dk.nome}" sem alteração`});
}
});
[...deckAtualIds].filter(id=>!deckBkIds.has(id)).forEach(id=>{
const dk=(ST.flashDecks||[]).find(x=>x.id===id);
itens.push({tipo:'remover',cat:'Flash Cards',desc:`Deck "${dk?.nome||id}" removido`});
});
const cronBk=d.cronograma||{}; const cronAt=ST.cronograma||{};
const cronNovas=Object.keys(cronBk).filter(k=>!cronAt[k]&&cronBk[k]).length;
const cronRemov=Object.keys(cronAt).filter(k=>!cronBk[k]&&cronAt[k]).length;
if(cronNovas) itens.push({tipo:'inserir',cat:'Cronograma',desc:`${cronNovas} tarefa(s) marcada(s) no backup`});
if(cronRemov) itens.push({tipo:'remover',cat:'Cronograma',desc:`${cronRemov} tarefa(s) marcada(s) aqui mas não no backup`});
const leitBk=d.leitura||{}; const leitAt=ST.leitura||{};
const leitNovas=Object.keys(leitBk).filter(k=>!leitAt[k]).length;
const leitRemov=Object.keys(leitAt).filter(k=>!leitBk[k]).length;
if(leitNovas) itens.push({tipo:'inserir',cat:'Leitura',desc:`${leitNovas} artigo(s) novo(s) no backup`});
if(leitRemov) itens.push({tipo:'remover',cat:'Leitura',desc:`${leitRemov} artigo(s) marcado(s) aqui mas não no backup`});
const sessAtIds=new Set((ST.sessoes||[]).map(s=>s.id||s.data+s.hora));
const sessBkNovas=(d.sessoes||[]).filter(s=>!sessAtIds.has(s.id||s.data+s.hora)).length;
const sessAtNovas=(ST.sessoes||[]).filter(s=>!(d.sessoes||[]).find(b=>(b.id||b.data+b.hora)===(s.id||s.data+s.hora))).length;
if(sessBkNovas) itens.push({tipo:'inserir',cat:'Sessões',desc:`${sessBkNovas} sessão(ões) do backup`});
if(sessAtNovas) itens.push({tipo:'remover',cat:'Sessões',desc:`${sessAtNovas} sessão(ões) atuais removidas`});
const sdBkKeys=Object.keys(d.sessoesDiarias||{});
const sdAtKeys=new Set(Object.keys(ST.sessoesDiarias||{}));
const sdNovas=sdBkKeys.filter(k=>!sdAtKeys.has(k)).length;
if(sdNovas) itens.push({tipo:'inserir',cat:'Sessões',desc:`${sdNovas} dia(s) de atividade do backup`});
const qBk=d.questoes||{}; const qAt=ST.questoes||{};
const qBkKeys=Object.keys(qBk); const qAtKeys=Object.keys(qAt);
const qNovos=qBkKeys.filter(k=>!qAt[k]).length;
const qRemov=qAtKeys.filter(k=>!qBk[k]).length;
const qAlter=qBkKeys.filter(k=>qAt[k]&&(qBk[k].total!==qAt[k].total||qBk[k].acertos!==qAt[k].acertos)).length;
if(qNovos) itens.push({tipo:'inserir',cat:'Estatística de Questões',desc:`${qNovos} tópico(s) novo(s) no backup`});
if(qRemov) itens.push({tipo:'remover',cat:'Estatística de Questões',desc:`${qRemov} tópico(s) presentes aqui mas não no backup`});
if(qAlter) itens.push({tipo:'alterar',cat:'Estatística de Questões',desc:`${qAlter} tópico(s) com dados diferentes (totais serão somados na mesclagem)`});
const revBk=d.revisaoEspacada||{}; const revAt=ST.revisaoEspacada||{};
const revNovos=Object.keys(revBk).filter(k=>!revAt[k]).length;
const revAlter=Object.keys(revBk).filter(k=>revAt[k]&&revBk[k].nivel>revAt[k].nivel).length;
if(revNovos) itens.push({tipo:'inserir',cat:'Revisão Espaçada',desc:`${revNovos} card(s) de revisão novos no backup`});
if(revAlter) itens.push({tipo:'alterar',cat:'Revisão Espaçada',desc:`${revAlter} card(s) com nível mais avançado no backup`});
if(!itens.length){
list.innerHTML='<div style="text-align:center;font-size:.75rem;color:var(--dim);padding:1rem">Nenhuma diferença encontrada. Dados idênticos.</div>';
return;
}
const corMap={inserir:'var(--green)',remover:'var(--red)',alterar:'var(--gold)',igual:'var(--dim)'};
const iconMap={inserir:'＋',remover:'－',alterar:'✎',igual:'＝'};
list.innerHTML='';
const porCat={};
itens.forEach(it=>{ if(!porCat[it.cat]) porCat[it.cat]=[]; porCat[it.cat].push(it); });
const ins=itens.filter(i=>i.tipo==='inserir').length;
const rem=itens.filter(i=>i.tipo==='remover').length;
const alt=itens.filter(i=>i.tipo==='alterar').length;
const sum=document.createElement('div');
sum.style.cssText='display:flex;gap:8px;margin-bottom:.75rem;flex-wrap:wrap';
sum.innerHTML=`
${ins?`<span style="font-size:.68rem;background:rgba(74,222,128,.12);color:var(--green);border:1px solid rgba(74,222,128,.3);border-radius:6px;padding:2px 10px;font-family:'Oswald',sans-serif;font-weight:700">＋ ${ins} inserção${ins!==1?'ões':''}</span>`:''}
${rem?`<span style="font-size:.68rem;background:rgba(248,113,113,.12);color:var(--red);border:1px solid rgba(248,113,113,.3);border-radius:6px;padding:2px 10px;font-family:'Oswald',sans-serif;font-weight:700">－ ${rem} remoção${rem!==1?'ões':''}</span>`:''}
${alt?`<span style="font-size:.68rem;background:rgba(245,200,0,.1);color:var(--gold);border:1px solid rgba(245,200,0,.25);border-radius:6px;padding:2px 10px;font-family:'Oswald',sans-serif;font-weight:700">✎ ${alt} alteração${alt!==1?'ões':''}</span>`:''}`;
list.appendChild(sum);
Object.entries(porCat).forEach(([cat,citens])=>{
const sec=document.createElement('div');
sec.style.cssText='margin-bottom:.6rem';
sec.innerHTML=`<div style="font-family:'Oswald',sans-serif;font-size:.65rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem">${cat}</div>`;
citens.forEach(it=>{
if(it.tipo==='igual') return;
const row=document.createElement('div');
row.style.cssText=`display:flex;align-items:flex-start;gap:8px;padding:.3rem .5rem;background:rgba(${it.tipo==='inserir'?'74,222,128':it.tipo==='remover'?'248,113,113':'245,200,0'},.05);border-left:3px solid ${corMap[it.tipo]};border-radius:0 6px 6px 0;margin-bottom:.25rem`;
row.innerHTML=`<span style="font-family:'Oswald',sans-serif;font-weight:700;color:${corMap[it.tipo]};font-size:.75rem;flex-shrink:0">${iconMap[it.tipo]}</span><span style="font-size:.68rem;color:rgba(255,255,255,.8)">${escapeHtml(it.desc)}</span>`;
sec.appendChild(row);
});
list.appendChild(sec);
});
}
function bkConfirmarDiff(){
bkAplicar('substituir');
}
function bkAplicar(modo){
if(!_bkDados){alert('Nenhum arquivo carregado.');return;}
const bkD=_bkDados.dados;
const bkEditalCfg=_bkDados.editalCfg??null;
const bkLeisCfg=_bkDados.leisCfg??null;
const bkCronCfg=_bkDados.cronCfg??null;
// CORREÇÃO ARQUITETURAL: backups novos trazem configs POR CONCURSO em multiConcurso.
// Quando presentes, aplicam cada config na chave correta do localStorage por id.
// Quando ausentes (backups antigos), mantém o comportamento legado (aplica no ativo).
const bkMC = _bkDados.multiConcurso || {};
const bkEditalPorConc = bkMC.editalCfgPorConcurso || null;
const bkLeisPorConc   = bkMC.leisCfgPorConcurso   || null;
const bkCronPorConc   = bkMC.cronCfgPorConcurso   || null;
function _aplicarConfigsPorConcurso(){
  // Grava cada config diretamente na chave do concurso original — sem usar o ativo.
  if(bkEditalPorConc && typeof bkEditalPorConc==='object'){
    Object.keys(bkEditalPorConc).forEach(function(cid){
      try{ localStorage.setItem('pmal26_edital_cfg_'+cid, JSON.stringify(bkEditalPorConc[cid])); }catch(e){}
    });
  }
  if(bkLeisPorConc && typeof bkLeisPorConc==='object'){
    Object.keys(bkLeisPorConc).forEach(function(cid){
      try{ localStorage.setItem('pmal26_leis_cfg_'+cid, JSON.stringify(bkLeisPorConc[cid])); }catch(e){}
    });
  }
  if(bkCronPorConc && typeof bkCronPorConc==='object'){
    Object.keys(bkCronPorConc).forEach(function(cid){
      try{ localStorage.setItem('pmal26_cfg_'+cid, JSON.stringify(bkCronPorConc[cid])); }catch(e){}
    });
  }
}
const _temConfigsPorConcurso = !!(bkEditalPorConc || bkLeisPorConc || bkCronPorConc);
let msg='';
_bkSalvarHist(modo==='substituir'?'Substituição':'Mesclagem');

if(modo==='substituir'){
// HOTFIX BACKUP — FASE 9.4.16
// Limpar TODAS as chaves do Protocolo 01 antes de restaurar.
// Isso garante que dados antigos não sobrevivam em chaves que o backup não cobre.
(function _limparChavesP01() {
  var prefixos = ['protocolo_', 'pmal26_', 'pmal_theme'];
  var keysToRemove = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (!k) continue;
    for (var j = 0; j < prefixos.length; j++) {
      if (k === prefixos[j] || k.startsWith(prefixos[j])) {
        keysToRemove.push(k);
        break;
      }
    }
  }
  // Não remover a chave de histórico de backup para manter o log
  // Não remover a flag da IIFE de restauração para evitar que re-popule dados hardcoded
  var histKey = typeof BACKUP_HIST_KEY !== 'undefined' ? BACKUP_HIST_KEY : 'pmal26_backup_hist';
  var iifeFlagKey = 'pmal26_backup_restaurado_20260529_0902';
  keysToRemove = keysToRemove.filter(function(k) { return k !== histKey && k !== iifeFlagKey; });
  keysToRemove.forEach(function(k) {
    try { localStorage.removeItem(k); } catch(e) {}
  });
  console.info('[P01 Backup] Substituir: ' + keysToRemove.length + ' chave(s) limpas do localStorage antes da restauração.');
})();

// Substitui TODO o ST pelo backup
Object.keys(ST).forEach(k=>delete ST[k]);
Object.assign(ST,bkD);
// Garante todas as chaves existam
if(!ST.cronograma) ST.cronograma={};
if(!ST.questoes) ST.questoes={};
if(!ST.questoesLog) ST.questoesLog={};
if(!ST.sessoes) ST.sessoes=[];
if(!ST.sessoesDiarias) ST.sessoesDiarias={};
if(!ST.revisaoEspacada) ST.revisaoEspacada={};
if(!ST.progresso) ST.progresso={};
if(!ST.leitura) ST.leitura={};
if(!ST.simulados) ST.simulados=[];
if(!ST.erros) ST.erros=[];
if(!ST.massificadas) ST.massificadas=[];
if(!ST.banco) ST.banco=[];
if(!ST.resumos) ST.resumos={};
if(!ST.flashDecks) ST.flashDecks=[];
// FASE 9.4.11: garantir campos da nova arquitetura
if(!ST.bancoProgressoPorConcurso) ST.bancoProgressoPorConcurso={};
if(!ST.bancoSessoesPorConcurso) ST.bancoSessoesPorConcurso={};
// HOTFIX backup zerado: normalizar estruturas globais do módulo Questões
if(!Array.isArray(ST.bancoSessoes)) ST.bancoSessoes=[];
if(!Array.isArray(ST.banco)) ST.banco=[];
if(!Array.isArray(ST.erros)) ST.erros=[];
// Normalizar campos globais de cada questão no banco
(ST.banco||[]).forEach(function(q){
  if(!q) return;
  if(!Array.isArray(q.historico)) q.historico=[];
  q.tentativas = Number(q.tentativas||0);
  q.acertos    = Number(q.acertos||0);
  q.erros      = Number(q.erros||0);
  q.errouAlgumVez      = !!q.errouAlgumVez;
  q.acertosConsecutivos = Number(q.acertosConsecutivos||0);
  q.massificada = !!q.massificada;
});
console.info('[P01 Backup] Normalização pós-substituição: bancoSessoes='+JSON.stringify(ST.bancoSessoes.length)+' sessões, banco='+ST.banco.length+' questões.');
// Restaura configs externas
// CORREÇÃO ARQUITETURAL: se o backup traz configs por concurso (formato novo),
// aplica TODAS nas chaves corretas por id. Caso contrário, mantém o comportamento
// legado de aplicar o config top-level apenas no concurso ativo atual.
if(_temConfigsPorConcurso){
  _aplicarConfigsPorConcurso();
  // O cronCfg do concurso ativo também atualiza o override em memória
  const _ativoId = _concGetAtivo();
  if(bkCronPorConc && _ativoId && bkCronPorConc[_ativoId]){
    window._CICLO_OVERRIDE = bkCronPorConc[_ativoId].ciclo || null;
  } else if(bkCronCfg){
    window._CICLO_OVERRIDE = bkCronCfg.ciclo || null;
  } else {
    window._CICLO_OVERRIDE = null;
  }
} else {
  if(bkEditalCfg) _editalCfgSave(bkEditalCfg);
  if(bkLeisCfg) try{localStorage.setItem(_leisCfgKey(),JSON.stringify(bkLeisCfg));}catch(e){}
  if(bkCronCfg){_cfgSave(bkCronCfg);window._CICLO_OVERRIDE=bkCronCfg.ciclo||null;}
  else{window._CICLO_OVERRIDE=null;}
}
// FASE 9.4.11: restaurar cronograma global e tema
const bkCronGlobal = bkMC.cronGlobal ?? null;
const bkTemaSalvo  = bkMC.temaSalvo  ?? null;
if(bkCronGlobal){
  try{localStorage.setItem('pmal26_cfg_global',JSON.stringify(bkCronGlobal));}catch(e){}
  // Atualizar _CICLO_OVERRIDE se o global tiver ciclo e não foi setado por concurso
  if(!window._CICLO_OVERRIDE && bkCronGlobal.ciclo) window._CICLO_OVERRIDE=bkCronGlobal.ciclo;
}
if(bkTemaSalvo){
  try{localStorage.setItem('pmal_theme',bkTemaSalvo);}catch(e){}
}
msg='✅ Substituição completa! Todos os dados foram restaurados do backup: simulados, questões, flash cards, cronograma, leitura das leis, estatísticas, sessões, progresso, resumos, edital e configurações.';

} else {
// ── MESCLAGEM: adiciona o que não existe, soma o que pode somar ──

// Simulados
if(!ST.simulados) ST.simulados=[];
const simIds=new Set(ST.simulados.map(s=>s.id));
(bkD.simulados||[]).forEach(s=>{if(!simIds.has(s.id)) ST.simulados.push(s);});

// Banco de questões
if(!ST.banco) ST.banco=[];
const bancoIds=new Set(ST.banco.map(q=>q.id));
(bkD.banco||[]).forEach(q=>{if(!bancoIds.has(q.id)) ST.banco.push(q);});

// Erros e massificadas (legado)
if(!ST.erros) ST.erros=[];
const erroIds=new Set(ST.erros.map(e=>e.id));
(bkD.erros||[]).forEach(e=>{if(!erroIds.has(e.id)) ST.erros.push(e);});
if(!ST.massificadas) ST.massificadas=[];
const massIds=new Set(ST.massificadas.map(e=>e.id));
(bkD.massificadas||[]).forEach(e=>{if(!massIds.has(e.id)) ST.massificadas.push(e);});

// Flash Cards — mescla decks e cards
if(!ST.flashDecks) ST.flashDecks=[];
(bkD.flashDecks||[]).forEach(bkDk=>{
const ex=ST.flashDecks.find(d=>d.id===bkDk.id);
if(!ex){ST.flashDecks.push(bkDk);}
else{
const ci=new Set((ex.cards||[]).map(c=>c.id));
(bkDk.cards||[]).forEach(c=>{if(!ci.has(c.id)) ex.cards.push(c);});
}
});

// Cronograma — une marcações (true prevalece)
if(!ST.cronograma) ST.cronograma={};
Object.entries(bkD.cronograma||{}).forEach(([k,v])=>{if(v) ST.cronograma[k]=true;});

// Leitura das leis — une artigos lidos
if(!ST.leitura) ST.leitura={};
Object.entries(bkD.leitura||{}).forEach(([k,v])=>{if(v) ST.leitura[k]=true;});

// Progresso (edital, tópicos) — usa o backup se não existir local
if(!ST.progresso) ST.progresso={};
Object.entries(bkD.progresso||{}).forEach(([k,v])=>{if(v&&!ST.progresso[k]) ST.progresso[k]=v;});

// Estatísticas de questões — soma totais e acertos
if(!ST.questoes) ST.questoes={};
Object.entries(bkD.questoes||{}).forEach(([k,v])=>{
if(!ST.questoes[k]) ST.questoes[k]={total:0,acertos:0};
ST.questoes[k].total+=(v.total||0);
ST.questoes[k].acertos+=(v.acertos||0);
});

// Log de questões
if(!ST.questoesLog) ST.questoesLog={};
Object.entries(bkD.questoesLog||{}).forEach(([k,v])=>{
if(!ST.questoesLog[k]) ST.questoesLog[k]=v;
});

// Resumos
if(!ST.resumos) ST.resumos={};
Object.entries(bkD.resumos||{}).forEach(([k,v])=>{
if(!ST.resumos[k]) ST.resumos[k]=v;
});

// Sessões — mescla por ID único
if(!ST.sessoes) ST.sessoes=[];
const sessIds=new Set(ST.sessoes.map(s=>s.id||(s.data+s.hora)));
(bkD.sessoes||[]).forEach(s=>{
const sid=s.id||(s.data+s.hora);
if(!sessIds.has(sid)) ST.sessoes.push(s);
});

// Sessões diárias — mescla blocos, tarefas, artigos e flashcards por dia
if(!ST.sessoesDiarias) ST.sessoesDiarias={};
Object.entries(bkD.sessoesDiarias||{}).forEach(([dataStr,sdBk])=>{
if(!ST.sessoesDiarias[dataStr]){
ST.sessoesDiarias[dataStr]=sdBk;
} else {
const sdAt=ST.sessoesDiarias[dataStr];
// Blocos de questões
const bkBlocoHoras=new Set((sdAt.questoes?.blocos||[]).map(b=>b.hora+b.titulo));
(sdBk.questoes?.blocos||[]).forEach(b=>{
if(!bkBlocoHoras.has(b.hora+b.titulo)){
if(!sdAt.questoes) sdAt.questoes={total:0,acertos:0,duracao:0,blocos:[]};
sdAt.questoes.blocos.push(b);
sdAt.questoes.total+=(b.total||0);
sdAt.questoes.acertos+=(b.acertos||0);
sdAt.questoes.duracao+=(b.duracao||0);
}
});
// Tarefas
const atTids=new Set((sdAt.tarefas?.itens||[]).map(i=>i.tid));
(sdBk.tarefas?.itens||[]).forEach(i=>{
if(!atTids.has(i.tid)){
if(!sdAt.tarefas) sdAt.tarefas={concluidas:0,itens:[]};
sdAt.tarefas.itens.push(i);
}
});
if(sdAt.tarefas) sdAt.tarefas.concluidas=sdAt.tarefas.itens.length;
// Artigos lidos no dia
const atArtKeys=new Set((sdAt.artigos?.itens||[]).map(i=>i.key));
(sdBk.artigos?.itens||[]).forEach(i=>{
if(!atArtKeys.has(i.key)){
if(!sdAt.artigos) sdAt.artigos={total:0,itens:[]};
sdAt.artigos.itens.push(i);
}
});
if(sdAt.artigos) sdAt.artigos.total=sdAt.artigos.itens.length;
// Flash cards do dia
sdAt.flashcards=sdAt.flashcards||{revisoes:0,acertos:0};
sdAt.flashcards.revisoes+=(sdBk.flashcards?.revisoes||0);
sdAt.flashcards.acertos+=(sdBk.flashcards?.acertos||0);
}
});

// Revisão espaçada — usa o nível mais avançado
if(!ST.revisaoEspacada) ST.revisaoEspacada={};
Object.entries(bkD.revisaoEspacada||{}).forEach(([k,v])=>{
if(!ST.revisaoEspacada[k]||v.nivel>ST.revisaoEspacada[k].nivel) ST.revisaoEspacada[k]=v;
});

// Configs externas — aplica sempre (o backup é a fonte de verdade)
// CORREÇÃO ARQUITETURAL: mesma lógica do bloco substituir — prefere configs por concurso.
if(_temConfigsPorConcurso){
  _aplicarConfigsPorConcurso();
  const _ativoId = _concGetAtivo();
  if(bkCronPorConc && _ativoId && bkCronPorConc[_ativoId]){
    window._CICLO_OVERRIDE = bkCronPorConc[_ativoId].ciclo || null;
  } else if(bkCronCfg){
    window._CICLO_OVERRIDE = bkCronCfg.ciclo || null;
  }
} else {
  if(bkEditalCfg) _editalCfgSave(bkEditalCfg);
  if(bkLeisCfg) try{localStorage.setItem(_leisCfgKey(),JSON.stringify(bkLeisCfg));}catch(e){}
  if(bkCronCfg){_cfgSave(bkCronCfg);window._CICLO_OVERRIDE=bkCronCfg.ciclo||null;}
}

// FASE 9.4.11: mesclar bancoProgressoPorConcurso por concurso
const bkProgPorConc = bkD.bancoProgressoPorConcurso || {};
if(!ST.bancoProgressoPorConcurso) ST.bancoProgressoPorConcurso = {};
Object.entries(bkProgPorConc).forEach(function([cid, progConc]){
  if(!ST.bancoProgressoPorConcurso[cid]) ST.bancoProgressoPorConcurso[cid] = {};
  Object.entries(progConc||{}).forEach(function([qid, prog]){
    // Só adicionar se não existe progresso local para aquela questão naquele concurso
    if(!ST.bancoProgressoPorConcurso[cid][qid]) ST.bancoProgressoPorConcurso[cid][qid] = prog;
  });
});

// FASE 9.4.11: mesclar bancoSessoesPorConcurso por concurso
const bkSessPorConc = bkD.bancoSessoesPorConcurso || {};
if(!ST.bancoSessoesPorConcurso) ST.bancoSessoesPorConcurso = {};
Object.entries(bkSessPorConc).forEach(function([cid, sessConc]){
  if(!Array.isArray(ST.bancoSessoesPorConcurso[cid])) ST.bancoSessoesPorConcurso[cid] = [];
  const existKeys = new Set(ST.bancoSessoesPorConcurso[cid].map(function(s){return s._key||s.id;}));
  (sessConc||[]).forEach(function(s){
    const k = s._key||s.id;
    if(!existKeys.has(k)) ST.bancoSessoesPorConcurso[cid].push(s);
  });
});

// FASE 9.4.11: cronograma global — mesclar marcações se existir no backup
const bkCronGlobal2 = bkMC.cronGlobal ?? null;
if(bkCronGlobal2){
  try{
    const localCronGlobal = JSON.parse(localStorage.getItem('pmal26_cfg_global')||'null');
    // Se não há cronograma global local, restaurar do backup
    if(!localCronGlobal) localStorage.setItem('pmal26_cfg_global',JSON.stringify(bkCronGlobal2));
    // Se há local, mesclar apenas marcações (cronograma já é global)
    else if(localCronGlobal && bkCronGlobal2.ciclo && !localCronGlobal.ciclo){
      localCronGlobal.ciclo = bkCronGlobal2.ciclo;
      localStorage.setItem('pmal26_cfg_global',JSON.stringify(localCronGlobal));
    }
  }catch(e){}
}

msg='✅ Mesclagem completa! Novos itens adicionados e estatísticas somadas. Duplicados foram preservados.';
}

// ── Restaura dados multi-concurso se presentes no backup ──
const bkMulti=_bkDados.multiConcurso??null;
if(bkMulti){
  if(modo==='substituir'){
    // Substitui toda a estrutura de concursos
    _concSaveMeta(bkMulti.meta||[]);
    _concSetAtivo(bkMulti.ativo||'');
    Object.entries(bkMulti.dados||{}).forEach(([id,dados])=>{
      _concSaveData(id,dados);
    });
    _sharedSave(bkMulti.shared||{});
    msg+=' Concursos restaurados: '+(bkMulti.meta||[]).map(c=>c.nome).join(', ')+'.';
  } else {
    // Mesclagem: adiciona concursos que não existem localmente
    const metaAtual=_concGetMeta();
    const idsAtuais=new Set(metaAtual.map(c=>c.id));
    let adicionados=0;
    (bkMulti.meta||[]).forEach(c=>{
      if(!idsAtuais.has(c.id)){
        metaAtual.push(c);
        // Restaura dados desse concurso
        const dadosConc=bkMulti.dados?.[c.id]||{};
        _concSaveData(c.id,dadosConc);
        adicionados++;
      }
    });
    if(adicionados>0){
      _concSaveMeta(metaAtual);
      msg+=' '+adicionados+' concurso(s) adicionado(s) do backup.';
    }
    // Mescla shared (banco, simulados, etc. já foram mesclados acima via ST)
    // Atualiza o shared salvo para refletir o ST mesclado
    const sharedAtualizado={};
    SHARED_FIELDS.forEach(f=>{sharedAtualizado[f]=ST[f];});
    _sharedSave(sharedAtualizado);
  }
  // Atualiza dados do concurso ativo com o ST atual
  const idAtivo=_concGetAtivo();
  if(idAtivo){
    const dadosAtivo={};
    CONC_FIELDS.forEach(f=>{dadosAtivo[f]=ST[f];});
    _concSaveData(idAtivo,dadosAtivo);
  }
}
// Antes de reconstruir: persiste ST e cfg nas chaves por concurso
try{
  const _aId=_concGetAtivo();
  if(_aId && typeof CONC_FIELDS!=='undefined'){
    const _cd={};
    CONC_FIELDS.forEach(f=>{if(ST[f]!==undefined)_cd[f]=ST[f];});
    localStorage.setItem('protocolo_conc_data_'+_aId, JSON.stringify(_cd));
    const _sh={};
    SHARED_FIELDS.forEach(f=>{if(ST[f]!==undefined)_sh[f]=ST[f];});
    localStorage.setItem('protocolo_shared', JSON.stringify(_sh));
    // Copia cfg (ciclo do cronograma) para chave per-concurso se vier do backup legado
    const _legCfg=localStorage.getItem('pmal26_cfg');
    if(_legCfg && !localStorage.getItem('pmal26_cfg_'+_aId)){
      localStorage.setItem('pmal26_cfg_'+_aId, _legCfg);
    }
    localStorage.setItem('pmal26_v4', JSON.stringify(ST));
  }
}catch(e){}
saveState();
_reconstruirUI();
// Atualiza botão do sidebar
const metaFinal=_concGetMeta();
const ativoFinal=_concGetAtivo();
const concAtualFinal=metaFinal.find(c=>c.id===ativoFinal);
if(concAtualFinal) concAtualizarBotao(concAtualFinal);
const el=document.getElementById('bk-sucesso-msg');
if(el) el.textContent=msg;
bkImpStep(4);
_backupToast('✅ Backup aplicado com sucesso!','var(--green)');
}
function _bkSalvarHist(tipo){
let hist=[];
try{hist=JSON.parse(localStorage.getItem(BACKUP_HIST_KEY)||'[]');}catch(e){}
hist.unshift({tipo, data:new Date().toLocaleDateString('pt-BR'), hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}), snapshot:JSON.stringify(ST)});
hist=hist.slice(0,5);
try{localStorage.setItem(BACKUP_HIST_KEY,JSON.stringify(hist));}catch(e){}
}
function _backupSalvarHist(tipo){ _bkSalvarHist(tipo); }
function backupRenderHistorico(){ bkRenderHistorico(); }
function bkRenderHistorico(){
let hist=[];
try{hist=JSON.parse(localStorage.getItem(BACKUP_HIST_KEY)||'[]');}catch(e){}
const list=document.getElementById('bk-hist-list'); if(!list) return;
if(!hist.length){
list.innerHTML='<div style="font-size:.75rem;color:var(--dim);font-style:italic;text-align:center;padding:2rem">Nenhum backup importado ainda.</div>';
return;
}
list.innerHTML='';
hist.forEach((h,i)=>{
const snap=h.snapshot?JSON.parse(h.snapshot):null;
const resumo=snap?`${(snap.simulados||[]).length} simulados · ${(snap.banco||[]).length} questões · ${(snap.flashDecks||[]).reduce((a,d)=>a+(d.cards||[]).length,0)} cards`:'';
const div=document.createElement('div');
div.style.cssText='background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.65rem .85rem;margin-bottom:.5rem';
div.innerHTML=`
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem;flex-wrap:wrap;gap:6px">
<div>
<span style="font-family:'Oswald',sans-serif;font-size:.75rem;font-weight:700;color:var(--gold)">${h.tipo}</span>
<span style="font-size:.62rem;color:var(--muted);margin-left:6px">${h.data} ${h.hora}</span>
</div>
<button onclick="bkRestaurar(${i})" style="background:rgba(245,200,0,.1);border:1px solid rgba(245,200,0,.25);color:var(--gold);border-radius:6px;padding:2px 10px;font-size:.65rem;font-family:'Oswald',sans-serif;font-weight:700;cursor:pointer">↺ Restaurar</button>
</div>
${resumo?`<div style="font-size:.65rem;color:var(--muted)">${resumo}</div>`:''}`;
list.appendChild(div);
});
}
function bkRestaurar(idx){
let hist=[];
try{hist=JSON.parse(localStorage.getItem(BACKUP_HIST_KEY)||'[]');}catch(e){}
const h=hist[idx]; if(!h) return;
abrirConfirmModal(
'Restaurar snapshot?',
`Restaurar estado de ${h.data} ${h.hora}. Dados atuais serão substituídos.`,
()=>{
try{
const snap=JSON.parse(h.snapshot);
Object.keys(ST).forEach(k=>delete ST[k]);
Object.assign(ST,snap);
saveState();
bkRenderHistorico();
_reconstruirUI();
_backupToast('↺ Estado restaurado!','var(--gold)');
}catch(e){alert('Erro ao restaurar: '+e.message);}
},'↺');
}
function backupAbrirModal(){goTab('backup');}
function backupFecharModal(){}
function backupStep(){}
function backupModoChange(){bkModoChange();}
function backupLerArquivo(input){bkLerArquivo(input);}
function backupAplicar(){bkAvancar();}
function backupRestaurarHist(i){bkRestaurar(i);}
function _backupToast(msg,cor){
const t=document.createElement('div');
t.textContent=msg;
t.style.cssText=`position:fixed;bottom:1.2rem;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.88);border:1px solid ${cor};color:${cor};font-family:'Oswald',sans-serif;font-size:.72rem;font-weight:700;padding:.45rem 1.2rem;border-radius:99px;z-index:9999;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.5);white-space:nowrap`;
document.body.appendChild(t);
setTimeout(()=>t.remove(),3000);
}
// ══════════════════════════════════════════════════════════════════
//  SISTEMA MULTI-CONCURSO
//  Campos EXCLUSIVOS por concurso (isolados no localStorage):
//    cronograma, questoes, questoesLog, sessoes, sessoesDiarias,
//    revisaoEspacada, progresso, leitura, resumos
//  Campos COMPARTILHADOS (um único banco para todos):
//    banco, simulados, erros, massificadas, flashDecks
// ══════════════════════════════════════════════════════════════════

// Chaves do localStorage
var CONC_META_KEY   = 'protocolo_concursos_meta';    // lista de concursos cadastrados
var CONC_ATIVO_KEY  = 'protocolo_concurso_ativo';    // id do concurso ativo
var CONC_DATA_PFX   = 'protocolo_conc_data_';        // + id → dados exclusivos
var SHARED_KEY      = 'protocolo_shared';             // dados compartilhados

// Campos que pertencem a cada concurso individualmente
var CONC_FIELDS = ['questoes','questoesLog','sessoes','sessoesDiarias',
                     'revisaoEspacada','progresso','leitura','resumos'];
// Campos compartilhados entre todos os concursos
var SHARED_FIELDS = ['banco','simulados','erros','massificadas','flashDecks','bancoSessoes','cronograma','bancoProgressoPorConcurso','bancoSessoesPorConcurso'];

// ── Helpers de leitura/escrita ──────────────────────────────────
function _concGetMeta(){
  try{return JSON.parse(localStorage.getItem(CONC_META_KEY)||'[]');}catch(e){return[];}
}
function _concSaveMeta(list){
  try{localStorage.setItem(CONC_META_KEY,JSON.stringify(list));}catch(e){}
}
function _concGetAtivo(){
  return localStorage.getItem(CONC_ATIVO_KEY)||null;
}
function _concSetAtivo(id){
  localStorage.setItem(CONC_ATIVO_KEY, id);
}
function _concLoadData(id){
  try{return JSON.parse(localStorage.getItem(CONC_DATA_PFX+id)||'{}');}catch(e){return{};}
}
function _concSaveData(id, obj){
  try{localStorage.setItem(CONC_DATA_PFX+id, JSON.stringify(obj));}catch(e){}
}
function _sharedLoad(){
  try{return JSON.parse(localStorage.getItem(SHARED_KEY)||'{}');}catch(e){return{};}
}
function _sharedSave(obj){
  try{localStorage.setItem(SHARED_KEY, JSON.stringify(obj));}catch(e){}
}

// ── Inicialização ────────────────────────────────────────────────
// Roda UMA VEZ ao carregar: migra dados legados (pmal26_v4) para o
// novo sistema se ainda não foram migrados.
function concInicializar(){
  // Primeiro uso: popula localStorage com BASE_DATA
  if(typeof _inicializarBaseData === 'function') _inicializarBaseData();

  let meta = _concGetMeta();
  let ativo = _concGetAtivo();

  // RECUPERAÇÃO AUTOMÁTICA: detecta concursos órfãos no localStorage
  // (concursos que têm dados mas não estão no meta — ex: perdidos por import incorreto)
  try{
    const keysToScan = Object.keys(localStorage);
    const concDataKeys = keysToScan.filter(k=>k.startsWith('protocolo_conc_data_'));
    const metaIds = new Set(meta.map(c=>c.id));
    concDataKeys.forEach(function(key){
      const orphanId = key.replace('protocolo_conc_data_','');
      if(!metaIds.has(orphanId)){
        try{
          const orphanData = JSON.parse(localStorage.getItem(key)||'{}');
          // Só recupera se tiver dados reais (evita recuperar concursos vazios)
          const hasData = Object.values(orphanData).some(function(v){
            return (Array.isArray(v)&&v.length>0)||(v&&typeof v==='object'&&Object.keys(v).length>0);
          });
          if(hasData){
            // Adiciona ao meta com nome genérico — o usuário pode editar depois
            const recovered = {
              id: orphanId,
              nome: 'Concurso Recuperado',
              cargo: '',
              banca: '',
              dataProva: '',
              dataInicio: '',
              criadoEm: new Date().toISOString(),
              _recovered: true
            };
            meta.push(recovered);
            metaIds.add(orphanId);
            console.warn('[PROTOCOLO] Concurso órfão recuperado:', orphanId);
          }
        }catch(e){}
      }
    });
    if(meta.some(function(c){return c._recovered;})){
      _concSaveMeta(meta);
    }
  }catch(e){}

  // Se já tem concursos cadastrados:
  if(meta.length > 0 && ativo) {
    // CRÍTICO: salva IMEDIATAMENTE o ST atual (carregado pelo loadState)
    // nas chaves por concurso ANTES de concCarregarAtivo ler essas chaves.
    // Isso garante que o concurso ativo sempre encontrará seus dados.
    try{
      const _cd={};
      CONC_FIELDS.forEach(f=>{if(ST[f]!==undefined)_cd[f]=ST[f];});
      if(Object.keys(_cd).some(f=>Object.keys(_cd[f]||{}).length>0||(_cd[f]||[]).length>0)){
        // Só persiste se o ST tem dados reais (evita sobrescrever com zeros)
        localStorage.setItem('protocolo_conc_data_'+ativo, JSON.stringify(_cd));
      }
      const _sh={};
      SHARED_FIELDS.forEach(f=>{if(ST[f]!==undefined)_sh[f]=ST[f];});
      if(Object.keys(_sh).some(f=>(_sh[f]||[]).length>0)){
        localStorage.setItem('protocolo_shared', JSON.stringify(_sh));
      }
    }catch(e){}
    // Agora concCarregarAtivo vai encontrar os dados e não sobrescrever
    concCarregarAtivo(ativo);
    return;
  }

  // MIGRAÇÃO: lê o ST atual (já carregado do loadState legado)
  // e cria o primeiro concurso com esses dados
  const primeiroId = 'conc_' + Date.now();
  const primeiroConcurso = {
    id: primeiroId,
    nome: 'PMAL 2026',
    cargo: 'Soldado',
    banca: 'CEBRASPE',
    dataProva: '2026-07-19',
    dataInicio: '2026-04-12',
    criadoEm: new Date().toISOString()
  };

  // Salva dados exclusivos desse concurso
  const dadosExclusivos = {};
  CONC_FIELDS.forEach(f => { dadosExclusivos[f] = ST[f] || (Array.isArray(ST[f])?[]:{}); });
  _concSaveData(primeiroId, dadosExclusivos);

  // Salva dados compartilhados
  const dadosShared = {};
  SHARED_FIELDS.forEach(f => { dadosShared[f] = ST[f] || (f==='banco'||f==='simulados'||f==='erros'||f==='massificadas'||f==='flashDecks'?[]:{}); });
  _sharedSave(dadosShared);

  // Migra cfg/edital/leis compartilhados para chaves do primeiro concurso
  try{
    const legCfg=localStorage.getItem('pmal26_cfg');
    if(legCfg){
      // Só copia se a chave per-concurso ainda não existir
      if(!localStorage.getItem('pmal26_cfg_'+primeiroId)){
        localStorage.setItem('pmal26_cfg_'+primeiroId, legCfg);
      }
    }
    const legEdital=localStorage.getItem(EDITAL_CFG_KEY);
    if(legEdital && !localStorage.getItem(EDITAL_CFG_KEY+'_'+primeiroId))
      localStorage.setItem(EDITAL_CFG_KEY+'_'+primeiroId, legEdital);
    const legLeis=localStorage.getItem(LEIS_CFG_KEY);
    if(legLeis && !localStorage.getItem(LEIS_CFG_KEY+'_'+primeiroId))
      localStorage.setItem(LEIS_CFG_KEY+'_'+primeiroId, legLeis);
  }catch(e){}

  meta = [primeiroConcurso];
  _concSaveMeta(meta);
  _concSetAtivo(primeiroId);

  concAtualizarBotao(primeiroConcurso);
}

// ── Carregar concurso ativo no ST ────────────────────────────────
function concCarregarAtivo(id){
  const meta = _concGetMeta();
  const conc = meta.find(c=>c.id===id);
  if(!conc) return;

  // Aplica preset se o concurso ainda não tiver edital/leis

  // Lê dados exclusivos do concurso
  const dados = _concLoadData(id);
  // Só sobrescreve ST se o concurso tiver dados reais salvos
  const _dadosVazio = Object.keys(dados).length === 0;
  if(!_dadosVazio){
    CONC_FIELDS.forEach(f => {
      ST[f] = dados[f] !== undefined ? dados[f] : (f==='sessoes'||f==='massificadas'?[]:{});
    });
  } else {
    // Concurso sem dados: persiste o ST atual para inicializar
    const _cd={};
    CONC_FIELDS.forEach(f=>{_cd[f]=ST[f]||(f==='sessoes'?[]:{}); });
    _concSaveData(id, _cd);
  }

  // Lê dados compartilhados
  const shared = _sharedLoad();
  const _sharedVazio = Object.keys(shared).length === 0;
  if(!_sharedVazio){
    SHARED_FIELDS.forEach(f => {
      ST[f] = shared[f] !== undefined ? shared[f] : (f==='banco'||f==='simulados'||f==='erros'||f==='massificadas'||f==='flashDecks'?[]:{});
    });
  } else {
    const _sh={};
    SHARED_FIELDS.forEach(f=>{_sh[f]=ST[f]||(f==='banco'||f==='simulados'||f==='erros'||f==='massificadas'||f==='flashDecks'?[]:{});});
    _sharedSave(_sh);
  }

  _concSetAtivo(id);
  concAtualizarBotao(conc);

  // Limpa overrides de memória para forçar releitura do cfg do novo concurso
  window._CICLO_OVERRIDE   = null;
  window._CRON_START_OVERRIDE = null;
  window._CRON_END_OVERRIDE   = null;
  window._PROVA_OVERRIDE      = null;
  window._CONCURSO_OVERRIDE   = null;
  window._CARGO_OVERRIDE      = null;
  window._START_OVERRIDE      = null;

  // Nome e cargo: SEMPRE do meta do concurso ativo
  window._CONCURSO_OVERRIDE = conc.nome || '';
  window._CARGO_OVERRIDE    = conc.cargo || '';

  // Datas: meta do concurso é a fonte de verdade para o countdown
  // FASE 9.4.12.3: usar _parseDateLocal para evitar bug de fuso UTC → dia anterior
  if(conc.dataProva){
    var _pdParts = String(conc.dataProva).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(_pdParts) window._PROVA_OVERRIDE = new Date(+_pdParts[1], +_pdParts[2]-1, +_pdParts[3], 8, 0, 0);
    else window._PROVA_OVERRIDE = new Date(conc.dataProva+'T08:00:00');
  }
  if(conc.dataInicio){
    var _piParts = String(conc.dataInicio).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(_piParts) window._START_OVERRIDE = new Date(+_piParts[1], +_piParts[2]-1, +_piParts[3], 0, 0, 0);
    else window._START_OVERRIDE = new Date(conc.dataInicio+'T00:00:00');
  }
  // Aplica cfg do cronograma (ciclo, objetivos, datas)
  // FASE 9.4.3: _cfgLoad() agora lê a chave GLOBAL (pmal26_cfg_global) — não depende do concurso ativo
  const _cfg = _cfgLoad();
  if(_cfg){
    // CICLO: sempre prioriza o salvo, nunca usa o hardcoded quando há cfg
    if(_cfg.ciclo) window._CICLO_OVERRIDE = _cfg.ciclo;
    if(typeof _cfgAplicarDatas==='function')
      _cfgAplicarDatas(conc.dataInicio||_cfg.inicio||'', conc.dataProva||_cfg.prova||'');
    if(typeof _cfgAplicarConcurso==='function')
      _cfgAplicarConcurso(conc.nome, conc.cargo||'');
  } else {
    // Sem cfg salvo: reseta override para usar CICLO hardcoded do HTML
    // (correto para concurso novo/zerado)
    window._CICLO_OVERRIDE = null;
  }
  // Chama _reaplicarCfgConcurso para garantir consistência
  if(typeof _reaplicarCfgConcurso==='function') _reaplicarCfgConcurso();
  // Carrega datasets do concurso ativo no ContestManager (_CM)
  // Isso garante que QUESTOES_MATERIAS, buildEdital, buildLeitura
  // sempre usem os dados corretos do concurso ativo
  try{
    // 1. Garante que GMA tem seus dados no localStorage (nunca toca em globais)
    if(typeof _injetarDadosPMAL==='function') _injetarDadosPMAL();
    _injetarDadosGMA();
    // 2. _CM carrega edital+leis do concurso ativo e sincroniza globais
    if(typeof _CM !== 'undefined') _CM.load(id);
  }catch(e){
    // Fallback: atualiza globais diretamente
    try{
      const _edCfg = _editalCfgLoad();
      if(_edCfg && _edCfg.edital && _edCfg.edital.length){
        EDITAL.length=0; _edCfg.edital.forEach(d=>EDITAL.push(d));
      }
      const _leiCfg = _leisCfgLoad();
      if(_leiCfg && _leiCfg.leis && _leiCfg.leis.length){
        LEIS_LEITURA.length=0; _leiCfg.leis.forEach(l=>LEIS_LEITURA.push(l));
      }
    }catch(e2){}
  }
  if(typeof updateCountdown==='function') updateCountdown();
}

// ── Salvar concurso atual antes de trocar ────────────────────────
function concSalvarAtual(){
  // Força salvar imediatamente
  if(typeof _doSave==='function') _doSave();

  const id = _concGetAtivo();
  if(!id) return;

  // Salva dados exclusivos do ST
  const dados = {};
  CONC_FIELDS.forEach(f => { dados[f] = ST[f]; });
  _concSaveData(id, dados);

  // Salva dados compartilhados
  const shared = {};
  SHARED_FIELDS.forEach(f => { shared[f] = ST[f]; });
  _sharedSave(shared);
  // Persiste cfg/edital/leis do concurso atual explicitamente
  // (já são salvos por _cfgSave etc, mas garantimos aqui)
  // Apenas verifica se as chaves por concurso já existem, não sobrescreve
}

// ── Trocar de concurso ───────────────────────────────────────────
function concTrocar(novoId){
  if(novoId === _concGetAtivo()){
    concFecharModal();
    return;
  }

  // 1. Salva tudo do concurso atual (ST + datasets específicos)
  concSalvarAtual();
  if(typeof _CM !== 'undefined') _CM.save(_concGetAtivo());

  // 2. Carrega o novo (ST + datasets específicos via _CM)
  concCarregarAtivo(novoId);

  // 3. Fecha modal e recarrega a aba ativa
  concFecharModal();

  // Recarrega toda a UI com dados do novo concurso
  if(typeof _reconstruirUI==='function'){
    _reconstruirUI();
  } else {
    const abaAtiva = document.querySelector('.section.active');
    if(abaAtiva){
      const aid = abaAtiva.id.replace('tab-','');
      if(typeof goTab==='function') goTab(aid);
    } else {
      if(typeof renderDashboard==='function') renderDashboard(true);
    }
  }

  // Feedback
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:rgba(245,200,0,.15);border:1px solid rgba(245,200,0,.4);color:var(--gold);padding:.55rem 1.2rem;border-radius:10px;font-family:Oswald,sans-serif;font-size:.78rem;font-weight:700;z-index:9999;pointer-events:none';
  const meta=_concGetMeta();
  const c=meta.find(x=>x.id===novoId);
  t.textContent='✅ Concurso alterado: '+(c?c.nome:'');
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2500);
}

// ── UI: botão no sidebar ─────────────────────────────────────────
function concAtualizarBotao(conc){
  const el = document.getElementById('conc-btn-label');
  if(el) el.textContent = conc ? (conc.nome + (conc.cargo?' · '+conc.cargo:'')) : 'Selecionar Concurso';
}

// ── UI: abrir modal lista ─────────────────────────────────────────
function concAbrirModal(){
  const overlay = document.getElementById('conc-modal-overlay');
  if(overlay) overlay.classList.add('open');
  concRenderLista();
}
function concFecharModal(){
  const overlay = document.getElementById('conc-modal-overlay');
  if(overlay) overlay.classList.remove('open');
}

function concRenderLista(){
  const body = document.getElementById('conc-modal-body');
  if(!body) return;
  const meta = _concGetMeta();
  const ativo = _concGetAtivo();
  body.innerHTML = '';

  meta.forEach(c => {
    const card = document.createElement('div');
    card.className = 'conc-card' + (c.id===ativo?' active-conc':'');
    const dataStr = c.dataProva ? (function(s){var m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3]).toLocaleDateString('pt-BR'):new Date(s+'T12:00').toLocaleDateString('pt-BR');})(c.dataProva) : '';
    card.innerHTML = `
      <span class="conc-edit-badge" onclick="event.stopPropagation();concAbrirEdit('${c.id}')">✏ Editar</span>
      ${c.id===ativo?'<span class="conc-card-badge">✓ Ativo</span>':''}
      <div class="conc-card-name">${c.nome}</div>
      <div class="conc-card-cargo">${[c.cargo,c.banca,dataStr?'Prova: '+dataStr:''].filter(Boolean).join(' · ')}</div>
    `;
    card.addEventListener('click', ()=>concTrocar(c.id));
    body.appendChild(card);
  });

  // Botão adicionar
  const addBtn = document.createElement('button');
  addBtn.className = 'conc-add-btn';
  addBtn.textContent = '+ Adicionar novo concurso';
  addBtn.onclick = ()=>concAbrirEdit(null);
  body.appendChild(addBtn);
}

// ── UI: modal criar/editar ────────────────────────────────────────
let _editingConcId = null;
function concAbrirEdit(id){
  _editingConcId = id;
  const overlay = document.getElementById('conc-edit-overlay');
  if(!overlay) return;
  overlay.classList.add('open');

  const isNew = !id;
  document.getElementById('conc-edit-title').textContent = isNew ? '➕ Novo Concurso' : '✏️ Editar Concurso';
  document.getElementById('cedit-del-btn').style.display = isNew ? 'none' : 'inline-block';
  document.getElementById('cedit-warn-del').style.display = 'none';

  if(isNew){
    ['cedit-nome','cedit-cargo','cedit-banca','cedit-dataprova','cedit-datainicio'].forEach(i=>{
      const el=document.getElementById(i); if(el) el.value='';
    });
    // Preenche data de início com hoje
    const ini = document.getElementById('cedit-datainicio');
    if(ini) ini.value = new Date().toISOString().slice(0,10);
  } else {
    const meta = _concGetMeta();
    const c = meta.find(x=>x.id===id);
    if(!c) return;
    document.getElementById('cedit-nome').value = c.nome||'';
    document.getElementById('cedit-cargo').value = c.cargo||'';
    document.getElementById('cedit-banca').value = c.banca||'';
    document.getElementById('cedit-dataprova').value = c.dataProva||'';
    document.getElementById('cedit-datainicio').value = c.dataInicio||'';
  }
}
function concFecharEdit(){
  const overlay = document.getElementById('conc-edit-overlay');
  if(overlay) overlay.classList.remove('open');
  _editingConcId = null;
}
function concSalvarEdit(){
  const nome = (document.getElementById('cedit-nome').value||'').trim();
  if(!nome){alert('Digite o nome do concurso.');return;}
  const cargo = (document.getElementById('cedit-cargo').value||'').trim();
  const banca = (document.getElementById('cedit-banca').value||'').trim();
  const dataProva = document.getElementById('cedit-dataprova').value||'';
  const dataInicio = document.getElementById('cedit-datainicio').value||'';

  let meta = _concGetMeta();
  if(_editingConcId){
    // Editar existente
    const idx = meta.findIndex(c=>c.id===_editingConcId);
    if(idx!==-1){
      meta[idx] = {...meta[idx], nome, cargo, banca, dataProva, dataInicio};
      _concSaveMeta(meta);
      // Se é o ativo, atualiza botão e countdown
      if(_editingConcId === _concGetAtivo()){
        concAtualizarBotao(meta[idx]);
        window._CONCURSO_OVERRIDE = nome;
        window._CARGO_OVERRIDE = cargo;
        // FASE 9.4.12.3: parser local para evitar bug de fuso
        if(dataProva){
          var _spParts = String(dataProva).match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if(_spParts) window._PROVA_OVERRIDE = new Date(+_spParts[1], +_spParts[2]-1, +_spParts[3], 8, 0, 0);
          else window._PROVA_OVERRIDE = new Date(dataProva+'T08:00:00');
        }
        if(dataInicio){
          var _siParts = String(dataInicio).match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if(_siParts) window._START_OVERRIDE = new Date(+_siParts[1], +_siParts[2]-1, +_siParts[3], 0, 0, 0);
          else window._START_OVERRIDE = new Date(dataInicio+'T00:00:00');
        }
        if(typeof updateCountdown==='function') updateCountdown();
      }
    }
  } else {
    // Novo concurso
    const novoId = 'conc_'+Date.now();
    const novo = {id:novoId, nome, cargo, banca, dataProva, dataInicio, criadoEm:new Date().toISOString()};
    // Inicializa com dados vazios
    const dadosVazios = {};
    CONC_FIELDS.forEach(f=>{ dadosVazios[f]=(f==='sessoes'?[]:{}); });
    _concSaveData(novoId, dadosVazios);
    // CORREÇÃO ARQUITETURAL: inicializa edital/leis/cron VAZIOS para o novo concurso.
    // Sem isto, ao trocar para o novo concurso o sistema cairia em fallback global
    // e exibiria dados de outro concurso. Garantir isolamento total desde a criação.
    try{
      localStorage.setItem('pmal26_edital_cfg_'+novoId, JSON.stringify({edital:[]}));
      localStorage.setItem('pmal26_leis_cfg_'+novoId,   JSON.stringify({leis:[]}));
    }catch(e){}
    meta.push(novo);
    _concSaveMeta(meta);
  }
  concFecharEdit();
  concRenderLista();
}
function concDeletar(){
  const warn = document.getElementById('cedit-warn-del');
  if(!warn) return;
  if(warn.style.display==='none'){
    warn.style.display='block';
    document.getElementById('cedit-del-btn').textContent='🗑 Confirmar exclusão';
    return;
  }
  // Confirmado: deleta
  const id = _editingConcId;
  if(!id) return;
  if(id === _concGetAtivo()){alert('Não é possível excluir o concurso ativo. Troque primeiro.');return;}
  let meta = _concGetMeta();
  meta = meta.filter(c=>c.id!==id);
  _concSaveMeta(meta);
  localStorage.removeItem(CONC_DATA_PFX+id);
  concFecharEdit();
  concRenderLista();
}

// _doSave já inclui lógica multi-concurso diretamente

// ── Patch no updateCountdown para usar datas do concurso ─────────
const _updateCountdown_orig = typeof updateCountdown==='function'?updateCountdown:null;
// A função já usa window._PROVA_DATE_OVERRIDE via _getProvaDate se definida
// Apenas garantimos que _getProvaDate retorne o override quando existir
// _getProvaDate já existe no sistema e usa window._PROVA_OVERRIDE

// ── Bootstrap: roda ao final do carregamento ─────────────────────
document.addEventListener('DOMContentLoaded', ()=>{
  concInicializar();
});
// Fallback se DOMContentLoaded já passou
if(document.readyState!=='loading') concInicializar();

// Garante que _CM está carregado e presets injetados após inicialização
document.addEventListener('DOMContentLoaded', function(){
  try{
    if(typeof _injetarDadosPMAL==='function') _injetarDadosPMAL();
    if(typeof _injetarDadosGMA==='function')  _injetarDadosGMA();
    var _aId = typeof _concGetAtivo==='function' ? _concGetAtivo() : null;
    if(_aId && typeof _CM !== 'undefined') _CM.load(_aId);
    // Re-aplica cfg com a chave per-concurso correta (ciclo, datas, etc.)
    if(typeof _reaplicarCfgConcurso==='function') _reaplicarCfgConcurso();
    // Re-renderiza o Dashboard com os dados corretos após hidratação completa
    // Isso garante que LEIS_LEITURA, ST.leitura, ST.progresso etc. estejam
    // todos sincronizados antes do primeiro render real da Visão Geral
    requestAnimationFrame(function(){
      try{
        if(typeof buildLeitura==='function') buildLeitura(true);
        if(typeof renderLeituraGeral==='function') renderLeituraGeral(true);
        if(typeof renderProgessoStats==='function') renderProgessoStats(true);
        if(typeof renderDashboard==='function') renderDashboard(true);
        if(typeof updateCountdown==='function') updateCountdown();
      }catch(e){}
    });
  }catch(e){}
}, {once:true});


// ══════════════════════════════════════════════
//  SIMULADO DE PAPEL
// ══════════════════════════════════════════════
function spInit(){
  const dataEl=document.getElementById('sp-data');
  if(dataEl&&!dataEl.value) dataEl.value=new Date().toISOString().slice(0,10);
  const list=document.getElementById('sp-materias-list');
  if(list&&!list.children.length) spAddMateria();
}
function spTogglePlataforma(sel){
  const outro=document.getElementById('sp-plataforma-outro');
  if(!outro) return;
  outro.style.display=sel.value==='__outro__'?'block':'none';
  if(sel.value!=='__outro__') outro.value='';
}
function spToggleFormula(){
  const f=document.getElementById('sp-formula').value;
  const p=document.getElementById('sp-pontuacao');
  if(p) p.style.display=f==='manual'?'inline-block':'none';
}
function spAddMateria(){
  const list=document.getElementById('sp-materias-list');
  if(!list) return;
  const row=document.createElement('div');
  row.className='sp-mat-row';
  row.style.cssText='display:grid;grid-template-columns:1fr 58px 58px 58px 58px 24px;gap:5px;margin-bottom:4px;align-items:center';
  const mats=(window.QUESTOES_MATERIAS||[]).map(m=>`<option value="${m.name}">${m.name}</option>`).join('');
  row.innerHTML=`
    <select class="sim-select sp-mat-sel" style="font-size:.75rem;padding:.28rem .4rem" onchange="spHandleMat(this);spCalcGeral()">
      <option value="">— Matéria —</option>${mats}<option value="__outro__">Outra...</option>
    </select>
    <input class="sim-input sp-mat-total" type="number" min="0" placeholder="0" style="text-align:center;padding:.28rem .25rem;font-size:.78rem" oninput="spAutoErro(this);spCalcGeral()">
    <input class="sim-input sp-mat-acertos" type="number" min="0" placeholder="0" style="text-align:center;padding:.28rem .25rem;font-size:.78rem;color:var(--green)" oninput="spAutoErro(this);spCalcGeral()">
    <input class="sim-input sp-mat-erros" type="number" min="0" placeholder="0" style="text-align:center;padding:.28rem .25rem;font-size:.78rem;color:var(--red)" oninput="spCalcGeral()">
    <input class="sim-input sp-mat-branco" type="number" min="0" placeholder="0" style="text-align:center;padding:.28rem .25rem;font-size:.78rem;color:var(--muted)" oninput="spCalcGeral()">
    <button onclick="this.closest('.sp-mat-row').remove();spCalcGeral()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.9rem;padding:0">✕</button>`;
  list.appendChild(row);
}
function spHandleMat(sel){
  if(sel.value==='__outro__'){
    const nome=prompt('Nome da matéria:');
    if(nome){
      const opt=document.createElement('option');
      opt.value=nome;opt.textContent=nome;opt.selected=true;
      sel.insertBefore(opt,sel.querySelector('[value="__outro__"]'));
      sel.value=nome;
    } else { sel.value=''; }
  }
}
function spAutoErro(input){
  const row=input.closest('.sp-mat-row');
  const total=+row.querySelector('.sp-mat-total').value||0;
  const acertos=+row.querySelector('.sp-mat-acertos').value||0;
  const branco=+row.querySelector('.sp-mat-branco').value||0;
  const errosEl=row.querySelector('.sp-mat-erros');
  if(total>0) errosEl.value=Math.max(0,total-acertos-branco);
}
function spCalcGeral(){
  const list=document.getElementById('sp-materias-list');
  if(!list) return;
  let tT=0,tA=0,tE=0,tB=0;
  [...list.querySelectorAll('.sp-mat-row')].forEach(row=>{
    tT+=+row.querySelector('.sp-mat-total').value||0;
    tA+=+row.querySelector('.sp-mat-acertos').value||0;
    tE+=+row.querySelector('.sp-mat-erros').value||0;
    tB+=+row.querySelector('.sp-mat-branco').value||0;
  });
  const manualT=+document.getElementById('sp-total').value||0;
  const total=manualT||tT;
  const taxa=total>0?Math.round(tA/total*100):0;
  const formula=document.getElementById('sp-formula').value;
  let nota=formula==='simples'?tA:formula==='cespe'?tA-tE:(+document.getElementById('sp-pontuacao').value||tA);
  const resumo=document.getElementById('sp-resumo-geral');
  if(resumo&&(total>0||tT>0)){
    resumo.style.display='block';
    document.getElementById('sp-res-total').textContent=total;
    document.getElementById('sp-res-acertos').textContent=tA;
    document.getElementById('sp-res-erros').textContent=tE;
    document.getElementById('sp-res-branco').textContent=tB;
    document.getElementById('sp-res-taxa').textContent=taxa+'%';
    document.getElementById('sp-res-nota').textContent=(nota>=0?'+':'')+nota;
  }
}
function spSalvar(){
  const nome=(document.getElementById('sp-nome').value||'').trim();
  if(!nome){alert('Digite um nome para o simulado.');return;}
  const list=document.getElementById('sp-materias-list');
  const porMateria=[];
  let tT=0,tA=0,tE=0,tB=0;
  [...list.querySelectorAll('.sp-mat-row')].forEach(row=>{
    const mat=row.querySelector('.sp-mat-sel').value;
    const total=+row.querySelector('.sp-mat-total').value||0;
    const acertos=+row.querySelector('.sp-mat-acertos').value||0;
    const erros=+row.querySelector('.sp-mat-erros').value||0;
    const branco=+row.querySelector('.sp-mat-branco').value||0;
    if(!mat||total===0) return;
    porMateria.push({mat,total,acertos,erros,branco});
    tT+=total;tA+=acertos;tE+=erros;tB+=branco;
  });
  const manualT=+document.getElementById('sp-total').value||tT;
  const total=manualT||tT;
  if(total===0){alert('Adicione pelo menos uma matéria com questões.');return;}
  const formula=document.getElementById('sp-formula').value;
  const nota=formula==='simples'?tA:formula==='cespe'?tA-tE:(+document.getElementById('sp-pontuacao').value||tA);
  const dataRaw=document.getElementById('sp-data').value||'';
  const dataFmt=dataRaw?(function(s){var m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3]).toLocaleDateString('pt-BR'):new Date(s+'T12:00').toLocaleDateString('pt-BR');})(dataRaw):new Date().toLocaleDateString('pt-BR');
  const selPlat=document.getElementById('sp-plataforma');
  const plat=selPlat.value==='__outro__'?((document.getElementById('sp-plataforma-outro')?.value||'').trim()||'Outro'):selPlat.value;
  const novoSim={
    id:'sp'+Date.now(),nome,tipo:'papel',plataforma:plat,
    obs:(document.getElementById('sp-obs').value||'').trim(),
    questoes:[],qtd:total,
    resultados:[{id:'t'+Date.now(),nota,acertos:tA,erros:tE,brancos:tB,total,tempo:0,data:dataFmt,porMateria,formula}]
  };
  ST.simulados.push(novoSim);
  saveState();
  ['sp-nome','sp-pontuacao','sp-obs','sp-total'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const selEl=document.getElementById('sp-plataforma');if(selEl)selEl.value='';
  const outroEl=document.getElementById('sp-plataforma-outro');if(outroEl){outroEl.value='';outroEl.style.display='none';}
  document.getElementById('sp-formula').value='simples';
  document.getElementById('sp-data').value='';
  document.getElementById('sp-materias-list').innerHTML='';
  const resumo=document.getElementById('sp-resumo-geral');if(resumo)resumo.style.display='none';
  spAddMateria();
  simSubAba('resolver');
  setTimeout(()=>{
    const cards=document.querySelectorAll('.sim-card');
    if(cards.length){cards[0].scrollIntoView({behavior:'smooth'});cards[0].style.outline='2px solid var(--gold)';setTimeout(()=>cards[0].style.outline='',2000);}
  },200);
}
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════
//  ESTATÍSTICAS DE SIMULADOS
// ══════════════════════════════════════════════
function simStInit(){
  simStPopularFiltros();
  simStRender();
}

function simStPopularFiltros(){
  const sel = document.getElementById('simst-filtro-plat');
  if(!sel) return;
  const plats = [...new Set(
    ST.simulados
      .map(s => s.plataforma||'')
      .filter(Boolean)
  )].sort();
  const prev = sel.value;
  sel.innerHTML = '<option value="">Todas as plataformas</option>';
  plats.forEach(p => {
    const o = document.createElement('option');
    o.value = p; o.textContent = p;
    sel.appendChild(o);
  });
  if(prev) sel.value = prev;
}

function simStRender(){
  const filtPlat  = document.getElementById('simst-filtro-plat')?.value  || '';
  const filtTipo  = document.getElementById('simst-filtro-tipo')?.value  || '';
  const ordenar   = document.getElementById('simst-ordenar')?.value      || 'data_desc';

  // Flatten: cada TENTATIVA vira uma linha
  let rows = [];
  ST.simulados.forEach(sim => {
    const tipo = sim.tipo === 'papel' ? 'papel' : 'digital';
    (sim.resultados||[]).forEach(r => {
      rows.push({
        simId:     sim.id,
        nome:      sim.nome   || '—',
        plat:      sim.plataforma || '—',
        tipo,
        data:      r.data     || '—',
        dataTs:    _simStParseData(r.data),
        nota:      r.nota     ?? r.acertos ?? 0,
        acertos:   r.acertos  ?? 0,
        erros:     r.erros    ?? 0,
        brancos:   r.brancos  ?? 0,
        total:     r.total    || sim.qtd  || 0,
        tempo:     r.tempo    || 0,
        formula:   r.formula  || 'simples',
        porMat:    r.porMateria || [],
        tentId:    r.id       || '',
      });
    });
  });

  // Filtros
  if(filtPlat) rows = rows.filter(r => r.plat === filtPlat);
  if(filtTipo) rows = rows.filter(r => r.tipo === filtTipo);

  // Ordenação
  rows.sort((a,b) => {
    if(ordenar==='data_desc') return b.dataTs - a.dataTs;
    if(ordenar==='data_asc')  return a.dataTs - b.dataTs;
    if(ordenar==='nota_desc') return b.nota - a.nota;
    if(ordenar==='nota_asc')  return a.nota - b.nota;
    if(ordenar==='taxa_desc'){
      const ta = a.total>0 ? a.acertos/a.total : 0;
      const tb = b.total>0 ? b.acertos/b.total : 0;
      return tb - ta;
    }
    return 0;
  });

  // Contador
  const countEl = document.getElementById('simst-count');
  if(countEl) countEl.textContent = rows.length + ' resultado(s)';

  // ── Cards de resumo ──────────────────────────────────────────
  const cardsEl = document.getElementById('simst-cards');
  if(cardsEl && rows.length){
    const notas  = rows.map(r=>r.nota);
    const taxas  = rows.filter(r=>r.total>0).map(r=>r.acertos/r.total*100);
    const media  = notas.reduce((a,b)=>a+b,0)/notas.length;
    const melhor = Math.max(...notas);
    const pior   = Math.min(...notas);
    const taxaMedia = taxas.length ? taxas.reduce((a,b)=>a+b,0)/taxas.length : 0;
    const mc = (v,c) => `<span style="color:${c};font-family:'Oswald',sans-serif;font-size:1.1rem;font-weight:700">${v}</span>`;
    cardsEl.innerHTML = `
      <div class="stat-card">${mc(rows.length,'var(--gold)')}<div class="stat-label">Tentativas</div></div>
      <div class="stat-card">${mc((media>=0?'+':'')+Math.round(media),'var(--blue)')}<div class="stat-label">Nota Média</div></div>
      <div class="stat-card">${mc((melhor>=0?'+':'')+melhor,'var(--green)')}<div class="stat-label">Melhor Nota</div></div>
      <div class="stat-card">${mc(Math.round(taxaMedia)+'%',taxaMedia>=70?'var(--green)':taxaMedia>=50?'#fbbf24':'var(--red)')}<div class="stat-label">Taxa Média</div></div>
    `;
  } else if(cardsEl){
    cardsEl.innerHTML = '';
  }

  // ── Tabela ───────────────────────────────────────────────────
  const tabelaEl = document.getElementById('simst-tabela');
  if(!tabelaEl) return;

  if(!rows.length){
    tabelaEl.innerHTML = '<div style="text-align:center;color:var(--dim);font-size:.78rem;padding:1.5rem;font-style:italic">Nenhum simulado encontrado.</div>';
    return;
  }

  const header = `
    <div style="display:grid;grid-template-columns:1fr 90px 70px 55px 55px 55px 55px 60px;gap:4px;padding:.3rem .5rem;margin-bottom:.25rem">
      <span style="font-size:.55rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Nome</span>
      <span style="font-size:.55rem;color:var(--muted);text-transform:uppercase;text-align:center">Plataforma</span>
      <span style="font-size:.55rem;color:var(--muted);text-transform:uppercase;text-align:center">Data</span>
      <span style="font-size:.55rem;color:var(--green);text-transform:uppercase;text-align:center">Acertos</span>
      <span style="font-size:.55rem;color:var(--red);text-transform:uppercase;text-align:center">Erros</span>
      <span style="font-size:.55rem;color:var(--muted);text-transform:uppercase;text-align:center">Branco</span>
      <span style="font-size:.55rem;color:var(--blue);text-transform:uppercase;text-align:center">Taxa</span>
      <span style="font-size:.55rem;color:var(--gold);text-transform:uppercase;text-align:center">Nota</span>
    </div>`;

  const rowsHTML = rows.map(r => {
    const taxa = r.total>0 ? Math.round(r.acertos/r.total*100) : 0;
    const taxaColor = taxa>=70?'var(--green)':taxa>=50?'#fbbf24':'var(--red)';
    const notaColor = r.nota>0?'var(--green)':r.nota<0?'var(--red)':'var(--muted)';
    const tipoBadge = r.tipo==='papel'
      ? '<span style="font-size:.5rem;background:rgba(167,139,250,.15);color:#a78bfa;border:1px solid rgba(167,139,250,.3);border-radius:3px;padding:0 5px;font-family:Oswald,sans-serif;font-weight:700;margin-left:4px">P</span>'
      : '';
    const matDetails = r.porMat.length
      ? `<details style="margin-top:.25rem"><summary style="font-size:.58rem;color:var(--muted);cursor:pointer;list-style:none">▸ por matéria</summary>
          <div style="margin-top:.2rem;display:flex;flex-direction:column;gap:2px">
            ${r.porMat.map(m=>{
              const mt=m.total>0?Math.round(m.acertos/m.total*100):0;
              const mc=mt>=70?'var(--green)':mt>=50?'#fbbf24':'var(--red)';
              return `<div style="display:flex;gap:5px;font-size:.6rem;padding:.15rem .3rem;background:rgba(255,255,255,.02);border-radius:4px"><span style="flex:1;color:rgba(255,255,255,.7);font-style:italic">${m.mat}</span><span style="color:var(--green)">✓${m.acertos}</span><span style="color:var(--red)">✗${m.erros}</span><span style="color:var(--muted)">—${m.branco}</span><span style="color:${mc};font-weight:700;min-width:30px;text-align:right">${mt}%</span></div>`;
            }).join('')}
          </div></details>`
      : '';
    return `<div style="display:grid;grid-template-columns:1fr 90px 70px 55px 55px 55px 55px 60px;gap:4px;padding:.4rem .5rem;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.04);border-radius:8px;margin-bottom:.3rem;align-items:start">
      <div>
        <div style="font-size:.72rem;font-family:'Oswald',sans-serif;font-weight:600;color:var(--fg)">${r.nome}${tipoBadge}</div>
        ${r.plat!=='—'?`<div style="font-size:.6rem;color:var(--muted)">${r.plat}</div>`:''}
        ${matDetails}
      </div>
      <div style="font-size:.62rem;color:var(--muted);text-align:center;padding-top:.2rem">${r.plat!=='—'?r.plat:'—'}</div>
      <div style="font-size:.65rem;color:var(--dim);text-align:center;padding-top:.2rem">${r.data}</div>
      <div style="font-size:.72rem;color:var(--green);text-align:center;font-family:'Oswald',sans-serif;font-weight:700;padding-top:.2rem">${r.acertos}</div>
      <div style="font-size:.72rem;color:var(--red);text-align:center;font-family:'Oswald',sans-serif;font-weight:700;padding-top:.2rem">${r.erros}</div>
      <div style="font-size:.72rem;color:var(--muted);text-align:center;font-family:'Oswald',sans-serif;font-weight:700;padding-top:.2rem">${r.brancos}</div>
      <div style="font-size:.72rem;color:${taxaColor};text-align:center;font-family:'Oswald',sans-serif;font-weight:700;padding-top:.2rem">${taxa}%</div>
      <div style="font-size:.72rem;color:${notaColor};text-align:center;font-family:'Oswald',sans-serif;font-weight:700;padding-top:.2rem">${r.nota>=0?'+':''}${r.nota}</div>
    </div>`;
  }).join('');

  tabelaEl.innerHTML = header + rowsHTML;
}

function _simStParseData(str){
  if(!str||str==='—') return 0;
  // dd/mm/yyyy
  const p = str.split('/');
  if(p.length===3) return new Date(+p[2],+p[1]-1,+p[0]).getTime();
  return new Date(str).getTime()||0;
}
// ══════════════════════════════════════════════


var _EDITAIS_PRESETS = [
  {
    match: ['GMA','POLICIAL MUNICIPAL','GUARDA MUNICIPAL DE ARACAJU'],
    edital: [{"id":"gma3_disc_1","name":"Língua Portuguesa","topics":[{"id":"gma3_top_1","text":"1. Leitura, compreensão e interpretação de textos","subs":[]},{"id":"gma3_top_2","text":"2. Estruturação do texto e dos parágrafos","subs":[]},{"id":"gma3_top_3","text":"3. Articulação textual","subs":[{"id":"gma3_top_4","text":"3.1 Pronomes e expressões referenciais","subs":[]},{"id":"gma3_top_5","text":"3.2 Nexos","subs":[]},{"id":"gma3_top_6","text":"3.3 Operadores sequenciais","subs":[]},{"id":"gma3_top_7","text":"3.4 Elementos de coesão","subs":[]}]},{"id":"gma3_top_8","text":"4. Significação contextual de palavras e expressões","subs":[]},{"id":"gma3_top_9","text":"5. Equivalência e transformação de estruturas","subs":[]},{"id":"gma3_top_10","text":"6. Sintaxe","subs":[{"id":"gma3_top_11","text":"6.1 Termos da oração","subs":[]},{"id":"gma3_top_12","text":"6.2 Período simples e composto","subs":[]},{"id":"gma3_top_13","text":"6.3 Coordenação e subordinação","subs":[]}]},{"id":"gma3_top_14","text":"7. Emprego dos tempos e modos verbais","subs":[]},{"id":"gma3_top_15","text":"8. Pontuação","subs":[]},{"id":"gma3_top_16","text":"9. Estrutura e formação de palavras","subs":[]},{"id":"gma3_top_17","text":"10. Classes de palavras","subs":[{"id":"gma3_top_18","text":"10.1 Emprego","subs":[]},{"id":"gma3_top_19","text":"10.2 Funções","subs":[]}]},{"id":"gma3_top_20","text":"11. Flexão nominal e verbal","subs":[]},{"id":"gma3_top_21","text":"12. Pronomes","subs":[{"id":"gma3_top_22","text":"12.1 Emprego","subs":[]},{"id":"gma3_top_23","text":"12.2 Formas de tratamento","subs":[]},{"id":"gma3_top_24","text":"12.3 Colocação pronominal","subs":[]}]},{"id":"gma3_top_25","text":"13. Concordância nominal e verbal","subs":[]},{"id":"gma3_top_26","text":"14. Regência nominal e verbal","subs":[]},{"id":"gma3_top_27","text":"15. Crase","subs":[]},{"id":"gma3_top_28","text":"16. Ortografia oficial","subs":[]},{"id":"gma3_top_29","text":"17. Acentuação gráfica","subs":[]}]},{"id":"gma3_disc_2","name":"Raciocínio Lógico","topics":[{"id":"gma3_top_30","text":"1. Estruturas lógicas","subs":[]},{"id":"gma3_top_31","text":"2. Proposições, conectivos, equivalências lógicas e negações","subs":[]},{"id":"gma3_top_32","text":"3. Argumentação lógica","subs":[]},{"id":"gma3_top_33","text":"4. Diagramas lógicos","subs":[]},{"id":"gma3_top_34","text":"5. Sequências lógicas, numéricas, alfabéticas e figurais","subs":[]},{"id":"gma3_top_35","text":"6. Relações arbitrárias entre pessoas, lugares, objetos ou eventos fictícios","subs":[]},{"id":"gma3_top_36","text":"7. Dedução de novas informações a partir de relações fornecidas","subs":[]},{"id":"gma3_top_37","text":"8. Raciocínio verbal, matemático, sequencial, espacial e temporal","subs":[]},{"id":"gma3_top_38","text":"9. Operações com conjuntos","subs":[]},{"id":"gma3_top_39","text":"10. Problemas aritméticos, geométricos e matriciais","subs":[]}]},{"id":"gma3_disc_3","name":"Noções De Informática","topics":[{"id":"gma3_top_40","text":"1. Conceitos básicos de hardware, software, dispositivos de armazenamento, memórias e periféricos","subs":[]},{"id":"gma3_top_41","text":"2. Sistemas operacionais Windows e Linux","subs":[{"id":"gma3_top_42","text":"2.1 Pastas","subs":[]},{"id":"gma3_top_43","text":"2.2 Diretórios","subs":[]},{"id":"gma3_top_44","text":"2.3 Arquivos","subs":[]},{"id":"gma3_top_45","text":"2.4 Atalhos","subs":[]},{"id":"gma3_top_46","text":"2.5 Área de trabalho","subs":[]},{"id":"gma3_top_47","text":"2.6 Área de transferência","subs":[]},{"id":"gma3_top_48","text":"2.7 Manipulação de arquivos e pastas","subs":[]},{"id":"gma3_top_49","text":"2.8 Menus","subs":[]},{"id":"gma3_top_50","text":"2.9 Programas e aplicativos","subs":[]}]},{"id":"gma3_top_51","text":"3. Editores de texto: LibreOffice Writer e Microsoft Word","subs":[{"id":"gma3_top_52","text":"3.1 Estrutura básica dos documentos","subs":[]},{"id":"gma3_top_53","text":"3.2 Edição","subs":[]},{"id":"gma3_top_54","text":"3.3 Formatação","subs":[]},{"id":"gma3_top_55","text":"3.4 Tabelas","subs":[]},{"id":"gma3_top_56","text":"3.5 Impressão","subs":[]},{"id":"gma3_top_57","text":"3.6 Cabeçalhos","subs":[]},{"id":"gma3_top_58","text":"3.7 Rodapés","subs":[]},{"id":"gma3_top_59","text":"3.8 Marcadores","subs":[]},{"id":"gma3_top_60","text":"3.9 Numeração","subs":[]},{"id":"gma3_top_61","text":"3.10 Quebras","subs":[]},{"id":"gma3_top_62","text":"3.11 Índices","subs":[]},{"id":"gma3_top_63","text":"3.12 Inserção de objetos","subs":[]}]},{"id":"gma3_top_64","text":"4. Planilhas eletrônicas: LibreOffice Calc e Microsoft Excel","subs":[{"id":"gma3_top_65","text":"4.1 Células","subs":[]},{"id":"gma3_top_66","text":"4.2 Linhas","subs":[]},{"id":"gma3_top_67","text":"4.3 Colunas","subs":[]},{"id":"gma3_top_68","text":"4.4 Pastas","subs":[]},{"id":"gma3_top_69","text":"4.5 Gráficos","subs":[]},{"id":"gma3_top_70","text":"4.6 Fórmulas","subs":[]},{"id":"gma3_top_71","text":"4.7 Funções","subs":[]},{"id":"gma3_top_72","text":"4.8 Filtros","subs":[]},{"id":"gma3_top_73","text":"4.9 Classificação de dados","subs":[]},{"id":"gma3_top_74","text":"4.10 Impressão","subs":[]}]},{"id":"gma3_top_75","text":"5. Correio eletrônico","subs":[{"id":"gma3_top_76","text":"5.1 Mozilla Thunderbird","subs":[]},{"id":"gma3_top_77","text":"5.2 Gmail","subs":[]},{"id":"gma3_top_78","text":"5.3 Outlook e webmail","subs":[]},{"id":"gma3_top_79","text":"5.4 Preparo, envio e recebimento de mensagens","subs":[]},{"id":"gma3_top_80","text":"5.5 Anexação de arquivos","subs":[]}]},{"id":"gma3_top_81","text":"6. Ferramentas de comunicação e reuniões on-line","subs":[{"id":"gma3_top_82","text":"6.1 Microsoft Teams","subs":[]},{"id":"gma3_top_83","text":"6.2 Google Meet","subs":[]},{"id":"gma3_top_84","text":"6.3 Zoom","subs":[]},{"id":"gma3_top_85","text":"6.4 Skype","subs":[]},{"id":"gma3_top_86","text":"6.5 Google Chat","subs":[]}]},{"id":"gma3_top_87","text":"7. Internet, intranet, extranet","subs":[]},{"id":"gma3_top_88","text":"8. Navegadores","subs":[{"id":"gma3_top_89","text":"8.1 Mozilla Firefox","subs":[]},{"id":"gma3_top_90","text":"8.2 Google Chrome","subs":[]},{"id":"gma3_top_91","text":"8.3 Microsoft Edge","subs":[]}]},{"id":"gma3_top_92","text":"9. Conceitos de URL, links, sites, busca e impressão de páginas","subs":[]},{"id":"gma3_top_93","text":"10. Computação em nuvem","subs":[]},{"id":"gma3_top_94","text":"11. Redes sociais e ferramentas colaborativas","subs":[]},{"id":"gma3_top_95","text":"12. Segurança da informação","subs":[{"id":"gma3_top_96","text":"12.1 Confidencialidade","subs":[]},{"id":"gma3_top_97","text":"12.2 Integridade","subs":[]},{"id":"gma3_top_98","text":"12.3 Disponibilidade","subs":[]},{"id":"gma3_top_99","text":"12.4 Assinatura digital","subs":[]},{"id":"gma3_top_100","text":"12.5 Backup","subs":[]},{"id":"gma3_top_101","text":"12.6 Antivírus","subs":[]},{"id":"gma3_top_102","text":"12.7 Firewall","subs":[]},{"id":"gma3_top_103","text":"12.8 Malwares","subs":[]},{"id":"gma3_top_104","text":"12.9 Phishing","subs":[]},{"id":"gma3_top_105","text":"12.10 Golpes digitais","subs":[]},{"id":"gma3_top_106","text":"12.11 Boas práticas de segurança","subs":[]}]},{"id":"gma3_top_107","text":"13. Extensões e tipos de arquivos","subs":[]}]},{"id":"gma3_disc_4","name":"Atualidades","topics":[{"id":"gma3_top_108","text":"1. Fatos políticos, econômicos, sociais, administrativos, culturais, ambientais, científicos, tecnológicos e jurídicos ocorridos no Brasil e no mundo, veiculados nos últimos 6 meses anteriores à data da realização da prova, em meios de comunicação de massa, incluindo jornais, televisão, rádio, internet e portais oficiais","subs":[]}]},{"id":"gma3_disc_5","name":"Conhecimentos Sobre Aracaju/SE","topics":[{"id":"gma3_top_109","text":"1. Localização e limites","subs":[]},{"id":"gma3_top_110","text":"2. Hidrografia","subs":[]},{"id":"gma3_top_111","text":"3. População","subs":[]},{"id":"gma3_top_112","text":"4. Aspectos históricos, políticos, administrativos, econômicos, sociais e culturais","subs":[]},{"id":"gma3_top_113","text":"5. Pontos turísticos","subs":[]},{"id":"gma3_top_114","text":"6. Patrimônio histórico, cultural, ambiental e paisagístico","subs":[]},{"id":"gma3_top_115","text":"7. Clima e vegetação","subs":[]},{"id":"gma3_top_116","text":"8. Ocupação geográfica e desenvolvimento urbano","subs":[]},{"id":"gma3_top_117","text":"9. História do Município de Aracaju","subs":[]}]},{"id":"gma3_disc_6","name":"Noções De Direito Administrativo","topics":[{"id":"gma3_top_118","text":"1. Estado, Governo e Administração Pública","subs":[{"id":"gma3_top_119","text":"1.1 Conceitos","subs":[]},{"id":"gma3_top_120","text":"1.2 Elementos","subs":[]},{"id":"gma3_top_121","text":"1.3 Poderes","subs":[]},{"id":"gma3_top_122","text":"1.4 Natureza","subs":[]},{"id":"gma3_top_123","text":"1.5 Fins","subs":[]},{"id":"gma3_top_124","text":"1.6 Princípios","subs":[]}]},{"id":"gma3_top_125","text":"2. Administração Pública direta e indireta","subs":[]},{"id":"gma3_top_126","text":"3. Princípios expressos e implícitos da Administração Pública","subs":[]},{"id":"gma3_top_127","text":"4. Poderes administrativos","subs":[{"id":"gma3_top_128","text":"4.1 Poder vinculado","subs":[]},{"id":"gma3_top_129","text":"4.2 Discricionário","subs":[]},{"id":"gma3_top_130","text":"4.3 Hierárquico","subs":[]},{"id":"gma3_top_131","text":"4.4 Disciplinar","subs":[]},{"id":"gma3_top_132","text":"4.5 Regulamentar","subs":[]},{"id":"gma3_top_133","text":"4.6 Poder de polícia","subs":[]}]},{"id":"gma3_top_134","text":"5. Poder de polícia administrativa e sua aplicação na atuação da Guarda Municipal","subs":[]},{"id":"gma3_top_135","text":"6. Atos administrativos","subs":[{"id":"gma3_top_136","text":"6.1 Conceito","subs":[]},{"id":"gma3_top_137","text":"6.2 Requisitos","subs":[]},{"id":"gma3_top_138","text":"6.3 Atributos","subs":[]},{"id":"gma3_top_139","text":"6.4 Classificação","subs":[]},{"id":"gma3_top_140","text":"6.5 Espécies","subs":[]},{"id":"gma3_top_141","text":"6.6 Anulação","subs":[]},{"id":"gma3_top_142","text":"6.7 Revogação","subs":[]},{"id":"gma3_top_143","text":"6.8 Convalidação","subs":[]}]},{"id":"gma3_top_144","text":"7. Agentes públicos","subs":[{"id":"gma3_top_145","text":"7.1 Cargo","subs":[]},{"id":"gma3_top_146","text":"7.2 Emprego e função pública","subs":[]},{"id":"gma3_top_147","text":"7.3 Provimento","subs":[]},{"id":"gma3_top_148","text":"7.4 Investidura","subs":[]},{"id":"gma3_top_149","text":"7.5 Posse","subs":[]},{"id":"gma3_top_150","text":"7.6 Exercício","subs":[]},{"id":"gma3_top_151","text":"7.7 Direitos","subs":[]},{"id":"gma3_top_152","text":"7.8 Deveres","subs":[]},{"id":"gma3_top_153","text":"7.9 Responsabilidades","subs":[]}]},{"id":"gma3_top_154","text":"8. Responsabilidade civil do Estado","subs":[]},{"id":"gma3_top_155","text":"9. Controle da Administração Pública","subs":[]},{"id":"gma3_top_156","text":"10. Improbidade administrativa","subs":[{"id":"gma3_top_157","text":"10.1 Noções gerais","subs":[]}]},{"id":"gma3_top_158","text":"11. Processo administrativo disciplinar","subs":[{"id":"gma3_top_159","text":"11.1 Noções gerais","subs":[]}]}]},{"id":"gma3_disc_7","name":"Noções De Direito Constitucional","topics":[{"id":"gma3_top_160","text":"1. Princípios fundamentais da Constituição Federal de 1988","subs":[]},{"id":"gma3_top_161","text":"2. Direitos e garantias fundamentais","subs":[]},{"id":"gma3_top_162","text":"3. Direitos e deveres individuais e coletivos","subs":[]},{"id":"gma3_top_163","text":"4. Direitos sociais","subs":[]},{"id":"gma3_top_164","text":"5. Nacionalidade","subs":[]},{"id":"gma3_top_165","text":"6. Direitos políticos","subs":[]},{"id":"gma3_top_166","text":"7. Organização do Estado","subs":[]},{"id":"gma3_top_167","text":"8. Organização político-administrativa da República Federativa do Brasil","subs":[]},{"id":"gma3_top_168","text":"9. Administração Pública","subs":[{"id":"gma3_top_169","text":"9.1 Disposições gerais","subs":[]},{"id":"gma3_top_170","text":"9.2 Servidores públicos","subs":[]},{"id":"gma3_top_171","text":"9.3 Princípios constitucionais","subs":[]},{"id":"gma3_top_172","text":"9.4 Regras aplicáveis","subs":[]}]},{"id":"gma3_top_173","text":"10. Segurança Pública","subs":[{"id":"gma3_top_174","text":"10.1 Art. 144 da Constituição Federal, especialmente o § 8º, relativo às Guardas Municipais","subs":[]}]},{"id":"gma3_top_175","text":"11. Política urbana","subs":[]},{"id":"gma3_top_176","text":"12. Meio ambiente","subs":[]},{"id":"gma3_top_177","text":"13. Família, criança, adolescente, jovem e idoso","subs":[]}]},{"id":"gma3_disc_8","name":"Noções De Direitos Humanos","topics":[{"id":"gma3_top_178","text":"1. Direitos Humanos","subs":[{"id":"gma3_top_179","text":"1.1 Conceito","subs":[]},{"id":"gma3_top_180","text":"1.2 Características","subs":[]},{"id":"gma3_top_181","text":"1.3 Fundamentos","subs":[]},{"id":"gma3_top_182","text":"1.4 Dimensões/gerações","subs":[]},{"id":"gma3_top_183","text":"1.5 Proteção nacional e internacional","subs":[]}]},{"id":"gma3_top_184","text":"2. Declaração Universal dos Direitos Humanos","subs":[]},{"id":"gma3_top_185","text":"3. Dignidade da pessoa humana, igualdade, liberdade, cidadania e não discriminação","subs":[]},{"id":"gma3_top_186","text":"4. Direitos humanos e atuação dos agentes de segurança pública","subs":[]},{"id":"gma3_top_187","text":"5. Uso legal, necessário, proporcional e progressivo da força","subs":[]},{"id":"gma3_top_188","text":"6. Proteção de grupos vulnerabilizados","subs":[]},{"id":"gma3_top_189","text":"7. Direitos das mulheres","subs":[{"id":"gma3_top_190","text":"7.1. Violência doméstica e familiar contra a mulher","subs":[]},{"id":"gma3_top_191","text":"7.2. Lei nº 11.340/2006 - Lei Maria da Penha","subs":[]}]},{"id":"gma3_top_192","text":"8. Racismo, discriminação racial e injúria racial","subs":[{"id":"gma3_top_193","text":"8.1. Lei nº 7.716/1989 e alterações","subs":[]},{"id":"gma3_top_194","text":"8.2. Lei nº 12.288/2010 — Estatuto da Igualdade Racial","subs":[]}]},{"id":"gma3_top_195","text":"9. Povos e comunidades tradicionais","subs":[{"id":"gma3_top_196","text":"9.1 Conceito, direitos, identidade, território, cultura, proteção e respeito às formas próprias de organização social","subs":[]},{"id":"gma3_top_197","text":"9.2 Decreto nº 6.040/2007 - Política Nacional de Desenvolvimento Sustentável dos Povos e Comunidades Tradicionais (PNPCT)","subs":[]}]},{"id":"gma3_top_198","text":"10. Povos indígenas","subs":[{"id":"gma3_top_199","text":"10.1 Direitos constitucionais,  organização social, costumes, línguas, crenças, tradições e direitos originários sobre as terras que tradicionalmente ocupam","subs":[]},{"id":"gma3_top_200","text":"10.2 Arts. 231 e 232 da Constituição Federal","subs":[]},{"id":"gma3_top_201","text":"10.3 Convenção nº 169 da Organização Internacional do Trabalho — OIT, consolidada pelo Decreto nº 10.088/2019","subs":[]},{"id":"gma3_top_202","text":"10.4 Lei nº 14.701/2023, no que couber","subs":[]}]}]},{"id":"gma3_disc_9","name":"Noções De Direito Penal","topics":[{"id":"gma3_top_203","text":"1. Aplicação da lei penal","subs":[]},{"id":"gma3_top_204","text":"2. Crime","subs":[{"id":"gma3_top_205","text":"2.1 Conceito","subs":[]},{"id":"gma3_top_206","text":"2.2 Elementos","subs":[]},{"id":"gma3_top_207","text":"2.3 Consumação","subs":[]},{"id":"gma3_top_208","text":"2.4 Tentativa","subs":[]},{"id":"gma3_top_209","text":"2.5 Desistência voluntária","subs":[]},{"id":"gma3_top_210","text":"2.6 Arrependimento eficaz","subs":[]},{"id":"gma3_top_211","text":"2.7 Arrependimento posterior","subs":[]},{"id":"gma3_top_212","text":"2.8 Crime impossível","subs":[]},{"id":"gma3_top_213","text":"2.9 Dolo","subs":[]},{"id":"gma3_top_214","text":"2.10 Culpa","subs":[]},{"id":"gma3_top_215","text":"2.11 Erro","subs":[]},{"id":"gma3_top_216","text":"2.12 Ilicitude","subs":[]},{"id":"gma3_top_217","text":"2.13 Culpabilidade","subs":[]}]},{"id":"gma3_top_218","text":"3. Excludentes de ilicitude","subs":[]},{"id":"gma3_top_219","text":"4. Imputabilidade penal","subs":[]},{"id":"gma3_top_220","text":"5. Concurso de pessoas","subs":[]},{"id":"gma3_top_221","text":"6. Crimes contra a pessoa","subs":[]},{"id":"gma3_top_222","text":"7. Crimes contra o patrimônio","subs":[]},{"id":"gma3_top_223","text":"8. Crimes contra a dignidade sexual","subs":[]},{"id":"gma3_top_224","text":"9. Crimes contra a fé pública","subs":[]},{"id":"gma3_top_225","text":"10. Crimes contra a Administração Pública","subs":[]}]},{"id":"gma3_disc_10","name":"Noções De Processo Penal","topics":[{"id":"gma3_top_226","text":"1. Inquérito policial","subs":[]},{"id":"gma3_top_227","text":"2. Ação penal","subs":[{"id":"gma3_top_228","text":"2.1 Noções gerais","subs":[]}]},{"id":"gma3_top_229","text":"3. Prisão em flagrante","subs":[]},{"id":"gma3_top_230","text":"4. Prisão, medidas cautelares e liberdade provisória","subs":[]},{"id":"gma3_top_231","text":"5. Busca e apreensão","subs":[]},{"id":"gma3_top_232","text":"6. Provas","subs":[{"id":"gma3_top_233","text":"6.1 Disposições gerais","subs":[]},{"id":"gma3_top_234","text":"6.2 Exame de corpo de delito","subs":[]},{"id":"gma3_top_235","text":"6.3 Cadeia de custódia","subs":[]},{"id":"gma3_top_236","text":"6.4 Perícias","subs":[]}]},{"id":"gma3_top_237","text":"7. Direitos do preso","subs":[]},{"id":"gma3_top_238","text":"8. Garantias constitucionais no processo penal","subs":[]},{"id":"gma3_top_239","text":"9. Atuação do agente público diante de situação de flagrante delito","subs":[]}]},{"id":"gma3_disc_11","name":"Legislação Extravagante","topics":[{"id":"gma3_top_240","text":"1. Lei nº 13.022/2014 — Estatuto Geral das Guardas Municipais e suas alterações","subs":[]},{"id":"gma3_top_241","text":"2. Lei nº 13.675/2018 — Sistema Único de Segurança Pública — SUSP e Política Nacional de Segurança Pública e Defesa Social","subs":[]},{"id":"gma3_top_242","text":"3. Decreto nº 11.841/2023 — cooperação das Guardas Municipais com os órgãos de segurança pública","subs":[]},{"id":"gma3_top_243","text":"4. Lei nº 11.343/2006 — Lei de Drogas e suas alterações","subs":[]},{"id":"gma3_top_244","text":"5. Lei nº 7.716/1989 — crimes resultantes de discriminação ou preconceito de raça, cor, etnia, religião ou procedência nacional, e suas alterações","subs":[]},{"id":"gma3_top_245","text":"6. Lei nº 14.532/2023 — alterações relativas ao crime de injúria racial","subs":[]},{"id":"gma3_top_246","text":"7. Lei nº 12.288/2010 — Estatuto da Igualdade Racial","subs":[]},{"id":"gma3_top_247","text":"8. Lei nº 8.069/1990 — Estatuto da Criança e do Adolescente — ECA e suas alterações","subs":[]},{"id":"gma3_top_248","text":"9. Lei nº 9.605/1998 — crimes contra o meio ambiente e suas alterações","subs":[]},{"id":"gma3_top_249","text":"10. Lei nº 9.503/1997 — Código de Trânsito Brasileiro — CTB e suas alterações","subs":[]},{"id":"gma3_top_250","text":"11. Lei nº 10.826/2003 — Estatuto do Desarmamento e suas alterações","subs":[]},{"id":"gma3_top_251","text":"12. Lei nº 11.340/2006 — Lei Maria da Penha e suas alterações","subs":[]},{"id":"gma3_top_252","text":"13. Lei nº 13.869/2019 — Lei de Abuso de Autoridade e suas alterações","subs":[]},{"id":"gma3_top_253","text":"14. Lei nº 9.455/1997 — Lei de Tortura","subs":[]},{"id":"gma3_top_254","text":"15. Decreto nº 6.040/2007 — Política Nacional de Desenvolvimento Sustentável dos Povos e Comunidades Tradicionais","subs":[]},{"id":"gma3_top_255","text":"16. Decreto nº 10.088/2019 — Convenção nº 169 da OIT sobre Povos Indígenas e Tribais","subs":[]}]},{"id":"gma3_disc_12","name":"Legislação Municipal de Aracaju/SE","topics":[{"id":"gma3_top_256","text":"1. Lei Orgânica do Município de Aracaju/SE","subs":[{"id":"gma3_top_257","text":"1.1 Organização do Município","subs":[]},{"id":"gma3_top_258","text":"1.2 Competências municipais","subs":[]},{"id":"gma3_top_259","text":"1.3 Administração Pública","subs":[]},{"id":"gma3_top_260","text":"1.4 Bens, serviços e instalações públicas","subs":[]},{"id":"gma3_top_261","text":"1.5 Segurança","subs":[]},{"id":"gma3_top_262","text":"1.6 Defesa civil","subs":[]},{"id":"gma3_top_263","text":"1.7 Dispositivos aplicáveis à Guarda Municipal/Polícia Municipal de Aracaju","subs":[]}]},{"id":"gma3_top_264","text":"2. Lei Municipal nº 1.659/1990 — criação da Guarda Municipal de Aracaju — GMA, competências e disposições pertinentes à atuação da corporação, no que estiver vigente","subs":[]},{"id":"gma3_top_265","text":"3. Lei Complementar nº 194/2023 — estrutura administrativa e operacional da Guarda Municipal/Polícia Municipal de Aracaju, Plano de Carreira, atribuições, competências, hierarquia, organização, ingresso, regime funcional e disposições correlatas","subs":[]},{"id":"gma3_top_266","text":"4. Lei 6.260/2026 SSM/AJU","subs":[]},{"id":"gma3_top_267","text":"5. Lei Complementar nº 224/2026 — alteração da nomenclatura da Guarda Municipal de Aracaju para Polícia Municipal de Aracaju, sem alteração das competências e da estrutura funcional da corporação","subs":[]},{"id":"gma3_top_268","text":"6. Lei Complementar nº 153/2016 — Estatuto dos Servidores Públicos do Município de Aracaju, no que couber","subs":[{"id":"gma3_top_269","text":"6.1 Provimento","subs":[]},{"id":"gma3_top_270","text":"6.2 Posse","subs":[]},{"id":"gma3_top_271","text":"6.3 Exercício","subs":[]},{"id":"gma3_top_272","text":"6.4 Estágio probatório","subs":[]},{"id":"gma3_top_273","text":"6.5 Direitos","subs":[]},{"id":"gma3_top_274","text":"6.6 Deveres","subs":[]},{"id":"gma3_top_275","text":"6.7 Responsabilidades","subs":[]},{"id":"gma3_top_276","text":"6.8 Regime disciplinar","subs":[]},{"id":"gma3_top_277","text":"6.9 Processo administrativo disciplinar","subs":[]}]}]}]
  }
];

function _getPresetParaConcurso(id){
  const meta = _concGetMeta();
  const conc = meta.find(c=>c.id===id);
  if(!conc) return null;
  const nome = (conc.nome+' '+(conc.cargo||'')).toUpperCase();
  return _EDITAIS_PRESETS.find(p=>p.match.some(m=>nome.includes(m))) || null;
}


// ══════════════════════════════════════════════
//  INJEÇÃO DIRETA DO EDITAL GMA NO LOCALSTORAGE
//  Roda no DOMContentLoaded — identifica a GMA
//  pelo nome e sobrescreve edital+leis corretos
// ══════════════════════════════════════════════
var _GMA_EDITAL = [{"id":"gma3_disc_1","name":"Língua Portuguesa","topics":[{"id":"gma3_top_1","text":"1. Leitura, compreensão e interpretação de textos","subs":[]},{"id":"gma3_top_2","text":"2. Estruturação do texto e dos parágrafos","subs":[]},{"id":"gma3_top_3","text":"3. Articulação textual","subs":[{"id":"gma3_top_4","text":"3.1 Pronomes e expressões referenciais","subs":[]},{"id":"gma3_top_5","text":"3.2 Nexos","subs":[]},{"id":"gma3_top_6","text":"3.3 Operadores sequenciais","subs":[]},{"id":"gma3_top_7","text":"3.4 Elementos de coesão","subs":[]}]},{"id":"gma3_top_8","text":"4. Significação contextual de palavras e expressões","subs":[]},{"id":"gma3_top_9","text":"5. Equivalência e transformação de estruturas","subs":[]},{"id":"gma3_top_10","text":"6. Sintaxe","subs":[{"id":"gma3_top_11","text":"6.1 Termos da oração","subs":[]},{"id":"gma3_top_12","text":"6.2 Período simples e composto","subs":[]},{"id":"gma3_top_13","text":"6.3 Coordenação e subordinação","subs":[]}]},{"id":"gma3_top_14","text":"7. Emprego dos tempos e modos verbais","subs":[]},{"id":"gma3_top_15","text":"8. Pontuação","subs":[]},{"id":"gma3_top_16","text":"9. Estrutura e formação de palavras","subs":[]},{"id":"gma3_top_17","text":"10. Classes de palavras","subs":[{"id":"gma3_top_18","text":"10.1 Emprego","subs":[]},{"id":"gma3_top_19","text":"10.2 Funções","subs":[]}]},{"id":"gma3_top_20","text":"11. Flexão nominal e verbal","subs":[]},{"id":"gma3_top_21","text":"12. Pronomes","subs":[{"id":"gma3_top_22","text":"12.1 Emprego","subs":[]},{"id":"gma3_top_23","text":"12.2 Formas de tratamento","subs":[]},{"id":"gma3_top_24","text":"12.3 Colocação pronominal","subs":[]}]},{"id":"gma3_top_25","text":"13. Concordância nominal e verbal","subs":[]},{"id":"gma3_top_26","text":"14. Regência nominal e verbal","subs":[]},{"id":"gma3_top_27","text":"15. Crase","subs":[]},{"id":"gma3_top_28","text":"16. Ortografia oficial","subs":[]},{"id":"gma3_top_29","text":"17. Acentuação gráfica","subs":[]}]},{"id":"gma3_disc_2","name":"Raciocínio Lógico","topics":[{"id":"gma3_top_30","text":"1. Estruturas lógicas","subs":[]},{"id":"gma3_top_31","text":"2. Proposições, conectivos, equivalências lógicas e negações","subs":[]},{"id":"gma3_top_32","text":"3. Argumentação lógica","subs":[]},{"id":"gma3_top_33","text":"4. Diagramas lógicos","subs":[]},{"id":"gma3_top_34","text":"5. Sequências lógicas, numéricas, alfabéticas e figurais","subs":[]},{"id":"gma3_top_35","text":"6. Relações arbitrárias entre pessoas, lugares, objetos ou eventos fictícios","subs":[]},{"id":"gma3_top_36","text":"7. Dedução de novas informações a partir de relações fornecidas","subs":[]},{"id":"gma3_top_37","text":"8. Raciocínio verbal, matemático, sequencial, espacial e temporal","subs":[]},{"id":"gma3_top_38","text":"9. Operações com conjuntos","subs":[]},{"id":"gma3_top_39","text":"10. Problemas aritméticos, geométricos e matriciais","subs":[]}]},{"id":"gma3_disc_3","name":"Noções De Informática","topics":[{"id":"gma3_top_40","text":"1. Conceitos básicos de hardware, software, dispositivos de armazenamento, memórias e periféricos","subs":[]},{"id":"gma3_top_41","text":"2. Sistemas operacionais Windows e Linux","subs":[{"id":"gma3_top_42","text":"2.1 Pastas","subs":[]},{"id":"gma3_top_43","text":"2.2 Diretórios","subs":[]},{"id":"gma3_top_44","text":"2.3 Arquivos","subs":[]},{"id":"gma3_top_45","text":"2.4 Atalhos","subs":[]},{"id":"gma3_top_46","text":"2.5 Área de trabalho","subs":[]},{"id":"gma3_top_47","text":"2.6 Área de transferência","subs":[]},{"id":"gma3_top_48","text":"2.7 Manipulação de arquivos e pastas","subs":[]},{"id":"gma3_top_49","text":"2.8 Menus","subs":[]},{"id":"gma3_top_50","text":"2.9 Programas e aplicativos","subs":[]}]},{"id":"gma3_top_51","text":"3. Editores de texto: LibreOffice Writer e Microsoft Word","subs":[{"id":"gma3_top_52","text":"3.1 Estrutura básica dos documentos","subs":[]},{"id":"gma3_top_53","text":"3.2 Edição","subs":[]},{"id":"gma3_top_54","text":"3.3 Formatação","subs":[]},{"id":"gma3_top_55","text":"3.4 Tabelas","subs":[]},{"id":"gma3_top_56","text":"3.5 Impressão","subs":[]},{"id":"gma3_top_57","text":"3.6 Cabeçalhos","subs":[]},{"id":"gma3_top_58","text":"3.7 Rodapés","subs":[]},{"id":"gma3_top_59","text":"3.8 Marcadores","subs":[]},{"id":"gma3_top_60","text":"3.9 Numeração","subs":[]},{"id":"gma3_top_61","text":"3.10 Quebras","subs":[]},{"id":"gma3_top_62","text":"3.11 Índices","subs":[]},{"id":"gma3_top_63","text":"3.12 Inserção de objetos","subs":[]}]},{"id":"gma3_top_64","text":"4. Planilhas eletrônicas: LibreOffice Calc e Microsoft Excel","subs":[{"id":"gma3_top_65","text":"4.1 Células","subs":[]},{"id":"gma3_top_66","text":"4.2 Linhas","subs":[]},{"id":"gma3_top_67","text":"4.3 Colunas","subs":[]},{"id":"gma3_top_68","text":"4.4 Pastas","subs":[]},{"id":"gma3_top_69","text":"4.5 Gráficos","subs":[]},{"id":"gma3_top_70","text":"4.6 Fórmulas","subs":[]},{"id":"gma3_top_71","text":"4.7 Funções","subs":[]},{"id":"gma3_top_72","text":"4.8 Filtros","subs":[]},{"id":"gma3_top_73","text":"4.9 Classificação de dados","subs":[]},{"id":"gma3_top_74","text":"4.10 Impressão","subs":[]}]},{"id":"gma3_top_75","text":"5. Correio eletrônico","subs":[{"id":"gma3_top_76","text":"5.1 Mozilla Thunderbird","subs":[]},{"id":"gma3_top_77","text":"5.2 Gmail","subs":[]},{"id":"gma3_top_78","text":"5.3 Outlook e webmail","subs":[]},{"id":"gma3_top_79","text":"5.4 Preparo, envio e recebimento de mensagens","subs":[]},{"id":"gma3_top_80","text":"5.5 Anexação de arquivos","subs":[]}]},{"id":"gma3_top_81","text":"6. Ferramentas de comunicação e reuniões on-line","subs":[{"id":"gma3_top_82","text":"6.1 Microsoft Teams","subs":[]},{"id":"gma3_top_83","text":"6.2 Google Meet","subs":[]},{"id":"gma3_top_84","text":"6.3 Zoom","subs":[]},{"id":"gma3_top_85","text":"6.4 Skype","subs":[]},{"id":"gma3_top_86","text":"6.5 Google Chat","subs":[]}]},{"id":"gma3_top_87","text":"7. Internet, intranet, extranet","subs":[]},{"id":"gma3_top_88","text":"8. Navegadores","subs":[{"id":"gma3_top_89","text":"8.1 Mozilla Firefox","subs":[]},{"id":"gma3_top_90","text":"8.2 Google Chrome","subs":[]},{"id":"gma3_top_91","text":"8.3 Microsoft Edge","subs":[]}]},{"id":"gma3_top_92","text":"9. Conceitos de URL, links, sites, busca e impressão de páginas","subs":[]},{"id":"gma3_top_93","text":"10. Computação em nuvem","subs":[]},{"id":"gma3_top_94","text":"11. Redes sociais e ferramentas colaborativas","subs":[]},{"id":"gma3_top_95","text":"12. Segurança da informação","subs":[{"id":"gma3_top_96","text":"12.1 Confidencialidade","subs":[]},{"id":"gma3_top_97","text":"12.2 Integridade","subs":[]},{"id":"gma3_top_98","text":"12.3 Disponibilidade","subs":[]},{"id":"gma3_top_99","text":"12.4 Assinatura digital","subs":[]},{"id":"gma3_top_100","text":"12.5 Backup","subs":[]},{"id":"gma3_top_101","text":"12.6 Antivírus","subs":[]},{"id":"gma3_top_102","text":"12.7 Firewall","subs":[]},{"id":"gma3_top_103","text":"12.8 Malwares","subs":[]},{"id":"gma3_top_104","text":"12.9 Phishing","subs":[]},{"id":"gma3_top_105","text":"12.10 Golpes digitais","subs":[]},{"id":"gma3_top_106","text":"12.11 Boas práticas de segurança","subs":[]}]},{"id":"gma3_top_107","text":"13. Extensões e tipos de arquivos","subs":[]}]},{"id":"gma3_disc_4","name":"Atualidades","topics":[{"id":"gma3_top_108","text":"1. Fatos políticos, econômicos, sociais, administrativos, culturais, ambientais, científicos, tecnológicos e jurídicos ocorridos no Brasil e no mundo, veiculados nos últimos 6 meses anteriores à data da realização da prova, em meios de comunicação de massa, incluindo jornais, televisão, rádio, internet e portais oficiais","subs":[]}]},{"id":"gma3_disc_5","name":"Conhecimentos Sobre Aracaju/SE","topics":[{"id":"gma3_top_109","text":"1. Localização e limites","subs":[]},{"id":"gma3_top_110","text":"2. Hidrografia","subs":[]},{"id":"gma3_top_111","text":"3. População","subs":[]},{"id":"gma3_top_112","text":"4. Aspectos históricos, políticos, administrativos, econômicos, sociais e culturais","subs":[]},{"id":"gma3_top_113","text":"5. Pontos turísticos","subs":[]},{"id":"gma3_top_114","text":"6. Patrimônio histórico, cultural, ambiental e paisagístico","subs":[]},{"id":"gma3_top_115","text":"7. Clima e vegetação","subs":[]},{"id":"gma3_top_116","text":"8. Ocupação geográfica e desenvolvimento urbano","subs":[]},{"id":"gma3_top_117","text":"9. História do Município de Aracaju","subs":[]}]},{"id":"gma3_disc_6","name":"Noções De Direito Administrativo","topics":[{"id":"gma3_top_118","text":"1. Estado, Governo e Administração Pública","subs":[{"id":"gma3_top_119","text":"1.1 Conceitos","subs":[]},{"id":"gma3_top_120","text":"1.2 Elementos","subs":[]},{"id":"gma3_top_121","text":"1.3 Poderes","subs":[]},{"id":"gma3_top_122","text":"1.4 Natureza","subs":[]},{"id":"gma3_top_123","text":"1.5 Fins","subs":[]},{"id":"gma3_top_124","text":"1.6 Princípios","subs":[]}]},{"id":"gma3_top_125","text":"2. Administração Pública direta e indireta","subs":[]},{"id":"gma3_top_126","text":"3. Princípios expressos e implícitos da Administração Pública","subs":[]},{"id":"gma3_top_127","text":"4. Poderes administrativos","subs":[{"id":"gma3_top_128","text":"4.1 Poder vinculado","subs":[]},{"id":"gma3_top_129","text":"4.2 Discricionário","subs":[]},{"id":"gma3_top_130","text":"4.3 Hierárquico","subs":[]},{"id":"gma3_top_131","text":"4.4 Disciplinar","subs":[]},{"id":"gma3_top_132","text":"4.5 Regulamentar","subs":[]},{"id":"gma3_top_133","text":"4.6 Poder de polícia","subs":[]}]},{"id":"gma3_top_134","text":"5. Poder de polícia administrativa e sua aplicação na atuação da Guarda Municipal","subs":[]},{"id":"gma3_top_135","text":"6. Atos administrativos","subs":[{"id":"gma3_top_136","text":"6.1 Conceito","subs":[]},{"id":"gma3_top_137","text":"6.2 Requisitos","subs":[]},{"id":"gma3_top_138","text":"6.3 Atributos","subs":[]},{"id":"gma3_top_139","text":"6.4 Classificação","subs":[]},{"id":"gma3_top_140","text":"6.5 Espécies","subs":[]},{"id":"gma3_top_141","text":"6.6 Anulação","subs":[]},{"id":"gma3_top_142","text":"6.7 Revogação","subs":[]},{"id":"gma3_top_143","text":"6.8 Convalidação","subs":[]}]},{"id":"gma3_top_144","text":"7. Agentes públicos","subs":[{"id":"gma3_top_145","text":"7.1 Cargo","subs":[]},{"id":"gma3_top_146","text":"7.2 Emprego e função pública","subs":[]},{"id":"gma3_top_147","text":"7.3 Provimento","subs":[]},{"id":"gma3_top_148","text":"7.4 Investidura","subs":[]},{"id":"gma3_top_149","text":"7.5 Posse","subs":[]},{"id":"gma3_top_150","text":"7.6 Exercício","subs":[]},{"id":"gma3_top_151","text":"7.7 Direitos","subs":[]},{"id":"gma3_top_152","text":"7.8 Deveres","subs":[]},{"id":"gma3_top_153","text":"7.9 Responsabilidades","subs":[]}]},{"id":"gma3_top_154","text":"8. Responsabilidade civil do Estado","subs":[]},{"id":"gma3_top_155","text":"9. Controle da Administração Pública","subs":[]},{"id":"gma3_top_156","text":"10. Improbidade administrativa","subs":[{"id":"gma3_top_157","text":"10.1 Noções gerais","subs":[]}]},{"id":"gma3_top_158","text":"11. Processo administrativo disciplinar","subs":[{"id":"gma3_top_159","text":"11.1 Noções gerais","subs":[]}]}]},{"id":"gma3_disc_7","name":"Noções De Direito Constitucional","topics":[{"id":"gma3_top_160","text":"1. Princípios fundamentais da Constituição Federal de 1988","subs":[]},{"id":"gma3_top_161","text":"2. Direitos e garantias fundamentais","subs":[]},{"id":"gma3_top_162","text":"3. Direitos e deveres individuais e coletivos","subs":[]},{"id":"gma3_top_163","text":"4. Direitos sociais","subs":[]},{"id":"gma3_top_164","text":"5. Nacionalidade","subs":[]},{"id":"gma3_top_165","text":"6. Direitos políticos","subs":[]},{"id":"gma3_top_166","text":"7. Organização do Estado","subs":[]},{"id":"gma3_top_167","text":"8. Organização político-administrativa da República Federativa do Brasil","subs":[]},{"id":"gma3_top_168","text":"9. Administração Pública","subs":[{"id":"gma3_top_169","text":"9.1 Disposições gerais","subs":[]},{"id":"gma3_top_170","text":"9.2 Servidores públicos","subs":[]},{"id":"gma3_top_171","text":"9.3 Princípios constitucionais","subs":[]},{"id":"gma3_top_172","text":"9.4 Regras aplicáveis","subs":[]}]},{"id":"gma3_top_173","text":"10. Segurança Pública","subs":[{"id":"gma3_top_174","text":"10.1 Art. 144 da Constituição Federal, especialmente o § 8º, relativo às Guardas Municipais","subs":[]}]},{"id":"gma3_top_175","text":"11. Política urbana","subs":[]},{"id":"gma3_top_176","text":"12. Meio ambiente","subs":[]},{"id":"gma3_top_177","text":"13. Família, criança, adolescente, jovem e idoso","subs":[]}]},{"id":"gma3_disc_8","name":"Noções De Direitos Humanos","topics":[{"id":"gma3_top_178","text":"1. Direitos Humanos","subs":[{"id":"gma3_top_179","text":"1.1 Conceito","subs":[]},{"id":"gma3_top_180","text":"1.2 Características","subs":[]},{"id":"gma3_top_181","text":"1.3 Fundamentos","subs":[]},{"id":"gma3_top_182","text":"1.4 Dimensões/gerações","subs":[]},{"id":"gma3_top_183","text":"1.5 Proteção nacional e internacional","subs":[]}]},{"id":"gma3_top_184","text":"2. Declaração Universal dos Direitos Humanos","subs":[]},{"id":"gma3_top_185","text":"3. Dignidade da pessoa humana, igualdade, liberdade, cidadania e não discriminação","subs":[]},{"id":"gma3_top_186","text":"4. Direitos humanos e atuação dos agentes de segurança pública","subs":[]},{"id":"gma3_top_187","text":"5. Uso legal, necessário, proporcional e progressivo da força","subs":[]},{"id":"gma3_top_188","text":"6. Proteção de grupos vulnerabilizados","subs":[]},{"id":"gma3_top_189","text":"7. Direitos das mulheres","subs":[{"id":"gma3_top_190","text":"7.1. Violência doméstica e familiar contra a mulher","subs":[]},{"id":"gma3_top_191","text":"7.2. Lei nº 11.340/2006 - Lei Maria da Penha","subs":[]}]},{"id":"gma3_top_192","text":"8. Racismo, discriminação racial e injúria racial","subs":[{"id":"gma3_top_193","text":"8.1. Lei nº 7.716/1989 e alterações","subs":[]},{"id":"gma3_top_194","text":"8.2. Lei nº 12.288/2010 — Estatuto da Igualdade Racial","subs":[]}]},{"id":"gma3_top_195","text":"9. Povos e comunidades tradicionais","subs":[{"id":"gma3_top_196","text":"9.1 Conceito, direitos, identidade, território, cultura, proteção e respeito às formas próprias de organização social","subs":[]},{"id":"gma3_top_197","text":"9.2 Decreto nº 6.040/2007 - Política Nacional de Desenvolvimento Sustentável dos Povos e Comunidades Tradicionais (PNPCT)","subs":[]}]},{"id":"gma3_top_198","text":"10. Povos indígenas","subs":[{"id":"gma3_top_199","text":"10.1 Direitos constitucionais,  organização social, costumes, línguas, crenças, tradições e direitos originários sobre as terras que tradicionalmente ocupam","subs":[]},{"id":"gma3_top_200","text":"10.2 Arts. 231 e 232 da Constituição Federal","subs":[]},{"id":"gma3_top_201","text":"10.3 Convenção nº 169 da Organização Internacional do Trabalho — OIT, consolidada pelo Decreto nº 10.088/2019","subs":[]},{"id":"gma3_top_202","text":"10.4 Lei nº 14.701/2023, no que couber","subs":[]}]}]},{"id":"gma3_disc_9","name":"Noções De Direito Penal","topics":[{"id":"gma3_top_203","text":"1. Aplicação da lei penal","subs":[]},{"id":"gma3_top_204","text":"2. Crime","subs":[{"id":"gma3_top_205","text":"2.1 Conceito","subs":[]},{"id":"gma3_top_206","text":"2.2 Elementos","subs":[]},{"id":"gma3_top_207","text":"2.3 Consumação","subs":[]},{"id":"gma3_top_208","text":"2.4 Tentativa","subs":[]},{"id":"gma3_top_209","text":"2.5 Desistência voluntária","subs":[]},{"id":"gma3_top_210","text":"2.6 Arrependimento eficaz","subs":[]},{"id":"gma3_top_211","text":"2.7 Arrependimento posterior","subs":[]},{"id":"gma3_top_212","text":"2.8 Crime impossível","subs":[]},{"id":"gma3_top_213","text":"2.9 Dolo","subs":[]},{"id":"gma3_top_214","text":"2.10 Culpa","subs":[]},{"id":"gma3_top_215","text":"2.11 Erro","subs":[]},{"id":"gma3_top_216","text":"2.12 Ilicitude","subs":[]},{"id":"gma3_top_217","text":"2.13 Culpabilidade","subs":[]}]},{"id":"gma3_top_218","text":"3. Excludentes de ilicitude","subs":[]},{"id":"gma3_top_219","text":"4. Imputabilidade penal","subs":[]},{"id":"gma3_top_220","text":"5. Concurso de pessoas","subs":[]},{"id":"gma3_top_221","text":"6. Crimes contra a pessoa","subs":[]},{"id":"gma3_top_222","text":"7. Crimes contra o patrimônio","subs":[]},{"id":"gma3_top_223","text":"8. Crimes contra a dignidade sexual","subs":[]},{"id":"gma3_top_224","text":"9. Crimes contra a fé pública","subs":[]},{"id":"gma3_top_225","text":"10. Crimes contra a Administração Pública","subs":[]}]},{"id":"gma3_disc_10","name":"Noções De Processo Penal","topics":[{"id":"gma3_top_226","text":"1. Inquérito policial","subs":[]},{"id":"gma3_top_227","text":"2. Ação penal","subs":[{"id":"gma3_top_228","text":"2.1 Noções gerais","subs":[]}]},{"id":"gma3_top_229","text":"3. Prisão em flagrante","subs":[]},{"id":"gma3_top_230","text":"4. Prisão, medidas cautelares e liberdade provisória","subs":[]},{"id":"gma3_top_231","text":"5. Busca e apreensão","subs":[]},{"id":"gma3_top_232","text":"6. Provas","subs":[{"id":"gma3_top_233","text":"6.1 Disposições gerais","subs":[]},{"id":"gma3_top_234","text":"6.2 Exame de corpo de delito","subs":[]},{"id":"gma3_top_235","text":"6.3 Cadeia de custódia","subs":[]},{"id":"gma3_top_236","text":"6.4 Perícias","subs":[]}]},{"id":"gma3_top_237","text":"7. Direitos do preso","subs":[]},{"id":"gma3_top_238","text":"8. Garantias constitucionais no processo penal","subs":[]},{"id":"gma3_top_239","text":"9. Atuação do agente público diante de situação de flagrante delito","subs":[]}]},{"id":"gma3_disc_11","name":"Legislação Extravagante","topics":[{"id":"gma3_top_240","text":"1. Lei nº 13.022/2014 — Estatuto Geral das Guardas Municipais e suas alterações","subs":[]},{"id":"gma3_top_241","text":"2. Lei nº 13.675/2018 — Sistema Único de Segurança Pública — SUSP e Política Nacional de Segurança Pública e Defesa Social","subs":[]},{"id":"gma3_top_242","text":"3. Decreto nº 11.841/2023 — cooperação das Guardas Municipais com os órgãos de segurança pública","subs":[]},{"id":"gma3_top_243","text":"4. Lei nº 11.343/2006 — Lei de Drogas e suas alterações","subs":[]},{"id":"gma3_top_244","text":"5. Lei nº 7.716/1989 — crimes resultantes de discriminação ou preconceito de raça, cor, etnia, religião ou procedência nacional, e suas alterações","subs":[]},{"id":"gma3_top_245","text":"6. Lei nº 14.532/2023 — alterações relativas ao crime de injúria racial","subs":[]},{"id":"gma3_top_246","text":"7. Lei nº 12.288/2010 — Estatuto da Igualdade Racial","subs":[]},{"id":"gma3_top_247","text":"8. Lei nº 8.069/1990 — Estatuto da Criança e do Adolescente — ECA e suas alterações","subs":[]},{"id":"gma3_top_248","text":"9. Lei nº 9.605/1998 — crimes contra o meio ambiente e suas alterações","subs":[]},{"id":"gma3_top_249","text":"10. Lei nº 9.503/1997 — Código de Trânsito Brasileiro — CTB e suas alterações","subs":[]},{"id":"gma3_top_250","text":"11. Lei nº 10.826/2003 — Estatuto do Desarmamento e suas alterações","subs":[]},{"id":"gma3_top_251","text":"12. Lei nº 11.340/2006 — Lei Maria da Penha e suas alterações","subs":[]},{"id":"gma3_top_252","text":"13. Lei nº 13.869/2019 — Lei de Abuso de Autoridade e suas alterações","subs":[]},{"id":"gma3_top_253","text":"14. Lei nº 9.455/1997 — Lei de Tortura","subs":[]},{"id":"gma3_top_254","text":"15. Decreto nº 6.040/2007 — Política Nacional de Desenvolvimento Sustentável dos Povos e Comunidades Tradicionais","subs":[]},{"id":"gma3_top_255","text":"16. Decreto nº 10.088/2019 — Convenção nº 169 da OIT sobre Povos Indígenas e Tribais","subs":[]}]},{"id":"gma3_disc_12","name":"Legislação Municipal de Aracaju/SE","topics":[{"id":"gma3_top_256","text":"1. Lei Orgânica do Município de Aracaju/SE","subs":[{"id":"gma3_top_257","text":"1.1 Organização do Município","subs":[]},{"id":"gma3_top_258","text":"1.2 Competências municipais","subs":[]},{"id":"gma3_top_259","text":"1.3 Administração Pública","subs":[]},{"id":"gma3_top_260","text":"1.4 Bens, serviços e instalações públicas","subs":[]},{"id":"gma3_top_261","text":"1.5 Segurança","subs":[]},{"id":"gma3_top_262","text":"1.6 Defesa civil","subs":[]},{"id":"gma3_top_263","text":"1.7 Dispositivos aplicáveis à Guarda Municipal/Polícia Municipal de Aracaju","subs":[]}]},{"id":"gma3_top_264","text":"2. Lei Municipal nº 1.659/1990 — criação da Guarda Municipal de Aracaju — GMA, competências e disposições pertinentes à atuação da corporação, no que estiver vigente","subs":[]},{"id":"gma3_top_265","text":"3. Lei Complementar nº 194/2023 — estrutura administrativa e operacional da Guarda Municipal/Polícia Municipal de Aracaju, Plano de Carreira, atribuições, competências, hierarquia, organização, ingresso, regime funcional e disposições correlatas","subs":[]},{"id":"gma3_top_266","text":"4. Lei 6.260/2026 SSM/AJU","subs":[]},{"id":"gma3_top_267","text":"5. Lei Complementar nº 224/2026 — alteração da nomenclatura da Guarda Municipal de Aracaju para Polícia Municipal de Aracaju, sem alteração das competências e da estrutura funcional da corporação","subs":[]},{"id":"gma3_top_268","text":"6. Lei Complementar nº 153/2016 — Estatuto dos Servidores Públicos do Município de Aracaju, no que couber","subs":[{"id":"gma3_top_269","text":"6.1 Provimento","subs":[]},{"id":"gma3_top_270","text":"6.2 Posse","subs":[]},{"id":"gma3_top_271","text":"6.3 Exercício","subs":[]},{"id":"gma3_top_272","text":"6.4 Estágio probatório","subs":[]},{"id":"gma3_top_273","text":"6.5 Direitos","subs":[]},{"id":"gma3_top_274","text":"6.6 Deveres","subs":[]},{"id":"gma3_top_275","text":"6.7 Responsabilidades","subs":[]},{"id":"gma3_top_276","text":"6.8 Regime disciplinar","subs":[]},{"id":"gma3_top_277","text":"6.9 Processo administrativo disciplinar","subs":[]}]}]}];
var _GMA_LEIS = [{"id":"gma3_lei_1","name":"CF/88 — Tít. I: Princípios Fundamentais (Arts. 1º a 4º)","arts":[1,2,3,4]},{"id":"gma3_lei_2","name":"CF/88 — Tít. II: Direitos e Garantias Fundamentais — Individuais e Coletivos (Art. 5º)","arts":[5]},{"id":"gma3_lei_3","name":"CF/88 — Tít. II: Direitos Sociais, Nac., Pol. (Arts. 6º a 17)","arts":[6,7,8,9,10,11,12,13,14,15,16,17]},{"id":"gma3_lei_4","name":"CF/88 — Tít. III: Organização do Estado (Arts. 18 a 43)","arts":[18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43]},{"id":"gma3_lei_5","name":"CF/88 — Tít. IV: Administração Pública — Art. 37 a 41","arts":[37,38,39,40,41]},{"id":"gma3_lei_6","name":"CF/88 — Tít. V: Defesa do Estado — Segurança Pública (Arts. 136 a 144)","arts":[136,137,138,139,140,141,142,143,144]},{"id":"gma3_lei_7","name":"CF/88 — Tít. VII: Política Urbana (Arts. 182 e 183)","arts":[182,183]},{"id":"gma3_lei_8","name":"CF/88 — Tít. VIII: Meio Ambiente, Família, Criança, Idoso (Arts. 225 a 232)","arts":[225,226,227,228,229,230,231,232]},{"id":"gma3_lei_9","name":"CP — Parte Geral — Aplicação da Lei Penal (Arts. 1º a 12)","arts":[1,2,3,4,5,6,7,8,9,10,11,12]},{"id":"gma3_lei_10","name":"CP — Parte Geral — Do Crime: Relação de Causalidade e Tipicidade (Arts. 13 a 21)","arts":[13,14,15,16,17,18,19,20,21]},{"id":"gma3_lei_11","name":"CP — Parte Geral — Ilicitude e Culpabilidade (Arts. 22 a 28)","arts":[22,23,24,25,26,27,28]},{"id":"gma3_lei_12","name":"CP — Parte Geral — Concurso de Pessoas (Arts. 29 a 31)","arts":[29,30,31]},{"id":"gma3_lei_13","name":"CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)","arts":[121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154]},{"id":"gma3_lei_14","name":"CP — Parte Especial — Crimes Contra o Patrimônio (Arts. 155 a 183)","arts":[155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183]},{"id":"gma3_lei_15","name":"CP — Parte Especial — Crimes Contra a Dignidade Sexual (Arts. 213 a 234-C)","arts":[213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234]},{"id":"gma3_lei_16","name":"CP — Parte Especial — Crimes Contra a Fé Pública (Arts. 289 a 311-A)","arts":[289,290,291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311]},{"id":"gma3_lei_17","name":"CP — Parte Especial — Crimes Contra a Adm. Pública (Arts. 312 a 359-H)","arts":[312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,346,347,348,349,350,351,352,353,354,355,356,357,358,359]},{"id":"gma3_lei_18","name":"CPP — Inquérito Policial (Arts. 4º a 23)","arts":[4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]},{"id":"gma3_lei_19","name":"CPP — Ação Penal (Arts. 24 a 62)","arts":[24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62]},{"id":"gma3_lei_20","name":"CPP — Da Prova — Disposições Gerais, Corpo de Delito, Custódia, Perícias (Arts. 155 a 184)","arts":[155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184]},{"id":"gma3_lei_21","name":"CPP — Prisão em Flagrante (Arts. 301 a 310)","arts":[301,302,303,304,305,306,307,308,309,310]},{"id":"gma3_lei_22","name":"CPP — Prisão, Medidas Cautelares e Liberdade Provisória (Arts. 282 a 300)","arts":[282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300]},{"id":"gma3_lei_23","name":"CPP — Busca e Apreensão (Arts. 240 a 250)","arts":[240,241,242,243,244,245,246,247,248,249,250]},{"id":"gma3_lei_24","name":"CPP — Garantias Constitucionais e Direitos do Preso (Arts. 185 a 200)","arts":[185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200]},{"id":"gma3_lei_25","name":"Declaração Universal dos Direitos Humanos (DUDH — 1948)","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]},{"id":"gma3_lei_26","name":"Convenção Americana sobre Direitos Humanos — Pacto de São José (Arts. 1º a 32)","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]},{"id":"gma3_lei_27","name":"Lei nº 13.022/2014 — Estatuto Geral das Guardas Municipais (Arts. 1º a 36)","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]},{"id":"gma3_lei_28","name":"Lei nº 13.675/2018 — SUSP — Sistema Único de Segurança Pública (Arts. 1º a 68)","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68]},{"id":"gma3_lei_29","name":"Decreto nº 11.841/2023 — Cooperação das Guardas Municipais (Arts. 1º a 10)","arts":[1,2,3,4,5,6,7,8,9,10]},{"id":"gma3_lei_30","name":"Lei nº 11.343/2006 — Lei de Drogas (Arts. 1º a 75)","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75]},{"id":"gma3_lei_31","name":"Lei nº 7.716/1989 — Crimes de Preconceito de Raça ou Cor (Arts. 1º a 22)","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22]},{"id":"gma3_lei_32","name":"Lei nº 14.532/2023 — Injúria Racial (Arts. 1º a 4)","arts":[1,2,3,4]},{"id":"gma3_lei_33","name":"Lei nº 12.288/2010 — Estatuto da Igualdade Racial (Arts. 1º a 65)","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65]},{"id":"gma3_lei_34","name":"Lei nº 8.069/1990 — ECA — Estatuto da Criança e do Adolescente (Arts. 1º a 267)","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267]},{"id":"gma3_lei_35","name":"Lei nº 9.605/1998 — Crimes Contra o Meio Ambiente (Arts. 1º a 82)","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82]},{"id":"gma3_lei_36","name":"Lei nº 9.503/1997 — CTB — Código de Trânsito Brasileiro — Crimes (Arts. 291 a 312-A)","arts":[291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312]},{"id":"gma3_lei_37","name":"Lei nº 10.826/2003 — Estatuto do Desarmamento (Arts. 1º a 37)","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37]},{"id":"gma3_lei_38","name":"Lei nº 11.340/2006 — Lei Maria da Penha (Arts. 1º a 46)","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46]},{"id":"gma3_lei_39","name":"Lei nº 13.869/2019 — Lei de Abuso de Autoridade (Arts. 1º a 45)","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45]},{"id":"gma3_lei_40","name":"Lei nº 9.455/1997 — Lei de Tortura (Arts. 1º a 10)","arts":[1,2,3,4,5,6,7,8,9,10]},{"id":"gma3_lei_41","name":"Decreto nº 6.040/2007 — Política Nacional de Des. Sustentável dos Povos Tradicionais (Arts. 1º a 12)","arts":[1,2,3,4,5,6,7,8,9,10,11,12]},{"id":"gma3_lei_42","name":"Decreto nº 10.088/2019 — Convenção nº 169 OIT — Povos Indígenas e Tribais","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44]},{"id":"gma3_lei_43","name":"Lei nº 14.701/2023 — Marco Temporal Indígena (Arts. 1º a 30)","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]},{"id":"gma3_lei_44","name":"Lei Orgânica do Município de Aracaju/SE — Organização, Competências, Segurança (Arts. 1º a 10)","arts":[1,2,3,4,5,6,7,8,9,10]},{"id":"gma3_lei_45","name":"Lei Municipal nº 1.659/1990 — Criação da GMA — Guarda Municipal de Aracaju","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]},{"id":"gma3_lei_46","name":"Lei Complementar nº 194/2023 — Estrutura e Plano de Carreira da GMA/PM de Aracaju","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50]},{"id":"gma3_lei_47","name":"Lei 6.260/2026 SSM/AJU — Segurança Municipal de Aracaju","arts":[1,2,3,4,5,6,7,8,9,10]},{"id":"gma3_lei_48","name":"Lei Complementar nº 224/2026 — Renomeação GMA para Polícia Municipal de Aracaju","arts":[1,2,3,4,5]},{"id":"gma3_lei_49","name":"Lei Complementar nº 153/2016 — Estatuto dos Servidores Públicos de Aracaju","arts":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199]}];

function _injetarDadosGMA(){
  try{
    var meta = JSON.parse(localStorage.getItem('protocolo_concursos_meta')||'[]');
    var ativo = localStorage.getItem('protocolo_concurso_ativo');
    meta.forEach(function(c){
      var nome = (c.nome||'').toUpperCase();
      var isGMA = nome.indexOf('GMA')!==-1 || nome.indexOf('POLICIAL MUNICIPAL')!==-1 || nome.indexOf('GUARDA MUNICIPAL')!==-1 || nome.indexOf('POLÍCIA MUNICIPAL')!==-1;
      if(isGMA){
        var edKey  = 'pmal26_edital_cfg_'+c.id;
        var leisKey= 'pmal26_leis_cfg_'+c.id;
        var existingEd = localStorage.getItem(edKey);
        var existingLeis = localStorage.getItem(leisKey);
        // FASE 9.4.12: Pós-edital GMA. Verificar se já tem a versão nova (gma3_disc_1).
        // Se ainda tem a versão antiga (gma2_disc_1 ou gma_disc_1), substituir pela nova.
        var precisaAtualizar = false;
        if(existingEd){
          try{
            var ed = JSON.parse(existingEd);
            var firstId = (ed && ed.edital && ed.edital[0]) ? ed.edital[0].id : '';
            // Versão antiga: gma2_disc_* ou gma_disc_*. Nova: gma3_disc_*
            precisaAtualizar = firstId && !firstId.startsWith('gma3_');
          }catch(e){ precisaAtualizar = true; }
        }
        if(!existingEd || precisaAtualizar){
          // Preservar blocos existentes ao atualizar
          var blocos = [];
          if(existingEd){ try{ var old=JSON.parse(existingEd); blocos=old.blocos||[]; }catch(e){} }
          localStorage.setItem(edKey, JSON.stringify({edital:_GMA_EDITAL, blocos:blocos}));
        }
        // FASE 9.4.12.1: verificar versão da Leitura — forçar se ainda é versão antiga
        var precisaAtualLeis = false;
        if(existingLeis){
          try{
            var lc = JSON.parse(existingLeis);
            var firstLeiId = (lc && lc.leis && lc.leis[0]) ? lc.leis[0].id : '';
            precisaAtualLeis = firstLeiId && !firstLeiId.startsWith('gma3_lei_');
          }catch(e){ precisaAtualLeis = true; }
        }
        if(!existingLeis || precisaAtualLeis){
          var leisBlocos = [];
          if(existingLeis){ try{ var oldLc=JSON.parse(existingLeis); leisBlocos=oldLc.blocos||[]; }catch(e){} }
          localStorage.setItem(leisKey, JSON.stringify({leis:_GMA_LEIS, blocos:leisBlocos}));
        }
        // FASE 9.4.12: Atualizar metadados do concurso GMA
        var metaAtualizado = false;
        if(c.nome === 'GMA' || c.nome === 'GUARDA MUNICIPAL DE ARACAJU - GMA'){
          c.nome = 'Guarda Municipal de Aracaju';
          metaAtualizado = true;
        }
        // FASE 9.4.12.1: atualizar cargo apenas (dataProva e dataInicio não são mais forçados
        // para permitir que edições manuais do usuário persistam — FASE 9.4.12.2 hotfix)
        if(c.cargo === 'Guarda Municipal' || c.cargo === 'Guarda Municipal de Aracaju'){
          c.cargo = '';
          metaAtualizado = true;
        }
        if(metaAtualizado){
          try{ localStorage.setItem('protocolo_concursos_meta', JSON.stringify(meta)); }catch(e){}
        }
        // Só atualiza arrays globais em MEMÓRIA se a GMA for o concurso ATIVO agora
        // NUNCA sobrescrever EDITAL se outro concurso estiver ativo
        // FASE 9.4.12.2 hotfix: sincronização de datas removida para não sobrescrever
        // edições manuais do usuário. O cronograma global pertence ao concurso ativo (PMAL),
        // e não deve ser alterado pela lógica da GMA.
        if(ativo===c.id){
          // Recarrega do localStorage (que pode ter dados editados) para refletir em memória
          var curEd = localStorage.getItem(edKey);
          var curLeis = localStorage.getItem(leisKey);
          if(curEd){
            try{
              var pEd = JSON.parse(curEd);
              if(pEd && pEd.edital && typeof EDITAL!=='undefined'){
                EDITAL.length=0;
                pEd.edital.forEach(function(d){EDITAL.push(d);});
              }
            }catch(e){}
          }
          if(curLeis){
            try{
              var pLeis = JSON.parse(curLeis);
              if(pLeis && pLeis.leis && typeof LEIS_LEITURA!=='undefined'){
                LEIS_LEITURA.length=0;
                pLeis.leis.forEach(function(l){LEIS_LEITURA.push(l);});
              }
            }catch(e){}
          }
        }
        // Se a GMA NÃO é ativa: apenas garante que o localStorage está correto.
        // EDITAL e LEIS_LEITURA permanecem com os dados do concurso ativo.
      }
    });
  }catch(e){console.warn('_injetarDadosGMA erro:',e);}
}

// Roda assim que o DOM estiver pronto
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', _injetarDadosGMA);
} else {
  _injetarDadosGMA();
}
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
//  _CM — CONTEST MANAGER (gerenciador de estado por concurso)
//  Fonte de verdade única para dados específicos do concurso ativo.
//  Banco de Questões, Flashcards e Simulados continuam globais/shared.
// ══════════════════════════════════════════════════════════════════
var _CM = {
  // Datasets do concurso ativo (isolados)
  edital: [],
  leis: [],
  _concursoId: null,

  // Carrega os datasets do concurso ativo do localStorage
  // CORREÇÃO ARQUITETURAL: NÃO usar EDITAL/LEIS_LEITURA globais como fallback.
  // A constante global pode estar contaminada por troca anterior de concurso.
  // Se a chave per-concurso não existe, inicializa VAZIA e grava — isolamento total.
  load: function(concursoId){
    this._concursoId = concursoId;
    var edKey  = 'pmal26_edital_cfg_'+concursoId;
    var leisKey= 'pmal26_leis_cfg_'+concursoId;
    // Carrega edital — sem fallback para constante global
    try{
      var ec = JSON.parse(localStorage.getItem(edKey)||'null');
      if(ec && ec.edital){
        this.edital = ec.edital;
        // Preservar blocos carregados no objeto (para referência)
        this._edBlocos = ec.blocos || [];
      } else {
        // Concurso novo/limpo: começa vazio — preservar blocos existentes se houver
        this.edital = [];
        this._edBlocos = (ec && ec.blocos) ? ec.blocos : [];
        var edSave = {edital:[], blocos: this._edBlocos};
        try{ localStorage.setItem(edKey, JSON.stringify(edSave)); }catch(e){}
      }
    }catch(e){ this.edital = []; this._edBlocos = []; }
    // Carrega leis — sem fallback para constante global
    try{
      var lc = JSON.parse(localStorage.getItem(leisKey)||'null');
      if(lc && lc.leis){
        this.leis = lc.leis;
        this._leisBlocos = lc.blocos || [];
      } else {
        this.leis = [];
        this._leisBlocos = (lc && lc.blocos) ? lc.blocos : [];
        var leisSave = {leis:[], blocos: this._leisBlocos};
        try{ localStorage.setItem(leisKey, JSON.stringify(leisSave)); }catch(e){}
      }
    }catch(e){ this.leis = []; this._leisBlocos = []; }
    // Sincroniza os arrays globais para compatibilidade com código legado
    this._syncGlobals();
  },

  // Salva edital e leis atuais no localStorage para o concurso
  // CRÍTICO: preservar os blocos já salvos — não sobrescrever com {edital} sem blocos
  save: function(concursoId){
    var id = concursoId || this._concursoId;
    if(!id) return;
    try{
      // Edital: preservar blocos existentes na chave
      var edKey = 'pmal26_edital_cfg_'+id;
      var edExisting = null;
      try{ edExisting = JSON.parse(localStorage.getItem(edKey)||'null'); }catch(e){}
      var edBlocos = (edExisting && edExisting.blocos) ? edExisting.blocos : [];
      localStorage.setItem(edKey, JSON.stringify({edital:this.edital, blocos:edBlocos}));
    }catch(e){}
    try{
      // Leis: preservar blocos existentes na chave
      var leisKey = 'pmal26_leis_cfg_'+id;
      var leisExisting = null;
      try{ leisExisting = JSON.parse(localStorage.getItem(leisKey)||'null'); }catch(e){}
      var leisBlocos = (leisExisting && leisExisting.blocos) ? leisExisting.blocos : [];
      localStorage.setItem(leisKey, JSON.stringify({leis:this.leis, blocos:leisBlocos}));
    }catch(e){}
  },

  // Sincroniza os arrays globais (para compatibilidade com código que ainda usa EDITAL/LEIS_LEITURA direto)
  _syncGlobals: function(){
    // Sincroniza EDITAL global
    if(typeof EDITAL !== 'undefined'){
      EDITAL.length = 0;
      this.edital.forEach(function(d){ EDITAL.push(d); });
    }
    // Sincroniza LEIS_LEITURA global
    if(typeof LEIS_LEITURA !== 'undefined'){
      LEIS_LEITURA.length = 0;
      this.leis.forEach(function(l){ LEIS_LEITURA.push(l); });
    }
  },

  // Troca de concurso: salva o atual e carrega o novo
  switch: function(novoConcursoId){
    if(this._concursoId && this._concursoId !== novoConcursoId){
      this.save(this._concursoId);
    }
    this.load(novoConcursoId);
  },

  // Getters convenientes
  getEdital: function(){ return this.edital; },
  getLeis: function(){ return this.leis; },
};
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════
//  PRESET DE LEIS — PMAL 2026 / OFICIAL
//  Injeta as leis corretas no concurso PMAL/Oficial
//  sem depender de backup importado.
// ══════════════════════════════════════════════
var _PMAL_LEIS = [{"id": "lei_1776899017137", "name": "Constituição do Estado de Alagoas", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285]}, {"id": "cf_t1", "name": "CF/88 — Título I: Princípios Fundamentais (Arts. 1º a 4º)", "arts": [1, 2, 3, 4]}, {"id": "cf_t2", "name": "CF/88 — Título II: Direitos e Garantias Fundamentais (Arts. 5º a 17)", "arts": [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]}, {"id": "cf_t3", "name": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "arts": [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]}, {"id": "cf_t4", "name": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "arts": [44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135]}, {"id": "cf_t5", "name": "CF/88 — Título V: Defesa do Estado e das Instituições (Arts. 136 a 144)", "arts": [136, 137, 138, 139, 140, 141, 142, 143, 144]}, {"id": "cf_t6", "name": "CF/88 — Título VI: Tributação e Orçamento (Arts. 145 a 169)", "arts": [145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169]}, {"id": "cf_t7", "name": "CF/88 — Título VII: Ordem Econômica e Financeira (Arts. 170 a 192)", "arts": [170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192]}, {"id": "cf_t8", "name": "CF/88 — Título VIII: Ordem Social (Arts. 193 a 232)", "arts": [193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232]}, {"id": "cf_t9", "name": "CF/88 — Título IX: Disposições Gerais (Arts. 233 a 250)", "arts": [233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250]}, {"id": "cp_t1", "name": "CP — Parte Geral — Título I: Aplicação da Lei Penal (Arts. 1º a 12)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}, {"id": "cp_t2", "name": "CP — Parte Geral — Título II: Do Crime (Arts. 13 a 25)", "arts": [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]}, {"id": "cp_t3", "name": "CP — Parte Geral — Título III: Imputabilidade Penal (Arts. 26 a 28)", "arts": [26, 27, 28]}, {"id": "cp_pessoa", "name": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "arts": [121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154]}, {"id": "cp_patrimonio", "name": "CP — Parte Especial — Crimes Contra o Patrimônio (Arts. 155 a 183)", "arts": [155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183]}, {"id": "cp_adm", "name": "CP — Parte Especial — Crimes Contra a Administração Pública (Arts. 312 a 359-H)", "arts": [312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366]}, {"id": "cadh", "name": "Convenção Americana sobre Direitos Humanos — Pacto de São José (Arts. 1º a 82)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82]}, {"id": "cpm_ap", "name": "CPM — Aplicação da Lei Penal Militar (Arts. 1º a 28)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]}, {"id": "cpm_crime", "name": "CPM — Do Crime (Arts. 29 a 47)", "arts": [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]}, {"id": "cpm_imput", "name": "CPM — Imputabilidade Penal (Arts. 48 a 52)", "arts": [48, 49, 50, 51, 52]}, {"id": "cpm_concurso", "name": "CPM — Concurso de Agentes (Arts. 53 a 54)", "arts": [53, 54]}, {"id": "cpm_penas", "name": "CPM — Penas e Aplicação (Arts. 55 a 109)", "arts": [55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109]}, {"id": "cpm_medidas", "name": "CPM — Medidas de Segurança (Arts. 110 a 120)", "arts": [110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120]}, {"id": "cpm_acao", "name": "CPM — Ação Penal (Arts. 121 a 122)", "arts": [121, 122]}, {"id": "cpm_extincao", "name": "CPM — Extinção da Punibilidade (Arts. 123 a 135)", "arts": [123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135]}, {"id": "cppm_01", "name": "CPPM — Processo Penal Militar e Aplicação (Arts. 1º a 6º)", "arts": [1, 2, 3, 4, 5, 6]}, {"id": "cppm_02", "name": "CPPM — Polícia Judiciária Militar (Arts. 7º a 8º)", "arts": [7, 8]}, {"id": "cppm_03", "name": "CPPM — Inquérito Policial Militar (Arts. 9º a 28)", "arts": [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]}, {"id": "cppm_04", "name": "CPPM — Ação Penal Militar (Arts. 29 a 37)", "arts": [29, 30, 31, 32, 33, 34, 35, 36, 37]}, {"id": "cppm_05", "name": "CPPM — Processo (Arts. 38 a 39)", "arts": [38, 39]}, {"id": "cppm_06", "name": "CPPM — Juiz, Auxiliares e Partes (Arts. 40 a 76)", "arts": [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76]}, {"id": "cppm_07", "name": "CPPM — Denúncia (Arts. 77 a 87)", "arts": [77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87]}, {"id": "cppm_08", "name": "CPPM — Questões Prejudiciais (Arts. 88 a 94)", "arts": [88, 89, 90, 91, 92, 93, 94]}, {"id": "cppm_09", "name": "CPPM — Exceções (Arts. 95 a 104)", "arts": [95, 96, 97, 98, 99, 100, 101, 102, 103, 104]}, {"id": "cppm_10", "name": "CPPM — Incidente de Sanidade Mental (Arts. 105 a 111)", "arts": [105, 106, 107, 108, 109, 110, 111]}, {"id": "cppm_11", "name": "CPPM — Incidente de Falsidade Documental (Arts. 112 a 116)", "arts": [112, 113, 114, 115, 116]}, {"id": "cppm_12", "name": "CPPM — Medidas Preventivas/Assecuratórias (Arts. 117 a 138)", "arts": [117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138]}, {"id": "cppm_13", "name": "CPPM — Providências sobre Coisas (Arts. 139 a 170)", "arts": [139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170]}, {"id": "cppm_14", "name": "CPPM — Providências sobre Pessoas (Arts. 171 a 273)", "arts": [171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273]}, {"id": "cppm_15", "name": "CPPM — Citação, Intimação e Notificação (Arts. 274 a 306)", "arts": [274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306]}, {"id": "cppm_16", "name": "CPPM — Atos Probatórios (Arts. 307 a 385)", "arts": [307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385]}, {"id": "cppm_17", "name": "CPPM — Processos em Espécie (Arts. 386 a 448)", "arts": [386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448]}, {"id": "cppm_18", "name": "CPPM — Nulidades (Arts. 499 a 503)", "arts": [499, 500, 501, 502, 503]}, {"id": "cppm_19", "name": "CPPM — Recursos (Arts. 504 a 541)", "arts": [504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541]}, {"id": "cppm_20", "name": "CPPM — Execução (Arts. 542 a 625)", "arts": [542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558, 559, 560, 561, 562, 563, 564, 565, 566, 567, 568, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 579, 580, 581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597, 598, 599, 600, 601, 602, 603, 604, 605, 606, 607, 608, 609, 610, 611, 612, 613, 614, 615, 616, 617, 618, 619, 620, 621, 622, 623, 624, 625]}, {"id": "leg_estat_pmal", "name": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135]}, {"id": "leg_rdpm", "name": "Dec. Est. nº 37.042/1996 — Regulamento Disciplinar da PMAL (Arts. 1 a 107)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107]}, {"id": "leg_org_pm", "name": "Lei Federal nº 14.751/2023 — Lei Orgânica da Polícia Militar (Arts. 1 a 44)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44]}, {"id": "lei_org_crim", "name": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]}, {"id": "lei_tortura", "name": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]}, {"id": "lei_meio_amb", "name": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]}, {"id": "lei_desarmamento", "name": "LEI Nº 9.455/1997 — CRIMES DE TORTURA (ARTS. 1 A 4)", "arts": [1, 2, 3, 4]}, {"id": "lei_drogas", "name": "LEI Nº 9.605/1998 — CRIMES CONTRA O MEIO AMBIENTE (ARTS. 1 A 82)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82]}, {"id": "lei_maria_penha", "name": "LEI Nº 10.826/2003 — ESTATUTO DO DESARMAMENTO (ARTS. 1 A 37)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37]}, {"id": "lei_ctb", "name": "LEI Nº 11.343/2006 — LEI DE DROGAS (ARTS. 1 A 75)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75]}, {"id": "lei_eca", "name": "LEI Nº 11.340/2006 — LEI MARIA DA PENHA (ARTS. 1 A 46)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46]}, {"id": "lei_abuso_aut", "name": "LEI Nº 9.503/1997 — CÓDIGO DE TRÂNSITO BRASILEIRO (ARTS.  291 a 312-A) - CRIMES", "arts": [291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312]}, {"id": "lei_pris_temp", "name": "LEI Nº 8.069/1990 — ESTATUTO DA CRIANÇA E DO ADOLESCENTE (ARTS. 225 A 244) - CRIMES", "arts": [225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244]}, {"id": "lei_jec", "name": "LEI Nº 13.869/2019 — ABUSO DE AUTORIDADE (ARTS. 1 A 45)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]}, {"id": "lei_jecf", "name": "LEI Nº 7.960/1989 — PRISÃO TEMPORÁRIA (ARTS. 1 A 3)", "arts": [1, 2, 3]}, {"id": "lei_1778460051331", "name": "LEI Nº 9.099/1995 — JUIZADOS ESPECIAIS (ARTS. 1 A 98)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98]}, {"id": "lei_1778460060393", "name": "LEI Nº 10.259/2001 — JUIZADOS ESPECIAIS FEDERAIS (ARTS. 1 A 28)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]}];

function _injetarDadosPMAL(){
  try{
    var meta = JSON.parse(localStorage.getItem('protocolo_concursos_meta')||'[]');
    var ativo = localStorage.getItem('protocolo_concurso_ativo');
    meta.forEach(function(c){
      var nome  = (c.nome ||'').toUpperCase();
      var cargo = (c.cargo||'').toUpperCase();
      var isPMAL = (nome.indexOf('PMAL')!==-1||nome.indexOf('POLICIAL MILITAR')!==-1) && cargo.indexOf('OFICIAL')!==-1;
      if(isPMAL){
        var leisKey = 'pmal26_leis_cfg_'+c.id;
        // Só injeta se a chave ainda não tiver dados (evita sobrescrever edições manuais)
        var existing = localStorage.getItem(leisKey);
        if(!existing){
          localStorage.setItem(leisKey, JSON.stringify({leis:_PMAL_LEIS}));
        }
        // Se este concurso é o ativo, atualiza LEIS_LEITURA em memória
        if(ativo===c.id){
          if(typeof LEIS_LEITURA!=='undefined'){
            LEIS_LEITURA.length=0;
            _PMAL_LEIS.forEach(function(l){LEIS_LEITURA.push(l);});
          }
          if(typeof _CM!=='undefined'){
            _CM.leis=_PMAL_LEIS.slice();
          }
        }
      }
    });
  }catch(e){console.warn('_injetarDadosPMAL erro:',e);}
}
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
//  BASE_DATA — DADOS BASE EMBUTIDOS NO HTML
//
//  Estrutura distribuível: concursos, banco, flashcards, simulados
//  e cronograma modelo, todos sanitizados (sem dados pessoais).
//
//  Separação arquitetural:
//    BASE_DATA  → embutido no HTML, igual para todos os usuários
//    userData   → criado no localStorage, individual por usuário
// ══════════════════════════════════════════════════════════════════
var BASE_DATA = {"concursos": [{"id": "conc_1778033725540", "nome": "PMAL - OFICIAL", "cargo": "", "banca": "CEBRASPE", "dataProva": "2026-07-19", "dataInicio": "2026-04-12", "criadoEm": "2026-04-12T00:00:00.000Z"}, {"id": "conc_1778158115433", "nome": "PMAL - SOLDADO", "cargo": "", "banca": "CEBRASPE", "dataProva": "2026-07-19", "dataInicio": "2026-04-12", "criadoEm": "2026-05-07T00:00:00.000Z"}, {"id": "conc_1778290317959", "nome": "GMA", "cargo": "Guarda Municipal", "banca": "IDECAN", "dataProva": "2026-12-10", "dataInicio": "2026-05-07", "criadoEm": "2026-05-07T00:00:00.000Z"}], "cronCfg": {"ciclo": [{"dia": 1, "label": "DOM", "tasks": [{"id": "c1_1", "cat": "Simulado", "desc": "Realizar um simulado completo", "type": "simulado", "_opcio": true}, {"id": "c1_2", "cat": "Redação", "desc": "Treinar redação dissertativa-argumentativa", "type": "simulado", "_opcio": true}, {"id": "c1_3", "cat": "Revisão Semanal", "desc": "Revisar os principais pontos da semana", "type": "revisao", "_opcio": false}, {"id": "c1_x1777037914478", "cat": "Revisões Espaçadas", "desc": "Revisar as Questões e Flashcards", "type": "revisao", "_opcio": true}]}, {"dia": 2, "label": "SEG", "tasks": [{"id": "c2_1", "cat": "Português", "desc": "1 Assunto Completo + 25 Questões de um Assunto— Professor Alexandre Soares", "type": "video", "_opcio": false}, {"id": "c2_2", "cat": "Direito Penal Militar", "desc": "1 PDF do Caveira — Marcações no material do Legislação 360", "type": "leitura", "_opcio": false}, {"id": "c2_3", "cat": "Extra", "desc": "Direito Administrativo - Ver os Resumos", "type": "leitura", "_opcio": true}, {"id": "c2_x1777037912293", "cat": "Revisões Espaçadas", "desc": "Revisar as Questões e Flashcards", "type": "revisao", "_opcio": true}]}, {"dia": 3, "label": "TER", "tasks": [{"id": "c3_1", "cat": "Direito Penal", "desc": "Vídeo aula + Criação do Resumo — Juliano Yamakaua (DSO)", "type": "leitura", "_opcio": false}, {"id": "c3_2", "cat": "Informática", "desc": "1 Assunto Completo + Criação do Resumo (PROVA) — Rani Passos", "type": "resumo", "_opcio": false}, {"id": "c3_3", "cat": "Extra", "desc": "Leitura de Cabeceira - Abuso de Autoridade", "type": "leitura", "_opcio": true}, {"id": "c3_x1777037910656", "cat": "Revisões Espaçadas", "desc": "Revisar as Questões e Flashcards", "type": "revisao", "_opcio": true}]}, {"dia": 4, "label": "QUA", "tasks": [{"id": "c4_1", "cat": "Direito Constitucional", "desc": "1 Assunto Completo  — Dal Piva", "type": "leitura", "_opcio": false}, {"id": "c4_2", "cat": "Legislação Extravagante", "desc": "1  Legislação completa — Criação do Resumo / Vídeo Aula", "type": "resumo", "_opcio": false}, {"id": "c4_3", "cat": "Extra", "desc": "Direito Administrativo - Ver os Resumos", "type": "leitura", "_opcio": true}, {"id": "c4_x1777037909060", "cat": "Revisões Espaçadas", "desc": "Revisar as Questões e Flashcards", "type": "revisao", "_opcio": true}]}, {"dia": 5, "label": "QUI", "tasks": [{"id": "c5_1", "cat": "Processo Penal / PP Militar", "desc": "1 Assunto Completo — PDF Projeto Caveira ou Meus Resumos de Processo Penal", "type": "leitura", "_opcio": false}, {"id": "c5_2", "cat": "Legislação Institucional", "desc": "1 Parte da Lei Completa — Criação do Resumo / Vídeo Aula + Lei Seca", "type": "resumo", "_opcio": false}, {"id": "c5_3", "cat": "Extra", "desc": "Leitura de Cabeceira - Crimes do ECA", "type": "leitura", "_opcio": true}, {"id": "c5_x1778158217284", "cat": "Revisões Espaçadas", "desc": "Revisar as Questões e Flashcards", "type": "revisao", "_opcio": true}]}, {"dia": 6, "label": "SEX", "tasks": [{"id": "c6_1", "cat": "Matemática", "desc": "1 Assunto Completo — Sandro Curió -  Criação do Resumo (PROVA)", "type": "resumo", "_opcio": false}, {"id": "c6_2", "cat": "Sociologia & Filosofia", "desc": "1 Tópico Completo — Youtube ou Outros", "type": "resumo", "_opcio": false}, {"id": "c6_3", "cat": "Extra", "desc": "Leitura de Cabeceira - Crimes do CTB", "type": "leitura", "_opcio": true}, {"id": "c6_x1777037828615", "cat": "Revisões Espaçadas", "desc": "Revisar as Questões e Flashcards", "type": "revisao", "_opcio": true}]}, {"dia": 7, "label": "SÁB", "tasks": [{"id": "c7_1", "cat": "Conhecimentos de Alagoas", "desc": "1 Assunto Completo — Criação do Resumo", "type": "resumo", "_opcio": false}, {"id": "c7_2", "cat": "Biologia & Quimica", "desc": "1 Tópico Completo — Youtube ou IA's", "type": "resumo", "_opcio": false}, {"id": "c7_3", "cat": "Leitura de Cabeceira", "desc": "Lei Maria de Penha -  Fazendo as Marcações", "type": "leitura", "_opcio": true}, {"id": "c7_x1777037899818", "cat": "Revisões Espaçadas", "desc": "Revisar as Questões e Flashcards", "type": "revisao", "_opcio": true}]}], "inicio": "2026-04-10", "prova": "2026-07-19", "concurso": "PMAL", "cargo": "Oficial"}, "editalCfg": {"edital": [{"id": "port", "name": "Língua Portuguesa", "topics": [{"id": "p1", "text": "1 Compreensão e interpretação de textos de gêneros variados.", "subs": []}, {"id": "p2", "text": "2 Reconhecimento de tipos e gêneros textuais.", "subs": []}, {"id": "p3", "text": "3 Domínio da ortografia oficial.", "subs": []}, {"id": "p4", "text": "4 Domínio dos mecanismos de coesão textual.", "subs": [{"id": "p4_1", "text": "4.1 Emprego de elementos de referenciação, substituição e repetição, de conectores e de outros elementos de sequenciação textual."}, {"id": "p4_2", "text": "4.2 Emprego de tempos e modos verbais."}]}, {"id": "p5", "text": "5 Domínio da estrutura morfossintática do período.", "subs": [{"id": "p5_1", "text": "5.1 Emprego das classes de palavras."}, {"id": "p5_2", "text": "5.2 Relações de coordenação entre orações e entre termos da oração."}, {"id": "p5_3", "text": "5.3 Relações de subordinação entre orações e entre termos da oração."}, {"id": "p5_4", "text": "5.4 Emprego dos sinais de pontuação."}, {"id": "p5_5", "text": "5.5 Concordância verbal e nominal."}, {"id": "p5_6", "text": "5.6 Regência verbal e nominal."}, {"id": "p5_7", "text": "5.7 Emprego do sinal indicativo de crase."}, {"id": "p5_8", "text": "5.8 Colocação dos pronomes átonos."}]}, {"id": "p6", "text": "6 Reescrita de frases e parágrafos do texto.", "subs": [{"id": "p6_1", "text": "6.1 Significação das palavras."}, {"id": "p6_2", "text": "6.2 Substituição de palavras ou de trechos de texto."}, {"id": "p6_3", "text": "6.3 Reorganização da estrutura de orações e de períodos do texto."}, {"id": "p6_4", "text": "6.4 Reescrita de textos de diferentes gêneros e níveis de formalidade."}]}]}, {"id": "ing", "name": "Língua Estrangeira (Inglês)", "topics": [{"id": "i1", "text": "1. Compreensão de textos em língua inglesa.", "subs": []}, {"id": "i2", "text": "2. Itens gramaticais relevantes para a compreensão dos conteúdos semânticos.", "subs": []}]}, {"id": "info", "name": "Noções de Informática", "topics": [{"id": "inf1", "text": "1 Noções de sistema operacional (ambientes Linux e Windows).", "subs": []}, {"id": "inf2", "text": "2 Edição de textos, planilhas e apresentações (ambientes Microsoft Office e LibreOffice).", "subs": []}, {"id": "inf3", "text": "3 Redes de computadores.", "subs": [{"id": "inf3_1", "text": "3.1 Conceitos básicos, ferramentas, aplicativos e procedimentos de Internet e intranet."}, {"id": "inf3_2", "text": "3.2 Programas de navegação (Microsoft Internet Explorer, Mozilla Firefox e Google Chrome)."}, {"id": "inf3_3", "text": "3.3 Programas de correio eletrônico (Outlook Express e Mozilla Thunderbird)."}, {"id": "inf3_4", "text": "3.4 Sítios de busca e pesquisa na Internet."}, {"id": "inf3_5", "text": "3.5 Grupos de discussão."}, {"id": "inf3_6", "text": "3.6 Redes sociais."}, {"id": "inf3_7", "text": "3.7 Computação na nuvem (cloud computing)."}]}, {"id": "inf4", "text": "4 Noções de organização e de gerenciamento de informações, arquivos, pastas e programas.", "subs": []}, {"id": "inf5", "text": "5 Segurança da informação.", "subs": [{"id": "inf5_1", "text": "5.1 Procedimentos de segurança."}, {"id": "inf5_2", "text": "5.2 Noções de vírus, worms e pragas virtuais."}, {"id": "inf5_3", "text": "5.3 Aplicativos para segurança (antivírus, firewall, anti-spyware etc.)."}, {"id": "inf5_4", "text": "5.4 Procedimentos de backup."}, {"id": "inf5_5", "text": "5.5 Armazenamento de dados na nuvem (cloud storage)."}]}]}, {"id": "al", "name": "Conhecimentos do Estado de Alagoas", "topics": [{"id": "al1", "text": "1 Formação histórica de Alagoas.", "subs": [{"id": "al1_1", "text": "1.1 Colonização portuguesa."}, {"id": "al1_2", "text": "1.2 Economia açucareira."}, {"id": "al1_3", "text": "1.3 Emancipação política da Capitania de Pernambuco em 1817."}, {"id": "al1_4", "text": "1.4 Elevação à Província em 1821."}]}, {"id": "al2", "text": "2 Quilombo dos Palmares.", "subs": [{"id": "al2_1", "text": "2.1 Formação no período colonial."}, {"id": "al2_2", "text": "2.2 Resistência à escravidão."}, {"id": "al2_3", "text": "2.3 Liderança de Zumbi dos Palmares."}]}, {"id": "al3", "text": "3 Aspectos geográficos.", "subs": [{"id": "al3_1", "text": "3.1 Litoral, Zona da Mata, Agreste e Sertão."}, {"id": "al3_2", "text": "3.2 Rio São Francisco."}]}, {"id": "al4", "text": "4 Organização político-administrativa.", "subs": [{"id": "al4_1", "text": "4.1 Maceió como capital estadual."}, {"id": "al4_2", "text": "4.2 Municípios."}, {"id": "al4_3", "text": "4.3 Poderes Executivo, Legislativo e Judiciário."}]}, {"id": "al5", "text": "5 Economia estadual.", "subs": [{"id": "al5_1", "text": "5.1 Agroindústria canavieira."}, {"id": "al5_2", "text": "5.2 Turismo."}, {"id": "al5_3", "text": "5.3 Setor de serviços."}]}, {"id": "al6", "text": "6 Cultura e patrimônio.", "subs": [{"id": "al6_1", "text": "6.1 Manifestações culturais populares."}, {"id": "al6_2", "text": "6.2 Patrimônio histórico-cultural alagoano."}]}]}, {"id": "soc", "name": "I — Sociologia", "topics": [{"id": "s1", "text": "1 A constituição do saber sociológico.", "subs": [{"id": "s1_1", "text": "1.1 A sociologia como ciência."}, {"id": "s1_2", "text": "1.2 Ciência e senso comum."}, {"id": "s1_3", "text": "1.3 Subjetividade e objetividade."}, {"id": "s1_4", "text": "1.4 A sociologia e as ciências sociais."}, {"id": "s1_5", "text": "1.5 A questão metodológica nas ciências sociais e a pesquisa social."}]}, {"id": "s2", "text": "2 Estrutura e organização social.", "subs": [{"id": "s2_1", "text": "2.1 Estrutura da sociedade."}, {"id": "s2_2", "text": "2.2 Instituições sociais."}, {"id": "s2_3", "text": "2.3 Classes sociais, estratificação e desigualdade: Karl Marx e Max Weber."}, {"id": "s2_4", "text": "2.4 Classe social na sociedade ocidental atual: classes e estilos de vida."}]}, {"id": "s3", "text": "3 Problemas sociais contemporâneos.", "subs": [{"id": "s3_1", "text": "3.1 Desigualdades sociais."}, {"id": "s3_2", "text": "3.2 Exclusão social."}, {"id": "s3_3", "text": "3.3 Preconceito e discriminação."}, {"id": "s3_4", "text": "3.4 Movimentos sociais tradicionais e novos."}, {"id": "s3_5", "text": "3.5 Gênero e envelhecimento."}, {"id": "s3_6", "text": "3.6 Gênero e violência."}, {"id": "s3_7", "text": "3.7 Cultura e consumo."}, {"id": "s3_8", "text": "3.8 Violência e Estado."}, {"id": "s3_9", "text": "3.9 Migrações."}, {"id": "s3_10", "text": "3.10 Ética e cidadania."}, {"id": "s3_11", "text": "3.11 Sociedade, trabalho e emprego, relações sociais e transformações do trabalho."}, {"id": "s3_12", "text": "3.12 Os meios de comunicação e a questão ideológica."}, {"id": "s3_13", "text": "3.13 O meio ambiente e o desenvolvimento tecnológico."}, {"id": "s3_14", "text": "3.14 A globalização e os Estados nacionais."}, {"id": "s3_15", "text": "3.15 Diversidade cultural e étnicas."}, {"id": "s3_16", "text": "3.16 Religião e sociedade."}, {"id": "s3_17", "text": "3.17 Metodologia de ensino de sociologia."}]}]}, {"id": "fil", "name": "II — Filosofia", "topics": [{"id": "f1", "text": "1 Filosofia da ciência e teoria do conhecimento.", "subs": [{"id": "f1_1", "text": "1.1 Pré-socráticos."}, {"id": "f1_2", "text": "1.2 Sofistas."}, {"id": "f1_3", "text": "1.3 Sócrates, Platão e Aristóteles."}, {"id": "f1_4", "text": "1.4 Patrística (Agostinho)."}, {"id": "f1_5", "text": "1.5 Escolástica (Tomás de Aquino)."}, {"id": "f1_6", "text": "1.6 Racionalismo (Descartes)."}, {"id": "f1_7", "text": "1.7 Empirismo (Bacon e Locke)."}, {"id": "f1_8", "text": "1.8 Criticismo kantiano."}, {"id": "f1_9", "text": "1.9 Idealismo hegeliano."}, {"id": "f1_10", "text": "1.10 Materialismo histórico e dialético."}, {"id": "f1_11", "text": "1.11 Fenomenologia."}, {"id": "f1_12", "text": "1.12 Escola de Frankfurt e Teoria Crítica."}, {"id": "f1_13", "text": "1.13 Popper, Bachelard, Kuhn, Feyerabend."}]}, {"id": "f2", "text": "2 Ética.", "subs": [{"id": "f2_1", "text": "2.1 Origens da ética."}, {"id": "f2_2", "text": "2.2 Questões de ética contemporânea."}, {"id": "f2_3", "text": "2.3 Éticas deontológicas e éticas utilitaristas."}, {"id": "f2_4", "text": "2.4 Ética, ciência e novas tecnologias."}, {"id": "f2_5", "text": "2.5 Bioética."}]}, {"id": "f3", "text": "3 Filosofia política.", "subs": [{"id": "f3_1", "text": "3.1 Pensamento político antigo (Platão, Aristóteles)."}, {"id": "f3_2", "text": "3.2 Pensamento político em Maquiavel, Hobbes, Locke, Montesquieu, Rousseau, Kant, Hegel e Marx."}, {"id": "f3_3", "text": "3.3 Pensamento político contemporâneo (Habermas)."}]}, {"id": "f4", "text": "4 Filosofia da linguagem (Locke, Rousseau, Wittgenstein e a filosofia analítica contemporânea).", "subs": []}]}, {"id": "bio", "name": "I — Biologia", "topics": [{"id": "bio1", "text": "1 Seres vivos: classificação dos seres vivos.", "subs": []}, {"id": "bio2", "text": "2 Célula.", "subs": [{"id": "bio2_1", "text": "2.1 Célula procariota e eucariota."}, {"id": "bio2_2", "text": "2.2 Componentes morfológicos das células."}, {"id": "bio2_3", "text": "2.3 Funções das estruturas celulares."}]}, {"id": "bio3", "text": "3 Tecidos animais: características estruturais e funcionais.", "subs": []}, {"id": "bio4", "text": "4 Morfologia e fisiologia humana.", "subs": [{"id": "bio4_1", "text": "4.1 Morfologia, externa e interna."}, {"id": "bio4_2", "text": "4.2 Fisiologia, nutrição, digestão, respiração, circulação e excreção."}, {"id": "bio4_3", "text": "4.3 Sistemas de proteção, sustentação e locomoção."}, {"id": "bio4_4", "text": "4.4 Sistemas nervoso e endócrino."}]}, {"id": "bio5", "text": "5 Ecologia.", "subs": [{"id": "bio5_1", "text": "5.1 Relações tróficas entre os seres vivos."}, {"id": "bio5_2", "text": "5.2 Biomas."}, {"id": "bio5_3", "text": "5.3 Ciclos biogeoquímicos."}, {"id": "bio5_4", "text": "5.4 Conservação e preservação da natureza, impacto humano, poluição e biocidas, ecossistemas e espécies ameaçadas de extinção, principalmente no Brasil."}]}, {"id": "bio6", "text": "6 Evolução dos seres vivos.", "subs": []}, {"id": "bio7", "text": "7 Reino vegetal.", "subs": [{"id": "bio7_1", "text": "7.1 Funções vitais das plantas."}, {"id": "bio7_2", "text": "7.2 Briófitas, pteridófitas, gimnospermas e angiospermas."}]}, {"id": "bio8", "text": "8 Reino Animal.", "subs": [{"id": "bio8_1", "text": "8.1 Características gerais, reprodução, nutrição, locomoção e coordenação."}, {"id": "bio8_2", "text": "8.2 Poríferos."}, {"id": "bio8_3", "text": "8.3 Cnidários."}, {"id": "bio8_4", "text": "8.4 Artrópodes."}, {"id": "bio8_5", "text": "8.5 Moluscos."}, {"id": "bio8_6", "text": "8.6 Equinodermos."}, {"id": "bio8_7", "text": "8.7 Nematelmintos."}, {"id": "bio8_8", "text": "8.8 Platelmintos."}, {"id": "bio8_9", "text": "8.9 Anelídeos."}, {"id": "bio8_10", "text": "8.10 Cordados."}]}, {"id": "bio9", "text": "9 Saúde, higiene e saneamento básico.", "subs": [{"id": "bio9_1", "text": "9.1 Doenças adquiridas e transmissíveis: viroses, AIDS, dengue, poliomielite, tuberculose, sífilis, meningite meningocócica, cólera, tétano."}, {"id": "bio9_2", "text": "9.2 Ciclo de vida, transmissão e profilaxia: raiva, sarampo, leptospirose, amebíase, malária, doença de chagas, verminoses, ascaridíase, teníase, cisticercose, esquistosomose e ancilostomose."}, {"id": "bio9_3", "text": "9.3 As defesas do organismo, imunidade passiva e imunidade ativa."}]}]}, {"id": "fis", "name": "II — Física", "topics": [{"id": "fis1", "text": "1 História e evolução das ideias da física.", "subs": [{"id": "fis1_1", "text": "1.1 Cosmologia antiga."}, {"id": "fis1_2", "text": "1.2 A física de Aristóteles."}, {"id": "fis1_3", "text": "1.3 Origens da mecânica."}, {"id": "fis1_4", "text": "1.4 Surgimento da teoria da relatividade e da teoria quântica."}]}, {"id": "fis2", "text": "2 Mecânica.", "subs": [{"id": "fis2_1", "text": "2.1 Cinemática escalar, cinemática vetorial."}, {"id": "fis2_2", "text": "2.2 Movimento circular."}, {"id": "fis2_3", "text": "2.3 Leis de Newton e suas aplicações."}, {"id": "fis2_4", "text": "2.4 Trabalho."}, {"id": "fis2_5", "text": "2.5 Potência."}, {"id": "fis2_6", "text": "2.6 Energia, conservação e suas transformações, impulso."}, {"id": "fis2_7", "text": "2.7 Quantidade de movimento e conservação da quantidade de movimento."}, {"id": "fis2_8", "text": "2.8 Gravitação universal."}, {"id": "fis2_9", "text": "2.9 Estática dos corpos rígidos."}, {"id": "fis2_10", "text": "2.10 Estática dos fluidos."}, {"id": "fis2_11", "text": "2.11 Princípios de Pascal, Arquimedes e Stevin."}]}, {"id": "fis3", "text": "3 Termodinâmica.", "subs": [{"id": "fis3_1", "text": "3.1 Calor e temperatura."}, {"id": "fis3_2", "text": "3.2 Temperatura e dilatação térmica."}, {"id": "fis3_3", "text": "3.3 Calor específico."}, {"id": "fis3_4", "text": "3.4 Trocas de calor."}, {"id": "fis3_5", "text": "3.5 Mudança de fase e diagramas de fases."}, {"id": "fis3_6", "text": "3.6 Propagação do calor."}, {"id": "fis3_7", "text": "3.7 Teoria cinética dos gases."}, {"id": "fis3_8", "text": "3.8 Energia interna."}, {"id": "fis3_9", "text": "3.9 Lei de Joule."}, {"id": "fis3_10", "text": "3.10 Transformações gasosas."}, {"id": "fis3_11", "text": "3.11 Leis da termodinâmica (entropia e entalpia)."}, {"id": "fis3_12", "text": "3.12 Máquinas térmicas."}, {"id": "fis3_13", "text": "3.13 Ciclo de Carnot."}]}, {"id": "fis4", "text": "4 Eletromagnetismo.", "subs": [{"id": "fis4_1", "text": "4.1 Introdução à eletricidade."}, {"id": "fis4_2", "text": "4.2 Campo elétrico."}, {"id": "fis4_3", "text": "4.3 Lei de Gauss."}, {"id": "fis4_4", "text": "4.4 Potencial elétrico."}, {"id": "fis4_5", "text": "4.5 Corrente elétrica."}, {"id": "fis4_6", "text": "4.6 Potência elétrica e resistores."}, {"id": "fis4_7", "text": "4.7 Circuitos elétricos."}, {"id": "fis4_8", "text": "4.8 Campo magnético."}, {"id": "fis4_9", "text": "4.9 Lei de Ampère."}, {"id": "fis4_10", "text": "4.10 Lei de Faraday."}, {"id": "fis4_11", "text": "4.11 Propriedades elétricas e magnéticas dos materiais."}, {"id": "fis4_12", "text": "4.12 Equações de Maxwell."}, {"id": "fis4_13", "text": "4.13 Radiação."}]}, {"id": "fis5", "text": "5 Ondulatória.", "subs": [{"id": "fis5_1", "text": "5.1 Movimento harmônico simples."}, {"id": "fis5_2", "text": "5.2 Oscilações livres, amortecidas e forçadas."}, {"id": "fis5_3", "text": "5.3 Ondas."}, {"id": "fis5_4", "text": "5.4 Ondas sonoras e eletromagnéticas."}, {"id": "fis5_5", "text": "5.5 Frequências naturais e ressonância."}, {"id": "fis5_6", "text": "5.6 Óptica geométrica (reflexão e refração da luz)."}, {"id": "fis5_7", "text": "5.7 Instrumentos ópticos (características e aplicações)."}, {"id": "fis5_8", "text": "5.8 Óptica física: 5.8.1 Interferência. 5.8.2 Difração. 5.8.3 Polarização."}]}, {"id": "fis6", "text": "6 Física moderna.", "subs": [{"id": "fis6_1", "text": "6.1 Introdução à relatividade especial."}, {"id": "fis6_2", "text": "6.2 Transformação de Lorentz."}, {"id": "fis6_3", "text": "6.3 Equivalência massa-energia."}, {"id": "fis6_4", "text": "6.4 Natureza ondulatória-corpuscular da matéria."}, {"id": "fis6_5", "text": "6.5 Teoria quântica da matéria e da radiação."}, {"id": "fis6_6", "text": "6.6 Modelo do átomo de hidrogênio."}, {"id": "fis6_7", "text": "6.7 Núcleo atômico."}, {"id": "fis6_8", "text": "6.8 Energia nuclear."}]}]}, {"id": "qui", "name": "III — Química", "topics": [{"id": "qui1", "text": "1 O mundo e suas transformações: história e importância da química.", "subs": []}, {"id": "qui2", "text": "2 Teoria Atômico-Molecular.", "subs": [{"id": "qui2_1", "text": "2.1 Modelos atômicos (Dalton, Thomson, Rutherford e Bohr) e evolução dos conceitos de átomo."}, {"id": "qui2_2", "text": "2.2 Os trabalhos de Faraday."}, {"id": "qui2_3", "text": "2.3 Leis ponderais (Lavoisier, Proust, Dalton e Richter-Wenzel-Berzelius)."}, {"id": "qui2_4", "text": "2.4 Leis volumétricas de Gay-Lussac."}, {"id": "qui2_5", "text": "2.5 Lei de Avogadro."}, {"id": "qui2_6", "text": "2.6 Conceitos decorrentes da Teoria Atômico-Molecular: unidade de massa atômica (u), quantidade de matéria, massa molar, volume molar."}, {"id": "qui2_7", "text": "2.7 Fórmulas químicas."}, {"id": "qui2_8", "text": "2.8 Cálculos estequiométricos."}]}, {"id": "qui3", "text": "3 Classificação periódica dos elementos químicos.", "subs": [{"id": "qui3_1", "text": "3.1 Tabela Periódica: histórico e evolução."}, {"id": "qui3_2", "text": "3.2 Classificação dos elementos em metais, não metais, semimetais e gases nobres."}, {"id": "qui3_3", "text": "3.3 Configuração eletrônica dos elementos ao longo da Tabela Periódica."}, {"id": "qui3_4", "text": "3.4 Propriedades periódicas e aperiódicas."}]}, {"id": "qui4", "text": "4 Radioatividade.", "subs": [{"id": "qui4_1", "text": "4.1 Natureza das emissões radioativas."}, {"id": "qui4_2", "text": "4.2 Leis da radioatividade."}, {"id": "qui4_3", "text": "4.3 Cinética da desintegração radioativa."}, {"id": "qui4_4", "text": "4.4 Fenômenos de fissão nuclear e fusão nuclear."}, {"id": "qui4_5", "text": "4.5 Riscos e aplicações das reações nucleares."}]}, {"id": "qui5", "text": "5 Interações químicas.", "subs": [{"id": "qui5_1", "text": "5.1 Ligações iônica, covalente e metálica."}, {"id": "qui5_2", "text": "5.2 Forças intermoleculares."}, {"id": "qui5_3", "text": "5.3 Geometria molecular: eletronegatividade e polaridade das ligações e das moléculas, Teoria da Repulsão dos Pares Eletrônicos, Teoria da Ligação de Valência e Sobreposição de Orbitais, orbitais híbridos e moleculares."}, {"id": "qui5_4", "text": "5.4 Relação entre estrutura e propriedade das substâncias químicas."}]}, {"id": "qui6", "text": "6 Matéria e mudança de estado.", "subs": [{"id": "qui6_1", "text": "6.1 Sólidos, líquidos, gases e outros estados da matéria (ideais e reais)."}, {"id": "qui6_2", "text": "6.2 Características e propriedades de gases, líquidos e sólidos."}, {"id": "qui6_3", "text": "6.3 Ligações químicas nos sólidos, líquidos e gases."}, {"id": "qui6_4", "text": "6.4 Métodos de separação de misturas."}]}, {"id": "qui7", "text": "7 Funções químicas inorgânicas.", "subs": [{"id": "qui7_1", "text": "7.1 Ácidos, bases, sais e óxidos: conceito, propriedades e nomenclatura."}, {"id": "qui7_2", "text": "7.2 Hidretos, carbetos e nitretos: conceito, propriedades e nomenclatura."}, {"id": "qui7_3", "text": "7.3 Principais reações envolvendo compostos inorgânicos."}, {"id": "qui7_4", "text": "7.4 Balanceamento de equações."}]}, {"id": "qui8", "text": "8 Misturas e soluções.", "subs": [{"id": "qui8_1", "text": "8.1 Relações de proporcionalidade entre solutos e solvente: concentração em quantidade de matéria, concentração em massa, fração em quantidade de matéria, fração em massa, fração em volume."}, {"id": "qui8_2", "text": "8.2 Grandezas-padrão e unidades-padrão (SI) e sua relação com outras grandezas e unidades."}, {"id": "qui8_3", "text": "8.3 Solubilidade."}, {"id": "qui8_4", "text": "8.4 Propriedades coligativas."}]}, {"id": "qui9", "text": "9 Gases.", "subs": [{"id": "qui9_1", "text": "9.1 Teoria cinética."}, {"id": "qui9_2", "text": "9.2 Leis dos gases."}, {"id": "qui9_3", "text": "9.3 Densidade dos gases."}, {"id": "qui9_4", "text": "9.4 Difusão e efusão dos gases."}, {"id": "qui9_5", "text": "9.5 Misturas gasosas."}]}, {"id": "qui10", "text": "10 Termoquímica.", "subs": [{"id": "qui10_1", "text": "10.1 Energia e calor."}, {"id": "qui10_2", "text": "10.2 Reações exotérmicas e endotérmicas."}, {"id": "qui10_3", "text": "10.3 Entalpia, entropia e energia livre."}, {"id": "qui10_4", "text": "10.4 Espontaneidade de uma reação."}, {"id": "qui10_5", "text": "10.5 Entalpias de formação e de combustão das substâncias."}, {"id": "qui10_6", "text": "10.6 Calor de reação em pressão constante e em volume constante."}, {"id": "qui10_7", "text": "10.7 Lei de Hess."}]}, {"id": "qui11", "text": "11 Cinética química.", "subs": [{"id": "qui11_1", "text": "11.1 Velocidades e mecanismos de reação."}, {"id": "qui11_2", "text": "11.2 Equação de velocidade, teoria das colisões e complexo ativado."}, {"id": "qui11_3", "text": "11.3 Influência da energia, da concentração, da pressão e dos catalisadores na velocidade das reações químicas."}]}, {"id": "qui12", "text": "12 Equilíbrio químico.", "subs": [{"id": "qui12_1", "text": "12.1 Equilíbrio iônico em soluções aquosas, constante de equilíbrio."}, {"id": "qui12_2", "text": "12.2 Equilíbrio ácido-base, hidrólise de sais, solução tampão, conceitos de Ka, Kb, Kh, pH, pOH e graus de dissociação e de hidrólise."}, {"id": "qui12_3", "text": "12.3 Equilíbrio de precipitação, conceito de Kps."}, {"id": "qui12_4", "text": "12.4 Deslocamento do equilíbrio."}, {"id": "qui12_5", "text": "12.5 Lei da Diluição de Ostwald."}, {"id": "qui12_6", "text": "12.6 Efeito do íon comum."}, {"id": "qui12_7", "text": "12.7 Lei da Ação das Massas."}]}, {"id": "qui13", "text": "13 Eletroquímica.", "subs": [{"id": "qui13_1", "text": "13.1 Potenciais de oxidação e redução."}, {"id": "qui13_2", "text": "13.2 Espontaneidade de uma reação de oxirredução."}, {"id": "qui13_3", "text": "13.3 Pilhas e acumuladores."}, {"id": "qui13_4", "text": "13.4 Eletrólise."}]}, {"id": "qui14", "text": "14 Química orgânica.", "subs": [{"id": "qui14_1", "text": "14.1 Propriedades fundamentais do átomo de carbono, hibridação, estados de oxidação de carbono, ligações sigma e pi, geometria molecular, classificação do átomo de carbono na cadeia carbônica, notação e nomenclatura dos principais radicais orgânicos."}, {"id": "qui14_2", "text": "14.2 Notação, nomenclatura e propriedades físicas e químicas de hidrocarbonetos, haletos orgânicos, álcoois, fenóis, éteres, cetonas, aldeídos, ácidos carboxílicos, ésteres, anidridos, haletos de ácido, aminas, amidas, nitrilas, isonitrilas e nitrocompostos."}, {"id": "qui14_3", "text": "14.3 Reatividade dos compostos orgânicos, reações de redução, oxidação, combustão, adição e substituição."}, {"id": "qui14_4", "text": "14.4 Glicídeos, lipídeos, aminoácidos, proteínas, ácidos nucleicos."}, {"id": "qui14_5", "text": "14.5 Tecnologias associadas à química orgânica: petroquímica, polímeros sintéticos, aditivos em alimentos, agroquímica, drogas, medicamentos e biotecnologia."}]}]}, {"id": "mat", "name": "Matemática", "topics": [{"id": "m1", "text": "1 Aritmética: operações com números racionais.", "subs": []}, {"id": "m2", "text": "2 Álgebra.", "subs": [{"id": "m2_1", "text": "2.1 Equações do 1º e do 2º graus."}, {"id": "m2_2", "text": "2.2 Fatoração."}, {"id": "m2_3", "text": "2.3 Produtos notáveis."}]}, {"id": "m3", "text": "3 Geometria.", "subs": [{"id": "m3_1", "text": "3.1 Triângulos e quadriláteros."}, {"id": "m3_2", "text": "3.2 Semelhança e congruência de triângulos."}, {"id": "m3_3", "text": "3.3 Relações métricas no triângulo retângulo."}, {"id": "m3_4", "text": "3.4 Relações trigonométricas."}, {"id": "m3_5", "text": "3.5 Áreas das principais figuras planas."}, {"id": "m3_6", "text": "3.6 Áreas e volume do cubo e do paralelepípedo."}, {"id": "m3_7", "text": "3.7 Razão e proporção."}, {"id": "m3_8", "text": "3.8 Regra de três simples e composta."}, {"id": "m3_9", "text": "3.9 Porcentagem e juros simples e compostos."}]}, {"id": "m4", "text": "4 Conjuntos.", "subs": [{"id": "m4_1", "text": "4.1 Representação de conjuntos."}, {"id": "m4_2", "text": "4.2 Conjuntos unitários, vazio e universo."}, {"id": "m4_3", "text": "4.3 Igualdade, subconjuntos, operações."}, {"id": "m4_4", "text": "4.4 Conjuntos numéricos, intervalos e operações."}]}, {"id": "m5", "text": "5 Funções.", "subs": [{"id": "m5_1", "text": "5.1 Par ordenado e produto cartesiano."}, {"id": "m5_2", "text": "5.2 Noção de relação."}, {"id": "m5_3", "text": "5.3 Noção de função."}, {"id": "m5_4", "text": "5.4 Domínio de uma função real de variável real."}, {"id": "m5_5", "text": "5.5 Gráfico de uma função."}, {"id": "m5_6", "text": "5.6 Análise de gráficos."}, {"id": "m5_7", "text": "5.7 Função bijetora, função inversa e função composta."}]}, {"id": "m6", "text": "6 Funções de 1º grau.", "subs": [{"id": "m6_1", "text": "6.1 Função constante."}, {"id": "m6_2", "text": "6.2 Estudo do sinal de uma função de 1º grau."}, {"id": "m6_3", "text": "6.3 Inequações de 1º grau."}]}, {"id": "m7", "text": "7 Funções de 2º grau.", "subs": [{"id": "m7_1", "text": "7.1 Aspectos introdutórios."}, {"id": "m7_2", "text": "7.2 Gráfico de uma função do 2º grau."}, {"id": "m7_3", "text": "7.3 Vértice de uma parábola."}, {"id": "m7_4", "text": "7.4 Raízes de uma função de 2º grau."}, {"id": "m7_5", "text": "7.5 Estudo do sinal de uma função de 2º grau."}, {"id": "m7_6", "text": "7.6 Inequações de 2º grau."}]}, {"id": "m8", "text": "8 Funções exponenciais.", "subs": [{"id": "m8_1", "text": "8.1 Conceito de função exponencial."}, {"id": "m8_2", "text": "8.2 Gráfico de funções exponenciais."}, {"id": "m8_3", "text": "8.3 Equações exponenciais."}, {"id": "m8_4", "text": "8.4 Inequações exponenciais."}]}, {"id": "m9", "text": "9 Logaritmos.", "subs": [{"id": "m9_1", "text": "9.1 Definição de logaritmo."}, {"id": "m9_2", "text": "9.2 Propriedades dos logaritmos."}, {"id": "m9_3", "text": "9.3 Mudança de base."}, {"id": "m9_4", "text": "9.4 Sistemas de logaritmos."}, {"id": "m9_5", "text": "9.5 Funções logarítmicas."}, {"id": "m9_6", "text": "9.6 Inequações logarítmicas."}]}, {"id": "m10", "text": "10 Funções Trigonométricas.", "subs": [{"id": "m10_1", "text": "10.1 Redução de arcos do 1º quadrante."}, {"id": "m10_2", "text": "10.2 Operações com arcos."}]}, {"id": "m11", "text": "11 Progressões aritméticas e geométricas: conceito; classificação; fórmula do termo geral; representação genérica; soma dos n primeiros termos; soma dos infinitos termos de uma progressão geométrica.", "subs": []}, {"id": "m12", "text": "12 Matrizes.", "subs": [{"id": "m12_1", "text": "12.1 Aspectos introdutórios."}, {"id": "m12_2", "text": "12.2 Representação."}, {"id": "m12_3", "text": "12.3 Matrizes especiais."}, {"id": "m12_4", "text": "12.4 Matriz transposta."}, {"id": "m12_5", "text": "12.5 Igualdade de matrizes."}, {"id": "m12_6", "text": "12.6 Operações com matrizes."}]}, {"id": "m13", "text": "13 Determinantes.", "subs": [{"id": "m13_1", "text": "13.1 Conceito."}, {"id": "m13_2", "text": "13.2 Ordem do determinante."}, {"id": "m13_3", "text": "13.3 Propriedades."}, {"id": "m13_4", "text": "13.4 Discussão do sistema linear."}, {"id": "m13_5", "text": "13.5 Sistema linear homogêneo."}, {"id": "m13_6", "text": "13.6 Regras para cálculo do determinante."}]}, {"id": "m14", "text": "14 Sistemas lineares.", "subs": [{"id": "m14_1", "text": "14.1 Introdução."}, {"id": "m14_2", "text": "14.2 Equação linear."}, {"id": "m14_3", "text": "14.3 Solução de um sistema linear."}, {"id": "m14_4", "text": "14.4 Classificação de um sistema linear."}, {"id": "m14_5", "text": "14.5 Discussão das soluções de um sistema linear."}]}, {"id": "m15", "text": "15 Geometria espacial.", "subs": [{"id": "m15_1", "text": "15.1 Prisma."}, {"id": "m15_2", "text": "15.2 Pirâmide."}, {"id": "m15_3", "text": "15.3 Cilindro."}, {"id": "m15_4", "text": "15.4 Cone."}, {"id": "m15_5", "text": "15.5 Esfera."}]}, {"id": "m16", "text": "16 Geometria analítica.", "subs": [{"id": "m16_1", "text": "16.1 Estudo do ponto."}, {"id": "m16_2", "text": "16.2 Estudo da reta."}, {"id": "m16_3", "text": "16.3 Estudo da circunferência."}]}, {"id": "m17", "text": "17 Números complexos.", "subs": [{"id": "m17_1", "text": "17.1 Representação."}, {"id": "m17_2", "text": "17.2 Operações na forma algébrica e trigonométrica."}]}, {"id": "m18", "text": "18 Análise combinatória.", "subs": [{"id": "m18_1", "text": "18.1 Fatorial."}, {"id": "m18_2", "text": "18.2 Permutação."}, {"id": "m18_3", "text": "18.3 Combinação."}, {"id": "m18_4", "text": "18.4 Arranjo."}]}, {"id": "m19", "text": "19 Binômio de Newton.", "subs": [{"id": "m19_1", "text": "19.1 Número binomial."}, {"id": "m19_2", "text": "19.2 Teorema de Newton para desenvolvimento do binômio (x + a)n."}, {"id": "m19_3", "text": "19.3 Generalização."}, {"id": "m19_4", "text": "19.4 Somatório."}, {"id": "m19_5", "text": "19.5 Termo geral do binômio de Newton."}]}, {"id": "m20", "text": "20 Polinômios.", "subs": [{"id": "m20_1", "text": "20.1 Conceito."}, {"id": "m20_2", "text": "20.2 Identidade de polinômios."}, {"id": "m20_3", "text": "20.3 Operações com polinômios."}, {"id": "m20_4", "text": "20.4 Propriedades fundamentais da divisão de polinômios."}, {"id": "m20_5", "text": "20.5 Raiz ou zero de um polinômio."}, {"id": "m20_6", "text": "20.6 Fração polinomial e frações polinomiais idênticas."}]}]}, {"id": "dpenal", "name": "Noções de Direito Penal", "topics": [{"id": "dp1", "text": "1 Parte geral do Código Penal Brasileiro (Título I ao III).", "subs": []}, {"id": "dp2", "text": "2 Crimes.", "subs": [{"id": "dp2_1", "text": "2.1 Crimes contra a pessoa."}, {"id": "dp2_2", "text": "2.2 Crimes contra o patrimônio."}, {"id": "dp2_3", "text": "2.3 Crimes contra a administração pública."}]}]}, {"id": "dh", "name": "Noções de Direitos Humanos", "topics": [{"id": "dh1", "text": "1 Conceito.", "subs": []}, {"id": "dh2", "text": "2 Evolução.", "subs": []}, {"id": "dh3", "text": "3 Abrangência.", "subs": []}, {"id": "dh4", "text": "4 Sistema de proteção.", "subs": []}, {"id": "dh5", "text": "5 Convenção Americana sobre Direitos Humanos (Pacto de São José e Decreto nº 678/1992).", "subs": []}]}, {"id": "dpp", "name": "Noções de Processo Penal", "topics": [{"id": "dpp1", "text": "1 Inquérito policial.", "subs": []}, {"id": "dpp2", "text": "2 Ação penal.", "subs": []}]}, {"id": "dpm", "name": "Direito Penal Militar", "topics": [{"id": "dpm1", "text": "1 Aplicação da lei penal militar.", "subs": []}, {"id": "dpm2", "text": "2 Crime.", "subs": []}, {"id": "dpm3", "text": "3 Imputabilidade penal.", "subs": []}, {"id": "dpm4", "text": "4 Concurso de agentes.", "subs": []}, {"id": "dpm5", "text": "5 Penas.", "subs": []}, {"id": "dpm6", "text": "6 Aplicação da pena.", "subs": []}, {"id": "dpm7", "text": "7 Suspensão condicional da pena.", "subs": []}, {"id": "dpm8", "text": "8 Livramento condicional.", "subs": []}, {"id": "dpm9", "text": "9 Penas acessórias.", "subs": []}, {"id": "dpm10", "text": "10 Efeitos da condenação.", "subs": []}, {"id": "dpm11", "text": "11 Medidas de segurança.", "subs": []}, {"id": "dpm12", "text": "12 Ação penal.", "subs": []}, {"id": "dpm13", "text": "13 Extinção da punibilidade.", "subs": []}, {"id": "dpm14", "text": "14 Crimes militares em tempo de paz.", "subs": []}, {"id": "dpm15", "text": "15 Crimes própria e impropriamente militares.", "subs": []}, {"id": "dpm16", "text": "16 Princípios constitucionais penais com reflexos na lei penal militar.", "subs": []}]}, {"id": "dppm", "name": "Direito Processual Penal Militar", "topics": [{"id": "dppm1", "text": "1 Processo penal militar e sua aplicação.", "subs": []}, {"id": "dppm2", "text": "2 Polícia judiciária militar.", "subs": []}, {"id": "dppm3", "text": "3 Inquérito policial militar.", "subs": []}, {"id": "dppm4", "text": "4 Ação penal militar e seu exercício.", "subs": []}, {"id": "dppm5", "text": "5 Processo.", "subs": []}, {"id": "dppm6", "text": "6 Juiz, auxiliares e partes do processo.", "subs": []}, {"id": "dppm7", "text": "7 Denúncia.", "subs": []}, {"id": "dppm8", "text": "8 Questões prejudiciais.", "subs": []}, {"id": "dppm9", "text": "9 Exceções.", "subs": []}, {"id": "dppm10", "text": "10 Incidente de sanidade mental do acusado.", "subs": []}, {"id": "dppm11", "text": "11 Incidente de falsidade de documento.", "subs": []}, {"id": "dppm12", "text": "12 Medidas preventivas e assecuratórias.", "subs": []}, {"id": "dppm13", "text": "13 Providências que recaem sobre coisas.", "subs": []}, {"id": "dppm14", "text": "14 Providências que recaem sobre pessoas.", "subs": [{"id": "dppm14_1", "text": "14.1 Prisão em flagrante."}, {"id": "dppm14_2", "text": "14.2 Prisão preventiva."}, {"id": "dppm14_3", "text": "14.3 Liberdade provisória."}]}, {"id": "dppm15", "text": "15 Citação, intimação e notificação.", "subs": []}, {"id": "dppm16", "text": "16 Atos probatórios.", "subs": [{"id": "dppm16_1", "text": "16.1 Interrogatório."}, {"id": "dppm16_2", "text": "16.2 Confissão."}, {"id": "dppm16_3", "text": "16.3 Perícias e exames."}, {"id": "dppm16_4", "text": "16.4 Testemunhas."}, {"id": "dppm16_5", "text": "16.5 Acareação."}, {"id": "dppm16_6", "text": "16.6 Reconhecimento de pessoa e coisa."}, {"id": "dppm16_7", "text": "16.7 Documentos."}, {"id": "dppm16_8", "text": "16.8 Indícios."}]}, {"id": "dppm17", "text": "17 Processos em espécie.", "subs": [{"id": "dppm17_1", "text": "17.1 Processo ordinário."}, {"id": "dppm17_2", "text": "17.2 Processos especiais."}, {"id": "dppm17_3", "text": "17.3 Deserção de oficial e de praça."}, {"id": "dppm17_4", "text": "17.4 Insubmissão."}]}, {"id": "dppm18", "text": "18 Nulidades.", "subs": []}, {"id": "dppm19", "text": "19 Recursos.", "subs": [{"id": "dppm19_1", "text": "19.1 Regras gerais."}, {"id": "dppm19_2", "text": "19.2 Recurso em sentido estrito."}, {"id": "dppm19_3", "text": "19.3 Correição parcial."}, {"id": "dppm19_4", "text": "19.4 Apelação."}, {"id": "dppm19_5", "text": "19.5 Embargos."}, {"id": "dppm19_6", "text": "19.6 Revisão."}, {"id": "dppm19_7", "text": "19.7 Recurso extraordinário."}, {"id": "dppm19_8", "text": "19.8 Reclamação."}]}, {"id": "dppm20", "text": "20 Execução.", "subs": [{"id": "dppm20_1", "text": "20.1 Incidentes."}, {"id": "dppm20_2", "text": "20.2 Suspensão condicional da pena."}, {"id": "dppm20_3", "text": "20.3 Livramento condicional."}, {"id": "dppm20_4", "text": "20.4 Indulto, comutação da pena, anistia e reabilitação."}, {"id": "dppm20_5", "text": "20.5 Execução das medidas de segurança."}]}, {"id": "dppm21", "text": "21 Princípios constitucionais processuais com reflexos na lei processual penal militar.", "subs": []}]}, {"id": "dcf", "name": "Noções de Direito Constitucional", "topics": [{"id": "dcf1", "text": "1 Constituição: conceito, conteúdo, estrutura e classificação. Supremacia da Constituição. Poder Constituinte. Interpretação e Aplicabilidade das Normas Constitucionais.", "subs": []}, {"id": "dcf2", "text": "2 Direitos e Garantias Fundamentais. Direitos e Deveres Individuais Difusos e Coletivos. Direitos Sociais.", "subs": []}, {"id": "dcf3", "text": "3 Organização do Estado Brasileiro; divisão espacial do poder; Estado Federal; União; Estados Federados; Distrito Federal; Municípios; intervenção federal; repartição de competências.", "subs": []}, {"id": "dcf4", "text": "4 Poder Legislativo. Organização. Funcionamento. Atribuições. Processo Legislativo.", "subs": []}, {"id": "dcf5", "text": "5 Poder Executivo. Presidente, Vice-Presidente da República e Ministros de Estado.", "subs": []}, {"id": "dcf6", "text": "6 Poder Judiciário. Garantias. Jurisdição. Organização. Órgãos e Competência.", "subs": []}, {"id": "dcf7", "text": "7 Funções essenciais à Justiça.", "subs": []}, {"id": "dcf8", "text": "8 Ministério Público. Natureza. Função. Autonomia. Atribuições.", "subs": []}, {"id": "dcf9", "text": "9 Ação Direta de Inconstitucionalidade. Ação Direta de Constitucionalidade.", "subs": []}, {"id": "dcf10", "text": "10 Ordem Econômica e Financeira. Atividade Econômica do Estado.", "subs": []}, {"id": "dcf11", "text": "11 Princípios constitucionais da seguridade social.", "subs": []}, {"id": "dcf12", "text": "12 Constituição do Estado de Alagoas.", "subs": []}]}, {"id": "dadm", "name": "Noções de Direito Administrativo", "topics": [{"id": "da1", "text": "1 Princípios.", "subs": []}, {"id": "da2", "text": "2 Administração Pública na Constituição Federal de 1988.", "subs": []}, {"id": "da3", "text": "3 Regime jurídico Administrativo.", "subs": []}, {"id": "da4", "text": "4 Poderes da Administração Pública.", "subs": []}, {"id": "da5", "text": "5 Serviço Público.", "subs": []}, {"id": "da6", "text": "6 Poder de Polícia.", "subs": []}, {"id": "da7", "text": "7 Atos Administrativos.", "subs": []}, {"id": "da8", "text": "8 Contratos Administrativos.", "subs": []}, {"id": "da9", "text": "9 Licitação.", "subs": []}, {"id": "da10", "text": "10 Servidores públicos.", "subs": []}, {"id": "da11", "text": "11 Bens públicos.", "subs": []}, {"id": "da12", "text": "12 Administração direta e indireta.", "subs": []}, {"id": "da13", "text": "13 Controle da Administração Pública.", "subs": []}, {"id": "da14", "text": "14 Responsabilidade do Estado.", "subs": []}]}, {"id": "legpmal", "name": "Legislação Institucional", "topics": [{"id": "lp1", "text": "1 Lei Estadual nº 5.346/1992 (Estatuto dos Policiais Militares do Estado de Alagoas).", "subs": []}, {"id": "lp2", "text": "2 Decreto Estadual nº 37.042/1996 (Regulamento Disciplinar da PMAL).", "subs": []}, {"id": "lp3", "text": "3 Decreto-Lei nº 2.848/1940 e suas alterações (Parte geral do Código Penal): Títulos de I a III.", "subs": []}]}, {"id": "legat", "name": "Legislação Extravagante", "topics": [{"id": "la3", "text": "1 Lei nº 7.716/1989 (crimes resultantes de preconceitos de raça ou de cor).", "subs": []}, {"id": "la4", "text": "2 Lei nº 8.072/1990 e Lei nº 8.930/1994 (crimes hediondos).", "subs": []}, {"id": "la5", "text": "3 Lei nº 12.850/2013 (crime organizado).", "subs": []}, {"id": "la6", "text": "4 Lei nº 9.455/1997 (crimes de tortura).", "subs": []}, {"id": "la7", "text": "5 Lei nº 9.605/1998 (crimes contra o meio ambiente).", "subs": []}, {"id": "la8", "text": "6 Lei nº 10.826/2003 (Estatuto do Desarmamento).", "subs": []}, {"id": "la9", "text": "7 Lei nº 11.343/2006 (Lei de Drogas).", "subs": []}, {"id": "la10", "text": "8 Lei nº 11.340/2006 (Lei Maria da Penha).", "subs": []}, {"id": "la11", "text": "9 Lei nº 9.503/1997 (Código de Trânsito Brasileiro).", "subs": []}, {"id": "la12", "text": "10 Lei nº 8.069/1990 (Estatuto da Criança e do Adolescente).", "subs": []}, {"id": "la13", "text": "11 Lei nº 13.869/2019 (abuso de autoridade).", "subs": []}, {"id": "la14", "text": "12 Lei nº 7.960/1989 (prisão temporária).", "subs": []}, {"id": "la15", "text": "13 Lei nº 9.099/1995 (juizados especiais).", "subs": []}, {"id": "la16", "text": "14 Lei nº 10.259/2001 (juizados especiais federais).", "subs": []}]}]}, "leisCfg": {"leis": [{"id": "lei_1776899017137", "name": "Constituição do Estado de Alagoas", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285]}, {"id": "cf_t1", "name": "CF/88 — Título I: Princípios Fundamentais (Arts. 1º a 4º)", "arts": [1, 2, 3, 4]}, {"id": "cf_t2", "name": "CF/88 — Título II: Direitos e Garantias Fundamentais (Arts. 5º a 17)", "arts": [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]}, {"id": "cf_t3", "name": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "arts": [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]}, {"id": "cf_t4", "name": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "arts": [44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135]}, {"id": "cf_t5", "name": "CF/88 — Título V: Defesa do Estado e das Instituições (Arts. 136 a 144)", "arts": [136, 137, 138, 139, 140, 141, 142, 143, 144]}, {"id": "cf_t6", "name": "CF/88 — Título VI: Tributação e Orçamento (Arts. 145 a 169)", "arts": [145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169]}, {"id": "cf_t7", "name": "CF/88 — Título VII: Ordem Econômica e Financeira (Arts. 170 a 192)", "arts": [170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192]}, {"id": "cf_t8", "name": "CF/88 — Título VIII: Ordem Social (Arts. 193 a 232)", "arts": [193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232]}, {"id": "cf_t9", "name": "CF/88 — Título IX: Disposições Gerais (Arts. 233 a 250)", "arts": [233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250]}, {"id": "cp_t1", "name": "CP — Parte Geral — Título I: Aplicação da Lei Penal (Arts. 1º a 12)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}, {"id": "cp_t2", "name": "CP — Parte Geral — Título II: Do Crime (Arts. 13 a 25)", "arts": [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]}, {"id": "cp_t3", "name": "CP — Parte Geral — Título III: Imputabilidade Penal (Arts. 26 a 28)", "arts": [26, 27, 28]}, {"id": "cp_pessoa", "name": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "arts": [121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154]}, {"id": "cp_patrimonio", "name": "CP — Parte Especial — Crimes Contra o Patrimônio (Arts. 155 a 183)", "arts": [155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183]}, {"id": "cp_adm", "name": "CP — Parte Especial — Crimes Contra a Administração Pública (Arts. 312 a 359-H)", "arts": [312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366]}, {"id": "cadh", "name": "Convenção Americana sobre Direitos Humanos — Pacto de São José (Arts. 1º a 82)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82]}, {"id": "cpm_ap", "name": "CPM — Aplicação da Lei Penal Militar (Arts. 1º a 28)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]}, {"id": "cpm_crime", "name": "CPM — Do Crime (Arts. 29 a 47)", "arts": [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]}, {"id": "cpm_imput", "name": "CPM — Imputabilidade Penal (Arts. 48 a 52)", "arts": [48, 49, 50, 51, 52]}, {"id": "cpm_concurso", "name": "CPM — Concurso de Agentes (Arts. 53 a 54)", "arts": [53, 54]}, {"id": "cpm_penas", "name": "CPM — Penas e Aplicação (Arts. 55 a 109)", "arts": [55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109]}, {"id": "cpm_medidas", "name": "CPM — Medidas de Segurança (Arts. 110 a 120)", "arts": [110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120]}, {"id": "cpm_acao", "name": "CPM — Ação Penal (Arts. 121 a 122)", "arts": [121, 122]}, {"id": "cpm_extincao", "name": "CPM — Extinção da Punibilidade (Arts. 123 a 135)", "arts": [123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135]}, {"id": "cppm_01", "name": "CPPM — Processo Penal Militar e Aplicação (Arts. 1º a 6º)", "arts": [1, 2, 3, 4, 5, 6]}, {"id": "cppm_02", "name": "CPPM — Polícia Judiciária Militar (Arts. 7º a 8º)", "arts": [7, 8]}, {"id": "cppm_03", "name": "CPPM — Inquérito Policial Militar (Arts. 9º a 28)", "arts": [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]}, {"id": "cppm_04", "name": "CPPM — Ação Penal Militar (Arts. 29 a 37)", "arts": [29, 30, 31, 32, 33, 34, 35, 36, 37]}, {"id": "cppm_05", "name": "CPPM — Processo (Arts. 38 a 39)", "arts": [38, 39]}, {"id": "cppm_06", "name": "CPPM — Juiz, Auxiliares e Partes (Arts. 40 a 76)", "arts": [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76]}, {"id": "cppm_07", "name": "CPPM — Denúncia (Arts. 77 a 87)", "arts": [77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87]}, {"id": "cppm_08", "name": "CPPM — Questões Prejudiciais (Arts. 88 a 94)", "arts": [88, 89, 90, 91, 92, 93, 94]}, {"id": "cppm_09", "name": "CPPM — Exceções (Arts. 95 a 104)", "arts": [95, 96, 97, 98, 99, 100, 101, 102, 103, 104]}, {"id": "cppm_10", "name": "CPPM — Incidente de Sanidade Mental (Arts. 105 a 111)", "arts": [105, 106, 107, 108, 109, 110, 111]}, {"id": "cppm_11", "name": "CPPM — Incidente de Falsidade Documental (Arts. 112 a 116)", "arts": [112, 113, 114, 115, 116]}, {"id": "cppm_12", "name": "CPPM — Medidas Preventivas/Assecuratórias (Arts. 117 a 138)", "arts": [117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138]}, {"id": "cppm_13", "name": "CPPM — Providências sobre Coisas (Arts. 139 a 170)", "arts": [139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170]}, {"id": "cppm_14", "name": "CPPM — Providências sobre Pessoas (Arts. 171 a 273)", "arts": [171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273]}, {"id": "cppm_15", "name": "CPPM — Citação, Intimação e Notificação (Arts. 274 a 306)", "arts": [274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306]}, {"id": "cppm_16", "name": "CPPM — Atos Probatórios (Arts. 307 a 385)", "arts": [307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385]}, {"id": "cppm_17", "name": "CPPM — Processos em Espécie (Arts. 386 a 448)", "arts": [386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448]}, {"id": "cppm_18", "name": "CPPM — Nulidades (Arts. 499 a 503)", "arts": [499, 500, 501, 502, 503]}, {"id": "cppm_19", "name": "CPPM — Recursos (Arts. 504 a 541)", "arts": [504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541]}, {"id": "cppm_20", "name": "CPPM — Execução (Arts. 542 a 625)", "arts": [542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558, 559, 560, 561, 562, 563, 564, 565, 566, 567, 568, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 579, 580, 581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597, 598, 599, 600, 601, 602, 603, 604, 605, 606, 607, 608, 609, 610, 611, 612, 613, 614, 615, 616, 617, 618, 619, 620, 621, 622, 623, 624, 625]}, {"id": "leg_estat_pmal", "name": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135]}, {"id": "leg_rdpm", "name": "Dec. Est. nº 37.042/1996 — Regulamento Disciplinar da PMAL (Arts. 1 a 107)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107]}, {"id": "leg_org_pm", "name": "Lei Federal nº 14.751/2023 — Lei Orgânica da Polícia Militar (Arts. 1 a 44)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44]}, {"id": "lei_org_crim", "name": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]}, {"id": "lei_tortura", "name": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]}, {"id": "lei_meio_amb", "name": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]}, {"id": "lei_desarmamento", "name": "LEI Nº 9.455/1997 — CRIMES DE TORTURA (ARTS. 1 A 4)", "arts": [1, 2, 3, 4]}, {"id": "lei_drogas", "name": "LEI Nº 9.605/1998 — CRIMES CONTRA O MEIO AMBIENTE (ARTS. 1 A 82)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82]}, {"id": "lei_maria_penha", "name": "LEI Nº 10.826/2003 — ESTATUTO DO DESARMAMENTO (ARTS. 1 A 37)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37]}, {"id": "lei_ctb", "name": "LEI Nº 11.343/2006 — LEI DE DROGAS (ARTS. 1 A 75)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75]}, {"id": "lei_eca", "name": "LEI Nº 11.340/2006 — LEI MARIA DA PENHA (ARTS. 1 A 46)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46]}, {"id": "lei_abuso_aut", "name": "LEI Nº 9.503/1997 — CÓDIGO DE TRÂNSITO BRASILEIRO (ARTS.  291 a 312-A) - CRIMES", "arts": [291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312]}, {"id": "lei_pris_temp", "name": "LEI Nº 8.069/1990 — ESTATUTO DA CRIANÇA E DO ADOLESCENTE (ARTS. 225 A 244) - CRIMES", "arts": [225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244]}, {"id": "lei_jec", "name": "LEI Nº 13.869/2019 — ABUSO DE AUTORIDADE (ARTS. 1 A 45)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]}, {"id": "lei_jecf", "name": "LEI Nº 7.960/1989 — PRISÃO TEMPORÁRIA (ARTS. 1 A 3)", "arts": [1, 2, 3]}, {"id": "lei_1778460051331", "name": "LEI Nº 9.099/1995 — JUIZADOS ESPECIAIS (ARTS. 1 A 98)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98]}, {"id": "lei_1778460060393", "name": "LEI Nº 10.259/2001 — JUIZADOS ESPECIAIS FEDERAIS (ARTS. 1 A 28)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]}]}, "banco": [], "flashDecks": [], "simulados": [], "erros": [], "massificadas": [], "dadosConcurso": {"conc_1778033725540": {"cronograma": {"d20260412_c1_3": false, "d20260413_c2_1": false, "d20260413_c2_2": false, "d20260413_c2_3": false, "d20260414_c3_1": false, "d20260414_c3_2": false, "d20260415_c4_1": false, "d20260415_c4_2": false, "d20260416_c5_1": false, "d20260416_c5_2": false, "d20260417_c6_1": false, "d20260421_c3_2": false, "d20260422_c4_1": false, "d20260422_c4_2": false, "d20260422_c4_0": false, "d20260422_c4_3": false, "d20260405_c1_3": false, "d20260406_c2_1": false, "d20260406_c2_2": false, "d20260407_c3_1": false, "d20260407_c3_2": false, "d20260408_c4_1": false, "d20260408_c4_2": false, "d20260409_c5_1": false, "d20260409_c5_2": false, "d20260410_c6_1": false, "d20260410_c6_2": false, "d20260411_c7_1": false, "d20260411_c7_2": false, "d20260417_c6_2": false, "d20260421_c3_1": false, "d20260423_c5_1": false, "d20260423_c5_2": false, "d20260424_c6_1": false, "d20260424_c6_2": false, "d20260424_c6_3": false, "d20260424_c6_x1777037828615": false, "d20260425_c7_2": false, "d20260425_c7_1": false, "d20260405_c1_2": false, "d20260425_c7_3": false, "d20260426_c1_3": false, "d20260426_c1_2": false, "d20260426_c1_1": false, "d20260426_c1_x1777037914478": false, "d20260427_c2_1": false, "d20260428_c3_1": false, "d20260428_c3_2": true, "d20260427_c2_2": false, "d20260427_c2_x1777037912293": false, "d20260428_c3_x1777037910656": true, "d20260503_c1_3": false, "d20260502_c7_2": false, "d20260429_c4_2": true, "d20260429_c4_1": false, "d20260430_c5_2": true, "d20260430_c5_1": false, "d20260502_c7_1": false, "d20260504_c2_2": false, "d20260504_c2_1": false, "d20260504_c2_x1777037912293": false, "d20260505_c3_x1777037910656": true, "d20260505_c3_2": true, "d20260506_c4_1": false, "d20260506_c4_2": false, "d20260506_c4_x1777037909060": false, "d20260507_c5_x1778158217284": false, "d20260507_c5_1": false, "d20260507_c5_2": false, "d20260508_c6_1": false, "d20260508_c6_2": false, "d20260509_c7_1": true, "d20260510_c1_3": false, "d20260511_c2_x1777037912293": false, "d20260511_c2_2": false, "d20260511_c2_1": false, "d20260511_c2_3": false, "d20260512_c3_x1777037910656": false, "d20260512_c3_2": false, "d20260512_c3_1": false, "d20260513_c4_x1777037909060": false, "d20260513_c4_1": false, "d20260513_c4_2": false}, "questoes": {"qt_dh_0": {"total": 40, "acertos": 32}, "qt_dpm_0": {"total": 80, "acertos": 72}, "qt_mat_3": {"total": 20, "acertos": 18}, "qt_mat_2": {"total": 5, "acertos": 3}, "qt_port_0": {"total": 24, "acertos": 22}, "qt_t_1776970115457": {"total": 0, "acertos": 0}, "qt_dppm1": {"total": 0, "acertos": 0}, "qt_p1": {"total": 0, "acertos": 0}, "qt_m3_8": {"total": 0, "acertos": 0}, "qt_m3_9": {"total": 0, "acertos": 0}, "qt_dpm1": {"total": 0, "acertos": 0}, "qt_dh1": {"total": 0, "acertos": 0}, "qt_inf1": {"total": 0, "acertos": 0}, "qt_inf2": {"total": 0, "acertos": 0}, "qt_p3": {"total": 0, "acertos": 0}, "qt_p4_1": {"total": 0, "acertos": 0}, "qt_dcf1": {"total": 0, "acertos": 0}, "qt_dpm2": {"total": 0, "acertos": 0}, "qt_p5_1": {"total": 0, "acertos": 0}, "qt_dpm4": {"total": 0, "acertos": 0}, "qt_dpp1": {"total": 0, "acertos": 0}, "qt_dpp2": {"total": 0, "acertos": 0}, "qt_dpm5": {"total": 0, "acertos": 0}, "qt_dpm6": {"total": 0, "acertos": 0}, "qt_dpm7": {"total": 0, "acertos": 0}, "qt_dpm8": {"total": 0, "acertos": 0}, "qt_la3": {"total": 0, "acertos": 0}, "qt_la4": {"total": 0, "acertos": 0}, "qt_dcf4": {"total": 0, "acertos": 0}, "qt_dcf5": {"total": 0, "acertos": 0}, "qt_dpm3": {"total": 0, "acertos": 0}}, "questoesLog": {"qt_dh_0": [{"data": "22/04/2026", "total": 40, "acertos": 32}], "qt_dpm_0": [{"data": "22/04/2026", "total": 80, "acertos": 72}], "qt_mat_3": [{"data": "22/04/2026", "total": 20, "acertos": 18}], "qt_mat_2": [{"data": "22/04/2026", "total": 5, "acertos": 3}], "qt_port_0": [{"data": "22/04/2026", "total": 24, "acertos": 22}], "qt_t_1776970115457": [{"data": "23/04/2026", "total": 0, "acertos": 0}], "qt_dppm1": [{"data": "23/04/2026", "total": 14, "acertos": 14}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_p1": [{"data": "23/04/2026", "total": 24, "acertos": 22}, {"data": "24/04/2026", "total": 26, "acertos": 22}, {"data": "25/04/2026", "total": 26, "acertos": 24}, {"data": "28/04/2026", "total": 24, "acertos": 22}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_m3_8": [{"data": "23/04/2026", "total": 20, "acertos": 18}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_m3_9": [{"data": "23/04/2026", "total": 5, "acertos": 3}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dpm1": [{"data": "23/04/2026", "total": 80, "acertos": 72}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dh1": [{"data": "23/04/2026", "total": 40, "acertos": 32}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_inf1": [{"data": "24/04/2026", "total": 0, "acertos": 0}, {"data": "25/04/2026", "total": 0, "acertos": 0}, {"data": "29/04/2026", "total": 13, "acertos": 10}, {"data": "05/05/2026", "total": 99, "acertos": 74}, {"data": "12/05/2026", "total": 129, "acertos": 101}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_inf2": [{"data": "24/04/2026", "total": 0, "acertos": 0}, {"data": "12/05/2026", "total": 50, "acertos": 39}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_p3": [{"data": "24/04/2026", "total": 0, "acertos": 0}], "qt_p4_1": [{"data": "24/04/2026", "total": 0, "acertos": 0}], "qt_dcf1": [{"data": "24/04/2026", "total": 1, "acertos": 0}, {"data": "25/04/2026", "total": 0, "acertos": 0}], "qt_dpm2": [{"data": "25/04/2026", "total": 0, "acertos": 0}], "qt_p5_1": [{"data": "28/04/2026", "total": 13, "acertos": 5}, {"data": "04/05/2026", "total": 21, "acertos": 13}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dpm4": [{"data": "04/05/2026", "total": 34, "acertos": 32}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dpp1": [{"data": "07/05/2026", "total": 30, "acertos": 23}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dpp2": [{"data": "07/05/2026", "total": 10, "acertos": 8}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dpm5": [{"data": "11/05/2026", "total": 20, "acertos": 20}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dpm6": [{"data": "11/05/2026", "total": 15, "acertos": 15}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dpm7": [{"data": "11/05/2026", "total": 5, "acertos": 3}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dpm8": [{"data": "11/05/2026", "total": 4, "acertos": 2}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_la3": [{"data": "13/05/2026", "total": 40, "acertos": 32}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_la4": [{"data": "13/05/2026", "total": 30, "acertos": 28}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dcf4": [{"data": "13/05/2026", "total": 30, "acertos": 26}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dcf5": [{"data": "13/05/2026", "total": 22, "acertos": 13}, {"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dpm3": [{"data": "15/05/2026", "total": 0, "acertos": 0}]}, "sessoes": [{"id": "sess_1778596814632", "data": "12/05/2026", "hora": "11:40", "titulo": "Banco de Questões", "materia": "Noções de Informática", "total": 29, "acertos": 26, "duracao": 0, "taxa": 90}, {"id": "sess_1778501157049", "data": "11/05/2026", "hora": "09:05", "titulo": "Flash Cards — Revisão", "materia": "", "total": 7, "acertos": 6, "duracao": 0, "taxa": 86}, {"id": "sess_1778500978491", "data": "11/05/2026", "hora": "09:02", "titulo": "Banco de Questões", "materia": "Direito Penal Militar, Língua Portuguesa", "total": 3, "acertos": 4, "duracao": 0, "taxa": 133}, {"id": "sess_1777988061501", "data": "05/05/2026", "hora": "10:34", "titulo": "Banco de Questões", "materia": "Noções de Informática", "total": 4, "acertos": 4, "duracao": 0, "taxa": 100}, {"id": "sess_1777903459098", "data": "04/05/2026", "hora": "11:04", "titulo": "Banco de Questões", "materia": "Língua Portuguesa", "total": 8, "acertos": 7, "duracao": 0, "taxa": 88}, {"id": "sess_1777386303530", "data": "28/04/2026", "hora": "11:25", "titulo": "SIMULADO CAVEIRA 1 - PMAL 2026 - SOLDADO", "materia": "Língua Portuguesa, Noções de Informática", "total": 4, "acertos": 3, "duracao": 13, "taxa": 75}, {"id": "sess_1777383573886", "data": "28/04/2026", "hora": "23:19", "titulo": "Flash Cards — Revisão", "materia": "", "total": 10, "acertos": 0, "duracao": 0, "taxa": 0}, {"id": "sess_1777148207889", "data": "25/04/2026", "hora": "17:16", "titulo": "SIMULADO CAVEIRA 1 - PMAL 2026 - SOLDADO", "materia": "Língua Portuguesa, Noções de Informática", "total": 4, "acertos": 3, "duracao": 6, "taxa": 75}, {"id": "sess_1777144033230", "data": "25/04/2026", "hora": "23:53", "titulo": "Flash Cards — Revisão", "materia": "", "total": 20, "acertos": 0, "duracao": 0, "taxa": 0}, {"id": "sess_1777125634315", "data": "25/04/2026", "hora": "11:00", "titulo": "Banco de Questões", "materia": "Noções de Direito Constitucional", "total": 2, "acertos": 1, "duracao": 0, "taxa": 50}], "sessoesDiarias": {"22/04/2026": {"data": "22/04/2026", "questoes": {"total": 0, "acertos": 0, "duracao": 0, "blocos": []}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 0, "itens": []}, "edital": {"marcacoes": 1, "itens": [{"id": "la4", "hora": "22:26"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-04-23T01:25:46.804Z"}, "23/04/2026": {"data": "23/04/2026", "questoes": {"total": 0, "acertos": 0, "duracao": 0, "blocos": []}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 97, "itens": [{"key": "lei_1776899017137_art1", "lei": "Constituição do Estado de Alagoas", "art": 1, "hora": "00:28"}, {"key": "lei_1776899017137_art2", "lei": "Constituição do Estado de Alagoas", "art": 2, "hora": "00:28"}, {"key": "lei_1776899017137_art3", "lei": "Constituição do Estado de Alagoas", "art": 3, "hora": "00:28"}, {"key": "lei_1776899017137_art4", "lei": "Constituição do Estado de Alagoas", "art": 4, "hora": "00:28"}, {"key": "lei_1776899017137_art5", "lei": "Constituição do Estado de Alagoas", "art": 5, "hora": "00:28"}, {"key": "lei_1776899017137_art6", "lei": "Constituição do Estado de Alagoas", "art": 6, "hora": "00:28"}, {"key": "lei_1776899017137_art7", "lei": "Constituição do Estado de Alagoas", "art": 7, "hora": "00:28"}, {"key": "lei_1776899017137_art8", "lei": "Constituição do Estado de Alagoas", "art": 8, "hora": "00:28"}, {"key": "lei_1776899017137_art9", "lei": "Constituição do Estado de Alagoas", "art": 9, "hora": "00:28"}, {"key": "lei_1776899017137_art10", "lei": "Constituição do Estado de Alagoas", "art": 10, "hora": "00:28"}, {"key": "lei_1776899017137_art11", "lei": "Constituição do Estado de Alagoas", "art": 11, "hora": "00:28"}, {"key": "lei_1776899017137_art12", "lei": "Constituição do Estado de Alagoas", "art": 12, "hora": "00:28"}, {"key": "lei_1776899017137_art13", "lei": "Constituição do Estado de Alagoas", "art": 13, "hora": "00:28"}, {"key": "lei_1776899017137_art14", "lei": "Constituição do Estado de Alagoas", "art": 14, "hora": "00:28"}, {"key": "lei_1776899017137_art15", "lei": "Constituição do Estado de Alagoas", "art": 15, "hora": "00:28"}, {"key": "lei_1776899017137_art16", "lei": "Constituição do Estado de Alagoas", "art": 16, "hora": "00:28"}, {"key": "lei_1776899017137_art17", "lei": "Constituição do Estado de Alagoas", "art": 17, "hora": "00:28"}, {"key": "lei_1776899017137_art18", "lei": "Constituição do Estado de Alagoas", "art": 18, "hora": "00:28"}, {"key": "lei_1776899017137_art19", "lei": "Constituição do Estado de Alagoas", "art": 19, "hora": "00:28"}, {"key": "lei_1776899017137_art20", "lei": "Constituição do Estado de Alagoas", "art": 20, "hora": "00:28"}, {"key": "lei_1776899017137_art21", "lei": "Constituição do Estado de Alagoas", "art": 21, "hora": "00:28"}, {"key": "lei_1776899017137_art22", "lei": "Constituição do Estado de Alagoas", "art": 22, "hora": "00:28"}, {"key": "lei_1776899017137_art23", "lei": "Constituição do Estado de Alagoas", "art": 23, "hora": "00:28"}, {"key": "lei_1776899017137_art24", "lei": "Constituição do Estado de Alagoas", "art": 24, "hora": "00:28"}, {"key": "lei_1776899017137_art25", "lei": "Constituição do Estado de Alagoas", "art": 25, "hora": "00:28"}, {"key": "lei_1776899017137_art26", "lei": "Constituição do Estado de Alagoas", "art": 26, "hora": "00:28"}, {"key": "lei_1776899017137_art27", "lei": "Constituição do Estado de Alagoas", "art": 27, "hora": "00:28"}, {"key": "lei_1776899017137_art28", "lei": "Constituição do Estado de Alagoas", "art": 28, "hora": "00:28"}, {"key": "lei_1776899017137_art29", "lei": "Constituição do Estado de Alagoas", "art": 29, "hora": "00:28"}, {"key": "lei_1776899017137_art30", "lei": "Constituição do Estado de Alagoas", "art": 30, "hora": "00:28"}, {"key": "lei_1776899017137_art31", "lei": "Constituição do Estado de Alagoas", "art": 31, "hora": "00:28"}, {"key": "lei_1776899017137_art32", "lei": "Constituição do Estado de Alagoas", "art": 32, "hora": "00:28"}, {"key": "lei_1776899017137_art33", "lei": "Constituição do Estado de Alagoas", "art": 33, "hora": "00:28"}, {"key": "lei_1776899017137_art34", "lei": "Constituição do Estado de Alagoas", "art": 34, "hora": "00:28"}, {"key": "lei_1776899017137_art35", "lei": "Constituição do Estado de Alagoas", "art": 35, "hora": "00:28"}, {"key": "lei_1776899017137_art36", "lei": "Constituição do Estado de Alagoas", "art": 36, "hora": "00:28"}, {"key": "lei_1776899017137_art37", "lei": "Constituição do Estado de Alagoas", "art": 37, "hora": "00:28"}, {"key": "lei_1776899017137_art38", "lei": "Constituição do Estado de Alagoas", "art": 38, "hora": "00:28"}, {"key": "lei_1776899017137_art39", "lei": "Constituição do Estado de Alagoas", "art": 39, "hora": "00:28"}, {"key": "lei_1776899017137_art40", "lei": "Constituição do Estado de Alagoas", "art": 40, "hora": "00:28"}, {"key": "lei_1776899017137_art41", "lei": "Constituição do Estado de Alagoas", "art": 41, "hora": "00:28"}, {"key": "lei_1776899017137_art42", "lei": "Constituição do Estado de Alagoas", "art": 42, "hora": "00:28"}, {"key": "lei_1776899017137_art43", "lei": "Constituição do Estado de Alagoas", "art": 43, "hora": "00:28"}, {"key": "lei_1776899017137_art44", "lei": "Constituição do Estado de Alagoas", "art": 44, "hora": "00:28"}, {"key": "lei_1776899017137_art45", "lei": "Constituição do Estado de Alagoas", "art": 45, "hora": "00:28"}, {"key": "lei_1776899017137_art46", "lei": "Constituição do Estado de Alagoas", "art": 46, "hora": "00:28"}, {"key": "lei_1776899017137_art47", "lei": "Constituição do Estado de Alagoas", "art": 47, "hora": "00:28"}, {"key": "lei_1776899017137_art48", "lei": "Constituição do Estado de Alagoas", "art": 48, "hora": "00:28"}, {"key": "lei_1776899017137_art49", "lei": "Constituição do Estado de Alagoas", "art": 49, "hora": "00:28"}, {"key": "lei_1776899017137_art50", "lei": "Constituição do Estado de Alagoas", "art": 50, "hora": "00:28"}, {"key": "lei_1776899017137_art51", "lei": "Constituição do Estado de Alagoas", "art": 51, "hora": "00:28"}, {"key": "lei_1776899017137_art52", "lei": "Constituição do Estado de Alagoas", "art": 52, "hora": "00:28"}, {"key": "lei_1776899017137_art53", "lei": "Constituição do Estado de Alagoas", "art": 53, "hora": "00:28"}, {"key": "lei_1776899017137_art54", "lei": "Constituição do Estado de Alagoas", "art": 54, "hora": "00:28"}, {"key": "lei_1776899017137_art55", "lei": "Constituição do Estado de Alagoas", "art": 55, "hora": "00:28"}, {"key": "lei_1776899017137_art56", "lei": "Constituição do Estado de Alagoas", "art": 56, "hora": "00:28"}, {"key": "lei_1776899017137_art57", "lei": "Constituição do Estado de Alagoas", "art": 57, "hora": "00:28"}, {"key": "lei_1776899017137_art58", "lei": "Constituição do Estado de Alagoas", "art": 58, "hora": "00:28"}, {"key": "lei_1776899017137_art59", "lei": "Constituição do Estado de Alagoas", "art": 59, "hora": "00:28"}, {"key": "lei_1776899017137_art60", "lei": "Constituição do Estado de Alagoas", "art": 60, "hora": "00:28"}, {"key": "lei_1776899017137_art61", "lei": "Constituição do Estado de Alagoas", "art": 61, "hora": "00:28"}, {"key": "lei_1776899017137_art62", "lei": "Constituição do Estado de Alagoas", "art": 62, "hora": "00:28"}, {"key": "lei_1776899017137_art63", "lei": "Constituição do Estado de Alagoas", "art": 63, "hora": "00:28"}, {"key": "cf_t3_art18", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 18, "hora": "01:07"}, {"key": "cf_t3_art19", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 19, "hora": "01:07"}, {"key": "cf_t3_art20", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 20, "hora": "01:07"}, {"key": "cf_t3_art21", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 21, "hora": "01:07"}, {"key": "cf_t3_art22", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 22, "hora": "01:07"}, {"key": "cf_t3_art23", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 23, "hora": "01:07"}, {"key": "cf_t3_art24", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 24, "hora": "01:07"}, {"key": "cf_t3_art25", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 25, "hora": "01:07"}, {"key": "cf_t3_art26", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 26, "hora": "01:07"}, {"key": "cf_t3_art27", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 27, "hora": "01:07"}, {"key": "cf_t3_art28", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 28, "hora": "01:07"}, {"key": "cf_t3_art29", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 29, "hora": "01:07"}, {"key": "cf_t3_art30", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 30, "hora": "01:07"}, {"key": "cf_t3_art31", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 31, "hora": "01:07"}, {"key": "cf_t3_art32", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 32, "hora": "01:07"}, {"key": "cf_t3_art33", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 33, "hora": "01:07"}, {"key": "cf_t3_art34", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 34, "hora": "01:07"}, {"key": "cf_t3_art35", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 35, "hora": "01:07"}, {"key": "cf_t3_art36", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 36, "hora": "01:07"}, {"key": "cf_t3_art37", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 37, "hora": "01:07"}, {"key": "cf_t3_art38", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 38, "hora": "01:07"}, {"key": "cf_t3_art39", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 39, "hora": "01:07"}, {"key": "cf_t3_art40", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 40, "hora": "01:07"}, {"key": "cf_t3_art41", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 41, "hora": "01:07"}, {"key": "cf_t3_art42", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 42, "hora": "01:07"}, {"key": "cf_t3_art43", "lei": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "art": 43, "hora": "01:07"}, {"key": "cppm_01_art1", "lei": "CPPM — Processo Penal Militar e Aplicação (Arts. 1º a 6º)", "art": 1, "hora": "15:35"}, {"key": "cppm_01_art2", "lei": "CPPM — Processo Penal Militar e Aplicação (Arts. 1º a 6º)", "art": 2, "hora": "15:35"}, {"key": "cppm_01_art3", "lei": "CPPM — Processo Penal Militar e Aplicação (Arts. 1º a 6º)", "art": 3, "hora": "15:35"}, {"key": "cppm_01_art4", "lei": "CPPM — Processo Penal Militar e Aplicação (Arts. 1º a 6º)", "art": 4, "hora": "15:35"}, {"key": "cppm_01_art5", "lei": "CPPM — Processo Penal Militar e Aplicação (Arts. 1º a 6º)", "art": 5, "hora": "15:35"}, {"key": "cppm_01_art6", "lei": "CPPM — Processo Penal Militar e Aplicação (Arts. 1º a 6º)", "art": 6, "hora": "15:35"}, {"key": "cppm_02_art7", "lei": "CPPM — Polícia Judiciária Militar (Arts. 7º a 8º)", "art": 7, "hora": "15:35"}, {"key": "cppm_02_art8", "lei": "CPPM — Polícia Judiciária Militar (Arts. 7º a 8º)", "art": 8, "hora": "15:35"}]}, "edital": {"marcacoes": 4, "itens": [{"id": "dcf3", "hora": "00:28"}, {"id": "dppm1", "hora": "15:36"}, {"id": "dppm2", "hora": "15:36"}, {"id": "p5_2", "hora": "15:44"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": true, "criadoEm": "2026-04-23T03:28:33.190Z", "ultimoSalvamento": "2026-04-23T03:28:52.421Z"}, "24/04/2026": {"data": "24/04/2026", "questoes": {"total": 18, "acertos": 4, "duracao": 0, "blocos": [{"hora": "19:11", "titulo": "Flash Cards — PMAL 2026", "materia": "", "total": 9, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "20:08", "titulo": "Banco de Questões", "materia": "Língua Portuguesa", "total": 1, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "20:09", "titulo": "Banco de Questões", "materia": "Língua Portuguesa", "total": 1, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "20:10", "titulo": "Banco de Questões", "materia": "Língua Portuguesa", "total": 1, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "20:36", "titulo": "Caderno de Erros", "materia": "Língua Portuguesa", "total": 2, "acertos": 2, "taxa": 100, "duracao": 0}, {"hora": "21:35", "titulo": "Flash Cards — PMSE", "materia": "", "total": 1, "acertos": 1, "taxa": 100, "duracao": 0}, {"hora": "21:36", "titulo": "Flash Cards — Revisão", "materia": "", "total": 1, "acertos": 1, "taxa": 100, "duracao": 0}, {"hora": "21:44", "titulo": "Banco de Questões", "materia": "Língua Portuguesa, Noções de Direito Constitucional", "total": 1, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "23:28", "titulo": "Flash Cards — Revisão", "materia": "", "total": 1, "acertos": 0, "taxa": 0, "duracao": 0}]}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 38, "itens": [{"key": "leg_estat_pmal_art1", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 1, "hora": "16:20"}, {"key": "leg_estat_pmal_art2", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 2, "hora": "16:20"}, {"key": "leg_estat_pmal_art3", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 3, "hora": "16:20"}, {"key": "leg_estat_pmal_art4", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 4, "hora": "16:20"}, {"key": "leg_estat_pmal_art5", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 5, "hora": "16:20"}, {"key": "leg_estat_pmal_art6", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 6, "hora": "16:20"}, {"key": "leg_estat_pmal_art7", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 7, "hora": "16:20"}, {"key": "leg_estat_pmal_art8", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 8, "hora": "16:20"}, {"key": "leg_estat_pmal_art9", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 9, "hora": "16:20"}, {"key": "leg_estat_pmal_art10", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 10, "hora": "16:20"}, {"key": "leg_estat_pmal_art11", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 11, "hora": "16:20"}, {"key": "leg_estat_pmal_art12", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 12, "hora": "16:20"}, {"key": "leg_estat_pmal_art13", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 13, "hora": "16:20"}, {"key": "leg_estat_pmal_art14", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 14, "hora": "16:20"}, {"key": "leg_estat_pmal_art15", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 15, "hora": "16:20"}, {"key": "leg_estat_pmal_art16", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 16, "hora": "16:20"}, {"key": "leg_estat_pmal_art17", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 17, "hora": "16:20"}, {"key": "leg_estat_pmal_art18", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 18, "hora": "16:20"}, {"key": "leg_estat_pmal_art19", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 19, "hora": "16:20"}, {"key": "leg_estat_pmal_art20", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 20, "hora": "16:20"}, {"key": "leg_estat_pmal_art21", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 21, "hora": "16:20"}, {"key": "leg_estat_pmal_art22", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 22, "hora": "16:20"}, {"key": "leg_estat_pmal_art23", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 23, "hora": "16:20"}, {"key": "leg_estat_pmal_art24", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 24, "hora": "16:20"}, {"key": "leg_estat_pmal_art25", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 25, "hora": "16:20"}, {"key": "leg_estat_pmal_art26", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 26, "hora": "16:20"}, {"key": "leg_estat_pmal_art27", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 27, "hora": "16:20"}, {"key": "leg_estat_pmal_art28", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 28, "hora": "16:20"}, {"key": "leg_estat_pmal_art29", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 29, "hora": "16:20"}, {"key": "leg_estat_pmal_art30", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 30, "hora": "16:20"}, {"key": "leg_estat_pmal_art31", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 31, "hora": "16:20"}, {"key": "leg_estat_pmal_art32", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 32, "hora": "16:20"}, {"key": "leg_estat_pmal_art33", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 33, "hora": "16:20"}, {"key": "leg_estat_pmal_art34", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 34, "hora": "16:20"}, {"key": "leg_estat_pmal_art35", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 35, "hora": "16:20"}, {"key": "leg_estat_pmal_art36", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 36, "hora": "16:20"}, {"key": "leg_estat_pmal_art37", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 37, "hora": "16:20"}, {"key": "leg_estat_pmal_art38", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 38, "hora": "16:20"}]}, "edital": {"marcacoes": 5, "itens": [{"id": "p5_1", "hora": "19:52"}, {"id": "p5_2", "hora": "19:52"}, {"id": "inf3_1", "hora": "21:04"}, {"id": "inf3_2", "hora": "21:04"}, {"id": "inf3_3", "hora": "21:04"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": true, "criadoEm": "2026-04-24T04:54:21.250Z", "ultimoSalvamento": "2026-04-24T19:19:54.523Z"}, "25/04/2026": {"data": "25/04/2026", "questoes": {"total": 73, "acertos": 20, "duracao": 24, "blocos": [{"hora": "10:53", "titulo": "Banco de Questões", "materia": "Noções de Direito Constitucional", "total": 2, "acertos": 1, "taxa": 50, "duracao": 0}, {"hora": "10:54", "titulo": "Banco de Questões", "materia": "Noções de Direito Constitucional", "total": 2, "acertos": 2, "taxa": 50, "duracao": 0}, {"hora": "10:55", "titulo": "Banco de Questões", "materia": "Noções de Direito Constitucional", "total": 2, "acertos": 2, "taxa": 100, "duracao": 0}, {"hora": "10:58", "titulo": "Banco de Questões", "materia": "Noções de Direito Constitucional", "total": 1, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "10:59", "titulo": "Banco de Questões", "materia": "Noções de Direito Constitucional", "total": 2, "acertos": 1, "taxa": 50, "duracao": 0}, {"hora": "11:00", "titulo": "Banco de Questões", "materia": "Noções de Direito Constitucional", "total": 2, "acertos": 1, "taxa": 50, "duracao": 0}, {"hora": "11:08", "titulo": "Banco de Questões", "materia": "Noções de Direito Constitucional", "total": 1, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "11:09", "titulo": "Banco de Questões", "materia": "Noções de Direito Constitucional", "total": 2, "acertos": 1, "taxa": 50, "duracao": 0}, {"hora": "11:17", "titulo": "Banco de Questões", "materia": "Noções de Direito Constitucional", "total": 2, "acertos": 2, "taxa": 100, "duracao": 0}, {"hora": "11:18", "titulo": "Banco de Questões", "materia": "Noções de Direito Constitucional", "total": 1, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "15:57", "titulo": "Banco de Questões", "materia": "Noções de Direito Constitucional", "total": 1, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "16:07", "titulo": "Flash Cards — Revisão", "materia": "", "total": 1, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "16:32", "titulo": "Flash Cards — Revisão", "materia": "", "total": 1, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "16:55", "titulo": "Flash Cards — Revisão", "materia": "", "total": 1, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "17:16", "titulo": "SIMULADO CAVEIRA 1 - PMAL 2026 - SOLDADO", "materia": "Língua Portuguesa, Noções de Informática", "total": 4, "acertos": 3, "taxa": 75, "duracao": 6}, {"hora": "17:17", "titulo": "SIMULADO CAVEIRA 1 - PMAL 2026 - SOLDADO", "materia": "Língua Portuguesa, Noções de Informática", "total": 4, "acertos": 4, "taxa": 100, "duracao": 4}, {"hora": "21:11", "titulo": "SIMULADO CAVEIRA 1 - PMAL 2026 - SOLDADO", "materia": "Língua Portuguesa, Noções de Informática", "total": 4, "acertos": 3, "taxa": 75, "duracao": 14}, {"hora": "23:44", "titulo": "Flash Cards — Revisão", "materia": "", "total": 20, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "23:53", "titulo": "Flash Cards — Revisão", "materia": "", "total": 20, "acertos": 0, "taxa": 0, "duracao": 0}]}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 0, "itens": []}, "edital": {"marcacoes": 2, "itens": [{"id": "p4_1", "hora": "19:22"}, {"id": "p4_2", "hora": "19:22"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-04-25T13:53:46.840Z"}, "26/04/2026": {"data": "26/04/2026", "questoes": {"total": 0, "acertos": 0, "duracao": 0, "blocos": []}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 0, "itens": []}, "edital": {"marcacoes": 15, "itens": [{"id": "m2", "hora": "10:36"}, {"id": "m3_1", "hora": "10:36"}, {"id": "m3_2", "hora": "10:36"}, {"id": "m3_3", "hora": "10:36"}, {"id": "m3_4", "hora": "10:36"}, {"id": "m3_6", "hora": "15:20"}, {"id": "m3_5", "hora": "15:20"}, {"id": "m15", "hora": "15:20"}, {"id": "m3_7", "hora": "16:26"}, {"id": "m3", "hora": "17:01"}, {"id": "m18", "hora": "17:49"}, {"id": "al1_3", "hora": "22:24"}, {"id": "al1", "hora": "22:45"}, {"id": "s1_1", "hora": "23:39"}, {"id": "s1_2", "hora": "23:40"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-04-26T13:36:10.398Z"}, "27/04/2026": {"data": "27/04/2026", "questoes": {"total": 0, "acertos": 0, "duracao": 0, "blocos": []}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 0, "itens": []}, "edital": {"marcacoes": 1, "itens": [{"id": "s1", "hora": "01:01"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-04-27T04:01:23.298Z"}, "28/04/2026": {"data": "28/04/2026", "questoes": {"total": 64, "acertos": 3, "duracao": 13, "blocos": [{"hora": "10:39", "titulo": "Flash Cards — Revisão", "materia": "", "total": 20, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "10:44", "titulo": "Flash Cards — Revisão", "materia": "", "total": 10, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "10:45", "titulo": "Flash Cards — Revisão", "materia": "", "total": 20, "acertos": 0, "taxa": 0, "duracao": 0}, {"hora": "11:25", "titulo": "SIMULADO CAVEIRA 1 - PMAL 2026 - SOLDADO", "materia": "Língua Portuguesa, Noções de Informática", "total": 4, "acertos": 3, "taxa": 75, "duracao": 13}, {"hora": "23:19", "titulo": "Flash Cards — Revisão", "materia": "", "total": 10, "acertos": 0, "taxa": 0, "duracao": 0}]}, "tarefas": {"concluidas": 2, "itens": [{"tid": "d20260428_c3_2", "hora": "23:39", "desc": "1 Assunto Completo + Criação do Resumo (PROVA) — Rani Passos", "cat": "Informática"}, {"tid": "d20260428_c3_x1777037910656", "hora": "23:39", "desc": "Revisar as Questões e Flashcards", "cat": "Revisões Espaçadas"}]}, "artigos": {"total": 0, "itens": []}, "edital": {"marcacoes": 1, "itens": [{"id": "p5_1", "hora": "16:11"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-04-28T13:39:33.885Z"}, "29/04/2026": {"data": "29/04/2026", "questoes": {"total": 0, "acertos": 0, "duracao": 0, "blocos": []}, "tarefas": {"concluidas": 1, "itens": [{"tid": "d20260429_c4_2", "hora": "23:09", "desc": "1  Legislação completa — Criação do Resumo / Vídeo Aula", "cat": "Legislação Extravagante"}]}, "artigos": {"total": 19, "itens": [{"key": "cpm_crime_art29", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 29, "hora": "00:26"}, {"key": "cpm_crime_art30", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 30, "hora": "00:26"}, {"key": "cpm_crime_art31", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 31, "hora": "00:26"}, {"key": "cpm_crime_art32", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 32, "hora": "00:26"}, {"key": "cpm_crime_art33", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 33, "hora": "00:26"}, {"key": "cpm_crime_art34", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 34, "hora": "00:26"}, {"key": "cpm_crime_art35", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 35, "hora": "00:26"}, {"key": "cpm_crime_art36", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 36, "hora": "00:26"}, {"key": "cpm_crime_art37", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 37, "hora": "00:26"}, {"key": "cpm_crime_art38", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 38, "hora": "00:26"}, {"key": "cpm_crime_art39", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 39, "hora": "00:26"}, {"key": "cpm_crime_art40", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 40, "hora": "00:26"}, {"key": "cpm_crime_art41", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 41, "hora": "00:26"}, {"key": "cpm_crime_art42", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 42, "hora": "00:26"}, {"key": "cpm_crime_art43", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 43, "hora": "00:26"}, {"key": "cpm_crime_art44", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 44, "hora": "00:26"}, {"key": "cpm_crime_art45", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 45, "hora": "00:26"}, {"key": "cpm_crime_art46", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 46, "hora": "00:26"}, {"key": "cpm_crime_art47", "lei": "CPM — Do Crime (Arts. 29 a 47)", "art": 47, "hora": "00:26"}]}, "edital": {"marcacoes": 1, "itens": [{"id": "dpm2", "hora": "00:26"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-04-29T03:26:28.157Z"}, "03/05/2026": {"data": "03/05/2026", "questoes": {"total": 0, "acertos": 0, "duracao": 0, "blocos": []}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 0, "itens": []}, "edital": {"marcacoes": 3, "itens": [{"id": "la5", "hora": "23:09"}, {"id": "s2_1", "hora": "23:30"}, {"id": "s2_2", "hora": "23:51"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-05-04T02:09:10.385Z"}, "30/04/2026": {"data": "30/04/2026", "questoes": {"total": 0, "acertos": 0, "duracao": 0, "blocos": []}, "tarefas": {"concluidas": 1, "itens": [{"tid": "d20260430_c5_2", "hora": "23:09", "desc": "1 Parte da Lei Completa — Criação do Resumo / Vídeo Aula + Lei Seca", "cat": "Legislação Institucional"}]}, "artigos": {"total": 0, "itens": []}, "edital": {"marcacoes": 0}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-05-04T02:09:35.557Z"}, "04/05/2026": {"data": "04/05/2026", "questoes": {"total": 8, "acertos": 7, "duracao": 0, "blocos": [{"hora": "11:04", "titulo": "Banco de Questões", "materia": "Língua Portuguesa", "total": 8, "acertos": 7, "taxa": 88, "duracao": 0}]}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 7, "itens": [{"key": "cpm_imput_art48", "lei": "CPM — Imputabilidade Penal (Arts. 48 a 52)", "art": 48, "hora": "16:01"}, {"key": "cpm_imput_art49", "lei": "CPM — Imputabilidade Penal (Arts. 48 a 52)", "art": 49, "hora": "16:01"}, {"key": "cpm_imput_art50", "lei": "CPM — Imputabilidade Penal (Arts. 48 a 52)", "art": 50, "hora": "16:01"}, {"key": "cpm_imput_art51", "lei": "CPM — Imputabilidade Penal (Arts. 48 a 52)", "art": 51, "hora": "16:01"}, {"key": "cpm_imput_art52", "lei": "CPM — Imputabilidade Penal (Arts. 48 a 52)", "art": 52, "hora": "16:01"}, {"key": "cpm_concurso_art53", "lei": "CPM — Concurso de Agentes (Arts. 53 a 54)", "art": 53, "hora": "20:36"}, {"key": "cpm_concurso_art54", "lei": "CPM — Concurso de Agentes (Arts. 53 a 54)", "art": 54, "hora": "20:36"}]}, "edital": {"marcacoes": 4, "itens": [{"id": "s2_3", "hora": "01:24"}, {"id": "s2_4", "hora": "01:24"}, {"id": "dpm3", "hora": "16:01"}, {"id": "dpm4", "hora": "20:36"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-05-04T04:24:50.600Z"}, "05/05/2026": {"data": "05/05/2026", "questoes": {"total": 4, "acertos": 4, "duracao": 0, "blocos": [{"hora": "10:34", "titulo": "Banco de Questões", "materia": "Noções de Informática", "total": 4, "acertos": 4, "taxa": 100, "duracao": 0}]}, "tarefas": {"concluidas": 2, "itens": [{"tid": "d20260505_c3_x1777037910656", "hora": "10:43", "desc": "Revisar as Questões e Flashcards", "cat": "Revisões Espaçadas"}, {"tid": "d20260505_c3_2", "hora": "15:02", "desc": "1 Assunto Completo + Criação do Resumo (PROVA) — Rani Passos", "cat": "Informática"}]}, "artigos": {"total": 0, "itens": []}, "edital": {"marcacoes": 15, "itens": [{"id": "inf1", "hora": "17:52"}, {"id": "inf3_7", "hora": "17:52"}, {"id": "inf3_2", "hora": "17:52"}, {"id": "inf3_1", "hora": "17:52"}, {"id": "inf2", "hora": "17:52"}, {"id": "inf3_4", "hora": "17:53"}, {"id": "inf4", "hora": "17:53"}, {"id": "inf3_3", "hora": "18:20"}, {"id": "inf3_5", "hora": "18:21"}, {"id": "inf3_6", "hora": "18:21"}, {"id": "inf5_4", "hora": "18:56"}, {"id": "inf5_1", "hora": "18:57"}, {"id": "inf5_2", "hora": "18:57"}, {"id": "inf5_3", "hora": "19:44"}, {"id": "inf5_5", "hora": "19:46"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-05-05T13:34:21.501Z"}, "07/05/2026": {"data": "07/05/2026", "questoes": {"total": 0, "acertos": 0, "duracao": 0, "blocos": []}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 0, "itens": []}, "edital": {"marcacoes": 1, "itens": [{"id": "la6", "hora": "12:57"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-05-07T15:57:00.402Z"}, "08/05/2026": {"data": "08/05/2026", "questoes": {"total": 0, "acertos": 0, "duracao": 0, "blocos": []}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 74, "itens": [{"key": "leg_estat_pmal_art1", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 1, "hora": "01:07"}, {"key": "leg_estat_pmal_art2", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 2, "hora": "01:07"}, {"key": "leg_estat_pmal_art3", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 3, "hora": "01:07"}, {"key": "leg_estat_pmal_art4", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 4, "hora": "01:07"}, {"key": "leg_estat_pmal_art5", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 5, "hora": "01:07"}, {"key": "leg_estat_pmal_art6", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 6, "hora": "01:07"}, {"key": "leg_estat_pmal_art7", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 7, "hora": "01:07"}, {"key": "leg_estat_pmal_art8", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 8, "hora": "01:07"}, {"key": "leg_estat_pmal_art9", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 9, "hora": "01:07"}, {"key": "leg_estat_pmal_art10", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 10, "hora": "01:07"}, {"key": "leg_estat_pmal_art11", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 11, "hora": "01:07"}, {"key": "leg_estat_pmal_art12", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 12, "hora": "01:07"}, {"key": "leg_estat_pmal_art13", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 13, "hora": "01:07"}, {"key": "leg_estat_pmal_art14", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 14, "hora": "01:07"}, {"key": "leg_estat_pmal_art15", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 15, "hora": "01:07"}, {"key": "leg_estat_pmal_art16", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 16, "hora": "01:07"}, {"key": "leg_estat_pmal_art17", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 17, "hora": "01:07"}, {"key": "leg_estat_pmal_art18", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 18, "hora": "01:07"}, {"key": "leg_estat_pmal_art19", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 19, "hora": "01:07"}, {"key": "leg_estat_pmal_art20", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 20, "hora": "01:07"}, {"key": "leg_estat_pmal_art21", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 21, "hora": "01:07"}, {"key": "leg_estat_pmal_art22", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 22, "hora": "01:07"}, {"key": "leg_estat_pmal_art23", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 23, "hora": "01:07"}, {"key": "leg_estat_pmal_art24", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 24, "hora": "01:07"}, {"key": "leg_estat_pmal_art25", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 25, "hora": "01:07"}, {"key": "leg_estat_pmal_art26", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 26, "hora": "01:07"}, {"key": "leg_estat_pmal_art27", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 27, "hora": "01:07"}, {"key": "leg_estat_pmal_art28", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 28, "hora": "01:07"}, {"key": "leg_estat_pmal_art29", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 29, "hora": "01:07"}, {"key": "leg_estat_pmal_art30", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 30, "hora": "01:07"}, {"key": "leg_estat_pmal_art31", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 31, "hora": "01:07"}, {"key": "leg_estat_pmal_art32", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 32, "hora": "01:07"}, {"key": "leg_estat_pmal_art33", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 33, "hora": "01:07"}, {"key": "leg_estat_pmal_art34", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 34, "hora": "01:07"}, {"key": "leg_estat_pmal_art35", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 35, "hora": "01:07"}, {"key": "leg_estat_pmal_art36", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 36, "hora": "01:07"}, {"key": "leg_estat_pmal_art37", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 37, "hora": "01:07"}, {"key": "leg_estat_pmal_art38", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 38, "hora": "01:07"}, {"key": "leg_estat_pmal_art39", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 39, "hora": "01:07"}, {"key": "leg_estat_pmal_art40", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 40, "hora": "01:07"}, {"key": "leg_estat_pmal_art41", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 41, "hora": "01:07"}, {"key": "leg_estat_pmal_art42", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 42, "hora": "01:07"}, {"key": "leg_estat_pmal_art43", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 43, "hora": "01:07"}, {"key": "leg_estat_pmal_art44", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 44, "hora": "01:07"}, {"key": "leg_estat_pmal_art45", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 45, "hora": "01:07"}, {"key": "leg_estat_pmal_art46", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 46, "hora": "01:07"}, {"key": "leg_estat_pmal_art47", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 47, "hora": "01:07"}, {"key": "leg_estat_pmal_art48", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 48, "hora": "01:07"}, {"key": "leg_estat_pmal_art49", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 49, "hora": "01:07"}, {"key": "leg_estat_pmal_art50", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 50, "hora": "01:07"}, {"key": "leg_estat_pmal_art51", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 51, "hora": "01:07"}, {"key": "leg_estat_pmal_art52", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 52, "hora": "01:07"}, {"key": "leg_estat_pmal_art53", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 53, "hora": "01:07"}, {"key": "leg_estat_pmal_art54", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 54, "hora": "01:07"}, {"key": "leg_estat_pmal_art55", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 55, "hora": "01:07"}, {"key": "leg_estat_pmal_art56", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 56, "hora": "01:07"}, {"key": "leg_estat_pmal_art57", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 57, "hora": "01:07"}, {"key": "leg_estat_pmal_art58", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 58, "hora": "01:07"}, {"key": "leg_estat_pmal_art59", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 59, "hora": "01:07"}, {"key": "leg_estat_pmal_art60", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 60, "hora": "01:07"}, {"key": "leg_estat_pmal_art61", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 61, "hora": "01:07"}, {"key": "leg_estat_pmal_art62", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 62, "hora": "01:07"}, {"key": "leg_estat_pmal_art63", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 63, "hora": "01:07"}, {"key": "leg_estat_pmal_art64", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 64, "hora": "01:07"}, {"key": "leg_estat_pmal_art65", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 65, "hora": "01:07"}, {"key": "leg_estat_pmal_art66", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 66, "hora": "01:07"}, {"key": "leg_estat_pmal_art67", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 67, "hora": "01:07"}, {"key": "leg_estat_pmal_art68", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 68, "hora": "01:07"}, {"key": "leg_estat_pmal_art69", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 69, "hora": "01:07"}, {"key": "leg_estat_pmal_art70", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 70, "hora": "01:07"}, {"key": "leg_estat_pmal_art71", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 71, "hora": "01:07"}, {"key": "leg_estat_pmal_art72", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 72, "hora": "01:07"}, {"key": "leg_estat_pmal_art73", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 73, "hora": "01:07"}, {"key": "leg_estat_pmal_art74", "lei": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "art": 74, "hora": "01:07"}]}, "edital": {"marcacoes": 5, "itens": [{"id": "m16", "hora": "16:31"}, {"id": "m4", "hora": "18:21"}, {"id": "s3_1", "hora": "19:13"}, {"id": "s3_2", "hora": "19:41"}, {"id": "s3_3", "hora": "19:52"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-05-08T04:07:04.797Z"}, "09/05/2026": {"data": "09/05/2026", "questoes": {"total": 0, "acertos": 0, "duracao": 0, "blocos": []}, "tarefas": {"concluidas": 1, "itens": [{"tid": "d20260509_c7_1", "hora": "18:28", "desc": "1 Assunto Completo — Criação do Resumo", "cat": "Conhecimentos de Alagoas"}]}, "artigos": {"total": 0, "itens": []}, "edital": {"marcacoes": 2, "itens": [{"id": "al2_1", "hora": "10:33"}, {"id": "al2_2", "hora": "10:58"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-05-09T13:33:14.814Z"}, "10/05/2026": {"data": "10/05/2026", "questoes": {"total": 0, "acertos": 0, "duracao": 0, "blocos": []}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 64, "itens": [{"key": "lei_org_crim_art1", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 1, "hora": "21:41"}, {"key": "lei_org_crim_art2", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 2, "hora": "21:41"}, {"key": "lei_org_crim_art3", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 3, "hora": "21:41"}, {"key": "lei_org_crim_art4", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 4, "hora": "21:41"}, {"key": "lei_org_crim_art5", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 5, "hora": "21:41"}, {"key": "lei_org_crim_art6", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 6, "hora": "21:41"}, {"key": "lei_org_crim_art7", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 7, "hora": "21:41"}, {"key": "lei_org_crim_art8", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 8, "hora": "21:41"}, {"key": "lei_org_crim_art9", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 9, "hora": "21:41"}, {"key": "lei_org_crim_art10", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 10, "hora": "21:41"}, {"key": "lei_org_crim_art11", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 11, "hora": "21:41"}, {"key": "lei_org_crim_art12", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 12, "hora": "21:41"}, {"key": "lei_org_crim_art13", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 13, "hora": "21:41"}, {"key": "lei_org_crim_art14", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 14, "hora": "21:41"}, {"key": "lei_org_crim_art15", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 15, "hora": "21:41"}, {"key": "lei_org_crim_art16", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 16, "hora": "21:41"}, {"key": "lei_org_crim_art17", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 17, "hora": "21:41"}, {"key": "lei_org_crim_art18", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 18, "hora": "21:41"}, {"key": "lei_org_crim_art19", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 19, "hora": "21:41"}, {"key": "lei_org_crim_art20", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 20, "hora": "21:41"}, {"key": "lei_org_crim_art21", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 21, "hora": "21:41"}, {"key": "lei_org_crim_art22", "lei": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "art": 22, "hora": "21:41"}, {"key": "lei_tortura_art1", "lei": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "art": 1, "hora": "21:41"}, {"key": "lei_tortura_art2", "lei": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "art": 2, "hora": "21:41"}, {"key": "lei_tortura_art3", "lei": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "art": 3, "hora": "21:41"}, {"key": "lei_tortura_art4", "lei": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "art": 4, "hora": "21:41"}, {"key": "lei_tortura_art5", "lei": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "art": 5, "hora": "21:41"}, {"key": "lei_tortura_art6", "lei": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "art": 6, "hora": "21:41"}, {"key": "lei_tortura_art7", "lei": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "art": 7, "hora": "21:41"}, {"key": "lei_tortura_art8", "lei": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "art": 8, "hora": "21:41"}, {"key": "lei_tortura_art9", "lei": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "art": 9, "hora": "21:41"}, {"key": "lei_tortura_art10", "lei": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "art": 10, "hora": "21:41"}, {"key": "lei_tortura_art11", "lei": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "art": 11, "hora": "21:41"}, {"key": "lei_tortura_art12", "lei": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "art": 12, "hora": "21:41"}, {"key": "lei_tortura_art13", "lei": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "art": 13, "hora": "21:41"}, {"key": "lei_meio_amb_art1", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 1, "hora": "21:41"}, {"key": "lei_meio_amb_art2", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 2, "hora": "21:41"}, {"key": "lei_meio_amb_art3", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 3, "hora": "21:41"}, {"key": "lei_meio_amb_art4", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 4, "hora": "21:41"}, {"key": "lei_meio_amb_art5", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 5, "hora": "21:41"}, {"key": "lei_meio_amb_art6", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 6, "hora": "21:41"}, {"key": "lei_meio_amb_art7", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 7, "hora": "21:41"}, {"key": "lei_meio_amb_art8", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 8, "hora": "21:41"}, {"key": "lei_meio_amb_art9", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 9, "hora": "21:41"}, {"key": "lei_meio_amb_art10", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 10, "hora": "21:41"}, {"key": "lei_meio_amb_art11", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 11, "hora": "21:41"}, {"key": "lei_meio_amb_art12", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 12, "hora": "21:41"}, {"key": "lei_meio_amb_art13", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 13, "hora": "21:41"}, {"key": "lei_meio_amb_art14", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 14, "hora": "21:41"}, {"key": "lei_meio_amb_art15", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 15, "hora": "21:41"}, {"key": "lei_meio_amb_art16", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 16, "hora": "21:41"}, {"key": "lei_meio_amb_art17", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 17, "hora": "21:41"}, {"key": "lei_meio_amb_art18", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 18, "hora": "21:41"}, {"key": "lei_meio_amb_art19", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 19, "hora": "21:41"}, {"key": "lei_meio_amb_art20", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 20, "hora": "21:41"}, {"key": "lei_meio_amb_art21", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 21, "hora": "21:41"}, {"key": "lei_meio_amb_art22", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 22, "hora": "21:41"}, {"key": "lei_meio_amb_art23", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 23, "hora": "21:41"}, {"key": "lei_meio_amb_art24", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 24, "hora": "21:41"}, {"key": "lei_meio_amb_art25", "lei": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "art": 25, "hora": "21:41"}, {"key": "lei_desarmamento_art1", "lei": "LEI Nº 9.455/1997 — CRIMES DE TORTURA (ARTS. 1 A 4)", "art": 1, "hora": "21:41"}, {"key": "lei_desarmamento_art2", "lei": "LEI Nº 9.455/1997 — CRIMES DE TORTURA (ARTS. 1 A 4)", "art": 2, "hora": "21:41"}, {"key": "lei_desarmamento_art3", "lei": "LEI Nº 9.455/1997 — CRIMES DE TORTURA (ARTS. 1 A 4)", "art": 3, "hora": "21:41"}, {"key": "lei_desarmamento_art4", "lei": "LEI Nº 9.455/1997 — CRIMES DE TORTURA (ARTS. 1 A 4)", "art": 4, "hora": "21:41"}]}, "edital": {"marcacoes": 3, "itens": [{"id": "s3_4", "hora": "21:29"}, {"id": "s3_5", "hora": "21:29"}, {"id": "al2", "hora": "21:29"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-05-11T00:28:46.984Z"}, "11/05/2026": {"data": "11/05/2026", "questoes": {"total": 10, "acertos": 10, "duracao": 0, "blocos": [{"hora": "09:02", "titulo": "Banco de Questões", "materia": "Direito Penal Militar, Língua Portuguesa", "total": 3, "acertos": 4, "taxa": 133, "duracao": 0}, {"hora": "09:05", "titulo": "Flash Cards — Revisão", "materia": "", "total": 7, "acertos": 6, "taxa": 86, "duracao": 0}]}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 43, "itens": [{"key": "cpm_penas_art55", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 55, "hora": "12:40"}, {"key": "cpm_penas_art56", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 56, "hora": "12:40"}, {"key": "cpm_penas_art57", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 57, "hora": "12:40"}, {"key": "cpm_penas_art58", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 58, "hora": "12:40"}, {"key": "cpm_penas_art59", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 59, "hora": "12:40"}, {"key": "cpm_penas_art60", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 60, "hora": "12:40"}, {"key": "cpm_penas_art61", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 61, "hora": "12:40"}, {"key": "cpm_penas_art62", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 62, "hora": "12:40"}, {"key": "cpm_penas_art63", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 63, "hora": "12:40"}, {"key": "cpm_penas_art64", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 64, "hora": "12:40"}, {"key": "cpm_penas_art65", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 65, "hora": "12:40"}, {"key": "cpm_penas_art66", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 66, "hora": "12:40"}, {"key": "cpm_penas_art67", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 67, "hora": "12:40"}, {"key": "cpm_penas_art68", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 68, "hora": "12:40"}, {"key": "cpm_penas_art69", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 69, "hora": "12:40"}, {"key": "cpm_penas_art70", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 70, "hora": "12:40"}, {"key": "cpm_penas_art71", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 71, "hora": "12:40"}, {"key": "cpm_penas_art72", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 72, "hora": "12:40"}, {"key": "cpm_penas_art73", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 73, "hora": "12:40"}, {"key": "cpm_penas_art74", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 74, "hora": "12:40"}, {"key": "cpm_penas_art75", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 75, "hora": "12:40"}, {"key": "cpm_penas_art76", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 76, "hora": "12:40"}, {"key": "cpm_penas_art77", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 77, "hora": "12:40"}, {"key": "cpm_penas_art78", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 78, "hora": "12:40"}, {"key": "cpm_penas_art79", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 79, "hora": "12:40"}, {"key": "cpm_penas_art80", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 80, "hora": "12:40"}, {"key": "cpm_penas_art81", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 81, "hora": "12:40"}, {"key": "cpm_penas_art82", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 82, "hora": "12:40"}, {"key": "cpm_penas_art83", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 83, "hora": "12:40"}, {"key": "cpm_penas_art84", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 84, "hora": "12:40"}, {"key": "cpm_penas_art85", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 85, "hora": "12:40"}, {"key": "cpm_penas_art86", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 86, "hora": "12:40"}, {"key": "cpm_penas_art87", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 87, "hora": "12:40"}, {"key": "cpm_penas_art88", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 88, "hora": "12:40"}, {"key": "cpm_penas_art89", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 89, "hora": "12:40"}, {"key": "cpm_penas_art90", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 90, "hora": "12:40"}, {"key": "cpm_penas_art91", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 91, "hora": "12:40"}, {"key": "cpm_penas_art92", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 92, "hora": "12:40"}, {"key": "cpm_penas_art93", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 93, "hora": "12:40"}, {"key": "cpm_penas_art94", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 94, "hora": "12:40"}, {"key": "cpm_penas_art95", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 95, "hora": "12:40"}, {"key": "cpm_penas_art96", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 96, "hora": "12:40"}, {"key": "cpm_penas_art97", "lei": "CPM — Penas e Aplicação (Arts. 55 a 109)", "art": 97, "hora": "12:40"}]}, "edital": {"marcacoes": 4, "itens": [{"id": "dpm5", "hora": "12:38"}, {"id": "dpm6", "hora": "12:39"}, {"id": "dpm7", "hora": "12:39"}, {"id": "dpm8", "hora": "12:39"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-05-11T12:02:58.487Z"}, "12/05/2026": {"data": "12/05/2026", "questoes": {"total": 29, "acertos": 26, "duracao": 0, "blocos": [{"hora": "11:40", "titulo": "Banco de Questões", "materia": "Noções de Informática", "total": 29, "acertos": 26, "taxa": 90, "duracao": 0}]}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 37, "itens": [{"key": "cp_t3_art26", "lei": "CP — Parte Geral — Título III: Imputabilidade Penal (Arts. 26 a 28)", "art": 26, "hora": "22:46"}, {"key": "cp_t3_art27", "lei": "CP — Parte Geral — Título III: Imputabilidade Penal (Arts. 26 a 28)", "art": 27, "hora": "22:46"}, {"key": "cp_t3_art28", "lei": "CP — Parte Geral — Título III: Imputabilidade Penal (Arts. 26 a 28)", "art": 28, "hora": "22:46"}, {"key": "cp_pessoa_art121", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 121, "hora": "22:46"}, {"key": "cp_pessoa_art122", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 122, "hora": "22:46"}, {"key": "cp_pessoa_art123", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 123, "hora": "22:46"}, {"key": "cp_pessoa_art124", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 124, "hora": "22:46"}, {"key": "cp_pessoa_art125", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 125, "hora": "22:46"}, {"key": "cp_pessoa_art126", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 126, "hora": "22:46"}, {"key": "cp_pessoa_art127", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 127, "hora": "22:46"}, {"key": "cp_pessoa_art128", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 128, "hora": "22:46"}, {"key": "cp_pessoa_art129", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 129, "hora": "22:46"}, {"key": "cp_pessoa_art130", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 130, "hora": "22:46"}, {"key": "cp_pessoa_art131", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 131, "hora": "22:46"}, {"key": "cp_pessoa_art132", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 132, "hora": "22:46"}, {"key": "cp_pessoa_art133", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 133, "hora": "22:46"}, {"key": "cp_pessoa_art134", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 134, "hora": "22:46"}, {"key": "cp_pessoa_art135", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 135, "hora": "22:46"}, {"key": "cp_pessoa_art136", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 136, "hora": "22:46"}, {"key": "cp_pessoa_art137", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 137, "hora": "22:46"}, {"key": "cp_pessoa_art138", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 138, "hora": "22:46"}, {"key": "cp_pessoa_art139", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 139, "hora": "22:46"}, {"key": "cp_pessoa_art140", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 140, "hora": "22:46"}, {"key": "cp_pessoa_art141", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 141, "hora": "22:46"}, {"key": "cp_pessoa_art142", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 142, "hora": "22:46"}, {"key": "cp_pessoa_art143", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 143, "hora": "22:46"}, {"key": "cp_pessoa_art144", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 144, "hora": "22:46"}, {"key": "cp_pessoa_art145", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 145, "hora": "22:46"}, {"key": "cp_pessoa_art146", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 146, "hora": "22:46"}, {"key": "cp_pessoa_art147", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 147, "hora": "22:46"}, {"key": "cp_pessoa_art148", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 148, "hora": "22:46"}, {"key": "cp_pessoa_art149", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 149, "hora": "22:46"}, {"key": "cp_pessoa_art150", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 150, "hora": "22:46"}, {"key": "cp_pessoa_art151", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 151, "hora": "22:46"}, {"key": "cp_pessoa_art152", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 152, "hora": "22:46"}, {"key": "cp_pessoa_art153", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 153, "hora": "22:46"}, {"key": "cp_pessoa_art154", "lei": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "art": 154, "hora": "22:46"}]}, "edital": {"marcacoes": 2, "itens": [{"id": "p5_3", "hora": "00:19"}, {"id": "dp2_1", "hora": "22:46"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-05-12T03:19:21.233Z"}, "13/05/2026": {"data": "13/05/2026", "questoes": {"total": 0, "acertos": 0, "duracao": 0, "blocos": []}, "tarefas": {"concluidas": 0, "itens": []}, "artigos": {"total": 48, "itens": [{"key": "cf_t4_art44", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 44, "hora": "20:32"}, {"key": "cf_t4_art45", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 45, "hora": "20:32"}, {"key": "cf_t4_art46", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 46, "hora": "20:32"}, {"key": "cf_t4_art47", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 47, "hora": "20:32"}, {"key": "cf_t4_art48", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 48, "hora": "20:32"}, {"key": "cf_t4_art49", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 49, "hora": "20:32"}, {"key": "cf_t4_art50", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 50, "hora": "20:32"}, {"key": "cf_t4_art51", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 51, "hora": "20:32"}, {"key": "cf_t4_art52", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 52, "hora": "20:32"}, {"key": "cf_t4_art53", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 53, "hora": "20:32"}, {"key": "cf_t4_art54", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 54, "hora": "20:32"}, {"key": "cf_t4_art55", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 55, "hora": "20:32"}, {"key": "cf_t4_art56", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 56, "hora": "20:32"}, {"key": "cf_t4_art57", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 57, "hora": "20:32"}, {"key": "cf_t4_art58", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 58, "hora": "20:32"}, {"key": "cf_t4_art59", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 59, "hora": "20:32"}, {"key": "cf_t4_art60", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 60, "hora": "20:32"}, {"key": "cf_t4_art61", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 61, "hora": "20:32"}, {"key": "cf_t4_art62", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 62, "hora": "20:32"}, {"key": "cf_t4_art63", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 63, "hora": "20:32"}, {"key": "cf_t4_art64", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 64, "hora": "20:32"}, {"key": "cf_t4_art65", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 65, "hora": "20:32"}, {"key": "cf_t4_art66", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 66, "hora": "20:32"}, {"key": "cf_t4_art67", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 67, "hora": "20:32"}, {"key": "cf_t4_art68", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 68, "hora": "20:32"}, {"key": "cf_t4_art69", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 69, "hora": "20:32"}, {"key": "cf_t4_art70", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 70, "hora": "20:32"}, {"key": "cf_t4_art71", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 71, "hora": "20:32"}, {"key": "cf_t4_art72", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 72, "hora": "20:32"}, {"key": "cf_t4_art73", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 73, "hora": "20:32"}, {"key": "cf_t4_art74", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 74, "hora": "20:32"}, {"key": "cf_t4_art75", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 75, "hora": "20:32"}, {"key": "cf_t4_art76", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 76, "hora": "20:32"}, {"key": "cf_t4_art77", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 77, "hora": "20:32"}, {"key": "cf_t4_art78", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 78, "hora": "20:32"}, {"key": "cf_t4_art79", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 79, "hora": "20:32"}, {"key": "cf_t4_art80", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 80, "hora": "20:32"}, {"key": "cf_t4_art81", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 81, "hora": "20:32"}, {"key": "cf_t4_art82", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 82, "hora": "20:32"}, {"key": "cf_t4_art83", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 83, "hora": "20:32"}, {"key": "cf_t4_art84", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 84, "hora": "20:32"}, {"key": "cf_t4_art85", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 85, "hora": "20:32"}, {"key": "cf_t4_art86", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 86, "hora": "20:32"}, {"key": "cf_t4_art87", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 87, "hora": "20:32"}, {"key": "cf_t4_art88", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 88, "hora": "20:32"}, {"key": "cf_t4_art89", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 89, "hora": "20:32"}, {"key": "cf_t4_art90", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 90, "hora": "20:32"}, {"key": "cf_t4_art91", "lei": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "art": 91, "hora": "20:32"}]}, "edital": {"marcacoes": 3, "itens": [{"id": "dcf4", "hora": "19:53"}, {"id": "dcf5", "hora": "20:02"}, {"id": "la7", "hora": "23:51"}]}, "flashcards": {"revisoes": 0, "acertos": 0, "itens": []}, "salvaManualmente": false, "criadoEm": "2026-05-13T20:39:41.861Z"}}, "revisaoEspacada": {"q17770717654049o71": {"nivel": 1, "proxima": "25/04/2026"}, "q1777072014114mv9b": {"nivel": 1, "proxima": "25/04/2026"}, "q1777077774174ihsj": {"nivel": 0, "proxima": "24/04/2026"}, "q1777124976469lprp": {"nivel": 5, "proxima": "25/04/2026"}, "q1777125098528tqio": {"nivel": 3, "proxima": "25/04/2026"}}, "progresso": {"dpp1_e": false, "dpp2_e": false, "dh1_e": false, "dh2_e": false, "dh3_e": false, "dh4_e": false, "dh5_e": false, "dp1_e": false, "dpm1_e": false, "dcf1_e": false, "dcf2_e": false, "la3_e": false, "m1_e": false, "m2_e": false, "m3_e": false, "m5_e": false, "m6_e": false, "al1_1_e": false, "al1_2_e": false, "la4_e": false, "dcf3_e": false, "dppm1_e": false, "dppm2_e": false, "da1_e": false, "da2_e": false, "da3_e": false, "da4_e": false, "da5_e": false, "da6_e": false, "da7_e": false, "da8_e": false, "da9_e": false, "da10_e": false, "da11_e": false, "da12_e": false, "da13_e": false, "da14_e": false, "p5_2_e": false, "la1_e": false, "p5_1_e": false, "p5_e": false, "p5_3_e": false, "p5_4_e": false, "p5_5_e": false, "p5_6_e": false, "p5_7_e": false, "p5_8_e": false, "i1_e": false, "i2_e": false, "inf3_1_e": false, "inf3_2_e": false, "inf3_3_e": false, "inf3_e": false, "inf3_4_e": false, "inf3_5_e": false, "inf3_6_e": false, "inf3_7_e": false, "p4_e": false, "p4_1_e": false, "p4_2_e": false, "dpm2_e": false, "m3_1_e": false, "m3_2_e": false, "m3_3_e": false, "m3_4_e": false, "m3_5_e": false, "m3_6_e": false, "m3_7_e": false, "m3_8_e": false, "m3_9_e": false, "m2_1_e": false, "m2_2_e": false, "m2_3_e": false, "m5_1_e": false, "m5_2_e": false, "m5_3_e": false, "m5_4_e": false, "m5_5_e": false, "m5_6_e": false, "m5_7_e": false, "m6_1_e": false, "m6_2_e": false, "m6_3_e": false, "m15_e": false, "m15_1_e": false, "m15_2_e": false, "m15_3_e": false, "m15_4_e": false, "m15_5_e": false, "m18_e": false, "m18_1_e": false, "m18_2_e": false, "m18_3_e": false, "m18_4_e": false, "al1_3_e": false, "al1_e": false, "al1_4_e": false, "s1_1_e": false, "s1_2_e": false, "s1_e": false, "s1_3_e": false, "s1_4_e": false, "s1_5_e": false, "p3_e": false, "inf1_e": false, "inf2_e": false, "la5_e": false, "s2_1_e": false, "s2_2_e": false, "s2_3_e": false, "s2_4_e": false, "s2_e": false, "dpm3_e": false, "dpm4_e": false, "dpm14_e": false, "dpm15_e": false, "dpm16_e": false, "dpm13_e": false, "lp1_e": false, "inf4_e": false, "inf5_1_e": false, "inf5_4_e": false, "inf5_2_e": false, "inf5_3_e": false, "inf5_5_e": false, "inf5_e": false, "la6_e": false, "m16_e": false, "m16_1_e": false, "m16_2_e": false, "m16_3_e": false, "m4_e": false, "m4_1_e": false, "m4_2_e": false, "m4_3_e": false, "m4_4_e": false, "s3_1_e": false, "s3_2_e": false, "s3_3_e": false, "al2_1_e": false, "al2_2_e": false, "s3_4_e": false, "s3_5_e": false, "al2_e": false, "al2_3_e": false, "dpm5_e": false, "dpm6_e": false, "dpm7_e": false, "dpm8_e": false, "dp2_1_e": false, "dcf4_e": false, "dcf5_e": false, "la13_e": false, "la9_e": false, "la14_e": false, "la10_e": false, "la11_e": false, "la7_e": false, "la8_e": false, "la12_e": false, "s3_e": false, "s3_6_e": false, "s3_7_e": false, "s3_8_e": false, "s3_9_e": false, "s3_10_e": false, "s3_11_e": false, "s3_12_e": false, "s3_13_e": false, "s3_14_e": false, "s3_15_e": false, "s3_16_e": false, "s3_17_e": false}, "leitura": {"leit_cf_t1_1": false, "leit_cf_t1_2": false, "leit_cf_t1_3": false, "leit_cf_t1_4": false, "leit_cf_t2_5": false, "leit_cf_t2_6": false, "leit_cf_t2_7": false, "leit_cf_t2_8": false, "leit_cf_t2_9": false, "leit_cf_t2_10": false, "leit_cf_t2_11": false, "leit_cf_t2_12": false, "leit_cf_t2_13": false, "leit_cf_t2_14": false, "leit_cf_t2_15": false, "leit_cf_t2_16": false, "leit_cf_t2_17": false, "leit_cp_t1_1": false, "leit_cp_t1_2": false, "leit_cp_t1_3": false, "leit_cp_t1_4": false, "leit_cp_t1_5": false, "leit_cp_t1_6": false, "leit_cp_t1_7": false, "leit_cp_t1_8": false, "leit_cp_t1_9": false, "leit_cp_t1_10": false, "leit_cp_t1_11": false, "leit_cp_t1_12": false, "leit_cp_t2_13": false, "leit_cp_t2_14": false, "leit_cp_t2_15": false, "leit_cp_t2_16": false, "leit_cp_t2_17": false, "leit_cp_t2_18": false, "leit_cp_t2_19": false, "leit_cp_t2_20": false, "leit_cp_t2_21": false, "leit_cp_t2_22": false, "leit_cp_t2_23": false, "leit_cp_t2_24": false, "leit_cp_t2_25": false, "leit_cadh_1": false, "leit_cadh_2": false, "leit_cadh_3": false, "leit_cadh_4": false, "leit_cadh_5": false, "leit_cadh_6": false, "leit_cadh_7": false, "leit_cadh_8": false, "leit_cadh_9": false, "leit_cadh_10": false, "leit_cadh_11": false, "leit_cadh_12": false, "leit_cadh_13": false, "leit_cadh_14": false, "leit_cadh_15": false, "leit_cadh_16": false, "leit_cadh_17": false, "leit_cadh_18": false, "leit_cadh_19": false, "leit_cadh_20": false, "leit_cadh_21": false, "leit_cadh_22": false, "leit_cadh_23": false, "leit_cadh_24": false, "leit_cadh_25": false, "leit_cadh_26": false, "leit_cadh_27": false, "leit_cadh_28": false, "leit_cadh_29": false, "leit_cadh_30": false, "leit_cadh_31": false, "leit_cadh_32": false, "leit_cadh_33": false, "leit_cadh_34": false, "leit_cadh_35": false, "leit_cadh_36": false, "leit_cadh_37": false, "leit_cadh_38": false, "leit_cadh_39": false, "leit_cadh_40": false, "leit_cadh_41": false, "leit_cadh_42": false, "leit_cadh_43": false, "leit_cadh_44": false, "leit_cadh_45": false, "leit_cadh_46": false, "leit_cadh_47": false, "leit_cadh_48": false, "leit_cadh_49": false, "leit_cadh_50": false, "leit_cadh_51": false, "leit_cadh_52": false, "leit_cadh_53": false, "leit_cadh_54": false, "leit_cadh_55": false, "leit_cadh_56": false, "leit_cadh_57": false, "leit_cadh_58": false, "leit_cadh_59": false, "leit_cadh_60": false, "leit_cadh_61": false, "leit_cadh_62": false, "leit_cadh_63": false, "leit_cadh_64": false, "leit_cadh_65": false, "leit_cadh_66": false, "leit_cadh_67": false, "leit_cadh_68": false, "leit_cadh_69": false, "leit_cadh_70": false, "leit_cadh_71": false, "leit_cadh_72": false, "leit_cadh_73": false, "leit_cadh_74": false, "leit_cadh_75": false, "leit_cadh_76": false, "leit_cadh_77": false, "leit_cadh_78": false, "leit_cadh_79": false, "leit_cadh_80": false, "leit_cadh_81": false, "leit_cadh_82": false, "leit_cpm_ap_1": false, "leit_cpm_ap_2": false, "leit_cpm_ap_3": false, "leit_cpm_ap_4": false, "leit_cpm_ap_5": false, "leit_cpm_ap_6": false, "leit_cpm_ap_7": false, "leit_cpm_ap_8": false, "leit_cpm_ap_9": false, "leit_cpm_ap_10": false, "leit_cpm_ap_11": false, "leit_cpm_ap_12": false, "leit_cpm_ap_13": false, "leit_cpm_ap_14": false, "leit_cpm_ap_15": false, "leit_cpm_ap_16": false, "leit_cpm_ap_17": false, "leit_cpm_ap_18": false, "leit_cpm_ap_19": false, "leit_cpm_ap_20": false, "leit_cpm_ap_21": false, "leit_cpm_ap_22": false, "leit_cpm_ap_23": false, "leit_cpm_ap_24": false, "leit_cpm_ap_25": false, "leit_cpm_ap_26": false, "leit_cpm_ap_27": false, "leit_cpm_ap_28": false, "leit_leg_estat_pmal_1": false, "leit_leg_estat_pmal_2": false, "leit_leg_estat_pmal_3": false, "leit_leg_estat_pmal_4": false, "leit_leg_estat_pmal_5": false, "leit_leg_estat_pmal_6": false, "leit_leg_estat_pmal_7": false, "leit_leg_estat_pmal_8": false, "leit_leg_estat_pmal_9": false, "leit_leg_estat_pmal_10": false, "leit_leg_estat_pmal_11": false, "leit_leg_estat_pmal_12": false, "leit_leg_estat_pmal_13": false, "leit_leg_estat_pmal_14": false, "leit_lei_1776899017137_1": false, "leit_lei_1776899017137_2": false, "leit_lei_1776899017137_3": false, "leit_lei_1776899017137_4": false, "leit_lei_1776899017137_5": false, "leit_lei_1776899017137_6": false, "leit_lei_1776899017137_7": false, "leit_lei_1776899017137_8": false, "leit_lei_1776899017137_9": false, "leit_lei_1776899017137_10": false, "leit_lei_1776899017137_11": false, "leit_lei_1776899017137_12": false, "leit_lei_1776899017137_13": false, "leit_lei_1776899017137_14": false, "leit_lei_1776899017137_15": false, "leit_lei_1776899017137_16": false, "leit_lei_1776899017137_17": false, "leit_lei_1776899017137_18": false, "leit_lei_1776899017137_19": false, "leit_lei_1776899017137_20": false, "leit_lei_1776899017137_21": false, "leit_lei_1776899017137_22": false, "leit_lei_1776899017137_23": false, "leit_lei_1776899017137_24": false, "leit_lei_1776899017137_25": false, "leit_lei_1776899017137_26": false, "leit_lei_1776899017137_27": false, "leit_lei_1776899017137_28": false, "leit_lei_1776899017137_29": false, "leit_lei_1776899017137_30": false, "leit_lei_1776899017137_31": false, "leit_lei_1776899017137_32": false, "leit_lei_1776899017137_33": false, "leit_lei_1776899017137_34": false, "leit_lei_1776899017137_35": false, "leit_lei_1776899017137_36": false, "leit_lei_1776899017137_37": false, "leit_lei_1776899017137_38": false, "leit_lei_1776899017137_39": false, "leit_lei_1776899017137_40": false, "leit_lei_1776899017137_41": false, "leit_lei_1776899017137_42": false, "leit_lei_1776899017137_43": false, "leit_lei_1776899017137_44": false, "leit_lei_1776899017137_45": false, "leit_lei_1776899017137_46": false, "leit_lei_1776899017137_47": false, "leit_lei_1776899017137_48": false, "leit_lei_1776899017137_49": false, "leit_lei_1776899017137_50": false, "leit_lei_1776899017137_51": false, "leit_lei_1776899017137_52": false, "leit_lei_1776899017137_53": false, "leit_lei_1776899017137_54": false, "leit_lei_1776899017137_55": false, "leit_lei_1776899017137_56": false, "leit_lei_1776899017137_57": false, "leit_lei_1776899017137_58": false, "leit_lei_1776899017137_59": false, "leit_lei_1776899017137_60": false, "leit_lei_1776899017137_61": false, "leit_lei_1776899017137_62": false, "leit_lei_1776899017137_63": false, "leit_cf_t3_18": false, "leit_cf_t3_19": false, "leit_cf_t3_20": false, "leit_cf_t3_21": false, "leit_cf_t3_22": false, "leit_cf_t3_23": false, "leit_cf_t3_24": false, "leit_cf_t3_25": false, "leit_cf_t3_26": false, "leit_cf_t3_27": false, "leit_cf_t3_28": false, "leit_cf_t3_29": false, "leit_cf_t3_30": false, "leit_cf_t3_31": false, "leit_cf_t3_32": false, "leit_cf_t3_33": false, "leit_cf_t3_34": false, "leit_cf_t3_35": false, "leit_cf_t3_36": false, "leit_cf_t3_37": false, "leit_cf_t3_38": false, "leit_cf_t3_39": false, "leit_cf_t3_40": false, "leit_cf_t3_41": false, "leit_cf_t3_42": false, "leit_cf_t3_43": false, "leit_cppm_01_1": false, "leit_cppm_01_2": false, "leit_cppm_01_3": false, "leit_cppm_01_4": false, "leit_cppm_01_5": false, "leit_cppm_01_6": false, "leit_cppm_02_7": false, "leit_cppm_02_8": false, "leit_leg_estat_pmal_15": false, "leit_leg_estat_pmal_16": false, "leit_leg_estat_pmal_17": false, "leit_leg_estat_pmal_18": false, "leit_leg_estat_pmal_19": false, "leit_leg_estat_pmal_20": false, "leit_leg_estat_pmal_21": false, "leit_leg_estat_pmal_22": false, "leit_leg_estat_pmal_23": false, "leit_leg_estat_pmal_24": false, "leit_leg_estat_pmal_25": false, "leit_leg_estat_pmal_26": false, "leit_leg_estat_pmal_27": false, "leit_leg_estat_pmal_28": false, "leit_leg_estat_pmal_29": false, "leit_leg_estat_pmal_30": false, "leit_leg_estat_pmal_31": false, "leit_leg_estat_pmal_32": false, "leit_leg_estat_pmal_33": false, "leit_leg_estat_pmal_34": false, "leit_leg_estat_pmal_35": false, "leit_leg_estat_pmal_36": false, "leit_leg_estat_pmal_37": false, "leit_leg_estat_pmal_38": false, "leit_leg_estat_pmal_39": false, "leit_leg_estat_pmal_40": false, "leit_leg_estat_pmal_41": false, "leit_leg_estat_pmal_42": false, "leit_leg_estat_pmal_43": false, "leit_leg_estat_pmal_44": false, "leit_leg_estat_pmal_45": false, "leit_leg_estat_pmal_46": false, "leit_leg_estat_pmal_47": false, "leit_leg_estat_pmal_48": false, "leit_leg_estat_pmal_49": false, "leit_leg_estat_pmal_50": false, "leit_leg_estat_pmal_51": false, "leit_leg_estat_pmal_52": false, "leit_leg_estat_pmal_53": false, "leit_leg_estat_pmal_54": false, "leit_leg_estat_pmal_55": false, "leit_leg_estat_pmal_56": false, "leit_leg_estat_pmal_57": false, "leit_leg_estat_pmal_58": false, "leit_leg_estat_pmal_59": false, "leit_leg_estat_pmal_60": false, "leit_leg_estat_pmal_61": false, "leit_leg_estat_pmal_62": false, "leit_leg_estat_pmal_63": false, "leit_leg_estat_pmal_64": false, "leit_leg_estat_pmal_65": false, "leit_leg_estat_pmal_66": false, "leit_leg_estat_pmal_67": false, "leit_leg_estat_pmal_68": false, "leit_leg_estat_pmal_69": false, "leit_leg_estat_pmal_70": false, "leit_leg_estat_pmal_71": false, "leit_leg_estat_pmal_72": false, "leit_leg_estat_pmal_73": false, "leit_leg_estat_pmal_74": false, "leit_leg_estat_pmal_75": false, "leit_leg_estat_pmal_76": false, "leit_leg_estat_pmal_77": false, "leit_leg_estat_pmal_78": false, "leit_leg_estat_pmal_79": false, "leit_leg_estat_pmal_80": false, "leit_leg_estat_pmal_81": false, "leit_leg_estat_pmal_82": false, "leit_leg_estat_pmal_83": false, "leit_leg_estat_pmal_84": false, "leit_leg_estat_pmal_85": false, "leit_leg_estat_pmal_86": false, "leit_leg_estat_pmal_87": false, "leit_leg_estat_pmal_88": false, "leit_leg_estat_pmal_89": false, "leit_leg_estat_pmal_90": false, "leit_leg_estat_pmal_91": false, "leit_leg_estat_pmal_92": false, "leit_leg_estat_pmal_93": false, "leit_leg_estat_pmal_94": false, "leit_leg_estat_pmal_95": false, "leit_leg_estat_pmal_96": false, "leit_leg_estat_pmal_97": false, "leit_leg_estat_pmal_98": false, "leit_leg_estat_pmal_99": false, "leit_leg_estat_pmal_100": false, "leit_leg_estat_pmal_101": false, "leit_leg_estat_pmal_102": false, "leit_leg_estat_pmal_103": false, "leit_leg_estat_pmal_104": false, "leit_leg_estat_pmal_105": false, "leit_leg_estat_pmal_106": false, "leit_leg_estat_pmal_107": false, "leit_leg_estat_pmal_108": false, "leit_leg_estat_pmal_109": false, "leit_leg_estat_pmal_110": false, "leit_leg_estat_pmal_111": false, "leit_leg_estat_pmal_112": false, "leit_leg_estat_pmal_113": false, "leit_leg_estat_pmal_114": false, "leit_leg_estat_pmal_115": false, "leit_leg_estat_pmal_116": false, "leit_leg_estat_pmal_117": false, "leit_leg_estat_pmal_118": false, "leit_leg_estat_pmal_119": false, "leit_leg_estat_pmal_120": false, "leit_leg_estat_pmal_121": false, "leit_leg_estat_pmal_122": false, "leit_leg_estat_pmal_123": false, "leit_leg_estat_pmal_124": false, "leit_leg_estat_pmal_125": false, "leit_leg_estat_pmal_126": false, "leit_leg_estat_pmal_127": false, "leit_leg_estat_pmal_128": false, "leit_leg_estat_pmal_129": false, "leit_leg_estat_pmal_130": false, "leit_leg_estat_pmal_131": false, "leit_leg_estat_pmal_132": false, "leit_leg_estat_pmal_133": false, "leit_leg_estat_pmal_134": false, "leit_leg_estat_pmal_135": false, "leit_cp_pessoa_121": false, "leit_cp_pessoa_122": false, "leit_cp_pessoa_123": false, "leit_cp_pessoa_124": false, "leit_cp_pessoa_125": false, "leit_cp_pessoa_126": false, "leit_cp_pessoa_127": false, "leit_cp_pessoa_128": false, "leit_cp_pessoa_129": false, "leit_cp_pessoa_130": false, "leit_cp_pessoa_131": false, "leit_cp_pessoa_132": false, "leit_cp_pessoa_133": false, "leit_cp_pessoa_134": false, "leit_cp_pessoa_135": false, "leit_cp_pessoa_136": false, "leit_cp_pessoa_137": false, "leit_cp_pessoa_138": false, "leit_cp_pessoa_139": false, "leit_cp_pessoa_140": false, "leit_cp_pessoa_141": false, "leit_cp_pessoa_142": false, "leit_cp_pessoa_143": false, "leit_cp_pessoa_144": false, "leit_cp_pessoa_145": false, "leit_cp_pessoa_146": false, "leit_cp_pessoa_147": false, "leit_cp_pessoa_148": false, "leit_cp_pessoa_149": false, "leit_cp_pessoa_150": false, "leit_cp_pessoa_151": false, "leit_cp_pessoa_152": false, "leit_cp_pessoa_153": false, "leit_cp_pessoa_154": false, "leit_cf_t4_44": false, "leit_cf_t4_45": false, "leit_cf_t4_46": false, "leit_cf_t4_47": false, "leit_cf_t4_48": false, "leit_cf_t4_49": false, "leit_cf_t4_50": false, "leit_cf_t4_51": false, "leit_cf_t4_52": false, "leit_cf_t4_53": false, "leit_cf_t4_54": false, "leit_cf_t4_55": false, "leit_cf_t4_56": false, "leit_cf_t4_57": false, "leit_cf_t4_58": false, "leit_cf_t4_59": false, "leit_cf_t4_60": false, "leit_cf_t4_61": false, "leit_cf_t4_62": false, "leit_cf_t4_63": false, "leit_cf_t4_64": false, "leit_cf_t4_65": false, "leit_cf_t4_66": false, "leit_cf_t4_67": false, "leit_cf_t4_68": false, "leit_cf_t4_69": false, "leit_cf_t4_70": false, "leit_cf_t4_71": false, "leit_cf_t4_72": false, "leit_cf_t4_73": false, "leit_cf_t4_74": false, "leit_cf_t4_75": false, "leit_cf_t4_76": false, "leit_cf_t4_77": false, "leit_cf_t4_78": false, "leit_cf_t4_79": false, "leit_cf_t4_80": false, "leit_cf_t4_81": false, "leit_cf_t4_82": false, "leit_cf_t4_83": false, "leit_cf_t4_84": false, "leit_cf_t4_85": false, "leit_cf_t4_86": false, "leit_cf_t4_87": false, "leit_cf_t4_88": false, "leit_cf_t4_89": false, "leit_cf_t4_90": false, "leit_cf_t4_91": false, "leit_cf_t4_92": false, "leit_cf_t4_93": false, "leit_cf_t4_94": false, "leit_cf_t4_95": false, "leit_cf_t4_96": false, "leit_cf_t4_97": false, "leit_cf_t4_98": false, "leit_cf_t4_99": false, "leit_cf_t4_100": false, "leit_cf_t4_101": false, "leit_cf_t4_102": false, "leit_cf_t4_103": false, "leit_cf_t4_104": false, "leit_cf_t4_105": false, "leit_cf_t4_106": false, "leit_cf_t4_107": false, "leit_cf_t4_108": false, "leit_cf_t4_109": false, "leit_cf_t4_110": false, "leit_cf_t4_111": false, "leit_cf_t4_112": false, "leit_cf_t4_113": false, "leit_cf_t4_114": false, "leit_cf_t4_115": false, "leit_cf_t4_116": false, "leit_cf_t4_117": false, "leit_cf_t4_118": false, "leit_cf_t4_119": false, "leit_cf_t4_120": false, "leit_cf_t4_121": false, "leit_cf_t4_122": false, "leit_cf_t4_123": false, "leit_cf_t4_124": false, "leit_cf_t4_125": false, "leit_cf_t4_126": false, "leit_cf_t4_127": false, "leit_cf_t4_128": false, "leit_cf_t4_129": false, "leit_cf_t4_130": false, "leit_cf_t4_131": false, "leit_cf_t4_132": false, "leit_cf_t4_133": false, "leit_cf_t4_134": false, "leit_cf_t4_135": false, "leit_lei_jec_1": false, "leit_lei_jec_2": false, "leit_lei_jec_3": false, "leit_lei_jec_4": false, "leit_lei_jec_5": false, "leit_lei_jec_6": false, "leit_lei_jec_7": false, "leit_lei_jec_8": false, "leit_lei_jec_9": false, "leit_lei_jec_10": false, "leit_lei_jec_11": false, "leit_lei_jec_12": false, "leit_lei_jec_13": false, "leit_lei_jec_14": false, "leit_lei_jec_15": false, "leit_lei_jec_16": false, "leit_lei_jec_17": false, "leit_lei_jec_18": false, "leit_lei_jec_19": false, "leit_lei_jec_20": false, "leit_lei_jec_21": false, "leit_lei_jec_22": false, "leit_lei_jec_23": false, "leit_lei_jec_24": false, "leit_lei_jec_25": false, "leit_lei_jec_26": false, "leit_lei_jec_27": false, "leit_lei_jec_28": false, "leit_lei_jec_29": false, "leit_lei_jec_30": false, "leit_lei_jec_31": false, "leit_lei_jec_32": false, "leit_lei_jec_33": false, "leit_lei_jec_34": false, "leit_lei_jec_35": false, "leit_lei_jec_36": false, "leit_lei_jec_37": false, "leit_lei_jec_38": false, "leit_lei_jec_39": false, "leit_lei_jec_40": false, "leit_lei_jec_41": false, "leit_lei_jec_42": false, "leit_lei_jec_43": false, "leit_lei_jec_44": false, "leit_lei_jec_45": false, "leit_lei_jec_46": false, "leit_lei_jec_47": false, "leit_lei_jec_48": false, "leit_lei_jec_49": false, "leit_lei_jec_50": false, "leit_lei_jec_51": false, "leit_lei_jec_52": false, "leit_lei_jec_53": false, "leit_lei_jec_54": false, "leit_lei_jec_55": false, "leit_lei_jec_56": false, "leit_lei_jec_57": false, "leit_lei_jec_58": false, "leit_lei_jec_59": false, "leit_lei_jec_60": false, "leit_lei_jec_61": false, "leit_lei_jec_62": false, "leit_lei_jec_63": false, "leit_lei_jec_64": false, "leit_lei_jec_65": false, "leit_lei_jec_66": false, "leit_lei_jec_67": false, "leit_lei_jec_68": false, "leit_lei_jec_69": false, "leit_lei_jec_70": false, "leit_lei_jec_71": false, "leit_lei_jec_72": false, "leit_lei_jec_73": false, "leit_lei_jec_74": false, "leit_lei_jec_75": false, "leit_lei_jec_76": false, "leit_lei_jec_77": false, "leit_lei_jec_78": false, "leit_lei_jec_79": false, "leit_lei_jec_80": false, "leit_lei_jec_81": false, "leit_lei_jec_82": false, "leit_lei_jec_83": false, "leit_lei_jec_84": false, "leit_lei_jec_85": false, "leit_lei_jec_86": false, "leit_lei_jec_87": false, "leit_lei_jec_88": false, "leit_lei_jec_89": false, "leit_lei_jec_90": false, "leit_lei_jec_91": false, "leit_lei_jec_92": false, "leit_lei_jec_93": false, "leit_lei_jec_94": false, "leit_lei_jec_95": false, "leit_lei_jec_96": false, "leit_lei_jec_97": false, "leit_lei_eca_1": false, "leit_lei_eca_2": false, "leit_lei_eca_3": false, "leit_lei_eca_4": false, "leit_lei_eca_5": false, "leit_lei_eca_6": false, "leit_lei_eca_7": false, "leit_lei_eca_8": false, "leit_lei_eca_9": false, "leit_lei_eca_10": false, "leit_lei_eca_11": false, "leit_lei_eca_12": false, "leit_lei_eca_13": false, "leit_lei_eca_14": false, "leit_lei_eca_15": false, "leit_lei_eca_16": false, "leit_lei_eca_17": false, "leit_lei_eca_18": false, "leit_lei_eca_19": false, "leit_lei_eca_20": false, "leit_lei_eca_21": false, "leit_lei_eca_22": false, "leit_lei_eca_23": false, "leit_lei_eca_24": false, "leit_lei_eca_25": false, "leit_lei_eca_26": false, "leit_lei_eca_27": false, "leit_lei_eca_28": false, "leit_lei_eca_29": false, "leit_lei_eca_30": false, "leit_lei_eca_31": false, "leit_lei_eca_32": false, "leit_lei_eca_33": false, "leit_lei_eca_34": false, "leit_lei_eca_35": false, "leit_lei_eca_36": false, "leit_lei_eca_37": false, "leit_lei_eca_38": false, "leit_lei_eca_39": false, "leit_lei_eca_40": false, "leit_lei_eca_41": false, "leit_lei_eca_42": false, "leit_lei_eca_43": false, "leit_lei_eca_44": false, "leit_lei_eca_45": false, "leit_lei_eca_46": false, "leit_lei_eca_47": false, "leit_lei_eca_48": false, "leit_lei_eca_49": false, "leit_lei_eca_50": false, "leit_lei_eca_51": false, "leit_lei_eca_52": false, "leit_lei_eca_53": false, "leit_lei_eca_54": false, "leit_lei_eca_55": false, "leit_lei_eca_56": false, "leit_lei_eca_57": false, "leit_lei_eca_58": false, "leit_lei_eca_59": false, "leit_lei_eca_60": false, "leit_lei_eca_61": false, "leit_lei_eca_62": false, "leit_lei_eca_63": false, "leit_lei_eca_64": false, "leit_lei_eca_65": false, "leit_lei_eca_66": false, "leit_lei_eca_67": false, "leit_lei_eca_68": false, "leit_lei_eca_69": false, "leit_lei_eca_70": false, "leit_lei_eca_71": false, "leit_lei_eca_72": false, "leit_lei_eca_73": false, "leit_lei_eca_74": false, "leit_lei_eca_75": false, "leit_lei_eca_76": false, "leit_lei_eca_77": false, "leit_lei_eca_78": false, "leit_lei_eca_79": false, "leit_lei_eca_80": false, "leit_lei_eca_81": false, "leit_lei_eca_82": false, "leit_lei_eca_83": false, "leit_lei_eca_84": false, "leit_lei_eca_85": false, "leit_lei_eca_86": false, "leit_lei_eca_87": false, "leit_lei_eca_88": false, "leit_lei_eca_89": false, "leit_lei_eca_90": false, "leit_lei_eca_91": false, "leit_lei_eca_92": false, "leit_lei_eca_93": false, "leit_lei_eca_94": false, "leit_lei_eca_95": false, "leit_lei_eca_96": false, "leit_lei_eca_97": false, "leit_lei_eca_98": false, "leit_lei_eca_99": false, "leit_lei_eca_100": false, "leit_lei_eca_101": false, "leit_lei_eca_102": false, "leit_lei_eca_103": false, "leit_lei_eca_104": false, "leit_lei_eca_105": false, "leit_lei_eca_106": false, "leit_lei_eca_107": false, "leit_lei_eca_108": false, "leit_lei_eca_109": false, "leit_lei_eca_110": false, "leit_lei_eca_111": false, "leit_lei_eca_112": false, "leit_lei_eca_113": false, "leit_lei_eca_114": false, "leit_lei_eca_115": false, "leit_lei_eca_116": false, "leit_lei_eca_117": false, "leit_lei_eca_118": false, "leit_lei_eca_119": false, "leit_lei_eca_120": false, "leit_lei_eca_121": false, "leit_lei_eca_122": false, "leit_lei_eca_123": false, "leit_lei_eca_124": false, "leit_lei_eca_125": false, "leit_lei_eca_126": false, "leit_lei_eca_127": false, "leit_lei_eca_128": false, "leit_lei_eca_129": false, "leit_lei_eca_130": false, "leit_lei_eca_131": false, "leit_lei_eca_132": false, "leit_lei_eca_133": false, "leit_lei_eca_134": false, "leit_lei_eca_135": false, "leit_lei_eca_136": false, "leit_lei_eca_137": false, "leit_lei_eca_138": false, "leit_lei_eca_139": false, "leit_lei_eca_140": false, "leit_lei_eca_141": false, "leit_lei_eca_142": false, "leit_lei_eca_143": false, "leit_lei_eca_144": false, "leit_lei_eca_145": false, "leit_lei_eca_146": false, "leit_lei_eca_147": false, "leit_lei_eca_148": false, "leit_lei_eca_149": false, "leit_lei_eca_150": false, "leit_lei_eca_151": false, "leit_lei_eca_152": false, "leit_lei_eca_153": false, "leit_lei_eca_154": false, "leit_lei_eca_155": false, "leit_lei_eca_156": false, "leit_lei_eca_157": false, "leit_lei_eca_158": false, "leit_lei_eca_159": false, "leit_lei_eca_160": false, "leit_lei_eca_161": false, "leit_lei_eca_162": false, "leit_lei_eca_163": false, "leit_lei_eca_164": false, "leit_lei_eca_165": false, "leit_lei_eca_166": false, "leit_lei_eca_167": false, "leit_lei_eca_168": false, "leit_lei_eca_169": false, "leit_lei_eca_170": false, "leit_lei_eca_171": false, "leit_lei_eca_172": false, "leit_lei_eca_173": false, "leit_lei_eca_174": false, "leit_lei_eca_175": false, "leit_lei_eca_176": false, "leit_lei_eca_177": false, "leit_lei_eca_178": false, "leit_lei_eca_179": false, "leit_lei_eca_180": false, "leit_lei_eca_181": false, "leit_lei_eca_182": false, "leit_lei_eca_183": false, "leit_lei_eca_184": false, "leit_lei_eca_185": false, "leit_lei_eca_186": false, "leit_lei_eca_187": false, "leit_lei_eca_188": false, "leit_lei_eca_189": false, "leit_lei_eca_190": false, "leit_lei_eca_191": false, "leit_lei_eca_192": false, "leit_lei_eca_193": false, "leit_lei_eca_194": false, "leit_lei_eca_195": false, "leit_lei_eca_196": false, "leit_lei_eca_197": false, "leit_lei_eca_198": false, "leit_lei_eca_199": false, "leit_lei_eca_200": false, "leit_lei_eca_201": false, "leit_lei_eca_202": false, "leit_lei_eca_203": false, "leit_lei_eca_204": false, "leit_lei_eca_205": false, "leit_lei_eca_206": false, "leit_lei_eca_207": false, "leit_lei_eca_208": false, "leit_lei_eca_209": false, "leit_lei_eca_210": false, "leit_lei_eca_211": false, "leit_lei_eca_212": false, "leit_lei_eca_213": false, "leit_lei_eca_214": false, "leit_lei_eca_215": false, "leit_lei_eca_216": false, "leit_lei_eca_217": false, "leit_lei_eca_218": false, "leit_lei_eca_219": false, "leit_lei_eca_220": false, "leit_lei_eca_221": false, "leit_lei_eca_222": false, "leit_lei_eca_223": false, "leit_lei_eca_224": false, "leit_lei_eca_225": false, "leit_lei_eca_226": false, "leit_lei_eca_227": false, "leit_lei_eca_228": false, "leit_lei_eca_229": false, "leit_lei_eca_230": false, "leit_lei_eca_231": false, "leit_lei_eca_232": false, "leit_lei_eca_233": false, "leit_lei_eca_234": false, "leit_lei_eca_235": false, "leit_lei_eca_236": false, "leit_lei_eca_237": false, "leit_lei_eca_238": false, "leit_lei_eca_239": false, "leit_lei_eca_240": false, "leit_lei_eca_241": false, "leit_lei_eca_242": false, "leit_lei_eca_243": false, "leit_lei_eca_244": false, "leit_lei_eca_245": false, "leit_lei_eca_246": false, "leit_lei_eca_247": false, "leit_lei_eca_248": false, "leit_lei_eca_249": false, "leit_lei_eca_250": false, "leit_lei_eca_251": false, "leit_lei_eca_252": false, "leit_lei_eca_253": false, "leit_lei_eca_254": false, "leit_lei_eca_255": false, "leit_lei_eca_256": false, "leit_lei_eca_257": false, "leit_lei_eca_258": false, "leit_lei_eca_259": false, "leit_lei_eca_260": false, "leit_lei_eca_261": false, "leit_lei_eca_262": false, "leit_lei_eca_263": false, "leit_lei_eca_264": false, "leit_lei_eca_265": false, "leit_lei_eca_266": false, "leit_lei_eca_267": false, "leit_cpm_crime_29": false, "leit_cpm_crime_30": false, "leit_cpm_crime_31": false, "leit_cpm_crime_32": false, "leit_cpm_crime_33": false, "leit_cpm_crime_34": false, "leit_cpm_crime_35": false, "leit_cpm_crime_36": false, "leit_cpm_crime_37": false, "leit_cpm_crime_38": false, "leit_cpm_crime_39": false, "leit_cpm_crime_40": false, "leit_cpm_crime_41": false, "leit_cpm_crime_42": false, "leit_cpm_crime_43": false, "leit_cpm_crime_44": false, "leit_cpm_crime_45": false, "leit_cpm_crime_46": false, "leit_cpm_crime_47": false, "leit_cpm_imput_48": false, "leit_cpm_imput_49": false, "leit_cpm_imput_50": false, "leit_cpm_imput_51": false, "leit_cpm_imput_52": false, "leit_cpm_concurso_53": false, "leit_cpm_concurso_54": false, "leit_lei_org_crim_1": false, "leit_lei_org_crim_2": false, "leit_lei_org_crim_3": false, "leit_lei_org_crim_4": false, "leit_lei_org_crim_5": false, "leit_lei_org_crim_6": false, "leit_lei_org_crim_7": false, "leit_lei_org_crim_8": false, "leit_lei_org_crim_9": false, "leit_lei_org_crim_10": false, "leit_lei_org_crim_11": false, "leit_lei_org_crim_12": false, "leit_lei_org_crim_13": false, "leit_lei_org_crim_14": false, "leit_lei_org_crim_15": false, "leit_lei_org_crim_16": false, "leit_lei_org_crim_17": false, "leit_lei_org_crim_18": false, "leit_lei_org_crim_19": false, "leit_lei_org_crim_20": false, "leit_lei_org_crim_21": false, "leit_lei_org_crim_22": false, "leit_lei_org_crim_23": true, "leit_lei_org_crim_24": true, "leit_lei_org_crim_25": true, "leit_lei_org_crim_26": true, "leit_lei_org_crim_27": true, "leit_lei_drogas_1": false, "leit_lei_drogas_2": false, "leit_lei_drogas_3": false, "leit_lei_drogas_4": false, "leit_lei_drogas_5": false, "leit_lei_drogas_6": false, "leit_lei_drogas_7": false, "leit_lei_drogas_8": false, "leit_lei_drogas_9": false, "leit_lei_drogas_10": false, "leit_lei_drogas_11": false, "leit_lei_drogas_12": false, "leit_lei_drogas_13": false, "leit_lei_drogas_14": false, "leit_lei_drogas_15": false, "leit_lei_drogas_16": false, "leit_lei_drogas_17": false, "leit_lei_drogas_18": false, "leit_lei_drogas_19": false, "leit_lei_drogas_20": false, "leit_lei_drogas_21": false, "leit_lei_drogas_22": false, "leit_lei_drogas_23": false, "leit_lei_drogas_24": false, "leit_lei_drogas_25": false, "leit_lei_drogas_26": false, "leit_lei_drogas_27": false, "leit_lei_drogas_28": false, "leit_lei_drogas_29": false, "leit_lei_drogas_30": false, "leit_lei_drogas_31": false, "leit_lei_drogas_32": false, "leit_lei_drogas_33": false, "leit_lei_drogas_34": false, "leit_lei_drogas_35": false, "leit_lei_drogas_36": false, "leit_lei_drogas_37": false, "leit_lei_drogas_38": false, "leit_lei_drogas_39": false, "leit_lei_drogas_40": false, "leit_lei_drogas_41": false, "leit_lei_drogas_42": false, "leit_lei_drogas_43": false, "leit_lei_drogas_44": false, "leit_lei_drogas_45": false, "leit_lei_drogas_46": false, "leit_lei_drogas_47": false, "leit_lei_drogas_48": false, "leit_lei_drogas_49": false, "leit_lei_drogas_50": false, "leit_lei_drogas_51": false, "leit_lei_drogas_52": false, "leit_lei_drogas_53": false, "leit_lei_drogas_54": false, "leit_lei_drogas_55": false, "leit_lei_drogas_56": false, "leit_lei_drogas_57": false, "leit_lei_drogas_58": false, "leit_lei_drogas_59": false, "leit_lei_drogas_60": false, "leit_lei_drogas_61": false, "leit_lei_drogas_62": false, "leit_lei_drogas_63": false, "leit_lei_drogas_64": false, "leit_lei_drogas_65": false, "leit_lei_drogas_66": false, "leit_lei_drogas_67": false, "leit_lei_drogas_68": false, "leit_lei_drogas_69": false, "leit_lei_drogas_70": false, "leit_lei_drogas_71": false, "leit_lei_drogas_72": false, "leit_lei_drogas_73": false, "leit_lei_drogas_74": false, "leit_lei_drogas_75": false, "leit_lei_tortura_1": false, "leit_lei_tortura_2": false, "leit_lei_tortura_3": false, "leit_lei_tortura_4": false, "leit_lei_tortura_5": false, "leit_lei_tortura_6": false, "leit_lei_tortura_7": false, "leit_lei_tortura_8": false, "leit_lei_tortura_9": false, "leit_lei_tortura_10": false, "leit_lei_tortura_11": false, "leit_lei_tortura_12": false, "leit_lei_tortura_13": false, "leit_lei_meio_amb_1": false, "leit_lei_meio_amb_2": false, "leit_lei_meio_amb_3": false, "leit_lei_meio_amb_4": false, "leit_lei_meio_amb_5": false, "leit_lei_meio_amb_6": false, "leit_lei_meio_amb_7": false, "leit_lei_meio_amb_8": false, "leit_lei_meio_amb_9": false, "leit_lei_meio_amb_10": false, "leit_lei_meio_amb_11": false, "leit_lei_meio_amb_12": false, "leit_lei_meio_amb_13": false, "leit_lei_meio_amb_14": false, "leit_lei_meio_amb_15": false, "leit_lei_meio_amb_16": false, "leit_lei_meio_amb_17": false, "leit_lei_meio_amb_18": false, "leit_lei_meio_amb_19": false, "leit_lei_meio_amb_20": false, "leit_lei_meio_amb_21": false, "leit_lei_meio_amb_22": false, "leit_lei_meio_amb_23": false, "leit_lei_meio_amb_24": false, "leit_lei_meio_amb_25": false, "leit_lei_desarmamento_1": false, "leit_lei_desarmamento_2": false, "leit_lei_desarmamento_3": false, "leit_lei_desarmamento_4": false, "leit_cpm_penas_55": false, "leit_cpm_penas_56": false, "leit_cpm_penas_57": false, "leit_cpm_penas_58": false, "leit_cpm_penas_59": false, "leit_cpm_penas_60": false, "leit_cpm_penas_61": false, "leit_cpm_penas_62": false, "leit_cpm_penas_63": false, "leit_cpm_penas_64": false, "leit_cpm_penas_65": false, "leit_cpm_penas_66": false, "leit_cpm_penas_67": false, "leit_cpm_penas_68": false, "leit_cpm_penas_69": false, "leit_cpm_penas_70": false, "leit_cpm_penas_71": false, "leit_cpm_penas_72": false, "leit_cpm_penas_73": false, "leit_cpm_penas_74": false, "leit_cpm_penas_75": false, "leit_cpm_penas_76": false, "leit_cpm_penas_77": false, "leit_cpm_penas_78": false, "leit_cpm_penas_79": false, "leit_cpm_penas_80": false, "leit_cpm_penas_81": false, "leit_cpm_penas_82": false, "leit_cpm_penas_83": false, "leit_cpm_penas_84": false, "leit_cpm_penas_85": false, "leit_cpm_penas_86": false, "leit_cpm_penas_87": false, "leit_cpm_penas_88": false, "leit_cpm_penas_89": false, "leit_cpm_penas_90": false, "leit_cpm_penas_91": false, "leit_cpm_penas_92": false, "leit_cpm_penas_93": false, "leit_cpm_penas_94": false, "leit_cpm_penas_95": false, "leit_cpm_penas_96": false, "leit_cpm_penas_97": false, "leit_cp_t3_26": false, "leit_cp_t3_27": false, "leit_cp_t3_28": false, "leit_lei_1776899017137_64": false, "leit_lei_1776899017137_65": false, "leit_lei_1776899017137_66": false, "leit_lei_1776899017137_67": false, "leit_lei_1776899017137_68": false, "leit_lei_1776899017137_69": false, "leit_lei_1776899017137_70": false, "leit_lei_1776899017137_71": false, "leit_lei_1776899017137_72": false, "leit_lei_1776899017137_73": false, "leit_lei_1776899017137_74": false, "leit_lei_1776899017137_75": false, "leit_lei_1776899017137_76": false, "leit_lei_1776899017137_77": false, "leit_lei_1776899017137_78": false, "leit_lei_1776899017137_79": false, "leit_lei_1776899017137_80": false, "leit_lei_1776899017137_81": false, "leit_lei_1776899017137_82": false, "leit_lei_1776899017137_83": false, "leit_lei_1776899017137_84": false, "leit_lei_1776899017137_85": false, "leit_lei_1776899017137_86": false, "leit_lei_1776899017137_87": false, "leit_lei_1776899017137_88": false, "leit_lei_1776899017137_89": false, "leit_lei_1776899017137_90": false, "leit_lei_1776899017137_91": false, "leit_lei_1776899017137_92": false, "leit_lei_1776899017137_93": false, "leit_lei_1776899017137_94": false, "leit_lei_1776899017137_95": false, "leit_lei_1776899017137_96": false, "leit_lei_1776899017137_97": false, "leit_lei_1776899017137_98": false, "leit_lei_1776899017137_99": false, "leit_lei_1776899017137_100": false, "leit_lei_1776899017137_101": false, "leit_lei_1776899017137_102": false, "leit_lei_1776899017137_103": false, "leit_lei_1776899017137_104": false, "leit_lei_1776899017137_105": false, "leit_lei_1776899017137_106": false, "leit_lei_1776899017137_107": false, "leit_lei_1776899017137_108": false, "leit_lei_1776899017137_109": false, "leit_lei_1776899017137_110": false, "leit_lei_1776899017137_111": false, "leit_lei_1776899017137_112": false, "leit_lei_1776899017137_113": false, "leit_lei_1776899017137_114": false, "leit_lei_1776899017137_115": false, "leit_lei_1776899017137_116": false, "leit_lei_1776899017137_117": false, "leit_lei_1776899017137_118": false, "leit_lei_1776899017137_119": false, "leit_lei_1776899017137_120": false, "leit_lei_1776899017137_121": false, "leit_lei_1776899017137_122": false, "leit_lei_1776899017137_123": false, "leit_lei_1776899017137_124": false, "leit_lei_1776899017137_125": false, "leit_lei_1776899017137_126": false, "leit_lei_1776899017137_127": false, "leit_lei_1776899017137_128": false, "leit_lei_1776899017137_129": false, "leit_lei_1776899017137_130": false, "leit_lei_1776899017137_131": false, "leit_lei_1776899017137_132": false, "leit_lei_1776899017137_133": false, "leit_lei_1776899017137_134": false, "leit_lei_1776899017137_135": false, "leit_lei_1776899017137_136": false, "leit_lei_1776899017137_137": false, "leit_lei_1776899017137_138": false, "leit_lei_1776899017137_139": false, "leit_lei_1776899017137_140": false, "leit_lei_1776899017137_141": false, "leit_lei_1776899017137_142": false, "leit_lei_1776899017137_143": false, "leit_lei_1776899017137_144": false, "leit_lei_1776899017137_145": false, "leit_lei_1776899017137_146": false, "leit_lei_1776899017137_147": false, "leit_lei_1776899017137_148": false, "leit_lei_1776899017137_149": false, "leit_lei_1776899017137_150": false, "leit_lei_1776899017137_151": false, "leit_lei_1776899017137_152": false, "leit_lei_1776899017137_153": false, "leit_lei_1776899017137_154": false, "leit_lei_1776899017137_155": false, "leit_lei_1776899017137_156": false, "leit_lei_1776899017137_157": false, "leit_lei_1776899017137_158": false, "leit_lei_1776899017137_159": false, "leit_lei_1776899017137_160": false, "leit_lei_1776899017137_161": false, "leit_lei_1776899017137_162": false, "leit_lei_1776899017137_163": false, "leit_lei_1776899017137_164": false, "leit_lei_1776899017137_165": false, "leit_lei_1776899017137_166": false, "leit_lei_1776899017137_167": false, "leit_lei_1776899017137_168": false, "leit_lei_1776899017137_169": false, "leit_lei_1776899017137_170": false, "leit_lei_1776899017137_171": false, "leit_lei_1776899017137_172": false, "leit_lei_1776899017137_173": false, "leit_lei_1776899017137_174": false, "leit_lei_1776899017137_175": false, "leit_lei_1776899017137_176": false, "leit_lei_1776899017137_177": false, "leit_lei_1776899017137_178": false, "leit_lei_1776899017137_179": false, "leit_lei_1776899017137_180": false, "leit_lei_1776899017137_181": false, "leit_lei_1776899017137_182": false, "leit_lei_1776899017137_183": false, "leit_lei_1776899017137_184": false, "leit_lei_1776899017137_185": false, "leit_lei_1776899017137_186": false, "leit_lei_1776899017137_187": false, "leit_lei_1776899017137_188": false, "leit_lei_1776899017137_189": false, "leit_lei_1776899017137_190": false, "leit_lei_1776899017137_191": false, "leit_lei_1776899017137_192": false, "leit_lei_1776899017137_193": false, "leit_lei_1776899017137_194": false, "leit_lei_1776899017137_195": false, "leit_lei_1776899017137_196": false, "leit_lei_1776899017137_197": false, "leit_lei_1776899017137_198": false, "leit_lei_1776899017137_199": false, "leit_lei_1776899017137_200": false, "leit_lei_1776899017137_201": false, "leit_lei_1776899017137_202": false, "leit_lei_1776899017137_203": false, "leit_lei_1776899017137_204": false, "leit_lei_1776899017137_205": false, "leit_lei_1776899017137_206": false, "leit_lei_1776899017137_207": false, "leit_lei_1776899017137_208": false, "leit_lei_1776899017137_209": false, "leit_lei_1776899017137_210": false, "leit_lei_1776899017137_211": false, "leit_lei_1776899017137_212": false, "leit_lei_1776899017137_213": false, "leit_lei_1776899017137_214": false, "leit_lei_1776899017137_215": false, "leit_lei_1776899017137_216": false, "leit_lei_1776899017137_217": false, "leit_lei_1776899017137_218": false, "leit_lei_1776899017137_219": false, "leit_lei_1776899017137_220": false, "leit_lei_1776899017137_221": false, "leit_lei_1776899017137_222": false, "leit_lei_1776899017137_223": false, "leit_lei_1776899017137_224": false, "leit_lei_1776899017137_225": false, "leit_lei_1776899017137_226": false, "leit_lei_1776899017137_227": false, "leit_lei_1776899017137_228": false, "leit_lei_1776899017137_229": false, "leit_lei_1776899017137_230": false, "leit_lei_1776899017137_231": false, "leit_lei_1776899017137_232": false, "leit_lei_1776899017137_233": false, "leit_lei_1776899017137_234": false, "leit_lei_1776899017137_235": false, "leit_lei_1776899017137_236": false, "leit_lei_1776899017137_237": false, "leit_lei_1776899017137_238": false, "leit_lei_1776899017137_239": false, "leit_lei_1776899017137_240": false, "leit_lei_1776899017137_241": false, "leit_lei_1776899017137_242": false, "leit_lei_1776899017137_243": false, "leit_lei_1776899017137_244": false, "leit_lei_1776899017137_245": false, "leit_lei_1776899017137_246": false, "leit_lei_1776899017137_247": false, "leit_lei_1776899017137_248": false, "leit_lei_1776899017137_249": false, "leit_lei_1776899017137_250": false, "leit_lei_1776899017137_251": false, "leit_lei_1776899017137_252": false, "leit_lei_1776899017137_253": false, "leit_lei_1776899017137_254": false, "leit_lei_1776899017137_255": false, "leit_lei_1776899017137_256": false, "leit_lei_1776899017137_257": false, "leit_lei_1776899017137_258": false, "leit_lei_1776899017137_259": false, "leit_lei_1776899017137_260": false, "leit_lei_1776899017137_261": false, "leit_lei_1776899017137_262": false, "leit_lei_1776899017137_263": false, "leit_lei_1776899017137_264": false, "leit_lei_1776899017137_265": false, "leit_lei_1776899017137_266": false, "leit_lei_1776899017137_267": false, "leit_lei_1776899017137_268": false, "leit_lei_1776899017137_269": false, "leit_lei_1776899017137_270": false, "leit_lei_1776899017137_271": false, "leit_lei_1776899017137_272": false, "leit_lei_1776899017137_273": false, "leit_lei_1776899017137_274": false, "leit_lei_1776899017137_275": false, "leit_lei_1776899017137_276": false, "leit_lei_1776899017137_277": false, "leit_lei_1776899017137_278": false, "leit_lei_1776899017137_279": false, "leit_lei_1776899017137_280": false, "leit_lei_1776899017137_281": false, "leit_lei_1776899017137_282": false, "leit_lei_1776899017137_283": false, "leit_lei_1776899017137_284": false, "leit_lei_1776899017137_285": false, "leit_cpm_penas_98": false, "leit_cpm_penas_99": false, "leit_cpm_penas_100": false, "leit_cpm_penas_101": false, "leit_cpm_penas_102": false, "leit_cpm_penas_103": false, "leit_cpm_penas_104": false, "leit_cpm_penas_105": false, "leit_cpm_penas_106": false, "leit_cpm_penas_107": false, "leit_cpm_penas_108": false, "leit_cpm_penas_109": false}, "resumos": {}}, "conc_1778158115433": {"cronograma": {}, "questoes": {"qt_inf1": {"total": 0, "acertos": 0}, "qt_dpm3": {"total": 0, "acertos": 0}, "qt_dpm4": {"total": 0, "acertos": 0}, "qt_dpp1": {"total": 0, "acertos": 0}, "qt_dpp2": {"total": 0, "acertos": 0}, "qt_p1": {"total": 0, "acertos": 0}}, "questoesLog": {"qt_inf1": [{"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dpm3": [{"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dpm4": [{"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dpp1": [{"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_dpp2": [{"data": "15/05/2026", "total": 0, "acertos": 0}], "qt_p1": [{"data": "15/05/2026", "total": 0, "acertos": 0}]}, "sessoes": [], "sessoesDiarias": {}, "revisaoEspacada": {}, "progresso": {}, "leitura": {}, "resumos": {}}, "conc_1778290317959": {"cronograma": {}, "questoes": {}, "questoesLog": {}, "sessoes": [], "sessoesDiarias": {}, "revisaoEspacada": {}, "progresso": {}, "leitura": {}, "resumos": {}}}, "editalCfgPorConcurso": {"conc_1778033725540": {"edital": [{"id": "port", "name": "Língua Portuguesa", "topics": [{"id": "p1", "text": "1 Compreensão e interpretação de textos de gêneros variados.", "subs": []}, {"id": "p2", "text": "2 Reconhecimento de tipos e gêneros textuais.", "subs": []}, {"id": "p3", "text": "3 Domínio da ortografia oficial.", "subs": []}, {"id": "p4", "text": "4 Domínio dos mecanismos de coesão textual.", "subs": [{"id": "p4_1", "text": "4.1 Emprego de elementos de referenciação, substituição e repetição, de conectores e de outros elementos de sequenciação textual."}, {"id": "p4_2", "text": "4.2 Emprego de tempos e modos verbais."}]}, {"id": "p5", "text": "5 Domínio da estrutura morfossintática do período.", "subs": [{"id": "p5_1", "text": "5.1 Emprego das classes de palavras."}, {"id": "p5_2", "text": "5.2 Relações de coordenação entre orações e entre termos da oração."}, {"id": "p5_3", "text": "5.3 Relações de subordinação entre orações e entre termos da oração."}, {"id": "p5_4", "text": "5.4 Emprego dos sinais de pontuação."}, {"id": "p5_5", "text": "5.5 Concordância verbal e nominal."}, {"id": "p5_6", "text": "5.6 Regência verbal e nominal."}, {"id": "p5_7", "text": "5.7 Emprego do sinal indicativo de crase."}, {"id": "p5_8", "text": "5.8 Colocação dos pronomes átonos."}]}, {"id": "p6", "text": "6 Reescrita de frases e parágrafos do texto.", "subs": [{"id": "p6_1", "text": "6.1 Significação das palavras."}, {"id": "p6_2", "text": "6.2 Substituição de palavras ou de trechos de texto."}, {"id": "p6_3", "text": "6.3 Reorganização da estrutura de orações e de períodos do texto."}, {"id": "p6_4", "text": "6.4 Reescrita de textos de diferentes gêneros e níveis de formalidade."}]}]}, {"id": "ing", "name": "Língua Estrangeira (Inglês)", "topics": [{"id": "i1", "text": "1. Compreensão de textos em língua inglesa.", "subs": []}, {"id": "i2", "text": "2. Itens gramaticais relevantes para a compreensão dos conteúdos semânticos.", "subs": []}]}, {"id": "info", "name": "Noções de Informática", "topics": [{"id": "inf1", "text": "1 Noções de sistema operacional (ambientes Linux e Windows).", "subs": []}, {"id": "inf2", "text": "2 Edição de textos, planilhas e apresentações (ambientes Microsoft Office e LibreOffice).", "subs": []}, {"id": "inf3", "text": "3 Redes de computadores.", "subs": [{"id": "inf3_1", "text": "3.1 Conceitos básicos, ferramentas, aplicativos e procedimentos de Internet e intranet."}, {"id": "inf3_2", "text": "3.2 Programas de navegação (Microsoft Internet Explorer, Mozilla Firefox e Google Chrome)."}, {"id": "inf3_3", "text": "3.3 Programas de correio eletrônico (Outlook Express e Mozilla Thunderbird)."}, {"id": "inf3_4", "text": "3.4 Sítios de busca e pesquisa na Internet."}, {"id": "inf3_5", "text": "3.5 Grupos de discussão."}, {"id": "inf3_6", "text": "3.6 Redes sociais."}, {"id": "inf3_7", "text": "3.7 Computação na nuvem (cloud computing)."}]}, {"id": "inf4", "text": "4 Noções de organização e de gerenciamento de informações, arquivos, pastas e programas.", "subs": []}, {"id": "inf5", "text": "5 Segurança da informação.", "subs": [{"id": "inf5_1", "text": "5.1 Procedimentos de segurança."}, {"id": "inf5_2", "text": "5.2 Noções de vírus, worms e pragas virtuais."}, {"id": "inf5_3", "text": "5.3 Aplicativos para segurança (antivírus, firewall, anti-spyware etc.)."}, {"id": "inf5_4", "text": "5.4 Procedimentos de backup."}, {"id": "inf5_5", "text": "5.5 Armazenamento de dados na nuvem (cloud storage)."}]}]}, {"id": "al", "name": "Conhecimentos do Estado de Alagoas", "topics": [{"id": "al1", "text": "1 Formação histórica de Alagoas.", "subs": [{"id": "al1_1", "text": "1.1 Colonização portuguesa."}, {"id": "al1_2", "text": "1.2 Economia açucareira."}, {"id": "al1_3", "text": "1.3 Emancipação política da Capitania de Pernambuco em 1817."}, {"id": "al1_4", "text": "1.4 Elevação à Província em 1821."}]}, {"id": "al2", "text": "2 Quilombo dos Palmares.", "subs": [{"id": "al2_1", "text": "2.1 Formação no período colonial."}, {"id": "al2_2", "text": "2.2 Resistência à escravidão."}, {"id": "al2_3", "text": "2.3 Liderança de Zumbi dos Palmares."}]}, {"id": "al3", "text": "3 Aspectos geográficos.", "subs": [{"id": "al3_1", "text": "3.1 Litoral, Zona da Mata, Agreste e Sertão."}, {"id": "al3_2", "text": "3.2 Rio São Francisco."}]}, {"id": "al4", "text": "4 Organização político-administrativa.", "subs": [{"id": "al4_1", "text": "4.1 Maceió como capital estadual."}, {"id": "al4_2", "text": "4.2 Municípios."}, {"id": "al4_3", "text": "4.3 Poderes Executivo, Legislativo e Judiciário."}]}, {"id": "al5", "text": "5 Economia estadual.", "subs": [{"id": "al5_1", "text": "5.1 Agroindústria canavieira."}, {"id": "al5_2", "text": "5.2 Turismo."}, {"id": "al5_3", "text": "5.3 Setor de serviços."}]}, {"id": "al6", "text": "6 Cultura e patrimônio.", "subs": [{"id": "al6_1", "text": "6.1 Manifestações culturais populares."}, {"id": "al6_2", "text": "6.2 Patrimônio histórico-cultural alagoano."}]}]}, {"id": "soc", "name": "I — Sociologia", "topics": [{"id": "s1", "text": "1 A constituição do saber sociológico.", "subs": [{"id": "s1_1", "text": "1.1 A sociologia como ciência."}, {"id": "s1_2", "text": "1.2 Ciência e senso comum."}, {"id": "s1_3", "text": "1.3 Subjetividade e objetividade."}, {"id": "s1_4", "text": "1.4 A sociologia e as ciências sociais."}, {"id": "s1_5", "text": "1.5 A questão metodológica nas ciências sociais e a pesquisa social."}]}, {"id": "s2", "text": "2 Estrutura e organização social.", "subs": [{"id": "s2_1", "text": "2.1 Estrutura da sociedade."}, {"id": "s2_2", "text": "2.2 Instituições sociais."}, {"id": "s2_3", "text": "2.3 Classes sociais, estratificação e desigualdade: Karl Marx e Max Weber."}, {"id": "s2_4", "text": "2.4 Classe social na sociedade ocidental atual: classes e estilos de vida."}]}, {"id": "s3", "text": "3 Problemas sociais contemporâneos.", "subs": [{"id": "s3_1", "text": "3.1 Desigualdades sociais."}, {"id": "s3_2", "text": "3.2 Exclusão social."}, {"id": "s3_3", "text": "3.3 Preconceito e discriminação."}, {"id": "s3_4", "text": "3.4 Movimentos sociais tradicionais e novos."}, {"id": "s3_5", "text": "3.5 Gênero e envelhecimento."}, {"id": "s3_6", "text": "3.6 Gênero e violência."}, {"id": "s3_7", "text": "3.7 Cultura e consumo."}, {"id": "s3_8", "text": "3.8 Violência e Estado."}, {"id": "s3_9", "text": "3.9 Migrações."}, {"id": "s3_10", "text": "3.10 Ética e cidadania."}, {"id": "s3_11", "text": "3.11 Sociedade, trabalho e emprego, relações sociais e transformações do trabalho."}, {"id": "s3_12", "text": "3.12 Os meios de comunicação e a questão ideológica."}, {"id": "s3_13", "text": "3.13 O meio ambiente e o desenvolvimento tecnológico."}, {"id": "s3_14", "text": "3.14 A globalização e os Estados nacionais."}, {"id": "s3_15", "text": "3.15 Diversidade cultural e étnicas."}, {"id": "s3_16", "text": "3.16 Religião e sociedade."}, {"id": "s3_17", "text": "3.17 Metodologia de ensino de sociologia."}]}]}, {"id": "fil", "name": "II — Filosofia", "topics": [{"id": "f1", "text": "1 Filosofia da ciência e teoria do conhecimento.", "subs": [{"id": "f1_1", "text": "1.1 Pré-socráticos."}, {"id": "f1_2", "text": "1.2 Sofistas."}, {"id": "f1_3", "text": "1.3 Sócrates, Platão e Aristóteles."}, {"id": "f1_4", "text": "1.4 Patrística (Agostinho)."}, {"id": "f1_5", "text": "1.5 Escolástica (Tomás de Aquino)."}, {"id": "f1_6", "text": "1.6 Racionalismo (Descartes)."}, {"id": "f1_7", "text": "1.7 Empirismo (Bacon e Locke)."}, {"id": "f1_8", "text": "1.8 Criticismo kantiano."}, {"id": "f1_9", "text": "1.9 Idealismo hegeliano."}, {"id": "f1_10", "text": "1.10 Materialismo histórico e dialético."}, {"id": "f1_11", "text": "1.11 Fenomenologia."}, {"id": "f1_12", "text": "1.12 Escola de Frankfurt e Teoria Crítica."}, {"id": "f1_13", "text": "1.13 Popper, Bachelard, Kuhn, Feyerabend."}]}, {"id": "f2", "text": "2 Ética.", "subs": [{"id": "f2_1", "text": "2.1 Origens da ética."}, {"id": "f2_2", "text": "2.2 Questões de ética contemporânea."}, {"id": "f2_3", "text": "2.3 Éticas deontológicas e éticas utilitaristas."}, {"id": "f2_4", "text": "2.4 Ética, ciência e novas tecnologias."}, {"id": "f2_5", "text": "2.5 Bioética."}]}, {"id": "f3", "text": "3 Filosofia política.", "subs": [{"id": "f3_1", "text": "3.1 Pensamento político antigo (Platão, Aristóteles)."}, {"id": "f3_2", "text": "3.2 Pensamento político em Maquiavel, Hobbes, Locke, Montesquieu, Rousseau, Kant, Hegel e Marx."}, {"id": "f3_3", "text": "3.3 Pensamento político contemporâneo (Habermas)."}]}, {"id": "f4", "text": "4 Filosofia da linguagem (Locke, Rousseau, Wittgenstein e a filosofia analítica contemporânea).", "subs": []}]}, {"id": "bio", "name": "I — Biologia", "topics": [{"id": "bio1", "text": "1 Seres vivos: classificação dos seres vivos.", "subs": []}, {"id": "bio2", "text": "2 Célula.", "subs": [{"id": "bio2_1", "text": "2.1 Célula procariota e eucariota."}, {"id": "bio2_2", "text": "2.2 Componentes morfológicos das células."}, {"id": "bio2_3", "text": "2.3 Funções das estruturas celulares."}]}, {"id": "bio3", "text": "3 Tecidos animais: características estruturais e funcionais.", "subs": []}, {"id": "bio4", "text": "4 Morfologia e fisiologia humana.", "subs": [{"id": "bio4_1", "text": "4.1 Morfologia, externa e interna."}, {"id": "bio4_2", "text": "4.2 Fisiologia, nutrição, digestão, respiração, circulação e excreção."}, {"id": "bio4_3", "text": "4.3 Sistemas de proteção, sustentação e locomoção."}, {"id": "bio4_4", "text": "4.4 Sistemas nervoso e endócrino."}]}, {"id": "bio5", "text": "5 Ecologia.", "subs": [{"id": "bio5_1", "text": "5.1 Relações tróficas entre os seres vivos."}, {"id": "bio5_2", "text": "5.2 Biomas."}, {"id": "bio5_3", "text": "5.3 Ciclos biogeoquímicos."}, {"id": "bio5_4", "text": "5.4 Conservação e preservação da natureza, impacto humano, poluição e biocidas, ecossistemas e espécies ameaçadas de extinção, principalmente no Brasil."}]}, {"id": "bio6", "text": "6 Evolução dos seres vivos.", "subs": []}, {"id": "bio7", "text": "7 Reino vegetal.", "subs": [{"id": "bio7_1", "text": "7.1 Funções vitais das plantas."}, {"id": "bio7_2", "text": "7.2 Briófitas, pteridófitas, gimnospermas e angiospermas."}]}, {"id": "bio8", "text": "8 Reino Animal.", "subs": [{"id": "bio8_1", "text": "8.1 Características gerais, reprodução, nutrição, locomoção e coordenação."}, {"id": "bio8_2", "text": "8.2 Poríferos."}, {"id": "bio8_3", "text": "8.3 Cnidários."}, {"id": "bio8_4", "text": "8.4 Artrópodes."}, {"id": "bio8_5", "text": "8.5 Moluscos."}, {"id": "bio8_6", "text": "8.6 Equinodermos."}, {"id": "bio8_7", "text": "8.7 Nematelmintos."}, {"id": "bio8_8", "text": "8.8 Platelmintos."}, {"id": "bio8_9", "text": "8.9 Anelídeos."}, {"id": "bio8_10", "text": "8.10 Cordados."}]}, {"id": "bio9", "text": "9 Saúde, higiene e saneamento básico.", "subs": [{"id": "bio9_1", "text": "9.1 Doenças adquiridas e transmissíveis: viroses, AIDS, dengue, poliomielite, tuberculose, sífilis, meningite meningocócica, cólera, tétano."}, {"id": "bio9_2", "text": "9.2 Ciclo de vida, transmissão e profilaxia: raiva, sarampo, leptospirose, amebíase, malária, doença de chagas, verminoses, ascaridíase, teníase, cisticercose, esquistosomose e ancilostomose."}, {"id": "bio9_3", "text": "9.3 As defesas do organismo, imunidade passiva e imunidade ativa."}]}]}, {"id": "fis", "name": "II — Física", "topics": [{"id": "fis1", "text": "1 História e evolução das ideias da física.", "subs": [{"id": "fis1_1", "text": "1.1 Cosmologia antiga."}, {"id": "fis1_2", "text": "1.2 A física de Aristóteles."}, {"id": "fis1_3", "text": "1.3 Origens da mecânica."}, {"id": "fis1_4", "text": "1.4 Surgimento da teoria da relatividade e da teoria quântica."}]}, {"id": "fis2", "text": "2 Mecânica.", "subs": [{"id": "fis2_1", "text": "2.1 Cinemática escalar, cinemática vetorial."}, {"id": "fis2_2", "text": "2.2 Movimento circular."}, {"id": "fis2_3", "text": "2.3 Leis de Newton e suas aplicações."}, {"id": "fis2_4", "text": "2.4 Trabalho."}, {"id": "fis2_5", "text": "2.5 Potência."}, {"id": "fis2_6", "text": "2.6 Energia, conservação e suas transformações, impulso."}, {"id": "fis2_7", "text": "2.7 Quantidade de movimento e conservação da quantidade de movimento."}, {"id": "fis2_8", "text": "2.8 Gravitação universal."}, {"id": "fis2_9", "text": "2.9 Estática dos corpos rígidos."}, {"id": "fis2_10", "text": "2.10 Estática dos fluidos."}, {"id": "fis2_11", "text": "2.11 Princípios de Pascal, Arquimedes e Stevin."}]}, {"id": "fis3", "text": "3 Termodinâmica.", "subs": [{"id": "fis3_1", "text": "3.1 Calor e temperatura."}, {"id": "fis3_2", "text": "3.2 Temperatura e dilatação térmica."}, {"id": "fis3_3", "text": "3.3 Calor específico."}, {"id": "fis3_4", "text": "3.4 Trocas de calor."}, {"id": "fis3_5", "text": "3.5 Mudança de fase e diagramas de fases."}, {"id": "fis3_6", "text": "3.6 Propagação do calor."}, {"id": "fis3_7", "text": "3.7 Teoria cinética dos gases."}, {"id": "fis3_8", "text": "3.8 Energia interna."}, {"id": "fis3_9", "text": "3.9 Lei de Joule."}, {"id": "fis3_10", "text": "3.10 Transformações gasosas."}, {"id": "fis3_11", "text": "3.11 Leis da termodinâmica (entropia e entalpia)."}, {"id": "fis3_12", "text": "3.12 Máquinas térmicas."}, {"id": "fis3_13", "text": "3.13 Ciclo de Carnot."}]}, {"id": "fis4", "text": "4 Eletromagnetismo.", "subs": [{"id": "fis4_1", "text": "4.1 Introdução à eletricidade."}, {"id": "fis4_2", "text": "4.2 Campo elétrico."}, {"id": "fis4_3", "text": "4.3 Lei de Gauss."}, {"id": "fis4_4", "text": "4.4 Potencial elétrico."}, {"id": "fis4_5", "text": "4.5 Corrente elétrica."}, {"id": "fis4_6", "text": "4.6 Potência elétrica e resistores."}, {"id": "fis4_7", "text": "4.7 Circuitos elétricos."}, {"id": "fis4_8", "text": "4.8 Campo magnético."}, {"id": "fis4_9", "text": "4.9 Lei de Ampère."}, {"id": "fis4_10", "text": "4.10 Lei de Faraday."}, {"id": "fis4_11", "text": "4.11 Propriedades elétricas e magnéticas dos materiais."}, {"id": "fis4_12", "text": "4.12 Equações de Maxwell."}, {"id": "fis4_13", "text": "4.13 Radiação."}]}, {"id": "fis5", "text": "5 Ondulatória.", "subs": [{"id": "fis5_1", "text": "5.1 Movimento harmônico simples."}, {"id": "fis5_2", "text": "5.2 Oscilações livres, amortecidas e forçadas."}, {"id": "fis5_3", "text": "5.3 Ondas."}, {"id": "fis5_4", "text": "5.4 Ondas sonoras e eletromagnéticas."}, {"id": "fis5_5", "text": "5.5 Frequências naturais e ressonância."}, {"id": "fis5_6", "text": "5.6 Óptica geométrica (reflexão e refração da luz)."}, {"id": "fis5_7", "text": "5.7 Instrumentos ópticos (características e aplicações)."}, {"id": "fis5_8", "text": "5.8 Óptica física: 5.8.1 Interferência. 5.8.2 Difração. 5.8.3 Polarização."}]}, {"id": "fis6", "text": "6 Física moderna.", "subs": [{"id": "fis6_1", "text": "6.1 Introdução à relatividade especial."}, {"id": "fis6_2", "text": "6.2 Transformação de Lorentz."}, {"id": "fis6_3", "text": "6.3 Equivalência massa-energia."}, {"id": "fis6_4", "text": "6.4 Natureza ondulatória-corpuscular da matéria."}, {"id": "fis6_5", "text": "6.5 Teoria quântica da matéria e da radiação."}, {"id": "fis6_6", "text": "6.6 Modelo do átomo de hidrogênio."}, {"id": "fis6_7", "text": "6.7 Núcleo atômico."}, {"id": "fis6_8", "text": "6.8 Energia nuclear."}]}]}, {"id": "qui", "name": "III — Química", "topics": [{"id": "qui1", "text": "1 O mundo e suas transformações: história e importância da química.", "subs": []}, {"id": "qui2", "text": "2 Teoria Atômico-Molecular.", "subs": [{"id": "qui2_1", "text": "2.1 Modelos atômicos (Dalton, Thomson, Rutherford e Bohr) e evolução dos conceitos de átomo."}, {"id": "qui2_2", "text": "2.2 Os trabalhos de Faraday."}, {"id": "qui2_3", "text": "2.3 Leis ponderais (Lavoisier, Proust, Dalton e Richter-Wenzel-Berzelius)."}, {"id": "qui2_4", "text": "2.4 Leis volumétricas de Gay-Lussac."}, {"id": "qui2_5", "text": "2.5 Lei de Avogadro."}, {"id": "qui2_6", "text": "2.6 Conceitos decorrentes da Teoria Atômico-Molecular: unidade de massa atômica (u), quantidade de matéria, massa molar, volume molar."}, {"id": "qui2_7", "text": "2.7 Fórmulas químicas."}, {"id": "qui2_8", "text": "2.8 Cálculos estequiométricos."}]}, {"id": "qui3", "text": "3 Classificação periódica dos elementos químicos.", "subs": [{"id": "qui3_1", "text": "3.1 Tabela Periódica: histórico e evolução."}, {"id": "qui3_2", "text": "3.2 Classificação dos elementos em metais, não metais, semimetais e gases nobres."}, {"id": "qui3_3", "text": "3.3 Configuração eletrônica dos elementos ao longo da Tabela Periódica."}, {"id": "qui3_4", "text": "3.4 Propriedades periódicas e aperiódicas."}]}, {"id": "qui4", "text": "4 Radioatividade.", "subs": [{"id": "qui4_1", "text": "4.1 Natureza das emissões radioativas."}, {"id": "qui4_2", "text": "4.2 Leis da radioatividade."}, {"id": "qui4_3", "text": "4.3 Cinética da desintegração radioativa."}, {"id": "qui4_4", "text": "4.4 Fenômenos de fissão nuclear e fusão nuclear."}, {"id": "qui4_5", "text": "4.5 Riscos e aplicações das reações nucleares."}]}, {"id": "qui5", "text": "5 Interações químicas.", "subs": [{"id": "qui5_1", "text": "5.1 Ligações iônica, covalente e metálica."}, {"id": "qui5_2", "text": "5.2 Forças intermoleculares."}, {"id": "qui5_3", "text": "5.3 Geometria molecular: eletronegatividade e polaridade das ligações e das moléculas, Teoria da Repulsão dos Pares Eletrônicos, Teoria da Ligação de Valência e Sobreposição de Orbitais, orbitais híbridos e moleculares."}, {"id": "qui5_4", "text": "5.4 Relação entre estrutura e propriedade das substâncias químicas."}]}, {"id": "qui6", "text": "6 Matéria e mudança de estado.", "subs": [{"id": "qui6_1", "text": "6.1 Sólidos, líquidos, gases e outros estados da matéria (ideais e reais)."}, {"id": "qui6_2", "text": "6.2 Características e propriedades de gases, líquidos e sólidos."}, {"id": "qui6_3", "text": "6.3 Ligações químicas nos sólidos, líquidos e gases."}, {"id": "qui6_4", "text": "6.4 Métodos de separação de misturas."}]}, {"id": "qui7", "text": "7 Funções químicas inorgânicas.", "subs": [{"id": "qui7_1", "text": "7.1 Ácidos, bases, sais e óxidos: conceito, propriedades e nomenclatura."}, {"id": "qui7_2", "text": "7.2 Hidretos, carbetos e nitretos: conceito, propriedades e nomenclatura."}, {"id": "qui7_3", "text": "7.3 Principais reações envolvendo compostos inorgânicos."}, {"id": "qui7_4", "text": "7.4 Balanceamento de equações."}]}, {"id": "qui8", "text": "8 Misturas e soluções.", "subs": [{"id": "qui8_1", "text": "8.1 Relações de proporcionalidade entre solutos e solvente: concentração em quantidade de matéria, concentração em massa, fração em quantidade de matéria, fração em massa, fração em volume."}, {"id": "qui8_2", "text": "8.2 Grandezas-padrão e unidades-padrão (SI) e sua relação com outras grandezas e unidades."}, {"id": "qui8_3", "text": "8.3 Solubilidade."}, {"id": "qui8_4", "text": "8.4 Propriedades coligativas."}]}, {"id": "qui9", "text": "9 Gases.", "subs": [{"id": "qui9_1", "text": "9.1 Teoria cinética."}, {"id": "qui9_2", "text": "9.2 Leis dos gases."}, {"id": "qui9_3", "text": "9.3 Densidade dos gases."}, {"id": "qui9_4", "text": "9.4 Difusão e efusão dos gases."}, {"id": "qui9_5", "text": "9.5 Misturas gasosas."}]}, {"id": "qui10", "text": "10 Termoquímica.", "subs": [{"id": "qui10_1", "text": "10.1 Energia e calor."}, {"id": "qui10_2", "text": "10.2 Reações exotérmicas e endotérmicas."}, {"id": "qui10_3", "text": "10.3 Entalpia, entropia e energia livre."}, {"id": "qui10_4", "text": "10.4 Espontaneidade de uma reação."}, {"id": "qui10_5", "text": "10.5 Entalpias de formação e de combustão das substâncias."}, {"id": "qui10_6", "text": "10.6 Calor de reação em pressão constante e em volume constante."}, {"id": "qui10_7", "text": "10.7 Lei de Hess."}]}, {"id": "qui11", "text": "11 Cinética química.", "subs": [{"id": "qui11_1", "text": "11.1 Velocidades e mecanismos de reação."}, {"id": "qui11_2", "text": "11.2 Equação de velocidade, teoria das colisões e complexo ativado."}, {"id": "qui11_3", "text": "11.3 Influência da energia, da concentração, da pressão e dos catalisadores na velocidade das reações químicas."}]}, {"id": "qui12", "text": "12 Equilíbrio químico.", "subs": [{"id": "qui12_1", "text": "12.1 Equilíbrio iônico em soluções aquosas, constante de equilíbrio."}, {"id": "qui12_2", "text": "12.2 Equilíbrio ácido-base, hidrólise de sais, solução tampão, conceitos de Ka, Kb, Kh, pH, pOH e graus de dissociação e de hidrólise."}, {"id": "qui12_3", "text": "12.3 Equilíbrio de precipitação, conceito de Kps."}, {"id": "qui12_4", "text": "12.4 Deslocamento do equilíbrio."}, {"id": "qui12_5", "text": "12.5 Lei da Diluição de Ostwald."}, {"id": "qui12_6", "text": "12.6 Efeito do íon comum."}, {"id": "qui12_7", "text": "12.7 Lei da Ação das Massas."}]}, {"id": "qui13", "text": "13 Eletroquímica.", "subs": [{"id": "qui13_1", "text": "13.1 Potenciais de oxidação e redução."}, {"id": "qui13_2", "text": "13.2 Espontaneidade de uma reação de oxirredução."}, {"id": "qui13_3", "text": "13.3 Pilhas e acumuladores."}, {"id": "qui13_4", "text": "13.4 Eletrólise."}]}, {"id": "qui14", "text": "14 Química orgânica.", "subs": [{"id": "qui14_1", "text": "14.1 Propriedades fundamentais do átomo de carbono, hibridação, estados de oxidação de carbono, ligações sigma e pi, geometria molecular, classificação do átomo de carbono na cadeia carbônica, notação e nomenclatura dos principais radicais orgânicos."}, {"id": "qui14_2", "text": "14.2 Notação, nomenclatura e propriedades físicas e químicas de hidrocarbonetos, haletos orgânicos, álcoois, fenóis, éteres, cetonas, aldeídos, ácidos carboxílicos, ésteres, anidridos, haletos de ácido, aminas, amidas, nitrilas, isonitrilas e nitrocompostos."}, {"id": "qui14_3", "text": "14.3 Reatividade dos compostos orgânicos, reações de redução, oxidação, combustão, adição e substituição."}, {"id": "qui14_4", "text": "14.4 Glicídeos, lipídeos, aminoácidos, proteínas, ácidos nucleicos."}, {"id": "qui14_5", "text": "14.5 Tecnologias associadas à química orgânica: petroquímica, polímeros sintéticos, aditivos em alimentos, agroquímica, drogas, medicamentos e biotecnologia."}]}]}, {"id": "mat", "name": "Matemática", "topics": [{"id": "m1", "text": "1 Aritmética: operações com números racionais.", "subs": []}, {"id": "m2", "text": "2 Álgebra.", "subs": [{"id": "m2_1", "text": "2.1 Equações do 1º e do 2º graus."}, {"id": "m2_2", "text": "2.2 Fatoração."}, {"id": "m2_3", "text": "2.3 Produtos notáveis."}]}, {"id": "m3", "text": "3 Geometria.", "subs": [{"id": "m3_1", "text": "3.1 Triângulos e quadriláteros."}, {"id": "m3_2", "text": "3.2 Semelhança e congruência de triângulos."}, {"id": "m3_3", "text": "3.3 Relações métricas no triângulo retângulo."}, {"id": "m3_4", "text": "3.4 Relações trigonométricas."}, {"id": "m3_5", "text": "3.5 Áreas das principais figuras planas."}, {"id": "m3_6", "text": "3.6 Áreas e volume do cubo e do paralelepípedo."}, {"id": "m3_7", "text": "3.7 Razão e proporção."}, {"id": "m3_8", "text": "3.8 Regra de três simples e composta."}, {"id": "m3_9", "text": "3.9 Porcentagem e juros simples e compostos."}]}, {"id": "m4", "text": "4 Conjuntos.", "subs": [{"id": "m4_1", "text": "4.1 Representação de conjuntos."}, {"id": "m4_2", "text": "4.2 Conjuntos unitários, vazio e universo."}, {"id": "m4_3", "text": "4.3 Igualdade, subconjuntos, operações."}, {"id": "m4_4", "text": "4.4 Conjuntos numéricos, intervalos e operações."}]}, {"id": "m5", "text": "5 Funções.", "subs": [{"id": "m5_1", "text": "5.1 Par ordenado e produto cartesiano."}, {"id": "m5_2", "text": "5.2 Noção de relação."}, {"id": "m5_3", "text": "5.3 Noção de função."}, {"id": "m5_4", "text": "5.4 Domínio de uma função real de variável real."}, {"id": "m5_5", "text": "5.5 Gráfico de uma função."}, {"id": "m5_6", "text": "5.6 Análise de gráficos."}, {"id": "m5_7", "text": "5.7 Função bijetora, função inversa e função composta."}]}, {"id": "m6", "text": "6 Funções de 1º grau.", "subs": [{"id": "m6_1", "text": "6.1 Função constante."}, {"id": "m6_2", "text": "6.2 Estudo do sinal de uma função de 1º grau."}, {"id": "m6_3", "text": "6.3 Inequações de 1º grau."}]}, {"id": "m7", "text": "7 Funções de 2º grau.", "subs": [{"id": "m7_1", "text": "7.1 Aspectos introdutórios."}, {"id": "m7_2", "text": "7.2 Gráfico de uma função do 2º grau."}, {"id": "m7_3", "text": "7.3 Vértice de uma parábola."}, {"id": "m7_4", "text": "7.4 Raízes de uma função de 2º grau."}, {"id": "m7_5", "text": "7.5 Estudo do sinal de uma função de 2º grau."}, {"id": "m7_6", "text": "7.6 Inequações de 2º grau."}]}, {"id": "m8", "text": "8 Funções exponenciais.", "subs": [{"id": "m8_1", "text": "8.1 Conceito de função exponencial."}, {"id": "m8_2", "text": "8.2 Gráfico de funções exponenciais."}, {"id": "m8_3", "text": "8.3 Equações exponenciais."}, {"id": "m8_4", "text": "8.4 Inequações exponenciais."}]}, {"id": "m9", "text": "9 Logaritmos.", "subs": [{"id": "m9_1", "text": "9.1 Definição de logaritmo."}, {"id": "m9_2", "text": "9.2 Propriedades dos logaritmos."}, {"id": "m9_3", "text": "9.3 Mudança de base."}, {"id": "m9_4", "text": "9.4 Sistemas de logaritmos."}, {"id": "m9_5", "text": "9.5 Funções logarítmicas."}, {"id": "m9_6", "text": "9.6 Inequações logarítmicas."}]}, {"id": "m10", "text": "10 Funções Trigonométricas.", "subs": [{"id": "m10_1", "text": "10.1 Redução de arcos do 1º quadrante."}, {"id": "m10_2", "text": "10.2 Operações com arcos."}]}, {"id": "m11", "text": "11 Progressões aritméticas e geométricas: conceito; classificação; fórmula do termo geral; representação genérica; soma dos n primeiros termos; soma dos infinitos termos de uma progressão geométrica.", "subs": []}, {"id": "m12", "text": "12 Matrizes.", "subs": [{"id": "m12_1", "text": "12.1 Aspectos introdutórios."}, {"id": "m12_2", "text": "12.2 Representação."}, {"id": "m12_3", "text": "12.3 Matrizes especiais."}, {"id": "m12_4", "text": "12.4 Matriz transposta."}, {"id": "m12_5", "text": "12.5 Igualdade de matrizes."}, {"id": "m12_6", "text": "12.6 Operações com matrizes."}]}, {"id": "m13", "text": "13 Determinantes.", "subs": [{"id": "m13_1", "text": "13.1 Conceito."}, {"id": "m13_2", "text": "13.2 Ordem do determinante."}, {"id": "m13_3", "text": "13.3 Propriedades."}, {"id": "m13_4", "text": "13.4 Discussão do sistema linear."}, {"id": "m13_5", "text": "13.5 Sistema linear homogêneo."}, {"id": "m13_6", "text": "13.6 Regras para cálculo do determinante."}]}, {"id": "m14", "text": "14 Sistemas lineares.", "subs": [{"id": "m14_1", "text": "14.1 Introdução."}, {"id": "m14_2", "text": "14.2 Equação linear."}, {"id": "m14_3", "text": "14.3 Solução de um sistema linear."}, {"id": "m14_4", "text": "14.4 Classificação de um sistema linear."}, {"id": "m14_5", "text": "14.5 Discussão das soluções de um sistema linear."}]}, {"id": "m15", "text": "15 Geometria espacial.", "subs": [{"id": "m15_1", "text": "15.1 Prisma."}, {"id": "m15_2", "text": "15.2 Pirâmide."}, {"id": "m15_3", "text": "15.3 Cilindro."}, {"id": "m15_4", "text": "15.4 Cone."}, {"id": "m15_5", "text": "15.5 Esfera."}]}, {"id": "m16", "text": "16 Geometria analítica.", "subs": [{"id": "m16_1", "text": "16.1 Estudo do ponto."}, {"id": "m16_2", "text": "16.2 Estudo da reta."}, {"id": "m16_3", "text": "16.3 Estudo da circunferência."}]}, {"id": "m17", "text": "17 Números complexos.", "subs": [{"id": "m17_1", "text": "17.1 Representação."}, {"id": "m17_2", "text": "17.2 Operações na forma algébrica e trigonométrica."}]}, {"id": "m18", "text": "18 Análise combinatória.", "subs": [{"id": "m18_1", "text": "18.1 Fatorial."}, {"id": "m18_2", "text": "18.2 Permutação."}, {"id": "m18_3", "text": "18.3 Combinação."}, {"id": "m18_4", "text": "18.4 Arranjo."}]}, {"id": "m19", "text": "19 Binômio de Newton.", "subs": [{"id": "m19_1", "text": "19.1 Número binomial."}, {"id": "m19_2", "text": "19.2 Teorema de Newton para desenvolvimento do binômio (x + a)n."}, {"id": "m19_3", "text": "19.3 Generalização."}, {"id": "m19_4", "text": "19.4 Somatório."}, {"id": "m19_5", "text": "19.5 Termo geral do binômio de Newton."}]}, {"id": "m20", "text": "20 Polinômios.", "subs": [{"id": "m20_1", "text": "20.1 Conceito."}, {"id": "m20_2", "text": "20.2 Identidade de polinômios."}, {"id": "m20_3", "text": "20.3 Operações com polinômios."}, {"id": "m20_4", "text": "20.4 Propriedades fundamentais da divisão de polinômios."}, {"id": "m20_5", "text": "20.5 Raiz ou zero de um polinômio."}, {"id": "m20_6", "text": "20.6 Fração polinomial e frações polinomiais idênticas."}]}]}, {"id": "dpenal", "name": "Noções de Direito Penal", "topics": [{"id": "dp1", "text": "1 Parte geral do Código Penal Brasileiro (Título I ao III).", "subs": []}, {"id": "dp2", "text": "2 Crimes.", "subs": [{"id": "dp2_1", "text": "2.1 Crimes contra a pessoa."}, {"id": "dp2_2", "text": "2.2 Crimes contra o patrimônio."}, {"id": "dp2_3", "text": "2.3 Crimes contra a administração pública."}]}]}, {"id": "dh", "name": "Noções de Direitos Humanos", "topics": [{"id": "dh1", "text": "1 Conceito.", "subs": []}, {"id": "dh2", "text": "2 Evolução.", "subs": []}, {"id": "dh3", "text": "3 Abrangência.", "subs": []}, {"id": "dh4", "text": "4 Sistema de proteção.", "subs": []}, {"id": "dh5", "text": "5 Convenção Americana sobre Direitos Humanos (Pacto de São José e Decreto nº 678/1992).", "subs": []}]}, {"id": "dpp", "name": "Noções de Processo Penal", "topics": [{"id": "dpp1", "text": "1 Inquérito policial.", "subs": []}, {"id": "dpp2", "text": "2 Ação penal.", "subs": []}]}, {"id": "dpm", "name": "Direito Penal Militar", "topics": [{"id": "dpm1", "text": "1 Aplicação da lei penal militar.", "subs": []}, {"id": "dpm2", "text": "2 Crime.", "subs": []}, {"id": "dpm3", "text": "3 Imputabilidade penal.", "subs": []}, {"id": "dpm4", "text": "4 Concurso de agentes.", "subs": []}, {"id": "dpm5", "text": "5 Penas.", "subs": []}, {"id": "dpm6", "text": "6 Aplicação da pena.", "subs": []}, {"id": "dpm7", "text": "7 Suspensão condicional da pena.", "subs": []}, {"id": "dpm8", "text": "8 Livramento condicional.", "subs": []}, {"id": "dpm9", "text": "9 Penas acessórias.", "subs": []}, {"id": "dpm10", "text": "10 Efeitos da condenação.", "subs": []}, {"id": "dpm11", "text": "11 Medidas de segurança.", "subs": []}, {"id": "dpm12", "text": "12 Ação penal.", "subs": []}, {"id": "dpm13", "text": "13 Extinção da punibilidade.", "subs": []}, {"id": "dpm14", "text": "14 Crimes militares em tempo de paz.", "subs": []}, {"id": "dpm15", "text": "15 Crimes própria e impropriamente militares.", "subs": []}, {"id": "dpm16", "text": "16 Princípios constitucionais penais com reflexos na lei penal militar.", "subs": []}]}, {"id": "dppm", "name": "Direito Processual Penal Militar", "topics": [{"id": "dppm1", "text": "1 Processo penal militar e sua aplicação.", "subs": []}, {"id": "dppm2", "text": "2 Polícia judiciária militar.", "subs": []}, {"id": "dppm3", "text": "3 Inquérito policial militar.", "subs": []}, {"id": "dppm4", "text": "4 Ação penal militar e seu exercício.", "subs": []}, {"id": "dppm5", "text": "5 Processo.", "subs": []}, {"id": "dppm6", "text": "6 Juiz, auxiliares e partes do processo.", "subs": []}, {"id": "dppm7", "text": "7 Denúncia.", "subs": []}, {"id": "dppm8", "text": "8 Questões prejudiciais.", "subs": []}, {"id": "dppm9", "text": "9 Exceções.", "subs": []}, {"id": "dppm10", "text": "10 Incidente de sanidade mental do acusado.", "subs": []}, {"id": "dppm11", "text": "11 Incidente de falsidade de documento.", "subs": []}, {"id": "dppm12", "text": "12 Medidas preventivas e assecuratórias.", "subs": []}, {"id": "dppm13", "text": "13 Providências que recaem sobre coisas.", "subs": []}, {"id": "dppm14", "text": "14 Providências que recaem sobre pessoas.", "subs": [{"id": "dppm14_1", "text": "14.1 Prisão em flagrante."}, {"id": "dppm14_2", "text": "14.2 Prisão preventiva."}, {"id": "dppm14_3", "text": "14.3 Liberdade provisória."}]}, {"id": "dppm15", "text": "15 Citação, intimação e notificação.", "subs": []}, {"id": "dppm16", "text": "16 Atos probatórios.", "subs": [{"id": "dppm16_1", "text": "16.1 Interrogatório."}, {"id": "dppm16_2", "text": "16.2 Confissão."}, {"id": "dppm16_3", "text": "16.3 Perícias e exames."}, {"id": "dppm16_4", "text": "16.4 Testemunhas."}, {"id": "dppm16_5", "text": "16.5 Acareação."}, {"id": "dppm16_6", "text": "16.6 Reconhecimento de pessoa e coisa."}, {"id": "dppm16_7", "text": "16.7 Documentos."}, {"id": "dppm16_8", "text": "16.8 Indícios."}]}, {"id": "dppm17", "text": "17 Processos em espécie.", "subs": [{"id": "dppm17_1", "text": "17.1 Processo ordinário."}, {"id": "dppm17_2", "text": "17.2 Processos especiais."}, {"id": "dppm17_3", "text": "17.3 Deserção de oficial e de praça."}, {"id": "dppm17_4", "text": "17.4 Insubmissão."}]}, {"id": "dppm18", "text": "18 Nulidades.", "subs": []}, {"id": "dppm19", "text": "19 Recursos.", "subs": [{"id": "dppm19_1", "text": "19.1 Regras gerais."}, {"id": "dppm19_2", "text": "19.2 Recurso em sentido estrito."}, {"id": "dppm19_3", "text": "19.3 Correição parcial."}, {"id": "dppm19_4", "text": "19.4 Apelação."}, {"id": "dppm19_5", "text": "19.5 Embargos."}, {"id": "dppm19_6", "text": "19.6 Revisão."}, {"id": "dppm19_7", "text": "19.7 Recurso extraordinário."}, {"id": "dppm19_8", "text": "19.8 Reclamação."}]}, {"id": "dppm20", "text": "20 Execução.", "subs": [{"id": "dppm20_1", "text": "20.1 Incidentes."}, {"id": "dppm20_2", "text": "20.2 Suspensão condicional da pena."}, {"id": "dppm20_3", "text": "20.3 Livramento condicional."}, {"id": "dppm20_4", "text": "20.4 Indulto, comutação da pena, anistia e reabilitação."}, {"id": "dppm20_5", "text": "20.5 Execução das medidas de segurança."}]}, {"id": "dppm21", "text": "21 Princípios constitucionais processuais com reflexos na lei processual penal militar.", "subs": []}]}, {"id": "dcf", "name": "Noções de Direito Constitucional", "topics": [{"id": "dcf1", "text": "1 Constituição: conceito, conteúdo, estrutura e classificação. Supremacia da Constituição. Poder Constituinte. Interpretação e Aplicabilidade das Normas Constitucionais.", "subs": []}, {"id": "dcf2", "text": "2 Direitos e Garantias Fundamentais. Direitos e Deveres Individuais Difusos e Coletivos. Direitos Sociais.", "subs": []}, {"id": "dcf3", "text": "3 Organização do Estado Brasileiro; divisão espacial do poder; Estado Federal; União; Estados Federados; Distrito Federal; Municípios; intervenção federal; repartição de competências.", "subs": []}, {"id": "dcf4", "text": "4 Poder Legislativo. Organização. Funcionamento. Atribuições. Processo Legislativo.", "subs": []}, {"id": "dcf5", "text": "5 Poder Executivo. Presidente, Vice-Presidente da República e Ministros de Estado.", "subs": []}, {"id": "dcf6", "text": "6 Poder Judiciário. Garantias. Jurisdição. Organização. Órgãos e Competência.", "subs": []}, {"id": "dcf7", "text": "7 Funções essenciais à Justiça.", "subs": []}, {"id": "dcf8", "text": "8 Ministério Público. Natureza. Função. Autonomia. Atribuições.", "subs": []}, {"id": "dcf9", "text": "9 Ação Direta de Inconstitucionalidade. Ação Direta de Constitucionalidade.", "subs": []}, {"id": "dcf10", "text": "10 Ordem Econômica e Financeira. Atividade Econômica do Estado.", "subs": []}, {"id": "dcf11", "text": "11 Princípios constitucionais da seguridade social.", "subs": []}, {"id": "dcf12", "text": "12 Constituição do Estado de Alagoas.", "subs": []}]}, {"id": "dadm", "name": "Noções de Direito Administrativo", "topics": [{"id": "da1", "text": "1 Princípios.", "subs": []}, {"id": "da2", "text": "2 Administração Pública na Constituição Federal de 1988.", "subs": []}, {"id": "da3", "text": "3 Regime jurídico Administrativo.", "subs": []}, {"id": "da4", "text": "4 Poderes da Administração Pública.", "subs": []}, {"id": "da5", "text": "5 Serviço Público.", "subs": []}, {"id": "da6", "text": "6 Poder de Polícia.", "subs": []}, {"id": "da7", "text": "7 Atos Administrativos.", "subs": []}, {"id": "da8", "text": "8 Contratos Administrativos.", "subs": []}, {"id": "da9", "text": "9 Licitação.", "subs": []}, {"id": "da10", "text": "10 Servidores públicos.", "subs": []}, {"id": "da11", "text": "11 Bens públicos.", "subs": []}, {"id": "da12", "text": "12 Administração direta e indireta.", "subs": []}, {"id": "da13", "text": "13 Controle da Administração Pública.", "subs": []}, {"id": "da14", "text": "14 Responsabilidade do Estado.", "subs": []}]}, {"id": "legpmal", "name": "Legislação Institucional", "topics": [{"id": "lp1", "text": "1 Lei Estadual nº 5.346/1992 (Estatuto dos Policiais Militares do Estado de Alagoas).", "subs": []}, {"id": "lp2", "text": "2 Decreto Estadual nº 37.042/1996 (Regulamento Disciplinar da PMAL).", "subs": []}, {"id": "lp3", "text": "3 Decreto-Lei nº 2.848/1940 e suas alterações (Parte geral do Código Penal): Títulos de I a III.", "subs": []}]}, {"id": "legat", "name": "Legislação Extravagante", "topics": [{"id": "la3", "text": "1 Lei nº 7.716/1989 (crimes resultantes de preconceitos de raça ou de cor).", "subs": []}, {"id": "la4", "text": "2 Lei nº 8.072/1990 e Lei nº 8.930/1994 (crimes hediondos).", "subs": []}, {"id": "la5", "text": "3 Lei nº 12.850/2013 (crime organizado).", "subs": []}, {"id": "la6", "text": "4 Lei nº 9.455/1997 (crimes de tortura).", "subs": []}, {"id": "la7", "text": "5 Lei nº 9.605/1998 (crimes contra o meio ambiente).", "subs": []}, {"id": "la8", "text": "6 Lei nº 10.826/2003 (Estatuto do Desarmamento).", "subs": []}, {"id": "la9", "text": "7 Lei nº 11.343/2006 (Lei de Drogas).", "subs": []}, {"id": "la10", "text": "8 Lei nº 11.340/2006 (Lei Maria da Penha).", "subs": []}, {"id": "la11", "text": "9 Lei nº 9.503/1997 (Código de Trânsito Brasileiro).", "subs": []}, {"id": "la12", "text": "10 Lei nº 8.069/1990 (Estatuto da Criança e do Adolescente).", "subs": []}, {"id": "la13", "text": "11 Lei nº 13.869/2019 (abuso de autoridade).", "subs": []}, {"id": "la14", "text": "12 Lei nº 7.960/1989 (prisão temporária).", "subs": []}, {"id": "la15", "text": "13 Lei nº 9.099/1995 (juizados especiais).", "subs": []}, {"id": "la16", "text": "14 Lei nº 10.259/2001 (juizados especiais federais).", "subs": []}]}]}, "conc_1778158115433": {"edital": [{"id": "s_port", "name": "Língua Portuguesa", "topics": [{"id": "s_p1", "text": "1 Compreensão e interpretação de textos de gêneros variados.", "subs": []}, {"id": "s_p2", "text": "2 Reconhecimento de tipos e gêneros textuais.", "subs": []}, {"id": "s_p3", "text": "3 Domínio da ortografia oficial.", "subs": []}, {"id": "s_p4", "text": "4 Domínio dos mecanismos de coesão textual.", "subs": [{"id": "s_p4_1", "text": "4.1 Emprego de elementos de referenciação, substituição e repetição, de conectores e de outros elementos de sequenciação textual."}, {"id": "s_p4_2", "text": "4.2 Emprego de tempos e modos verbais."}]}, {"id": "s_p5", "text": "5 Domínio da estrutura morfossintática do período.", "subs": [{"id": "s_p5_1", "text": "5.1 Emprego das classes de palavras."}, {"id": "s_p5_2", "text": "5.2 Relações de coordenação entre orações e entre termos da oração."}, {"id": "s_p5_3", "text": "5.3 Relações de subordinação entre orações e entre termos da oração."}, {"id": "s_p5_4", "text": "5.4 Emprego dos sinais de pontuação."}, {"id": "s_p5_5", "text": "5.5 Concordância verbal e nominal."}, {"id": "s_p5_6", "text": "5.6 Regência verbal e nominal."}, {"id": "s_p5_7", "text": "5.7 Emprego do sinal indicativo de crase."}, {"id": "s_p5_8", "text": "5.8 Colocação dos pronomes átonos."}]}, {"id": "s_p6", "text": "6 Reescrita de frases e parágrafos do texto.", "subs": [{"id": "s_p6_1", "text": "6.1 Significação das palavras."}, {"id": "s_p6_2", "text": "6.2 Substituição de palavras ou de trechos de texto."}, {"id": "s_p6_3", "text": "6.3 Reorganização da estrutura de orações e de períodos do texto."}, {"id": "s_p6_4", "text": "6.4 Reescrita de textos de diferentes gêneros e níveis de formalidade."}]}]}, {"id": "s_mat", "name": "Matemática", "topics": [{"id": "s_m1", "text": "1 Álgebra linear", "subs": [{"id": "s_m1_1", "text": "1.1 Conjunto numérico: operações com números inteiros, fracionários e decimais."}]}, {"id": "s_m2", "text": "2 Proporções e divisão proporcional.", "subs": []}, {"id": "s_m3", "text": "3 Regras de três simples e composta.", "subs": []}, {"id": "s_m4", "text": "4 Porcentagem.", "subs": []}, {"id": "s_m5", "text": "5 Juros simples e compostos; capitalização e descontos.", "subs": []}, {"id": "s_m6", "text": "6 Taxas de juros: nominal, efetiva, equivalentes, proporcionais, real e aparente.", "subs": []}]}, {"id": "s_info", "name": "Noções de Informática", "topics": [{"id": "s_inf1", "text": "1 Noções de sistema operacional (ambiente Windows).", "subs": []}, {"id": "s_inf2", "text": "2 Edição de textos, planilhas e apresentações (ambiente Microsoft Office).", "subs": []}, {"id": "s_inf3", "text": "3 Redes de computadores.", "subs": [{"id": "s_inf3_1", "text": "3.1 Conceitos básicos, ferramentas, aplicativos e procedimentos de Internet e intranet."}, {"id": "s_inf3_2", "text": "3.2 Programas de navegação (Microsoft Edge, Mozilla Firefox e Google Chrome e similares)."}, {"id": "s_inf3_3", "text": "3.3 Programas de correio eletrônico (Microsoft Outlook)."}, {"id": "s_inf3_4", "text": "3.4 Sítios de busca e pesquisa na Internet."}, {"id": "s_inf3_5", "text": "3.5 Grupos de discussão."}, {"id": "s_inf3_6", "text": "3.6 Redes sociais."}, {"id": "s_inf3_7", "text": "3.7 Computação na nuvem (cloud computing)."}]}, {"id": "s_inf4", "text": "4 Noções de organização e de gerenciamento de informações, arquivos, pastas e programas.", "subs": []}, {"id": "s_inf5", "text": "5 Segurança da informação.", "subs": [{"id": "s_inf5_1", "text": "5.1 Procedimentos de segurança."}, {"id": "s_inf5_2", "text": "5.2 Noções de malware, vírus, worms e pragas virtuais."}, {"id": "s_inf5_3", "text": "5.3 Aplicativos para segurança (antivírus, firewall, anti-spyware etc.)."}, {"id": "s_inf5_4", "text": "5.4 Procedimentos de backup."}, {"id": "s_inf5_5", "text": "5.5 Armazenamento de dados na nuvem (cloud storage)."}]}]}, {"id": "s_al", "name": "Conhecimentos do Estado de Alagoas", "topics": [{"id": "s_al1", "text": "1 Formação histórica de Alagoas.", "subs": [{"id": "s_al1_1", "text": "1.1 Colonização portuguesa."}, {"id": "s_al1_2", "text": "1.2 Economia açucareira."}, {"id": "s_al1_3", "text": "1.3 Emancipação política da Capitania de Pernambuco em 1817."}, {"id": "s_al1_4", "text": "1.4 Elevação à Província em 1821."}]}, {"id": "s_al2", "text": "2 Quilombo dos Palmares.", "subs": [{"id": "s_al2_1", "text": "2.1 Formação no período colonial."}, {"id": "s_al2_2", "text": "2.2 Resistência à escravidão."}, {"id": "s_al2_3", "text": "2.3 Liderança de Zumbi dos Palmares."}]}, {"id": "s_al3", "text": "3 Aspectos geográficos.", "subs": [{"id": "s_al3_1", "text": "3.1 Litoral, Zona da Mata, Agreste e Sertão."}, {"id": "s_al3_2", "text": "3.2 Rio São Francisco."}]}, {"id": "s_al4", "text": "4 Organização político-administrativa.", "subs": [{"id": "s_al4_1", "text": "4.1 Maceió como capital estadual."}, {"id": "s_al4_2", "text": "4.2 Municípios."}, {"id": "s_al4_3", "text": "4.3 Poderes Executivo, Legislativo e Judiciário."}]}, {"id": "s_al5", "text": "5 Economia estadual.", "subs": [{"id": "s_al5_1", "text": "5.1 Agroindústria canavieira."}, {"id": "s_al5_2", "text": "5.2 Turismo."}, {"id": "s_al5_3", "text": "5.3 Setor de serviços."}]}, {"id": "s_al6", "text": "6 Cultura e patrimônio.", "subs": [{"id": "s_al6_1", "text": "6.1 Manifestações culturais populares."}, {"id": "s_al6_2", "text": "6.2 Patrimônio histórico-cultural alagoano."}]}]}, {"id": "s_atu", "name": "Atualidades (somente para prova discursiva)", "topics": [{"id": "s_atu1", "text": "1 Tópicos relevantes e atuais de diversas áreas, tais como segurança, transportes, política, economia, sociedade, educação, saúde, cultura, tecnologia, energia, relações internacionais, desenvolvimento sustentável e ecologia.", "subs": []}]}, {"id": "s_legpmal", "name": "Legislação Pertinente ao Policial Militar de Alagoas", "topics": [{"id": "s_lp1", "text": "1 Lei Estadual nº 5.346/1992 (Estatuto dos Policiais Militares do Estado de Alagoas).", "subs": []}, {"id": "s_lp2", "text": "2 Decreto Estadual nº 37.042/1996 (Aprova o Regulamento Disciplinar da Polícia Militar de Alagoas e dá outras providências).", "subs": []}, {"id": "s_lp3", "text": "3 Decreto-Lei nº 2.848/1940 e suas alterações (Parte geral do Código Penal): Título I a III.", "subs": []}, {"id": "s_lp4", "text": "4 Lei nº 7.716/1989 (crimes resultantes de preconceitos de raça ou de cor).", "subs": []}, {"id": "s_lp5", "text": "5 Lei nº 8.072/1990 e Lei nº 8.930/1994 (crimes hediondos).", "subs": []}, {"id": "s_lp6", "text": "6 Lei nº 12.850/2013 (crime organizado).", "subs": []}, {"id": "s_lp7", "text": "7 Lei nº 9.455/1997 (crimes de tortura).", "subs": []}, {"id": "s_lp8", "text": "8 Lei nº 9.605/1998 (crimes contra o meio ambiente).", "subs": []}, {"id": "s_lp9", "text": "9 Lei nº 10.826/2003 (Estatuto do Desarmamento).", "subs": []}, {"id": "s_lp10", "text": "10 Lei nº 11.343/2006 (Lei de Drogas).", "subs": []}, {"id": "s_lp11", "text": "11 Lei nº 11.340/2006 (Lei Maria da Penha).", "subs": []}, {"id": "s_lp12", "text": "12 Lei nº 9.503/1997 (Código de Trânsito Brasileiro).", "subs": []}, {"id": "s_lp13", "text": "13 Lei nº 8.069/1990 (Estatuto da Criança e do Adolescente).", "subs": []}, {"id": "s_lp14", "text": "14 Lei nº 13.869/2019 (abuso de autoridade).", "subs": []}, {"id": "s_lp15", "text": "15 Lei nº 7.960/1989 (prisão temporária) e suas alterações.", "subs": []}, {"id": "s_lp16", "text": "16 Lei nº 9.099/1995 (juizados especiais).", "subs": []}, {"id": "s_lp17", "text": "17 Lei nº 10.259/2001 (leis dos juizados especiais cíveis e criminais no âmbito da justiça federal) e suas respectivas alterações.", "subs": []}, {"id": "s_lp18", "text": "18 Lei Federal nº 14.751/2023 (Lei orgânica da Polícia Militar).", "subs": []}]}, {"id": "s_dadm", "name": "Noções de Direito Administrativo", "topics": [{"id": "s_da1", "text": "1 Princípios.", "subs": []}, {"id": "s_da2", "text": "2 Regime jurídico administrativo.", "subs": []}, {"id": "s_da3", "text": "3 Poderes da administração pública.", "subs": []}, {"id": "s_da4", "text": "4 Serviço público.", "subs": []}, {"id": "s_da5", "text": "5 Atos administrativos.", "subs": []}, {"id": "s_da6", "text": "6 Contratos administrativos e licitação.", "subs": []}, {"id": "s_da7", "text": "7 Bens públicos.", "subs": []}, {"id": "s_da8", "text": "8 Administração direta e indireta.", "subs": []}, {"id": "s_da9", "text": "9 Controle da administração pública.", "subs": []}, {"id": "s_da10", "text": "10 Responsabilidades do Estado.", "subs": []}]}, {"id": "s_dcf", "name": "Noções de Direito Constitucional", "topics": [{"id": "s_dcf1", "text": "1 Direitos e garantias fundamentais.", "subs": []}, {"id": "s_dcf2", "text": "2 Estrutura e organização do Estado brasileiro.", "subs": []}, {"id": "s_dcf3", "text": "3 Defesa do Estado e das instituições democráticas.", "subs": []}]}, {"id": "s_dpp", "name": "Noções de Direito Processual Penal", "topics": [{"id": "s_dpp1", "text": "1 Inquérito policial.", "subs": []}, {"id": "s_dpp2", "text": "2 Ação penal.", "subs": []}]}, {"id": "s_dpm", "name": "Noções de Direito Penal Militar", "topics": [{"id": "s_dpm1", "text": "1 Aplicação da lei penal militar.", "subs": []}, {"id": "s_dpm2", "text": "2 Crime.", "subs": []}, {"id": "s_dpm3", "text": "3 Imputabilidade penal.", "subs": []}, {"id": "s_dpm4", "text": "4 Concurso de agentes.", "subs": []}, {"id": "s_dpm5", "text": "5 Penas.", "subs": [{"id": "s_dpm5_1", "text": "5.1 Penas principais."}, {"id": "s_dpm5_2", "text": "5.2 Penas acessórias."}, {"id": "s_dpm5_3", "text": "5.3 Aplicação da pena."}]}, {"id": "s_dpm6", "text": "6 Efeitos da condenação.", "subs": []}, {"id": "s_dpm7", "text": "7 Medidas de segurança.", "subs": []}, {"id": "s_dpm8", "text": "8 Ação penal.", "subs": []}, {"id": "s_dpm9", "text": "9 Extinção da punibilidade.", "subs": []}, {"id": "s_dpm10", "text": "10 Crimes militares em tempo de paz.", "subs": []}, {"id": "s_dpm11", "text": "11 Crimes propriamente militares.", "subs": []}, {"id": "s_dpm12", "text": "12 Crimes impropriamente militares.", "subs": []}, {"id": "s_dpm13", "text": "13 Crimes militares por extensão.", "subs": []}]}, {"id": "s_dppm", "name": "Noções de Direito Processual Penal Militar", "topics": [{"id": "s_dppm1", "text": "1 Processo Penal Militar e sua aplicação.", "subs": []}, {"id": "s_dppm2", "text": "2 Polícia judiciária militar.", "subs": []}, {"id": "s_dppm3", "text": "3 Inquérito policial militar.", "subs": []}, {"id": "s_dppm4", "text": "4 Ação penal militar e seu exercício.", "subs": []}, {"id": "s_dppm5", "text": "5 Prisão em flagrante.", "subs": []}, {"id": "s_dppm6", "text": "6 Prisão preventiva.", "subs": []}, {"id": "s_dppm7", "text": "7 Menagem.", "subs": []}, {"id": "s_dppm8", "text": "8 Liberdade provisória. Aplicação provisória de medidas de segurança.", "subs": []}, {"id": "s_dppm9", "text": "9 Processos especiais. Deserção de praça e de praça especial. Insubmissão.", "subs": []}, {"id": "s_dppm10", "text": "10 Composição do Conselho Permanente de Justiça e Conselho Especial de Justiça.", "subs": []}]}, {"id": "s_dh", "name": "Noções de Direitos Humanos", "topics": [{"id": "s_dh1", "text": "1 Conceito.", "subs": []}, {"id": "s_dh2", "text": "2 Evolução.", "subs": []}, {"id": "s_dh3", "text": "3 Abrangência.", "subs": []}, {"id": "s_dh4", "text": "4 Sistema de proteção.", "subs": []}, {"id": "s_dh5", "text": "5 Convenção Americana sobre Direitos Humanos (Pacto de São José e Decreto nº 678/1992).", "subs": []}]}]}}, "leisCfgPorConcurso": {"conc_1778033725540": {"leis": [{"id": "lei_1776899017137", "name": "Constituição do Estado de Alagoas", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285]}, {"id": "cf_t1", "name": "CF/88 — Título I: Princípios Fundamentais (Arts. 1º a 4º)", "arts": [1, 2, 3, 4]}, {"id": "cf_t2", "name": "CF/88 — Título II: Direitos e Garantias Fundamentais (Arts. 5º a 17)", "arts": [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]}, {"id": "cf_t3", "name": "CF/88 — Título III: Organização do Estado (Arts. 18 a 43)", "arts": [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]}, {"id": "cf_t4", "name": "CF/88 — Título IV: Organização dos Poderes (Arts. 44 a 135)", "arts": [44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135]}, {"id": "cf_t5", "name": "CF/88 — Título V: Defesa do Estado e das Instituições (Arts. 136 a 144)", "arts": [136, 137, 138, 139, 140, 141, 142, 143, 144]}, {"id": "cf_t6", "name": "CF/88 — Título VI: Tributação e Orçamento (Arts. 145 a 169)", "arts": [145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169]}, {"id": "cf_t7", "name": "CF/88 — Título VII: Ordem Econômica e Financeira (Arts. 170 a 192)", "arts": [170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192]}, {"id": "cf_t8", "name": "CF/88 — Título VIII: Ordem Social (Arts. 193 a 232)", "arts": [193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232]}, {"id": "cf_t9", "name": "CF/88 — Título IX: Disposições Gerais (Arts. 233 a 250)", "arts": [233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250]}, {"id": "cp_t1", "name": "CP — Parte Geral — Título I: Aplicação da Lei Penal (Arts. 1º a 12)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}, {"id": "cp_t2", "name": "CP — Parte Geral — Título II: Do Crime (Arts. 13 a 25)", "arts": [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]}, {"id": "cp_t3", "name": "CP — Parte Geral — Título III: Imputabilidade Penal (Arts. 26 a 28)", "arts": [26, 27, 28]}, {"id": "cp_pessoa", "name": "CP — Parte Especial — Crimes Contra a Pessoa (Arts. 121 a 154-B)", "arts": [121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154]}, {"id": "cp_patrimonio", "name": "CP — Parte Especial — Crimes Contra o Patrimônio (Arts. 155 a 183)", "arts": [155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183]}, {"id": "cp_adm", "name": "CP — Parte Especial — Crimes Contra a Administração Pública (Arts. 312 a 359-H)", "arts": [312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366]}, {"id": "cadh", "name": "Convenção Americana sobre Direitos Humanos — Pacto de São José (Arts. 1º a 82)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82]}, {"id": "cpm_ap", "name": "CPM — Aplicação da Lei Penal Militar (Arts. 1º a 28)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]}, {"id": "cpm_crime", "name": "CPM — Do Crime (Arts. 29 a 47)", "arts": [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]}, {"id": "cpm_imput", "name": "CPM — Imputabilidade Penal (Arts. 48 a 52)", "arts": [48, 49, 50, 51, 52]}, {"id": "cpm_concurso", "name": "CPM — Concurso de Agentes (Arts. 53 a 54)", "arts": [53, 54]}, {"id": "cpm_penas", "name": "CPM — Penas e Aplicação (Arts. 55 a 109)", "arts": [55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109]}, {"id": "cpm_medidas", "name": "CPM — Medidas de Segurança (Arts. 110 a 120)", "arts": [110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120]}, {"id": "cpm_acao", "name": "CPM — Ação Penal (Arts. 121 a 122)", "arts": [121, 122]}, {"id": "cpm_extincao", "name": "CPM — Extinção da Punibilidade (Arts. 123 a 135)", "arts": [123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135]}, {"id": "cppm_01", "name": "CPPM — Processo Penal Militar e Aplicação (Arts. 1º a 6º)", "arts": [1, 2, 3, 4, 5, 6]}, {"id": "cppm_02", "name": "CPPM — Polícia Judiciária Militar (Arts. 7º a 8º)", "arts": [7, 8]}, {"id": "cppm_03", "name": "CPPM — Inquérito Policial Militar (Arts. 9º a 28)", "arts": [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]}, {"id": "cppm_04", "name": "CPPM — Ação Penal Militar (Arts. 29 a 37)", "arts": [29, 30, 31, 32, 33, 34, 35, 36, 37]}, {"id": "cppm_05", "name": "CPPM — Processo (Arts. 38 a 39)", "arts": [38, 39]}, {"id": "cppm_06", "name": "CPPM — Juiz, Auxiliares e Partes (Arts. 40 a 76)", "arts": [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76]}, {"id": "cppm_07", "name": "CPPM — Denúncia (Arts. 77 a 87)", "arts": [77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87]}, {"id": "cppm_08", "name": "CPPM — Questões Prejudiciais (Arts. 88 a 94)", "arts": [88, 89, 90, 91, 92, 93, 94]}, {"id": "cppm_09", "name": "CPPM — Exceções (Arts. 95 a 104)", "arts": [95, 96, 97, 98, 99, 100, 101, 102, 103, 104]}, {"id": "cppm_10", "name": "CPPM — Incidente de Sanidade Mental (Arts. 105 a 111)", "arts": [105, 106, 107, 108, 109, 110, 111]}, {"id": "cppm_11", "name": "CPPM — Incidente de Falsidade Documental (Arts. 112 a 116)", "arts": [112, 113, 114, 115, 116]}, {"id": "cppm_12", "name": "CPPM — Medidas Preventivas/Assecuratórias (Arts. 117 a 138)", "arts": [117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138]}, {"id": "cppm_13", "name": "CPPM — Providências sobre Coisas (Arts. 139 a 170)", "arts": [139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170]}, {"id": "cppm_14", "name": "CPPM — Providências sobre Pessoas (Arts. 171 a 273)", "arts": [171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273]}, {"id": "cppm_15", "name": "CPPM — Citação, Intimação e Notificação (Arts. 274 a 306)", "arts": [274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306]}, {"id": "cppm_16", "name": "CPPM — Atos Probatórios (Arts. 307 a 385)", "arts": [307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385]}, {"id": "cppm_17", "name": "CPPM — Processos em Espécie (Arts. 386 a 448)", "arts": [386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448]}, {"id": "cppm_18", "name": "CPPM — Nulidades (Arts. 499 a 503)", "arts": [499, 500, 501, 502, 503]}, {"id": "cppm_19", "name": "CPPM — Recursos (Arts. 504 a 541)", "arts": [504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541]}, {"id": "cppm_20", "name": "CPPM — Execução (Arts. 542 a 625)", "arts": [542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558, 559, 560, 561, 562, 563, 564, 565, 566, 567, 568, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 579, 580, 581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597, 598, 599, 600, 601, 602, 603, 604, 605, 606, 607, 608, 609, 610, 611, 612, 613, 614, 615, 616, 617, 618, 619, 620, 621, 622, 623, 624, 625]}, {"id": "leg_estat_pmal", "name": "Lei Est. nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas (Arts. 1 a 135)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135]}, {"id": "leg_rdpm", "name": "Dec. Est. nº 37.042/1996 — Regulamento Disciplinar da PMAL (Arts. 1 a 107)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107]}, {"id": "leg_org_pm", "name": "Lei Federal nº 14.751/2023 — Lei Orgânica da Polícia Militar (Arts. 1 a 44)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44]}, {"id": "lei_org_crim", "name": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU DE COR (ARTS. 1 A 22)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]}, {"id": "lei_tortura", "name": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (ARTS. 1 A 13", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]}, {"id": "lei_meio_amb", "name": "LEI Nº 12.850/2013 — ORGANIZAÇÕES CRIMINOSAS (ARTS. 1 A 26)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]}, {"id": "lei_desarmamento", "name": "LEI Nº 9.455/1997 — CRIMES DE TORTURA (ARTS. 1 A 4)", "arts": [1, 2, 3, 4]}, {"id": "lei_drogas", "name": "LEI Nº 9.605/1998 — CRIMES CONTRA O MEIO AMBIENTE (ARTS. 1 A 82)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82]}, {"id": "lei_maria_penha", "name": "LEI Nº 10.826/2003 — ESTATUTO DO DESARMAMENTO (ARTS. 1 A 37)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37]}, {"id": "lei_ctb", "name": "LEI Nº 11.343/2006 — LEI DE DROGAS (ARTS. 1 A 75)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75]}, {"id": "lei_eca", "name": "LEI Nº 11.340/2006 — LEI MARIA DA PENHA (ARTS. 1 A 46)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46]}, {"id": "lei_abuso_aut", "name": "LEI Nº 9.503/1997 — CÓDIGO DE TRÂNSITO BRASILEIRO (ARTS.  291 a 312-A) - CRIMES", "arts": [291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312]}, {"id": "lei_pris_temp", "name": "LEI Nº 8.069/1990 — ESTATUTO DA CRIANÇA E DO ADOLESCENTE (ARTS. 225 A 244) - CRIMES", "arts": [225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244]}, {"id": "lei_jec", "name": "LEI Nº 13.869/2019 — ABUSO DE AUTORIDADE (ARTS. 1 A 45)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]}, {"id": "lei_jecf", "name": "LEI Nº 7.960/1989 — PRISÃO TEMPORÁRIA (ARTS. 1 A 3)", "arts": [1, 2, 3]}, {"id": "lei_1778460051331", "name": "LEI Nº 9.099/1995 — JUIZADOS ESPECIAIS (ARTS. 1 A 98)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98]}, {"id": "lei_1778460060393", "name": "LEI Nº 10.259/2001 — JUIZADOS ESPECIAIS FEDERAIS (ARTS. 1 A 28)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]}]}, "conc_1778158115433": {"leis": [{"id": "s_lei_cadh", "name": "Convenção Americana sobre Direitos Humanos — Pacto de São José (Arts. 1º a 32)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]}, {"id": "s_lei_racismo", "name": "LEI Nº 7.716/1989 — CRIMES RESULTANTES DE PRECONCEITO DE RAÇA OU COR (Arts. 1º a 20-C)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]}, {"id": "s_lei_hed", "name": "LEI Nº 8.072/1990 — CRIMES HEDIONDOS (Arts. 1º a 12)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}, {"id": "s_lei_orgcrim", "name": "LEI Nº 12.850/2013 — ORGANIZAÇÃO CRIMINOSA (Arts. 1º a 26)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]}, {"id": "s_lei_tortura", "name": "LEI Nº 9.455/1997 — CRIMES DE TORTURA (Arts. 1º a 4º)", "arts": [1, 2, 3, 4]}, {"id": "s_lei_ambiente", "name": "LEI Nº 9.605/1998 — CRIMES AMBIENTAIS (Arts. 2º a 69-A)", "arts": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69]}, {"id": "s_lei_desarmamento", "name": "LEI Nº 10.826/2003 — ESTATUTO DO DESARMAMENTO (Arts. 1º a 21)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]}, {"id": "s_lei_drogas", "name": "LEI Nº 11.343/2006 — LEI DE DROGAS (Arts. 1º a 75)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75]}, {"id": "s_lei_mariap", "name": "LEI Nº 11.340/2006 — LEI MARIA DA PENHA (Arts. 1º a 45)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]}, {"id": "s_lei_ctb", "name": "CTB — CÓDIGO DE TRÂNSITO BRASILEIRO — CRIMES DE TRÂNSITO (Arts. 291 a 312-B)", "arts": [291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312]}, {"id": "s_lei_eca_geral", "name": "ECA — ESTATUTO DA CRIANÇA E DO ADOLESCENTE — PARTE GERAL (Arts. 1º a 85)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85]}, {"id": "s_lei_eca_protec", "name": "ECA — MEDIDAS DE PROTEÇÃO E ATO INFRACIONAL (Arts. 98 a 130)", "arts": [98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130]}, {"id": "s_lei_eca_apur", "name": "ECA — APURAÇÃO DE ATO INFRACIONAL (Arts. 171 a 190)", "arts": [171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190]}, {"id": "s_lei_eca_crimes", "name": "ECA — CRIMES E INFRAÇÕES ADMINISTRATIVAS (Arts. 228 a 258-C)", "arts": [228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258]}, {"id": "s_lei_abuso_aut", "name": "LEI Nº 13.869/2019 — ABUSO DE AUTORIDADE (Arts. 1º a 45)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]}, {"id": "s_lei_pris_temp", "name": "LEI Nº 7.960/1989 — PRISÃO TEMPORÁRIA (Arts. 1º a 10)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}, {"id": "s_lei_jec", "name": "LEI Nº 9.099/1995 — JUIZADOS ESPECIAIS CRIMINAIS (Arts. 60 a 92)", "arts": [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92]}, {"id": "s_lei_jec_fed", "name": "LEI Nº 10.259/2001 — JUIZADOS ESPECIAIS FEDERAIS (Arts. 1º a 28)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]}, {"id": "s_lei_lopm", "name": "LEI Nº 14.751/2023 — LEI ORGÂNICA NACIONAL DAS POLÍCIAS MILITARES (Arts. 1º a 37)", "arts": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37]}]}}};

// Inicializa o sistema com BASE_DATA se o localStorage estiver vazio
// (primeiro uso — nunca sobrescreve dados existentes)
function _inicializarBaseData(){
  try{
    var metaExistente = JSON.parse(localStorage.getItem('protocolo_concursos_meta')||'[]');
    var ativoExistente = localStorage.getItem('protocolo_concurso_ativo');

    // Se já tem dados, não faz nada
    if(metaExistente.length > 0 && ativoExistente) return;

    console.log('[PROTOCOLO] Primeiro uso — inicializando com BASE_DATA...');

    // 1. Registra os concursos base
    localStorage.setItem('protocolo_concursos_meta', JSON.stringify(BASE_DATA.concursos));
    localStorage.setItem('protocolo_concurso_ativo', BASE_DATA.concursos[0].id);

    // 2. Inicializa dados zerados por concurso
    BASE_DATA.concursos.forEach(function(c){
      var dadosVazios = BASE_DATA.dadosConcurso[c.id] || {
        cronograma:{}, questoes:{}, questoesLog:{}, sessoes:[],
        sessoesDiarias:{}, revisaoEspacada:{}, progresso:{}, leitura:{}, resumos:{}
      };
      localStorage.setItem('protocolo_conc_data_'+c.id, JSON.stringify(dadosVazios));
    });

    // 3. Inicializa shared (banco, flashDecks, simulados)
    var shared = {
      banco: BASE_DATA.banco,
      simulados: BASE_DATA.simulados,
      erros: [],
      massificadas: [],
      flashDecks: BASE_DATA.flashDecks
    };
    localStorage.setItem('protocolo_shared', JSON.stringify(shared));

    // 4. Salva cronCfg base para o primeiro concurso
    if(BASE_DATA.cronCfg){
      localStorage.setItem('pmal26_cfg_'+BASE_DATA.concursos[0].id, JSON.stringify(BASE_DATA.cronCfg));
    }

    // 4.1. NOVO: se BASE_DATA traz editalCfgPorConcurso, semeia cada concurso na chave correta
    // (formato preferencial — isolamento garantido por id)
    if(BASE_DATA.editalCfgPorConcurso && typeof BASE_DATA.editalCfgPorConcurso==='object'){
      Object.keys(BASE_DATA.editalCfgPorConcurso).forEach(function(cid){
        try{
          localStorage.setItem('pmal26_edital_cfg_'+cid, JSON.stringify(BASE_DATA.editalCfgPorConcurso[cid]));
        }catch(e){}
      });
    } else if(BASE_DATA.editalCfg){
      // Legado: só para o primeiro concurso (mantém compatibilidade com seeds antigas)
      localStorage.setItem('pmal26_edital_cfg_'+BASE_DATA.concursos[0].id, JSON.stringify(BASE_DATA.editalCfg));
    }

    // 4.2. NOVO: se BASE_DATA traz leisCfgPorConcurso, semeia cada concurso na chave correta
    if(BASE_DATA.leisCfgPorConcurso && typeof BASE_DATA.leisCfgPorConcurso==='object'){
      Object.keys(BASE_DATA.leisCfgPorConcurso).forEach(function(cid){
        try{
          localStorage.setItem('pmal26_leis_cfg_'+cid, JSON.stringify(BASE_DATA.leisCfgPorConcurso[cid]));
        }catch(e){}
      });
    } else if(BASE_DATA.leisCfg){
      // Legado: só para o primeiro concurso
      localStorage.setItem('pmal26_leis_cfg_'+BASE_DATA.concursos[0].id, JSON.stringify(BASE_DATA.leisCfg));
    }

    // 5. Popula ST (estado em memória) com os dados base
    ST.banco      = BASE_DATA.banco;
    ST.simulados  = BASE_DATA.simulados;
    ST.flashDecks = BASE_DATA.flashDecks;
    ST.erros      = [];
    ST.massificadas = [];

    console.log('[PROTOCOLO] BASE_DATA inicializado com sucesso!');
  }catch(e){
    console.warn('[PROTOCOLO] Erro ao inicializar BASE_DATA:', e);
  }
}
// ══════════════════════════════════════════════════════════════════

// ── Leitura V2 backward compatibility aliases ──────────────────────
// These ensure any code calling buildLeitura() / renderLeituraGeral()
// still works after migration to the new reader.
(function() {
  var _origBuildLeitura = window.buildLeitura;
  window.buildLeitura = function(_force) {
    if (typeof lnBuild === 'function') {
      var root = document.getElementById('leitura-next-root') || document.getElementById('ln-main');
      if (root) { if (typeof lnRender === 'function') lnRender(); }
      else setTimeout(lnBuild, 40);
    } else if (_origBuildLeitura) {
      _origBuildLeitura(_force);
    }
  };
  window.renderLeituraGeral = function(_force) {
    // No-op in V2 — lnRender handles all rendering
    if (typeof lnRender === 'function' && document.getElementById('ln-main')) lnRender();
  };
  // Alias for any code that calls lnBuild before it's defined
  if (typeof lnBuild === 'undefined') window.lnBuild = null;
})();
// ══════════════════════════════════════════════════════════════════

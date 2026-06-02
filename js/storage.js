/* ════════════════════════════════════════════════════════════════════
 * storage.js
 * ────────────────────────────────────────────────────────────────────
 * Estado global (ST) + persistência multi-camada:
 *   Camada 1: localStorage  (imediato, offline)
 *   Camada 2: Firebase Firestore (nuvem, multi-dispositivo)
 *
 * IMPORTANTE: Este arquivo é parte do PROTOCOLO 01 (Estratégia B — Fase 1).
 * Todas as funções declaradas aqui são GLOBAIS (window.<nome>) por design.
 * NÃO converter para ESModules / IIFE / import-export sem refatoração ampla.
 * NÃO renomear funções (handlers inline no HTML dependem dos nomes atuais).
 * ════════════════════════════════════════════════════════════════════ */


/* ════════════════════════════════════════════════════════════════════
 * FIREBASE — Inicialização via CDN (compatível com script src, sem build)
 * Projeto: protocolo-01-gma
 * ════════════════════════════════════════════════════════════════════ */
const _fbConfig = {
  apiKey:            "AIzaSyDj_lelf6nqkf5FQkrwqIJ_Mhb8r8uyaaA",
  authDomain:        "protocolo-01-gma.firebaseapp.com",
  projectId:         "protocolo-01-gma",
  storageBucket:     "protocolo-01-gma.firebasestorage.app",
  messagingSenderId: "95917836311",
  appId:             "1:95917836311:web:89fd02b3ca8643f3313452"
};

/* ── ID de usuário: usa o uid do Firebase Auth ou gera um fixo por device ── */
let _fbUserId = localStorage.getItem('p01_fb_uid') || null;
let _fbDb     = null;   // instância do Firestore
let _fbReady  = false;  // true quando o SDK carregou e autenticou
let _fbSyncTimer = null;

/* ── Carrega o SDK do Firebase via CDN e inicializa ──
 * IMPORTANTE: só inicia após window 'load' — garante que todos os scripts
 * do sistema já carregaram e o DOM está 100% pronto.
 * Isso evita o travamento causado por injeção de scripts externos durante
 * o parse/carregamento dos scripts do sistema. ── */
function _initFirebase() {
  if (window._fbInitDone) return;
  window._fbInitDone = true;

  function _loadScript(src, cb) {
    try {
      var s = document.createElement('script');
      s.src = src;
      s.onload = cb;
      s.onerror = function() {
        console.warn('[P01-FB] Falha ao carregar SDK:', src);
        // Não trava — apenas Firebase fica indisponível
      };
      (document.head || document.body || document.documentElement).appendChild(s);
    } catch(e) {
      console.warn('[P01-FB] _loadScript error:', e.message);
    }
  }

  _loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', function() {
    _loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js', function() {
      _loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js', function() {
        try {
          if (!firebase.apps.length) {
            firebase.initializeApp(_fbConfig);
          }
          _fbDb = firebase.firestore();

          // Usa onAuthStateChanged para respeitar login existente (Google/Email)
          // Só faz login anônimo se não houver nenhum usuário autenticado
          firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
              // Já tem usuário (anônimo OU real) — usa ele
              _fbUserId = user.uid;
              localStorage.setItem('p01_fb_uid', _fbUserId);
              _fbReady = true;
              console.log('[P01-FB] ✓ Firebase pronto. UID:', _fbUserId);
              _fbPullFromCloud();
            } else {
              // Nenhum usuário — faz login anônimo como fallback
              firebase.auth().signInAnonymously()
                .then(function(cred) {
                  _fbUserId = cred.user.uid;
                  localStorage.setItem('p01_fb_uid', _fbUserId);
                  _fbReady = true;
                  console.log('[P01-FB] ✓ Firebase pronto (anônimo). UID:', _fbUserId);
                  _fbPullFromCloud();
                })
                .catch(function(e) {
                  console.warn('[P01-FB] Auth anônimo falhou:', e.message);
                });
            }
          });
        } catch(e) {
          console.warn('[P01-FB] Erro ao inicializar Firebase:', e.message);
        }
      });
    });
  });
}

// Aguarda a página inteira carregar antes de tocar no Firebase
// 'load' = DOM + todos os scripts externos já executaram
window.addEventListener('load', function() {
  setTimeout(_initFirebase, 1000); // +1s de folga extra
});

/* ════════════════════════════════════════════════════════════════════
 * _fbPushToCloud — envia ST para o Firestore
 * Divide em 3 documentos para respeitar o limite de 1MB por doc:
 *   users/{uid}/state/shared   → banco, simulados, erros, cronoLog
 *   users/{uid}/state/conc_{id} → dados do concurso ativo
 *   users/{uid}/state/meta     → cronograma, progresso, leitura, revisao
 * ════════════════════════════════════════════════════════════════════ */
function _fbPushToCloud() {
  if (!_fbReady || !_fbDb || !_fbUserId) return;

  try {
    const concId = typeof _concGetAtivo === 'function' ? _concGetAtivo() : null;
    const base   = _fbDb.collection('users').doc(_fbUserId).collection('state');

    // Documento 1 — dados compartilhados (banco de questões, erros, simulados)
    const sharedDoc = {
      banco:        ST.banco        || [],
      simulados:    ST.simulados    || [],
      erros:        ST.erros        || [],
      massificadas: ST.massificadas || [],
      flashDecks:   ST.flashDecks   || [],
      bancoSessoes: ST.bancoSessoes || [],
      cronoLog:     ST.cronoLog     || [],
      _ts: Date.now()
    };
    base.doc('shared').set(sharedDoc, { merge: true })
      .catch(function(e){ console.warn('[P01-FB] shared write error:', e.message); });

    // Documento 2 — dados do concurso ativo
    if (concId) {
      const concDoc = {
        sessoes:          ST.sessoes          || [],
        sessoesDiarias:   ST.sessoesDiarias   || {},
        questoesLog:      ST.questoesLog      || {},
        revisaoEspacada:  ST.revisaoEspacada  || {},
        progresso:        ST.progresso        || {},
        leitura:          ST.leitura          || {},
        resumos:          ST.resumos          || {},
        _ts: Date.now()
      };
      base.doc('conc_' + concId).set(concDoc, { merge: true })
        .catch(function(e){ console.warn('[P01-FB] conc write error:', e.message); });
    }

    // Documento 3 — meta (cronograma, marcações de edital)
    const metaDoc = {
      cronograma: ST.cronograma || {},
      _ts: Date.now()
    };
    base.doc('meta').set(metaDoc, { merge: true })
      .catch(function(e){ console.warn('[P01-FB] meta write error:', e.message); });

  } catch(e) {
    console.warn('[P01-FB] _fbPushToCloud error:', e.message);
  }
}

/* ════════════════════════════════════════════════════════════════════
 * _fbPullFromCloud — carrega dados da nuvem e mescla no ST local
 * Só executa na primeira conexão (evita sobrescrever dados mais novos)
 * ════════════════════════════════════════════════════════════════════ */
function _fbPullFromCloud() {
  if (!_fbReady || !_fbDb || !_fbUserId) return;

  const concId = typeof _concGetAtivo === 'function' ? _concGetAtivo() : null;
  const base   = _fbDb.collection('users').doc(_fbUserId).collection('state');

  // Busca shared
  base.doc('shared').get().then(function(doc) {
    if (!doc.exists) return;
    const d = doc.data();
    // Só sobrescreve se a nuvem tem mais dados (array maior = mais recente)
    if (d.banco        && d.banco.length        > (ST.banco        || []).length)  ST.banco        = d.banco;
    if (d.simulados    && d.simulados.length    > (ST.simulados    || []).length)  ST.simulados    = d.simulados;
    if (d.erros        && d.erros.length        > (ST.erros        || []).length)  ST.erros        = d.erros;
    if (d.massificadas && d.massificadas.length > (ST.massificadas || []).length)  ST.massificadas = d.massificadas;
    if (d.flashDecks   && d.flashDecks.length   > (ST.flashDecks   || []).length)  ST.flashDecks   = d.flashDecks;
    if (d.bancoSessoes && d.bancoSessoes.length > (ST.bancoSessoes || []).length)  ST.bancoSessoes = d.bancoSessoes;
    if (d.cronoLog     && d.cronoLog.length     > (ST.cronoLog     || []).length)  ST.cronoLog     = d.cronoLog;
    console.log('[P01-FB] ✓ Dados shared sincronizados da nuvem');
    // Salva o merge no localStorage também
    _doSaveLocal();
  }).catch(function(e){ console.warn('[P01-FB] shared read error:', e.message); });

  // Busca concurso ativo
  if (concId) {
    base.doc('conc_' + concId).get().then(function(doc) {
      if (!doc.exists) return;
      const d = doc.data();
      // Merge inteligente: timestamp determina versão mais recente
      const cloudTs = d._ts || 0;
      const localTs = ST._lastSaveTs || 0;
      if (cloudTs > localTs) {
        if (d.sessoes)         ST.sessoes         = d.sessoes;
        if (d.sessoesDiarias)  ST.sessoesDiarias  = d.sessoesDiarias;
        if (d.questoesLog)     ST.questoesLog     = d.questoesLog;
        if (d.revisaoEspacada) ST.revisaoEspacada = d.revisaoEspacada;
        if (d.progresso)       ST.progresso       = d.progresso;
        if (d.leitura)         ST.leitura         = d.leitura;
        if (d.resumos)         ST.resumos         = d.resumos;
        console.log('[P01-FB] ✓ Dados do concurso sincronizados da nuvem (nuvem mais recente)');
        _doSaveLocal();
      }
    }).catch(function(e){ console.warn('[P01-FB] conc read error:', e.message); });
  }

  // Busca meta (cronograma)
  base.doc('meta').get().then(function(doc) {
    if (!doc.exists) return;
    const d = doc.data();
    if (d.cronograma && Object.keys(d.cronograma).length > Object.keys(ST.cronograma || {}).length) {
      ST.cronograma = d.cronograma;
      console.log('[P01-FB] ✓ Cronograma sincronizado da nuvem');
      _doSaveLocal();
    }
  }).catch(function(e){ console.warn('[P01-FB] meta read error:', e.message); });
}

/* ════════════════════════════════════════════════════════════════════
 * Função pública para forçar sincronização manual (ex: botão "Sincronizar")
 * Uso: window.fbSync() no console ou num botão
 * ════════════════════════════════════════════════════════════════════ */
window.fbSync = function() {
  if (!_fbReady) {
    console.warn('[P01-FB] Firebase ainda não está pronto. Aguarde.');
    return;
  }
  _fbPushToCloud();
  console.log('[P01-FB] Sincronização manual disparada.');
  if (typeof showToast === 'function') showToast('☁️ Sincronizando com a nuvem...');
};


function loadState(){
try{
// ── Sistema multi-concurso: se já inicializado, carrega dados do concurso ativo ──

/* ════════════════════════════════════════════════════════════════════
 * FASE 9.4.12.2 — Restauração completa do backup PMAL2026_backup_20260529_0902.json
 * Aplicado em: 2026-05-29
 * Concursos: PMAL - OFICIAL, PMAL - SOLDADO, Guarda Municipal de Aracaju
 * Esta função roda UMA VEZ e restaura o estado exato do backup.
 * Flag: pmal26_backup_restaurado_20260529_0902
 * ════════════════════════════════════════════════════════════════════ */
(function _restaurarBackup20260529_0902() {
  var FLAG = 'pmal26_backup_restaurado_20260529_0902';
  if(localStorage.getItem(FLAG)) return; // já restaurado

  try {
    // 1. Meta dos concursos
    localStorage.setItem('protocolo_concursos_meta', '[{"id":"conc_1778033725540","nome":"PMAL - OFICIAL","cargo":"","banca":"CEBRASPE","dataProva":"2026-08-30","dataInicio":"2026-04-12","criadoEm":"2026-04-12T00:00:00.000Z"},{"id":"conc_1778158115433","nome":"PMAL - SOLDADO","cargo":"","banca":"CEBRASPE","dataProva":"2026-08-30","dataInicio":"2026-04-12","criadoEm":"2026-05-07T00:00:00.000Z"},{"id":"conc_1778290317959","nome":"Guarda Municipal de Aracaju","cargo":"","banca":"IDECAN","dataProva":"2026-09-13","dataInicio":"2026-05-29","criadoEm":"2026-05-07T00:00:00.000Z"}]');
    // 2. Concurso ativo
    localStorage.setItem('protocolo_concurso_ativo', 'conc_1778033725540');
    // 3. Shared
    localStorage.setItem('protocolo_shared', '{"banco":[],"simulados":[],"erros":[],"massificadas":[],"flashDecks":[],"bancoSessoes":[],"cronograma":{},"bancoProgressoPorConcurso":{"conc_1778033725540":{}},"bancoSessoesPorConcurso":{}}');
    // 8. Tema visual
    localStorage.setItem('pmal_theme', 'dark');
    // 9. Marcar como restaurado
    localStorage.setItem(FLAG, '1');
    console.log('[P01] Backup restaurado: PMAL2026_backup_20260529_0902.json');
  } catch(e) {
    console.error('[P01] Erro ao restaurar backup:', e);
  }
})();

const _concAtivo = localStorage.getItem('protocolo_concurso_ativo');
const _concMeta  = JSON.parse(localStorage.getItem('protocolo_concursos_meta')||'[]');
if(_concAtivo && _concMeta.length > 0){
  const _dados  = JSON.parse(localStorage.getItem('protocolo_conc_data_'+_concAtivo)||'{}');
  const _shared = JSON.parse(localStorage.getItem('protocolo_shared')||'{}');
  if(Object.keys(_dados).length === 0){
    const _legado = JSON.parse(localStorage.getItem('pmal26_v4')||'{}');
    if(Object.keys(_legado).length > 0){
      const CONC_F=['cronograma','questoesLog','sessoes','sessoesDiarias','revisaoEspacada','progresso','leitura','resumos'];
      const SHAR_F=['banco','simulados','erros','massificadas','flashDecks','bancoSessoes'];
      const cd={}, sh={};
      CONC_F.forEach(f=>{if(_legado[f]!==undefined)cd[f]=_legado[f];});
      SHAR_F.forEach(f=>{if(_legado[f]!==undefined)sh[f]=_legado[f];});
      try{
        localStorage.setItem('protocolo_conc_data_'+_concAtivo, JSON.stringify(cd));
        localStorage.setItem('protocolo_shared', JSON.stringify(sh));
      }catch(e){}
      return _legado;
    }
  }
  const merged = Object.assign({}, _shared, _dados);
  return merged;
}
const _sharedFb = JSON.parse(localStorage.getItem('protocolo_shared')||'{}');
if(Object.keys(_sharedFb).length > 0){
  return _sharedFb;
}
const main=JSON.parse(localStorage.getItem('pmal26_v4')||'{}');
const cold=JSON.parse(localStorage.getItem('pmal26_cold')||'{}');
if(Object.keys(cold).length>0){
Object.assign(main,cold);
localStorage.removeItem('pmal26_cold');
}
return main;
}catch(e){return{};}
}
let _saveTimer=null;

/* ════════════════════════════════════════════════════════════════════
 * _doSaveLocal — salva APENAS no localStorage (rápido, síncrono)
 * ════════════════════════════════════════════════════════════════════ */
function _doSaveLocal(){
  const _concId = typeof _concGetAtivo==='function' ? _concGetAtivo() : null;
  if(_concId && typeof CONC_FIELDS!=='undefined'){
    const _cd={};
    CONC_FIELDS.forEach(f=>{_cd[f]=ST[f];});
    try{ localStorage.setItem('protocolo_conc_data_'+_concId, JSON.stringify(_cd)); }catch(e){}
    const _sh={};
    (typeof SHARED_FIELDS!=='undefined'?SHARED_FIELDS:[]).forEach(f=>{_sh[f]=ST[f];});
    try{ localStorage.setItem('protocolo_shared', JSON.stringify(_sh)); }catch(e){}
  }
  try{
    ST._lastSaveTs = Date.now();
    localStorage.setItem('pmal26_v4',JSON.stringify(ST));
  }catch(e){
    if(e.name==='QuotaExceededError'){
      _limparDadosAntigos();
      try{localStorage.setItem('pmal26_v4',JSON.stringify(ST));}catch(e2){}
    }
  }
}

/* ════════════════════════════════════════════════════════════════════
 * _doSave — salva no localStorage E agenda push para o Firebase
 * O push é debounced em 3s para não spammar a nuvem a cada keystroke
 * ════════════════════════════════════════════════════════════════════ */
function _doSave(){
  // 1. Salva local imediatamente (não bloqueia)
  _doSaveLocal();

  // 2. Agenda push para Firebase (debounce 3s)
  if(_fbSyncTimer) clearTimeout(_fbSyncTimer);
  _fbSyncTimer = setTimeout(function(){
    _fbPushToCloud();
  }, 3000);
}

function saveCold(){ saveState(); } // alias para compatibilidade

function saveState(){
if(_saveTimer) clearTimeout(_saveTimer);
_saveTimer=setTimeout(_doSave, 300);
}

// Salva imediatamente antes de fechar (localStorage + Firebase)
window.addEventListener('beforeunload',function(){
  if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null;}
  if(_fbSyncTimer){clearTimeout(_fbSyncTimer);_fbSyncTimer=null;}
  _doSaveLocal();          // localStorage: síncrono, sempre funciona
  _fbPushToCloud();        // Firebase: melhor esforço (pode não completar no unload)
});

function saveStateNow(){
if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null;}
if(_fbSyncTimer){clearTimeout(_fbSyncTimer);_fbSyncTimer=null;}
_doSave();
}

// Remove sessões muito antigas para não deixar o localStorage inchado
function _limparDadosAntigos(){
if(!ST.sessoesDiarias) return;
const datas=Object.keys(ST.sessoesDiarias).sort();
// Mantém apenas os últimos 90 dias
const cutoff=new Date();cutoff.setDate(cutoff.getDate()-90);
datas.forEach(d=>{
const [dia,mes,ano]=d.split('/').map(Number);
const dt=new Date(ano,mes-1,dia);
if(dt<cutoff) delete ST.sessoesDiarias[d];
});
}
let ST = loadState();
if(!ST.cronograma) ST.cronograma={};

// ── FASE 9.4.3: Migrar marcações de cronograma por concurso → shared ────────
(function _migrarCronogramaGlobal(){
  try{
    var sharedRaw = localStorage.getItem('protocolo_shared');
    var shared = sharedRaw ? JSON.parse(sharedRaw) : {};
    if(shared.cronograma && Object.keys(shared.cronograma).length > 0) return;
    var meta = JSON.parse(localStorage.getItem('protocolo_concursos_meta')||'[]');
    if(!meta.length) return;
    var marcacoesConsolidadas = {};
    meta.forEach(function(c){
      var dadosRaw = localStorage.getItem('protocolo_conc_data_'+c.id);
      if(!dadosRaw) return;
      var dados = null;
      try{ dados = JSON.parse(dadosRaw); }catch(e){ return; }
      if(!dados || !dados.cronograma) return;
      Object.keys(dados.cronograma).forEach(function(k){
        if(dados.cronograma[k]) marcacoesConsolidadas[k] = true;
      });
    });
    if(Object.keys(marcacoesConsolidadas).length === 0) return;
    ST.cronograma = marcacoesConsolidadas;
    shared.cronograma = marcacoesConsolidadas;
    try{ localStorage.setItem('protocolo_shared', JSON.stringify(shared)); }catch(e){}
  }catch(e){}
})();
if(!ST.questoes) ST.questoes={};
if(!ST.questoesLog) ST.questoesLog={};
if(!ST.sessoes) ST.sessoes=[];
if(!ST.sessoesDiarias) ST.sessoesDiarias={};
if(!ST.revisaoEspacada) ST.revisaoEspacada={};
if(!ST.progresso) ST.progresso={};
if(!ST.bancoProgressoPorConcurso) ST.bancoProgressoPorConcurso={};
if(!ST.bancoSessoesPorConcurso)   ST.bancoSessoesPorConcurso={};
if(!ST.leitura) ST.leitura={};
if(!ST.simulados) ST.simulados=[];
if(!ST.erros) ST.erros=[];
if(!ST.massificadas) ST.massificadas=[];
if(!ST.banco) ST.banco=[];
if(!Array.isArray(ST.bancoSessoes)) ST.bancoSessoes=[];
if(!ST.resumos) ST.resumos={};
const TABS_LIST=['analytics-next','cronograma','edital','leitura','eq-v2','simulados-v2','banco','flashcards','perfil'];


/* ════════════════════════════════════════════════════════════════════
 * P01 Storage Guard — prevents partial saves, enforces module ownership
 * ════════════════════════════════════════════════════════════════════ */
const P01Storage = (function() {
  'use strict';

  function safeSave(key, newData) {
    try {
      const existing = safeLoad(key) || {};
      const merged = Object.assign({}, existing, newData);
      localStorage.setItem(key, JSON.stringify(merged));
      return true;
    } catch(e) {
      console.warn('[P01Storage] safeSave failed for key:', key, e.message);
      return false;
    }
  }

  function safeLoad(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      console.warn('[P01Storage] safeLoad parse error for key:', key, e.message);
      return null;
    }
  }

  function safeRemove(key) {
    try { localStorage.removeItem(key); return true; }
    catch(e) { return false; }
  }

  function validate(data, requiredFields) {
    if (!data || typeof data !== 'object') return false;
    return requiredFields.every(function(f) { return f in data; });
  }

  return { safeSave, safeLoad, safeRemove, validate };
})();


/* ════════════════════════════════════════════════════════════════════
 * P01 Module Lifecycle Standard
 * ════════════════════════════════════════════════════════════════════ */
const P01Lifecycle = {
  _modules: {},

  register: function(name, obj) {
    if (!obj.build || !obj.render) {
      console.warn('[P01Lifecycle] Module "'+name+'" missing build() or render()');
      return;
    }
    this._modules[name] = obj;
  },

  rebuildAll: function() {
    Object.keys(this._modules).forEach(function(name) {
      var mod = P01Lifecycle._modules[name];
      try {
        if (typeof mod.teardown === 'function') mod.teardown();
        if (typeof mod.rebuild === 'function') mod.rebuild();
        else { mod.build(); mod.render(); }
      } catch(e) {
        console.warn('[P01Lifecycle] rebuildAll failed for "'+name+'":', e.message);
      }
    });
  }
};


/* ════════════════════════════════════════════════════════════════════
 * P01 Engineering Guards — Runtime integrity checks
 * ════════════════════════════════════════════════════════════════════ */
(function P01Guard() {
  'use strict';

  function run() {
    var issues = [];

    var allIds = {};
    document.querySelectorAll('[id]').forEach(function(el) {
      var id = el.id;
      if (allIds[id]) {
        issues.push('DUPLICATE_ID: #' + id);
      }
      allIds[id] = true;
    });

    var TABS = typeof TABS_LIST !== 'undefined' ? TABS_LIST : [];
    TABS.forEach(function(tabId) {
      if (!document.getElementById('tab-' + tabId)) {
        issues.push('MISSING_TAB: tab-' + tabId + ' not in DOM');
      }
    });

    var activeSections = document.querySelectorAll('.section.active');
    if (activeSections.length === 0) {
      issues.push('NO_ACTIVE_SECTION: no section has .active class');
    }
    if (activeSections.length > 1) {
      var ids = Array.from(activeSections).map(function(s){ return '#'+s.id; });
      issues.push('MULTIPLE_ACTIVE_SECTIONS: ' + ids.join(', '));
    }

    try {
      localStorage.setItem('p01_guard_test', '1');
      localStorage.removeItem('p01_guard_test');
    } catch(e) {
      issues.push('LOCALSTORAGE_UNAVAILABLE: ' + e.message);
    }

    // ── Verifica status do Firebase ──────────────────────────────────
    if (!_fbReady) {
      issues.push('FIREBASE_NOT_READY: ainda conectando à nuvem (normal nos primeiros segundos)');
    } else {
      console.log('[P01Guard] ✓ Firebase conectado. UID:', _fbUserId);
    }

    if (issues.length === 0) {
      console.log('[P01Guard] ✓ All integrity checks passed');
    } else {
      console.group('[P01Guard] ⚠️  ' + issues.length + ' issue(s) found:');
      issues.forEach(function(i){ console.warn('  ' + i); });
      console.groupEnd();
    }

    return issues;
  }

  window.P01Guard = run;

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(run, 500);
  });
})();


/* ════════════════════════════════════════════════════════════════════
 * FALLBACK: Atualiza o label "#conc-btn-label" caso o script responsável
 * (p01-core.js / app.js) falhe silenciosamente.
 * Lê direto do localStorage e preenche o nome do concurso ativo.
 * Roda após 2s — tempo suficiente para o script correto agir primeiro.
 * ════════════════════════════════════════════════════════════════════ */
(function _concLabelFallback() {
  function _tryUpdate() {
    try {
      var el = document.getElementById('conc-btn-label');
      if (!el) return; // elemento não existe, nada a fazer

      // Só atua se ainda estiver "Carregando..."
      var current = (el.textContent || el.innerText || '').trim();
      if (current !== 'Carregando...') return; // já foi atualizado normalmente

      // Lê dados do localStorage
      var meta = [];
      try { meta = JSON.parse(localStorage.getItem('protocolo_concursos_meta') || '[]'); } catch(e) {}
      var ativo = localStorage.getItem('protocolo_concurso_ativo') || '';

      if (!meta.length || !ativo) {
        el.textContent = 'Sem concurso';
        return;
      }

      var concurso = null;
      for (var i = 0; i < meta.length; i++) {
        if (meta[i].id === ativo) { concurso = meta[i]; break; }
      }

      el.textContent = concurso ? (concurso.nome || 'Concurso') : 'Sem concurso';
      console.log('[P01-Fallback] Label do concurso atualizado via fallback:', el.textContent);
    } catch(e) {
      console.warn('[P01-Fallback] _concLabelFallback erro:', e.message);
    }
  }

  // Tenta aos 2s (dá tempo para o script correto agir; só age se ainda estiver travado)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(_tryUpdate, 2000); });
  } else {
    setTimeout(_tryUpdate, 2000);
  }
})();


/* ════════════════════════════════════════════════════════════════════
 * P01 AUTH UI — Login com Google / Email
 * ════════════════════════════════════════════════════════════════════ */
(function P01AuthUI() {
  'use strict';

  var _authUser = null;

  var _css = `
#p01-fb-btn {
  display:inline-flex;align-items:center;gap:6px;
  font-family:'Oswald',sans-serif;font-size:.65rem;font-weight:700;
  text-transform:uppercase;letter-spacing:.07em;
  background:transparent;border:1.5px solid rgba(245,200,0,.35);
  color:var(--gold);border-radius:7px;padding:.3rem .8rem;
  cursor:pointer;transition:all .18s;white-space:nowrap;position:relative;
}
#p01-fb-btn:hover{background:rgba(245,200,0,.1);border-color:var(--gold);}
#p01-fb-btn.logado{border-color:rgba(74,222,128,.4);color:#4ade80;}
#p01-fb-btn.logado:hover{background:rgba(74,222,128,.08);}
#p01-fb-dot{display:none;width:7px;height:7px;border-radius:50%;
  background:#4ade80;box-shadow:0 0 5px #4ade80;
  position:absolute;top:4px;right:4px;}
#p01-fb-overlay{display:none;position:fixed;inset:0;
  background:rgba(0,0,0,.72);backdrop-filter:blur(4px);
  z-index:2000;align-items:center;justify-content:center;}
#p01-fb-overlay.open{display:flex;}
#p01-fb-modal{
  background:var(--surface,#13132a);
  border:1px solid rgba(245,200,0,.22);border-radius:16px;padding:1.5rem;
  width:min(380px,calc(100vw - 2rem));
  box-shadow:0 24px 64px rgba(0,0,0,.8);
  animation:p01fbIn .2s ease;
}
@keyframes p01fbIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
.p01fb-title{font-family:'Oswald',sans-serif;font-size:1rem;font-weight:700;
  color:var(--gold);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.25rem;}
.p01fb-sub{font-size:.72rem;color:var(--muted);margin-bottom:1rem;line-height:1.5;}
.p01fb-input{width:100%;box-sizing:border-box;
  background:rgba(255,255,255,.05);border:1px solid var(--border);
  border-radius:8px;color:var(--text);font-family:'Barlow',sans-serif;
  font-size:.82rem;padding:.45rem .7rem;outline:none;
  transition:border-color .15s;margin-bottom:.6rem;}
.p01fb-input:focus{border-color:var(--gold);}
.p01fb-btn-google{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;
  background:rgba(255,255,255,.06);border:1px solid var(--border);
  border-radius:8px;color:var(--text);font-size:.8rem;padding:.5rem;
  cursor:pointer;transition:all .18s;margin-bottom:.75rem;
  font-family:'Barlow',sans-serif;}
.p01fb-btn-google:hover{background:rgba(255,255,255,.1);}
.p01fb-btn-primary{width:100%;font-family:'Oswald',sans-serif;font-size:.72rem;
  font-weight:700;text-transform:uppercase;letter-spacing:.07em;
  background:var(--gold);color:#08081a;border:none;
  border-radius:8px;padding:.5rem;cursor:pointer;
  transition:opacity .15s;margin-bottom:.5rem;}
.p01fb-btn-primary:hover{opacity:.88;}
.p01fb-btn-danger{background:rgba(248,113,113,.1)!important;color:#f87171!important;
  border:1px solid rgba(248,113,113,.25)!important;}
.p01fb-btn-info{background:rgba(96,165,250,.1)!important;color:#60a5fa!important;
  border:1px solid rgba(96,165,250,.25)!important;}
.p01fb-sep{display:flex;align-items:center;gap:8px;margin:.75rem 0;
  color:var(--dim);font-size:.65rem;}
.p01fb-sep::before,.p01fb-sep::after{content:'';flex:1;height:1px;background:var(--border);}
.p01fb-link{font-size:.7rem;color:var(--muted);cursor:pointer;
  text-align:center;display:block;margin-bottom:.25rem;}
.p01fb-link:hover{color:var(--gold);}
.p01fb-close{float:right;background:none;border:none;color:var(--muted);
  cursor:pointer;font-size:1.1rem;line-height:1;}
.p01fb-close:hover{color:var(--text);}
.p01fb-err{font-size:.7rem;color:#f87171;margin-bottom:.5rem;display:none;}
.p01fb-err.show{display:block;}
.p01fb-ok{font-size:.7rem;color:#4ade80;margin-bottom:.5rem;display:none;}
.p01fb-ok.show{display:block;}
.p01fb-info-box{background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.2);
  border-radius:10px;padding:.65rem .85rem;margin-bottom:.85rem;
  font-size:.72rem;color:rgba(255,255,255,.75);line-height:1.8;}
#p01-sync-bar{display:none;position:fixed;bottom:1rem;right:1rem;
  background:var(--surface,#13132a);border:1px solid rgba(245,200,0,.3);
  border-radius:10px;padding:.45rem .9rem;
  font-family:'Oswald',sans-serif;font-size:.62rem;font-weight:700;
  color:var(--gold);text-transform:uppercase;letter-spacing:.06em;
  z-index:1500;box-shadow:0 8px 24px rgba(0,0,0,.5);}
`;

  function _injectStyle() {
    var s = document.createElement('style');
    s.textContent = _css;
    document.head.appendChild(s);
  }

  function _injectButton() {
    var actions = document.querySelector('.topbar-actions');
    if (!actions || document.getElementById('p01-fb-btn')) return;
    var sep = document.createElement('div');
    sep.className = 'topbar-sep';
    var btn = document.createElement('button');
    btn.id = 'p01-fb-btn';
    btn.title = 'Login / Backup na Nuvem';
    btn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
      '<span id="p01-fb-label">Entrar</span><span id="p01-fb-dot"></span>';
    btn.onclick = _openModal;
    var firstSep = actions.querySelector('.topbar-sep');
    if (firstSep) { actions.insertBefore(btn, firstSep); actions.insertBefore(sep, btn); }
    else { actions.appendChild(sep); actions.appendChild(btn); }
  }

  function _injectModal() {
    if (document.getElementById('p01-fb-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'p01-fb-overlay';
    ov.onclick = function(e) { if (e.target === ov) _closeModal(); };
    ov.innerHTML = '<div id="p01-fb-modal"></div>';
    document.body.appendChild(ov);
    var bar = document.createElement('div');
    bar.id = 'p01-sync-bar';
    document.body.appendChild(bar);
  }

  function _updateBtn(user) {
    var btn   = document.getElementById('p01-fb-btn');
    var label = document.getElementById('p01-fb-label');
    var dot   = document.getElementById('p01-fb-dot');
    if (!btn) return;
    if (user && !user.isAnonymous) {
      var nome = user.displayName || user.email || 'Logado';
      btn.classList.add('logado');
      if (label) label.textContent = nome.split(' ')[0] + ' ☁';
      if (dot)   dot.style.display = 'block';
    } else {
      btn.classList.remove('logado');
      if (label) label.textContent = 'Entrar';
      if (dot)   dot.style.display = 'none';
    }
  }

  function _openModal()  { _renderModal(); document.getElementById('p01-fb-overlay').classList.add('open'); }
  function _closeModal() { var ov = document.getElementById('p01-fb-overlay'); if(ov) ov.classList.remove('open'); }
  window.p01FbFecharModal = _closeModal;

  function _renderModal() {
    var box = document.getElementById('p01-fb-modal');
    if (!box) return;
    if (_authUser && !_authUser.isAnonymous) {
      var lastTs = localStorage.getItem('p01_auth_last_backup');
      var lastStr = lastTs ? new Date(parseInt(lastTs)).toLocaleString('pt-BR') : 'Nunca';
      box.innerHTML =
        '<button class="p01fb-close" onclick="p01FbFecharModal()">✕</button>' +
        '<div class="p01fb-title">☁ Backup na Nuvem</div>' +
        '<div class="p01fb-sub">Logado como <strong style="color:var(--gold)">' + (_authUser.email || _authUser.displayName || '') + '</strong></div>' +
        '<div class="p01fb-info-box">✅ Backup automático: <strong style="color:#4ade80">Ativo</strong><br>🕐 Último backup: <strong style="color:var(--gold)">' + lastStr + '</strong></div>' +
        '<button class="p01fb-btn-primary" onclick="p01FbBackupAgora()">☁ Fazer Backup Agora</button>' +
        '<button class="p01fb-btn-primary p01fb-btn-info" style="margin-bottom:.5rem" onclick="p01FbRestaurar()">⬇ Restaurar da Nuvem</button>' +
        '<div class="p01fb-sep">conta</div>' +
        '<button class="p01fb-btn-primary p01fb-btn-danger" onclick="p01FbSair()">Sair da conta</button>' +
        '<div class="p01fb-err" id="p01fb-err"></div><div class="p01fb-ok" id="p01fb-ok"></div>';
    } else {
      box.innerHTML =
        '<button class="p01fb-close" onclick="p01FbFecharModal()">✕</button>' +
        '<div class="p01fb-title">☁ Login & Backup</div>' +
        '<div class="p01fb-sub">Faça login para salvar seus dados na nuvem e acessá-los em qualquer aparelho. Backup automático a cada 30 minutos.</div>' +
        '<div class="p01fb-err" id="p01fb-err"></div><div class="p01fb-ok" id="p01fb-ok"></div>' +
        '<button class="p01fb-btn-google" onclick="p01FbLoginGoogle()">' +
        '<svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>' +
        'Entrar com Google</button>' +
        '<div class="p01fb-sep">ou use seu e-mail</div>' +
        '<input class="p01fb-input" id="p01fb-email" type="email" placeholder="E-mail" autocomplete="email">' +
        '<input class="p01fb-input" id="p01fb-senha" type="password" placeholder="Senha" autocomplete="current-password" onkeydown="if(event.key===\'Enter\')p01FbLoginEmail()">' +
        '<button class="p01fb-btn-primary" onclick="p01FbLoginEmail()">Entrar com E-mail</button>' +
        '<a class="p01fb-link" onclick="p01FbTelaCadastro()">Criar conta nova</a>' +
        '<a class="p01fb-link" onclick="p01FbEsqueciSenha()">Esqueci minha senha</a>';
    }
  }

  window.p01FbLoginGoogle = function() {
    _err(''); _ok('');
    if (typeof firebase === 'undefined') { _err('Firebase não carregado.'); return; }
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(function(e) { _err(_traduzir(e.code)); });
  };

  window.p01FbLoginEmail = function() {
    _err(''); _ok('');
    var email = (document.getElementById('p01fb-email') || {}).value || '';
    var senha = (document.getElementById('p01fb-senha') || {}).value || '';
    if (!email || !senha) { _err('Preencha e-mail e senha.'); return; }
    if (typeof firebase === 'undefined') { _err('Firebase não carregado.'); return; }
    firebase.auth().signInWithEmailAndPassword(email, senha).catch(function(e) { _err(_traduzir(e.code)); });
  };

  window.p01FbTelaCadastro = function() {
    var box = document.getElementById('p01-fb-modal');
    if (!box) return;
    box.innerHTML =
      '<button class="p01fb-close" onclick="p01FbFecharModal()">✕</button>' +
      '<div class="p01fb-title">Criar Conta</div>' +
      '<div class="p01fb-sub">Conta gratuita para guardar seus dados na nuvem.</div>' +
      '<div class="p01fb-err" id="p01fb-err"></div><div class="p01fb-ok" id="p01fb-ok"></div>' +
      '<input class="p01fb-input" id="p01fb-nome" type="text" placeholder="Seu nome">' +
      '<input class="p01fb-input" id="p01fb-email" type="email" placeholder="E-mail" autocomplete="email">' +
      '<input class="p01fb-input" id="p01fb-senha" type="password" placeholder="Senha (mín. 6 caracteres)" autocomplete="new-password">' +
      '<button class="p01fb-btn-primary" onclick="p01FbCriarConta()">Criar Conta</button>' +
      '<a class="p01fb-link" onclick="_renderModal&&_renderModal()">← Voltar</a>';
  };

  window.p01FbCriarConta = function() {
    _err(''); _ok('');
    var nome  = (document.getElementById('p01fb-nome')  || {}).value || '';
    var email = (document.getElementById('p01fb-email') || {}).value || '';
    var senha = (document.getElementById('p01fb-senha') || {}).value || '';
    if (!email || !senha) { _err('Preencha todos os campos.'); return; }
    if (typeof firebase === 'undefined') { _err('Firebase não carregado.'); return; }
    firebase.auth().createUserWithEmailAndPassword(email, senha).then(function(cred) {
      if (nome) return cred.user.updateProfile({ displayName: nome });
    }).catch(function(e) { _err(_traduzir(e.code)); });
  };

  window.p01FbEsqueciSenha = function() {
    _err(''); _ok('');
    var email = (document.getElementById('p01fb-email') || {}).value || '';
    if (!email) { _err('Digite seu e-mail primeiro.'); return; }
    if (typeof firebase === 'undefined') { _err('Firebase não carregado.'); return; }
    firebase.auth().sendPasswordResetEmail(email)
      .then(function() { _ok('E-mail de recuperação enviado!'); })
      .catch(function(e) { _err(_traduzir(e.code)); });
  };

  window.p01FbSair = function() {
    if (typeof firebase === 'undefined') return;
    firebase.auth().signOut().then(function() { _closeModal(); });
  };

  window.p01FbBackupAgora = function() {
    _ok('Salvando...'); _err('');
    _fbPushToCloud();
    localStorage.setItem('p01_auth_last_backup', String(Date.now()));
    setTimeout(function() { _ok('✅ Backup salvo!'); _renderModal(); }, 2000);
  };

  window.p01FbRestaurar = function() {
    _ok('Sincronizando...'); _err('');
    _fbPullFromCloud();
    setTimeout(function() {
      _doSaveLocal();
      _ok('✅ Dados sincronizados! Recarregando...');
      setTimeout(function() { location.reload(); }, 1500);
    }, 2500);
  };

  /* ── Observa mudanças de autenticação para atualizar UI e _fbUserId ── */
  function _startObserver() {
    if (typeof firebase === 'undefined') return;
    firebase.auth().onAuthStateChanged(function(user) {
      _authUser = user;
      _updateBtn(user);
      if (user && !user.isAnonymous) {
        // Atualiza _fbUserId para o uid real
        _fbUserId = user.uid;
        localStorage.setItem('p01_fb_uid', user.uid);
        // Backup automático a cada 30 min
        if (!window._p01AuthBackupInterval) {
          window._p01AuthBackupInterval = setInterval(function() {
            _fbPushToCloud();
            localStorage.setItem('p01_auth_last_backup', String(Date.now()));
            _showSyncBar('☁ Backup automático salvo');
          }, 30 * 60 * 1000);
        }
        // Push imediato ao logar
        setTimeout(function() {
          _fbPushToCloud();
          localStorage.setItem('p01_auth_last_backup', String(Date.now()));
        }, 2000);
      }
    });
  }

  function _err(msg) { var el = document.getElementById('p01fb-err'); if(!el) return; el.textContent=msg; el.classList.toggle('show',!!msg); }
  function _ok(msg)  { var el = document.getElementById('p01fb-ok');  if(!el) return; el.textContent=msg; el.classList.toggle('show',!!msg); }
  function _showSyncBar(msg) {
    var bar = document.getElementById('p01-sync-bar');
    if (!bar) return;
    bar.textContent = msg; bar.style.display = 'block';
    setTimeout(function() { bar.style.display = 'none'; }, 3500);
  }
  function _traduzir(code) {
    var m = {
      'auth/invalid-email':'E-mail inválido.','auth/user-not-found':'Usuário não encontrado.',
      'auth/wrong-password':'Senha incorreta.','auth/invalid-credential':'E-mail ou senha incorretos.',
      'auth/email-already-in-use':'Este e-mail já está em uso.','auth/weak-password':'Senha muito fraca (mín. 6 caracteres).',
      'auth/popup-closed-by-user':'Login cancelado.','auth/network-request-failed':'Sem conexão.',
      'auth/too-many-requests':'Muitas tentativas. Tente mais tarde.',
      'auth/unauthorized-domain':'Domínio não autorizado no Firebase. Adicione em Authentication → Configurações → Domínios autorizados.',
    };
    return m[code] || 'Erro: ' + code;
  }

  function _init() {
    _injectStyle();
    _injectModal();
    _injectButton();
    // Aguarda Firebase carregar
    var tries = 0;
    var check = setInterval(function() {
      tries++;
      if (typeof firebase !== 'undefined' && firebase.auth) {
        clearInterval(check);
        _startObserver();
      }
      if (tries > 40) clearInterval(check);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();

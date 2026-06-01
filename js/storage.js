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

/* ── Carrega o SDK do Firebase via CDN e inicializa ── */
/* Aguarda o DOM estar pronto para não travar o carregamento da página */
(function _initFirebase() {
  if (window._fbInitDone) return;
  window._fbInitDone = true;

  function _loadScript(src, cb) {
    try {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = cb;
      s.onerror = function() {
        console.warn('[P01-FB] Falha ao carregar SDK:', src);
        // Não trava — sistema continua com localStorage
      };
      (document.head || document.body || document.documentElement).appendChild(s);
    } catch(e) {
      console.warn('[P01-FB] _loadScript error:', e.message);
    }
  }

  function _startFirebase() {
    _loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', function() {
      _loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js', function() {
        _loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js', function() {
          try {
            if (typeof firebase === 'undefined') {
              console.warn('[P01-FB] firebase global não encontrado após carregamento do SDK');
              return;
            }
            if (!firebase.apps.length) {
              firebase.initializeApp(_fbConfig);
            }
            _fbDb = firebase.firestore();

            firebase.auth().signInAnonymously()
              .then(function(cred) {
                _fbUserId = cred.user.uid;
                localStorage.setItem('p01_fb_uid', _fbUserId);
                _fbReady = true;
                console.log('[P01-FB] ✓ Firebase pronto. UID:', _fbUserId);
                _fbPullFromCloud();
              })
              .catch(function(e) {
                console.warn('[P01-FB] Auth anônimo falhou:', e.message);
                // Sistema continua funcionando só com localStorage
              });
          } catch(e) {
            console.warn('[P01-FB] Erro ao inicializar Firebase:', e.message);
          }
        });
      });
    });
  }

  // Aguarda o DOM estar totalmente pronto antes de injetar scripts externos
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(_startFirebase, 500); // 500ms de folga após o DOM
    });
  } else {
    // DOM já está pronto (script carregou depois do DOMContentLoaded)
    setTimeout(_startFirebase, 500);
  }
})();

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

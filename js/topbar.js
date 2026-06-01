/* ════════════════════════════════════════════════════════════════════
 * topbar.js — PROTOCOLO 01 · Fase 2.5
 * ────────────────────────────────────────────────────────────────────
 * Atualiza breadcrumbs, avatar e ícone de tema dinamicamente.
 * Faz hook em goTab() sem quebrar funcionalidade existente.
 * ════════════════════════════════════════════════════════════════════ */

const TOPBAR_NAMES = {
  cronograma:       'Cronograma',
  edital:           'Edital',
  leitura:          'Leitura',
  banco:            'Questões',
  flashcards:       'Flash Cards',
  'analytics-next': 'Dashboard',
  'eq-v2':          'Desempenho Externo',
  'simulados-v2':   'Simulados',
  perfil:           'Perfil & Preferências',
  backup:           'Dados & Backup',
};

// Sub-tab breadcrumb labels (tab → subtab_id → label)
const TOPBAR_SUBTAB_NAMES = {
  'simulados-v2': {
    overview:    'Visão Geral',
    historico:   'Histórico',
    disciplinas: 'Disciplinas',
    analise:     'Análise',
  },
  'analytics-next': {
    overview:  'Visão Geral',
    edital:    'Edital',
    questoes:  'Questões',
    leitura:   'Leitura',
  },
  'eq-v2': {
    tracker: 'Tracker',
    ranking: 'Ranking',
  },
  perfil: {
    identidade:  'Perfil',
    aparencia:   'Aparência',
    experiencia: 'Experiência',
    dados:       'Dados & Backup',
    integracoes: 'Integrações',
    avancado:    'Avançado',
  },
  cronograma: {
    lista:       'Lista',
    configurar:  'Configurar',
    config:      'Configurar',
  },
  edital: {
    edital:      'Edital',
    configurar:  'Configurar',
  },
  leitura: {
    leitura:     'Leitura',
    configurar:  'Configurar',
  },
  banco: {
    banco:      'Praticar',
    resolver:   'Caderno de Erros',
    stats:      'Estatísticas',
    adicionar:  'Adicionar',
    gerenciar:  'Gerenciar',
  },
  flashcards: {
    cards:   'Meus Flash Cards',
    revisao: 'Revisão Espaçada',
    stats:   'Estatísticas',
    incluir: 'Incluir Flash Card',
    estudar: 'Estudando',
  },
};

// Track current sub-tab per tab
const TOPBAR_SUBTAB_CURRENT = {};

function topbarUpdate(tabId, subTabId) {
  // ── Breadcrumbs ──────────────────────────────────────────────────
  const crumbs = document.getElementById('topbar-breadcrumbs');
  if (crumbs) {
    const tabName = TOPBAR_NAMES[tabId] || tabId;
    const subName = subTabId && TOPBAR_SUBTAB_NAMES[tabId]?.[subTabId];

    let html = `<span class="topbar-crumb" onclick="goTab('analytics-next')">Protocolo 01</span>`;
    html += `<svg class="topbar-crumb-sep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

    if (subName) {
      html += `<span class="topbar-crumb" onclick="goTab('${tabId}')">${tabName}</span>`;
      html += `<svg class="topbar-crumb-sep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
      html += `<span class="topbar-crumb current">${subName}</span>`;
    } else {
      html += `<span class="topbar-crumb current">${tabName}</span>`;
    }

    crumbs.innerHTML = html;
  }

  // ── User card (name + email + initials) ──────────────────────────
  const name  = (typeof ST !== 'undefined' && ST?.userProfile?.displayName) || 'Estudante';
  const email = (typeof ST !== 'undefined' && ST?.userProfile?.email)       || 'usuario@email.com';
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0,2) || 'ES';

  const av = document.getElementById('topbar-avatar');
  if (av) av.textContent = initials;

  const nameEl  = document.getElementById('topbar-user-name');
  const emailEl = document.getElementById('topbar-user-email');
  if (nameEl)  nameEl.textContent  = name;
  if (emailEl) emailEl.textContent = email;

  // Also keep sidebar user IDs in sync (kept in DOM for compat)
  const sbName  = document.getElementById('sb-user-name');
  const sbEmail = document.getElementById('sb-user-email');
  const sbAv    = document.getElementById('sb-user-avatar');
  if (sbName)  sbName.textContent  = name;
  if (sbEmail) sbEmail.textContent = email;
  if (sbAv)    sbAv.textContent    = initials;

  topbarSyncTheme();
}

/* Call this from ppSwitchTab or any sub-tab switch to update breadcrumb */
function topbarSubTabUpdate(tabId, subTabId) {
  TOPBAR_SUBTAB_CURRENT[tabId] = subTabId;
  topbarUpdate(tabId, subTabId);
}

function topbarSyncTheme() {
  // Theme pill state is handled entirely via CSS (body.light class).
  // No JS needed — slider position and icon colors update automatically.
}

/* Hook em goTab — aguarda DOMContentLoaded para garantir que goTab existe */
document.addEventListener('DOMContentLoaded', function () {
  const _orig = window.goTab;
  if (typeof _orig === 'function') {
    window.goTab = function (id) {
      _orig(id);
      try { topbarUpdate(id); } catch(e) { console.warn('[topbar] goTab error:', e); }
      try {
        // Restore sub-tab breadcrumb when returning to a tab with sub-views
        if (id === 'simulados-v2') {
          const cur = TOPBAR_SUBTAB_CURRENT['simulados-v2'];
          if (cur) topbarSubTabUpdate('simulados-v2', cur);
        }
        if (id === 'eq-v2') {
          const cur = TOPBAR_SUBTAB_CURRENT['eq-v2'];
          if (cur) topbarSubTabUpdate('eq-v2', cur);
        }
        if (id === 'analytics-next') {
          const cur = TOPBAR_SUBTAB_CURRENT['analytics-next'];
          if (cur) topbarSubTabUpdate('analytics-next', cur);
        }
        if (id === 'banco') {
          const cur = TOPBAR_SUBTAB_CURRENT['banco'] || 'banco';
          topbarSubTabUpdate('banco', cur);
        }
        if (id === 'flashcards') {
          const cur = TOPBAR_SUBTAB_CURRENT['flashcards'];
          if (cur) topbarSubTabUpdate('flashcards', cur);
        }
        if (id === 'cronograma') {
          const cur = TOPBAR_SUBTAB_CURRENT['cronograma'];
          if (cur) topbarSubTabUpdate('cronograma', cur);
        }
      } catch(e) { console.warn('[topbar] subtab restore error:', e); }
      try {
        if (typeof P01Bus !== 'undefined') P01Bus.emit('tab:changed', { id: id });
      } catch(e) {}
    };
  }

  // Init imediato
  topbarSyncTheme();
  const av = document.getElementById('topbar-avatar');
  if (av) {
    const name = (typeof ST !== 'undefined' && ST?.userProfile?.displayName) || 'Estudante';
    const initials = name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0,2) || 'ES';
    av.textContent = initials;
  }

  // Detecta aba inicial
  const activeSection = document.querySelector('.section.active');
  if (activeSection) {
    const id = activeSection.id.replace('tab-', '');
    topbarUpdate(id);
  }

  // Patch ppSwitchTab to update breadcrumbs with sub-tab info
  const _origPpSwitch = window.ppSwitchTab;
  if (typeof _origPpSwitch === 'function') {
    window.ppSwitchTab = function(id) {
      _origPpSwitch(id);
      topbarSubTabUpdate('perfil', id);
    };
  }

  // Patch s2SetView (simulados-v2) to update breadcrumbs with sub-view
  const _origS2SetView = window.s2SetView;
  if (typeof _origS2SetView === 'function') {
    window.s2SetView = function(v) {
      _origS2SetView(v);
      try { topbarSubTabUpdate('simulados-v2', v); } catch(e) {}
    };
  }

  // Patch eq2SetView (eq-v2) to update breadcrumbs with sub-view
  const _origEq2SetView = window.eq2SetView;
  if (typeof _origEq2SetView === 'function') {
    window.eq2SetView = function(v) {
      _origEq2SetView(v);
      try { topbarSubTabUpdate('eq-v2', v); } catch(e) {}
    };
  }

});

/* ════════════════════════════════════════════════════════════════════
 * TOPBAR INLINE SEARCH
 * Expande dentro da topbar. Sem modal. Resultados em dropdown.
 * ════════════════════════════════════════════════════════════════════ */

const TBS = {
  open:    false,
  timer:   null,
};

function topbarSearchOpen() {
  const wrap = document.getElementById('topbar-search');
  const input = document.getElementById('topbar-search-input');
  if (!wrap || !input) return;
  wrap.classList.add('open');
  TBS.open = true;
  input.focus();
  input.select();
}

function topbarSearchClose() {
  const wrap = document.getElementById('topbar-search');
  const input = document.getElementById('topbar-search-input');
  const drop  = document.getElementById('topbar-search-dropdown');
  if (!wrap) return;
  wrap.classList.remove('open');
  TBS.open = false;
  if (input) { input.value = ''; }
  if (drop)  { drop.innerHTML = ''; drop.classList.remove('has-results'); }
}

function topbarSearchKey(e) {
  if (e.key === 'Escape') topbarSearchClose();
}

// Close on click outside
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('topbar-search');
  if (TBS.open && wrap && !wrap.contains(e.target)) {
    topbarSearchClose();
  }
});

// Ctrl+K opens
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    if (TBS.open) topbarSearchClose();
    else topbarSearchOpen();
  }
});

/* Tab icons for search results */
const TBS_TAB_ICONS = {
  progresso:       '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
  cronograma:      '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  leitura:         '<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  'simulados-v2':  '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="9" r="1.5"/><circle cx="8" cy="15" r="1.5"/><line x1="12" y1="9" x2="18" y2="9" stroke-linecap="round"/><line x1="12" y1="15" x2="18" y2="15" stroke-linecap="round"/></svg>',
  banco:           '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  flashcards:      '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  'analytics-next':'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  'eq-v2':         '<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
};

function topbarDoSearch(query) {
  const drop = document.getElementById('topbar-search-dropdown');
  if (!drop) return;

  query = (query || '').trim();

  if (query.length < 1) {
    drop.innerHTML = '';
    drop.classList.remove('has-results');
    return;
  }

  const q = query.toLowerCase();
  const results = [];

  // Search edital
  if (typeof getEditalAtivo === 'function') {
    getEditalAtivo().forEach(disc => {
      const topicField = t => t.text || t.name || '';
      disc.topics.forEach(t => {
        if (topicField(t).toLowerCase().includes(q)) {
          results.push({ origin: disc.name, text: topicField(t), tab: 'progresso' });
        }
        (t.subs || []).forEach(s => {
          const sf = s.text || s.name || '';
          if (sf.toLowerCase().includes(q)) {
            results.push({ origin: disc.name + ' › subtópico', text: sf, tab: 'progresso' });
          }
        });
      });
    });
  }

  // Search cronograma tasks
  if (typeof _getCiclo === 'function') {
    try {
      _getCiclo().forEach(dia => {
        (dia.tasks || []).forEach(t => {
          const hay = ((t.cat || '') + ' ' + (t.desc || '')).toLowerCase();
          if (hay.includes(q)) {
            results.push({ origin: 'Cronograma — ' + (dia.label || 'Dia ' + dia.dia), text: '[' + (t.cat || '') + '] ' + (t.desc || ''), tab: 'cronograma' });
          }
        });
      });
    } catch(e) {}
  }

  // Search leis
  if (typeof LEIS_LEITURA !== 'undefined') {
    LEIS_LEITURA.forEach(lei => {
      if ((lei.name || '').toLowerCase().includes(q)) {
        results.push({ origin: 'Leitura de Leis', text: lei.name, tab: 'leitura' });
      }
    });
  }

  // Search banco de questões
  if (typeof ST !== 'undefined' && ST.banco) {
    ST.banco.forEach(q_ => {
      const hay = ((q_.cod || '') + ' ' + (q_.enunciado || '') + ' ' + (q_.materia || '')).toLowerCase();
      if (hay.includes(q)) {
        const preview = (q_.enunciado || '').substring(0, 80) + (q_.enunciado && q_.enunciado.length > 80 ? '…' : '');
        results.push({ origin: 'Banco — ' + (q_.materia || 'Questão'), text: preview || q_.cod, tab: 'banco' });
      }
    });
  }

  if (!results.length) {
    drop.innerHTML = '<div class="tbs-empty">Nenhum resultado para "' + escHtml(query) + '"</div>';
    drop.classList.add('has-results');
    return;
  }

  const shown = results.slice(0, 8);
  const re = new RegExp('(' + escHtmlRe(query) + ')', 'gi');

  drop.innerHTML = shown.map(r => {
    const icon = TBS_TAB_ICONS[r.tab] || TBS_TAB_ICONS['dashboard'];
    const hl = escHtml(r.text).replace(re, '<span class="tbs-highlight">$1</span>');
    return `<div class="tbs-result" onclick="topbarGoResult('${r.tab}')">
      <div class="tbs-result-icon">${icon}</div>
      <div class="tbs-result-body">
        <div class="tbs-result-origin">${escHtml(r.origin)}</div>
        <div class="tbs-result-text">${hl}</div>
      </div>
    </div>`;
  }).join('');

  if (results.length > 8) {
    drop.innerHTML += `<div class="tbs-count">+${results.length - 8} resultados adicionais</div>`;
  }

  drop.classList.add('has-results');
}

function topbarGoResult(tab) {
  if (typeof goTab === 'function') goTab(tab);
  topbarSearchClose();
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escHtmlRe(s) {
  return (s || '').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

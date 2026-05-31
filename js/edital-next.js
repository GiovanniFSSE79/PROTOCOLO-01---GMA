/* ════════════════════════════════════════════════════════════════════
 * edital-next.js — PROTOCOLO 01 · LAB · Edital Verticalizado V2
 * ────────────────────────────────────────────────────────────────────
 * Sandbox experimental. Não interfere com a aba original.
 * Usa getEditalAtivo() e ST.progresso existentes — sem duplicar dados.
 * ════════════════════════════════════════════════════════════════════ */

/* ── Estado local ───────────────────────────────────────────────── */
const EN = {
  activeDiscId: null,   // disciplina selecionada no navigator
  view: 'overview',     // 'overview' | 'list' | 'roadmap' | 'overview'
  expandedTopics: new Set(),
};

/* ── Drag state for edit panel reordering ───────────────────────── */
const EN_DRAG = {
  srcIndex:   null,   // index being dragged
  overIndex:  null,   // index currently hovered
};

/* ── Bloco helpers ──────────────────────────────────────────────── */
function enGetBlocos() {
  if (typeof _editalCfgLoad === 'function') {
    const cfg = _editalCfgLoad();
    if (cfg && cfg.blocos) return cfg.blocos;
  }
  return [];
}

function enSaveWithBlocos(edital, blocos) {
  if (typeof _editalCfgSave === 'function') _editalCfgSave({ edital, blocos });
}

function enBuildGroups(edital, blocos) {
  // Returns [{id,name,discs:[]}] grouped by blocos
  const discById = {};
  edital.forEach(d => discById[d.id] = d);
  const groups = [], assigned = new Set();
  (blocos || []).forEach(b => {
    const bDiscs = (b.discIds || []).map(id => discById[id]).filter(Boolean);
    bDiscs.forEach(d => assigned.add(d.id));
    groups.push({ id: b.id, name: b.name, discs: bDiscs });
  });
  const unassigned = edital.filter(d => !assigned.has(d.id));
  if (unassigned.length) groups.push({ id: '__unassigned__', name: 'Geral', discs: unassigned });
  return groups;
}

/* ── Cor progressiva do ring: 0%→vermelho, 50%→amarelo, 100%→verde ─ */
function enRingColor(pct) {
  if (pct === 0) return '#6b7280'; // cinza — zero progresso
  if (pct <= 25) {
    // vermelho → laranja
    const t = pct / 25;
    return enLerp('#dc2626', '#f97316', t);
  } else if (pct <= 60) {
    // laranja → amarelo
    const t = (pct - 25) / 35;
    return enLerp('#f97316', '#eab308', t);
  } else if (pct < 100) {
    // amarelo → verde
    const t = (pct - 60) / 40;
    return enLerp('#eab308', '#22c55e', t);
  }
  return '#22c55e'; // verde pleno — 100%
}

function enLerp(colorA, colorB, t) {
  const a = enHex(colorA), b = enHex(colorB);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function enHex(hex) {
  const h = hex.replace('#','');
  return [
    parseInt(h.slice(0,2),16),
    parseInt(h.slice(2,4),16),
    parseInt(h.slice(4,6),16)
  ];
}

/* ── Utilidades ─────────────────────────────────────────────────── */
function enGetDiscStats(disc) {
  const allIds = [];
  disc.topics.forEach(t => {
    allIds.push(t.id);
    (t.subs||[]).forEach(s => allIds.push(s.id));
  });
  const total    = allIds.length;
  const done     = allIds.filter(id => ST.progresso[id+'_e']).length;
  const pct      = total > 0 ? Math.round(done / total * 100) : 0;
  return { total, done, pending: total - done, pct };
}

function enGetTopicStats(topic) {
  const subs = topic.subs || [];
  const topicDone = !!ST.progresso[topic.id+'_e'];
  if (subs.length === 0) return { total: 1, done: topicDone ? 1 : 0, pct: topicDone ? 100 : 0 };
  const total = subs.length;
  const done  = subs.filter(s => ST.progresso[s.id+'_e']).length;
  const pct   = total > 0 ? Math.round(done/total*100) : (topicDone ? 100 : 0);
  return { total, done, pct };
}

/* ── Render: Navigator (painel esquerdo) ────────────────────────── */
function enRenderNavigator() {
  const edital = getEditalAtivo();
  const nav    = document.getElementById('en-navigator');
  if (!nav) return;

  // Compute global stats
  let gTotal = 0, gDone = 0;
  edital.forEach(d => {
    const s = enGetDiscStats(d);
    gTotal += s.total; gDone += s.done;
  });
  const gPct = gTotal > 0 ? Math.round(gDone/gTotal*100) : 0;

  // Global progress strip (in command strip)
  const fill = document.getElementById('en-gp-fill');
  const lbl  = document.getElementById('en-gp-label');
  const sub  = document.getElementById('en-gp-sub');
  if (fill) fill.style.width = gPct + '%';
  if (lbl)  lbl.textContent  = gPct + '%';
  if (sub)  sub.textContent  = gDone + '/' + gTotal + ' tópicos';

  nav.innerHTML = '';

  // Build groups by blocs for navigator
  const blocos = enGetBlocos();
  const navGroups = enBuildEditalGroups(edital, blocos);

  navGroups.forEach(g => {
    if (!g.discs.length) return;
    // Group label
    const secLabel = document.createElement('div');
    secLabel.className = 'en-nav-section-label';
    secLabel.textContent = g.name;
    nav.appendChild(secLabel);

    g.discs.forEach(disc => {
    const stats = enGetDiscStats(disc);
    const isActive = disc.id === EN.activeDiscId;

    const btn = document.createElement('button');
    btn.className = 'en-nav-disc' + (isActive ? ' active' : '');
    btn.setAttribute('data-disc-id', disc.id);

    // Status classification
    const statusClass = stats.pct === 100 ? 'done' : stats.done > 0 ? 'inprog' : '';
    const ringClass   = stats.pct === 100 ? 'en-nav-ring-done' : '';

    // Ring circumference: 2π × 10 = 62.83
    const offset = 62.83 * (1 - stats.pct/100);

    btn.innerHTML = `
      <div class="en-nav-ring">
        <svg viewBox="0 0 36 36">
          <circle class="en-nav-ring-track" cx="18" cy="18" r="15"/>
          <circle class="en-nav-ring-fill" cx="18" cy="18" r="15"
            style="stroke-dasharray:94.25;stroke-dashoffset:${94.25*(1-stats.pct/100)};stroke:${enRingColor(stats.pct)}"/>
        </svg>
        <div class="en-nav-ring-pct" style="color:${enRingColor(stats.pct)}">${stats.pct > 0 ? stats.pct+'%' : ''}</div>
      </div>
      <div class="en-nav-disc-info">
        <div class="en-nav-disc-name">${disc.name}</div>
        <div class="en-nav-disc-sub">${stats.done}/${stats.total} tópicos</div>
      </div>
      <div class="en-nav-status ${statusClass}"></div>
    `;

    btn.addEventListener('click', () => {
      EN.activeDiscId = disc.id;
      EN.view = EN.view === 'overview' ? 'list' : EN.view;
      enRenderAll();
    });

    nav.appendChild(btn);
    }); // end g.discs.forEach
  }); // end navGroups.forEach
}

/* ── Render: Detail Header ──────────────────────────────────────── */
function enRenderDetailHeader(disc) {
  const stats = enGetDiscStats(disc);
  const ringColor = enRingColor(stats.pct);
  const circ = 150.80; // 2π × 24
  const offset = circ * (1 - stats.pct/100);

  return `
    <div class="en-detail-header">
      <div class="en-detail-ring">
        <svg viewBox="0 0 56 56">
          <circle class="en-detail-ring-track" cx="28" cy="28" r="24"/>
          <circle class="en-detail-ring-fill" cx="28" cy="28" r="24"
            style="stroke-dasharray:${circ};stroke-dashoffset:${offset};stroke:${ringColor}"/>
        </svg>
        <div class="en-detail-ring-pct" style="--en-ring-color:${ringColor};color:${ringColor}">${stats.pct}%</div>
      </div>
      <div class="en-detail-meta">
        <div class="en-detail-disc-name">${disc.name}</div>
        <div class="en-detail-stats-row">
          <div class="en-detail-stat">
            <div class="en-stat-dot green"></div>
            <span class="en-detail-stat-v">${stats.done}</span>
            <span class="en-detail-stat-l">Estudados</span>
          </div>
          <div class="en-detail-stat">
            <div class="en-stat-dot muted"></div>
            <span class="en-detail-stat-v">${stats.pending}</span>
            <span class="en-detail-stat-l">Pendentes</span>
          </div>
          <div class="en-detail-stat">
            <div class="en-stat-dot gold"></div>
            <span class="en-detail-stat-v">${stats.total}</span>
            <span class="en-detail-stat-l">Total</span>
          </div>
        </div>
      </div>
      <div class="en-detail-actions">
        <button class="en-action-btn primary" onclick="enMarkAllDisc('${disc.id}')">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          Concluir todos
        </button>
      </div>
    </div>
  `;
}

/* ── Render: List View ──────────────────────────────────────────── */
function enRenderListView(disc) {
  const topics = disc.topics || [];
  if (topics.length === 0) return '<div class="en-empty"><div class="en-empty-title">Nenhum tópico cadastrado</div></div>';

  // Group: pending first, then done
  const pending = topics.filter(t => !enIsTopicDone(t));
  const done    = topics.filter(t =>  enIsTopicDone(t));

  let html = '<div class="en-topics-list">';

  if (pending.length > 0) {
    html += pending.map(t => enRenderTopicRow(t, disc.id)).join('');
  }

  if (done.length > 0) {
    html += `
      <div class="en-section-divider">
        <div class="en-section-divider-line"></div>
        <div class="en-section-divider-label">${done.length} Concluídos</div>
        <div class="en-section-divider-line"></div>
      </div>
    `;
    html += done.map(t => enRenderTopicRow(t, disc.id)).join('');
  }

  html += '</div>';
  return html;
}

function enIsTopicDone(topic) {
  const subs = topic.subs || [];
  if (subs.length === 0) return !!ST.progresso[topic.id+'_e'];
  // Topic is "done" only when ALL subs are checked
  return subs.every(s => !!ST.progresso[s.id+'_e']);
}

function enRenderTopicRow(topic, discId) {
  const subs       = topic.subs || [];
  const topicDone  = !!ST.progresso[topic.id+'_e'];
  const ts         = enGetTopicStats(topic);
  // Default: topics with subs are ALWAYS expanded unless user explicitly collapsed
  // Completing a topic does NOT auto-collapse it — user decides.
  const userCollapsed = EN.expandedTopics.has('collapsed-' + topic.id);
  const hasSubs       = subs.length > 0;
  const isExpanded    = hasSubs
    ? !userCollapsed   // open by default, close only if user clicked collapse
    : false;           // no subs → expand button irrelevant

  // State classes
  let rowClass = 'en-topic-row';
  let barClass = '';
  if (topicDone && (subs.length === 0 || ts.done === ts.total)) {
    rowClass += ' done'; barClass = 'done';
  } else if (ts.done > 0) {
    rowClass += ' inprog'; barClass = 'inprog';
  }

  const checkClass   = topicDone ? 'done' : '';
  const pctColor     = ts.pct === 100 ? 'green' : ts.pct > 0 ? 'gold' : '';
  const expandClass  = isExpanded ? 'open' : '';
  const noSubsClass  = hasSubs ? '' : 'no-subs';

  const subsHtml = hasSubs ? subs.map(sub => {
    const subDone = !!ST.progresso[sub.id+'_e'];
    return `
      <span class="en-sub-chip ${subDone ? 'done' : ''}"
            onclick="enToggleSub(event,'${sub.id}','${topic.id}','${discId}')">
        ${subDone ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        ${sub.text || sub.name || ""}
      </span>`;
  }).join('') : '';

  return `
    <div class="${rowClass}" id="en-topic-${topic.id}">
      <div class="en-topic-progress-bar ${barClass}"></div>
      <div class="en-topic-inner">
        <div class="en-check ${checkClass}"
             onclick="enToggleTopic(event,'${topic.id}','${discId}')">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="en-topic-body">
          <div class="en-topic-name">${topic.text || topic.name || ""}</div>
          ${hasSubs ? `<div class="en-subs-list${isExpanded ? '' : ' en-subs-hidden'}">${subsHtml}</div>` : ''}
        </div>
      </div>
      <div class="en-topic-meta">
        ${ts.pct > 0 ? `<div class="en-topic-pct ${pctColor}">${ts.pct}%</div>` : ''}
        <button class="en-topic-expand ${expandClass} ${noSubsClass}"
                onclick="enToggleExpand(event,'${topic.id}','${discId}')"
                title="${isExpanded ? 'Recolher' : 'Expandir subtópicos'}">
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  `;
}

/* ── Render: Roadmap View ───────────────────────────────────────── */
function enRenderRoadmapView(disc) {
  const topics = disc.topics || [];
  if (topics.length === 0) return '';

  let html = '<div class="en-roadmap active">';
  topics.forEach(topic => {
    const subs      = topic.subs || [];
    const topicDone = !!ST.progresso[topic.id+'_e'];
    const ts        = enGetTopicStats(topic);
    const cls       = topicDone ? 'done' : ts.done > 0 ? 'inprog' : '';

    const subsHtml = subs.map(sub => {
      const sd = !!ST.progresso[sub.id+'_e'];
      return `<span class="en-rm-check ${sd ? 'done' : ''}"
                    onclick="enToggleSub(event,'${sub.id}','${topic.id}','${disc.id}')">
        ${sd ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        ${sub.text || sub.name || ""}
      </span>`;
    }).join('');

    html += `
      <div class="en-rm-item ${cls}" id="en-rm-${topic.id}">
        <div class="en-rm-track">
          <div class="en-rm-dot" onclick="enToggleTopic(event,'${topic.id}','${disc.id}')" title="Marcar como estudado" style="cursor:pointer"></div>
          <div class="en-rm-line"></div>
        </div>
        <div class="en-rm-content">
          <div class="en-rm-name">${topic.text || topic.name || ""}</div>
          ${subs.length > 0 ? `<div class="en-rm-subs">${subsHtml}</div>` : ''}
        </div>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

/* ── Render: Overview Grid ──────────────────────────────────────── */
function enRenderOverview() {
  const edital = getEditalAtivo();
  const blocos = enGetBlocos();
  const groups = enBuildEditalGroups(edital, blocos);

  let html = '';
  groups.forEach(g => {
    if (!g.discs.length) return;
    html += `<div class="en-ov-group-label">${g.name}</div>`;
    html += '<div class="en-overview active">';
    g.discs.forEach(disc => {
      const stats    = enGetDiscStats(disc);
      const isActive = disc.id === EN.activeDiscId;
      const ovColor  = enRingColor(stats.pct);
      html += `
        <div class="en-ov-card ${isActive ? 'active-disc' : ''}"
             onclick="enSelectDisc('${disc.id}')">
          <div class="en-ov-top-bar" style="background:linear-gradient(90deg,${ovColor},transparent)"></div>
          <div class="en-ov-name">${disc.name}</div>
          <div class="en-ov-track">
            <div class="en-ov-fill" style="width:${stats.pct}%;background:${ovColor}"></div>
          </div>
          <div class="en-ov-meta">
            <div class="en-ov-pct" style="color:${ovColor}">${stats.pct}%</div>
            <div class="en-ov-frac">${stats.done}/${stats.total}</div>
          </div>
        </div>`;
    });
    html += '</div>';
  });

  return html;
}

function enRenderDetail() {
  const detail = document.getElementById('en-detail');
  if (!detail) return;

  const edital = getEditalAtivo();
  const disc   = edital.find(d => d.id === EN.activeDiscId);

  if (EN.view === 'overview') {
    detail.innerHTML = `<div class="en-overview-wrap" style="animation:en-fadein .2s ease both">${enRenderOverview()}</div>`;
    // Full width overview — use CSS class
    const root = document.getElementById('edital-next-root');
    if (root) root.classList.add('en-overview-full');
    return;
  }

  if (EN.view === 'edit') {
    const rootE = document.getElementById('edital-next-root');
    if (rootE) rootE.classList.remove('en-overview-full');
    enRenderEditPanel();
    return;
  }

  // Restore navigator
  const rootR = document.getElementById('edital-next-root');
  if (rootR) rootR.classList.remove('en-overview-full');

  if (!disc) {
    detail.innerHTML = `
      <div class="en-empty">
        <svg class="en-empty-icon" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <div class="en-empty-title">Selecione uma disciplina</div>
        <div class="en-empty-sub">Escolha uma disciplina no painel esquerdo para ver seus tópicos e subtópicos.</div>
      </div>`;
    return;
  }

  // Restore navigator
  const root2 = document.getElementById('edital-next-root');
  if (root2) root2.classList.remove('en-overview-full');

  const viewContent = EN.view === 'roadmap'
    ? enRenderRoadmapView(disc)
    : enRenderListView(disc);

  detail.innerHTML = enRenderDetailHeader(disc) + `
    <div style="animation:en-fadein .18s ease both">
      ${viewContent}
    </div>
  `;
}

/* ── Render: All ────────────────────────────────────────────────── */
function enRenderAll() {
  enRenderNavigator();
  enRenderDetail();
  enUpdateViewBtns();
}

function enUpdateViewBtns() {
  document.querySelectorAll('#en-view-switcher .en-view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === EN.view);
  });
}

/* ── Actions ────────────────────────────────────────────────────── */
function enSelectDisc(discId) {
  EN.activeDiscId = discId;
  EN.view = 'list';
  enRenderAll();
}

function enToggleTopic(e, topicId, discId) {
  e.stopPropagation();
  const key     = topicId + '_e';
  const newVal  = !ST.progresso[key];
  ST.progresso[key] = newVal;

  // Cascade to subs
  const edital = getEditalAtivo();
  const disc   = edital.find(d => d.id === discId);
  if (disc) {
    const topic = disc.topics.find(t => t.id === topicId);
    if (topic && topic.subs) {
      topic.subs.forEach(s => { ST.progresso[s.id+'_e'] = newVal; });
    }
  }

  saveState();
  if (typeof renderProgessoStats === 'function') renderProgessoStats();
  if (typeof renderDashboard === 'function') renderDashboard();
  enRenderAll();
}

function enToggleSub(e, subId, topicId, discId) {
  e.stopPropagation();
  ST.progresso[subId+'_e'] = !ST.progresso[subId+'_e'];

  // Smart parent update
  const edital = getEditalAtivo();
  const disc   = edital.find(d => d.id === discId);
  if (disc) {
    const topic = disc.topics.find(t => t.id === topicId);
    if (topic && topic.subs) {
      const allDone = topic.subs.every(s => ST.progresso[s.id+'_e']);
      const anyDone = topic.subs.some(s  => ST.progresso[s.id+'_e']);
      if (allDone) ST.progresso[topicId+'_e'] = true;
      else if (!anyDone) ST.progresso[topicId+'_e'] = false;
    }
  }

  // Sync parent topic _e flag to match visual state
  if (disc) {
    const topic2 = disc.topics.find(t => t.id === topicId);
    if (topic2 && topic2.subs && topic2.subs.length > 0) {
      const allDone2 = topic2.subs.every(s => !!ST.progresso[s.id+'_e']);
      ST.progresso[topicId+'_e'] = allDone2;
    }
  }

  saveState();
  if (typeof renderProgessoStats === 'function') renderProgessoStats();
  if (typeof renderDashboard === 'function') renderDashboard();
  enRenderAll();
}

function enToggleExpand(e, topicId, discId) {
  e.stopPropagation();
  const collapseKey = 'collapsed-' + topicId;
  // Simple toggle: if user collapsed → un-collapse; if open → collapse
  if (EN.expandedTopics.has(collapseKey)) {
    EN.expandedTopics.delete(collapseKey); // re-open
  } else {
    EN.expandedTopics.add(collapseKey);    // collapse
  }
  enRenderDetail();
}

function enMarkAllDisc(discId) {
  const edital = getEditalAtivo();
  const disc   = edital.find(d => d.id === discId);
  if (!disc) return;
  const stats  = enGetDiscStats(disc);
  const allDone = stats.pct === 100;

  disc.topics.forEach(t => {
    ST.progresso[t.id+'_e'] = !allDone;
    (t.subs||[]).forEach(s => { ST.progresso[s.id+'_e'] = !allDone; });
  });

  saveState();
  if (typeof renderProgessoStats === 'function') renderProgessoStats();
  if (typeof renderDashboard === 'function') renderDashboard();
  enRenderAll();
}

function enSetView(view) {
  EN.view = view;
  if (view === 'overview') EN.activeDiscId = null;
  enRenderAll();
  // Edit view handles detail panel itself
  if (view === 'edit') enRenderEditPanel();
}


/* ── EDIT PANEL — gerenciamento inline de disciplinas/tópicos ─── */

function enRenderEditPanel() {
  const detail = document.getElementById('en-detail');
  if (!detail) return;
  const edital = getEditalAtivo();

  detail.innerHTML = `
    <div class="en-edit-root" style="animation:en-fadein .18s ease both">
      <div class="en-edit-header">
        <div class="en-edit-header-left">
          <div class="en-edit-title">Gerenciar Edital</div>
          <div class="en-edit-subtitle">Adicione, edite e reorganize disciplinas e tópicos</div>
        </div>
        <button class="en-action-btn" onclick="enOpenBlocosPanel()" style="margin-right:.4rem">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Blocos
        </button>
        <button class="en-action-btn primary" onclick="enEditAddDisc()">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova disciplina
        </button>
      </div>

      <div class="en-edit-list" id="en-edit-list">
        ${edital.map((disc, di) => enRenderEditDisc(disc, di, edital.length)).join('')}
      </div>

      <div class="en-edit-footer">
        <button class="en-edit-save-btn" onclick="enEditSave()">
          <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Salvar alterações
        </button>
        <div class="en-edit-save-hint">As mudanças são aplicadas ao concurso ativo</div>
      </div>
    </div>
  `;
}

function enRenderEditDisc(disc, di, total) {
  const isFirst = di === 0, isLast = di === total - 1;
  const topics = disc.topics || [];
  const isExp = EN.expandedTopics.has('edit-disc-' + disc.id);

  return `
    <div class="en-edit-disc" id="en-edit-disc-${disc.id}" data-di="${di}"
         draggable="true"
         ondragstart="enDragStart(event,${di})"
         ondragover="enDragOver(event,${di})"
         ondragend="enDragEnd(event)"
         ondrop="enDrop(event,${di})">
      <div class="en-edit-disc-header">
        <div class="en-edit-disc-drag" title="Arraste para reordenar" style="cursor:grab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/></svg>
        </div>
        <button class="en-edit-disc-expand" onclick="enEditToggleDisc('${disc.id}')">
          <svg viewBox="0 0 24 24" style="transform:rotate(${isExp ? 90 : 0}deg);transition:transform .2s" id="en-edit-chev-${disc.id}"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <input class="en-edit-disc-name" id="en-edit-dname-${disc.id}"
               value="${escHtmlAttr(disc.name)}" placeholder="Nome da disciplina"
               oninput="enEditUpdateDiscName('${disc.id}', this.value)">
        
        <div class="en-edit-disc-count">${topics.length} tópico${topics.length !== 1 ? 's' : ''}</div>
        <div class="en-edit-disc-actions">
          <button class="en-edit-icon-btn" onclick="enEditMoveDisc('${disc.id}', -1)" ${isFirst ? 'disabled' : ''} title="Mover para cima">
            <svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button class="en-edit-icon-btn" onclick="enEditMoveDisc('${disc.id}', 1)" ${isLast ? 'disabled' : ''} title="Mover para baixo">
            <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button class="en-edit-icon-btn en-edit-icon-btn-add" onclick="enEditAddTopic('${disc.id}')" title="Adicionar tópico">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="en-edit-icon-btn en-edit-icon-btn-del" onclick="enEditDelDisc('${disc.id}')" title="Remover disciplina">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>

      ${isExp ? `
      <div class="en-edit-topics" id="en-edit-topics-${disc.id}">
        ${topics.map((t, ti) => enRenderEditTopic(disc.id, t, ti, topics.length)).join('')}
        <button class="en-edit-add-topic-btn" onclick="enEditAddTopic('${disc.id}')">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar tópico
        </button>
      </div>` : ''}
    </div>
  `;
}

function enRenderEditTopic(discId, topic, ti, total) {
  const isFirst = ti === 0, isLast = ti === total - 1;
  const subs = topic.subs || [];
  const isExp = EN.expandedTopics.has('edit-topic-' + topic.id);

  return `
    <div class="en-edit-topic" id="en-edit-topic-${topic.id}" data-ti="${ti}">
      <div class="en-edit-topic-row">
        <div class="en-edit-topic-num">${ti + 1}</div>
        <input class="en-edit-topic-input" value="${escHtmlAttr(topic.text || topic.name || '')}"
               placeholder="Texto do tópico"
               onchange="enEditUpdateTopic('${discId}','${topic.id}', this.value)">
        <div class="en-edit-topic-actions">
          <button class="en-edit-icon-btn sm" onclick="enEditMoveTopic('${discId}','${topic.id}',-1)" ${isFirst ? 'disabled' : ''} title="Subir">
            <svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button class="en-edit-icon-btn sm" onclick="enEditMoveTopic('${discId}','${topic.id}',1)" ${isLast ? 'disabled' : ''} title="Descer">
            <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button class="en-edit-icon-btn sm en-edit-icon-btn-add" onclick="enEditToggleSubs('${topic.id}')" title="${isExp ? 'Ocultar' : 'Ver'} subtópicos (${subs.length})">
            <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></svg>
          </button>
          <button class="en-edit-icon-btn sm en-edit-icon-btn-del" onclick="enEditDelTopic('${discId}','${topic.id}')" title="Remover">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      ${isExp ? `
      <div class="en-edit-subs">
        ${subs.map((sub, si) => `
          <div class="en-edit-sub-row" id="en-edit-sub-${sub.id}">
            <div class="en-edit-sub-bullet"></div>
            <input class="en-edit-sub-input" value="${escHtmlAttr(sub.text || sub.name || '')}"
                   placeholder="Texto do subtópico"
                   onchange="enEditUpdateSub('${discId}','${topic.id}','${sub.id}',this.value)">
            <button class="en-edit-icon-btn sm en-edit-icon-btn-del" onclick="enEditDelSub('${discId}','${topic.id}','${sub.id}')" title="Remover">
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>`).join('')}
        <button class="en-edit-add-sub-btn" onclick="enEditAddSub('${discId}','${topic.id}')">
          + subtópico
        </button>
      </div>` : ''}
    </div>
  `;
}

/* ── Edit actions ───────────────────────────────────────────────── */
function escHtmlAttr(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function enGetEditEdital() {
  if (typeof _editalCfgLoad === 'function') {
    const cfg = _editalCfgLoad();
    return (cfg && cfg.edital && cfg.edital.length) ? cfg.edital : getEditalAtivo();
  }
  return getEditalAtivo();
}

function enEditToggleDisc(discId) {
  const key = 'edit-disc-' + discId;
  if (EN.expandedTopics.has(key)) EN.expandedTopics.delete(key);
  else EN.expandedTopics.add(key);
  enRenderEditPanel();
}

function enEditToggleSubs(topicId) {
  const key = 'edit-topic-' + topicId;
  if (EN.expandedTopics.has(key)) EN.expandedTopics.delete(key);
  else EN.expandedTopics.add(key);
  enRenderEditPanel();
}

function enEditUpdateDiscName(discId, val) {
  const edital = getEditalAtivo();
  const disc = edital.find(d => d.id === discId);
  if (disc) disc.name = val.trim();
}


function enEditUpdateTopic(discId, topicId, val) {
  const edital = getEditalAtivo();
  const disc = edital.find(d => d.id === discId);
  if (!disc) return;
  const t = disc.topics.find(t => t.id === topicId);
  if (t) { t.text = val; t.name = val; }
}

function enEditUpdateSub(discId, topicId, subId, val) {
  const edital = getEditalAtivo();
  const disc = edital.find(d => d.id === discId);
  if (!disc) return;
  const t = disc.topics.find(t => t.id === topicId);
  if (!t) return;
  const s = (t.subs||[]).find(s => s.id === subId);
  if (s) { s.text = val; s.name = val; }
}

function enEditAddDisc() {
  // Add to live edital array and save immediately
  const edital = getEditalAtivo();
  const newId = 'en_disc_' + Date.now();
  edital.push({ id: newId, name: 'Nova Disciplina', topics: [] });
  // Persist — keep existing blocos
  const currentBlocos = enGetBlocos();
  if (typeof _editalCfgSave === 'function') _editalCfgSave({ edital, blocos: currentBlocos });
  EN.expandedTopics.add('edit-disc-' + newId);
  enRenderEditPanel();
}

function enEditDelDisc(discId) {
  const edital = getEditalAtivo();
  const idx = edital.findIndex(d => d.id === discId);
  if (idx >= 0) edital.splice(idx, 1);
  const currentBlocos = enGetBlocos();
  if (typeof _editalCfgSave === 'function') _editalCfgSave({ edital, blocos: currentBlocos });
  enRenderEditPanel();
}

function enEditMoveDisc(discId, dir) {
  const edital = getEditalAtivo();
  const idx = edital.findIndex(d => d.id === discId);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= edital.length) return;
  [edital[idx], edital[newIdx]] = [edital[newIdx], edital[idx]];
  enRenderEditPanel();
}

function enEditAddTopic(discId) {
  const edital = getEditalAtivo();
  const disc = edital.find(d => d.id === discId);
  if (!disc) return;
  const newId = 'en_t_' + Date.now();
  disc.topics.push({ id: newId, text: '', name: '', subs: [] });
  EN.expandedTopics.add('edit-disc-' + discId);
  enRenderEditPanel();
  // Focus the new input after render
  setTimeout(() => {
    const el = document.getElementById('en-edit-topic-' + newId);
    if (el) { const inp = el.querySelector('input'); if (inp) inp.focus(); }
  }, 50);
}

function enEditDelTopic(discId, topicId) {
  const edital = getEditalAtivo();
  const disc = edital.find(d => d.id === discId);
  if (!disc) return;
  disc.topics = disc.topics.filter(t => t.id !== topicId);
  enRenderEditPanel();
}

function enEditMoveTopic(discId, topicId, dir) {
  // Usar getEditalAtivo() (array live) em vez de enGetEditEdital() (cópia)
  // para garantir que a mudança seja refletida no estado global e persistida
  const edital = getEditalAtivo();
  const disc = edital.find(d => d.id === discId);
  if (!disc) return;
  const idx = disc.topics.findIndex(t => t.id === topicId);
  if (idx === -1) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= disc.topics.length) return;
  [disc.topics[idx], disc.topics[newIdx]] = [disc.topics[newIdx], disc.topics[idx]];
  // Persistir a nova ordem (idêntico ao que enEditSave faz)
  const currentBlocos = enGetBlocos();
  if (typeof _editalCfgSave === 'function') _editalCfgSave({ edital, blocos: currentBlocos });
  enRenderEditPanel();
}

function enEditAddSub(discId, topicId) {
  const edital = getEditalAtivo();
  const disc = edital.find(d => d.id === discId);
  if (!disc) return;
  const t = disc.topics.find(t => t.id === topicId);
  if (!t) return;
  if (!t.subs) t.subs = [];
  const newId = 'en_s_' + Date.now();
  t.subs.push({ id: newId, text: '', name: '' });
  enRenderEditPanel();
  setTimeout(() => {
    const el = document.getElementById('en-edit-sub-' + newId);
    if (el) { const inp = el.querySelector('input'); if (inp) inp.focus(); }
  }, 50);
}

function enEditDelSub(discId, topicId, subId) {
  const edital = getEditalAtivo();
  const disc = edital.find(d => d.id === discId);
  if (!disc) return;
  const t = disc.topics.find(t => t.id === topicId);
  if (!t) return;
  t.subs = (t.subs||[]).filter(s => s.id !== subId);
  enRenderEditPanel();
}


/* ── Drag-and-drop reordering ────────────────────────────────────── */

function enDragStart(e, idx) {
  EN_DRAG.srcIndex = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', idx);
  // Visual feedback — add dragging class
  const el = e.currentTarget;
  requestAnimationFrame(() => el.classList.add('en-drag-dragging'));
}

function enDragOver(e, idx) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (idx === EN_DRAG.overIndex) return;

  // Clear previous highlight
  document.querySelectorAll('.en-drag-over').forEach(el => el.classList.remove('en-drag-over'));
  EN_DRAG.overIndex = idx;

  // Don't highlight source element
  if (idx !== EN_DRAG.srcIndex) {
    const el = e.currentTarget;
    el.classList.add('en-drag-over');
  }
}

function enDrop(e, targetIdx) {
  e.preventDefault();
  const srcIdx = EN_DRAG.srcIndex;
  if (srcIdx === null || srcIdx === targetIdx) return;

  const edital = getEditalAtivo();
  if (!edital) return;

  // Reorder
  const [moved] = edital.splice(srcIdx, 1);
  edital.splice(targetIdx, 0, moved);

  EN_DRAG.srcIndex  = null;
  EN_DRAG.overIndex = null;

  enRenderEditPanel();
}

function enDragEnd(e) {
  // Cleanup all drag classes regardless of where drop happened
  document.querySelectorAll('.en-drag-dragging, .en-drag-over').forEach(el => {
    el.classList.remove('en-drag-dragging', 'en-drag-over');
  });
  EN_DRAG.srcIndex  = null;
  EN_DRAG.overIndex = null;
}

function enEditSave() {
  // Read from live array (where all disc/topic changes are applied)
  const edital = getEditalAtivo();
  // Remove empty topics and subs, save via cfgEditalSalvar approach
  edital.forEach(disc => {
    disc.topics = disc.topics.filter(t => (t.text||t.name||'').trim());
    disc.topics.forEach(t => {
      t.subs = (t.subs||[]).filter(s => (s.text||s.name||'').trim());
    });
  });

  // Save edital + preserve existing blocos (never overwrite blocos on edital save)
  const currentBlocos = enGetBlocos();
  if (typeof _editalCfgSave === 'function') {
    _editalCfgSave({ edital, blocos: currentBlocos });
  } else {
    // Fallback: update EDITAL directly
    if (typeof EDITAL !== 'undefined') {
      EDITAL.length = 0;
      edital.forEach(d => EDITAL.push(d));
    }
    try {
      const key = typeof EDITAL_CFG_KEY !== 'undefined' ? EDITAL_CFG_KEY : 'pmal26_edital_cfg';
      localStorage.setItem(key, JSON.stringify({ edital, blocos: currentBlocos }));
    } catch(e) {}
  }

  saveState();
  enRenderAll();

  // Visual feedback
  const btn = document.querySelector('.en-edit-save-btn');
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Salvo!';
    btn.style.background = 'rgba(74,222,128,.15)';
    btn.style.borderColor = 'rgba(74,222,128,.30)';
    btn.style.color = '#4ade80';
    setTimeout(() => { btn.innerHTML = orig; btn.style = ''; }, 1800);
  }
}

/* ── Bootstrap: monta a estrutura do root ───────────────────────── */
function enBuild() {
  const root = document.getElementById('edital-next-root');
  if (!root) return;

  // Validate data is available
  if (typeof getEditalAtivo !== 'function') {
    root.innerHTML = '<div style="padding:2rem;color:rgba(255,255,255,.4);font-family:Barlow,sans-serif;font-size:.8rem">Carregando dados do edital...</div>';
    return;
  }

  // Force reload edital from localStorage (not from stale _CM cache)
  // This ensures GMA / other concursos show their own data
  let edital;
  if (typeof _editalCfgLoad === 'function') {
    const cfg = _editalCfgLoad();
    edital = (cfg && cfg.edital && cfg.edital.length) ? cfg.edital : getEditalAtivo();
  } else {
    edital = getEditalAtivo();
  }

  if (!edital || edital.length === 0) {
    root.innerHTML = '<div style="padding:2rem;color:rgba(255,255,255,.4);font-family:Barlow,sans-serif;font-size:.8rem">Nenhum edital configurado. Configure o edital na aba <strong>Edital Verticalizado → Configurar</strong>.</div>';
    return;
  }

  // Reset activeDiscId if it doesn't belong to the current concurso's edital
  // (happens when switching concursos)
  if (EN.activeDiscId && !edital.find(d => d.id === EN.activeDiscId)) {
    EN.activeDiscId = null;
  }

  // Auto-select first discipline (only for list/roadmap views)
  if (!EN.activeDiscId && EN.view !== 'overview') EN.activeDiscId = edital[0].id;

  // Get active concurso name via system functions
  const concursoCurrent = (() => {
    try {
      if (typeof _concGetAtivo === 'function' && typeof _concGetMeta === 'function') {
        const id = _concGetAtivo();
        const meta = _concGetMeta();
        const found = meta.find(c => c.id === id);
        return found ? (found.nome || found.name || id) : 'Concurso Ativo';
      }
      const m = JSON.parse(localStorage.getItem('protocolo_concursos_meta') || '[]');
      const ativo = localStorage.getItem('protocolo_concurso_ativo');
      const found = Array.isArray(m) ? m.find(c => c.id === ativo) : (m[ativo]);
      return (found && (found.nome || found.name)) || 'Concurso Ativo';
    } catch(e) { return 'Concurso Ativo'; }
  })();

  root.innerHTML = `
    <!-- Command Strip -->
    <div class="en-command-strip">
      <div class="en-command-left">
        <span class="en-command-title">Edital</span>
        <span class="en-command-concurso">${concursoCurrent}</span>
        <div class="en-global-progress">
          <div class="en-gp-track"><div class="en-gp-fill" id="en-gp-fill" style="width:0%"></div></div>
          <span class="en-gp-label" id="en-gp-label">0%</span>
          <span class="en-gp-sub" id="en-gp-sub">0/0 tópicos</span>
        </div>
        <div class="en-view-switcher" id="en-view-switcher">
          <button class="en-view-btn active" data-view="overview" onclick="enSetView('overview')">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Visão Geral
          </button>
          <button class="en-view-btn" data-view="list" onclick="enSetView('list')">
            <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Lista
          </button>
          <button class="en-view-btn" data-view="roadmap" onclick="enSetView('roadmap')">
            <svg viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="4"/><polyline points="6 10 12 4 18 10"/></svg>
            Roadmap
          </button>
        </div>
      </div>
      <div class="en-cmd-spacer"></div>
      <button class="en-view-btn en-view-btn-edit" data-view="edit" onclick="enSetView('edit')">
        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Editar
      </button>
    </div>

    <!-- Layout: Navigator + Detail -->
    <div class="en-navigator" id="en-navigator"></div>
    <div class="en-detail" id="en-detail"></div>
  `;

  enRenderAll();
}

/* ── Hook em goTab ──────────────────────────────────────────────── */

/* ── Bloco Management for Edital ────────────────────────────────── */


function enBuildEditalGroups(edital, blocos) {
  const discById = {};
  edital.forEach(d => discById[d.id] = d);
  const groups = [], assigned = new Set();
  (blocos || []).forEach(b => {
    const bDiscs = (b.discIds || []).map(id => discById[id]).filter(Boolean);
    bDiscs.forEach(d => assigned.add(d.id));
    groups.push({ id: b.id, name: b.name, discs: bDiscs });
  });
  const unassigned = edital.filter(d => !assigned.has(d.id));
  if (unassigned.length) groups.push({ id: '__unassigned__', name: 'Geral', discs: unassigned });
  return groups;
}

function enOpenBlocosPanel() {
  const edital = (typeof enGetEditEdital === 'function') ? enGetEditEdital() : getEditalAtivo();
  // Sempre reinicializar _enBlocosWorking ao abrir o painel (não reusar dados stale)
  // exceto quando enOpenBlocosPanel é chamada internamente para re-render (flag _enBlocosPanelOpen)
  if (!window._enBlocosPanelOpen) {
    window._enBlocosWorking = JSON.parse(JSON.stringify(enGetBlocos()));
  }
  window._enBlocosPanelOpen = true;
  const blocos = window._enBlocosWorking;
  const groups = enBuildEditalGroups(edital, blocos);

  const blocosHtml = groups.filter(g=>g.id!=='__unassigned__').map(g => `
    <div class="en-bloco-card" id="en-bloco-card-${g.id}"
      draggable="true"
      ondragstart="enBlocoDragStart(event,'${g.id}')"
      ondragover="enBlocoDragOver(event,'${g.id}')"
      ondrop="enBlocoDrop(event,'${g.id}')"
      ondragend="enBlocoDragEnd(event)">
      <div class="en-bloco-header-row">
        <span class="en-bloco-grip">⠿</span>
        <input class="en-bloco-name-inp" value="${g.name}" oninput="enBlocoRename('${g.id}',this.value)" placeholder="Nome do bloco">
        <span class="en-bloco-cnt">${g.discs.length}</span>
        <button class="en-bloco-del" onclick="enBlocoDelete('${g.id}')">✕</button>
      </div>
      <div class="en-bloco-discs-wrap" id="en-bw-${g.id}"
        ondragover="enDiscDragOverBloco(event,'${g.id}')"
        ondrop="enDiscDropOnBloco(event,'${g.id}')">
        ${g.discs.map(d=>`<div class="en-bloco-disc-pill" draggable="true"
          ondragstart="enDiscDragStart(event,'${d.id}','${g.id}')"
          ondragend="enDiscDragEnd(event)">
          <span>${d.name}</span>
          <button onclick="enRemoveDiscFromBloco('${d.id}','${g.id}')">✕</button>
        </div>`).join('')}
        <span class="en-bloco-empty-hint">Arraste disciplinas aqui</span>
      </div>
    </div>`).join('');

  const unassigned = groups.find(g=>g.id==='__unassigned__');
  const unassHtml = (unassigned && unassigned.discs.length) ? `
    <div class="en-bloco-pool-wrap">
      <div class="en-bloco-pool-label">Sem bloco — arraste para um bloco acima</div>
      <div class="en-bloco-discs-wrap en-bloco-pool">
        ${unassigned.discs.map(d=>`<div class="en-bloco-disc-pill" draggable="true"
          ondragstart="enDiscDragStart(event,'${d.id}','__unassigned__')"
          ondragend="enDiscDragEnd(event)">${d.name}</div>`).join('')}
      </div>
    </div>` : '';

  // Remove existing overlay
  const old = document.getElementById('en-blocos-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'en-blocos-overlay';
  overlay.className = 'en-blocos-overlay';
  overlay.onclick = e => { if (e.target===overlay) enCloseBlocosPanel(); };
  overlay.innerHTML = `
    <div class="en-blocos-modal">
      <div class="en-blocos-hdr">
        <div class="en-blocos-hdr-text">
          <div class="en-blocos-title">Gerenciar Blocos</div>
          <div class="en-blocos-sub">Agrupe disciplinas em blocos e defina a ordem</div>
        </div>
        <button class="en-blocos-close" onclick="enCloseBlocosPanel()">✕</button>
      </div>
      <div class="en-blocos-body">
        <div id="en-blocos-list">${blocosHtml}</div>
        ${unassHtml}
      </div>
      <div class="en-blocos-footer">
        <button class="en-blocos-add" onclick="enBlocoAdd()">+ Novo bloco</button>
        <button class="en-blocos-save" onclick="enBlocosSave()">💾 Salvar</button>
        <button class="en-blocos-cancel" onclick="enCloseBlocosPanel()">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>overlay.classList.add('open'));
}

function enCloseBlocosPanel() {
  window._enBlocosPanelOpen = false;
  window._enBlocosWorking = null; // limpar working copy ao fechar (cancelar)
  const o = document.getElementById('en-blocos-overlay');
  if (o) { o.classList.remove('open'); setTimeout(()=>o.remove(),200); }
}

function enBlocoAdd() {
  if (!window._enBlocosWorking) window._enBlocosWorking = JSON.parse(JSON.stringify(enGetBlocos()));
  window._enBlocosWorking.push({id:'enb_'+Date.now(), name:'Novo bloco', discIds:[]});
  enOpenBlocosPanel();
}
function enBlocoRename(id,val) {
  const b=(window._enBlocosWorking||[]).find(b=>b.id===id); if(b) b.name=val;
}
function enBlocoDelete(id) {
  if(!window._enBlocosWorking) return;
  window._enBlocosWorking=window._enBlocosWorking.filter(b=>b.id!==id); enOpenBlocosPanel();
}
function enRemoveDiscFromBloco(discId,blocoId) {
  const b=(window._enBlocosWorking||[]).find(b=>b.id===blocoId);
  if(b) b.discIds=(b.discIds||[]).filter(id=>id!==discId); enOpenBlocosPanel();
}

window._enDiscDrag=null;
function enDiscDragStart(e,discId,srcId){ window._enDiscDrag={discId,srcId}; e.dataTransfer.setData('text/plain',discId); }
function enDiscDragEnd(e){ window._enDiscDrag=null; }
function enDiscDragOverBloco(e,id){ e.preventDefault(); }
function enDiscDropOnBloco(e,tgtId){
  e.preventDefault();
  if(!window._enDiscDrag||!window._enBlocosWorking) return;
  const {discId,srcId}=window._enDiscDrag;
  if(srcId!=='__unassigned__'){ const src=window._enBlocosWorking.find(b=>b.id===srcId); if(src) src.discIds=(src.discIds||[]).filter(id=>id!==discId); }
  if(tgtId!=='__unassigned__'){ const tgt=window._enBlocosWorking.find(b=>b.id===tgtId); if(tgt&&!(tgt.discIds||[]).includes(discId)){ if(!tgt.discIds) tgt.discIds=[]; tgt.discIds.push(discId); } }
  window._enDiscDrag=null; enOpenBlocosPanel();
}

window._enBlocoDrag=null;
function enBlocoDragStart(e,id){ if(e.target.closest('.en-bloco-discs-wrap')) return; window._enBlocoDrag=id; e.dataTransfer.setData('text/plain',id); }
function enBlocoDragOver(e,id){ e.preventDefault(); }
function enBlocoDrop(e,tgtId){
  e.preventDefault();
  if(!window._enBlocoDrag||!window._enBlocosWorking) return;
  const si=window._enBlocosWorking.findIndex(b=>b.id===window._enBlocoDrag);
  const ti=window._enBlocosWorking.findIndex(b=>b.id===tgtId);
  if(si>-1&&ti>-1&&si!==ti){ const [m]=window._enBlocosWorking.splice(si,1); window._enBlocosWorking.splice(ti,0,m); }
  window._enBlocoDrag=null; enOpenBlocosPanel();
}
function enBlocoDragEnd(e){ window._enBlocoDrag=null; }

function enBlocosSave(){
  // Always use current live edital (not edit working copy)
  const edital = getEditalAtivo();
  const blocos = window._enBlocosWorking || [];
  enSaveWithBlocos(edital, blocos);
  window._enBlocosWorking = null;
  window._enBlocosPanelOpen = false;
  enCloseBlocosPanel();
  // Full rebuild to reflect new grouping
  enBuild();
  try {
    if (typeof P01Bus !== 'undefined') P01Bus.emit('edital:saved', { blocos: blocos });
    if (typeof P01UI !== 'undefined') P01UI.notify('Blocos salvos', 'success');
  } catch(e) {}
}

document.addEventListener('DOMContentLoaded', function() {
  // Patch goTab to trigger enBuild when edital-next is selected
  const _origGoTab = window.goTab;
  if (typeof _origGoTab === 'function') {
    window.goTab = function(id) {
      _origGoTab(id);
      if (id === 'edital') {
        setTimeout(enBuild, 20);
      }
    };
  }

  // Patch concTrocar so edital rebuilds when concurso changes
  const _origConcTrocar = window.concTrocar;
  if (typeof _origConcTrocar === 'function') {
    window.concTrocar = function(novoId) {
      // Limpar working copy de blocos ao trocar concurso — evita stale data
      window._enBlocosWorking = null;
      _origConcTrocar(novoId);
      if (document.getElementById('tab-edital')?.classList.contains('active')) {
        EN.activeDiscId = null;
        setTimeout(enBuild, 80);
      }
    };
  }

  // Auto-build if edital tab is already the active tab on load
  setTimeout(function() {
    const tab = document.getElementById('tab-edital');
    if (tab && tab.classList.contains('active')) {
      enBuild();
    }
  }, 120);
});

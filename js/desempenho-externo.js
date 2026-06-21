/* ════════════════════════════════════════════════════════════════════
 * eq-v2.js — Estatísticas de Questões V2
 * Tracker de domínio: feitas + erradas por tópico do Edital
 * Integrado ao P01 Core Engine
 * ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── CONSTANTS ──────────────────────────────────────────────────── */
  const KEY_PREFIX = 'eq2_'; // Storage key prefix for topic stats

  /* ── STATE ─────────────────────────────────────────────────────── */
  const EQ = {
    view:   'tracker',  // 'tracker' | 'ranking'
    search: '',
    open:   {},         // discId → bool (accordion open state)
  };

  /* ══════════════════════════════════════════════════════════════════
   * STORAGE — feitas/erradas per topic, namespaced per concurso
   * ══════════════════════════════════════════════════════════════════ */
  function _concId() {
    try { return localStorage.getItem('protocolo_concurso_ativo') || 'default'; }
    catch(e) { return 'default'; }
  }
  function _storeKey() { return KEY_PREFIX + _concId(); }

  function loadStats() {
    try { return JSON.parse(localStorage.getItem(_storeKey()) || '{}'); }
    catch(e) { return {}; }
  }
  function saveStats(data) {
    try { localStorage.setItem(_storeKey(), JSON.stringify(data)); } catch(e) {}
    // Sincroniza com Firebase após salvar localmente
    _fbSyncEq2();
  }

  // Sincroniza os dados do Desempenho Externo com o Firebase
  function _fbSyncEq2() {
    try {
      if (typeof _fbPushEq2ToCloud === 'function') {
        _fbPushEq2ToCloud(_storeKey(), loadStats());
      } else if (typeof saveState === 'function') {
        // Fallback: aciona o saveState geral que vai incluir eq2 via storage.js
        saveState();
      }
    } catch(e) {}
  }

  // Função pública para restaurar dados do Desempenho Externo a partir de um objeto
  window.eq2RestoreStats = function(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log('[eq-v2] Dados restaurados para chave:', key);
      if (_isActive()) eq2Build();
    } catch(e) {
      console.warn('[eq-v2] Erro ao restaurar:', e.message);
    }
  };

  // Função pública para exportar dados do Desempenho Externo (usado pelo backup)
  window.eq2ExportStats = function() {
    try {
      const result = {};
      // Exporta todas as chaves eq2_ do localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('eq2_')) {
          result[k] = JSON.parse(localStorage.getItem(k) || '{}');
        }
      }
      return result;
    } catch(e) {
      console.warn('[eq-v2] Erro ao exportar:', e.message);
      return {};
    }
  };

  // Get stats for a single topic id
  function topicStat(topicId) {
    const all = loadStats();
    return all[topicId] || { feitas: 0, erradas: 0 };
  }

  // Update stats for a topic id
  function setTopicStat(topicId, feitas, erradas) {
    const all = loadStats();
    all[topicId] = {
      feitas:  Math.max(0, parseInt(feitas)  || 0),
      erradas: Math.max(0, parseInt(erradas) || 0),
    };
    // Ensure erradas <= feitas
    if (all[topicId].erradas > all[topicId].feitas) {
      all[topicId].erradas = all[topicId].feitas;
    }
    saveStats(all);
  }

  /* ── DATA ───────────────────────────────────────────────────────── */
  function getEdital() {
    if (typeof getEditalAtivo === 'function') return getEditalAtivo();
    return [];
  }

  function calcPct(feitas, erradas) {
    if (!feitas) return 0;
    return Math.round((feitas - erradas) / feitas * 100);
  }

  function domColor(pct) {
    if (pct === 0)   return 'var(--eq-text3)';
    if (pct >= 90)   return 'var(--eq-green)';
    if (pct >= 70)   return 'var(--eq-green)';
    if (pct >= 50)   return 'var(--eq-amber)';
    if (pct >= 30)   return 'var(--eq-gold)';
    return 'var(--eq-red)';
  }

  function esc(s) {
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Aggregate stats for a discipline (all its topics + subs)
  function discAgg(disc) {
    const stats = loadStats();
    let feitas = 0, erradas = 0;
    (disc.topics || []).forEach(t => {
      const ts = stats[t.id] || { feitas: 0, erradas: 0 };
      feitas  += ts.feitas;
      erradas += ts.erradas;
      (t.subs || []).forEach(s => {
        const ss = stats[s.id] || { feitas: 0, erradas: 0 };
        feitas  += ss.feitas;
        erradas += ss.erradas;
      });
    });
    return { feitas, erradas, pct: calcPct(feitas, erradas) };
  }

  // Global aggregate
  function globalAgg() {
    const edital = getEdital();
    let feitas = 0, erradas = 0, total_topicos = 0, com_dados = 0;
    edital.forEach(disc => {
      const a = discAgg(disc);
      feitas  += a.feitas;
      erradas += a.erradas;
      (disc.topics || []).forEach(t => {
        total_topicos++;
        const ts = topicStat(t.id);
        if (ts.feitas > 0) com_dados++;
        (t.subs || []).forEach(s => {
          total_topicos++;
          const ss = topicStat(s.id);
          if (ss.feitas > 0) com_dados++;
        });
      });
    });
    return { feitas, erradas, pct: calcPct(feitas, erradas), total_topicos, com_dados };
  }

  /* ══════════════════════════════════════════════════════════════════
   * RENDER: TRACKER VIEW
   * ══════════════════════════════════════════════════════════════════ */
  function renderTracker() {
    const edital = getEdital();
    const q      = EQ.search.toLowerCase();

    if (!edital.length) {
      return `<div style="padding:3rem;text-align:center;color:var(--eq-text3);font-size:.8rem">
        Configure o Edital primeiro para usar o tracker de questões.
      </div>`;
    }

    let html = '';
    edital.forEach(disc => {
      if (q && !disc.name.toLowerCase().includes(q)) return;
      const agg   = discAgg(disc);
      const col   = domColor(agg.pct);
      const isOpen = EQ.open[disc.id];

      // Aggregate topic input values
      html += `
        <div class="eq2-disc-card${isOpen ? ' open' : ''}" id="eq2-disc-${disc.id}">
          <div class="eq2-disc-header" onclick="eq2ToggleDisc('${disc.id}')">
            <div class="eq2-disc-chevron">
              <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div class="eq2-disc-name">${esc(disc.name)}</div>
            <div class="eq2-disc-meta">
              <div class="eq2-disc-stat">${agg.feitas}F · ${agg.erradas}E</div>
              <div class="eq2-disc-bar-wrap">
                <div class="eq2-disc-bar-fill" style="width:${agg.pct}%;background:${col}"></div>
              </div>
              <div class="eq2-disc-pct" style="color:${col}">${agg.pct}%</div>
            </div>
          </div>
          <div class="eq2-topics">`;

      (disc.topics || []).forEach(t => {
        const ts  = topicStat(t.id);
        const col2 = domColor(calcPct(ts.feitas, ts.erradas));
        const pct2 = calcPct(ts.feitas, ts.erradas);

        // Calculate sub-topic rollup for this topic
        const subStats = loadStats();
        let subF = 0, subE = 0;
        (t.subs || []).forEach(s => {
          const ss = subStats[s.id] || { feitas: 0, erradas: 0 };
          subF += ss.feitas; subE += ss.erradas;
        });
        // Total = direct + sub rollup
        const totalF = ts.feitas + subF;
        const totalE = ts.erradas + subE;
        const totalPct = calcPct(totalF, totalE);
        const totalCol = domColor(totalPct);
        const hasSubs = (t.subs || []).length > 0;

        html += `
            <div class="eq2-topic-row" id="eq2-trow-${t.id}">
              <div class="eq2-topic-dot" style="background:${totalF>0?totalCol:'var(--eq-text3)'}"></div>
              <div class="eq2-topic-name">
                ${esc(t.name || t.text || '')}
                ${hasSubs && subF > 0 ? `<span class="eq2-topic-rollup" title="Inclui subtópicos">&nbsp;+${subF}F/${subE}E sub</span>` : ''}
              </div>
              <div class="eq2-topic-bar-wrap">
                <div class="eq2-topic-bar-fill" style="width:${totalPct}%;background:${totalCol}"></div>
              </div>
              <div class="eq2-topic-pct" style="color:${totalF>0?totalCol:'var(--eq-text3)'}">${totalPct}%</div>
              <div class="eq2-topic-inputs">
                <input class="eq2-topic-inp" id="eq2-feitas-${t.id}" type="number" min="0" value="${ts.feitas}"
                  placeholder="Feitas" title="Direto neste tópico (sem subtópicos)"
                  oninput="eq2SaveTopic('${t.id}',this.value,document.getElementById('eq2-err-${t.id}').value,'${disc.id}')">
                <span class="eq2-sep-small">F</span>
                <input class="eq2-topic-inp err" type="number" min="0" value="${ts.erradas}"
                  id="eq2-err-${t.id}" placeholder="Err" title="Erradas direto neste tópico"
                  oninput="eq2SaveTopic('${t.id}',document.getElementById('eq2-feitas-${t.id}').value,this.value,'${disc.id}')">
                <span class="eq2-sep-small">E</span>
              </div>
            </div>`;

        // Sub-topics
        (t.subs || []).forEach(s => {
          const ss  = topicStat(s.id);
          const col3 = domColor(calcPct(ss.feitas, ss.erradas));
          const pct3 = calcPct(ss.feitas, ss.erradas);
          html += `
            <div class="eq2-topic-row" style="padding-left:3.5rem">
              <div class="eq2-topic-dot" style="width:4px;height:4px;background:${ss.feitas>0?col3:'var(--eq-border2)'}"></div>
              <div class="eq2-topic-name" style="font-size:.66rem;color:var(--eq-text3)">${esc(s.name || s.text || '')}</div>
              <div class="eq2-topic-bar-wrap" style="width:40px">
                <div class="eq2-topic-bar-fill" style="width:${pct3}%;background:${col3}"></div>
              </div>
              <div class="eq2-topic-pct" style="color:${ss.feitas>0?col3:'var(--eq-text3)'};font-size:.60rem">${pct3}%</div>
              <div class="eq2-topic-inputs">
                <input class="eq2-topic-inp" type="number" min="0" value="${ss.feitas}" style="width:40px" title="Feitas"
                  id="eq2-sfeitas-${s.id}" oninput="eq2SaveTopic('${s.id}',this.value,document.getElementById('eq2-serr-${s.id}').value,'${disc.id}','${t.id}')">
                <span class="eq2-sep-small">F</span>
                <input class="eq2-topic-inp err" type="number" min="0" value="${ss.erradas}"
                  id="eq2-serr-${s.id}" style="width:40px" title="Erradas"
                  oninput="eq2SaveTopic('${s.id}',document.getElementById('eq2-sfeitas-${s.id}').value,this.value,'${disc.id}','${t.id}')">
                <span class="eq2-sep-small">E</span>
              </div>
            </div>`;
        });
      });

      html += `</div></div>`;
    });

    return `<div class="eq2-disc-list">${html}</div>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * RENDER: RANKING VIEW
   * ══════════════════════════════════════════════════════════════════ */
  function renderRanking() {
    const edital = getEdital();
    const stats  = loadStats();
    const all    = [];

    edital.forEach(disc => {
      (disc.topics || []).forEach(t => {
        const ts  = stats[t.id] || { feitas: 0, erradas: 0 };
        if (ts.feitas > 0) {
          all.push({
            name:    (disc.name.split('—')[0]?.trim() || disc.name) + ' › ' + (t.name || t.text || ''),
            feitas:  ts.feitas,
            erradas: ts.erradas,
            pct:     calcPct(ts.feitas, ts.erradas),
          });
        }
        (t.subs || []).forEach(s => {
          const ss = stats[s.id] || { feitas: 0, erradas: 0 };
          if (ss.feitas > 0) {
            all.push({
              name:    (t.name || t.text || '') + ' › ' + (s.name || s.text || ''),
              feitas:  ss.feitas,
              erradas: ss.erradas,
              pct:     calcPct(ss.feitas, ss.erradas),
            });
          }
        });
      });
    });

    if (!all.length) {
      return `<div style="padding:3rem;text-align:center;color:var(--eq-text3);font-size:.8rem">
        Registre questões feitas e erradas no Tracker para ver o ranking de domínio.
      </div>`;
    }

    const sorted   = [...all].sort((a, b) => b.pct - a.pct);
    const best10   = sorted.slice(0, 10);
    const worst10  = [...all].sort((a, b) => a.pct - b.pct).slice(0, 10);
    const most     = [...all].sort((a, b) => b.feitas - a.feitas).slice(0, 10);

    const renderList = (items, labelKey, valueKey, colorFn) =>
      items.map((item, i) => {
        const col = colorFn ? colorFn(item.pct) : domColor(item.pct);
        const val = typeof valueKey === 'function' ? valueKey(item) : item[valueKey];
        return `<div class="eq2-rank-item">
          <div class="eq2-rank-n">${i+1}</div>
          <div class="eq2-rank-name" title="${esc(item.name)}">${esc(item.name)}</div>
          <div class="eq2-rank-bar"><div class="eq2-rank-fill" style="width:${item.pct}%;background:${col}"></div></div>
          <div class="eq2-rank-pct" style="color:${col}">${item.pct}%</div>
          <div class="eq2-rank-frac">${item.feitas}F·${item.erradas}E</div>
        </div>`;
      }).join('');

    return `
      <div class="eq2-cols">
        <div class="eq2-panel">
          <div class="eq2-panel-hdr">
            <div class="eq2-panel-title">Melhor domínio</div>
          </div>
          <div class="eq2-panel-body">${renderList(best10)}</div>
        </div>
        <div class="eq2-panel">
          <div class="eq2-panel-hdr">
            <div class="eq2-panel-title">Zona fraca — priorizar</div>
          </div>
          <div class="eq2-panel-body">${renderList(worst10)}</div>
        </div>
      </div>
      <div style="margin-top:1rem">
        <div class="eq2-panel">
          <div class="eq2-panel-hdr">
            <div class="eq2-panel-title">Mais questões feitas</div>
          </div>
          <div class="eq2-panel-body">${renderList(most)}</div>
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * MAIN BUILD
   * ══════════════════════════════════════════════════════════════════ */
  function eq2Build() {
    const root = document.getElementById('eq2-root');
    if (!root) return;

    try {
      const g   = globalAgg();
      const coverage = g.total_topicos > 0 ? Math.round(g.com_dados / g.total_topicos * 100) : 0;

      const kpis = [
        { label:'Total Feitas',  val:g.feitas,       sup:'',  sub:'questões registradas', c:'var(--eq-blue)' },
        { label:'Total Erradas', val:g.erradas,       sup:'',  sub:`${g.feitas>0?Math.round(g.erradas/g.feitas*100):0}% de erro`, c:'var(--eq-amber)' },
        { label:'Aproveitamento',val:g.pct,           sup:'%', sub:`${g.feitas} feitas · ${g.erradas} erradas`, c:domColor(g.pct) },
        { label:'Cobertura',     val:coverage,        sup:'%', sub:`${g.com_dados}/${g.total_topicos} tópicos mapeados`, c:'var(--eq-gold)' },
      ];

      const views = [
        { id:'tracker', label:'Tracker', icon:'<circle cx="12" cy="12" r="3"/><path d="M3 12h3m12 0h3M12 3v3m0 12v3"/>' },
        { id:'ranking', label:'Ranking', icon:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
      ];

      root.innerHTML = `
        <div>
          <div class="eq2-bar">
            <span class="eq2-title">Estatísticas de Questões</span>
            <div class="eq2-sep"></div>
            <div class="eq2-tabs">
              ${views.map(v=>`<button class="eq2-tab${EQ.view===v.id?' active':''}" onclick="eq2SetView('${v.id}')">
                <svg viewBox="0 0 24 24">${v.icon}</svg>${v.label}
              </button>`).join('')}
            </div>
            <div class="eq2-spacer"></div>
            ${EQ.view==='tracker'?`<input class="eq2-search" type="text" placeholder="Buscar disciplina..."
              value="${esc(EQ.search)}" oninput="eq2Search(this.value)" autocomplete="off">`:''}
          </div>
          <div class="eq2-body">
            <div class="eq2-content">
              <div class="eq2-kpi-row">
                ${kpis.map(k=>`<div class="eq2-kpi" style="--eq-kpi-c:${k.c}">
                  <div class="eq2-kpi-label">${k.label}</div>
                  <div class="eq2-kpi-val">${k.val}<sup>${k.sup}</sup></div>
                  <div class="eq2-kpi-sub">${k.sub}</div>
                </div>`).join('')}
              </div>
              ${EQ.view==='tracker' ?
                `<div class="eq2-section">Tracker por Disciplina</div>${renderTracker()}` :
                `<div class="eq2-section">Ranking de Domínio</div>${renderRanking()}`
              }
            </div>
          </div>
        </div>`;
    } catch(e) {
      console.error('[eq-v2] Build crash:', e.message, e.stack);
      root.innerHTML = `<div style="padding:1.5rem;color:var(--eq-red);font-family:monospace;font-size:.75rem">[eq-v2] Erro: ${e.message}</div>`;
    }
  }

  /* ── PUBLIC ACTIONS ─────────────────────────────────────────────── */
  window.eq2SetView = function(v) { EQ.view = v; eq2Build(); };
  window.eq2Search  = function(q) { EQ.search = q; renderTrackerInPlace(); };

  window.eq2ToggleDisc = function(id) {
    EQ.open[id] = !EQ.open[id];
    const card = document.getElementById('eq2-disc-' + id);
    if (card) card.classList.toggle('open', !!EQ.open[id]);
  };

  window.eq2SaveTopic = function(topicId, feitas, erradas, discId, parentTopicId) {
    setTopicStat(topicId, feitas, erradas);
    if (EQ.view !== 'tracker') return;

    const edital = getEdital();

    // Update the specific topic row if given (direct update)
    if (parentTopicId) {
      // This is a SUB-TOPIC change → update parent topic row + disc header
      edital.forEach(disc => {
        (disc.topics || []).forEach(t => {
          if (t.id === parentTopicId) {
            updateTopicRow(t, disc.id);
          }
        });
        if (disc.id === discId) updateDiscHeader(disc);
      });
    } else {
      // This is a TOPIC or DISC-LEVEL change → update that topic row + disc header
      edital.forEach(disc => {
        (disc.topics || []).forEach(t => {
          if (t.id === topicId) {
            updateTopicRow(t, disc.id);
          }
        });
        if (disc.id === discId) updateDiscHeader(disc);
      });
    }

    // FASE 9.4.13 BUG 1 FIX: atualizar KPI cards superiores imediatamente
    _eq2UpdateKpiCards();

    if (typeof P01Bus !== 'undefined') P01Bus.emit('eq:updated', { topicId });
    // Mark today as studied (for streak)
    if (typeof _markStudiedToday === 'function') _markStudiedToday();
  };

  // FASE 9.4.13: atualiza apenas os 4 cards KPI sem fazer full-rebuild
  function _eq2UpdateKpiCards() {
    const g = globalAgg();
    const coverage = g.total_topicos > 0 ? Math.round(g.com_dados / g.total_topicos * 100) : 0;
    const kpis = [
      { label:'Total Feitas',   val: g.feitas,  sup:'',  sub: 'questões registradas',                       c:'var(--eq-blue)' },
      { label:'Total Erradas',  val: g.erradas,  sup:'',  sub: (g.feitas>0?Math.round(g.erradas/g.feitas*100):0)+'% de erro', c:'var(--eq-amber)' },
      { label:'Aproveitamento', val: g.pct,      sup:'%', sub: g.feitas+' feitas · '+g.erradas+' erradas',  c: domColor(g.pct) },
      { label:'Cobertura',      val: coverage,   sup:'%', sub: g.com_dados+'/'+g.total_topicos+' tópicos mapeados', c:'var(--eq-gold)' },
    ];
    const row = document.querySelector('.eq2-kpi-row');
    if (!row) return;
    const cards = row.querySelectorAll('.eq2-kpi');
    cards.forEach((card, i) => {
      const k = kpis[i];
      if (!k) return;
      const valEl = card.querySelector('.eq2-kpi-val');
      const subEl = card.querySelector('.eq2-kpi-sub');
      if (valEl) { valEl.innerHTML = k.val + '<sup>' + k.sup + '</sup>'; card.style.setProperty('--eq-kpi-c', k.c); }
      if (subEl) subEl.textContent = k.sub;
    });
  }

  function updateTopicRow(topic, discId) {
    const row = document.getElementById('eq2-trow-' + topic.id);
    if (!row) return;
    const ts = topicStat(topic.id);
    // Sum sub-topics
    let subF = 0, subE = 0;
    (topic.subs || []).forEach(s => {
      const ss = topicStat(s.id);
      subF += ss.feitas; subE += ss.erradas;
    });
    const totalF = ts.feitas + subF;
    const totalE = ts.erradas + subE;
    const pct    = calcPct(totalF, totalE);
    const col    = domColor(pct);

    // Update bar
    const barEl  = row.querySelector('.eq2-topic-bar-fill');
    const pctEl  = row.querySelector('.eq2-topic-pct');
    const dotEl  = row.querySelector('.eq2-topic-dot');
    const rollEl = row.querySelector('.eq2-topic-rollup');

    if (barEl)  { barEl.style.width = pct + '%'; barEl.style.background = col; }
    if (pctEl)  { pctEl.textContent = pct + '%'; pctEl.style.color = totalF > 0 ? col : 'var(--eq-text3)'; }
    if (dotEl)  dotEl.style.background = totalF > 0 ? col : 'var(--eq-text3)';
    if (rollEl && subF > 0) {
      rollEl.textContent = ' +' + subF + 'F/' + subE + 'E sub';
    } else if (rollEl) {
      rollEl.textContent = '';
    }
  }

  function updateDiscHeader(disc) {
    const card = document.getElementById('eq2-disc-' + disc.id);
    if (!card) return;
    const agg = discAgg(disc);
    const col = domColor(agg.pct);
    const metaEl  = card.querySelector('.eq2-disc-stat');
    const barEl   = card.querySelector('.eq2-disc-bar-fill');
    const pctEl   = card.querySelector('.eq2-disc-pct');
    if (metaEl) metaEl.textContent = agg.feitas + 'F · ' + agg.erradas + 'E';
    if (barEl)  { barEl.style.width = agg.pct + '%'; barEl.style.background = col; }
    if (pctEl)  { pctEl.textContent = agg.pct + '%'; pctEl.style.color = col; }
    // Also update all topic rows within this disc
    (disc.topics || []).forEach(t => updateTopicRow(t, disc.id));
  }

  function renderTrackerInPlace() {
    const list = document.querySelector('.eq2-disc-list');
    if (list) list.outerHTML = `<div class="eq2-disc-list">${renderTracker().replace('<div class="eq2-disc-list">','').replace(/<\/div>$/, '')}</div>`;
    else eq2Build();
  }

  /* ── P01 REGISTRATION ───────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof P01Modules !== 'undefined') {
      P01Modules.register({
        id:       'eq-v2',
        build:    eq2Build,
        render:   eq2Build,
        teardown: function() { EQ.search = ''; },
        rebuild:  eq2Build,
      });
    }

    if (typeof P01Bus !== 'undefined') {
      P01Bus.on('concurso:changed', function() {
        if (_isActive()) { EQ.open = {}; eq2Build(); }
      });
      P01Bus.on('edital:saved', function() {
        if (_isActive()) eq2Build();
      });
    }

    const _orig = window.goTab;
    if (typeof _orig === 'function') {
      window.goTab = function(id) {
        _orig(id);
        if (id === 'eq-v2') {
          try { setTimeout(eq2Build, 20); }
          catch(e) { console.warn('[eq-v2] goTab error:', e.message); }
        }
      };
    }
    const _oc = window.concTrocar;
    if (typeof _oc === 'function') {
      window.concTrocar = function(id) {
        _oc(id);
        if (_isActive()) { EQ.open = {}; setTimeout(eq2Build, 80); }
      };
    }
    setTimeout(function() { if (_isActive()) eq2Build(); }, 150);
  });

  function _isActive() {
    const t = document.getElementById('tab-eq-v2');
    return t && t.classList.contains('active');
  }
})();

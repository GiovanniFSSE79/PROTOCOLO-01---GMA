/* ════════════════════════════════════════════════════════════════════
 * leitura-next.js — PROTOCOLO 01 · Leitura de Leis V2
 * Sistema de Blocos: crie blocos, nomeie, arraste leis para dentro
 * ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── STATE ─────────────────────────────────────────────────────── */
  const LN = {
    view:        'overview', // 'overview' | 'reader' | 'edit'
    activeLawId: null,
    searchQuery: '',
    editLeis:    null,   // working copy of leis array
    editBlocos:  null,   // working copy of blocos array
    dragItem:    null,   // { type:'lei'|'bloco', id, srcBlocoId }
    dragOverId:  null,
  };

  /* ── DATA ───────────────────────────────────────────────────────── */
  function lnGetLeis() {
    if (typeof getLeisAtivas === 'function') return getLeisAtivas();
    if (typeof LEIS_LEITURA !== 'undefined' && LEIS_LEITURA.length) return LEIS_LEITURA;
    return [];
  }

  function lnGetBlocos() {
    // Blocos stored alongside leis in _leisCfgLoad
    if (typeof _leisCfgLoad === 'function') {
      const cfg = _leisCfgLoad();
      if (cfg && cfg.blocos) return cfg.blocos;
    }
    return [];
  }

  function lnSaveAll(leis, blocos) {
    const obj = { leis, blocos };
    if (typeof _leisCfgSave === 'function') _leisCfgSave(obj);
    // Update LEIS_LEITURA (global array)
    if (typeof LEIS_LEITURA !== 'undefined') {
      LEIS_LEITURA.length = 0; leis.forEach(l => LEIS_LEITURA.push(l));
    }
    // Update _CM.leis so getLeisAtivas() returns fresh data (not stale cache)
    if (typeof _CM !== 'undefined' && _CM) {
      _CM.leis = leis.slice();
    }
    // Notify system
    try { if (typeof P01Bus !== 'undefined') P01Bus.emit('leitura:saved', { leis: leis, blocos: blocos }); } catch(e) {}
  }

  // Build display groups from blocos + leis
  // Returns [{id, name, leis:[...leiObjects]}]
  function lnBuildGroups(leis, blocos) {
    const leisById = {};
    leis.forEach(l => leisById[l.id] = l);

    const groups = [];
    const assigned = new Set();

    (blocos || []).forEach(b => {
      const bLeis = (b.leisIds || []).map(id => leisById[id]).filter(Boolean);
      bLeis.forEach(l => assigned.add(l.id));
      groups.push({ id: b.id, name: b.name, leis: bLeis });
    });

    // Unassigned go to implicit group at end
    const unassigned = leis.filter(l => !assigned.has(l.id));
    if (unassigned.length) {
      groups.push({ id: '__unassigned__', name: 'Sem bloco', leis: unassigned });
    }

    return groups;
  }

  function lnKey(id, art) { return typeof getLeitKey === 'function' ? getLeitKey(id, art) : 'leit_'+id+'_'+art; }
  function lnIsRead(id, art) { return !!(typeof ST!=='undefined' && ST.leitura && ST.leitura[lnKey(id,art)]); }
  function lnToggle(id, art) {
    if (typeof ST==='undefined') return;
    ST.leitura[lnKey(id,art)] = !lnIsRead(id,art);
    if (typeof saveState==='function') saveState();
  }
  function lnMarkAll(id, state) {
    const lei = lnGetLeis().find(l=>l.id===id);
    if (!lei||typeof ST==='undefined') return;
    lei.arts.forEach(a => { ST.leitura[lnKey(id,a)] = state; });
    if (typeof saveState==='function') saveState();
  }
  function lnStats(id) {
    const lei = lnGetLeis().find(l=>l.id===id);
    if (!lei) return {done:0,total:0,pct:0};
    const total = lei.arts.length;
    const done  = lei.arts.filter(a=>lnIsRead(id,a)).length;
    return {done, total, pct: total>0 ? Math.round(done/total*100) : 0};
  }
  function lnGlobal() {
    let done=0,total=0;
    lnGetLeis().forEach(l=>{total+=l.arts.length; done+=l.arts.filter(a=>lnIsRead(l.id,a)).length;});
    return {done,total,pct:total>0?Math.round(done/total*100):0};
  }

  /* ── UTILS ──────────────────────────────────────────────────────── */
  function lnColor(pct) {
    if (pct===0)  return '#374151';
    if (pct>=100) return '#4ade80';
    if (pct>=60)  return lerp('#eab308','#4ade80',(pct-60)/40);
    if (pct>=25)  return lerp('#f97316','#eab308',(pct-25)/35);
    return lerp('#dc2626','#f97316',pct/25);
  }
  function lerp(a,b,t){
    const p=s=>[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];
    const [ar,ag,ab]=p(a),[br,bg,bb]=p(b);
    return `rgb(${~~(ar+(br-ar)*t)},${~~(ag+(bg-ag)*t)},${~~(ab+(bb-ab)*t)})`;
  }
  function lnEsc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function ringHtml(pct,r=12,sz=28){
    const c=+(2*Math.PI*r).toFixed(2),off=c*(1-pct/100),col=lnColor(pct);
    return `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" style="transform:rotate(-90deg)">
      <circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="var(--lr-border2)" stroke-width="2.5"/>
      <circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="${col}" stroke-width="2.5"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
        style="transition:stroke-dashoffset .5s,stroke .3s"/></svg>`;
  }

  /* ═════════════════════════════════════════════════════════════════
   * VIEW: OVERVIEW — agrupado por blocos
   * ═════════════════════════════════════════════════════════════════ */
  function renderOverview() {
    const leis   = lnGetLeis();
    const blocos = lnGetBlocos();
    const groups = lnBuildGroups(leis, blocos);
    const q      = LN.searchQuery.toLowerCase();

    let html = `<div class="ln-overview-wrap">`;

    groups.forEach(g => {
      const filtered = q ? g.leis.filter(l => l.name.toLowerCase().includes(q)) : g.leis;
      if (!filtered.length) return;

      html += `<div class="ln-ov-group">
        <div class="ln-ov-group-label">
          <span class="ln-ov-group-name">${lnEsc(g.name)}</span>
          <span class="ln-ov-group-count">${filtered.length} lei${filtered.length!==1?'s':''}</span>
        </div>
        <div class="ln-ov-grid">`;

      filtered.forEach(lei => {
        const s=lnStats(lei.id), col=lnColor(s.pct);
        html += `<div class="ln-ov-card${lei.id===LN.activeLawId?' active':''}" onclick="lnOpenLaw('${lei.id}')">
          <div class="ln-ov-card-top" style="background:linear-gradient(135deg,${col}22,transparent)">
            <div>${ringHtml(s.pct,14,32)}</div>
            <div class="ln-ov-pct" style="color:${col}">${s.pct}%</div>
          </div>
          <div class="ln-ov-card-name">${lnEsc(lei.name.replace(/\s*\(Arts\..+\)/,'').trim())}</div>
          <div class="ln-ov-card-meta">${s.done}/${s.total} arts.</div>
          <div class="ln-ov-card-bar"><div class="ln-ov-card-fill" style="width:${s.pct}%;background:${col}"></div></div>
        </div>`;
      });

      html += `</div></div>`;
    });

    if (!groups.length) {
      html += `<div class="ln-empty-state">
        <div class="ln-empty-icon">📚</div>
        <div class="ln-empty-title">Nenhuma legislação configurada</div>
        <div class="ln-empty-sub">Vá em <strong>Editar</strong> para adicionar leis e criar blocos</div>
      </div>`;
    }

    html += `</div>`;
    document.getElementById('ln-main').innerHTML = html;
  }

  /* ═════════════════════════════════════════════════════════════════
   * VIEW: READER — sidebar + chips
   * ═════════════════════════════════════════════════════════════════ */
  function renderReader() {
    const leis   = lnGetLeis();
    const blocos = lnGetBlocos();
    const groups = lnBuildGroups(leis, blocos);
    if (!leis.length) { LN.view='overview'; renderOverview(); return; }
    if (!LN.activeLawId) LN.activeLawId = leis[0].id;
    const lei = leis.find(l=>l.id===LN.activeLawId) || leis[0];

    let sideHtml = '';
    groups.forEach(g => {
      if (!g.leis.length) return;
      sideHtml += `<div class="ln-side-group-label">${lnEsc(g.name)}</div>`;
      g.leis.forEach(l => {
        const s=lnStats(l.id), col=lnColor(s.pct);
        sideHtml += `<button class="ln-side-item${l.id===lei.id?' active':''}" onclick="lnOpenLaw('${l.id}')">
          <div class="ln-side-bar-wrap" style="background:${col}22">
            <div class="ln-side-bar-fill" style="height:${s.pct}%;background:${col}"></div>
          </div>
          <div class="ln-side-info">
            <div class="ln-side-name">${lnEsc(l.name.replace(/\s*\(Arts\..+\)/,'').trim())}</div>
            <div class="ln-side-meta">${s.done}/${s.total} · <span style="color:${col};font-weight:600">${s.pct}%</span></div>
          </div>
        </button>`;
      });
    });

    const s=lnStats(lei.id), col=lnColor(s.pct);
    const chipsHtml = lei.arts.map(art => {
      const read=lnIsRead(lei.id,art);
      const artLabel = art <= 9 ? `Art. ${art}º` : `Art. ${art}`;
      return `<button class="ln-art-chip${read?' done':''}" onclick="lnToggleChip(event,'${lei.id}',${art})" title="${artLabel}">
        <span class="ln-chip-num">${artLabel}</span>
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </button>`;
    }).join('');

    document.getElementById('ln-main').innerHTML = `
      <div class="ln-reader-layout">
        <div class="ln-reader-sidebar">
          <div class="ln-side-header">
            <span class="ln-side-title">Legislações</span>
            <button class="ln-back-btn-small" onclick="lnGoOverview()" title="Visão Geral">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </button>
          </div>
          ${sideHtml}
        </div>
        <div class="ln-reader-content">
          <div class="ln-law-header">
            <div class="ln-law-name">${lnEsc(lei.name)}</div>
            <div class="ln-law-prog-row">
              <div class="ln-law-prog-track">
                <div class="ln-law-prog-fill" id="ln-prog-fill" style="width:${s.pct}%;background:${col}"></div>
              </div>
              <span class="ln-law-prog-label" id="ln-prog-label">${s.done} / ${s.total} artigos · ${s.pct}%</span>
            </div>
            <div class="ln-law-actions">
              <button class="ln-law-btn" onclick="lnDoMarkAll('${lei.id}',true)">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Marcar todos
              </button>
              <button class="ln-law-btn danger" onclick="lnDoMarkAll('${lei.id}',false)">
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Desmarcar
              </button>
            </div>
          </div>
          <div class="ln-chips-label">Toque para marcar como lido</div>
          <div class="ln-art-chips" id="ln-art-chips">${chipsHtml}</div>
        </div>
      </div>`;
  }

  /* ═════════════════════════════════════════════════════════════════
   * VIEW: EDIT — two panels: leis (left) + blocos (right)
   * ═════════════════════════════════════════════════════════════════ */
  function renderEdit() {
    if (!LN.editLeis)   LN.editLeis   = JSON.parse(JSON.stringify(lnGetLeis()));
    if (!LN.editBlocos) LN.editBlocos = JSON.parse(JSON.stringify(lnGetBlocos()));

    const groups    = lnBuildGroups(LN.editLeis, LN.editBlocos);
    const realBlocos = groups.filter(g => g.id !== '__unassigned__');
    const unassigned = groups.find(g => g.id === '__unassigned__');

    /* ── Left panel: lei rows with name + arts editing ── */
    const leisRows = LN.editLeis.map((lei, i) => {
      const artsLabel = lei.arts.length > 1
        ? `${lei.arts[0]}–${lei.arts[lei.arts.length-1]}`
        : String(lei.arts[0] || 1);
      const s = lnStats(lei.id), col = lnColor(s.pct);
      return `<div class="ln-lei-row" id="ln-lei-row-${i}"
          draggable="true"
          ondragstart="lnDragStartLeiRow(event,${i})"
          ondragover="lnDragOverLeiRow(event,${i})"
          ondrop="lnDropLeiRow(event,${i})"
          ondragend="lnDragEndLeiRow(event)">
        <div class="ln-lei-row-grip" title="Arrastar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9"  cy="7"  r="1" fill="currentColor"/>
            <circle cx="15" cy="7"  r="1" fill="currentColor"/>
            <circle cx="9"  cy="12" r="1" fill="currentColor"/>
            <circle cx="15" cy="12" r="1" fill="currentColor"/>
            <circle cx="9"  cy="17" r="1" fill="currentColor"/>
            <circle cx="15" cy="17" r="1" fill="currentColor"/>
          </svg>
        </div>
        <div class="ln-lei-row-ring">${ringHtml(s.pct, 8, 18)}</div>
        <div class="ln-lei-row-fields">
          <input class="ln-lei-row-name" value="${lnEsc(lei.name)}"
            oninput="lnEditLeiName(${i},this.value)" placeholder="Nome da lei">
          <div class="ln-lei-row-meta">
            <span class="ln-lei-row-arts-label">Arts.</span>
            <input class="ln-lei-row-arts" type="text" value="${artsLabel}"
              oninput="lnEditLeiArts(${i},this.value)"
              placeholder="1–44" title="Intervalo ex: 1–135">
            <span class="ln-lei-row-pct" style="color:${col}">${s.pct}%</span>
          </div>
        </div>
        <button class="ln-lei-row-del" onclick="lnDelLei('${lei.id}')" title="Remover">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>`;
    }).join('');

    /* ── Right panel: blocos with draggable lei chips ── */
    const blocosHtml = realBlocos.map(g => renderBlocoCard(g)).join('') +
      (unassigned && unassigned.leis.length ? `
        <div class="ln-edit-bloco ln-edit-unassigned"
          ondragover="lnDragOverBloco(event,'__unassigned__')"
          ondrop="lnDropOnBloco(event,'__unassigned__')">
          <div class="ln-edit-bloco-header">
            <div class="ln-edit-bloco-drag-placeholder"></div>
            <span class="ln-edit-bloco-name-static">Sem bloco</span>
            <span class="ln-edit-bloco-count">${unassigned.leis.length}</span>
          </div>
          <div class="ln-edit-bloco-leis" id="ln-bloco-__unassigned__">
            ${unassigned.leis.map(l => renderLeiChip(l,'__unassigned__')).join('')}
            <div class="ln-bloco-drop-hint">Arraste leis aqui</div>
          </div>
        </div>` : '');

    document.getElementById('ln-main').innerHTML = `
      <div class="ln-edit-wrap">
        <div class="ln-edit-header">
          <div>
            <div class="ln-edit-title">Editar Leitura de Leis</div>
            <div class="ln-edit-sub">Esquerda: edite nome e artigos de cada lei. Direita: organize em blocos.</div>
          </div>
          <div class="ln-edit-header-actions">
            <button class="ln-edit-add-lei-btn" onclick="lnAddLei()">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nova lei
            </button>
            <button class="ln-edit-add-bloco-btn" onclick="lnAddBloco()">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Novo bloco
            </button>
          </div>
        </div>

        <div class="ln-edit-split">
          <!-- LEFT: lei list -->
          <div class="ln-edit-leis-panel">
            <div class="ln-edit-panel-label">Leis cadastradas</div>
            <div class="ln-lei-rows" id="ln-lei-rows">${leisRows}</div>
          </div>
          <!-- RIGHT: blocos -->
          <div class="ln-edit-blocos-panel">
            <div class="ln-edit-panel-label">Organização por blocos</div>
            <div class="ln-edit-blocos" id="ln-edit-blocos">${blocosHtml}</div>
          </div>
        </div>

        <div class="ln-edit-actions">
          <button class="ln-edit-save" onclick="lnEditSave()">
            <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Salvar
          </button>
          <button class="ln-edit-cancel" onclick="lnEditCancel()">Cancelar</button>
        </div>
      </div>`;
  }

  function renderBlocoCard(g) {
    const leiCards = g.leis.map(l => renderLeiChip(l, g.id)).join('');
    return `
      <div class="ln-edit-bloco" id="ln-bloco-card-${g.id}"
        draggable="true"
        ondragstart="lnDragStartBloco(event,'${g.id}')"
        ondragover="lnDragOverBloco(event,'${g.id}')"
        ondrop="lnDropOnBloco(event,'${g.id}')"
        ondragend="lnDragEndBloco(event)">
        <div class="ln-edit-bloco-header">
          <div class="ln-edit-bloco-drag" title="Arrastar bloco">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="7"  r="1" fill="currentColor"/><circle cx="15" cy="7"  r="1" fill="currentColor"/>
              <circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>
              <circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/>
            </svg>
          </div>
          <input class="ln-edit-bloco-name" value="${lnEsc(g.name)}"
            oninput="lnRenameBlocoInput('${g.id}',this.value)"
            placeholder="Nome do bloco">
          <span class="ln-edit-bloco-count">${g.leis.length}</span>
          <button class="ln-edit-bloco-del" onclick="lnDelBloco('${g.id}')" title="Remover bloco">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="ln-edit-bloco-leis" id="ln-bloco-${g.id}"
          ondragover="lnDragOverBloco(event,'${g.id}')"
          ondrop="lnDropOnBloco(event,'${g.id}')">
          ${leiCards}
          <div class="ln-bloco-drop-hint">Arraste leis aqui</div>
        </div>
      </div>`;
  }

  function renderLeiChip(lei, blocoId) {
    return `<div class="ln-edit-lei-chip" id="ln-lei-chip-${lei.id}"
      draggable="true"
      ondragstart="lnDragStartLei(event,'${lei.id}','${blocoId}')"
      ondragend="lnDragEndLei(event)">
      <div class="ln-edit-lei-name-short">${lnEsc(lei.name.replace(/\s*\(Arts\..+\)/,'').trim())}</div>
      <div class="ln-edit-lei-meta">${lei.arts.length} arts</div>
    </div>`;
  }

  /* ── DISPATCH ───────────────────────────────────────────────────── */
  function lnRender() {
    const gs=lnGlobal();
    const f=document.getElementById('ln-cmd-fill'),p=document.getElementById('ln-cmd-pct'),fr=document.getElementById('ln-cmd-frac');
    if(f) f.style.width=gs.pct+'%'; if(p) p.textContent=gs.pct+'%'; if(fr) fr.textContent=gs.done+' / '+gs.total+' artigos';
    ['overview','reader','edit'].forEach(v=>{const b=document.getElementById('ln-view-'+v);if(b) b.classList.toggle('active',LN.view===v);});
    if      (LN.view==='overview') renderOverview();
    else if (LN.view==='reader')   renderReader();
    else if (LN.view==='edit')     renderEdit();
  }

  /* ── BUILD SHELL ────────────────────────────────────────────────── */
  function lnBuild() {
    const root = document.getElementById('leitura-next-root');
    if (!root) return;
    root.innerHTML = `
      <div class="ln-shell">
        <div class="ln-command">
          <span class="ln-cmd-title">Leitura de Leis</span>
          <div class="ln-cmd-sep"></div>
          <div class="ln-cmd-prog">
            <div class="ln-cmd-track"><div class="ln-cmd-fill" id="ln-cmd-fill" style="width:0%"></div></div>
            <span class="ln-cmd-pct" id="ln-cmd-pct">0%</span>
            <span class="ln-cmd-frac" id="ln-cmd-frac">0 / 0 artigos</span>
          </div>
          <div class="ln-cmd-sep"></div>
          <div class="ln-view-switcher">
            <button class="ln-view-btn active" id="ln-view-overview" onclick="lnSetView('overview')">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Visão Geral
            </button>
            <button class="ln-view-btn" id="ln-view-reader" onclick="lnSetView('reader')">
              <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              Lista
            </button>
          </div>
          <div class="ln-cmd-spacer"></div>
          <input class="ln-search" type="text" placeholder="Buscar lei..." value="${lnEsc(LN.searchQuery)}"
            oninput="lnDoSearch(this.value)" autocomplete="off">
          <button class="ln-view-btn ln-view-btn-edit" id="ln-view-edit" onclick="lnSetView('edit')">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
        </div>
        <div class="ln-main" id="ln-main"></div>
      </div>`;
    lnRender();
  }

  /* ── PUBLIC ACTIONS ─────────────────────────────────────────────── */
  window.lnSetView = function(v) { LN.view=v; if(v==='edit'){LN.editLeis=null;LN.editBlocos=null;} lnRender(); };
  window.lnOpenLaw = function(id) {
    LN.activeLawId=id; LN.view='reader';
    // Reset last-click tracking for new law
    if (typeof LN_LAST_ART !== 'undefined') LN_LAST_ART[id] = undefined;
    lnRender();
  };
  window.lnGoOverview = function() { LN.view='overview'; lnRender(); };
  window.lnDoSearch = function(q) { LN.searchQuery=q; if(LN.view==='overview') renderOverview(); };

  // Track last clicked art per law for range select
  const LN_LAST_ART = {};

  window.lnToggleChip = function(e, id, art) {
    e.stopPropagation();
    const lei    = lnGetLeis().find(l => l.id === id);
    if (!lei) return;

    const lastArt = LN_LAST_ART[id];
    const isCurrentlyRead = lnIsRead(id, art);

    // Determine which arts to affect
    let artsToChange = [art];
    let newState = !isCurrentlyRead;

    if (lastArt !== undefined && lastArt !== art) {
      const lo = Math.min(lastArt, art);
      const hi = Math.max(lastArt, art);
      // Get all arts in range that exist in this law
      artsToChange = lei.arts.filter(a => a >= lo && a <= hi);

      if (art > lastArt) {
        // Clicked higher → mark all in range as READ
        newState = true;
      } else {
        // Clicked lower → unmark all in range
        newState = false;
      }
    }

    // Apply state to all affected arts
    if (typeof ST !== 'undefined' && ST.leitura) {
      artsToChange.forEach(a => {
        ST.leitura[lnKey(id, a)] = newState;
      });
      if (typeof saveState === 'function') saveState();
    }

    // Remember this art as last clicked
    LN_LAST_ART[id] = art;

    // Update DOM — chips for affected arts (use exact onclick match)
    artsToChange.forEach(a => {
      // Use exact match to avoid Art. 2 matching Art. 20, Art. 200, etc.
      const allChips = document.querySelectorAll('.ln-art-chip');
      allChips.forEach(chip => {
        const onclickVal = chip.getAttribute('onclick') || '';
        // Match exact pattern: lnToggleChip(event,'id',art)
        if (onclickVal.includes(`'${id}',${a})`)) {
          chip.classList.toggle('done', newState);
        }
      });
    });

    // Update progress bar
    const s=lnStats(id),col=lnColor(s.pct);
    const fill=document.getElementById('ln-prog-fill'),lbl=document.getElementById('ln-prog-label');
    if(fill){fill.style.width=s.pct+'%';fill.style.background=col;}
    if(lbl) lbl.textContent=s.done+' / '+s.total+' artigos · '+s.pct+'%';
    // Update command bar
    const gs=lnGlobal();
    const cf=document.getElementById('ln-cmd-fill'),cp=document.getElementById('ln-cmd-pct'),cfr=document.getElementById('ln-cmd-frac');
    if(cf) cf.style.width=gs.pct+'%'; if(cp) cp.textContent=gs.pct+'%'; if(cfr) cfr.textContent=gs.done+' / '+gs.total+' artigos';
    // Update sidebar ring
    const sideRing=document.querySelector('.ln-side-item.active .ln-side-ring');
    if(sideRing) sideRing.innerHTML=ringHtml(s.pct,10,22);
    const sideMeta=document.querySelector('.ln-side-item.active .ln-side-meta');
    if(sideMeta) sideMeta.textContent=s.done+'/'+s.total+' · '+s.pct+'%';
  };

  window.lnDoMarkAll = function(id,state) {
    lnMarkAll(id,state);
    document.querySelectorAll('.ln-art-chip').forEach(c=>c.classList.toggle('done',state));
    const s=lnStats(id),col=lnColor(s.pct);
    const fill=document.getElementById('ln-prog-fill'),lbl=document.getElementById('ln-prog-label');
    if(fill){fill.style.width=s.pct+'%';fill.style.background=col;}
    if(lbl) lbl.textContent=s.done+' / '+s.total+' artigos · '+s.pct+'%';
  };

  /* ── BLOCO ACTIONS ──────────────────────────────────────────────── */
  window.lnAddBloco = function() {
    if (!LN.editBlocos) LN.editBlocos = JSON.parse(JSON.stringify(lnGetBlocos()));
    if (!LN.editLeis)   LN.editLeis   = JSON.parse(JSON.stringify(lnGetLeis()));
    LN.editBlocos.push({ id: 'bloco_'+Date.now(), name: 'Novo bloco', leisIds: [] });
    renderEdit();
    // Focus new bloco name
    setTimeout(() => {
      const inputs = document.querySelectorAll('.ln-edit-bloco-name');
      if (inputs.length) inputs[inputs.length-1].select();
    }, 50);
  };

  window.lnRenameBlocoInput = function(blocoId, val) {
    if (!LN.editBlocos) return;
    const b = LN.editBlocos.find(b=>b.id===blocoId);
    if (b) b.name = val;
  };

  window.lnDelBloco = function(blocoId) {
    if (!LN.editBlocos) return;
    const idx = LN.editBlocos.findIndex(b=>b.id===blocoId);
    if (idx > -1) LN.editBlocos.splice(idx, 1);
    renderEdit();
  };

  window.lnAddLei = function() {
    if (!LN.editLeis)   LN.editLeis   = JSON.parse(JSON.stringify(lnGetLeis()));
    if (!LN.editBlocos) LN.editBlocos = JSON.parse(JSON.stringify(lnGetBlocos()));
    LN.editLeis.push({ id:'lei_'+Date.now(), name:'Nova Lei', arts:Array.from({length:10},(_,i)=>i+1) });
    renderEdit();
  };

  window.lnDelLei = function(leiId) {
    if (!LN.editLeis) return;
    LN.editLeis = LN.editLeis.filter(l=>l.id!==leiId);
    if (LN.editBlocos) LN.editBlocos.forEach(b=>{ b.leisIds=(b.leisIds||[]).filter(id=>id!==leiId); });
    renderEdit();
  };

  window.lnEditSave = function() {
    if (!LN.editLeis) return;
    lnSaveAll(LN.editLeis, LN.editBlocos || []);
    LN.editLeis=null; LN.editBlocos=null; LN.activeLawId=null; LN.view='overview';
    lnRender();
    try { if (typeof P01UI !== 'undefined') P01UI.notify('Alterações salvas', 'success'); } catch(e) {}
  };

  window.lnEditCancel = function() {
    LN.editLeis=null; LN.editBlocos=null; LN.view='overview'; lnRender();
  };

  /* ── DRAG: LEI between blocos ───────────────────────────────────── */
  /* ── Drag: lei rows (reorder list) ───────────────────────────── */
  window.lnDragStartLeiRow = function(e, i) {
    LN.dragItem = { type:'row', idx:i };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(i));
    requestAnimationFrame(()=>{ const el=e.currentTarget; if(el) el.classList.add('ln-drag-dragging'); });
  };
  window.lnDragOverLeiRow = function(e, i) {
    if (!LN.dragItem || LN.dragItem.type!=='row') return;
    e.preventDefault();
    document.querySelectorAll('.ln-lei-row.ln-drag-over').forEach(el=>el.classList.remove('ln-drag-over'));
    if (i !== LN.dragItem.idx) { const el=e.currentTarget; if(el) el.classList.add('ln-drag-over'); }
  };
  window.lnDropLeiRow = function(e, targetIdx) {
    e.preventDefault();
    if (!LN.dragItem || LN.dragItem.type!=='row') return;
    const srcIdx = LN.dragItem.idx;
    if (srcIdx !== targetIdx) {
      const [moved] = LN.editLeis.splice(srcIdx, 1);
      LN.editLeis.splice(targetIdx, 0, moved);
    }
    LN.dragItem = null;
    renderEdit();
  };
  window.lnDragEndLeiRow = function(e) {
    document.querySelectorAll('.ln-lei-row.ln-drag-dragging,.ln-lei-row.ln-drag-over').forEach(el=>{
      el.classList.remove('ln-drag-dragging','ln-drag-over');
    });
    LN.dragItem = null;
  };

  /* ── Lei name/arts editing ─────────────────────────────────── */
  window.lnEditLeiName = function(i, val) {
    if (LN.editLeis && LN.editLeis[i]) LN.editLeis[i].name = val;
  };
  window.lnEditLeiArts = function(i, val) {
    if (!LN.editLeis || !LN.editLeis[i]) return;
    const m = val.match(/^(\d+)\s*[–\-]\s*(\d+)$/);
    if (m) {
      const s=+m[1], e=+m[2];
      if (e >= s) LN.editLeis[i].arts = Array.from({length:e-s+1},(_,k)=>k+s);
    } else {
      const n = parseInt(val);
      if (!isNaN(n) && n > 0) LN.editLeis[i].arts = [n];
    }
  };

  window.lnDragStartLei = function(e, leiId, srcBlocoId) {
    LN.dragItem = { type:'lei', id:leiId, srcBlocoId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leiId);
    requestAnimationFrame(()=>{ const el=e.currentTarget; if(el) el.classList.add('ln-drag-dragging'); });
  };

  window.lnDragEndLei = function(e) {
    document.querySelectorAll('.ln-drag-dragging,.ln-drag-over-bloco').forEach(el=>{
      el.classList.remove('ln-drag-dragging','ln-drag-over-bloco');
    });
    LN.dragItem = null;
  };

  window.lnDragOverBloco = function(e, blocoId) {
    if (!LN.dragItem) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Highlight bloco drop target
    document.querySelectorAll('.ln-drag-over-bloco').forEach(el=>el.classList.remove('ln-drag-over-bloco'));
    const bloco = document.getElementById('ln-bloco-'+blocoId) || document.getElementById('ln-bloco-card-'+blocoId);
    if (bloco) bloco.classList.add('ln-drag-over-bloco');
  };

  window.lnDropOnBloco = function(e, targetBlocoId) {
    e.preventDefault();
    if (!LN.dragItem || !LN.editBlocos) return;

    if (LN.dragItem.type === 'lei') {
      const leiId = LN.dragItem.id;
      const srcId = LN.dragItem.srcBlocoId;

      // Remove from source bloco
      if (srcId !== '__unassigned__') {
        const src = LN.editBlocos.find(b=>b.id===srcId);
        if (src) src.leisIds = (src.leisIds||[]).filter(id=>id!==leiId);
      }
      // Add to target bloco
      if (targetBlocoId !== '__unassigned__') {
        const tgt = LN.editBlocos.find(b=>b.id===targetBlocoId);
        if (tgt && !(tgt.leisIds||[]).includes(leiId)) {
          if (!tgt.leisIds) tgt.leisIds = [];
          tgt.leisIds.push(leiId);
        }
      }
      LN.dragItem = null;
      renderEdit();

    } else if (LN.dragItem.type === 'bloco') {
      // Reorder blocos
      const srcId  = LN.dragItem.id;
      const srcIdx = LN.editBlocos.findIndex(b=>b.id===srcId);
      const tgtIdx = LN.editBlocos.findIndex(b=>b.id===targetBlocoId);
      if (srcIdx>-1 && tgtIdx>-1 && srcIdx!==tgtIdx) {
        const [moved] = LN.editBlocos.splice(srcIdx,1);
        LN.editBlocos.splice(tgtIdx,0,moved);
      }
      LN.dragItem = null;
      renderEdit();
    }
  };

  /* ── DRAG: BLOCO reorder ────────────────────────────────────────── */
  window.lnDragStartBloco = function(e, blocoId) {
    // Only drag from the grip handle area, not from inner elements
    if (e.target.closest('.ln-edit-bloco-leis') || e.target.closest('.ln-edit-lei-chip')) {
      e.stopPropagation();
      return;
    }
    LN.dragItem = { type:'bloco', id:blocoId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blocoId);
    requestAnimationFrame(()=>{
      const el = document.getElementById('ln-bloco-card-'+blocoId);
      if (el) el.classList.add('ln-bloco-dragging');
    });
  };

  window.lnDragEndBloco = function(e) {
    document.querySelectorAll('.ln-bloco-dragging,.ln-drag-over-bloco').forEach(el=>{
      el.classList.remove('ln-bloco-dragging','ln-drag-over-bloco');
    });
    LN.dragItem = null;
  };

  /* ── BOOTSTRAP ──────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function() {
    const _orig=window.goTab;
    if(typeof _orig==='function') window.goTab=function(id){_orig(id);if(id==='leitura'){try{if(document.getElementById('ln-main')) lnRender(); else setTimeout(lnBuild,30);}catch(e){console.warn('[leitura-next] goTab error:',e);}}};
    const _oc=window.concTrocar;
    if(typeof _oc==='function') window.concTrocar=function(id){
      // Limpar working copies ao trocar concurso — evita dados stale de outro concurso
      LN.editLeis=null; LN.editBlocos=null;
      _oc(id);
      const t=document.getElementById('tab-leitura');
      if(t&&t.classList.contains('active')){LN.activeLawId=null;LN.view='overview';setTimeout(lnBuild,80);}
    };
    setTimeout(()=>{const t2=document.getElementById('tab-leitura');if(t2&&t2.classList.contains('active')) lnBuild();},120);
  });

})();

/* ════════════════════════════════════════════════════════════════════
 * simulados-v2.js — PROTOCOLO 01 · Simulados V2
 * Centro de Inteligência de Performance — P01 Core Engine
 * ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── STATE ─────────────────────────────────────────────────────── */
  const S2 = {
    view:      'overview',  // 'overview' | 'historico' | 'disciplinas' | 'analise'
    editId:    null,        // id being edited (null = new)
    modalOpen: false,
  };

  /* ══════════════════════════════════════════════════════════════════
   * STORAGE
   * ══════════════════════════════════════════════════════════════════ */
  function _concId() {
    try { return localStorage.getItem('protocolo_concurso_ativo') || 'default'; }
    catch(e) { return 'default'; }
  }
  function _storeKey() { return 'sim2_' + _concId(); }

  function s2Load() {
    try { return JSON.parse(localStorage.getItem(_storeKey()) || '[]'); }
    catch(e) { return []; }
  }
  function s2Save(arr) {
    try { localStorage.setItem(_storeKey(), JSON.stringify(arr)); } catch(e) {}
  }
  function s2GenId() { return 's' + Date.now() + Math.random().toString(36).slice(2,6); }

  /* ── CALCULATIONS ───────────────────────────────────────────────── */
  function calcSim(sim) {
    const modelo = sim.gabarito && sim.gabarito.modelo ? sim.gabarito.modelo : 'ABCDE';
    const resAluno = sim.gabarito && sim.gabarito.respostasAluno   ? sim.gabarito.respostasAluno   : [];
    const resOfi   = sim.gabarito && sim.gabarito.respostasOficiais ? sim.gabarito.respostasOficiais : [];

    // HOTFIX BUG 2 — SIMULADO MANUAL
    // Detectar se é modo manual: gabarito oficial vazio E respostas do aluno são todas '?' (não preenchidas)
    // Quando o usuário não usa o gabarito visual mas preenche acertos/erros/brancos manualmente,
    // resAluno fica com ['?','?',...] e resOfi fica vazio. Nesse caso devemos usar os campos manuais.
    const resOfiVazio = resOfi.length === 0 || resOfi.every(function(r) { return !r || r.trim() === ''; });
    const resAlunoSemResposta = resAluno.length === 0 || resAluno.every(function(r) {
      var v = (r || '').trim().toUpperCase();
      return !v || v === '?' || v === '';
    });
    const modoManual = resOfiVazio && resAlunoSemResposta;

    let acertos = 0, erros = 0, brancos = 0;

    if (modoManual) {
      // Usar valores manuais diretamente — não passar pelo loop do gabarito
      acertos = parseInt(sim.acertos) || 0;
      erros   = parseInt(sim.erros)   || 0;
      brancos = parseInt(sim.brancos) || 0;
    } else {
      const n = Math.max(resAluno.length, resOfi.length, sim.totalQuestoes || 0);
      for (let i = 0; i < n; i++) {
        const al = (resAluno[i] || '').trim().toUpperCase();
        const of = (resOfi[i]   || '').trim().toUpperCase();
        if (!al || al === 'B' || al === 'BRANCO') { brancos++; }
        else if (al === of) { acertos++; }
        else { erros++; }
      }
      // Fallback: se ainda sem gabarito oficial, usar manuais
      if (resOfiVazio) {
        acertos = parseInt(sim.acertos) || 0;
        erros   = parseInt(sim.erros)   || 0;
        brancos = parseInt(sim.brancos) || (sim.totalQuestoes ? Math.max(0, sim.totalQuestoes - acertos - erros) : 0);
      }
    }

    let pontos;
    if (modelo === 'CESPE') {
      pontos = acertos - erros;
    } else {
      pontos = acertos;
    }

    // HOTFIX: usar totalQuestoes como denominador quando disponível
    // Isso garante que 90 acertos em prova de 120 = 75%, não 100%
    const totalQuestoes = parseInt(sim.totalQuestoes) || (acertos + erros + brancos);
    const total     = acertos + erros + brancos;
    const aproveit  = totalQuestoes > 0 ? Math.round(acertos / totalQuestoes * 100) : 0;
    const tempoPQ   = (sim.duracaoMin && totalQuestoes) ? +(sim.duracaoMin / totalQuestoes).toFixed(1) : 0;

    return { acertos, erros, brancos, pontos, total, totalQuestoes, aproveit, tempoPQ };
  }

  function domColor(pct) {
    if (pct === 0)  return 'var(--s2-text3)';
    if (pct >= 80)  return 'var(--s2-green)';
    if (pct >= 60)  return 'var(--s2-amber)';
    if (pct >= 40)  return 'var(--s2-gold)';
    return 'var(--s2-red)';
  }

  function esc(s) {
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function formatTempo(min) {
    if (!min || min <= 0) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return m + 'min';
    if (m === 0) return h + 'h';
    return h + 'h ' + m + 'min';
  }


  /* ── ANALYTICS ──────────────────────────────────────────────────── */
  function computeStats(sims) {
    if (!sims.length) return null;
    const calc = sims.map(function(s) { return Object.assign({}, s, calcSim(s)); });
    const withResult = calc.filter(function(s) { return (s.total > 0) || (s.totalQuestoes > 0); });
    if (!withResult.length) return null;

    const aprovs = withResult.map(function(s) { return s.aproveit; });
    const notas  = withResult.map(function(s) { return s.pontos; });
    const media  = Math.round(aprovs.reduce(function(a,b){ return a+b; },0) / aprovs.length);
    const mediaNotas = Math.round(notas.reduce(function(a,b){ return a+b; },0) / notas.length);
    const melhor = Math.max.apply(null, aprovs);
    const melhorNota = Math.max.apply(null, notas);
    const melhorSim  = withResult.reduce(function(best, s) { return s.pontos > (best?best.pontos:0) ? s : best; }, null);
    const pior   = Math.min.apply(null, aprovs);
    const totalQ = calc.reduce(function(a,s){ return a+(s.total||0); }, 0);
    const totalMin = calc.reduce(function(a,s){ return a+(parseInt(s.duracaoMin)||0); }, 0);

    // Best streak
    let streak = 0, maxStreak = 0, prev = null;
    withResult.slice().sort(function(a,b){ return new Date(a.data)-new Date(b.data); }).forEach(function(s) {
      if (s.aproveit >= media) { streak++; if (streak > maxStreak) maxStreak = streak; }
      else streak = 0;
    });

    // Discipline aggregation
    const discMap = {};
    calc.forEach(function(s) {
      (s.materias || []).forEach(function(m) {
        if (!discMap[m.nome]) discMap[m.nome] = { feitas:0, erros:0, count:0 };
        discMap[m.nome].feitas += parseInt(m.feitas) || 0;
        discMap[m.nome].erros  += parseInt(m.erros)  || 0;
        discMap[m.nome].count  += 1;
      });
    });
    const discs = Object.keys(discMap).map(function(n) {
      const d = discMap[n];
      const pct = d.feitas > 0 ? Math.round((d.feitas - d.erros) / d.feitas * 100) : 0;
      return { nome:n, feitas:d.feitas, erros:d.erros, pct:pct };
    }).sort(function(a,b){ return b.feitas-a.feitas; });

    return { calc, withResult, media, mediaNotas, melhor, melhorNota, melhorSim, pior,
             totalQ, totalMin, maxStreak, discs, total: sims.length, aprovs };
  }

  /* ══════════════════════════════════════════════════════════════════
   * VIEW: OVERVIEW
   * ══════════════════════════════════════════════════════════════════ */
  function viewOverview(sims) {
    const st = computeStats(sims);
    if (!sims.length || !st) {
      return '<div class="s2-empty">' +
        '<div class="s2-empty-icon">🎯</div>' +
        '<div class="s2-empty-title">Nenhum simulado registrado</div>' +
        '<div class="s2-empty-sub">Registre seu primeiro simulado para ver a inteligência de performance.</div>' +
        '</div>';
    }

    const last6 = st.withResult.slice(-6);
    const sparkHtml = (function() {
      if (last6.length < 2) return '';
      const max = Math.max.apply(null, last6.map(function(s){ return s.aproveit; }));
      return '<div class="s2-sparkline">' +
        last6.map(function(s) {
          const h = Math.max(4, Math.round(s.aproveit / (max||1) * 56));
          const col = domColor(s.aproveit);
          return '<div class="s2-spark-col">' +
            '<div class="s2-spark-bar" style="height:'+h+'px;background:'+col+'" title="'+s.aproveit+'%"></div>' +
            '<div class="s2-spark-label">' + s.aproveit + '%</div>' +
          '</div>';
        }).join('') +
      '</div>';
    })();

    const melhorLabel = st.melhorSim
      ? st.melhorNota + '/' + (st.melhorSim.total||st.melhorSim.totalQuestoes||'?') + ' pts'
      : st.melhorNota + ' pts';
    const kpis = [
      { label:'Total Simulados',     val:st.total,        sup:'',    sub:'registrados', c:'var(--s2-blue)' },
      { label:'Média de Aproveitamento', val:st.media,    sup:'%',   sub:'acertos / total respondidas', c:domColor(st.media) },
      { label:'Média de Pontos',     val:st.mediaNotas,   sup:' pts',sub:'média de pontos brutos', c:domColor(st.media) },
      { label:'Melhor Resultado',    val:st.melhorNota,   sup:' pts', sub:'em '+st.melhor+'% de aproveitamento', c:'var(--s2-green)' },
      { label:'Total Questões',      val:st.totalQ,       sup:'',    sub:formatTempo(st.totalMin)+' simuladas', c:'var(--s2-gold)' },
    ];

    const kpiHtml = '<div class="s2-kpi-row">' +
      kpis.map(function(k) {
        return '<div class="s2-kpi" style="--s2-kpi-c:'+k.c+'">' +
          '<div class="s2-kpi-label">'+esc(k.label)+'</div>' +
          '<div class="s2-kpi-val">'+k.val+'<sup>'+k.sup+'</sup></div>' +
          '<div class="s2-kpi-sub">'+esc(k.sub)+'</div>' +
        '</div>';
      }).join('') +
    '</div>';

    // Worst disciplines
    const worstDiscs = st.discs.filter(function(d){ return d.feitas>=3; }).sort(function(a,b){ return a.pct-b.pct; }).slice(0,5);
    const discHtml = worstDiscs.length ? worstDiscs.map(function(d) {
      const col = domColor(d.pct);
      return '<div class="s2-disc-item">' +
        '<div class="s2-disc-name">'+esc(d.nome)+'</div>' +
        '<div class="s2-disc-track"><div class="s2-disc-fill" style="width:'+d.pct+'%;background:'+col+'"></div></div>' +
        '<div class="s2-disc-pct" style="color:'+col+'">'+d.pct+'%</div>' +
        '<div class="s2-disc-frac">'+d.feitas+'Q</div>' +
      '</div>';
    }).join('') : '<div style="font-size:.68rem;color:var(--s2-text3);padding:.5rem 0">Registre disciplinas nos simulados para ver fraquezas</div>';

    // Last 3 sims
    const recent = st.calc.slice(-3).reverse();
    const recentHtml = recent.map(function(s) {
      const col = domColor(s.aproveit);
      return '<div class="s2-hist-item" onclick="s2OpenModal(\''+s.id+'\')">' +
        '<div class="s2-hist-date">'+(s.data ? new Date(s.data).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) : '—')+'</div>' +
        '<div class="s2-hist-name">'+esc(s.nome||'Simulado')+'</div>' +
        (s.plataforma ? '<div class="s2-hist-plat">'+esc(s.plataforma)+'</div>' : '') +
        (s.banca      ? '<div class="s2-hist-banca">'+esc(s.banca)+'</div>'     : '') +
        (s.duracaoMin?'<div style="font-size:.55rem;color:var(--s2-text3);flex-shrink:0">'+formatTempo(s.duracaoMin)+'</div>':'') +
        '<div class="s2-hist-nota" style="color:'+col+'">'+s.pontos+'/'+(s.totalQuestoes||s.total)+' <span>pts</span></div>' +
        '<div class="s2-hist-track"><div class="s2-hist-fill" style="width:'+s.aproveit+'%;background:'+col+'"></div></div>' +
        '<div class="s2-hist-score" style="color:'+col+'">'+s.aproveit+'%</div>' +
      '</div>';
    }).join('');

    return kpiHtml +
      '<div class="s2-section">Evolução do Aproveitamento</div>' +
      '<div class="s2-cols-3">' +
        '<div class="s2-panel">' +
          '<div class="s2-panel-hdr"><div class="s2-panel-title">Últimos '+last6.length+' simulados</div></div>' +
          '<div class="s2-panel-body">' + (sparkHtml || '<div style="font-size:.68rem;color:var(--s2-text3)">Precisa de pelo menos 2 simulados</div>') + '</div>' +
        '</div>' +
        '<div class="s2-panel">' +
          '<div class="s2-panel-hdr"><div class="s2-panel-title">Disciplinas mais fracas</div></div>' +
          '<div class="s2-panel-body"><div class="s2-disc-list">'+discHtml+'</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="s2-section">Simulados Recentes</div>' +
      '<div class="s2-panel"><div class="s2-hist-list">'+recentHtml+'</div></div>';
  }

  /* ══════════════════════════════════════════════════════════════════
   * VIEW: HISTÓRICO
   * ══════════════════════════════════════════════════════════════════ */
  function viewHistorico(sims) {
    if (!sims.length) {
      return '<div class="s2-empty"><div class="s2-empty-icon">📋</div>' +
        '<div class="s2-empty-title">Histórico vazio</div>' +
        '<div class="s2-empty-sub">Registre simulados para ver o histórico completo.</div>' +
        '</div>';
    }

    const calc = sims.map(function(s){ return Object.assign({}, s, calcSim(s)); });
    const sorted = calc.slice().sort(function(a,b){ return new Date(b.data||0)-new Date(a.data||0); });

    return '<div class="s2-panel"><div class="s2-hist-list">' +
      sorted.map(function(s) {
        const col = domColor(s.aproveit);
        return '<div class="s2-hist-item" onclick="s2OpenModal(\''+s.id+'\',true)">' +
          '<div class="s2-hist-date">'+(s.data ? new Date(s.data).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—')+'</div>' +
          '<div class="s2-hist-name">'+esc(s.nome||'Simulado')+'</div>' +
          (s.plataforma ? '<div class="s2-hist-plat">'+esc(s.plataforma)+'</div>' : '') +
          (s.banca ? '<div class="s2-hist-banca">'+esc(s.banca)+'</div>' : '') +
          '<div style="font-size:.58rem;color:var(--s2-text3);flex-shrink:0">'+(s.total||0)+'Q · '+formatTempo(s.duracaoMin)+'</div>' +
          '<div class="s2-hist-nota" style="color:'+col+'">'+s.pontos+'/'+(s.totalQuestoes||s.total)+'<span>pts</span></div>' +
          '<div class="s2-hist-track" style="width:50px"><div class="s2-hist-fill" style="width:'+s.aproveit+'%;background:'+col+'"></div></div>' +
          '<div class="s2-hist-score" style="color:'+col+'">'+s.aproveit+'%</div>' +
        '</div>';
      }).join('') +
    '</div></div>';
  }

  /* ══════════════════════════════════════════════════════════════════
   * VIEW: DISCIPLINAS
   * ══════════════════════════════════════════════════════════════════ */
  function viewDisciplinas(sims) {
    const st = computeStats(sims);
    if (!st || !st.discs.length) {
      return '<div class="s2-empty"><div class="s2-empty-icon">📊</div>' +
        '<div class="s2-empty-title">Sem dados de disciplinas</div>' +
        '<div class="s2-empty-sub">Informe as matérias ao registrar simulados para ver o radar de disciplinas.</div></div>';
    }

    const best5  = st.discs.filter(function(d){ return d.feitas>=2; }).slice().sort(function(a,b){ return b.pct-a.pct; }).slice(0,8);
    const worst5 = st.discs.filter(function(d){ return d.feitas>=2; }).slice().sort(function(a,b){ return a.pct-b.pct; }).slice(0,8);

    function discList(items, title) {
      return '<div class="s2-panel">' +
        '<div class="s2-panel-hdr"><div class="s2-panel-title">'+title+'</div></div>' +
        '<div class="s2-panel-body"><div class="s2-disc-list">' +
        items.map(function(d) {
          const col = domColor(d.pct);
          return '<div class="s2-disc-item">' +
            '<div class="s2-disc-name">'+esc(d.nome)+'</div>' +
            '<div class="s2-disc-track"><div class="s2-disc-fill" style="width:'+d.pct+'%;background:'+col+'"></div></div>' +
            '<div class="s2-disc-pct" style="color:'+col+'">'+d.pct+'%</div>' +
            '<div class="s2-disc-frac">'+d.feitas+'Q</div>' +
          '</div>';
        }).join('') +
        '</div></div></div>';
    }

    return '<div class="s2-cols-2">' +
        discList(best5,  'Pontos Fortes') +
        discList(worst5, 'Zona Fraca — Priorizar') +
    '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════
   * VIEW: ANÁLISE (Insights)
   * ══════════════════════════════════════════════════════════════════ */
  function viewAnalise(sims) {
    const st = computeStats(sims);
    if (!st) {
      return '<div class="s2-empty"><div class="s2-empty-icon">🧠</div>' +
        '<div class="s2-empty-title">Sem dados suficientes</div>' +
        '<div class="s2-empty-sub">Registre pelo menos 2 simulados para ver análise automática.</div></div>';
    }

    const insights = [];
    const w = st.withResult;

    // Trend: last 3 vs previous 3
    if (w.length >= 6) {
      const last3  = w.slice(-3).reduce(function(a,s){ return a+s.aproveit; },0)/3;
      const prev3  = w.slice(-6,-3).reduce(function(a,s){ return a+s.aproveit; },0)/3;
      const delta  = Math.round(last3 - prev3);
      if (delta >= 5)  insights.push({ icon:'📈', c:'var(--s2-green)', title:'Tendência positiva', desc:'Seus últimos 3 simulados tiveram média '+ Math.round(last3)+'%, uma melhora de +'+delta+'% em relação aos 3 anteriores.' });
      else if (delta <= -5) insights.push({ icon:'📉', c:'var(--s2-red)', title:'Tendência de queda', desc:'Seus últimos 3 simulados tiveram média '+Math.round(last3)+'%, uma queda de '+Math.abs(delta)+'% em relação aos anteriores.' });
      else insights.push({ icon:'➡️', c:'var(--s2-text3)', title:'Desempenho estável', desc:'Média dos últimos 3: '+Math.round(last3)+'%. Sem variação significativa.' });
    }

    // Best/worst discipline
    const weak = st.discs.filter(function(d){ return d.feitas>=3; }).sort(function(a,b){ return a.pct-b.pct; })[0];
    const strong = st.discs.filter(function(d){ return d.feitas>=3; }).sort(function(a,b){ return b.pct-a.pct; })[0];
    if (weak)   insights.push({ icon:'⚠️', c:'var(--s2-red)',   title:'Fraqueza: '+weak.nome,   desc:'Aproveitamento de '+weak.pct+'% em '+weak.feitas+' questões. Merece revisão prioritária.' });
    if (strong) insights.push({ icon:'💪', c:'var(--s2-green)', title:'Força: '+strong.nome,    desc:'Aproveitamento de '+strong.pct+'% em '+strong.feitas+' questões. Ponto consolidado.' });

    // Approval readiness
    if (st.media >= 70) insights.push({ icon:'🎯', c:'var(--s2-green)', title:'Aproveitamento acima de 70%', desc:'Sua média geral de '+st.media+'% está em zona de aprovação. Mantenha o ritmo.' });
    else if (st.media >= 50) insights.push({ icon:'📚', c:'var(--s2-amber)', title:'Zona de atenção — '+st.media+'% de média', desc:'Você precisa crescer ~'+(70-st.media)+'% para atingir a zona de aprovação.' });
    else insights.push({ icon:'🔧', c:'var(--s2-red)', title:'Abaixo de 50% de média', desc:'Revise o plano de estudos. Foque nas disciplinas com pior aproveitamento.' });

    // Volume
    if (st.totalQ > 500) insights.push({ icon:'🏋️', c:'var(--s2-blue)', title:'Volume sólido', desc:'Você já simulou '+st.totalQ+' questões — '+Math.round(st.totalMin/60)+'h de prova real.' });
    else insights.push({ icon:'⏱️', c:'var(--s2-gold)', title:'Aumente o volume', desc:'Você tem '+st.totalQ+' questões simuladas. Aumente a frequência de simulados.' });

    return '<div class="s2-feed">' +
      insights.map(function(i) {
        return '<div class="s2-feed-item" style="--s2-fi-c:'+i.c+'">' +
          '<div class="s2-feed-icon">'+i.icon+'</div>' +
          '<div><div class="s2-feed-title">'+esc(i.title)+'</div><div class="s2-feed-desc">'+esc(i.desc)+'</div></div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════
   * MODAL — Create / Edit simulado
   * ══════════════════════════════════════════════════════════════════ */
  function buildModal(sim, readOnly) {
    sim = sim || {};
    const isEdit = !!sim.id;
    const modelo = sim.gabarito && sim.gabarito.modelo ? sim.gabarito.modelo : 'ABCDE';
    const nQ = parseInt(sim.totalQuestoes) || 0;

    // Materias rows — supports range (q1-q20), list (q1,q5,q12), or manual
    const mats = sim.materias || [];
    function matRow(m, i) {
      const modoRange  = m.modo === 'range';
      const modoAvulso = m.modo === 'avulso';
      const modoManual = !m.modo || m.modo === 'manual';
      return '<div class="s2-mat-card" id="sim2-mat-card-'+i+'">' +
        // Header: name + mode selector + remove
        '<div class="s2-mat-header">' +
          '<div class="s2-mat-nome">'+esc(m.nome)+'</div>' +
          '<div class="s2-mat-modes">' +
            '<button class="s2-mat-mode-btn'+(modoRange?' active':'')+'" onclick="s2MatMode('+i+',&quot;range&quot;)"  title="Range">Q1–Qn</button>' +
            '<button class="s2-mat-mode-btn'+(modoAvulso?' active':'')+'" onclick="s2MatMode('+i+',&quot;avulso&quot;)" title="Avulsas">Avulso</button>' +
            '<button class="s2-mat-mode-btn'+(modoManual?' active':'')+'" onclick="s2MatMode('+i+',&quot;manual&quot;)" title="Manual">Manual</button>' +
          '</div>' +
          '<button class="s2-mat-remove" onclick="s2RemoveMateria('+i+')" title="Remover">✕</button>' +
        '</div>' +
        // Mode content
        '<div class="s2-mat-body" id="sim2-mat-body-'+i+'">' +
          (modoRange ?
            // Range mode: from Q — to Q
            '<div class="s2-mat-range">' +
              '<span class="s2-mat-range-label">Da questão</span>' +
              '<input class="s2-mat-range-inp" type="number" min="1" id="sim2-mat-qini-'+i+'" value="'+(m.qIni||1)+'" placeholder="1">' +
              '<span class="s2-mat-range-label">até</span>' +
              '<input class="s2-mat-range-inp" type="number" min="1" id="sim2-mat-qfim-'+i+'" value="'+(m.qFim||'')+'" placeholder="20">' +
              '<span class="s2-mat-range-info" id="sim2-mat-rinfo-'+i+'">'+(m.qIni&&m.qFim ? (m.qFim-m.qIni+1)+' questões' : '')+'</span>' +
            '</div>'
          : modoAvulso ?
            // Avulso mode: comma separated question numbers
            '<div class="s2-mat-avulso">' +
              '<input class="s2-mat-avulso-inp" type="text" id="sim2-mat-qlist-'+i+'" ' +
                'value="'+(m.questoes||'')+'" placeholder="Ex: 1, 5, 12, 18, 23 ..." ' +
                'oninput="s2MatAvulsoUpdate('+i+',this.value)">' +
              '<span class="s2-mat-avulso-count" id="sim2-mat-acount-'+i+'">' +
                (m.questoes ? m.questoes.split(',').filter(function(x){return x.trim();}).length+' questões' : '') +
              '</span>' +
            '</div>'
          :
            // Manual mode: acertos / erros / brancos
            '<div class="s2-mat-manual">' +
              '<div class="s2-mat-manual-field">' +
                '<span class="s2-mat-manual-label">Feitas</span>' +
                '<input class="s2-materia-inp" type="number" min="0" id="sim2-mat-f-'+i+'" value="'+(m.feitas||0)+'">' +
              '</div>' +
              '<div class="s2-mat-manual-field">' +
                '<span class="s2-mat-manual-label" style="color:rgba(248,81,73,.7)">Erros</span>' +
                '<input class="s2-materia-inp" type="number" min="0" id="sim2-mat-e-'+i+'" value="'+(m.erros||0)+'" style="border-color:rgba(248,81,73,.2)">' +
              '</div>' +
              '<div class="s2-mat-manual-field">' +
                '<span class="s2-mat-manual-label" style="color:rgba(255,255,255,.3)">Brancos</span>' +
                '<input class="s2-materia-inp" type="number" min="0" id="sim2-mat-b-'+i+'" value="'+(m.brancos||0)+'">' +
              '</div>' +
            '</div>'
          ) +
        '</div>' +
      '</div>';
    }
    const matsHtml = mats.length
      ? mats.map(function(m,i){ return matRow(m,i); }).join('')
      : '<div style="font-size:.68rem;color:rgba(255,255,255,.28);padding:.4rem 0">Clique em "+ Matéria" para adicionar</div>';

    // Gabarito grid
    const gabHtml = nQ > 0 ? (function() {
      const resA = sim.gabarito && sim.gabarito.respostasAluno   ? sim.gabarito.respostasAluno   : [];
      const resO = sim.gabarito && sim.gabarito.respostasOficiais ? sim.gabarito.respostasOficiais : [];
      const opts = modelo === 'CESPE' ? ['C','E',''] : ['A','B','C','D','E',''];
      let h = '<div class="s2-gabarito-grid">';
      for (let i = 0; i < nQ; i++) {
        h += '<div class="s2-gab-cell">' +
          '<div class="s2-gab-num">'+(i+1)+'</div>' +
          '<input class="s2-gab-inp" id="sim2-aluno-'+i+'" maxlength="1" placeholder="?"  value="'+(resA[i]||'')+'" title="Sua resposta">' +
          '<input class="s2-gab-inp" id="sim2-ofic-'+i+'"  maxlength="1" placeholder="Gab" value="'+(resO[i]||'')+'" title="Gabarito oficial" style="border-color:rgba(88,166,255,.2)">' +
        '</div>';
      }
      return h + '</div>';
    })() : '<div style="font-size:.68rem;color:var(--s2-text3)">Informe o total de questões para inserir gabarito</div>';

    const html =
      '<div class="s2-modal-hdr">' +
        '<div class="s2-modal-title">'+(isEdit ? 'Editar Simulado' : 'Novo Simulado')+'</div>' +
        '<button class="s2-modal-close" onclick="s2CloseModal()">✕</button>' +
      '</div>' +
      '<div class="s2-modal-body">' +
        '<div class="s2-form-row">' +
          '<div class="s2-field"><div class="s2-field-label">Nome</div><input id="sim2-nome" type="text" placeholder="Ex: Simulado CESPE PMAL 2026 #3" value="'+esc(sim.nome||'')+'"></div>' +
          '<div class="s2-field"><div class="s2-field-label">Data</div><input id="sim2-data" type="date" value="'+(sim.data||new Date().toISOString().slice(0,10))+'"></div>' +
        '</div>' +
        '<div class="s2-form-row thirds">' +
          '<div class="s2-field"><div class="s2-field-label">Plataforma</div>' +
            '<select id="sim2-plataforma" onchange="s2PlatChange(this.value)">' +
              '<option value="">— Selecionar —</option>' +
              ['TEC Concursos','QConcursos','Estratégia','CERS','Gran Cursos','PDF / Impresso','Cursinho','Prova Anterior','Outro'].map(function(p){ return '<option value="'+p+'" '+(sim.plataforma===p?'selected':'')+'>'+p+'</option>'; }).join('') +
            '</select>' +
            '<input id="sim2-plataforma-outro" type="text" placeholder="Qual plataforma?" ' +
              'style="margin-top:.35rem;display:'+(sim.plataforma==='Outro'?'block':'none')+'" ' +
              'value="'+(sim.plataforma==='Outro'&&sim.plataformaCustom ? esc(sim.plataformaCustom) : '')+'">' +
            '</div>' +
          '<div class="s2-field"><div class="s2-field-label">Banca</div>' +
            '<select id="sim2-banca"><option value="">— Selecionar —</option>' +
            ['CEBRASPE','CESPE','FGV','VUNESP','AOCP','FCC','IBFC','IBGE','IDECAN','IADES','COSEAC','FUNCAB','QUADRIX','Outro'].map(function(b){ return '<option value="'+b+'" '+(sim.banca===b?'selected':'')+'>'+b+'</option>'; }).join('') +
            '</select></div>' +
          '<div class="s2-field"><div class="s2-field-label">Modelo</div>' +
            '<select id="sim2-modelo">' +
            ['ABCDE','ABCD','CESPE'].map(function(m){ return '<option value="'+m+'" '+(modelo===m?'selected':'')+'>'+m+'</option>'; }).join('') +
            '</select></div>' +
        '</div>' +
        '<div class="s2-form-row thirds">' +
          '<div class="s2-field"><div class="s2-field-label">Total de Questões</div><input id="sim2-total" type="number" min="0" value="'+(sim.totalQuestoes||0)+'" oninput="s2UpdateGab(this.value)"></div>' +
          '<div class="s2-field"><div class="s2-field-label">Duração (min)</div><input id="sim2-duracao" type="number" min="0" value="'+(sim.duracaoMin||0)+'"></div>' +
          '<div class="s2-field"><div class="s2-field-label">Acertos (manual)</div><input id="sim2-acertos" type="number" min="0" value="'+(sim.acertos||0)+'" placeholder="Se sem gabarito"><div class="s2-field-hint">Preencher se não usar gabarito</div></div>' +
        '</div>' +
        '<div class="s2-form-row">' +
          '<div class="s2-field"><div class="s2-field-label">Erros (manual)</div><input id="sim2-erros" type="number" min="0" value="'+(sim.erros||0)+'"></div>' +
          '<div class="s2-field"><div class="s2-field-label">Brancos (manual)</div><input id="sim2-brancos" type="number" min="0" value="'+(sim.brancos||0)+'"></div>' +
        '</div>' +

        '<div class="s2-form-section">Disciplinas <span>— defina por range, questões avulsas ou manual</span></div>' +
        '<div id="sim2-mats-wrap">'+matsHtml+'</div>' +
        '<button class="s2-add-mat-btn" onclick="s2AddMateria()">+ Matéria</button>' +

        '<div class="s2-form-section">Gabarito <span style="font-size:.58rem;color:var(--s2-text3);font-family:Barlow;font-style:italic;text-transform:none;letter-spacing:0">— sua resposta / gabarito oficial</span></div>' +
        '<div id="sim2-gab-wrap">'+gabHtml+'</div>' +

        '<div class="s2-form-actions">' +
          (isEdit ? '<button class="s2-form-btn danger" onclick="s2DeleteSim(\''+sim.id+'\')">Excluir</button>' : '') +
          '<button class="s2-form-btn" onclick="s2CloseModal()">Cancelar</button>' +
          '<button class="s2-form-btn save" onclick="s2SaveSim()">Salvar Simulado</button>' +
        '</div>' +
      '</div>';

    return html;
  }

  /* ── Modal actions ──────────────────────────────────────────────── */
  window.s2OpenModal = function(id) {
    S2.editId = id || null;
    const sims = s2Load();
    const sim = id ? sims.find(function(s){ return s.id === id; }) : null;
    const html = buildModal(sim || {});

    let overlay = document.getElementById('sim2-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sim2-modal-overlay';
      overlay.className = 's2-modal-overlay';
      overlay.innerHTML = '<div class="s2-modal" id="sim2-modal"></div>';
      overlay.addEventListener('click', function(e){ if(e.target===overlay) s2CloseModal(); });
      document.body.appendChild(overlay);
    }
    document.getElementById('sim2-modal').innerHTML = html;
    requestAnimationFrame(function(){ overlay.classList.add('open'); });
    S2.modalOpen = true;
  };

  window.s2CloseModal = function() {
    const overlay = document.getElementById('sim2-modal-overlay');
    if (overlay) { overlay.classList.remove('open'); setTimeout(function(){ if(overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 220); }
    S2.modalOpen = false;
  };

  window.s2UpdateGab = function(n) {
    n = parseInt(n) || 0;
    const modelo = (document.getElementById('sim2-modelo') || {}).value || 'ABCDE';
    const wrap = document.getElementById('sim2-gab-wrap');
    if (!wrap) return;
    if (n === 0) { wrap.innerHTML = '<div style="font-size:.68rem;color:var(--s2-text3)">Informe o total de questões para inserir gabarito</div>'; return; }
    let h = '<div class="s2-gabarito-grid">';
    for (let i = 0; i < n; i++) {
      h += '<div class="s2-gab-cell"><div class="s2-gab-num">'+(i+1)+'</div><input class="s2-gab-inp" id="sim2-aluno-'+i+'" maxlength="1" placeholder="?"><input class="s2-gab-inp" id="sim2-ofic-'+i+'" maxlength="1" placeholder="Gab" style="border-color:rgba(88,166,255,.2)"></div>';
    }
    wrap.innerHTML = h + '</div>';
  };

  window.s2PlatChange = function(val) {
    const outro = document.getElementById('sim2-plataforma-outro');
    if (outro) outro.style.display = val === 'Outro' ? 'block' : 'none';
  };

  // Re-render just the mats wrap from current state
  function _matState() {
    var wrap = document.getElementById('sim2-mats-wrap');
    if (!wrap) return [];
    var cards = wrap.querySelectorAll('.s2-mat-card');
    var mats = [];
    cards.forEach(function(card, i) {
      var nomeEl = card.querySelector('.s2-mat-nome');
      var nome   = nomeEl ? nomeEl.textContent.trim() : 'Matéria';
      var body   = card.querySelector('.s2-mat-body');
      var modo   = body ? (body.querySelector('.s2-mat-range') ? 'range' : body.querySelector('.s2-mat-avulso') ? 'avulso' : 'manual') : 'manual';
      var m = { nome:nome, modo:modo };
      if (modo === 'range') {
        var ini = document.getElementById('sim2-mat-qini-'+i);
        var fim = document.getElementById('sim2-mat-qfim-'+i);
        m.qIni = parseInt(ini?ini.value:1)||1;
        m.qFim = parseInt(fim?fim.value:'')||m.qIni;
      } else if (modo === 'avulso') {
        var ql = document.getElementById('sim2-mat-qlist-'+i);
        m.questoes = ql ? ql.value : '';
      } else {
        var f = document.getElementById('sim2-mat-f-'+i);
        var e = document.getElementById('sim2-mat-e-'+i);
        var b = document.getElementById('sim2-mat-b-'+i);
        m.feitas  = parseInt(f?f.value:0)||0;
        m.erros   = parseInt(e?e.value:0)||0;
        m.brancos = parseInt(b?b.value:0)||0;
      }
      mats.push(m);
    });
    return mats;
  }

  function _rerenderMats(mats) {
    var wrap = document.getElementById('sim2-mats-wrap');
    if (!wrap) return;
    if (!mats.length) {
      wrap.innerHTML = '<div style="font-size:.68rem;color:rgba(255,255,255,.28);padding:.4rem 0">Clique em "+ Matéria" para adicionar</div>';
      return;
    }
    var sim2 = {}; // dummy sim for matRow
    wrap.innerHTML = mats.map(function(m,i){ return matRow2(m,i); }).join('');
  }

  // Simplified matRow for re-render (uses current mode state)
  function matRow2(m, i) {
    var modoRange  = m.modo === 'range';
    var modoAvulso = m.modo === 'avulso';
    var modoManual = !m.modo || m.modo === 'manual';
    var bodyHtml;
    if (modoRange) {
      bodyHtml = '<div class="s2-mat-range">' +
        '<span class="s2-mat-range-label">Da questão</span>' +
        '<input class="s2-mat-range-inp" type="number" min="1" id="sim2-mat-qini-'+i+'" value="'+(m.qIni||1)+'" placeholder="1" oninput="s2MatRangeUpdate('+i+')">' +
        '<span class="s2-mat-range-label">até</span>' +
        '<input class="s2-mat-range-inp" type="number" min="1" id="sim2-mat-qfim-'+i+'" value="'+(m.qFim||'')+'" placeholder="20" oninput="s2MatRangeUpdate('+i+')">' +
        '<span class="s2-mat-range-info" id="sim2-mat-rinfo-'+i+'">'+(m.qIni&&m.qFim ? (m.qFim-m.qIni+1)+' questões' : '')+'</span>' +
        '</div>';
    } else if (modoAvulso) {
      var count = m.questoes ? m.questoes.split(',').filter(function(x){return x.trim();}).length : 0;
      bodyHtml = '<div class="s2-mat-avulso">' +
        '<input class="s2-mat-avulso-inp" type="text" id="sim2-mat-qlist-'+i+'" ' +
          'value="'+(m.questoes||'')+'" placeholder="Ex: 1, 5, 12, 18, 23 ..." ' +
          'oninput="s2MatAvulsoUpdate('+i+',this.value)">' +
        '<span class="s2-mat-avulso-count" id="sim2-mat-acount-'+i+'">'+(count?count+' questões':'')+'</span>' +
        '</div>';
    } else {
      bodyHtml = '<div class="s2-mat-manual">' +
        '<div class="s2-mat-manual-field"><span class="s2-mat-manual-label">Feitas</span>' +
          '<input class="s2-materia-inp" type="number" min="0" id="sim2-mat-f-'+i+'" value="'+(m.feitas||0)+'"></div>' +
        '<div class="s2-mat-manual-field"><span class="s2-mat-manual-label" style="color:rgba(248,81,73,.7)">Erros</span>' +
          '<input class="s2-materia-inp" type="number" min="0" id="sim2-mat-e-'+i+'" value="'+(m.erros||0)+'" style="border-color:rgba(248,81,73,.2)"></div>' +
        '<div class="s2-mat-manual-field"><span class="s2-mat-manual-label" style="color:rgba(255,255,255,.3)">Brancos</span>' +
          '<input class="s2-materia-inp" type="number" min="0" id="sim2-mat-b-'+i+'" value="'+(m.brancos||0)+'"></div>' +
        '</div>';
    }
    return '<div class="s2-mat-card" id="sim2-mat-card-'+i+'">' +
      '<div class="s2-mat-header">' +
        '<div class="s2-mat-nome">'+m.nome+'</div>' +
        '<div class="s2-mat-modes">' +
          '<button class="s2-mat-mode-btn'+(modoRange?' active':'')+'" onclick="s2MatMode('+i+',&quot;range&quot;)">Q1–Qn</button>' +
          '<button class="s2-mat-mode-btn'+(modoAvulso?' active':'')+'" onclick="s2MatMode('+i+',&quot;avulso&quot;)">Avulso</button>' +
          '<button class="s2-mat-mode-btn'+(modoManual?' active':'')+'" onclick="s2MatMode('+i+',&quot;manual&quot;)">Manual</button>' +
        '</div>' +
        '<button class="s2-mat-remove" onclick="s2RemoveMateria('+i+')" title="Remover">✕</button>' +
      '</div>' +
      '<div class="s2-mat-body" id="sim2-mat-body-'+i+'">' + bodyHtml + '</div>' +
    '</div>';
  }

  window.s2MatMode = function(idx, modo) {
    var mats = _matState();
    if (!mats[idx]) return;
    mats[idx].modo = modo;
    _rerenderMats(mats);
  };

  window.s2RemoveMateria = function(idx) {
    var mats = _matState();
    mats.splice(idx, 1);
    _rerenderMats(mats);
  };

  window.s2MatRangeUpdate = function(idx) {
    var ini = parseInt((document.getElementById('sim2-mat-qini-'+idx)||{}).value)||1;
    var fim = parseInt((document.getElementById('sim2-mat-qfim-'+idx)||{}).value)||ini;
    var info = document.getElementById('sim2-mat-rinfo-'+idx);
    if (info) info.textContent = fim>=ini ? (fim-ini+1)+' questões' : '';
  };

  window.s2MatAvulsoUpdate = function(idx, val) {
    var count = val.split(',').filter(function(x){return x.trim();}).length;
    var el = document.getElementById('sim2-mat-acount-'+idx);
    if (el) el.textContent = count ? count+' questões' : '';
  };

  window.s2AddMateria = function() {
    var nome = prompt('Nome da matéria ou disciplina:');
    if (!nome || !nome.trim()) return;
    var mats = _matState();
    // Remove the empty hint div if present
    var wrap = document.getElementById('sim2-mats-wrap');
    if (wrap && wrap.children.length && !wrap.querySelector('.s2-mat-card')) wrap.innerHTML = '';
    mats.push({ nome: nome.trim(), modo: 'manual', feitas:0, erros:0, brancos:0 });
    _rerenderMats(mats);
  };

  window.s2SaveSim = function() {
    const get = function(id){ const el=document.getElementById(id); return el ? el.value.trim() : ''; };
    const nome  = get('sim2-nome');
    const total = parseInt(get('sim2-total')) || 0;
    if (!nome) { if(typeof P01UI!=='undefined') P01UI.notify('Informe o nome do simulado','error'); return; }

    // Collect materias — supports range, avulso, manual modes
    const rawMats = _matState();
    const resAluno2 = [], resOfic2 = [];
    // Pre-collect gabarito for range/avulso calculation
    for (var gi = 0; gi < parseInt(get('sim2-total'))||0; gi++) {
      resAluno2.push(get('sim2-aluno-'+gi).toUpperCase());
      resOfic2.push(get('sim2-ofic-'+gi).toUpperCase());
    }
    const hasGab2 = resOfic2.some(function(r){ return r !== ''; });
    const materias = rawMats.map(function(m) {
      var feitas = 0, erros = 0, brancos = 0;
      if (m.modo === 'range' && m.qIni && m.qFim && hasGab2) {
        for (var q = m.qIni; q <= m.qFim; q++) {
          var idx0 = q - 1;
          var al = resAluno2[idx0] || '';
          var of = resOfic2[idx0]  || '';
          if (!al || al === 'B') brancos++;
          else if (al === of) feitas++;  // counting correct as feitas here
          else erros++;
          feitas++; // total feitas = all answered in range
        }
        // recalculate: feitas = total range, erros = wrong
        var total_r = m.qFim - m.qIni + 1;
        var correct_r = 0; erros = 0; brancos = 0;
        for (var q2 = m.qIni; q2 <= m.qFim; q2++) {
          var al2 = resAluno2[q2-1] || '';
          var of2 = resOfic2[q2-1]  || '';
          if (!al2 || al2 === 'B') brancos++;
          else if (al2 === of2) correct_r++;
          else erros++;
        }
        feitas = total_r; var acertos_r = correct_r;
        return { nome:m.nome, modo:'range', qIni:m.qIni, qFim:m.qFim, feitas:feitas, acertos:acertos_r, erros:erros, brancos:brancos, aproveitamento: feitas>0?Math.round(acertos_r/feitas*100):0 };
      } else if (m.modo === 'avulso' && m.questoes && hasGab2) {
        var nums = m.questoes.split(',').map(function(x){ return parseInt(x.trim()); }).filter(function(n){ return !isNaN(n) && n>0; });
        var ac_a = 0; var err_a = 0; var br_a = 0;
        nums.forEach(function(n) {
          var al3 = resAluno2[n-1] || ''; var of3 = resOfic2[n-1] || '';
          if (!al3||al3==='B') br_a++;
          else if (al3===of3) ac_a++;
          else err_a++;
        });
        return { nome:m.nome, modo:'avulso', questoes:m.questoes, feitas:nums.length, acertos:ac_a, erros:err_a, brancos:br_a, aproveitamento: nums.length>0?Math.round(ac_a/nums.length*100):0 };
      } else {
        // Manual
        var f = m.feitas||0; var e = m.erros||0; var b = m.brancos||0;
        return { nome:m.nome, modo:'manual', feitas:f, acertos:f-e, erros:e, brancos:b, aproveitamento: f>0?Math.round((f-e)/f*100):0 };
      }
    });

    // Collect gabarito
    const resAluno = [], resOfic = [];
    for (let i = 0; i < total; i++) {
      const al = get('sim2-aluno-'+i).toUpperCase();
      const of = get('sim2-ofic-'+i).toUpperCase();
      resAluno.push(al);
      resOfic.push(of);
    }
    const hasGab = resOfic.some(function(r){ return r !== ''; });

    const sim = {
      id:             S2.editId || s2GenId(),
      nome:           nome,
      plataforma:     (function(){ var p=get('sim2-plataforma'); return p==='Outro'?(get('sim2-plataforma-outro')||'Outro'):p; })(),
      banca:          get('sim2-banca'),
      tipo:           get('sim2-modelo'),
      data:           get('sim2-data'),
      duracaoMin:     parseInt(get('sim2-duracao')) || 0,
      totalQuestoes:  total,
      acertos:        parseInt(get('sim2-acertos')) || 0,
      erros:          parseInt(get('sim2-erros'))   || 0,
      brancos:        parseInt(get('sim2-brancos'))  || 0,
      materias:       materias,
      gabarito: {
        modelo:           get('sim2-modelo'),
        respostasAluno:   resAluno,
        respostasOficiais: resOfic,
      },
      _ts: Date.now(),
    };

    // If gabarito provided, auto-calculate
    if (hasGab) {
      const c = calcSim(sim);
      sim.acertos = c.acertos;
      sim.erros   = c.erros;
      sim.brancos = c.brancos;
      sim.aproveitamento = c.aproveit;
    } else {
      // HOTFIX BUG 2: usar totalQuestoes como denominador, não acertos+erros+brancos
      const tQ = sim.totalQuestoes || (sim.acertos + sim.erros + sim.brancos);
      sim.aproveitamento = tQ > 0 ? Math.round(sim.acertos / tQ * 100) : 0;
    }

    const sims = s2Load();
    const idx  = sims.findIndex(function(s){ return s.id === sim.id; });
    if (idx >= 0) sims[idx] = sim;
    else sims.push(sim);
    s2Save(sims);

    if (typeof P01Bus !== 'undefined') P01Bus.emit('simulados:saved', { id: sim.id });
    if (typeof _markStudiedToday === 'function') _markStudiedToday();
    if (typeof P01UI !== 'undefined') P01UI.notify('Simulado salvo!', 'success');

    s2CloseModal();
    sim2Build();
  };

  window.s2DeleteSim = function(id) {
    if (!confirm('Excluir este simulado? Esta ação não pode ser desfeita.')) return;
    const sims = s2Load().filter(function(s){ return s.id !== id; });
    s2Save(sims);
    s2CloseModal();
    sim2Build();
  };

  /* ══════════════════════════════════════════════════════════════════
   * MAIN BUILD
   * ══════════════════════════════════════════════════════════════════ */
  function sim2Build() {
    const root = document.getElementById('sim2-root');
    if (!root) return;

    try {
      const t0   = performance.now();
      const sims = s2Load();

      const views = [
        { id:'overview',    label:'Visão Geral', icon:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
        { id:'historico',   label:'Histórico',   icon:'<path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/>' },
        { id:'disciplinas', label:'Disciplinas', icon:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
        { id:'analise',     label:'Análise',     icon:'<path d="M2 20h20"/><path d="M6 16V10"/><path d="M10 16V4"/><path d="M14 16v-6"/><path d="M18 16v-2"/>' },
      ];

      const viewHtml =
        S2.view === 'overview'    ? viewOverview(sims)    :
        S2.view === 'historico'   ? viewHistorico(sims)   :
        S2.view === 'disciplinas' ? viewDisciplinas(sims) :
        viewAnalise(sims);

      root.innerHTML =
        '<div style="display:flex;flex-direction:column;height:100%;min-height:calc(100vh - 44px)">' +
          '<div class="s2-bar">' +
            '<span class="s2-title">Simulados</span>' +
            '<div class="s2-sep"></div>' +
            '<div class="s2-tabs">' +
              views.map(function(v) {
                return '<button class="s2-tab'+(S2.view===v.id?' active':'')+'" onclick="s2SetView(\''+v.id+'\')">' +
                  '<svg viewBox="0 0 24 24">'+v.icon+'</svg>'+v.label+'</button>';
              }).join('') +
            '</div>' +
            '<div class="s2-spacer"></div>' +
            '<button class="s2-btn primary" onclick="s2OpenModal()">+ Novo Simulado</button>' +
          '</div>' +
          '<div class="s2-body"><div class="s2-content">' + viewHtml + '</div></div>' +
        '</div>';

      const el = performance.now() - t0;
      if (el > 150) console.warn('[simulados-v2] Slow render:', el.toFixed(1)+'ms');

      try { if(typeof topbarUpdate==='function') topbarUpdate('simulados-v2', S2.view); } catch(e2) {}
    } catch(e) {
      console.error('[simulados-v2] Build crash:', e.message, e.stack);
      root.innerHTML = '<div style="padding:1.5rem;color:#f85149;font-family:monospace;font-size:.75rem">[simulados-v2] Erro: '+e.message+'</div>';
    }
  }

  /* ── PUBLIC ACTIONS ─────────────────────────────────────────────── */
  window.s2SetView = function(v) { S2.view = v; sim2Build(); };

  /* ── DASHBOARD ADAPTER — consumed by analytics-next.js ─────────── */
  window.s2GetStats = function() {
    const sims = s2Load();
    const st   = computeStats(sims);
    if (!st) return { total:0, media:0, melhor:0, withResults:0, sims:[] };
    return {
      total:       st.total,
      media:       st.media,
      melhor:      st.melhor,
      withResults: st.withResult.length,
      sims:        st.calc,
      simAvg:      st.media,
    };
  };

  /* ── P01 REGISTRATION ───────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof P01Modules !== 'undefined') {
      P01Modules.register({
        id:       'simulados-v2',
        build:    sim2Build,
        render:   sim2Build,
        teardown: function(){ S2.view = 'overview'; },
        rebuild:  sim2Build,
      });
    }

    if (typeof P01Bus !== 'undefined') {
      P01Bus.on('concurso:changed', function(){ if(_isActive()) { S2.view='overview'; sim2Build(); } });
    }

    const _orig = window.goTab;
    if (typeof _orig === 'function') {
      window.goTab = function(id) {
        _orig(id);
        if (id === 'simulados-v2') {
          try { setTimeout(sim2Build, 20); } catch(e) {}
        }
      };
    }
    const _oc = window.concTrocar;
    if (typeof _oc === 'function') {
      window.concTrocar = function(id) {
        _oc(id);
        if (_isActive()) { S2.view='overview'; setTimeout(sim2Build, 80); }
      };
    }
    setTimeout(function(){ if(_isActive()) sim2Build(); }, 150);
  });

  function _isActive() {
    const t = document.getElementById('tab-simulados-v2');
    return t && t.classList.contains('active');
  }

})();

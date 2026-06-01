/* ════════════════════════════════════════════════════════════════════
 * analytics-next.js — PROTOCOLO 01 · Dashboard Principal
 * First module 100% built on P01 Core Engine
 * ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── STATE ─────────────────────────────────────────────────────── */
  const AN2 = {
    view:   'overview',   // 'overview' | 'edital' | 'questoes' | 'leitura' | 'simulados'
    period: '30',         // '7' | '30' | '90' | 'all'
  };

  /* ══════════════════════════════════════════════════════════════════
   * DATA LAYER — all reads isolated here
   * ══════════════════════════════════════════════════════════════════ */
  const DATA = {
    st()         { return (typeof ST !== 'undefined') ? ST : {}; },
    sessoes()    { return this.st().sessoesDiarias || {}; },
    progresso()  { return this.st().progresso || {}; },
    banco()      { return this.st().banco || []; },
    simulados()  { return (typeof s2GetStats==='function') ? (s2GetStats().sims||[]) : []; },
    leitura()    { return this.st().leitura || {}; },
    edital()     { return typeof getEditalAtivo==='function' ? getEditalAtivo() : []; },
    leis()       {
      if (typeof getLeisAtivas==='function') return getLeisAtivas();
      if (typeof LEIS_LEITURA!=='undefined') return LEIS_LEITURA;
      return [];
    },
    concurso()   {
      try {
        const id   = localStorage.getItem('protocolo_concurso_ativo');
        const meta = JSON.parse(localStorage.getItem('protocolo_concursos_meta')||'[]');
        const c    = meta.find(x=>x.id===id);
        return c ? (c.nome||c.name||id) : (id||'—');
      } catch(e) { return '—'; }
    },
  };

  /* ── UTILS ──────────────────────────────────────────────────────── */
  function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function dStr(d) {
    if (!d || isNaN(d.getTime())) return '1970-01-01';
    return d.toISOString().slice(0,10);
  }

  function daysAgo(n) {
    const days=[]; const now=new Date(); now.setHours(0,0,0,0);
    if(isNaN(now.getTime())) return [];
    for(let i=n-1;i>=0;i--){ const d=new Date(now.getTime()); d.setDate(d.getDate()-i); if(!isNaN(d.getTime())) days.push(d); }
    return days;
  }

  function periodN() { return AN2.period==='all'?365:+AN2.period; }

  function color(pct) {
    if(pct===0)   return 'var(--an-text3)';
    if(pct>=100)  return 'var(--an-green)';
    if(pct>=70)   return 'var(--an-green)';
    if(pct>=40)   return 'var(--an-amber)';
    if(pct>=15)   return 'var(--an-gold)';
    return 'var(--an-red)';
  }

  /* ── COMPUTED METRICS ───────────────────────────────────────────── */
  function metrics() {
    const sd    = DATA.sessoes();
    const days  = daysAgo(periodN());
    const today = dStr(new Date());

    // Activity
    const active = days.filter(d=>!!sd[dStr(d)]);
    const totalQ = days.reduce((s,d)=>{ const e=sd[dStr(d)]; return s+(e&&e.questoes?e.questoes.total||0:0); },0);
    const totalA = days.reduce((s,d)=>{ const e=sd[dStr(d)]; return s+(e&&e.questoes?e.questoes.acertos||0:0); },0);

    // Streak — only valid ISO date keys
    let streak=0, maxStr=0, cur=0;
    const _now=new Date(); _now.setHours(0,0,0,0);
    for(let i=0;i<=365;i++){
      const d=new Date(_now.getTime()); d.setDate(d.getDate()-i);
      if(!isNaN(d.getTime())&&sd[dStr(d)]){streak++;} else if(i>0) break;
    }
    const _dateRe=/^\d{4}-\d{2}-\d{2}$/;
    const allK=Object.keys(sd).filter(k=>_dateRe.test(k)).sort();
    allK.forEach((k,i)=>{ cur++; if(cur>maxStr)maxStr=cur; if(i<allK.length-1){const nx=new Date(k+'T00:00:00');if(!isNaN(nx.getTime())){nx.setDate(nx.getDate()+1);if(dStr(nx)!==allK[i+1])cur=0;}} });

    // Edital
    const edital = DATA.edital();
    const prog   = DATA.progresso();
    const edDiscs = edital.map(disc=>{
      let done=0,total=0;
      (disc.topics||[]).forEach(t=>{ total++; if(prog[t.id+'_e'])done++; (t.subs||[]).forEach(s=>{ total++;if(prog[s.id+'_e'])done++; }); });
      return {id:disc.id, name:disc.name, done, total, pct:total>0?Math.round(done/total*100):0};
    });
    const edPct = edDiscs.length>0 ? Math.round(edDiscs.reduce((s,d)=>s+d.pct,0)/edDiscs.length) : 0;

    // Banco
    const banco = DATA.banco();
    const bTotal    = banco.length;
    const bAnswered = banco.filter(q=>q.historico&&q.historico.length>0).length;
    const bCorrect  = banco.filter(q=>!q.errouAlgumVez&&q.historico&&q.historico.length>0).length;
    const bErr      = banco.filter(q=>q.errouAlgumVez).length;
    const bPct      = bAnswered>0 ? Math.round(bCorrect/bAnswered*100) : 0;

    // Leitura
    const leis    = DATA.leis();
    const leitura = DATA.leitura();
    const getLK   = typeof getLeitKey==='function' ? getLeitKey : (id,a)=>`leit_${id}_${a}`;
    let lDone=0, lTotal=0;
    leis.forEach(l=>{ lTotal+=l.arts.length; lDone+=l.arts.filter(a=>leitura[getLK(l.id,a)]).length; });
    const lPct = lTotal>0?Math.round(lDone/lTotal*100):0;

    // Simulados V2 — fonte: s2GetStats()
    const _s2stats = (typeof s2GetStats==='function') ? s2GetStats() : {total:0,media:0,melhor:0,sims:[]};
    const sims = _s2stats.sims || [];
    // Filter by active period
    const _simNow = Date.now();
    const _simPeriodMs = AN2.period==='all' ? Infinity : AN2.period * 24*60*60*1000;
    const simsWithR = sims.filter(function(s){
      if(s.total === 0) return false;
      if(AN2.period !== 'all') {
        if(!s.data) return false;
        const d = new Date(s.data).getTime();
        if(isNaN(d) || (_simNow - d) > _simPeriodMs) return false;
      }
      return true;
    });
    const simAvg = simsWithR.length>0
      ? Math.round(simsWithR.reduce(function(acc,s){ return acc+(s.aproveit||0); },0)/simsWithR.length)
      : 0;

    // eq-v2 external tracker stats
    let eq2Feitas = 0, eq2Erradas = 0;
    try {
      const concId = localStorage.getItem('protocolo_concurso_ativo') || 'default';
      const eq2Raw = JSON.parse(localStorage.getItem('eq2_' + concId) || '{}');
      Object.values(eq2Raw).forEach(function(v) {
        if (v && typeof v === 'object') {
          eq2Feitas  += (v.feitas  || 0);
          eq2Erradas += (v.erradas || 0);
        }
      });
    } catch(e) {}
    const eq2Pct = eq2Feitas > 0 ? Math.round((eq2Feitas - eq2Erradas) / eq2Feitas * 100) : 0;

    return { active:active.length, streak, maxStr, totalQ, totalA,
             edDiscs, edPct, bTotal,bAnswered,bCorrect,bErr,bPct,
             lDone,lTotal,lPct, leis, sims,simsWithR,simAvg, days, sd,
             eq2Feitas, eq2Erradas, eq2Pct };
  }

  /* ══════════════════════════════════════════════════════════════════
   * COMPONENT RENDERERS
   * ══════════════════════════════════════════════════════════════════ */

  function cmpStats(m) {
    const daysLabel = AN2.period==='all'?'todo o período':`últimos ${AN2.period} dias`;
    const items = [
      { label:'Dias Ativos',      val:m.active,    sup:'dias',   sub:daysLabel, tag:null, accent:'var(--an-blue)' },
      { label:'Streak',           val:m.streak,    sup:'dias',   sub:`recorde: ${m.maxStr}d`, tag:m.streak>=7?{cls:'up',txt:'🔥'}:m.streak===0?{cls:'down',txt:'zerado'}:null, accent:'var(--an-gold)' },
      { label:'Questões',         val:m.totalQ,    sup:'',       sub:`${m.totalA} corretas`, tag:null, accent:'var(--an-blue)' },
      { label:'Acerto',           val:m.bPct,      sup:'%',      sub:`${m.bCorrect}/${m.bAnswered} respondidas`, tag:m.bPct>=70?{cls:'up',txt:'bom'}:m.bPct>0?{cls:'mid',txt:'regular'}:null, accent:color(m.bPct) },
      { label:'Domínio Edital',   val:m.edPct,     sup:'%',      sub:`${m.edDiscs.filter(d=>d.pct===100).length}/${m.edDiscs.length} disciplinas`, tag:null, accent:color(m.edPct) },
      { label:'Leitura',          val:m.lPct,      sup:'%',      sub:`${m.lDone}/${m.lTotal} artigos`, tag:null, accent:color(m.lPct) },
    ];
    return `<div class="an2-stat-row">${items.map(it=>`
      <div class="an2-stat" style="--an-stat-accent:${it.accent}">
        <div class="an2-stat-label">${esc(it.label)}</div>
        <div class="an2-stat-value">${it.val}<sup>${it.sup}</sup>${it.tag?`<span class="an2-stat-tag ${it.tag.cls}">${it.tag.txt}</span>`:''}</div>
        <div class="an2-stat-sub">${esc(it.sub)}</div>
      </div>`).join('')}</div>`;
  }

  function cmpHeatmap(m) {
    const n = 91; // 13 weeks
    const days = daysAgo(n);
    const maxQ = Math.max(1,...days.map(d=>{ const e=m.sd[dStr(d)]; return e&&e.questoes?e.questoes.total||0:0; }));

    // Build week columns
    const weeks=[];
    for(let i=0;i<days.length;i+=7) weeks.push(days.slice(i,i+7));

    // Month labels
    let lastMonth=-1;
    const monthRow = weeks.map(wk=>{
      const mn = wk[0].getMonth();
      if(mn!==lastMonth){ lastMonth=mn; return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mn]; }
      return '';
    });

    const dayLabels=['D','S','T','Q','Q','S','S'];
    const todayStr = dStr(new Date());

    let colsHtml='';
    weeks.forEach(wk=>{
      colsHtml+=`<div class="an2-heatmap-col">`;
      wk.forEach(d=>{
        const k=dStr(d);
        const e=m.sd[k];
        const q=e&&e.questoes?e.questoes.total||0:0;
        const v=q===0?0:q<maxQ*.25?1:q<maxQ*.5?2:q<maxQ*.75?3:4;
        const isToday=k===todayStr;
        colsHtml+=`<div class="an2-heatmap-cell" data-v="${v}"
          title="${d.toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})}: ${q} questões"
          ${isToday?'style="outline:1.5px solid var(--an-gold-bdr);outline-offset:1px"':''}></div>`;
      });
      colsHtml+=`</div>`;
    });

    return `
      <div class="an2-heatmap">
        <div class="an2-heatmap-inner">
          <div class="an2-heatmap-months">
            ${monthRow.map(m=>`<div class="an2-heatmap-month" style="min-width:${7*11+6*3}px;width:${7*11+6*3}px">${m}</div>`).join('')}
          </div>
          <div class="an2-heatmap-rows">
            <div class="an2-heatmap-day-labels">
              ${dayLabels.map(l=>`<div class="an2-heatmap-day-label">${l}</div>`).join('')}
            </div>
            <div class="an2-heatmap-cols">${colsHtml}</div>
          </div>
        </div>
        <div class="an2-heatmap-legend">
          Menos
          ${[0,1,2,3,4].map(v=>`<div class="an2-hl-cell" data-v="${v}" style="${v===0?'background:var(--an-surface2)':''}"></div>`).join('')}
          Mais
        </div>
      </div>`;
  }

  function cmpStreak(m) {
    const now=new Date(); now.setHours(0,0,0,0);
    const week=[];
    for(let i=6;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); week.push(d); }
    const dayLabels=['D','S','T','Q','Q','S','S'];
    const dotsHtml=week.map(d=>{
      const k=dStr(d);
      const isToday=k===dStr(now);
      const done=!!m.sd[k];
      return `<div class="an2-week-dot${done?' active':''}${isToday&&!done?' today':''}">${dayLabels[d.getDay()]}</div>`;
    }).join('');
    const msg=m.streak>=14?'🔥 Em chamas!':m.streak>=7?'💪 Consistente':m.streak>=3?'⚡ Em ritmo':m.streak===0?'Comece hoje':'📅 Construindo';
    return `<div class="an2-streak-wrap">
      <div class="an2-streak-num">${m.streak}</div>
      <div class="an2-streak-info">
        <div class="an2-streak-lbl">Dias consecutivos</div>
        <div class="an2-streak-sub">${msg} · recorde: ${m.maxStr} dias</div>
        <div class="an2-week-dots">${dotsHtml}</div>
      </div>
    </div>`;
  }

  function cmpRings(m) {
    // Questões ring: use eq2 aproveitamento (external tracker), show feitas count
    const eq2Pct = m.eq2Pct;
    const eq2Col = color(eq2Pct);

    const r=28, circ=+(2*Math.PI*r).toFixed(2);

    function ring(pct, col, label, valOverride, subLabel) {
      const offset = (circ*(1-pct/100)).toFixed(2);
      const displayVal = valOverride !== undefined ? valOverride : pct + '%';
      return `<div class="an2-ring-item">
        <div class="an2-ring-val" style="color:${col}">${displayVal}</div>
        ${subLabel ? `<div style="font-size:.52rem;color:var(--an-text3);text-align:center;margin-top:-2px;margin-bottom:2px">${subLabel}</div>` : ''}
        <svg width="72" height="72" viewBox="0 0 72 72" style="transform:rotate(-90deg)">
          <circle cx="36" cy="36" r="${r}" fill="none" stroke="var(--an-surface2)" stroke-width="5.5"/>
          <circle cx="36" cy="36" r="${r}" fill="none" stroke="${col}" stroke-width="5.5"
            stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
            style="transition:stroke-dashoffset .8s var(--an-ease)"/>
        </svg>
        <div class="an2-ring-label">${esc(label)}</div>
      </div>`;
    }

    const _simLabel =
      AN2.period === '7'  ? 'Simulados - 7 dias'  :
      AN2.period === '30' ? 'Simulados - 30 dias' :
      AN2.period === '90' ? 'Simulados - 90 dias' :
                            'Simulados - Todos';
    return `<div class="an2-rings">
      ${ring(m.edPct,  color(m.edPct),  'Edital')}
      ${ring(m.lPct,   color(m.lPct),   'Leitura')}
      ${ring(m.simAvg, color(m.simAvg), _simLabel, m.simAvg>0?m.simAvg+'%':'—')}
    </div>`;
  }

  function cmpBars(m) {
    const n = AN2.period==='all' ? 90 : +AN2.period;
    const days=daysAgo(n);
    const maxQ=Math.max(1,...days.map(d=>{ const e=m.sd[dStr(d)]; return e&&e.questoes?e.questoes.total||0:0; }));
    const dayL=['D','S','T','Q','Q','S','S'];
    const BAR_H=56;
    return `<div class="an2-bars-wrap">${days.map(d=>{
      const e=m.sd[dStr(d)];
      const q=e&&e.questoes?e.questoes.total||0:0;
      const h=q>0?Math.max(3,Math.round(q/maxQ*BAR_H)):0;
      const lbl=n<=30?dayL[d.getDay()]:d.getDate()===1||d.getDate()===15?dStr(d).slice(0,5):'';
      return `<div class="an2-bar-unit" title="${dStr(d)}: ${q}q">
        <div class="an2-bar-fill" style="height:${h}px;opacity:${q>0?'.75':'.12'}"></div>
        <div class="an2-bar-lbl">${lbl}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function cmpDiscTable(m, limit=10) {
    const sorted=[...m.edDiscs].sort((a,b)=>a.pct-b.pct);
    const show=sorted.slice(0,limit);
    if(!show.length) return `<div style="font-size:.72rem;color:var(--an-text3);padding:.75rem 0">Nenhuma disciplina configurada</div>`;
    return `<div class="an2-disc-list">${show.map(d=>{
      const col=color(d.pct);
      return `<div class="an2-disc-item">
        <div class="an2-disc-name" title="${esc(d.name)}">${esc(d.name)}</div>
        <div class="an2-disc-track"><div class="an2-disc-fill" style="width:${d.pct}%;background:${col}"></div></div>
        <div class="an2-disc-pct" style="color:${col}">${d.pct}%</div>
        <div class="an2-disc-frac">${d.done}/${d.total}</div>
      </div>`;
    }).join('')}${sorted.length>limit?`<div style="font-size:.60rem;color:var(--an-text3);padding:.4rem 0">+${sorted.length-limit} disciplinas</div>`:''}</div>`;
  }

  function cmpInsights(m) {
    const ins=[];
    if(m.streak>=7)   ins.push({icon:'🔥',col:'var(--an-gold)',title:`${m.streak} dias de streak`,desc:'Consistência excelente. Você está construindo o hábito.'});
    else if(m.streak===0) ins.push({icon:'⚡',col:'var(--an-amber)',title:'Streak zerado hoje',desc:'Um único dia de estudo já reinicia a sequência.'});
    if(m.bPct>=75)    ins.push({icon:'🎯',col:'var(--an-green)',title:`${m.bPct}% de acerto em questões`,desc:`${m.bCorrect} de ${m.bAnswered} corretas. Performance acima da média.`});
    else if(m.bErr>5) ins.push({icon:'📌',col:'var(--an-amber)',title:`${m.bErr} questões com erro`,desc:'Revise para converter fraqueza em domínio.'});
    const weak=m.edDiscs.filter(d=>d.total>0).sort((a,b)=>a.pct-b.pct)[0];
    if(weak&&weak.pct<30) ins.push({icon:'⚠️',col:'var(--an-red)',title:`Zona crítica: ${weak.name.split('(')[0].trim()}`,desc:`${weak.pct}% de domínio. Priorize esta disciplina.`});
    const strong=m.edDiscs.filter(d=>d.pct>=100);
    if(strong.length) ins.push({icon:'✅',col:'var(--an-green)',title:`${strong.length} disciplina${strong.length>1?'s':''} dominada${strong.length>1?'s':''}`,desc:'Continue para consolidar o domínio geral.'});
    if(m.lPct>0)      ins.push({icon:'📖',col:'var(--an-blue)',title:`${m.lPct}% da legislação lida`,desc:`${m.lDone} artigos marcados de ${m.lTotal} no total.`});
    if(m.simAvg>0)    ins.push({icon:'📊',col:'var(--an-blue)',title:`Média de simulados: ${m.simAvg}%`,desc:`${m.simsWithR.length} simulado${m.simsWithR.length>1?'s':''} com resultado registrado.`});
    if(!ins.length)   ins.push({icon:'🚀',col:'var(--an-gold)',title:'Comece sua jornada analítica',desc:'Resolva questões, estude leis e salve edital para ver sua inteligência crescer.'});
    return `<div class="an2-feed">${ins.slice(0,5).map(i=>`
      <div class="an2-feed-item" style="--an-fi-color:${i.col}">
        <div class="an2-feed-icon">${i.icon}</div>
        <div class="an2-feed-body">
          <div class="an2-feed-title">${esc(i.title)}</div>
          <div class="an2-feed-desc">${esc(i.desc)}</div>
        </div>
      </div>`).join('')}</div>`;
  }

  function cmpSimTimeline(m) {
    const items=[...(m.simsWithR||[])].slice(-8).reverse();
    if(!items.length) return `<div style="font-size:.72rem;color:var(--an-text3);padding:.75rem 0">Nenhum simulado com resultado</div>`;
    return `<div class="an2-timeline">${items.map(s=>{
      const pct = s.aproveit !== undefined ? Math.min(Math.max(s.aproveit,0),100) : 0;
      const col = color(pct);
      const dateStr = s.data ? new Date(s.data).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) : '—';
      return `<div class="an2-tl-item">
        <div class="an2-tl-date">${dateStr}</div>
        <div class="an2-tl-name">${esc(s.nome||'Simulado')}</div>
        <div class="an2-tl-bar"><div class="an2-tl-fill" style="width:${pct}%;background:${col}"></div></div>
        <div class="an2-tl-score" style="color:${col}">${pct}%</div>
      </div>`;
    }).join('')}</div>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * VIEW RENDERERS
   * ══════════════════════════════════════════════════════════════════ */


  function cmpEditalByBloco(m) {
    const edital = typeof getEditalAtivo === 'function' ? getEditalAtivo() : [];
    const prog   = (typeof ST !== 'undefined' && ST.progresso) ? ST.progresso : {};

    // Get blocos from edital config
    let blocos = [];
    try {
      if (typeof _editalCfgLoad === 'function') {
        const cfg = _editalCfgLoad();
        if (cfg && cfg.blocos) blocos = cfg.blocos;
      }
    } catch(e) {}

    // Build groups using bloc system (same as edital overview)
    const discById = {};
    edital.forEach(function(d){ discById[d.id] = d; });
    const groups = [], assigned = new Set();
    blocos.forEach(function(b) {
      const bDiscs = (b.discIds || []).map(function(id){ return discById[id]; }).filter(Boolean);
      bDiscs.forEach(function(d){ assigned.add(d.id); });
      groups.push({ name: b.name, discs: bDiscs });
    });
    const unassigned = edital.filter(function(d){ return !assigned.has(d.id); });
    if (unassigned.length) groups.push({ name: 'Geral', discs: unassigned });

    if (!groups.length) return '<div style="font-size:.72rem;color:var(--an-text3);padding:.5rem 0">Nenhuma disciplina configurada no Edital</div>';

    let html = '';
    groups.forEach(function(g) {
      if (!g.discs.length) return;
      // Filter: only in-progress and not-started
      const discStats = g.discs.map(function(disc) {
        let done = 0, total = 0;
        (disc.topics || []).forEach(function(t) {
          total++;
          if (prog[t.id + '_e']) done++;
          (t.subs || []).forEach(function(s) {
            total++;
            if (prog[s.id + '_e']) done++;
          });
        });
        const pct = total > 0 ? Math.round(done/total*100) : 0;
        return { name: disc.name, done: done, total: total, pct: pct };
      }).filter(function(d){ return d.pct < 100; }); // exclude fully done

      if (!discStats.length) return;

      html += '<div style="margin-bottom:1rem">';
      html += '<div class="an2-section" style="margin-top:0">' + esc(g.name) + '</div>';
      html += '<div class="an2-disc-list">';
      discStats.forEach(function(d) {
        const col = color(d.pct);
        const tag = d.pct === 0 ?
          '<span style="font-size:.56rem;color:var(--an-text3);background:var(--an-surface2);padding:1px 6px;border-radius:4px;margin-left:6px">não iniciada</span>' :
          '<span style="font-size:.56rem;color:var(--an-amber);background:var(--an-amber-dim);padding:1px 6px;border-radius:4px;margin-left:6px">em progresso</span>';
        html += '<div class="an2-disc-item">' +
          '<div class="an2-disc-name">' + esc(d.name) + tag + '</div>' +
          '<div class="an2-disc-track"><div class="an2-disc-fill" style="width:' + d.pct + '%;background:' + col + '"></div></div>' +
          '<div class="an2-disc-pct" style="color:' + col + '">' + d.pct + '%</div>' +
          '<div class="an2-disc-frac">' + d.done + '/' + d.total + '</div>' +
        '</div>';
      });
      html += '</div></div>';
    });

    return html || '<div style="font-size:.72rem;color:var(--an-text3);padding:.5rem 0">Todas as disciplinas concluídas!</div>';
  }

  function cmpTodayTasks() {
    // Reads today's tasks from the cronograma system
    try {
      const today = new Date(); today.setHours(0,0,0,0);

      // Get exam countdown
      let daysLeft = null;
      let provaLabel = '';
      try {
        const concId   = localStorage.getItem('protocolo_concurso_ativo');
        const metaRaw  = localStorage.getItem('protocolo_concursos_meta');
        const meta     = JSON.parse(metaRaw || '[]');
        const conc     = meta.find(function(c){ return c.id === concId; });
        if (conc && conc.dataProva) {
          const parts = conc.dataProva.split('/');
          let provaDate;
          if (parts.length === 3) {
            provaDate = new Date(+parts[2], +parts[1]-1, +parts[0]);
          } else {
            // FASE 9.4.12.3: parser local para YYYY-MM-DD (evita bug de fuso UTC)
            const isoM = String(conc.dataProva).match(/^(\d{4})-(\d{2})-(\d{2})$/);
            provaDate = isoM ? new Date(+isoM[1], +isoM[2]-1, +isoM[3]) : new Date(conc.dataProva);
          }
          if (!isNaN(provaDate.getTime())) {
            const diff = provaDate.getTime() - today.getTime();
            daysLeft = Math.ceil(diff / 86400000);
            provaLabel = provaDate.toLocaleDateString('pt-BR', {day:'numeric',month:'long',year:'numeric'});
          }
        }
        // Fallback: use PROVA_DATE if defined globally
        if (daysLeft === null && typeof PROVA_DATE !== 'undefined') {
          const diff = PROVA_DATE.getTime() - today.getTime();
          daysLeft = Math.ceil(diff / 86400000);
          provaLabel = PROVA_DATE.toLocaleDateString('pt-BR', {day:'numeric',month:'long',year:'numeric'});
        }
      } catch(e) {}

      // Get today's tasks from ciclo
      let tasks = [], doneCount = 0, totalObrig = 0;
      if (typeof getCicloIndex === 'function' && typeof _getCiclo === 'function') {
        const cicloIdx = getCicloIndex(today);
        const ciclo    = _getCiclo();
        if (ciclo && ciclo[cicloIdx]) {
          const cicloDay = ciclo[cicloIdx];
          const dayLabel = cicloDay.label || ('Dia ' + (cicloIdx+1));
          const allTasks = cicloDay.tasks || [];
          const obrig    = allTasks.filter(function(t){ return typeof isTaskObrigatoria === 'function' ? isTaskObrigatoria(t) : true; });
          totalObrig = obrig.length;
          const st = (typeof ST !== 'undefined' && ST.cronograma) ? ST.cronograma : {};
          doneCount = obrig.filter(function(t){ return !!st[getDayId(today)+'_'+t.id]; }).length;
          tasks = allTasks.map(function(t){
            const tid  = getDayId(today)+'_'+t.id;
            const done = !!st[tid];
            const obr  = typeof isTaskObrigatoria === 'function' ? isTaskObrigatoria(t) : true;
            return { id:t.id, tid:tid, cat:t.cat||'', desc:t.desc||'', type:t.type||'', done:done, obr:obr };
          });
        }
      }

      const pct = totalObrig > 0 ? Math.round(doneCount/totalObrig*100) : 0;
      const pctCol = pct >= 100 ? 'var(--an-green)' : pct >= 50 ? 'var(--an-amber)' : 'var(--an-gold)';
      // Countdown bar color: based ONLY on days remaining — never changes with task completion
      const cntBarCol = daysLeft !== null
        ? (daysLeft <= 30 ? 'var(--an-red)' : daysLeft <= 60 ? 'var(--an-amber)' : 'var(--an-gold)')
        : 'var(--an-gold)';
      const weekdays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
      const todayName = weekdays[today.getDay()] + ', ' + today.toLocaleDateString('pt-BR',{day:'numeric',month:'long'});

      // Countdown HTML
      const countdownHtml = daysLeft !== null ? (
        '<div class="an2-today-countdown">' +
          '<div class="an2-countdown-n" style="color:' + (daysLeft <= 30 ? 'var(--an-red)' : daysLeft <= 60 ? 'var(--an-amber)' : 'var(--an-gold)') + '">' + Math.max(0,daysLeft) + '</div>' +
          '<div class="an2-countdown-info">' +
            '<div class="an2-countdown-label">dias para a prova</div>' +
            '<div class="an2-countdown-date">' + esc(provaLabel) + '</div>' +
            '<div class="an2-countdown-bar-wrap">' +
              '<div class="an2-countdown-bar-fill" style="width:' + Math.min(100, Math.max(0, 100-daysLeft)) + '%;background:' + cntBarCol + '"></div>' +
            '</div>' +
          '</div>' +
        '</div>'
      ) : '';

      // Tasks list HTML — 2-level layout with badge right, matéria colored by type
      const badgeMap = {
        leitura:  'badge-leitura',
        questao:  'badge-questao',
        video:    'badge-video',
        revisao:  'badge-revisao',
        simulado: 'badge-simulado',
        resumo:   'badge-resumo'
      };
      // catColors: use an2-task-cat--{type} CSS classes defined in analytics-next.css
      // Using classes instead of inline style avoids broken/missing CSS variable references
      const badgeLabels = {
        leitura:  'Leitura',
        questao:  'Questão',
        video:    'Vídeo',
        revisao:  'Revisão',
        simulado: 'Simulado',
        resumo:   'Resumo'
      };
      const tasksHtml = tasks.length === 0 ?
        '<div style="font-size:.72rem;color:var(--an-text3);padding:.5rem 0">Nenhuma tarefa configurada para hoje</div>' :
        tasks.map(function(t) {
          const badgeCls  = badgeMap[t.type]    || 'badge-leitura';
          const badgeLbl  = badgeLabels[t.type] || (t.type || 'Outro');
          const typeCls   = t.type ? (' an2-task-cat--' + t.type) : '';
          return '<div class="an2-task-row' + (t.done?' done':'') + (t.obr?'':' optional') + '" onclick="an2ToggleTask(\'' + t.tid + '\')" style="cursor:pointer">' +
            '<div class="an2-task-check' + (t.done?' done':'') + '">' +
              '<svg viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</div>' +
            '<div class="an2-task-info">' +
              '<div class="an2-task-meta-row">' +
                '<span class="an2-task-cat' + typeCls + '">' + esc(t.cat) + '</span>' +
                (!t.obr ? '<span class="an2-task-opt">opcional</span>' : '') +
              '</div>' +
              '<div class="an2-task-desc">' + esc(t.desc) + '</div>' +
            '</div>' +
            '<span class="task-badge ' + badgeCls + '">' + esc(badgeLbl) + '</span>' +
          '</div>';
        }).join('');

      return '<div class="an2-panel">' +
        '<div class="an2-panel-hdr">' +
          '<div class="an2-panel-title">Tarefas de Hoje — ' + esc(todayName) + '</div>' +
          '<div class="an2-panel-meta" style="color:' + pctCol + '">' + doneCount + '/' + totalObrig + ' obrigatórias ' + (pct>0?'· '+pct+'%':'') + '</div>' +
        '</div>' +
        '<div class="an2-panel-body">' +
          (countdownHtml ? '<div style="margin-bottom:.75rem">' + countdownHtml + '</div>' : '') +
          tasksHtml +
        '</div>' +
      '</div>';
    } catch(e) {
      console.warn('[Dashboard] cmpTodayTasks error:', e.message);
      return '';
    }
  }

  function cmpEq2Panel(m) {
    // ── Data: eq2 external tracker ──────────────────────────────────
    let eq2Raw = {};
    try {
      const concId = localStorage.getItem('protocolo_concurso_ativo') || 'default';
      eq2Raw = JSON.parse(localStorage.getItem('eq2_' + concId) || '{}');
    } catch(e) {}

    const edital = typeof getEditalAtivo === 'function' ? getEditalAtivo() : [];
    const topicItems = [];
    edital.forEach(function(disc) {
      (disc.topics || []).forEach(function(t) {
        const ts = eq2Raw[t.id] || { feitas: 0, erradas: 0 };
        let subF = 0, subE = 0;
        (t.subs || []).forEach(function(s) {
          const ss = eq2Raw[s.id] || { feitas: 0, erradas: 0 };
          subF += ss.feitas; subE += ss.erradas;
        });
        const totalF = ts.feitas + subF;
        const totalE = ts.erradas + subE;
        if (totalF > 0) {
          const pct = Math.round((totalF - totalE) / totalF * 100);
          topicItems.push({ disc: (disc.name.split('—')[0]||disc.name).trim(), name: t.name||t.text||'', feitas: totalF, erradas: totalE, pct });
        }
      });
    });

    // ── Derived values (unchanged from original) ─────────────────────
    const extFeitas  = m.eq2Feitas;
    const extErradas = m.eq2Erradas;
    const extPct     = m.eq2Pct;
    const extCol     = color(extPct);
    const bancoTotal = m.bAnswered;
    const bancoPct   = m.bPct;
    const bancoCol   = color(bancoPct);
    const totalGeral = extFeitas + bancoTotal;
    const combinedCorrect = (extFeitas - extErradas) + m.bCorrect;
    const combinedPct  = totalGeral > 0 ? Math.round(combinedCorrect / totalGeral * 100) : 0;
    const combinedCol  = color(combinedPct);
    const bySorted = topicItems.slice().sort(function(a,b){ return a.pct - b.pct; });
    const worst5   = bySorted.slice(0, 5);
    const best5    = topicItems.slice().sort(function(a,b){ return b.pct - a.pct; }).slice(0, 5);

    // ── Helper: progress bar ──────────────────────────────────────────
    function progBar(pct, col) {
      return '<div class="an2-eq-prog-wrap"><div class="an2-eq-prog-fill" style="width:' + Math.min(pct,100) + '%;background:' + col + '"></div></div>';
    }

    // ── Helper: pill (strong/weak) ────────────────────────────────────
    function pill(item, cls) {
      return '<span class="an2-eq-pill ' + cls + '">' +
        '<span class="an2-eq-pill-name" title="' + esc(item.disc) + ' › ' + esc(item.name) + '">' + esc(item.name) + '</span>' +
        '<span class="an2-eq-pill-pct">' + item.pct + '%</span>' +
      '</span>';
    }

    // ── CARD 1: Questões Externas (Tracker Pessoal) ───────────────────
    function _cardExt() {
      const hasData = extFeitas > 0;
      const body = hasData
        ? '<div class="an2-eq-kpi-row">' +
            '<div class="an2-eq-kpi-cell">' +
              '<div class="an2-eq-kv">' + extFeitas + '</div>' +
              '<div class="an2-eq-kl">Feitas</div>' +
            '</div>' +
            '<div class="an2-eq-kpi-cell">' +
              '<div class="an2-eq-kv" style="color:var(--an-red)">' + extErradas + '</div>' +
              '<div class="an2-eq-kl">Erradas</div>' +
            '</div>' +
            '<div class="an2-eq-kpi-cell">' +
              '<div class="an2-eq-kv" style="color:' + extCol + '">' + extPct + '<span>%</span></div>' +
              '<div class="an2-eq-kl">Aproveit.</div>' +
            '</div>' +
          '</div>' +
          progBar(extPct, extCol) +
          (topicItems.length > 0
            ? '<div class="an2-eq-pills-label">⚡ Zona fraca — priorizar</div>' +
              '<div class="an2-eq-pills">' + worst5.map(function(i){ return pill(i,'weak'); }).join('') + '</div>' +
              '<div class="an2-eq-pills-label" style="margin-top:.65rem">✦ Pontos fortes</div>' +
              '<div class="an2-eq-pills">' + best5.map(function(i){ return pill(i,'strong'); }).join('') + '</div>'
            : '<div style="font-size:.62rem;color:var(--an-text3);margin-top:.3rem">Registre questões em <strong style="color:var(--an-text2)">Desempenho Externo</strong> para ver análise por tópico.</div>'
          )
        : '<div class="an2-eq-empty"><div class="an2-eq-empty-icon">📝</div>Nenhuma questão externa registrada ainda.<br><span style="font-size:.60rem">Use o Tracker em <strong style="color:var(--an-text2)">Desempenho Externo</strong>.</span></div>';

      return '<div class="an2-eq-card">' +
        '<div class="an2-eq-card-accent ext"></div>' +
        '<div class="an2-eq-card-hdr">' +
          '<span class="an2-eq-card-title">Desempenho Externo</span>' +
          '<span class="an2-eq-card-badge ext">Tracker Pessoal</span>' +
        '</div>' +
        '<div class="an2-eq-card-body">' + body + '</div>' +
      '</div>';
    }

    // ── CARD 2: Banco Interno ─────────────────────────────────────────
    function _cardBanco() {
      const hasData = bancoTotal > 0;
      const coveragePct = m.bTotal > 0 ? Math.round(bancoTotal / m.bTotal * 100) : 0;
      const body = hasData
        ? '<div class="an2-eq-kpi-row">' +
            '<div class="an2-eq-kpi-cell">' +
              '<div class="an2-eq-kv">' + bancoTotal + '</div>' +
              '<div class="an2-eq-kl">Respondidas</div>' +
            '</div>' +
            '<div class="an2-eq-kpi-cell">' +
              '<div class="an2-eq-kv" style="color:var(--an-green)">' + m.bCorrect + '</div>' +
              '<div class="an2-eq-kl">Corretas</div>' +
            '</div>' +
            '<div class="an2-eq-kpi-cell">' +
              '<div class="an2-eq-kv" style="color:' + bancoCol + '">' + bancoPct + '<span>%</span></div>' +
              '<div class="an2-eq-kl">Acerto</div>' +
            '</div>' +
          '</div>' +
          progBar(bancoPct, bancoCol) +
          '<div class="an2-eq-coverage">' +
            '<span>Cobertura do banco</span>' +
            '<span class="an2-eq-coverage-val">' + bancoTotal + ' / ' + m.bTotal + '<span style="font-size:.55rem;color:var(--an-text3);margin-left:3px">questões</span></span>' +
          '</div>'
        : '<div class="an2-eq-empty"><div class="an2-eq-empty-icon">🏦</div>Sem questões respondidas ainda.<br><span style="font-size:.60rem">Resolva questões no <strong style="color:var(--an-text2)">Banco de Questões</strong>.</span></div>';

      return '<div class="an2-eq-card">' +
        '<div class="an2-eq-card-accent banco"></div>' +
        '<div class="an2-eq-card-hdr">' +
          '<span class="an2-eq-card-title">Banco Interno</span>' +
          '<span class="an2-eq-card-badge banco">Sistema</span>' +
        '</div>' +
        '<div class="an2-eq-card-body">' + body + '</div>' +
      '</div>';
    }

    // ── CARD 3: Visão Consolidada (executivo) ─────────────────────────
    function _cardGeral() {
      const hasAny = totalGeral > 0;
      return '<div class="an2-eq-consolidated">' +
        '<div class="an2-eq-card-hdr" style="padding:.7rem 1.2rem">' +
          '<span class="an2-eq-card-title">Performance Geral em Questões</span>' +
          '<span class="an2-eq-card-badge geral">Consolidado</span>' +
        '</div>' +
        (hasAny
          ? '<div class="an2-eq-con-body">' +
              '<div class="an2-eq-con-main">' +
                '<div class="an2-eq-con-label">Aproveitamento Geral</div>' +
                '<div class="an2-eq-con-big" style="color:' + combinedCol + '">' + combinedPct + '<span>%</span></div>' +
                '<div class="an2-eq-con-sub">' + combinedCorrect + ' corretas de ' + totalGeral + ' questões feitas</div>' +
                progBar(combinedPct, combinedCol) +
              '</div>' +
              '<div class="an2-eq-con-aside">' +
                '<div class="an2-eq-con-label">Total de Questões</div>' +
                '<div style="font-family:\'Oswald\',sans-serif;font-size:1.6rem;font-weight:600;line-height:1;margin-bottom:.15rem">' + totalGeral + '</div>' +
                '<div class="an2-eq-con-sub" style="margin-bottom:.6rem">externas + banco interno</div>' +
                '<div class="an2-eq-compare">' +
                  '<div class="an2-eq-compare-item">' +
                    '<div class="an2-eq-compare-src">Externas</div>' +
                    '<div class="an2-eq-compare-val" style="color:' + extCol + '">' + (extFeitas > 0 ? extPct + '%' : '—') + '</div>' +
                  '</div>' +
                  '<div class="an2-eq-compare-item">' +
                    '<div class="an2-eq-compare-src">Banco</div>' +
                    '<div class="an2-eq-compare-val" style="color:' + bancoCol + '">' + (bancoTotal > 0 ? bancoPct + '%' : '—') + '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>'
          : '<div class="an2-eq-empty" style="padding:1.5rem"><div class="an2-eq-empty-icon">📊</div>Nenhuma questão registrada.<br><span style="font-size:.60rem">Resolva questões no banco ou registre no tracker para ver sua performance aqui.</span></div>'
        ) +
      '</div>';
    }

    // ── Assemble: Geral on top, Ext+Banco grid below ──────────────────
    return '<div class="an2-eq-cards-grid">' +
      _cardGeral() +
      '<div class="an2-eq-source-row">' +
        _cardExt() +
        _cardBanco() +
      '</div>' +
    '</div>';
  }


  function viewOverview(m) {
    return `
      ${cmpTodayTasks()}
      <div class="an2-section">Atividade & Consistência</div>
      <div class="an2-cols-3" style="margin-bottom:1.25rem">
        <div class="an2-panel">
          <div class="an2-panel-hdr">
            <div class="an2-panel-title">Heatmap de Atividade</div>
            <div class="an2-panel-meta">13 semanas</div>
          </div>
          <div class="an2-panel-body">${cmpHeatmap(m)}</div>
        </div>
        <div class="an2-panel">
          <div class="an2-panel-hdr"><div class="an2-panel-title">Streak</div></div>
          <div class="an2-panel-body">${cmpStreak(m)}</div>
        </div>
      </div>
      <div class="an2-section">Cobertura & Performance</div>
      <div class="an2-cols-2" style="margin-bottom:1.25rem">
        <div class="an2-panel">
          <div class="an2-panel-hdr">
            <div class="an2-panel-title">Questões por Dia</div>
            <div class="an2-panel-meta">últimas ${AN2.period==="all"?"90":AN2.period} dias</div>
          </div>
          <div class="an2-panel-body">${cmpBars(m)}</div>
        </div>
        <div class="an2-panel">
          <div class="an2-panel-hdr"><div class="an2-panel-title">Cobertura por Módulo</div></div>
          <div class="an2-panel-body">${cmpRings(m)}</div>
        </div>
      </div>
      <div class="an2-section">Inteligência do Sistema</div>
      <div class="an2-panel" style="margin-bottom:1.25rem">
        <div class="an2-panel-hdr"><div class="an2-panel-title">Insights do Sistema</div></div>
        <div class="an2-panel-body">${cmpInsights(m)}</div>
      </div>
      <div class="an2-section">Edital Completo — Em Progresso e Não Iniciadas</div>
      <div class="an2-panel">
        <div class="an2-panel-body">${cmpEditalByBloco(m)}</div>
      </div>
      <div class="an2-section">Desempenho em Questões</div>
      ${cmpEq2Panel(m)}`;
  }

  function viewEdital(m) {
    const dominated = [...m.edDiscs].filter(d=>d.pct>=100).sort((a,b)=>a.name.localeCompare(b.name));
    const inProg    = [...m.edDiscs].filter(d=>d.pct>0&&d.pct<100).sort((a,b)=>b.pct-a.pct);
    const notStart  = [...m.edDiscs].filter(d=>d.pct===0);
    const sec=(title,items,col)=>!items.length?'':`
      <div class="an2-section" style="color:${col}">${title} <span style="font-family:'Barlow',sans-serif;font-size:.60rem;letter-spacing:.04em">${items.length}</span></div>
      <div class="an2-panel" style="margin-bottom:1rem">
        <div class="an2-panel-body">${cmpDiscTable({edDiscs:items},items.length)}</div>
      </div>`;
    return `
      <div class="an2-stat-row" style="grid-template-columns:repeat(3,1fr);margin-bottom:1.25rem">
        ${[
          {label:'Total',val:m.edDiscs.length,sup:'disciplinas',sub:'no edital',accent:'var(--an-blue)'},
          {label:'Dominadas',val:dominated.length,sup:'',sub:'100% concluídas',accent:'var(--an-green)'},
          {label:'Cobertura Geral',val:m.edPct,sup:'%',sub:`${m.edDiscs.filter(d=>d.done>0).length} com algum progresso`,accent:color(m.edPct)},
        ].map(k=>`<div class="an2-stat" style="--an-stat-accent:${k.accent}">
          <div class="an2-stat-label">${k.label}</div>
          <div class="an2-stat-value">${k.val}<sup>${k.sup}</sup></div>
          <div class="an2-stat-sub">${k.sub}</div>
        </div>`).join('')}
      </div>
      ${sec('Dominadas',dominated,'var(--an-green)')}
      ${sec('Em Progresso',inProg,'var(--an-amber)')}
      ${sec('Não Iniciadas',notStart,'var(--an-text3)')}`;
  }

  function viewQuestoes(m) {
    return `
      ${cmpEq2Panel(m)}
      <div class="an2-section" style="margin-top:1.5rem">Ritmo Diário</div>
      <div class="an2-panel" style="margin-bottom:1.25rem">
        <div class="an2-panel-hdr"><div class="an2-panel-title">Questões por Dia — últimos ${AN2.period==="all"?"90":AN2.period} dias</div></div>
        <div class="an2-panel-body">${cmpBars(m)}</div>
      </div>
      <div class="an2-section">Simulados</div>
      <div class="an2-panel">
        <div class="an2-panel-hdr">
          <div class="an2-panel-title">Histórico de Resultados</div>
          <div class="an2-panel-meta">média: ${m.simAvg}%</div>
        </div>
        <div class="an2-panel-body">${cmpSimTimeline(m)}</div>
      </div>`;
  }
  function viewLeitura(m) {
    const getLK=typeof getLeitKey==='function'?getLeitKey:(id,a)=>`leit_${id}_${a}`;
    const leitura=DATA.leitura();
    const leiStats=m.leis.map(l=>{
      const done=l.arts.filter(a=>leitura[getLK(l.id,a)]).length;
      return{...l,done,pct:l.arts.length>0?Math.round(done/l.arts.length*100):0};
    }).sort((a,b)=>b.pct-a.pct);

    return `
      <div class="an2-stat-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:1.25rem">
        ${[
          {label:'Artigos Lidos',   val:m.lDone,  sup:'',  sub:`de ${m.lTotal} total`, accent:'var(--an-gold)'},
          {label:'Cobertura',       val:m.lPct,   sup:'%', sub:'dos artigos', accent:color(m.lPct)},
          {label:'Leis Completas',  val:leiStats.filter(l=>l.pct>=100).length, sup:'', sub:`de ${m.leis.length} leis`, accent:'var(--an-green)'},
          {label:'Não Iniciadas',   val:leiStats.filter(l=>l.pct===0).length,  sup:'', sub:'leis sem leitura', accent:'var(--an-text3)'},
        ].map(k=>`<div class="an2-stat" style="--an-stat-accent:${k.accent}">
          <div class="an2-stat-label">${k.label}</div>
          <div class="an2-stat-value">${k.val}<sup>${k.sup}</sup></div>
          <div class="an2-stat-sub">${k.sub}</div>
        </div>`).join('')}
      </div>
      <div class="an2-section">Cobertura por Legislação</div>
      <div class="an2-panel">
        <div class="an2-panel-body">
          <div class="an2-disc-list">${leiStats.map(l=>{
            const col=color(l.pct);
            return `<div class="an2-disc-item">
              <div class="an2-disc-name" title="${esc(l.name)}">${esc(l.name.replace(/\s*\(Arts\..+\)/,'').trim())}</div>
              <div class="an2-disc-track" style="width:160px"><div class="an2-disc-fill" style="width:${l.pct}%;background:${col}"></div></div>
              <div class="an2-disc-pct" style="color:${col}">${l.pct}%</div>
              <div class="an2-disc-frac">${l.done}/${l.arts.length}</div>
            </div>`;
          }).join('')}</div>
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * MAIN BUILD / RENDER
   * ══════════════════════════════════════════════════════════════════ */
  function an2Build() {
    const root = document.getElementById('an2-root');
    if (!root) return;

    // Benchmark with P01Debug if available
    const t0 = performance.now();

    const m = metrics();
    const concurso = DATA.concurso();

    const tabDefs = [
      { id:'overview',  label:'Visão Geral',  icon:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
      { id:'edital',    label:'Edital',       icon:'<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>' },
      { id:'questoes',  label:'Questões',     icon:'<circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
      { id:'leitura',   label:'Leitura',      icon:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>' },
    ];

    const periods = [
      { val:'7',   label:'7d' },
      { val:'30',  label:'30d' },
      { val:'90',  label:'90d' },
      { val:'all', label:'Tudo' },
    ];

    const viewHtml =
      AN2.view === 'overview' ? viewOverview(m) :
      AN2.view === 'edital'   ? viewEdital(m)   :
      AN2.view === 'questoes' ? viewQuestoes(m) :
      AN2.view === 'leitura'  ? viewLeitura(m)  : viewOverview(m);

    root.innerHTML = `
      <!-- Top bar -->
      <div class="an2-topbar">
        <span class="an2-title">Dashboard</span>
        <span class="an2-concurso">${esc(concurso)}</span>
        <div class="an2-sep"></div>
        <div class="an2-tabs">
          ${tabDefs.map(t=>`
            <button class="an2-tab${AN2.view===t.id?' active':''}" onclick="an2SetView('${t.id}')">
              <svg viewBox="0 0 24 24">${t.icon}</svg>${t.label}
            </button>`).join('')}
        </div>
        <div class="an2-spacer"></div>
        <div class="an2-period">
          ${periods.map(p=>`
            <button class="an2-period-btn${AN2.period===p.val?' active':''}" onclick="an2SetPeriod('${p.val}')">${p.label}</button>`
          ).join('')}
        </div>
      </div>
      <!-- Body -->
      <div class="an2-body">
        <div class="an2-content">${viewHtml}</div>
      </div>`;

    const elapsed = performance.now() - t0;
    if (elapsed > 150) console.warn('[analytics-next] Slow render:', elapsed.toFixed(1)+'ms');
    else console.debug('[analytics-next] Rendered in', elapsed.toFixed(1)+'ms');

    // Notify P01Debug
    if (typeof P01Debug !== 'undefined') P01Debug.bench('analytics-next:render', ()=>null);
    // Update topbar breadcrumb with current view name
    try { if (typeof topbarSubTabUpdate === 'function') topbarSubTabUpdate('analytics-next', AN2.view); else if (typeof topbarUpdate === 'function') topbarUpdate('analytics-next', AN2.view); } catch(e2) {}
  }

  /* ── PUBLIC ACTIONS ─────────────────────────────────────────────── */
  window.an2SetView   = function(v) { AN2.view=v; an2Build(); };
  // Mark today as studied in sessoesDiarias (for streak counting)
  function _markStudiedToday() {
    try {
      if (typeof ST === 'undefined' || !ST) return;
      const today = new Date(); today.setHours(0,0,0,0);
      const y = today.getFullYear();
      const mo = String(today.getMonth()+1).padStart(2,'0');
      const d  = String(today.getDate()).padStart(2,'0');
      const dataStr = y + '-' + mo + '-' + d;
      if (!ST.sessoesDiarias) ST.sessoesDiarias = {};
      if (!ST.sessoesDiarias[dataStr]) {
        ST.sessoesDiarias[dataStr] = {
          data: dataStr,
          questoes:   { total:0, acertos:0, duracao:0, blocos:[] },
          tarefas:    { concluidas:0, itens:[] },
          artigos:    { total:0, itens:[] },
          edital:     { marcacoes:0 },
          flashcards: { revisoes:0, acertos:0 },
          salvaManualmente: true,
          criadoEm: new Date().toISOString()
        };
      } else {
        ST.sessoesDiarias[dataStr].salvaManualmente = true;
      }
      if (typeof saveState === 'function') saveState();
    } catch(e) {}
  }

  window.an2ToggleTask = function(tid) {
    if (typeof ST !== 'undefined' && ST.cronograma !== undefined) {
      ST.cronograma[tid] = !ST.cronograma[tid];
      _markStudiedToday();  // count as studied day
      if (document.getElementById('an2-root')) an2Build();
    }
  };
  window.an2SetPeriod = function(p) { AN2.period=p; an2Build(); };

  /* ── P01 CORE ENGINE REGISTRATION ───────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function() {
    // Register with P01Modules
    if (typeof P01Modules !== 'undefined') {
      P01Modules.register({
        id:       'analytics-next',
        build:    an2Build,
        render:   an2Build,
        teardown: function() { AN2.view='overview'; },
        rebuild:  an2Build,
      });
    }

    // React to P01Bus events
    if (typeof P01Bus !== 'undefined') {
      P01Bus.on('concurso:changed',     function() { if(_isActive()) an2Build(); });
      P01Bus.on('edital:saved',         function() { if(_isActive()) an2Build(); });
      P01Bus.on('leitura:saved',        function() { if(_isActive()) an2Build(); });
      P01Bus.on('leitura:art:toggled',  function() { if(_isActive()) an2Build(); });
      P01Bus.on('tab:changed', function(d) { if(d&&d.id==='analytics-next') an2Build(); });
    }

    // goTab hook
    const _orig = window.goTab;
    if (typeof _orig === 'function') {
      window.goTab = function(id) {
        _orig(id);
        if (id === 'analytics-next') {
          try { setTimeout(an2Build, 20); }
          catch(e) { console.warn('[analytics-next] goTab error:', e.message); }
        }
      };
    }

    // concTrocar hook
    const _oc = window.concTrocar;
    if (typeof _oc === 'function') {
      window.concTrocar = function(id) {
        _oc(id);
        if (_isActive()) setTimeout(an2Build, 80);
      };
    }

    // Auto-build if active on load
    setTimeout(function() { if (_isActive()) an2Build(); }, 150);
  });

  function _isActive() {
    const t = document.getElementById('tab-analytics-next');
    return t && t.classList.contains('active');
  }

})();

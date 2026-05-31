/* ════════════════════════════════════════════════════════════════════
 * profile-panel.js — PROTOCOLO 01 · Fase 2.2.1 · Hotfix 1
 * ────────────────────────────────────────────────────────────────────
 * ARQUITETURA DESACOPLADA — Backup & Restauração com renderização
 * própria. Zero movimentação de DOM. Zero appendChild/reparenting.
 *
 * ESTRATÉGIA DE INTEGRAÇÃO COM app.js:
 *   As funções do app.js (bkRenderResumo, bkRenderHistorico, etc.)
 *   consultam IDs fixos no DOM original (#bk-export-resumo, etc.).
 *   Esta implementação cria containers PRÓPRIOS (pp-export-resumo,
 *   pp-hist-list, etc.) e usa wrappers que:
 *     1. Chamam a função original do app.js (que preenche o ID antigo)
 *     2. Copiam o innerHTML resultante para o container novo
 *   Para importação, recria a estrutura de steps com IDs próprios
 *   e adapta as chamadas às funções reais.
 *
 * RESULTADO: #tab-backup permanece oculto e intocado. Nenhum elemento
 * é movido. A seção Dados & Backup tem HTML e DOM completamente
 * independentes.
 *
 * VERSÃO: Fase 2.2.1 · Hotfix 1
 * ════════════════════════════════════════════════════════════════════ */

(function(){

  /* ══════════════════════════════════════════════════════════════════
   * DEFAULTS & ESTADO INTERNO
   * ══════════════════════════════════════════════════════════════════ */
  var DEFAULTS = {
    displayName:'Estudante', email:'usuario@email.com', avatarInitial:'',
    theme:'dark', animations:true, compactMode:false,
    rememberLastTab:true, rememberConcAtivo:true,
    autoCollapseSidebar:true, lastTab:'dashboard'
  };

  var ACTIVE_PANEL = 'identidade';
  var ACTIVE_BK_SUB = 'exportar';

  /* ══════════════════════════════════════════════════════════════════
   * HELPERS GERAIS
   * ══════════════════════════════════════════════════════════════════ */
  function _getProfile(){
    if(typeof ST==='undefined') return Object.assign({},DEFAULTS);
    if(!ST.userProfile) ST.userProfile=Object.assign({},DEFAULTS);
    Object.keys(DEFAULTS).forEach(function(k){
      if(ST.userProfile[k]===undefined) ST.userProfile[k]=DEFAULTS[k];
    });
    return ST.userProfile;
  }

  function _saveProfile(){
    if(typeof saveState==='function') saveState();
    _showSaved();
  }

  function _showSaved(){
    var el=document.getElementById('pp-save-indicator');
    if(!el) return;
    el.classList.add('shown');
    clearTimeout(el._t);
    el._t=setTimeout(function(){ el.classList.remove('shown'); },1800);
  }

  function _initial(name){
    var t=String(name||'').trim();
    return t ? t.charAt(0).toUpperCase() : 'E';
  }

  function _esc(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _calcStorage(){
    try{
      var tot=0;
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i);
        tot+=k.length+(localStorage.getItem(k)||'').length;
      }
      if(tot<1024) return tot+' B';
      if(tot<1048576) return (tot/1024).toFixed(1)+' KB';
      return (tot/1048576).toFixed(2)+' MB';
    }catch(e){return '—';}
  }

  function _lastBackup(){
    try{
      var raw=localStorage.getItem('pmal26_backup_hist');
      if(!raw) return {value:'Nunca',sub:'Crie um backup na aba Exportar'};
      var h=JSON.parse(raw);
      if(!Array.isArray(h)||!h.length) return {value:'Nunca',sub:'Crie um backup na aba Exportar'};
      var last=h[0];
      if(!last||!last.data) return {value:'Disponível',sub:h.length+' backup(s)'};
      var tipo=last.tipo?String(last.tipo).charAt(0).toUpperCase()+String(last.tipo).slice(1):'Manual';
      return {
        value:last.data,
        sub:tipo+' · às '+(last.hora||'—')+' · '+h.length+' total'+(h.length>1?'is':'')
      };
    }catch(e){return {value:'—',sub:'Verifique a aba Exportar'};}
  }

  function _applyPrefs(){
    var p=_getProfile();
    var isLight=document.body.classList.contains('light');
    if(p.theme==='light'&&!isLight&&typeof toggleTheme==='function') toggleTheme();
    else if(p.theme==='dark'&&isLight&&typeof toggleTheme==='function') toggleTheme();
    var av=document.getElementById('sb-user-avatar');
    var nm=document.getElementById('sb-user-name');
    var em=document.getElementById('sb-user-email');
    if(av) av.textContent=_initial(p.displayName);
    if(nm) nm.textContent=p.displayName||DEFAULTS.displayName;
    if(em) em.textContent=p.email||DEFAULTS.email;
  }


  /* ══════════════════════════════════════════════════════════════════
   * BUILD PRINCIPAL
   * ══════════════════════════════════════════════════════════════════ */
  function buildProfile(){
    var tab=document.getElementById('tab-perfil');
    if(!tab) return;

    tab.innerHTML=
      _renderHeader()+
      _renderTabs()+
      _renderPanelIdentidade(_getProfile())+
      _renderPanelAparencia(_getProfile())+
      _renderPanelExperiencia(_getProfile())+
      _renderPanelDados()+
      _renderPanelIntegracoes()+
      _renderPanelAvancado();

    ppSwitchTab(ACTIVE_PANEL);
  }


  /* ══════════════════════════════════════════════════════════════════
   * HEADER
   * ══════════════════════════════════════════════════════════════════ */
  function _renderHeader(){
    return '<div class="pp-header">'+
      '<div class="pp-header-left"><div>'+
        '<div class="pp-header-title">Perfil &amp; Preferências</div>'+
        '<div class="pp-header-subtitle">Conta, aparência, dados e preferências do sistema</div>'+
      '</div></div>'+
      '<div class="pp-save-indicator" id="pp-save-indicator">Salvo</div>'+
    '</div>';
  }


  /* ══════════════════════════════════════════════════════════════════
   * TABS NAV
   * ══════════════════════════════════════════════════════════════════ */
  function _renderTabs(){
    var tabs=[
      {id:'identidade', label:'Perfil',        icon:_ico('user')},
      {id:'aparencia',  label:'Aparência',      icon:_ico('paint')},
      {id:'experiencia',label:'Experiência',    icon:_ico('sparkle')},
      {id:'dados',      label:'Dados & Backup', icon:_ico('hdd')},
      {id:'integracoes',label:'Integrações',    icon:_ico('plug')},
      {id:'avancado',   label:'Avançado',       icon:_ico('shield')}
    ];
    return '<div class="pp-tabs" role="tablist">'+
      tabs.map(function(t){
        return '<button class="pp-tab" id="pp-tab-'+t.id+'" '+
               'onclick="ppSwitchTab(\''+t.id+'\')" type="button">'+
               t.icon+'<span>'+t.label+'</span></button>';
      }).join('')+
    '</div>';
  }


  /* ══════════════════════════════════════════════════════════════════
   * PANEL: IDENTIDADE
   * ══════════════════════════════════════════════════════════════════ */
  function _renderPanelIdentidade(p){
    return '<div class="pp-panel" id="pp-panel-identidade">'+
      '<div class="pp-card">'+
        '<div class="pp-identity">'+
          '<div class="pp-avatar-big" id="pp-avatar-big">'+_initial(p.displayName)+'</div>'+
          '<div class="pp-identity-info">'+
            '<div class="pp-identity-name" id="pp-identity-name">'+_esc(p.displayName)+'</div>'+
            '<div class="pp-identity-email" id="pp-identity-email">'+_esc(p.email)+'</div>'+
            '<div class="pp-identity-badge">Conta Local</div>'+
          '</div>'+
        '</div>'+
        '<div class="pp-field">'+
          '<label class="pp-label" for="pp-input-name">Nome de exibição</label>'+
          '<input class="pp-input" id="pp-input-name" type="text" maxlength="40" '+
          'value="'+_esc(p.displayName)+'" placeholder="Como você quer ser chamado">'+
        '</div>'+
        '<div class="pp-field">'+
          '<label class="pp-label" for="pp-input-email">Email</label>'+
          '<input class="pp-input" id="pp-input-email" type="email" maxlength="80" '+
          'value="'+_esc(p.email)+'" placeholder="seu@email.com">'+
          '<div class="pp-help">Quando você conectar uma conta Google, este campo será sincronizado automaticamente.</div>'+
        '</div>'+
        '<div class="pp-actions">'+
          '<button class="pp-btn pp-btn-primary" onclick="ppSaveIdentity()" type="button">Salvar alterações</button>'+
          '<button class="pp-btn pp-btn-ghost" onclick="ppResetIdentity()" type="button">Restaurar padrão</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }


  /* ══════════════════════════════════════════════════════════════════
   * PANEL: APARÊNCIA
   * ══════════════════════════════════════════════════════════════════ */
  function _renderPanelAparencia(p){
    return '<div class="pp-panel" id="pp-panel-aparencia">'+
      '<div class="pp-card">'+
        '<div class="pp-card-header">'+
          '<div class="pp-card-title">Tema</div>'+
          '<div class="pp-card-desc">Modo escuro elegante ou claro refinado.</div>'+
        '</div>'+
        '<div class="pp-row">'+
          '<div class="pp-row-info">'+
            '<div class="pp-row-title">Modo de cor</div>'+
            '<div class="pp-row-desc">Aplicado imediatamente em todo o sistema.</div>'+
          '</div>'+
          '<div class="pp-row-control">'+
            '<div class="pp-segment">'+
              '<button class="pp-segment-btn '+(p.theme==='dark'?'active':'')+'" '+
              'onclick="ppSetTheme(\'dark\')" type="button">'+_ico('moon')+'Escuro</button>'+
              '<button class="pp-segment-btn '+(p.theme==='light'?'active':'')+'" '+
              'onclick="ppSetTheme(\'light\')" type="button">'+_ico('sun')+'Claro</button>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="pp-card">'+
        '<div class="pp-card-header">'+
          '<div class="pp-card-title">Movimento</div>'+
          '<div class="pp-card-desc">Animações e transições do sistema.</div>'+
        '</div>'+
        '<div class="pp-row">'+
          '<div class="pp-row-info">'+
            '<div class="pp-row-title">Animações suaves</div>'+
            '<div class="pp-row-desc">Microinterações, fades e transições refinadas.</div>'+
          '</div>'+
          '<div class="pp-row-control">'+_ppSwitch('animations',p.animations)+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="pp-card">'+
        '<div class="pp-card-header">'+
          '<div class="pp-card-title">Densidade</div>'+
          '<div class="pp-card-desc">Espaçamento interno das listas e cards.</div>'+
        '</div>'+
        '<div class="pp-row">'+
          '<div class="pp-row-info">'+
            '<div class="pp-row-title">Layout</div>'+
            '<div class="pp-row-desc">Compacto mostra mais informação na tela.</div>'+
          '</div>'+
          '<div class="pp-row-control">'+
            '<div class="pp-segment">'+
              '<button class="pp-segment-btn '+(!p.compactMode?'active':'')+'" '+
              'onclick="ppSetSegment(\'compactMode\',false)" type="button">Confortável</button>'+
              '<button class="pp-segment-btn '+(p.compactMode?'active':'')+'" '+
              'onclick="ppSetSegment(\'compactMode\',true)" type="button">Compacto</button>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  }


  /* ══════════════════════════════════════════════════════════════════
   * PANEL: EXPERIÊNCIA
   * ══════════════════════════════════════════════════════════════════ */
  function _renderPanelExperiencia(p){
    return '<div class="pp-panel" id="pp-panel-experiencia">'+
      '<div class="pp-card">'+
        '<div class="pp-card-header">'+
          '<div class="pp-card-title">Comportamento ao iniciar</div>'+
          '<div class="pp-card-desc">Como o sistema se comporta ao abrir.</div>'+
        '</div>'+
        '<div class="pp-row">'+
          '<div class="pp-row-info">'+
            '<div class="pp-row-title">Abrir na última aba usada</div>'+
            '<div class="pp-row-desc">Em vez de sempre iniciar no Dashboard.</div>'+
          '</div>'+
          '<div class="pp-row-control">'+_ppSwitch('rememberLastTab',p.rememberLastTab)+'</div>'+
        '</div>'+
        '<div class="pp-row">'+
          '<div class="pp-row-info">'+
            '<div class="pp-row-title">Lembrar concurso ativo</div>'+
            '<div class="pp-row-desc">Mantém o concurso selecionado entre sessões.</div>'+
          '</div>'+
          '<div class="pp-row-control">'+_ppSwitch('rememberConcAtivo',p.rememberConcAtivo)+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="pp-card">'+
        '<div class="pp-card-header">'+
          '<div class="pp-card-title">Sidebar</div>'+
          '<div class="pp-card-desc">Comportamento da barra lateral.</div>'+
        '</div>'+
        '<div class="pp-row">'+
          '<div class="pp-row-info">'+
            '<div class="pp-row-title">Recolher automaticamente em telas pequenas</div>'+
            '<div class="pp-row-desc">Mostra só os ícones quando a largura é limitada.</div>'+
          '</div>'+
          '<div class="pp-row-control">'+_ppSwitch('autoCollapseSidebar',p.autoCollapseSidebar)+'</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  }


  /* ══════════════════════════════════════════════════════════════════
   * PANEL: DADOS & BACKUP
   * Ordem: 1.Armazenamento 2.Sincronização 3.Backup & Restauração
   * Renderização 100% própria — zero reparenting.
   * ══════════════════════════════════════════════════════════════════ */
  function _renderPanelDados(){
    var stor=_calcStorage();
    var bk=_lastBackup();

    return '<div class="pp-panel" id="pp-panel-dados">'+

      /* ── 1. ARMAZENAMENTO ── */
      '<div class="pp-card">'+
        '<div class="pp-card-header">'+
          '<div class="pp-card-title">Armazenamento</div>'+
          '<div class="pp-card-desc">Estado atual dos seus dados neste dispositivo.</div>'+
        '</div>'+
        '<div class="pp-status-grid">'+
          _statusItem('hdd','','Local',
            '<span class="pp-badge pp-badge-green">Ativo</span>',
            stor+' em uso')+
          _statusItem('cloud','cloud','Nuvem',
            '<span class="pp-badge pp-badge-dim">Não conectado</span>',
            'Sync indisponível')+
          _statusItem('clock','','Último backup',
            '<span style="font-weight:600">'+_esc(bk.value)+'</span>',
            _esc(bk.sub))+
        '</div>'+
      '</div>'+

      /* ── 2. SINCRONIZAÇÃO NA NUVEM ── */
      '<div class="pp-card">'+
        '<div class="pp-card-header">'+
          '<div class="pp-card-title">Sincronização na nuvem</div>'+
          '<div class="pp-card-desc">Conecte uma conta para sincronizar entre dispositivos.</div>'+
        '</div>'+
        '<div class="pp-connect">'+
          '<div class="pp-connect-icon">'+_ico('shield')+'</div>'+
          '<div class="pp-connect-title">Google Drive Sync · em breve</div>'+
          '<div class="pp-connect-desc">Em versão futura, seus dados serão sincronizados automaticamente com o Google Drive e acessíveis de qualquer dispositivo.</div>'+
          '<button class="pp-connect-btn-soon" type="button" disabled>'+_ico('lock')+' Em breve</button>'+
        '</div>'+
      '</div>'+

      /* ── 3. BACKUP & RESTAURAÇÃO ── */
      '<div class="pp-card" id="pp-bk-card">'+
        '<div class="pp-card-header">'+
          '<div class="pp-card-title">Backup & Restauração</div>'+
          '<div class="pp-card-desc">Exporte, importe ou restaure snapshots dos seus dados.</div>'+
        '</div>'+
        '<div class="pp-subtabs" id="pp-bk-subtabs">'+
          '<button class="pp-subtab active" id="pp-bksub-exportar"  onclick="ppBkSubAba(\'exportar\')"  type="button">'+_ico('download')+' Exportar</button>'+
          '<button class="pp-subtab"        id="pp-bksub-importar"  onclick="ppBkSubAba(\'importar\')"  type="button">'+_ico('upload')+' Importar</button>'+
          '<button class="pp-subtab"        id="pp-bksub-historico" onclick="ppBkSubAba(\'historico\')" type="button">'+_ico('clock')+' Histórico</button>'+
        '</div>'+
        /* Container de conteúdo exclusivo — nunca recebe elementos externos */
        '<div id="pp-bk-content" style="margin-top:1.1rem;min-height:120px"></div>'+
      '</div>'+

    '</div>';
  }


  /* ══════════════════════════════════════════════════════════════════
   * RENDERIZADORES PRÓPRIOS DE BACKUP
   * Constroem HTML independente. Chamam funções do app.js apenas
   * para ações (exportar, importar, restaurar) — nunca para renderizar
   * diretamente nesta área.
   * ══════════════════════════════════════════════════════════════════ */

  /* ── Exportar ─────────────────────────────────────────────────── */
  function _renderBkExportar(){
    /* Coleta o resumo do estado atual usando os mesmos dados que bkRenderResumo() usa */
    var resumoHTML = _buildResumoHTML();

    return '<div id="pp-painel-exportar">'+
      '<div class="pp-bk-info-box">'+
        '<div class="pp-bk-info-title">O que é exportado</div>'+
        '<div class="pp-bk-info-body">Todos os seus dados: simulados, banco de questões, flash cards, cronograma, leitura, estatísticas e revisão espaçada. Arquivo <strong>.json</strong> com nome e data/hora.</div>'+
      '</div>'+
      '<div class="pp-bk-resumo" id="pp-export-resumo">'+resumoHTML+'</div>'+
      '<button class="pp-btn pp-btn-primary" style="width:100%;justify-content:center;padding:.65rem" '+
      'onclick="ppBkExportar()" type="button">'+_ico('download')+' Gerar e baixar backup</button>'+
      '<div style="font-size:.62rem;color:var(--pp-text-muted);text-align:center;margin-top:.5rem">'+
        'Salve o arquivo no Google Drive, WhatsApp ou e-mail para usar em outro aparelho.'+
      '</div>'+
    '</div>';
  }

  function _buildResumoHTML(){
    /* Replica o cálculo de bkRenderResumo() com dados diretos do ST */
    if(typeof ST==='undefined') return '<div style="color:var(--pp-text-muted);font-size:.75rem">Carregando...</div>';
    var decks=(ST.flashDecks||[]);
    var cards=decks.reduce(function(a,d){ return a+(d.cards||[]).length; },0);
    var temEdital=false;
    var temLeis=false;
    var temCron=false;
    try{ temEdital=typeof _editalCfgLoad==='function'&&!!_editalCfgLoad(); }catch(e){}
    try{ temLeis=typeof _leisCfgKey==='function'&&!!JSON.parse(localStorage.getItem(_leisCfgKey())||'null'); }catch(e){}
    try{ temCron=typeof _cfgLoad==='function'&&!!_cfgLoad(); }catch(e){}

    var rows=[
      ['📋 Simulados',      (ST.simulados||[]).length],
      ['📚 Banco de Questões', (ST.banco||[]).length+' questões'],
      ['🃏 Flash Cards',    cards+' cards / '+decks.length+' decks'],
      ['📆 Cronograma',     Object.keys(ST.cronograma||{}).length+' marcações'],
      ['📖 Leitura das Leis', Object.keys(ST.leitura||{}).length+' artigos'],
      ['🕐 Sessões',        (ST.sessoes||[]).length+' / '+Object.keys(ST.sessoesDiarias||{}).length+' dias'],
      ['📊 Estat. Questões', Object.keys(ST.questoes||{}).length+' tópicos'],
      ['🔁 Revisão Espaçada', Object.keys(ST.revisaoEspacada||{}).length+' cards'],
      ['📝 Progresso',      Object.keys(ST.progresso||{}).length+' itens'],
      ['📄 Resumos',        Object.keys(ST.resumos||{}).length],
      ['⚙️ Cfg. Edital',    temEdital?'✓ incluída':'—'],
      ['⚙️ Cfg. Leis',      temLeis?'✓ incluída':'—'],
      ['⚙️ Cfg. Cronograma',temCron?'✓ incluída':'—']
    ];

    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 16px;font-size:.72rem">'+
      rows.map(function(r){
        return '<span style="color:var(--pp-text-muted)">'+r[0]+'</span>'+
               '<strong style="color:var(--pp-text)">'+r[1]+'</strong>';
      }).join('')+
    '</div>';
  }


  /* ── Importar ─────────────────────────────────────────────────── */
  function _renderBkImportar(){
    /* Step 1: seleção de arquivo */
    return '<div id="pp-painel-importar">'+
      '<div id="pp-imp-step1">'+
        '<div style="font-size:.8rem;color:var(--pp-text-2);line-height:1.7;margin-bottom:.85rem">'+
          'Selecione o arquivo <code style="background:var(--pp-surface-raise);padding:1px 6px;border-radius:4px">.json</code> gerado por este sistema.'+
        '</div>'+
        '<input type="file" id="pp-bk-file-input" accept=".json" style="display:none" onchange="ppBkLerArquivo(this)">'+
        '<button class="pp-btn pp-btn-secondary" style="width:100%;justify-content:center" '+
        'onclick="document.getElementById(\'pp-bk-file-input\').click()" type="button">'+
          _ico('upload')+' Selecionar arquivo .json'+
        '</button>'+
      '</div>'+

      /* Step 2: prévia + modo */
      '<div id="pp-imp-step2" style="display:none">'+
        '<div id="pp-bk-preview" class="pp-bk-resumo" style="margin-bottom:.85rem"></div>'+
        '<div class="pp-label" style="margin-bottom:.5rem">Modo de importação</div>'+
        '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:.85rem" id="pp-bk-modos-wrap">'+
          _bkModeRadio('substituir','🔄 Substituir tudo','Apaga tudo e aplica o backup. Ideal para sincronizar entre aparelhos.','var(--pp-gold)',true)+
          _bkModeRadio('mesclar','🔀 Mesclar (merge)','Une com os dados atuais. IDs iguais não duplicam. Progresso mais avançado prevalece.','#60a5fa',false)+
          _bkModeRadio('diff','🔍 Comparar antes de aplicar','Mostra exatamente o que será inserido, alterado ou removido. Você confirma item a item.','#a78bfa',false)+
        '</div>'+
        '<div style="display:flex;gap:8px">'+
          '<button class="pp-btn pp-btn-primary" style="flex:1;justify-content:center" onclick="ppBkAvancar()" type="button">Continuar →</button>'+
          '<button class="pp-btn pp-btn-ghost" onclick="ppBkImpStep(1)" type="button">← Voltar</button>'+
        '</div>'+
      '</div>'+

      /* Step 3: diff viewer */
      '<div id="pp-imp-step3" style="display:none">'+
        '<div style="font-family:\'Oswald\',sans-serif;font-size:.8rem;font-weight:700;color:#a78bfa;margin-bottom:.65rem">🔍 O que será alterado</div>'+
        '<div id="pp-bk-diff-list" style="max-height:55vh;overflow-y:auto;margin-bottom:.85rem"></div>'+
        '<div style="display:flex;gap:8px">'+
          '<button class="pp-btn pp-btn-primary" style="flex:1;justify-content:center" onclick="ppBkConfirmarDiff()" type="button">✓ Confirmar e aplicar</button>'+
          '<button class="pp-btn pp-btn-ghost" onclick="ppBkImpStep(2)" type="button">← Voltar</button>'+
        '</div>'+
      '</div>'+

      /* Step 4: sucesso */
      '<div id="pp-imp-step4" style="display:none;text-align:center;padding:1.5rem 1rem">'+
        '<div style="font-size:2.2rem;margin-bottom:.5rem">✅</div>'+
        '<div style="font-family:\'Oswald\',sans-serif;font-size:1rem;font-weight:700;color:var(--pp-green);margin-bottom:.4rem">Backup aplicado com sucesso!</div>'+
        '<div style="font-size:.75rem;color:var(--pp-text-muted);margin-bottom:1.2rem" id="pp-bk-sucesso-msg"></div>'+
        '<button class="pp-btn pp-btn-primary" onclick="goTab(\'analytics-next\')" type="button">← Ir para Dashboard</button>'+
      '</div>'+
    '</div>';
  }

  function _bkModeRadio(value, title, desc, color, checked){
    return '<label style="display:flex;align-items:flex-start;gap:10px;padding:.55rem .7rem;'+
           'background:var(--pp-surface-deep);border:1.5px solid var(--pp-border-soft);border-radius:9px;cursor:pointer" '+
           'id="pp-bklbl-'+value+'">'+
      '<input type="radio" name="pp-bk-modo" value="'+value+'"'+(checked?' checked':'')+' '+
      'onchange="ppBkModoChange()" style="margin-top:2px;accent-color:'+color+'">'+
      '<div>'+
        '<div style="font-family:\'Oswald\',sans-serif;font-size:.72rem;font-weight:700;color:'+color+'">'+title+'</div>'+
        '<div style="font-size:.65rem;color:var(--pp-text-muted);line-height:1.5;margin-top:1px">'+desc+'</div>'+
      '</div>'+
    '</label>';
  }


  /* ── Histórico ────────────────────────────────────────────────── */
  function _renderBkHistorico(){
    var hist=[];
    try{ hist=JSON.parse(localStorage.getItem('pmal26_backup_hist')||'[]'); }catch(e){}

    var listHTML='';
    if(!hist.length){
      listHTML='<div style="font-size:.8rem;color:var(--pp-text-muted);font-style:italic;text-align:center;padding:2rem">'+
        'Nenhum backup importado ainda.'+
      '</div>';
    } else {
      listHTML=hist.map(function(h,i){
        var snap=null;
        try{ snap=h.snapshot?JSON.parse(h.snapshot):null; }catch(e){}
        var resumo=snap?
          (snap.simulados||[]).length+' simulados · '+
          (snap.banco||[]).length+' questões · '+
          (snap.flashDecks||[]).reduce(function(a,d){ return a+(d.cards||[]).length; },0)+' cards'
          :'';
        return '<div class="pp-bk-hist-item">'+
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem;flex-wrap:wrap;gap:6px">'+
            '<div>'+
              '<span style="font-family:\'Oswald\',sans-serif;font-size:.75rem;font-weight:700;color:var(--pp-gold)">'+_esc(h.tipo||'Manual')+'</span>'+
              '<span style="font-size:.62rem;color:var(--pp-text-muted);margin-left:6px">'+_esc(h.data||'')+'  '+_esc(h.hora||'')+'</span>'+
            '</div>'+
            '<button onclick="ppBkRestaurar('+i+')" class="pp-btn pp-btn-secondary" type="button" '+
            'style="padding:.22rem .75rem;font-size:.62rem">↺ Restaurar</button>'+
          '</div>'+
          (resumo?'<div style="font-size:.65rem;color:var(--pp-text-muted)">'+_esc(resumo)+'</div>':'')+
        '</div>';
      }).join('');
    }

    return '<div id="pp-painel-historico">'+
      '<div style="font-size:.78rem;color:var(--pp-text-2);line-height:1.7;margin-bottom:.85rem">'+
        'O sistema guarda automaticamente os últimos <strong style="color:var(--pp-gold)">5 snapshots</strong> '+
        'antes de cada importação. Use para reverter uma importação errada.'+
      '</div>'+
      '<div id="pp-bk-hist-list">'+listHTML+'</div>'+
    '</div>';
  }


  /* ══════════════════════════════════════════════════════════════════
   * ppBkSubAba — troca de sub-aba SEM mover DOM
   * ══════════════════════════════════════════════════════════════════ */
  function ppBkSubAba(sub){
    ACTIVE_BK_SUB=sub;

    /* Atualiza pills das sub-tabs */
    ['exportar','importar','historico'].forEach(function(s){
      var btn=document.getElementById('pp-bksub-'+s);
      if(btn) btn.classList.toggle('active', s===sub);
    });

    /* Renderiza HTML próprio no container */
    var dest=document.getElementById('pp-bk-content');
    if(!dest) return;

    if(sub==='exportar') dest.innerHTML=_renderBkExportar();
    else if(sub==='importar') dest.innerHTML=_renderBkImportar();
    else if(sub==='historico') dest.innerHTML=_renderBkHistorico();
  }


  /* ══════════════════════════════════════════════════════════════════
   * WRAPPERS DE AÇÕES DE BACKUP
   * Chamam as funções reais do app.js, adaptando IDs onde necessário.
   * ══════════════════════════════════════════════════════════════════ */

  /* Exportar — chama backupExportar() diretamente (ela não usa IDs de render) */
  function ppBkExportar(){
    if(typeof backupExportar==='function') backupExportar();
  }

  /* Ler arquivo — adapta: app.js chama bkMostrarPrevia() que usa #bk-preview.
     Interceptamos: deixamos app.js processar _bkDados via bkLerArquivo(),
     depois copiamos o resultado para o nosso #pp-bk-preview. */
  function ppBkLerArquivo(input){
    /* 1. Garante que #bk-preview existe no DOM oculto (ele existe no #tab-backup) */
    var origPrev=document.getElementById('bk-preview');
    if(!origPrev) return;

    /* 2. Chama a função original — ela preenche _bkDados e chama bkMostrarPrevia */
    if(typeof bkLerArquivo==='function'){
      /* bkMostrarPrevia preenche #bk-preview e chama bkImpStep(2) */
      /* Sobrescrevemos temporariamente bkImpStep para interceptar */
      var _origImpStep=window.bkImpStep;
      var _origModoChange=window.bkModoChange;

      window.bkImpStep=function(n){
        /* Avança nosso step, não o original */
        ppBkImpStep(n);
      };
      window.bkModoChange=function(){
        /* Replica highlight de modo nos nossos labels */
        ppBkModoChange();
      };

      bkLerArquivo(input);

      /* Aguarda bkMostrarPrevia() executar (síncrono após FileReader) */
      /* FileReader é async — restauramos após um tick */
      setTimeout(function(){
        /* Restaura funções originais */
        window.bkImpStep=_origImpStep;
        window.bkModoChange=_origModoChange;
        /* Copia conteúdo do preview original para o nosso */
        var destPrev=document.getElementById('pp-bk-preview');
        if(origPrev&&destPrev) destPrev.innerHTML=origPrev.innerHTML;
      }, 200);
    }
  }

  /* Avançar importação — lê modo dos nossos radios, chama lógica real */
  function ppBkAvancar(){
    var modo='substituir';
    var radios=document.querySelectorAll('input[name="pp-bk-modo"]');
    for(var i=0;i<radios.length;i++){
      if(radios[i].checked){ modo=radios[i].value; break; }
    }

    if(modo==='diff'){
      /* Diff: app.js usa bkGerarDiff() que escreve em #bk-diff-list */
      var origDiff=document.getElementById('bk-diff-list');
      if(typeof bkGerarDiff==='function') bkGerarDiff();
      var destDiff=document.getElementById('pp-bk-diff-list');
      if(origDiff&&destDiff){
        setTimeout(function(){
          destDiff.innerHTML=origDiff.innerHTML;
        },50);
      }
      ppBkImpStep(3);
    } else {
      ppBkAplicar(modo);
    }
  }

  /* Confirmar diff */
  function ppBkConfirmarDiff(){
    /* bkConfirmarDiff() já chama bkAplicar internamente */
    if(typeof bkConfirmarDiff==='function'){
      /* Intercepta bkImpStep para redirecionar step 4 para o nosso */
      var _orig=window.bkImpStep;
      window.bkImpStep=function(n){ ppBkImpStep(n); };
      bkConfirmarDiff();
      setTimeout(function(){ window.bkImpStep=_orig; },300);
    } else {
      ppBkAplicar('substituir');
    }
  }

  /* Aplicar backup */
  function ppBkAplicar(modo){
    if(typeof bkAplicar==='function'){
      var _orig=window.bkImpStep;
      window.bkImpStep=function(n){ ppBkImpStep(n); };
      bkAplicar(modo);
      setTimeout(function(){ window.bkImpStep=_orig; },500);
    }
  }

  /* Restaurar snapshot do histórico */
  function ppBkRestaurar(idx){
    if(typeof bkRestaurar==='function') bkRestaurar(idx);
  }

  /* Navegar entre steps do importador */
  function ppBkImpStep(n){
    [1,2,3,4].forEach(function(i){
      var el=document.getElementById('pp-imp-step'+i);
      if(el) el.style.display=(i===n?'block':'none');
    });
    /* Após step 4 (sucesso), atualiza mensagem */
    if(n===4){
      var msg=document.getElementById('bk-sucesso-msg');
      var dest=document.getElementById('pp-bk-sucesso-msg');
      if(msg&&dest) dest.innerHTML=msg.innerHTML;
    }
  }

  /* Highlight de modo de importação nos nossos labels */
  function ppBkModoChange(){
    var map={substituir:'var(--pp-gold)',mesclar:'#60a5fa',diff:'#a78bfa'};
    Object.keys(map).forEach(function(m){
      var lbl=document.getElementById('pp-bklbl-'+m);
      if(!lbl) return;
      var radio=lbl.querySelector('input');
      var active=radio&&radio.checked;
      lbl.style.borderColor=active?map[m]:'';
      lbl.style.background=active?'rgba(198,161,91,.05)':'';
    });
  }


  /* ══════════════════════════════════════════════════════════════════
   * PANEL: INTEGRAÇÕES
   * ══════════════════════════════════════════════════════════════════ */
  function _renderPanelIntegracoes(){
    var items=[
      {icon:'google', label:'Google OAuth',   desc:'Login e sincronização com conta Google.'},
      {icon:'fire',   label:'Firebase Sync',  desc:'Banco de dados e autenticação em nuvem.'},
      {icon:'bell',   label:'Telegram Bot',   desc:'Notificações de estudo e lembretes diários.'},
      {icon:'discord',label:'Discord',        desc:'Integração com servidor de estudos.'},
      {icon:'api',    label:'API / Webhooks', desc:'Acesso programático aos seus dados de estudo.'}
    ];
    return '<div class="pp-panel" id="pp-panel-integracoes">'+
      '<div class="pp-card">'+
        '<div class="pp-card-header">'+
          '<div class="pp-card-title">Integrações</div>'+
          '<div class="pp-card-desc">Conecte serviços externos para ampliar suas possibilidades.</div>'+
        '</div>'+
        items.map(function(item){
          return '<div class="pp-integration-item">'+
            '<div class="pp-integration-icon pp-int-'+item.icon+'">'+_icoIntegration(item.icon)+'</div>'+
            '<div class="pp-integration-info">'+
              '<div class="pp-integration-name">'+item.label+'</div>'+
              '<div class="pp-integration-desc">'+item.desc+'</div>'+
            '</div>'+
            '<div class="pp-integration-status"><span class="pp-badge pp-badge-dim">Em breve</span></div>'+
          '</div>';
        }).join('')+
      '</div>'+
    '</div>';
  }


  /* ══════════════════════════════════════════════════════════════════
   * PANEL: AVANÇADO
   * ══════════════════════════════════════════════════════════════════ */
  function _renderPanelAvancado(){
    return '<div class="pp-panel" id="pp-panel-avancado">'+
      '<div class="pp-card">'+
        '<div class="pp-card-header">'+
          '<div class="pp-card-title">Performance</div>'+
          '<div class="pp-card-desc">Controle de recursos do sistema.</div>'+
        '</div>'+
        '<div class="pp-row">'+
          '<div class="pp-row-info"><div class="pp-row-title">Modo econômico</div>'+
          '<div class="pp-row-desc">Reduz animações para dispositivos mais lentos.</div></div>'+
          '<div class="pp-row-control"><span class="pp-badge pp-badge-dim">Em breve</span></div>'+
        '</div>'+
        '<div class="pp-row">'+
          '<div class="pp-row-info"><div class="pp-row-title">Cache de conteúdo</div>'+
          '<div class="pp-row-desc">Armazena temporariamente dados para acesso mais rápido.</div></div>'+
          '<div class="pp-row-control"><span class="pp-badge pp-badge-dim">Em breve</span></div>'+
        '</div>'+
      '</div>'+
      '<div class="pp-card">'+
        '<div class="pp-card-header">'+
          '<div class="pp-card-title">Recursos experimentais</div>'+
          '<div class="pp-card-desc">Funcionalidades em desenvolvimento. Use com cautela.</div>'+
        '</div>'+
        '<div class="pp-row">'+
          '<div class="pp-row-info"><div class="pp-row-title">Modo desenvolvedor</div>'+
          '<div class="pp-row-desc">Exibe logs internos, versão do schema e métricas de performance.</div></div>'+
          '<div class="pp-row-control"><span class="pp-badge pp-badge-dim">Em breve</span></div>'+
        '</div>'+
        '<div class="pp-row">'+
          '<div class="pp-row-info"><div class="pp-row-title">Multi-usuário (beta)</div>'+
          '<div class="pp-row-desc">Suporte a perfis diferentes no mesmo dispositivo.</div></div>'+
          '<div class="pp-row-control"><span class="pp-badge pp-badge-dim">Em breve</span></div>'+
        '</div>'+
      '</div>'+
      '<div class="pp-card pp-card-future">'+
        '<div class="pp-card-header">'+
          '<div class="pp-card-title">'+_ico('shield')+'Controle de acesso</div>'+
          '<div class="pp-card-desc">Preparação para arquitetura multi-usuário com permissões.</div>'+
        '</div>'+
        '<div class="pp-future-grid">'+
          _futureItem('Usuário padrão','Acesso completo ao próprio perfil.','user','active')+
          _futureItem('Moderador','Gestão de conteúdos compartilhados.','users','soon')+
          _futureItem('Administrador','RBAC, Firebase, concursos globais.','crown','soon')+
        '</div>'+
      '</div>'+
      '<div class="pp-card pp-card-danger">'+
        '<div class="pp-card-header">'+
          '<div class="pp-card-title">Zona de risco</div>'+
          '<div class="pp-card-desc">Ações irreversíveis. Faça um backup antes de prosseguir.</div>'+
        '</div>'+
        '<div class="pp-row">'+
          '<div class="pp-row-info"><div class="pp-row-title">Limpar cache local</div>'+
          '<div class="pp-row-desc">Remove dados temporários sem afetar o progresso salvo.</div></div>'+
          '<div class="pp-row-control"><button class="pp-btn pp-btn-ghost" onclick="ppClearCache()" type="button">Limpar</button></div>'+
        '</div>'+
        '<div class="pp-row">'+
          '<div class="pp-row-info"><div class="pp-row-title">Resetar todos os dados</div>'+
          '<div class="pp-row-desc">Apaga permanentemente todo o progresso, questões e configurações.</div></div>'+
          '<div class="pp-row-control"><button class="pp-btn pp-btn-danger" onclick="ppConfirmReset()" type="button">Resetar tudo</button></div>'+
        '</div>'+
      '</div>'+
    '</div>';
  }


  /* ══════════════════════════════════════════════════════════════════
   * HELPERS DE RENDER
   * ══════════════════════════════════════════════════════════════════ */
  function _statusItem(icon, cls, label, value, sub){
    return '<div class="pp-status-item'+(cls?' '+cls:'')+'">'+
      '<div class="pp-status-icon">'+_ico(icon)+'</div>'+
      '<div class="pp-status-info">'+
        '<div class="pp-status-label">'+label+'</div>'+
        '<div class="pp-status-value">'+value+'</div>'+
        '<div class="pp-status-sub">'+sub+'</div>'+
      '</div>'+
    '</div>';
  }

  function _futureItem(title, desc, icon, status){
    var isActive=status==='active';
    return '<div class="pp-future-item'+(isActive?' active':'')+'">'+
      '<div class="pp-future-icon">'+_ico(icon)+'</div>'+
      '<div class="pp-future-info">'+
        '<div class="pp-future-title">'+title+'</div>'+
        '<div class="pp-future-desc">'+desc+'</div>'+
      '</div>'+
      '<span class="pp-badge '+(isActive?'pp-badge-green':'pp-badge-dim')+'">'+(isActive?'Ativo':'Em breve')+'</span>'+
    '</div>';
  }

  function _ppSwitch(key, on){
    return '<button class="pp-switch '+(on?'on':'')+'" id="pp-switch-'+key+'" type="button" '+
           'aria-pressed="'+(on?'true':'false')+'" onclick="ppToggleSwitch(\''+key+'\')"></button>';
  }


  /* ══════════════════════════════════════════════════════════════════
   * HANDLERS PÚBLICOS — SETTINGS CENTER
   * ══════════════════════════════════════════════════════════════════ */
  function ppSwitchTab(id){
    ACTIVE_PANEL=id;
    document.querySelectorAll('#tab-perfil .pp-tab').forEach(function(t){ t.classList.remove('active'); });
    document.querySelectorAll('#tab-perfil .pp-panel').forEach(function(p){ p.classList.remove('active'); });
    var tab=document.getElementById('pp-tab-'+id);
    var panel=document.getElementById('pp-panel-'+id);
    if(tab) tab.classList.add('active');
    if(panel) panel.classList.add('active');
    /* Inicializa sub-aba de backup ao entrar na tab dados */
    if(id==='dados') setTimeout(function(){ ppBkSubAba(ACTIVE_BK_SUB); },50);
  }

  function ppToggleSwitch(key){
    var p=_getProfile(); p[key]=!p[key];
    var el=document.getElementById('pp-switch-'+key);
    if(el){ el.classList.toggle('on',p[key]); el.setAttribute('aria-pressed',p[key]?'true':'false'); }
    _saveProfile();
  }

  function ppSetSegment(key,value){
    var p=_getProfile(); p[key]=value; _saveProfile();
    buildProfile(); ppSwitchTab(ACTIVE_PANEL);
  }

  function ppSetTheme(theme){
    var p=_getProfile(); p.theme=theme; _saveProfile();
    _applyPrefs(); buildProfile(); ppSwitchTab('aparencia');
  }

  function ppSaveIdentity(){
    var p=_getProfile();
    var nm=document.getElementById('pp-input-name');
    var em=document.getElementById('pp-input-email');
    if(nm) p.displayName=(nm.value||'').trim()||DEFAULTS.displayName;
    if(em) p.email=(em.value||'').trim()||DEFAULTS.email;
    _saveProfile(); _applyPrefs();
    var ab=document.getElementById('pp-avatar-big');
    var nb=document.getElementById('pp-identity-name');
    var eb=document.getElementById('pp-identity-email');
    if(ab) ab.textContent=_initial(p.displayName);
    if(nb) nb.textContent=p.displayName;
    if(eb) eb.textContent=p.email;
    // Atualiza topbar imediatamente sem precisar trocar de aba
    if(typeof topbarUpdate==='function') topbarUpdate('perfil','identidade');
  }

  function ppResetIdentity(){
    var p=_getProfile();
    p.displayName=DEFAULTS.displayName; p.email=DEFAULTS.email;
    _saveProfile(); _applyPrefs();
    buildProfile(); ppSwitchTab('identidade');
  }

  function ppOpenBackup(){ ppSwitchTab('dados'); }

  function ppClearCache(){
    if(typeof abrirConfirmModal==='function'){
      abrirConfirmModal('Limpar cache','Remove dados temporários de sessão. Seu progresso permanece intacto.',
        function(){
          try{
            for(var i=localStorage.length-1;i>=0;i--){
              var k=localStorage.key(i);
              if(k&&k.indexOf('_tmp_')>-1) localStorage.removeItem(k);
            }
          }catch(e){}
          buildProfile(); ppSwitchTab('avancado');
        },'🧹','Limpar');
    }
  }

  function ppConfirmReset(){
    if(typeof abrirConfirmModal==='function'){
      abrirConfirmModal('Resetar todos os dados',
        'Esta ação é irreversível. Todos os dados locais serão apagados. Faça um backup antes!',
        function(){ try{localStorage.clear();}catch(e){} location.reload(); },'⚠️','Confirmar reset');
    } else {
      if(confirm('Isso apagará TODOS os dados. Tem certeza?')){
        try{localStorage.clear();}catch(e){} location.reload();
      }
    }
  }


  /* ══════════════════════════════════════════════════════════════════
   * ÍCONES
   * ══════════════════════════════════════════════════════════════════ */
  var _ICONS={
    user:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    paint:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.8 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.7-.4-1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-4.4-4.5-9-10-9z"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/></svg>',
    hdd:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/></svg>',
    plug:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8H6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z"/></svg>',
    shield:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    cloud:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A7 7 0 1 0 5 15"/></svg>',
    clock:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    upload:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    lock:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    moon:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    sun:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    bell:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    users:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    crown:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="m4 20 2-8 6 4 6-4 2 8"/><path d="M12 4 8 8l-4-2 2 6h12l2-6-4 2-4-4z"/></svg>'
  };
  function _ico(n){ return _ICONS[n]||_ICONS['user']; }

  function _icoIntegration(n){
    var m={
      google:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>',
      fire:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
      bell:   _ICONS['bell'],
      discord:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>',
      api:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
    };
    return m[n]||_ico('plug');
  }


  /* ══════════════════════════════════════════════════════════════════
   * BOOTSTRAP
   * ══════════════════════════════════════════════════════════════════ */
  function _bootstrap(){
    if(typeof ST==='undefined') return;
    var p=_getProfile();
    var bodyLight=document.body.classList.contains('light');
    if(p.theme==='light'&&!bodyLight&&typeof toggleTheme==='function') toggleTheme();
    else if(p.theme==='dark'&&bodyLight&&typeof toggleTheme==='function') toggleTheme();
    var av=document.getElementById('sb-user-avatar');
    var nm=document.getElementById('sb-user-name');
    var em=document.getElementById('sb-user-email');
    if(av) av.textContent=_initial(p.displayName);
    if(nm) nm.textContent=p.displayName||DEFAULTS.displayName;
    if(em) em.textContent=p.email||DEFAULTS.email;
  }


  /* ══════════════════════════════════════════════════════════════════
   * EXPORTAÇÕES
   * ══════════════════════════════════════════════════════════════════ */
  window.buildProfile        = buildProfile;
  window.ppSwitchTab         = ppSwitchTab;
  window.ppToggleSwitch      = ppToggleSwitch;
  window.ppSetSegment        = ppSetSegment;
  window.ppSetTheme          = ppSetTheme;
  window.ppSaveIdentity      = ppSaveIdentity;
  window.ppResetIdentity     = ppResetIdentity;
  window.ppOpenBackup        = ppOpenBackup;
  window.ppBkSubAba          = ppBkSubAba;
  window.ppBkExportar        = ppBkExportar;
  window.ppBkLerArquivo      = ppBkLerArquivo;
  window.ppBkAvancar         = ppBkAvancar;
  window.ppBkConfirmarDiff   = ppBkConfirmarDiff;
  window.ppBkImpStep         = ppBkImpStep;
  window.ppBkModoChange      = ppBkModoChange;
  window.ppBkRestaurar       = ppBkRestaurar;
  window.ppClearCache        = ppClearCache;
  window.ppConfirmReset      = ppConfirmReset;
  window._ppApplyPreferences = _applyPrefs;

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',_bootstrap);
  } else {
    _bootstrap();
  }

})();

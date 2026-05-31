/* ════════════════════════════════════════════════════════════════════
 * p01-core.js — PROTOCOLO 01 · Core Engine
 * ────────────────────────────────────────────────────────────────────
 * Camada de infraestrutura. Carregada antes de todos os módulos.
 * Não depende de nenhum outro arquivo do projeto.
 *
 * Exports (window.*):
 *   P01Bus      — Event bus (emit/on/off)
 *   P01Modules  — Module registry (register/build/render)
 *   P01State    — State layer (get/set/subscribe)
 *   P01DB       — Storage engine (save/load/clear)
 *   P01UI       — UI helpers (notify/modal/tab)
 *   P01Debug    — Debug engine (guard/inspect/bench)
 * ════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
   * FASE 2 — EVENT BUS
   * Desacoplamento total entre módulos.
   * emit('edital:saved', data) → qualquer listener recebe.
   * ══════════════════════════════════════════════════════════════════ */
  var P01Bus = (function () {
    var _listeners = {};

    // Subscribe to an event
    function on(event, fn, context) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push({ fn: fn, ctx: context || null });
      return function off() { _off(event, fn); };  // returns unsubscribe
    }

    // Unsubscribe
    function _off(event, fn) {
      if (!_listeners[event]) return;
      _listeners[event] = _listeners[event].filter(function (l) {
        return l.fn !== fn;
      });
    }

    // Emit event to all subscribers
    function emit(event, data) {
      var listeners = _listeners[event] || [];
      var wildcard  = _listeners['*'] || [];
      var all = listeners.concat(wildcard);
      all.forEach(function (l) {
        try {
          l.fn.call(l.ctx, data, event);
        } catch (e) {
          console.warn('[P01Bus] Listener error for "' + event + '":', e.message);
        }
      });
      if (listeners.length > 0) {
        console.debug('[P01Bus] emit:', event, '→', listeners.length, 'listener(s)');
      }
    }

    // List all registered events (debug)
    function inspect() {
      return Object.keys(_listeners).reduce(function (acc, k) {
        acc[k] = _listeners[k].length;
        return acc;
      }, {});
    }

    // Official event catalogue (documentation)
    var EVENTS = {
      // Concurso
      'concurso:changed':   'Fired after concTrocar completes. payload: { id, nome }',
      // Edital
      'edital:saved':       'Fired after enEditSave or enBlocosSave. payload: { edital, blocos }',
      'edital:disc:toggled':'Fired after a topic is checked. payload: { discId, topicId, done }',
      // Leitura
      'leitura:art:toggled':'Fired after lnToggle. payload: { lawId, art, read }',
      'leitura:saved':      'Fired after lnSaveAll. payload: { leis, blocos }',
      // UI
      'tab:changed':        'Fired after goTab. payload: { id }',
      'theme:changed':      'Fired after theme toggle. payload: { theme }',
      // User
      'user:saved':         'Fired after ppSaveIdentity. payload: { name, email }',
    };

    return { on: on, off: _off, emit: emit, inspect: inspect, EVENTS: EVENTS };
  })();


  /* ══════════════════════════════════════════════════════════════════
   * FASE 1 — MODULE REGISTRY
   * Registro oficial de módulos V2.
   * Integra com P01Bus para lifecycle events.
   * ══════════════════════════════════════════════════════════════════ */
  var P01Modules = (function () {
    var _registry = {};
    var _built    = {};

    function register(config) {
      var required = ['id', 'build', 'render'];
      var missing = required.filter(function (k) { return !config[k]; });
      if (missing.length) {
        console.warn('[P01Modules] register: missing fields:', missing, 'for', config.id);
        return false;
      }
      _registry[config.id] = config;
      console.log('[P01Modules] registered:', config.id);
      return true;
    }

    function build(id) {
      var mod = _registry[id];
      if (!mod) { console.warn('[P01Modules] unknown module:', id); return; }
      try {
        mod.build();
        _built[id] = true;
        P01Bus.emit('module:built', { id: id });
      } catch (e) {
        console.warn('[P01Modules] build() failed for "' + id + '":', e.message);
      }
    }

    function render(id) {
      var mod = _registry[id];
      if (!mod) return;
      try {
        mod.render();
        P01Bus.emit('module:rendered', { id: id });
      } catch (e) {
        console.warn('[P01Modules] render() failed for "' + id + '":', e.message);
      }
    }

    function teardown(id) {
      var mod = _registry[id];
      if (!mod) return;
      try {
        if (typeof mod.teardown === 'function') mod.teardown();
        _built[id] = false;
        P01Bus.emit('module:teardown', { id: id });
      } catch (e) {
        console.warn('[P01Modules] teardown() failed for "' + id + '":', e.message);
      }
    }

    function rebuild(id) {
      teardown(id);
      build(id);
    }

    function rebuildAll() {
      Object.keys(_registry).forEach(function (id) { rebuild(id); });
    }

    function isBuilt(id) { return !!_built[id]; }

    function list() { return Object.keys(_registry); }

    return { register: register, build: build, render: render,
             teardown: teardown, rebuild: rebuild, rebuildAll: rebuildAll,
             isBuilt: isBuilt, list: list };
  })();


  /* ══════════════════════════════════════════════════════════════════
   * FASE 3 — STATE LAYER
   * Camada de estado que une ST + _CM + caches.
   * Não substitui ST — wraps it com API segura + change notifications.
   * ══════════════════════════════════════════════════════════════════ */
  var P01State = (function () {

    // Safe getter — never throws, returns defaultVal if path missing
    function get(path, defaultVal) {
      try {
        var parts = path.split('.');
        var obj = global.ST;
        for (var i = 0; i < parts.length; i++) {
          if (obj == null) return defaultVal;
          obj = obj[parts[i]];
        }
        return obj !== undefined ? obj : defaultVal;
      } catch (e) { return defaultVal; }
    }

    // Safe setter — updates ST and emits change event
    function set(path, value) {
      try {
        var parts = path.split('.');
        var obj = global.ST;
        for (var i = 0; i < parts.length - 1; i++) {
          if (obj[parts[i]] == null) obj[parts[i]] = {};
          obj = obj[parts[i]];
        }
        var old = obj[parts[parts.length - 1]];
        obj[parts[parts.length - 1]] = value;
        P01Bus.emit('state:changed', { path: path, value: value, old: old });
        return true;
      } catch (e) {
        console.warn('[P01State] set failed for path:', path, e.message);
        return false;
      }
    }

    // Subscribe to state changes on a path
    function subscribe(path, fn) {
      return P01Bus.on('state:changed', function (data) {
        if (data.path === path || data.path.startsWith(path + '.')) {
          fn(data.value, data.old, data.path);
        }
      });
    }

    // Get current concurso info
    function getConcursoAtivo() {
      try {
        var id = localStorage.getItem('protocolo_concurso_ativo');
        var meta = JSON.parse(localStorage.getItem('protocolo_concursos_meta') || '[]');
        var found = Array.isArray(meta) ? meta.find(function(c){ return c.id === id; }) : null;
        return found ? { id: found.id, nome: found.nome || found.name || id } : null;
      } catch (e) { return null; }
    }

    return { get: get, set: set, subscribe: subscribe, getConcursoAtivo: getConcursoAtivo };
  })();


  /* ══════════════════════════════════════════════════════════════════
   * FASE 4 — STORAGE ENGINE
   * Única fonte de verdade para persistência.
   * Namespaced por módulo, versionável, nunca sobrescreve parcialmente.
   * ══════════════════════════════════════════════════════════════════ */
  var P01DB = (function () {
    var _VERSION = 1;

    // Module ownership registry — prevents cross-module overwrites
    var _owners = {
      'edital':    'edital-next.js',
      'leitura':   'leitura-next.js',
      'concursos': 'app.js',
      'ST':        'storage.js',
      'perfil':    'profile-panel.js',
    };

    function _concKey() {
      return localStorage.getItem('protocolo_concurso_ativo') || 'default';
    }

    // Save with namespace — merges with existing, never overwrites foreign keys
    function save(namespace, data) {
      try {
        var key   = 'p01_' + namespace + '_' + _concKey();
        var raw   = localStorage.getItem(key);
        var existing = raw ? JSON.parse(raw) : {};
        var merged   = Object.assign({}, existing, data, { _v: _VERSION, _ts: Date.now() });
        localStorage.setItem(key, JSON.stringify(merged));
        P01Bus.emit('db:saved', { namespace: namespace, key: key });
        return true;
      } catch (e) {
        console.warn('[P01DB] save failed:', namespace, e.message);
        return false;
      }
    }

    // Load namespace for current concurso
    function load(namespace) {
      try {
        var key = 'p01_' + namespace + '_' + _concKey();
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.warn('[P01DB] load failed:', namespace, e.message);
        return null;
      }
    }

    // Check who owns a namespace
    function owner(namespace) { return _owners[namespace] || 'unknown'; }

    // List all P01DB keys in localStorage
    function listKeys() {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.startsWith('p01_')) keys.push(k);
      }
      return keys;
    }

    return { save: save, load: load, owner: owner, listKeys: listKeys };
  })();


  /* ══════════════════════════════════════════════════════════════════
   * FASE 5 — UI ENGINE
   * Helpers de UI padronizados: notifications, tabs, overlays.
   * ══════════════════════════════════════════════════════════════════ */
  var P01UI = (function () {

    // ── Toast notifications ──────────────────────────────────────────
    var _toastQueue = [];
    var _toastActive = false;

    function notify(message, type, duration) {
      type     = type     || 'info';    // 'info' | 'success' | 'error' | 'warn'
      duration = duration || 2800;
      _toastQueue.push({ message: message, type: type, duration: duration });
      if (!_toastActive) _showNextToast();
    }

    function _showNextToast() {
      if (!_toastQueue.length) { _toastActive = false; return; }
      _toastActive = true;
      var t = _toastQueue.shift();

      var el = document.createElement('div');
      el.className = 'p01-toast p01-toast--' + t.type;
      el.innerHTML =
        '<span class="p01-toast-icon">' + _toastIcon(t.type) + '</span>' +
        '<span class="p01-toast-msg">' + _esc(t.message) + '</span>';

      document.body.appendChild(el);
      requestAnimationFrame(function () { el.classList.add('p01-toast--visible'); });

      setTimeout(function () {
        el.classList.remove('p01-toast--visible');
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
          _showNextToast();
        }, 300);
      }, t.duration);
    }

    function _toastIcon(type) {
      var icons = {
        success: '✓', error: '✕', warn: '⚠', info: 'ℹ'
      };
      return icons[type] || icons.info;
    }

    // ── Tab navigation helper ────────────────────────────────────────
    function goTo(tabId) {
      if (typeof global.goTab === 'function') {
        global.goTab(tabId);
        P01Bus.emit('tab:changed', { id: tabId });
      }
    }

    // ── Generic overlay/modal ────────────────────────────────────────
    function showOverlay(id, html, opts) {
      opts = opts || {};
      var existing = document.getElementById(id);
      if (existing) existing.remove();

      var overlay = document.createElement('div');
      overlay.id = id;
      overlay.className = 'p01-overlay' + (opts.className ? ' ' + opts.className : '');
      if (opts.closeOnBackdrop !== false) {
        overlay.addEventListener('click', function (e) {
          if (e.target === overlay) closeOverlay(id);
        });
      }
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      requestAnimationFrame(function () { overlay.classList.add('p01-overlay--open'); });
      return overlay;
    }

    function closeOverlay(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('p01-overlay--open');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }

    // ── Escape helper ────────────────────────────────────────────────
    function _esc(s) {
      return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    return { notify: notify, goTo: goTo, showOverlay: showOverlay,
             closeOverlay: closeOverlay };
  })();


  /* ══════════════════════════════════════════════════════════════════
   * FASE 6 — DEBUG ENGINE
   * Expande P01Guard com performance, listeners, orphans.
   * ══════════════════════════════════════════════════════════════════ */
  var P01Debug = (function () {
    var _benchmarks = {};
    var _renderTimes = {};

    // ── Benchmark a function ─────────────────────────────────────────
    function bench(label, fn) {
      var start = performance.now();
      var result;
      try { result = fn(); } catch (e) { console.warn('[P01Debug] bench error:', label, e.message); }
      var elapsed = performance.now() - start;
      _benchmarks[label] = elapsed;
      if (elapsed > 100) {
        console.warn('[P01Debug] SLOW render "' + label + '": ' + elapsed.toFixed(1) + 'ms');
      } else {
        console.debug('[P01Debug] bench "' + label + '": ' + elapsed.toFixed(1) + 'ms');
      }
      return result;
    }

    // ── Orphan node detector ─────────────────────────────────────────
    // Finds elements with IDs referenced in JS but detached from DOM
    function findOrphans(ids) {
      ids = ids || [];
      var results = { attached: [], detached: [] };
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) {
          results.detached.push(id);
        } else if (!document.body.contains(el)) {
          results.detached.push(id + ' (detached)');
        } else {
          results.attached.push(id);
        }
      });
      return results;
    }

    // ── Zombie tab detector ──────────────────────────────────────────
    // Finds sections that are active but should not be
    function findZombieTabs() {
      var active = Array.from(document.querySelectorAll('.section.active'));
      if (active.length <= 1) return [];
      return active.slice(1).map(function (el) { return el.id; });
    }

    // ── Full integrity report ────────────────────────────────────────
    function report() {
      var issues = [];
      var info   = {};

      // Duplicate IDs
      var seen = {};
      document.querySelectorAll('[id]').forEach(function (el) {
        if (seen[el.id]) issues.push('DUPLICATE_ID: #' + el.id);
        seen[el.id] = true;
      });

      // TABS_LIST check
      var TABS = typeof global.TABS_LIST !== 'undefined' ? global.TABS_LIST : [];
      info.tabs = TABS.map(function (id) {
        var el = document.getElementById('tab-' + id);
        return { id: id, found: !!el, active: el ? el.classList.contains('active') : false };
      });
      TABS.forEach(function (id) {
        if (!document.getElementById('tab-' + id)) issues.push('MISSING_TAB: tab-' + id);
      });

      // Zombie tabs
      var zombies = findZombieTabs();
      if (zombies.length) issues.push('ZOMBIE_TABS: ' + zombies.join(', '));

      // Active section count
      var activeSections = document.querySelectorAll('.section.active').length;
      info.activeSections = activeSections;
      if (activeSections === 0) issues.push('NO_ACTIVE_SECTION');
      if (activeSections > 1)  issues.push('MULTIPLE_ACTIVE_SECTIONS: ' + activeSections);

      // localStorage
      try {
        localStorage.setItem('p01_guard_test','1');
        localStorage.removeItem('p01_guard_test');
        info.localStorage = 'OK';
      } catch(e) {
        issues.push('LOCALSTORAGE_UNAVAILABLE');
        info.localStorage = 'UNAVAILABLE';
      }

      // P01DB keys
      info.dbKeys = P01DB.listKeys();

      // Event bus
      info.busEvents = P01Bus.inspect();

      // Registered modules
      info.modules = P01Modules.list();

      // Benchmarks
      info.benchmarks = _benchmarks;

      // Report
      console.group('[P01Debug] System Report');
      if (issues.length === 0) {
        console.log('  ✓ No issues found');
      } else {
        issues.forEach(function (i) { console.warn('  ⚠', i); });
      }
      console.log('  Tabs:', info.tabs.map(function(t){ return t.id + (t.active?'*':''); }).join(', '));
      console.log('  Modules registered:', info.modules.join(', ') || 'none');
      console.log('  Bus events:', Object.keys(info.busEvents).join(', ') || 'none');
      console.log('  DB keys:', info.dbKeys.join(', ') || 'none');
      if (Object.keys(_benchmarks).length) {
        console.log('  Benchmarks:', JSON.stringify(_benchmarks));
      }
      console.groupEnd();

      return { issues: issues, info: info };
    }

    return { bench: bench, findOrphans: findOrphans, findZombieTabs: findZombieTabs,
             report: report };
  })();


  /* ══════════════════════════════════════════════════════════════════
   * CSS INJECTION — Toast styles (self-contained)
   * ══════════════════════════════════════════════════════════════════ */
  (function injectCoreCSS() {
    if (document.getElementById('p01-core-css')) return;
    var style = document.createElement('style');
    style.id  = 'p01-core-css';
    style.textContent = [
      '.p01-toast{',
        'position:fixed;bottom:1.5rem;right:1.5rem;',
        'display:flex;align-items:center;gap:.55rem;',
        'padding:.65rem 1rem;',
        'background:#1B2230;border:1px solid rgba(255,255,255,.10);',
        'border-radius:8px;',
        'font-family:"Barlow",sans-serif;font-size:.78rem;',
        'color:rgba(255,255,255,.88);',
        'box-shadow:0 8px 24px rgba(0,0,0,.4);',
        'z-index:9999;',
        'transform:translateY(8px);opacity:0;',
        'transition:opacity .22s,transform .22s;',
        'pointer-events:none;',
        'max-width:360px;',
      '}',
      '.p01-toast--visible{transform:translateY(0);opacity:1;}',
      '.p01-toast--success .p01-toast-icon{color:#4ade80;}',
      '.p01-toast--error   .p01-toast-icon{color:#f87171;}',
      '.p01-toast--warn    .p01-toast-icon{color:#eab308;}',
      '.p01-toast--info    .p01-toast-icon{color:#60a5fa;}',
      '.p01-toast-icon{font-size:.85rem;flex-shrink:0;}',
      'body.light .p01-toast{background:#fff;border-color:rgba(0,0,0,.12);color:#0f1115;box-shadow:0 8px 24px rgba(0,0,0,.12);}',
      '.p01-overlay{',
        'position:fixed;inset:0;',
        'background:rgba(0,0,0,.6);',
        'z-index:8000;',
        'display:flex;align-items:center;justify-content:center;',
        'opacity:0;transition:opacity .22s;',
        'backdrop-filter:blur(2px);',
      '}',
      '.p01-overlay--open{opacity:1;}',
    ].join('');
    document.head.appendChild(style);
  })();


  /* ══════════════════════════════════════════════════════════════════
   * EXPORTS — attach to global scope
   * ══════════════════════════════════════════════════════════════════ */
  global.P01Bus     = P01Bus;
  global.P01Modules = P01Modules;
  global.P01State   = P01State;
  global.P01DB      = P01DB;
  global.P01UI      = P01UI;
  global.P01Debug   = P01Debug;

  // Backward compat: P01Guard now delegates to P01Debug.report
  global.P01Guard = function () { return P01Debug.report(); };

  console.log('[P01Core] Core Engine loaded — Bus, Modules, State, DB, UI, Debug');

})(window);

PROTOCOLO 01 — SISTEMA DE ESTUDO CONCURSOS
==========================================
Versão: Estabilizada (PROTOCOLO 05)
Data: 2026-05-21

ARQUITETURA
───────────
SPA offline (file://) — HTML/CSS/JS puro, sem frameworks.

MÓDULOS PRINCIPAIS
──────────────────
• storage.js      — ST global, TABS_LIST, P01Storage, P01Lifecycle, P01Guard
• app.js          — Dashboard, backup, concursos, _reconstruirUI, bootstrap
• cronograma.js   — Cronograma, goTab() principal
• edital-next.js  — Aba Edital (V2, oficial)
• leitura-next.js — Aba Leitura (V2, oficial, migrada do leitura-next)
• edital-leis.js  — buildEdital(), getLeitKey(), LEIS_LEITURA
• estatisticas-banco.js — Banco de Questões, Simulados, Flashcards, Estatísticas
• topbar.js       — Topbar, breadcrumbs, user card
• profile-panel.js — Perfil & Preferências

PADRÃO DE MÓDULO V2 (para Banco V2, Simulados V2, etc.)
────────────────────────────────────────────────────────
Ver P01Lifecycle em storage.js.
Funções obrigatórias: build(), render(), teardown(), rebuild()
CSS obrigatório: #tab-ID { tokens only } — NUNCA display:block
Storage: sempre salvar { primary, auxiliary } juntos

GUARDS ATIVOS
─────────────
• P01Guard     — verifica IDs duplicados, tabs ausentes, section visibility
• P01Storage   — safeSave/safeLoad sem throws
• P01Lifecycle — padrão de lifecycle para módulos
• CSS hardening — .section:not(.active){display:none!important} em core.css
• Boot isolation — try/catch por módulo no bootstrap e _reconstruirUI

LEGADO
──────
Ver MAPA_ARQUITETURAL.txt para lista completa de código legado e
quando cada item pode ser removido com segurança.

PARA ABRIR
──────────
Abra index.html diretamente no Chrome (file://).
Todos os dados são salvos em localStorage.

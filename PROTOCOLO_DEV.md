# PROTOCOLO 01 — CONSTITUIÇÃO DE DESENVOLVIMENTO
**Vigente a partir de:** 2026-05-23
**Baseline oficial:** `protocolo_01_pos_auditoria.zip` (67/67 checks OK)

---

## 1. REGRAS DE ALTERAÇÃO

Toda alteração deve ser:
- **Cirúrgica** — escopo mínimo, sem tocar código fora do objetivo
- **Auditável** — diff verificável contra a baseline
- **Reversível** — backup antes de qualquer patch
- **Limitada** — apenas o escopo explicitamente aprovado

---

## 2. PRÉ-REQUISITOS ANTES DE QUALQUER PATCH

Antes de tocar qualquer arquivo, mapear:

| Item | Onde verificar |
|------|----------------|
| Dependências | Quem chama a função/variável a ser alterada |
| Hooks | goTab chain, concTrocar chain, DOMContentLoaded |
| Aliases | TOPBAR_NAMES, TOPBAR_SUBTAB_NAMES, TBS_TAB_ICONS |
| Impacto Dashboard | analytics-next.js DATA object, cmpRings, KPIs |
| Impacto topbar | topbarUpdate, topbarSubTabUpdate, breadcrumbs |
| Impacto storage | CONC_FIELDS, SHARED_FIELDS, sim2_ namespace |

---

## 3. PADRÃO OBRIGATÓRIO PARA IMPLEMENTAÇÕES NOVAS

```js
// ── Namespace isolado ──
// Storage: sim2_{concId}   (nunca ST.simulados)
// IDs DOM: sim2-*          (nunca reusar IDs de outros módulos)
// CSS: classes .s2-*       (namespace próprio, como já existe)

// ── Guards obrigatórios ──
if (typeof s2GetStats !== 'function') return;
if (!document.getElementById('tab-simulados-v2')) return;

// ── try/catch local ──
try {
  // implementação
} catch(e) {
  console.warn('[SIM2] erro: ', e.message);
}

// ── Teardown seguro ──
function teardown() {
  S2.view = 'overview';
  S2.editId = null;
  S2.modalOpen = false;
}

// ── goTab chain — padrão aprovado ──
const _orig = window.goTab;
window.goTab = function(id) {
  _orig(id);
  if (id === 'simulados-v2') {
    try { /* render */ } catch(e) { console.warn('[SIM2] goTab:', e.message); }
  }
};
```

---

## 4. PROIBIÇÕES ABSOLUTAS

Nenhuma automação Python pode alterar:
- Template literals JS (`` `...${...}` ``) — sempre validar com `node --check` imediatamente
- Blocos HTML grandes sem diff line-by-line
- Chains de hooks (goTab, concTrocar, ppSwitchTab, s2SetView)
- Wrappers de goTab sem validação sintática pós-patch

**Regra:** Após qualquer patch em arquivo .js, executar `node --check <arquivo>` antes de continuar.

---

## 5. CHECKLIST DE VALIDAÇÃO PÓS-IMPLEMENTAÇÃO

Executar obrigatoriamente após qualquer alteração:

```
[ ] node --check em TODOS os arquivos .js alterados
[ ] CSS brace balance: { count == } count em todos .css alterados
[ ] goTab chain: goTab('simulados-v2') não lança exceção
[ ] goTab chain: goTab('analytics-next') não lança exceção
[ ] topbar: breadcrumbs corretos para todos os módulos alterados
[ ] storage: sim2_{concId} isolado de ST.simulados
[ ] Dashboard: cmpRings / sim cards renderizam sem erro
[ ] aliases: nenhum alias técnico (eq-v2, simulados-v2, V2) exposto na UI
[ ] TABS_LIST: contém exatamente 9 itens, sem 'simulados' legado
[ ] ST.simulados: intocado (length === valor original)
```

---

## 6. COMPARAÇÃO COM BASELINE

Qualquer regressão deve ser verificada contra:
- **Arquivo de referência:** `protocolo_01_pos_auditoria.zip`
- **Resultado da baseline:** 67 checks OK, 0 fail
- **Sintaxe baseline:** 14/14 arquivos JS sem erro

Antes de reportar uma regressão, confirmar:
1. O mesmo comportamento ocorre no arquivo da baseline?
2. O erro é de ambiente Node.js headless (pré-existente) ou de browser real?
3. O diff está limitado ao escopo aprovado?

---

## 7. NAMESPACE DO SIMULADOS V2

| Recurso | Namespace |
|---------|-----------|
| localStorage | `sim2_{concId}` |
| IDs DOM raiz | `sim2-root` |
| CSS classes | `.s2-*` (já existente em simulados-v2.css) |
| Variável de estado | `S2` (IIFE-local, já existente) |
| Função de stats | `window.s2GetStats` |
| Função de view | `window.s2SetView` |
| Modal open/close | `window.s2OpenModal`, `window.s2CloseModal` |
| P01Modules id | `'simulados-v2'` |

**Regra de ouro:** Nunca escrever em `ST.simulados`. Sempre usar `s2Load()` / `s2Save()` internamente.

---

## 8. ESTADO DA BUILD (pós-auditoria 2026-05-23)

| Módulo | Estado |
|--------|--------|
| Dashboard V2 (analytics-next) | ✅ Estável, fonte de dados = s2GetStats |
| Est. de Questões (eq-v2) | ✅ Estável |
| Simulados V2 (simulados-v2) | ✅ Infraestrutura pronta, desenvolvimento pendente |
| Cronograma | ✅ Estável |
| Edital | ✅ Estável |
| Leitura | ✅ Estável |
| Banco de Questões | ✅ Estável |
| Flashcards | ✅ Estável |
| Perfil | ✅ Estável |
| Simulados (legado) | ⚫ Desativado visualmente, dados preservados |

---

*Este documento é parte integrante da baseline oficial. Não remover.*

---

## Caso Resolvido — Dashboard Topbar: Eixo Horizontal vs Vertical

**Data:** Mai/2026  
**Build:** protocolo_01_dashboard_topbar_final

### Problema

A topbar interna do Dashboard (`an2-topbar`) aparecia recuada ~1rem de cada lado.  
Múltiplas tentativas falharam porque o eixo errado foi atacado.

### Causa Raiz Real

```
#main-content → #tab-analytics-next (.section) → #an2-root → .an2-topbar
```

`.section { padding: 1rem }` em `core.css` aplica `padding-left:1rem` e `padding-right:1rem`.  
`#an2-root { width:100% }` ocupa 100% do **content-box** da section (excluindo padding).  
Logo: `an2-root` = largura total − 2rem → `an2-topbar` herda o recuo lateral.

### Erro Cometido

Tentar corrigir recuo **lateral** alterando `padding-top`, o que causou:
- a barra subir e ficar escondida sob a topbar global fixa;
- quebra do eixo vertical;
- conteúdo desposicionado.

### Regra: Separar Sempre os Dois Eixos

| Eixo | Propriedade | Controle |
|---|---|---|
| **Vertical** | `padding-top` | Offset da topbar global fixa (`topbar.css`) — NÃO TOCAR |
| **Horizontal** | `padding-left/right` | Recuo lateral da section — corrigir aqui |

### Correção Correta

```css
/* css/analytics-next.css */
#tab-analytics-next {
  padding-left:  0 !important;
  padding-right: 0 !important;
}
```

O `!important` é necessário para vencer a regra global de `topbar.css` que usa `!important` no `padding-top`.  
O seletor de ID (`#tab-analytics-next`) vence o seletor de classe (`.section`) quando ambos têm `!important`.

### Lição

> Quando uma topbar interna estiver recuada **lateralmente**, nunca mexer em `padding-top`.  
> Diagnosticar o eixo exato antes de qualquer patch.  
> Usar seletor específico por seção, nunca regra global.

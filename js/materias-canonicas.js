/**
 * PROTOCOLO 01 — FASE 9.4.14.1
 * Mapa Canônico de Matérias do Banco de Questões
 *
 * Regras:
 *   - Apenas códigos novos. Sem aliases legados. Sem migração.
 *   - Leis/normas específicas (CF/88, CP, CPP, CPM, CPPM, ECA…) vão em q.leis, não aqui.
 *   - legpmal NÃO é matéria. Usa-se leginst + q.leis.
 *   - gma3_disc_*, s_*, legat, legpmal, cf, cp, cpp, cpm, cppm — NÃO aceitos como matéria.
 */

// ─── Lista canônica de matérias ───────────────────────────────────────────────
window.BQ_MATERIAS = [
  // Linguagens
  { id: 'port',        name: 'Língua Portuguesa' },
  { id: 'ing',         name: 'Língua Estrangeira (Inglês)' },
  { id: 'info',        name: 'Noções de Informática' },
  // Exatas
  { id: 'matematica',  name: 'Matemática' },
  { id: 'raclog',      name: 'Raciocínio Lógico' },
  // Gerais
  { id: 'atualidades', name: 'Atualidades' },
  { id: 'alagoas',     name: 'Conhecimentos do Estado de Alagoas' },
  { id: 'aracaju',     name: 'Conhecimentos sobre Aracaju/SE' },
  // Ciências (PMAL Oficial)
  { id: 'sociologia',  name: 'Sociologia' },
  { id: 'filosofia',   name: 'Filosofia' },
  { id: 'biologia',    name: 'Biologia' },
  { id: 'fisica',      name: 'Física' },
  { id: 'quimica',     name: 'Química' },
  // Direito
  { id: 'dadm',        name: 'Direito Administrativo' },
  { id: 'dconst',      name: 'Direito Constitucional' },
  { id: 'dh',          name: 'Direitos Humanos' },
  { id: 'dpenal',      name: 'Direito Penal' },
  { id: 'procpenal',   name: 'Direito Processual Penal' },
  { id: 'dpm',         name: 'Direito Penal Militar' },
  { id: 'dppm',        name: 'Direito Processual Penal Militar' },
  // Legislação
  { id: 'leginst',     name: 'Legislação Institucional' },
  { id: 'legextra',    name: 'Legislação Extravagante' },
  { id: 'legmunaju',   name: 'Legislação Municipal de Aracaju/SE' },
];

// Índice por id para lookup O(1)
window.BQ_MATERIAS_IDX = Object.fromEntries(
  window.BQ_MATERIAS.map(m => [m.id, m.name])
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Retorna true se o código é uma matéria canônica válida.
 */
window.bqMateriaExiste = function(code) {
  return !!window.BQ_MATERIAS_IDX[code];
};

/**
 * Retorna o nome visual canônico do código.
 * Retorna '' se o código não existir (sem fallback).
 */
window.bqMateriaNome = function(code) {
  return window.BQ_MATERIAS_IDX[code] || '';
};

/**
 * Retorna a lista completa de matérias canônicas.
 * Se apenasPresentes=true, filtra pelas que existem em ST.banco.
 */
window.bqMateriaLista = function(apenasPresentes) {
  if (!apenasPresentes) return window.BQ_MATERIAS;
  var banco = (window.ST && Array.isArray(window.ST.banco)) ? window.ST.banco : [];
  var ids = new Set(banco.map(function(q) { return q.mat; }).filter(Boolean));
  return window.BQ_MATERIAS.filter(function(m) { return ids.has(m.id); });
};

/**
 * Valida um código de matéria.
 * Retorna { valid: true, id, name } ou { valid: false, reason }.
 * NÃO converte nem resolve alias — sem legado.
 */
window.bqValidarMateria = function(code) {
  if (!code) return { valid: false, reason: 'Matéria não informada.' };
  var name = window.BQ_MATERIAS_IDX[code];
  if (name) return { valid: true, id: code, name: name };
  // Rejeitar explicitamente códigos conhecidos que NÃO são matérias
  var rejeitados = {
    'cf':          'Constituição Federal não é matéria — use mat=dconst e leis=Constituição Federal/88',
    'cp':          'Código Penal não é matéria — use mat=dpenal e leis=Código Penal',
    'cpp':         'Código de Processo Penal não é matéria — use mat=procpenal e leis=Código de Processo Penal',
    'cpm':         'Código Penal Militar não é matéria — use mat=dpm e leis=Código Penal Militar',
    'cppm':        'Código de Processo Penal Militar não é matéria — use mat=dppm e leis=Código de Processo Penal Militar',
    'legpmal':     'legpmal não é matéria — use mat=leginst e leis=Legislação Pertinente ao Policial Militar de Alagoas',
    'legat':       'legat não é matéria — use mat=legextra',
  };
  if (rejeitados[code]) return { valid: false, reason: rejeitados[code] };
  if (/^gma3_disc_/.test(code)) return { valid: false, reason: 'IDs de edital (gma3_disc_*) não são matérias do Banco de Questões.' };
  if (/^s_/.test(code))         return { valid: false, reason: 'Códigos legados (s_*) não são matérias do Banco de Questões.' };
  return { valid: false, reason: 'Matéria "' + code + '" não reconhecida. Use um dos códigos canônicos.' };
};

// ── Alias de compatibilidade ─────────────────────────────────────────────────
// QUESTOES_MATERIAS é o nome usado em estatisticas-banco.js e app.js.
// Mantemos o alias para não precisar renomear todas as referências.
window.QUESTOES_MATERIAS = window.BQ_MATERIAS;

console.info('[BQ] materias-canonicas.js — FASE 9.4.14.1 — 23 matérias, sem legado');

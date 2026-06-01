/* ════════════════════════════════════════════════════════════════════
 * motto.js
 * ────────────────────────────────────────────────────────────────────
 * Frase motivacional do dia — IIFE auto-executada.
 * Lê o elemento #motto-do-dia (pode rodar a qualquer momento após DOMContentLoaded).
 *
 * IMPORTANTE: Este arquivo é parte do PROTOCOLO 01 (Estratégia B — Fase 1).
 * Todas as funções declaradas aqui são GLOBAIS (window.<nome>) por design.
 * NÃO converter para ESModules / IIFE / import-export sem refatoração ampla.
 * NÃO renomear funções (handlers inline no HTML dependem dos nomes atuais).
 * ════════════════════════════════════════════════════════════════════ */

(function(){
  var frases=[
    "É melhor você tentar algo, vê-lo não funcionar e aprender com isso, do que não fazer nada. — Mark Zuckerberg",
    "Nossa maior fraqueza é desistir. O caminho mais certo para o sucesso é sempre tentar apenas uma vez mais. — Thomas A. Edison",
    "O tempo de estudo nunca é um tempo perdido.",
    "Estudar é investir no seu futuro.",
    "Esse esforço todo vai sim valer a pena.",
    "O sucesso não cai do céu. Ele exige muita luta, esforço, estudo e força de vontade.",
    "O fracasso é uma ótima oportunidade para começar de novo de forma mais inteligente. — Henry Ford",
    "A melhor forma de prever o futuro é criá-lo. — Abraham Lincoln",
    "Aprenda com o ontem. Viva o hoje. Tenha esperança para o amanhã. — Albert Einstein",
    "Você não se afoga por cair na água, mas por ficar lá. — Albert Einstein",
    "Seja claro no que você deseja e persevere através dos estudos. Dessa forma, você vai colher os frutos de todo este tempo investido.",
    "Os estudos vão fortalecer a sua mente. Seja perseverante e confie!",
    "Comece de onde você está. Use o que você tiver. Faça o que você puder. — Arthur Ashe",
    "Não permita que aquilo que você não pode fazer interfira naquilo que você pode fazer. — John Wooden",
    "Descobri que, quanto mais eu trabalho, mais sorte pareço ter. — Thomas Jefferson",
    "Para grandes resultados não existem atalhos.",
    "Conquistas grandiosas levam tempo. Elas são fruto de muito esforço, tempo investido e disciplina.",
    "Não deseje que as coisas sejam mais fáceis; deseje que você seja melhor. — Jim Rohn",
    "Não há atalhos para nenhum destino onde se vale a pena chegar. — Beverly Sills",
    "Não há substituto para o trabalho duro. — Thomas Edison",
    "O único lugar onde o sucesso vem antes do trabalho é no dicionário. — Vidal Sassoon",
    "Um gênio é 10% inspiração e 90% transpiração. — Thomas Edison",
    "Eu falhei muitas e muitas vezes na vida. E é exatamente por isso que eu obtive sucesso. — Michael Jordan",
    "Motivação é aquilo que te faz começar. Hábito é o que te faz continuar. — Jim Ryun",
    "É feliz quem sonha, mas só tem sucesso quem se dispõe a pagar o preço para transformar seu sonho em realidade. — Silvio Santos",
    "Ninguém educa ninguém, ninguém educa a si mesmo, os homens se educam entre si, mediatizados pelo mundo. — Paulo Freire",
    "Viva como se fosse morrer amanhã. Aprenda como se fosse viver para sempre. — Mahatma Gandhi",
    "Tudo é possível se você se dedicar de cabeça e coração. — Bel Pesce",
    "Aquele que faz perguntas é um bobo por cinco minutos. Mas aquele que jamais questiona é um bobo para sempre. — Provérbio Chinês",
    "O aprendiz é um mestre em formação. — Fernanda Simões Rodrigues",
    "O talento sem a educação é como a prata na mina. — Benjamin Franklin",
    "O que é bonito sobre a aprendizagem é que ninguém pode tirá-la de você. — B.B. King",
    "O futuro pertence àqueles que acreditam na beleza dos seus sonhos. — Eleanor Roosevelt",
    "Educação é o passaporte para o futuro, porque o amanhã pertence àqueles que se preparam para ele hoje. — Malcolm X"
  ];
  var dia=new Date().getDate();
  var idx=(dia-1)%frases.length;
  var el=document.getElementById('motto-do-dia');
  if(el) el.textContent=frases[idx];
})();

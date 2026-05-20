/* =================================================================
   DEV-PROJECTS.JS — Configuração dos projetos de desenvolvimento
   Trace Engenharia · Apreciação de Riscos

   Fluxo:
     Apreciação de Riscos → (concluída) → Identifica não conformidades
     → Modal de roteamento → Cria devProjects por setor
     (mecânico / hidráulico / pneumático / elétrico)

   Este módulo define:
     - DEV_SECTORS: metadados de cada setor (cor, ícone, nome)
     - DEV_PHASES: fases pré-definidas de cada setor
     - DEFAULT_ENGINEERS: lista inicial de engenheiros
     - Helpers de tag, fase, contagem
   ================================================================= */

/* --- Setores de desenvolvimento -------------------------------- */
var DEV_SECTORS = {
  mecanico: {
    key: 'mecanico',
    label: 'Mecânico',
    plural: 'Mecânicos',
    icon: '⚙️',
    sigla: 'MEC',
    color: '#FA9600',
    nav: 'dev-mecanico'
  },
  hidraulico: {
    key: 'hidraulico',
    label: 'Hidráulico',
    plural: 'Hidráulicos',
    icon: '💧',
    sigla: 'HID',
    color: '#3282FA',
    nav: 'dev-hidraulico'
  },
  pneumatico: {
    key: 'pneumatico',
    label: 'Pneumático',
    plural: 'Pneumáticos',
    icon: '💨',
    sigla: 'PNE',
    color: '#28BE5A',
    nav: 'dev-pneumatico'
  },
  eletrico: {
    key: 'eletrico',
    label: 'Elétrico',
    plural: 'Elétricos',
    icon: '⚡',
    sigla: 'ELE',
    color: '#FAD250',
    nav: 'dev-eletrico'
  }
};

/* --- Fases por setor ------------------------------------------- */
/* Cada fase tem: key, label, progressoTarget (% sugerido ao chegar nela) */
var DEV_PHASES = {
  mecanico: [
    { key: 'levantamento',  label: 'Levantamento',       progresso: 5  },
    { key: 'planejamento',  label: 'Planejamento',       progresso: 15 },
    { key: 'modelagem',     label: 'Modelagem 3D',       progresso: 35 },
    { key: 'calculos',      label: 'Cálculos estruturais', progresso: 55 },
    { key: 'detalhamento',  label: 'Detalhamento',       progresso: 75 },
    { key: 'documentacao',  label: 'Documentação final', progresso: 90 },
    { key: 'concluido',     label: 'Concluído',          progresso: 100 }
  ],
  hidraulico: [
    { key: 'levantamento',  label: 'Levantamento',          progresso: 5  },
    { key: 'planejamento',  label: 'Planejamento',          progresso: 15 },
    { key: 'esquema',       label: 'Esquema hidráulico',    progresso: 35 },
    { key: 'dimensionamento', label: 'Dimensionamento',     progresso: 55 },
    { key: 'lista',         label: 'Lista de componentes',  progresso: 75 },
    { key: 'documentacao',  label: 'Documentação final',    progresso: 90 },
    { key: 'concluido',     label: 'Concluído',             progresso: 100 }
  ],
  pneumatico: [
    { key: 'levantamento',  label: 'Levantamento',          progresso: 5  },
    { key: 'planejamento',  label: 'Planejamento',          progresso: 15 },
    { key: 'esquema',       label: 'Esquema pneumático',    progresso: 35 },
    { key: 'dimensionamento', label: 'Dimensionamento',     progresso: 55 },
    { key: 'lista',         label: 'Lista de componentes',  progresso: 75 },
    { key: 'documentacao',  label: 'Documentação final',    progresso: 90 },
    { key: 'concluido',     label: 'Concluído',             progresso: 100 }
  ],
  eletrico: [
    { key: 'levantamento',  label: 'Levantamento',          progresso: 5  },
    { key: 'planejamento',  label: 'Planejamento',          progresso: 15 },
    { key: 'unifilar',      label: 'Diagrama unifilar',     progresso: 35 },
    { key: 'esquemas',      label: 'Esquemas elétricos',    progresso: 55 },
    { key: 'lista',         label: 'Lista de materiais',    progresso: 75 },
    { key: 'documentacao',  label: 'Documentação final',    progresso: 90 },
    { key: 'concluido',     label: 'Concluído',             progresso: 100 }
  ]
};

/* --- Status de projeto ---------------------------------------- */
var DEV_STATUS = {
  aguardando:      { label: 'Aguardando dados', bg: '#FEF9C3', fg: '#713F12', bar: '#EAB308' },
  planejamento:    { label: 'Planejamento',     bg: '#E0F2FE', fg: '#075985', bar: '#0284C7' },
  desenvolvimento: { label: 'Em desenvolvimento', bg: '#DBEAFE', fg: '#1E40AF', bar: '#3B82F6' },
  revisao:         { label: 'Em revisão',       bg: '#EDE9FE', fg: '#5B21B6', bar: '#8B5CF6' },
  concluido:       { label: 'Concluído',        bg: '#DCFCE7', fg: '#14532D', bar: '#16A34A' }
};

/* --- Engenheiros padrão --------------------------------------- */
/* O usuário pode editar essa lista na tela Configurações → Equipe.
 * Armazenado em localStorage sob a chave ENGINEERS_KEY (storage.js). */
var DEFAULT_ENGINEERS = [
  { id: 'eng_thiago', nome: 'Thiago Marinho', email: 'thiago@tracengenharia.com.br',
    cargo: 'Eng. Mecânico', setores: ['mecanico','hidraulico','pneumatico','eletrico'] }
];

var ENGINEERS_KEY = 'trace_engenheiros_v1';

/* Acessor (similar ao banco de exigências). storage.js também tem um
 * espelho; aqui mantemos para uso direto pelas views. */
function getEngineers(){
  try {
    var saved = localStorage.getItem(ENGINEERS_KEY);
    if(saved) return JSON.parse(saved);
  } catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT_ENGINEERS));
}
function saveEngineers(list){
  localStorage.setItem(ENGINEERS_KEY, JSON.stringify(list));
}

/* --- Helpers --------------------------------------------------- */

/* Próxima tag de projeto para um setor: PJT-MEC-00012 */
function nextDevProjectTag(categoria){
  var sec = DEV_SECTORS[categoria];
  if(!sec) return 'PJT-XXX-00000';
  var all = (typeof listDevProjects === 'function') ? listDevProjects() : [];
  var nums = all
    .filter(function(p){ return p.categoria === categoria; })
    .map(function(p){
      var m = (p.tag||'').match(new RegExp('PJT-'+sec.sigla+'-(\\d+)'));
      return m ? parseInt(m[1]) : -1;
    });
  var max = nums.length ? Math.max.apply(null, nums) : -1;
  return 'PJT-' + sec.sigla + '-' + String(max+1).padStart(5,'0');
}

/* Determina o status macro do projeto a partir da fase atual */
function devStatusFromFase(categoria, faseKey){
  if(faseKey === 'concluido') return 'concluido';
  if(faseKey === 'levantamento') return 'aguardando';
  if(faseKey === 'planejamento') return 'planejamento';
  if(faseKey === 'documentacao') return 'revisao';
  return 'desenvolvimento';
}

/* Retorna a fase atual (objeto) e índice de uma categoria/key */
function devFaseInfo(categoria, faseKey){
  var phases = DEV_PHASES[categoria] || [];
  var idx = phases.findIndex(function(p){ return p.key === faseKey; });
  if(idx < 0) idx = 0;
  return { phases: phases, idx: idx, fase: phases[idx] };
}

/* Conta não conformidades — usa RISCOS IDENTIFICADOS (HRN inicial, pré-adequação).
 * Para o fluxo de desenvolvimento, o que importa são os riscos detectados na
 * apreciação, não os residuais. Cada risco identificado vira potencial item
 * a ser corrigido pela equipe de projeto. */
function contNaoConformidades(assessment){
  if(!assessment || !assessment.riscos) return { total:0, criticos:0, todos: 0 };
  var todos = assessment.riscos.length;
  var total = 0, criticos = 0;
  assessment.riscos.forEach(function(r){
    if(typeof hrn !== 'function' || typeof grau !== 'function') return;
    // HRN INICIAL (riscos identificados) — usa LO, FE, DPH, NP sem o sufixo _p
    var h = hrn(r.LO, r.FE, r.DPH, r.NP);
    var g = grau(h);
    if(g !== 'Baixo') total++;
    if(g === 'Alto' || g === 'Muito Alto') criticos++;
  });
  // Política: TODO risco identificado (mesmo Baixo) é candidato a desenvolvimento.
  // O total é o número de riscos com grau >= Médio; critic os = Alto + Muito Alto.
  // 'todos' = todos os riscos identificados (para a UI de seleção por risco).
  return { total: total, criticos: criticos, todos: todos };
}

/* Cria um novo projeto de desenvolvimento a partir de uma apreciação concluída.
 * opts.riscosAtribuidos: lista de {riscoIdx, riscoNum, titulo, grau, hrn, descricao}
 *   — riscos específicos da apreciação atribuídos a este projeto. */
function createDevProject(opts){
  var sec = DEV_SECTORS[opts.categoria];
  if(!sec) return null;
  var riscos = opts.riscosAtribuidos || [];
  var criticos = riscos.filter(function(r){ return r.grau === 'Alto' || r.grau === 'Muito Alto'; }).length;
  var phases = DEV_PHASES[opts.categoria];
  var faseInicial = phases[0];
  var proj = {
    id: 'dev_' + Date.now() + '_' + opts.categoria + '_' + Math.floor(Math.random()*9999),
    apreciacaoId: opts.apreciacaoId,
    apreciacaoNumero: opts.apreciacaoNumero || '',
    apreciacaoData: opts.apreciacaoData || new Date().toLocaleDateString('pt-BR'),
    categoria: opts.categoria,
    tag: nextDevProjectTag(opts.categoria),
    nome: opts.nome || 'Projeto sem nome',
    cliente: opts.cliente || '',
    riscosAtribuidos: riscos,
    naoConformidades: riscos.length,
    riscosCriticos: criticos,
    faseKey: faseInicial.key,
    fase: faseInicial.label,
    progresso: faseInicial.progresso,
    status: devStatusFromFase(opts.categoria, faseInicial.key),
    prazo: opts.prazo || '',
    responsavelId: opts.responsavelId || '',
    anexos: [],
    historico: [{
      ts: new Date().toISOString(),
      evento: 'Projeto criado',
      detalhe: 'Roteado a partir da apreciação ' + (opts.apreciacaoNumero||'') + ' · ' + riscos.length + ' risco(s) atribuído(s)'
    }],
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };
  if(typeof saveDevProject === 'function') saveDevProject(proj);
  return proj;
}

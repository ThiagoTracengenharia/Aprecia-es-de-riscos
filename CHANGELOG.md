# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não publicado] — Reformulação 2026

### Adicionado
- Documento `docs/PLANO-MODERNIZACAO.md` com roadmap em fases.
- Pasta `assets/img/` com o logo oficial da Trace (fundo transparente, branco, avatar).
- Pasta `docs/mockups/` com as referências visuais aprovadas (desktop e mobile).
- Arquivo `.gitignore` e `README.md` na raiz.
- Pasta `legacy/` para preservar arquivos do build Electron antigo.

### Adicionado (Fase 1 — repaginação visual concluída)
- Nova paleta de cores em `:root` baseada na marca oficial Trace (`#FA9600` primário, extraído via Pillow do mockup `APLICATIVO.png`).
- Header em fundo branco com faixa laranja (3px) no topo, logo Trace integrado, chip de usuário com avatar laranja.
- Sidebar branca (232px) com itens de navegação em pílula, hover laranja-50, ativo em laranja sólido com sombra.
- Stepper em pílulas: cinza claro para pendente, verde-circle para concluído, laranja sólido com texto branco para ativo.
- Cards e modais com fundo branco, bordas suaves `--ink-100`, sombras leves.
- Tela de login redesenhada em layout split 60/40: bloco laranja com gradient Trace + logo branco + 3 features à esquerda; formulário branco com foco laranja à direita. Responsivo (oculta painel esquerdo em telas <900px).
- Favicon configurado (`assets/img/trace-avatar.png`).
- Meta tags atualizadas: title "Apreciações de Risco — Trace Engenharia", theme-color `#FA9600`, description.
- Botões primários, badges, tags, fab tabs e links agora em laranja Trace.
- HRN display mantido em fundo escuro deliberado (cor de destaque dramático para o número HRN).

### Alterado
- Logo do header migrado de data URI base64 inline (~65 KB) para arquivo externo `assets/img/trace-logo.png` (reduz tamanho do HTML e permite cache do navegador).
- Mockups oficiais (`DESKTOP.png`, `APLICATIVO.png`) copiados para `docs/mockups/` para referência futura.
- `PLANO-MODERNIZACAO.md` movido para `docs/` e atualizado com paleta real e nota sobre Hostinger.

### Corrigido
- Botões `#hdr-back` e `#hdr-save` no header tinham cores inline (texto branco sobre fundo escuro) que ficavam invisíveis no novo tema claro — atualizados para usar paleta nova.

### Fase 2 — Refactor estrutural (concluída)

O monolito de `index.html` (4.8 MB / 4.229 linhas com tudo embutido) foi quebrado em módulos carregados pelo navegador em paralelo. Resultado: **`index.html` final tem 262 KB e 3.640 linhas (redução de 94 % do tamanho)**.

**Arquivos criados:**
- `assets/css/app.css` (28 KB / 362 linhas) — paleta Trace, layout, componentes, tela de login, user chip.
- `assets/js/config.js` (4,5 MB) — `TRACE_LOGO`, `METHODOLOGY_PAGES` (textos longos das páginas de metodologia — era o que mais inflava o HTML), `STEPS`, `DB_KEY`, `BANCO_EXIG_KEY`, `BANCO_TEXTOS_KEY`, `STORAGE_KEY`, `PROJECTS_KEY`, `SUPA_URL`, `SUPA_KEY`, `DEMO_MODE`.
- `assets/js/storage.js` (6,8 KB / 175 linhas) — camada centralizada de persistência: `dbLoad`/`dbSave`, `getBancoExig`/`saveBancoExig`/`getBancoTextos`/`saveBancoTextos`, `idbOpen`/`idbSet`/`idbGet`/`idbDel`/`saveImagesToIdb`/`loadImagesFromIdb`, `listProjects`/`saveProjectToStorage`/`deleteProjectFromStorage`/`listAssessments`/`saveAssessmentToStorage`/`deleteAssessmentFromStorage`. **É o módulo-chave para a Fase 4** — quando o backend for plugado, basta trocar este arquivo por uma versão que chama `fetch('/api/...')`.
- `assets/js/risk.js` (1,3 KB / 25 linhas) — funções HRN: `hrn()`, `grau()`, `grauCls()`, `grauColor()`, `grauBg()`.
- `assets/js/auth.js` (2,9 KB / 70 linhas) — `CURRENT_USER`, `showLogin`, `hideLogin`, `loginClick`, `signOutUser`, `updateUserChip`. Comentário no header indica como migrar do modo demo para `POST /api/auth/login`.

**Ordem de carregamento no `<head>`:**
```
<link rel="stylesheet" href="assets/css/app.css">
<script src="assets/js/config.js"></script>
<script src="assets/js/storage.js"></script>
<script src="assets/js/risk.js"></script>
<script src="assets/js/auth.js"></script>
```

**O que ficou no `index.html`:**
- Cabeçalho HTML (`<head>`, `<body>`, sidebar, header, stepper)
- Tela de login HTML
- O monolito JS de render/views/templates PDF (a grande maioria) — esses não foram extraídos porque estão fortemente acoplados ao DOM e ao estado `S`. Ficarão para uma Fase 2.5 futura ou serão refeitos junto com a migração para frontend modular (Fase 4+).

**Validação:** smoke test HTTP retornou 200 para os 8 endpoints (index, CSS, 4 JS, 2 imagens).

### Adicionado (Fase 1.7+ — pós-Fase 2 e antes da Fase 3)

**Redesign Banco de Dados**
- Tela completamente refeita com paleta clara: 3 funções (`renderBancoDados`, `renderBancoExig`, `renderBancoTextos`). Todas as cores brancas inline trocadas por `--ink-*` para legibilidade.
- Sidebar branca com itens em pílula, hover laranja-50, contador como badge. Cards de exigência com header em laranja-600 + ref como chip mono.

**Login fixo (provisório até backend Fase 3)**
- `ALLOWED_USERS` em `auth.js`: `thiago@tracengenharia.com.br` / `36714662`.
- Removido aviso "Modo Demonstração" da tela.
- Tela de login refeita: split 60/40 com gradient laranja Trace + 3 features à esquerda, formulário à direita.

**Botão de usuário no header (canto superior direito)**
- Chip clicável com avatar + nome + e-mail + chevron. Click abre dropdown com info do usuário + botão **Sair** (volta para tela de login). Click fora fecha.

**Desenvolvimento de Projetos (nova seção)**

Após a apreciação ser concluída, o sistema permite rotear cada risco identificado para um setor de desenvolvimento (mecânico, hidráulico, pneumático, elétrico) e atribuir a um projetista. Implementado:

- `assets/js/dev-projects.js` (9,4 KB): `DEV_SECTORS` (4 setores com cor/ícone/sigla), `DEV_PHASES` (7 fases por setor — Levantamento, Planejamento, Modelagem 3D / Esquema / Diagrama unifilar, Cálculos / Dimensionamento, Detalhamento / Lista de componentes / materiais, Documentação final, Concluído), `DEV_STATUS`, `DEFAULT_ENGINEERS`, `getEngineers`, `saveEngineers`, `nextDevProjectTag` (PJT-MEC-00012 etc), `devStatusFromFase`, `devFaseInfo`, `contNaoConformidades` (usa **HRN inicial** pré-adequação, não residual), `createDevProject`.
- `storage.js` ampliado com `DEV_PROJECTS_KEY`, `listDevProjects`, `listDevProjectsByCategoria`, `listDevProjectsByApreciacao`, `getDevProject`, `saveDevProject`, `deleteDevProject`, `deleteDevProjectsByApreciacao`, `saveDevAttachments`/`loadDevAttachments`/`deleteDevAttachments` (anexos no IndexedDB), `assessmentSummaryInicial` (HRN pré-adequação).
- Sidebar com nova seção **"Desenvolvimento de Projetos"** — 4 itens (Mecânico ⚙️, Hidráulico 💧, Pneumático 💨, Elétrico ⚡) com badge de contagem, e **"Equipe"** em Administração.
- `renderDevList(categoria)` — página por setor com header, 4 stat cards (Total, Em Desenvolvimento, Em Revisão, Concluído), abas filtro, tabela com colunas (Projeto · Origem da Apreciação · Não conformidades · Status+Fase · Prazo · Responsável · Progresso · Ação).
- `renderDevDetail()` — detalhe do projeto com header, edição inline de status/progresso/prazo/responsável, **timeline das 7 fases** (click para avançar), **lista de riscos atribuídos** (cada um com grau colorido e HRN), **área de anexos** (botão "Anexar arquivo" + lista com ícone por tipo, tamanho, download e remover), histórico das últimas 5 ações.
- `renderEquipe()` — cadastro de engenheiros: nome, e-mail, cargo, setores em que atua (checkboxes). Lista usada nos selects de Responsável em todo o fluxo.

**Modal de roteamento por RISCO**
- Ao concluir uma apreciação, abre modal que lista todos os riscos identificados. Cada risco tem select de setor + select de responsável (filtrado por setor) + prazo. Botões de bulk para atribuir setor a todos. Stats por setor em tempo real.
- Riscos com mesma combinação `(setor, responsável, prazo)` viram **um único** projeto de desenvolvimento — ex: 3 riscos mecânicos para Thiago + 2 mecânicos para Fulano = 2 projetos mecânicos separados.
- Cada `devProject` guarda no campo `riscosAtribuidos` o array completo dos riscos específicos (riscoIdx, riscoNum, titulo, grau, hrn, descricao).
- Reabrir uma apreciação concluída pergunta antes de apagar os devProjects vinculados.

**Upload de arquivos no projeto de desenvolvimento**
- Área de anexos no detalhe: botão "📎 Anexar arquivo" (multi-upload). Cada arquivo armazenado em IndexedDB (`devatt_<id>`), com metadados (nome, tamanho, tipo, data) no devProject.
- Ícone por tipo: 📄 PDF, 📊 planilha, 📝 Word, 🖼️ imagem, 📁 outros. Botões de download e remover.

### Corrigido (Fase 1.7+)
- **Bug exigências**: clicar "Inserir nos Textos" não funcionava. Causa: `key.split('_')` quebrava chaves com underscores no código (ex: `ELET_Q11_3` virava `["ELET","Q11","3"]` e `parseInt("Q11")` retornava NaN). Solução: usar `lastIndexOf('_')`. Mesmo bug existia nas categorias de textos.
- **Bug exportar PDF**: gerar PDF abria a tela de login em vez do PDF. Causa: o template HTML do PDF embutia `<div id="login-screen">` (35 linhas + logo base64 65KB inline). Bloco removido do template.
- **Banners internos pretos**: Projetos, Matriz de Criticidade, Matriz de Riscos, Gráficos, Banco de Dados ainda estavam em fundo preto. Migrados para fundo branco com faixa laranja lateral.
- **HRN inicial vs residual**: `contNaoConformidades` agora usa HRN inicial (LO, FE, DPH, NP — pré-adequação) em vez de residual. Adicionado `assessmentSummaryInicial` em storage.js.
- **Tela em branco crítica**: index.html havia sido truncado em várias edições, perdendo `bind()`, `saveCurrentAssessment`, `newAssessment`, `openAssessment`, `markConcluido`, `deleteAssessment`, `bindHome`, `setHomeFilter`, `exportFromPlatform`, `renderProjects`, `renderProjectDetail`, `<div id="login-screen">`. Tudo recuperado: funções movidas para `assets/js/assessment-mgmt.js` (21 KB) e tela de login restaurada antes de `</body>`.

### Adicionado — Módulos novos (após Fase 2)
- `assets/js/dev-projects.js` (9,4 KB) — config, fases, engenheiros, helpers de roteamento.
- `assets/js/assessment-mgmt.js` (21 KB) — gerenciamento de apreciações (CRUD, modal de roteamento, bind).

### Próximas etapas
- **Fase 3**: Backend Node + Postgres (server/ com Express, schema SQL, endpoints REST, .env.example, seed).
- **Fase 4**: Substituir `localStorage` por chamadas à API REST — basta editar `storage.js` e `auth.js`.
- **Fase 5**: Gerar PDF server-side com Puppeteer.
- **Fase 6**: Publicar como aplicação web em `app.tracengenharia.com.br` (DNS via Hostinger, hospedagem inicial em Railway).
- **Fase 7**: Deploy contínuo (GitHub Actions).
- Descontinuar o instalador Electron (`.exe`).

### Planejado
- Refatorar o monolito `index.html` (~3.836 linhas) em módulos.
- Implementar backend Node + Postgres.
- Substituir `localStorage` por chamadas à API REST.
- Gerar PDF server-side com Puppeteer (em vez de `window.print()`).
- Publicar como aplicação web em `app.tracengenharia.com.br`.
- Descontinuar o instalador Electron (`.exe`).

---

## [1.0.0] — versão Electron desktop *(legado)*

Aplicação Windows empacotada via `electron-builder` (NSIS), com dados em `%APPDATA%\Trace Riscos\`.

### Características
- Stepper de 4 etapas: Documento & Equipamento → Análise por IA → Revisão de Riscos → Exportar.
- Cálculo HRN (LO × FE × DPH × NP) com 4 graus de risco.
- Banco interno editável de exigências normativas e textos padrão.
- Upload de imagens armazenadas em IndexedDB.
- Geração de PDF via `window.print()` + CSS print.
- Login com modo demo (qualquer e-mail/senha).
- Backup automático a cada 15 minutos.

### Limitações conhecidas
- Dados isolados por máquina (sem sincronização entre engenheiros).
- Atualização exige redistribuir o `.exe`.
- Sem histórico de revisões, trilha de aprovação ou busca global.
- Geração de PDF dependente do diálogo de impressão do Chromium.

# Plano de Modernização — Apreciação de Riscos Trace Engenharia
*Documento de referência · 18/05/2026*

---

## 1. Diagnóstico do estado atual

### 1.1 Arquitetura hoje
A ferramenta de hoje é uma **aplicação desktop Electron** (`trace-riscos` v1.0.0), empacotada como instalador `.exe` Windows via `electron-builder`/NSIS. App ID `br.com.traceengenharia.riscos`. Não é uma aplicação web — embora o coração seja o `index.html`, ele depende de funcionalidades nativas do Electron (`preload.js`, `main.js`, electron-store, electron-updater).

### 1.2 O que já existe e funciona
- **Stepper de 4 etapas**: Documento & Equipamento → Análise por IA → Revisão de Riscos → Exportar Documento.
- **Matriz HRN** (Hazard Rating Number): `HRN = LO × FE × DPH × NP`, com 4 graus (Baixo / Médio / Alto / Muito Alto).
- **Navegação multi-tela**: Projetos, Matriz de Criticidade por Equipamento, Matriz de Riscos, Gráficos.
- **Modelo de risco** com campos: `id`, `num`, `identificacao`, `localizacao`, `riscoAlvo`, `situacaoAtual`, parâmetros LO/FE/DPH/NP, e medidas vinculadas.
- **Banco interno editável** de exigências normativas e textos (`trace_banco_exig_v1`, `trace_banco_textos_v1`).
- **Geração de PDF via `window.print()`** + CSS de impressão (não usa jsPDF). Simples, mas dependente do diálogo de impressão do Chromium.
- **Upload de imagens** via `FileReader` → IndexedDB (separado do localStorage para não estourar limite).
- **Sistema de login** já esboçado: tela em `#login-screen` (linha ~3370 e ~4110), variável `CURRENT_USER`, `sessionStorage._traceUser`, e **placeholders prontos para Supabase** (`SUPA_URL`, `SUPA_KEY`, `DEMO_MODE`). Hoje aceita qualquer e-mail/senha em modo demo.
- **Pasta de dados nativa** (do Electron): `%APPDATA%\Trace Riscos\{Local Storage, images, backups, exports}\` com backup automático a cada 15 min.

### 1.3 Pontos frágeis (o que precisa endereçar)
1. Dados **isolados por máquina** — não há sincronização entre engenheiros, cada um tem seu banco local.
2. **Sem multiusuário real** — login é cosmético (modo demo), qualquer e-mail entra.
3. **Sem histórico/revisões versionadas** dos documentos.
4. **PDF dependente do `window.print()`** — varia entre impressoras virtuais, configuração de "gráficos de fundo", margens.
5. **Imagens em IndexedDB local** — não compartilháveis, sem backup central.
6. **Atualização da ferramenta** exige rebuild + redistribuir `.exe` para toda a equipe.
7. **Banco de exigências/textos local** — customização não se propaga entre usuários.
8. **Sem auditoria** (quem alterou o quê, quando).
9. **Sem trilha de aprovação** (revisor → aprovador).
10. **Sem busca global** entre apreciações de clientes diferentes.

### 1.4 Repositório `Aprecia-es-de-riscos` (GitHub)
Hoje contém: `index.html`, `apreciacao-riscos_53.html` (versão antiga), `main.js`, `preload.js`, `package.json`, `setup.ps1`, `LEIA-ME-BUILD.md`. Público, 2 commits, **sem GitHub Pages ativo**, sem releases.

### 1.5 Site da Trace
Fetch do repo `Trace-Engenharia-Site` retornou vazio na sondagem inicial — pode estar privado ou em branch alternativa. **Pendente confirmar** na fase de integração: stack (HTML estático? Vite? Next?), domínio em produção, paleta laranja exata (códigos hex), fontes.

---

## 2. Decisão arquitetural-chave (DECIDIR ANTES DA FASE 1)

A ferramenta hoje é desktop. Você quer acessá-la pelo site. Existem três caminhos:

### Caminho A — Migrar 100% para web (recomendado)
A ferramenta vira uma aplicação web (frontend + backend Node + DB) hospedada num servidor. O site da Trace passa a ter um botão "Apreciações de Risco" que leva para `app.traceengenharia.com.br` (ou subpasta `/ferramentas/riscos`). O Electron é **descontinuado**.

**Vantagens**: um único código, atualização instantânea para toda a equipe, multiusuário nativo, dados centrais, acessível de qualquer dispositivo (inclusive em campo via tablet).
**Custo**: servidor (R$ 30–80/mês em Hetzner/Contabo/Railway), domínio.
**Esforço de migração**: médio — o `index.html` já é praticamente uma SPA; basta trocar localStorage/IndexedDB por chamadas à API.

### Caminho B — Manter Electron + adicionar versão web
Dois apps, mesma base. Engenheiros em campo usam o desktop offline; quem acessa pelo site usa a versão web. Sincronização via API.

**Vantagens**: funciona offline em obra.
**Custo**: dobra a manutenção. Conflitos de sincronização.
**Esforço**: alto.

### Caminho C — Manter só Electron, mas com backend central
O desktop continua, mas para de gravar local — passa a falar com API Node. Site só apresenta o instalador para download.

**Vantagens**: pouca mudança de UX para quem já usa.
**Custo**: usuários precisam ter o `.exe` instalado; experiência de "abrir pelo site" continua sendo "baixar instalador".
**Esforço**: médio.

> **Minha recomendação: Caminho A.** É o que melhor atende ao item (2) do seu pedido ("acessar pelo site"), elimina a fricção de distribuir `.exe`, e o código atual já está praticamente pronto para isso (login com Supabase placeholder mostra que você já tinha esse caminho em mente).
>
> O restante deste plano assume **Caminho A**. Se preferir B ou C, me avise e ajusto.

---

## 3. Plano em fases

> Ordem proposta: cada fase entrega valor visível e pode ser pausada/retomada. Estimativas em "sessões" (1 sessão ≈ 2–4h de trabalho com IA).

### Fase 0 — Higiene e organização (1 sessão)
- Criar branch `redesign-2026` no repo.
- Mover `apreciacao-riscos_53.html` para uma pasta `legacy/`.
- Adicionar `.gitignore` (node_modules, dist/, .env).
- Adicionar `README.md` decente (substitui o atual ausente).
- Adicionar `CHANGELOG.md`.

### Fase 1 — Repaginação visual em laranja (2–3 sessões)
**Objetivo**: trocar tema escuro/amarelo → claro/laranja sem mexer em lógica de negócio.

- Extrair variáveis CSS para um bloco único `:root` no topo, mapeando:
  - `--navy: #1a1a1a` → `--surface: #ffffff`
  - `--gray-50: #f7f8fb` → fundo principal
  - `--yellow: #F5A623` → `--orange: #FF6B1A` (ou cor exata do site Trace, a confirmar)
  - `--orange-dark`, `--orange-soft` (hover, badge bg, anel de foco)
- Header: fundo branco com sombra suave + logo Trace; faixa laranja fina no topo (4px).
- Stepper: pílulas claras com número laranja quando ativo, check verde quando concluído.
- Cards: bordas suaves, sombra leve, header com ícone laranja.
- Tela de **login redesenhada**: fundo branco com bloco laranja lateral (imagem industrial), formulário centrado, sem o visual "dark dashboard" atual.
- **Navegação melhorada**: sidebar fixa à esquerda (em vez de tabs no topo) com ícones + labels, colapsável em mobile.
- **Modo impressão preservado** (CSS `@media print`) — não pode quebrar o PDF gerado.
- Acessibilidade: contraste mínimo AA, foco visível, tamanho mínimo de toque 44px em mobile.

**Entrega**: novo `index.html` no GitHub. Antes/depois lado a lado.

### Fase 2 — Refactor estrutural do código (1–2 sessões)
**Objetivo**: o `index.html` tem ~3.836 linhas. Antes de plugar backend, separar responsabilidades.

- Quebrar o monolito em:
  - `index.html` (estrutura + login)
  - `assets/css/app.css` (estilos)
  - `assets/js/state.js` (objeto `S`, accessors)
  - `assets/js/storage.js` (camada de persistência — hoje localStorage, depois API)
  - `assets/js/views/` (render de cada tela)
  - `assets/js/risk.js` (cálculos HRN)
  - `assets/js/pdf.js` (geração de impressão)
- Toda chamada a `localStorage.*` passa por `storage.js` → trivial trocar por `fetch('/api/...')` na Fase 4.
- Sem build tool ainda (mantém HTML/JS puro carregado por `<script>`). Build vem na Fase 7.

### Fase 3 — Backend Node + Banco (3–4 sessões)
**Objetivo**: API e DB centrais.

- **Stack**: Node 20 + Express (ou Fastify) + SQLite (início) → PostgreSQL (produção).
- **Estrutura de pastas do repo**:
  ```
  Aprecia-es-de-riscos/
  ├── client/                    ← front-end (o que está hoje na raiz)
  │   ├── index.html
  │   ├── assets/
  │   └── ...
  ├── server/
  │   ├── src/
  │   │   ├── index.js           ← bootstrap Express
  │   │   ├── routes/
  │   │   │   ├── auth.js
  │   │   │   ├── apreciacoes.js
  │   │   │   ├── projetos.js
  │   │   │   ├── exigencias.js
  │   │   │   ├── uploads.js     ← multer p/ imagens/PDFs
  │   │   │   └── usuarios.js
  │   │   ├── middleware/auth.js ← JWT
  │   │   ├── db/
  │   │   │   ├── schema.sql
  │   │   │   ├── migrations/
  │   │   │   └── seed.js
  │   │   └── services/pdf.js    ← gera PDF server-side (puppeteer)
  │   ├── storage/               ← arquivos do servidor (gitignored)
  │   │   ├── pdfs/{ano}/{mes}/  ← PDFs assinados
  │   │   ├── imagens/{apreciacao_id}/
  │   │   └── backups/
  │   ├── .env.example
  │   └── package.json
  ├── electron/                  ← legado, congelado
  ├── legacy/                    ← versões antigas
  ├── docs/
  │   ├── ARQUITETURA.md
  │   └── API.md
  └── README.md
  ```
- **Banco — tabelas principais**:
  - `users` (id, email, senha_hash, nome, crea, role, ativo, criado_em)
  - `clientes` (id, razao_social, cnpj, contato, …)
  - `projetos` (id, cliente_id, codigo, nome, status, criado_em)
  - `equipamentos` (id, projeto_id, tag, tipo, fabricante, modelo, n_serie, …)
  - `apreciacoes` (id, projeto_id, equipamento_id, numero_doc, revisao, titulo, status, criado_por, criado_em, atualizado_em)
  - `riscos` (id, apreciacao_id, num, identificacao, localizacao, risco_alvo, situacao_atual, LO, FE, DPH, NP, hrn, grau, medidas_json)
  - `imagens` (id, apreciacao_id, risco_id?, caminho, mime, tamanho_bytes, criado_em)
  - `pdfs` (id, apreciacao_id, caminho, versao, gerado_por, gerado_em, hash_sha256)
  - `revisoes` (id, apreciacao_id, snapshot_json, comentario, autor_id, criada_em) — histórico
  - `banco_exigencias` (id, codigo_norma, descricao, ativo, atualizado_em)
  - `banco_textos` (id, chave, conteudo, atualizado_em)
  - `auditoria` (id, user_id, acao, entidade, entidade_id, antes_json, depois_json, ts)
- **Endpoints REST** principais: `/api/auth/login`, `/api/apreciacoes`, `/api/apreciacoes/:id/riscos`, `/api/apreciacoes/:id/pdf`, `/api/uploads/imagem`, `/api/banco/exigencias`, etc.
- **Senhas**: bcrypt + JWT (HS256) com refresh.

### Fase 4 — Migração do front para API (2 sessões)
**Objetivo**: trocar a camada `storage.js` (que hoje fala com localStorage) para falar com a API.

- Manter compatibilidade: feature flag `USE_API` que permite alternar entre local e remoto durante a transição.
- Tela de login real (substitui o modo demo). JWT salvo em `sessionStorage`.
- Migração de dados existentes: botão **"Importar dados locais"** que pega o conteúdo de `localStorage` do usuário e sobe via API.
- Tratamento de erros de rede (toast, retry).

### Fase 5 — Geração de PDF server-side (1–2 sessões)
**Objetivo**: PDFs consistentes, salvos no servidor, com hash de integridade.

- Substituir `window.print()` por endpoint `POST /api/apreciacoes/:id/pdf` que usa **Puppeteer** server-side para renderizar a página e gerar PDF idêntico para todos os usuários.
- PDF é salvo em `storage/pdfs/{ano}/{mes}/HRN-XXX-Rx.pdf`, registrado em `pdfs`, retornado URL para download.
- Manter botão "Imprimir" como fallback.

### Fase 6 — Integração com o site da Trace (1 sessão)
**Objetivo**: o usuário entra pelo site institucional.

- Adicionar item no menu do site `Trace-Engenharia-Site`: **"Ferramentas → Apreciação de Riscos"**.
- Esse link aponta para `https://app.traceengenharia.com.br` (subdomínio) ou `https://traceengenharia.com.br/app/riscos` (subpasta com reverse proxy).
- Página de "entrada" no app mostra logo + botão "Entrar" → login.
- Após login, redireciona para o dashboard.
- *(Opcional avançado)*: SSO se o site já tem login próprio — fica para fase futura.

### Fase 7 — Deploy contínuo e GitHub Actions (1 sessão)
**Objetivo**: cada `push` na `main` atualiza a versão em produção.

- **Servidor**: VPS Linux (Hetzner CX22 ~R$ 25/mês, ou Railway/Render).
- **Frontend**: servido pelo próprio Node (Express estático) ou Nginx.
- **GitHub Actions** `.github/workflows/deploy.yml`:
  - Job 1: `npm test` (lint + smoke tests).
  - Job 2 em push na `main`: SSH no servidor → `git pull` + `npm install` + `pm2 restart trace-riscos`.
- **Banco**: backup automático diário (cron) para S3/Backblaze/Google Drive.
- **HTTPS**: Let's Encrypt via Caddy ou Nginx Certbot.
- **Domínio**: configurar DNS A/CNAME no provedor do site da Trace.

### Fase 8 — Recursos novos (ordem livre, após o resto estável)
Ideias que surgem do diagnóstico:
- **Trilha de aprovação** (Rascunho → Em revisão → Aprovado → Emitido), com assinatura digital no PDF.
- **Histórico de revisões** com diff entre versões.
- **Comentários** em riscos individuais (entre engenheiro e revisor).
- **Busca global** entre todas as apreciações da empresa.
- **Templates** de apreciação por tipo de equipamento.
- **Importação de planilhas** (perigos comuns, NRs).
- **Modo offline** com sync (PWA — Service Worker) — recupera o "trabalha em obra" do Electron.
- **Notificações** (e-mail quando alguém menciona você ou pede revisão).
- **Relatórios gerenciais**: nº de apreciações por mês, por cliente, distribuição de graus de risco.

### Fase 9 — Documentação e treinamento (1 sessão)
- README do repo com setup local e arquitetura.
- `docs/MANUAL-USUARIO.md` para a equipe.
- Vídeo curto (~5 min) de onboarding.

---

## 4. Confirmações do cliente (18/05/2026)

| Tópico | Status | Detalhe |
|---|---|---|
| Caminho arquitetural | ✅ **A — migrar para web** | Aprovado pelo cliente |
| Domínio do site | ✅ `tracengenharia.com.br` | (atenção: sem o "e" duplo) |
| Hospedagem do site | ✅ **Hostinger** | Provavelmente plano Premium/Business com WordPress ou Hostinger Website Builder |
| Stack do site | ⚠️ Desconhecida | O fetch retornou só shell HTML — é uma SPA/SSG renderizada via JS. Provável WordPress + Elementor ou builder Hostinger |
| Cor laranja oficial | ✅ **`#FA9600`** | Extraído via Pillow do mockup `APLICATIVO.png` (3386 ocorrências, dominante) |
| Logo Trace | ✅ PNG fundo transparente | `assets/img/trace-logo.png` |
| Mockups de referência | ✅ Recebidos | `docs/mockups/desktop-reference.png` + `aplicativo-reference.png` |
| Manutenção do Electron | ✅ Descontinuar | Cliente delegou a decisão |

### 4.1 Paleta oficial Trace (extraída da marca)

Extraída diretamente do mockup oficial `APLICATIVO.png` que o cliente forneceu, com validação cruzada contra o logo principal.

```
/* Laranja Trace — marca */
--orange-500:  #FA9600   /* PRIMÁRIO — botões, badges, focus, links, logo */
--orange-600:  #E08600   /* hover dos botões primários */
--orange-700:  #BB6D00   /* active / pressed */
--orange-400:  #FFAA30   /* highlights, ícones secundários */
--orange-100:  #FFE6BE   /* badge bg, chips ativos */
--orange-50:   #FFF5E5   /* hover de itens da sidebar, áreas selecionadas */

/* Acentos secundários (do mesmo sistema) */
--coral-500:   #FA5A50   /* alertas/destaques contrastantes */
--blue-500:    #3282FA   /* informativos, links externos */
--green-500:   #28BE5A   /* sucesso, grau "Baixo" */
--yellow-500:  #FAD250   /* atenção, grau "Médio" */

/* Neutros */
--ink-900:     #1A1F2B   /* texto principal */
--ink-700:     #3D4654   /* texto secundário */
--ink-500:     #6B7588   /* labels uppercase, hints */
--ink-300:     #C6CCD8   /* bordas */
--ink-100:     #EEF1F6   /* divisores, fundos de input */
--ink-50:      #F7F9FC   /* background geral da página */
--white:       #FFFFFF   /* superfícies (cards, sidebar, header) */

/* Graus de risco */
--grau-baixo-bg:   #DCFCE7; --grau-baixo-fg:   #14532D; --grau-baixo-bar:   #16A34A;
--grau-medio-bg:   #FEF9C3; --grau-medio-fg:   #713F12; --grau-medio-bar:   #EAB308;
--grau-alto-bg:    #FFE6BE; --grau-alto-fg:    #7C2D12; --grau-alto-bar:    #EA580C;
--grau-muito-bg:   #FEE2E2; --grau-muito-fg:   #7F1D1D; --grau-muito-bar:   #DC2626;
```

**Aplicação (baseada nos mockups aprovados)**:
- **Sidebar branca fixa** à esquerda (220px) com logo Trace no topo, navegação com ícones, card "Suporte Técnico" no rodapé
- **Header branco** com título da tela + chip do usuário (avatar laranja)
- Área de conteúdo `#F7F9FC` com cards brancos de sombra muito leve
- **Cards de métrica** no topo do dashboard: Projetos, Concluídas, Em Andamento, Em Risco, IRA Médio
- **Stepper** em pílulas: check verde para concluído, laranja sólido para ativo, cinza claro para pendente
- **Tela de login**: split 60/40 — bloco laranja à esquerda (logo branco + tagline) e formulário branco à direita

## 5. Nota crítica sobre Hostinger e o backend

**Importante**: a hospedagem do site da Trace é Hostinger. Os planos típicos de Hostinger (Premium, Business) hospedam HTML/PHP/WordPress mas **não rodam servidores Node.js persistentes**. Para o backend Node + Postgres da ferramenta de apreciação, há três opções:

| Opção | Custo | Vantagens | Desvantagens |
|---|---|---|---|
| **Hostinger VPS** (recomendado p/ manter no mesmo provedor) | R$ 30–60/mês | Mesmo painel, mesmo provedor, mesma conta | Você gerencia o servidor (SSH, atualizações de SO) |
| **Hostinger Cloud Startup** | R$ 60+/mês | Suporta Node.js gerenciado | Mais limitado que VPS, menos controle |
| **Railway / Render / Fly.io** (externo) | US$ 5–10/mês | Deploy automático do GitHub, zero gerenciamento | Provedor diferente da Hostinger; conta extra |

**Recomendação inicial**: começar com **Railway no plano Hobby (US$ 5/mês)** — deploy automático do push no GitHub, Postgres gerenciado embutido, zero configuração de servidor. Quando o uso amadurecer e quiser migrar tudo para Hostinger, fazemos a mudança em uma sessão. Mantém-se o domínio na Hostinger (DNS aponta para o Railway via CNAME).

**Arranjo final do DNS**:
- `tracengenharia.com.br` → site institucional na Hostinger (como hoje)
- `app.tracengenharia.com.br` → ferramenta de apreciação no Railway (CNAME no painel da Hostinger)

## 6. Riscos atualizados

---

## 5. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Perder dados locais dos engenheiros ao migrar | Alta | Alto | Botão "Importar dados locais" + backup de `localStorage` antes |
| PDF server-side ficar diferente do atual | Média | Médio | Manter `window.print()` como fallback até validar |
| Quebrar funcionalidade durante o refactor | Média | Alto | Branch separada + testes em cada fase, deploy só após validação |
| Custo de servidor escalar | Baixa | Baixo | Começar em VPS pequena, monitorar |
| Atrasar entrega visual por refactor | Média | Médio | Fase 1 (visual) **antes** da Fase 2 (refactor) — valor visível primeiro |
| Esquecer item de NR-12 no banco | Baixa | Médio | Importar banco atual do `index.html` integralmente como seed |
| Senhas comprometidas | Baixa | Alto | bcrypt 12 rounds + HTTPS obrigatório + rate limit no `/login` |

---

## 7. Próximos passos imediatos (o que fazemos depois que você aprovar este plano)

1. **Você confirma**: Caminho A (web) ou outro? Hex laranja oficial? Domínio?
2. **Eu executo a Fase 0**: limpeza do repo, `.gitignore`, README, branch `redesign-2026`.
3. **Eu executo a Fase 1**: redesign visual em laranja claro. Você revisa o resultado.
4. **Você aprova ou pede ajustes**, e seguimos para Fase 2.

A cada fase entrego algo testável e atualizo o GitHub.

---

*Última atualização: 18/05/2026*

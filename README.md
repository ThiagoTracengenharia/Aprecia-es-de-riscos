# Apreciações de Risco — Trace Engenharia

Ferramenta web para gerar apreciações de risco em conformidade com **NBR 12100** e **NR-12**, usando a metodologia **HRN (Hazard Rating Number)** + fluxo de desenvolvimento de projetos por setor (mecânico, hidráulico, pneumático, elétrico).

> Status: Fases 1 e 2 concluídas. Próxima fase: backend Node + Postgres. Veja [`docs/PLANO-MODERNIZACAO.md`](docs/PLANO-MODERNIZACAO.md).

## Funcionalidades atuais

- **Apreciações de risco** com matriz HRN (LO × FE × DPH × NP) e 4 graus de risco
- **Banco de exigências** e textos normativos editáveis
- **Roteamento por risco** para projetos de desenvolvimento — cada risco identificado pode ser atribuído a um setor (mec/hidr/pneu/elet) e a um projetista específico
- **Projetos de desenvolvimento** com timeline de 7 fases por setor, edição inline de status/progresso/prazo/responsável, upload de anexos (PDF final, planilhas), histórico de ações
- **Cadastro de equipe** (engenheiros + setores em que atuam)
- **Exportação** de apreciação via `window.print()` (CSS de impressão)
- **Login** com credencial fixa (provisório até backend)

## Stack

- **Front-end**: HTML5 + JavaScript vanilla (sem framework). CSS com variáveis para tema.
- **Persistência atual**: `localStorage` + `IndexedDB` (para imagens e anexos). Centralizada em `assets/js/storage.js` — quando o backend chegar, basta trocar este arquivo por chamadas `fetch('/api/...')`.
- **Back-end** (em construção, Fase 3): Node.js + Express + PostgreSQL.
- **Hospedagem prevista**:
  - Front-end e API em [Railway](https://railway.app) (plano Hobby).
  - DNS apontando `app.tracengenharia.com.br` para o Railway (CNAME no painel Hostinger).
  - Domínio principal `tracengenharia.com.br` permanece como o site institucional na Hostinger.

## Estrutura do projeto

```
.
├── index.html                  ← shell HTML + JS inline (views, render, modais)
├── assets/
│   ├── img/                    ← logo, avatar, favicon
│   ├── css/
│   │   └── app.css             ← paleta, layout, componentes, tela de login
│   └── js/
│       ├── config.js           ← constantes (TRACE_LOGO, STEPS, chaves de storage)
│       ├── storage.js          ← localStorage + IndexedDB (centralizado)
│       ├── risk.js             ← cálculo HRN e classificação de graus
│       ├── auth.js             ← login, sessão, chip de usuário no header
│       ├── dev-projects.js     ← setores, fases, engenheiros, helpers de roteamento
│       └── assessment-mgmt.js  ← CRUD de apreciações, modal de roteamento, bind
├── docs/
│   ├── PLANO-MODERNIZACAO.md   ← roadmap completo e arquitetura
│   └── mockups/                ← referências visuais aprovadas
├── legacy/                     ← arquivos do build Electron antigo (descontinuado)
├── server/                     ← (futuro — Fase 3)
├── CHANGELOG.md
├── README.md
└── .gitignore
```

## Como rodar localmente

A versão atual é estática (HTML + JS + CSS). Abrir direto no navegador funciona, mas algumas funcionalidades (como `IndexedDB`) podem dar problema com `file://`. Recomendado servir via HTTP:

```bash
# qualquer servidor estático funciona
npx http-server . -p 8000
# ou
python3 -m http.server 8000
```

Depois acesse <http://localhost:8000>.

### Credenciais de acesso (provisório até backend Fase 3)

```
E-mail: thiago@tracengenharia.com.br
Senha:  36714662
```

Para adicionar mais usuários, edite o array `ALLOWED_USERS` em [`assets/js/auth.js`](assets/js/auth.js).

## Fluxo principal

1. **Criar projeto** → home → "+ Novo Projeto"
2. **Criar apreciação** dentro do projeto → percorre 4 passos (Documento & Equipamento → Análise por IA → Revisão de Riscos → Exportar)
3. **Adicionar riscos** com `LO`, `FE`, `DPH`, `NP` → HRN calculado automaticamente
4. **Inserir exigências** via biblioteca (NR-12, NBR 12100) por risco
5. **Concluir apreciação** → abre o **modal de roteamento**:
   - Para cada risco identificado, escolher setor (mec/hidr/pneu/elet) e projetista
   - Riscos com mesma combinação `(setor + responsável + prazo)` viram **um projeto de desenvolvimento**
6. **Acompanhar projetos** nas abas laterais por setor → avançar fases, anexar PDFs finais

## Identidade visual

- Cor primária: `#FA9600` (laranja Trace, extraído do manual de marca)
- Logo: `assets/img/trace-logo.png` (versão fundo transparente)
- Avatar: `assets/img/trace-avatar.png` (símbolo do arco, usado como favicon)
- Tipografia: IBM Plex Sans + IBM Plex Mono (Google Fonts)

## Roadmap resumido

| Fase | Tema | Status |
|---|---|---|
| 0 | Higiene do repositório, assets de marca | ✅ |
| 1 | Repaginação visual em laranja claro | ✅ |
| 2 | Refactor estrutural (modularização) | ✅ |
| 2.5 | Banco de Dados redesign + Dev Projects + bug fixes | ✅ |
| 3 | Backend Node + Postgres | próximo |
| 4 | Front migra para API | pendente |
| 5 | PDF server-side (Puppeteer) | pendente |
| 6 | Integração com o site institucional | pendente |
| 7 | Deploy contínuo (GitHub Actions) | pendente |
| 8 | Recursos novos (aprovação, revisões, PWA offline) | futuro |

Detalhes em [`docs/PLANO-MODERNIZACAO.md`](docs/PLANO-MODERNIZACAO.md).

## Licença

Proprietary — © Trace Engenharia. Todos os direitos reservados.

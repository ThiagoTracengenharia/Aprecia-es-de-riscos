# Checklist de upload — GitHub

Tudo pronto para subir em <https://github.com/ThiagoTracengenharia/Aprecia-es-de-riscos>. Como combinado, vamos pela **interface web do GitHub** (não via git CLI).

## Mensagem de commit sugerida

```
Fases 1 + 2 + Dev Projects + bug fixes — pronto para Fase 3 (backend)
```

Se preferir mais detalhada:

```
Modernização 2026: visual laranja Trace, refactor modular (6 JS files),
Banco de Dados redesign, login fixo, Desenvolvimento de Projetos
(mec/hidr/pneu/elet) com roteamento por risco e anexos de PDF.
Próximo: Fase 3 — backend Node + Postgres.
```

## Arquivos para subir

### Raiz (4 arquivos)
- `index.html` (200 KB)
- `README.md`
- `CHANGELOG.md`
- `.gitignore`

### Pasta `assets/`
**`assets/css/`** (1 arquivo)
- `app.css`

**`assets/img/`** (3 arquivos)
- `trace-logo.png`
- `trace-logo-white.png`
- `trace-avatar.png`

**`assets/js/`** (6 arquivos)
- `config.js` *(4.5 MB — METHODOLOGY_PAGES grande, normal)*
- `storage.js`
- `risk.js`
- `auth.js`
- `dev-projects.js`
- `assessment-mgmt.js`

### Pasta `docs/`
- `docs/PLANO-MODERNIZACAO.md`
- `docs/mockups/desktop-reference.png`
- `docs/mockups/aplicativo-reference.png`

### Pasta `legacy/`
- `legacy/README.md`

## Arquivos que NÃO devem subir

- `diagnostico.html` — só pra teste local
- `DESIGNER SUGERIDO - APLICATIVO E DESKTOP/` — pasta original do designer (mockups já estão em `docs/mockups/`)
- `UPLOAD-CHECKLIST.md` — este arquivo
- Versão antiga em `legacy/` se ainda houver `apreciacao-riscos_53.html` solto na raiz

Tudo isso está listado no `.gitignore`, então mesmo se você arrastar a pasta inteira no upload, o GitHub vai ignorar.

## Passo a passo no GitHub web

1. Abrir <https://github.com/ThiagoTracengenharia/Aprecia-es-de-riscos>
2. Botão **Add file → Upload files**
3. Arrastar **a pasta inteira** `APRECIACOES DE RISCOS - FERRAMENTA` para a área de upload (ou só os arquivos listados acima)
4. Aguardar o upload terminar (o `config.js` de 4.5 MB pode demorar um pouco no upload — é normal)
5. Em **"Commit changes"**: colar a mensagem sugerida no início deste arquivo
6. Manter selecionado: **"Commit directly to the main branch"**
7. Clicar em **"Commit changes"**

## Verificação após upload

Depois do commit, abra o repo e confirme que existe:
- `index.html` na raiz (200 KB)
- `assets/css/app.css`
- `assets/js/` com 6 arquivos JS
- `docs/PLANO-MODERNIZACAO.md`
- `legacy/README.md`

## Bonus — ativar GitHub Pages (opcional)

Se quiser que o app fique acessível online direto pelo GitHub:

1. No repo: **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **/ (root)**
4. Salvar

Em ~1 minuto, o app estará em <https://thiagotracengenharia.github.io/Aprecia-es-de-riscos/>. Quando a Fase 3 (backend) chegar, podemos mover para `app.tracengenharia.com.br` no Railway.

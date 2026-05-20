# Legacy — versão Electron desktop

Esta pasta preserva os artefatos da versão antiga da ferramenta (Electron / Windows `.exe`), que está sendo descontinuada em favor da versão web.

## Arquivos que pertencem aqui (recuperar do GitHub se necessário)

Os arquivos abaixo estavam no repositório [ThiagoTracengenharia/Aprecia-es-de-riscos](https://github.com/ThiagoTracengenharia/Aprecia-es-de-riscos) antes desta reformulação:

- `main.js` — processo principal do Electron
- `preload.js` — bridge Node ↔ HTML
- `package.json` — config de build (`electron-builder`)
- `setup.ps1` — script PowerShell de setup
- `LEIA-ME-BUILD.md` — guia para gerar o `.exe`
- `apreciacao-riscos_53.html` — versão anterior do front-end (substituída pelo `index.html` atual)

## Como recuperar

Para reaver qualquer um desses arquivos a partir do histórico do Git:

```bash
git checkout <hash-do-último-commit-electron> -- main.js preload.js package.json setup.ps1 LEIA-ME-BUILD.md apreciacao-riscos_53.html
```

## Estrutura de dados do Electron (referência histórica)

O app Electron salvava em `%APPDATA%\Trace Riscos\`:

```
Local Storage\     ← projetos, apreciações, banco de dados
images\            ← fotos dos equipamentos
backups\           ← backups automáticos (a cada 15 min e ao fechar)
exports\           ← PDFs e JSONs exportados
```

Na versão web, esses dados passam a viver no servidor (Postgres + storage S3-compatible). Veja `docs/PLANO-MODERNIZACAO.md` seção 3, Fase 3.

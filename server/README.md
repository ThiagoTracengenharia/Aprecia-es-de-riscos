# Trace Riscos — Backend

Servidor Node.js + Express + SQLite (better-sqlite3) que serve o frontend e expõe a API REST.

## Por que SQLite

Para começar, SQLite é zero-config: um único arquivo (`storage/data.sqlite`) e dá pra rodar localmente sem instalar Postgres ou Docker. Todo o SQL é escrito em sintaxe ANSI-friendly, então migrar para Postgres na produção é trivial.

## Pré-requisitos

- **Node.js 18+** ([baixar aqui](https://nodejs.org/))
- npm (vem com o Node)

## Setup (primeira vez)

```bash
cd server
npm install           # instala dependências (~1 min)
cp .env.example .env  # copia config local
npm run db:migrate    # cria as tabelas
npm run db:seed       # cria o usuário admin (Thiago)
npm start             # inicia o servidor
```

O servidor sobe em `http://localhost:3000` e serve **tanto a API** (`/api/*`) **quanto o frontend** (raiz e `assets/*`).

## Comandos

| Comando | Descrição |
|---|---|
| `npm start` | Inicia o servidor (produção) |
| `npm run dev` | Inicia com `--watch` (reinicia ao salvar) |
| `npm run db:migrate` | Aplica as migrations SQL em ordem |
| `npm run db:seed` | Cria usuário admin (idempotente) |
| `npm run db:reset` | Apaga o banco e recria do zero (⚠️ perde dados) |

## Estrutura

```
server/
├── src/
│   ├── index.js              ← bootstrap Express
│   ├── config.js             ← carrega .env
│   ├── db.js                 ← conexão SQLite
│   ├── middleware/
│   │   └── auth.js           ← JWT verify + signToken + requireAdmin
│   ├── routes/
│   │   ├── auth.js           ← /api/auth/login + /me + /logout  (COMPLETO)
│   │   ├── projetos.js       ← stub
│   │   ├── apreciacoes.js    ← stub
│   │   ├── dev-projects.js   ← stub
│   │   ├── engineers.js      ← stub
│   │   ├── banco.js          ← stub
│   │   └── uploads.js        ← stub
│   └── db/
│       ├── migrate.js
│       ├── seed.js
│       ├── reset.js
│       └── migrations/
│           └── 001_initial.sql
├── storage/                  ← gitignored
│   ├── data.sqlite           ← banco
│   └── uploads/              ← anexos
├── .env.example
├── package.json
└── README.md
```

## Endpoints disponíveis (nesta sessão)

### `POST /api/auth/login`
Login com e-mail/senha. Retorna JWT + dados do usuário.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"thiago@tracengenharia.com.br","password":"36714662"}'
```

Resposta:
```json
{
  "token": "eyJhbGciOi...",
  "user": { "id":"u_thiago","email":"thiago@tracengenharia.com.br","name":"Thiago Marinho","role":"admin" }
}
```

### `GET /api/auth/me`
Retorna o usuário logado (precisa do header `Authorization: Bearer <token>`).

### `POST /api/auth/logout`
Registra logout na auditoria. O token continua válido até expirar (revogação real fica para fase futura).

### `GET /api/health`
Sem autenticação. Retorna status do servidor e do banco.

### Stubs (501 Not Implemented)

- `/api/projetos`
- `/api/apreciacoes`
- `/api/dev-projects`
- `/api/engineers`
- `/api/banco`
- `/api/uploads`

Esses retornam `501` por enquanto. Próxima sessão implementa a lógica.

## Variáveis de ambiente (`.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta HTTP |
| `DB_PATH` | `./storage/data.sqlite` | Caminho do arquivo SQLite |
| `JWT_SECRET` | (troque!) | Segredo do JWT — em produção, gerar com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `86400` | Validade do token em segundos (24h) |
| `CORS_ORIGIN` | `*` | Origens permitidas |
| `UPLOAD_DIR` | `./storage/uploads` | Pasta dos anexos |
| `UPLOAD_MAX_MB` | `20` | Tamanho máximo de upload |

## Migração futura para PostgreSQL

Quando for hora de migrar para Postgres (Railway, Supabase, etc.):

1. Trocar `better-sqlite3` por `pg` (driver) no `package.json`.
2. Adaptar `src/db.js` para pool de conexões.
3. Migrations SQL provavelmente rodam direto — sintaxe já é ANSI.
4. Cuidar de tipos: `INTEGER` boolean → `BOOLEAN` no Postgres; `TEXT` JSON → `JSONB`.
5. Variável `DB_PATH` vira `DATABASE_URL` (`postgres://user:pass@host/db`).

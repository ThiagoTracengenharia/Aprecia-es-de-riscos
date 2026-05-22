-- ============================================================
-- 001 INITIAL — Trace Riscos · schema base
-- SQLite (sintaxe ANSI-friendly para migração futura ao Postgres)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,             -- u_<uuid> ou u_<email>
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,                -- bcrypt
  name          TEXT NOT NULL,
  crea          TEXT,
  cargo         TEXT,
  role          TEXT NOT NULL DEFAULT 'user', -- admin | user
  active        INTEGER NOT NULL DEFAULT 1,   -- 0=false, 1=true
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS engineers (
  id          TEXT PRIMARY KEY,                -- eng_<id>
  user_id     TEXT,                            -- nullable (engenheiro que ainda não tem login)
  name        TEXT NOT NULL,
  email       TEXT,
  cargo       TEXT,
  setores     TEXT NOT NULL DEFAULT '[]',      -- JSON array: ["mecanico","eletrico",...]
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS clientes (
  id            TEXT PRIMARY KEY,              -- cli_<id>
  razao_social  TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj          TEXT,
  contato_nome  TEXT,
  contato_email TEXT,
  contato_fone  TEXT,
  endereco      TEXT,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projetos (
  id          TEXT PRIMARY KEY,                -- proj_<id>
  tag         TEXT NOT NULL UNIQUE,            -- PJT-001, PJT-002
  cliente_id  TEXT,
  cliente_nome TEXT,                           -- snapshot ao criar
  name        TEXT NOT NULL,
  descricao   TEXT,
  status      TEXT NOT NULL DEFAULT 'ativo',   -- ativo | concluido | arquivado
  created_by  TEXT NOT NULL,                   -- user_id
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_projetos_status ON projetos(status);
CREATE INDEX IF NOT EXISTS idx_projetos_cliente ON projetos(cliente_id);

CREATE TABLE IF NOT EXISTS equipamentos (
  id            TEXT PRIMARY KEY,              -- eq_<id>
  projeto_id    TEXT NOT NULL,
  tipo          TEXT,
  patrimonio    TEXT,
  modelo        TEXT,
  serie         TEXT,
  fabricante    TEXT,
  ano           TEXT,
  voltagem      TEXT,
  fases         TEXT,
  peso          TEXT,
  local         TEXT,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_equip_projeto ON equipamentos(projeto_id);

CREATE TABLE IF NOT EXISTS apreciacoes (
  id              TEXT PRIMARY KEY,             -- ap_<id>
  projeto_id      TEXT,
  equipamento_id  TEXT,
  numero          TEXT NOT NULL,                -- HRN-000-R0 ou PJT-001-HRN-000
  revisao         TEXT NOT NULL DEFAULT '0',
  titulo          TEXT,
  cliente         TEXT,                         -- snapshot
  elaborado_por   TEXT,                         -- snapshot
  data_emissao    TEXT,
  status          TEXT NOT NULL DEFAULT 'rascunho', -- rascunho | concluido | arquivado
  total_riscos    INTEGER NOT NULL DEFAULT 0,
  riscos_baixo    INTEGER NOT NULL DEFAULT 0,
  riscos_medio    INTEGER NOT NULL DEFAULT 0,
  riscos_alto     INTEGER NOT NULL DEFAULT 0,
  riscos_muito    INTEGER NOT NULL DEFAULT 0,
  state_json      TEXT,                         -- estado completo serializado (compat com S)
  created_by      TEXT,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
  FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_aps_projeto ON apreciacoes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_aps_status ON apreciacoes(status);

CREATE TABLE IF NOT EXISTS riscos (
  id              TEXT PRIMARY KEY,             -- risco_<id>
  apreciacao_id   TEXT NOT NULL,
  num             INTEGER NOT NULL,
  identificacao   TEXT,
  localizacao     TEXT,
  risco_alvo      TEXT,
  situacao_atual  TEXT,
  -- HRN inicial
  lo              REAL,
  fe              REAL,
  dph             REAL,
  np              REAL,
  hrn             REAL,
  grau            TEXT,
  -- HRN pós-adequação
  lo_p            REAL,
  fe_p            REAL,
  dph_p           REAL,
  np_p            REAL,
  hrn_p           REAL,
  grau_p          TEXT,
  melhorias       TEXT,
  referencias     TEXT,
  exigencias_json TEXT,                         -- chaves selecionadas do banco
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apreciacao_id) REFERENCES apreciacoes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_riscos_ap ON riscos(apreciacao_id);

-- Banco de exigências (replicado das constantes do front; permite customização por usuário/empresa)
CREATE TABLE IF NOT EXISTS banco_exigencias (
  id          TEXT PRIMARY KEY,                  -- componente_code (ex: ELET_Q11)
  sheet       TEXT,                              -- "Quadro Elétrico"
  name        TEXT NOT NULL,                     -- "Botão de emergência"
  entries     TEXT NOT NULL DEFAULT '[]',        -- JSON array de exigências
  active      INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banco_textos (
  id          TEXT PRIMARY KEY,                  -- categoria_nome
  categoria   TEXT NOT NULL,
  items       TEXT NOT NULL DEFAULT '[]',        -- JSON array de textos
  active      INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Projetos de desenvolvimento (gerados após apreciação concluída)
CREATE TABLE IF NOT EXISTS dev_projects (
  id                  TEXT PRIMARY KEY,          -- dev_<id>
  apreciacao_id       TEXT,
  apreciacao_numero   TEXT,
  apreciacao_data     TEXT,
  categoria           TEXT NOT NULL,             -- mecanico | hidraulico | pneumatico | eletrico
  tag                 TEXT NOT NULL,             -- PJT-MEC-00012
  nome                TEXT NOT NULL,
  cliente             TEXT,
  fase_key            TEXT NOT NULL,             -- levantamento, planejamento, etc.
  fase                TEXT NOT NULL,             -- label
  progresso           INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'aguardando',
  prazo               TEXT,
  responsavel_id      TEXT,
  nao_conformidades   INTEGER NOT NULL DEFAULT 0,
  riscos_criticos     INTEGER NOT NULL DEFAULT 0,
  riscos_atribuidos   TEXT NOT NULL DEFAULT '[]', -- JSON array com os riscos específicos
  historico           TEXT NOT NULL DEFAULT '[]',
  created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apreciacao_id) REFERENCES apreciacoes(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES engineers(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_dev_categoria ON dev_projects(categoria);
CREATE INDEX IF NOT EXISTS idx_dev_status ON dev_projects(status);
CREATE INDEX IF NOT EXISTS idx_dev_apreciacao ON dev_projects(apreciacao_id);

-- Anexos (PDF final, planilhas, desenhos) — bytes ficam em disco, metadados aqui
CREATE TABLE IF NOT EXISTS dev_attachments (
  id              TEXT PRIMARY KEY,              -- att_<id>
  dev_project_id  TEXT NOT NULL,
  filename        TEXT NOT NULL,                 -- nome original
  filepath        TEXT NOT NULL,                 -- caminho no disco (storage/uploads/...)
  mime_type       TEXT,
  size_bytes      INTEGER,
  uploaded_by     TEXT,
  uploaded_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dev_project_id) REFERENCES dev_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_att_dev ON dev_attachments(dev_project_id);

-- Auditoria simples
CREATE TABLE IF NOT EXISTS auditoria (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT,
  acao        TEXT NOT NULL,                     -- create | update | delete | login | logout
  entidade    TEXT NOT NULL,                     -- projeto | apreciacao | dev_project | etc
  entidade_id TEXT,
  detalhe     TEXT,                              -- JSON com diff ou descrição
  ts          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON auditoria(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON auditoria(ts);

-- Tabela de versão do schema (para migrations incrementais)
CREATE TABLE IF NOT EXISTS schema_version (
  version     INTEGER PRIMARY KEY,
  applied_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO schema_version (version) VALUES (1);

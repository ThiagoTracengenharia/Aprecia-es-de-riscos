'use strict';
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const cfg = require('./config');
const db = require('./db');

const app = express();

// Middlewares
app.use(cors({ origin: cfg.corsOrigin === '*' ? true : cfg.corsOrigin.split(','), credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Garante diretório de uploads
fs.mkdirSync(cfg.uploadDir, { recursive: true });

// Health check
app.get('/api/health', (req, res) => {
  let dbStatus = 'down';
  try {
    db.prepare('SELECT 1').get();
    dbStatus = 'ok';
  } catch(e){}
  res.json({
    status: 'ok',
    service: 'trace-riscos-server',
    version: require('../package.json').version,
    timestamp: new Date().toISOString(),
    db: dbStatus
  });
});

// Rotas
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/projetos',     require('./routes/projetos'));
app.use('/api/apreciacoes',  require('./routes/apreciacoes'));
app.use('/api/dev-projects', require('./routes/dev-projects'));
app.use('/api/engineers',    require('./routes/engineers'));
app.use('/api/uploads',      require('./routes/uploads'));
app.use('/api/banco',        require('./routes/banco'));

// Frontend estático (serve a pasta raiz do projeto: index.html, assets/, etc.)
// Usa cfg.frontendDir (vem de FRONTEND_DIR no .env, ou ../.. por default).
const frontRoot = cfg.frontendDir;
console.log('[front] servindo de:', frontRoot);
app.use(express.static(frontRoot, {
  index: 'index.html',
  setHeaders: (res, p) => {
    if(p.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// 404 para /api/*
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERR]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.code || 'internal_error',
    message: err.message || 'Erro interno do servidor'
  });
});

app.listen(cfg.port, () => {
  console.log('═══════════════════════════════════════════════');
  console.log('  Trace Riscos · backend');
  console.log('  http://localhost:' + cfg.port);
  console.log('  Frontend servido em /');
  console.log('  API em /api/*');
  console.log('  Banco: ' + cfg.dbPath);
  console.log('═══════════════════════════════════════════════');
});

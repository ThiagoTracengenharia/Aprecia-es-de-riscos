'use strict';
require('dotenv').config();
const path = require('path');

const cfg = {
  port:           parseInt(process.env.PORT || '3000', 10),
  dbPath:         process.env.DB_PATH         || './storage/data.sqlite',
  jwtSecret:      process.env.JWT_SECRET      || 'troque-este-segredo',
  jwtExpiresIn:   parseInt(process.env.JWT_EXPIRES_IN || '86400', 10),
  corsOrigin:     process.env.CORS_ORIGIN     || '*',
  uploadDir:      process.env.UPLOAD_DIR      || './storage/uploads',
  uploadMaxBytes: (parseInt(process.env.UPLOAD_MAX_MB || '20', 10)) * 1024 * 1024,
  // Caminho do front-end (index.html + assets). Default = ../.. (raiz do projeto).
  // Permite rodar o server em outra pasta (ex.: C:\trace-server) mas servir o
  // front que está no OneDrive.
  frontendDir:    process.env.FRONTEND_DIR    || ''
};
// Resolve paths relativos a server/
const root = path.resolve(__dirname, '..');
cfg.dbPath    = path.resolve(root, cfg.dbPath);
cfg.uploadDir = path.resolve(root, cfg.uploadDir);
cfg.frontendDir = cfg.frontendDir
  ? path.resolve(cfg.frontendDir)
  : path.resolve(root, '..');

module.exports = cfg;

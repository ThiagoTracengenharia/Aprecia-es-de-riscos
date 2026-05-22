'use strict';
const fs = require('fs');
const cfg = require('../config');

console.log('=== Trace Riscos — reset ===');
if(fs.existsSync(cfg.dbPath)){
  fs.unlinkSync(cfg.dbPath);
  console.log('  banco removido:', cfg.dbPath);
}
const walPath = cfg.dbPath + '-wal';
const shmPath = cfg.dbPath + '-shm';
if(fs.existsSync(walPath)) fs.unlinkSync(walPath);
if(fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

require('./migrate');

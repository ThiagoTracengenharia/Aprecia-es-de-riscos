'use strict';
/* Executa as migrations .sql em src/db/migrations/ na ordem do nome. */
const fs = require('fs');
const path = require('path');
const db = require('../db');

const dir = path.join(__dirname, 'migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

if(files.length === 0){
  console.log('Nenhuma migration encontrada em', dir);
  process.exit(0);
}

console.log('=== Trace Riscos — migrate ===');
for(const f of files){
  const sql = fs.readFileSync(path.join(dir, f), 'utf8');
  console.log('→ aplicando', f);
  try {
    db.exec(sql);
    console.log('  OK');
  } catch(err) {
    console.error('  FALHOU:', err.message);
    process.exit(1);
  }
}

const v = db.prepare('SELECT MAX(version) AS v FROM schema_version').get();
console.log('\nSchema na versão:', v.v);
const cfg = require('../config');
console.log('Banco em:', cfg.dbPath);
process.exit(0);

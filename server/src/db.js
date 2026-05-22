'use strict';
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const cfg = require('./config');

// Garante que a pasta storage/ existe
fs.mkdirSync(path.dirname(cfg.dbPath), { recursive: true });

const db = new DatabaseSync(cfg.dbPath);

/* node:sqlite usa exec() para PRAGMAs (no better-sqlite3 era db.pragma()).
 * Mantemos um shim mínimo para o código que ainda chama db.pragma(). */
db.pragma = function(directive){
  db.exec('PRAGMA ' + directive + ';');
};

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* node:sqlite não tem db.transaction(fn) — fazemos um shim que
 * embrulha em BEGIN/COMMIT/ROLLBACK. */
if(typeof db.transaction !== 'function'){
  db.transaction = function(fn){
    return function(...args){
      db.exec('BEGIN');
      try {
        const result = fn(...args);
        db.exec('COMMIT');
        return result;
      } catch(err){
        try { db.exec('ROLLBACK'); } catch(e){}
        throw err;
      }
    };
  };
}

module.exports = db;

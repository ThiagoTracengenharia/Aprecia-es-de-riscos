'use strict';
const crypto = require('crypto');

/* Gera um ID curto baseado em timestamp + bytes aleatórios.
 * Formato: <prefix>_<base36-timestamp><6-hex-random>
 */
function makeId(prefix){
  const t = Date.now().toString(36);
  const r = crypto.randomBytes(3).toString('hex');
  return (prefix ? prefix + '_' : '') + t + r;
}

/* Gera a próxima TAG sequencial baseada em uma tabela e padrão. */
function nextTag(db, table, prefix, width){
  width = width || 3;
  const rows = db.prepare("SELECT tag FROM " + table + " WHERE tag LIKE ? ORDER BY tag DESC LIMIT 1").all(prefix + '%');
  let next = 1;
  if(rows.length){
    const last = rows[0].tag;
    const m = last.match(/(\d+)$/);
    if(m) next = parseInt(m[1], 10) + 1;
  }
  return prefix + String(next).padStart(width, '0');
}

module.exports = { makeId, nextTag };

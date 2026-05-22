'use strict';
const db = require('../db');

/* Registra uma ação na tabela de auditoria. Falha silenciosamente. */
function audit(userId, acao, entidade, entidadeId, detalhe){
  try {
    const det = (detalhe == null) ? null
              : (typeof detalhe === 'string' ? detalhe : JSON.stringify(detalhe));
    db.prepare(
      'INSERT INTO auditoria (user_id, acao, entidade, entidade_id, detalhe) VALUES (?, ?, ?, ?, ?)'
    ).run(userId || null, acao, entidade, entidadeId || null, det);
  } catch(e){
    console.warn('[audit] falha:', e.message);
  }
}

module.exports = { audit };

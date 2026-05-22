'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { makeId } = require('../util/ids');
const { audit } = require('../util/audit');

const router = express.Router();
router.use(requireAuth);

function recalcTotals(apId){
  const riscos = db.prepare('SELECT grau FROM riscos WHERE apreciacao_id = ?').all(apId);
  const c = { baixo: 0, medio: 0, alto: 0, muito: 0 };
  for(const r of riscos){
    const g = String(r.grau || '').toLowerCase();
    if(g.includes('muito')) c.muito++;
    else if(g.includes('alto')) c.alto++;
    else if(g.includes('med')) c.medio++;
    else if(g) c.baixo++;
  }
  db.prepare(
    'UPDATE apreciacoes SET total_riscos = ?, riscos_baixo = ?, riscos_medio = ?, riscos_alto = ?, riscos_muito = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(riscos.length, c.baixo, c.medio, c.alto, c.muito, apId);
}

function replaceRiscos(apId, riscos){
  if(!Array.isArray(riscos)) return;
  const del = db.prepare('DELETE FROM riscos WHERE apreciacao_id = ?');
  const ins = db.prepare(
    'INSERT INTO riscos (id, apreciacao_id, num, identificacao, localizacao, risco_alvo, situacao_atual, lo, fe, dph, np, hrn, grau, lo_p, fe_p, dph_p, np_p, hrn_p, grau_p, melhorias, referencias, exigencias_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    del.run(apId);
    let n = 1;
    for(const r of riscos){
      ins.run(
        r.id || makeId('risco'), apId,
        r.num || n++,
        r.identificacao||null, r.localizacao||null, r.risco_alvo||null, r.situacao_atual||null,
        r.lo!=null?r.lo:null, r.fe!=null?r.fe:null, r.dph!=null?r.dph:null, r.np!=null?r.np:null, r.hrn!=null?r.hrn:null, r.grau||null,
        r.lo_p!=null?r.lo_p:null, r.fe_p!=null?r.fe_p:null, r.dph_p!=null?r.dph_p:null, r.np_p!=null?r.np_p:null, r.hrn_p!=null?r.hrn_p:null, r.grau_p||null,
        r.melhorias||null, r.referencias||null,
        r.exigencias_json ? (typeof r.exigencias_json === 'string' ? r.exigencias_json : JSON.stringify(r.exigencias_json)) : null
      );
    }
  });
  tx();
}

router.get('/', (req, res) => {
  const { projeto_id, status } = req.query;
  let sql = 'SELECT * FROM apreciacoes WHERE 1=1';
  const params = [];
  if(projeto_id){ sql += ' AND projeto_id = ?'; params.push(projeto_id); }
  if(status){ sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY datetime(updated_at) DESC';
  res.json({ apreciacoes: db.prepare(sql).all(...params) });
});

router.get('/:id', (req, res) => {
  const ap = db.prepare('SELECT * FROM apreciacoes WHERE id = ?').get(req.params.id);
  if(!ap) return res.status(404).json({ error: 'not_found' });
  const riscos = db.prepare('SELECT * FROM riscos WHERE apreciacao_id = ? ORDER BY num').all(ap.id);
  const riscosShape = riscos.map(r => {
    let ex = [];
    try { ex = r.exigencias_json ? JSON.parse(r.exigencias_json) : []; } catch(e){}
    return Object.assign({}, r, { exigencias: ex });
  });
  res.json(Object.assign({}, ap, { riscos: riscosShape }));
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if(!b.numero) return res.status(400).json({ error: 'missing_numero' });
  const id = makeId('ap');
  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO apreciacoes (id, projeto_id, equipamento_id, numero, revisao, titulo, cliente, elaborado_por, data_emissao, status, state_json, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id, b.projeto_id||null, b.equipamento_id||null,
      b.numero, b.revisao||'0', b.titulo||null,
      b.cliente||null, b.elaborado_por||null, b.data_emissao||null,
      b.status||'rascunho',
      b.state_json ? (typeof b.state_json === 'string' ? b.state_json : JSON.stringify(b.state_json)) : null,
      req.user.id
    );
    if(Array.isArray(b.riscos)) replaceRiscos(id, b.riscos);
    recalcTotals(id);
  });
  tx();
  audit(req.user.id, 'create', 'apreciacao', id, { numero: b.numero });
  res.status(201).json(db.prepare('SELECT * FROM apreciacoes WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const ap = db.prepare('SELECT * FROM apreciacoes WHERE id = ?').get(req.params.id);
  if(!ap) return res.status(404).json({ error: 'not_found' });
  const b = req.body || {};
  const sets = [], params = [];
  for(const f of ['projeto_id','equipamento_id','numero','revisao','titulo','cliente','elaborado_por','data_emissao','status']){
    if(f in b){ sets.push(f + ' = ?'); params.push(b[f]); }
  }
  if('state_json' in b){
    sets.push('state_json = ?');
    params.push(typeof b.state_json === 'string' ? b.state_json : JSON.stringify(b.state_json));
  }
  const tx = db.transaction(() => {
    if(sets.length){
      sets.push("updated_at = CURRENT_TIMESTAMP");
      params.push(ap.id);
      db.prepare('UPDATE apreciacoes SET ' + sets.join(', ') + ' WHERE id = ?').run(...params);
    }
    if(Array.isArray(b.riscos)) replaceRiscos(ap.id, b.riscos);
    recalcTotals(ap.id);
  });
  tx();
  audit(req.user.id, 'update', 'apreciacao', ap.id, { keys: Object.keys(b) });
  res.json(db.prepare('SELECT * FROM apreciacoes WHERE id = ?').get(ap.id));
});

router.delete('/:id', (req, res) => {
  const ap = db.prepare('SELECT * FROM apreciacoes WHERE id = ?').get(req.params.id);
  if(!ap) return res.status(404).json({ error: 'not_found' });
  db.prepare('DELETE FROM apreciacoes WHERE id = ?').run(ap.id);
  audit(req.user.id, 'delete', 'apreciacao', ap.id, { numero: ap.numero });
  res.json({ ok: true });
});

/* Sub-recurso: riscos */
router.post('/:id/riscos', (req, res) => {
  const ap = db.prepare('SELECT id FROM apreciacoes WHERE id = ?').get(req.params.id);
  if(!ap) return res.status(404).json({ error: 'apreciacao_not_found' });
  const r = req.body || {};
  const id = makeId('risco');
  const last = db.prepare('SELECT MAX(num) AS m FROM riscos WHERE apreciacao_id = ?').get(ap.id);
  const num = r.num || ((last && last.m) ? last.m + 1 : 1);
  db.prepare(
    'INSERT INTO riscos (id, apreciacao_id, num, identificacao, localizacao, risco_alvo, situacao_atual, lo, fe, dph, np, hrn, grau, lo_p, fe_p, dph_p, np_p, hrn_p, grau_p, melhorias, referencias, exigencias_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id, ap.id, num,
    r.identificacao||null, r.localizacao||null, r.risco_alvo||null, r.situacao_atual||null,
    r.lo!=null?r.lo:null, r.fe!=null?r.fe:null, r.dph!=null?r.dph:null, r.np!=null?r.np:null, r.hrn!=null?r.hrn:null, r.grau||null,
    r.lo_p!=null?r.lo_p:null, r.fe_p!=null?r.fe_p:null, r.dph_p!=null?r.dph_p:null, r.np_p!=null?r.np_p:null, r.hrn_p!=null?r.hrn_p:null, r.grau_p||null,
    r.melhorias||null, r.referencias||null,
    r.exigencias_json ? (typeof r.exigencias_json === 'string' ? r.exigencias_json : JSON.stringify(r.exigencias_json)) : null
  );
  recalcTotals(ap.id);
  audit(req.user.id, 'create', 'risco', id, { ap: ap.id });
  res.status(201).json(db.prepare('SELECT * FROM riscos WHERE id = ?').get(id));
});

router.put('/:id/riscos/:rid', (req, res) => {
  const r = db.prepare('SELECT * FROM riscos WHERE id = ? AND apreciacao_id = ?').get(req.params.rid, req.params.id);
  if(!r) return res.status(404).json({ error: 'not_found' });
  const b = req.body || {};
  const sets = [], params = [];
  for(const f of ['num','identificacao','localizacao','risco_alvo','situacao_atual','lo','fe','dph','np','hrn','grau','lo_p','fe_p','dph_p','np_p','hrn_p','grau_p','melhorias','referencias']){
    if(f in b){ sets.push(f + ' = ?'); params.push(b[f]); }
  }
  if('exigencias_json' in b){
    sets.push('exigencias_json = ?');
    params.push(typeof b.exigencias_json === 'string' ? b.exigencias_json : JSON.stringify(b.exigencias_json));
  }
  if(!sets.length) return res.status(400).json({ error: 'no_fields' });
  params.push(r.id);
  db.prepare('UPDATE riscos SET ' + sets.join(', ') + ' WHERE id = ?').run(...params);
  recalcTotals(r.apreciacao_id);
  audit(req.user.id, 'update', 'risco', r.id);
  res.json(db.prepare('SELECT * FROM riscos WHERE id = ?').get(r.id));
});

router.delete('/:id/riscos/:rid', (req, res) => {
  const r = db.prepare('SELECT * FROM riscos WHERE id = ? AND apreciacao_id = ?').get(req.params.rid, req.params.id);
  if(!r) return res.status(404).json({ error: 'not_found' });
  db.prepare('DELETE FROM riscos WHERE id = ?').run(r.id);
  recalcTotals(r.apreciacao_id);
  audit(req.user.id, 'delete', 'risco', r.id);
  res.json({ ok: true });
});

module.exports = router;

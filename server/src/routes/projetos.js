'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { makeId, nextTag } = require('../util/ids');
const { audit } = require('../util/audit');

const router = express.Router();
router.use(requireAuth);

/* GET /api/projetos */
router.get('/', (req, res) => {
  const { status, q } = req.query;
  let sql = 'SELECT * FROM projetos WHERE 1=1';
  const params = [];
  if(status){ sql += ' AND status = ?'; params.push(String(status)); }
  if(q){
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(tag) LIKE ? OR LOWER(cliente_nome) LIKE ?)';
    const like = '%' + String(q).toLowerCase() + '%';
    params.push(like, like, like);
  }
  sql += ' ORDER BY datetime(created_at) DESC';
  res.json({ projetos: db.prepare(sql).all(...params) });
});

router.get('/:id', (req, res) => {
  const proj = db.prepare('SELECT * FROM projetos WHERE id = ?').get(req.params.id);
  if(!proj) return res.status(404).json({ error: 'not_found' });
  const equipamentos = db.prepare('SELECT * FROM equipamentos WHERE projeto_id = ?').all(proj.id);
  const apreciacoes = db.prepare(
    'SELECT id, numero, revisao, titulo, status, total_riscos, data_emissao, updated_at FROM apreciacoes WHERE projeto_id = ? ORDER BY datetime(updated_at) DESC'
  ).all(proj.id);
  res.json(Object.assign({}, proj, { equipamentos, apreciacoes }));
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if(!b.name || !String(b.name).trim()){
    return res.status(400).json({ error: 'missing_name' });
  }
  const id = makeId('proj');
  const tag = b.tag || nextTag(db, 'projetos', 'PJT-', 3);
  const insertProj = db.prepare(
    'INSERT INTO projetos (id, tag, cliente_id, cliente_nome, name, descricao, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertEq = db.prepare(
    'INSERT INTO equipamentos (id, projeto_id, tipo, patrimonio, modelo, serie, fabricante, ano, voltagem, fases, peso, local) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    insertProj.run(id, tag, b.cliente_id||null, b.cliente_nome||null, String(b.name).trim(), b.descricao||null, b.status||'ativo', req.user.id);
    if(Array.isArray(b.equipamentos)){
      for(const eq of b.equipamentos){
        insertEq.run(makeId('eq'), id, eq.tipo||null, eq.patrimonio||null, eq.modelo||null, eq.serie||null, eq.fabricante||null, eq.ano||null, eq.voltagem||null, eq.fases||null, eq.peso||null, eq.local||null);
      }
    }
  });
  try {
    tx();
    audit(req.user.id, 'create', 'projeto', id, { tag, name: b.name });
    res.status(201).json(db.prepare('SELECT * FROM projetos WHERE id = ?').get(id));
  } catch(err){
    if(String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'duplicate_tag' });
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const proj = db.prepare('SELECT * FROM projetos WHERE id = ?').get(req.params.id);
  if(!proj) return res.status(404).json({ error: 'not_found' });
  const b = req.body || {};
  const sets = [], params = [];
  for(const f of ['name','descricao','cliente_id','cliente_nome','status']){
    if(f in b){ sets.push(f + ' = ?'); params.push(b[f]); }
  }
  if(!sets.length) return res.status(400).json({ error: 'no_fields' });
  sets.push("updated_at = CURRENT_TIMESTAMP");
  params.push(proj.id);
  db.prepare('UPDATE projetos SET ' + sets.join(', ') + ' WHERE id = ?').run(...params);
  audit(req.user.id, 'update', 'projeto', proj.id, b);
  res.json(db.prepare('SELECT * FROM projetos WHERE id = ?').get(proj.id));
});

router.delete('/:id', (req, res) => {
  const proj = db.prepare('SELECT * FROM projetos WHERE id = ?').get(req.params.id);
  if(!proj) return res.status(404).json({ error: 'not_found' });
  db.prepare('DELETE FROM projetos WHERE id = ?').run(proj.id);
  audit(req.user.id, 'delete', 'projeto', proj.id, { tag: proj.tag, name: proj.name });
  res.json({ ok: true });
});

/* Sub-recurso: equipamentos */
router.post('/:id/equipamentos', (req, res) => {
  const proj = db.prepare('SELECT id FROM projetos WHERE id = ?').get(req.params.id);
  if(!proj) return res.status(404).json({ error: 'projeto_not_found' });
  const b = req.body || {};
  const id = makeId('eq');
  db.prepare(
    'INSERT INTO equipamentos (id, projeto_id, tipo, patrimonio, modelo, serie, fabricante, ano, voltagem, fases, peso, local) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, proj.id, b.tipo||null, b.patrimonio||null, b.modelo||null, b.serie||null, b.fabricante||null, b.ano||null, b.voltagem||null, b.fases||null, b.peso||null, b.local||null);
  audit(req.user.id, 'create', 'equipamento', id, b);
  res.status(201).json(db.prepare('SELECT * FROM equipamentos WHERE id = ?').get(id));
});

router.delete('/:id/equipamentos/:eqId', (req, res) => {
  const eq = db.prepare('SELECT * FROM equipamentos WHERE id = ? AND projeto_id = ?').get(req.params.eqId, req.params.id);
  if(!eq) return res.status(404).json({ error: 'not_found' });
  db.prepare('DELETE FROM equipamentos WHERE id = ?').run(eq.id);
  audit(req.user.id, 'delete', 'equipamento', eq.id);
  res.json({ ok: true });
});

module.exports = router;

'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { makeId } = require('../util/ids');
const { audit } = require('../util/audit');

const router = express.Router();
router.use(requireAuth);

function normalizeSetores(input){
  if(input == null) return '[]';
  if(Array.isArray(input)) return JSON.stringify(input);
  if(typeof input === 'string'){
    try {
      const p = JSON.parse(input);
      if(Array.isArray(p)) return JSON.stringify(p);
    } catch(e){}
    return JSON.stringify(input.split(',').map(s => s.trim()).filter(Boolean));
  }
  return '[]';
}

function shape(row){
  if(!row) return row;
  let setores = [];
  try { setores = JSON.parse(row.setores || '[]'); } catch(e){}
  return Object.assign({}, row, { setores });
}

router.get('/', (req, res) => {
  const { setor, active } = req.query;
  let rows = db.prepare('SELECT * FROM engineers ORDER BY name COLLATE NOCASE').all();
  if(active !== 'all'){ rows = rows.filter(r => r.active === 1); }
  if(setor){
    rows = rows.filter(r => {
      try { return JSON.parse(r.setores || '[]').includes(setor); }
      catch(e){ return false; }
    });
  }
  res.json({ engineers: rows.map(shape) });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM engineers WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: 'not_found' });
  res.json(shape(row));
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if(!b.name || !String(b.name).trim()) return res.status(400).json({ error: 'missing_name' });
  const id = makeId('eng');
  db.prepare(
    'INSERT INTO engineers (id, user_id, name, email, cargo, setores, active) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, b.user_id||null, String(b.name).trim(), b.email||null, b.cargo||null, normalizeSetores(b.setores), b.active===0?0:1);
  audit(req.user.id, 'create', 'engineer', id, { name: b.name });
  res.status(201).json(shape(db.prepare('SELECT * FROM engineers WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM engineers WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: 'not_found' });
  const b = req.body || {};
  const sets = [], params = [];
  for(const f of ['name','email','cargo','user_id']){
    if(f in b){ sets.push(f + ' = ?'); params.push(b[f]); }
  }
  if('setores' in b){ sets.push('setores = ?'); params.push(normalizeSetores(b.setores)); }
  if('active' in b){ sets.push('active = ?'); params.push(b.active ? 1 : 0); }
  if(!sets.length) return res.status(400).json({ error: 'no_fields' });
  sets.push("updated_at = CURRENT_TIMESTAMP");
  params.push(row.id);
  db.prepare('UPDATE engineers SET ' + sets.join(', ') + ' WHERE id = ?').run(...params);
  audit(req.user.id, 'update', 'engineer', row.id, b);
  res.json(shape(db.prepare('SELECT * FROM engineers WHERE id = ?').get(row.id)));
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM engineers WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: 'not_found' });
  db.prepare("UPDATE engineers SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
  audit(req.user.id, 'delete', 'engineer', row.id, { soft: true });
  res.json({ ok: true, soft: true });
});

module.exports = router;

'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { audit } = require('../util/audit');

const router = express.Router();
router.use(requireAuth);

function shapeExig(row){
  if(!row) return row;
  let entries = [];
  try { entries = JSON.parse(row.entries || '[]'); } catch(e){}
  return Object.assign({}, row, { entries });
}
function shapeTexto(row){
  if(!row) return row;
  let items = [];
  try { items = JSON.parse(row.items || '[]'); } catch(e){}
  return Object.assign({}, row, { items });
}

/* Exigências */
router.get('/exigencias', (req, res) => {
  const rows = db.prepare('SELECT * FROM banco_exigencias WHERE active = 1 ORDER BY sheet, name').all();
  res.json({ exigencias: rows.map(shapeExig) });
});

router.get('/exigencias/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM banco_exigencias WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: 'not_found' });
  res.json(shapeExig(row));
});

router.put('/exigencias/:id', requireAdmin, (req, res) => {
  const b = req.body || {};
  const id = req.params.id;
  const existing = db.prepare('SELECT id FROM banco_exigencias WHERE id = ?').get(id);
  const entriesJson = typeof b.entries === 'string' ? b.entries : JSON.stringify(b.entries || []);
  if(existing){
    const sets = [], params = [];
    if('sheet' in b){ sets.push('sheet = ?'); params.push(b.sheet); }
    if('name' in b){ sets.push('name = ?'); params.push(b.name); }
    if('entries' in b){ sets.push('entries = ?'); params.push(entriesJson); }
    if('active' in b){ sets.push('active = ?'); params.push(b.active ? 1 : 0); }
    if(!sets.length) return res.status(400).json({ error: 'no_fields' });
    sets.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);
    db.prepare('UPDATE banco_exigencias SET ' + sets.join(', ') + ' WHERE id = ?').run(...params);
  } else {
    if(!b.name) return res.status(400).json({ error: 'missing_name' });
    db.prepare('INSERT INTO banco_exigencias (id, sheet, name, entries, active) VALUES (?, ?, ?, ?, ?)')
      .run(id, b.sheet||null, b.name, entriesJson, b.active===0?0:1);
  }
  audit(req.user.id, existing ? 'update' : 'create', 'banco_exigencia', id);
  res.json(shapeExig(db.prepare('SELECT * FROM banco_exigencias WHERE id = ?').get(id)));
});

router.delete('/exigencias/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT id FROM banco_exigencias WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: 'not_found' });
  db.prepare("UPDATE banco_exigencias SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
  audit(req.user.id, 'delete', 'banco_exigencia', row.id, { soft: true });
  res.json({ ok: true, soft: true });
});

/* Textos normativos */
router.get('/textos', (req, res) => {
  const rows = db.prepare('SELECT * FROM banco_textos WHERE active = 1 ORDER BY categoria, id').all();
  res.json({ textos: rows.map(shapeTexto) });
});

router.get('/textos/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM banco_textos WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: 'not_found' });
  res.json(shapeTexto(row));
});

router.put('/textos/:id', requireAdmin, (req, res) => {
  const b = req.body || {};
  const id = req.params.id;
  const existing = db.prepare('SELECT id FROM banco_textos WHERE id = ?').get(id);
  const itemsJson = typeof b.items === 'string' ? b.items : JSON.stringify(b.items || []);
  if(existing){
    const sets = [], params = [];
    if('categoria' in b){ sets.push('categoria = ?'); params.push(b.categoria); }
    if('items' in b){ sets.push('items = ?'); params.push(itemsJson); }
    if('active' in b){ sets.push('active = ?'); params.push(b.active ? 1 : 0); }
    if(!sets.length) return res.status(400).json({ error: 'no_fields' });
    sets.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);
    db.prepare('UPDATE banco_textos SET ' + sets.join(', ') + ' WHERE id = ?').run(...params);
  } else {
    if(!b.categoria) return res.status(400).json({ error: 'missing_categoria' });
    db.prepare('INSERT INTO banco_textos (id, categoria, items, active) VALUES (?, ?, ?, ?)')
      .run(id, b.categoria, itemsJson, b.active===0?0:1);
  }
  audit(req.user.id, existing ? 'update' : 'create', 'banco_texto', id);
  res.json(shapeTexto(db.prepare('SELECT * FROM banco_textos WHERE id = ?').get(id)));
});

router.delete('/textos/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT id FROM banco_textos WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: 'not_found' });
  db.prepare("UPDATE banco_textos SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
  audit(req.user.id, 'delete', 'banco_texto', row.id, { soft: true });
  res.json({ ok: true, soft: true });
});

module.exports = router;

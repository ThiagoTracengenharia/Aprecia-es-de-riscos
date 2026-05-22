'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const db = require('../db');
const cfg = require('../config');
const { requireAuth } = require('../middleware/auth');
const { makeId } = require('../util/ids');
const { audit } = require('../util/audit');

const router = express.Router();
router.use(requireAuth);

const SECTOR_TAG = {
  mecanico:    'MEC',
  hidraulico:  'HID',
  pneumatico:  'PNE',
  eletrico:    'ELE'
};

function nextDevTag(categoria){
  const code = SECTOR_TAG[categoria] || categoria.slice(0,3).toUpperCase();
  const prefix = 'PJT-' + code + '-';
  const last = db.prepare(
    'SELECT tag FROM dev_projects WHERE tag LIKE ? ORDER BY tag DESC LIMIT 1'
  ).get(prefix + '%');
  let n = 1;
  if(last){
    const m = last.tag.match(/(\d+)$/);
    if(m) n = parseInt(m[1], 10) + 1;
  }
  return prefix + String(n).padStart(5, '0');
}

function shapeDev(row){
  if(!row) return row;
  let riscos = [], historico = [];
  try { riscos = JSON.parse(row.riscos_atribuidos || '[]'); } catch(e){}
  try { historico = JSON.parse(row.historico || '[]'); } catch(e){}
  return Object.assign({}, row, { riscos_atribuidos: riscos, historico });
}

router.get('/', (req, res) => {
  const { categoria, status, responsavel_id, apreciacao_id } = req.query;
  let sql = 'SELECT * FROM dev_projects WHERE 1=1';
  const params = [];
  if(categoria){ sql += ' AND categoria = ?'; params.push(categoria); }
  if(status){ sql += ' AND status = ?'; params.push(status); }
  if(responsavel_id){ sql += ' AND responsavel_id = ?'; params.push(responsavel_id); }
  if(apreciacao_id){ sql += ' AND apreciacao_id = ?'; params.push(apreciacao_id); }
  sql += ' ORDER BY datetime(updated_at) DESC';
  res.json({ dev_projects: db.prepare(sql).all(...params).map(shapeDev) });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM dev_projects WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: 'not_found' });
  const anexos = db.prepare(
    'SELECT id, filename, mime_type, size_bytes, uploaded_by, uploaded_at FROM dev_attachments WHERE dev_project_id = ? ORDER BY datetime(uploaded_at) DESC'
  ).all(row.id);
  res.json(Object.assign({}, shapeDev(row), { anexos }));
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if(!b.categoria || !SECTOR_TAG[b.categoria]){
    return res.status(400).json({ error: 'invalid_categoria' });
  }
  if(!b.nome || !String(b.nome).trim()) return res.status(400).json({ error: 'missing_nome' });
  const id = makeId('dev');
  const tag = b.tag || nextDevTag(b.categoria);
  db.prepare(
    'INSERT INTO dev_projects (id, apreciacao_id, apreciacao_numero, apreciacao_data, categoria, tag, nome, cliente, fase_key, fase, progresso, status, prazo, responsavel_id, nao_conformidades, riscos_criticos, riscos_atribuidos, historico) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id, b.apreciacao_id||null, b.apreciacao_numero||null, b.apreciacao_data||null,
    b.categoria, tag, String(b.nome).trim(), b.cliente||null,
    b.fase_key||'levantamento', b.fase||'Levantamento',
    parseInt(b.progresso||0, 10), b.status||'aguardando',
    b.prazo||null, b.responsavel_id||null,
    parseInt(b.nao_conformidades||0, 10), parseInt(b.riscos_criticos||0, 10),
    JSON.stringify(b.riscos_atribuidos || []),
    JSON.stringify(b.historico || [{ ts: new Date().toISOString(), by: req.user.id, acao: 'criado' }])
  );
  audit(req.user.id, 'create', 'dev_project', id, { tag, nome: b.nome });
  res.status(201).json(shapeDev(db.prepare('SELECT * FROM dev_projects WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM dev_projects WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: 'not_found' });
  const b = req.body || {};
  const sets = [], params = [];
  for(const f of ['nome','cliente','fase_key','fase','progresso','status','prazo','responsavel_id','nao_conformidades','riscos_criticos']){
    if(f in b){ sets.push(f + ' = ?'); params.push(b[f]); }
  }
  if('riscos_atribuidos' in b){
    sets.push('riscos_atribuidos = ?');
    params.push(typeof b.riscos_atribuidos === 'string' ? b.riscos_atribuidos : JSON.stringify(b.riscos_atribuidos));
  }
  if('historico' in b){
    sets.push('historico = ?');
    params.push(typeof b.historico === 'string' ? b.historico : JSON.stringify(b.historico));
  }
  if(!sets.length) return res.status(400).json({ error: 'no_fields' });
  sets.push("updated_at = CURRENT_TIMESTAMP");
  params.push(row.id);
  db.prepare('UPDATE dev_projects SET ' + sets.join(', ') + ' WHERE id = ?').run(...params);
  audit(req.user.id, 'update', 'dev_project', row.id, { keys: Object.keys(b) });
  res.json(shapeDev(db.prepare('SELECT * FROM dev_projects WHERE id = ?').get(row.id)));
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM dev_projects WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: 'not_found' });
  const atts = db.prepare('SELECT filepath FROM dev_attachments WHERE dev_project_id = ?').all(row.id);
  db.prepare('DELETE FROM dev_projects WHERE id = ?').run(row.id);
  for(const a of atts){ try { fs.unlinkSync(a.filepath); } catch(e){} }
  audit(req.user.id, 'delete', 'dev_project', row.id, { tag: row.tag });
  res.json({ ok: true });
});

/* Anexos */
const storage = multer.diskStorage({
  destination: function(req, file, cb){
    const devId = req.params.id;
    const dest = path.join(cfg.uploadDir, devId);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function(req, file, cb){
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_');
    cb(null, Date.now() + '_' + safe);
  }
});
const upload = multer({ storage, limits: { fileSize: cfg.uploadMaxBytes } });

router.post('/:id/anexos', upload.single('file'), (req, res) => {
  const dev = db.prepare('SELECT id FROM dev_projects WHERE id = ?').get(req.params.id);
  if(!dev){
    if(req.file && req.file.path){ try { fs.unlinkSync(req.file.path); } catch(e){} }
    return res.status(404).json({ error: 'dev_project_not_found' });
  }
  if(!req.file) return res.status(400).json({ error: 'no_file' });
  const id = makeId('att');
  db.prepare(
    'INSERT INTO dev_attachments (id, dev_project_id, filename, filepath, mime_type, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, dev.id, req.file.originalname, req.file.path, req.file.mimetype||null, req.file.size||0, req.user.id);
  audit(req.user.id, 'create', 'dev_attachment', id, { dev: dev.id, filename: req.file.originalname });
  res.status(201).json(db.prepare(
    'SELECT id, filename, mime_type, size_bytes, uploaded_at FROM dev_attachments WHERE id = ?'
  ).get(id));
});

router.get('/:id/anexos/:attId', (req, res) => {
  const att = db.prepare('SELECT * FROM dev_attachments WHERE id = ? AND dev_project_id = ?').get(req.params.attId, req.params.id);
  if(!att) return res.status(404).json({ error: 'not_found' });
  if(!fs.existsSync(att.filepath)) return res.status(410).json({ error: 'file_gone' });
  res.download(att.filepath, att.filename);
});

router.delete('/:id/anexos/:attId', (req, res) => {
  const att = db.prepare('SELECT * FROM dev_attachments WHERE id = ? AND dev_project_id = ?').get(req.params.attId, req.params.id);
  if(!att) return res.status(404).json({ error: 'not_found' });
  db.prepare('DELETE FROM dev_attachments WHERE id = ?').run(att.id);
  try { fs.unlinkSync(att.filepath); } catch(e){}
  audit(req.user.id, 'delete', 'dev_attachment', att.id);
  res.json({ ok: true });
});

module.exports = router;

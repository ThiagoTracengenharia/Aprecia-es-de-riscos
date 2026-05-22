'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const cfg = require('../config');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const storage = multer.diskStorage({
  destination: function(req, file, cb){
    const dest = path.join(cfg.uploadDir, 'misc', req.user.id);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function(req, file, cb){
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_');
    cb(null, Date.now() + '_' + safe);
  }
});
const upload = multer({ storage, limits: { fileSize: cfg.uploadMaxBytes } });

router.post('/', upload.single('file'), (req, res) => {
  if(!req.file) return res.status(400).json({ error: 'no_file' });
  const rel = path.relative(cfg.uploadDir, req.file.path).replace(/\\/g, '/');
  res.status(201).json({
    url: '/api/uploads/' + rel,
    filename: req.file.originalname,
    storedAs: req.file.filename,
    size: req.file.size,
    mime: req.file.mimetype
  });
});

router.get(/^\/(.+)/, (req, res) => {
  const rel = req.params[0];
  if(rel.includes('..') || path.isAbsolute(rel)){
    return res.status(400).json({ error: 'invalid_path' });
  }
  const abs = path.join(cfg.uploadDir, rel);
  if(!abs.startsWith(cfg.uploadDir)){
    return res.status(400).json({ error: 'invalid_path' });
  }
  if(!fs.existsSync(abs)) return res.status(404).json({ error: 'not_found' });
  res.sendFile(abs);
});

module.exports = router;

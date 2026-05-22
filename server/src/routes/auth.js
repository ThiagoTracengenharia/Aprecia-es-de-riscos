'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

/* POST /api/auth/login */
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if(!email || !password){
    return res.status(400).json({ error: 'missing_fields', message: 'E-mail e senha são obrigatórios.' });
  }
  const emailNorm = String(email).trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ? AND active = 1').get(emailNorm);
  if(!user){
    return res.status(401).json({ error: 'invalid_credentials', message: 'E-mail ou senha incorretos.' });
  }
  const ok = bcrypt.compareSync(password, user.password_hash);
  if(!ok){
    return res.status(401).json({ error: 'invalid_credentials', message: 'E-mail ou senha incorretos.' });
  }
  const token = signToken(user);
  // Auditoria
  try {
    db.prepare('INSERT INTO auditoria (user_id, acao, entidade, detalhe) VALUES (?, ?, ?, ?)')
      .run(user.id, 'login', 'auth', JSON.stringify({ ip: req.ip }));
  } catch(e){}
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, cargo: user.cargo, role: user.role }
  });
});

/* GET /api/auth/me — retorna o user atual a partir do token */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/* POST /api/auth/logout — apenas registra a auditoria (token é client-side) */
router.post('/logout', requireAuth, (req, res) => {
  try {
    db.prepare('INSERT INTO auditoria (user_id, acao, entidade) VALUES (?, ?, ?)')
      .run(req.user.id, 'logout', 'auth');
  } catch(e){}
  res.json({ ok: true });
});

module.exports = router;

'use strict';
const jwt = require('jsonwebtoken');
const cfg = require('../config');
const db = require('../db');

/* Gera JWT para um usuário */
function signToken(user){
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    cfg.jwtSecret,
    { expiresIn: cfg.jwtExpiresIn }
  );
}

/* Middleware obrigatório: exige token válido */
function requireAuth(req, res, next){
  const header = req.headers.authorization || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if(!m){
    return res.status(401).json({ error: 'no_token', message: 'Token não enviado.' });
  }
  try {
    const payload = jwt.verify(m[1], cfg.jwtSecret);
    // Recarrega user do banco para garantir que ainda existe e está ativo
    const user = db.prepare('SELECT id, email, name, cargo, role, active FROM users WHERE id = ?').get(payload.sub);
    if(!user || !user.active){
      return res.status(401).json({ error: 'invalid_user' });
    }
    req.user = user;
    next();
  } catch(err) {
    return res.status(401).json({ error: 'invalid_token', message: err.message });
  }
}

/* Middleware: exige role admin */
function requireAdmin(req, res, next){
  if(!req.user) return res.status(401).json({ error: 'no_token' });
  if(req.user.role !== 'admin'){
    return res.status(403).json({ error: 'forbidden', message: 'Apenas administradores.' });
  }
  next();
}

module.exports = { signToken, requireAuth, requireAdmin };

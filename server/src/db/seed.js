'use strict';
/* Cria o usuário admin inicial (Thiago) e um engenheiro de exemplo. */
const bcrypt = require('bcryptjs');
const db = require('../db');

const users = [
  {
    id: 'u_thiago',
    email: 'thiago@tracengenharia.com.br',
    password: '36714662',
    name: 'Thiago Marinho',
    cargo: 'Eng. Mecânico',
    role: 'admin'
  }
];

console.log('=== Trace Riscos — seed ===');

const insertUser = db.prepare(`
  INSERT OR REPLACE INTO users (id, email, password_hash, name, cargo, role, active)
  VALUES (?, ?, ?, ?, ?, ?, 1)
`);
const insertEng = db.prepare(`
  INSERT OR REPLACE INTO engineers (id, user_id, name, email, cargo, setores, active)
  VALUES (?, ?, ?, ?, ?, ?, 1)
`);

const trx = db.transaction(() => {
  for(const u of users){
    const hash = bcrypt.hashSync(u.password, 10);
    insertUser.run(u.id, u.email, hash, u.name, u.cargo, u.role);
    console.log('  usuário', u.email);
    // Cria engineer correspondente
    insertEng.run(
      'eng_' + u.email,
      u.id,
      u.name,
      u.email,
      u.cargo,
      JSON.stringify(['mecanico','hidraulico','pneumatico','eletrico'])
    );
  }
});
trx();

console.log('\nSeed concluído.');
process.exit(0);

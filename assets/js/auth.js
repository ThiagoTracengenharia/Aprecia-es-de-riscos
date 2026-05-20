/* AUTH.JS — Autenticação e sessão · Trace Engenharia */

var CURRENT_USER = null;

var ALLOWED_USERS = [
  { email: 'thiago@tracengenharia.com.br', password: '36714662', name: 'Thiago Marinho', role: 'admin' }
];

function showLogin(){
  var el = document.getElementById('login-screen');
  if(el) el.style.display = 'flex';
}
function hideLogin(){
  var el = document.getElementById('login-screen');
  if(el) el.style.display = 'none';
}

function loginClick(){
  var email = (document.getElementById('lEmail') || {}).value || '';
  var pw    = (document.getElementById('lPw')    || {}).value || '';
  var btn   = document.getElementById('lBtn');
  var err   = document.getElementById('lErr');
  if(err) err.style.display = 'none';
  if(!email || !pw){
    if(err){ err.textContent = 'Preencha e-mail e senha.'; err.style.display = 'block'; }
    return;
  }
  if(btn){ btn.textContent = 'Entrando…'; btn.disabled = true; }

  var emailNorm = email.trim().toLowerCase();
  var user = ALLOWED_USERS.find(function(u){ return u.email.toLowerCase() === emailNorm; });

  if(!user || user.password !== pw){
    if(err){ err.textContent = 'E-mail ou senha incorretos.'; err.style.display = 'block'; }
    if(btn){ btn.textContent = 'Entrar'; btn.disabled = false; }
    return;
  }

  CURRENT_USER = { id:'u_'+user.email, email:user.email, name:user.name, crea:'', role:user.role };
  try { sessionStorage.setItem('_traceUser', JSON.stringify(CURRENT_USER)); } catch(e){}
  hideLogin();
  if(btn){ btn.textContent = 'Entrar'; btn.disabled = false; }
  if(typeof render === 'function') render();
}

function signOutUser(){
  CURRENT_USER = null;
  try { sessionStorage.removeItem('_traceUser'); } catch(e){}
  var menu = document.getElementById('hdr-user-menu');
  if(menu) menu.style.display = 'none';
  showLogin();
}

function updateUserChip(){
  if(!CURRENT_USER) return;
  var av = document.getElementById('hdr-avatar');
  var nm = document.getElementById('hdr-username');
  var em = document.getElementById('hdr-useremail');
  var hh = document.getElementById('hdr-user');
  if(av) av.textContent = (CURRENT_USER.name || '?').charAt(0).toUpperCase();
  if(nm) nm.textContent = CURRENT_USER.name || '';
  if(em) em.textContent = CURRENT_USER.email || '';
  if(hh) hh.style.display = 'flex';
}

function toggleUserMenu(){
  var m = document.getElementById('hdr-user-menu');
  if(!m) return;
  m.style.display = (m.style.display === 'block') ? 'none' : 'block';
}

document.addEventListener('click', function(e){
  var m = document.getElementById('hdr-user-menu');
  var chip = document.getElementById('hdr-user');
  if(!m || !chip) return;
  if(!chip.contains(e.target)) m.style.display = 'none';
});

document.addEventListener('DOMContentLoaded', function(){
  var saved = null;
  try { saved = JSON.parse(sessionStorage.getItem('_traceUser') || 'null'); } catch(e){}
  if(saved){
    CURRENT_USER = saved;
    hideLogin();
    setTimeout(function(){ if(typeof render === 'function') render(); }, 0);
  } else {
    showLogin();
  }
});

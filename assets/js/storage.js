/* STORAGE.JS — Camada de persistência · Trace Engenharia
 * Centraliza localStorage / IndexedDB. Quando o backend Fase 3 chegar,
 * basta trocar para fetch('/api/...').
 * Deps globais: DB_KEY, BANCO_EXIG_KEY, BANCO_TEXTOS_KEY, STORAGE_KEY,
 * PROJECTS_KEY, S, BASE_EXIGENCIAS, BASE_TEXTOS. */

var DEV_PROJECTS_KEY = 'trace_dev_projects_v1';

function listDevProjects(){
  try { return JSON.parse(localStorage.getItem(DEV_PROJECTS_KEY) || '[]'); }
  catch(e){ return []; }
}
function listDevProjectsByCategoria(c){ return listDevProjects().filter(function(p){ return p.categoria===c; }); }
function listDevProjectsByApreciacao(id){ return listDevProjects().filter(function(p){ return p.apreciacaoId===id; }); }
function getDevProject(id){ return listDevProjects().find(function(p){ return p.id===id; }); }
function saveDevProject(proj){
  var list = listDevProjects();
  proj.atualizadoEm = new Date().toISOString();
  var idx = list.findIndex(function(p){ return p.id===proj.id; });
  if(idx>=0) list[idx]=proj; else list.unshift(proj);
  localStorage.setItem(DEV_PROJECTS_KEY, JSON.stringify(list));
  return proj;
}
function deleteDevProject(id){
  localStorage.setItem(DEV_PROJECTS_KEY, JSON.stringify(listDevProjects().filter(function(p){ return p.id!==id; })));
}
function deleteDevProjectsByApreciacao(id){
  localStorage.setItem(DEV_PROJECTS_KEY, JSON.stringify(listDevProjects().filter(function(p){ return p.apreciacaoId!==id; })));
}

/* DB legacy */
function dbLoad(){ try { return JSON.parse(localStorage.getItem(DB_KEY)||'[]'); } catch(e){ return []; } }
function dbSave(list){ try { localStorage.setItem(DB_KEY, JSON.stringify(list)); } catch(e){ alert('Erro ao salvar.'); } }

/* Banco accessors */
function getBancoExig(){
  try { var s = localStorage.getItem(BANCO_EXIG_KEY); if(s) return JSON.parse(s); } catch(e){}
  return JSON.parse(JSON.stringify(BASE_EXIGENCIAS));
}
function saveBancoExig(d){ localStorage.setItem(BANCO_EXIG_KEY, JSON.stringify(d)); }
function getBancoTextos(){
  try { var s = localStorage.getItem(BANCO_TEXTOS_KEY); if(s) return JSON.parse(s); } catch(e){}
  return JSON.parse(JSON.stringify(BASE_TEXTOS));
}
function saveBancoTextos(d){ localStorage.setItem(BANCO_TEXTOS_KEY, JSON.stringify(d)); }

/* IndexedDB */
var IDB_NAME  = 'trace_apreciacoes_imgs';
var IDB_STORE = 'images';
function idbOpen(){
  return new Promise(function(resolve, reject){
    var req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = function(e){ e.target.result.createObjectStore(IDB_STORE); };
    req.onsuccess = function(e){ resolve(e.target.result); };
    req.onerror   = function(e){ reject(e.target.error); };
  });
}
function idbSet(key, value){
  return idbOpen().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = function(){ resolve(); };
      tx.onerror = function(e){ reject(e.target.error); };
    });
  }).catch(function(e){ console.warn('idbSet:', e); });
}
function idbGet(key){
  return idbOpen().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(IDB_STORE, 'readonly');
      var req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = function(e){ resolve(e.target.result || null); };
      req.onerror   = function(e){ reject(e.target.error); };
    });
  }).catch(function(){ return null; });
}
function idbDel(key){
  return idbOpen().then(function(db){
    return new Promise(function(resolve){
      var tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = function(){ resolve(); };
    });
  }).catch(function(){});
}

function saveImagesToIdb(id){
  return idbSet('imgs_'+id, {
    photos:     S.photos     || [],
    clientLogo: S.clientLogo || { url:'', b64:'', type:'' },
    riscosPhotos: (S.riscos||[]).map(function(r){ return r.fotos || []; }),
    art1: (S.art && S.art.art1) || null,
    art2: (S.art && S.art.art2) || null
  });
}
function loadImagesFromIdb(id){
  return idbGet('imgs_'+id).then(function(imgs){
    if(!imgs) return;
    if(imgs.photos) S.photos = imgs.photos;
    if(imgs.clientLogo && imgs.clientLogo.url) S.clientLogo = imgs.clientLogo;
    if(imgs.riscosPhotos){
      imgs.riscosPhotos.forEach(function(fotos, i){ if(S.riscos[i]) S.riscos[i].fotos = fotos || []; });
    }
    if(!S.art) S.art = {};
    if(imgs.art1) S.art.art1 = imgs.art1;
    if(imgs.art2) S.art.art2 = imgs.art2;
  });
}

/* Anexos de projeto de desenvolvimento */
function saveDevAttachments(devId, files){ return idbSet('devatt_'+devId, files); }
function loadDevAttachments(devId){ return idbGet('devatt_'+devId).then(function(a){ return a || []; }); }
function deleteDevAttachments(devId){ return idbDel('devatt_'+devId); }

/* Projetos */
function listProjects(){
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]'); } catch(e){ return []; }
}
function saveProjectToStorage(proj){
  var list = listProjects();
  var idx = list.findIndex(function(p){ return p.id===proj.id; });
  if(idx>=0) list[idx]=proj; else list.unshift(proj);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
}
function deleteProjectFromStorage(id){
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(listProjects().filter(function(p){ return p.id!==id; })));
  var aps = listAssessments().filter(function(a){ return a.projectId!==id; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(aps));
}
function nextProjectTag(){
  var all = listProjects();
  var nums = all.map(function(p){ var m = p.tag && p.tag.match(/PJT-(\d+)/); return m ? parseInt(m[1]) : -1; });
  var max = nums.length ? Math.max.apply(null, nums) : -1;
  return 'PJT-' + String(max+1).padStart(3, '0');
}
function createProject(name, client, desc){
  var proj = {
    id: 'proj_'+Date.now(),
    tag: nextProjectTag(),
    name: name, client: client, desc: desc,
    status: 'ativo',
    createdAt: new Date().toLocaleDateString('pt-BR')
  };
  saveProjectToStorage(proj);
  return proj;
}
function deleteProject(id){
  if(!confirm('Excluir este projeto e TODAS as suas apreciações? Ação irreversível.')) return;
  deleteProjectFromStorage(id);
  if(typeof render === 'function') render();
}
function markProjectStatus(id, status){
  var list = listProjects();
  var p = list.find(function(x){ return x.id===id; });
  if(p){ p.status = status; saveProjectToStorage(p); if(typeof render === 'function') render(); }
}

/* Apreciações */
function listAssessments(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ return []; }
}
function listAssessmentsForProject(projectId){
  return listAssessments().filter(function(a){ return a.projectId===projectId; });
}
function saveAssessmentToStorage(data){
  var list = listAssessments();
  var idx = list.findIndex(function(a){ return a.id===data.id; });
  if(idx>=0) list[idx]=data; else list.unshift(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function deleteAssessmentFromStorage(id){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listAssessments().filter(function(a){ return a.id!==id; })));
}
function assessmentSummary(state){
  var cnt = { Baixo:0, 'Médio':0, Alto:0, 'Muito Alto':0 };
  (state.riscos || []).forEach(function(r){
    if(typeof hrn !== 'function' || typeof grau !== 'function') return;
    var g = grau(hrn(r.LO_p, r.FE_p, r.DPH_p, r.NP_p));
    cnt[g] = (cnt[g] || 0) + 1;
  });
  return cnt;
}
/* Sumário INICIAL — riscos identificados (HRN pré-adequação) */
function assessmentSummaryInicial(state){
  var cnt = { Baixo:0, 'Médio':0, Alto:0, 'Muito Alto':0 };
  (state.riscos || []).forEach(function(r){
    if(typeof hrn !== 'function' || typeof grau !== 'function') return;
    var g = grau(hrn(r.LO, r.FE, r.DPH, r.NP));
    cnt[g] = (cnt[g] || 0) + 1;
  });
  return cnt;
}

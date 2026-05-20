/* =================================================================
   ASSESSMENT-MGMT.JS — Gerenciamento de apreciações
   Trace Engenharia · Apreciação de Riscos

   Funções de ciclo de vida de uma apreciação:
     - saveCurrentAssessment, newAssessment, openAssessment, deleteAssessment
     - markConcluido (com modal de roteamento para devProjects)
     - openRoteamentoModal, confirmarRoteamento
     - bindHome, bind, setHomeFilter, exportFromPlatform
     - DOMContentLoaded handler

   Dependências (carregadas antes):
     S, render, saveAssessmentToStorage, listAssessments,
     deleteAssessmentFromStorage, saveImagesToIdb, loadImagesFromIdb,
     idbDel, contNaoConformidades, createDevProject, DEV_SECTORS,
     listDevProjectsByApreciacao, deleteDevProjectsByApreciacao,
     getEngineers, escHtmlB, assessmentSummary
   ================================================================= */

var _homeFilter = (typeof _homeFilter !== 'undefined') ? _homeFilter : 'todos';
var _homeSearch = (typeof _homeSearch !== 'undefined') ? _homeSearch : '';

/* ═══════════ CICLO DE VIDA DE UMA APRECIAÇÃO ═══════════ */
function saveCurrentAssessment(notify){
  saveFields();
  if(!S._id) S._id = 'ap_' + Date.now();
  if(!S._status) S._status = 'rascunho';

  // Save images separately in IndexedDB
  if(typeof saveImagesToIdb === 'function') saveImagesToIdb(S._id);

  // Strip images from state stored in localStorage
  var stateClone = JSON.parse(JSON.stringify(S));
  stateClone.photos = [];
  stateClone.clientLogo = { url:'', b64:'', type:'' };
  stateClone.riscos.forEach(function(r){ r.fotos = []; });
  stateClone.art = { art1:null, art2:null };

  var meta = {
    id: S._id,
    projectId: S.currentProjectId || null,
    status: S._status,
    numero: S.doc.numero,
    titulo: S.doc.titulo,
    cliente: S.clientNome || S.doc.cliente,
    equipamento: (S.equip.tipo||'') + (S.equip.patrimonio ? ' – ' + S.equip.patrimonio : ''),
    data: S.doc.data,
    elaborado: S.doc.elaborado,
    totalRiscos: S.riscos.length,
    riskSummary: (typeof assessmentSummary === 'function') ? assessmentSummary(S) : {},
    updatedAt: new Date().toLocaleString('pt-BR'),
    state: stateClone
  };
  saveAssessmentToStorage(meta);
  if(notify){
    var btn = document.getElementById('hdr-save');
    if(btn){
      btn.textContent = '✅ Salvo!';
      setTimeout(function(){ if(btn) btn.textContent = '💾 Salvar'; }, 1800);
    }
  }
}

function newAssessment(projectId){
  S.step = 0;
  S._id = 'ap_' + Date.now();
  S._status = 'rascunho';
  S.currentProjectId = projectId || S.currentProjectId || null;
  var proj = listProjects().find(function(p){ return p.id === S.currentProjectId; });
  S.doc = {
    numero:    proj ? proj.tag + '-HRN-000' : 'HRN-000-R0',
    data:      new Date().toLocaleDateString('pt-BR'),
    elaborado: '',
    cliente:   proj ? proj.client : '',
    revisao:   '0',
    titulo:    ''
  };
  S.equip = { tipo:'', patrimonio:'', modelo:'', serie:'', fabricante:'', ano:'', voltagem:'', fases:'', peso:'', local:'' };
  S.limites = { energia:'Elétrica', processo:'', limitesUso:'', limitesMaquina:'' };
  S.ciclos = { transporte:false, montagem:false, operacao:true, manutencao:true, desmontagem:false };
  S.photos = [];
  S.clientLogo = { url:'', b64:'', type:'' };
  S.clientNome = proj ? proj.client : '';
  S.art = { art1:null, art2:null };
  S.riscos = [];
  S.aiStatus = 'idle'; S.aiMsg = '';
  S.modal = { open:false, riscoIdx:-1, selected:{}, expanded:{}, tab:'exigencias', busca:'' };
  S.view = 'editor';
  if(typeof updateHeaderButtons === 'function') updateHeaderButtons();
  render();
}

function openAssessment(id){
  var meta = listAssessments().find(function(a){ return a.id === id; });
  if(!meta) return;
  Object.assign(S, meta.state);
  S._id = meta.id;
  S._status = meta.status;
  S.currentProjectId = meta.projectId || S.currentProjectId;
  S.step = 0;
  S.view = 'editor';
  S.modal = { open:false, riscoIdx:-1, selected:{}, expanded:{}, tab:'exigencias', busca:'' };
  if(typeof updateHeaderButtons === 'function') updateHeaderButtons();
  if(typeof loadImagesFromIdb === 'function'){
    loadImagesFromIdb(id).then(function(){ render(); }).catch(function(){ render(); });
  } else {
    render();
  }
}

/* markConcluido: agora abre modal de roteamento ao concluir.
 * Ao reativar, apaga devProjects vinculados (com confirmação). */
function markConcluido(id){
  var list = listAssessments();
  var meta = list.find(function(a){ return a.id === id; });
  if(!meta) return;

  if(meta.status === 'concluido'){
    // Reativando — confirma antes de apagar devProjects vinculados
    var devLinked = (typeof listDevProjectsByApreciacao === 'function')
      ? listDevProjectsByApreciacao(id) : [];
    if(devLinked.length > 0){
      if(!confirm('Esta apreciação possui ' + devLinked.length + ' projeto(s) de desenvolvimento vinculado(s). Reativá-la irá apagar esses projetos. Continuar?')){
        return;
      }
      deleteDevProjectsByApreciacao(id);
    }
    meta.status = 'rascunho';
    saveAssessmentToStorage(meta);
    render();
    return;
  }
  // Concluindo — abrir modal de roteamento
  openRoteamentoModal(id);
}

function deleteAssessment(id){
  if(!confirm('Remover esta apreciação? Esta ação não pode ser desfeita.')) return;
  deleteAssessmentFromStorage(id);
  if(typeof idbDel === 'function') idbDel('imgs_' + id);
  if(typeof deleteDevProjectsByApreciacao === 'function') deleteDevProjectsByApreciacao(id);
  render();
}

function exportFromPlatform(id){
  var meta = listAssessments().find(function(a){ return a.id === id; });
  if(!meta) return;
  // Carrega estado da apreciação em S e dispara export
  Object.assign(S, meta.state);
  S._id = meta.id;
  if(typeof loadImagesFromIdb === 'function'){
    loadImagesFromIdb(id).then(function(){
      if(typeof exportDoc === 'function') exportDoc();
    });
  } else {
    if(typeof exportDoc === 'function') exportDoc();
  }
}

function setHomeFilter(val){
  _homeFilter = val;
  render();
}

/* ═══════════ MODAL DE ROTEAMENTO POR RISCO (concluir apreciação) ═══════════
 * Para cada risco identificado, o usuário escolhe:
 *   - Setor (mecânico / hidráulico / pneumático / elétrico) ou pular
 *   - Responsável (engenheiro do setor)
 * Riscos com mesmo (setor, responsavelId) viram um único devProject.
 */
var _roteamento = null;

function openRoteamentoModal(apreciacaoId){
  var meta = listAssessments().find(function(a){ return a.id === apreciacaoId; });
  if(!meta) return;
  var mr = document.getElementById('modal-root');
  if(!mr) return;

  var riscos = (meta.state && meta.state.riscos) || [];
  // Estado da seleção em memória — por risco
  _roteamento = {
    apreciacaoId: apreciacaoId,
    riscos: riscos.map(function(r, i){
      var h = (typeof hrn === 'function') ? hrn(r.LO, r.FE, r.DPH, r.NP) : 0;
      var g = (typeof grau === 'function') ? grau(h) : 'Baixo';
      return {
        idx: i,
        num: r.num || (i+1),
        identificacao: r.identificacao || '',
        riscoAlvo: r.riscoAlvo || '',
        hrn: h,
        grau: g,
        setor: '',           // chave de DEV_SECTORS ou '' para pular
        responsavelId: '',   // id do engenheiro
        prazo: ''            // ISO date
      };
    })
  };

  renderRoteamentoModal();
}

function renderRoteamentoModal(){
  if(!_roteamento) return;
  var mr = document.getElementById('modal-root');
  if(!mr) return;
  var meta = listAssessments().find(function(a){ return a.id === _roteamento.apreciacaoId; });
  if(!meta){ closeRoteamentoModal(); return; }
  var engs = (typeof getEngineers === 'function') ? getEngineers() : [];

  var grauColor = function(g){
    if(g === 'Muito Alto') return { bg:'#FEE2E2', fg:'#7F1D1D' };
    if(g === 'Alto')       return { bg:'#FFEDD5', fg:'#7C2D12' };
    if(g === 'Médio')      return { bg:'#FEF9C3', fg:'#713F12' };
    return { bg:'#DCFCE7', fg:'#14532D' };
  };

  var atribuidos = _roteamento.riscos.filter(function(r){ return r.setor; }).length;
  var porSetor = {};
  _roteamento.riscos.forEach(function(r){
    if(r.setor) porSetor[r.setor] = (porSetor[r.setor] || 0) + 1;
  });

  var statsHtml = Object.values(DEV_SECTORS).map(function(s){
    var n = porSetor[s.key] || 0;
    return '<div style="background:' + (n>0?'var(--orange-50)':'var(--ink-50)') + ';border:1px solid ' + (n>0?'var(--orange-100)':'var(--ink-100)') + ';border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px;">'
      + '<span style="font-size:16px;">' + s.icon + '</span>'
      + '<span style="font-size:11px;color:var(--ink-500);font-weight:600;">' + s.label + '</span>'
      + '<span style="margin-left:auto;font-size:13px;font-weight:700;color:' + (n>0?'var(--orange-700)':'var(--ink-500)') + ';">' + n + '</span>'
    + '</div>';
  }).join('');

  var rows = _roteamento.riscos.map(function(r){
    var c = grauColor(r.grau);
    var setoresOpts = Object.values(DEV_SECTORS).map(function(s){
      return '<option value="' + s.key + '"' + (r.setor === s.key ? ' selected' : '') + '>' + s.icon + ' ' + s.label + '</option>';
    }).join('');
    var engsDoSetor = r.setor
      ? engs.filter(function(e){ return !e.setores || e.setores.indexOf(r.setor) >= 0; })
      : [];
    var engOpts = engsDoSetor.map(function(e){
      return '<option value="' + e.id + '"' + (r.responsavelId === e.id ? ' selected' : '') + '>' + escHtmlB(e.nome) + '</option>';
    }).join('');
    var disabled = !r.setor ? 'disabled' : '';
    var rowStyle = r.setor ? 'background:var(--surface);' : 'background:var(--ink-50);';
    return '<tr style="' + rowStyle + 'border-bottom:1px solid var(--ink-100);">'
      + '<td style="padding:10px 12px;font-family:\'IBM Plex Mono\',monospace;font-size:12px;color:var(--ink-700);font-weight:600;width:40px;">#' + r.num + '</td>'
      + '<td style="padding:10px 12px;">'
        + '<div style="font-size:12.5px;font-weight:600;color:var(--ink-900);line-height:1.35;">' + escHtmlB(r.identificacao || r.riscoAlvo || 'Risco ' + r.num) + '</div>'
        + (r.riscoAlvo && r.identificacao !== r.riscoAlvo ? '<div style="font-size:11px;color:var(--ink-500);margin-top:2px;">' + escHtmlB(r.riscoAlvo) + '</div>' : '')
      + '</td>'
      + '<td style="padding:10px 12px;width:130px;">'
        + '<span style="display:inline-block;padding:3px 9px;background:' + c.bg + ';color:' + c.fg + ';font-size:10px;font-weight:700;border-radius:5px;text-transform:uppercase;letter-spacing:0.3px;">' + r.grau + '</span>'
        + '<div style="font-size:11px;color:var(--ink-500);margin-top:3px;font-family:\'IBM Plex Mono\',monospace;">HRN ' + r.hrn + '</div>'
      + '</td>'
      + '<td style="padding:8px 8px;width:170px;">'
        + '<select onchange="updRoteamentoRisco(' + r.idx + ',\'setor\',this.value)" style="width:100%;padding:7px 9px;border:1px solid var(--ink-300);border-radius:7px;font-size:12px;font-family:inherit;background:var(--surface);">'
          + '<option value="">— Não enviar —</option>' + setoresOpts
        + '</select>'
      + '</td>'
      + '<td style="padding:8px 8px;width:200px;">'
        + '<select ' + disabled + ' onchange="updRoteamentoRisco(' + r.idx + ',\'responsavelId\',this.value)" style="width:100%;padding:7px 9px;border:1px solid var(--ink-300);border-radius:7px;font-size:12px;font-family:inherit;background:' + (r.setor?'var(--surface)':'var(--ink-100)') + ';">'
          + '<option value="">— Atribuir depois —</option>' + engOpts
        + '</select>'
      + '</td>'
      + '<td style="padding:8px 8px;width:140px;">'
        + '<input type="date" ' + disabled + ' value="' + (r.prazo||'') + '" onchange="updRoteamentoRisco(' + r.idx + ',\'prazo\',this.value)" style="width:100%;padding:7px 9px;border:1px solid var(--ink-300);border-radius:7px;font-size:12px;font-family:inherit;background:' + (r.setor?'var(--surface)':'var(--ink-100)') + ';">'
      + '</td>'
    + '</tr>';
  }).join('');

  var bulkHtml = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;">'
    + '<span style="font-size:11px;color:var(--ink-500);font-weight:600;">Atribuir setor para TODOS:</span>'
    + Object.values(DEV_SECTORS).map(function(s){
        return '<button onclick="bulkRotear(\'' + s.key + '\')" style="padding:5px 10px;background:var(--surface);border:1px solid var(--ink-300);border-radius:6px;color:var(--ink-700);font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;">' + s.icon + ' ' + s.label + '</button>';
      }).join('')
    + '<button onclick="bulkRotear(\'\')" style="padding:5px 10px;background:var(--surface);border:1px solid var(--ink-300);border-radius:6px;color:var(--ink-700);font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;">Limpar</button>'
  + '</div>';

  mr.innerHTML = '<div class="modal-overlay" onclick="if(event.target===this)closeRoteamentoModal()">'
    + '<div class="modal-box" style="max-width:1080px;max-height:92vh;display:flex;flex-direction:column;" onclick="event.stopPropagation()">'
      + '<div class="modal-hdr" style="display:block;border-top:3px solid var(--orange-500);">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;">'
          + '<div>'
            + '<h3 style="margin:0;">Concluir apreciação · rotear riscos para desenvolvimento</h3>'
            + '<div style="font-size:11px;color:var(--ink-500);margin-top:3px;">' + escHtmlB(meta.numero||'—') + ' · ' + escHtmlB(meta.titulo||meta.cliente||'') + ' · ' + _roteamento.riscos.length + ' risco(s) identificado(s)</div>'
          + '</div>'
          + '<button class="modal-close" onclick="closeRoteamentoModal()">✕</button>'
        + '</div>'
      + '</div>'
      + '<div class="modal-body" style="padding:18px 22px;overflow-y:auto;flex:1;">'
        + '<div style="background:var(--orange-50);border:1px solid var(--orange-100);border-radius:10px;padding:11px 14px;margin-bottom:14px;font-size:12px;color:var(--orange-700);line-height:1.45;"><strong>Como funciona:</strong> escolha um setor para cada risco. Riscos com mesmo setor + responsável serão agrupados em UM projeto. Ex: 3 mecânicos para Thiago + 2 mecânicos para Fulano = 2 projetos.</div>'
        + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">' + statsHtml + '</div>'
        + bulkHtml
        + '<div style="border:1px solid var(--ink-100);border-radius:10px;overflow:hidden;">'
          + '<table style="width:100%;border-collapse:collapse;">'
            + '<thead><tr style="background:var(--ink-50);border-bottom:1px solid var(--ink-100);">'
              + ['#','Risco identificado','Grau (HRN inicial)','Setor de desenvolvimento','Responsável','Prazo'].map(function(h){ return '<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--ink-500);text-transform:uppercase;letter-spacing:0.5px;">' + h + '</th>'; }).join('')
            + '</tr></thead>'
            + '<tbody>' + rows + '</tbody>'
          + '</table>'
        + '</div>'
      + '</div>'
      + '<div class="modal-footer">'
        + '<div style="font-size:12px;color:var(--ink-500);margin-right:auto;"><strong style="color:var(--orange-700);">' + atribuidos + '</strong> de ' + _roteamento.riscos.length + ' risco(s) atribuído(s)</div>'
        + '<button class="btn btn-ghost" onclick="closeRoteamentoModal()">Cancelar</button>'
        + '<button class="btn btn-yellow" onclick="confirmarRoteamento()">✓ Concluir e criar projetos</button>'
      + '</div>'
    + '</div></div>';
}

function updRoteamentoRisco(idx, field, value){
  if(!_roteamento || !_roteamento.riscos[idx]) return;
  _roteamento.riscos[idx][field] = value;
  if(field === 'setor') _roteamento.riscos[idx].responsavelId = '';
  renderRoteamentoModal();
}

function bulkRotear(setor){
  if(!_roteamento) return;
  _roteamento.riscos.forEach(function(r){
    r.setor = setor;
    if(!setor) r.responsavelId = '';
  });
  renderRoteamentoModal();
}

function closeRoteamentoModal(){
  _roteamento = null;
  var mr = document.getElementById('modal-root');
  if(mr) mr.innerHTML = '';
}

function confirmarRoteamento(){
  if(!_roteamento) return;
  var apreciacaoId = _roteamento.apreciacaoId;
  var meta = listAssessments().find(function(a){ return a.id === apreciacaoId; });
  if(!meta){ closeRoteamentoModal(); return; }

  var grupos = {};
  _roteamento.riscos.forEach(function(r){
    if(!r.setor) return;
    var key = r.setor + '|' + (r.responsavelId || '') + '|' + (r.prazo || '');
    if(!grupos[key]) grupos[key] = { setor: r.setor, responsavelId: r.responsavelId, prazo: r.prazo, riscos: [] };
    grupos[key].riscos.push({
      riscoIdx: r.idx, riscoNum: r.num,
      titulo: r.identificacao || r.riscoAlvo || 'Risco ' + r.num,
      grau: r.grau, hrn: r.hrn, descricao: r.riscoAlvo
    });
  });

  var nGrupos = Object.keys(grupos).length;
  if(nGrupos === 0){
    if(!confirm('Nenhum risco atribuído. Concluir a apreciação sem criar projetos?')) return;
  }

  meta.status = 'concluido';
  saveAssessmentToStorage(meta);

  var projetoOrigem = listProjects().find(function(p){ return p.id === meta.projectId; });
  var nomeProjeto = (projetoOrigem && projetoOrigem.name) || meta.titulo ||
    (meta.state && meta.state.equip && meta.state.equip.tipo) || meta.cliente || 'Projeto sem nome';
  var cliente = meta.cliente || (projetoOrigem && projetoOrigem.client) || '';

  Object.values(grupos).forEach(function(g){
    createDevProject({
      apreciacaoId: meta.id,
      apreciacaoNumero: meta.numero,
      apreciacaoData: meta.updatedAt || new Date().toLocaleDateString('pt-BR'),
      categoria: g.setor,
      nome: nomeProjeto, cliente: cliente,
      responsavelId: g.responsavelId, prazo: g.prazo,
      riscosAtribuidos: g.riscos
    });
  });

  closeRoteamentoModal();
  render();

  if(nGrupos > 0){
    setTimeout(function(){
      var tip = document.createElement('div');
      tip.innerHTML = '<div style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--ink-900);color:#fff;padding:13px 22px;border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.35);z-index:9999;">✓ Apreciação concluída! ' + nGrupos + ' projeto(s) de desenvolvimento criado(s).</div>';
      document.body.appendChild(tip);
      setTimeout(function(){ tip.remove(); }, 3200);
    }, 100);
  }
}

/* ═══════════ BIND ═══════════ */
function bindHome(){
  var searchEl = document.getElementById('home-search');
  if(searchEl){ searchEl.oninput = function(){ _homeSearch = this.value; }; }
}

function bind(){
  var cl = document.getElementById('cli-logo-input');
  if(cl){
    cl.onchange = function(ev){
      var f = ev.target.files[0]; if(!f) return;
      var rd = new FileReader();
      rd.onload = function(e){
        S.clientLogo = { url: e.target.result, b64: e.target.result.split(',')[1] || '', type: f.type };
        render();
      };
      rd.readAsDataURL(f);
    };
  }
  ['d-num','d-data','d-elab','d-cli','d-clinome','d-titulo','d-rev','e-tipo','e-pat','e-mod','e-ser','e-fab','e-ano','e-vol','e-fas','e-pes','e-loc','l-eng','l-proc','l-uso','l-maq'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.oninput = function(){ saveFields(); };
  });
  ['c-trans','c-mont','c-ope','c-man','c-desm'].forEach(function(id){
    var el = document.getElementById(id);
    if(el){
      el.onchange = function(){
        if(id==='c-trans') S.ciclos.transporte = this.checked;
        if(id==='c-mont')  S.ciclos.montagem = this.checked;
        if(id==='c-ope')   S.ciclos.operacao = this.checked;
        if(id==='c-man')   S.ciclos.manutencao = this.checked;
        if(id==='c-desm')  S.ciclos.desmontagem = this.checked;
        var p = this.closest('.cb-item');
        if(p) p.classList.toggle('on', this.checked);
      };
    }
  });
  document.querySelectorAll('[data-ri][data-f]').forEach(function(el){
    el.oninput = el.onchange = function(){
      var ri = parseInt(this.dataset.ri); var f = this.dataset.f;
      if(S.riscos[ri] !== undefined){
        S.riscos[ri][f] = this.tagName === 'SELECT' ? (parseFloat(this.value) || this.value) : this.value;
      }
    };
  });
}

document.addEventListener('DOMContentLoaded', function(){
  if(typeof render === 'function'){
    setTimeout(function(){ try { bind(); } catch(e){} }, 250);
  }
});

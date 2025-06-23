const API_URL = 'https://33765672-f51d-46f5-b276-32beaed4448a-00-3qd9ymtpuc1xv.worf.replit.dev:3000';

// Elementos DOM
const elements = {
  esporteSelect: document.getElementById('esporte'),
  competicaoSelect: document.getElementById('competicao'),
  empateInputs: document.querySelectorAll('.empate-input'),
  form: document.getElementById('add-game-form')
};

// Obter dados iniciais
let esportesData = [];
let competicoesData = [];

// Buscar esportes
async function fetchEsportes() {
  const res = await fetch(`${API_URL}/esportes`);
  return res.json();
}

// Buscar competições
async function fetchCompeticoes() {
  const res = await fetch(`${API_URL}/competicoes`);
  return res.json();
}

// Buscar jogos
async function fetchJogos() {
  const res = await fetch(`${API_URL}/jogos`);
  return res.json();
}

// Registrar histórico de odds
async function registrarHistorico(jogoId, odds) {
  const timestamp = new Date().toISOString();
  for (const casa in odds) {
    const data = {
      jogoId,
      casa,
      casa_valor: odds[casa].casa,
      empate_valor: odds[casa].empate,
      fora_valor: odds[casa].fora,
      data: timestamp
    };
    await fetch(`${API_URL}/historico_odds`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
  }
}

// Popular select de esportes
async function populateEsportes() {
  esportesData = await fetchEsportes();
  elements.esporteSelect.innerHTML = '<option value="">Selecione Esporte</option>';
  esportesData.forEach(e => {
    const option = document.createElement('option');
    option.value = e.id;
    option.textContent = e.nome;
    elements.esporteSelect.appendChild(option);
  });
}

// Popular select de competições
function populateCompeticoes(esporteId) {
  elements.competicaoSelect.innerHTML = '<option value="">Selecione Competição</option>';
  elements.competicaoSelect.disabled = !esporteId;
  if (!esporteId) return;
  competicoesData
    .filter(c => c.esporte === esporteId)
    .forEach(c => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.nome;
      elements.competicaoSelect.appendChild(option);
    });
}

// Mostrar/ocultar empate
function toggleEmpateFields(esporteId) {
  const show = esportesData.find(e => e.id === esporteId)?.colunas.includes('empate');
  elements.empateInputs.forEach(input => {
    input.style.display = show ? 'block' : 'none';
    input.required = show;
    if (!show) input.value = '';
  });
  // ajusta colunas na tabela
  document.querySelectorAll('th:nth-child(5), th:nth-child(8), th:nth-child(11)').forEach(th => th.style.display = show ? 'table-cell' : 'none');
  document.querySelectorAll('td:nth-child(5), td:nth-child(8), td:nth-child(11)').forEach(td => td.style.display = show ? 'table-cell' : 'none');
}

// Renderizar tabela
function renderTable(jogos) {
  const tbody = document.getElementById('jogos-table');
  tbody.innerHTML = '';
  jogos.forEach(j => {
    const e = esportesData.find(x => x.id === j.esporte);
    const c = competicoesData.find(x => x.id === j.competicao);
    const show = e?.colunas.includes('empate');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${j.time_casa} x ${j.time_fora}</td>
      <td>${c?.nome || '-'}</td>
      <td>${e?.nome || '-'}</td>
      <td><input data-id="${j.id}" data-book="bet365" data-type="casa" value="${j.odds.bet365.casa}"></td>
      <td style="display:${show?'table-cell':'none'}"><input data-id="${j.id}" data-book="bet365" data-type="empate" value="${j.odds.bet365.empate||''}"></td>
      <td><input data-id="${j.id}" data-book="bet365" data-type="fora" value="${j.odds.bet365.fora}"></td>
      <td><input data-id="${j.id}" data-book="betano" data-type="casa" value="${j.odds.betano.casa}"></td>
      <td style="display:${show?'table-cell':'none'}"><input data-id="${j.id}" data-book="betano" data-type="empate" value="${j.odds.betano.empate||''}"></td>
      <td><input data-id="${j.id}" data-book="betano" data-type="fora" value="${j.odds.betano.fora}"></td>
      <td><input data-id="${j.id}" data-book="betfair" data-type="casa" value="${j.odds.betfair.casa}"></td>
      <td style="display:${show?'table-cell':'none'}"><input data-id="${j.id}" data-book="betfair" data-type="empate" value="${j.odds.betfair.empate||''}"></td>
      <td><input data-id="${j.id}" data-book="betfair" data-type="fora" value="${j.odds.betfair.fora}"></td>
      <td>
        <button class="save-btn" data-id="${j.id}">Salvar</button>
        <button class="delete-btn" data-id="${j.id}">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });
  // listeners
  tbody.querySelectorAll('.save-btn').forEach(b=>b.onclick=()=> updateOdds(b.dataset.id));
  tbody.querySelectorAll('.delete-btn').forEach(b=>b.onclick=()=> deleteGame(b.dataset.id));
}

// Atualizar odds e registrar histórico
async function updateOdds(id) {
  const inputs = document.querySelectorAll(`input[data-id="${id}"]`);
  const jogo = (await fetchJogos()).find(j=>j.id===id);
  const show = esportesData.find(e=>e.id===jogo.esporte).colunas.includes('empate');
  const odds = {bet365:{},betano:{},betfair:{}};
  inputs.forEach(i=>{
    const {book,type} = i.dataset;
    if(type==='empate' && !show) return;
    odds[book][type] = parseFloat(i.value)||0;
  });
  // PATCH odds
  await fetch(`${API_URL}/jogos/${id}`,{
    method:'PATCH',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({odds})
  });
  // registra histórico
  await registrarHistorico(id, odds);
  alert('Odds atualizadas e histórico registrado!');
  loadData();
}

// Excluir jogo
async function deleteGame(id){ if(!confirm('Confirmar exclusão?'))return; await fetch(`${API_URL}/jogos/${id}`,{method:'DELETE'}); alert('Excluído!'); loadData(); }

// Adicionar novo jogo
elements.form.addEventListener('submit',async e=>{
  e.preventDefault();
  const esporteId = elements.esporteSelect.value;
  const show = esportesData.find(e=>e.id===esporteId).colunas.includes('empate');
  const novo = {
    time_casa:elements.form.time_casa.value,
    time_fora:elements.form.time_fora.value,
    horario:elements.form.horario.value,
    competicao:elements.form.competicao.value,
    esporte:esporteId,
    odds:{
      bet365:{casa:parseFloat(elements.form.bet365_casa.value),fora:parseFloat(elements.form.bet365_fora.value),empate:show?parseFloat(elements.form.bet365_empate.value):undefined,atualizado:new Date().toISOString()},
      betano:{casa:parseFloat(elements.form.betano_casa.value),fora:parseFloat(elements.form.betano_fora.value),empate:show?parseFloat(elements.form.betano_empate.value):undefined,atualizado:new Date().toISOString()},
      betfair:{casa:parseFloat(elements.form.betfair_casa.value),fora:parseFloat(elements.form.betfair_fora.value),empate:show?parseFloat(elements.form.betfair_empate.value):undefined,atualizado:new Date().toISOString()}
    }
  };
  await fetch(`${API_URL}/jogos`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(novo)});
  alert('Jogo adicionado!'); elements.form.reset(); loadData();
});

// Listeners
elements.esporteSelect.addEventListener('change',()=>{populateCompeticoes(elements.esporteSelect.value); toggleEmpateFields(elements.esporteSelect.value);} );

// Carregar dados iniciais
async function loadData(){
  [esportesData,competicoesData]=await Promise.all([fetchEsportes(),fetchCompeticoes()]);
  await populateEsportes();
  const jogos=await fetchJogos();
  renderTable(jogos);
}

document.addEventListener('DOMContentLoaded',loadData);a
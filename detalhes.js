const API_URL = 'https://33765672-f51d-46f5-b276-32beaed4448a-00-3qd9ymtpuc1xv.worf.replit.dev:3000';
let jogoId = new URLSearchParams(window.location.search).get('id');
let jogoData = null;
let votosData = [];
let oddsHistory = [];

async function initDetalhes() {
  if (!jogoId) {
    try {
      const jogosRes = await fetch(`${API_URL}/jogos`);
      const jogos = await jogosRes.json();
      if (!jogos.length) {
        showError("Nenhum jogo disponível.");
        return;
      }
      jogoId = jogos[0].id;
      history.replaceState(null, '', `?id=${jogoId}`);
    } catch (err) {
      console.error('Erro ao buscar jogos:', err);
      showError("Erro ao carregar jogos.");
      return;
    }
  }
  await carregarJogo();
}

function showError(message) {
  document.getElementById('jogo').innerHTML = `
    <div class="error-message">
      <p>${message}</p>
      <button onclick="window.location.reload()">Recarregar</button>
    </div>
  `;
}

async function carregarJogo() {
  try {
    const jogoRes = await fetch(`${API_URL}/jogos/${jogoId}`);
    if (!jogoRes.ok) throw new Error('Jogo não encontrado');
    jogoData = await jogoRes.json();

    const compRes = await fetch(`${API_URL}/competicoes`);
    const competicoes = await compRes.json();
    const nomeCompeticao = competicoes.find(c => c.id === jogoData.competicao)?.nome || 'Competição desconhecida';

    const dataHora = new Date(jogoData.horario);
    const dataFormatada = dataHora.toLocaleDateString('pt-BR');
    const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    renderizarJogo(jogoData, nomeCompeticao, dataFormatada, horaFormatada);

    await Promise.all([
      carregarHistoricoOdds(),
      carregarVotos(),
      carregarComentarios()
    ]);

  } catch (error) {
    console.error('Erro ao carregar dados do jogo:', error);
    showError("Erro ao carregar dados do jogo.");
  }
}

function renderizarJogo(jogo, competicao, data, hora) {
  const user = JSON.parse(localStorage.getItem('user'));
  const isGuest = user && user.guest;

  let minOdds = {
    casa: { value: Infinity, book: '' },
    empate: { value: Infinity, book: '' },
    fora: { value: Infinity, book: '' }
  };

  Object.entries(jogo.odds).forEach(([book, odds]) => {
    if (odds.casa < minOdds.casa.value) {
      minOdds.casa.value = odds.casa;
      minOdds.casa.book = book;
    }
    if (odds.empate && odds.empate < minOdds.empate.value) {
      minOdds.empate.value = odds.empate;
      minOdds.empate.book = book;
    }
    if (odds.fora < minOdds.fora.value) {
      minOdds.fora.value = odds.fora;
      minOdds.fora.book = book;
    }
  });

  document.getElementById('jogo').innerHTML = `
    <div class="estadio">Estádio: ${jogo.local || '-'}</div>
    <div class="partida">
      ${jogo.time_casa} <br> X <br> ${jogo.time_fora}
      <span class="favorite-icon-detail" data-id="${jogo.id}" style="color: ${isFavorito(jogo.id) ? 'gold' : 'white'}">
        ${isFavorito(jogo.id) ? '★' : '☆'}
      </span>
    </div>
    <div class="data">${data} - ${hora}</div>
    <div class="campeonato">${competicao}</div>
    
    <div class="odds-container">
      <div class="odds-header">Comparação de Odds</div>
      <div class="odds-grid">
        ${Object.entries(jogo.odds).map(([book, vals]) => `
          <div class="odds-card">
            <h3>${book}</h3>
            <div class="odds-value ${minOdds.casa.book === book ? 'trend-up' : ''}">
              ${jogo.time_casa}: ${vals.casa}
              ${minOdds.casa.book === book ? '<span class="odds-difference positive">(Melhor)</span>' : ''}
            </div>
            ${'empate' in vals ? `
              <div class="odds-value ${minOdds.empate.book === book ? 'trend-up' : ''}">
                Empate: ${vals.empate}
                ${minOdds.empate.book === book ? '<span class="odds-difference positive">(Melhor)</span>' : ''}
              </div>
            ` : ''}
            <div class="odds-value ${minOdds.fora.book === book ? 'trend-up' : ''}">
              ${jogo.time_fora}: ${vals.fora}
              ${minOdds.fora.book === book ? '<span class="odds-difference positive">(Melhor)</span>' : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="votacao">
      <h2>Votação</h2>
      ${isGuest ? `
        <div class="guest-notice">
          <p>Faça login para participar da votação</p>
          <button class="login-redirect" onclick="window.location.href='login.html'">
            Fazer Login
          </button>
        </div>
      ` : `
        <p>Quem vai ganhar?</p>
        <div class="votacao-options">
          <div class="votacao-option" data-value="${jogo.time_casa}">
            <h3>${jogo.time_casa}</h3>
            <p id="votosCasa">-</p>
          </div>
          <div class="votacao-option" data-value="Empate">
            <h3>Empate</h3>
            <p id="votosEmpate">-</p>
          </div>
          <div class="v极
otacao-option" data-value="${jogo.time_fora}">
            <h3>${jogo.time_fora}</h3>
            <p id="votosFora">-</p>
          </div>
        </div>
        <button id="botaoVotar">Votar</button>
        <div class="votacao-results">
          <h3>Resultado Parcial</h3>
          <div id="resultadosBarras"></极
div>
        </div>
      `}
    </div>
    
    <div class="comentarios">
      <h2>Comentários</h2>
      ${isGuest ? `
        <div class="guest-notice">
          <p>Faça login para comentar</p>
          <button class="login-redirect" onclick="window.location.href='login.html'">
            Fazer Login
          </button>
        </div>
      ` : `
        <div class="comentarios-form">
          <textarea id="comentarioTexto" placeholder="Escreva seu comentário..." required></textarea>
          <br>
          <button id="enviarComentario">Enviar Comentário</button>
        </div>
      `}
      <div id="listaComentarios"></div>
    </div>
    
    <div class="historico-odds">
      <h2>Histórico de Odds</h2>
      <div class="resumo-odds" id="resumoOdds"></div>
      <div class="historico-tabela-container">
        <table class="historico-tabela">
          <thead>
            <tr>
              <th>Casa de Aposta</th>
              <th>${jogo.time_casa}</th>
              <th>Empate</th>
              <th>${jogo.time_fora}</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody id="tabelaHistorico"></tbody>
        </table>
      </div>
    </div>
  `;

  if (!isGuest) {
    document.querySelectorAll('.votacao-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.votacao-option').forEach(opt => 
          opt.classList.remove('selected')
        );
        option.classList.add('selected');
      });
    });

    document.getElementById('botaoVotar').addEventListener('click', votar);
    document.getElementById('enviarComentario').addEventListener('click', enviarComentario);
  }

  // Adicionar evento ao ícone de favorito
  const favoriteIcon = document.querySelector('.favorite-icon-detail');
  if (favoriteIcon) {
    favoriteIcon.addEventListener('click', function() {
      const jogoId = this.dataset.id;
      const favoritado = toggleFavorito(jogoId);
      
      this.textContent = favoritado ? '★' : '☆';
      this.style.color = favoritado ? 'gold' : 'white';
      
      alert(favoritado ? 'Adicionado aos favoritos!' : 'Removido dos favoritos!');
    });
  }

  // Carregar dados que não dependem de login
  carregarHistoricoOdds();
  carregarVotos();
  carregarComentarios();
}

async function carregarHistoricoOdds() {
  try {
    const res = await fetch(`${API_URL}/historico_odds?jogoId=${jogoId}`);
    oddsHistory = await res.json();
    renderizarHistoricoOdds();
  } catch (err) {
    console.error('Erro ao carregar histórico:', err);
    document.querySelector('.historico-odds').innerHTML += `
      <p style="color:white;text-align:center;">Erro ao carregar histórico de odds.</p>
    `;
  }
}

function renderizarHistoricoOdds() {
  if (!oddsHistory.length) {
    document.querySelector('.historico-odds').innerHTML += `
      <p style="color:white;text-align:center;">Nenhum histórico disponível.</p>
    `;
    return;
  }

  const casas = oddsHistory.map(i => i.casa_valor);
  const empates = oddsHistory.filter(i => i.empate_valor !== undefined).map(i => i.empate_valor);
  const foras = oddsHistory.map(i => i.fora_valor);

  const maiorCasa = Math.max(...casas);
  const menorCasa = Math.min(...casas);
  const maiorEmpate = empates.length ? Math.max(...empates) : '-';
  const menorEmpate = empates.length ? Math.min(...empates) : '-';
  const maiorFora = Math.max(...foras);
  const menorFora = Math.min(...foras);

  document.getElementById('resumoOdds').innerHTML = `
    <div class="resumo-card">
      <h3>${jogoData.time_casa}</h3>
      <p>Maior: ${maiorCasa}</p>
      <p>Menor: ${menorCasa}</p>
      <p>Variação: ${(maiorCasa - menorCasa).toFixed(2)}</p>
    </div>
    <div class="resumo-card">
      <h3>Empate</h3>
      <p>Maior: ${maiorEmpate}</p>
      <p>Menor: ${menorEmpate}</p>
      <p>Variação: ${maiorEmpate !== '-' ? (maiorEmpate - menorEmpate).toFixed(2) : '-'}</p>
    </div>
    <div class="resumo-card">
      <h3>${jogoData.time_fora}</h3>
      <p>Maior: ${maiorFora}</p>
      <p>Menor: ${menorFora}</p>
      <p>Variação: ${(maiorFora - menorFora).toFixed(2)}</p>
    </div>
  `;

  const tabelaBody = document.getElementById('tabelaHistorico');
  tabelaBody.innerHTML = '';
  
  oddsHistory.forEach(item => {
    const dataItem = new Date(item.data);
    const linha = document.createElement('tr');
    
    linha.innerHTML = `
      <td>${item.casa}</td>
      <td>${item.casa_valor}</td>
      <td>${item.empate_valor !== undefined ? item.empate_valor : '-'}</td>
      <td>${item.fora_valor}</td>
      <td>${dataItem.toLocaleString('pt-BR')}</td>
    `;
    
    tabelaBody.appendChild(linha);
  });
}

async function carregarVotos() {
  try {
    const res = await fetch(`${API_URL}/votos?jogoId=${jogoId}`);
    votosData = await res.json();
    atualizarVotacao();
  } catch (err) {
    console.error('Erro ao carregar votos:', err);
  }
}

function atualizarVotacao() {
  const contagem = {
    [jogoData.time_casa]: 0,
    'Empate': 0,
    [jogoData.time_fora]: 0
  };

  votosData.forEach(voto => {
    if (voto.resultado) {
      contagem[voto.resultado] = (contagem[voto.resultado] || 0) + 1;
    }
  });

  const totalVotos = votosData.filter(v => v.resultado).length;
  
  if (document.getElementById('votosCasa')) {
    document.getElementById('votosCasa').textContent = `${contagem[jogoData.time_casa]} voto(s)`;
    document.getElementById('votosEmpate').textContent = `${contagem['Empate']} voto(s)`;
    document.getElementById('votosFora').textContent = `${contagem[jogoData.time_fora]} voto(s)`;
  }
  
  if (document.getElementById('resultadosBarras')) {
    const resultadosHTML = Object.entries(contagem)
      .map(([opcao, quantidade]) => {
        const percentual = totalVotos > 0 ? (quantidade / totalVotos * 100) : 0;
        return `
          <div class="result-item">
            <div>${opcao}</div>
            <div class="result-bar">
              <div class="result-fill" style="width: ${percentual}%"></div>
              <div class="result-label">${quantidade} votos</div>
              <div class="result-percentage">${percentual.toFixed(1)}%</div>
            </div>
          </div>
        `;
      })
      .join('');
    
    document.getElementById('resultadosBarras').innerHTML = resultadosHTML;
  }
}

async function votar() {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user || user.guest) {
    alert('Faça login para votar');
    return;
  }
  
  const opcaoSelecionada = document.querySelector('.votacao-option.selected');
  
  if (!opcaoSelecionada) {
    alert('Por favor, selecione uma opção antes de votar.');
    return;
  }
  
  const resultado = opcaoSelecionada.dataset.value;
  
  try {
    await fetch(`${API_URL}/votos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jogoId: jogoData.id,
        resultado: resultado
      })
    });
    
    await carregarVotos();
    alert('Seu voto foi registrado com sucesso!');
    
  } catch (err) {
    console.error('Erro ao registrar voto:', err);
    alert('Erro ao registrar seu voto. Tente novamente.');
  }
}

async function carregarComentarios() {
  try {
    const res = await fetch(`${API_URL}/comentarios?jogoId=${jogoId}`);
    const comentarios = await res.json();
    renderizarComentarios(comentarios);
  } catch (err) {
    console.error('Erro ao carregar comentários:', err);
  }
}

function renderizarComentarios(comentarios) {
  const lista = document.getElementById('listaComentarios');
  
  if (!comentarios.length) {
    lista.innerHTML = '<p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>';
    return;
  }
  
  lista.innerHTML = comentarios
    .filter(c => c.jogoId === jogoId)
    .map(comentario => {
      // Usar o nome do usuário se estiver disponível, senão usar o autor
      let autor = comentario.userName || comentario.autor || "Usuário Anônimo";
      
      // Se for um email, pegar a parte antes do @
      if (autor.includes('@')) {
        autor = autor.split('@')[0];
      }
      
      // Capitalizar primeira letra
      autor = autor.charAt(0).toUpperCase() + autor.slice(1);
      
      const texto = comentario.mensagem || comentario.texto || "";
      let dataComentario;
      
      try {
        dataComentario = comentario.data || comentario.date ? new Date(comentario.data || comentario.date) : new Date();
      } catch (e) {
        dataComentario = new Date();
      }
      
      return `
        <div class="comentario-item">
          <div class="comentario-header">
            <span>${autor}</span>
            <span>${dataComentario.toLocaleString('pt-BR')}</span>
          </div>
          <div class="comentario-texto">${texto}</div>
        </div>
      `;
    })
    .join('');
}

async function enviarComentario() {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user || user.guest) {
    alert('Faça login para comentar');
    return;
  }
  
  const texto = document.getElementById('comentarioTexto').value.trim();
  
  if (!texto) {
    alert('Por favor, escreva um comentário antes de enviar.');
    return;
  }
  
  try {
    // Usar o nome do usuário se estiver disponível, senão usar o email
    const autor = user.nome || user.email;
    const dataComentario = new Date().toISOString();
    
    await fetch(`${API_URL}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        jogoId: jogoData.id, 
        texto: texto,
        autor: autor,
        data: dataComentario
      })
    });
    
    document.getElementById('comentarioTexto').value = '';
    await carregarComentarios();
    
    alert('Comentário enviado com sucesso!');
    
  } catch (err) {
    console.error('Erro ao enviar comentário:', err);
    alert('Erro ao enviar seu comentário. Tente novamente.');
  }
}

initDetalhes();
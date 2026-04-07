const state = {
  moradores: [],
  visitantes: [],
  encomendas: [],
};

const elements = {
  healthStatus: document.getElementById('health-status'),
  statusDot: document.querySelector('.status-dot'),
  toast: document.getElementById('toast'),
  moradoresList: document.getElementById('moradores-list'),
  visitantesList: document.getElementById('visitantes-list'),
  encomendasList: document.getElementById('encomendas-list'),
  visitanteMorador: document.getElementById('visitante-morador'),
  encomendaMorador: document.getElementById('encomenda-morador'),
  moradorForm: document.getElementById('morador-form'),
  visitanteForm: document.getElementById('visitante-form'),
  encomendaForm: document.getElementById('encomenda-form'),
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao processar solicitacao.');
  }

  return response.status === 204 ? null : response.json();
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.style.background = isError ? '#a43b29' : '#2d241c';
  elements.toast.classList.remove('hidden');

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 2800);
}

function formatDate(value) {
  return new Date(value).toLocaleString('pt-BR');
}

function renderMoradores() {
  if (!state.moradores.length) {
    elements.moradoresList.innerHTML =
      '<tr><td colspan="3" class="empty-state">Nenhum morador cadastrado.</td></tr>';
    return;
  }

  elements.moradoresList.innerHTML = state.moradores
    .map(
      (morador) => `
        <tr>
          <td>${morador.nome}</td>
          <td>${morador.apartamento}</td>
          <td>${morador.telefone}</td>
        </tr>
      `
    )
    .join('');
}

function renderVisitantes() {
  if (!state.visitantes.length) {
    elements.visitantesList.innerHTML =
      '<tr><td colspan="4" class="empty-state">Nenhum visitante registrado.</td></tr>';
    return;
  }

  elements.visitantesList.innerHTML = state.visitantes
    .map(
      (visitante) => `
        <tr>
          <td>${visitante.nome}</td>
          <td>${visitante.documento}</td>
          <td>${visitante.morador_nome || 'Nao informado'}${visitante.apartamento ? ` - Ap ${visitante.apartamento}` : ''}</td>
          <td>${formatDate(visitante.data_entrada)}</td>
        </tr>
      `
    )
    .join('');
}

function renderEncomendas() {
  if (!state.encomendas.length) {
    elements.encomendasList.innerHTML =
      '<tr><td colspan="5" class="empty-state">Nenhuma encomenda cadastrada.</td></tr>';
    return;
  }

  elements.encomendasList.innerHTML = state.encomendas
    .map(
      (encomenda) => `
        <tr>
          <td>${encomenda.descricao}</td>
          <td>${encomenda.morador_nome || 'Nao informado'}</td>
          <td>${encomenda.apartamento || '-'}</td>
          <td>${encomenda.status}</td>
          <td>
            <select class="status-select" data-id="${encomenda.id}">
              <option value="pendente" ${encomenda.status === 'pendente' ? 'selected' : ''}>Pendente</option>
              <option value="recebida" ${encomenda.status === 'recebida' ? 'selected' : ''}>Recebida</option>
              <option value="retirada" ${encomenda.status === 'retirada' ? 'selected' : ''}>Retirada</option>
            </select>
          </td>
        </tr>
      `
    )
    .join('');

  document.querySelectorAll('.status-select').forEach((select) => {
    select.addEventListener('change', async (event) => {
      try {
        await request(`/api/encomendas/${event.target.dataset.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: event.target.value }),
        });
        await loadEncomendas();
        showToast('Status da encomenda atualizado.');
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });
}

function updateMoradorOptions() {
  const defaultOption = '<option value="">Selecione o morador</option>';
  const options = state.moradores
    .map(
      (morador) =>
        `<option value="${morador.id}">${morador.nome} - Ap ${morador.apartamento}</option>`
    )
    .join('');

  elements.visitanteMorador.innerHTML = defaultOption + options;
  elements.encomendaMorador.innerHTML = defaultOption + options;
}

async function loadHealth() {
  try {
    const health = await request('/api/health');
    elements.healthStatus.textContent = health.message || 'Aplicacao ativa.';
    elements.statusDot.classList.add('online');
    elements.statusDot.classList.remove('offline');
  } catch (error) {
    elements.healthStatus.textContent =
      error.message || 'Falha ao verificar o status da aplicacao.';
    elements.statusDot.classList.add('offline');
    elements.statusDot.classList.remove('online');
  }
}

async function loadMoradores() {
  state.moradores = await request('/api/moradores');
  renderMoradores();
  updateMoradorOptions();
}

async function loadVisitantes() {
  state.visitantes = await request('/api/visitantes');
  renderVisitantes();
}

async function loadEncomendas() {
  state.encomendas = await request('/api/encomendas');
  renderEncomendas();
}

async function bootstrap() {
  await loadHealth();

  try {
    await Promise.all([loadMoradores(), loadVisitantes(), loadEncomendas()]);
  } catch (error) {
    showToast(error.message, true);
  }
}

elements.moradorForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);

  try {
    await request('/api/moradores', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    event.target.reset();
    await loadMoradores();
    showToast('Morador cadastrado com sucesso.');
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.visitanteForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());

  try {
    await request('/api/visitantes', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        autorizado_por: Number(payload.autorizado_por),
      }),
    });
    event.target.reset();
    await loadVisitantes();
    showToast('Visitante registrado com sucesso.');
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.encomendaForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());

  try {
    await request('/api/encomendas', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        morador_id: Number(payload.morador_id),
      }),
    });
    event.target.reset();
    await loadEncomendas();
    showToast('Encomenda cadastrada com sucesso.');
  } catch (error) {
    showToast(error.message, true);
  }
});

bootstrap();

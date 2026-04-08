const state = {
  moradores: [],
  visitantes: [],
  encomendas: [],
  editing: {
    moradores: null,
    visitantes: null,
    encomendas: null,
  },
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
  fotoRecebidaStatus: document.getElementById('foto-recebida-status'),
  fotoRetiradaStatus: document.getElementById('foto-retirada-status'),
  imageModal: document.getElementById('image-modal'),
  imageModalPreview: document.getElementById('image-modal-preview'),
  imageModalClose: document.getElementById('image-modal-close'),
};

const formConfigs = {
  moradores: {
    form: elements.moradorForm,
    submitLabel: 'Cadastrar morador',
    updateLabel: 'Salvar morador',
  },
  visitantes: {
    form: elements.visitanteForm,
    submitLabel: 'Registrar visitante',
    updateLabel: 'Salvar visitante',
  },
  encomendas: {
    form: elements.encomendaForm,
    submitLabel: 'Cadastrar encomenda',
    updateLabel: 'Salvar encomenda',
  },
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setFormMode(key, item = null) {
  state.editing[key] = item;
  const config = formConfigs[key];
  const submitButton = config.form.querySelector('[data-submit-label]');
  const cancelButton = config.form.querySelector('[data-cancel-button]');

  submitButton.textContent = item ? config.updateLabel : config.submitLabel;
  cancelButton.classList.toggle('hidden', !item);
}

function resetForm(key) {
  const config = formConfigs[key];
  config.form.reset();
  config.form.elements.id.value = '';
  setFormMode(key, null);

  if (key === 'encomendas') {
    updatePhotoStatus();
  }
}

function createActionButtons(type, id) {
  return `
    <div class="action-group">
      <button type="button" class="table-button" data-action="edit-${type}" data-id="${id}">Editar</button>
      <button type="button" class="table-button danger-button" data-action="delete-${type}" data-id="${id}">Excluir</button>
    </div>
  `;
}

function createPhotoButton(type, id, exists) {
  if (!exists) {
    return '<span class="photo-empty">Sem foto</span>';
  }

  return `<button type="button" class="table-button" data-action="view-${type}" data-id="${id}">Ver foto</button>`;
}

function updatePhotoStatus() {
  const editing = state.editing.encomendas;
  const recebidaInput = elements.encomendaForm.elements.foto_recebida_arquivo;
  const retiradaInput = elements.encomendaForm.elements.foto_retirada_arquivo;

  const recebidaText = recebidaInput.files[0]
    ? `Nova foto de recebimento: ${recebidaInput.files[0].name}`
    : editing?.foto_recebida
      ? 'Foto de recebimento atual salva.'
      : 'Sem foto de recebimento selecionada.';

  const retiradaText = retiradaInput.files[0]
    ? `Nova foto de retirada: ${retiradaInput.files[0].name}`
    : editing?.foto_retirada
      ? 'Foto de retirada atual salva.'
      : 'Sem foto de retirada selecionada.';

  elements.fotoRecebidaStatus.textContent = recebidaText;
  elements.fotoRetiradaStatus.textContent = retiradaText;
}

function openImageModal(src) {
  elements.imageModalPreview.src = src;
  elements.imageModal.classList.remove('hidden');
}

function closeImageModal() {
  elements.imageModalPreview.src = '';
  elements.imageModal.classList.add('hidden');
}

async function fileToDataUrl(file) {
  if (!file) {
    return null;
  }

  const maxFileSize = 4 * 1024 * 1024;
  if (file.size > maxFileSize) {
    throw new Error('A imagem precisa ter no maximo 4 MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

function renderMoradores() {
  if (!state.moradores.length) {
    elements.moradoresList.innerHTML =
      '<tr><td colspan="4" class="empty-state">Nenhum morador cadastrado.</td></tr>';
    return;
  }

  elements.moradoresList.innerHTML = state.moradores
    .map(
      (morador) => `
        <tr>
          <td data-label="Nome">${escapeHtml(morador.nome)}</td>
          <td data-label="Apartamento">${escapeHtml(morador.apartamento)}</td>
          <td data-label="Telefone">${escapeHtml(morador.telefone)}</td>
          <td data-label="Acoes">${createActionButtons('morador', morador.id)}</td>
        </tr>
      `
    )
    .join('');
  bindRowActions();
}

function renderVisitantes() {
  if (!state.visitantes.length) {
    elements.visitantesList.innerHTML =
      '<tr><td colspan="5" class="empty-state">Nenhum visitante registrado.</td></tr>';
    return;
  }

  elements.visitantesList.innerHTML = state.visitantes
    .map(
      (visitante) => `
        <tr>
          <td data-label="Visitante">${escapeHtml(visitante.nome)}</td>
          <td data-label="Documento">${escapeHtml(visitante.documento)}</td>
          <td data-label="Autorizado por">${escapeHtml(visitante.morador_nome || 'Nao informado')}${visitante.apartamento ? ` - Ap ${escapeHtml(visitante.apartamento)}` : ''}</td>
          <td data-label="Entrada">${formatDate(visitante.data_entrada)}</td>
          <td data-label="Acoes">${createActionButtons('visitante', visitante.id)}</td>
        </tr>
      `
    )
    .join('');
  bindRowActions();
}

function renderEncomendas() {
  if (!state.encomendas.length) {
    elements.encomendasList.innerHTML =
      '<tr><td colspan="7" class="empty-state">Nenhuma encomenda cadastrada.</td></tr>';
    return;
  }

  elements.encomendasList.innerHTML = state.encomendas
    .map(
      (encomenda) => `
        <tr>
          <td data-label="Descricao">${escapeHtml(encomenda.descricao)}</td>
          <td data-label="Morador">${escapeHtml(encomenda.morador_nome || 'Nao informado')}</td>
          <td data-label="Apartamento">${escapeHtml(encomenda.apartamento || '-')}</td>
          <td data-label="Status">
            <select class="status-select" data-id="${encomenda.id}">
              <option value="pendente" ${encomenda.status === 'pendente' ? 'selected' : ''}>Pendente</option>
              <option value="recebida" ${encomenda.status === 'recebida' ? 'selected' : ''}>Recebida</option>
              <option value="retirada" ${encomenda.status === 'retirada' ? 'selected' : ''}>Retirada</option>
            </select>
          </td>
          <td data-label="Foto recebida">${createPhotoButton('foto-recebida', encomenda.id, Boolean(encomenda.foto_recebida))}</td>
          <td data-label="Foto retirada">${createPhotoButton('foto-retirada', encomenda.id, Boolean(encomenda.foto_retirada))}</td>
          <td data-label="Acoes">${createActionButtons('encomenda', encomenda.id)}</td>
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

  bindRowActions();
}

function bindRowActions() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.onclick = async () => {
      const { action, id } = button.dataset;
      const itemId = Number(id);

      if (action === 'edit-morador') {
        const morador = state.moradores.find((item) => item.id === itemId);
        if (!morador) return;
        elements.moradorForm.elements.id.value = morador.id;
        elements.moradorForm.elements.nome.value = morador.nome;
        elements.moradorForm.elements.apartamento.value = morador.apartamento;
        elements.moradorForm.elements.telefone.value = morador.telefone;
        setFormMode('moradores', morador);
        return;
      }

      if (action === 'delete-morador') {
        if (!window.confirm('Deseja excluir este morador?')) return;
        try {
          await request(`/api/moradores/${itemId}`, { method: 'DELETE' });
          await refreshAll();
          showToast('Morador excluido com sucesso.');
        } catch (error) {
          showToast(error.message, true);
        }
        return;
      }

      if (action === 'edit-visitante') {
        const visitante = state.visitantes.find((item) => item.id === itemId);
        if (!visitante) return;
        elements.visitanteForm.elements.id.value = visitante.id;
        elements.visitanteForm.elements.nome.value = visitante.nome;
        elements.visitanteForm.elements.documento.value = visitante.documento;
        elements.visitanteForm.elements.autorizado_por.value = String(visitante.autorizado_por);
        setFormMode('visitantes', visitante);
        return;
      }

      if (action === 'delete-visitante') {
        if (!window.confirm('Deseja excluir este visitante?')) return;
        try {
          await request(`/api/visitantes/${itemId}`, { method: 'DELETE' });
          await refreshAll();
          showToast('Visitante excluido com sucesso.');
        } catch (error) {
          showToast(error.message, true);
        }
        return;
      }

      if (action === 'edit-encomenda') {
        const encomenda = state.encomendas.find((item) => item.id === itemId);
        if (!encomenda) return;
        elements.encomendaForm.elements.id.value = encomenda.id;
        elements.encomendaForm.elements.descricao.value = encomenda.descricao;
        elements.encomendaForm.elements.morador_id.value = String(encomenda.morador_id);
        elements.encomendaForm.elements.status.value = encomenda.status;
        setFormMode('encomendas', encomenda);
        updatePhotoStatus();
        return;
      }

      if (action === 'view-foto-recebida') {
        const encomenda = state.encomendas.find((item) => item.id === itemId);
        if (encomenda?.foto_recebida) {
          openImageModal(encomenda.foto_recebida);
        }
        return;
      }

      if (action === 'view-foto-retirada') {
        const encomenda = state.encomendas.find((item) => item.id === itemId);
        if (encomenda?.foto_retirada) {
          openImageModal(encomenda.foto_retirada);
        }
        return;
      }

      if (action === 'delete-encomenda') {
        if (!window.confirm('Deseja excluir esta encomenda?')) return;
        try {
          await request(`/api/encomendas/${itemId}`, { method: 'DELETE' });
          await refreshAll();
          showToast('Encomenda excluida com sucesso.');
        } catch (error) {
          showToast(error.message, true);
        }
      }
    };
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

async function refreshAll() {
  await Promise.all([loadMoradores(), loadVisitantes(), loadEncomendas()]);
}

async function bootstrap() {
  await loadHealth();

  try {
    await refreshAll();
  } catch (error) {
    showToast(error.message, true);
  }
}

elements.moradorForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());
  const editingId = payload.id;

  try {
    await request(editingId ? `/api/moradores/${editingId}` : '/api/moradores', {
      method: editingId ? 'PUT' : 'POST',
      body: JSON.stringify({
        nome: payload.nome,
        apartamento: payload.apartamento,
        telefone: payload.telefone,
      }),
    });
    resetForm('moradores');
    await refreshAll();
    showToast(editingId ? 'Morador atualizado com sucesso.' : 'Morador cadastrado com sucesso.');
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.visitanteForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());

  try {
    await request(payload.id ? `/api/visitantes/${payload.id}` : '/api/visitantes', {
      method: payload.id ? 'PUT' : 'POST',
      body: JSON.stringify({
        nome: payload.nome,
        documento: payload.documento,
        autorizado_por: Number(payload.autorizado_por),
      }),
    });
    resetForm('visitantes');
    await refreshAll();
    showToast(payload.id ? 'Visitante atualizado com sucesso.' : 'Visitante registrado com sucesso.');
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.encomendaForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());
  const editingItem = state.editing.encomendas;

  try {
    const fotoRecebida = await fileToDataUrl(
      elements.encomendaForm.elements.foto_recebida_arquivo.files[0]
    );
    const fotoRetirada = await fileToDataUrl(
      elements.encomendaForm.elements.foto_retirada_arquivo.files[0]
    );

    await request(payload.id ? `/api/encomendas/${payload.id}` : '/api/encomendas', {
      method: payload.id ? 'PUT' : 'POST',
      body: JSON.stringify({
        descricao: payload.descricao,
        morador_id: Number(payload.morador_id),
        status: payload.status,
        foto_recebida: fotoRecebida || editingItem?.foto_recebida || null,
        foto_retirada: fotoRetirada || editingItem?.foto_retirada || null,
      }),
    });
    resetForm('encomendas');
    await refreshAll();
    showToast(payload.id ? 'Encomenda atualizada com sucesso.' : 'Encomenda cadastrada com sucesso.');
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.encomendaForm.elements.foto_recebida_arquivo.addEventListener('change', updatePhotoStatus);
elements.encomendaForm.elements.foto_retirada_arquivo.addEventListener('change', updatePhotoStatus);
elements.imageModalClose.addEventListener('click', closeImageModal);
elements.imageModal.addEventListener('click', (event) => {
  if (event.target === elements.imageModal) {
    closeImageModal();
  }
});

Object.entries(formConfigs).forEach(([key, config]) => {
  config.form.querySelector('[data-cancel-button]').addEventListener('click', () => {
    resetForm(key);
  });
});

bootstrap();

const path = require('path');
const express = require('express');
const cors = require('cors');
const storage = require('./storage');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.use((error, req, res, next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Imagem muito grande. Envie uma foto menor.',
    });
  }

  if (error) {
    console.error('Erro na requisicao:', error);
    return res.status(500).json({ error: 'Erro interno ao processar a requisicao.' });
  }

  next();
});

app.get('/api/health', async (req, res) => {
  const status = await storage.healthCheck();
  res.status(status.ok ? 200 : 503).json(status);
});

app.get('/api/moradores', async (req, res) => {
  try {
    const moradores = await storage.listMoradores();
    res.json(moradores);
  } catch (error) {
    console.error('Erro ao buscar moradores:', error);
    res.status(500).json({ error: 'Erro ao buscar moradores.' });
  }
});

app.post('/api/moradores', async (req, res) => {
  const { nome, apartamento, telefone } = req.body;

  if (!nome || !apartamento || !telefone) {
    return res
      .status(400)
      .json({ error: 'Informe nome, apartamento e telefone.' });
  }

  try {
    const morador = await storage.createMorador({ nome, apartamento, telefone });
    res.status(201).json(morador);
  } catch (error) {
    console.error('Erro ao cadastrar morador:', error);
    res.status(500).json({ error: 'Erro ao cadastrar morador.' });
  }
});

app.put('/api/moradores/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, apartamento, telefone } = req.body;

  if (!nome || !apartamento || !telefone) {
    return res
      .status(400)
      .json({ error: 'Informe nome, apartamento e telefone.' });
  }

  try {
    const morador = await storage.updateMorador(Number(id), {
      nome,
      apartamento,
      telefone,
    });

    if (!morador) {
      return res.status(404).json({ error: 'Morador nao encontrado.' });
    }

    res.json(morador);
  } catch (error) {
    console.error('Erro ao atualizar morador:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar morador.' });
  }
});

app.delete('/api/moradores/:id', async (req, res) => {
  try {
    const deleted = await storage.deleteMorador(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Morador nao encontrado.' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir morador:', error);
    res.status(500).json({ error: error.message || 'Erro ao excluir morador.' });
  }
});

app.get('/api/visitantes', async (req, res) => {
  try {
    const visitantes = await storage.listVisitantes();
    res.json(visitantes);
  } catch (error) {
    console.error('Erro ao buscar visitantes:', error);
    res.status(500).json({ error: 'Erro ao buscar visitantes.' });
  }
});

app.post('/api/visitantes', async (req, res) => {
  const { nome, documento, autorizado_por } = req.body;

  if (!nome || !documento || !autorizado_por) {
    return res
      .status(400)
      .json({ error: 'Informe nome, documento e autorizado_por.' });
  }

  try {
    const visitante = await storage.createVisitante({
      nome,
      documento,
      autorizado_por: Number(autorizado_por),
    });
    res.status(201).json(visitante);
  } catch (error) {
    console.error('Erro ao cadastrar visitante:', error);
    res.status(500).json({ error: error.message || 'Erro ao cadastrar visitante.' });
  }
});

app.put('/api/visitantes/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, documento, autorizado_por } = req.body;

  if (!nome || !documento || !autorizado_por) {
    return res
      .status(400)
      .json({ error: 'Informe nome, documento e autorizado_por.' });
  }

  try {
    const visitante = await storage.updateVisitante(Number(id), {
      nome,
      documento,
      autorizado_por: Number(autorizado_por),
    });

    if (!visitante) {
      return res.status(404).json({ error: 'Visitante nao encontrado.' });
    }

    res.json(visitante);
  } catch (error) {
    console.error('Erro ao atualizar visitante:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar visitante.' });
  }
});

app.delete('/api/visitantes/:id', async (req, res) => {
  try {
    const deleted = await storage.deleteVisitante(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Visitante nao encontrado.' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir visitante:', error);
    res.status(500).json({ error: error.message || 'Erro ao excluir visitante.' });
  }
});

app.get('/api/encomendas', async (req, res) => {
  try {
    const encomendas = await storage.listEncomendas();
    res.json(encomendas);
  } catch (error) {
    console.error('Erro ao buscar encomendas:', error);
    res.status(500).json({ error: 'Erro ao buscar encomendas.' });
  }
});

app.post('/api/encomendas', async (req, res) => {
  const { descricao, morador_id, status, foto_recebida, foto_retirada } = req.body;

  if (!descricao || !morador_id) {
    return res
      .status(400)
      .json({ error: 'Informe descricao e morador_id.' });
  }

  try {
    const encomenda = await storage.createEncomenda({
      descricao,
      morador_id: Number(morador_id),
      status,
      foto_recebida,
      foto_retirada,
    });
    res.status(201).json(encomenda);
  } catch (error) {
    console.error('Erro ao cadastrar encomenda:', error);
    res.status(500).json({ error: error.message || 'Erro ao cadastrar encomenda.' });
  }
});

app.put('/api/encomendas/:id', async (req, res) => {
  const { id } = req.params;
  const { descricao, morador_id, status, foto_recebida, foto_retirada } = req.body;

  if (!descricao || !morador_id) {
    return res
      .status(400)
      .json({ error: 'Informe descricao e morador_id.' });
  }

  try {
    const encomenda = await storage.updateEncomenda(Number(id), {
      descricao,
      morador_id: Number(morador_id),
      status,
      foto_recebida,
      foto_retirada,
    });

    if (!encomenda) {
      return res.status(404).json({ error: 'Encomenda nao encontrada.' });
    }

    res.json(encomenda);
  } catch (error) {
    console.error('Erro ao atualizar encomenda:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar encomenda.' });
  }
});

app.delete('/api/encomendas/:id', async (req, res) => {
  try {
    const deleted = await storage.deleteEncomenda(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Encomenda nao encontrada.' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir encomenda:', error);
    res.status(500).json({ error: error.message || 'Erro ao excluir encomenda.' });
  }
});

app.patch('/api/encomendas/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Informe o novo status.' });
  }

  try {
    const encomenda = await storage.updateEncomendaStatus(Number(id), status);
    if (!encomenda) {
      return res.status(404).json({ error: 'Encomenda nao encontrada.' });
    }

    res.json(encomenda);
  } catch (error) {
    console.error('Erro ao atualizar encomenda:', error);
    res.status(500).json({ error: 'Erro ao atualizar encomenda.' });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

storage
  .initialize()
  .then(() => {
    app.listen(PORT, HOST, () => {
      const publicHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
      console.log(`Servidor rodando em http://${publicHost}:${PORT}`);
      console.log(`Escutando na interface ${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Falha ao inicializar o armazenamento:', error);
    process.exit(1);
  });

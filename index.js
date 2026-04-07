const path = require('path');
const express = require('express');
const cors = require('cors');
const storage = require('./storage');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
  const { descricao, morador_id, status } = req.body;

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
    });
    res.status(201).json(encomenda);
  } catch (error) {
    console.error('Erro ao cadastrar encomenda:', error);
    res.status(500).json({ error: error.message || 'Erro ao cadastrar encomenda.' });
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

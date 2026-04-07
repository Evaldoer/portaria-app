const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Erro ao validar conexao com o banco:', error);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/api/moradores', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, apartamento, telefone FROM moradores ORDER BY nome ASC'
    );
    res.json(result.rows);
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
    const result = await pool.query(
      `INSERT INTO moradores (nome, apartamento, telefone)
       VALUES ($1, $2, $3)
       RETURNING id, nome, apartamento, telefone`,
      [nome, apartamento, telefone]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao cadastrar morador:', error);
    res.status(500).json({ error: 'Erro ao cadastrar morador.' });
  }
});

app.get('/api/visitantes', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         visitantes.id,
         visitantes.nome,
         visitantes.documento,
         visitantes.autorizado_por,
         visitantes.data_entrada,
         moradores.nome AS morador_nome,
         moradores.apartamento
       FROM visitantes
       LEFT JOIN moradores ON moradores.id = visitantes.autorizado_por
       ORDER BY visitantes.data_entrada DESC`
    );

    res.json(result.rows);
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
    const result = await pool.query(
      `INSERT INTO visitantes (nome, documento, autorizado_por)
       VALUES ($1, $2, $3)
       RETURNING id, nome, documento, autorizado_por, data_entrada`,
      [nome, documento, autorizado_por]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao cadastrar visitante:', error);
    res.status(500).json({ error: 'Erro ao cadastrar visitante.' });
  }
});

app.get('/api/encomendas', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         encomendas.id,
         encomendas.descricao,
         encomendas.status,
         encomendas.morador_id,
         moradores.nome AS morador_nome,
         moradores.apartamento
       FROM encomendas
       LEFT JOIN moradores ON moradores.id = encomendas.morador_id
       ORDER BY encomendas.id DESC`
    );

    res.json(result.rows);
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
    const result = await pool.query(
      `INSERT INTO encomendas (descricao, morador_id, status)
       VALUES ($1, $2, COALESCE($3, 'pendente'))
       RETURNING id, descricao, morador_id, status`,
      [descricao, morador_id, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao cadastrar encomenda:', error);
    res.status(500).json({ error: 'Erro ao cadastrar encomenda.' });
  }
});

app.patch('/api/encomendas/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Informe o novo status.' });
  }

  try {
    const result = await pool.query(
      `UPDATE encomendas
       SET status = $1
       WHERE id = $2
       RETURNING id, descricao, morador_id, status`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Encomenda nao encontrada.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar encomenda:', error);
    res.status(500).json({ error: 'Erro ao atualizar encomenda.' });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

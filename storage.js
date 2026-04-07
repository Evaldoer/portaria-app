const fs = require('fs');
const os = require('os');
const path = require('path');
const pool = require('./db');

const schemaPath = path.join(__dirname, 'schema.sql');
const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel
  ? path.join(os.tmpdir(), 'portaria-app')
  : path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'local-db.json');

let mode = 'memory';
let lastDatabaseError = null;
let memoryData = createInitialData();

function createInitialData() {
  return {
    counters: {
      moradores: 0,
      visitantes: 0,
      encomendas: 0,
    },
    moradores: [],
    visitantes: [],
    encomendas: [],
  };
}

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function ensureLocalStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(createInitialData(), null, 2));
  }
}

function readLocalData() {
  if (mode === 'memory') {
    return memoryData;
  }

  ensureLocalStore();
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function writeLocalData(data) {
  if (mode === 'memory') {
    memoryData = data;
    return;
  }

  ensureLocalStore();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

async function ensurePostgresSchema() {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const statements = schemaSql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

function getMoradorFromLocal(data, id) {
  return data.moradores.find((morador) => morador.id === Number(id));
}

function getVisitanteFromLocal(data, id) {
  return data.visitantes.find((visitante) => visitante.id === Number(id));
}

function getEncomendaFromLocal(data, id) {
  return data.encomendas.find((encomenda) => encomenda.id === Number(id));
}

async function initialize() {
  loadEnvFile();

  try {
    await pool.query('SELECT 1');
    await ensurePostgresSchema();
    mode = 'postgres';
    lastDatabaseError = null;
    console.log('Armazenamento ativo: PostgreSQL');
  } catch (error) {
    lastDatabaseError = error;

    try {
      ensureLocalStore();
      mode = 'local';
      console.warn('PostgreSQL indisponivel. Usando armazenamento local em arquivo.');
      console.warn(error.message);
    } catch (fileError) {
      mode = 'memory';
      console.warn('PostgreSQL e armazenamento em arquivo indisponiveis. Usando memoria temporaria.');
      console.warn(error.message);
      console.warn(fileError.message);
    }
  }
}

async function healthCheck() {
  if (mode === 'postgres') {
    try {
      await pool.query('SELECT 1');
      return {
        ok: true,
        storage: 'postgres',
        message: 'API conectada ao PostgreSQL.',
      };
    } catch (error) {
      lastDatabaseError = error;

      try {
        ensureLocalStore();
        mode = 'local';
      } catch {
        mode = 'memory';
      }

      return {
        ok: true,
        storage: mode,
        message:
          mode === 'local'
            ? 'PostgreSQL indisponivel. App funcionando com armazenamento local.'
            : 'PostgreSQL indisponivel. App funcionando com memoria temporaria.',
        databaseError: error.message,
      };
    }
  }

  return {
    ok: true,
    storage: mode,
    message:
      mode === 'local'
        ? 'App funcionando com armazenamento local.'
        : 'App funcionando com memoria temporaria.',
    databaseError: lastDatabaseError ? lastDatabaseError.message : null,
  };
}

async function listMoradores() {
  if (mode === 'postgres') {
    const result = await pool.query(
      'SELECT id, nome, apartamento, telefone FROM moradores ORDER BY nome ASC'
    );
    return result.rows;
  }

  const data = readLocalData();
  return data.moradores.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

async function createMorador({ nome, apartamento, telefone }) {
  if (mode === 'postgres') {
    const result = await pool.query(
      `INSERT INTO moradores (nome, apartamento, telefone)
       VALUES ($1, $2, $3)
       RETURNING id, nome, apartamento, telefone`,
      [nome, apartamento, telefone]
    );
    return result.rows[0];
  }

  const data = readLocalData();
  const morador = {
    id: ++data.counters.moradores,
    nome,
    apartamento,
    telefone,
  };
  data.moradores.push(morador);
  writeLocalData(data);
  return morador;
}

async function updateMorador(id, { nome, apartamento, telefone }) {
  if (mode === 'postgres') {
    const result = await pool.query(
      `UPDATE moradores
       SET nome = $1, apartamento = $2, telefone = $3
       WHERE id = $4
       RETURNING id, nome, apartamento, telefone`,
      [nome, apartamento, telefone, id]
    );
    return result.rows[0] || null;
  }

  const data = readLocalData();
  const morador = getMoradorFromLocal(data, id);
  if (!morador) {
    return null;
  }

  morador.nome = nome;
  morador.apartamento = apartamento;
  morador.telefone = telefone;
  writeLocalData(data);
  return morador;
}

async function deleteMorador(id) {
  if (mode === 'postgres') {
    const hasVisitantes = await pool.query(
      'SELECT 1 FROM visitantes WHERE autorizado_por = $1 LIMIT 1',
      [id]
    );
    const hasEncomendas = await pool.query(
      'SELECT 1 FROM encomendas WHERE morador_id = $1 LIMIT 1',
      [id]
    );

    if (hasVisitantes.rowCount > 0 || hasEncomendas.rowCount > 0) {
      throw new Error('Nao e possivel excluir morador com visitantes ou encomendas vinculados.');
    }

    const result = await pool.query('DELETE FROM moradores WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  const data = readLocalData();
  const hasVisitantes = data.visitantes.some((visitante) => visitante.autorizado_por === id);
  const hasEncomendas = data.encomendas.some((encomenda) => encomenda.morador_id === id);

  if (hasVisitantes || hasEncomendas) {
    throw new Error('Nao e possivel excluir morador com visitantes ou encomendas vinculados.');
  }

  const originalLength = data.moradores.length;
  data.moradores = data.moradores.filter((morador) => morador.id !== id);
  writeLocalData(data);
  return data.moradores.length !== originalLength;
}

async function listVisitantes() {
  if (mode === 'postgres') {
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
    return result.rows;
  }

  const data = readLocalData();
  return data.visitantes
    .map((visitante) => {
      const morador = getMoradorFromLocal(data, visitante.autorizado_por);
      return {
        ...visitante,
        morador_nome: morador ? morador.nome : null,
        apartamento: morador ? morador.apartamento : null,
      };
    })
    .sort((a, b) => new Date(b.data_entrada) - new Date(a.data_entrada));
}

async function createVisitante({ nome, documento, autorizado_por }) {
  if (mode === 'postgres') {
    const result = await pool.query(
      `INSERT INTO visitantes (nome, documento, autorizado_por)
       VALUES ($1, $2, $3)
       RETURNING id, nome, documento, autorizado_por, data_entrada`,
      [nome, documento, autorizado_por]
    );
    return result.rows[0];
  }

  const data = readLocalData();
  const morador = getMoradorFromLocal(data, autorizado_por);
  if (!morador) {
    throw new Error('Morador autorizador nao encontrado.');
  }

  const visitante = {
    id: ++data.counters.visitantes,
    nome,
    documento,
    autorizado_por,
    data_entrada: new Date().toISOString(),
  };

  data.visitantes.push(visitante);
  writeLocalData(data);
  return visitante;
}

async function updateVisitante(id, { nome, documento, autorizado_por }) {
  if (mode === 'postgres') {
    const result = await pool.query(
      `UPDATE visitantes
       SET nome = $1, documento = $2, autorizado_por = $3
       WHERE id = $4
       RETURNING id, nome, documento, autorizado_por, data_entrada`,
      [nome, documento, autorizado_por, id]
    );
    return result.rows[0] || null;
  }

  const data = readLocalData();
  const visitante = getVisitanteFromLocal(data, id);
  const morador = getMoradorFromLocal(data, autorizado_por);

  if (!visitante) {
    return null;
  }

  if (!morador) {
    throw new Error('Morador autorizador nao encontrado.');
  }

  visitante.nome = nome;
  visitante.documento = documento;
  visitante.autorizado_por = autorizado_por;
  writeLocalData(data);
  return visitante;
}

async function deleteVisitante(id) {
  if (mode === 'postgres') {
    const result = await pool.query('DELETE FROM visitantes WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  const data = readLocalData();
  const originalLength = data.visitantes.length;
  data.visitantes = data.visitantes.filter((visitante) => visitante.id !== id);
  writeLocalData(data);
  return data.visitantes.length !== originalLength;
}

async function listEncomendas() {
  if (mode === 'postgres') {
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
    return result.rows;
  }

  const data = readLocalData();
  return data.encomendas
    .map((encomenda) => {
      const morador = getMoradorFromLocal(data, encomenda.morador_id);
      return {
        ...encomenda,
        morador_nome: morador ? morador.nome : null,
        apartamento: morador ? morador.apartamento : null,
      };
    })
    .sort((a, b) => b.id - a.id);
}

async function createEncomenda({ descricao, morador_id, status }) {
  if (mode === 'postgres') {
    const result = await pool.query(
      `INSERT INTO encomendas (descricao, morador_id, status)
       VALUES ($1, $2, COALESCE($3, 'pendente'))
       RETURNING id, descricao, morador_id, status`,
      [descricao, morador_id, status]
    );
    return result.rows[0];
  }

  const data = readLocalData();
  const morador = getMoradorFromLocal(data, morador_id);
  if (!morador) {
    throw new Error('Morador da encomenda nao encontrado.');
  }

  const encomenda = {
    id: ++data.counters.encomendas,
    descricao,
    morador_id,
    status: status || 'pendente',
  };

  data.encomendas.push(encomenda);
  writeLocalData(data);
  return encomenda;
}

async function updateEncomenda(id, { descricao, morador_id, status }) {
  if (mode === 'postgres') {
    const result = await pool.query(
      `UPDATE encomendas
       SET descricao = $1, morador_id = $2, status = COALESCE($3, status)
       WHERE id = $4
       RETURNING id, descricao, morador_id, status`,
      [descricao, morador_id, status, id]
    );
    return result.rows[0] || null;
  }

  const data = readLocalData();
  const encomenda = getEncomendaFromLocal(data, id);
  const morador = getMoradorFromLocal(data, morador_id);

  if (!encomenda) {
    return null;
  }

  if (!morador) {
    throw new Error('Morador da encomenda nao encontrado.');
  }

  encomenda.descricao = descricao;
  encomenda.morador_id = morador_id;
  encomenda.status = status || encomenda.status;
  writeLocalData(data);
  return encomenda;
}

async function updateEncomendaStatus(id, status) {
  if (mode === 'postgres') {
    const result = await pool.query(
      `UPDATE encomendas
       SET status = $1
       WHERE id = $2
       RETURNING id, descricao, morador_id, status`,
      [status, id]
    );
    return result.rows[0] || null;
  }

  const data = readLocalData();
  const encomenda = data.encomendas.find((item) => item.id === id);
  if (!encomenda) {
    return null;
  }

  encomenda.status = status;
  writeLocalData(data);
  return encomenda;
}

async function deleteEncomenda(id) {
  if (mode === 'postgres') {
    const result = await pool.query('DELETE FROM encomendas WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  const data = readLocalData();
  const originalLength = data.encomendas.length;
  data.encomendas = data.encomendas.filter((encomenda) => encomenda.id !== id);
  writeLocalData(data);
  return data.encomendas.length !== originalLength;
}

module.exports = {
  initialize,
  healthCheck,
  listMoradores,
  createMorador,
  updateMorador,
  deleteMorador,
  listVisitantes,
  createVisitante,
  updateVisitante,
  deleteVisitante,
  listEncomendas,
  createEncomenda,
  updateEncomenda,
  updateEncomendaStatus,
  deleteEncomenda,
};

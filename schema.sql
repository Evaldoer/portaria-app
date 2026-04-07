CREATE TABLE IF NOT EXISTS moradores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100),
  apartamento VARCHAR(10),
  telefone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS visitantes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100),
  documento VARCHAR(50),
  autorizado_por INT REFERENCES moradores(id),
  data_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encomendas (
  id SERIAL PRIMARY KEY,
  descricao VARCHAR(200),
  morador_id INT REFERENCES moradores(id),
  status VARCHAR(20) DEFAULT 'pendente',
  foto_recebida TEXT,
  foto_retirada TEXT
);

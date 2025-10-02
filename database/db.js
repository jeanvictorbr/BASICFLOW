const { Pool } = require('pg');
require('dotenv-flow').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  // Função para executar queries diretamente
  query: (text, params) => pool.query(text, params),

  // Função para obter uma única linha
  get: async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return res.rows[0];
  },

  // Função para obter todas as linhas
  all: async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return res.rows;
  },

  // Função para executar uma ação (INSERT, UPDATE, DELETE)
  run: async (sql, params = []) => {
    return pool.query(sql, params);
  }
};
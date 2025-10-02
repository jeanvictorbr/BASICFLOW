// Ficheiro: database/db.js
const { Pool } = require('pg');
require('dotenv-flow').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  get: async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return res.rows[0];
  },
  all: async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return res.rows;
  },
  run: async (sql, params = []) => {
    return pool.query(sql, params);
  }
};
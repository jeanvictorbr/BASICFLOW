const { Pool } = require('pg');
require('dotenv-flow').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

module.exports = {
    /**
     * Executa uma query genérica.
     * @param {string} text A string da query SQL.
     * @param {Array} params Os parâmetros para a query.
     * @returns {Promise<QueryResult>} O resultado da query.
     */
    query: (text, params) => pool.query(text, params),

    /**
     * Busca a primeira linha que corresponde à query.
     * @param {string} text A string da query SQL.
     * @param {Array} params Os parâmetros para a query.
     * @returns {Promise<Object|null>} A primeira linha ou null.
     */
    get: async (text, params) => {
        const res = await pool.query(text, params);
        return res.rows[0] || null;
    },

    /**
     * Busca todas as linhas que correspondem à query.
     * @param {string} text A string da query SQL.
     * @param {Array} params Os parâmetros para a query.
     * @returns {Promise<Array<Object>>} Um array com todas as linhas.
     */
    all: async (text, params) => {
        const res = await pool.query(text, params);
        return res.rows;
    },

    /**
     * Executa uma query que não precisa retornar dados (INSERT, UPDATE, DELETE).
     * @param {string} text A string da query SQL.
     * @param {Array} params Os parâmetros para a query.
     * @returns {Promise<QueryResult>} O resultado da query.
     */
    run: (text, params) => pool.query(text, params),
};
// database/schema.js

const db = require('./db');

// Define a estrutura completa de todas as tabelas necessárias para o bot.
const schemaSQL = `
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id VARCHAR(255) PRIMARY KEY,
        ticket_category_id VARCHAR(255),
        support_role_id VARCHAR(255),
        ticket_log_channel_id VARCHAR(255),
        ponto_channel_id VARCHAR(255),
        ponto_role_id VARCHAR(255),
        absence_channel_id VARCHAR(255),
        absence_log_channel_id VARCHAR(255),
        absence_role_id VARCHAR(255),
        registration_channel_id VARCHAR(255),
        registration_log_channel_id VARCHAR(255),
        member_role_id VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS tickets (
        ticket_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
        is_open BOOLEAN DEFAULT TRUE,
        claimed_by VARCHAR(255),
        closed_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        closed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS ponto_records (
        record_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        start_time TIMESTAMPTZ DEFAULT NOW(),
        end_time TIMESTAMPTZ,
        message_id VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS absences (
        absence_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        start_date BIGINT NOT NULL,
        end_date BIGINT NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, expired
        approved_by VARCHAR(255),
        rejected_by VARCHAR(255),
        message_id VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS uniforms (
        uniform_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role_id VARCHAR(255) NOT NULL,
        price INT DEFAULT 0
    );
`;

// Função que será chamada na inicialização do bot para sincronizar o schema.
const syncDatabase = async () => {
    try {
        console.log('[DATABASE] Sincronizando schema com o banco de dados...');
        await db.query(schemaSQL);
        console.log('[DATABASE] Schema sincronizado com sucesso.');
    } catch (error) {
        console.error('[DATABASE] ERRO FATAL ao sincronizar schema:', error);
        // Em caso de erro na DB, o bot não deve continuar.
        process.exit(1);
    }
};

module.exports = { syncDatabase };
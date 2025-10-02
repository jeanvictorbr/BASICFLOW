const db = require('./db.js');

const schemaSQL = `
    -- Guarda as configurações essenciais de cada servidor
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id VARCHAR(255) PRIMARY KEY,
        registration_channel_id VARCHAR(255), -- Canal para aprovar registos
        absence_channel_id VARCHAR(255),      -- Canal para aprovar ausências
        log_channel_id VARCHAR(255),          -- Canal para logs gerais
        registered_role_id VARCHAR(255),      -- Cargo para membros registados
        absence_role_id VARCHAR(255)          -- Cargo para membros ausentes
    );

    -- Guarda os registos de utilizadores
    CREATE TABLE IF NOT EXISTS registrations (
        registration_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        rp_name TEXT NOT NULL,
        game_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending', -- pending, approved, rejected
        approver_id VARCHAR(255),
        log_message_id VARCHAR(255)
    );

    -- Guarda os pedidos de ausência
    CREATE TABLE IF NOT EXISTS absences (
        absence_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        start_date BIGINT NOT NULL,
        end_date BIGINT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending', -- pending, approved, rejected
        approver_id VARCHAR(255)
    );

    -- Tabela para o sistema de tickets simples
    CREATE TABLE IF NOT EXISTS tickets (
        ticket_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
        is_open BOOLEAN DEFAULT TRUE
    );
`;

async function initializeDatabase() {
    try {
        console.log('[DATABASE] Verificando o esquema do banco de dados...');
        await db.query(schemaSQL);
        console.log('[DATABASE] Esquema verificado e sincronizado com sucesso.');
    } catch (error) {
        console.error('[DATABASE] Erro crítico ao inicializar o banco de dados:', error);
        process.exit(1);
    }
}

module.exports = { initializeDatabase };
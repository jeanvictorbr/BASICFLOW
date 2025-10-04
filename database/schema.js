// Ficheiro: database/schema.js (VERSÃO FINAL E CORRIGIDA)
const db = require('../database/db.js');

const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id VARCHAR(255) PRIMARY KEY,
        registration_channel_id VARCHAR(255),
        absence_channel_id VARCHAR(255),
        registered_role_id VARCHAR(255),
        absence_role_id VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS registrations (
        registration_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        rp_name TEXT NOT NULL,
        game_id TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        approver_id VARCHAR(255),
        timestamp BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
    );

    CREATE TABLE IF NOT EXISTS absences (
        absence_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        start_date BIGINT NOT NULL,
        end_date BIGINT NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        approver_id VARCHAR(255),
        timestamp BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
    );

    CREATE TABLE IF NOT EXISTS tickets (
        ticket_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
        is_open BOOLEAN DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS changelog_updates (
        update_id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vestuario_configs (
        guild_id VARCHAR(255) PRIMARY KEY,
        showcase_channel_id VARCHAR(255),
        showcase_message_id VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS vestuario_items (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        imagem_url TEXT,
        codigos TEXT NOT NULL,
        UNIQUE(guild_id, nome)
    );
`;

async function checkAndAlterTables() {
    const columnsToAdd = {
        'guild_settings': {
            'nickname_tag': 'VARCHAR(16)', 'registration_panel_image_url': 'TEXT', 'ticket_category_id': 'VARCHAR(255)',
            'support_role_id': 'VARCHAR(255)', 'ticket_log_channel_id': 'VARCHAR(255)', 'absence_panel_image_url': 'TEXT', 'ticket_panel_image_url': 'TEXT'
        },
        'tickets': { 'closed_by': 'VARCHAR(255)', 'close_reason': 'TEXT', 'claimed_by': 'VARCHAR(255)' },
        // *** INÍCIO DA CORREÇÃO DEFINITIVA ***
        'registrations': {
            'guild_id': 'VARCHAR(255)', 'user_id': 'VARCHAR(255)', 'rp_name': 'TEXT', 'game_id': 'TEXT',
            'status': "VARCHAR(50) DEFAULT 'pending'", 'approver_id': 'VARCHAR(255)', 'timestamp': 'BIGINT'
        },
        'absences': {
            'guild_id': 'VARCHAR(255)', 'user_id': 'VARCHAR(255)', 'start_date': 'BIGINT', 'end_date': 'BIGINT',
            'reason': 'TEXT', 'status': "VARCHAR(50) DEFAULT 'pending'", 'approver_id': 'VARCHAR(255)', 'timestamp': 'BIGINT'
        }
        // *** FIM DA CORREÇÃO DEFINITIVA ***
    };

    const addColumnIfNotExists = async (tableName, columns) => {
        for (const [column, type] of Object.entries(columns)) {
            try {
                const res = await db.query(`SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`, [tableName, column]);
                if (res.rowCount === 0) {
                    console.log(`[DATABASE] Coluna "${column}" não encontrada na tabela "${tableName}". Adicionando...`);
                    await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${column} ${type}`);
                    console.log(`[DATABASE] Coluna "${column}" adicionada com sucesso.`);
                }
            } catch (err) {
                if (err.code !== '42P01') { // Ignora erro "tabela não existe" que pode acontecer em setup inicial
                    console.error(`[DATABASE] Erro ao adicionar coluna "${column}" em "${tableName}":`, err.message);
                }
            }
        }
    };

    try {
        for (const [tableName, columns] of Object.entries(columnsToAdd)) {
            await addColumnIfNotExists(tableName, columns);
        }
    } catch (error) {
        console.error(`[DATABASE] Erro crítico ao verificar/alterar tabelas:`, error);
        throw error;
    }
}

async function initializeDatabase() {
    try {
        console.log('[DATABASE] Verificando o esquema do banco de dados...');
        await db.query('DROP TABLE IF EXISTS vestuario_categorias CASCADE;').catch(() => {});
        await db.query(createTablesSQL);
        await checkAndAlterTables();
        console.log('[DATABASE] Esquema do banco de dados verificado e sincronizado com sucesso.');
    } catch (error) {
        console.error('[DATABASE] Erro crítico ao inicializar o banco de dados:', error);
        process.exit(1);
    }
}

module.exports = { initializeDatabase };
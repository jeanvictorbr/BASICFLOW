// Ficheiro: database/schema.js
// Responsável por garantir que a estrutura da base de dados está correta e atualizada.

const db = require('../database/db.js');

const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id VARCHAR(255) PRIMARY KEY,
        registration_channel_id VARCHAR(255),
        absence_channel_id VARCHAR(255),
        registered_role_id VARCHAR(255),
        absence_role_id VARCHAR(255)
    );
    CREATE TABLE IF NOT EXISTS registrations ( /* ... Tabela sem alterações ... */ );
    CREATE TABLE IF NOT EXISTS absences ( /* ... Tabela sem alterações ... */ );
    CREATE TABLE IF NOT EXISTS tickets (
        ticket_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
        is_open BOOLEAN DEFAULT TRUE
    );
        -- NOVA TABELA GLOBAL PARA ATUALIZAÇÕES
    CREATE TABLE IF NOT EXISTS changelog_updates (
        update_id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp BIGINT NOT NULL
    );
`;

async function checkAndAlterTables() {
    // Adicionamos as novas colunas para tickets aqui
    const guildSettingsColumns = {
        'nickname_tag': 'VARCHAR(16)',
        'registration_panel_image_url': 'TEXT',
        'ticket_category_id': 'VARCHAR(255)',
        'support_role_id': 'VARCHAR(255)',
        'ticket_log_channel_id': 'VARCHAR(255)',
        'absence_panel_image_url': 'TEXT', // NOVA COLUNA
        'ticket_panel_image_url': 'TEXT'    // NOVA COLUNA
    };

    const ticketsColumns = {
        'closed_by': 'VARCHAR(255)',
        'close_reason': 'TEXT',
        'claimed_by': 'VARCHAR(255)'
    };

    // Função auxiliar para adicionar colunas
    const addColumnIfNotExists = async (tableName, columns) => {
        for (const [column, type] of Object.entries(columns)) {
            const res = await db.query(`SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`, [tableName, column]);
            if (res.rowCount === 0) {
                console.log(`[DATABASE] Coluna "${column}" não encontrada na tabela "${tableName}". Adicionando...`);
                await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${column} ${type}`);
                console.log(`[DATABASE] Coluna "${column}" adicionada com sucesso.`);
            }
        }
    };

    try {
        await addColumnIfNotExists('guild_settings', guildSettingsColumns);
        await addColumnIfNotExists('tickets', ticketsColumns);
    } catch (error) {
        if (error.code !== '42P01') { // Ignora erro "table does not exist"
            console.error(`[DATABASE] Erro ao verificar/alterar tabelas:`, error);
            throw error;
        }
    }
}

async function initializeDatabase() {
    try {
        console.log('[DATABASE] Verificando o esquema do banco de dados...');
        await db.query(createTablesSQL);
        await checkAndAlterTables();
        console.log('[DATABASE] Esquema verificado e sincronizado com sucesso.');
    } catch (error) {
        console.error('[DATABASE] Erro crítico ao inicializar o banco de dados:', error);
        process.exit(1);
    }
}

module.exports = { initializeDatabase };
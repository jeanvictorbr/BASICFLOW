// Ficheiro: database/schema.js
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

    CREATE TABLE IF NOT EXISTS changelog_updates (
        update_id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp BIGINT NOT NULL
    );

    -- TABELAS DO VESTIÁRIO (SIMPLIFICADAS SEM CATEGORIAS)
    CREATE TABLE IF NOT EXISTS vestuario_configs (
        guild_id VARCHAR(255) PRIMARY KEY,
        showcase_channel_id VARCHAR(255),
        showcase_message_id VARCHAR(255),
        storage_channel_id VARCHAR(255)
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
    const guildSettingsColumns = {
        'nickname_tag': 'VARCHAR(16)',
        'registration_panel_image_url': 'TEXT',
        'ticket_category_id': 'VARCHAR(255)',
        'support_role_id': 'VARCHAR(255)',
        'ticket_log_channel_id': 'VARCHAR(255)',
        'absence_panel_image_url': 'TEXT',
        'ticket_panel_image_url': 'TEXT'
    };

    const ticketsColumns = {
        'closed_by': 'VARCHAR(255)',
        'close_reason': 'TEXT',
        'claimed_by': 'VARCHAR(255)'
    };

    const addColumnIfNotExists = async (tableName, columns) => {
        for (const [column, type] of Object.entries(columns)) {
            const res = await db.query(`SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`, [tableName, column]);
            if (res.rowCount === 0) {
                console.log(`[DATABASE] Coluna "${column}" não encontrada na tabela "${tableName}". Adicionando...`);
                await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${column} ${type}`);
            }
        }
    };

    try {
        await addColumnIfNotExists('guild_settings', guildSettingsColumns);
        await addColumnIfNotExists('tickets', ticketsColumns);
    } catch (error) {
        if (error.code !== '42P01') {
            console.error(`[DATABASE] Erro ao verificar/alterar tabelas:`, error);
            throw error;
        }
    }
}

async function initializeDatabase() {
    try {
        console.log('[DATABASE] Verificando o esquema do banco de dados...');
        // Remove tabelas antigas, se existirem, para forçar a recriação. Ignora erros se não existirem.
        await db.query('DROP TABLE IF EXISTS vestuario_categorias CASCADE;').catch(() => {});
        
        // Executa a criação de todas as tabelas com a nova estrutura
        await db.query(createTablesSQL);
        await checkAndAlterTables();
        
        console.log('[DATABASE] Esquema verificado e sincronizado com sucesso.');
    } catch (error) {
        console.error('[DATABASE] Erro crítico ao inicializar o banco de dados:', error);
        process.exit(1);
    }
}

module.exports = { initializeDatabase };
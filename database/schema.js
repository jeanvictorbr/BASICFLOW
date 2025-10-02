const db = require('./db.js');

const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id VARCHAR(255) PRIMARY KEY,
        registration_channel_id VARCHAR(255),
        absence_channel_id VARCHAR(255),
        log_channel_id VARCHAR(255),
        registered_role_id VARCHAR(255),
        absence_role_id VARCHAR(255)
    );
    CREATE TABLE IF NOT EXISTS registrations (
        registration_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        rp_name TEXT NOT NULL,
        game_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        approver_id VARCHAR(255),
        log_message_id VARCHAR(255)
    );
    CREATE TABLE IF NOT EXISTS absences (
        absence_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        start_date BIGINT NOT NULL,
        end_date BIGINT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        approver_id VARCHAR(255)
    );
    CREATE TABLE IF NOT EXISTS tickets (
        ticket_id SERIAL PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
        is_open BOOLEAN DEFAULT TRUE
    );
`;

// Função que verifica e adiciona colunas que estejam em falta
async function checkAndAlterTables() {
    const columns = {
        'nickname_tag': 'VARCHAR(16)',
        'registration_panel_image_url': 'TEXT',
        'ticket_category_id': 'VARCHAR(255)', // NOVA COLUNA
        'support_role_id': 'VARCHAR(255)',    // NOVA COLUNA
        'ticket_log_channel_id': 'VARCHAR(255)' // NOVA COLUNA
    };

    for (const [column, type] of Object.entries(columns)) {
        try {
            const res = await db.query(`
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='guild_settings' AND column_name=$1
            `, [column]);
            
            if (res.rowCount === 0) {
                console.log(`[DATABASE] Coluna "${column}" não encontrada. Adicionando...`);
                await db.query(`ALTER TABLE guild_settings ADD COLUMN ${column} ${type}`);
                console.log(`[DATABASE] Coluna "${column}" adicionada com sucesso.`);
            }
        } catch (error) {
            if (error.code !== '42P01') { // Ignora erro "table does not exist"
                console.error(`[DATABASE] Erro ao verificar/alterar a coluna ${column}:`, error);
                throw error;
            }
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


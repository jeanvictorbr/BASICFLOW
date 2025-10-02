const db = require('./db.js');

// O esquema original, apenas para referência e criação inicial
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

// NOVA LÓGICA PARA VERIFICAR E ADICIONAR COLUNAS EM FALTA
async function checkAndAlterTables() {
    try {
        // Verifica se a coluna nickname_tag existe
        const res = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='guild_settings' AND column_name='nickname_tag'
        `);
        
        // Se a consulta não retornar linhas, a coluna não existe
        if (res.rowCount === 0) {
            console.log('[DATABASE] Coluna "nickname_tag" não encontrada. Adicionando...');
            await db.query('ALTER TABLE guild_settings ADD COLUMN nickname_tag VARCHAR(16)');
            console.log('[DATABASE] Coluna "nickname_tag" adicionada com sucesso.');
        }
    } catch (error) {
        // Ignora o erro se a tabela ainda não existir (será criada a seguir)
        if (error.code !== '42P01') {
            console.error('[DATABASE] Erro ao verificar/alterar a tabela guild_settings:', error);
            throw error; // Lança o erro para parar a inicialização se for um problema sério
        }
    }
}

async function initializeDatabase() {
    try {
        console.log('[DATABASE] Verificando o esquema do banco de dados...');
        
        // Primeiro, garante que as tabelas base existem
        await db.query(createTablesSQL);
        
        // Depois, verifica e adiciona colunas em falta
        await checkAndAlterTables();
        
        console.log('[DATABASE] Esquema verificado e sincronizado com sucesso.');
    } catch (error) {
        console.error('[DATABASE] Erro crítico ao inicializar o banco de dados:', error);
        process.exit(1);
    }
}

module.exports = { initializeDatabase };
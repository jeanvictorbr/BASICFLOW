// ✔️ CORRIGIDO: Adicionada a importação da conexão com o banco de dados.
const db = require('./db');

// Definição centralizada de todas as tabelas e colunas com tipos de dados PostgreSQL
const tableDefinitions = {
    guild_settings: {
        guild_id: 'BIGINT PRIMARY KEY',
        registration_channel_id: 'BIGINT',
        registration_staff_role_id: 'BIGINT',
        registration_log_channel_id: 'BIGINT',
        registration_approved_role_id: 'BIGINT',
        registration_panel_image_url: 'TEXT',
        registration_enabled: 'BOOLEAN DEFAULT FALSE',
        registration_name_pattern: "TEXT DEFAULT '{nome} ({id})'",
        registration_welcome_message: "TEXT DEFAULT 'Clique no botão abaixo para registrar-se.'",
        
        absence_channel_id: 'BIGINT',
        absence_staff_role_id: 'BIGINT',
        absence_log_channel_id: 'BIGINT',
        absence_panel_image_url: 'TEXT',
        absence_role_id: 'BIGINT',

        ticket_channel_id: 'BIGINT',
        ticket_category_id: 'BIGINT',
        ticket_staff_role_id: 'BIGINT',
        ticket_log_channel_id: 'BIGINT',
        ticket_panel_image_url: 'TEXT',
        
        ponto_channel_id: 'BIGINT',
        ponto_staff_role_id: 'BIGINT',
        ponto_log_channel_id: 'BIGINT',
        ponto_role_id: 'BIGINT',
        ponto_monitor_channel_id: 'BIGINT',
        ponto_monitor_message_id: 'BIGINT',
        ponto_panel_image_url: 'TEXT',
        
        uniformes_channel_id: 'BIGINT',
        uniformes_log_channel_id: 'BIGINT',
        uniformes_staff_role_id: 'BIGINT',
        uniformes_panel_image_url: 'TEXT',
    },
    registrations: {
        id: 'SERIAL PRIMARY KEY',
        guild_id: 'BIGINT NOT NULL',
        user_id: 'BIGINT NOT NULL',
        status: "TEXT DEFAULT 'pending'",
        submission_data: 'JSONB',
        created_at: "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
        handled_by: 'BIGINT'
    },
    absences: {
        id: 'SERIAL PRIMARY KEY',
        guild_id: 'BIGINT NOT NULL',
        user_id: 'BIGINT NOT NULL',
        status: "TEXT DEFAULT 'pending'",
        reason: 'TEXT',
        start_date: 'DATE',
        end_date: 'DATE',
        created_at: "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
        handled_by: 'BIGINT'
    },
    tickets: {
        id: 'SERIAL PRIMARY KEY',
        guild_id: 'BIGINT NOT NULL',
        user_id: 'BIGINT NOT NULL',
        channel_id: 'BIGINT',
        status: "TEXT DEFAULT 'open'",
        created_at: "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
        closed_by: 'BIGINT'
    },
    ponto_records: {
        id: 'SERIAL PRIMARY KEY',
        guild_id: 'BIGINT NOT NULL',
        user_id: 'BIGINT NOT NULL',
        clock_in_time: 'TIMESTAMP WITH TIME ZONE',
        clock_out_time: 'TIMESTAMP WITH TIME ZONE',
        total_duration_minutes: 'INTEGER'
    },
    vestuario_items: {
        id: 'SERIAL PRIMARY KEY',
        guild_id: 'BIGINT NOT NULL',
        name: 'TEXT NOT NULL',
        item_codes: 'TEXT[]',
        image_url: 'TEXT'
    }
};

/**
 * Rotina de Migração Automática para PostgreSQL.
 * Verifica se colunas definidas no código existem no DB e as adiciona se necessário.
 */
async function checkAndAlterTables() {
    console.log('[DB Migration] Verificando integridade das colunas das tabelas...');
    for (const tableName in tableDefinitions) {
        const tableSchema = tableDefinitions[tableName];
        for (const columnName in tableSchema) {
            try {
                const res = await db.query(
                    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
                    [tableName, columnName]
                );
                if (res.rowCount === 0) {
                    const columnDefinition = tableSchema[columnName];
                    console.log(`[DB Migration] Coluna '${columnName}' não encontrada na tabela '${tableName}'. Adicionando...`);
                    await db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
                    console.log(`[DB Migration] Coluna '${columnName}' adicionada com sucesso.`);
                }
            } catch (err) {
                 // Ignora erros que podem ocorrer se a tabela ainda não existir no primeiro ciclo.
            }
        }
    }
    console.log('[DB Migration] Verificação de integridade concluída.');
}


/**
 * Inicializa o banco de dados, criando tabelas se não existirem e aplicando migrações.
 */
async function initializeDatabase() {
    // ✔️ CORRIGIDO: Usando db.run (do nosso pg wrapper) para cada query.
    for (const tableName in tableDefinitions) {
        const columns = Object.entries(tableDefinitions[tableName])
            .map(([col, def]) => `${col} ${def}`)
            .join(', ');
        
        const createQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
        
        try {
            await db.run(createQuery);
        } catch (error) {
            console.error(`[DB Error] Falha ao criar a tabela '${tableName}':`, error);
            // Lançar o erro impede o bot de iniciar com um DB inconsistente.
            throw error; 
        }
    }
    console.log('[DB Info] Todas as tabelas foram verificadas/criadas.');
    
    // Executa a rotina de migração para garantir que todas as colunas existam.
    await checkAndAlterTables();
}

module.exports = { initializeDatabase };
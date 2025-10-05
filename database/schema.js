const db = require('./db');

// Definição centralizada das colunas para facilitar a migração
const tableDefinitions = {
    guild_settings: {
        guild_id: 'BIGINT PRIMARY KEY',
        registration_channel_id: 'BIGINT',
        registration_staff_role_id: 'BIGINT',
        registration_log_channel_id: 'BIGINT',
        registration_approved_role_id: 'BIGINT',
        registration_panel_image_url: 'TEXT',
        absence_channel_id: 'BIGINT',
        absence_staff_role_id: 'BIGINT',
        absence_log_channel_id: 'BIGINT',
        absence_panel_image_url: 'TEXT',
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
        uniformes_panel_image_url: 'TEXT'
    },
    registrations: {
        id: 'SERIAL PRIMARY KEY',
        guild_id: 'BIGINT NOT NULL',
        user_id: 'BIGINT NOT NULL',
        status: "TEXT DEFAULT 'pending'", // pending, approved, denied
        submission_data: 'JSONB',
        created_at: "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
        handled_by: 'BIGINT'
    },
    absences: {
        id: 'SERIAL PRIMARY KEY',
        guild_id: 'BIGINT NOT NULL',
        user_id: 'BIGINT NOT NULL',
        status: "TEXT DEFAULT 'pending'", // pending, approved, denied
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
        status: "TEXT DEFAULT 'open'", // open, closed
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

async function checkAndAlterTables() {
    for (const tableName in tableDefinitions) {
        const columns = tableDefinitions[tableName];
        for (const columnName in columns) {
            try {
                // Verifica se a coluna existe
                const res = await db.query(
                    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
                    [tableName, columnName]
                );
                if (res.rowCount === 0) {
                    // Adiciona a coluna se não existir
                    const columnDefinition = columns[columnName];
                    console.log(`[DB Migration] Adicionando coluna '${columnName}' à tabela '${tableName}'...`);
                    await db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
                }
            } catch (err) {
                // Um erro aqui provavelmente significa que a tabela não existe ainda, o que é normal.
            }
        }
    }
}

async function initializeDatabase() {
    const createQueries = [
        `CREATE TABLE IF NOT EXISTS guild_settings (${Object.entries(tableDefinitions.guild_settings).map(([col, def]) => `${col} ${def}`).join(', ')})`,
        `CREATE TABLE IF NOT EXISTS registrations (${Object.entries(tableDefinitions.registrations).map(([col, def]) => `${col} ${def}`).join(', ')})`,
        `CREATE TABLE IF NOT EXISTS absences (${Object.entries(tableDefinitions.absences).map(([col, def]) => `${col} ${def}`).join(', ')})`,
        `CREATE TABLE IF NOT EXISTS tickets (${Object.entries(tableDefinitions.tickets).map(([col, def]) => `${col} ${def}`).join(', ')})`,
        `CREATE TABLE IF NOT EXISTS ponto_records (${Object.entries(tableDefinitions.ponto_records).map(([col, def]) => `${col} ${def}`).join(', ')})`,
        `CREATE TABLE IF NOT EXISTS vestuario_items (${Object.entries(tableDefinitions.vestuario_items).map(([col, def]) => `${col} ${def}`).join(', ')})`
    ];

    for (const query of createQueries) {
        await db.run(query);
    }
    
    console.log('[DB Migration] Verificando integridade das tabelas...');
    await checkAndAlterTables();
    console.log('[DB Migration] Verificação concluída.');
}

module.exports = { initializeDatabase };
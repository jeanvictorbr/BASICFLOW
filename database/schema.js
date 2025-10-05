// Dentro da função initializeDatabase()

async function initializeDatabase() {
    // ...
    await db.exec(`
        CREATE TABLE IF NOT EXISTS guild_settings (
            guild_id TEXT PRIMARY KEY,
            // Existing settings
            registration_log_channel_id TEXT,
            registration_staff_role_id TEXT,
            registration_approved_role_id TEXT,
            registration_panel_image_url TEXT,
            
            // ✔️ NOVAS COLUNAS PARA REGISTRO
            registration_enabled BOOLEAN DEFAULT FALSE,
            registration_name_pattern TEXT DEFAULT '{nome} ({id})',
            registration_welcome_message TEXT DEFAULT 'Clique no botão abaixo para registrar-se.',
            registration_channel_id TEXT, -- Canal onde o painel público de registro será publicado

            ticket_category_id TEXT,
            ticket_staff_role_id TEXT,
            ticket_log_channel_id TEXT,
            ticket_panel_image_url TEXT,
            ticket_channel_id TEXT, -- Canal onde o painel público de tickets será publicado

            ponto_role_id TEXT,
            ponto_monitor_channel_id TEXT,
            ponto_panel_image_url TEXT,
            ponto_channel_id TEXT, -- Canal onde o painel público de ponto será publicado

            // ✔️ NOVAS COLUNAS PARA AUSÊNCIA (futuro módulo)
            absence_notification_channel_id TEXT,
            absence_staff_role_id TEXT,
            absence_role_id TEXT,
            absence_channel_id TEXT -- Canal onde o painel público de ausências será publicado
        );
    `);

    // ✔️ NOVA TABELA PARA OS REGISTROS DOS USUÁRIOS
    await db.exec(`
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied'
            submission_data JSON, -- Para armazenar os dados do formulário como JSON
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            handled_by TEXT, -- ID do staff que aprovou/reprovou
            FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id)
        );
    `);

    // ✔️ NOVA TABELA PARA OS UNIFORMES
    await db.exec(`
        CREATE TABLE IF NOT EXISTS vestuario_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            name TEXT NOT NULL,
            item_codes TEXT, -- Armazenar como JSON string ou texto separado por vírgulas
            image_url TEXT,
            FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id)
        );
    `);
    
    // Isso é importante para adicionar novas colunas a tabelas existentes sem perder dados
    await db.exec(`
        PRAGMA foreign_keys = ON;
        ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS registration_enabled BOOLEAN DEFAULT FALSE;
        ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS registration_name_pattern TEXT DEFAULT '{nome} ({id})';
        ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS registration_welcome_message TEXT DEFAULT 'Clique no botão abaixo para registrar-se.';
        ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS registration_channel_id TEXT;

        ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS ticket_channel_id TEXT;
        ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS ponto_channel_id TEXT;
        
        ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS absence_notification_channel_id TEXT;
        ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS absence_staff_role_id TEXT;
        ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS absence_role_id TEXT;
        ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS absence_channel_id TEXT;
    `);

    console.log('[DB Migration] Verificação concluída.');
}

module.exports = { initializeDatabase };
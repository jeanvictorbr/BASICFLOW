// Ficheiro: interactions/config_handler.js

const db = require('../database/db.js');

async function handleTicketSetup(interaction) {
    const category = interaction.options.getChannel('categoria');
    if (category.type !== 4) { // GuildCategory
        return interaction.reply({ content: '❌ Por favor, selecione uma categoria de canais.', ephemeral: true });
    }

    await db.run(
        'INSERT INTO guild_settings (guild_id, ticket_category_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET ticket_category_id = $2',
        [interaction.guildId, category.id]
    );

    await interaction.reply({ content: `✅ A categoria de tickets foi definida para **${category.name}**.`, ephemeral: true });
}

async function handleLogsSetup(interaction) {
    const channel = interaction.options.getChannel('canal');
    if (channel.type !== 0) { // GuildText
        return interaction.reply({ content: '❌ Por favor, selecione um canal de texto.', ephemeral: true });
    }
    
    await db.run(
        'INSERT INTO guild_settings (guild_id, ticket_log_channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET ticket_log_channel_id = $2',
        [interaction.guildId, channel.id]
    );

    await interaction.reply({ content: `✅ O canal de logs de tickets foi definido para ${channel}.`, ephemeral: true });
}

async function handleSupportRoleSetup(interaction) {
    const role = interaction.options.getRole('cargo');
    
    await db.run(
        'INSERT INTO guild_settings (guild_id, support_role_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET support_role_id = $2',
        [interaction.guildId, role.id]
    );

    await interaction.reply({ content: `✅ O cargo de suporte foi definido para ${role}.`, ephemeral: true });
}

module.exports = {
    handleTicketSetup,
    handleLogsSetup,
    handleSupportRoleSetup,
};
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfigDashboardPayload } = require('../views/config_views');
const db = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configurações do BasicFlow.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // Garante que existe uma entrada para a guild no DB
        await db.run(
            'INSERT INTO guild_settings (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING',
            [interaction.guild.id]
        );

        const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guild.id]);

        const payload = getConfigDashboardPayload(settings);

        await interaction.reply({
            ...payload,
            ephemeral: true,
        });
    },
};
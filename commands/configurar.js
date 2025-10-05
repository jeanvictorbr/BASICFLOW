const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getConfigDashboardPayload } = require('../views/config_views');
const db = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configurações do BasicFlow.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await db.run(
            'INSERT INTO guild_settings (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING',
            [interaction.guild.id]
        );
        const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guild.id]);
        const payload = getConfigDashboardPayload(settings);

        await interaction.reply({
            ...payload,
            // ✔️ CORRIGIDO: 'ephemeral' trocado por 'flags'
            flags: [MessageFlags.Ephemeral],
        });
    },
};
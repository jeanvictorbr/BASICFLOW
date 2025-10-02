const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfigDashboardPayload } = require('../views/config_views.js');
const db = require('../database/db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configuração do BasicFlow.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // A função getConfigDashboardPayload irá buscar os dados e montar a embed
            const payload = await getConfigDashboardPayload(interaction.guild);
            await interaction.editReply(payload);
        } catch (error) {
            console.error("Erro ao carregar o painel de configuração:", error);
            await interaction.editReply('❌ Ocorreu um erro ao carregar o painel de configuração.');
        }
    },
};
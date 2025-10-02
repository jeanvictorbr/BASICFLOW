const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponse } = require('discord.js');
const { getConfigDashboardPayload } = require('../views/config_views.js');
const db = require('../database/db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configuração do BasicFlow.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction) {
        // A flag 64 torna a resposta apenas visível para o utilizador
        await interaction.deferReply({ flags: 64 });

        try {
            const payload = await getConfigDashboardPayload(interaction.guild);
            await interaction.editReply(payload);
        } catch (error) {
            console.error("Erro ao carregar o painel de configuração:", error);
            await interaction.editReply({ content: '❌ Ocorreu um erro ao carregar o painel de configuração.' });
        }
    },
};
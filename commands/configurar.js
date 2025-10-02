// Ficheiro: commands/configurar.js
// Responsável por iniciar o painel de administração.

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfigDashboardPayload } = require('../views/config_views.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configuração do BasicFlow.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction) {
        // ESTA É A LINHA QUE RESOLVE O PROBLEMA.
        // Responde imediatamente ao Discord para evitar o erro "Integração desconhecida".
        await interaction.deferReply({ flags: 64 });

        try {
            // Depois de adiar a resposta, ele pode demorar o tempo necessário para buscar os dados.
            const payload = await getConfigDashboardPayload(interaction.guild);
            await interaction.editReply(payload);
        } catch (error) {
            console.error("Erro CRÍTICO ao carregar o painel de configuração:", error);
            await interaction.editReply({ content: '❌ Ocorreu um erro ao carregar o painel. Verifique os logs.' });
        }
    },
};
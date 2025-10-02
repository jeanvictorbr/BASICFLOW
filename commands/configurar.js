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
        // ESTA É A LINHA MAIS IMPORTANTE
        // Ela responde imediatamente ao Discord para evitar o erro "Integração desconhecida".
        // A flag 64 torna a resposta visível apenas para si.
        await interaction.deferReply({ flags: 64 });

        try {
            // Depois de deferir, podemos demorar o tempo que for preciso para buscar os dados.
            const payload = await getConfigDashboardPayload(interaction.guild);
            await interaction.editReply(payload);
        } catch (error) {
            console.error("Erro ao carregar o painel de configuração:", error);
            await interaction.editReply({ content: '❌ Ocorreu um erro crítico ao carregar o painel de configuração.' });
        }
    },
};
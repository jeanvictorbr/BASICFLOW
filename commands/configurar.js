// Ficheiro: commands/configurar.js (VERSÃO CORRIGIDA)

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
// CORREÇÃO: O caminho para o handler foi ajustado para a estrutura de interações.
const { handleConfigCommand } = require('../interactions/handlers/config_handler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configuração do BasicFlow.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction) {
        // ADIÇÃO: "Adia" a resposta para evitar timeouts no carregamento inicial.
        await interaction.deferReply({ ephemeral: true });

        // A responsabilidade deste ficheiro é chamar o handler robusto.
        await handleConfigCommand(interaction);
    },
};
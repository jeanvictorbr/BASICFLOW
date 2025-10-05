// Ficheiro: commands/configurar.js (VERSÃO CORRIGIDA)

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { handleConfigCommand } = require('../interactions/handlers/config_handler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configuração do BasicFlow.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction) {
        // A única responsabilidade deste ficheiro é chamar o handler principal.
        // Toda a lógica de resposta e "defer" será tratada pelo handler.
        await handleConfigCommand(interaction);
    },
};
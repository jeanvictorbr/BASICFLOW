// Ficheiro: commands/configurar.js

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
// CORREÇÃO: O handler principal está na pasta de interações.
const { handleConfigCommand } = require('../interactions/config_handler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configuração do BasicFlow.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction) {
        // A única responsabilidade deste ficheiro é chamar o handler principal.
        // A lógica de resposta será tratada lá.
        await handleConfigCommand(interaction);
    },
};
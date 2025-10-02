// Ficheiro: commands/configurar.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { handleConfigCommand } = require('../handlers/config_handler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configuração do BasicFlow.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await handleConfigCommand(interaction);
    },
};
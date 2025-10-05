// commands/configurar.js

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { showMainMenu } = require('../views/config_views');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configurações interativo do bot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await showMainMenu(interaction);
    },
};
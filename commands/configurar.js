// commands/configurar.js

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { showMainMenu } = require('../views/config_views'); // Importa a nova função do menu principal

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configurações do bot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Garante que apenas administradores usem

    async execute(interaction) {
        // Apenas chama a função que mostra o menu principal
        await showMainMenu(interaction);
    },
};
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { showConfigPanel } = require('../views/uniformes_view');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uniformesconfig')
        .setDescription('Abre o painel de configuração do vestiário de uniformes.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        try {
            await showConfigPanel(interaction);
        } catch (error) {
            console.error('Erro ao executar /uniformesconfig:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Ocorreu um erro ao abrir o painel de configuração.', ephemeral: true });
            }
        }
    },
};
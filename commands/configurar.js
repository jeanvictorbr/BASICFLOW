// Ficheiro: commands/configurar.js

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { handleTicketSetup, handleLogsSetup, handleSupportRoleSetup } = require('../interactions/config_handler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Configura as definições do bot para este servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('tickets')
                .setDescription('Configura o sistema de tickets.')
                .addChannelOption(option => option.setName('categoria').setDescription('A categoria onde os tickets serão criados.').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('logs')
                .setDescription('Configura o canal de logs dos tickets.')
                .addChannelOption(option => option.setName('canal').setDescription('O canal para enviar os logs dos tickets.').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cargosupport')
                .setDescription('Configura o cargo que pode ver e gerir os tickets.')
                .addRoleOption(option => option.setName('cargo').setDescription('O cargo da equipa de suporte.').setRequired(true))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'tickets':
                await handleTicketSetup(interaction);
                break;
            case 'logs':
                await handleLogsSetup(interaction);
                break;
            case 'cargosupport':
                await handleSupportRoleSetup(interaction);
                break;
        }
    },
};
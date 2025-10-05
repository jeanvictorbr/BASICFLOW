const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Configura os módulos do bot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommandGroup(group =>
            group
                .setName('tickets')
                .setDescription('Configuração do sistema de tickets.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('categoria')
                        .setDescription('Define a categoria para criar os tickets.')
                        .addChannelOption(option =>
                            option.setName('canal')
                                .setDescription('A categoria de canais.')
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildCategory))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('cargo')
                        .setDescription('Define o cargo de suporte para ver os tickets.')
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('O cargo de suporte.')
                                .setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('logs')
                        .setDescription('Define o canal de logs para os tickets.')
                        .addChannelOption(option =>
                            option.setName('canal')
                                .setDescription('O canal de texto para logs.')
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText))
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('ponto')
                .setDescription('Configuração do sistema de ponto.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('canal')
                        .setDescription('Define o canal onde os funcionários podem bater o ponto.')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('O canal de texto para o ponto.')
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('cargo')
                        .setDescription('Define o cargo necessário para bater o ponto.')
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('O cargo que pode bater ponto.')
                                .setRequired(true))
                )
        )
         .addSubcommandGroup(group =>
            group
                .setName('ausencia')
                .setDescription('Configuração do sistema de ausência.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('canal')
                        .setDescription('Define o canal para solicitar ausências.')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('O canal de texto para ausências.')
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('logs')
                        .setDescription('Define o canal de logs para aprovações/rejeições.')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('O canal de texto para logs de ausência.')
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('cargo')
                        .setDescription('Define o cargo que pode solicitar ausência.')
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('O cargo que pode pedir ausência.')
                                .setRequired(true))
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('registro')
                .setDescription('Configuração do sistema de registro.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('canal')
                        .setDescription('Define o canal onde o painel de registro será enviado.')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('O canal de texto para o registro.')
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('logs')
                        .setDescription('Define o canal de logs para novos registros.')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('O canal de texto para logs de registro.')
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('cargo')
                        .setDescription('Define o cargo que os novos membros receberão.')
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('O cargo de membro padrão.')
                                .setRequired(true))
                )
        ),

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        try {
            // Garante que a linha de configuração existe
            await db.run('INSERT INTO guild_settings (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING', [guildId]);

            let query = '';
            let params = [];
            let confirmationMessage = '';

            if (group === 'tickets') {
                const channel = interaction.options.getChannel('canal');
                const role = interaction.options.getRole('role');
                if (subcommand === 'categoria') {
                    query = 'UPDATE guild_settings SET ticket_category_id = $1 WHERE guild_id = $2';
                    params = [channel.id, guildId];
                    confirmationMessage = `✅ Categoria de tickets definida para **${channel.name}**.`;
                } else if (subcommand === 'cargo') {
                    query = 'UPDATE guild_settings SET support_role_id = $1 WHERE guild_id = $2';
                    params = [role.id, guildId];
                    confirmationMessage = `✅ Cargo de suporte para tickets definido para ${role}.`;
                } else if (subcommand === 'logs') {
                    query = 'UPDATE guild_settings SET ticket_log_channel_id = $1 WHERE guild_id = $2';
                    params = [channel.id, guildId];
                    confirmationMessage = `✅ Canal de logs de tickets definido para ${channel}.`;
                }
            } else if (group === 'ponto') {
                const channel = interaction.options.getChannel('channel');
                const role = interaction.options.getRole('role');
                 if (subcommand === 'canal') {
                    query = 'UPDATE guild_settings SET ponto_channel_id = $1 WHERE guild_id = $2';
                    params = [channel.id, guildId];
                    confirmationMessage = `✅ Canal de ponto definido para ${channel}.`;
                } else if (subcommand === 'cargo') {
                    query = 'UPDATE guild_settings SET ponto_role_id = $1 WHERE guild_id = $2';
                    params = [role.id, guildId];
                    confirmationMessage = `✅ Cargo de ponto definido para ${role}.`;
                }
            } else if (group === 'ausencia') {
                const channel = interaction.options.getChannel('channel');
                const role = interaction.options.getRole('role');
                if (subcommand === 'canal') {
                    query = 'UPDATE guild_settings SET absence_channel_id = $1 WHERE guild_id = $2';
                    params = [channel.id, guildId];
                    confirmationMessage = `✅ Canal de ausência definido para ${channel}.`;
                } else if (subcommand === 'logs') {
                    query = 'UPDATE guild_settings SET absence_log_channel_id = $1 WHERE guild_id = $2';
                    params = [channel.id, guildId];
                    confirmationMessage = `✅ Canal de logs de ausência definido para ${channel}.`;
                } else if (subcommand === 'cargo') {
                    query = 'UPDATE guild_settings SET absence_role_id = $1 WHERE guild_id = $2';
                    params = [role.id, guildId];
                    confirmationMessage = `✅ Cargo de ausência definido para ${role}.`;
                }
            } else if (group === 'registro') {
                 const channel = interaction.options.getChannel('channel');
                 const role = interaction.options.getRole('role');
                 if (subcommand === 'canal') {
                     query = 'UPDATE guild_settings SET registration_channel_id = $1 WHERE guild_id = $2';
                     params = [channel.id, guildId];
                     confirmationMessage = `✅ Canal de registro definido para ${channel}.`;
                 } else if (subcommand === 'logs') {
                     query = 'UPDATE guild_settings SET registration_log_channel_id = $1 WHERE guild_id = $2';
                     params = [channel.id, guildId];
                     confirmationMessage = `✅ Canal de logs de registro definido para ${channel}.`;
                 } else if (subcommand === 'cargo') {
                     query = 'UPDATE guild_settings SET member_role_id = $1 WHERE guild_id = $2';
                     params = [role.id, guildId];
                     confirmationMessage = `✅ Cargo de membro padrão definido para ${role}.`;
                 }
            }


            if (query) {
                await db.run(query, params);
                await interaction.reply({ content: confirmationMessage, ephemeral: true });
            } else {
                 await interaction.reply({ content: 'Comando não reconhecido.', ephemeral: true });
            }

        } catch (error) {
            console.error('Erro ao configurar:', error);
            await interaction.reply({ content: '❌ Ocorreu um erro ao salvar a configuração.', ephemeral: true });
        }
    },
};
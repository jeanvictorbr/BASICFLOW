// views/ticket_views.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { GuildConfig } = require('../database/schema'); // Importa o modelo

async function getTicketConfigDashboard(guildId) {
    const config = await GuildConfig.findOne({ where: { guildId } });

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎟️ Configuração do Sistema de Tickets')
        .setDescription('Gerencie as configurações para a criação e gerenciamento de tickets.')
        .addFields(
            { name: 'Canal de Abertura', value: config?.ticketChannelId ? `<#${config.ticketChannelId}>` : 'Não definido', inline: true },
            { name: 'Categoria para Tickets', value: config?.ticketCategoryId ? `<#${config.ticketCategoryId}>` : 'Não definido', inline: true },
            { name: 'Cargo de Suporte', value: config?.ticketSupportRoleId ? `<@&${config.ticketSupportRoleId}>` : 'Não definido', inline: true }
        )
        .setFooter({ text: `ID do Servidor: ${guildId}` });

    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_config_set_channel').setLabel('Definir Canal de Abertura').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('ticket_config_set_category').setLabel('Definir Categoria').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('ticket_config_set_role').setLabel('Definir Cargo de Suporte').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_config_send_panel').setLabel('Enviar Painel de Abertura').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('config_back_main').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
        )
    ];

    return { embeds: [embed], components: rows, ephemeral: true };
}

module.exports = { getTicketConfigDashboard };
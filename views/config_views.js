// views/config_views.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db.js');

const formatId = (id, type = 'channel') => {
    if (!id) return '`Não definido`';
    return type === 'channel' ? `<#${id}>` : `<@&${id}>`;
};

async function showMainMenu(interaction, isUpdate = false) {
    const mainEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🛠️ Painel de Controle Principal')
        .setDescription('Selecione abaixo o módulo que você deseja configurar.')
        .setImage('https://i.imgur.com/8Qp6g4M.png')
        .setTimestamp()
        .setFooter({ text: `Sistema de Configuração Interativo` });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_menu_ticket').setLabel('Tickets').setStyle(ButtonStyle.Secondary).setEmoji('🎫'),
        new ButtonBuilder().setCustomId('config_menu_ponto').setLabel('Ponto').setStyle(ButtonStyle.Secondary).setEmoji('⏰'),
        new ButtonBuilder().setCustomId('config_menu_ausencia').setLabel('Ausência').setStyle(ButtonStyle.Secondary).setEmoji('🛌'),
        new ButtonBuilder().setCustomId('config_menu_registro').setLabel('Registro').setStyle(ButtonStyle.Secondary).setEmoji('📝')
    );

    const payload = { embeds: [mainEmbed], components: [row], ephemeral: true };

    if (isUpdate) await interaction.update(payload);
    else await interaction.reply(payload);
}

async function showTicketDashboard(interaction) {
    const settings = await db.get('SELECT ticket_category_id, support_role_id, ticket_log_channel_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🎫 Configurações de Ticket')
        .addFields(
            { name: 'Categoria dos Tickets', value: `> ${formatId(settings?.ticket_category_id)}` },
            { name: 'Cargo de Suporte', value: `> ${formatId(settings?.support_role_id, 'role')}` },
            { name: 'Canal de Logs', value: `> ${formatId(settings?.ticket_log_channel_id)}` }
        );
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_ticket_categoria').setLabel('Alterar Categoria').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_ticket_cargo').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_ticket_logs').setLabel('Alterar Logs').setStyle(ButtonStyle.Primary)
    );
    const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_menu_main').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('⬅️')
    );
    await interaction.update({ embeds: [embed], components: [buttons, backButton] });
}

async function showPontoDashboard(interaction) {
    const settings = await db.get('SELECT ponto_channel_id, ponto_role_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
    const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('⏰ Configurações de Ponto')
        .addFields(
            { name: 'Canal de Ponto', value: `> ${formatId(settings?.ponto_channel_id)}` },
            { name: 'Cargo para Bater Ponto', value: `> ${formatId(settings?.ponto_role_id, 'role')}` }
        );
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_ponto_canal').setLabel('Alterar Canal').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_ponto_cargo').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary)
    );
    const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_menu_main').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('⬅️')
    );
    await interaction.update({ embeds: [embed], components: [buttons, backButton] });
}

async function showAbsenceDashboard(interaction) {
    const settings = await db.get('SELECT absence_channel_id, absence_log_channel_id, absence_role_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
    const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('🛌 Configurações de Ausência')
        .addFields(
            { name: 'Canal de Ausências', value: `> ${formatId(settings?.absence_channel_id)}` },
            { name: 'Canal de Logs de Ausência', value: `> ${formatId(settings?.absence_log_channel_id)}` },
            { name: 'Cargo para Ausência', value: `> ${formatId(settings?.absence_role_id, 'role')}` }
        );
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_ausencia_canal').setLabel('Alterar Canal').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_ausencia_logs').setLabel('Alterar Logs').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_ausencia_cargo').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary)
    );
    const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_menu_main').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('⬅️')
    );
    await interaction.update({ embeds: [embed], components: [buttons, backButton] });
}

async function showRegistrationDashboard(interaction) {
    const settings = await db.get('SELECT registration_channel_id, registration_log_channel_id, member_role_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('📝 Configurações de Registro')
        .addFields(
            { name: 'Canal de Registro', value: `> ${formatId(settings?.registration_channel_id)}` },
            { name: 'Canal de Logs de Registro', value: `> ${formatId(settings?.registration_log_channel_id)}` },
            { name: 'Cargo de Membro Padrão', value: `> ${formatId(settings?.member_role_id, 'role')}` }
        );
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_registro_canal').setLabel('Alterar Canal').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_registro_logs').setLabel('Alterar Logs').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_registro_cargo').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary)
    );
    const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_menu_main').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('⬅️')
    );
    await interaction.update({ embeds: [embed], components: [buttons, backButton] });
}

module.exports = {
    showMainMenu, showTicketDashboard, showPontoDashboard, showAbsenceDashboard, showRegistrationDashboard
};
// views/config_views.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const guildConfig = require('../database/schema');

// Função para formatar o ID do canal ou cargo para exibição
const formatId = (id, type = 'channel') => {
    if (!id) return '`Não definido`';
    return type === 'channel' ? `<#${id}>` : `<@&${id}>`;
};

/**
 * Mostra o menu principal de configurações.
 * @param {import('discord.js').Interaction} interaction
 * @param {boolean} isUpdate - Se a interação é uma atualização de uma mensagem existente.
 */
async function showMainMenu(interaction, isUpdate = false) {
    const mainEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🛠️ Painel de Controle Principal')
        .setDescription('Selecione abaixo o módulo que você deseja configurar.')
        .setImage('https://i.imgur.com/8Qp6g4M.png')
        .setTimestamp()
        .setFooter({ text: `Sistema de Configuração Interativo` });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('config_menu_ticket').setLabel('Tickets').setStyle(ButtonStyle.Secondary).setEmoji('🎫'),
            new ButtonBuilder().setCustomId('config_menu_ponto').setLabel('Ponto').setStyle(ButtonStyle.Secondary).setEmoji('⏰'),
            new ButtonBuilder().setCustomId('config_menu_ausencia').setLabel('Ausência').setStyle(ButtonStyle.Secondary).setEmoji('🛌'),
            new ButtonBuilder().setCustomId('config_menu_registro').setLabel('Registro').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
        );

    const payload = {
        embeds: [mainEmbed],
        components: [row],
        ephemeral: true,
    };

    if (isUpdate) {
        await interaction.update(payload);
    } else {
        await interaction.reply(payload);
    }
}

/**
 * Mostra o dashboard de configurações de Ticket.
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function showTicketDashboard(interaction) {
    const config = await guildConfig.findOne({ guildId: interaction.guild.id });

    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🎫 Configurações de Ticket')
        .setDescription('Gerencie as configurações do sistema de tickets.')
        .addFields(
            { name: 'Categoria dos Tickets', value: `> ${formatId(config?.ticketConfig?.categoryId)}`, inline: false },
            { name: 'Cargo de Suporte', value: `> ${formatId(config?.ticketConfig?.supportRoleId, 'role')}`, inline: false },
            { name: 'Canal de Logs', value: `> ${formatId(config?.ticketConfig?.logsChannelId)}`, inline: false }
        );

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('config_ticket_categoria').setLabel('Alterar Categoria').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('config_ticket_cargo').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('config_ticket_logs').setLabel('Alterar Logs').setStyle(ButtonStyle.Primary),
        );

    const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_menu_main').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('⬅️')
    );

    await interaction.update({ embeds: [embed], components: [buttons, backButton] });
}

/**
 * Mostra o dashboard de configurações de Ponto.
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function showPontoDashboard(interaction) {
    const config = await guildConfig.findOne({ guildId: interaction.guild.id });

    const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('⏰ Configurações de Ponto')
        .setDescription('Gerencie as configurações do sistema de ponto.')
        .addFields(
            { name: 'Canal de Ponto', value: `> ${formatId(config?.pontoConfig?.pontoChannelId)}`, inline: false },
            { name: 'Cargo para Bater Ponto', value: `> ${formatId(config?.pontoConfig?.pontoRoleId, 'role')}`, inline: false }
        );

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('config_ponto_canal').setLabel('Alterar Canal').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('config_ponto_cargo').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary),
        );

    const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_menu_main').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('⬅️')
    );

    await interaction.update({ embeds: [embed], components: [buttons, backButton] });
}

/**
 * Mostra o dashboard de configurações de Ausência.
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function showAbsenceDashboard(interaction) {
    const config = await guildConfig.findOne({ guildId: interaction.guild.id });

    const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('🛌 Configurações de Ausência')
        .setDescription('Gerencie as configurações do sistema de ausência.')
        .addFields(
            { name: 'Canal de Ausências', value: `> ${formatId(config?.absenceConfig?.absenceChannelId)}`, inline: false },
            { name: 'Canal de Logs de Ausência', value: `> ${formatId(config?.absenceConfig?.absenceLogChannelId)}`, inline: false },
            { name: 'Cargo para Ausência', value: `> ${formatId(config?.absenceConfig?.absenceRoleId, 'role')}`, inline: false }
        );

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('config_ausencia_canal').setLabel('Alterar Canal').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('config_ausencia_logs').setLabel('Alterar Logs').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('config_ausencia_cargo').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary),
        );

    const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_menu_main').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('⬅️')
    );

    await interaction.update({ embeds: [embed], components: [buttons, backButton] });
}

/**
 * Mostra o dashboard de configurações de Registro.
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function showRegistrationDashboard(interaction) {
    const config = await guildConfig.findOne({ guildId: interaction.guild.id });

    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('📝 Configurações de Registro')
        .setDescription('Gerencie as configurações do sistema de registro.')
        .addFields(
            { name: 'Canal de Registro', value: `> ${formatId(config?.registrationConfig?.registrationChannelId)}`, inline: false },
            { name: 'Canal de Logs de Registro', value: `> ${formatId(config?.registrationConfig?.registrationLogChannelId)}`, inline: false },
            { name: 'Cargo de Membro Padrão', value: `> ${formatId(config?.registrationConfig?.memberRoleId, 'role')}`, inline: false }
        );

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('config_registro_canal').setLabel('Alterar Canal').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('config_registro_logs').setLabel('Alterar Logs').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('config_registro_cargo').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary),
        );

    const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_menu_main').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('⬅️')
    );

    await interaction.update({ embeds: [embed], components: [buttons, backButton] });
}


module.exports = {
    showMainMenu,
    showTicketDashboard,
    showPontoDashboard,
    showAbsenceDashboard,
    showRegistrationDashboard,
};
// Ficheiro: views/config_views.js
// Responsável pela aparência do painel de configuração, com botões coloridos e emojis.

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db.js');

const formatSetting = (settings, key, type) => {
    const id = settings?.[key];
    if (id) {
        return `✅ ${type === 'role' ? `<@&${id}>` : `<#${id}>`}`;
    }
    return '❌ `Não definido`';
};

const formatTagSetting = (settings, key) => {
    const tag = settings?.[key];
    if (tag) { return `✅ \`[${tag}]\``; }
    return '❌ `Não definida`';
}

const formatImageSetting = (settings, key) => {
    const url = settings?.[key];
    if (url) { return `✅ [Ver Imagem](${url})`; }
    return '❌ `Padrão`';
}

async function getConfigDashboardPayload(guild) {
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guild.id]);
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('⚙️ Painel de Configuração do BasicFlow')
        .setDescription('Use os botões abaixo para configurar as funcionalidades do bot neste servidor.')
        .addFields(
            { name: 'Registo: Canal de Aprovação', value: formatSetting(settings, 'registration_channel_id', 'channel'), inline: true },
            { name: 'Registo: Cargo de Membro', value: formatSetting(settings, 'registered_role_id', 'role'), inline: true },
            { name: 'Registo: TAG de Nickname', value: formatTagSetting(settings, 'nickname_tag'), inline: true },
            { name: 'Ausência: Canal de Aprovação', value: formatSetting(settings, 'absence_channel_id', 'channel'), inline: true },
            { name: 'Ausência: Cargo de Ausente', value: formatSetting(settings, 'absence_role_id', 'role'), inline: true },
            { name: 'Ausência: Imagem do Painel', value: formatImageSetting(settings, 'absence_panel_image_url'), inline: true },
            { name: 'Ticket: Categoria', value: formatSetting(settings, 'ticket_category_id', 'channel'), inline: true },
            { name: 'Ticket: Cargo de Suporte', value: formatSetting(settings, 'support_role_id', 'role'), inline: true },
            { name: 'Ticket: Canal de Logs', value: formatSetting(settings, 'ticket_log_channel_id', 'channel'), inline: true },
            { name: 'Registo: Imagem do Painel', value: formatImageSetting(settings, 'registration_panel_image_url'), inline: true },
            { name: 'Ticket: Imagem do Painel', value: formatImageSetting(settings, 'ticket_panel_image_url'), inline: true },
            { name: '\u200B', value: '\u200B', inline: true }
        )
        .setFooter({ text: 'Powered by BasicFlow • Conheça as versões completas: Police Flow & Faction Flow!' });
    
    // --- GRUPO DE REGISTO (Verde) ---
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_set_registration_channel').setLabel('Canal').setStyle(ButtonStyle.Success).setEmoji('📝'),
        new ButtonBuilder().setCustomId('config_set_registered_role').setLabel('Cargo').setStyle(ButtonStyle.Success).setEmoji('📝'),
        new ButtonBuilder().setCustomId('config_set_nickname_tag').setLabel('TAG').setStyle(ButtonStyle.Success).setEmoji('📝'),
        new ButtonBuilder().setCustomId('config_set_panel_image').setLabel('Imagem').setStyle(ButtonStyle.Success).setEmoji('📝'),
    );
    
    // --- GRUPO DE AUSÊNCIA (Azul) ---
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_set_absence_channel').setLabel('Canal').setStyle(ButtonStyle.Primary).setEmoji('🏝️'),
        new ButtonBuilder().setCustomId('config_set_absence_role').setLabel('Cargo').setStyle(ButtonStyle.Primary).setEmoji('🏝️'),
        new ButtonBuilder().setCustomId('config_set_absence_image').setLabel('Imagem').setStyle(ButtonStyle.Primary).setEmoji('🏝️'),
    );

    // --- GRUPO DE TICKETS (Vermelho) ---
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_set_ticket_category').setLabel('Categoria').setStyle(ButtonStyle.Danger).setEmoji('🎫'),
        new ButtonBuilder().setCustomId('config_set_support_role').setLabel('Cargo Suporte').setStyle(ButtonStyle.Danger).setEmoji('🎫'),
        new ButtonBuilder().setCustomId('config_set_ticket_log_channel').setLabel('Canal Logs').setStyle(ButtonStyle.Danger).setEmoji('🎫'),
        new ButtonBuilder().setCustomId('config_set_ticket_image').setLabel('Imagem').setStyle(ButtonStyle.Danger).setEmoji('🎫'),
    );

    // --- GRUPO DE AÇÕES (Publicar e Atualizações) ---
    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_publish_registration_panel').setLabel('Publicar Registo').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('config_publish_absence_panel').setLabel('Publicar Ausência').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_publish_ticket_panel').setLabel('Publicar Ticket').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('config_view_changelog').setLabel('Atualizações').setStyle(ButtonStyle.Secondary).setEmoji('📰'),
    );
    
    return { embeds: [embed], components: [row1, row2, row3, row4] };
}

module.exports = { 
    getConfigDashboardPayload,
};


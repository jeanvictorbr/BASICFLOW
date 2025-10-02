// Ficheiro: views/config_views.js
// Responsável pela aparência do painel de configuração.

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
            { name: 'Canal de Aprovação (Registos)', value: formatSetting(settings, 'registration_channel_id', 'channel'), inline: true },
            { name: 'Canal de Ausências', value: formatSetting(settings, 'absence_channel_id', 'channel'), inline: true },
            { name: 'Cargo de Membro Registado', value: formatSetting(settings, 'registered_role_id', 'role'), inline: true },
            { name: 'Cargo de Membro Ausente', value: formatSetting(settings, 'absence_role_id', 'role'), inline: true },
            { name: 'TAG de Nickname', value: formatTagSetting(settings, 'nickname_tag'), inline: true },
            { name: 'Imagem do Painel de Registo', value: formatImageSetting(settings, 'registration_panel_image_url'), inline: true }
        )
        .setFooter({ text: 'Powered by BasicFlow • Conheça as versões completas: Police Flow & Faction Flow!' });
    
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_set_registration_channel').setLabel('Canal de Registos').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_set_absence_channel').setLabel('Canal de Ausências').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_set_nickname_tag').setLabel('Definir TAG').setStyle(ButtonStyle.Secondary).setEmoji('🏷️'),
    );
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_set_registered_role').setLabel('Cargo de Membro').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_set_absence_role').setLabel('Cargo de Ausente').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_set_panel_image').setLabel('Imagem do Painel').setStyle(ButtonStyle.Secondary).setEmoji('🖼️')
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('config_publish_registration_panel')
            .setLabel('Publicar Painel de Registo')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📝'),
        new ButtonBuilder()
            .setCustomId('config_publish_absence_panel')
            .setLabel('Publicar Painel de Ausência')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🏝️'),
        new ButtonBuilder()
            .setCustomId('config_publish_ticket_panel')
            .setLabel('Publicar Painel de Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🎫')
    );

    return { embeds: [embed], components: [row1, row2, row3] };
}

module.exports = {
    getConfigDashboardPayload,
};
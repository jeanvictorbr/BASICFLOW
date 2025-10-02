// Ficheiro: views/ticket_views.js
// Reconstruído com um dashboard dinâmico e mais botões.

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db.js');

const BOT_LOG_IMAGE_URL = 'https://i.imgur.com/YuK1aVN.gif';

async function getTicketPanelPayload(guildId) {
    const settings = await db.get('SELECT ticket_panel_image_url FROM guild_settings WHERE guild_id = $1', [guildId]);
    const imageUrl = settings?.ticket_panel_image_url || BOT_LOG_IMAGE_URL;

    const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🎫 Central de Atendimento')
        .setDescription('Precisa de ajuda ou tem alguma questão para a administração?\n\nClique no botão abaixo para abrir um ticket privado. A nossa equipa de suporte irá atendê-lo assim que possível.')
        .setImage(imageUrl)
        .setFooter({ text: 'BasicFlow • Sistema de Tickets' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('open_ticket')
            .setLabel('Abrir Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('📩')
    );
    return { embeds: [embed], components: [row] };
}

function getTicketDashboardPayload(ticketData) {
    const { user, guild, ticketId, claimed_by } = ticketData;
    let status = '🟢 Aberto';
    if (claimed_by) {
        status = `🟡 Atendido por <@${claimed_by}>`;
    }

    const embed = new EmbedBuilder()
        .setColor(claimed_by ? 0xFEE75C : 0x57F287)
        .setTitle(`Ticket #${ticketId}`)
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
        .setThumbnail(guild.iconURL())
        .setImage(BOT_LOG_IMAGE_URL)
        .addFields(
            { name: 'Utilizador', value: `${user}`, inline: true },
            { name: 'Status', value: status, inline: true },
            { name: 'Data de Abertura', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
        )
        .setFooter({ text: `Servidor: ${guild.name}` });
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`close_ticket_prompt:${ticketId}`)
            .setLabel('Fechar')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
        new ButtonBuilder()
            .setCustomId(`claim_ticket:${ticketId}`)
            .setLabel('Reivindicar')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🙋')
            .setDisabled(!!claimed_by), // Desativa se já foi reivindicado
        new ButtonBuilder()
            .setCustomId(`transcript_ticket:${ticketId}`)
            .setLabel('Transcrição')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📜'),
        new ButtonBuilder()
            .setCustomId(`alert_staff:${ticketId}`)
            .setLabel('Alertar Staff')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔔')
    );
    return { embeds: [embed], components: [row] };
}

module.exports = { getTicketPanelPayload, getTicketDashboardPayload };


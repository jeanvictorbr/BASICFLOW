// Ficheiro: views/ticket_views.js (VERSÃO FINAL COM IMAGEM CORRIGIDA)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../database/db.js');

async function getTicketPanelPayload(guildId) {
    const settings = await db.get('SELECT ticket_panel_image_url FROM guild_settings WHERE guild_id = $1', [guildId]);
    const imageUrl = settings?.ticket_panel_image_url;

    const components = [
        {
            type: ComponentType.Container,
            color: 0xE74C3C,
            components: [
                { type: ComponentType.TextDisplay, content: '## 🎫 Central de Atendimento' },
                { type: ComponentType.TextDisplay, content: 'Precisa de ajuda ou tem alguma questão para a administração?\n\nClique no botão abaixo para abrir um ticket privado.' },
            ]
        },
    ];

    if (imageUrl) {
        components.push({
            type: ComponentType.MediaGallery,
            items: [{
                type: ComponentType.MediaGalleryItem,
                media: {
                    type: 0, // Image
                    url: imageUrl // <<< A CORREÇÃO ESTÁ AQUI
                }
            }]
        });
    }

    components.push({
        type: ComponentType.ActionRow,
        components: [{
            type: ComponentType.Button,
            style: ButtonStyle.Danger,
            label: 'Abrir Ticket',
            emoji: { name: '📩' },
            custom_id: 'open_ticket',
        }]
    });

    return { flags: 1 << 15, components, content: '' };
}

// O restante do arquivo não muda
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
        .addFields(
            { name: 'Utilizador', value: `${user}`, inline: true },
            { name: 'Status', value: status, inline: true },
            { name: 'Data de Abertura', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
        )
        .setFooter({ text: `Servidor: ${guild.name}` });
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`close_ticket_prompt:${ticketId}`).setLabel('Fechar').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
        new ButtonBuilder().setCustomId(`claim_ticket:${ticketId}`).setLabel('Reivindicar').setStyle(ButtonStyle.Primary).setEmoji('🙋').setDisabled(!!claimed_by),
        new ButtonBuilder().setCustomId(`transcript_ticket:${ticketId}`).setLabel('Transcrição').setStyle(ButtonStyle.Secondary).setEmoji('📜'),
        new ButtonBuilder().setCustomId(`alert_staff:${ticketId}`).setLabel('Alertar Staff').setStyle(ButtonStyle.Secondary).setEmoji('🔔')
    );
    return { embeds: [embed], components: [row] };
}

module.exports = { getTicketPanelPayload, getTicketDashboardPayload };
// Ficheiro: views/ticket_views.js
// Responsável pela aparência do sistema de tickets, agora com dashboard.

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function getTicketPanelPayload() {
    const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🎫 Central de Atendimento')
        .setDescription('Precisa de ajuda ou tem alguma questão para a administração?\n\nClique no botão abaixo para abrir um ticket privado. A nossa equipa de suporte irá atendê-lo assim que possível.')
        .setImage('https://i.imgur.com/YuK1aVN.gif') // Usando a imagem padrão dos logs
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
    const { user, ticketId, claimed_by } = ticketData;

    let status = '🟢 Aberto';
    if (claimed_by) {
        status = `🟡 Atendido por <@${claimed_by}>`;
    }

    const embed = new EmbedBuilder()
        .setColor(claimed_by ? 0xFEE75C : 0x57F287)
        .setTitle(`Ticket #${ticketId}`)
        .setDescription(`Bem-vindo(a) ao seu canal de suporte, ${user}. Por favor, descreva o seu problema em detalhe.`)
        .addFields(
            { name: 'Utilizador', value: `${user}`, inline: true },
            { name: 'Status', value: status, inline: true },
            { name: 'Data de Abertura', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
        );
    
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
            .setEmoji('📜')
    );
    return { embeds: [embed], components: [row] };
}

module.exports = { getTicketPanelPayload, getTicketDashboardPayload };
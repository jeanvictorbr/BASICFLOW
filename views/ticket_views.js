// Ficheiro: views/ticket_views.js
// Responsável pela aparência do sistema de tickets.

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function getTicketPanelPayload() {
    const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🎫 Central de Atendimento')
        .setDescription('Precisa de ajuda ou tem alguma questão para a administração?\n\nClique no botão abaixo para abrir um ticket privado. A nossa equipa de suporte irá atendê-lo assim que possível.')
        .setImage('https://placehold.co/1200x400/e74c3c/FFFFFF/png?text=SUPORTE')
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

function getTicketChannelWelcomePayload(user, supportRole) {
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`Bem-vindo(a) ao seu Ticket, ${user.username}!`)
        .setDescription(`Por favor, descreva o seu problema ou questão em detalhe para que a equipa de suporte possa ajudá-lo.\n\nA equipa de <@&${supportRole}> já foi notificada.`);
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('close_ticket_prompt')
            .setLabel('Fechar Ticket')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔒')
    );
    return { content: `${user} <@&${supportRole}>`, embeds: [embed], components: [row] };
}

module.exports = { getTicketPanelPayload, getTicketChannelWelcomePayload };
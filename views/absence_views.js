// Ficheiro: views/absence_views.js
// Responsável pela aparência do sistema de ausências (painel, formulário e log).

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const ABSENCE_IMAGE_URL = 'https://placehold.co/1200x400/3498db/FFFFFF/png?text=Central+de+Aus%C3%AAncias';

function getAbsencePanelPayload() {
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🏝️ Central de Ausências')
        .setDescription('Precisa de se ausentar por um período?\n\nUtilize o botão abaixo para notificar a administração. O seu pedido será analisado e, se aprovado, você receberá o cargo de ausente para evitar ser removido por inatividade.')
        .setImage(ABSENCE_IMAGE_URL)
        .setFooter({ text: 'BasicFlow • Sistema de Ausências' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('initiate_absence')
            .setLabel('Informar Ausência')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🗓️')
    );

    return { embeds: [embed], components: [row] };
}

function getAbsenceModal() {
    return new ModalBuilder()
        .setCustomId('absence_modal_submit')
        .setTitle('Formulário de Pedido de Ausência')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('start_date_input')
                    .setLabel('Data de Início da Ausência')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Formato: DD/MM/AAAA (ex: 25/12/2025)')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('end_date_input')
                    .setLabel('Data de Fim da Ausência')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Formato: DD/MM/AAAA (ex: 05/01/2026)')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('reason_input')
                    .setLabel('Motivo da Ausência')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Ex: Viagem de férias, problemas pessoais, etc.')
                    .setRequired(true)
            )
        );
}

function getAbsenceApprovalPayload(interaction, startDate, endDate, reason) {
    const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('📥 Novo Pedido de Ausência')
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
            { name: '👤 Utilizador', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: false },
            { name: '🗓️ Período', value: `De \`${startDate}\` até \`${endDate}\``, inline: false },
            { name: '📝 Motivo', value: `\`\`\`${reason}\`\`\``, inline: false },
        )
        .setTimestamp();
        
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`approve_absence:${interaction.user.id}`)
            .setLabel('Aprovar')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`reject_absence:${interaction.user.id}`)
            .setLabel('Rejeitar')
            .setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row] };
}


module.exports = {
    getAbsencePanelPayload,
    getAbsenceModal,
    getAbsenceApprovalPayload
};
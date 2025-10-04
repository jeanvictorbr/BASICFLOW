// Ficheiro: views/absence_views.js (VERSÃO FINAL COM IMAGEM CORRIGIDA)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType } = require('discord.js');
const db = require('../database/db.js');

async function getAbsencePanelPayload(guildId) {
    const settings = await db.get('SELECT absence_panel_image_url FROM guild_settings WHERE guild_id = $1', [guildId]);
    const imageUrl = settings?.absence_panel_image_url;

    const components = [
        {
            type: ComponentType.Container,
            color: 0x3498DB,
            components: [
                { type: ComponentType.TextDisplay, content: '## 🏝️ Central de Ausências' },
                { type: ComponentType.TextDisplay, content: 'Precisa de se ausentar por um período?\n\nUtilize o botão abaixo para notificar a administração. O seu pedido será analisado e, se aprovado, você receberá o cargo de ausente.' },
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
            style: ButtonStyle.Primary,
            label: 'Informar Ausência',
            emoji: { name: '🗓️' },
            custom_id: 'initiate_absence',
        }]
    });

    return { flags: 1 << 15, components, content: '' };
}

// O restante do arquivo não muda
function getAbsenceModal() {
    return new ModalBuilder()
        .setCustomId('absence_modal_submit')
        .setTitle('Formulário de Pedido de Ausência')
        .addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('start_date_input').setLabel('Data de Início da Ausência').setStyle(TextInputStyle.Short).setPlaceholder('DD/MM/AAAA').setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('end_date_input').setLabel('Data de Fim da Ausência').setStyle(TextInputStyle.Short).setPlaceholder('DD/MM/AAAA').setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason_input').setLabel('Motivo da Ausência').setStyle(TextInputStyle.Paragraph).setPlaceholder('Ex: Viagem de férias, etc.').setRequired(true))
        );
}

function getAbsenceApprovalPayload(interaction, startDate, endDate, reason) {
    const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('📥 Novo Pedido de Ausência')
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
            { name: '👤 Utilizador', value: `${interaction.user} (\`${interaction.user.id}\`)` },
            { name: '🗓️ Período', value: `De \`${startDate}\` até \`${endDate}\`` },
            { name: '📝 Motivo', value: `\`\`\`${reason}\`\`\`` },
        )
        .setTimestamp();
        
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`approve_absence:${interaction.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_absence:${interaction.user.id}`).setLabel('Rejeitar').setStyle(ButtonStyle.Danger)
    );
    return { embeds: [embed], components: [row] };
}

module.exports = { getAbsencePanelPayload, getAbsenceModal, getAbsenceApprovalPayload };
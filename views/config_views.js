// Ficheiro: views/config_views.js (VERSÃO FINAL OTIMIZADA)
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../database/db.js');

// Helper para formatar o status da configuração para o texto principal
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

async function getConfigDashboardPayload(guild, userId) {
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guild.id]);

    // Construir o texto principal usando Markdown
    const description = `
# ⚙️ Painel de Configuração do BasicFlow
Utilize os botões abaixo para configurar as funcionalidades do bot.

---

### 📝 Registos
- **Canal de Logs:** ${formatSetting(settings, 'registration_channel_id', 'channel')}
- **Cargo de Membro:** ${formatSetting(settings, 'registered_role_id', 'role')}
- **TAG de Nickname:** ${formatTagSetting(settings, 'nickname_tag')}
- **Imagem do Painel:** ${formatImageSetting(settings, 'registration_panel_image_url')}

### 🏝️ Ausências
- **Canal de Logs:** ${formatSetting(settings, 'absence_channel_id', 'channel')}
- **Cargo de Ausente:** ${formatSetting(settings, 'absence_role_id', 'role')}
- **Imagem do Painel:** ${formatImageSetting(settings, 'absence_panel_image_url')}

### 🎫 Tickets
- **Categoria:** ${formatSetting(settings, 'ticket_category_id', 'channel')}
- **Cargo de Suporte:** ${formatSetting(settings, 'support_role_id', 'role')}
- **Canal de Logs:** ${formatSetting(settings, 'ticket_log_channel_id', 'channel')}
- **Imagem do Painel:** ${formatImageSetting(settings, 'ticket_panel_image_url')}
`;

    // Botões organizados em linhas
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_set_registration_channel').setLabel('Registo-Canal').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_set_registered_role').setLabel('Registo-Cargo').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_set_nickname_tag').setLabel('Registo-TAG').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_set_panel_image').setLabel('Registo-Imagem').setStyle(ButtonStyle.Primary),
    );
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_set_absence_channel').setLabel('Ausência-Canal').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_set_absence_role').setLabel('Ausência-Cargo').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_set_absence_image').setLabel('Ausência-Imagem').setStyle(ButtonStyle.Secondary),
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_set_ticket_category').setLabel('Ticket-Categoria').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('config_set_support_role').setLabel('Ticket-Cargo Suporte').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('config_set_ticket_log_channel').setLabel('Ticket-Canal Logs').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('config_set_ticket_image').setLabel('Ticket-Imagem').setStyle(ButtonStyle.Danger),
    );

    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_publish_registration_panel').setLabel('Publicar Registo').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('config_publish_absence_panel').setLabel('Publicar Ausência').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('config_publish_ticket_panel').setLabel('Publicar Ticket').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('config_view_changelog').setLabel('Ver Atualizações').setStyle(ButtonStyle.Secondary),
    );

    const components = [row1, row2, row3, row4];

    if (userId === process.env.OWNER_ID) {
        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('dev_panel').setEmoji('🔒').setLabel('Painel do Dono').setStyle(ButtonStyle.Secondary)
            )
        );
    }
    
    return {
        flags: 1 << 15, // MessageFlags.IsComponentsV2
        components: [
            {
                type: ComponentType.TextDisplay,
                content: description,
            },
            ...components
        ],
        embeds: [],
        content: '',
    };
}

module.exports = { 
    getConfigDashboardPayload,
};
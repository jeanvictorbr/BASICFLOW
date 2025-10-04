// Ficheiro: views/config_views.js (VERSÃO COM LAYOUT COMPONENTS V2)
const { ButtonBuilder, ButtonStyle, ComponentType, ActionRowBuilder } = require('discord.js');
const db = require('../database/db.js');

// Helper para formatar o texto da configuração
const formatSettingText = (settings, key, type) => {
    const id = settings?.[key];
    if (id) {
        return `✅ ${type === 'role' ? `<@&${id}>` : `<#${id}>`}`;
    }
    return '❌ `Não definido`';
};

const formatTagSettingText = (settings, key) => {
    const tag = settings?.[key];
    if (tag) { return `✅ \`[${tag}]\``; }
    return '❌ `Não definida`';
}

const formatImageSettingText = (settings, key) => {
    const url = settings?.[key];
    if (url) { return `✅ [Ver Imagem](${url})`; }
    return '❌ `Padrão`';
}

// Função que cria uma Seção de configuração (Texto + Botão)
function createSettingSection(label, status, buttonId, style) {
    return {
        type: ComponentType.Section,
        components: [{
            type: ComponentType.TextDisplay,
            content: `**${label}:** ${status}`,
        }],
        accessory: {
            type: ComponentType.Button,
            style: style,
            label: 'Alterar',
            custom_id: buttonId,
        },
    };
}

async function getConfigDashboardPayload(guild, userId) {
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guild.id]);

    const components = [
        // Título Principal
        {
            type: ComponentType.TextDisplay,
            content: '# ⚙️ Painel de Configuração do BasicFlow\nUtilize os botões abaixo para configurar as funcionalidades do bot.',
        },
        { type: ComponentType.Separator },

        // --- Container de REGISTO ---
        {
            type: ComponentType.Container,
            color: 0x5865F2, // Azul Discord
            children: [
                { type: ComponentType.TextDisplay, content: '### 📝 Configurações de Registo' },
                createSettingSection('Canal de Logs', formatSettingText(settings, 'registration_channel_id', 'channel'), 'config_set_registration_channel', ButtonStyle.Primary),
                createSettingSection('Cargo de Membro', formatSettingText(settings, 'registered_role_id', 'role'), 'config_set_registered_role', ButtonStyle.Primary),
                createSettingSection('TAG de Nickname', formatTagSettingText(settings, 'nickname_tag'), 'config_set_nickname_tag', ButtonStyle.Primary),
                createSettingSection('Imagem do Painel', formatImageSettingText(settings, 'registration_panel_image_url'), 'config_set_panel_image', ButtonStyle.Primary),
            ],
        },

        // --- Container de AUSÊNCIA ---
        {
            type: ComponentType.Container,
            color: 0x3498DB, // Azul Claro
            children: [
                { type: ComponentType.TextDisplay, content: '### 🏝️ Configurações de Ausência' },
                createSettingSection('Canal de Logs', formatSettingText(settings, 'absence_channel_id', 'channel'), 'config_set_absence_channel', ButtonStyle.Primary),
                createSettingSection('Cargo de Ausente', formatSettingText(settings, 'absence_role_id', 'role'), 'config_set_absence_role', ButtonStyle.Primary),
                createSettingSection('Imagem do Painel', formatImageSettingText(settings, 'absence_panel_image_url'), 'config_set_absence_image', ButtonStyle.Primary),
            ],
        },
        
        // --- Container de TICKET ---
        {
            type: ComponentType.Container,
            color: 0xE74C3C, // Vermelho
            children: [
                { type: ComponentType.TextDisplay, content: '### 🎫 Configurações de Ticket' },
                createSettingSection('Categoria', formatSettingText(settings, 'ticket_category_id', 'channel'), 'config_set_ticket_category', ButtonStyle.Primary),
                createSettingSection('Cargo de Suporte', formatSettingText(settings, 'support_role_id', 'role'), 'config_set_support_role', ButtonStyle.Primary),
                createSettingSection('Canal de Logs', formatSettingText(settings, 'ticket_log_channel_id', 'channel'), 'config_set_ticket_log_channel', ButtonStyle.Primary),
                createSettingSection('Imagem do Painel', formatImageSettingText(settings, 'ticket_panel_image_url'), 'config_set_ticket_image', ButtonStyle.Primary),
            ],
        },
        { type: ComponentType.Separator },

        // --- Botões de Ação (Publicar e Changelog) ---
        // ActionRow ainda é usado para agrupar botões horizontalmente
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('config_publish_registration_panel').setLabel('Publicar Registo').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('config_publish_absence_panel').setLabel('Publicar Ausência').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('config_publish_ticket_panel').setLabel('Publicar Ticket').setStyle(ButtonStyle.Success),
        ),
         new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('config_view_changelog').setLabel('Ver Atualizações').setStyle(ButtonStyle.Secondary),
        ),
    ];
    
    // Adiciona o botão de desenvolvedor secreto, se for o dono
    if (userId === process.env.OWNER_ID) {
        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('dev_panel').setEmoji('🔒').setLabel('Painel do Dono').setStyle(ButtonStyle.Danger)
            )
        );
    }
    
    // O payload final precisa da flag para ativar a V2
    return {
        flags: 1 << 15, // MessageFlags.IsComponentsV2
        components,
        embeds: [], // Importante zerar os embeds antigos
        content: '',  // Importante zerar o content antigo
    };
}

module.exports = { 
    getConfigDashboardPayload,
};
// Ficheiro: views/config_views.js (VERSÃO FINAL COM NAVEGAÇÃO)
const { ButtonStyle, ComponentType } = require('discord.js');
const db = require('../database/db.js');

// Helper para formatar o texto da configuração
const formatSettingText = (settings, key, type) => {
    const id = settings?.[key];
    if (id) return `✅ ${type === 'role' ? `<@&${id}>` : `<#${id}>`}`;
    return '❌ `Não definido`';
};

const formatTagSettingText = (settings, key) => {
    const tag = settings?.[key];
    if (tag) return `✅ \`[${tag}]\``;
    return '❌ `Não definida`';
};

const formatImageSettingText = (settings, key) => {
    const url = settings?.[key];
    if (url) return `✅ [Ver Imagem](${url})`;
    return '❌ `Padrão`';
};

// Função que cria uma Seção de configuração (Texto + Botão de Alterar)
function createSettingSection(label, status, buttonId) {
    return {
        type: ComponentType.Section,
        components: [{ type: ComponentType.TextDisplay, content: `**${label}:** ${status}` }],
        accessory: { type: ComponentType.Button, style: ButtonStyle.Primary, label: 'Alterar', custom_id: buttonId },
    };
}

// Gera a TELA PRINCIPAL com as categorias
async function getConfigDashboardPayload(guild, userId) {
    const components = [
        { type: ComponentType.TextDisplay, content: '# ⚙️ Painel de Configuração\nSelecione uma categoria para gerir as suas configurações.' },
        { type: ComponentType.Separator },
        {
            type: ComponentType.Section,
            components: [{ type: ComponentType.TextDisplay, content: '### 📝 Registos\n*Configurações para o sistema de registo de novos membros.*' }],
            accessory: { type: ComponentType.Button, style: ButtonStyle.Success, label: 'Gerir Registos', custom_id: 'config_menu:registration' }
        },
        {
            type: ComponentType.Section,
            components: [{ type: ComponentType.TextDisplay, content: '### 🏝️ Ausências\n*Configurações para o sistema de ausências.*' }],
            accessory: { type: ComponentType.Button, style: ButtonStyle.Success, label: 'Gerir Ausências', custom_id: 'config_menu:absence' }
        },
        {
            type: ComponentType.Section,
            components: [{ type: ComponentType.TextDisplay, content: '### 🎫 Tickets\n*Configurações para o sistema de atendimento.*' }],
            accessory: { type: ComponentType.Button, style: ButtonStyle.Success, label: 'Gerir Tickets', custom_id: 'config_menu:ticket' }
        },
        { type: ComponentType.Separator },
        {
            type: ComponentType.ActionRow,
            components: [
                { type: ComponentType.Button, style: ButtonStyle.Secondary, label: 'Ver Atualizações', custom_id: 'config_view_changelog' },
                ...(userId === process.env.OWNER_ID ? [{ type: ComponentType.Button, style: ButtonStyle.Danger, label: 'Painel do Dono', emoji: { name: '🔒' }, custom_id: 'dev_panel' }] : [])
            ]
        }
    ];

    return { flags: 1 << 15, components, embeds: [], content: '' };
}

// Gera a TELA SECUNDÁRIA para uma categoria específica
async function getCategoryPayload(guild, category) {
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guild.id]);
    let title = '';
    let categoryComponents = [];

    switch (category) {
        case 'registration':
            title = '### 📝 Configurações de Registo';
            categoryComponents = [
                createSettingSection('Canal de Logs', formatSettingText(settings, 'registration_channel_id', 'channel'), 'config_set_registration_channel'),
                createSettingSection('Cargo de Membro', formatSettingText(settings, 'registered_role_id', 'role'), 'config_set_registered_role'),
                createSettingSection('TAG de Nickname', formatTagSettingText(settings, 'nickname_tag'), 'config_set_nickname_tag'),
                createSettingSection('Imagem do Painel', formatImageSettingText(settings, 'registration_panel_image_url'), 'config_set_panel_image'),
                {
                    type: ComponentType.ActionRow,
                    components: [{ type: ComponentType.Button, style: ButtonStyle.Success, label: 'Publicar Painel de Registo', custom_id: 'config_publish_registration_panel' }]
                }
            ];
            break;
        case 'absence':
            title = '### 🏝️ Configurações de Ausência';
            categoryComponents = [
                createSettingSection('Canal de Logs', formatSettingText(settings, 'absence_channel_id', 'channel'), 'config_set_absence_channel'),
                createSettingSection('Cargo de Ausente', formatSettingText(settings, 'absence_role_id', 'role'), 'config_set_absence_role'),
                createSettingSection('Imagem do Painel', formatImageSettingText(settings, 'absence_panel_image_url'), 'config_set_absence_image'),
                 {
                    type: ComponentType.ActionRow,
                    components: [{ type: ComponentType.Button, style: ButtonStyle.Success, label: 'Publicar Painel de Ausência', custom_id: 'config_publish_absence_panel' }]
                }
            ];
            break;
        case 'ticket':
            title = '### 🎫 Configurações de Ticket';
            categoryComponents = [
                createSettingSection('Categoria', formatSettingText(settings, 'ticket_category_id', 'channel'), 'config_set_ticket_category'),
                createSettingSection('Cargo de Suporte', formatSettingText(settings, 'support_role_id', 'role'), 'config_set_support_role'),
                createSettingSection('Canal de Logs', formatSettingText(settings, 'ticket_log_channel_id', 'channel'), 'config_set_ticket_log_channel'),
                createSettingSection('Imagem do Painel', formatImageSettingText(settings, 'ticket_panel_image_url'), 'config_set_ticket_image'),
                 {
                    type: ComponentType.ActionRow,
                    components: [{ type: ComponentType.Button, style: ButtonStyle.Success, label: 'Publicar Painel de Ticket', custom_id: 'config_publish_ticket_panel' }]
                }
            ];
            break;
    }

    const components = [
        { type: ComponentType.TextDisplay, content: title },
        { type: ComponentType.Separator },
        ...categoryComponents,
        { type: ComponentType.Separator },
        {
            type: ComponentType.ActionRow,
            components: [{ type: ComponentType.Button, style: ButtonStyle.Secondary, label: 'Voltar', emoji: { name: '⬅️' }, custom_id: 'config_menu:main' }]
        }
    ];

    return { flags: 1 << 15, components, embeds: [], content: '' };
}

module.exports = { 
    getConfigDashboardPayload,
    getCategoryPayload,
};
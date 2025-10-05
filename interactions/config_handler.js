// interactions/config_handler.js

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database/db.js');

// Função genérica para criar modais
function createConfigModal(modalId, title, inputId, inputLabel, placeholder) {
    return new ModalBuilder().setCustomId(modalId).setTitle(title).addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId(inputId).setLabel(inputLabel).setStyle(TextInputStyle.Short).setPlaceholder(placeholder).setRequired(true)
        )
    );
}

// Mapa para criar os modais de forma dinâmica
const modalConfigs = {
    'config_ticket_categoria': { id: 'modal_ticket_cat', title: 'Configurar Categoria de Tickets', label: 'ID da Categoria' },
    'config_ticket_cargo': { id: 'modal_ticket_role', title: 'Configurar Cargo de Suporte', label: 'ID do Cargo' },
    'config_ticket_logs': { id: 'modal_ticket_logs', title: 'Configurar Canal de Logs', label: 'ID do Canal' },
    // Adicione os outros módulos aqui
};

// Mapa para definir qual coluna do DB cada modal vai atualizar
const modalSaveActions = {
    'modal_ticket_cat': { dbColumn: 'ticket_category_id', msg: (id) => `✅ Categoria de tickets definida para <#${id}>.` },
    'modal_ticket_role': { dbColumn: 'support_role_id', msg: (id) => `✅ Cargo de suporte definido para <@&${id}>.` },
    'modal_ticket_logs': { dbColumn: 'ticket_log_channel_id', msg: (id) => `✅ Canal de logs de tickets definido para <#${id}>.` },
    // Adicione os outros módulos aqui
};

async function handleConfigButton(interaction) {
    const config = modalConfigs[interaction.customId];
    if (config) {
        const modal = createConfigModal(config.id, config.title, 'setting_id', config.label, 'Cole o ID aqui');
        await interaction.showModal(modal);
    }
}

async function handleConfigModal(interaction) {
    const action = modalSaveActions[interaction.customId];
    if (!action) return;

    try {
        await interaction.deferReply({ ephemeral: true });
        const guildId = interaction.guild.id;
        const newId = interaction.fields.getTextInputValue('setting_id');
        const column = action.dbColumn;

        // Query que insere ou atualiza o campo específico
        const query = `
            INSERT INTO guild_settings (guild_id, ${column}) 
            VALUES ($1, $2) 
            ON CONFLICT (guild_id) 
            DO UPDATE SET ${column} = $2;
        `;

        await db.run(query, [guildId, newId]);

        await interaction.editReply({ content: action.msg(newId) });
    } catch (error) {
        console.error('Erro ao salvar configuração (PostgreSQL):', error);
        await interaction.editReply({ content: '❌ Ocorreu um erro ao salvar a configuração.' });
    }
}

module.exports = { handleConfigButton, handleConfigModal };
// interactions/config_dashboard_handler.js

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database/db.js');

// Função para criar modais
function createConfigModal(modalId, title, inputLabel) {
    return new ModalBuilder().setCustomId(modalId).setTitle(title).addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('setting_id').setLabel(inputLabel).setStyle(TextInputStyle.Short).setPlaceholder('Cole o ID aqui').setRequired(true)
        )
    );
}

// Mapa para abrir os modais corretos
const modalConfigs = {
    'config_ticket_categoria': { id: 'modal_ticket_cat', title: 'Configurar Categoria de Tickets', label: 'ID da Categoria' },
    'config_ticket_cargo': { id: 'modal_ticket_role', title: 'Configurar Cargo de Suporte', label: 'ID do Cargo' },
    'config_ticket_logs': { id: 'modal_ticket_logs', title: 'Configurar Canal de Logs (Tickets)', label: 'ID do Canal de Logs' },
    'config_ponto_canal': { id: 'modal_ponto_chan', title: 'Configurar Canal de Ponto', label: 'ID do Canal de Ponto' },
    'config_ponto_cargo': { id: 'modal_ponto_role', title: 'Configurar Cargo de Ponto', label: 'ID do Cargo de Ponto' },
    'config_ausencia_canal': { id: 'modal_absence_chan', title: 'Configurar Canal de Ausência', label: 'ID do Canal de Ausência' },
    'config_ausencia_logs': { id: 'modal_absence_logs', title: 'Configurar Logs de Ausência', label: 'ID do Canal de Logs' },
    'config_ausencia_cargo': { id: 'modal_absence_role', title: 'Configurar Cargo de Ausência', label: 'ID do Cargo de Ausência' },
    'config_registro_canal': { id: 'modal_reg_chan', title: 'Configurar Canal de Registro', label: 'ID do Canal de Registro' },
    'config_registro_logs': { id: 'modal_reg_logs', title: 'Configurar Logs de Registro', label: 'ID do Canal de Logs' },
    'config_registro_cargo': { id: 'modal_reg_role', title: 'Configurar Cargo de Membro', label: 'ID do Cargo de Membro' },
};

// Mapa para salvar os dados no banco de dados
const modalSaveActions = {
    'modal_ticket_cat': { dbColumn: 'ticket_category_id', msg: (id) => `✅ Categoria de tickets definida para <#${id}>.` },
    'modal_ticket_role': { dbColumn: 'support_role_id', msg: (id) => `✅ Cargo de suporte definido para <@&${id}>.` },
    'modal_ticket_logs': { dbColumn: 'ticket_log_channel_id', msg: (id) => `✅ Canal de logs de tickets definido para <#${id}>.` },
    'modal_ponto_chan': { dbColumn: 'ponto_channel_id', msg: (id) => `✅ Canal de ponto definido para <#${id}>.` },
    'modal_ponto_role': { dbColumn: 'ponto_role_id', msg: (id) => `✅ Cargo de ponto definido para <@&${id}>.` },
    'modal_absence_chan': { dbColumn: 'absence_channel_id', msg: (id) => `✅ Canal de ausência definido para <#${id}>.` },
    'modal_absence_logs': { dbColumn: 'absence_log_channel_id', msg: (id) => `✅ Canal de logs de ausência definido para <#${id}>.` },
    'modal_absence_role': { dbColumn: 'absence_role_id', msg: (id) => `✅ Cargo de ausência definido para <@&${id}>.` },
    'modal_reg_chan': { dbColumn: 'registration_channel_id', msg: (id) => `✅ Canal de registro definido para <#${id}>.` },
    'modal_reg_logs': { dbColumn: 'registration_log_channel_id', msg: (id) => `✅ Canal de logs de registro definido para <#${id}>.` },
    'modal_reg_role': { dbColumn: 'member_role_id', msg: (id) => `✅ Cargo de membro definido para <@&${id}>.` },
};

async function handleConfigButton(interaction) {
    const config = modalConfigs[interaction.customId];
    if (config) {
        const modal = createConfigModal(config.id, config.title, config.label);
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
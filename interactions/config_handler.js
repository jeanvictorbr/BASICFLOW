// interactions/config_handler.js

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const pool = require('../database/db');
const { get: deepGet, set: deepSet } = require('lodash');

// Helper para criar modais
function createConfigModal(modalId, title, inputId, label, placeholder) {
    return new ModalBuilder().setCustomId(modalId).setTitle(title).addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId(inputId).setLabel(label).setStyle(TextInputStyle.Short).setPlaceholder(placeholder).setRequired(true)
        )
    );
}

// Mapa de configuração para os modais
const modalConfigs = {
    'config_ticket_categoria': { id: 'modal_ticket_cat', title: 'Configurar Categoria de Tickets', label: 'ID da Categoria', placeholder: 'Cole o ID da categoria aqui' },
    'config_ticket_cargo': { id: 'modal_ticket_role', title: 'Configurar Cargo de Suporte', label: 'ID do Cargo', placeholder: 'Cole o ID do cargo aqui' },
    'config_ticket_logs': { id: 'modal_ticket_logs', title: 'Configurar Canal de Logs', label: 'ID do Canal', placeholder: 'Cole o ID do canal de texto aqui' },
    'config_ponto_canal': { id: 'modal_ponto_chan', title: 'Configurar Canal de Ponto', label: 'ID do Canal', placeholder: 'Cole o ID do canal de texto aqui' },
    'config_ponto_cargo': { id: 'modal_ponto_role', title: 'Configurar Cargo de Ponto', label: 'ID do Cargo', placeholder: 'Cole o ID do cargo aqui' },
    'config_ausencia_canal': { id: 'modal_absence_chan', title: 'Configurar Canal de Ausência', label: 'ID do Canal', placeholder: 'Cole o ID do canal de texto aqui' },
    'config_ausencia_logs': { id: 'modal_absence_logs', title: 'Configurar Logs de Ausência', label: 'ID do Canal de Logs', placeholder: 'Cole o ID do canal de texto aqui' },
    'config_ausencia_cargo': { id: 'modal_absence_role', title: 'Configurar Cargo de Ausência', label: 'ID do Cargo', placeholder: 'Cole o ID do cargo aqui' },
    'config_registro_canal': { id: 'modal_reg_chan', title: 'Configurar Canal de Registro', label: 'ID do Canal', placeholder: 'Cole o ID do canal de texto aqui' },
    'config_registro_logs': { id: 'modal_reg_logs', title: 'Configurar Logs de Registro', label: 'ID do Canal de Logs', placeholder: 'Cole o ID do canal de texto aqui' },
    'config_registro_cargo': { id: 'modal_reg_role', title: 'Configurar Cargo de Membro', label: 'ID do Cargo', placeholder: 'Cole o ID do cargo aqui' },
};

// Mapa para salvar os dados
const modalSaveActions = {
    'modal_ticket_cat': { dbPath: 'ticketConfig.categoryId', msg: (id) => `✅ Categoria de tickets definida para <#${id}>.` },
    'modal_ticket_role': { dbPath: 'ticketConfig.supportRoleId', msg: (id) => `✅ Cargo de suporte definido para <@&${id}>.` },
    'modal_ticket_logs': { dbPath: 'ticketConfig.logsChannelId', msg: (id) => `✅ Canal de logs de tickets definido para <#${id}>.` },
    'modal_ponto_chan': { dbPath: 'pontoConfig.pontoChannelId', msg: (id) => `✅ Canal de ponto definido para <#${id}>.` },
    'modal_ponto_role': { dbPath: 'pontoConfig.pontoRoleId', msg: (id) => `✅ Cargo de ponto definido para <@&${id}>.` },
    'modal_absence_chan': { dbPath: 'absenceConfig.absenceChannelId', msg: (id) => `✅ Canal de ausência definido para <#${id}>.` },
    'modal_absence_logs': { dbPath: 'absenceConfig.absenceLogChannelId', msg: (id) => `✅ Canal de logs de ausência definido para <#${id}>.` },
    'modal_absence_role': { dbPath: 'absenceConfig.absenceRoleId', msg: (id) => `✅ Cargo de ausência definido para <@&${id}>.` },
    'modal_reg_chan': { dbPath: 'registrationConfig.registrationChannelId', msg: (id) => `✅ Canal de registro definido para <#${id}>.` },
    'modal_reg_logs': { dbPath: 'registrationConfig.registrationLogChannelId', msg: (id) => `✅ Canal de logs de registro definido para <#${id}>.` },
    'modal_reg_role': { dbPath: 'registrationConfig.memberRoleId', msg: (id) => `✅ Cargo de membro definido para <@&${id}>.` },
};

async function handleConfigButton(interaction) {
    const config = modalConfigs[interaction.customId];
    if (config) {
        const modal = createConfigModal(config.id, config.title, 'setting_id', config.label, config.placeholder);
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

        // Cria o objeto JSON aninhado para o update
        let updateObject = {};
        deepSet(updateObject, action.dbPath, newId);

        const query = `
            INSERT INTO guild_configs (guild_id, config) 
            VALUES ($1, $2) 
            ON CONFLICT (guild_id) 
            DO UPDATE SET config = guild_configs.config || $2;
        `;

        await pool.query(query, [guildId, JSON.stringify(updateObject)]);

        await interaction.editReply({ content: action.msg(newId) });
    } catch (error) {
        console.error('Erro ao salvar configuração via modal (PostgreSQL):', error);
        await interaction.editReply({ content: '❌ Ocorreu um erro ao salvar a configuração.' });
    }
}

module.exports = { handleConfigButton, handleConfigModal };
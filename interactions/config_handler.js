// interactions/config_handler.js

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const guildConfig = require('../database/schema');

/**
 * Cria um modal genérico para configuração de IDs.
 * @param {string} modalId - ID customizado para o modal.
 * @param {string} title - Título do modal.
 * @param {string} inputId - ID do campo de texto.
 * @param {string} inputLabel - Label do campo de texto.
 * @param {string} inputPlaceholder - Placeholder do campo de texto.
 * @returns {ModalBuilder}
 */
function createConfigModal(modalId, title, inputId, inputLabel, inputPlaceholder) {
    return new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(title)
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId(inputId)
                    .setLabel(inputLabel)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(inputPlaceholder)
                    .setRequired(true)
            )
        );
}

// Mapa de configuração para os modais
const modalConfigs = {
    // Tickets
    'config_ticket_categoria': { id: 'modal_ticket_cat', title: 'Configurar Categoria de Tickets', inputId: 'id', label: 'ID da Categoria', placeholder: 'Cole o ID da categoria aqui' },
    'config_ticket_cargo': { id: 'modal_ticket_role', title: 'Configurar Cargo de Suporte', inputId: 'id', label: 'ID do Cargo', placeholder: 'Cole o ID do cargo aqui' },
    'config_ticket_logs': { id: 'modal_ticket_logs', title: 'Configurar Canal de Logs', inputId: 'id', label: 'ID do Canal', placeholder: 'Cole o ID do canal de texto aqui' },
    // Ponto
    'config_ponto_canal': { id: 'modal_ponto_chan', title: 'Configurar Canal de Ponto', inputId: 'id', label: 'ID do Canal', placeholder: 'Cole o ID do canal de texto aqui' },
    'config_ponto_cargo': { id: 'modal_ponto_role', title: 'Configurar Cargo de Ponto', inputId: 'id', label: 'ID do Cargo', placeholder: 'Cole o ID do cargo aqui' },
    // Ausência
    'config_ausencia_canal': { id: 'modal_absence_chan', title: 'Configurar Canal de Ausência', inputId: 'id', label: 'ID do Canal', placeholder: 'Cole o ID do canal de texto aqui' },
    'config_ausencia_logs': { id: 'modal_absence_logs', title: 'Configurar Logs de Ausência', inputId: 'id', label: 'ID do Canal de Logs', placeholder: 'Cole o ID do canal de texto aqui' },
    'config_ausencia_cargo': { id: 'modal_absence_role', title: 'Configurar Cargo de Ausência', inputId: 'id', label: 'ID do Cargo', placeholder: 'Cole o ID do cargo aqui' },
    // Registro
    'config_registro_canal': { id: 'modal_reg_chan', title: 'Configurar Canal de Registro', inputId: 'id', label: 'ID do Canal', placeholder: 'Cole o ID do canal de texto aqui' },
    'config_registro_logs': { id: 'modal_reg_logs', title: 'Configurar Logs de Registro', inputId: 'id', label: 'ID do Canal de Logs', placeholder: 'Cole o ID do canal de texto aqui' },
    'config_registro_cargo': { id: 'modal_reg_role', title: 'Configurar Cargo de Membro', inputId: 'id', label: 'ID do Cargo', placeholder: 'Cole o ID do cargo aqui' },
};

// Mapa de ações para salvar os dados dos modais
const modalSaveActions = {
    'modal_ticket_cat': { dbField: 'ticketConfig.categoryId', successMsg: (id) => `✅ Categoria de tickets definida para <#${id}>.` },
    'modal_ticket_role': { dbField: 'ticketConfig.supportRoleId', successMsg: (id) => `✅ Cargo de suporte definido para <@&${id}>.` },
    'modal_ticket_logs': { dbField: 'ticketConfig.logsChannelId', successMsg: (id) => `✅ Canal de logs de tickets definido para <#${id}>.` },
    'modal_ponto_chan': { dbField: 'pontoConfig.pontoChannelId', successMsg: (id) => `✅ Canal de ponto definido para <#${id}>.` },
    'modal_ponto_role': { dbField: 'pontoConfig.pontoRoleId', successMsg: (id) => `✅ Cargo de ponto definido para <@&${id}>.` },
    'modal_absence_chan': { dbField: 'absenceConfig.absenceChannelId', successMsg: (id) => `✅ Canal de ausência definido para <#${id}>.` },
    'modal_absence_logs': { dbField: 'absenceConfig.absenceLogChannelId', successMsg: (id) => `✅ Canal de logs de ausência definido para <#${id}>.` },
    'modal_absence_role': { dbField: 'absenceConfig.absenceRoleId', successMsg: (id) => `✅ Cargo de ausência definido para <@&${id}>.` },
    'modal_reg_chan': { dbField: 'registrationConfig.registrationChannelId', successMsg: (id) => `✅ Canal de registro definido para <#${id}>.` },
    'modal_reg_logs': { dbField: 'registrationConfig.registrationLogChannelId', successMsg: (id) => `✅ Canal de logs de registro definido para <#${id}>.` },
    'modal_reg_role': { dbField: 'registrationConfig.memberRoleId', successMsg: (id) => `✅ Cargo de membro definido para <@&${id}>.` },
};

async function handleConfigButton(interaction) {
    const config = modalConfigs[interaction.customId];
    if (config) {
        const modal = createConfigModal(config.id, config.title, config.inputId, config.label, config.placeholder);
        await interaction.showModal(modal);
    }
}

async function handleConfigModal(interaction) {
    const action = modalSaveActions[interaction.customId];
    if (!action) return;

    try {
        await interaction.deferReply({ ephemeral: true });
        const id = interaction.fields.getTextInputValue('id');

        await guildConfig.findOneAndUpdate(
            { guildId: interaction.guild.id },
            { $set: { [action.dbField]: id } },
            { upsert: true, new: true }
        );

        await interaction.editReply({ content: action.successMsg(id) });
    } catch (error) {
        console.error('Erro ao salvar configuração via modal:', error);
        await interaction.editReply({ content: '❌ Ocorreu um erro ao salvar a configuração.' });
    }
}

module.exports = { handleConfigButton, handleConfigModal };
// interactions/handler.js

// Seus imports existentes
const { handleTicketButton, handleTicketModal } = require('./ticket_handler');
const { handleAbsenceButton, handleAbsenceModal } = require('./absence_handler');
const { handleApprovalButton } = require('./approval_handler');
const { handleAbsenceApproval } = require('./absence_approval_handler');
const { handleRegistrationModal, handleRegistrationButton } = require('./registration_handler');
const { handlePontoButton } = require('./ponto_handler');
const { handleDevPanelButton, handleDevPanelModal } = require('./dev_panel_handler');
const { handleUniformesModal, handleUniformesButton } = require('./uniformes_handler');

// Novos imports para o sistema de configuração
const { 
    showMainMenu, 
    showTicketDashboard, 
    showPontoDashboard, 
    showAbsenceDashboard, 
    showRegistrationDashboard 
} = require('../views/config_views');
const { handleConfigButton, handleConfigModal } = require('./config_handler');

async function handleInteraction(interaction) {
    // Handler para Comandos de Barra (/)
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
        }
    }
    
    // Handler para Cliques em Botões
    else if (interaction.isButton()) {
        const customId = interaction.customId;

        // --- ROTEADOR DO PAINEL DE CONFIGURAÇÃO ---
        if (customId.startsWith('config_')) {
            // Navegação entre os menus
            if (customId.startsWith('config_menu_')) {
                switch (customId) {
                    case 'config_menu_main':
                        await showMainMenu(interaction, true); // true para indicar que é um update
                        break;
                    case 'config_menu_ticket':
                        await showTicketDashboard(interaction);
                        break;
                    case 'config_menu_ponto':
                        await showPontoDashboard(interaction);
                        break;
                    case 'config_menu_ausencia':
                        await showAbsenceDashboard(interaction);
                        break;
                    case 'config_menu_registro':
                        await showRegistrationDashboard(interaction);
                        break;
                }
            } 
            // Botões "Alterar" dentro dos dashboards
            else {
                await handleConfigButton(interaction);
            }
            return; // Impede que outros handlers sejam executados
        }

        // --- SEUS OUTROS HANDLERS DE BOTÕES ---
        if (customId.startsWith('ticket_')) await handleTicketButton(interaction);
        else if (customId.startsWith('absence_')) await handleAbsenceButton(interaction);
        else if (customId.startsWith('approve_') || customId.startsWith('reject_')) await handleApprovalButton(interaction);
        else if (customId.startsWith('absence-approve_') || customId.startsWith('absence-reject_')) await handleAbsenceApproval(interaction);
        else if (customId.startsWith('registration_')) await handleRegistrationButton(interaction);
        else if (customId.startsWith('ponto_')) await handlePontoButton(interaction);
        else if (customId.startsWith('dev_')) await handleDevPanelButton(interaction);
        else if (customId.startsWith('uniformes_')) await handleUniformesButton(interaction);
    }
    
    // Handler para Submissão de Modals (Janelas)
    else if (interaction.isModalSubmit()) {
        const customId = interaction.customId;

        // --- ROTEADOR DOS MODAIS DE CONFIGURAÇÃO ---
        if (customId.startsWith('modal_')) {
            await handleConfigModal(interaction);
            return; // Impede que outros handlers sejam executados
        }

        // --- SEUS OUTROS HANDLERS DE MODAIS ---
        if (customId.startsWith('ticket_')) await handleTicketModal(interaction);
        else if (customId.startsWith('absence_')) await handleAbsenceModal(interaction);
        else if (customId.startsWith('registration_')) await handleRegistrationModal(interaction);
        else if (customId.startsWith('dev_')) await handleDevPanelModal(interaction);
        else if (customId.startsWith('uniformes_')) await handleUniformesModal(interaction);
    }
}

module.exports = { handleInteraction };
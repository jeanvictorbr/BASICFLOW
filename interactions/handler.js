// interactions/handler.js

const fs = require('fs');
const path = require('path');
const { 
    showMainMenu, 
    showTicketDashboard, 
    showPontoDashboard, 
    showAbsenceDashboard, 
    showRegistrationDashboard 
} = require('../views/config_views');
const { handleConfigButton, handleConfigModal } = require('./config_dashboard_handler');

// Carrega dinamicamente todos os outros handlers de botões
const buttonHandlers = [];
const handlerFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('_handler.js') && !file.startsWith('handler') && !file.startsWith('config'));
for (const file of handlerFiles) {
    try {
        const handlers = require(path.join(__dirname, file));
        if (Array.isArray(handlers)) {
            buttonHandlers.push(...handlers);
        }
    } catch (e) { console.error(`Erro ao carregar handlers do arquivo ${file}:`, e)}
}

async function handleInteraction(interaction) {
    if (interaction.isCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Erro ao executar o comando '${interaction.commandName}':`, error);
            await interaction.reply({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
        }
        return;
    }

    if (interaction.isButton()) {
        const customId = interaction.customId;

        // Roteador da Dashboard de Configuração
        if (customId.startsWith('config_')) {
            if (customId.startsWith('config_menu_')) {
                switch (customId) {
                    case 'config_menu_main': await showMainMenu(interaction, true); break;
                    case 'config_menu_ticket': await showTicketDashboard(interaction); break;
                    case 'config_menu_ponto': await showPontoDashboard(interaction); break;
                    case 'config_menu_ausencia': await showAbsenceDashboard(interaction); break;
                    case 'config_menu_registro': await showRegistrationDashboard(interaction); break;
                }
            } else {
                await handleConfigButton(interaction);
            }
            return;
        }

        // Seus outros handlers de botões
        const handler = buttonHandlers.find(h => 
            (typeof h.customId === 'string' && h.customId === customId) ||
            (typeof h.customId === 'function' && h.customId(customId))
        );
        
        if (handler) {
            try {
                await handler.execute(interaction);
            } catch (error) {
                console.error(`Erro ao executar o handler do botão '${customId}':`, error);
            }
        }
        return;
    }

    if (interaction.isModalSubmit()) {
        const customId = interaction.customId;

        if (customId.startsWith('modal_')) {
            await handleConfigModal(interaction);
            return;
        }

        // Seus outros handlers de modais (você precisa criá-los ou adaptar a lógica aqui)
        const modalPrefix = customId.split('_')[0];
        const handlerFile = handlerFiles.find(f => f.startsWith(modalPrefix));
        
        if (handlerFile) {
            // Esta parte precisa de uma lógica mais robusta para encontrar o handler de modal correto.
            // Por agora, o config vai funcionar. Seus outros modais podem precisar de ajuste aqui.
        }
    }
}

module.exports = { handleInteraction };
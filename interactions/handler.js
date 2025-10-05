// interactions/handler.js

// Seus imports existentes...
const { handleTicketButton, handleTicketModal } = require('./ticket_handler');
// ... outros imports

// Novos imports para o sistema de configuração
const { 
    showMainMenu, 
    showTicketDashboard,
    // Importe os outros dashboards aqui quando criá-los
} = require('../views/config_views');
const { handleConfigButton, handleConfigModal } = require('./config_handler');

async function handleInteraction(interaction) {
    if (interaction.isChatInputCommand()) {
        // ... seu código de handler de comando
    } 
    
    else if (interaction.isButton()) {
        const customId = interaction.customId;

        // Roteador do Painel de Configuração
        if (customId.startsWith('config_')) {
            if (customId.startsWith('config_menu_')) {
                switch (customId) {
                    case 'config_menu_main':
                        await showMainMenu(interaction, true);
                        break;
                    case 'config_menu_ticket':
                        await showTicketDashboard(interaction);
                        break;
                    // Adicione os outros cases para os outros dashboards
                }
            } else {
                // Chama o handler para os botões "Alterar"
                await handleConfigButton(interaction);
            }
            return;
        }

        // Seus outros handlers de botões...
        if (customId.startsWith('ticket_')) {
            // ...
        }
    } 
    
    else if (interaction.isModalSubmit()) {
        const customId = interaction.customId;

        if (customId.startsWith('modal_')) {
            await handleConfigModal(interaction);
            return;
        }

        // Seus outros handlers de modais...
        if (customId.startsWith('ticket_')) {
            // ...
        }
    }
}

module.exports = { handleInteraction };
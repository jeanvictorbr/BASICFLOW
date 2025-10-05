// Ficheiro: interactions/handler.js

const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const buttonHandlers = new Collection();
const modalHandlers = new Collection();

// Função para carregar handlers dinamicamente
async function loadHandlers(client) {
    const handlerFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('_handler.js') && file !== 'handler.js');

    for (const file of handlerFiles) {
        const handlerModule = require(path.join(__dirname, file));
        
        // Assumindo que cada módulo exporta um array de handlers
        if (Array.isArray(handlerModule)) {
            handlerModule.forEach(handler => {
                if (handler.customId && typeof handler.execute === 'function') {
                    if (file.includes('ticket') || file.includes('absence') || file.includes('approval') || file.includes('registration') || file.includes('ponto') || file.includes('dev_panel') || file.includes('uniformes')) {
                         buttonHandlers.set(handler.customId, handler);
                    }
                }
            });
        } else if (handlerModule.handleModal) {
            // Para handlers de modal
            const modalPrefix = file.split('_')[0];
            modalHandlers.set(modalPrefix, handlerModule.handleModal);
        }
    }
    console.log('[INFO] Todos os handlers de interação foram carregados.');
}


async function handleInteraction(interaction) {
    if (interaction.isCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
        }
    } else if (interaction.isButton()) {
        // Procura por um handler que corresponda exatamente ou através de uma função
        const handler = Array.from(buttonHandlers.values()).find(h => 
            (typeof h.customId === 'string' && h.customId === interaction.customId) ||
            (typeof h.customId === 'function' && h.customId(interaction.customId))
        );

        if (handler) {
            try {
                await handler.execute(interaction);
            } catch (error) {
                console.error(`Erro ao executar o handler de botão para ${interaction.customId}:`, error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'Ocorreu um erro ao processar esta ação.', ephemeral: true });
                }
            }
        }
    } else if (interaction.isModalSubmit()) {
        const modalPrefix = interaction.customId.split('_')[0];
        const handler = modalHandlers.get(modalPrefix);
        if (handler) {
            try {
                await handler(interaction);
            } catch (error) {
                console.error(`Erro ao executar o handler de modal para ${interaction.customId}:`, error);
            }
        }
    }
}

module.exports = { loadHandlers, handleInteraction };
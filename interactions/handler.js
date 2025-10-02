// Ficheiro: interactions/handler.js
// Responsável por carregar e distribuir todas as interações (botões, menus, etc.).

const { Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const componentHandlers = new Collection();
const functionHandlers = [];

function loadHandlers(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadHandlers(fullPath);
        } else if (file.name.endsWith('.js') && file.name !== 'handler.js') {
            try {
                const requiredModule = require(fullPath);
                // Verifica se o módulo exporta um array de handlers ou um único handler.
                const handlers = Array.isArray(requiredModule) ? requiredModule : [requiredModule];

                for (const handler of handlers) {
                    if (typeof handler.customId === 'function') {
                        functionHandlers.push(handler);
                    } else if (handler.customId) {
                        componentHandlers.set(handler.customId, handler);
                        console.log(`[HANDLER] Carregado: ${handler.customId}`);
                    }
                }
            } catch (error) {
                console.error(`[HANDLER_LOAD_ERROR] Falha ao carregar ${file.name}:`, error);
            }
        }
    }
}

async function execute(interaction) {
    const key = interaction.customId;
    let handler = componentHandlers.get(key) || functionHandlers.find(h => h.customId(key));
    if (!handler) {
        return console.error(`[MASTER_HANDLER] Nenhum handler encontrado para a interação: ${key}`);
    }
    
    try {
        await handler.execute(interaction);
    } catch(error) {
        console.error(`[HANDLER_EXECUTE_ERROR] Erro ao executar o handler para ${key}:`, error);
    }
}

module.exports = { loadHandlers, execute };


// Ficheiro: interactions/handler.js
// Responsável por carregar e distribuir TODAS as interações.

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
                // CORREÇÃO: Garante que ele consegue carregar módulos que exportam um ou vários handlers.
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
    // CORREÇÃO: Otimizado para procurar handlers de forma mais eficiente.
    let handler = componentHandlers.get(key);
    if (!handler) {
        for (const funcHandler of functionHandlers) {
            if (funcHandler.customId(key)) {
                handler = funcHandler;
                break;
            }
        }
    }
    
    if (!handler) {
        return console.error(`[MASTER_HANDLER] Nenhum handler encontrado para a interação: ${key}`);
    }
    
    try {
        await handler.execute(interaction);
    } catch(error) {
        console.error(`[HANDLER_EXECUTE_ERROR] Erro ao executar o handler para ${key}:`, error);
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: '❌ Ocorreu um erro ao processar esta ação.', ephemeral: true }).catch(() => {});
        } else {
            await interaction.reply({ content: '❌ Ocorreu um erro ao processar esta ação.', ephemeral: true }).catch(() => {});
        }
    }
}

module.exports = { loadHandlers, execute };
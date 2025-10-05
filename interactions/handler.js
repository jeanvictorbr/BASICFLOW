// Ficheiro: interactions/handler.js

const fs = require('node:fs');
const path = require('node:path');

const handlers = [];

// Função para carregar todos os handlers de interação
function loadHandlers() {
    // Limpa handlers antigos para recarregar
    handlers.length = 0;

    const handlerFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('_handler.js'));

    for (const file of handlerFiles) {
        try {
            const filePath = path.join(__dirname, file);
            const handlerModule = require(filePath);
            
            // Se o módulo exporta uma lista de handlers (como o config_handler.js agora faz)
            if (Array.isArray(handlerModule.handlers)) {
                handlers.push(...handlerModule.handlers);
            } 
            // Se o módulo exporta um array diretamente (como os seus ficheiros antigos provavelmente fazem)
            else if (Array.isArray(handlerModule)) {
                handlers.push(...handlerModule);
            } 
            // Se exporta um único objeto handler
            else {
                handlers.push(handlerModule);
            }
            console.log(`[INFO] Handler Carregado: ${file}`);
        } catch (error) {
            console.error(`[ERRO] Falha ao carregar o handler ${file}:`, error);
        }
    }
}

// Função para executar a interação
async function execute(interaction) {
    // Encontra o handler correspondente
    const handler = handlers.find(h => {
        // Se o customId for uma função (para os handlers dinâmicos como 'config_menu:')
        if (typeof h.customId === 'function') {
            return h.customId(interaction.customId);
        }
        // Se for uma string simples
        return h.customId === interaction.customId;
    });

    if (handler) {
        try {
            await handler.execute(interaction);
        } catch (error) {
            console.error('Erro ao executar interação:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: 'Ocorreu um erro ao processar a sua ação!', ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: 'Ocorreu um erro ao processar a sua ação!', ephemeral: true }).catch(() => {});
            }
        }
    }
}

module.exports = { loadHandlers, execute };
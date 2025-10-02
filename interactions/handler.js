// Ficheiro: interactions/handler.js
// Responsável por carregar e distribuir TODAS as interações (VERSÃO ROBUSTA E MANUAL).

const { Collection } = require('discord.js');

const componentHandlers = new Collection();
const functionHandlers = [];

// Função que regista os handlers que importamos manualmente
function registerHandlers() {
    console.log('[ROBUST HANDLER] A iniciar o carregamento manual de todos os handlers...');

    // Carregamento manual e explícito para máxima robustez
    const allModules = [
        require('./config_handler.js'),
        require('./registration_handler.js'),
        require('./approval_handler.js'),
        require('./absence_handler.js'),
        require('./absence_approval_handler.js'),
        require('./ticket_handler.js'),
    ];

    for (const requiredModule of allModules) {
        const handlers = Array.isArray(requiredModule) ? requiredModule : [requiredModule];
        for (const handler of handlers) {
            if (typeof handler.customId === 'function') {
                functionHandlers.push(handler);
                // Para simplificar o log, apenas contamos os handlers de função
            } else if (handler.customId) {
                componentHandlers.set(handler.customId, handler);
                console.log(`[ROBUST HANDLER] Handler de componente carregado: ${handler.customId}`);
            }
        }
    }
    console.log(`[ROBUST HANDLER] Carregamento manual de handlers concluído. Total: ${componentHandlers.size} componentes, ${functionHandlers.length} funções.`);
}

// A função 'loadHandlers' agora só chama o registo. Sem procurar ficheiros.
function loadHandlers() {
    try {
        registerHandlers();
    } catch (error) {
        console.error('[ROBUST HANDLER] ERRO CRÍTICO DURANTE O CARREGAMENTO MANUAL DE HANDLERS:', error);
        // Se um ficheiro de handler essencial não existir ou tiver um erro, o bot irá parar.
        process.exit(1);
    }
}

async function execute(interaction) {
    const key = interaction.customId;
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
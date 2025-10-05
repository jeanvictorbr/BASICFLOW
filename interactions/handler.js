const fs = require('fs');
const path = require('path');

const handlers = new Map();

// Carrega dinamicamente todos os handlers da pasta
const handlerFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('_handler.js') && file !== 'handler.js');

for (const file of handlerFiles) {
    const handler = require(path.join(__dirname, file));
    // Assumimos que cada handler exporta um objeto com os prefixos que ele gerencia
    if (handler.prefix) {
        handlers.set(handler.prefix, handler);
    }
}

module.exports = {
    async execute(interaction) {
        // Extrai o prefixo do customId (ex: "config_menu:registration")
        const [prefix] = interaction.customId.split(':');

        const handler = handlers.get(prefix);

        if (handler) {
            try {
                await handler.handle(interaction);
            } catch (error) {
                console.error(`[ERRO NO HANDLER] Erro no handler para o prefixo '${prefix}':`, error);
                // Resposta de erro genérica para o usuário
                const errorMessage = { content: 'Ocorreu um erro ao processar sua ação. Tente novamente.', ephemeral: true };
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp(errorMessage).catch(() => {});
                } else {
                    await interaction.reply(errorMessage).catch(() => {});
                }
            }
        } else {
            console.warn(`[AVISO] Nenhum handler encontrado para o prefixo '${prefix}' no customId '${interaction.customId}'.`);
        }
    },
};
const fs = require('fs');
const path = require('path');

const handlers = new Map();

console.log('--- CARREGANDO INTERACTION HANDLERS ---');
const handlerFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('_handler.js') && file !== 'handler.js');

for (const file of handlerFiles) {
    const handler = require(path.join(__dirname, file));
    if (handler.prefix) {
        handlers.set(handler.prefix, handler);
        // ✔️ NOVO LOG
        console.log(`[+] Handler para o prefixo "${handler.prefix}" carregado.`);
    }
}
console.log('------------------------------------');

module.exports = {
    async execute(interaction) {
        const [prefix] = interaction.customId.split(':');
        const handler = handlers.get(prefix);

        if (handler) {
            // ✔️ NOVO LOG
            console.log(`[Router] Interação '${interaction.customId}' roteada para o handler '${prefix}'.`);
            try {
                await handler.handle(interaction);
            } catch (error) {
                console.error(`[ERRO NO HANDLER] Erro no handler '${prefix}':`, error);
            }
        } else {
            console.warn(`[AVISO] Nenhum handler encontrado para o prefixo '${prefix}' no customId '${interaction.customId}'.`);
        }
    },
};
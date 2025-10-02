// Ficheiro: commands/handlers/config_handler.js
// NOVO FICHEIRO - Handler dedicado e robusto para o comando /configurar.

const { getConfigDashboardPayload } = require('../../views/config_views.js');

async function handleConfigCommand(interaction) {
    console.log('[ROBUST HANDLER] O handler do comando /configurar foi ativado.');

    // 1. Tenta adiar a resposta. Se isto falhar, o problema é de permissões do bot.
    try {
        await interaction.deferReply({ flags: 64 });
        console.log('[ROBUST HANDLER] Sucesso ao adiar a interação (deferReply).');
    } catch (deferError) {
        console.error('[ERRO CRÍTICO] Falha ao executar deferReply. Verifique as permissões do bot no Discord e re-convide-o para o servidor se necessário.', deferError);
        return; // Para a execução aqui, pois não podemos responder.
    }

    // 2. Tenta buscar os dados e construir o painel.
    try {
        console.log('[ROBUST HANDLER] A preparar o payload do painel de configuração...');
        const payload = await getConfigDashboardPayload(interaction.guild);
        console.log('[ROBUST HANDLER] Payload recebido com sucesso.');

        await interaction.editReply(payload);
        console.log('[ROBUST HANDLER] Painel de configuração enviado com sucesso.');
    } catch (payloadError) {
        console.error('[ERRO CRÍTICO] Falha ao buscar os dados ou ao editar a resposta.', payloadError);
        // Tenta enviar uma mensagem de erro simples se a edição falhar.
        await interaction.editReply({ content: '❌ Ocorreu um erro grave ao carregar os dados do painel. A base de dados pode estar offline ou inacessível. Verifique os logs.' }).catch(() => {});
    }
}

module.exports = { handleConfigCommand };
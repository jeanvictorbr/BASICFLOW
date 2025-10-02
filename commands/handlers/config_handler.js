// Ficheiro: commands/handlers/config_handler.js
// Handler dedicado e robusto para o comando /configurar.

const { getConfigDashboardPayload } = require('../../views/config_views.js');

async function handleConfigCommand(interaction) {
    // 1. Tenta adiar a resposta.
    try {
        await interaction.deferReply({ flags: 64 });
    } catch (deferError) {
        console.error('[ERRO CRÍTICO] Falha ao executar deferReply no comando /configurar.', deferError);
        return;
    }

    // 2. Tenta buscar os dados e construir o painel.
    try {
        const payload = await getConfigDashboardPayload(interaction.guild);
        await interaction.editReply(payload);
    } catch (payloadError) {
        console.error('[ERRO CRÍTICO] Falha ao buscar os dados para o painel de configuração.', payloadError);
        await interaction.editReply({ content: '❌ Ocorreu um erro grave ao carregar os dados do painel. A base de dados pode estar offline. Verifique os logs.' }).catch(() => {});
    }
}

module.exports = { handleConfigCommand };
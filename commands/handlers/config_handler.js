// Ficheiro: commands/handlers/config_handler.js
const { getConfigDashboardPayload } = require('../../views/config_views.js');

async function handleConfigCommand(interaction) {
    try {
        await interaction.deferReply({ flags: 64 });
    } catch (deferError) {
        console.error('[ERRO CRÍTICO] Falha ao executar deferReply no comando /configurar.', deferError);
        return;
    }
    try {
        const payload = await getConfigDashboardPayload(interaction.guild);
        await interaction.editReply(payload);
    } catch (payloadError) {
        console.error('[ERRO CRÍTICO] Falha ao buscar os dados para o painel de configuração.', payloadError);
        await interaction.editReply({ content: '❌ Ocorreu um erro grave ao carregar os dados do painel.' }).catch(() => {});
    }
}
module.exports = { handleConfigCommand };
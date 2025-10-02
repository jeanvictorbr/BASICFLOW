// Ficheiro: commands/configurar.js
// Responsável por iniciar o painel de administração (VERSÃO DE TESTE SIMPLIFICADA)

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configuração do BasicFlow.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction) {
        console.log('[DIAGNÓSTICO] Dentro do execute de /configurar.');
        try {
            // Teste 1: Tenta adiar a resposta.
            await interaction.deferReply({ flags: 64 });
            console.log('[DIAGNÓSTICO] deferReply() executado com sucesso.');
            
            // Teste 2: Envia uma mensagem de texto simples.
            await interaction.editReply({ content: 'Teste de diagnóstico bem-sucedido!' });
            console.log('[DIAGNÓSTICO] editReply() executado com sucesso.');

        } catch (error) {
            console.error("[DIAGNÓSTICO] ERRO no comando de teste /configurar:", error);
        }
    },
};
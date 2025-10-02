// Ficheiro: commands/configurar.js
// Comando simplificado que chama o handler dedicado.

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// CORREÇÃO: O caminho para o handler foi corrigido de '../' para './'
// Isto diz ao ficheiro para procurar a pasta 'handlers' dentro da pasta 'commands'.
const { handleConfigCommand } = require('./handlers/config_handler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configuração do BasicFlow.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction) {
        // A única responsabilidade deste ficheiro é chamar o handler robusto.
        await handleConfigCommand(interaction);
    },
};
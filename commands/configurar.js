const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfigDashboardPayload } = require('../views/config_views.js');
const db = require('../database/db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Abre o painel de configuração do BasicFlow.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction) {
        // CORREÇÃO: Adicionamos esta linha no início.
        // Ela responde ao Discord imediatamente, evitando o erro de timeout.
        // A flag 64 torna a resposta visível apenas para quem usou o comando.
        await interaction.deferReply({ flags: 64 });

        try {
            // Agora, mesmo que esta função demore, o Discord já sabe que estamos a processar.
            const payload = await getConfigDashboardPayload(interaction.guild);
            await interaction.editReply(payload);
        } catch (error) {
            console.error("Erro ao carregar o painel de configuração:", error);
            await interaction.editReply({ content: '❌ Ocorreu um erro ao carregar o painel de configuração.' });
        }
    },
};


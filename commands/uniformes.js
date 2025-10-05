const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getUniformesPanelPayload } = require('../views/uniformes_view');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uniformes')
        .setDescription('Envia o painel interativo de visualização de uniformes.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const payload = await getUniformesPanelPayload(interaction.guild.id);
        await interaction.channel.send(payload);
        await interaction.reply({ content: 'Painel de uniformes enviado!', ephemeral: true });
    },
};
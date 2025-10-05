// Ficheiro: commands/ponto.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/db.js');
const { getPontoVitrinePayload } = require('../views/ponto_views.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ponto')
        .setDescription('Comandos administrativos para o sistema de bate-ponto.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('painel')
                .setDescription('Envia ou atualiza o painel (vitrine) de bate-ponto no canal configurado.')
        ),
        
    async execute(interaction) {
        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'Este comando só pode ser usado num servidor.', ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'painel') {
            await handlePainelCommand(interaction);
        }
    },
};

async function handlePainelCommand(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const settings = await db.get('SELECT ponto_vitrine_channel_id, ponto_vitrine_message_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);

    if (!settings?.ponto_vitrine_channel_id) {
        return interaction.editReply('❌ O canal da vitrine de ponto ainda não foi configurado. Use o comando `/configurar` primeiro.');
    }

    const channel = await interaction.guild.channels.fetch(settings.ponto_vitrine_channel_id).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) {
        return interaction.editReply('❌ O canal configurado para a vitrine não foi encontrado ou não é um canal de texto.');
    }
    
    const vitrinePayload = getPontoVitrinePayload();

    try {
        // Se já existe uma mensagem, tenta editá-la
        if (settings.ponto_vitrine_message_id) {
            const oldMessage = await channel.messages.fetch(settings.ponto_vitrine_message_id).catch(() => null);
            if (oldMessage) {
                await oldMessage.edit(vitrinePayload);
                return interaction.editReply('✅ A vitrine de ponto foi atualizada com sucesso!');
            }
        }

        // Se não, envia uma nova e guarda o ID
        const message = await channel.send(vitrinePayload);
        await db.run('UPDATE guild_settings SET ponto_vitrine_message_id = $1 WHERE guild_id = $2', [message.id, interaction.guildId]);
        
        await interaction.editReply('✅ A vitrine de ponto foi enviada com sucesso!');

    } catch (error) {
        console.error('[ERRO PONTO PAINEL]', error);
        await interaction.editReply('❌ Ocorreu um erro ao enviar/atualizar a vitrine. Verifique se tenho permissões para enviar mensagens e gerir o canal configurado.');
    }
}
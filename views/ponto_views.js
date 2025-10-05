// Ficheiro: views/ponto_views.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Gera a vitrine principal do sistema de bate-ponto.
 */
function getPontoVitrinePayload() {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🕒 Sistema de Bate-Ponto')
        .setDescription('Utilize os botões abaixo para gerir o seu tempo de serviço.')
        .setImage('https://i.imgur.com/URL_DA_IMAGEM_AQUI.png') // URL de imagem configurável
        .setTimestamp();

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ponto_iniciar')
                .setLabel('▶️ Iniciar Ponto')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ponto_encerrar')
                .setLabel('⏹️ Encerrar Ponto')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ponto_pausar')
                .setLabel('⏸️ Pausar')
                .setStyle(ButtonStyle.Secondary)
        );
        
    const infoButtons = new ActionRowBuilder()
        .addComponents(
             new ButtonBuilder()
                .setCustomId('ponto_meu_ponto')
                .setLabel('📊 Minhas Horas')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ponto_ranking')
                .setLabel('🏆 Ranking')
                .setStyle(ButtonStyle.Primary)
        );

    return { embeds: [embed], components: [buttons, infoButtons] };
}


/**
 * Gera o embed de log inicial para uma sessão de ponto.
 * @param {import('discord.js').User} user O usuário que iniciou o ponto.
 */
function getPontoLogInitialEmbed(user) {
    return new EmbedBuilder()
        .setColor('Green')
        .setAuthor({ name: `${user.tag} iniciou o serviço`, iconURL: user.displayAvatarURL() })
        .setTitle(`Sessão de Ponto Iniciada`)
        .addFields({ name: 'Histórico de Ações', value: `▶️ **Início:** <t:${Math.floor(Date.now() / 1000)}:R>` })
        .setFooter({ text: `ID do Usuário: ${user.id}` })
        .setTimestamp();
}

module.exports = {
    getPontoVitrinePayload,
    getPontoLogInitialEmbed
};
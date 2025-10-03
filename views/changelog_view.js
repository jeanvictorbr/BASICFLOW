// Ficheiro: views/changelog_view.js
// Responsável por buscar e exibir o dashboard de atualizações.

const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

// COLE AQUI O SEU URL "RAW" DO GITHUB GIST
const CHANGELOG_URL = 'https://gist.githubusercontent.com/jeanvictorbr/30bd876698bf407832b8ef123dcd14c2/raw/bc58811b9926f61735ec193bba97ce24cf4c4a7c/basicflow_changelog.json';

async function getChangelogPayload() {
    if (!CHANGELOG_URL.startsWith('https://')) {
        return { content: '❌ A URL do changelog não foi configurada corretamente no código do bot.', embeds: [] };
    }

    try {
        const response = await axios.get(CHANGELOG_URL);
        const data = response.data;

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📰 Atualizações do BasicFlow - v${data.latest_version}`)
            .setDescription(`*Última atualização em: ${data.update_date}*`)
            .setImage(data.image_url)
            .setFooter({ text: 'Powered by Flow Bots' });

        // Adiciona os campos de atualização
        for (const update of data.updates) {
            embed.addFields({ name: update.title, value: update.description, inline: false });
        }

        // Adiciona o campo de promoção
        const promoDescription = `${data.promotion.description}\n\n` +
            data.promotion.projects.map(p => `➡️ **[${p.name}](${p.url})**`).join('\n');
        
        embed.addFields({ name: `\u200B\n${data.promotion.title}`, value: promoDescription, inline: false });
        
        return { embeds: [embed] };

    } catch (error) {
        console.error("[CHANGELOG] Erro ao buscar o ficheiro de atualizações:", error);
        const errorEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Erro ao Carregar Atualizações')
            .setDescription('Não foi possível buscar as informações de atualização no momento. Por favor, tente novamente mais tarde.');
        return { embeds: [errorEmbed] };
    }
}

module.exports = { getChangelogPayload };
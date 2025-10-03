// Ficheiro: views/changelog_view.js
// Reconstruído para buscar atualizações da base de dados local.

const { EmbedBuilder } = require('discord.js');
const db = require('../database/db.js'); // AGORA USA A BASE DE DADOS

// Estes dados podem ser movidos para a BD no futuro, se desejar
const PROMOTION_DATA = {
    title: "💎 Conheça as Nossas Versões Completas!",
    description: "O BasicFlow é apenas o começo. Leve a gestão da sua comunidade para o próximo nível com as nossas soluções especializadas e repletas de funcionalidades.",
    projects: [
        { name: "Police Flow (Para Servidores Policiais)", url: "https://flow-bots.com/policeflow" },
        { name: "Faction Flow (Para Facções e Organizações)", url: "https://flow-bots.com/factionflow" }
    ]
};

async function getChangelogPayload() {
    try {
        // Busca as 5 atualizações mais recentes, ordenadas pela mais nova primeiro
        const updates = await db.all('SELECT * FROM changelog_updates ORDER BY timestamp DESC LIMIT 5');

        if (updates.length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📰 Atualizações do BasicFlow')
                .setDescription('Ainda não há nenhuma atualização para mostrar.');
            return { embeds: [emptyEmbed] };
        }
        
        const latestUpdate = updates[0];
        const updateDate = new Date(Number(latestUpdate.timestamp)).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📰 Atualizações Recentes do BasicFlow`)
            .setDescription(`*Última atualização em: ${updateDate}*`)
            .setImage('https://i.imgur.com/YuK1aVN.gif') // Imagem padrão
            .setFooter({ text: 'Powered by Flow Bots' });

        for (const update of updates) {
            embed.addFields({ name: `- ${update.title}`, value: update.description, inline: false });
        }

        const promoDescription = `${PROMOTION_DATA.description}\n\n` +
            PROMOTION_DATA.projects.map(p => `➡️ **[${p.name}](${p.url})**`).join('\n');
        
        embed.addFields({ name: `\u200B\n${PROMOTION_DATA.title}`, value: promoDescription, inline: false });
        
        return { embeds: [embed] };

    } catch (error) {
        console.error("[CHANGELOG] Erro ao buscar atualizações da base de dados:", error);
        const errorEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Erro ao Carregar Atualizações')
            .setDescription('Não foi possível buscar as informações de atualização no momento. Verifique os logs do bot para mais detalhes.');
        return { embeds: [errorEmbed] };
    }
}

module.exports = { getChangelogPayload };


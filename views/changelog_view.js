// Ficheiro: views/changelog_view.js
// Reconstruído para suportar paginação.

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db.js');

const UPDATES_PER_PAGE = 5;

const PROMOTION_DATA = {
    title: "💎 Conheça as Nossas Versões Completas!",
    description: "O BasicFlow é apenas o começo. Leve a gestão da sua comunidade para o próximo nível com as nossas soluções especializadas e repletas de funcionalidades.",
    projects: [
        { name: "Police Flow (Para Servidores Policiais)", url: "https://flow-bots.com/policeflow" },
        { name: "Faction Flow (Para Facções e Organizações)", url: "https://flow-bots.com/factionflow" }
    ]
};

async function getChangelogPayload(page = 1) {
    try {
        const [totalResult, updates] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM changelog_updates'),
            db.all('SELECT * FROM changelog_updates ORDER BY timestamp DESC LIMIT $1 OFFSET $2', [UPDATES_PER_PAGE, (page - 1) * UPDATES_PER_PAGE])
        ]);
        
        const totalUpdates = parseInt(totalResult.count, 10);
        const totalPages = Math.ceil(totalUpdates / UPDATES_PER_PAGE) || 1;

        if (page > totalPages) {
             page = totalPages;
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📰 Atualizações Recentes do BasicFlow`)
            .setImage('https://i.imgur.com/YuK1aVN.gif')
            .setFooter({ text: `Powered by Flow Bots • Página ${page} de ${totalPages}` });

        if (updates.length === 0) {
            embed.setDescription('Ainda não há nenhuma atualização para mostrar.');
        } else {
            const latestUpdate = updates[0];
            const updateDate = new Date(Number(latestUpdate.timestamp)).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            embed.setDescription(`*A apresentar as atualizações mais recentes. Última em: ${updateDate}*`);

            for (const update of updates) {
                embed.addFields({ name: `- ${update.title}`, value: update.description, inline: false });
            }
        }
        
        if (page === totalPages && PROMOTION_DATA) {
            const promoDescription = `${PROMOTION_DATA.description}\n\n` +
                PROMOTION_DATA.projects.map(p => `➡️ **[${p.name}](${p.url})**`).join('\n');
            embed.addFields({ name: `\u200B\n${PROMOTION_DATA.title}`, value: promoDescription, inline: false });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`changelog_page:${page - 1}`)
                .setLabel('Anterior')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⬅️')
                .setDisabled(page <= 1),
            new ButtonBuilder()
                .setCustomId(`changelog_page:${page + 1}`)
                .setLabel('Próximo')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('➡️')
                .setDisabled(page >= totalPages)
        );
        
        return { embeds: [embed], components: [row] };

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


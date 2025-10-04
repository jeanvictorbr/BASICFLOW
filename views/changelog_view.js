// Ficheiro: views/changelog_view.js (VERSÃO FINAL E CORRIGIDA)
const { ComponentType, ButtonStyle } = require('discord.js');
const db = require('../database/db.js');

const UPDATES_PER_PAGE = 3;

const PROMOTION_DATA = {
    title: "💎 Conheça as Nossas Versões Completas!",
    description: "O BasicFlow é apenas o começo. Leve a gestão da sua comunidade para o próximo nível com as nossas soluções especializadas.\n\n➡️ **[Police Flow](https://flow-bots.com/policeflow)**\n➡️ **[Faction Flow](https://flow-bots.com/factionflow)**"
};

async function getChangelogPayload(page = 1) {
    try {
        const [totalResult, updates] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM changelog_updates'),
            db.all('SELECT * FROM changelog_updates ORDER BY timestamp DESC LIMIT $1 OFFSET $2', [UPDATES_PER_PAGE, (page - 1) * UPDATES_PER_PAGE])
        ]);
        
        const totalUpdates = parseInt(totalResult.count, 10);
        const totalPages = Math.ceil(totalUpdates / UPDATES_PER_PAGE) || 1;
        page = Math.max(1, Math.min(page, totalPages));

        const components = [{ type: ComponentType.TextDisplay, content: '# 📰 Atualizações Recentes do BasicFlow' }];

        if (updates.length === 0) {
            components.push({ type: ComponentType.TextDisplay, content: '*Ainda não há nenhuma atualização para mostrar.*' });
        } else {
            for (const update of updates) {
                components.push({ type: ComponentType.Separator });
                components.push({
                    type: ComponentType.Section,
                    components: [
                        { type: ComponentType.TextDisplay, content: `### ${update.title}` },
                        { type: ComponentType.TextDisplay, content: update.description }
                    ],
                    accessory: {
                        type: ComponentType.Thumbnail,
                        image_url: "https://i.imgur.com/YuK1aVN.gif", // A sintaxe correta é esta
                        size: 'lg'
                    }
                });
            }
        }
        
        if (page === totalPages && PROMOTION_DATA) {
            components.push({ type: ComponentType.Separator });
            components.push({
                type: ComponentType.Container, color: 0x5865F2,
                components: [
                    { type: ComponentType.TextDisplay, content: `## ${PROMOTION_DATA.title}` },
                    { type: ComponentType.TextDisplay, content: PROMOTION_DATA.description }
                ]
            });
        }

        components.push({ type: ComponentType.Separator });
        components.push({
            type: ComponentType.ActionRow,
            components: [
                { type: ComponentType.Button, style: ButtonStyle.Primary, label: 'Anterior', emoji: { name: '⬅️' }, custom_id: `changelog_page:${page - 1}`, disabled: page <= 1 },
                { type: ComponentType.Button, style: ButtonStyle.Secondary, label: `Página ${page} de ${totalPages}`, custom_id: 'changelog_page_indicator', disabled: true },
                { type: ComponentType.Button, style: ButtonStyle.Primary, label: 'Próximo', emoji: { name: '➡️' }, custom_id: `changelog_page:${page + 1}`, disabled: page >= totalPages },
                { type: ComponentType.Button, style: ButtonStyle.Secondary, label: 'Voltar', custom_id: 'config_menu:main' }
            ]
        });

        return { flags: 1 << 15, components, embeds: [], content: '' };

    } catch (error) {
        console.error("[CHANGELOG] Erro ao buscar atualizações:", error);
        return { content: '❌ Erro ao Carregar Atualizações.', ephemeral: true };
    }
}

module.exports = { getChangelogPayload };
const { ActionRowBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ComponentType, ChannelType } = require('discord.js');
const db = require('../database/db.js');
const { getConfigDashboardPayload } = require('../views/config_views.js');

// Mapeia o ID do botão para a coluna na base de dados e o tipo de menu
const configMap = {
    'config_set_registration_channel': { dbKey: 'registration_channel_id', type: 'channel' },
    'config_set_absence_channel': { dbKey: 'absence_channel_id', type: 'channel' },
    'config_set_registered_role': { dbKey: 'registered_role_id', type: 'role' },
    'config_set_absence_role': { dbKey: 'absence_role_id', type: 'role' },
};

const configHandler = {
    customId: (id) => id.startsWith('config_'),

    async execute(interaction) {
        const { customId } = interaction;
        const config = configMap[customId];

        if (!config) return;

        let menu;
        let placeholder;
        let componentType;

        if (config.type === 'channel') {
            menu = new ChannelSelectMenuBuilder().addChannelTypes(ChannelType.GuildText);
            placeholder = 'Selecione o canal...';
            componentType = ComponentType.ChannelSelect;
        } else { // role
            menu = new RoleSelectMenuBuilder();
            placeholder = 'Selecione o cargo...';
            componentType = ComponentType.RoleSelect;
        }
        
        const selectMenu = new ActionRowBuilder().addComponents(
            menu.setCustomId('config_select_menu').setPlaceholder(placeholder)
        );

        const response = await interaction.update({ content: `Por favor, selecione o ${config.type === 'channel' ? 'canal' : 'cargo'} desejado no menu abaixo.`, components: [selectMenu], embeds: [], fetchReply: true });

        const collector = response.createMessageComponentCollector({
            componentType: componentType,
            filter: i => i.user.id === interaction.user.id,
            time: 60000,
            max: 1
        });

        collector.on('collect', async i => {
            const selectedId = i.values[0];
            
            // Insere ou atualiza a configuração na base de dados
            await db.run(
                `INSERT INTO guild_settings (guild_id, ${config.dbKey}) VALUES ($1, $2)
                 ON CONFLICT (guild_id) DO UPDATE SET ${config.dbKey} = $2`,
                [i.guild.id, selectedId]
            );

            // Atualiza o painel de configuração para mostrar a nova seleção
            const payload = await getConfigDashboardPayload(i.guild);
            await i.update(payload);
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                interaction.editReply({ content: 'A seleção expirou.', components: [], embeds: [] }).catch(() => {});
            }
        });
    }
};

module.exports = configHandler;
const { ActionRowBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ComponentType, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../database/db.js');
const { getConfigDashboardPayload } = require('../views/config_views.js');
const { getRegistrationPanelPayload } = require('../views/registration_views.js');

const configMap = {
    'config_set_registration_channel': { dbKey: 'registration_channel_id', type: 'channel' },
    'config_set_absence_channel': { dbKey: 'absence_channel_id', type: 'channel' },
    'config_set_registered_role': { dbKey: 'registered_role_id', type: 'role' },
    'config_set_absence_role': { dbKey: 'absence_role_id', type: 'role' },
};

const configHandler = {
    customId: (id) => id.startsWith('config_'),

    async execute(interaction) {
        // REMOVEMOS O DEFERUPDATE DESTA LINHA INICIAL. ELE AGORA É FEITO DENTRO DE CADA LÓGICA.
        const { customId } = interaction;

        if (customId === 'config_set_nickname_tag') {
            const tagModal = new ModalBuilder()
                .setCustomId('set_tag_modal')
                .setTitle('Definir TAG de Nickname')
                .addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('tag_input')
                        .setLabel('Insira a TAG (sem colchetes)')
                        .setPlaceholder('Ex: OFC, GNR, etc.')
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(10)
                        .setRequired(true)
                ));
            
            // showModal() é a primeira e única resposta a esta interação.
            await interaction.showModal(tagModal);

            const filter = (i) => i.customId === 'set_tag_modal' && i.user.id === interaction.user.id;
            
            try {
                const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 60000 });
                const tag = modalInteraction.fields.getTextInputValue('tag_input');

                await db.run(
                    `INSERT INTO guild_settings (guild_id, nickname_tag) VALUES ($1, $2)
                     ON CONFLICT (guild_id) DO UPDATE SET nickname_tag = $2`,
                    [interaction.guildId, tag]
                );
                
                await modalInteraction.deferUpdate();
                const payload = await getConfigDashboardPayload(interaction.guild);
                // Usamos editReply na interação ORIGINAL do botão, não na do modal.
                await interaction.editReply(payload);

            } catch (err) {
                 await interaction.editReply({ content: 'A definição da TAG expirou.', components: [], embeds: [] }).catch(() => {});
            }
            return;
        }

        // --- A PARTIR DAQUI, TODAS AS LÓGICAS PRECISAM DO SEU PRÓPRIO DEFERUPDATE ---
        await interaction.deferUpdate();

        if (customId === 'config_publish_registration_panel') {
            // (Esta parte do código continua igual à versão anterior)
            const settings = await db.get('SELECT registration_channel_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
            if (!settings?.registration_channel_id) {
                return interaction.editReply({ content: '❌ **Ação bloqueada:**\n> Você precisa definir um "Canal de Aprovação (Registos)" antes de poder publicar o painel.', embeds: [], components: [] });
            }

            const channelMenu = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('publish_panel_channel_select')
                    .setPlaceholder('Selecione o canal para publicar a vitrine...')
                    .addChannelTypes(ChannelType.GuildText)
            );

            const response = await interaction.editReply({ content: 'Ok! Onde você quer que a vitrine de registo seja publicada?', components: [channelMenu], embeds: [], fetchReply: true });

            const collector = response.createMessageComponentCollector({ componentType: ComponentType.ChannelSelect, filter: i => i.user.id === interaction.user.id, time: 60000, max: 1 });

            collector.on('collect', async i => {
                const channelId = i.values[0];
                const targetChannel = await interaction.guild.channels.fetch(channelId);
                if (targetChannel) {
                    await targetChannel.send(getRegistrationPanelPayload());
                    await i.update({ content: `✅ Painel de registo publicado com sucesso em ${targetChannel}!`, components: [], embeds: [] });
                }
            });
            return;
        }

        const config = configMap[customId];
        if (!config) return;

        // (Esta parte do código também continua igual)
        let menu, placeholder, componentType;
        if (config.type === 'channel') {
            menu = new ChannelSelectMenuBuilder().addChannelTypes(ChannelType.GuildText);
            placeholder = 'Selecione o canal...';
            componentType = ComponentType.ChannelSelect;
        } else { 
            menu = new RoleSelectMenuBuilder();
            placeholder = 'Selecione o cargo...';
            componentType = ComponentType.RoleSelect;
        }
        
        const selectMenu = new ActionRowBuilder().addComponents(menu.setCustomId('config_select_menu').setPlaceholder(placeholder));
        const response = await interaction.editReply({ content: `Por favor, selecione o ${config.type === 'channel' ? 'canal' : 'cargo'} desejado no menu abaixo.`, components: [selectMenu], embeds: [], fetchReply: true });
        const collector = response.createMessageComponentCollector({ componentType, filter: i => i.user.id === interaction.user.id, time: 60000, max: 1 });

        collector.on('collect', async i => {
            const selectedId = i.values[0];
            await db.run( `INSERT INTO guild_settings (guild_id, ${config.dbKey}) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET ${config.dbKey} = $2`, [i.guild.id, selectedId] );
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
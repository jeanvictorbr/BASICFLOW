// Ficheiro: interactions/config_handler.js
// Responsável pela lógica de todos os botões do painel de configuração.

const { ActionRowBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ComponentType, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../database/db.js');
const { getConfigDashboardPayload } = require('../views/config_views.js');
const { getRegistrationPanelPayload } = require('../views/registration_views.js');
const { getAbsencePanelPayload } = require('../views/absence_views.js');

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

        if (customId === 'config_set_nickname_tag' || customId === 'config_set_panel_image') {
            const isTag = customId === 'config_set_nickname_tag';
            const modal = new ModalBuilder()
                .setCustomId(isTag ? 'set_tag_modal' : 'set_image_modal')
                .setTitle(isTag ? 'Definir TAG de Nickname' : 'Definir Imagem do Painel de Registo');

            const textInput = isTag
                ? new TextInputBuilder().setCustomId('tag_input').setLabel('Insira a TAG (sem colchetes)').setPlaceholder('Ex: OFC, GNR, etc.').setStyle(TextInputStyle.Short).setMaxLength(10).setRequired(true)
                : new TextInputBuilder().setCustomId('image_url_input').setLabel('Cole a URL da imagem (deve ser https)').setPlaceholder('https://i.imgur.com/seu-link.gif').setStyle(TextInputStyle.Short).setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(textInput));
            await interaction.showModal(modal);

            try {
                const modalInteraction = await interaction.awaitModalSubmit({ filter: i => i.user.id === interaction.user.id, time: 60000 });
                const value = modalInteraction.fields.getTextInputValue(isTag ? 'tag_input' : 'image_url_input');

                if (!isTag && !value.startsWith('https://')) {
                    return modalInteraction.reply({ content: '❌ URL inválida. Por favor, forneça um link que comece com `https://`.', ephemeral: true });
                }

                const dbKey = isTag ? 'nickname_tag' : 'registration_panel_image_url';
                await db.run(`INSERT INTO guild_settings (guild_id, ${dbKey}) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET ${dbKey} = $2`, [interaction.guildId, value]);

                await modalInteraction.deferUpdate();
                const payload = await getConfigDashboardPayload(interaction.guild);
                await interaction.editReply(payload);
            } catch (err) { /* O utilizador não respondeu a tempo */ }
            return;
        }

        await interaction.deferUpdate();

        if (customId === 'config_publish_registration_panel' || customId === 'config_publish_absence_panel') {
            const isRegistration = customId === 'config_publish_registration_panel';
            const settings = isRegistration
                ? await db.get('SELECT registration_channel_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId])
                : await db.get('SELECT absence_channel_id, absence_role_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);

            const settingsCheck = isRegistration ? settings?.registration_channel_id : (settings?.absence_channel_id && settings?.absence_role_id);
            if (!settingsCheck) {
                const errorMsg = isRegistration
                    ? '❌ **Ação bloqueada:**\n> Você precisa definir um "Canal de Aprovação (Registos)" antes de publicar este painel.'
                    : '❌ **Ação bloqueada:**\n> Você precisa definir um "Canal de Ausências" e um "Cargo de Membro Ausente" antes de publicar este painel.';
                return interaction.editReply({ content: errorMsg, embeds: [], components: [] });
            }

            const channelMenu = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId(isRegistration ? 'publish_panel_channel_select' : 'publish_absence_panel_channel_select')
                    .setPlaceholder('Selecione o canal para publicar a vitrine...')
                    .addChannelTypes(ChannelType.GuildText)
            );

            const replyMsg = isRegistration ? 'Ok! Onde você quer que a vitrine de registo seja publicada?' : 'Certo! Onde você quer que a vitrine de ausências seja publicada?';
            const response = await interaction.editReply({ content: replyMsg, components: [channelMenu], embeds: [], fetchReply: true });

            const collector = response.createMessageComponentCollector({ componentType: ComponentType.ChannelSelect, filter: i => i.user.id === interaction.user.id, time: 60000, max: 1 });
            collector.on('collect', async i => {
                const channelId = i.values[0];
                const targetChannel = await interaction.guild.channels.fetch(channelId);
                if (targetChannel) {
                    const panelPayload = isRegistration ? await getRegistrationPanelPayload(i.guildId) : getAbsencePanelPayload();
                    await targetChannel.send(panelPayload);
                    await i.update({ content: `✅ Painel publicado com sucesso em ${targetChannel}!`, components: [], embeds: [] });
                }
            });
            return;
        }

        if (customId === 'config_publish_ticket_panel') {
            return interaction.editReply({
                content: '🚧 A funcionalidade de **Tickets** ainda está em desenvolvimento e será adicionada em breve!',
                embeds: [],
                components: []
            });
        }

        const config = configMap[customId];
        if (!config) return;

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
            await db.run(`INSERT INTO guild_settings (guild_id, ${config.dbKey}) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET ${config.dbKey} = $2`, [i.guild.id, selectedId]);
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
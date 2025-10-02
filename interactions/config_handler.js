// Ficheiro: interactions/config_handler.js
// Responsável pela lógica de todos os botões do painel de configuração.

const { ActionRowBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ComponentType, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../database/db.js');
const { getConfigDashboardPayload } = require('../views/config_views.js');
const { getRegistrationPanelPayload } = require('../views/registration_views.js');
const { getAbsencePanelPayload } = require('../views/absence_views.js');
const { getTicketPanelPayload } = require('../views/ticket_views.js');

const configMap = {
    'config_set_registration_channel': { dbKey: 'registration_channel_id', type: 'channel', channelTypes: [ChannelType.GuildText] },
    'config_set_absence_channel': { dbKey: 'absence_channel_id', type: 'channel', channelTypes: [ChannelType.GuildText] },
    'config_set_registered_role': { dbKey: 'registered_role_id', type: 'role' },
    'config_set_absence_role': { dbKey: 'absence_role_id', type: 'role' },
    'config_set_ticket_category': { dbKey: 'ticket_category_id', type: 'channel', channelTypes: [ChannelType.GuildCategory] },
    'config_set_support_role': { dbKey: 'support_role_id', type: 'role' },
    'config_set_ticket_log_channel': { dbKey: 'ticket_log_channel_id', type: 'channel', channelTypes: [ChannelType.GuildText] },
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

        if (customId.startsWith('config_publish_')) {
            const panelType = customId.split('_')[2]; // registration, absence, ticket
            let settingsCheck = false;
            let errorMsg = '';

            if (panelType === 'registration') {
                const s = await db.get('SELECT registration_channel_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
                settingsCheck = s?.registration_channel_id;
                errorMsg = '❌ **Ação bloqueada:**\n> Defina um "Registo: Canal de Aprovação" primeiro.';
            } else if (panelType === 'absence') {
                const s = await db.get('SELECT absence_channel_id, absence_role_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
                settingsCheck = s?.absence_channel_id && s?.absence_role_id;
                errorMsg = '❌ **Ação bloqueada:**\n> Defina um "Ausência: Canal" e "Ausência: Cargo" primeiro.';
            } else if (panelType === 'ticket') {
                const s = await db.get('SELECT ticket_category_id, support_role_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
                settingsCheck = s?.ticket_category_id && s?.support_role_id;
                errorMsg = '❌ **Ação bloqueada:**\n> Defina uma "Ticket: Categoria" e "Ticket: Suporte" primeiro.';
            }

            if (!settingsCheck) {
                return interaction.editReply({ content: errorMsg, embeds: [], components: [] });
            }

            const channelMenu = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId(`publish_${panelType}_channel_select`)
                    .setPlaceholder('Selecione o canal para publicar a vitrine...')
                    .addChannelTypes(ChannelType.GuildText)
            );

            const response = await interaction.editReply({ content: `Certo! Onde quer que a vitrine de ${panelType} seja publicada?`, components: [channelMenu], embeds: [], fetchReply: true });
            const collector = response.createMessageComponentCollector({ componentType: ComponentType.ChannelSelect, filter: i => i.user.id === interaction.user.id, time: 60000, max: 1 });
            
            collector.on('collect', async i => {
                const channelId = i.values[0];
                const targetChannel = await interaction.guild.channels.fetch(channelId);
                if (targetChannel) {
                    let panelPayload;
                    if (panelType === 'registration') panelPayload = await getRegistrationPanelPayload(i.guildId);
                    else if (panelType === 'absence') panelPayload = getAbsencePanelPayload();
                    else if (panelType === 'ticket') panelPayload = getTicketPanelPayload();
                    
                    await targetChannel.send(panelPayload);
                    await i.update({ content: `✅ Painel de ${panelType} publicado com sucesso em ${targetChannel}!`, components: [], embeds: [] });
                }
            });
            return;
        }

        const config = configMap[customId];
        if (!config) return;

        let menu;
        if (config.type === 'channel') {
            menu = new ChannelSelectMenuBuilder().addChannelTypes(config.channelTypes).setPlaceholder('Selecione o canal...');
        } else {
            menu = new RoleSelectMenuBuilder().setPlaceholder('Selecione o cargo...');
        }
        
        const selectMenu = new ActionRowBuilder().addComponents(menu.setCustomId('config_select_menu'));
        const response = await interaction.editReply({ content: `Por favor, selecione o ${config.type} desejado no menu abaixo.`, components: [selectMenu], embeds: [], fetchReply: true });
        
        const collector = response.createMessageComponentCollector({ componentType: (config.type === 'channel' ? ComponentType.ChannelSelect : ComponentType.RoleSelect), filter: i => i.user.id === interaction.user.id, time: 60000, max: 1 });
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


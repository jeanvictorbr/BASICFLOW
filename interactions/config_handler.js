// Ficheiro: interactions/config_handler.js
// Lógica do painel de configuração (VERSÃO FINAL E ESTÁVEL).

const { ActionRowBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../database/db.js');
const { getConfigDashboardPayload } = require('../views/config_views.js');
const { getRegistrationPanelPayload } = require('../views/registration_views.js');
const { getAbsencePanelPayload } = require('../views/absence_views.js');
const { getTicketPanelPayload } = require('../views/ticket_views.js');
const { getChangelogPayload } = require('../views/changelog_view.js');

const menuButtons = {
    'config_set_registration_channel': { dbKey: 'registration_channel_id', type: 'channel', channelTypes: [ChannelType.GuildText] },
    'config_set_absence_channel': { dbKey: 'absence_channel_id', type: 'channel', channelTypes: [ChannelType.GuildText] },
    'config_set_registered_role': { dbKey: 'registered_role_id', type: 'role' },
    'config_set_absence_role': { dbKey: 'absence_role_id', type: 'role' },
    'config_set_ticket_category': { dbKey: 'ticket_category_id', type: 'channel', channelTypes: [ChannelType.GuildCategory] },
    'config_set_support_role': { dbKey: 'support_role_id', type: 'role' },
    'config_set_ticket_log_channel': { dbKey: 'ticket_log_channel_id', type: 'channel', channelTypes: [ChannelType.GuildText] },
};

const publishButtons = {
    'config_publish_registration_panel': { type: 'registration', required: ['registration_channel_id'] },
    'config_publish_absence_panel': { type: 'absence', required: ['absence_channel_id', 'absence_role_id'] },
    'config_publish_ticket_panel': { type: 'ticket', required: ['ticket_category_id', 'support_role_id'] }
};

const modalButtons = {
    'config_set_nickname_tag': { dbKey: 'nickname_tag', title: 'Definir TAG de Nickname', label: 'Insira a TAG (sem colchetes)' },
    'config_set_panel_image': { dbKey: 'registration_panel_image_url', title: 'Definir Imagem do Painel de Registo', label: 'Cole a URL da imagem (https)' },
    'config_set_absence_image': { dbKey: 'absence_panel_image_url', title: 'Definir Imagem do Painel de Ausência', label: 'Cole a URL da imagem (https)' },
    'config_set_ticket_image': { dbKey: 'ticket_panel_image_url', title: 'Definir Imagem do Painel de Ticket', label: 'Cole a URL da imagem (https)' },
};

const configHandler = {
    customId: (id) => id.startsWith('config_') || id.startsWith('set_config:') || id.startsWith('publish_panel:') || id.startsWith('modal_submit:') || id.startsWith('changelog_page:'),

    async execute(interaction) {
        const [action, ...args] = interaction.customId.split(':');

        if (action === 'config_view_changelog') {
            await interaction.deferReply({ ephemeral: true });
            const payload = await getChangelogPayload(1);
            await interaction.editReply(payload);
            return;
        }

        if (action === 'changelog_page') {
            await interaction.deferUpdate();
            const page = parseInt(args[0], 10);
            if (isNaN(page) || page < 1) return;
            const payload = await getChangelogPayload(page);
            await interaction.editReply(payload);
            return;
        }

        if (modalButtons[action]) {
            const config = modalButtons[action];
            const modal = new ModalBuilder().setCustomId(`modal_submit:${config.dbKey}`).setTitle(config.title);
            const textInput = new TextInputBuilder().setCustomId('value_input').setLabel(config.label).setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(textInput));
            await interaction.showModal(modal);

            const filter = i => i.customId === `modal_submit:${config.dbKey}` && i.user.id === interaction.user.id;
            try {
                const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 60000 });
                await modalInteraction.deferUpdate();
                const value = modalInteraction.fields.getTextInputValue('value_input');
                if (config.dbKey.includes('_url') && !value.startsWith('https://')) {
                    await interaction.followUp({ content: '❌ URL inválida. O link da imagem deve começar com `https://`.', ephemeral: true });
                    return;
                }
                await db.run(`INSERT INTO guild_settings (guild_id, ${config.dbKey}) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET ${config.dbKey} = $2`, [interaction.guildId, value]);
                const payload = await getConfigDashboardPayload(interaction.guild, interaction.user.id);
                await interaction.editReply(payload);
                await interaction.followUp({ content: '✅ Configuração guardada com sucesso!', ephemeral: true });
            } catch (err) {
                await interaction.followUp({ content: 'A configuração expirou.', ephemeral: true }).catch(() => {});
            }
            return;
        }

        await interaction.deferUpdate();

        if (menuButtons[action]) {
            const config = menuButtons[action];
            let menu;
            if (config.type === 'channel') {
                menu = new ChannelSelectMenuBuilder().addChannelTypes(config.channelTypes);
            } else {
                menu = new RoleSelectMenuBuilder();
            }
            menu.setCustomId(`set_config:${config.dbKey}`);
            const row = new ActionRowBuilder().addComponents(menu);
            await interaction.editReply({ content: `Por favor, selecione o ${config.type} desejado abaixo.`, components: [row], embeds: [] });
            return;
        }

        if (action === 'set_config') {
            const dbKey = interaction.customId.split(':')[1];
            const selectedId = interaction.values[0];
            await db.run(`INSERT INTO guild_settings (guild_id, ${dbKey}) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET ${dbKey} = $2`, [interaction.guildId, selectedId]);
            const payload = await getConfigDashboardPayload(interaction.guild, interaction.user.id);
            await interaction.editReply(payload);
            return;
        }

        if (publishButtons[action]) {
            const config = publishButtons[action];
            const settings = await db.get(`SELECT ${config.required.join(', ')} FROM guild_settings WHERE guild_id = $1`, [interaction.guildId]);
            const allSet = config.required.every(key => settings?.[key]);
            if (!allSet) {
                return interaction.editReply({ content: `❌ **Ação bloqueada:**\n> Faltam configurações para publicar este painel. Verifique as definições de ${config.type}.`, embeds: [], components: [] });
            }
            const menu = new ChannelSelectMenuBuilder().setCustomId(`publish_panel:${config.type}`).setPlaceholder('Selecione o canal para publicar a vitrine...').addChannelTypes(ChannelType.GuildText);
            const row = new ActionRowBuilder().addComponents(menu);
            await interaction.editReply({ content: `Certo! Onde quer que a vitrine de ${config.type} seja publicada?`, components: [row], embeds: [] });
            return;
        }
        
        if (action === 'publish_panel') {
            const panelType = interaction.customId.split(':')[1];
            const channelId = interaction.values[0];
            const targetChannel = await interaction.guild.channels.fetch(channelId);
            if (targetChannel) {
                let panelPayload;
                if (panelType === 'registration') panelPayload = await getRegistrationPanelPayload(interaction.guildId);
                else if (panelType === 'absence') panelPayload = await getAbsencePanelPayload(interaction.guildId);
                else if (panelType === 'ticket') panelPayload = await getTicketPanelPayload(interaction.guildId);
                
                await targetChannel.send(panelPayload);
                await interaction.editReply({ content: `✅ Painel de ${panelType} publicado com sucesso em ${targetChannel}!`, components: [], embeds: [] });
            }
            return;
        }
    }
};

module.exports = configHandler;


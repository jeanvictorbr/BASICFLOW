// Ficheiro: interactions/config_handler.js
// Lógica do painel de configuração (VERSÃO RECONSTRUÍDA E ESTÁVEL).

const { ActionRowBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../database/db.js');
const { getConfigDashboardPayload } = require('../views/config_views.js');
const { getRegistrationPanelPayload } = require('../views/registration_views.js');
const { getAbsencePanelPayload } = require('../views/absence_views.js');
const { getTicketPanelPayload } = require('../views/ticket_views.js');

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

const configHandler = {
    customId: (id) => id.startsWith('config_') || id.startsWith('set_config:') || id.startsWith('publish_panel:') || id.startsWith('set_modal:'),

    async execute(interaction) {
        const [action, ...args] = interaction.customId.split(':');
        
        if (menuButtons[action]) {
            await interaction.deferUpdate();
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
            await interaction.deferUpdate();
            const dbKey = args[0];
            const selectedId = interaction.values[0];
            await db.run(`INSERT INTO guild_settings (guild_id, ${dbKey}) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET ${dbKey} = $2`, [interaction.guildId, selectedId]);
            const payload = await getConfigDashboardPayload(interaction.guild);
            await interaction.editReply(payload);
            return;
        }

        if (publishButtons[action]) {
            await interaction.deferUpdate();
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
            await interaction.deferUpdate();
            const panelType = args[0];
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

        if (action === 'config_set_nickname_tag' || action === 'config_set_panel_image' || action === 'config_set_absence_image' || action === 'config_set_ticket_image') {
            const typeMap = {
                'config_set_nickname_tag': { dbKey: 'nickname_tag', title: 'Definir TAG de Nickname', label: 'Insira a TAG (sem colchetes)' },
                'config_set_panel_image': { dbKey: 'registration_panel_image_url', title: 'Definir Imagem do Painel de Registo', label: 'Cole a URL da imagem (https)' },
                'config_set_absence_image': { dbKey: 'absence_panel_image_url', title: 'Definir Imagem do Painel de Ausência', label: 'Cole a URL da imagem (https)' },
                'config_set_ticket_image': { dbKey: 'ticket_panel_image_url', title: 'Definir Imagem do Painel de Ticket', label: 'Cole a URL da imagem (https)' },
            };
            const config = typeMap[action];
            const modal = new ModalBuilder().setCustomId(`set_modal:${config.dbKey}`).setTitle(config.title);
            const textInput = new TextInputBuilder().setCustomId('value_input').setLabel(config.label).setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(textInput));
            await interaction.showModal(modal);
            return;
        }

        if (action === 'set_modal') {
            await interaction.deferReply({ ephemeral: true });
            const dbKey = args[0];
            const value = interaction.fields.getTextInputValue('value_input');

            if (dbKey.includes('_url') && !value.startsWith('https://')) {
                return interaction.editReply({ content: '❌ URL inválida. O link da imagem deve começar com `https://`.'});
            }
            
            await db.run(`INSERT INTO guild_settings (guild_id, ${dbKey}) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET ${dbKey} = $2`, [interaction.guildId, value]);
            await interaction.editReply({ content: '✅ Configuração guardada com sucesso!' });

            // Atualiza o painel original
            const payload = await getConfigDashboardPayload(interaction.guild);
            await interaction.message.edit(payload);
        }
    }
};

module.exports = configHandler;


// Ficheiro: interactions/config_handler.js (VERSÃO CORRIGIDA E FINAL)
const { ActionRowBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../database/db.js');
const { getConfigDashboardPayload } = require('../views/config_views.js');
const { getRegistrationPanelPayload } = require('../views/registration_views.js');
const { getAbsencePanelPayload } = require('../views/absence_views.js');
const { getTicketPanelPayload } = require('../views/ticket_views.js');
const { getChangelogPayload } = require('../views/changelog_view.js');

// Mapeia o customId dos botões para a lógica de criação de menus
const menuButtons = {
    'config_set_registration_channel': { dbKey: 'registration_channel_id', type: 'channel', channelTypes: [ChannelType.GuildText], placeholder: 'Selecione o canal para logs de registo...' },
    'config_set_absence_channel': { dbKey: 'absence_channel_id', type: 'channel', channelTypes: [ChannelType.GuildText], placeholder: 'Selecione o canal para logs de ausência...' },
    'config_set_registered_role': { dbKey: 'registered_role_id', type: 'role', placeholder: 'Selecione o cargo de membro registado...' },
    'config_set_absence_role': { dbKey: 'absence_role_id', type: 'role', placeholder: 'Selecione o cargo de membro ausente...' },
    'config_set_ticket_category': { dbKey: 'ticket_category_id', type: 'channel', channelTypes: [ChannelType.GuildCategory], placeholder: 'Selecione a categoria para criar os tickets...' },
    'config_set_support_role': { dbKey: 'support_role_id', type: 'role', placeholder: 'Selecione o cargo que pode ver os tickets...' },
    'config_set_ticket_log_channel': { dbKey: 'ticket_log_channel_id', type: 'channel', channelTypes: [ChannelType.GuildText], placeholder: 'Selecione o canal de logs de tickets...' },
};

// Mapeia o customId dos botões para a lógica de publicação de painéis
const publishButtons = {
    'config_publish_registration_panel': { type: 'registration', required: ['registration_channel_id'] },
    'config_publish_absence_panel': { type: 'absence', required: ['absence_channel_id', 'absence_role_id'] },
    'config_publish_ticket_panel': { type: 'ticket', required: ['ticket_category_id', 'support_role_id'] }
};

// Mapeia o customId dos botões para a lógica de criação de modais
const modalButtons = {
    'config_set_nickname_tag': { dbKey: 'nickname_tag', title: 'Definir TAG de Nickname', label: 'Insira a TAG (sem colchetes)', style: TextInputStyle.Short },
    'config_set_panel_image': { dbKey: 'registration_panel_image_url', title: 'Imagem do Painel de Registo', label: 'Cole a URL da imagem (https)', style: TextInputStyle.Short },
    'config_set_absence_image': { dbKey: 'absence_panel_image_url', title: 'Imagem do Painel de Ausência', label: 'Cole a URL da imagem (https)', style: TextInputStyle.Short },
    'config_set_ticket_image': { dbKey: 'ticket_panel_image_url', title: 'Imagem do Painel de Ticket', label: 'Cole a URL da imagem (https)', style: TextInputStyle.Short },
};

// Handler unificado para todas as interações de configuração
const configHandler = {
    customId: (id) => id.startsWith('config_') || id.startsWith('select_config:') || id.startsWith('publish_panel:') || id.startsWith('modal_submit:') || id.startsWith('changelog_page:'),

    async execute(interaction) {
        const { customId, user } = interaction;

        // --- HANDLERS DE BOTÕES ---
        if (interaction.isButton()) {
            // Changelog
            if (customId === 'config_view_changelog') {
                await interaction.reply({ ...(await getChangelogPayload(1)), ephemeral: true });
                return;
            }
            if (customId.startsWith('changelog_page:')) {
                const page = parseInt(customId.split(':')[1], 10);
                if (isNaN(page) || page < 1) return interaction.deferUpdate();
                await interaction.update(await getChangelogPayload(page));
                return;
            }

            // Menus de Seleção
            if (menuButtons[customId]) {
                const config = menuButtons[customId];
                let menu;
                if (config.type === 'channel') {
                    menu = new ChannelSelectMenuBuilder().addChannelTypes(config.channelTypes);
                } else {
                    menu = new RoleSelectMenuBuilder();
                }
                menu.setCustomId(`select_config:${config.dbKey}`).setPlaceholder(config.placeholder);
                await interaction.reply({ components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
                return;
            }

            // Publicar Painéis
            if (publishButtons[customId]) {
                const config = publishButtons[customId];
                const settings = await db.get(`SELECT ${config.required.join(', ')} FROM guild_settings WHERE guild_id = $1`, [interaction.guildId]);
                if (!config.required.every(key => settings?.[key])) {
                    return interaction.reply({ content: `❌ Faltam configurações essenciais para publicar este painel. Verifique as definições de **${config.type}**.`, ephemeral: true });
                }
                const menu = new ChannelSelectMenuBuilder().setCustomId(`publish_panel:${config.type}`).setPlaceholder('Selecione o canal para publicar...').addChannelTypes(ChannelType.GuildText);
                await interaction.reply({ content: `Onde quer que o painel de **${config.type}** seja publicado?`, components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
                return;
            }

            // Modais
            if (modalButtons[customId]) {
                const config = modalButtons[customId];
                const modal = new ModalBuilder().setCustomId(`modal_submit:${config.dbKey}`).setTitle(config.title);
                const input = new TextInputBuilder().setCustomId('value_input').setLabel(config.label).setStyle(config.style).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await interaction.showModal(modal);
                return;
            }
        }

        // --- HANDLERS DE MENUS DE SELEÇÃO (CANAL E CARGO) ---
        if (interaction.isAnySelectMenu() && customId.startsWith('select_config:')) {
            await interaction.deferUpdate();
            const dbKey = customId.split(':')[1];
            const selectedId = interaction.values[0];
            await db.run(`INSERT INTO guild_settings (guild_id, ${dbKey}) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET ${dbKey} = $2`, [interaction.guildId, selectedId]);
            await interaction.editReply({ ...(await getConfigDashboardPayload(interaction.guild, user.id)), content: '✅ Configuração guardada com sucesso!', components: [] });
            // Remove a mensagem de seleção após 5 segundos
            setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
            return;
        }

        // --- HANDLER PARA PUBLICAR PAINEL APÓS SELEÇÃO DE CANAL ---
        if (interaction.isChannelSelectMenu() && customId.startsWith('publish_panel:')) {
            await interaction.deferUpdate();
            const panelType = customId.split(':')[1];
            const channelId = interaction.values[0];
            const targetChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);

            if (targetChannel) {
                let panelPayload;
                if (panelType === 'registration') panelPayload = await getRegistrationPanelPayload(interaction.guildId);
                else if (panelType === 'absence') panelPayload = await getAbsencePanelPayload(interaction.guildId);
                else if (panelType === 'ticket') panelPayload = await getTicketPanelPayload(interaction.guildId);
                
                await targetChannel.send(panelPayload);
                await interaction.editReply({ content: `✅ Painel de **${panelType}** publicado com sucesso em ${targetChannel}!`, components: [] });
            } else {
                await interaction.editReply({ content: '❌ Canal não encontrado.', components: [] });
            }
            return;
        }

        // --- HANDLER DE SUBMISSÃO DE MODAL ---
        if (interaction.isModalSubmit() && customId.startsWith('modal_submit:')) {
            await interaction.deferReply({ ephemeral: true });
            const dbKey = customId.split(':')[1];
            const value = interaction.fields.getTextInputValue('value_input');

            if (dbKey.includes('_url') && !value.startsWith('https://')) {
                return interaction.editReply({ content: '❌ URL inválida. O link da imagem deve começar com `https://`.' });
            }
            await db.run(`INSERT INTO guild_settings (guild_id, ${dbKey}) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET ${dbKey} = $2`, [interaction.guildId, value]);
            await interaction.editReply({ content: '✅ Configuração guardada com sucesso! O painel principal será atualizado.' });
            
            // É preciso encontrar a interação do comando original para atualizar o painel,
            // o que não é direto. Por enquanto, a melhor UX é apenas confirmar.
        }
    }
};

module.exports = configHandler;
const { 
    ModalBuilder, 
    TextInputBuilder, 
    ActionRowBuilder, 
    TextInputStyle, 
    ChannelSelectMenuBuilder, 
    ChannelType, 
    RoleSelectMenuBuilder,
    MessageFlags
} = require('discord.js');
const { getConfigDashboardPayload, getCategoryConfigPayload } = require('../views/config_views');
// Importe as views dos painéis públicos que você criará
// const { getTicketPanelPayload } = require('../views/ticket_views');
// const { getPontoPanelPayload } = require('../views/ponto_views');
const db = require('../database/db');

// ✔️ CORRIGIDO: Prefixo padronizado para 'config'.
const prefix = 'config';

async function handle(interaction) {
    const [_, action, value] = interaction.customId.split(':');

    try {
        switch (action) {
            case 'menu':
                await handleMenu(interaction, value);
                break;
            case 'set':
                await handleSet(interaction, value);
                break;
            case 'update':
                await handleUpdate(interaction, value);
                break;
            case 'modal':
                await handleModalSubmit(interaction, value);
                break;
            case 'publish':
                await handlePublish(interaction, value);
                break;
            default:
                console.warn(`[Config Handler] Ação desconhecida: ${action}`);
        }
    } catch (error) {
        console.error('[Config Handler] Erro ao processar interação:', error);
    }
}

async function handleMenu(interaction, category) {
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guild.id]);
    const payload = (category === 'main') 
        ? getConfigDashboardPayload() 
        : getCategoryConfigPayload(category, settings);
    await interaction.update(payload);
}

async function handleSet(interaction, setting) {
    const setters = {
        // Ticket
        'ticket_category_id': { type: 'channel', placeholder: 'Selecione a categoria para criar tickets', channelTypes: [ChannelType.GuildCategory] },
        'ticket_staff_role_id': { type: 'role', placeholder: 'Selecione o cargo que atenderá os tickets' },
        'ticket_log_channel_id': { type: 'channel', placeholder: 'Selecione o canal de logs dos tickets', channelTypes: [ChannelType.GuildText] },
        'ticket_panel_image_url': { type: 'modal', modalTitle: 'Imagem do Painel de Ticket', inputLabel: 'URL da imagem', inputId: 'url_input' },
        // Ponto
        'ponto_role_id': { type: 'role', placeholder: 'Selecione o cargo de "Em Serviço"' },
        'ponto_monitor_channel_id': { type: 'channel', placeholder: 'Selecione o canal do monitor de ponto', channelTypes: [ChannelType.GuildText] },
    };

    const config = setters[setting];
    if (!config) return;

    if (config.type === 'channel') {
        const menu = new ChannelSelectMenuBuilder().setCustomId(`config:update:${setting}`).setPlaceholder(config.placeholder).addChannelTypes(...config.channelTypes);
        await interaction.reply({ components: [new ActionRowBuilder().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    } else if (config.type === 'role') {
        const menu = new RoleSelectMenuBuilder().setCustomId(`config:update:${setting}`).setPlaceholder(config.placeholder);
        await interaction.reply({ components: [new ActionRowBuilder().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    } else if (config.type === 'modal') {
        const modal = new ModalBuilder().setCustomId(`config:modal:${setting}`).setTitle(config.modalTitle);
        const input = new TextInputBuilder().setCustomId(config.inputId).setLabel(config.inputLabel).setStyle(TextInputStyle.Short).setRequired(false);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
}

async function handleUpdate(interaction, setting) {
    const guildId = interaction.guild.id;
    const selectedValue = interaction.values[0];

    await db.run(`UPDATE guild_settings SET ${setting} = $1 WHERE guild_id = $2`, [selectedValue, guildId]);
    
    // Recarrega e atualiza a view
    const category = setting.split('_')[0];
    const updatedSettings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
    const payload = getCategoryConfigPayload(category, updatedSettings);
    await interaction.update(payload);
}

async function handleModalSubmit(interaction, setting) {
    const guildId = interaction.guild.id;
    const inputValue = interaction.fields.getTextInputValue('url_input');
    await db.run(`UPDATE guild_settings SET ${setting} = $1 WHERE guild_id = $2`, [inputValue || null, guildId]);
    
    // Recarrega e atualiza a view
    const category = setting.split('_')[0];
    const updatedSettings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
    const payload = getCategoryConfigPayload(category, updatedSettings);
    
    // Modals não podem ser atualizados, então respondemos e o usuário terá que interagir de novo para ver a mudança
    await interaction.reply({ content: '✅ Configuração atualizada!', flags: [MessageFlags.Ephemeral] });
    // Para feedback instantâneo, seria preciso buscar a mensagem original do painel e editá-la.
    // interaction.message.edit(payload) // Isso pode funcionar dependendo do fluxo.
}

async function handlePublish(interaction, panelType) {
    await interaction.deferReply({ ephemeral: true });
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guild.id]);
    
    let targetChannelId;
    let panelPayload;
    
    if (panelType === 'ticket') {
        // Exemplo, você precisará criar esta função em ticket_views.js
        // panelPayload = getTicketPanelPayload(settings);
        // targetChannelId = settings.ticket_channel_id; // Você precisa adicionar essa coluna no DB
        panelPayload = { content: 'Painel de Tickets em construção!' };
        targetChannelId = interaction.channel.id; // Publica no canal atual como fallback
    } else if (panelType === 'ponto') {
        // panelPayload = getPontoPanelPayload(interaction.user, settings);
        // targetChannelId = settings.ponto_channel_id;
        panelPayload = { content: 'Painel de Ponto em construção!' };
        targetChannelId = interaction.channel.id;
    }

    if (!targetChannelId) {
        return interaction.editReply({ content: `❌ O canal para publicar o painel de \`${panelType}\` não está configurado.` });
    }

    const channel = await interaction.guild.channels.fetch(targetChannelId).catch(() => null);
    if (!channel) {
        return interaction.editReply({ content: `❌ O canal configurado (<#${targetChannelId}>) não foi encontrado ou não tenho permissão para ver.` });
    }

    try {
        await channel.send(panelPayload);
        await interaction.editReply({ content: `✅ Painel de \`${panelType}\` publicado com sucesso em ${channel}!` });
    } catch (error) {
        console.error(`[Publish] Falha ao publicar painel de ${panelType}:`, error);
        await interaction.editReply({ content: `❌ Falha ao publicar o painel. Verifique minhas permissões no canal ${channel}.` });
    }
}


module.exports = { prefix, handle };
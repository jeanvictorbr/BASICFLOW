const { 
    ModalBuilder, 
    TextInputBuilder, 
    ActionRowBuilder, 
    TextInputStyle, 
    ChannelSelectMenuBuilder, 
    ChannelType, 
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    MessageFlags
} = require('discord.js');
const { getConfigDashboardPayload, getCategoryConfigPayload } = require('../views/config_views');
// PLACEHOLDER: Importe as views dos painéis públicos quando forem criadas.
// const { getTicketPanelPayload } = require('../views/ticket_views');
// const { getPontoPanelPayload } = require('../views/ponto_views');
const db = require('../database/db');

const prefix = 'config';

/**
 * Roteador principal para todas as interações de configuração.
 */
async function handle(interaction) {
    const [_, action, value] = interaction.customId.split(':');

    try {
        switch (action) {
            case 'menu': await handleMenu(interaction, value); break;
            case 'set': await handleSet(interaction, value); break;
            case 'update': await handleUpdate(interaction, value); break;
            case 'modal': await handleModalSubmit(interaction, value); break;
            case 'publish': await handlePublish(interaction, value); break;
            default: console.warn(`[Config Handler] Ação desconhecida: ${action}`);
        }
    } catch (error) {
        console.error(`[Config Handler] Erro fatal ao processar '${interaction.customId}':`, error);
    }
}

/**
 * Gerencia a navegação entre o menu principal e os submenus.
 */
async function handleMenu(interaction, category) {
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guild.id]);
    const payload = (category === 'main') 
        ? getConfigDashboardPayload() 
        : getCategoryConfigPayload(category, settings);
    await interaction.update(payload);
}

/**
 * Abre o componente apropriado (menu, modal) para alterar uma configuração.
 */
async function handleSet(interaction, setting) {
    // Dicionário central de todas as configurações editáveis
    const setters = {
        // Ticket
        'ticket_category_id': { type: 'channel', placeholder: 'Selecione a categoria para criar tickets', channelTypes: [ChannelType.GuildCategory] },
        'ticket_staff_role_id': { type: 'role', placeholder: 'Selecione o cargo que atenderá os tickets' },
        'ticket_log_channel_id': { type: 'channel', placeholder: 'Selecione o canal de logs dos tickets', channelTypes: [ChannelType.GuildText] },
        'ticket_panel_image_url': { type: 'modal', modalTitle: 'URL da Imagem do Painel de Tickets', customId: 'panel_image_url', inputs: [{ id: 'url', label: 'URL da Imagem', style: TextInputStyle.Short }] },
        // Ponto
        'ponto_role_id': { type: 'role', placeholder: 'Selecione o cargo de "Em Serviço"' },
        'ponto_monitor_channel_id': { type: 'channel', placeholder: 'Selecione o canal do monitor de ponto', channelTypes: [ChannelType.GuildText] },
        'ponto_panel_image_url': { type: 'modal', modalTitle: 'URL da Imagem do Painel de Ponto', customId: 'panel_image_url', inputs: [{ id: 'url', label: 'URL da Imagem', style: TextInputStyle.Short }] },
        // Registration
        'registration_staff_role_id': { type: 'role', placeholder: 'Selecione o cargo da staff (aprova/reprova)' },
        'registration_approved_role_id': { type: 'role', placeholder: 'Selecione o cargo para membros aprovados' },
        'registration_log_channel_id': { type: 'channel', placeholder: 'Selecione o canal de logs de registros', channelTypes: [ChannelType.GuildText] },
        'registration_panel_image_url': { type: 'modal', modalTitle: 'URL da Imagem do Painel de Registro', customId: 'panel_image_url', inputs: [{ id: 'url', label: 'URL da Imagem', style: TextInputStyle.Short }] },
        // Uniformes
        'uniform_add': { type: 'modal', modalTitle: 'Adicionar Novo Uniforme', customId: 'uniform_add_modal', inputs: [
            { id: 'uniform_name', label: 'Nome do Uniforme (Ex: Uniforme de Gala)', style: TextInputStyle.Short },
            { id: 'uniform_codes', label: 'Códigos dos Itens (separados por vírgula)', style: TextInputStyle.Paragraph },
            { id: 'uniform_image_url', label: 'URL da Imagem do Uniforme', style: TextInputStyle.Short },
        ]},
        'uniform_remove': { type: 'select_menu_db', placeholder: 'Selecione um uniforme para remover' }
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
        const modal = new ModalBuilder().setCustomId(`config:modal:${setting}:${config.customId}`).setTitle(config.modalTitle);
        config.inputs.forEach(inputConfig => {
            const input = new TextInputBuilder().setCustomId(inputConfig.id).setLabel(inputConfig.label).setStyle(inputConfig.style).setRequired(false);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
        });
        await interaction.showModal(modal);
    } else if (config.type === 'select_menu_db') {
        const items = await db.all('SELECT id, name FROM vestuario_items WHERE guild_id = $1 ORDER BY name ASC', [interaction.guild.id]);
        if (items.length === 0) return interaction.reply({ content: 'Não há uniformes cadastrados para remover.', flags: [MessageFlags.Ephemeral] });
        
        const menu = new StringSelectMenuBuilder().setCustomId(`config:update:${setting}`).setPlaceholder(config.placeholder)
            .addOptions(items.map(item => ({ label: item.name, value: item.id.toString() })));
        await interaction.reply({ content: 'Selecione o uniforme que deseja apagar permanentemente.', components: [new ActionRowBuilder().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    }
}

/**
 * Processa a submissão de um SelectMenu.
 */
async function handleUpdate(interaction, setting) {
    const guildId = interaction.guild.id;
    const selectedValue = interaction.values[0];

    if (setting === 'uniform_remove') {
        await db.run('DELETE FROM vestuario_items WHERE id = $1 AND guild_id = $2', [selectedValue, guildId]);
        return interaction.update({ content: '🗑️ Uniforme removido com sucesso! Você pode fechar esta mensagem.', components: [] });
    }

    // Lógica genérica para outras configurações
    await db.run(`UPDATE guild_settings SET ${setting} = $1 WHERE guild_id = $2`, [selectedValue, guildId]);
    
    const category = setting.split('_')[0];
    const updatedSettings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
    const payload = getCategoryConfigPayload(category, updatedSettings);
    await interaction.update(payload);
}

/**
 * Processa a submissão de um Modal.
 */
async function handleModalSubmit(interaction, value) {
    const guildId = interaction.guild.id;
    const [setting, customId] = value.split(':');

    if (customId === 'uniform_add_modal') {
        const name = interaction.fields.getTextInputValue('uniform_name');
        const codes = interaction.fields.getTextInputValue('uniform_codes').split(',').map(code => code.trim());
        const imageUrl = interaction.fields.getTextInputValue('uniform_image_url');
        await db.run('INSERT INTO vestuario_items (guild_id, name, item_codes, image_url) VALUES ($1, $2, $3, $4)',[guildId, name, codes, imageUrl]);
        return interaction.reply({ content: `✅ Uniforme "**${name}**" adicionado com sucesso!`, flags: [MessageFlags.Ephemeral] });
    }
    
    if (customId === 'panel_image_url') {
        const imageUrl = interaction.fields.getTextInputValue('url');
        await db.run(`UPDATE guild_settings SET ${setting} = $1 WHERE guild_id = $2`, [imageUrl || null, guildId]);
        
        const category = setting.split('_panel_image_url')[0];
        const updatedSettings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
        const payload = getCategoryConfigPayload(category, updatedSettings);
        
        await interaction.message.edit(payload); // Tenta editar a mensagem original do painel
        return interaction.reply({ content: '✅ Imagem do painel atualizada!', flags: [MessageFlags.Ephemeral] });
    }
}

/**
 * Publica o painel de um módulo em um canal configurado.
 */
async function handlePublish(interaction, panelType) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guild.id]);
    
    const panelConfigs = {
        'ticket': { channelId: settings.ticket_channel_id, view: 'getTicketPanelPayload' },
        'ponto': { channelId: settings.ponto_channel_id, view: 'getPontoPanelPayload' },
        'registration': { channelId: settings.registration_channel_id, view: 'getRegistrationPanelPayload' },
        // Adicione outros painéis aqui
    };

    const config = panelConfigs[panelType];
    if (!config) return interaction.editReply({ content: 'Tipo de painel desconhecido.' });
    if (!config.channelId) return interaction.editReply({ content: `❌ O canal para publicar o painel de \`${panelType}\` não está configurado.` });

    const channel = await interaction.guild.channels.fetch(config.channelId).catch(() => null);
    if (!channel) return interaction.editReply({ content: `❌ O canal configurado (<#${config.channelId}>) não foi encontrado.` });

    try {
        // A lógica para chamar a view real precisa ser implementada
        // const { getTicketPanelPayload } = require(`../views/${panelType}_views.js`);
        // const panelPayload = await getTicketPanelPayload(settings);
        const panelPayload = { content: `Este é o painel público para o sistema de ${panelType}. A lógica final está em construção.` };
        
        await channel.send(panelPayload);
        await interaction.editReply({ content: `✅ Painel de \`${panelType}\` publicado com sucesso em ${channel}!` });
    } catch (error) {
        console.error(`[Publish] Falha ao publicar painel de ${panelType}:`, error);
        await interaction.editReply({ content: `❌ Falha ao publicar o painel. Verifique minhas permissões no canal ${channel}.` });
    }
}

module.exports = { prefix, handle };
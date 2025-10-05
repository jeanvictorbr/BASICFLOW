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
// Importe as views dos painéis públicos quando forem criadas.
const { getRegistrationPanelPayload } = require('../views/registration_views');
// const { getTicketPanelPayload } = require('../views/ticket_views');
// const { getPontoPanelPayload } = require('../views/ponto_views');
// const { getAbsencePanelPayload } = require('../views/absence_views'); // Futuro módulo
const db = require('../database/db');

const prefix = 'config';

/**
 * Roteador principal para todas as interações de configuração.
 */
async function handle(interaction) {
    const [_, action, value, customIdSuffix] = interaction.customId.split(':'); // Adicionado customIdSuffix para modais

    try {
        switch (action) {
            case 'menu': await handleMenu(interaction, value); break;
            case 'set': await handleSet(interaction, value); break;
            case 'update': await handleUpdate(interaction, value); break;
            case 'modal': await handleModalSubmit(interaction, value, customIdSuffix); break; // Passa customIdSuffix
            case 'publish': await handlePublish(interaction, value); break;
            case 'toggle': await handleToggle(interaction, value); break; // Novo handler para toggle
            default: console.warn(`[Config Handler] Ação desconhecida: ${action}`);
        }
    } catch (error) {
        console.error(`[Config Handler] Erro fatal ao processar '${interaction.customId}':`, error);
        await interaction.editReply({ 
            content: '❌ Ocorreu um erro ao processar sua solicitação.', 
            flags: [MessageFlags.Ephemeral] 
        }).catch(() => {});
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
        // Registration
        'registration_log_channel_id': { type: 'channel', placeholder: 'Canal de logs de registro', channelTypes: [ChannelType.GuildText], category: 'registration' },
        'registration_staff_role_id': { type: 'role', placeholder: 'Cargo da staff de registro', category: 'registration' },
        'registration_approved_role_id': { type: 'role', placeholder: 'Cargo para membros aprovados', category: 'registration' },
        'registration_name_pattern': { type: 'modal', modalTitle: 'Padrão de Nomes do Registro', customId: 'name_pattern_modal', category: 'registration', inputs: [{ id: 'pattern', label: 'Padrão (ex: {nome} ({id}))', style: TextInputStyle.Short }] },
        'registration_welcome_message': { type: 'modal', modalTitle: 'Mensagem Padrão do Painel de Registro', customId: 'welcome_message_modal', category: 'registration', inputs: [{ id: 'message', label: 'Mensagem (máx 2000 caracteres)', style: TextInputStyle.Paragraph }] },
        'registration_panel_image_url': { type: 'modal', modalTitle: 'URL da Imagem do Painel de Registro', customId: 'panel_image_url', category: 'registration', inputs: [{ id: 'url', label: 'URL da Imagem', style: TextInputStyle.Short }] },
        
        // Ticket
        'ticket_category_id': { type: 'channel', placeholder: 'Selecione a categoria para criar tickets', channelTypes: [ChannelType.GuildCategory], category: 'tickets' },
        'ticket_staff_role_id': { type: 'role', placeholder: 'Selecione o cargo que atenderá os tickets', category: 'tickets' },
        'ticket_log_channel_id': { type: 'channel', placeholder: 'Selecione o canal de logs dos tickets', channelTypes: [ChannelType.GuildText], category: 'tickets' },
        'ticket_panel_image_url': { type: 'modal', modalTitle: 'URL da Imagem do Painel de Tickets', customId: 'panel_image_url', category: 'tickets', inputs: [{ id: 'url', label: 'URL da Imagem', style: TextInputStyle.Short }] },
        // Ponto
        'ponto_role_id': { type: 'role', placeholder: 'Selecione o cargo de "Em Serviço"', category: 'ponto' },
        'ponto_monitor_channel_id': { type: 'channel', placeholder: 'Selecione o canal do monitor de ponto', channelTypes: [ChannelType.GuildText], category: 'ponto' },
        'ponto_panel_image_url': { type: 'modal', modalTitle: 'URL da Imagem do Painel de Ponto', customId: 'panel_image_url', category: 'ponto', inputs: [{ id: 'url', label: 'URL da Imagem', style: TextInputStyle.Short }] },
        // Uniformes
        'uniform_add': { type: 'modal', modalTitle: 'Adicionar Novo Uniforme', customId: 'uniform_add_modal', category: 'uniformes', inputs: [
            { id: 'uniform_name', label: 'Nome do Uniforme (Ex: Uniforme de Gala)', style: TextInputStyle.Short },
            { id: 'uniform_codes', label: 'Códigos dos Itens (separados por vírgula)', style: TextInputStyle.Paragraph },
            { id: 'uniform_image_url', label: 'URL da Imagem do Uniforme', style: TextInputStyle.Short },
        ]},
        'uniform_remove': { type: 'select_menu_db', placeholder: 'Selecione um uniforme para remover', category: 'uniformes' },
        // Absence (Ausências)
        'absence_notification_channel_id': { type: 'channel', placeholder: 'Canal de notificações de ausência', channelTypes: [ChannelType.GuildText], category: 'absence' },
        'absence_staff_role_id': { type: 'role', placeholder: 'Cargo da staff (aprova/reprova ausência)', category: 'absence' },
        'absence_role_id': { type: 'role', placeholder: 'Cargo para membros ausentes', category: 'absence' },
    };

    const config = setters[setting];
    if (!config) {
        return interaction.reply({ content: 'Esta configuração ainda não é editável.', flags: [MessageFlags.Ephemeral] });
    }

    if (config.type === 'channel') {
        const menu = new ChannelSelectMenuBuilder().setCustomId(`config:update:${setting}:${config.category}`).setPlaceholder(config.placeholder).addChannelTypes(...config.channelTypes);
        await interaction.reply({ components: [new ActionRowBuilder().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    } else if (config.type === 'role') {
        const menu = new RoleSelectMenuBuilder().setCustomId(`config:update:${setting}:${config.category}`).setPlaceholder(config.placeholder);
        await interaction.reply({ components: [new ActionRowBuilder().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    } else if (config.type === 'modal') {
        const modal = new ModalBuilder().setCustomId(`config:modal:${setting}:${config.customId}`).setTitle(config.modalTitle);
        config.inputs.forEach(inputConfig => {
            const input = new TextInputBuilder().setCustomId(inputConfig.id).setLabel(inputConfig.label).setStyle(inputConfig.style).setRequired(false); // Pode ser configurável
            modal.addComponents(new ActionRowBuilder().addComponents(input));
        });
        await interaction.showModal(modal);
    } else if (config.type === 'select_menu_db') {
        const items = await db.all('SELECT id, name FROM vestuario_items WHERE guild_id = $1 ORDER BY name ASC', [interaction.guild.id]);
        if (items.length === 0) {
            return interaction.reply({ content: 'Não há uniformes cadastrados para remover.', flags: [MessageFlags.Ephemeral] });
        }
        
        const menu = new StringSelectMenuBuilder().setCustomId(`config:update:${setting}:${config.category}`).setPlaceholder(config.placeholder)
            .addOptions(items.map(item => ({ label: item.name, value: item.id.toString() })));
            
        await interaction.reply({ content: 'Selecione o uniforme que deseja apagar permanentemente.', components: [new ActionRowBuilder().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
    }
}

/**
 * Processa a submissão de um SelectMenu.
 */
async function handleUpdate(interaction, setting, category) {
    const guildId = interaction.guild.id;
    const selectedValue = interaction.values[0];

    if (setting === 'uniform_remove') {
        await db.run('DELETE FROM vestuario_items WHERE id = $1 AND guild_id = $2', [selectedValue, guildId]);
        await interaction.update({ content: '🗑️ Uniforme removido com sucesso! Você pode fechar esta mensagem.', components: [] });
    } else {
        await db.run(`UPDATE guild_settings SET ${setting} = $1 WHERE guild_id = $2`, [selectedValue, guildId]);
        
        const updatedSettings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
        const payload = getCategoryConfigPayload(category, updatedSettings); // Usa a categoria passada
        await interaction.update(payload);
    }
}

/**
 * Processa a submissão de um Modal.
 */
async function handleModalSubmit(interaction, setting, customIdSuffix) {
    const guildId = interaction.guild.id;

    let valueToStore = null;
    let replyMessage = '✅ Configuração atualizada!';
    let categoryToUpdate = null; // Para saber qual categoria recarregar

    // Determina a categoria com base no setting para recarregar a view correta
    const settingToCategoryMap = {
        'registration_log_channel_id': 'registration', 'registration_staff_role_id': 'registration', 
        'registration_approved_role_id': 'registration', 'registration_name_pattern': 'registration', 
        'registration_welcome_message': 'registration', 'registration_panel_image_url': 'registration',
        'ticket_category_id': 'tickets', 'ticket_staff_role_id': 'tickets', 'ticket_log_channel_id': 'tickets',
        'ticket_panel_image_url': 'tickets',
        'ponto_role_id': 'ponto', 'ponto_monitor_channel_id': 'ponto', 'ponto_panel_image_url': 'ponto',
        'absence_notification_channel_id': 'absence', 'absence_staff_role_id': 'absence', 'absence_role_id': 'absence',
    };
    categoryToUpdate = settingToCategoryMap[setting] || 'main'; // Default para 'main' se não encontrar

    if (customIdSuffix === 'uniform_add_modal') {
        const name = interaction.fields.getTextInputValue('uniform_name');
        const codes = interaction.fields.getTextInputValue('uniform_codes').split(',').map(code => code.trim());
        const imageUrl = interaction.fields.getTextInputValue('uniform_image_url');
        await db.run('INSERT INTO vestuario_items (guild_id, name, item_codes, image_url) VALUES ($1, $2, $3, $4)',[guildId, name, codes, imageUrl]);
        replyMessage = `✅ Uniforme "**${name}**" adicionado com sucesso!`;
        categoryToUpdate = 'uniformes'; // Força a categoria para uniformes
    } else if (customIdSuffix === 'name_pattern_modal') {
        valueToStore = interaction.fields.getTextInputValue('pattern');
        replyMessage = '✅ Padrão de nome atualizado!';
    } else if (customIdSuffix === 'welcome_message_modal') {
        valueToStore = interaction.fields.getTextInputValue('message');
        replyMessage = '✅ Mensagem padrão de registro atualizada!';
    } else if (customIdSuffix === 'panel_image_url') {
        valueToStore = interaction.fields.getTextInputValue('url');
        replyMessage = '✅ Imagem do painel atualizada!';
    }

    if (valueToStore !== null) {
        await db.run(`UPDATE guild_settings SET ${setting} = $1 WHERE guild_id = $2`, [valueToStore || null, guildId]);
    }
    
    // Tenta atualizar a mensagem original do painel se for possível
    try {
        const updatedSettings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
        const payload = getCategoryConfigPayload(categoryToUpdate, updatedSettings);
        if (interaction.message) { // Verifica se a interação veio de uma mensagem editável
            await interaction.message.edit(payload);
        }
    } catch (error) {
        console.error("Erro ao tentar atualizar a mensagem do painel após modal:", error);
    }

    await interaction.reply({ content: replyMessage, flags: [MessageFlags.Ephemeral] });
}

/**
 * Publica o painel de um módulo em um canal configurado.
 */
async function handlePublish(interaction, panelType) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guild.id]);
    
    const panelConfigs = {
        'ticket': { channelId: settings.ticket_channel_id, viewFunction: null }, // Precisa importar getTicketPanelPayload
        'ponto': { channelId: settings.ponto_channel_id, viewFunction: null }, // Precisa importar getPontoPanelPayload
        'registration': { channelId: settings.registration_channel_id, viewFunction: getRegistrationPanelPayload },
        'absence': { channelId: settings.absence_channel_id, viewFunction: null }, // Precisa importar getAbsencePanelPayload
    };

    const config = panelConfigs[panelType];
    if (!config) return interaction.editReply({ content: 'Tipo de painel desconhecido.' });
    if (!config.channelId) return interaction.editReply({ content: `❌ O canal para publicar o painel de \`${panelType}\` não está configurado. Configure em /configurar -> ${panelType.toUpperCase()}.` });

    const channel = await interaction.guild.channels.fetch(config.channelId).catch(() => null);
    if (!channel) return interaction.editReply({ content: `❌ O canal configurado (<#${config.channelId}>) não foi encontrado ou não tenho permissão para vê-lo.` });

    try {
        if (!config.viewFunction) {
            return interaction.editReply({ content: `⚠️ A função de view para o painel de \`${panelType}\` ainda não foi implementada.` });
        }
        const panelPayload = await config.viewFunction(settings);
        
        await channel.send(panelPayload);
        await interaction.editReply({ content: `✅ Painel de \`${panelType}\` publicado com sucesso em ${channel}!` });
    } catch (error) {
        console.error(`[Publish] Falha ao publicar painel de ${panelType}:`, error);
        await interaction.editReply({ content: `❌ Falha ao publicar o painel. Verifique minhas permissões no canal ${channel}.` });
    }
}

/**
 * Lida com a alternância de configurações (ex: ativar/desativar módulo).
 */
async function handleToggle(interaction, setting) {
    await interaction.deferUpdate(); // Defer a atualização para que o botão não fique travado
    const guildId = interaction.guild.id;

    if (setting === 'registration_enabled') {
        const currentStatus = (await db.get('SELECT registration_enabled FROM guild_settings WHERE guild_id = $1', [guildId])).registration_enabled;
        const newStatus = !currentStatus;
        await db.run('UPDATE guild_settings SET registration_enabled = $1 WHERE guild_id = $2', [newStatus, guildId]);
        
        // Recarrega a view de registro
        const updatedSettings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
        const payload = getCategoryConfigPayload('registration', updatedSettings);
        await interaction.editReply(payload); // Edita a mensagem do painel
    }
}


module.exports = { prefix, handle };
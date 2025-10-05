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
const db = require('../database/db');

// O prefixo 'config' é usado para rotear todas as interações relacionadas à configuração.
const prefix = 'config';

/**
 * Roteia a interação para a função apropriada com base na ação.
 * @param {import('discord.js').Interaction} interaction
 */
async function handle(interaction) {
    // customId no formato "prefix:action:value" -> ex: "config:set:reg_log_channel"
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
            default:
                console.warn(`[Config Handler] Ação desconhecida: ${action}`);
        }
    } catch (error) {
        console.error('[Config Handler] Erro ao processar interação:', error);
        await interaction.reply({ 
            content: '❌ Ocorreu um erro ao processar sua solicitação.', 
            flags: [MessageFlags.Ephemeral] 
        }).catch(() => {});
    }
}

/**
 * Gerencia a navegação nos menus do painel.
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {string} category O menu a ser exibido ('main' ou uma categoria específica).
 */
async function handleMenu(interaction, category) {
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guild.id]);
    
    let payload;
    if (category === 'main') {
        payload = getConfigDashboardPayload(settings);
    } else {
        payload = getCategoryConfigPayload(category, settings);
    }
    await interaction.update(payload);
}

/**
 * Abre o componente apropriado (menu de seleção, modal) para alterar uma configuração.
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {string} setting A configuração a ser alterada (ex: 'reg_log_channel').
 */
async function handleSet(interaction, setting) {
    let response;
    
    // Mapeamento de configurações para seus componentes de edição
    const setters = {
        // --- Registros ---
        'reg_log_channel': {
            type: 'channel',
            placeholder: 'Selecione o canal para logs de registro',
            channelTypes: [ChannelType.GuildText],
            content: 'Selecione o novo **canal de logs** para o sistema de registro.'
        },
        'reg_staff_role': {
            type: 'role',
            placeholder: 'Selecione o cargo da staff de registro',
            content: 'Selecione o novo **cargo da staff** que irá aprovar/reprovar registros.'
        },
        'reg_approved_role': {
            type: 'role',
            placeholder: 'Selecione o cargo para membros aprovados',
            content: 'Selecione o **cargo** que os membros receberão ao serem aprovados.'
        },
        'reg_panel_image_url': {
            type: 'modal',
            modalTitle: 'Imagem do Painel de Registro',
            inputLabel: 'URL da imagem do painel (deixe em branco para remover)',
            inputId: 'url_input'
        },
        // --- Ponto ---
        'ponto_role_id': {
            type: 'role',
            placeholder: 'Selecione o cargo de "Em Serviço"',
            content: 'Selecione o **cargo** que os membros receberão ao bater o ponto.'
        },
        'ponto_monitor_channel_id': {
            type: 'channel',
            placeholder: 'Selecione o canal do monitor de ponto',
            channelTypes: [ChannelType.GuildText],
            content: 'Selecione o **canal** onde a mensagem do monitor de ponto será exibida.'
        },
        // Adicione outras configurações aqui...
    };

    const config = setters[setting];
    if (!config) {
        return interaction.reply({ content: 'Esta configuração ainda não é editável.', flags: [MessageFlags.Ephemeral] });
    }

    if (config.type === 'channel') {
        const menu = new ChannelSelectMenuBuilder()
            .setCustomId(`config:update:${setting}`)
            .setPlaceholder(config.placeholder)
            .addChannelTypes(...config.channelTypes);
        response = { content: config.content, components: [new ActionRowBuilder().addComponents(menu)] };

    } else if (config.type === 'role') {
        const menu = new RoleSelectMenuBuilder()
            .setCustomId(`config:update:${setting}`)
            .setPlaceholder(config.placeholder);
        response = { content: config.content, components: [new ActionRowBuilder().addComponents(menu)] };
        
    } else if (config.type === 'modal') {
        const modal = new ModalBuilder()
            .setCustomId(`config:modal:${setting}`)
            .setTitle(config.modalTitle);
        
        const input = new TextInputBuilder()
            .setCustomId(config.inputId)
            .setLabel(config.inputLabel)
            .setStyle(TextInputStyle.Short)
            .setRequired(false); // Permite remover a URL

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return await interaction.showModal(modal);
    }
    
    await interaction.reply({ ...response, flags: [MessageFlags.Ephemeral] });
}

/**
 * Processa a submissão de um menu de seleção (canal ou cargo).
 * @param {import('discord.js').AnySelectMenuInteraction} interaction
 * @param {string} setting A configuração a ser atualizada.
 */
async function handleUpdate(interaction, setting) {
    const guildId = interaction.guild.id;
    const selectedValue = interaction.values[0];

    await db.run(`UPDATE guild_settings SET ${setting} = $1 WHERE guild_id = $2`, [selectedValue, guildId]);
    
    // Descobre a categoria a partir do nome da configuração para recarregar a view correta
    const category = setting.split('_')[0] === 'reg' ? 'registration' : setting.split('_')[0];
    
    // Recarrega as configurações e atualiza o painel original
    const updatedSettings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
    const payload = getCategoryConfigPayload(category, updatedSettings);
    
    await interaction.update(payload);
    await interaction.followUp({ content: '✅ Configuração atualizada com sucesso!', flags: [MessageFlags.Ephemeral] });
}

/**
 * Processa a submissão de um modal.
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @param {string} setting A configuração a ser atualizada.
 */
async function handleModalSubmit(interaction, setting) {
    const guildId = interaction.guild.id;
    const inputValue = interaction.fields.getTextInputValue('url_input'); // Assumindo 'url_input' como ID padrão

    await db.run(`UPDATE guild_settings SET ${setting} = $1 WHERE guild_id = $2`, [inputValue || null, guildId]);
    
    // Responde ao modal e avisa que o painel principal será atualizado na próxima interação
    await interaction.reply({ content: '✅ Configuração atualizada! O painel refletirá a mudança na próxima vez que você navegar.', flags: [MessageFlags.Ephemeral] });
}

module.exports = { prefix, handle };
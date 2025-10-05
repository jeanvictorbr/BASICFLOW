// Ficheiro: views/config_views.js (VERSÃO FINAL CORRIGIDA E COM ESTILO V2)

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db.js');

// Helper para formatar o status de uma configuração
const formatStatus = (settings, key, type) => {
    const id = settings?.[key];
    if (!id) return '❌ `Não definido`';
    switch (type) {
        case 'channel':
            return `✅ <#${id}>`;
        case 'role':
            return `✅ <@&${id}>`;
        case 'tag':
            return `✅ \`[${id}]\``;
        case 'image':
            return `✅ [Imagem Definida](${id})`;
        default:
            return `✅ \`${id}\``;
    }
};

// --- FUNÇÃO PRINCIPAL: Gera a TELA PRINCIPAL com as categorias ---
async function getConfigDashboardPayload(guild, userId) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚙️ Painel de Configuração')
        .setDescription('Selecione uma categoria abaixo para gerir as suas configurações.');
        
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('config_menu:registration').setLabel('📝 Registos').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('config_menu:absence').setLabel('🏝️ Ausências').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('config_menu:ticket').setLabel('🎫 Tickets').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('config_menu:ponto').setLabel('🕒 Bate-Ponto').setStyle(ButtonStyle.Secondary),
        ),
    ];
    
    if (userId === process.env.OWNER_ID) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('dev_panel').setLabel('🔒 Painel do Dono').setStyle(ButtonStyle.Danger)
            )
        );
    }
    
    return { embeds: [embed], components: rows, ephemeral: true };
}


// --- FUNÇÃO SECUNDÁRIA: Gera as TELAS de cada categoria (ESTILO V2) ---
async function getCategoryPayload(guild, category) {
    // CORREÇÃO CRÍTICA DA QUERY SQL
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guild.id]);
    
    const embed = new EmbedBuilder()
        .setColor('#2c9e8d')
        .setTimestamp();
        
    const components = [];

    const categoryMappings = {
        registration: {
            title: '📝 Configurações de Registo',
            settings: [
                { label: 'Canal de Logs', key: 'registration_channel_id', type: 'channel', buttonId: 'config_set_registration_channel' },
                { label: 'Cargo de Membro', key: 'registered_role_id', type: 'role', buttonId: 'config_set_registered_role' },
                { label: 'TAG de Nickname', key: 'nickname_tag', type: 'tag', buttonId: 'config_set_nickname_tag' },
                { label: 'Imagem do Painel', key: 'registration_panel_image_url', type: 'image', buttonId: 'config_set_panel_image' },
            ]
        },
        absence: {
            title: '🏝️ Configurações de Ausência',
            settings: [
                { label: 'Canal de Logs', key: 'absence_channel_id', type: 'channel', buttonId: 'config_set_absence_channel' },
                { label: 'Cargo de Ausente', key: 'absence_role_id', type: 'role', buttonId: 'config_set_absence_role' },
                { label: 'Imagem do Painel', key: 'absence_panel_image_url', type: 'image', buttonId: 'config_set_absence_image' },
            ]
        },
        ticket: {
            title: '🎫 Configurações de Ticket',
            settings: [
                { label: 'Categoria', key: 'ticket_category_id', type: 'channel', buttonId: 'config_set_ticket_category' },
                { label: 'Cargo de Suporte', key: 'support_role_id', type: 'role', buttonId: 'config_set_support_role' },
                { label: 'Canal de Logs', key: 'ticket_log_channel_id', type: 'channel', buttonId: 'config_set_ticket_log_channel' },
                { label: 'Imagem do Painel', key: 'ticket_panel_image_url', type: 'image', buttonId: 'config_set_ticket_image' },
            ]
        },
        ponto: {
            title: '🕒 Configurações de Bate-Ponto',
            settings: [
                { label: 'Canal da Vitrine', key: 'ponto_vitrine_channel_id', type: 'channel', buttonId: 'config_set_ponto_vitrine_channel' },
                { label: 'Canal de Logs', key: 'ponto_log_channel_id', type: 'channel', buttonId: 'config_set_ponto_log_channel' },
                { label: 'Cargo "Em Serviço"', key: 'ponto_role_id', type: 'role', buttonId: 'config_set_ponto_role' },
                { label: 'Categoria dos Canais', key: 'ponto_temp_category_id', type: 'channel', buttonId: 'config_set_ponto_category' },
                { label: 'Prefixo de Nickname', key: 'ponto_nickname_prefix', type: 'tag', buttonId: 'config_set_ponto_nickname' },
            ]
        }
    };

    const currentCategory = categoryMappings[category];

    if (currentCategory) {
        embed.setTitle(currentCategory.title);
        
        const fields = [];
        let buttonRow = new ActionRowBuilder();

        for (const setting of currentCategory.settings) {
            // Adiciona a informação como um campo "inline" para criar colunas
            fields.push({
                name: `**${setting.label}**`,
                value: formatStatus(settings, setting.key, setting.type),
                inline: true
            });

            // Adiciona um botão para cada configuração
            buttonRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(setting.buttonId)
                    .setLabel(`Alterar ${setting.label}`)
                    .setStyle(ButtonStyle.Primary)
            );

            // O Discord só permite 5 botões por linha. Se atingir o limite, cria uma nova linha.
            if (buttonRow.components.length === 5) {
                components.push(buttonRow);
                buttonRow = new ActionRowBuilder();
            }
        }
        
        // Adiciona a linha de botões se ela tiver algum botão
        if (buttonRow.components.length > 0) {
            components.push(buttonRow);
        }

        // Adiciona um campo em branco se o número de campos for ímpar, para manter o alinhamento do grid
        if (fields.length % 3 !== 0) {
             fields.push({ name: '\u200B', value: '\u200B', inline: true });
        }

        embed.setFields(fields);
    }
    
    // Adiciona o botão de Voltar no final
    components.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('config_menu:main').setLabel('⬅️ Voltar').setStyle(ButtonStyle.Secondary)
        )
    );

    return { embeds: [embed], components, ephemeral: true };
}

module.exports = { 
    getConfigDashboardPayload,
    getCategoryPayload,
};
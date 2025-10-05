// Ficheiro: views/config_views.js (VERSÃO CORRIGIDA)

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

// Gera a TELA PRINCIPAL com as categorias
async function getConfigDashboardPayload(guild, userId) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚙️ Painel de Configuração')
        .setDescription('Selecione uma categoria abaixo para gerir as suas configurações.')
        .setTimestamp();
        
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('config_menu:registration').setLabel('📝 Registos').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('config_menu:absence').setLabel('🏝️ Ausências').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('config_menu:ticket').setLabel('🎫 Tickets').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('config_menu:ponto').setLabel('🕒 Bate-Ponto').setStyle(ButtonStyle.Secondary),
        ),
    ];
    
    // Adiciona o botão de painel do dono se o ID do usuário corresponder
    if (userId === process.env.OWNER_ID) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('dev_panel').setLabel('🔒 Painel do Dono').setStyle(ButtonStyle.Danger)
            )
        );
    }
    
    return { embeds: [embed], components: rows, ephemeral: true };
}

// Gera a TELA SECUNDÁRIA para uma categoria específica
async function getCategoryPayload(guild, category) {
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guild.id]);
    
    const embed = new EmbedBuilder()
        .setColor('#2c9e8d')
        .setTimestamp();
        
    const components = [];

    switch (category) {
        case 'registration':
            embed.setTitle('📝 Configurações de Registo');
            embed.addFields(
                { name: 'Canal de Logs', value: formatStatus(settings, 'registration_channel_id', 'channel'), inline: true },
                { name: 'Cargo de Membro', value: formatStatus(settings, 'registered_role_id', 'role'), inline: true },
                { name: 'TAG de Nickname', value: formatStatus(settings, 'nickname_tag', 'tag'), inline: true },
                { name: 'Imagem do Painel', value: formatStatus(settings, 'registration_panel_image_url', 'image'), inline: true },
            );
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config_set_registration_channel').setLabel('Canal Logs').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config_set_registered_role').setLabel('Cargo Membro').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config_set_nickname_tag').setLabel('TAG Nick').setStyle(ButtonStyle.Primary),
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config_set_panel_image').setLabel('Imagem Painel').setStyle(ButtonStyle.Primary),
                )
            );
            break;

        case 'absence':
            embed.setTitle('🏝️ Configurações de Ausência');
            embed.addFields(
                { name: 'Canal de Logs', value: formatStatus(settings, 'absence_channel_id', 'channel'), inline: true },
                { name: 'Cargo de Ausente', value: formatStatus(settings, 'absence_role_id', 'role'), inline: true },
                { name: 'Imagem do Painel', value: formatStatus(settings, 'absence_panel_image_url', 'image'), inline: true },
            );
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config_set_absence_channel').setLabel('Canal Logs').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config_set_absence_role').setLabel('Cargo Ausente').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config_set_absence_image').setLabel('Imagem Painel').setStyle(ButtonStyle.Primary),
                )
            );
            break;

        case 'ticket':
            embed.setTitle('🎫 Configurações de Ticket');
            embed.addFields(
                { name: 'Categoria', value: formatStatus(settings, 'ticket_category_id', 'channel'), inline: true },
                { name: 'Cargo de Suporte', value: formatStatus(settings, 'support_role_id', 'role'), inline: true },
                { name: 'Canal de Logs', value: formatStatus(settings, 'ticket_log_channel_id', 'channel'), inline: true },
                { name: 'Imagem do Painel', value: formatStatus(settings, 'ticket_panel_image_url', 'image'), inline: true },
            );
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config_set_ticket_category').setLabel('Categoria').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config_set_support_role').setLabel('Cargo Suporte').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config_set_ticket_log_channel').setLabel('Canal Logs').setStyle(ButtonStyle.Primary),
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config_set_ticket_image').setLabel('Imagem Painel').setStyle(ButtonStyle.Primary),
                )
            );
            break;

        case 'ponto':
            embed.setTitle('🕒 Configurações de Bate-Ponto');
            embed.addFields(
                { name: 'Canal da Vitrine', value: formatStatus(settings, 'ponto_vitrine_channel_id', 'channel'), inline: true },
                { name: 'Canal de Logs', value: formatStatus(settings, 'ponto_log_channel_id', 'channel'), inline: true },
                { name: 'Cargo "Em Serviço"', value: formatStatus(settings, 'ponto_role_id', 'role'), inline: true },
                { name: 'Categoria dos Canais Temp.', value: formatStatus(settings, 'ponto_temp_category_id', 'channel'), inline: true },
                { name: 'Prefixo de Nickname', value: formatStatus(settings, 'ponto_nickname_prefix', 'tag'), inline: true },
            );
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config_set_ponto_vitrine_channel').setLabel('Canal Vitrine').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config_set_ponto_log_channel').setLabel('Canal Logs').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config_set_ponto_role').setLabel('Cargo Serviço').setStyle(ButtonStyle.Primary),
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config_set_ponto_category').setLabel('Categoria Canais').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config_set_ponto_nickname').setLabel('Prefixo Nick').setStyle(ButtonStyle.Primary),
                )
            );
            break;
    }

    // Adiciona o botão de voltar em todas as categorias
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
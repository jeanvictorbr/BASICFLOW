const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

/**
 * Helper para formatar o status de uma configuração para exibição.
 * @param {*} value O valor vindo do banco de dados.
 * @param {'channel'|'role'|'category'|'image'|'text'} type O tipo de valor.
 * @returns {string} O valor formatado para exibição.
 */
const formatValue = (value, type) => {
    if (!value) return '❌ **Não definido**';
    switch (type) {
        case 'channel': return `✅ <#${value}>`;
        case 'category': return `✅ <#${value}>`; // Categorias são canais
        case 'role': return `✅ <@&${value}>`;
        case 'image': return `✔️ [**Ver Imagem**](${value})`;
        default: return `✅ **Definido**`;
    }
};

/**
 * Gera o painel de navegação principal.
 */
function getConfigDashboardPayload() {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('⚙️ Painel de Configurações do BasicFlow')
        .setDescription('Navegue pelos módulos abaixo para gerenciar o bot neste servidor.');

    const components = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config:menu:registration').setLabel('Registros').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
        new ButtonBuilder().setCustomId('config:menu:absence').setLabel('Ausências').setStyle(ButtonStyle.Secondary).setEmoji('🗓️'),
        new ButtonBuilder().setCustomId('config:menu:tickets').setLabel('Tickets').setStyle(ButtonStyle.Secondary).setEmoji('🎫'),
        new ButtonBuilder().setCustomId('config:menu:ponto').setLabel('Ponto').setStyle(ButtonStyle.Secondary).setEmoji('⏰'),
        new ButtonBuilder().setCustomId('config:menu:uniformes').setLabel('Uniformes').setStyle(ButtonStyle.Secondary).setEmoji('👕')
    );
    return { embeds: [embed], components: [components] };
}

/**
 * Gera os painéis de configuração específicos de cada categoria, no estilo da imagem.
 */
function getCategoryConfigPayload(category, settings) {
    const embed = new EmbedBuilder();
    const components = [];

    // Botão de Voltar universal
    const backButton = new ButtonBuilder().setCustomId('config:menu:main').setLabel('Voltar').setStyle(ButtonStyle.Secondary).setEmoji('⬅️');

    switch (category) {
        case 'tickets':
            embed.setColor('#3498DB').setTitle('🎫 Configurações de Ticket');
            embed.addFields(
                { name: 'Categoria', value: formatValue(settings.ticket_category_id, 'category'), inline: false },
                { name: 'Cargo de Suporte', value: formatValue(settings.ticket_staff_role_id, 'role'), inline: false },
                { name: 'Canal de Logs', value: formatValue(settings.ticket_log_channel_id, 'channel'), inline: false },
                { name: 'Imagem do Painel', value: formatValue(settings.ticket_panel_image_url, 'image'), inline: false },
            );
            
            // Botões de alteração
            const ticketSetButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('config:set:ticket_category_id').setLabel('Alterar Categoria').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('config:set:ticket_staff_role_id').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('config:set:ticket_log_channel_id').setLabel('Alterar Logs').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('config:set:ticket_panel_image_url').setLabel('Alterar Imagem').setStyle(ButtonStyle.Primary),
            );
            
            // Botões de ação
            const ticketActionButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('config:publish:ticket').setLabel('Publicar Painel de Ticket').setStyle(ButtonStyle.Success),
                backButton
            );
            
            components.push(ticketSetButtons, ticketActionButtons);
            break;

        // Adicione aqui outros painéis (registration, ponto, etc.) seguindo o mesmo modelo.
        // Exemplo para Ponto:
        case 'ponto':
            embed.setColor('#E67E22').setTitle('⏰ Configurações de Ponto');
            embed.addFields(
                { name: 'Cargo em Serviço', value: formatValue(settings.ponto_role_id, 'role'), inline: false },
                { name: 'Canal do Monitor', value: formatValue(settings.ponto_monitor_channel_id, 'channel'), inline: false },
                // Adicione mais campos se necessário
            );

            const pontoSetButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('config:set:ponto_role_id').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('config:set:ponto_monitor_channel_id').setLabel('Alterar Canal Monitor').setStyle(ButtonStyle.Primary),
            );
            
            const pontoActionButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('config:publish:ponto').setLabel('Publicar Painel de Ponto').setStyle(ButtonStyle.Success),
                 backButton
            );
            components.push(pontoSetButtons, pontoActionButtons);
            break;
            
        default:
            embed.setColor('#E74C3C').setTitle('🚧 Módulo em Construção');
            embed.setDescription(`A interface de configuração para \`${category}\` ainda não foi criada.`);
            const backRow = new ActionRowBuilder().addComponents(backButton);
            components.push(backRow);
    }
    
    return { content: '', embeds: [embed], components };
}

module.exports = { getConfigDashboardPayload, getCategoryConfigPayload };
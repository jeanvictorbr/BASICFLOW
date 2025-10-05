const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

/**
 * Helper para formatar o status de uma configuração para exibição.
 * @param {*} value O valor vindo do banco de dados.
 * @param {'channel'|'role'|'category'|'image'} type O tipo de valor.
 * @returns {string} O valor formatado para exibição.
 */
const formatValue = (value, type) => {
    if (!value) return '❌ **Não definido**';
    switch (type) {
        case 'channel':
        case 'category': // Categorias são um tipo de canal
            return `✅ <#${value}>`;
        case 'role':
            return `✅ <@&${value}>`;
        case 'image':
            return `✔️ [**Ver Imagem**](${value})`;
        default:
            return `✅ **Definido**`;
    }
};

/**
 * Gera o painel de navegação principal.
 * @returns {import('discord.js').InteractionReplyOptions}
 */
function getConfigDashboardPayload() {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('⚙️ Painel de Configurações do BasicFlow')
        .setDescription('Navegue pelos módulos abaixo para gerenciar o bot neste servidor de forma intuitiva e visual.');

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
 * Gera os painéis de configuração específicos de cada categoria, no estilo "app".
 * @param {string} category A categoria a ser exibida.
 * @param {object} settings O objeto com as configurações do servidor.
 * @returns {import('discord.js').InteractionUpdateOptions}
 */
function getCategoryConfigPayload(category, settings) {
    const embed = new EmbedBuilder();
    const components = [];

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
            
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config:set:ticket_category_id').setLabel('Alterar Categoria').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config:set:ticket_staff_role_id').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config:set:ticket_log_channel_id').setLabel('Alterar Logs').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config:set:ticket_panel_image_url').setLabel('Alterar Imagem').setStyle(ButtonStyle.Primary),
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config:publish:ticket').setLabel('Publicar Painel de Ticket').setStyle(ButtonStyle.Success),
                    backButton
                )
            );
            break;

        case 'ponto':
            embed.setColor('#E67E22').setTitle('⏰ Configurações de Ponto');
            embed.addFields(
                { name: 'Cargo em Serviço', value: formatValue(settings.ponto_role_id, 'role'), inline: false },
                { name: 'Canal do Monitor', value: formatValue(settings.ponto_monitor_channel_id, 'channel'), inline: false },
                { name: 'Imagem do Painel', value: formatValue(settings.ponto_panel_image_url, 'image'), inline: false },
            );

            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config:set:ponto_role_id').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config:set:ponto_monitor_channel_id').setLabel('Alterar Monitor').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config:set:ponto_panel_image_url').setLabel('Alterar Imagem').setStyle(ButtonStyle.Primary),
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config:publish:ponto').setLabel('Publicar Painel de Ponto').setStyle(ButtonStyle.Success),
                    backButton
                )
            );
            break;
            
        case 'registration':
            embed.setColor('#1ABC9C').setTitle('📝 Configurações de Registro');
            embed.addFields(
                { name: 'Cargo de Staff (Aprova/Reprova)', value: formatValue(settings.registration_staff_role_id, 'role'), inline: false },
                { name: 'Cargo de Membro Aprovado', value: formatValue(settings.registration_approved_role_id, 'role'), inline: false },
                { name: 'Canal de Logs', value: formatValue(settings.registration_log_channel_id, 'channel'), inline: false },
                { name: 'Imagem do Painel', value: formatValue(settings.registration_panel_image_url, 'image'), inline: false },
            );

            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config:set:registration_staff_role_id').setLabel('Alterar Staff').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config:set:registration_approved_role_id').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config:set:registration_log_channel_id').setLabel('Alterar Logs').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config:set:registration_panel_image_url').setLabel('Alterar Imagem').setStyle(ButtonStyle.Primary),
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config:publish:registration').setLabel('Publicar Painel de Registro').setStyle(ButtonStyle.Success),
                    backButton
                )
            );
            break;

        case 'uniformes':
            embed.setColor('#95A5A6').setTitle('👕 Configurações de Uniformes');
            embed.setDescription('Adicione ou remova os uniformes que os membros poderão visualizar através do painel público.');
            
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config:set:uniform_add').setLabel('Adicionar Uniforme').setStyle(ButtonStyle.Success).setEmoji('➕'),
                    new ButtonBuilder().setCustomId('config:set:uniform_remove').setLabel('Remover Uniforme').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
                    backButton
                )
            );
            break;
            
        default:
            embed.setColor('#E74C3C').setTitle('🚧 Módulo em Construção');
            embed.setDescription(`A interface de configuração para \`${category}\` ainda não foi criada.`);
            components.push(new ActionRowBuilder().addComponents(backButton));
    }
    
    return { content: '', embeds: [embed], components };
}

module.exports = { getConfigDashboardPayload, getCategoryConfigPayload };
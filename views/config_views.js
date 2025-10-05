const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

/**
 * Helper para formatar o status de uma configuração para exibição.
 * @param {*} value O valor vindo do banco de dados.
 * @param {'channel'|'role'|'category'|'image'|'text_input'|'pattern'} type O tipo de valor.
 * @returns {string} O valor formatado para exibição.
 */
const formatValue = (value, type) => {
    if (!value) return '❌ **Não definido**';
    switch (type) {
        case 'channel':
        case 'category':
            return `✅ <#${value}>`;
        case 'role':
            return `✅ <@&${value}>`;
        case 'image':
            return `✔️ [**Ver Imagem**](${value})`;
        case 'text_input':
        case 'pattern': // Para padrões de nome/ID
            return `\`\`\`${value}\`\`\``; // Mostra em bloco de código
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
 * Gera os painéis de configuração específicos de cada categoria, no estilo "app" da imagem.
 * @param {string} category A categoria a ser exibida.
 * @param {object} settings O objeto com as configurações do servidor.
 * @returns {import('discord.js').InteractionUpdateOptions}
 */
function getCategoryConfigPayload(category, settings) {
    const embed = new EmbedBuilder();
    const components = [];

    const backButton = new ButtonBuilder().setCustomId('config:menu:main').setLabel('Voltar').setStyle(ButtonStyle.Secondary).setEmoji('⬅️');

    switch (category) {
        case 'registration':
            embed.setColor('#1ABC9C').setTitle('📝 Sistema de Registro');
            // Nota: O Discord.js v14+ não permite botões DENTRO de fields.
            // A imagem simula isso com a formatação do field e botões em ActionRows separadas.
            embed.addFields(
                { 
                    name: '# Canal de Aprovação Atual', 
                    value: `Configure qual será o canal onde serão enviadas as solicitações de registro\n${formatValue(settings.registration_log_channel_id, 'channel')}`, 
                    inline: false 
                },
                { 
                    name: '🪖 Cargo de Aprovador Atual', 
                    value: `Configure qual será o cargo responsável por aprovar as solicitações de registro\n${formatValue(settings.registration_staff_role_id, 'role')}`, 
                    inline: false 
                },
                { 
                    name: '😀 Cargo ao ser Aprovado Atual', 
                    value: `Configure qual o usuário receberá ao ser aprovado\n${formatValue(settings.registration_approved_role_id, 'role')}`, 
                    inline: false 
                },
                { 
                    name: '🆔 Padrão de nome', 
                    value: `Configure como vai ser o padrão dos nomes. Use {nome} para os nomes e {id} para os ids.\n${formatValue(settings.registration_name_pattern || '{nome} ({id})', 'pattern')}`, 
                    inline: false 
                },
                { 
                    name: '💬 Mensagem Padrão Atual', 
                    value: `Configure a mensagem padrão na mensagem de registro\n${formatValue(settings.registration_welcome_message || 'Clique no botão abaixo para registrar-se.', 'text_input')}`, 
                    inline: false 
                }
            );

            // ActionRows para os botões "Editar" correspondentes aos fields
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config:set:registration_log_channel_id').setLabel('Editar').setStyle(ButtonStyle.Primary).setEmoji('⚙️'),
                    new ButtonBuilder().setCustomId('config:set:registration_staff_role_id').setLabel('Editar').setStyle(ButtonStyle.Primary).setEmoji('⚙️'),
                    new ButtonBuilder().setCustomId('config:set:registration_approved_role_id').setLabel('Editar').setStyle(ButtonStyle.Primary).setEmoji('⚙️')
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config:set:registration_name_pattern').setLabel('Editar').setStyle(ButtonStyle.Primary).setEmoji('⚙️'),
                    new ButtonBuilder().setCustomId('config:set:registration_welcome_message').setLabel('Editar').setStyle(ButtonStyle.Primary).setEmoji('⚙️')
                )
            );

            // Botões de Ação e Voltar
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config:toggle:registration_enabled').setLabel(settings.registration_enabled ? 'Desativar Registro' : 'Ativar Registro').setStyle(settings.registration_enabled ? ButtonStyle.Danger : ButtonStyle.Success).setEmoji(settings.registration_enabled ? '🛑' : '▶️'),
                    new ButtonBuilder().setCustomId('config:publish:registration').setLabel('Publicar Painel').setStyle(ButtonStyle.Success),
                    backButton
                )
            );
            
            embed.setFooter({ text: 'Em caso de dúvidas, assista os tutoriais.' });
            break;

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
            
        case 'absence': // Novo módulo: Ausências
            embed.setColor('#F1C40F').setTitle('🗓️ Configurações de Ausências');
            embed.setDescription('Gerencie as configurações para o sistema de notificação de ausências.');
            embed.addFields(
                { name: 'Canal de Notificação de Ausência', value: formatValue(settings.absence_notification_channel_id, 'channel'), inline: false },
                { name: 'Cargo de Staff (Aprova/Reprova Ausência)', value: formatValue(settings.absence_staff_role_id, 'role'), inline: false },
                { name: 'Cargo de Ausente', value: formatValue(settings.absence_role_id, 'role'), inline: false },
            );
            
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config:set:absence_notification_channel_id').setLabel('Editar Canal Notificação').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config:set:absence_staff_role_id').setLabel('Editar Cargo Staff').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config:set:absence_role_id').setLabel('Editar Cargo Ausente').setStyle(ButtonStyle.Primary),
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config:publish:absence').setLabel('Publicar Painel de Ausências').setStyle(ButtonStyle.Success),
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
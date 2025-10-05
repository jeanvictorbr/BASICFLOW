const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// Helper para formatar valores e indicar se estão configurados
const formatValue = (value, type) => {
    if (!value) return '❌ Não definido';
    if (type === 'channel') return `<#${value}>`;
    if (type === 'role') return `<@&${value}>`;
    return `✅ Definido`;
};

// ===================================================================
// 🎨 NOVO PAINEL PRINCIPAL
// ===================================================================
function getConfigDashboardPayload(settings) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚙️ Painel de Configurações do BasicFlow')
        .setDescription('Selecione um módulo abaixo para visualizar e gerenciar suas configurações de forma intuitiva.');

    // Adiciona um campo para cada módulo, mostrando um status rápido
    embed.addFields(
        { name: '📝 Registros', value: 'Sistema de aprovação de novos membros.', inline: true },
        { name: '🗓️ Ausências', value: 'Gerenciamento de períodos de ausência.', inline: true },
        { name: '🎫 Tickets', value: 'Criação de canais de suporte privado.', inline: true },
        { name: '⏰ Ponto', value: 'Registro de entrada e saída de serviço.', inline: true },
        { name: '👕 Uniformes', value: 'Catálogo interativo de uniformes.', inline: true },
        { name: 'Outros', value: 'Configurações gerais do bot.', inline: true },
    );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_menu:registration').setLabel('Registros').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
        new ButtonBuilder().setCustomId('config_menu:absence').setLabel('Ausências').setStyle(ButtonStyle.Secondary).setEmoji('🗓️'),
        new ButtonBuilder().setCustomId('config_menu:tickets').setLabel('Tickets').setStyle(ButtonStyle.Secondary).setEmoji('🎫'),
        new ButtonBuilder().setCustomId('config_menu:ponto').setLabel('Ponto').setStyle(ButtonStyle.Secondary).setEmoji('⏰'),
        new ButtonBuilder().setCustomId('config_menu:uniformes').setLabel('Uniformes').setStyle(ButtonStyle.Secondary).setEmoji('👕')
    );

    return { embeds: [embed], components: [row] };
}


// ===================================================================
// 🎨 NOVOS PAINÉIS DE CATEGORIA
// ===================================================================
function getCategoryConfigPayload(category, settings) {
    const embed = new EmbedBuilder().setColor('#2ECC71');
    const components = [];

    switch (category) {
        case 'registration':
            embed.setTitle('📝 Configurações de Registro');
            embed.setDescription(
                `**Canal de Logs:** ${formatValue(settings.registration_log_channel_id, 'channel')}\n` +
                `**Cargo de Staff:** ${formatValue(settings.registration_staff_role_id, 'role')}\n` +
                `**Cargo Aprovado:** ${formatValue(settings.registration_approved_role_id, 'role')}`
            );
            // Botões de ação para este módulo
            const regButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('config_set:reg_log_channel').setLabel('Alterar Log').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('config_set:reg_approved_role').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary)
            );
            components.push(regButtons);
            break;

        // Adicionar outros casos aqui (absence, tickets, etc.)
        // Exemplo para Ponto:
        case 'ponto':
             embed.setTitle('⏰ Configurações de Ponto');
             embed.setDescription(
                `**Canal do Painel:** ${formatValue(settings.ponto_channel_id, 'channel')}\n` +
                `**Cargo em Serviço:** ${formatValue(settings.ponto_role_id, 'role')}\n` +
                `**Canal do Monitor:** ${formatValue(settings.ponto_monitor_channel_id, 'channel')}`
             );
             const pontoButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('config_set:ponto_role').setLabel('Alterar Cargo').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('config_set:ponto_monitor').setLabel('Alterar Monitor').setStyle(ButtonStyle.Primary)
            );
            components.push(pontoButtons);
            break;
            
        default:
            embed.setTitle('Módulo em Construção').setColor('#E67E22');
            embed.setDescription(`As configurações para o módulo \`${category}\` ainda não foram implementadas.`);
    }

    // Botão universal para voltar
    const backButtonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('config_menu:main')
            .setLabel('⬅️ Voltar ao Início')
            .setStyle(ButtonStyle.Secondary)
    );
    components.push(backButtonRow);

    return { embeds: [embed], components };
}

module.exports = { getConfigDashboardPayload, getCategoryConfigPayload };
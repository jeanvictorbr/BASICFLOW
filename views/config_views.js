const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

// Helper para formatar valores
const formatValue = (value, type) => {
    if (!value) return '`Não definido`';
    switch (type) {
        case 'channel': return `<#${value}>`;
        case 'role': return `<@&${value}>`;
        default: return `\`${value}\``;
    }
};

function getConfigDashboardPayload(settings) {
    // Usando a nova API de Componentes V2 (Layout Components)
    // Nota: A API exata para "TextDisplay" e "Section" ainda não foi
    // finalizada em discord.js. O código abaixo usa botões e texto de mensagem
    // para emular o comportamento desejado até que a API esteja estável.
    // A lógica principal de atualização de componentes permanece a mesma.

    const content = "## ⚙️ Painel de Configurações do BasicFlow\nSelecione um módulo para gerenciar suas configurações.";

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('config_menu:registration')
                .setLabel('Registros')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📝'),
            new ButtonBuilder()
                .setCustomId('config_menu:absence')
                .setLabel('Ausências')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗓️'),
            new ButtonBuilder()
                .setCustomId('config_menu:tickets')
                .setLabel('Tickets')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🎫')
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
             new ButtonBuilder()
                .setCustomId('config_menu:ponto')
                .setLabel('Ponto')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⏰'),
            new ButtonBuilder()
                .setCustomId('config_menu:uniformes')
                .setLabel('Uniformes')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('👕')
        );

    return { content, components: [row1, row2], ephemeral: true };
}

function getCategoryConfigPayload(category, settings) {
    let content = `### Configurações do Módulo: ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
    const components = [];

    // Constrói dinamicamente os botões e texto para cada categoria
    switch (category) {
        case 'registration':
            content += `**Canal de Logs:** ${formatValue(settings.registration_log_channel_id, 'channel')}\n`;
            content += `**Cargo de Staff:** ${formatValue(settings.registration_staff_role_id, 'role')}\n`;
            content += `**Cargo Aprovado:** ${formatValue(settings.registration_approved_role_id, 'role')}\n`;
            // Adicione mais...

            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('config_set:reg_log_channel').setLabel('Alterar Canal de Log').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config_set:reg_approved_role').setLabel('Alterar Cargo Aprovado').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('config_set:reg_panel_image').setLabel('Alterar Imagem do Painel').setStyle(ButtonStyle.Primary)
                )
            );
            break;
        // Adicionar casos para 'absence', 'tickets', 'ponto', 'uniformes'
        default:
            content = "Módulo não encontrado.";
    }

    // Botão de voltar
    const backButtonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('config_menu:main')
            .setLabel('⬅️ Voltar ao Início')
            .setStyle(ButtonStyle.Secondary)
    );
    components.push(backButtonRow);

    return { content, components, ephemeral: true };
}


module.exports = { getConfigDashboardPayload, getCategoryConfigPayload };
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function getPontoPanelPayload(user, settings) {
    // Importar DB aqui para evitar dependência cíclica
    const db = require('../database/db');

    const content = "## ⏰ Sistema de Ponto\nUtilize o botão abaixo para registrar sua entrada ou saída do serviço.";
    
    // Verifica se o usuário já tem um registro de ponto aberto
    const lastRecord = await db.get(
        'SELECT * FROM ponto_records WHERE user_id = $1 AND guild_id = $2 AND clock_out_time IS NULL ORDER BY clock_in_time DESC LIMIT 1',
        [user.id, user.guild.id]
    );

    let button;
    if (lastRecord) {
        // Usuário está em ponto
        button = new ButtonBuilder()
            .setCustomId('ponto:clock_out')
            .setLabel('Registrar Saída')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('✖️');
    } else {
        // Usuário não está em ponto
        button = new ButtonBuilder()
            .setCustomId('ponto:clock_in')
            .setLabel('Registrar Entrada')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⏰');
    }
    
    const components = [new ActionRowBuilder().addComponents(button)];
    
    // Aqui você adicionaria os componentes V2 como MediaGallery quando disponíveis
    // Ex: if (settings.ponto_panel_image_url) { payload.media = ... }

    return { content, components };
}

module.exports = { getPontoPanelPayload };
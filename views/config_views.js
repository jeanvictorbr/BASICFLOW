const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db.js');

// Função para formatar o status de uma configuração (sem alterações)
const formatSetting = (settings, key, type) => {
    const id = settings?.[key];
    if (id) {
        return `✅ ${type === 'role' ? `<@&${id}>` : `<#${id}>`}`;
    }
    return '❌ `Não definido`';
};

// Monta o painel de configuração principal
async function getConfigDashboardPayload(guild) {
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guild.id]);

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('⚙️ Painel de Configuração do BasicFlow')
        .setDescription('Use os botões abaixo para configurar as funcionalidades do bot neste servidor.')
        .addFields(
            { name: 'Canal de Aprovação (Registos)', value: formatSetting(settings, 'registration_channel_id', 'channel'), inline: true },
            { name: 'Canal de Ausências', value: formatSetting(settings, 'absence_channel_id', 'channel'), inline: true },
            { name: 'Cargo de Membro Registado', value: formatSetting(settings, 'registered_role_id', 'role'), inline: true },
            { name: 'Cargo de Membro Ausente', value: formatSetting(settings, 'absence_role_id', 'role'), inline: true },
        )
        .setFooter({ text: 'Powered by BasicFlow • Conheça as versões completas: Police Flow & Faction Flow!' });
    
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_set_registration_channel').setLabel('Canal de Registos').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_set_absence_channel').setLabel('Canal de Ausências').setStyle(ButtonStyle.Secondary)
    );
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_set_registered_role').setLabel('Cargo de Membro').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_set_absence_role').setLabel('Cargo de Ausente').setStyle(ButtonStyle.Secondary)
    );

    // NOVA LINHA DE BOTÕES PARA PUBLICAR OS PAINÉIS
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('config_publish_registration_panel')
            .setLabel('Publicar Painel de Registo')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📝')
    );

    return { embeds: [embed], components: [row1, row2, row3], ephemeral: true };
}

module.exports = {
    getConfigDashboardPayload,
};


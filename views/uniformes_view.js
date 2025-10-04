// Ficheiro: views/uniformes_view.js (VERSÃO CORRIGIDA)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../database/db');

async function getDashboardStats(guildId) {
    const itemCountResult = await db.query('SELECT COUNT(*) FROM vestuario_items WHERE guild_id = $1', [guildId]);
    const configResult = await db.query('SELECT showcase_channel_id, storage_channel_id FROM vestuario_configs WHERE guild_id = $1', [guildId]);
    
    const itemCount = itemCountResult.rows[0]?.count || '0';
    const channelId = configResult.rows[0]?.showcase_channel_id;
    const storageChannelId = configResult.rows[0]?.storage_channel_id;

    return { itemCount, channelId, storageChannelId };
}

async function showConfigPanel(interaction) {
    // Se a interação original já foi respondida, usamos editReply, senão, reply.
    const replyMethod = interaction.deferred || interaction.replied ? 'editReply' : 'reply';

    const stats = await getDashboardStats(interaction.guild.id);
    const channelMention = stats.channelId ? `<#${stats.channelId}>` : '`Nenhum`';
    const storageMention = stats.storageChannelId ? `<#${stats.storageChannelId}> (Privado)` : '`Nenhum`';

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('👔 Painel de Gestão de Uniformes')
        .setDescription('Utilize os botões abaixo para gerenciar os uniformes da sua organização.')
        .addFields(
            { name: 'Uniformes Cadastrados', value: stats.itemCount, inline: true },
            { name: 'Canal da Vitrine', value: channelMention, inline: true },
            { name: 'Canal de Storage', value: storageMention, inline: true }
        );

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('uniformes_add_item').setLabel('Adicionar Uniforme').setStyle(ButtonStyle.Success).setEmoji('➕'),
            new ButtonBuilder().setCustomId('uniformes_edit_remove_item').setLabel('Editar/Remover').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
            new ButtonBuilder().setCustomId('uniformes_set_channel').setLabel('Definir Canal Vitrine').setStyle(ButtonStyle.Primary).setEmoji('📢'),
            new ButtonBuilder().setCustomId('uniformes_set_storage_channel').setLabel('Definir Canal Storage').setStyle(ButtonStyle.Danger).setEmoji('📦')
        );
    
    await interaction[replyMethod]({ embeds: [embed], components: [row], ephemeral: true });
}

// *** INÍCIO DA ALTERAÇÃO ***
// A função agora aceita `client` e `guildId` em vez do objeto `interaction` completo.
async function updateShowcase(client, guildId) {
// *** FIM DA ALTERAÇÃO ***
    const configRes = await db.query('SELECT * FROM vestuario_configs WHERE guild_id = $1', [guildId]);
    if (configRes.rowCount === 0) return;

    const { showcase_channel_id, showcase_message_id } = configRes.rows[0];
    if (!showcase_channel_id) return;

    const channel = await client.channels.fetch(showcase_channel_id).catch(() => null);
    if (!channel) {
        await db.query('DELETE FROM vestuario_configs WHERE guild_id = $1', [guildId]);
        return;
    }

    const itemsRes = await db.query('SELECT id, nome FROM vestuario_items WHERE guild_id = $1 ORDER BY nome', [guildId]);
    const items = itemsRes.rows;

    const embed = new EmbedBuilder()
        .setColor('#2c3e50')
        .setTitle('👕 Vestiário da Organização')
        .setDescription('Selecione um uniforme no menu abaixo para ver a imagem e copiar os códigos.')
        .setFooter({ text: 'Aguardando seleção de uniforme...' });

    const components = [];

    if (items.length > 0) {
        const itemOptions = items.map(item => ({
            label: item.nome,
            value: `uniformes_item_${item.id}`,
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('uniformes_showcase_select')
            .setPlaceholder('Selecione um uniforme...')
            .addOptions(itemOptions.slice(0, 25));

        components.push(new ActionRowBuilder().addComponents(selectMenu));
    } else {
        embed.setDescription('Nenhum uniforme foi configurado ainda. Use `/uniformesconfig` para começar.');
    }

    try {
        let message = showcase_message_id ? await channel.messages.fetch(showcase_message_id).catch(() => null) : null;

        if (message) {
            await message.edit({ embeds: [embed], components });
        } else {
            const newMessage = await channel.send({ embeds: [embed], components });
            await db.query('UPDATE vestuario_configs SET showcase_message_id = $1 WHERE guild_id = $2', [newMessage.id, guildId]);
        }
    } catch (error) {
        console.error("Erro ao atualizar a vitrine:", error);
    }
}

module.exports = { showConfigPanel, updateShowcase };
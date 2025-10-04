const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const pool = require('../database/db');

async function getDashboardStats(guildId) {
    const categoryCountResult = await pool.query('SELECT COUNT(*) FROM vestuario_categorias WHERE guild_id = $1', [guildId]);
    const itemCountResult = await pool.query('SELECT COUNT(*) FROM vestuario_items WHERE guild_id = $1', [guildId]);
    const configResult = await pool.query('SELECT showcase_channel_id FROM vestuario_configs WHERE guild_id = $1', [guildId]);

    const categoryCount = categoryCountResult.rows[0]?.count || '0';
    const itemCount = itemCountResult.rows[0]?.count || '0';
    const channelId = configResult.rows[0]?.showcase_channel_id;

    return { categoryCount, itemCount, channelId };
}

async function showConfigPanel(interaction) {
    const stats = await getDashboardStats(interaction.guild.id);
    const channelMention = stats.channelId ? `<#${stats.channelId}>` : 'Nenhum canal definido';

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('👔 Painel de Gestão do Vestiário')
        .setDescription('Utilize os botões abaixo para configurar as categorias e uniformes da sua organização.')
        .addFields(
            { name: 'Categorias Criadas', value: stats.categoryCount, inline: true },
            { name: 'Uniformes Cadastrados', value: stats.itemCount, inline: true },
            { name: 'Canal da Vitrine', value: channelMention, inline: true }
        );

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('uniformes_manage_categories').setLabel('Gerenciar Categorias').setStyle(ButtonStyle.Primary).setEmoji('📚'), // EMOJI CORRIGIDO
            new ButtonBuilder().setCustomId('uniformes_add_item').setLabel('Adicionar Uniforme').setStyle(ButtonStyle.Success).setEmoji('➕'),      // EMOJI CORRIGIDO
            new ButtonBuilder().setCustomId('uniformes_edit_remove_item').setLabel('Editar/Remover').setStyle(ButtonStyle.Secondary).setEmoji('📝'), // EMOJI CORRIGIDO
            new ButtonBuilder().setCustomId('uniformes_set_channel').setLabel('Definir Canal').setStyle(ButtonStyle.Danger).setEmoji('📢')
        );

    // Verifica se a interação já foi respondida
    if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [embed], components: [row], ephemeral: true });
    } else {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
}

async function updateShowcase(interaction) {
    const guildId = interaction.guild.id;
    const client = interaction.client;

    const configRes = await pool.query('SELECT * FROM vestuario_configs WHERE guild_id = $1', [guildId]);
    if (configRes.rowCount === 0) return;

    const { showcase_channel_id, showcase_message_id } = configRes.rows[0];
    if (!showcase_channel_id) return;

    const channel = await client.channels.fetch(showcase_channel_id).catch(() => null);
    if (!channel) {
        await pool.query('DELETE FROM vestuario_configs WHERE guild_id = $1', [guildId]);
        return;
    }

    const categoriesRes = await pool.query('SELECT nome FROM vestuario_categorias WHERE guild_id = $1 ORDER BY nome', [guildId]);
    const categories = categoriesRes.rows;

    const embed = new EmbedBuilder()
        .setColor('#2c3e50')
        .setTitle('👕 Vestiário da Organização')
        .setDescription('Selecione uma categoria abaixo para visualizar os uniformes disponíveis.')
        .setFooter({ text: 'Selecione uma categoria para começar.' });

    const components = [];

    if (categories.length > 0) {
        const categoryOptions = categories.map(cat => ({
            label: cat.nome,
            value: `uniformes_cat_${cat.nome.replace(/ /g, '_')}`,
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('uniformes_showcase_category_select')
            .setPlaceholder('Selecione uma categoria...')
            .addOptions(categoryOptions);

        components.push(new ActionRowBuilder().addComponents(selectMenu));
    } else {
        embed.setDescription('Nenhuma categoria de uniforme foi configurada ainda. Use `/uniformesconfig` para começar.');
    }

    try {
        if (showcase_message_id) {
            const message = await channel.messages.fetch(showcase_message_id).catch(() => null);
            if (message) {
                await message.edit({ embeds: [embed], components });
                return;
            }
        }
        
        const newMessage = await channel.send({ embeds: [embed], components });
        await pool.query('UPDATE vestuario_configs SET showcase_message_id = $1 WHERE guild_id = $2', [newMessage.id, guildId]);

    } catch (error) {
        if (error.code === 10008) { // Unknown Message
            const newMessage = await channel.send({ embeds: [embed], components });
            await pool.query('UPDATE vestuario_configs SET showcase_message_id = $1 WHERE guild_id = $2', [newMessage.id, guildId]);
        } else {
            console.error("Erro ao atualizar a vitrine:", error);
        }
    }
}

module.exports = { showConfigPanel, updateShowcase, getDashboardStats };
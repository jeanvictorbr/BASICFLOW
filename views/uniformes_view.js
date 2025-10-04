const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const pool = require('../database/db');

async function getDashboardStats(guildId) {
    const categoryCount = (await pool.query('SELECT COUNT(*) FROM vestuario_categorias WHERE guild_id = $1', [guildId])).rows[0].count;
    const itemCount = (await pool.query('SELECT COUNT(*) FROM vestuario_items WHERE guild_id = $1', [guildId])).rows[0].count;
    const config = (await pool.query('SELECT showcase_channel_id FROM vestuario_configs WHERE guild_id = $1', [guildId])).rows[0];
    return {
        categoryCount: categoryCount || '0',
        itemCount: itemCount || '0',
        channelId: config ? config.showcase_channel_id : null
    };
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
            new ButtonBuilder().setCustomId('uniformes_manage_categories').setLabel('Gerenciar Categorias').setStyle(ButtonStyle.Primary).setEmoji('🔵'),
            new ButtonBuilder().setCustomId('uniformes_add_item').setLabel('Adicionar Uniforme').setStyle(ButtonStyle.Success).setEmoji('🟢'),
            new ButtonBuilder().setCustomId('uniformes_edit_remove_item').setLabel('Editar/Remover').setStyle(ButtonStyle.Secondary).setEmoji('⚪️'),
            new ButtonBuilder().setCustomId('uniformes_set_channel').setLabel('Definir Canal').setStyle(ButtonStyle.Danger).setEmoji('📢')
        );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function updateShowcase(interaction) {
    const guildId = interaction.guild.id;
    const client = interaction.client;

    const configRes = await pool.query('SELECT * FROM vestuario_configs WHERE guild_id = $1', [guildId]);
    if (configRes.rowCount === 0) return; // Não faz nada se não houver canal configurado

    const { showcase_channel_id, showcase_message_id } = configRes.rows[0];
    if (!showcase_channel_id) return;

    const channel = await client.channels.fetch(showcase_channel_id).catch(() => null);
    if (!channel) {
        // O canal foi deletado, limpar a config
        await pool.query('DELETE FROM vestuario_configs WHERE guild_id = $1', [guildId]);
        return;
    }

    const categoriesRes = await pool.query('SELECT nome FROM vestuario_categorias WHERE guild_id = $1 ORDER BY nome', [guildId]);
    const categories = categoriesRes.rows;

    const embed = new EmbedBuilder()
        .setColor('#2c3e50')
        .setTitle('👕 Vestiário da Organização')
        .setDescription('Selecione uma categoria abaixo para visualizar os uniformes disponíveis.')
        .setImage('https://i.imgur.com/your/default/image.png'); // Imagem Padrão

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
        embed.setDescription('Nenhuma categoria de uniforme foi configurada ainda.');
    }

    try {
        if (showcase_message_id) {
            const message = await channel.messages.fetch(showcase_message_id).catch(() => null);
            if (message) {
                await message.edit({ embeds: [embed], components });
                return; // Mensagem atualizada com sucesso
            }
        }

        // Se não havia ID ou a mensagem não foi encontrada, envia uma nova
        const newMessage = await channel.send({ embeds: [embed], components });
        await pool.query('UPDATE vestuario_configs SET showcase_message_id = $1 WHERE guild_id = $2', [newMessage.id, guildId]);

    } catch (error) {
        console.error("Erro ao atualizar a vitrine:", error);
    }
}


module.exports = { showConfigPanel, updateShowcase, getDashboardStats };
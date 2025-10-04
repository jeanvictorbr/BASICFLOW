const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const pool = require('../database/db');
const { updateShowcase, showConfigPanel } = require('../views/uniformes_view');

// Funções de lógica interna (não exportadas diretamente)
async function handleButton(interaction) {
    const customId = interaction.customId;

    if (customId === 'uniformes_add_item') {
        const categoriesRes = await pool.query('SELECT nome FROM vestuario_categorias WHERE guild_id = $1', [interaction.guild.id]);
        if (categoriesRes.rowCount === 0) {
            return interaction.reply({ content: '❌ Você precisa criar pelo menos uma categoria antes de adicionar um uniforme.', ephemeral: true });
        }

        const modal = new ModalBuilder().setCustomId('uniformes_add_item_modal').setTitle('Adicionar Novo Uniforme');
        const nameInput = new TextInputBuilder().setCustomId('item_name').setLabel('Nome do Uniforme').setStyle(TextInputStyle.Short).setRequired(true);
        const categoryInput = new TextInputBuilder().setCustomId('item_category').setLabel('Categoria (Nome Exato)').setStyle(TextInputStyle.Short).setRequired(true);
        const imageInput = new TextInputBuilder().setCustomId('item_image').setLabel('URL da Imagem').setStyle(TextInputStyle.Short).setRequired(true);
        const codesInput = new TextInputBuilder().setCustomId('item_codes').setLabel('Códigos do Uniforme').setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(categoryInput),
            new ActionRowBuilder().addComponents(imageInput),
            new ActionRowBuilder().addComponents(codesInput)
        );
        await interaction.showModal(modal);
    } else if (customId.startsWith('uniformes_copy_code_')) {
        const itemId = customId.split('_').pop();
        const itemRes = await pool.query('SELECT nome, codigos FROM vestuario_items WHERE id = $1', [itemId]);
        if(itemRes.rowCount > 0) {
            const item = itemRes.rows[0];
            const embed = new EmbedBuilder()
                .setTitle(`✅ Códigos para: ${item.nome}`)
                .setDescription("```\n" + item.codigos + "\n```")
                .setColor('Green');
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    } else if (customId === 'uniformes_manage_categories') {
        const categoriesRes = await pool.query('SELECT nome FROM vestuario_categorias WHERE guild_id = $1 ORDER BY nome', [interaction.guild.id]);
        const currentCategories = categoriesRes.rows.map(row => row.nome).join('\n');

        const modal = new ModalBuilder()
            .setCustomId('uniformes_category_modal')
            .setTitle('Gerenciar Categorias');

        const textInput = new TextInputBuilder()
            .setCustomId('categories_input')
            .setLabel('Liste as categorias (uma por linha)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Uniforme de Patrulha\nUniforme Tático\nTraje de Gala')
            .setValue(currentCategories || '');
        
        modal.addComponents(new ActionRowBuilder().addComponents(textInput));
        await interaction.showModal(modal);
    } else if (customId === 'uniformes_set_channel') {
        const menu = new ChannelSelectMenuBuilder()
            .setCustomId('uniformes_set_showcase_channel')
            .setPlaceholder('Selecione o canal para a vitrine')
            .addChannelTypes(ChannelType.GuildText);
        
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: 'Por favor, selecione em qual canal a vitrine de uniformes deve ser exibida.', components: [row], ephemeral: true });
    }
}

async function handleModal(interaction) {
    const guildId = interaction.guild.id;
    if (interaction.customId === 'uniformes_category_modal') {
        await interaction.deferUpdate();
        const newCategoriesText = interaction.fields.getTextInputValue('categories_input');
        const newCategories = newCategoriesText.split('\n').map(name => name.trim()).filter(name => name);
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Antes de apagar, vamos verificar se algum item usa as categorias que serão removidas
            // (Lógica mais complexa, por agora vamos manter simples)
            await client.query('DELETE FROM vestuario_categorias WHERE guild_id = $1', [guildId]);
            for (const name of newCategories) {
                await client.query('INSERT INTO vestuario_categorias (guild_id, nome) VALUES ($1, $2) ON CONFLICT (guild_id, nome) DO NOTHING', [guildId, name]);
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        await updateShowcase(interaction);
        await showConfigPanel(interaction);
    }

    if (interaction.customId === 'uniformes_add_item_modal') {
        await interaction.deferUpdate();
        const name = interaction.fields.getTextInputValue('item_name');
        const categoryName = interaction.fields.getTextInputValue('item_category');
        const imageUrl = interaction.fields.getTextInputValue('item_image');
        const codes = interaction.fields.getTextInputValue('item_codes');

        const categoryRes = await pool.query('SELECT nome FROM vestuario_categorias WHERE guild_id = $1 AND nome = $2', [guildId, categoryName]);
        if (categoryRes.rowCount === 0) {
            await interaction.followUp({ content: `❌ A categoria "${categoryName}" não existe. Verifique o nome exato (maiúsculas/minúsculas) e tente novamente.`, ephemeral: true });
            return;
        }
        
        await pool.query(
            'INSERT INTO vestuario_items (guild_id, categoria_nome, nome, imagem_url, codigos) VALUES ($1, $2, $3, $4, $5)',
            [guildId, categoryName, name, imageUrl, codes]
        );
        
        await updateShowcase(interaction);
        await showConfigPanel(interaction);
    }
}

async function handleStringSelect(interaction) {
    if (interaction.customId === 'uniformes_showcase_category_select') {
        await interaction.deferReply({ ephemeral: true });
        const categoryName = interaction.values[0].replace('uniformes_cat_', '').replace(/_/g, ' ');
        
        const itemsRes = await pool.query('SELECT * FROM vestuario_items WHERE guild_id = $1 AND categoria_nome = $2 ORDER BY nome', [interaction.guild.id, categoryName]);
        
        if (itemsRes.rowCount === 0) {
            return interaction.editReply({ content: 'ℹ️ Não há uniformes cadastrados nesta categoria.', ephemeral: true });
        }

        let embeds = [];
        let components = [];
        for (const [index, item] of itemsRes.rows.entries()) {
            const itemEmbed = new EmbedBuilder()
                .setTitle(item.nome)
                .setImage(item.imagem_url)
                .setColor('#3498db');
            
            const copyButton = new ButtonBuilder()
                .setCustomId(`uniformes_copy_code_${item.id}`)
                .setLabel('Copiar Uniforme')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅');
            
            embeds.push(itemEmbed);
            components.push(new ActionRowBuilder().addComponents(copyButton));

            // Para evitar flood, envia em blocos de 5
            if ((index + 1) % 5 === 0 || index === itemsRes.rows.length - 1) {
                await interaction.followUp({ embeds, components, ephemeral: true });
                embeds = [];
                components = [];
            }
        }
        await interaction.editReply({ content: `Exibindo ${itemsRes.rowCount} uniformes da categoria **${categoryName}**:`, embeds: [], components: [] });
    }
}

async function handleChannelSelect(interaction) {
    if (interaction.customId === 'uniformes_set_showcase_channel') {
        await interaction.deferUpdate();
        const channelId = interaction.values[0];

        await pool.query(
            'INSERT INTO vestuario_configs (guild_id, showcase_channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET showcase_channel_id = $2, showcase_message_id = NULL',
            [interaction.guild.id, channelId]
        );
        
        await updateShowcase(interaction);
        await showConfigPanel(interaction);
    }
}

// O módulo exportado agora segue o padrão do seu handler.js
module.exports = {
    customId: (customId) => customId.startsWith('uniformes_'),
    async execute(interaction) {
        if (interaction.isButton()) {
            return handleButton(interaction);
        }
        if (interaction.isModalSubmit()) {
            return handleModal(interaction);
        }
        if (interaction.isStringSelectMenu()) {
            return handleStringSelect(interaction);
        }
        if (interaction.isChannelSelectMenu()) {
            return handleChannelSelect(interaction);
        }
    }
};
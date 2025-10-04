const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const db = require('../database/db');
const { updateShowcase, showConfigPanel } = require('../views/uniformes_view');

async function handleButton(interaction) {
    const customId = interaction.customId;

    if (customId === 'uniformes_add_item') {
        const categoriesRes = await db.query('SELECT nome FROM vestuario_categorias WHERE guild_id = $1', [interaction.guild.id]);
        if (categoriesRes.rowCount === 0) {
            return interaction.reply({ content: '❌ Você precisa criar pelo menos uma categoria antes de adicionar um uniforme.', ephemeral: true });
        }

        // --- ALTERADO AQUI ---
        // O campo de URL da imagem foi removido do modal
        const modal = new ModalBuilder().setCustomId('uniformes_add_item_modal').setTitle('Adicionar Novo Uniforme');
        const nameInput = new TextInputBuilder().setCustomId('item_name').setLabel('Nome do Uniforme').setStyle(TextInputStyle.Short).setRequired(true);
        const categoryInput = new TextInputBuilder().setCustomId('item_category').setLabel('Categoria (Nome Exato)').setStyle(TextInputStyle.Short).setRequired(true);
        const codesInput = new TextInputBuilder().setCustomId('item_codes').setLabel('Códigos do Uniforme').setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(categoryInput),
            new ActionRowBuilder().addComponents(codesInput)
        );
        await interaction.showModal(modal);

    } else if (customId.startsWith('uniformes_copy_code_')) {
        const itemId = customId.split('_').pop();
        const itemRes = await db.query('SELECT nome, codigos FROM vestuario_items WHERE id = $1', [itemId]);
        if(itemRes.rowCount > 0) {
            const item = itemRes.rows[0];
            const embed = new EmbedBuilder()
                .setTitle(`✅ Códigos para: ${item.nome}`)
                .setDescription("```\n" + item.codigos + "\n```")
                .setColor('Green');
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

    } else if (customId === 'uniformes_manage_categories') {
        const categoriesRes = await db.query('SELECT nome FROM vestuario_categorias WHERE guild_id = $1 ORDER BY nome', [interaction.guild.id]);
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
        
        try {
            await db.query('DELETE FROM vestuario_categorias WHERE guild_id = $1', [guildId]);
            for (const name of newCategories) {
                if (name) {
                    await db.query('INSERT INTO vestuario_categorias (guild_id, nome) VALUES ($1, $2) ON CONFLICT (guild_id, nome) DO NOTHING', [guildId, name]);
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar categorias no DB:', error);
            await interaction.followUp({ content: 'Ocorreu um erro ao salvar as categorias no banco de dados.', ephemeral: true });
            return;
        }

        await updateShowcase(interaction);
        await showConfigPanel(interaction);
    }

    if (interaction.customId === 'uniformes_add_item_modal') {
        // --- LÓGICA COMPLETAMENTE NOVA AQUI ---
        await interaction.deferUpdate();
        
        const name = interaction.fields.getTextInputValue('item_name');
        const categoryName = interaction.fields.getTextInputValue('item_category');
        const codes = interaction.fields.getTextInputValue('item_codes');

        // Valida se a categoria existe
        const categoryRes = await db.query('SELECT nome FROM vestuario_categorias WHERE guild_id = $1 AND nome = $2', [guildId, categoryName]);
        if (categoryRes.rowCount === 0) {
            await interaction.followUp({ content: `❌ A categoria "${categoryName}" não existe. Verifique o nome exato e tente novamente.`, ephemeral: true });
            return;
        }

        // Pede a imagem ao usuário
        await interaction.followUp({ content: `✅ Dados do texto salvos! Agora, por favor, envie a **imagem** para o uniforme **"${name}"** neste canal.\n\n*Você tem 3 minutos.*`, ephemeral: true });

        // Cria um "coletor" para esperar a próxima mensagem do usuário
        const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
        
        try {
            const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 180000, errors: ['time'] });
            const messageWithImage = collected.first();
            const imageUrl = messageWithImage.attachments.first().url;

            // Apaga a mensagem do usuário que continha a imagem
            await messageWithImage.delete();

            // Insere tudo no banco de dados
            await db.query(
                'INSERT INTO vestuario_items (guild_id, categoria_nome, nome, imagem_url, codigos) VALUES ($1, $2, $3, $4, $5)',
                [guildId, categoryName, name, imageUrl, codes]
            );

            // Responde com sucesso e atualiza tudo
            await interaction.followUp({ content: `✅ Uniforme **"${name}"** adicionado com sucesso!`, ephemeral: true });
            await updateShowcase(interaction);
            await showConfigPanel(interaction);

        } catch (error) {
            // Se o tempo esgotar, o erro 'time' é capturado aqui
            console.error('Erro ao coletar imagem do uniforme:', error);
            await interaction.followUp({ content: '⏰ Tempo esgotado. A operação foi cancelada. Por favor, tente adicionar o uniforme novamente.', ephemeral: true });
        }
    }
}

// O resto do arquivo (handleStringSelect, handleChannelSelect, e exports) continua o mesmo
async function handleStringSelect(interaction) {
    if (interaction.customId === 'uniformes_showcase_category_select') {
        await interaction.deferReply({ ephemeral: true });
        const categoryName = interaction.values[0].replace('uniformes_cat_', '').replace(/_/g, ' ');
        
        const itemsRes = await db.query('SELECT * FROM vestuario_items WHERE guild_id = $1 AND categoria_nome = $2 ORDER BY nome', [interaction.guild.id, categoryName]);
        
        if (itemsRes.rowCount === 0) {
            return interaction.editReply({ content: 'ℹ️ Não há uniformes cadastrados nesta categoria.' });
        }

        const embeds = [];
        const components = [];

        for (const item of itemsRes.rows) {
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
        }

        await interaction.editReply({ 
            content: `Exibindo ${itemsRes.rowCount} uniformes da categoria **${categoryName}**:`, 
            embeds: embeds.slice(0, 10), 
            components: components.slice(0, 5)
        });
    }
}

async function handleChannelSelect(interaction) {
    if (interaction.customId === 'uniformes_set_showcase_channel') {
        await interaction.deferUpdate();
        const channelId = interaction.values[0];

        await db.query(
            'INSERT INTO vestuario_configs (guild_id, showcase_channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET showcase_channel_id = $2, showcase_message_id = NULL',
            [interaction.guild.id, channelId]
        );
        
        await updateShowcase(interaction);
        await showConfigPanel(interaction);
    }
}

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
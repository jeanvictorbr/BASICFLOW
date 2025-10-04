// Ficheiro: interactions/uniformes_handler.js (VERSÃO FINAL CORRIGIDA)
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, StringSelectMenuBuilder } = require('discord.js');
const db = require('../database/db');
const { updateShowcase, showConfigPanel } = require('../views/uniformes_view');

// -- LÓGICA DE BOTÕES --
async function handleButton(interaction) {
    const customId = interaction.customId;
    const [action, itemId] = customId.split(':');

    // ADICIONAR UNIFORME
    if (action === 'uniformes_add_item') {
        const modal = new ModalBuilder().setCustomId('uniformes_add_item_modal').setTitle('Adicionar Novo Uniforme');
        const nameInput = new TextInputBuilder().setCustomId('item_name').setLabel('Nome do Uniforme (Ex: Recruta)').setStyle(TextInputStyle.Short).setRequired(true);
        const codesInput = new TextInputBuilder().setCustomId('item_codes').setLabel('Códigos do Uniforme (Preset)').setStyle(TextInputStyle.Paragraph).setRequired(true);
        const imageInput = new TextInputBuilder().setCustomId('item_image_url').setLabel('Link da Imagem (URL)').setStyle(TextInputStyle.Short).setPlaceholder('https://i.imgur.com/imagem.png').setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(codesInput),
            new ActionRowBuilder().addComponents(imageInput)
        );
        await interaction.showModal(modal);
        return;
    }

    // DEFINIR CANAL VITRINE
    if (action === 'uniformes_set_channel') {
        const menu = new ChannelSelectMenuBuilder().setCustomId('uniformes_set_showcase_channel').setPlaceholder('Selecione o canal para a vitrine pública').addChannelTypes(ChannelType.GuildText);
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: 'Selecione o canal onde a vitrine de uniformes será exibida.', components: [row], ephemeral: true });
        return;
    }

    // ESCOLHER ITEM PARA GERIR (EDITAR/REMOVER)
    if (action === 'uniformes_edit_remove_item') {
        await interaction.deferReply({ ephemeral: true });
        const itemsRes = await db.query('SELECT id, nome FROM vestuario_items WHERE guild_id = $1 ORDER BY nome', [interaction.guild.id]);
        if (itemsRes.rowCount === 0) {
            return interaction.editReply({ content: 'Não há uniformes para editar ou remover.' });
        }
        const options = itemsRes.rows.map(item => ({ label: item.nome, value: `uniformes_manage_select:${item.id}`}));
        const selectMenu = new StringSelectMenuBuilder().setCustomId('uniformes_select_to_manage').setPlaceholder('Selecione um uniforme para gerenciar...').addOptions(options.slice(0, 25));
        await interaction.editReply({ content: 'Selecione o uniforme que você deseja editar ou remover.', components: [new ActionRowBuilder().addComponents(selectMenu)] });
        return;
    }

    // ABRIR MODAL PARA EDITAR ITEM
    if (action === 'uniformes_edit_item') {
        const itemRes = await db.query('SELECT * FROM vestuario_items WHERE id = $1 AND guild_id = $2', [itemId, interaction.guildId]);
        if (itemRes.rowCount === 0) {
            return interaction.update({ content: 'Este item não foi encontrado.', embeds: [], components: [] });
        }
        const item = itemRes.rows[0];
        const modal = new ModalBuilder().setCustomId(`uniformes_edit_item_modal:${itemId}`).setTitle('Editar Uniforme');
        const nameInput = new TextInputBuilder().setCustomId('item_name').setLabel('Nome do Uniforme').setStyle(TextInputStyle.Short).setValue(item.nome).setRequired(true);
        const codesInput = new TextInputBuilder().setCustomId('item_codes').setLabel('Códigos do Uniforme (Preset)').setStyle(TextInputStyle.Paragraph).setValue(item.codigos).setRequired(true);
        const imageInput = new TextInputBuilder().setCustomId('item_image_url').setLabel('Link da Imagem (URL)').setStyle(TextInputStyle.Short).setValue(item.imagem_url).setRequired(true);
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(codesInput),
            new ActionRowBuilder().addComponents(imageInput)
        );
        await interaction.showModal(modal);
        return;
    }
    
    // BOTÃO DE CONFIRMAÇÃO PARA REMOVER
    if (action === 'uniformes_remove_item') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`uniformes_remove_confirm:${itemId}`).setLabel('Sim, tenho a certeza').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('uniformes_remove_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
        );
        await interaction.update({ content: '⚠️ **Atenção!** Você tem a certeza de que quer remover este uniforme? Esta ação é irreversível.', components: [row], embeds: [] });
        return;
    }

    // AÇÃO FINAL DE REMOVER
    if (action === 'uniformes_remove_confirm') {
        await db.query('DELETE FROM vestuario_items WHERE id = $1 AND guild_id = $2', [itemId, interaction.guildId]);
        await interaction.update({ content: '✅ Uniforme removido com sucesso!', components: [], embeds: [] });
        await updateShowcase(interaction.client, interaction.guildId);
        return;
    }

    // CANCELAR REMOÇÃO
    if (action === 'uniformes_remove_cancel') {
        await interaction.update({ content: 'Operação cancelada.', components: [], embeds: [] });
    }
}

// -- LÓGICA DE MODAIS --
async function handleModal(interaction) {
    const [action, itemId] = interaction.customId.split(':');

    const isValidUrl = (url) => url.startsWith('http://') || url.startsWith('https://');

    // SUBMISSÃO DE NOVO ITEM
    if (action === 'uniformes_add_item_modal') {
        await interaction.deferReply({ ephemeral: true });
        const name = interaction.fields.getTextInputValue('item_name');
        const codes = interaction.fields.getTextInputValue('item_codes');
        const imageUrl = interaction.fields.getTextInputValue('item_image_url');

        if (!isValidUrl(imageUrl)) {
            return interaction.editReply({ content: '❌ O link da imagem fornecido é inválido. Certifique-se de que começa com `http://` ou `https://`.' });
        }

        try {
            await db.query('INSERT INTO vestuario_items (guild_id, nome, imagem_url, codigos) VALUES ($1, $2, $3, $4)', [interaction.guildId, name, imageUrl, codes]);
            await interaction.editReply({ content: `✅ Uniforme **"${name}"** adicionado com sucesso!` });
            await updateShowcase(interaction.client, interaction.guildId);
        } catch (error) {
            console.error('Erro ao adicionar uniforme:', error);
            await interaction.editReply({ content: '❌ Ocorreu um erro ao salvar o uniforme. Verifique se já não existe um uniforme com o mesmo nome.' });
        }
        return;
    }
    
    // SUBMISSÃO DE EDIÇÃO DE ITEM
    if (action === 'uniformes_edit_item_modal') {
        await interaction.deferReply({ ephemeral: true });
        const name = interaction.fields.getTextInputValue('item_name');
        const codes = interaction.fields.getTextInputValue('item_codes');
        const imageUrl = interaction.fields.getTextInputValue('item_image_url');

        if (!isValidUrl(imageUrl)) {
            return interaction.editReply({ content: '❌ O link da imagem fornecido é inválido.' });
        }
        
        try {
            await db.query('UPDATE vestuario_items SET nome = $1, codigos = $2, imagem_url = $3 WHERE id = $4 AND guild_id = $5', [name, codes, imageUrl, itemId, interaction.guildId]);
            await interaction.editReply({ content: '✅ Uniforme atualizado com sucesso!' });
            await updateShowcase(interaction.client, interaction.guildId);
        } catch(error) {
            console.error('Erro ao editar uniforme:', error);
            await interaction.editReply({ content: '❌ Ocorreu um erro ao atualizar o uniforme.' });
        }
    }
}

// -- LÓGICA DE MENUS DE SELEÇÃO --
async function handleSelectMenu(interaction) {
    // *** INÍCIO DA CORREÇÃO ***
    const [action, itemId] = interaction.values[0].split(':');

    // EXIBIR NA VITRINE
    if (interaction.customId === 'uniformes_showcase_select') {
        await interaction.deferUpdate();
        const itemRes = await db.query('SELECT * FROM vestuario_items WHERE id = $1', [itemId]);
        if (itemRes.rowCount === 0) return;
        const item = itemRes.rows[0];
        
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setDescription(`**UNIFORME SELECIONADO: ${item.nome}**\n\nUse o menu acima para selecionar outro uniforme.`)
            .setImage(item.imagem_url)
            .setFields([{ name: 'Códigos (Preset)', value: '```\n' + (item.codigos || 'Nenhum código fornecido.') + '\n```' }])
            .setFooter({ text: `Item: ${item.nome}` });
        
        await interaction.message.edit({ embeds: [updatedEmbed] });
        return;
    }
    // *** FIM DA CORREÇÃO ***

    // MOSTRAR OPÇÕES DE GESTÃO PARA O ITEM SELECIONADO
    if (action === 'uniformes_manage_select') {
        await interaction.deferUpdate();
        const itemRes = await db.query('SELECT nome FROM vestuario_items WHERE id = $1 AND guild_id = $2', [itemId, interaction.guildId]);
        if (itemRes.rowCount === 0) {
            return interaction.editReply({ content: 'Este item não foi encontrado.', components: [] });
        }
        const embed = new EmbedBuilder().setTitle(`Gerir Uniforme: ${itemRes.rows[0].nome}`).setDescription('O que você gostaria de fazer com este uniforme?');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`uniformes_edit_item:${itemId}`).setLabel('Editar Texto/Link').setStyle(ButtonStyle.Primary).setEmoji('📝'),
            new ButtonBuilder().setCustomId(`uniformes_remove_item:${itemId}`).setLabel('Remover').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
        );
        await interaction.editReply({ content: '', embeds: [embed], components: [row] });
    }
}

// -- LÓGICA DE MENUS DE CANAL --
async function handleChannelSelect(interaction) {
    await interaction.deferUpdate();
    const guildId = interaction.guild.id;
    const channelId = interaction.values[0];

    if (interaction.customId === 'uniformes_set_showcase_channel') {
        await db.query('INSERT INTO vestuario_configs (guild_id, showcase_channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET showcase_channel_id = $2, showcase_message_id = NULL', [guildId, channelId]);
        await interaction.followUp({ content: `✅ Canal da vitrine definido para <#${channelId}>. A publicar/atualizar a vitrine...`, ephemeral: true });
        await updateShowcase(interaction.client, guildId);
        await showConfigPanel(interaction);
    }
}

// EXPORTADOR PRINCIPAL
module.exports = {
    customId: (id) => id.startsWith('uniformes_'),
    async execute(interaction) {
        if (interaction.isButton()) return handleButton(interaction);
        if (interaction.isModalSubmit()) return handleModal(interaction);
        if (interaction.isStringSelectMenu()) return handleSelectMenu(interaction);
        if (interaction.isChannelSelectMenu()) return handleChannelSelect(interaction);
    }
};
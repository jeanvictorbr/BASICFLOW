// Ficheiro: interactions/uniformes_handler.js (VERSÃO FINAL CORRIGIDA)
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const db = require('../database/db');
const { updateShowcase, showConfigPanel } = require('../views/uniformes_view');

// -- LÓGICA DE BOTÕES --
async function handleButton(interaction) {
    const customId = interaction.customId;
    const [action, itemId] = customId.split(':');

    // ADICIONAR UNIFORME
    if (action === 'uniformes_add_item') {
        // Não podemos adiar a resposta aqui, pois 'showModal' é uma resposta.
        // As verificações são rápidas o suficiente.
        const guildId = interaction.guild.id;
        const configRes = await db.query('SELECT storage_channel_id FROM vestuario_configs WHERE guild_id = $1', [guildId]);
        const storageChannelId = configRes.rows[0]?.storage_channel_id;

        if (!storageChannelId) {
            return interaction.reply({
                content: '⚠️ **Ação Necessária:** Antes de adicionar um uniforme, você precisa definir um canal de "storage" para guardar as imagens permanentemente.',
                ephemeral: true
            });
        }
        
        const modal = new ModalBuilder().setCustomId('uniformes_add_item_modal').setTitle('Adicionar Novo Uniforme');
        const nameInput = new TextInputBuilder().setCustomId('item_name').setLabel('Nome do Uniforme (Ex: Recruta)').setStyle(TextInputStyle.Short).setRequired(true);
        const codesInput = new TextInputBuilder().setCustomId('item_codes').setLabel('Códigos do Uniforme (Preset)').setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(codesInput));
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

    // DEFINIR CANAL STORAGE
    if (action === 'uniformes_set_storage_channel') {
        const menu = new ChannelSelectMenuBuilder().setCustomId('uniformes_select_storage_channel').setPlaceholder('Selecione o canal para guardar as imagens').addChannelTypes(ChannelType.GuildText);
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: 'Selecione o canal privado onde devo salvar as imagens dos uniformes.', components: [row], ephemeral: true });
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

    // ABRIR MODAL PARA EDITAR TEXTO
    if (action === 'uniformes_edit_text') {
        const itemRes = await db.query('SELECT nome, codigos FROM vestuario_items WHERE id = $1 AND guild_id = $2', [itemId, interaction.guildId]);
        if (itemRes.rowCount === 0) {
            return interaction.update({ content: 'Este item não foi encontrado.', embeds: [], components: [] });
        }
        const item = itemRes.rows[0];
        const modal = new ModalBuilder().setCustomId(`uniformes_edit_item_modal:${itemId}`).setTitle('Editar Nome e Códigos');
        const nameInput = new TextInputBuilder().setCustomId('item_name').setLabel('Nome do Uniforme').setStyle(TextInputStyle.Short).setValue(item.nome).setRequired(true);
        const codesInput = new TextInputBuilder().setCustomId('item_codes').setLabel('Códigos do Uniforme (Preset)').setStyle(TextInputStyle.Paragraph).setValue(item.codigos).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(codesInput));
        await interaction.showModal(modal);
        return;
    }

    // PEDIR NOVA IMAGEM
    if (action === 'uniformes_edit_image') {
        await interaction.update({ content: `Certo. Por favor, envie a **nova imagem** para este uniforme neste canal.\n\n*Você tem 3 minutos.*`, components: [], embeds: [] });
        const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
        try {
            const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 180000, errors: ['time'] });
            const messageWithImage = collected.first();
            const tempImageUrl = messageWithImage.attachments.first().url;
            await messageWithImage.delete().catch(() => {});

            const configRes = await db.query('SELECT storage_channel_id FROM vestuario_configs WHERE guild_id = $1', [interaction.guildId]);
            const storageChannel = await interaction.client.channels.fetch(configRes.rows[0].storage_channel_id);
            
            const storageMessage = await storageChannel.send({ files: [{ attachment: tempImageUrl, name: `uniforme_edit_${itemId}.png` }] });
            const permanentImageUrl = storageMessage.attachments.first().url;

            await db.query('UPDATE vestuario_items SET imagem_url = $1 WHERE id = $2', [permanentImageUrl, itemId]);
            await interaction.followUp({ content: '✅ Imagem do uniforme atualizada com sucesso!', ephemeral: true });
            await updateShowcase(interaction.client, interaction.guildId);
        } catch (error) {
            console.error('Erro ao editar imagem de uniforme:', error);
            await interaction.followUp({ content: '⏰ A operação de edição de imagem falhou ou o tempo esgotou.', ephemeral: true }).catch(() => {});
        }
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

    // SUBMISSÃO DE NOVO ITEM
    if (action === 'uniformes_add_item_modal') {
        await interaction.deferReply({ ephemeral: true });
        const name = interaction.fields.getTextInputValue('item_name');
        const codes = interaction.fields.getTextInputValue('item_codes');
        await interaction.editReply({ content: `✅ Dados de texto salvos para **"${name}"**! Agora, por favor, envie a **imagem** correspondente neste canal.\n\n*Você tem 3 minutos.*` });
        
        const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
        try {
            const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 180000, errors: ['time'] });
            const messageWithImage = collected.first();
            const tempImageUrl = messageWithImage.attachments.first().url;
            await messageWithImage.delete().catch(() => {});

            const configRes = await db.query('SELECT storage_channel_id FROM vestuario_configs WHERE guild_id = $1', [interaction.guildId]);
            const storageChannel = await interaction.client.channels.fetch(configRes.rows[0].storage_channel_id);

            const storageMessage = await storageChannel.send({ files: [{ attachment: tempImageUrl, name: `uniforme_${name.replace(/\s+/g, '_')}.png` }] });
            const permanentImageUrl = storageMessage.attachments.first().url;

            await db.query('INSERT INTO vestuario_items (guild_id, nome, imagem_url, codigos) VALUES ($1, $2, $3, $4)', [interaction.guildId, name, permanentImageUrl, codes]);
            await interaction.followUp({ content: `✅ Uniforme **"${name}"** adicionado com sucesso!`, ephemeral: true });
            await updateShowcase(interaction.client, interaction.guildId);
        } catch (error) {
            console.error('Erro no fluxo de adicionar uniforme:', error);
            await interaction.followUp({ content: '⏰ A operação falhou. O tempo pode ter esgotado, ou eu não tenho permissões para postar no canal de storage.', ephemeral: true }).catch(() => {});
        }
        return;
    }
    
    // SUBMISSÃO DE EDIÇÃO DE TEXTO
    if (action === 'uniformes_edit_item_modal') {
        await interaction.deferUpdate();
        const name = interaction.fields.getTextInputValue('item_name');
        const codes = interaction.fields.getTextInputValue('item_codes');
        await db.query('UPDATE vestuario_items SET nome = $1, codigos = $2 WHERE id = $3 AND guild_id = $4', [name, codes, itemId, interaction.guildId]);
        await interaction.followUp({ content: '✅ Nome e códigos do uniforme atualizados com sucesso!', ephemeral: true });
        await updateShowcase(interaction.client, interaction.guildId);
    }
}

// -- LÓGICA DE MENUS DE SELEÇÃO --
async function handleSelectMenu(interaction) {
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

    // MOSTRAR OPÇÕES DE GESTÃO PARA O ITEM SELECIONADO
    if (action === 'uniformes_manage_select') {
        await interaction.deferUpdate();
        const itemRes = await db.query('SELECT nome FROM vestuario_items WHERE id = $1 AND guild_id = $2', [itemId, interaction.guildId]);
        if (itemRes.rowCount === 0) {
            return interaction.editReply({ content: 'Este item não foi encontrado.', components: [] });
        }
        const embed = new EmbedBuilder().setTitle(`Gerir Uniforme: ${itemRes.rows[0].nome}`).setDescription('O que você gostaria de fazer com este uniforme?');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`uniformes_edit_text:${itemId}`).setLabel('Editar Nome/Códigos').setStyle(ButtonStyle.Primary).setEmoji('📝'),
            new ButtonBuilder().setCustomId(`uniformes_edit_image:${itemId}`).setLabel('Alterar Imagem').setStyle(ButtonStyle.Secondary).setEmoji('🖼️'),
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
        await interaction.editReply({ content: `✅ Canal da vitrine definido para <#${channelId}>. A publicar a vitrine...`, components: [], embeds: [] });
        await updateShowcase(interaction.client, guildId);
        return; // Retorna para não chamar o showConfigPanel duas vezes
    }

    if (interaction.customId === 'uniformes_select_storage_channel') {
        await db.query('INSERT INTO vestuario_configs (guild_id, storage_channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET storage_channel_id = $2', [guildId, channelId]);
        await interaction.editReply({ content: `✅ Canal de storage definido para <#${channelId}>.`, components: [], embeds: [] });
    }
    // O showConfigPanel pode ser chamado no final se a lógica acima não o fizer.
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
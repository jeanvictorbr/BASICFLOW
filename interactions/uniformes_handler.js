// Ficheiro: interactions/uniformes_handler.js (VERSÃO CORRIGIDA E FINAL)
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const db = require('../database/db');
const { updateShowcase, showConfigPanel } = require('../views/uniformes_view');

// Função principal para lidar com cliques em botões
async function handleButton(interaction) {
    const customId = interaction.customId;

    if (customId === 'uniformes_add_item') {
        await interaction.deferReply({ ephemeral: true });
        const guildId = interaction.guild.id;
        const configRes = await db.query('SELECT storage_channel_id FROM vestuario_configs WHERE guild_id = $1', [guildId]);
        const storageChannelId = configRes.rows[0]?.storage_channel_id;

        if (!storageChannelId) {
            return interaction.editReply({
                content: '⚠️ **Ação Necessária:** Antes de adicionar um uniforme, você precisa definir um canal de "storage" para guardar as imagens permanentemente. Use o botão "Definir Canal Storage" no painel `/uniformesconfig`.',
            });
        }

        try {
            const storageChannel = await interaction.client.channels.fetch(storageChannelId);
            const botPermissions = storageChannel.permissionsFor(interaction.guild.members.me);
            if (!botPermissions.has(PermissionsBitField.Flags.ViewChannel) || !botPermissions.has(PermissionsBitField.Flags.SendMessages) || !botPermissions.has(PermissionsBitField.Flags.AttachFiles)) {
                return interaction.editReply({
                    content: `❌ **Permissões em Falta!**\nEu não tenho as permissões necessárias no canal de storage <#${storageChannelId}>. Por favor, certifica-te de que eu posso **Ver o Canal**, **Enviar Mensagens** e **Anexar Arquivos** nesse canal.`,
                });
            }
        } catch (e) {
            return interaction.editReply({ content: '❌ Ocorreu um erro ao verificar o canal de storage. Ele pode ter sido apagado.' });
        }
        
        const modal = new ModalBuilder().setCustomId('uniformes_add_item_modal').setTitle('Adicionar Novo Uniforme');
        const nameInput = new TextInputBuilder().setCustomId('item_name').setLabel('Nome do Uniforme (Ex: Recruta)').setStyle(TextInputStyle.Short).setRequired(true);
        const codesInput = new TextInputBuilder().setCustomId('item_codes').setLabel('Códigos do Uniforme (Preset)').setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(codesInput)
        );
        // Deletar a resposta "defer" e mostrar o modal
        await interaction.deleteReply();
        await interaction.showModal(modal);

    } else if (customId === 'uniformes_set_channel') {
        const menu = new ChannelSelectMenuBuilder().setCustomId('uniformes_set_showcase_channel').setPlaceholder('Selecione o canal para a vitrine pública').addChannelTypes(ChannelType.GuildText);
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: 'Por favor, selecione o canal onde a vitrine de uniformes será exibida.', components: [row], ephemeral: true });

    } else if (customId === 'uniformes_set_storage_channel') {
        const menu = new ChannelSelectMenuBuilder().setCustomId('uniformes_select_storage_channel').setPlaceholder('Selecione o canal para guardar as imagens').addChannelTypes(ChannelType.GuildText);
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: 'Selecione o canal privado onde devo salvar as imagens dos uniformes para garantir que elas nunca expirem.', components: [row], ephemeral: true });

    } else if (customId === 'uniformes_edit_remove_item') {
        const itemsRes = await db.query('SELECT id, nome FROM vestuario_items WHERE guild_id = $1 ORDER BY nome', [interaction.guild.id]);
        if (itemsRes.rowCount === 0) {
            return interaction.reply({ content: 'Não há uniformes para editar ou remover.', ephemeral: true });
        }

        const options = itemsRes.rows.map(item => ({ label: item.nome, value: `uniformes_manage_${item.id}`}));
        const selectMenu = new StringSelectMenuBuilder().setCustomId('uniformes_select_to_manage').setPlaceholder('Selecione um uniforme para gerenciar...').addOptions(options.slice(0, 25));
        await interaction.reply({ content: 'Selecione o uniforme que você deseja editar ou remover.', components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
    }
}

async function handleModal(interaction) {
    if (interaction.customId === 'uniformes_add_item_modal') {
        await interaction.deferReply({ ephemeral: true });
        const guildId = interaction.guild.id;
        
        const configRes = await db.query('SELECT storage_channel_id FROM vestuario_configs WHERE guild_id = $1', [guildId]);
        const storageChannelId = configRes.rows[0]?.storage_channel_id;

        const name = interaction.fields.getTextInputValue('item_name');
        const codes = interaction.fields.getTextInputValue('item_codes');

        await interaction.editReply({ content: `✅ Dados de texto salvos! Agora, por favor, envie a **imagem** para o uniforme **"${name}"** neste canal.\n\n*Você tem 3 minutos.*` });

        const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
        
        try {
            const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 180000, errors: ['time'] });
            const messageWithImage = collected.first();
            const tempImageUrl = messageWithImage.attachments.first().url;

            await messageWithImage.delete().catch(() => {});

            const storageChannel = await interaction.client.channels.fetch(storageChannelId);
            const storageMessage = await storageChannel.send({
                files: [{ attachment: tempImageUrl, name: `uniforme_${name.replace(/\s+/g, '_')}.png` }]
            });
            const permanentImageUrl = storageMessage.attachments.first().url;

            await db.query(
                'INSERT INTO vestuario_items (guild_id, nome, imagem_url, codigos) VALUES ($1, $2, $3, $4) ON CONFLICT (guild_id, nome) DO UPDATE SET imagem_url = $3, codigos = $4',
                [guildId, name, permanentImageUrl, codes]
            );

            await interaction.followUp({ content: `✅ Uniforme **"${name}"** adicionado com sucesso! A vitrine será atualizada.`, ephemeral: true });
            await updateShowcase(interaction.client, interaction.guildId);

        } catch (error) {
            console.error('Erro no fluxo de adicionar uniforme:', error);
            let errorMessage = '⏰ A operação falhou. O tempo pode ter esgotado, ou ocorreu um erro inesperado.';
            if (error.name === 'AbortError' || (error.message && error.message.includes('aborted'))) {
                errorMessage = '❌ **Tempo Esgotado!** O envio da imagem para o Discord demorou demasiado tempo e a operação foi cancelada. Por favor, tente novamente com uma imagem de tamanho menor.';
            } else if (error.code === 50013) {
                errorMessage = `❌ **Permissões em Falta!**\nEu não tenho permissão para enviar a imagem para o canal de storage <#${storageChannelId}>. Por favor, certifica-te de que eu posso **Enviar Mensagens** e **Anexar Arquivos** nesse canal.`
            } else if (error.message && error.message.includes('Collector received no items')) {
                errorMessage = '⏰ O tempo de 3 minutos para enviar a imagem esgotou. Por favor, tente novamente.';
            }
            await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(() => {});
        }
    }
}

async function handleStringSelect(interaction) {
    if (interaction.customId === 'uniformes_showcase_select') {
        try {
            await interaction.deferUpdate();

            const itemId = interaction.values[0].replace('uniformes_item_', '');
            const itemRes = await db.query('SELECT * FROM vestuario_items WHERE id = $1', [itemId]);

            if (itemRes.rowCount === 0) return;

            const item = itemRes.rows[0];
            
            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setDescription(`**UNIFORME SELECIONADO: ${item.nome}**\n\nUse o menu acima para selecionar outro uniforme.`)
                .setImage(item.imagem_url)
                .setFields([
                    {
                        name: 'Códigos (Preset)',
                        value: '```\n' + (item.codigos || 'Nenhum código fornecido.') + '\n```'
                    }
                ])
                .setFooter({ text: `Item: ${item.nome}` });
            
            await interaction.message.edit({ embeds: [updatedEmbed], components: interaction.message.components });

        } catch (error) {
            console.error('[ERRO CRÍTICO NA VITRINE]:', error);
        }
    }
}

async function handleChannelSelect(interaction) {
    const guildId = interaction.guild.id;
    const channelId = interaction.values[0];

    if (interaction.customId === 'uniformes_set_showcase_channel') {
        await interaction.deferUpdate();
        await db.query(
            'INSERT INTO vestuario_configs (guild_id, showcase_channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET showcase_channel_id = $2, showcase_message_id = NULL',
            [guildId, channelId]
        );
        await updateShowcase(interaction.client, guildId);
        await showConfigPanel(interaction);
    }

    if (interaction.customId === 'uniformes_select_storage_channel') {
        await interaction.deferUpdate();
        await db.query(
            'INSERT INTO vestuario_configs (guild_id, storage_channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET storage_channel_id = $2',
            [guildId, channelId]
        );
        await showConfigPanel(interaction);
    }
}

module.exports = {
    customId: (customId) => customId.startsWith('uniformes_'),
    async execute(interaction) {
        if (interaction.isButton()) return handleButton(interaction);
        if (interaction.isModalSubmit()) return handleModal(interaction);
        if (interaction.isStringSelectMenu()) return handleStringSelect(interaction);
        if (interaction.isChannelSelectMenu()) return handleChannelSelect(interaction);
    }
};
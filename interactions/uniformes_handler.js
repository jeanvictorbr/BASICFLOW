const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, StringSelectMenuBuilder } = require('discord.js');
const db = require('../database/db');
const { updateShowcase, showConfigPanel } = require('../views/uniformes_view');

async function handleButton(interaction) {
    const customId = interaction.customId;

    if (customId === 'uniformes_add_item') {
        const modal = new ModalBuilder().setCustomId('uniformes_add_item_modal').setTitle('Adicionar Novo Uniforme');
        
        const nameInput = new TextInputBuilder().setCustomId('item_name').setLabel('Nome do Uniforme (Ex: Recruta)').setStyle(TextInputStyle.Short).setRequired(true);
        const codesInput = new TextInputBuilder().setCustomId('item_codes').setLabel('Códigos do Uniforme').setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(codesInput)
        );
        await interaction.showModal(modal);

    } else if (customId === 'uniformes_set_channel') {
        const menu = new ChannelSelectMenuBuilder()
            .setCustomId('uniformes_set_showcase_channel')
            .setPlaceholder('Selecione o canal para a vitrine')
            .addChannelTypes(ChannelType.GuildText);
        
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: 'Por favor, selecione em qual canal a vitrine de uniformes deve ser exibida.', components: [row], ephemeral: true });

    } else if (customId === 'uniformes_edit_remove_item') {
        const itemsRes = await db.query('SELECT id, nome FROM vestuario_items WHERE guild_id = $1 ORDER BY nome', [interaction.guild.id]);
        if (itemsRes.rowCount === 0) {
            return interaction.reply({ content: 'Não há uniformes para editar ou remover.', ephemeral: true });
        }

        const options = itemsRes.rows.map(item => ({ label: item.nome, value: `uniformes_manage_${item.id}`}));
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('uniformes_select_to_manage')
            .setPlaceholder('Selecione um uniforme para gerenciar...')
            .addOptions(options.slice(0, 25));

        await interaction.reply({ content: 'Selecione o uniforme que você deseja editar ou remover.', components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
    }
}

async function handleModal(interaction) {
    if (interaction.customId === 'uniformes_add_item_modal') {
        await interaction.deferUpdate();
        const guildId = interaction.guild.id;
        const name = interaction.fields.getTextInputValue('item_name');
        const codes = interaction.fields.getTextInputValue('item_codes');

        await interaction.followUp({ content: `✅ Dados salvos! Agora, por favor, envie a **imagem** para o uniforme **"${name}"**.\n\n*Você tem 3 minutos.*`, ephemeral: true });

        const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
        
        try {
            const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 180000, errors: ['time'] });
            const messageWithImage = collected.first();
            const imageUrl = messageWithImage.attachments.first().url;

            await messageWithImage.delete();

            await db.query(
                'INSERT INTO vestuario_items (guild_id, nome, imagem_url, codigos) VALUES ($1, $2, $3, $4) ON CONFLICT (guild_id, nome) DO UPDATE SET imagem_url = $3, codigos = $4',
                [guildId, name, imageUrl, codes]
            );

            await interaction.followUp({ content: `✅ Uniforme **"${name}"** adicionado com sucesso!`, ephemeral: true });
            await updateShowcase(interaction);
            await showConfigPanel(interaction);

        } catch (error) {
            console.error('Erro ao coletar imagem do uniforme:', error);
            await interaction.followUp({ content: '⏰ Tempo esgotado ou erro no banco de dados. A operação foi cancelada.', ephemeral: true });
        }
    }
}

async function handleStringSelect(interaction) {
    if (interaction.customId === 'uniformes_showcase_select') {
        try {
            await interaction.deferUpdate();

            const itemId = interaction.values[0].replace('uniformes_item_', '');
            const itemRes = await db.query('SELECT * FROM vestuario_items WHERE id = $1', [itemId]);

            if (itemRes.rowCount === 0) {
                // Se o item não for encontrado, apenas avisa o usuário de forma efêmera
                return interaction.followUp({ content: 'Ops! Este uniforme não foi encontrado ou foi removido.', ephemeral: true });
            }

            const item = itemRes.rows[0];
            
            // Cria o embed principal com as informações de texto
            const mainEmbed = new EmbedBuilder()
                .setColor('#2c3e50')
                .setTitle('👕 Vestiário da Organização')
                .setDescription(`**UNIFORME SELECIONADO: ${item.nome}**`)
                .addFields({
                    name: 'Códigos (Preset)',
                    value: '```\n' + (item.codigos || 'Nenhum código fornecido.') + '\n```'
                })
                .setFooter({ text: 'Use o menu acima para selecionar outro uniforme.' });
            
            // Cria um SEGUNDO embed apenas para a imagem
            const imageEmbed = new EmbedBuilder()
                .setColor('#2c3e50')
                .setImage(item.imagem_url);
            
            // Edita a mensagem original para incluir os DOIS embeds
            // Isso força o Discord a renderizar a imagem corretamente
            await interaction.message.edit({ embeds: [mainEmbed, imageEmbed], components: interaction.message.components });

        } catch (error) {
            console.error('[ERRO CRÍTICO NA VITRINE]:', error);
            // Evita crashar se a interação já tiver sido respondida
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Ocorreu um erro ao exibir o uniforme.', ephemeral: true }).catch(() => {});
            } else {
                 await interaction.followUp({ content: 'Ocorreu um erro ao exibir o uniforme.', ephemeral: true }).catch(() => {});
            }
        }
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
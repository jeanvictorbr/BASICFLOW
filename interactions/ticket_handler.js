// Ficheiro: interactions/ticket_handler.js
// Responsável pela lógica de abrir e fechar tickets.

const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db.js');
const { getTicketChannelWelcomePayload } = require('../views/ticket_views.js');

const openTicketHandler = {
    customId: 'open_ticket',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const settings = await db.get('SELECT ticket_category_id, support_role_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
        if (!settings?.ticket_category_id || !settings?.support_role_id) {
            return interaction.editReply({ content: '❌ O sistema de tickets não está configurado neste servidor. Por favor, avise um administrador.' });
        }
        
        const existingTicket = await db.get('SELECT channel_id FROM tickets WHERE guild_id = $1 AND user_id = $2 AND is_open = TRUE', [interaction.guildId, interaction.user.id]);
        if (existingTicket) {
            return interaction.editReply(`❌ Você já tem um ticket aberto em <#${existingTicket.channel_id}>.`);
        }

        try {
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: settings.ticket_category_id,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id, // @everyone
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory],
                    },
                    {
                        id: settings.support_role_id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    },
                    {
                        id: interaction.client.user.id, // O próprio bot
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
                    },
                ],
            });

            await db.run(
                'INSERT INTO tickets (guild_id, user_id, channel_id) VALUES ($1, $2, $3)',
                [interaction.guildId, interaction.user.id, channel.id]
            );

            const welcomePayload = getTicketChannelWelcomePayload(interaction.user, settings.support_role_id);
            await channel.send(welcomePayload);

            await interaction.editReply({ content: `✅ O seu ticket foi criado com sucesso em ${channel}!` });

        } catch (error) {
            console.error("Erro ao criar o canal do ticket:", error);
            await interaction.editReply({ content: '❌ Ocorreu um erro ao criar o seu ticket. Verifique se a categoria configurada ainda existe e se tenho as permissões corretas.' });
        }
    }
};

const closeTicketPromptHandler = {
    customId: 'close_ticket_prompt',
    async execute(interaction) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm_close_ticket:${interaction.channelId}`)
                .setLabel('Confirmar Fecho')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_close')
                .setLabel('Cancelar')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            content: 'Você tem a certeza de que deseja fechar este ticket? Esta ação não pode ser desfeita.',
            components: [row],
            ephemeral: true,
        });
    }
};

const confirmCloseTicketHandler = {
    customId: (id) => id.startsWith('confirm_close_ticket:'),
    async execute(interaction) {
        await interaction.update({ content: '🔒 A fechar o ticket em 5 segundos...', components: [] });

        const ticket = await db.get('SELECT * FROM tickets WHERE channel_id = $1 AND is_open = TRUE', [interaction.channelId]);
        if (!ticket) {
            return interaction.followUp({ content: 'Este canal não é um ticket aberto válido ou já foi fechado.', ephemeral: true});
        }

        await db.run('UPDATE tickets SET is_open = FALSE, closed_by = $1 WHERE channel_id = $2', [interaction.user.id, interaction.channelId]);

        setTimeout(async () => {
            try {
                await interaction.channel.delete('Ticket fechado pelo utilizador.');
            } catch (error) {
                console.error(`Falha ao apagar o canal do ticket ${interaction.channelId}:`, error);
            }
        }, 5000);
    }
};

const cancelCloseHandler = {
    customId: 'cancel_close',
    async execute(interaction) {
        // Simplesmente apaga a mensagem de confirmação
        await interaction.message.delete();
    }
}


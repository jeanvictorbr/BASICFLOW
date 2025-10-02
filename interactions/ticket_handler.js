// Ficheiro: interactions/ticket_handler.js
// Lógica completa e robusta para o sistema de tickets.

const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const db = require('../database/db.js');
const { getTicketDashboardPayload } = require('../views/ticket_views.js');

const cooldowns = new Map();

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
                name: `ticket-${interaction.user.username.substring(0, 20)}`,
                type: ChannelType.GuildText,
                parent: settings.ticket_category_id,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
                    { id: settings.support_role_id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] },
                    { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
                ],
            });

            const result = await db.get('INSERT INTO tickets (guild_id, user_id, channel_id) VALUES ($1, $2, $3) RETURNING ticket_id', [interaction.guildId, interaction.user.id, channel.id]);
            const ticketId = result.ticket_id;

            const welcomePayload = getTicketDashboardPayload({ user: interaction.user, guild: interaction.guild, ticketId, claimed_by: null });
            await channel.send({ content: `${interaction.user} <@&${settings.support_role_id}>`, ...welcomePayload });

            await interaction.editReply({ content: `✅ O seu ticket foi criado com sucesso em ${channel}!` });

        } catch (error) {
            console.error("Erro ao criar o canal do ticket:", error);
            await interaction.editReply({ content: '❌ Ocorreu um erro ao criar o seu ticket. Verifique se a categoria configurada ainda existe e se tenho as permissões corretas.' });
        }
    }
};

const claimTicketHandler = {
    customId: (id) => id.startsWith('claim_ticket:'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: '❌ Apenas membros da equipa podem reivindicar tickets.', ephemeral: true });
        }
        await interaction.deferUpdate();
        const ticketId = interaction.customId.split(':')[1];
        
        await db.run('UPDATE tickets SET claimed_by = $1 WHERE ticket_id = $2 AND claimed_by IS NULL', [interaction.user.id, ticketId]);
        
        const ticketData = await db.get('SELECT * FROM tickets WHERE ticket_id = $1', [ticketId]);
        const user = await interaction.client.users.fetch(ticketData.user_id);
        
        const updatedDashboard = getTicketDashboardPayload({ user, guild: interaction.guild, ticketId, claimed_by: ticketData.claimed_by });
        await interaction.editReply(updatedDashboard);

        const claimEmbed = new EmbedBuilder()
            .setColor(0xFEE75C)
            .setDescription(`🙋 O membro da staff ${interaction.user} reivindicou este ticket e irá atendê-lo em breve.`);
        await interaction.channel.send({ embeds: [claimEmbed] });
    }
};

const transcriptTicketHandler = {
    customId: (id) => id.startsWith('transcript_ticket:'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const content = messages.reverse().map(m => `[${new Date(m.createdAt).toLocaleString('pt-BR')}] ${m.author.tag}: ${m.attachments.size > 0 ? m.attachments.first().url : m.content}`).join('\n');
        
        const transcriptFile = new AttachmentBuilder(Buffer.from(content), { name: `transcript-${interaction.channel.name}.txt` });
        await interaction.editReply({ content: 'Transcrição gerada:', files: [transcriptFile] });
    }
};

const alertStaffHandler = {
    customId: (id) => id.startsWith('alert_staff:'),
    async execute(interaction) {
        const ticketId = interaction.customId.split(':')[1];
        const cooldownKey = `alert:${ticketId}`;
        const now = Date.now();
        const cooldownTime = 5 * 60 * 1000; // 5 minutos

        if (cooldowns.has(cooldownKey) && cooldowns.get(cooldownKey) > now) {
            const timeLeft = Math.ceil((cooldowns.get(cooldownKey) - now) / 1000 / 60);
            return interaction.reply({ content: `⌛ Você só pode alertar a staff novamente em ${timeLeft} minuto(s).`, ephemeral: true });
        }

        const settings = await db.get('SELECT support_role_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
        if (settings?.support_role_id) {
            await interaction.channel.send(`<@&${settings.support_role_id}>, o utilizador ${interaction.user} está a solicitar atenção neste ticket.`);
        }
        
        cooldowns.set(cooldownKey, now + cooldownTime);
        await interaction.reply({ content: '✅ A staff foi notificada.', ephemeral: true });
    }
};

const closeTicketPromptHandler = {
    customId: (id) => id.startsWith('close_ticket_prompt:'),
    async execute(interaction) {
        const ticketId = interaction.customId.split(':')[1];
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`confirm_close_ticket:${ticketId}`).setLabel('Confirmar Fecho').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
        );
        await interaction.reply({ content: 'Você tem a certeza de que deseja fechar este ticket? Esta ação não pode ser desfeita.', components: [row], ephemeral: true });
    }
};

const confirmCloseTicketHandler = {
    customId: (id) => id.startsWith('confirm_close_ticket:'),
    async execute(interaction) {
        await interaction.update({ content: '🔒 A fechar e arquivar o ticket em 10 segundos...', components: [] });
        const ticketId = interaction.customId.split(':')[1];
        
        const ticket = await db.get('SELECT * FROM tickets WHERE ticket_id = $1 AND is_open = TRUE', [ticketId]);
        if (!ticket) return;

        const settings = await db.get('SELECT ticket_log_channel_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
        if (settings.ticket_log_channel_id) {
            const logChannel = await interaction.guild.channels.fetch(settings.ticket_log_channel_id).catch(() => null);
            if(logChannel) {
                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                const content = messages.reverse().map(m => `[${new Date(m.createdAt).toLocaleString('pt-BR')}] ${m.author.tag}: ${m.attachments.size > 0 ? m.attachments.first().url : m.content}`).join('\n');
                const transcriptFile = new AttachmentBuilder(Buffer.from(content), { name: `transcript-${interaction.channel.name}.txt` });
                const user = await interaction.client.users.fetch(ticket.user_id);
                
                const logEmbed = new EmbedBuilder()
                    .setTitle(`Ticket #${ticketId} Fechado`)
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL()})
                    .addFields(
                        { name: 'Aberto por', value: `${user.tag} (${user.id})`, inline: true},
                        { name: 'Fechado por', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true},
                    )
                    .setColor(0xED4245)
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed], files: [transcriptFile] });
            }
        }

        await db.run('UPDATE tickets SET is_open = FALSE, closed_by = $1 WHERE ticket_id = $2', [interaction.user.id, ticketId]);
        
        setTimeout(async () => {
            try { await interaction.channel.delete('Ticket fechado e arquivado.'); } catch (error) { console.error(`Falha ao apagar o canal do ticket ${interaction.channelId}:`, error); }
        }, 10000);
    }
};

const cancelCloseHandler = { customId: 'cancel_close', async execute(interaction) { await interaction.message.delete(); } }

module.exports = [
    openTicketHandler,
    claimTicketHandler,
    transcriptTicketHandler,
    alertStaffHandler,
    closeTicketPromptHandler,
    confirmCloseTicketHandler,
    cancelCloseHandler,
];


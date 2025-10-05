// Ficheiro: interactions/ponto_handler.js (VERSÃO FINAL E COMPLETA)

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db.js');
const { getPontoLogInitialEmbed } = require('../views/ponto_views.js');

// --- Funções Utilitárias ---

/**
 * Formata milissegundos para uma string de tempo legível (HH:MM:SS).
 * @param {number} ms - A duração em milissegundos.
 */
function formatDuration(ms) {
    if (ms < 0) ms = 0;
    const time = {
        h: Math.floor(ms / 3600000),
        m: Math.floor((ms / 60000) % 60),
        s: Math.floor((ms / 1000) % 60),
    };
    return Object.entries(time)
        .map(([key, val]) => `${val.toString().padStart(2, '0')}`)
        .join(':');
}

/**
 * Calcula a duração total de uma sessão, descontando as pausas.
 * @param {object} session A sessão do banco de dados.
 * @returns {Promise<number>} Duração total em milissegundos.
 */
async function calculateSessionDuration(session) {
    const endTime = session.end_time || Date.now();
    let totalDurationMs = endTime - session.start_time;

    const pausas = await db.all('SELECT * FROM ponto_pausas WHERE session_id = $1', [session.session_id]);
    const totalPauseMs = pausas.reduce((acc, p) => {
        const resumeTime = p.resume_time || (session.status === 'paused' ? Date.now() : endTime);
        return acc + (resumeTime - p.pause_time);
    }, 0);

    totalDurationMs -= totalPauseMs;
    return totalDurationMs > 0 ? totalDurationMs : 0;
}

/**
 * Atualiza a mensagem de log com uma nova ação.
 */
async function updateLogMessage(interaction, logMessageId, newAction, color, title, finalDuration = null) {
    const settings = await db.get('SELECT ponto_log_channel_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
    if (!settings?.ponto_log_channel_id || !logMessageId) return;

    try {
        const logChannel = await interaction.guild.channels.fetch(settings.ponto_log_channel_id);
        const logMessage = await logChannel.messages.fetch(logMessageId);
        const oldEmbed = logMessage.embeds[0];
        
        let newDescription = oldEmbed.fields.find(f => f.name === 'Histórico de Ações').value + `\n${newAction}`;

        const newEmbed = new EmbedBuilder(oldEmbed.toJSON())
            .setColor(color)
            .setTitle(title);
            
        newEmbed.setFields(
            oldEmbed.fields.filter(f => f.name !== 'Duração Total').map(field => {
                if (field.name === 'Histórico de Ações') {
                    return { name: field.name, value: newDescription };
                }
                return field;
            })
        );

        if (finalDuration) {
            newEmbed.addFields({ name: 'Duração Total', value: finalDuration });
        }

        await logMessage.edit({ embeds: [newEmbed] });
    } catch (error) {
        console.error('[ERRO DE LOG] Falha ao atualizar a mensagem de log do ponto:', error);
    }
}

// --- Handlers dos Botões Principais ---

const iniciarPontoHandler = {
    customId: 'ponto_iniciar',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);

        if (!settings?.ponto_role_id || !settings.ponto_log_channel_id || !settings.ponto_temp_category_id) {
            return interaction.editReply('❌ O sistema de ponto não está configurado. Fale com um administrador para definir o cargo, canal de logs e a categoria de canais temporários.');
        }
        
        const activeSession = await db.get('SELECT * FROM ponto_sessoes WHERE user_id = $1 AND guild_id = $2 AND status != $3', [interaction.user.id, interaction.guildId, 'completed']);
        if (activeSession) return interaction.editReply('⚠️ Você já possui uma sessão de ponto ativa.');

        if (settings.ponto_required_voice_channels?.length > 0) {
            const memberVoiceState = interaction.member.voice;
            if (!memberVoiceState.channel || !settings.ponto_required_voice_channels.includes(memberVoiceState.channel.id)) {
                 return interaction.editReply(`❌ Para iniciar o ponto, você precisa estar num dos canais de voz de serviço.`);
            }
        }

        try {
            const member = interaction.member;

            // Criação do canal temporário
            const tempChannel = await interaction.guild.channels.create({
                name: `servico-${member.displayName.substring(0, 20)}`,
                type: ChannelType.GuildText,
                parent: settings.ponto_temp_category_id,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    // Opcional: Adicionar um cargo de staff que pode ver todos os canais
                    ...(settings.support_role_id ? [{ id: settings.support_role_id, allow: [PermissionFlagsBits.ViewChannel] }] : [])
                ],
                topic: `Canal de serviço temporário para ${interaction.user.tag}. Sessão iniciada em: ${new Date().toLocaleString()}`
            });

            await member.roles.add(settings.ponto_role_id);
            if (settings.ponto_nickname_prefix) {
                const newNickname = `${settings.ponto_nickname_prefix} ${member.displayName}`.replace(new RegExp(`^${settings.ponto_nickname_prefix}\\s*${settings.ponto_nickname_prefix}\\s*`), `${settings.ponto_nickname_prefix} `).trim();
                await member.setNickname(newNickname.substring(0, 32));
            }

            const logChannel = await interaction.guild.channels.fetch(settings.ponto_log_channel_id);
            const logMessage = await logChannel.send({ embeds: [getPontoLogInitialEmbed(interaction.user)] });
            
            await db.run(
                'INSERT INTO ponto_sessoes (guild_id, user_id, start_time, status, log_message_id, temp_channel_id) VALUES ($1, $2, $3, $4, $5, $6)',
                [interaction.guildId, interaction.user.id, Date.now(), 'active', logMessage.id, tempChannel.id]
            );

            await tempChannel.send({ content: `${interaction.user}, bem-vindo(a) ao seu canal de serviço temporário! Use este espaço para anotações e logs do seu turno.` });
            await interaction.editReply(`✅ Ponto iniciado com sucesso! O seu canal de serviço é ${tempChannel}.`);
        } catch (error) {
            console.error('[ERRO INICIAR PONTO]', error);
            await interaction.editReply('❌ Ocorreu um erro ao iniciar o seu ponto. Verifique se tenho permissões para gerir cargos, apelidos e canais.');
        }
    }
};

const encerrarPontoHandler = {
    customId: 'ponto_encerrar',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const session = await db.get('SELECT * FROM ponto_sessoes WHERE user_id = $1 AND guild_id = $2 AND status != $3', [interaction.user.id, interaction.guildId, 'completed']);
        if (!session) return interaction.editReply('⚠️ Você não tem uma sessão de ponto ativa para encerrar.');
        
        const settings = await db.get('SELECT ponto_role_id, ponto_nickname_prefix FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);

        try {
            const member = interaction.member;
            if(settings.ponto_role_id) await member.roles.remove(settings.ponto_role_id).catch(() => {});
            if (settings.ponto_nickname_prefix && member.nickname?.startsWith(settings.ponto_nickname_prefix)) {
                 await member.setNickname(member.displayName.replace(settings.ponto_nickname_prefix, '').trim()).catch(() => {});
            }

            const endTime = Date.now();
            if (session.status === 'paused') {
                await db.run('UPDATE ponto_pausas SET resume_time = $1 WHERE session_id = $2 AND resume_time IS NULL', [endTime, session.session_id]);
            }
            
            await db.run('UPDATE ponto_sessoes SET end_time = $1, status = $2 WHERE session_id = $3', [endTime, 'completed', session.session_id]);
            
            const totalDurationMs = await calculateSessionDuration({ ...session, end_time: endTime });
            const formattedDuration = formatDuration(totalDurationMs);
            
            const action = `⏹️ **Fim:** <t:${Math.floor(endTime / 1000)}:R>`;
            await updateLogMessage(interaction, session.log_message_id, action, 'Red', 'Sessão de Ponto Finalizada', formattedDuration);

            await interaction.editReply(`✅ Ponto encerrado! Sua sessão durou **${formattedDuration}**.`);

            // Exclusão do canal temporário após um pequeno delay
            if (session.temp_channel_id) {
                setTimeout(async () => {
                    const channelToDelete = await interaction.guild.channels.fetch(session.temp_channel_id).catch(() => null);
                    if (channelToDelete) await channelToDelete.delete('Sessão de ponto encerrada.').catch(err => console.error("Falha ao deletar canal de ponto:", err));
                }, 5000); // Delay de 5 segundos para o usuário ver a mensagem final
            }
        } catch (error) {
            console.error('[ERRO ENCERRAR PONTO]', error);
            await interaction.editReply('❌ Ocorreu um erro ao encerrar seu ponto.');
        }
    }
};

const pausarRetomarPontoHandler = {
    customId: 'ponto_pausar',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const session = await db.get('SELECT * FROM ponto_sessoes WHERE user_id = $1 AND guild_id = $2 AND status != $3', [interaction.user.id, interaction.guildId, 'completed']);
        if (!session) return interaction.editReply('⚠️ Você não tem uma sessão de ponto ativa.');

        const now = Date.now();
        if (session.status === 'active') {
            await db.run('UPDATE ponto_sessoes SET status = $1 WHERE session_id = $2', ['paused', session.session_id]);
            await db.run('INSERT INTO ponto_pausas (session_id, pause_time) VALUES ($1, $2)', [session.session_id, now]);
            
            const action = `⏸️ **Pausa:** <t:${Math.floor(now / 1000)}:R>`;
            await updateLogMessage(interaction, session.log_message_id, action, 'Yellow', 'Sessão de Ponto em Pausa');
            
            await interaction.editReply('⏸️ Seu ponto foi pausado.');
        } else if (session.status === 'paused') {
            await db.run('UPDATE ponto_sessoes SET status = $1 WHERE session_id = $2', ['active', session.session_id]);
            await db.run('UPDATE ponto_pausas SET resume_time = $1 WHERE session_id = $2 AND resume_time IS NULL', [now, session.session_id]);

            const action = `▶️ **Retomada:** <t:${Math.floor(now / 1000)}:R>`;
            await updateLogMessage(interaction, session.log_message_id, action, 'Green', 'Sessão de Ponto Ativa');

            await interaction.editReply('▶️ Seu ponto foi retomado.');
        }
    }
};

// --- Handlers dos Botões de Informação ---

const meuPontoHandler = {
    customId: 'ponto_meu_ponto',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const sessions = await db.all('SELECT * FROM ponto_sessoes WHERE user_id = $1 AND guild_id = $2 ORDER BY start_time DESC', [interaction.user.id, interaction.guildId]);
        if (sessions.length === 0) return interaction.editReply("Você ainda não tem registros de ponto.");

        let totalTime = 0;
        let weeklyTime = 0;
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        for (const session of sessions) {
            const duration = await calculateSessionDuration(session);
            totalTime += duration;
            if (session.start_time > oneWeekAgo) {
                weeklyTime += duration;
            }
        }

        const lastSessionsDescription = (await Promise.all(sessions.slice(0, 5).map(async (session) => {
            const duration = await calculateSessionDuration(session);
            return `• <t:${Math.floor(session.start_time / 1000)}:d> - **${formatDuration(duration)}**`;
        }))).join('\n');

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📊 Suas Horas de Serviço`)
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .addFields(
                { name: 'Total de Horas', value: formatDuration(totalTime), inline: true },
                { name: 'Horas na Semana', value: formatDuration(weeklyTime), inline: true },
                { name: 'Últimas 5 Sessões', value: lastSessionsDescription || 'Nenhuma sessão recente.' }
            )
            .setTimestamp();
            
        await interaction.editReply({ embeds: [embed] });
    }
};

const rankingPontoHandler = {
    customId: 'ponto_ranking',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sessions = await db.all('SELECT * FROM ponto_sessoes WHERE guild_id = $1', [interaction.guildId]);
        if (sessions.length === 0) return interaction.editReply("Ainda não há registros de ponto no servidor.");

        const userTimes = {};
        for (const session of sessions) {
            const duration = await calculateSessionDuration(session);
            userTimes[session.user_id] = (userTimes[session.user_id] || 0) + duration;
        }
        
        const sortedUsers = Object.entries(userTimes).sort(([, a], [, b]) => b - a).slice(0, 10);
        if (sortedUsers.length === 0) return interaction.editReply("Nenhum tempo foi computado ainda.");

        const description = (await Promise.all(sortedUsers.map(async ([userId, totalMs], index) => {
            const member = await interaction.guild.members.fetch(userId).catch(() => ({ user: { tag: 'Usuário Desconhecido' } }));
            return `**${index + 1}.** ${member.user} - \`${formatDuration(totalMs)}\``;
        }))).join('\n');

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Ranking de Atividade')
            .setDescription(description)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

module.exports = [
    iniciarPontoHandler,
    encerrarPontoHandler,
    pausarRetomarPontoHandler,
    meuPontoHandler,
    rankingPontoHandler
];
const { getPontoPanelPayload } = require('../views/ponto_views');
const db = require('../database/db');

const prefix = 'ponto';

async function updatePontoMonitor(guild) {
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guild.id]);
    if (!settings.ponto_monitor_channel_id || !settings.ponto_monitor_message_id) return;

    const channel = await guild.channels.fetch(settings.ponto_monitor_channel_id).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(settings.ponto_monitor_message_id).catch(() => null);
    if (!message) return;

    const inService = await db.all(
        'SELECT user_id, clock_in_time FROM ponto_records WHERE guild_id = $1 AND clock_out_time IS NULL ORDER BY clock_in_time ASC',
        [guild.id]
    );
    
    let content = "## 🟢 Monitor de Ponto | Membros em Serviço\n\n";
    if (inService.length === 0) {
        content += "_Nenhum membro em serviço no momento._";
    } else {
        content += inService.map(record => {
            // Formato de tempo relativo do Discord: <t:timestamp:R>
            const timestamp = Math.floor(new Date(record.clock_in_time).getTime() / 1000);
            return `- <@${record.user_id}> - Iniciou ${`<t:${timestamp}:R>`}`;
        }).join('\n');
    }

    await message.edit({ content });
}

async function handle(interaction) {
    const [_, action] = interaction.customId.split(':');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const member = interaction.member;

    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
    if (!settings || !settings.ponto_role_id) {
        return interaction.reply({ content: 'O sistema de ponto não está configurado neste servidor.', ephemeral: true });
    }

    if (action === 'clock_in') {
        await db.run(
            'INSERT INTO ponto_records (guild_id, user_id, clock_in_time) VALUES ($1, $2, $3)',
            [guildId, userId, new Date()]
        );
        await member.roles.add(settings.ponto_role_id).catch(console.error);
        await interaction.reply({ content: 'Sua entrada foi registrada com sucesso!', ephemeral: true });
    } else if (action === 'clock_out') {
        const record = await db.get(
            'SELECT * FROM ponto_records WHERE guild_id = $1 AND user_id = $2 AND clock_out_time IS NULL ORDER BY clock_in_time DESC LIMIT 1',
            [guildId, userId]
        );

        if (!record) {
             return interaction.reply({ content: 'Você não possui um registro de entrada aberto para fechar.', ephemeral: true });
        }

        const clockOutTime = new Date();
        const clockInTime = new Date(record.clock_in_time);
        const duration = Math.round((clockOutTime - clockInTime) / (1000 * 60)); // Duração em minutos

        await db.run(
            'UPDATE ponto_records SET clock_out_time = $1, total_duration_minutes = $2 WHERE id = $3',
            [clockOutTime, duration, record.id]
        );

        await member.roles.remove(settings.ponto_role_id).catch(console.error);
        await interaction.reply({ content: `Sua saída foi registrada! Duração do serviço: **${duration} minutos**.`, ephemeral: true });
    }

    // Atualiza o monitor e o painel do usuário após a ação
    await updatePontoMonitor(interaction.guild);
    
    // Atualiza o painel de ponto original para que o botão mude de estado (Entrada -> Saída ou vice-versa)
    const newPanelPayload = await getPontoPanelPayload(interaction.user, settings);
    await interaction.message.edit(newPanelPayload);
}

module.exports = { prefix, handle };
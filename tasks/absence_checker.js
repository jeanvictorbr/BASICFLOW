// Ficheiro: tasks/absence_checker.js
// Responsável por verificar e finalizar ausências expiradas.

const db = require('../database/db.js');
const { EmbedBuilder } = require('discord.js');

const CHECK_INTERVAL = 60 * 60 * 1000; // Verifica a cada 1 hora (em milissegundos)

async function checkExpiredAbsences(client) {
    console.log('[ABSENCE CHECKER] A procurar por ausências expiradas...');
    const now = Date.now();
    
    // Procura por ausências que foram aprovadas e cuja data de fim já passou.
    const expiredAbsences = await db.all(
        "SELECT * FROM absences WHERE status = 'approved' AND end_date < $1",
        [now]
    );

    if (expiredAbsences.length === 0) {
        console.log('[ABSENCE CHECKER] Nenhuma ausência expirada encontrada.');
        return;
    }

    console.log(`[ABSENCE CHECKER] Encontradas ${expiredAbsences.length} ausências expiradas. A processar...`);

    for (const absence of expiredAbsences) {
        try {
            const guild = await client.guilds.fetch(absence.guild_id).catch(() => null);
            if (!guild) {
                console.error(`[ABSENCE CHECKER] Servidor ${absence.guild_id} não encontrado.`);
                continue;
            }

            const member = await guild.members.fetch(absence.user_id).catch(() => null);
            const settings = await db.get('SELECT absence_role_id, absence_channel_id FROM guild_settings WHERE guild_id = $1', [guild.id]);

            if (!settings || !settings.absence_role_id) continue;

            // Remove o cargo se o membro ainda estiver no servidor
            if (member && member.roles.cache.has(settings.absence_role_id)) {
                await member.roles.remove(settings.absence_role_id);
                console.log(`[ABSENCE CHECKER] Cargo de ausente removido de ${member.user.tag} no servidor ${guild.name}.`);
            }

            // Atualiza o status na base de dados para 'expired' para não ser verificado novamente.
            await db.run("UPDATE absences SET status = 'expired' WHERE absence_id = $1", [absence.absence_id]);

            // Envia uma notificação para o canal de logs de ausência, se configurado.
            if (settings.absence_channel_id) {
                const logChannel = await guild.channels.fetch(settings.absence_channel_id).catch(() => null);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0x3498DB)
                        .setTitle('Fim de Período de Ausência')
                        .setDescription(`O período de ausência de ${member ? member.user.tag : `(ID: ${absence.user_id})`} terminou.`)
                        .addFields(
                            { name: 'Ação', value: 'O cargo de ausente foi removido automaticamente.' }
                        )
                        .setTimestamp();
                    
                    if (member) {
                        logEmbed.setThumbnail(member.user.displayAvatarURL());
                    }
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        } catch (error) {
            console.error(`[ABSENCE CHECKER] Erro ao processar ausência ID ${absence.absence_id}:`, error);
        }
    }
}

function initialize(client) {
    // Inicia a verificação imediatamente e depois a cada X tempo definido no CHECK_INTERVAL.
    checkExpiredAbsences(client);
    setInterval(() => checkExpiredAbsences(client), CHECK_INTERVAL);
    console.log('[ABSENCE CHECKER] Verificador de ausências iniciado.');
}

module.exports = { initialize };
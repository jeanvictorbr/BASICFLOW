// Ficheiro: interactions/absence_handler.js
// Responsável pela interação do utilizador ao pedir ausência.

const db = require('../database/db.js');
const { getAbsenceModal, getAbsenceApprovalPayload } = require('../views/absence_views.js');

// Função para converter data DD/MM/AAAA para timestamp
function dateToTimestamp(dateString) {
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    const date = new Date(+parts[2], parts[1] - 1, +parts[0]);
    return date.getTime();
}

const initiateAbsenceHandler = {
    customId: 'initiate_absence',
    async execute(interaction) {
        await interaction.showModal(getAbsenceModal());
    }
};

const submitAbsenceHandler = {
    customId: 'absence_modal_submit',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const startDateStr = interaction.fields.getTextInputValue('start_date_input');
        const endDateStr = interaction.fields.getTextInputValue('end_date_input');
        const reason = interaction.fields.getTextInputValue('reason_input');

        const startTime = dateToTimestamp(startDateStr);
        const endTime = dateToTimestamp(endDateStr);

        if (!startTime || !endTime || endTime < startTime) {
            return interaction.editReply('❌ As datas fornecidas são inválidas. Por favor, use o formato `DD/MM/AAAA` e certifique-se de que a data de fim é posterior à de início.');
        }

        const settings = await db.get('SELECT absence_channel_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
        if (!settings?.absence_channel_id) {
            return interaction.editReply('❌ Ocorreu um erro interno. A staff foi notificada.');
        }

        const approvalChannel = await interaction.guild.channels.fetch(settings.absence_channel_id).catch(() => null);
        if (!approvalChannel) {
            return interaction.editReply('❌ Ocorreu um erro interno (canal não encontrado). A staff foi notificada.');
        }

        try {
            await db.run(
                'INSERT INTO absences (guild_id, user_id, start_date, end_date, reason) VALUES ($1, $2, $3, $4, $5)',
                [interaction.guildId, interaction.user.id, startTime, endTime, reason]
            );

            await approvalChannel.send(getAbsenceApprovalPayload(interaction, startDateStr, endDateStr, reason));
            await interaction.editReply({ content: '✅ O seu pedido de ausência foi enviado para análise da staff.' });

        } catch (error) {
            console.error(`[DB_INSERT_ERROR] Falha ao inserir ausência para o user ${interaction.user.id}:`, error);
            await interaction.editReply('❌ Ocorreu um erro ao enviar o seu pedido. Tente novamente mais tarde.');
        }
    }
};

module.exports = [
    initiateAbsenceHandler,
    submitAbsenceHandler
];
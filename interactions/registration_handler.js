const db = require('../database/db.js');
const { getRegistrationModal, getRegistrationApprovalPayload } = require('../views/registration_views.js');

// Handler para o botão "Iniciar Registo"
const initiateRegistrationHandler = {
    customId: 'initiate_registration',
    async execute(interaction) {
        const modal = getRegistrationModal();
        await interaction.showModal(modal);
    }
};

// Handler para a submissão do formulário (modal)
const submitRegistrationHandler = {
    customId: 'registration_modal_submit',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const rpName = interaction.fields.getTextInputValue('rp_name_input');
        const gameId = interaction.fields.getTextInputValue('game_id_input');

        const settings = await db.get('SELECT registration_channel_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
        if (!settings?.registration_channel_id) {
            console.error(`[REGISTRATION_ERROR] Guild ${interaction.guildId} não tem um canal de registo configurado.`);
            return interaction.editReply('❌ Ocorreu um erro interno. A staff foi notificada.');
        }

        const approvalChannel = await interaction.guild.channels.fetch(settings.registration_channel_id).catch(() => null);
        if (!approvalChannel) {
            console.error(`[REGISTRATION_ERROR] Canal de registo (${settings.registration_channel_id}) não encontrado na guild ${interaction.guildId}.`);
            return interaction.editReply('❌ Ocorreu um erro interno. A staff foi notificada.');
        }

        try {
            // Guarda o registo na base de dados
            const result = await db.run(
                'INSERT INTO registrations (guild_id, user_id, rp_name, game_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING registration_id',
                [interaction.guildId, interaction.user.id, rpName, gameId, 'pending']
            );

            // Envia para o canal da staff
            const approvalPayload = getRegistrationApprovalPayload(interaction, rpName, gameId);
            await approvalChannel.send(approvalPayload);

            await interaction.editReply({ content: '✅ O seu pedido de registo foi enviado para a staff e será analisado em breve!' });

        } catch (error) {
            console.error(`[DB_INSERT_ERROR] Falha ao inserir registo para o user ${interaction.user.id} na guild ${interaction.guildId}:`, error);
            await interaction.editReply('❌ Ocorreu um erro ao enviar o seu pedido. Por favor, tente novamente mais tarde.');
        }
    }
};

// Precisamos exportar os handlers para que o handler.js os carregue
module.exports = [
    initiateRegistrationHandler,
    submitRegistrationHandler
];

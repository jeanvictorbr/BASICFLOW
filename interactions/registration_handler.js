// NOVO ARQUIVO
const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const { getRegistrationApprovalPayload } = require('../views/registration_views');
const db = require('../database/db');

const prefix = 'register';

async function handle(interaction) {
    const [_, action] = interaction.customId.split(':');

    if (action === 'start') {
        const modal = new ModalBuilder()
            .setCustomId('register:submit')
            .setTitle('Formulário de Registro');
            
        // Defina aqui as perguntas do seu formulário
        const nameInput = new TextInputBuilder().setCustomId('nome').setLabel("Qual é o seu nome?").setStyle(TextInputStyle.Short).setRequired(true);
        const ageInput = new TextInputBuilder().setCustomId('idade').setLabel("Qual é a sua idade?").setStyle(TextInputStyle.Short).setRequired(true);
        const reasonInput = new TextInputBuilder().setCustomId('motivo').setLabel("Por que você quer se juntar?").setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(ageInput),
            new ActionRowBuilder().addComponents(reasonInput)
        );

        await interaction.showModal(modal);

    } else if (interaction.isModalSubmit() && action === 'submit') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guild.id]);
        if (!settings.registration_log_channel_id || !settings.registration_staff_role_id) {
            return interaction.editReply({ content: '❌ O sistema de registro não está totalmente configurado. Contate um administrador.' });
        }

        // Coleta os dados do modal
        const submissionData = {};
        for (const component of interaction.components) {
            const input = component.components[0];
            submissionData[input.customId] = input.value;
        }

        // Salva no banco de dados
        const result = await db.get(
            'INSERT INTO registrations (guild_id, user_id, status, submission_data) VALUES ($1, $2, $3, $4) RETURNING id',
            [interaction.guild.id, interaction.user.id, 'pending', submissionData]
        );
        const submissionId = result.id;
        
        // Envia para o canal da staff
        const logChannel = await interaction.guild.channels.fetch(settings.registration_log_channel_id).catch(() => null);
        if (logChannel) {
            submissionData.staffRoleId = settings.registration_staff_role_id; // Adiciona o cargo para poder marcar
            const approvalPayload = getRegistrationApprovalPayload(submissionData, interaction.user, submissionId);
            await logChannel.send(approvalPayload);
            await interaction.editReply({ content: '✅ Sua solicitação de registro foi enviada com sucesso e está aguardando aprovação!' });
        } else {
            await interaction.editReply({ content: '❌ Ocorreu um erro interno. O canal de logs de registro não foi encontrado.' });
        }
    }
}

module.exports = { prefix, handle };
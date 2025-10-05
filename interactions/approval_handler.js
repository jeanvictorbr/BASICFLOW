// NOVO ARQUIVO
const { MessageFlags, EmbedBuilder } = require('discord.js');
const db = require('../database/db');

const prefix = 'approval';

async function handle(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    
    // Formato do customId: approval:contexto_acao:id -> approval:reg_approve:123
    const [_, contextAction, submissionId] = interaction.customId.split(':');
    const [context, action] = contextAction.split('_');

    if (context === 'reg') {
        await handleRegistration(interaction, action, submissionId);
    }
    // Adicionar outros contextos aqui no futuro (ex: 'absence')
}

async function handleRegistration(interaction, action, submissionId) {
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guild.id]);
    const staffRoleId = settings.registration_staff_role_id;

    if (!interaction.member.roles.cache.has(staffRoleId)) {
        return interaction.editReply({ content: '❌ Você não tem permissão para executar esta ação.' });
    }

    const registration = await db.get('SELECT * FROM registrations WHERE id = $1', [submissionId]);
    if (!registration) {
        return interaction.editReply({ content: '❌ Este registro não foi encontrado no banco de dados.' });
    }
    if (registration.status !== 'pending') {
        const handler = await interaction.guild.members.fetch(registration.handled_by);
        return interaction.editReply({ content: `⚠️ Este registro já foi finalizado como **${registration.status}** por ${handler.user.tag}.` });
    }

    const targetMember = await interaction.guild.members.fetch(registration.user_id).catch(() => null);
    if (!targetMember) {
        return interaction.editReply({ content: '❌ O membro que solicitou o registro não está mais neste servidor.' });
    }
    
    const newStatus = action === 'approve' ? 'approved' : 'denied';

    // Atualiza o banco de dados
    await db.run(
        'UPDATE registrations SET status = $1, handled_by = $2 WHERE id = $3',
        [newStatus, interaction.user.id, submissionId]
    );

    const originalMessage = interaction.message;
    const originalEmbed = new EmbedBuilder(originalMessage.embeds[0].data);
    let dmMessage = '';

    if (newStatus === 'approved') {
        originalEmbed.setColor('#2ECC71').setFooter({ text: `Aprovado por ${interaction.user.tag}` });
        dmMessage = '🎉 Parabéns! Seu registro em nosso servidor foi aprovado.';
        if (settings.registration_approved_role_id) {
            await targetMember.roles.add(settings.registration_approved_role_id);
            dmMessage += ` Você recebeu o cargo de membro.`;
        }
    } else { // denied
        originalEmbed.setColor('#E74C3C').setFooter({ text: `Reprovado por ${interaction.user.tag}` });
        dmMessage = 'Sua solicitação de registro em nosso servidor foi reprovada.';
    }

    // Envia DM e edita a mensagem da staff
    await targetMember.send(dmMessage).catch(() => console.log(`Não foi possível enviar DM para ${targetMember.user.tag}`));
    await originalMessage.edit({ embeds: [originalEmbed], components: [] }); // Remove os botões
    await interaction.editReply({ content: `✅ Ação executada com sucesso. O usuário foi notificado.` });
}


module.exports = { prefix, handle };
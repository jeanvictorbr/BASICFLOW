const { EmbedBuilder } = require('discord.js');
const db = require('../database/db.js');

const approvalHandler = {
    // Esta função deteta se o ID de um botão começa com 'approve_' ou 'reject_'
    customId: (id) => id.startsWith('approve_registration:') || id.startsWith('reject_registration:'),

    async execute(interaction) {
        await interaction.deferUpdate();

        const [action, targetUserId] = interaction.customId.split(':');
        const isApproving = action === 'approve_registration';
        
        try {
            const settings = await db.get('SELECT registered_role_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
            if (!settings?.registered_role_id && isApproving) {
                return interaction.followUp({ content: '❌ Não foi possível aprovar. O cargo de "Membro Registado" não está configurado.', ephemeral: true });
            }

            const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
            if (!targetMember) {
                return interaction.followUp({ content: '❌ O utilizador não se encontra mais neste servidor.', ephemeral: true });
            }

            const dbStatus = isApproving ? 'approved' : 'rejected';
            
            // Atualiza o status na base de dados
            await db.run(
                'UPDATE registrations SET status = $1, approver_id = $2 WHERE guild_id = $3 AND user_id = $4 AND status = $5',
                [dbStatus, interaction.user.id, interaction.guildId, targetUserId, 'pending']
            );

            // Adiciona o cargo se for aprovação
            if (isApproving) {
                await targetMember.roles.add(settings.registered_role_id);
            }

            // Edita a mensagem original para mostrar o resultado
            const originalEmbed = interaction.message.embeds[0];
            const newEmbed = EmbedBuilder.from(originalEmbed)
                .setColor(isApproving ? 0x57F287 : 0xED4245) // Verde para aprovar, Vermelho para rejeitar
                .addFields({
                    name: `Status (${dbStatus})`,
                    value: `Ação processada por ${interaction.user}.`
                });

            // Desativa os botões
            await interaction.editReply({ embeds: [newEmbed], components: [] });
            
            // Envia uma DM ao utilizador (opcional, mas bom UX)
            await targetMember.send(`Olá! O seu registo no servidor **${interaction.guild.name}** foi **${isApproving ? 'aprovado' : 'rejeitado'}**.`).catch(err => {
                console.log(`Não foi possível enviar DM para o utilizador ${targetUserId}:`, err.message);
            });

        } catch (error) {
            console.error('Erro ao processar aprovação/rejeição:', error);
            await interaction.followUp({ content: '❌ Ocorreu um erro crítico ao processar esta ação.', ephemeral: true });
        }
    }
};

module.exports = approvalHandler;
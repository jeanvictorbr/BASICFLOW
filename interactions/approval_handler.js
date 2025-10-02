const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db.js');

const approvalHandler = {
    customId: (id) => id.startsWith('approve_registration:') || id.startsWith('reject_registration:'),

    async execute(interaction) {
        await interaction.deferUpdate();

        const [action, targetUserId] = interaction.customId.split(':');
        const isApproving = action === 'approve_registration';
        
        try {
            const settings = await db.get('SELECT registered_role_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
            
            if (isApproving && !settings?.registered_role_id) {
                return interaction.followUp({ content: '❌ **Falha na Aprovação:** O "Cargo de Membro Registado" não foi configurado. Use `/configurar` para definir um cargo.', ephemeral: true });
            }

            const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
            if (!targetMember) {
                interaction.editReply({ content: 'O utilizador original não se encontra mais no servidor.', components: [], embeds: [interaction.message.embeds[0]] });
                return;
            }

            // --- NOVAS VERIFICAÇÕES ---
            if (isApproving) {
                const botMember = interaction.guild.members.me;
                if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                     return interaction.followUp({ content: '❌ **Falha na Aprovação:** Eu não tenho a permissão de "Gerir Cargos" para fazer isto.', ephemeral: true });
                }

                const targetRole = await interaction.guild.roles.fetch(settings.registered_role_id);
                if (botMember.roles.highest.position <= targetRole.position) {
                    return interaction.followUp({ content: `❌ **Falha na Aprovação:** O cargo ${targetRole} está numa posição mais alta ou igual à minha. Por favor, arraste o meu cargo para cima da lista de cargos do servidor.`, ephemeral: true });
                }
            }
            // --- FIM DAS NOVAS VERIFICAÇÕES ---

            const dbStatus = isApproving ? 'approved' : 'rejected';
            
            const result = await db.run(
                'UPDATE registrations SET status = $1, approver_id = $2 WHERE guild_id = $3 AND user_id = $4 AND status = $5',
                [dbStatus, interaction.user.id, interaction.guildId, targetUserId, 'pending']
            );
            
            // Verifica se a base de dados foi realmente atualizada
            if (result.rowCount === 0) {
                 return interaction.followUp({ content: '⚠️ Este registo já foi processado por outro staff.', ephemeral: true });
            }

            if (isApproving) {
                await targetMember.roles.add(settings.registered_role_id);
            }

            const originalEmbed = interaction.message.embeds[0];
            const newEmbed = EmbedBuilder.from(originalEmbed)
                .setColor(isApproving ? 0x57F287 : 0xED4245)
                .setFields(
                    ...originalEmbed.fields, // Mantém os campos antigos
                    {
                        name: `Ação Realizada`,
                        value: `Registo **${dbStatus === 'approved' ? 'Aprovado' : 'Rejeitado'}** por ${interaction.user}.`
                    }
                );

            await interaction.editReply({ embeds: [newEmbed], components: [] });
            
            await targetMember.send(`Olá! O seu registo no servidor **${interaction.guild.name}** foi **${isApproving ? 'aprovado' : 'rejeitado'}** pela staff.`).catch(() => {});

        } catch (error) {
            console.error('Erro ao processar aprovação/rejeição:', error);
            await interaction.followUp({ content: '❌ Ocorreu um erro crítico ao processar esta ação.', ephemeral: true });
        }
    }
};

module.exports = approvalHandler;
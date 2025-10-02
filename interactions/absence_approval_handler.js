const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db.js');

const absenceApprovalHandler = {
    // Deteta se o ID do botão corresponde a uma ação de aprovação/rejeição de ausência
    customId: (id) => id.startsWith('approve_absence:') || id.startsWith('reject_absence:'),

    async execute(interaction) {
        await interaction.deferUpdate();

        const [action, targetUserId] = interaction.customId.split(':');
        const isApproving = action === 'approve_absence';
        
        try {
            const settings = await db.get('SELECT absence_role_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
            
            if (isApproving && !settings?.absence_role_id) {
                return interaction.followUp({ content: '❌ **Falha na Aprovação:** O "Cargo de Membro Ausente" não foi configurado. Use `/configurar` para o definir.', ephemeral: true });
            }

            const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
            if (!targetMember) {
                return interaction.editReply({ content: 'O utilizador original não se encontra mais no servidor.', components: [], embeds: [interaction.message.embeds[0]] });
            }

            // Verifica se o bot tem permissão para gerir o cargo de ausente
            const botMember = interaction.guild.members.me;
            if (isApproving) {
                if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                     return interaction.followUp({ content: '❌ **Falha na Aprovação:** Eu não tenho a permissão de "Gerir Cargos".', ephemeral: true });
                }
                const targetRole = await interaction.guild.roles.fetch(settings.absence_role_id);
                if (botMember.roles.highest.position <= targetRole.position) {
                    return interaction.followUp({ content: `❌ **Falha na Aprovação:** O cargo ${targetRole} está numa posição superior à minha na hierarquia.`, ephemeral: true });
                }
            }

            const dbStatus = isApproving ? 'approved' : 'rejected';
            
            // Atualiza o status do último pedido de ausência pendente do utilizador
            const result = await db.run(
                `UPDATE absences SET status = $1, approver_id = $2 
                 WHERE absence_id = (SELECT absence_id FROM absences WHERE guild_id = $3 AND user_id = $4 AND status = 'pending' ORDER BY absence_id DESC LIMIT 1)`,
                [dbStatus, interaction.user.id, interaction.guildId, targetUserId]
            );

            if (result.rowCount === 0) {
                 return interaction.followUp({ content: '⚠️ Este pedido de ausência já foi processado por outro staff.', ephemeral: true });
            }

            // Adiciona ou remove o cargo de ausente
            if (isApproving) {
                await targetMember.roles.add(settings.absence_role_id);
            } else {
                // Se for rejeitado e o membro tiver o cargo, remove-o (caso de segurança)
                if (targetMember.roles.cache.has(settings.absence_role_id)) {
                    await targetMember.roles.remove(settings.absence_role_id);
                }
            }

            // Atualiza a mensagem de log para mostrar que foi tratada
            const originalEmbed = interaction.message.embeds[0];
            const newEmbed = EmbedBuilder.from(originalEmbed)
                .setColor(isApproving ? 0x57F287 : 0xED4245) // Verde para aprovar, Vermelho para rejeitar
                .setFields(
                    ...originalEmbed.fields,
                    {
                        name: `Ação Realizada`,
                        value: `Pedido **${isApproving ? 'Aprovado' : 'Rejeitado'}** por ${interaction.user}.`
                    }
                );

            await interaction.editReply({ embeds: [newEmbed], components: [] });
            
            // Envia uma DM para o utilizador
            const dmEmbed = new EmbedBuilder()
                .setTitle(`Seu Pedido de Ausência em ${interaction.guild.name}`)
                .setColor(isApproving ? 0x57F287 : 0xED4245)
                .setDescription(`O seu pedido de ausência foi **${isApproving ? 'aprovado' : 'rejeitado'}** pela staff.`)
                .setThumbnail(interaction.guild.iconURL())
                .setTimestamp();
            
            if (isApproving) {
                dmEmbed.addFields({ name: 'Informação', value: 'Você recebeu o cargo de ausente e não será penalizado por inatividade durante o período informado.' });
            }

            await targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

        } catch (error) {
            console.error('Erro ao processar aprovação/rejeição de ausência:', error);
            await interaction.followUp({ content: '❌ Ocorreu um erro crítico ao processar esta ação.', ephemeral: true });
        }
    }
};

module.exports = absenceApprovalHandler;

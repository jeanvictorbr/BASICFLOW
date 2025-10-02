const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db.js');
// Importando as novas embeds
const { getApprovalDmEmbed, getRejectionDmEmbed } = require('../views/registration_views.js');

const approvalHandler = {
    customId: (id) => id.startsWith('approve_registration:') || id.startsWith('reject_registration:'),

    async execute(interaction) {
        await interaction.deferUpdate();

        const [action, targetUserId] = interaction.customId.split(':');
        const isApproving = action === 'approve_registration';
        
        try {
            // Buscamos a TAG junto com o cargo
            const settings = await db.get('SELECT registered_role_id, nickname_tag FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
            
            if (isApproving && !settings?.registered_role_id) {
                return interaction.followUp({ content: '❌ **Falha na Aprovação:** O "Cargo de Membro Registado" não foi configurado.', ephemeral: true });
            }

            const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
            if (!targetMember) {
                return interaction.editReply({ content: 'O utilizador original não se encontra mais no servidor.', components: [], embeds: [interaction.message.embeds[0]] });
            }

            const botMember = interaction.guild.members.me;
            if (isApproving) {
                // Verificando permissões de Gerir Cargos e Gerir Nicknames
                if (!botMember.permissions.has([PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageNicknames])) {
                     return interaction.followUp({ content: '❌ **Falha na Aprovação:** Eu preciso das permissões de "Gerir Cargos" e "Gerir Apelidos" para funcionar corretamente.', ephemeral: true });
                }
                const targetRole = await interaction.guild.roles.fetch(settings.registered_role_id);
                if (botMember.roles.highest.position <= targetRole.position) {
                    return interaction.followUp({ content: `❌ **Falha na Aprovação:** O cargo ${targetRole} está acima de mim.`, ephemeral: true });
                }
            }

            const dbStatus = isApproving ? 'approved' : 'rejected';
            
            // Buscamos o nome RP e ID do jogo na base de dados
            const registrationData = await db.get('SELECT rp_name, game_id FROM registrations WHERE guild_id = $1 AND user_id = $2 AND status = $3', [interaction.guildId, targetUserId, 'pending']);
            if (!registrationData) {
                 return interaction.followUp({ content: '⚠️ Este registo já foi processado ou não foi encontrado.', ephemeral: true });
            }

            await db.run('UPDATE registrations SET status = $1, approver_id = $2 WHERE guild_id = $3 AND user_id = $4 AND status = $5', [dbStatus, interaction.user.id, interaction.guildId, targetUserId, 'pending']);
            
            if (isApproving) {
                await targetMember.roles.add(settings.registered_role_id);
                
                // Monta e define o novo nickname
                const { rp_name, game_id } = registrationData;
                const tag = settings.nickname_tag;
                const newNickname = tag ? `[${tag}] ${rp_name} | ${game_id}` : `${rp_name} | ${game_id}`;

                try {
                    await targetMember.setNickname(newNickname.substring(0, 32)); // Limita a 32 caracteres
                } catch (nickError) {
                    console.error("Falha ao definir o nickname:", nickError.message);
                    interaction.followUp({ content: `⚠️ O cargo foi atribuído, mas não consegui alterar o nickname do utilizador (provavelmente ele tem um cargo superior ao meu).`, ephemeral: true });
                }
            }

            const originalEmbed = interaction.message.embeds[0];
            const newEmbed = EmbedBuilder.from(originalEmbed)
                .setColor(isApproving ? 0x57F287 : 0xED4245)
                // ADICIONANDO A THUMBNAIL AO LOG FINAL
                .setThumbnail(targetMember.displayAvatarURL({ dynamic: true, size: 128 }))
                .setFields( ...originalEmbed.fields, { name: `Ação Realizada`, value: `Registo **${dbStatus === 'approved' ? 'Aprovado' : 'Rejeitado'}** por ${interaction.user}.` });

            await interaction.editReply({ embeds: [newEmbed], components: [] });
            
            // Enviando as novas DMs em embed
            const dmEmbed = isApproving 
                ? getApprovalDmEmbed(interaction.guild, registrationData.rp_name, registrationData.game_id, settings.nickname_tag)
                : getRejectionDmEmbed(interaction.guild);

            await targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

        } catch (error) {
            console.error('Erro ao processar aprovação/rejeição:', error);
            await interaction.followUp({ content: '❌ Ocorreu um erro crítico ao processar esta ação.', ephemeral: true });
        }
    }
};

module.exports = approvalHandler;
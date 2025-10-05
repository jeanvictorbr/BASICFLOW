// NOVO ARQUIVO
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

/**
 * Cria o painel público para os usuários iniciarem o registro.
 * @param {object} settings As configurações do servidor.
 * @returns {import('discord.js').MessagePayload}
 */
function getRegistrationPanelPayload(settings) {
    const embed = new EmbedBuilder()
        .setColor('#1ABC9C')
        .setTitle('📝 Sistema de Registro')
        .setDescription('Para se juntar à nossa comunidade, por favor, inicie o seu processo de registro clicando no botão abaixo.')
        .setImage(settings.registration_panel_image_url || null);

    const components = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('register:start')
            .setLabel('Iniciar Registro')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
    );

    return { embeds: [embed], components: [components] };
}

/**
 * Cria o painel de aprovação/reprovação para a staff.
 * @param {object} submissionData Dados do formulário (ex: { name, age }).
 * @param {import('discord.js').User} user O usuário que se registrou.
 * @param {number} submissionId O ID do registro no banco de dados.
 * @returns {import('discord.js').MessagePayload}
 */
function getRegistrationApprovalPayload(submissionData, user, submissionId) {
    const embed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle(`Nova Solicitação de Registro - ${user.tag}`)
        .setAuthor({ name: `ID do Usuário: ${user.id}`, iconURL: user.displayAvatarURL() })
        .addFields(
            // Adiciona um campo para cada resposta do formulário
            ...Object.entries(submissionData).map(([key, value]) => ({
                name: key.charAt(0).toUpperCase() + key.slice(1), // Deixa a primeira letra maiúscula
                value: `\`\`\`${value}\`\`\``,
                inline: false,
            }))
        )
        .setTimestamp();

    const components = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`approval:reg_approve:${submissionId}`)
            .setLabel('Aprovar')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`approval:reg_deny:${submissionId}`)
            .setLabel('Reprovar')
            .setStyle(ButtonStyle.Danger)
    );

    return { content: `<@&${submissionData.staffRoleId}>`, embeds: [embed], components: [components] };
}

module.exports = { getRegistrationPanelPayload, getRegistrationApprovalPayload };
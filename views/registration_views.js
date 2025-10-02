const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Painel público que os membros verão
function getRegistrationPanelPayload() {
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📝 Central de Registo')
        .setDescription('Bem-vindo(a) à nossa comunidade!\n\nPara ter acesso completo ao servidor, por favor, inicie o seu registo clicando no botão abaixo. Você precisará fornecer algumas informações básicas.')
        .setImage('https://placehold.co/1200x400/0099FF/FFFFFF/png?text=BEM-VINDO(A)!)') // Imagem genérica
        .setFooter({ text: 'BasicFlow • Sistema de Registo' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('initiate_registration')
            .setLabel('Iniciar Registo')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📄')
    );

    return { embeds: [embed], components: [row] };
}

// Formulário (modal) que aparece ao clicar no botão
function getRegistrationModal() {
    return new ModalBuilder()
        .setCustomId('registration_modal_submit')
        .setTitle('Formulário de Registo')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('rp_name_input')
                    .setLabel('Qual é o nome do seu personagem (RP)?')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: John Doe')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('game_id_input')
                    .setLabel('Qual é o seu ID no jogo?')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: 12345')
                    .setRequired(true)
            )
        );
}

// Mensagem enviada para o canal da staff para aprovação
function getRegistrationApprovalPayload(interaction, rpName, gameId) {
    const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('📥 Novo Pedido de Registo')
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .addFields(
            { name: '👤 Utilizador', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: false },
            { name: '📝 Nome RP', value: `\`\`\`${rpName}\`\`\``, inline: true },
            { name: '🔢 ID no Jogo', value: `\`\`\`${gameId}\`\`\``, inline: true },
        )
        .setTimestamp();
        
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`approve_registration:${interaction.user.id}`) // Passamos o ID do user para a lógica
            .setLabel('Aprovar')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`reject_registration:${interaction.user.id}`)
            .setLabel('Rejeitar')
            .setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row] };
}

module.exports = {
    getRegistrationPanelPayload,
    getRegistrationModal,
    getRegistrationApprovalPayload
};

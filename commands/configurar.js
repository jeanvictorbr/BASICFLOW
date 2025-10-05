const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    // --- NOVOS COMPONENTES NECESSÁRIOS ---
    SectionBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');

// Simulação de um banco de dados para guardar as configurações
const serverConfig = {
    approvalChannel: '#registro-prisao',
    approverRole: '@AAAAA',
    approvedRole: '@BOT',
    namePattern: '{nome} ({id})',
    defaultMessage: 'Clique no botão abaixo para registrar-se.'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Mostra o painel de configurações do servidor no novo estilo.'),

    async execute(interaction) {

        // --- CONSTRUÇÃO DA MENSAGEM COM O NOVO MÉTODO ---

        // Seção 1: Canal de Aprovação
        const channelSection = new SectionBuilder()
            // CORREÇÃO AQUI: Trocado .addComponents por .setComponents
            .setComponents(
                new TextDisplayBuilder()
                    .setContent(`** Canal de Aprovação Atual**\nConfigure qual será o canal onde serão enviadas as solicitações.\n> ${serverConfig.approvalChannel}`)
            )
            .setAccessory(
                new ButtonBuilder()
                    .setCustomId('edit_channel_button')
                    .setLabel('Editar')
                    .setStyle(ButtonStyle.Primary)
            );

        // Seção 2: Cargo de Aprovador
        const approverRoleSection = new SectionBuilder()
            // CORREÇÃO AQUI: Trocado .addComponents por .setComponents
            .setComponents(
                new TextDisplayBuilder()
                    .setContent(`** Cargo de Aprovador Atual**\nConfigure qual será o cargo responsável por aprovar as solicitações.\n> ${serverConfig.approverRole}`)
            )
            .setAccessory(
                new ButtonBuilder()
                    .setCustomId('edit_role_button')
                    .setLabel('Editar')
                    .setStyle(ButtonStyle.Primary)
            );


        // Botões de ação principais (Ativar, Publicar, Voltar)
        const mainActionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('activate_button')
                    .setLabel('Ativar Registro')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('publish_button')
                    .setLabel('Publicar Painel')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('back_button')
                    .setLabel('Voltar')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Enviamos a resposta com os componentes e a FLAG necessária
        await interaction.reply({
            components: [
                channelSection,
                approverRoleSection,
                mainActionRow
            ],
            flags: [MessageFlags.IsComponentsV2],
            ephemeral: true
        });
    },
};
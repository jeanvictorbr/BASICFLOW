const { SlashCommandBuilder, ButtonStyle, MessageFlags } = require('discord.js');

// Simulação de um banco de dados
const serverConfig = {
    approvalChannel: '#registro-prisao',
    approverRole: '@Gerente',
};

// Os "Tipos de Componentes" que a API do Discord entende
const ComponentType = {
    ActionRow: 1,
    Button: 2,
    // Container: 7, // Removido, pois não é um componente de nível superior
    Section: 8,
    TextDisplay: 9,
};

// As flags que precisamos
const V2_FLAG = 1 << 15; // Flag para ativar os componentes v2
const EPHEMERAL_FLAG = 1 << 6; // Flag para tornar a mensagem efêmera

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Mostra o painel de configurações com Componentes V2.'),

    async execute(interaction) {
        
        const componentsPayload = [
            // ERRO ANTERIOR: Tudo estava dentro de um Container.
            // CORREÇÃO: Enviamos as Sections diretamente no array principal.

            // 1. A primeira Section: Canal de Aprovação
            {
                type: ComponentType.Section,
                accessory: {
                    type: ComponentType.Button,
                    style: ButtonStyle.Primary,
                    label: 'Editar',
                    custom_id: 'edit_channel_button',
                },
                components: [{
                    type: ComponentType.TextDisplay,
                    content: `** Canal de Aprovação Atual**\nConfigure o canal para enviar as solicitações.\n> ${serverConfig.approvalChannel}`
                }]
            },
            // 2. A segunda Section: Cargo de Aprovador
            {
                type: ComponentType.Section,
                accessory: {
                    type: ComponentType.Button,
                    style: ButtonStyle.Primary,
                    label: 'Editar',
                    custom_id: 'edit_role_button',
                },
                components: [{
                    type: ComponentType.TextDisplay,
                    content: `** Cargo de Aprovador Atual**\nConfigure o cargo que poderá aprovar as solicitações.\n> ${serverConfig.approverRole}`
                }]
            },
            // 3. A ActionRow com os botões de ação principais
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Success,
                        label: 'Ativar Registro',
                        custom_id: 'activate_button',
                    },
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Secondary,
                        label: 'Voltar',
                        custom_id: 'back_button',
                    }
                ]
            }
        ];

        // Enviamos a resposta com as flags combinadas
        await interaction.reply({
            components: componentsPayload,
            // CORREÇÃO: Combinamos as duas flags necessárias e removemos "ephemeral: true"
            flags: V2_FLAG | EPHEMERAL_FLAG, 
        });
    },
};
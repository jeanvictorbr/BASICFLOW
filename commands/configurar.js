const { SlashCommandBuilder, ButtonStyle } = require('discord.js');

// Simulação de um banco de dados para guardar as configurações
const serverConfig = {
    approvalChannel: '#registro-prisao',
    approverRole: '@Gerente',
};

// Os "Tipos de Componentes" que a API do Discord entende, conforme sua explicação.
const ComponentType = {
    ActionRow: 1,
    Button: 2,
    Container: 7, // O "card" principal
    Section: 8,   // A linha com texto e acessório
    TextDisplay: 9, // O bloco de texto
};

// A flag que você mencionou para ativar o novo sistema.
const IS_COMPONENTS_V2 = 1 << 15; // 32768

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Mostra o painel de configurações com Componentes V2.'),

    async execute(interaction) {
        
        // Vamos construir o array de componentes "manualmente", seguindo sua estrutura.
        const componentsPayload = [
            // 1. O Container Principal, que vai agrupar nossas seções.
            {
                type: ComponentType.Container,
                components: [
                    // 2. A primeira Section: Canal de Aprovação
                    {
                        type: ComponentType.Section,
                        // O "acessório" da seção é o nosso botão de editar
                        accessory: {
                            type: ComponentType.Button,
                            style: ButtonStyle.Primary,
                            label: 'Editar',
                            custom_id: 'edit_channel_button',
                        },
                        // O conteúdo da seção é o nosso TextDisplay
                        components: [{
                            type: ComponentType.TextDisplay,
                            content: `** Canal de Aprovação Atual**\nConfigure o canal para enviar as solicitações.\n> ${serverConfig.approvalChannel}`
                        }]
                    },
                    // 3. A segunda Section: Cargo de Aprovador
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
                    }
                ]
            },
            // 4. A ActionRow com os botões de ação principais, fora do container.
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

        // 5. Enviamos a resposta final com o payload e a flag obrigatória.
        await interaction.reply({
            components: componentsPayload,
            flags: IS_COMPONENTS_V2,
            ephemeral: true
        });
    },
};
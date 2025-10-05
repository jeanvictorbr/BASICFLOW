const { SlashCommandBuilder, ButtonStyle } = require('discord.js');

// Os "Tipos de Componentes" da API V2
const ComponentType = {
    ActionRow: 1,
    Button: 2,
    Container: 7,
    Section: 8,
    TextDisplay: 9,
    Separator: 11, // Componente para criar uma linha divisória
};

// As flags necessárias
const V2_FLAG = 1 << 15;
const EPHEMERAL_FLAG = 1 << 6;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Mostra o painel de configurações utilizando Containers.'),

    async execute(interaction) {
        
        const componentsPayload = [
            // 1. O Container Principal: ele será o "card" da nossa mensagem.
            // A API exige que ele esteja dentro de uma ActionRow.
            {
                type: ComponentType.ActionRow,
                components: [{
                    type: ComponentType.Container,
                    custom_id: 'main_config_container',
                    // A cor da barra lateral, como no seu exemplo.
                    accent_color: 0x301118, // Um vermelho escuro, pode ser qualquer valor hexadecimal
                    components: [
                        // 2. Componentes de Conteúdo DENTRO do Container
                        {
                            type: ComponentType.TextDisplay,
                            content: '### SERVIDOR TESTES | Configurações'
                        },
                        {
                            type: ComponentType.Separator, // Linha divisória
                        },
                        {
                            type: ComponentType.Section,
                            custom_id: 'section_interface',
                            accessory: {
                                type: ComponentType.Button,
                                style: ButtonStyle.Primary,
                                label: 'Editar',
                                custom_id: 'edit_interface_button',
                                emoji: { name: '⚙️' }
                            },
                            components: [{
                                type: ComponentType.TextDisplay,
                                content: '**Interface do Sistema**\nAltere aqui configurações visuais do bot.'
                            }]
                        },
                        {
                            type: ComponentType.Section,
                            custom_id: 'section_register',
                            accessory: {
                                type: ComponentType.Button,
                                style: ButtonStyle.Secondary,
                                label: 'Premium',
                                custom_id: 'locked_register_button',
                                emoji: { name: '⭐' },
                                disabled: true
                            },
                            components: [{
                                type: ComponentType.TextDisplay,
                                content: '**Sistema de Registro**\nConfigure todo o sistema de registro.'
                            }]
                        }
                    ]
                }]
            },
            // 3. ActionRow externa para botões globais (se necessário)
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Success,
                        label: 'Salvar Tudo',
                        custom_id: 'save_all_button',
                    },
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Danger,
                        label: 'Sair',
                        custom_id: 'exit_config_button',
                    }
                ]
            }
        ];

        await interaction.reply({
            components: componentsPayload,
            flags: V2_FLAG | EPHEMERAL_FLAG,
        });
    },
};
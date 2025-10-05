const { SlashCommandBuilder, ButtonStyle } = require('discord.js');

// Simulação de um banco de dados
const serverConfig = {
    approvalChannel: '#registro-prisao',
    approverRole: '@Gerente',
};

// Os "Tipos de Componentes" que a API do Discord entende
const ComponentType = {
    ActionRow: 1,
    Button: 2,
    Section: 8,
    TextDisplay: 9,
};

// As flags que precisamos
const V2_FLAG = 1 << 15;
const EPHEMERAL_FLAG = 1 << 6;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Mostra o painel de configurações com Componentes V2.'),

    async execute(interaction) {
        
        const componentsPayload = [
            // Cada Section fica dentro de sua própria ActionRow
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Section,
                        // CORREÇÃO FINAL: Adicionando o custom_id exigido pela API na Section
                        custom_id: 'config_section_channel', 
                        accessory: {
                            type: ComponentType.Button,
                            style: ButtonStyle.Primary,
                            label: 'Editar',
                            custom_id: 'edit_channel_button', // O botão mantém seu ID para a interação
                        },
                        components: [{
                            type: ComponentType.TextDisplay,
                            // Ajustando o texto para ficar similar à imagem
                            content: `**Interface do Sistema**\nAltere aqui configurações visuais do bot, como cor padrão, etc.`
                        }]
                    }
                ]
            },
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Section,
                        // CORREÇÃO FINAL: Adicionando o custom_id exigido pela API na Section
                        custom_id: 'config_section_role',
                        accessory: {
                            type: ComponentType.Button,
                            style: ButtonStyle.Primary,
                            label: 'Editar',
                            custom_id: 'edit_role_button',
                        },
                        components: [{
                            type: ComponentType.TextDisplay,
                            content: `**Sistema de Registro**\nConfigure todo o sistema de registro, incluindo cargos e canais.`
                        }]
                    }
                ]
            },
            // ActionRow para botões desabilitados "Premium", como na imagem
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Section,
                        custom_id: 'config_section_premium_example',
                        accessory: {
                            type: ComponentType.Button,
                            style: ButtonStyle.Secondary,
                            label: 'Premium',
                            custom_id: 'premium_button_locked',
                            emoji: { name: '⚙️' },
                            disabled: true,
                        },
                        components: [{
                            type: ComponentType.TextDisplay,
                            content: `**Sistema de Baú**\nGerencie os itens do baú, canais de logs e ative o sistema.`
                        }]
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
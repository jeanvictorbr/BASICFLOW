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
            // CORREÇÃO FINAL: Cada Section agora está dentro de sua própria ActionRow.
            // A API exige que o componente de nível superior seja um dos tipos permitidos (como o ActionRow, tipo 1).
            {
                type: ComponentType.ActionRow,
                components: [
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
                    }
                ]
            },
            {
                type: ComponentType.ActionRow,
                components: [
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
            // A ActionRow final com os botões de ação já estava correta.
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

        await interaction.reply({
            components: componentsPayload,
            flags: V2_FLAG | EPHEMERAL_FLAG,
        });
    },
};
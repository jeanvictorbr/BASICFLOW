const { SlashCommandBuilder, ButtonStyle } = require('discord.js');

// Os "Tipos de Componentes" da API V2
const ComponentType = {
    ActionRow: 1,
    Button: 2,
    StringSelect: 3,
    Container: 7,
    Section: 8,
    TextDisplay: 9,
    MediaGallery: 10,
    Separator: 11,
};

// As flags necessárias
const V2_FLAG = 1 << 15;
const EPHEMERAL_FLAG = 1 << 6;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Mostra o painel de configurações utilizando a estrutura correta.'),

    async execute(interaction) {
        
        const componentsPayload = [
            // A estrutura raiz é uma ActionRow contendo o Container principal
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Container,
                        custom_id: 'main_container',
                        accent_color: 0xFF0000, // Cor hexadecimal para Vermelho (16711680)
                        components: [
                            // 1. Section para "Sistema de Ausencias"
                            {
                                type: ComponentType.Section,
                                custom_id: 'section_ausencias',
                                accessory: {
                                    type: ComponentType.Button,
                                    style: ButtonStyle.Success,
                                    label: 'Configurar',
                                    emoji: { name: '👍' },
                                    disabled: true,
                                    custom_id: 'c4dfdc5145f644d5be2bd19fddffd16e'
                                },
                                components: [{
                                    type: ComponentType.TextDisplay,
                                    content: 'Sistema de Ausencias'
                                }]
                            },
                            // 2. Separator
                            {
                                type: ComponentType.Separator,
                                spacing: 1, // 1 Corresponde a "Small"
                                divider: true
                            },
                            // 3. Section para "Sistema de Tickets"
                            {
                                type: ComponentType.Section,
                                custom_id: 'section_tickets',
                                accessory: {
                                    type: ComponentType.Button,
                                    style: ButtonStyle.Success,
                                    label: 'Configurar',
                                    emoji: { name: '👍' },
                                    custom_id: 'f836765aaae14eb9b2e6b434029bcba9'
                                },
                                components: [
                                    { type: ComponentType.TextDisplay, content: 'Sistema de Tickets' },
                                    { type: ComponentType.TextDisplay, content: 'sadasdaadasdasdas' }
                                ]
                            },
                            // 4. Separator
                            {
                                type: ComponentType.Separator,
                                spacing: 1, // Small
                                divider: true
                            },
                            // 5. Media Gallery (A imagem precisa ser enviada junto com a mensagem)
                            // NOTA: Para MediaGallery funcionar, a imagem deve ser enviada como um anexo.
                            // Por simplicidade, esta parte está comentada, mas a estrutura está aqui.
                            /*
                            {
                                type: ComponentType.MediaGallery,
                                items: [{
                                    url: "attachment://5572f52568fe4888d7a9635753298d91.png"
                                }]
                            },
                            */
                            // 6. ActionRow com botão de Link
                            {
                                type: ComponentType.ActionRow,
                                components: [{
                                    type: ComponentType.Button,
                                    style: ButtonStyle.Link,
                                    label: 'Slow Lemur',
                                    url: 'https://google.com'
                                }]
                            },
                            // 7. ActionRow com Select Menu
                            {
                                type: ComponentType.ActionRow,
                                components: [{
                                    type: ComponentType.StringSelect,
                                    custom_id: '8b38a067f6bc4281c69207ef03efac0e',
                                    options: [
                                        { label: 'Sassy Kookabura', value: '143c0797d6e04ffd8c8bbf29a434a46d' },
                                        { label: 'Dangerous Tarsier', value: 'bcc05918163e4714e28649cc2eaaaec4' },
                                        { label: 'Colorful Armadillo', value: '147d35b05bd94a45c260460997ee8729' }
                                    ]
                                }]
                            }
                        ]
                    }
                ]
            }
        ];

        await interaction.reply({
            components: componentsPayload,
            flags: V2_FLAG | EPHEMERAL_FLAG,
            // Para a galeria de mídia funcionar, você precisaria adicionar o 'files' aqui
            // files: [{ attachment: './path/to/your/image.png', name: '5572f52568fe4888d7a9635753298d91.png' }]
        });
    },
};
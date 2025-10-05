const { SlashCommandBuilder } = require('discord.js');

// As flags que o Discord precisa para entender a mensagem
const V2_FLAG = 1 << 15;
const EPHEMERAL_FLAG = 1 << 6;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Mostra o painel de configuração criado visualmente.'),

    async execute(interaction) {
       [
    {
        "type": 17,
        "accent_color": 16711680,
        "spoiler": false,
        "components": [
            {
                "type": 9,
                "accessory": {
                    "type": 2,
                    "style": 3,
                    "label": "Configurar",
                    "emoji": {
                        "name": "👍",
                        "id": null
                    },
                    "disabled": true,
                    "custom_id": "c4dfdc5145f644d5be2bd19fddffd16e"
                },
                "components": [
                    {
                        "type": 10,
                        "content": "Sistema de Ausencias "
                    }
                ]
            },
            {
                "type": 14,
                "divider": true,
                "spacing": 2
            },
            {
                "type": 9,
                "accessory": {
                    "type": 2,
                    "style": 3,
                    "label": "Configurar",
                    "emoji": {
                        "name": "👍",
                        "id": null
                    },
                    "disabled": false,
                    "custom_id": "f836765aaae14eb9b2e6b434029bcba9"
                },
                "components": [
                    {
                        "type": 10,
                        "content": "Sistema de Tickets"
                    },
                    {
                        "type": 10,
                        "content": "sadasdaadasdasdas"
                    }
                ]
            },
            {
                "type": 14,
                "divider": true,
                "spacing": 2
            },
            {
                "type": 12,
                "items": [
                    {
                        "media": {
                            "url": "attachment://5572f52568fe4888d7a9635753298d91.png"
                        },
                        "description": null,
                        "spoiler": false
                    }
                ]
            },
            {
                "type": 1,
                "components": [
                    {
                        "type": 2,
                        "style": 5,
                        "label": "Slow Lemur",
                        "emoji": null,
                        "disabled": false,
                        "url": "https://google.com"
                    },
                    {
                        "type": 2,
                        "style": 2,
                        "label": "Heavy Mallard",
                        "emoji": null,
                        "disabled": false,
                        "custom_id": "4209975058604071faf41257064769eb"
                    }
                ]
            },
            {
                "type": 1,
                "components": [
                    {
                        "type": 3,
                        "custom_id": "8b38a067f6bc4281c69207ef03efac0e",
                        "options": [
                            {
                                "label": "Sassy Kookabura",
                                "value": "143c0797d6e04ffd8c8bbf29a434a46d",
                                "description": null,
                                "emoji": null,
                                "default": false
                            },
                            {
                                "label": "Dangerous Tarsier",
                                "value": "bcc05918163e4714e28649cc2eaaaec4",
                                "description": null,
                                "emoji": null,
                                "default": false
                            },
                            {
                                "label": "Colorful Armadillo",
                                "value": "147d35b05bd94a45c260460997ee8729",
                                "description": null,
                                "emoji": null,
                                "default": false
                            },
                            {
                                "label": "Agile Goldfinch",
                                "value": "a5eb3047e1f54bcc9cad78536db827a3",
                                "description": null,
                                "emoji": null,
                                "default": false
                            }
                        ],
                        "placeholder": "",
                        "min_values": 1,
                        "max_values": 1,
                        "disabled": false
                    }
                ]
            }
        ]
    }
]envie uma mensagem de aviso.
        if (componentsPayload.length === 0) {
            return interaction.reply({ 
                content: 'Erro: O painel de configuração não foi definido. Cole o código JSON do discord.builders no arquivo `configurar.js`.',
                ephemeral: true
            });
        }
        
        // O bot vai simplesmente enviar o seu design para o Discord.
        await interaction.reply({
            components: componentsPayload,
            flags: V2_FLAG | EPHEMERAL_FLAG,
        });
    },
};
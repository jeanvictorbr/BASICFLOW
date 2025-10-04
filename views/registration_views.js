// Ficheiro: views/registration_views.js (VERSÃO FINAL COM IMAGEM CORRIGIDA)
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, ComponentType } = require('discord.js');
const db = require('../database/db.js');

async function getRegistrationPanelPayload(guildId) {
    const settings = await db.get('SELECT registration_panel_image_url FROM guild_settings WHERE guild_id = $1', [guildId]);
    const imageUrl = settings?.registration_panel_image_url;

    const components = [
        {
            type: ComponentType.Container,
            color: 0x0099FF,
            components: [
                { type: ComponentType.TextDisplay, content: '## 📝 Central de Registo' },
                { type: ComponentType.TextDisplay, content: 'Bem-vindo(a) à nossa comunidade!\n\nPara ter acesso completo ao servidor, por favor, inicie o seu registo clicando no botão abaixo.' },
            ]
        },
    ];

    if (imageUrl) {
        components.push({
            type: ComponentType.MediaGallery,
            // *** INÍCIO DA CORREÇÃO ***
            items: [{
                type: ComponentType.MediaGalleryItem,
                media: {
                    type: 0, // Image
                    image_url: imageUrl
                }
            }]
            // *** FIM DA CORREÇÃO ***
        });
    }

    components.push({
        type: ComponentType.ActionRow,
        components: [{
            type: ComponentType.Button,
            style: ButtonStyle.Primary,
            label: 'Iniciar Registo',
            emoji: { name: '📄' },
            custom_id: 'initiate_registration',
        }]
    });

    return { flags: 1 << 15, components, content: '' };
}

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

function getRegistrationApprovalPayload(interaction, rpName, gameId) {
    const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('📥 Novo Pedido de Registo')
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
            { name: '👤 Utilizador', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: false },
            { name: '📝 Nome RP', value: `\`\`\`${rpName}\`\`\``, inline: true },
            { name: '🔢 ID no Jogo', value: `\`\`\`${gameId}\`\`\``, inline: true },
        )
        .setTimestamp();
        
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`approve_registration:${interaction.user.id}`)
            .setLabel('Aprovar')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`reject_registration:${interaction.user.id}`)
            .setLabel('Rejeitar')
            .setStyle(ButtonStyle.Danger)
    );
    return { embeds: [embed], components: [row] };
}

function getApprovalDmEmbed(guild, rpName, gameId, tag) {
    const nickname = tag ? `[${tag}] ${rpName} | ${gameId}` : `${rpName} | ${gameId}`;
    return new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`✅ Registo Aprovado em ${guild.name}!`)
        .setThumbnail(guild.iconURL())
        .setDescription('Bem-vindo(a) oficialmente à comunidade! A sua entrada foi validada pela nossa staff.')
        .addFields(
            { name: 'Seu novo nickname', value: `\`\`\`${nickname}\`\`\``, inline: false },
            { name: 'Acesso Liberado', value: 'Você recebeu o cargo de membro registado e agora tem acesso aos canais restritos.', inline: false }
        )
        .setFooter({ text: `Servidor: ${guild.name}` })
        .setTimestamp();
}

function getRejectionDmEmbed(guild) {
     return new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`❌ Registo Rejeitado em ${guild.name}`)
        .setThumbnail(guild.iconURL())
        .setDescription('O seu pedido de registo foi analisado pela nossa staff e infelizmente foi rejeitado.\n\nSe acredita que foi um engano, pode tentar submeter um novo registo ou contactar um membro da staff para mais detalhes.')
        .setFooter({ text: `Servidor: ${guild.name}` })
        .setTimestamp();
}

module.exports = {
    getRegistrationPanelPayload,
    getRegistrationModal,
    getRegistrationApprovalPayload,
    getApprovalDmEmbed,
    getRejectionDmEmbed,
};
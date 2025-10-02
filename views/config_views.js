const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db.js');

const formatSetting = (settings, key, type) => {
    const id = settings?.[key];
    if (id) {
        return `✅ ${type === 'role' ? `<@&${id}>` : `<#${id}>`}`;
    }
    return '❌ `Não definido`';
};

const formatTagSetting = (settings, key) => {
    const tag = settings?.[key];
    if (tag) { return `✅ \`[${tag}]\``; }
    return '❌ `Não definida`';
}

const formatImageSetting = (settings, key) => {
    const url = settings?.[key];
    if (url) { return `✅ [Ver Imagem](${url})`; }
    return '❌ `Padrão`';
}

async function getConfigDashboardPayload(guild) {
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guild.id]);

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('⚙️ Painel de Configuração do BasicFlow')
        .setDescription('Use os botões abaixo para configurar as funcionalidades do bot neste servidor.')
        .addFields(
            { name: 'Canal de Aprovação (Registos)', value: formatSetting(settings, 'registration_channel_id', 'channel'), inline: true },
            { name: 'Canal de Ausências', value: formatSetting(settings, 'absence_channel_id', 'channel'), inline: true },
            { name: 'Cargo de Membro Registado', value: formatSetting(settings, 'registered_role_id', 'role'), inline: true },
            { name: 'Cargo de Membro Ausente', value: formatSetting(settings, 'absence_role_id', 'role'), inline: true },
            { name: 'TAG de Nickname', value: formatTagSetting(settings, 'nickname_tag'), inline: true },
            { name: 'Imagem do Painel de Registo', value: formatImageSetting(settings, 'registration_panel_image_url'), inline: true }
        )
        .setFooter({ text: 'Powered by BasicFlow • Conheça as versões completas: Police Flow & Faction Flow!' });
    
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_set_registration_channel').setLabel('Canal de Registos').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_set_absence_channel').setLabel('Canal de Ausências').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_set_nickname_tag').setLabel('Definir TAG').setStyle(ButtonStyle.Secondary).setEmoji('🏷️'),
    );
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_set_registered_role').setLabel('Cargo de Membro').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_set_absence_role').setLabel('Cargo de Ausente').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_set_panel_image').setLabel('Imagem do Painel').setStyle(ButtonStyle.Secondary).setEmoji('🖼️')
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('config_publish_registration_panel')
            .setLabel('Publicar Painel de Registo')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📝'),
        // NOVO BOTÃO ADICIONADO
        new ButtonBuilder()
            .setCustomId('config_publish_absence_panel')
            .setLabel('Publicar Painel de Ausência')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🏝️')
    );

    return { embeds: [embed], components: [row1, row2, row3], ephemeral: true };
}

module.exports = {
    getConfigDashboardPayload,
};
```

---

### **Ficheiro 2 de 4 (Modificado): `interactions/config_handler.js`**

Adicionamos a lógica para o novo botão "Publicar Painel de Ausência". Ele irá verificar se as configurações necessárias existem e depois perguntar em que canal o painel deve ser publicado.

```javascript
const { ActionRowBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ComponentType, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../database/db.js');
const { getConfigDashboardPayload } = require('../views/config_views.js');
const { getRegistrationPanelPayload } = require('../views/registration_views.js');
const { getAbsencePanelPayload } = require('../views/absence_views.js'); // NOVA IMPORTAÇÃO

const configMap = {
    'config_set_registration_channel': { dbKey: 'registration_channel_id', type: 'channel' },
    'config_set_absence_channel': { dbKey: 'absence_channel_id', type: 'channel' },
    'config_set_registered_role': { dbKey: 'registered_role_id', type: 'role' },
    'config_set_absence_role': { dbKey: 'absence_role_id', type: 'role' },
};

const configHandler = {
    customId: (id) => id.startsWith('config_'),

    async execute(interaction) {
        const { customId } = interaction;

        if (customId === 'config_set_nickname_tag' || customId === 'config_set_panel_image') {
            // ... (código existente para modais, sem alterações)
        }

        await interaction.deferUpdate();

        if (customId === 'config_publish_registration_panel') {
            // ... (código existente, sem alterações)
        }

        // --- NOVA LÓGICA PARA PUBLICAR O PAINEL DE AUSÊNCIA ---
        if (customId === 'config_publish_absence_panel') {
            const settings = await db.get('SELECT absence_channel_id, absence_role_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
            if (!settings?.absence_channel_id || !settings?.absence_role_id) {
                return interaction.editReply({ content: '❌ **Ação bloqueada:**\n> Você precisa definir um "Canal de Ausências" e um "Cargo de Membro Ausente" antes de publicar este painel.', embeds: [], components: [] });
            }

            const channelMenu = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('publish_absence_panel_channel_select')
                    .setPlaceholder('Selecione o canal para publicar a vitrine...')
                    .addChannelTypes(ChannelType.GuildText)
            );

            const response = await interaction.editReply({ content: 'Certo! Onde você quer que a vitrine de ausências seja publicada?', components: [channelMenu], embeds: [], fetchReply: true });

            const collector = response.createMessageComponentCollector({ componentType: ComponentType.ChannelSelect, filter: i => i.user.id === interaction.user.id, time: 60000, max: 1 });
            collector.on('collect', async i => {
                const channelId = i.values[0];
                const targetChannel = await interaction.guild.channels.fetch(channelId);
                if (targetChannel) {
                    await targetChannel.send(getAbsencePanelPayload());
                    await i.update({ content: `✅ Painel de ausência publicado com sucesso em ${targetChannel}!`, components: [], embeds: [] });
                }
            });
            return;
        }
        
        // ... (resto do código para configurar canais e cargos, sem alterações)
    }
};

// ... (código existente no ficheiro, sem alterações)
```

---

### **Ficheiro 3 de 4 (Novo): `views/absence_views.js`**

Este novo ficheiro define toda a aparência do sistema de ausências: o painel público, o formulário que o utilizador preenche e o log enviado para a staff.

```javascript
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const ABSENCE_IMAGE_URL = 'https://placehold.co/1200x400/3498db/FFFFFF/png?text=Central+de+Aus%C3%AAncias';

function getAbsencePanelPayload() {
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🏝️ Central de Ausências')
        .setDescription('Precisa de se ausentar por um período?\n\nUtilize o botão abaixo para notificar a administração. O seu pedido será analisado e, se aprovado, você receberá o cargo de ausente para evitar ser removido por inatividade.')
        .setImage(ABSENCE_IMAGE_URL)
        .setFooter({ text: 'BasicFlow • Sistema de Ausências' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('initiate_absence')
            .setLabel('Informar Ausência')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🗓️')
    );

    return { embeds: [embed], components: [row] };
}

function getAbsenceModal() {
    return new ModalBuilder()
        .setCustomId('absence_modal_submit')
        .setTitle('Formulário de Pedido de Ausência')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('start_date_input')
                    .setLabel('Data de Início da Ausência')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Formato: DD/MM/AAAA (ex: 25/12/2025)')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('end_date_input')
                    .setLabel('Data de Fim da Ausência')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Formato: DD/MM/AAAA (ex: 05/01/2026)')
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('reason_input')
                    .setLabel('Motivo da Ausência')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Ex: Viagem de férias, problemas pessoais, etc.')
                    .setRequired(true)
            )
        );
}

function getAbsenceApprovalPayload(interaction, startDate, endDate, reason) {
    const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('📥 Novo Pedido de Ausência')
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
            { name: '👤 Utilizador', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: false },
            { name: '🗓️ Período', value: `De \`${startDate}\` até \`${endDate}\``, inline: false },
            { name: '📝 Motivo', value: `\`\`\`${reason}\`\`\``, inline: false },
        )
        .setTimestamp();
        
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`approve_absence:${interaction.user.id}`)
            .setLabel('Aprovar')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`reject_absence:${interaction.user.id}`)
            .setLabel('Rejeitar')
            .setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row] };
}


module.exports = {
    getAbsencePanelPayload,
    getAbsenceModal,
    getAbsenceApprovalPayload
};
```

---

### **Ficheiro 4 de 4 (Novo): `interactions/absence_handler.js`**

Este novo ficheiro contém a lógica que lida com as interações do utilizador: o clique no botão para abrir o formulário e a submissão do formulário preenchido.

```javascript
const db = require('../database/db.js');
const { getAbsenceModal, getAbsenceApprovalPayload } = require('../views/absence_views.js');

// Função para converter data DD/MM/AAAA para timestamp
function dateToTimestamp(dateString) {
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    // new Date(ano, mês - 1, dia)
    const date = new Date(+parts[2], parts[1] - 1, +parts[0]);
    return date.getTime();
}

const initiateAbsenceHandler = {
    customId: 'initiate_absence',
    async execute(interaction) {
        await interaction.showModal(getAbsenceModal());
    }
};

const submitAbsenceHandler = {
    customId: 'absence_modal_submit',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const startDateStr = interaction.fields.getTextInputValue('start_date_input');
        const endDateStr = interaction.fields.getTextInputValue('end_date_input');
        const reason = interaction.fields.getTextInputValue('reason_input');

        const startTime = dateToTimestamp(startDateStr);
        const endTime = dateToTimestamp(endDateStr);

        if (!startTime || !endTime || endTime < startTime) {
            return interaction.editReply('❌ As datas fornecidas são inválidas. Por favor, use o formato `DD/MM/AAAA` e certifique-se de que a data de fim é posterior à de início.');
        }

        const settings = await db.get('SELECT absence_channel_id FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
        if (!settings?.absence_channel_id) {
            return interaction.editReply('❌ Ocorreu um erro interno. A staff foi notificada.');
        }

        const approvalChannel = await interaction.guild.channels.fetch(settings.absence_channel_id).catch(() => null);
        if (!approvalChannel) {
            return interaction.editReply('❌ Ocorreu um erro interno (canal não encontrado). A staff foi notificada.');
        }

        try {
            await db.run(
                'INSERT INTO absences (guild_id, user_id, start_date, end_date, reason) VALUES ($1, $2, $3, $4, $5)',
                [interaction.guildId, interaction.user.id, startTime, endTime, reason]
            );

            await approvalChannel.send(getAbsenceApprovalPayload(interaction, startDateStr, endDateStr, reason));
            await interaction.editReply({ content: '✅ O seu pedido de ausência foi enviado para análise da staff.' });

        } catch (error) {
            console.error(`[DB_INSERT_ERROR] Falha ao inserir ausência para o user ${interaction.user.id}:`, error);
            await interaction.editReply('❌ Ocorreu um erro ao enviar o seu pedido. Tente novamente mais tarde.');
        }
    }
};

module.exports = [
    initiateAbsenceHandler,
    submitAbsenceHandler
];


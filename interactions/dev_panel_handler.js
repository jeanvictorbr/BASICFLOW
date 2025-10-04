// Ficheiro: interactions/dev_panel_handler.js (VERSÃO COM LAYOUT COMPONENTS V2)
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const db = require('../database/db.js');

// Função para gerar o painel principal do desenvolvedor com a nova interface
async function getDevDashboard() {
    const updatesCount = await db.get('SELECT COUNT(*) as count FROM changelog_updates');
    
    const components = [
        {
            type: ComponentType.TextDisplay,
            content: '# 🔒 Painel do Dono\n*Gestão de atualizações do changelog e outras funções restritas.*'
        },
        { type: ComponentType.Separator },
        {
            type: ComponentType.Container,
            color: 0xFEE75C, // Amarelo
            components: [
                {
                    type: ComponentType.TextDisplay,
                    content: `**Atualizações Registadas:** ${updatesCount.count}`
                }
            ]
        },
        {
            type: ComponentType.ActionRow,
            components: [
                { type: ComponentType.Button, style: ButtonStyle.Success, label: 'Adicionar Atualização', custom_id: 'dev_add_update' },
                { type: ComponentType.Button, style: ButtonStyle.Danger, label: 'Listar/Remover', custom_id: 'dev_list_updates' },
                { type: ComponentType.Button, style: ButtonStyle.Secondary, label: 'Voltar', emoji: { name: '⬅️' }, custom_id: 'config_menu:main' }
            ]
        }
    ];

    return { flags: 1 << 15, components, embeds: [], content: '' };
}

const devPanelHandler = {
    customId: 'dev_panel',
    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) return;

        const modal = new ModalBuilder().setCustomId('dev_password_modal').setTitle('Acesso Restrito');
        const passwordInput = new TextInputBuilder().setCustomId('password').setLabel('Digite a senha de desenvolvedor').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(passwordInput));
        await interaction.showModal(modal);
    }
};

const devPasswordHandler = {
    customId: 'dev_password_modal',
    async execute(interaction) {
        const password = interaction.fields.getTextInputValue('password');
        if (password !== process.env.DEV_PASSWORD) {
            return interaction.reply({ content: '❌ Senha incorreta.', ephemeral: true });
        }
        await interaction.update(await getDevDashboard());
    }
};

const devAddUpdateHandler = {
    customId: 'dev_add_update',
    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) return;
        const modal = new ModalBuilder().setCustomId('dev_add_update_modal').setTitle('Nova Atualização');
        const titleInput = new TextInputBuilder().setCustomId('title').setLabel('Título da Atualização').setStyle(TextInputStyle.Short).setRequired(true);
        const descInput = new TextInputBuilder().setCustomId('description').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(titleInput), new ActionRowBuilder().addComponents(descInput));
        await interaction.showModal(modal);
    }
};

const devAddUpdateModalHandler = {
    customId: 'dev_add_update_modal',
    async execute(interaction) {
        const title = interaction.fields.getTextInputValue('title');
        const description = interaction.fields.getTextInputValue('description');
        await db.run('INSERT INTO changelog_updates (title, description, timestamp) VALUES ($1, $2, $3)', [title, description, Date.now()]);
        await interaction.update(await getDevDashboard());
        await interaction.followUp({ content: '✅ Atualização adicionada com sucesso!', ephemeral: true });
    }
};

const devListUpdatesHandler = {
    customId: 'dev_list_updates',
    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) return;
        await interaction.deferUpdate();
        const updates = await db.all('SELECT update_id, title FROM changelog_updates ORDER BY timestamp DESC LIMIT 25');
        if (updates.length === 0) {
            return interaction.followUp({ content: 'Não há atualizações para remover.', ephemeral: true });
        }
        const menu = new StringSelectMenuBuilder()
            .setCustomId('dev_remove_update_select')
            .setPlaceholder('Selecione uma atualização para remover...')
            .addOptions(updates.map(u => ({ label: u.title.substring(0, 100), value: `${u.update_id}` })));
        
        const row = new ActionRowBuilder().addComponents(menu);
        const backButtonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('dev_panel_back').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
        );

        await interaction.editReply({ content: 'Selecione uma atualização da lista abaixo para a remover permanentemente.', components: [row, backButtonRow], embeds: [] });
    }
};

const devRemoveUpdateHandler = {
    customId: 'dev_remove_update_select',
    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) return;
        const updateId = interaction.values[0];
        await db.run('DELETE FROM changelog_updates WHERE update_id = $1', [updateId]);
        await interaction.update(await getDevDashboard());
        await interaction.followUp({ content: '✅ Atualização removida com sucesso!', ephemeral: true });
    }
};

const devPanelBackHandler = {
    customId: 'dev_panel_back',
    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) return;
        await interaction.update(await getDevDashboard());
    }
}

module.exports = [
    devPanelHandler,
    devPasswordHandler,
    devAddUpdateHandler,
    devAddUpdateModalHandler,
    devListUpdatesHandler,
    devRemoveUpdateHandler,
    devPanelBackHandler
];
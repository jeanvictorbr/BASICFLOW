// Ficheiro: interactions/dev_panel_handler.js
// Lógica para o painel de desenvolvedor secreto.

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../database/db.js');

// Função para gerar o painel principal do desenvolvedor
async function getDevDashboard() {
    const updatesCount = await db.get('SELECT COUNT(*) as count FROM changelog_updates');
    const embed = new EmbedBuilder()
        .setTitle('🔒 Painel de Desenvolvedor')
        .setDescription('Gestão de atualizações do changelog.')
        .addFields({ name: 'Atualizações Registadas', value: `${updatesCount.count}` })
        .setColor(0xFEE75C);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dev_add_update').setLabel('Adicionar Atualização').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('dev_list_updates').setLabel('Listar/Remover Atualizações').setStyle(ButtonStyle.Danger)
    );
    return { embeds: [embed], components: [row], ephemeral: true };
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
        const dashboard = await getDevDashboard();
        await interaction.reply(dashboard);
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
        const dashboard = await getDevDashboard();
        await interaction.update(dashboard);
        await interaction.followUp({ content: '✅ Atualização adicionada com sucesso!', ephemeral: true });
    }
};

const devListUpdatesHandler = {
    customId: 'dev_list_updates',
    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) return;
        const updates = await db.all('SELECT update_id, title FROM changelog_updates ORDER BY timestamp DESC LIMIT 25');
        if (updates.length === 0) {
            return interaction.reply({ content: 'Não há atualizações para remover.', ephemeral: true });
        }
        const menu = new StringSelectMenuBuilder()
            .setCustomId('dev_remove_update_select')
            .setPlaceholder('Selecione uma atualização para remover...')
            .addOptions(updates.map(u => ({ label: u.title.substring(0, 100), value: `${u.update_id}` })));
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.update({ content: 'Selecione uma atualização da lista abaixo para a remover permanentemente.', components: [row], embeds: [] });
    }
};

const devRemoveUpdateHandler = {
    customId: 'dev_remove_update_select',
    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) return;
        const updateId = interaction.values[0];
        await db.run('DELETE FROM changelog_updates WHERE update_id = $1', [updateId]);
        const dashboard = await getDevDashboard();
        await interaction.update(dashboard);
        await interaction.followUp({ content: '✅ Atualização removida com sucesso!', ephemeral: true });
    }
};

module.exports = [
    devPanelHandler,
    devPasswordHandler,
    devAddUpdateHandler,
    devAddUpdateModalHandler,
    devListUpdatesHandler,
    devRemoveUpdateHandler,
];

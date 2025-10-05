const { getConfigDashboardPayload, getCategoryConfigPayload } = require('../views/config_views');
const db = require('../database/db');
const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder } = require('discord.js');

const prefix = 'config';

async function handle(interaction) {
    const [_, action, value] = interaction.customId.split(':');

    const guildId = interaction.guild.id;
    const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);

    if (action === 'menu') {
        if (value === 'main') {
            const payload = getConfigDashboardPayload(settings);
            await interaction.update(payload);
        } else {
            const payload = getCategoryConfigPayload(value, settings);
            await interaction.update(payload);
        }
    } else if (action === 'set') {
        // Exemplo para alterar o canal de log de registros
        if (value === 'reg_log_channel') {
            const menu = new ChannelSelectMenuBuilder()
                .setCustomId('config_update:reg_log_channel')
                .setPlaceholder('Selecione o canal de logs')
                .addChannelTypes(ChannelType.GuildText);
            
            const row = new ActionRowBuilder().addComponents(menu);

            await interaction.reply({ content: 'Selecione o novo canal para logs de registro.', components: [row], ephemeral: true });
        }
        // Adicionar lógica para outros botões "Alterar" aqui (cargos, etc.)
        // Exemplo: abrir um Modal para URL
        else if (value === 'reg_panel_image') {
             const modal = new ModalBuilder()
                .setCustomId(`config_modal:reg_panel_image_url`)
                .setTitle('Alterar Imagem do Painel');
            
            const urlInput = new TextInputBuilder()
                .setCustomId('image_url')
                .setLabel("URL da Imagem (deve terminar em .png, .jpg, etc)")
                .setStyle(TextInputStyle.Short)
                .setValue(settings.registration_panel_image_url || '')
                .setRequired(false);

            modal.addComponents(new ActionRowBuilder().addComponents(urlInput));
            await interaction.showModal(modal);
        }

    } else if (action === 'update') {
        // Chamado após a seleção no menu de canais
        const newChannelId = interaction.values[0];
        await db.run(`UPDATE guild_settings SET ${value} = $1 WHERE guild_id = $2`, [newChannelId, guildId]);
        
        // Atualiza a view para refletir a mudança
        const updatedSettings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
        const category = value.split('_')[0] === 'reg' ? 'registration' : 'outra_categoria'; // Lógica simplificada
        const payload = getCategoryConfigPayload(category, updatedSettings);
        await interaction.message.edit(payload); // Edita a mensagem original do painel
        await interaction.reply({ content: 'Configuração atualizada com sucesso!', ephemeral: true });

    } else if (action === 'modal') {
        // Chamado após o envio do modal
        const imageUrl = interaction.fields.getTextInputValue('image_url');
        await db.run(`UPDATE guild_settings SET ${value} = $1 WHERE guild_id = $2`, [imageUrl, guildId]);

        // Atualiza a view
        const updatedSettings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
        const category = value.split('_')[0] === 'reg' ? 'registration' : 'outra_categoria'; // Lógica simplificada
        const payload = getCategoryConfigPayload(category, updatedSettings);
        
        // A interação do modal não tem uma mensagem para editar, então precisa ser buscada ou uma nova enviada.
        // A melhor abordagem é responder ao modal e deixar o admin fechar. A view principal já refletirá a mudança na próxima interação.
        await interaction.reply({ content: 'URL da imagem atualizada!', ephemeral: true });
    }
}

module.exports = { prefix, handle };
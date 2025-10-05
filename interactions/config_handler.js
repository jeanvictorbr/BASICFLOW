// Ficheiro: interactions/config_handler.js (VERSÃO FINAL E COMPLETA)

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
// CORREÇÃO: Caminhos corretos para a base de dados e as views
const db = require('../database/db.js');
const { getConfigDashboardPayload, getCategoryPayload } = require('../views/config_views.js');

// --- FUNÇÃO PRINCIPAL (CHAMADA PELO COMANDO) ---
async function handleConfigCommand(interaction) {
    // Responde à interação com o painel principal
    const payload = await getConfigDashboardPayload(interaction.guild, interaction.user.id);
    await interaction.reply(payload);
}

// --- HANDLER DE NAVEGAÇÃO ENTRE MENUS ---
const handleMenuNavigation = {
    customId: (customId) => customId.startsWith('config_menu:'),
    async execute(interaction) {
        // Extrai a categoria do customId (ex: 'registration', 'ponto', 'main')
        const category = interaction.customId.split(':')[1];

        // Se for para voltar ao menu principal
        if (category === 'main') {
            const payload = await getConfigDashboardPayload(interaction.guild, interaction.user.id);
            return interaction.update(payload); // 'update' edita a mensagem existente
        }

        // Se for para uma categoria específica
        const payload = await getCategoryPayload(interaction.guild, category);
        await interaction.update(payload);
    }
};

// --- HANDLER PARA ABRIR MODAIS DE CONFIGURAÇÃO ---

// Mapeamento para evitar um switch-case gigante
const modalMappings = {
    // REGISTO
    'config_set_registration_channel': { dbKey: 'registration_channel_id', label: 'Canal de Logs de Registo' },
    'config_set_registered_role': { dbKey: 'registered_role_id', label: 'Cargo de Membro' },
    'config_set_nickname_tag': { dbKey: 'nickname_tag', label: 'TAG de Nickname' },
    'config_set_panel_image': { dbKey: 'registration_panel_image_url', label: 'URL da Imagem do Painel' },
    // AUSÊNCIA
    'config_set_absence_channel': { dbKey: 'absence_channel_id', label: 'Canal de Logs de Ausência' },
    'config_set_absence_role': { dbKey: 'absence_role_id', label: 'Cargo de Ausente' },
    'config_set_absence_image': { dbKey: 'absence_panel_image_url', label: 'URL da Imagem do Painel' },
    // TICKET
    'config_set_ticket_category': { dbKey: 'ticket_category_id', label: 'Categoria de Tickets' },
    'config_set_support_role': { dbKey: 'support_role_id', label: 'Cargo de Suporte' },
    'config_set_ticket_log_channel': { dbKey: 'ticket_log_channel_id', label: 'Canal de Logs de Ticket' },
    'config_set_ticket_image': { dbKey: 'ticket_panel_image_url', label: 'URL da Imagem do Painel' },
    // BATE-PONTO (NOVO)
    'config_set_ponto_vitrine_channel': { dbKey: 'ponto_vitrine_channel_id', label: 'Canal da Vitrine' },
    'config_set_ponto_log_channel': { dbKey: 'ponto_log_channel_id', label: 'Canal de Logs' },
    'config_set_ponto_role': { dbKey: 'ponto_role_id', label: 'Cargo "Em Serviço"' },
    'config_set_ponto_category': { dbKey: 'ponto_temp_category_id', label: 'Categoria dos Canais' },
    'config_set_ponto_nickname': { dbKey: 'ponto_nickname_prefix', label: 'Prefixo de Nickname' },
};

const handleOpenModal = {
    customId: (customId) => customId.startsWith('config_set_'),
    async execute(interaction) {
        const mapping = modalMappings[interaction.customId];
        if (!mapping) return;

        const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);

        const modal = new ModalBuilder()
            .setCustomId(`config_save:${mapping.dbKey}`) // Passa a chave do DB para o handler de salvar
            .setTitle(`Alterar ${mapping.label}`);

        const input = new TextInputBuilder()
            .setCustomId('setting_value')
            .setLabel(`Novo valor para ${mapping.label}`)
            .setStyle(TextInputStyle.Short)
            .setValue(settings?.[mapping.dbKey] || '')
            .setRequired(false)
            .setPlaceholder('Deixe em branco para remover.');
        
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
};

// --- HANDLER PARA SALVAR OS DADOS DO MODAL ---

const handleSaveSetting = {
    customId: (customId) => customId.startsWith('config_save:'),
    async execute(interaction) {
        // Adia a atualização para dar tempo de processar
        await interaction.deferUpdate();

        const settingKey = interaction.customId.split(':')[1];
        let value = interaction.fields.getTextInputValue('setting_value');
        
        if (!value || value.trim() === '') {
            value = null;
        }

        try {
            await db.run(
                `INSERT INTO guild_settings (guild_id, ${settingKey}) VALUES ($1, $2)
                 ON CONFLICT (guild_id) DO UPDATE SET ${settingKey} = $2`,
                [interaction.guildId, value]
            );

            // Descobre em qual categoria o usuário estava para poder atualizar a tela correta.
            let currentCategory = 'registration'; // Valor padrão
            if (settingKey.includes('absence')) currentCategory = 'absence';
            if (settingKey.includes('ticket')) currentCategory = 'ticket';
            if (settingKey.includes('ponto')) currentCategory = 'ponto';
            
            const payload = await getCategoryPayload(interaction.guild, currentCategory);
            await interaction.editReply(payload);
            
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            // Se a interação já foi editada, usamos followUp
            await interaction.followUp({ content: '❌ Ocorreu um erro ao salvar esta configuração.', ephemeral: true }).catch(() => {});
        }
    }
};


// Exporta a função principal para o comando e a lista de handlers de interação para o handler.js principal
module.exports = {
    handleConfigCommand,
    handlers: [
        handleMenuNavigation,
        handleOpenModal,
        handleSaveSetting
    ]
};
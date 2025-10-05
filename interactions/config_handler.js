// Ficheiro: interactions/config_handler.js (VERSÃO FINAL, CORRIGIDA E COMPLETA)

const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../database/db.js');

// Supondo que os ficheiros de 'views' existem e exportam estas funções para gerar os menus
const { getMainMenuPayload, getRegistrationConfigMenu, getTicketsConfigMenu } = require('../views/config_views.js'); 
const { getPontoConfigMenu } = require('../views/ponto_views.js');

// --- HANDLER GENÉRICO ---

const backToMainMenuHandler = {
    customId: 'config_back_main',
    async execute(interaction) {
        // Adiciona o deferUpdate para evitar timeouts
        await interaction.deferUpdate();
        const payload = await getMainMenuPayload(interaction.guild); 
        await interaction.editReply(payload);
    }
};

// --- HANDLERS PARA CONFIGURAÇÃO DE REGISTRO ---

const configRegistrationHandler = {
    customId: 'config_registration',
    async execute(interaction) {
        await interaction.deferUpdate();
        const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
        const payload = getRegistrationConfigMenu(settings);
        await interaction.editReply(payload);
    }
};

const openRegistrationModalHandler = {
    customId: 'config_registration_main',
    async execute(interaction) {
        const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
        const modal = new ModalBuilder()
            .setCustomId('registration_config_modal_submit')
            .setTitle('Configurações do Sistema de Registro');
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('reg_channel_input')
                .setLabel("ID do Canal de Aprovação")
                .setStyle(TextInputStyle.Short)
                .setValue(settings?.registration_channel_id || '')
                .setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('reg_role_input')
                .setLabel("ID do Cargo para Membros Registrados")
                .setStyle(TextInputStyle.Short)
                .setValue(settings?.registered_role_id || '')
                .setRequired(true))
        );
        await interaction.showModal(modal);
    }
};

const saveRegistrationConfigHandler = {
    customId: 'registration_config_modal_submit',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const channelId = interaction.fields.getTextInputValue('reg_channel_input');
        const roleId = interaction.fields.getTextInputValue('reg_role_input');
        
        try {
            await db.run(`
                INSERT INTO guild_settings (guild_id, registration_channel_id, registered_role_id)
                VALUES ($1, $2, $3)
                ON CONFLICT (guild_id) DO UPDATE SET
                    registration_channel_id = EXCLUDED.registration_channel_id,
                    registered_role_id = EXCLUDED.registered_role_id;
            `, [interaction.guildId, channelId, roleId]);
            await interaction.editReply('✅ Configurações de registro salvas com sucesso!');
        } catch (error) {
            console.error('[ERRO SALVAR CONFIG REGISTRO]', error);
            await interaction.editReply('❌ Ocorreu um erro ao salvar as configurações.');
        }
    }
};

// --- HANDLERS PARA CONFIGURAÇÃO DE TICKETS ---

const configTicketsHandler = {
    customId: 'config_tickets',
    async execute(interaction) {
        await interaction.deferUpdate();
        const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
        const payload = getTicketsConfigMenu(settings);
        await interaction.editReply(payload);
    }
};


const openTicketsModalHandler = {
    customId: 'config_tickets_main',
    async execute(interaction) {
        const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
        const modal = new ModalBuilder()
            .setCustomId('tickets_config_modal_submit')
            .setTitle('Configurações do Sistema de Tickets');

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('ticket_category_input')
                .setLabel("ID da Categoria para Abrir Tickets")
                .setStyle(TextInputStyle.Short)
                .setValue(settings?.ticket_category_id || '')
                .setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('ticket_log_channel_input')
                .setLabel("ID do Canal de Logs de Tickets")
                .setStyle(TextInputStyle.Short)
                .setValue(settings?.ticket_log_channel_id || '')
                .setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('support_role_input')
                .setLabel("ID do Cargo de Suporte (Staff)")
                .setStyle(TextInputStyle.Short)
                .setValue(settings?.support_role_id || '')
                .setRequired(true))
        );
        await interaction.showModal(modal);
    }
};

const saveTicketsConfigHandler = {
    customId: 'tickets_config_modal_submit',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const categoryId = interaction.fields.getTextInputValue('ticket_category_input');
        const logChannelId = interaction.fields.getTextInputValue('ticket_log_channel_input');
        const supportRoleId = interaction.fields.getTextInputValue('support_role_input');

        try {
            await db.run(`
                INSERT INTO guild_settings (guild_id, ticket_category_id, ticket_log_channel_id, support_role_id)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (guild_id) DO UPDATE SET
                    ticket_category_id = EXCLUDED.ticket_category_id,
                    ticket_log_channel_id = EXCLUDED.ticket_log_channel_id,
                    support_role_id = EXCLUDED.support_role_id;
            `, [interaction.guildId, categoryId, logChannelId, supportRoleId]);
            await interaction.editReply('✅ Configurações de tickets salvas com sucesso!');
        } catch (error) {
            console.error('[ERRO SALVAR CONFIG TICKETS]', error);
            await interaction.editReply('❌ Ocorreu um erro ao salvar as configurações.');
        }
    }
};


// --- HANDLERS PARA CONFIGURAÇÃO DO BATE-PONTO (NOVO E CORRIGIDO) ---

const configPontoMenuHandler = {
    customId: 'config_ponto',
    async execute(interaction) {
        await interaction.deferUpdate();
        const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
        const payload = getPontoConfigMenu(settings); 
        await interaction.editReply(payload);
    }
};

const openPontoConfigModalHandler = {
    customId: 'config_ponto_main',
    async execute(interaction) {
        // Modais não precisam de defer, pois showModal() é uma resposta imediata.
        const settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = $1', [interaction.guildId]);
        const modal = new ModalBuilder()
               .setCustomId('ponto_config_modal_submit')
               .setTitle('Configurações Gerais do Ponto');

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('ponto_role_input')
                .setLabel("ID do Cargo 'Em Serviço'")
                .setStyle(TextInputStyle.Short)
                .setValue(settings?.ponto_role_id || '')
                .setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('ponto_log_channel_input')
                .setLabel("ID do Canal de Logs do Ponto")
                .setStyle(TextInputStyle.Short)
                .setValue(settings?.ponto_log_channel_id || '')
                .setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('ponto_category_input')
                .setLabel("ID da Categoria para Canais de Serviço")
                .setStyle(TextInputStyle.Short)
                .setValue(settings?.ponto_temp_category_id || '')
                .setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('ponto_vitrine_channel_input')
                .setLabel("ID do Canal da Vitrine de Ponto")
                .setStyle(TextInputStyle.Short)
                .setValue(settings?.ponto_vitrine_channel_id || '')
                .setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('ponto_nickname_prefix_input')
                .setLabel("Prefixo do Apelido (Ex: [Em Serviço])")
                .setStyle(TextInputStyle.Short)
                .setValue(settings?.ponto_nickname_prefix || '')
                .setPlaceholder('Deixe em branco para desativar.')
                .setRequired(false))
        );
        await interaction.showModal(modal);
    }
};

const savePontoConfigHandler = {
    customId: 'ponto_config_modal_submit',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const guildId = interaction.guildId;
        const roleId = interaction.fields.getTextInputValue('ponto_role_input');
        const logChannelId = interaction.fields.getTextInputValue('ponto_log_channel_input');
        const tempCategoryId = interaction.fields.getTextInputValue('ponto_category_input');
        const vitrineChannelId = interaction.fields.getTextInputValue('ponto_vitrine_channel_input');
        const nicknamePrefix = interaction.fields.getTextInputValue('ponto_nickname_prefix_input') || null;
        
        try {
            await db.run(`
                INSERT INTO guild_settings (
                    guild_id, ponto_role_id, ponto_log_channel_id, ponto_temp_category_id, ponto_vitrine_channel_id, ponto_nickname_prefix
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (guild_id) DO UPDATE SET
                    ponto_role_id = EXCLUDED.ponto_role_id,
                    ponto_log_channel_id = EXCLUDED.ponto_log_channel_id,
                    ponto_temp_category_id = EXCLUDED.ponto_temp_category_id,
                    ponto_vitrine_channel_id = EXCLUDED.ponto_vitrine_channel_id,
                    ponto_nickname_prefix = EXCLUDED.ponto_nickname_prefix;
            `, [guildId, roleId, logChannelId, tempCategoryId, vitrineChannelId, nicknamePrefix]);
            await interaction.editReply('✅ Configurações do sistema de ponto salvas com sucesso!');
        } catch (error) {
            console.error('[ERRO SALVAR CONFIG PONTO]', error);
            await interaction.editReply('❌ Ocorreu um erro ao salvar as configurações. Verifique se os IDs são válidos.');
        }
    }
};


// --- EXPORTAÇÃO DE TODOS OS HANDLERS ---
module.exports = [
    // Genérico
    backToMainMenuHandler,

    // Módulo de Registro
    configRegistrationHandler,
    openRegistrationModalHandler,
    saveRegistrationConfigHandler,

    // Módulo de Ponto
    configPontoMenuHandler,
    openPontoConfigModalHandler,
    savePontoConfigHandler,

    // Módulo de Tickets
    configTicketsHandler,
    openTicketsModalHandler,
    saveTicketsConfigHandler,
];
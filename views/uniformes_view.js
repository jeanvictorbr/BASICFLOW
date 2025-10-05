const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');

async function getUniformesPanelPayload(guildId, selectedUniformId = null) {
    const embed = new EmbedBuilder();
    
    // Busca todos os uniformes para popular o menu
    const allUniformes = await db.all('SELECT id, name FROM vestuario_items WHERE guild_id = $1 ORDER BY name ASC', [guildId]);

    if (allUniformes.length === 0) {
        embed.setColor('#E74C3C').setTitle('👕 Uniformes').setDescription('Nenhum uniforme cadastrado neste servidor.');
        return { embeds: [embed] };
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('uniformes:select:view')
        .setPlaceholder('Selecione um uniforme para visualizar...')
        .addOptions(allUniformes.map(u => ({
            label: u.name,
            value: u.id.toString(),
            default: selectedUniformId ? u.id.toString() === selectedUniformId : false,
        })));
        
    if (selectedUniformId) {
        // Se um uniforme foi selecionado, busca os detalhes completos
        const selectedUniform = await db.get('SELECT * FROM vestuario_items WHERE id = $1', [selectedUniformId]);
        embed
            .setTitle(`👕 ${selectedUniform.name}`)
            .setImage(selectedUniform.image_url)
            .addFields({
                name: 'Códigos dos Itens',
                value: '`' + selectedUniform.item_codes.join('`\n`') + '`'
            })
            .setColor('#3498DB');
    } else {
        // Estado inicial do painel
        embed.setColor('#95A5A6').setTitle('👕 Catálogo de Uniformes').setDescription('Selecione um uniforme no menu abaixo para ver os detalhes e códigos.');
    }

    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    return { embeds: [embed], components };
}

module.exports = { getUniformesPanelPayload };
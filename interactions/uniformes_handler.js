const { getUniformesPanelPayload } = require('../views/uniformes_view');

const prefix = 'uniformes';

async function handle(interaction) {
    if (!interaction.isStringSelectMenu()) return;

    const [_, action, value] = interaction.customId.split(':');
    
    if (action === 'select' && value === 'view') {
        const selectedUniformId = interaction.values[0];
        const payload = await getUniformesPanelPayload(interaction.guild.id, selectedUniformId);
        
        // Atualiza a mensagem original com as informações do uniforme selecionado
        await interaction.update(payload);
    }
}

module.exports = { prefix, handle };
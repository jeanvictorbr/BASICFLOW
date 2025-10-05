// index.js
require('dotenv-flow').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { handleInteraction } = require('./interactions/handler'); // Usando o handler unificado

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Adicione a intent que faltava
    ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[AVISO] O comando em ${filePath} está a faltar a propriedade "data" ou "execute".`);
    }
}

client.once('ready', () => {
    console.log(`[INFO] Bot ${client.user.tag} está online!`);
});

// Listener unificado para todas as interações
client.on('interactionCreate', async interaction => {
    try {
        await handleInteraction(interaction);
    } catch (error) {
        console.error('Erro ao manusear a interação:', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Ocorreu um erro ao processar a sua ação!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Ocorreu um erro ao processar a sua ação!', ephemeral: true });
        }
    }
});


client.login(process.env.BOT_TOKEN);
// index.js

require('dotenv-flow').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { handleInteraction } = require('./interactions/handler');
const absenceChecker = require('./tasks/absence_checker');

// --- CORREÇÃO AQUI ---
// Importamos a função específica de dentro do módulo exportado.
const { connectToDatabase } = require('./database/db');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
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
        console.log(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
    }
}

client.once('ready', async () => {
    console.log(`[INFO] Bot ${client.user.tag} está online!`);
    absenceChecker(client);
});

client.on('interactionCreate', handleInteraction);

(async () => {
    try {
        await connectToDatabase(); // Esta chamada agora funcionará corretamente.
        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
        console.error('Falha na inicialização da base de dados ou no login do cliente:', error);
    }
})();
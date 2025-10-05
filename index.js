// index.js

require('dotenv-flow').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const connectToDatabase = require('./database/db');
const { handleInteraction } = require('./interactions/handler'); // Importa a função correta
const absenceChecker = require('./tasks/absence_checker');

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
    
    // Inicia a tarefa de verificação de ausências
    absenceChecker(client);
});

// AQUI ESTÁ A MUDANÇA PRINCIPAL
// Agora, em vez de um bloco try/catch, apenas passamos a função handleInteraction.
// Ela já tem seu próprio tratamento de erros.
client.on('interactionCreate', handleInteraction);


(async () => {
    try {
        await connectToDatabase();
        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
        // Corrigido para não chamar mais a função que não existe.
        console.error('Falha na inicialização da base de dados ou no login do cliente:', error);
    }
})();
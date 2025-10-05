// index.js

require('dotenv-flow').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { handleInteraction } = require('./interactions/handler');
const absenceChecker = require('./tasks/absence_checker');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('[INFO] Carregando comandos de barra (/).');
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[+] Comando carregado: /${command.data.name}`);
    } else {
        console.log(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
    }
}
console.log('[INFO] Todos os comandos foram carregados com sucesso.');

client.once('ready', () => {
    console.log(`[INFO] Bot ${client.user.tag} está online e operacional!`);
    absenceChecker(client);
});

client.on('interactionCreate', async interaction => {
    try {
        await handleInteraction(interaction);
    } catch (error) {
        console.error('Erro fatal ao manusear a interação:', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Ocorreu um erro ao processar a sua ação!', ephemeral: true }).catch(() => {});
        } else {
            await interaction.reply({ content: 'Ocorreu um erro ao processar a sua ação!', ephemeral: true }).catch(() => {});
        }
    }
});

console.log('[INFO] A iniciar sessão com o token...');
client.login(process.env.BOT_TOKEN);
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const dotenv = require('dotenv-flow');
const database = require('./database/schema');
const interactionHandler = require('./interactions/handler');

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
    ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('--- CARREGANDO SLASH COMMANDS ---');
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        // ✔️ NOVO LOG
        console.log(`[+] Comando /${command.data.name} carregado.`);
    } else {
        console.log(`[AVISO] O comando em ${filePath} está faltando uma propriedade "data" ou "execute".`);
    }
}
console.log('------------------------------------');


client.once(Events.ClientReady, async (c) => {
    console.log(`[INFO] Logado como ${c.user.tag}`);
    console.log('[INFO] Inicializando e verificando o banco de dados...');
    try {
        await database.initializeDatabase();
        console.log('[INFO] Banco de dados pronto.');
    } catch (error) {
        console.error('[ERRO] Não foi possível inicializar o banco de dados:', error);
        process.exit(1);
    }
    console.log('[INFO] O bot está online e pronto para operar.');
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`[ERRO] Nenhum comando correspondente a ${interaction.commandName} foi encontrado.`);
            return;
        }
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
        }
    } else {
        interactionHandler.execute(interaction);
    }
});

client.login(process.env.DISCORD_TOKEN);
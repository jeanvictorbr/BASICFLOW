const fs = require('fs');
const path = require('path');
// Adicionado "Events" na importação
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const dotenv = require('dotenv-flow');
const database = require('./database/schema');
const interactionHandler = require('./interactions/handler');

// Carrega as variáveis de ambiente
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

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[AVISO] O comando em ${filePath} está faltando uma propriedade "data" ou "execute".`);
    }
}

// ✔️ CORRIGIDO: Evento 'ready' trocado por 'Events.ClientReady'
client.once(Events.ClientReady, async () => {
    console.log(`[INFO] Logado como ${client.user.tag}`);
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

client.on('interactionCreate', async interaction => {
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
            const errorMessage = { content: 'Ocorreu um erro ao executar este comando!', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    } else {
        interactionHandler.execute(interaction);
    }
});

// Verifique seu arquivo .env! O erro TokenInvalid vem daqui.
client.login(process.env.DISCORD_TOKEN);
// Ficheiro: index.js
// Ponto de entrada principal do bot (VERSÃO DE DEPURAÇÃO)

const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv-flow').config();

const { initializeDatabase } = require('./database/schema.js');
const masterHandler = require('./interactions/handler.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ],
});

client.commands = new Collection();

async function startBot() {
    await initializeDatabase();
    loadCommands(path.join(__dirname, 'commands'));
    masterHandler.loadHandlers(path.join(__dirname, 'interactions'));
    await registerSlashCommands();
    client.login(DISCORD_TOKEN);
}

function loadCommands(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter(file => file.endsWith('.js'));
    for (const file of files) {
        try {
            const command = require(path.join(dir, file));
            if (command.data) {
                client.commands.set(command.data.name, command);
                console.log(`[INFO] Comando Carregado: ${file}`);
            }
        } catch (error) {
            console.error(`[COMMAND_LOAD_ERROR] Falha ao carregar ${file}:`, error);
        }
    }
}

client.on(Events.InteractionCreate, async (interaction) => {
    // LOG DE DEPURAÇÃO ADICIONADO AQUI
    console.log(`[DEBUG] Nova interação recebida. Tipo: ${interaction.type}. ID do Comando/Componente: ${interaction.isCommand() ? interaction.commandName : interaction.customId}`);

    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction);
        } else {
            await masterHandler.execute(interaction);
        }
    } catch (error) {
        console.error('Erro geral ao processar interação:', error);
        const replyPayload = { content: '❌ Houve um erro crítico ao processar esta ação.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(replyPayload).catch(() => {});
        } else {
            await interaction.reply(replyPayload).catch(() => {});
        }
    }
});

client.once(Events.ClientReady, readyClient => {
    console.log(`\n---\nLogado como ${readyClient.user.tag}`);
    console.log(`BasicFlow está online e pronto para servir em ${readyClient.guilds.cache.size} servidores.`);
    console.log('---\n');
});

async function registerSlashCommands() {
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    try {
        console.log('[INFO] A registar comandos (/) globais...');
        const commandsToDeploy = client.commands.map(command => command.data.toJSON());
        
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commandsToDeploy }
        );
        
        console.log(`[INFO] Comandos (/) globais registados com sucesso.`);
    } catch (error) {
        console.error('[ERRO] Falha ao registar comandos globais:', error);
    }
}

startBot();
// Ficheiro: index.js
// Ponto de entrada principal do bot (VERSÃO DE DIAGNÓSTICO ESTÁVEL).

const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv-flow').config();

// DETETOR DE ERROS GLOBAIS - Para garantir que nenhum erro passe despercebido
process.on('unhandledRejection', error => {
	console.error('ERRO GLOBAL NÃO TRATADO:', error);
});
process.on('uncaughtException', error => {
	console.error('EXCEÇÃO GLOBAL NÃO TRATADA:', error);
});

const { initializeDatabase } = require('./database/schema.js');
const masterHandler = require('./interactions/handler.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error("[ERRO CRÍTICO] As variáveis DISCORD_TOKEN ou CLIENT_ID não foram definidas no ficheiro .env. A encerrar.");
    process.exit(1);
}

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
    masterHandler.loadHandlers(); // Não precisa de argumento na versão robusta
    await registerSlashCommands();
    client.login(DISCORD_TOKEN);
}

function loadCommands(dir) {
    console.log(`[INFO] A carregar comandos de: ${dir}`);
    const commandFolders = fs.readdirSync(dir).filter(file => !file.endsWith('.js'));
    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(path.join(dir, folder)).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
             try {
                const command = require(path.join(dir, folder, file));
                if (command.data) {
                    client.commands.set(command.data.name, command);
                    console.log(`[INFO] Comando Carregado: ${file}`);
                }
            } catch (error) {
                console.error(`[COMMAND_LOAD_ERROR] Falha ao carregar ${file}:`, error);
            }
        }
    }
}

client.on(Events.InteractionCreate, async (interaction) => {
    console.log(`[DIAGNÓSTICO] Interação recebida. Tipo: ${interaction.type}. ID: ${interaction.isCommand() ? interaction.commandName : interaction.customId}`);
    
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`[ERRO] Comando "/${interaction.commandName}" não encontrado.`);
            return;
        }
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`[ERRO] Erro ao executar o comando "/${interaction.commandName}":`, error);
        }
    } else {
        await masterHandler.execute(interaction);
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
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandsToDeploy });
        console.log(`[INFO] Comandos (/) globais registados com sucesso.`);
    } catch (error) {
        console.error('[ERRO] Falha ao registar comandos globais:', error);
    }
}

startBot();
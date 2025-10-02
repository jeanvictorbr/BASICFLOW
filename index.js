// Ficheiro: index.js
// Ponto de entrada principal do bot (VERSÃO COM REGISTO INSTANTÂNEO DE COMANDOS).

const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv-flow').config();

process.on('unhandledRejection', error => console.error('ERRO GLOBAL NÃO TRATADO:', error));
process.on('uncaughtException', error => console.error('EXCEÇÃO GLOBAL NÃO TRATADA:', error));

const { initializeDatabase } = require('./database/schema.js');
const masterHandler = require('./interactions/handler.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error("[ERRO CRÍTICO] Variáveis DISCORD_TOKEN ou CLIENT_ID em falta no ficheiro .env.");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ],
});

client.commands = new Collection();

// FUNÇÃO ATUALIZADA PARA CARREGAR COMANDOS CORRETAMENTE
function loadCommands(dir) {
    console.log(`[INFO] A carregar comandos de: ${dir}`);
    if (!fs.existsSync(dir)) return;
    // Carrega apenas ficheiros .js na raiz da pasta 'commands', ignorando subpastas como 'handlers'
    const commandFiles = fs.readdirSync(dir).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
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

// NOVA FUNÇÃO ROBUSTA PARA REGISTAR COMANDOS
async function registerCommands(guildId = null) {
    const commandsToDeploy = client.commands.map(command => command.data.toJSON());
    if (commandsToDeploy.length === 0) {
        console.log('[AVISO] Nenhum comando encontrado para registar.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        if (guildId) {
            // Registo específico para um servidor (instantâneo)
            console.log(`[INFO] A registar comandos para o servidor: ${guildId}`);
            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, guildId),
                { body: commandsToDeploy }
            );
            console.log(`[INFO] Comandos registados com sucesso para o servidor: ${guildId}`);
        } else {
            // Registo global (pode demorar até 1 hora)
            console.log('[INFO] A registar comandos globalmente...');
            await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commandsToDeploy }
            );
            console.log(`[INFO] Comandos globais registados com sucesso.`);
        }
    } catch (error) {
        console.error('[ERRO] Falha ao registar comandos:', error);
    }
}

// NOVO EVENTO: GUILDCREATE
// Isto é executado sempre que o bot é adicionado a um novo servidor.
client.on(Events.GuildCreate, async (guild) => {
    console.log(`[EVENTO] O bot foi adicionado ao servidor: ${guild.name} (ID: ${guild.id})`);
    await registerCommands(guild.id); // Regista os comandos instantaneamente para o novo servidor.
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
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

async function startBot() {
    await initializeDatabase();
    loadCommands(path.join(__dirname, 'commands'));
    masterHandler.loadHandlers();
    // Apenas regista globalmente na inicialização. O evento GuildCreate trata dos novos servidores.
    await registerCommands(); 
    client.login(DISCORD_TOKEN);
}

startBot();
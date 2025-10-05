// index.js

require('dotenv-flow').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { handleInteraction } = require('./interactions/handler');
const absenceChecker = require('./tasks/absence_checker');
const { syncDatabase } = require('./database/schema'); // Importa a função de sincronização

// Função principal assíncrona para garantir a ordem de inicialização
const startBot = async () => {
    // 1. Sincroniza o banco de dados ANTES de tudo
    await syncDatabase();

    // 2. Cria e configura o cliente do Discord
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

    // 3. Carrega todos os comandos
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

    // 4. Define o que acontece quando o bot fica online
    client.once('ready', () => {
        console.log(`[INFO] Bot ${client.user.tag} está online e operacional!`);
        absenceChecker.initialize(client);
    });

    // 5. Define o handler para todas as interações
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

    // 6. Faz o login
    console.log('[INFO] A iniciar sessão com o token...');
    await client.login(process.env.BOT_TOKEN);
};

// Inicia o bot
startBot();
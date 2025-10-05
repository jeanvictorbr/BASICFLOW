// Ficheiro: index.js
// Ponto de entrada principal do bot. Responsável por iniciar o cliente, carregar comandos e lidar com eventos.

// Carrega as variáveis de ambiente (.env)
require('dotenv-flow').config();


// Módulos essenciais do Node.js
const fs = require('node:fs');
const path = require('node:path');

// Classes do discord.js
const { Client, Collection, Events, GatewayIntentBits, REST, Routes } = require('discord.js');

// Módulos internos do projeto
const { initializeDatabase } = require('./database/schema.js');
const interactionHandler = require('./interactions/handler.js');

// Verifica se o token do bot foi fornecido
if (!process.env.BOT_TOKEN) {
    console.error('[ERRO FATAL] O BOT_TOKEN não foi encontrado nas variáveis de ambiente. Verifique o seu ficheiro .env');
    process.exit(1);
}

// Cria uma nova instância do cliente Discord com as intenções (intents) necessárias
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// --- NOVO LISTENER PARA ESTADO DE VOZ ---
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    // Se o usuário não tinha canal antes (entrou) ou mudou de um canal para outro, não fazemos nada
    if (!oldState.channelId || oldState.channelId === newState.channelId) return;

    // O usuário saiu de um canal de voz (oldState.channelId existe mas newState.channelId não)
    const guildId = oldState.guild.id;
    const userId = oldState.member.id;

    const settings = await db.get('SELECT ponto_required_voice_channels FROM guild_settings WHERE guild_id = $1', [guildId]);
    
    // Verifica se a funcionalidade está ativa e se o canal de onde ele saiu era um canal obrigatório
    if (settings?.ponto_required_voice_channels?.length > 0 && settings.ponto_required_voice_channels.includes(oldState.channelId)) {
        const session = await db.get('SELECT * FROM ponto_sessoes WHERE user_id = $1 AND guild_id = $2 AND status = $3', [userId, guildId, 'active']);
        
        // Se ele tinha uma sessão ativa...
        if (session) {
            console.log(`[PONTO] Usuário ${userId} saiu do canal de voz obrigatório. Pausando ponto.`);
            
            // Aqui, chamamos a lógica de pausa (que pode ser abstraída para uma função no ponto_handler.js para evitar repetição de código)
            const now = Date.now();
            await db.run('UPDATE ponto_sessoes SET status = $1 WHERE session_id = $2', ['paused', session.session_id]);
            await db.run('INSERT INTO ponto_pausas (session_id, pause_time) VALUES ($1, $2)', [session.session_id, now]);

            const action = `⏸️ **Pausa Automática (Saída de Voz):** <t:${Math.floor(now / 1000)}:R>`;
            
            // Simula uma "interaction" falsa para a função de log
            const fakeInteraction = { guild: oldState.guild, guildId };
            await updateLogMessage(fakeInteraction, session.log_message_id, action, 'Yellow', 'Sessão de Ponto em Pausa');

            // Avise o usuário no privado
            const user = await client.users.fetch(userId);
            await user.send('⚠️ Seu ponto de serviço foi pausado automaticamente pois você saiu de um canal de voz obrigatório.').catch(() => {});
        }
    }
});


// Coleção para armazenar os comandos de barra (slash commands)
client.commands = new Collection();

// Carregamento dinâmico dos ficheiros de comando
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Verifica se o comando tem 'data' e 'execute'
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`[INFO] Comando Carregado: ${file}`);
        } else {
            console.warn(`[AVISO] O comando em ${filePath} não possui uma propriedade "data" ou "execute".`);
        }
    } catch (error) {
        console.error(`[ERRO] Falha ao carregar o comando ${file}:`, error);
    }
}

// Evento que é executado uma vez quando o bot está pronto e online
client.once(Events.ClientReady, async () => {
    console.log(`[INFO] O bot ${client.user.tag} está online!`);

    try {
        // Inicializa a base de dados e carrega os handlers de interação
        await initializeDatabase();
        interactionHandler.loadHandlers();
    } catch (error) {
        console.error('[ERRO] Falha na inicialização da base de dados ou handlers:', error);
        return process.exit(1);
    }

    // --- NOVO SISTEMA DE DEPLOYMENT DE COMANDOS ---
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        const commandsToDeploy = client.commands.map(cmd => cmd.data.toJSON());

        const devGuildId = process.env.DEV_GUILD_ID;
        const clientId = process.env.BOT_CLIENT_ID;

        if (!clientId) {
            console.error('[ERRO DE DEPLOY] A variável de ambiente BOT_CLIENT_ID é obrigatória no seu .env!');
            return;
        }

        if (devGuildId) {
            // MODO DE DESENVOLVIMENTO: Registra os comandos instantaneamente apenas no servidor de teste.
            console.log(`[INFO] Modo de desenvolvimento ativado. Registrando comandos para o servidor: ${devGuildId}`);
            await rest.put(
                Routes.applicationGuildCommands(clientId, devGuildId),
                { body: commandsToDeploy },
            );
            console.log(`[INFO] ${commandsToDeploy.length} comandos de aplicação (/) recarregados com sucesso no servidor de teste.`);
        } else {
            // MODO DE PRODUÇÃO: Registra os comandos globalmente para todos os servidores.
            console.log('[INFO] Modo de produção. Iniciando a atualização global dos comandos de aplicação (/).');
            await rest.put(
                Routes.applicationCommands(clientId),
                { body: commandsToDeploy },
            );
            console.log(`[INFO] ${commandsToDeploy.length} comandos de aplicação (/) recarregados globalmente com sucesso.`);
        }

    } catch (error) {
        console.error('[ERRO DE DEPLOY] Falha ao recarregar os comandos de aplicação (/):', error);
    }
});

// Evento que lida com todas as interações recebidas (comandos, botões, etc.)
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Nenhum comando correspondente a ${interaction.commandName} foi encontrado.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
            }
        }
    } else {
        // Se não for um comando de barra, delega para o handler de interações robusto
        await interactionHandler.execute(interaction);
    }
});

// Login do bot no Discord usando o token
client.login(process.env.BOT_TOKEN);
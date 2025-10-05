// database/db.js

const mongoose = require('mongoose');
require('dotenv-flow').config();

const MONGODB_URI = process.env.MONGODB_URI;

const connectToDatabase = async () => {
    if (!MONGODB_URI) {
        console.error('[ERRO] A string de conexão do MongoDB não foi definida no arquivo .env.');
        process.exit(1);
    }

    try {
        // As opções useNewUrlParser e useUnifiedTopology não são mais necessárias
        await mongoose.connect(MONGODB_URI);
        console.log('[INFO] Conectado com sucesso à base de dados MongoDB.');
    } catch (error) {
        console.error('[ERRO] Não foi possível conectar à base de dados:', error);
        process.exit(1);
    }
};

// --- CORREÇÃO AQUI ---
// Exportamos um objeto que contém a função.
module.exports = { connectToDatabase };
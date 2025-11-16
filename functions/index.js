const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('./src/app');
const dotenv = require('dotenv');

dotenv.config();

if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.warn('Firebase admin não inicializado via credenciais de ambiente, usando configuração padrão/local.', e.message);
  }
}

// Exporta como Function HTTPS (modo Firebase)
exports.api = functions.https.onRequest(app);

// Permite rodar localmente via `node index.js`
if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`API Controle Saudável rodando em http://localhost:${PORT}`);
  });
}

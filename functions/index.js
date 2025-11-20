const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('./src/app');
const dotenv = require('dotenv');

dotenv.config();

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_id: '111153010278361938468',
  private_key_id: '5a56a4044e4cec7f7fcb9732b3d817ae738d8ccc',
};

if (!admin.apps.length) {
  console.log('apps.length '+admin.apps.length);
  console.log('serviceAccount '+serviceAccount.project_id);
  if (serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key) {
    console.log('Entrou inicialização');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    try {
      admin.initializeApp();
    } catch (e) {
      console.warn(
        'Firebase admin não inicializado via credenciais de ambiente, usando configuração padrão/local.',
        e.message,
      );
    }
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

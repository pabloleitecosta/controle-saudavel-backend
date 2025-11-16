const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY
} = process.env;

const hasServiceAccount = FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY;

if (!admin.apps.length) {
  const config = {};

  if (FIREBASE_PROJECT_ID) {
    config.projectId = FIREBASE_PROJECT_ID;
  }

  if (hasServiceAccount) {
    config.credential = admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    });
  }

  admin.initializeApp(config);
}

module.exports = admin;

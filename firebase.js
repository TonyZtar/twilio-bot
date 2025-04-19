const admin = require('firebase-admin');
const serviceAccount = require('/etc/secrets/firebase-key.json'); // <- muy importante

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

module.exports = db;


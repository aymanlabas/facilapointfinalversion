const admin = require('firebase-admin');

// Note: Pour une utilisation réelle, téléchargez votre fichier serviceAccountKey.json 
// depuis la console Firebase (Paramètres du projet > Comptes de service)
let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Si la clé est passée directement sous forme de texte JSON (Idéal pour Render.com)
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // Si on utilise un fichier en local
    serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
}

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    // Fallback pour le développement local si pas de clé JSON (utilise les variables d'auth Google si dispo)
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'projet-hr'
    });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };

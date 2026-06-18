require('dotenv').config();
const { auth, db } = require('./config/firebase');

async function createAdmin(email, password, name) {
    try {
        console.log(`Création du compte admin pour ${email}...`);

        // 1. Créer l'utilisateur dans Firebase Auth
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
            console.log("L'utilisateur existe déjà dans Auth.");
        } catch (e) {
            userRecord = await auth.createUser({
                email,
                password,
                displayName: name,
            });
            console.log("Compte créé dans Firebase Auth.");
        }

        // 2. Mettre à jour Firestore pour lui donner le rôle ADMIN
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: email,
            name: name,
            role: 'admin',
            createdAt: new Date().toISOString()
        }, { merge: true });

        console.log("-----------------------------------");
        console.log("SUCCÈS : Le compte est maintenant un VRAI admin.");
        console.log(`Email : ${email}`);
        console.log("Vous pouvez maintenant vous connecter avec ce compte.");
        console.log("-----------------------------------");
        process.exit(0);
    } catch (error) {
        console.error("ERREUR :", error.message);
        process.exit(1);
    }
}

// On crée/met à jour votre compte principal
createAdmin('adminlabas@gmail.com', 'admin123', 'Ayman Labas');

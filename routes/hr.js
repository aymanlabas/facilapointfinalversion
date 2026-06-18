const express = require('express');
const router = express.Router();
const { db, auth } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');

// --- CONGÉS ---

router.get('/leaves', authenticate, async (req, res) => {
    try {
        const snap = await db.collection('leaves').orderBy('createdAt', 'desc').get();
        res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/leaves/:id/review', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const update = {
            status,
            reviewedBy: req.user.uid,
            reviewedAt: new Date().toISOString()
        };
        await db.collection('leaves').doc(id).update(update);
        res.json({ id, ...update });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- DÉPARTEMENTS & ÉQUIPES ---

router.get('/departments', authenticate, async (req, res) => {
    const snap = await db.collection('departments').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

router.get('/teams', authenticate, async (req, res) => {
    const snap = await db.collection('teams').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

// --- UTILISATEURS ---

// Créer un utilisateur via Firebase Admin SDK (pas de déconnexion de l'admin)
router.post('/users', authenticate, async (req, res) => {
    try {
        const { email, password, name, role, departmentId, scheduleId, photo, descriptor } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis.' });
        }

        let userRecord;
        try {
            // Créer le compte dans Firebase Auth via Admin SDK
            userRecord = await auth.createUser({
                email,
                password,
                displayName: name || '',
            });
        } catch (authError) {
            if (authError.code === 'auth/email-already-exists') {
                // Email orphelin dans Auth (compte supprimé de Firestore mais pas de Auth)
                // On récupère l'UID existant et on met à jour le mot de passe
                console.log(`Email orphelin détecté: ${email} — récupération UID existant...`);
                userRecord = await auth.getUserByEmail(email);
                await auth.updateUser(userRecord.uid, { password, displayName: name || '' });
            } else {
                throw authError;
            }
        }

        // Sauvegarder/Écraser les données dans Firestore
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            name: name || '',
            role: role || 'employee',
            departmentId: departmentId || '',
            scheduleId: scheduleId || '',
            photo: photo || null,
            descriptor: descriptor || null,
            createdAt: new Date().toISOString(),
        });

        res.status(201).json({ uid: userRecord.uid, email, name });
    } catch (e) {
        console.error("Erreur création utilisateur:", e);
        res.status(500).json({ error: e.message });
    }
});

router.delete('/users/:uid', authenticate, async (req, res) => {
    try {
        const { uid } = req.params;

        // Vérifier si l'utilisateur à supprimer n'est pas le admin connecté
        if (req.user.uid === uid) {
            return res.status(403).json({ error: "Vous ne pouvez pas supprimer votre propre compte." });
        }

        // Supprimer l'utilisateur de Firebase Auth
        await auth.deleteUser(uid);

        // Supprimer les données de l'employé de Firestore (users collection)
        await db.collection('users').doc(uid).delete();

        res.json({ message: 'Employé supprimé avec succès' });
    } catch (e) {
        console.error("Erreur back-end suppression utilisateur:", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;

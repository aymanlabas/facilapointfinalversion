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
        const { email, password, name, role, departmentId, photo, descriptor } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis.' });
        }

        // Créer le compte dans Firebase Auth via Admin SDK
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name || '',
        });

        // Sauvegarder les données dans Firestore
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            name: name || '',
            role: role || 'employee',
            departmentId: departmentId || '',
            photo: photo || null,
            descriptor: descriptor || null,
            createdAt: new Date().toISOString(),
        });

        res.status(201).json({ uid: userRecord.uid, email, name });
    } catch (e) {
        console.error("Erreur création utilisateur:", e);
        if (e.code === 'auth/email-already-exists') {
            return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
        }
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

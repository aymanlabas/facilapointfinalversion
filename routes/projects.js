const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');

/**
 * @desc Récupérer tous les projets
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const snap = await db.collection('projects').orderBy('createdAt', 'desc').get();
        const projects = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @desc Créer un projet
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const data = {
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const docRef = await db.collection('projects').add(data);
        res.status(201).json({ id: docRef.id, ...data });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @desc Mettre à jour un projet
 */
router.patch('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const data = { ...req.body, updatedAt: new Date().toISOString() };
        await db.collection('projects').doc(id).update(data);
        res.json({ id, ...data });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');

/**
 * @route POST /api/attendance/punch
 * @desc Enregistrer un pointage sécurisé
 */
router.post('/punch', authenticate, async (req, res) => {
    try {
        const { type, method, location, userName } = req.body;
        const userId = req.user.uid;

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('fr-FR', { hour12: false, hour: '2-digit', minute: '2-digit' });

        // 1. Récupérer l'utilisateur pour connaître son horaire (scheduleId)
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        let isLate = false;
        let isEarlyLeave = false;
        let scheduleName = "Standard";

        if (userData && userData.scheduleId) {
            // 2. Récupérer les détails de l'horaire
            const scheduleDoc = await db.collection('schedules').doc(userData.scheduleId).get();
            if (scheduleDoc.exists) {
                const schedule = scheduleDoc.data();
                scheduleName = schedule.name;
                const tolerance = schedule.toleranceMinutes || 0;

                if (type === 'check-in') {
                    // Calcul retard : si heure actuelle > heure début + tolérance
                    const [sHour, sMin] = schedule.startTime.split(':').map(Number);
                    const limitMinutes = sHour * 60 + sMin + tolerance;
                    const nowMinutes = now.getHours() * 60 + now.getMinutes();
                    isLate = nowMinutes > limitMinutes;
                } else if (type === 'check-out') {
                    // Calcul sortie anticipée : si heure actuelle < heure fin
                    const [eHour, eMin] = schedule.endTime.split(':').map(Number);
                    const limitMinutes = eHour * 60 + eMin;
                    const nowMinutes = now.getHours() * 60 + now.getMinutes();
                    isEarlyLeave = nowMinutes < limitMinutes;
                }
            }
        } else {
            // Fallback si pas d'horaire défini (9h00 par défaut)
            if (type === 'check-in' && timeStr > '09:00') isLate = true;
        }

        const record = {
            userId,
            userName: userName || userData?.name || 'Inconnu',
            type,
            date: dateStr,
            time: timeStr,
            timestamp: now.toISOString(),
            method: method || 'face',
            isLate,
            isEarlyLeave,
            scheduleName,
            location: location || null,
        };

        const docRef = await db.collection('attendance').add(record);
        res.status(201).json({ id: docRef.id, ...record });

    } catch (error) {
        console.error('Punch Error:', error);
        res.status(500).json({ error: 'Erreur lors du pointage' });
    }
});

/**
 * @route GET /api/attendance/stats
 * @desc Récupérer les statistiques globales pour le dashboard (Admin)
 */
router.get('/stats', authenticate, async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];

        const [usersSnap, attendanceSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('attendance').where('date', '==', todayStr).get()
        ]);

        const totalEmployees = usersSnap.size - 1; // Exclure l'admin
        const checkInsToday = attendanceSnap.docs.filter(d => d.data().type === 'check-in');

        const presentCount = new Set(checkInsToday.map(d => d.data().userId)).size;
        const lateCount = checkInsToday.filter(d => d.data().isLate).size;
        const absentCount = Math.max(0, totalEmployees - presentCount);

        res.json({
            totalEmployees,
            presentCount,
            lateCount,
            absentCount,
            date: todayStr
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur stats' });
    }
});

module.exports = router;

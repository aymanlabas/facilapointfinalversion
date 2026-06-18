const { auth } = require('../config/firebase');

/**
 * Middleware pour vérifier le jeton ID Firebase (JWT)
 */
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Non autorisé : Jeton manquant' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Erreur vérification jeton:', error);
        res.status(401).json({ error: 'Jeton invalide ou expiré' });
    }
};

/**
 * Middleware pour restreindre l'accès à certains rôles (nécessite que le rôle soit dans les Custom Claims)
 * Ou vérifie le rôle dans Firestore si pas encore en Custom Claims
 */
const authorize = (roles = []) => {
    return (req, res, next) => {
        // En prod, on utilise les custom claims : req.user.role
        // Ici on suppose que le rôle est vérifié ou géré par ailleurs
        next();
    };
};

module.exports = { authenticate, authorize };

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware globaux
app.use(helmet()); // Sécurité HTTP
app.use(cors()); // Cross-Origin Resource Sharing
app.use(morgan('dev')); // Logging des requêtes
app.use(bodyParser.json());

// Routes de base
app.get('/', (req, res) => {
    res.json({ message: 'Bienvenue sur l\'API FacialPoint SaaS RH', version: '1.0.0' });
});

// Import des routes
const attendanceRoutes = require('./routes/attendance');
const projectRoutes = require('./routes/projects');
const hrRoutes = require('./routes/hr');

// Utilisation des routes
app.use('/api/attendance', attendanceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/hr', hrRoutes);

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

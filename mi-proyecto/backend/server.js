const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database'); // Initialize DB

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve static files

// Import Routes
const authRoutes = require('./routes/auth').router;
const messageRoutes = require('./routes/messages');

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor. Intente más tarde.' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

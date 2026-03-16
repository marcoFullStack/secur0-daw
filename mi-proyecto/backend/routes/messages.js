const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('./auth'); // Import the middleware

// Get all messages (Public view)
router.get('/', (req, res) => {
    const query = `
        SELECT m.id, m.texto, m.created_at, u.username as autor 
        FROM mensajes m
        JOIN usuarios u ON m.user_id = u.id
        ORDER BY m.created_at DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener los mensajes.' });
        }
        res.json(rows); // Return simplified data, NO user hashes or unnecessary info
    });
});

// Post a new message (Requires authentication)
router.post('/', authenticateToken, (req, res) => {
    const { texto } = req.body;
    const userId = req.user.id; // Extracted from token

    if (!texto || texto.trim().length === 0) {
        return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    }

    if (texto.length > 500) {
        return res.status(400).json({ error: 'El mensaje es demasiado largo (máximo 500 caracteres).' });
    }

    db.run('INSERT INTO mensajes (user_id, texto) VALUES (?, ?)', [userId, texto], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al publicar el mensaje.' });
        }
        res.status(201).json({ message: 'Mensaje publicado exitosamente.', id: this.lastID });
    });
});

// Delete a message (Requires authentication and being the author)
router.delete('/:id', authenticateToken, (req, res) => {
    const messageId = req.params.id;
    const userId = req.user.id;

    // First check if the message exists and belongs to the user
    db.get('SELECT user_id FROM mensajes WHERE id = ?', [messageId], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al verificar el mensaje.' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Mensaje no encontrado.' });
        }

        if (row.user_id !== userId) {
            return res.status(403).json({ error: 'No tienes permiso para borrar este mensaje.' });
        }

        // If checks pass, delete it
        db.run('DELETE FROM mensajes WHERE id = ?', [messageId], function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error al borrar el mensaje.' });
            }
            res.json({ message: 'Mensaje borrado exitosamente.' });
        });
    });
});

module.exports = router;

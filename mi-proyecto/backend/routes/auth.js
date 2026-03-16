const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database'); // the sqlite db instance

// It's good practice to use an environment variable for the secret, but for this exercise a default works.
const JWT_SECRET = process.env.JWT_SECRET || 'hackathon_secret_key';

// Middleware for authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Acceso no autorizado. Provea un token.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado.' });
        req.user = user;
        next();
    });
};

router.post('/register', async (req, res) => {
    try {
        const { username, password, confirm_password } = req.body;

        if (!username || !password || !confirm_password) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
        }

        if (password !== confirm_password) {
            return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.run('INSERT INTO usuarios (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'El nombre de usuario ya existe.' });
                }
                console.error(err);
                return res.status(500).json({ error: 'Error al registrar el usuario.' });
            }
            res.status(201).json({ message: 'Usuario registrado exitosamente.' });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
        }

        db.get('SELECT * FROM usuarios WHERE username = ?', [username], async (err, row) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error al buscar el usuario.' });
            }

            if (!row) {
                return res.status(401).json({ error: 'Credenciales inválidas.' });
            }

            const isMatch = await bcrypt.compare(password, row.password);

            if (!isMatch) {
                return res.status(401).json({ error: 'Credenciales inválidas.' });
            }

            const token = jwt.sign({ id: row.id, username: row.username }, JWT_SECRET, { expiresIn: '1h' });
            
            // Return only useful info
            res.json({ token, username: row.username });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = { router, authenticateToken };

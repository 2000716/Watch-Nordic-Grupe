// server.js
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*'
}));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30
});
app.use(limiter);

const JWT_SECRET = process.env.JWT_SECRET || 'bytt_til_stor_secret';
const TOKEN_EXP = '7d';

// Static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Hjelpefunksjoner
function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}
function createUser(email, name, passwordHash) {
  const stmt = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)');
  const info = stmt.run(email, name, passwordHash);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Mangler felter' });

    const existing = findUserByEmail(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'E-post allerede registrert' });

    const hash = await bcrypt.hash(password, 12);
    const user = createUser(email.toLowerCase(), name, hash);
    return res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Serverfeil' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Mangler felter' });

    const user = findUserByEmail(email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Feil e-post eller passord' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Feil e-post eller passord' });

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXP });
    return res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Serverfeil' });
  }
});

// Forgot password
app.post('/api/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Mangler e-post' });

    const user = findUserByEmail(email.toLowerCase());
    if (!user) return res.json({ ok: true }); // Don't leak existence

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 time
    db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);

    // Send e-post hvis SMTP konfigurert
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const resetUrl = `${process.env.FRONTEND_ORIGIN || 'https://din-app.onrender.com'}/reset.html?token=${token}`;
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'no-reply@example.com',
        to: user.email,
        subject: 'Reset passord',
        text: `Klikk her for å tilbakestille passordet: ${resetUrl}`,
        html: `<p>Klikk her for å tilbakestille passordet: <a href="${resetUrl}">${resetUrl}</a></p>`
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Serverfeil' });
  }
});

// Reset password
app.post('/api/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Mangler felt' });

    const row = db.prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0').get(token);
    if (!row) return res.status(400).json({ error: 'Ugyldig eller brukt token' });

    if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'Token utløpt' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, row.user_id);
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(row.id);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Serverfeil' });
  }
});

// Protected example
app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Ingen token' });
  const [, token] = auth.split(' ');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(payload.sub);
    return res.json({ ok: true, user });
  } catch (err) {
    return res.status(401).json({ error: 'Ugyldig token' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server kjører på port ${PORT}`));

const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');

dotenv.config();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

app.use(express.json());

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function authenticateRefreshToken(req, res, next) {
  const token = req.body.token;

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_REFRESH_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.post('/api/auth/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) return res.sendStatus(400);

  try {
    const newUser = new User({ username, password });
    await newUser.save();
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send('Error al registrar el usuario');
  }
});

app.post('/api/auth/signin', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) return res.sendStatus(400);

  const user = await User.findOne({ username });
  if (!user || !(await user.comparePassword(password))) {
    return res.sendStatus(401);
  }

  const accessToken = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '30m' });
  const refreshToken = jwt.sign({ username: user.username }, JWT_REFRESH_SECRET);

  res.json({ accessToken, refreshToken });
});

app.post('/api/auth/tokens/refresh', authenticateRefreshToken, (req, res) => {
  const accessToken = jwt.sign({ username: req.user.username }, JWT_SECRET, { expiresIn: '30m' });
  res.json({ accessToken });
});

app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Acceso permitido', user: req.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

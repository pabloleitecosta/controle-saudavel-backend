const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const foodRoutes = require('./routes/foodRoutes');
const userRoutes = require('./routes/userRoutes');
const imageRoutesFactory = require('./routes/imageRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const communityRoutes = require('./routes/communityRoutes');
const upload = multer({ storage: multer.memoryStorage() });

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Controle Saudável API OK' });
});

app.use('/auth', authRoutes);
app.use('/food', foodRoutes);
app.use('/user', userRoutes);
app.use('/image', imageRoutesFactory(upload));
app.use('/gamification', gamificationRoutes);
app.use('/community', communityRoutes);



module.exports = app;

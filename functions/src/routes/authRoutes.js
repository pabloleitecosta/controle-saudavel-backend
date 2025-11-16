const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

router.post('/signup', async (req, res) => {
  const { name, email, password, age, height, weight, sex, goal } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name || email
    });

    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      age,
      height,
      weight,
      sex,
      goal,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ uid: userRecord.uid, email, name });
  } catch (err) {
    console.error('Erro signup:', err);
    res.status(500).json({ error: 'Não foi possível cadastrar o usuário.' });
  }
});

router.post('/login', async (req, res) => {
  // Normalmente o login é feito direto pelo SDK do Firebase no cliente.
  // Este endpoint é ilustrativo para casos de senhas customizadas / proxies.
  res.status(501).json({ error: 'Login via API não implementado. Use o SDK do Firebase Auth no app.' });
});

module.exports = router;

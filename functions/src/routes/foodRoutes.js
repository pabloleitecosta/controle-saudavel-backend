const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

const db = () => admin.firestore();

// Mock simples de alguns alimentos.
// Em produção, você integraria com OpenFoodFacts, FatSecret ou base própria.
const FOOD_DB = [
  {
    id: 'arroz_branco_100g',
    name: 'Arroz branco cozido',
    brand: null,
    serving_size: 100,
    serving_unit: 'g',
    calories: 130,
    protein: 2.7,
    carbs: 28,
    fat: 0.3
  },
  {
    id: 'frango_grelhado_100g',
    name: 'Frango grelhado',
    brand: null,
    serving_size: 100,
    serving_unit: 'g',
    calories: 220,
    protein: 31,
    carbs: 0,
    fat: 8
  },
  {
    id: 'salada_mista_100g',
    name: 'Salada mista (alface, tomate)',
    brand: null,
    serving_size: 100,
    serving_unit: 'g',
    calories: 25,
    protein: 1.5,
    carbs: 5,
    fat: 0.2
  }
];

router.get('/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const results = FOOD_DB.filter(item => item.name.toLowerCase().includes(q));
  res.json(results);
});

/**
 * GET /food/custom/:userId
 */
router.get('/custom/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório.' });
  }

  try {
    const snap = await db()
      .collection('custom_foods')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(items);
  } catch (err) {
    console.error('Erro ao listar alimentos customizados:', err);
    res.status(500).json({ error: 'Não foi possível buscar os alimentos.' });
  }
});

/**
 * POST /food/custom/:userId
 */
router.post('/custom/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório.' });
  }

  const {
    name,
    portionValue,
    portionUnit,
    calories,
    protein,
    carbs,
    fat,
    sugar,
    fiber,
    sodium,
  } = req.body || {};

  if (!name || !portionValue || !portionUnit || calories == null) {
    return res.status(400).json({ error: 'Informe nome, porção e calorias.' });
  }

  try {
    const payload = {
      userId,
      name: String(name),
      portionValue: Number(portionValue),
      portionUnit: String(portionUnit),
      calories: Number(calories),
      protein: Number(protein || 0),
      carbs: Number(carbs || 0),
      fat: Number(fat || 0),
      sugar: Number(sugar || 0),
      fiber: Number(fiber || 0),
      sodium: Number(sodium || 0),
      createdAt: new Date().toISOString(),
    };

    const ref = await db().collection('custom_foods').add(payload);
    res.status(201).json({ id: ref.id, ...payload });
  } catch (err) {
    console.error('Erro ao criar alimento customizado:', err);
    res.status(500).json({ error: 'Não foi possível salvar o alimento.' });
  }
});

module.exports = router;

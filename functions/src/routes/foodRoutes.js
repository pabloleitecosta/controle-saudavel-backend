const express = require('express');
const router = express.Router();

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

module.exports = router;

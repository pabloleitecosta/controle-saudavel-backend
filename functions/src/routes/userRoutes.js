const express = require('express');
const admin = require('firebase-admin');
const { processMealGamification } = require('../services/gamificationService');
const { calcularTMB, calcularTDEE } = require('../utils/tmb');

const router = express.Router();

const canonicalMealType = (raw = '') => {
  const norm = raw
    .toString()
    .toLowerCase()
    .replace(/[\u00e1\u00e0\u00e2\u00e3]/g, 'a')
    .replace(/[\u00e9\u00e8\u00ea]/g, 'e')
    .replace(/[\u00ed\u00ec\u00ee]/g, 'i')
    .replace(/[\u00f3\u00f2\u00f4\u00f5]/g, 'o')
    .replace(/[\u00fa\u00f9\u00fb]/g, 'u')
    .replace(/\u00e7/g, 'c');

  if (norm.includes('manha')) return 'Cafe da manha';
  if (norm.includes('almo')) return 'Almoco';
  if (norm.includes('jantar')) return 'Jantar';
  if (norm.includes('lanche') || norm.includes('snack')) return 'Lanches/Outros';
  if (norm.includes('agua')) return 'Contador de agua';
  return 'Personalizar Refeicoes';
};

// GET /user/:id/meals - list user meals, optional filter by date (YYYY-MM-DD)
router.get('/:id/meals', async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  try {
    const db = admin.firestore();
    const mealsCollection = db.collection('users').doc(id).collection('meals');
    let query = mealsCollection;

    if (date) {
      query = query.where('date', '==', date);
    }

    const snapshot = await query.get();
    const meals = snapshot.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, mealType: canonicalMealType(data.mealType) };
    });

    res.json(meals);
  } catch (err) {
    console.error('Erro ao buscar refeicoes:', err);
    res.status(500).json({ error: 'Nao foi possivel buscar refeicoes.' });
  }
});

// POST /user/:id/meals - save a meal with items and macro totals
router.post('/:id/meals', async (req, res) => {
  const { id } = req.params;
  const { date, items, totalCalories, totalProtein, totalCarbs, totalFat, source, mealType } = req.body;

  if (!date || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Data e itens sao obrigatorios.' });
  }

  try {
    const db = admin.firestore();
    const mealsCollection = db.collection('users').doc(id).collection('meals');
    const ref = await mealsCollection.add({
      date,
      items,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      mealType: canonicalMealType(mealType),
      source: source || 'manual',
      createdAt: new Date().toISOString(),
    });

    const gamificationResult = await processMealGamification({
      userId: id,
      date,
      source: source || 'manual',
    });

    res.status(201).json({ id: ref.id, gamification: gamificationResult });
  } catch (err) {
    console.error('Erro ao salvar refeicao:', err);
    res.status(500).json({ error: 'Nao foi possivel salvar a refeicao.' });
  }
});

// DELETE /user/:id/meals/:mealId - remove uma refeicao específica
router.delete('/:id/meals/:mealId', async (req, res) => {
  const { id, mealId } = req.params;
  try {
    const db = admin.firestore();
    const mealRef = db.collection('users').doc(id).collection('meals').doc(mealId);
    const doc = await mealRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Refeicao nao encontrada.' });
    }
    await mealRef.delete();
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir refeicao:', err);
    res.status(500).json({ error: 'Nao foi possivel excluir a refeicao.' });
  }
});

// PUT /user/:id/profile - update profile and recalc goals
router.put('/:id/profile', async (req, res) => {
  const { id } = req.params;
  const { name, age, height, weight, sex, goal, activityLevel } = req.body;

  try {
    const tmb = calcularTMB({ peso: weight, altura: height, idade: age, sexo: sex });
    const tdee = tmb ? calcularTDEE(tmb, activityLevel) : null;

    let dailyCaloriesGoal = null;
    if (tdee) {
      switch (goal) {
        case 'emagrecer':
          dailyCaloriesGoal = tdee * 0.8;
          break;
        case 'ganhar_massa':
          dailyCaloriesGoal = tdee * 1.1;
          break;
        default:
          dailyCaloriesGoal = tdee;
      }
    }

    const db = admin.firestore();
    await db.collection('users').doc(id).set(
      {
        name,
        age,
        height,
        weight,
        sex,
        goal,
        activityLevel,
        tmb,
        tdee,
        dailyCaloriesGoal,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    res.json({ success: true, tmb, tdee, dailyCaloriesGoal });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Nao foi possivel atualizar o perfil.' });
  }
});

// GET /user/:id/insights - simple example of insights
router.get('/:id/insights', async (req, res) => {
  const { id } = req.params;

  try {
    const db = admin.firestore();
    const mealsSnap = await db.collection('users').doc(id).collection('meals').get();
    const meals = mealsSnap.docs.map((d) => d.data());

    const totalCalories = meals.reduce((a, m) => a + (m.totalCalories || 0), 0);
    const totalProtein = meals.reduce((a, m) => a + (m.totalProtein || 0), 0);

    const avgCal = meals.length ? totalCalories / meals.length : 0;
    const avgProtein = meals.length ? totalProtein / meals.length : 0;

    const insights = [];
    if (avgCal < 1600) insights.push('Consumo medio baixo; revise seu deficit.');
    if (avgCal > 2500) insights.push('Consumo medio alto; revise suas metas.');
    if (avgProtein < 60) insights.push('Proteina baixa; inclua mais fontes como ovos, frango ou legumes.');
    if (avgProtein > 150) insights.push('Boa ingestao de proteina! Continue.');

    return res.json({ success: true, mealsCount: meals.length, avgCalories: avgCal, avgProtein, insights });
  } catch (err) {
    console.error('Erro ao gerar insights:', err);
    res.status(500).json({ error: 'Nao foi possivel gerar insights.' });
  }
});

module.exports = router;

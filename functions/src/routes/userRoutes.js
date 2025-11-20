const express = require('express');
const admin = require('firebase-admin');
const { processMealGamification } = require('../services/gamificationService');
const { calcularTMB, calcularTDEE } = require('../utils/tmb');

const router = express.Router();

/**
 * GET /user/:id/meals
 * Lista refeições do usuário, opcionalmente filtradas por data (YYYY-MM-DD)
 */
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
    const meals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.json(meals);
  } catch (err) {
    console.error('Erro ao buscar refeições:', err);
    res.status(500).json({ error: 'Não foi possível buscar refeições.' });
  }
});

/**
 * POST /user/:id/meals
 * Salva uma refeição com itens e totais de macronutrientes
 */
router.post('/:id/meals', async (req, res) => {
  const { id } = req.params;
  const { date, items, totalCalories, totalProtein, totalCarbs, totalFat, source } = req.body;

  if (!date || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Data e itens são obrigatórios.' });
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
      source: source || 'manual',
      createdAt: new Date().toISOString(),
    });

    // 🔥 Gamificação integrada aqui:
    const gamificationResult = await processMealGamification({
      userId: id,
      date,
      source: source || 'manual',
    });

    res.status(201).json({
      id: ref.id,
      gamification: gamificationResult,
    });

  } catch (err) {
    console.error('Erro ao salvar refeição:', err);
    res.status(500).json({ error: 'Não foi possível salvar a refeição.' });
  }
});

/**
 * PUT /user/:id/profile
 * Atualiza dados do perfil e calcula:
 * - TMB
 * - TDEE
 * - Meta diária de calorias com base no objetivo
 */
router.put('/:id/profile', async (req, res) => {
  const { id } = req.params;
  const { name, age, height, weight, sex, goal, activityLevel } = req.body;

  try {
    // Calcula TMB
    const tmb = calcularTMB({
      peso: weight,
      altura: height,
      idade: age,
      sexo: sex,
    });

    // Calcula TDEE
    const tdee = tmb ? calcularTDEE(tmb, activityLevel) : null;

    // Meta diária de calorias
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
      { merge: true }
    );

    res.json({
      success: true,
      tmb,
      tdee,
      dailyCaloriesGoal,
    });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Não foi possível atualizar o perfil.' });
  }
});

/**
 * insightsRoutes.js
 * IA de análise nutricional semanal/mensal
 */

// Gerar insights automáticos
router.get("/:id/insights", async (req, res) => {
  const { id } = req.params;

  try {
    const db = admin.firestore();
    const mealsRef = db.collection('users').doc(id).collection('meals');
    const mealsSnap = await mealsRef.get();

    const meals = mealsSnap.docs.map((d) => d.data());

    // EXEMPLO DE IA DE INSIGHTS

    const totalCalories = meals.reduce((a, m) => a + (m.totalCalories || 0), 0);
    const totalProtein = meals.reduce((a, m) => a + (m.totalProtein || 0), 0);

    const avgCal = totalCalories / meals.length;
    const avgProtein = totalProtein / meals.length;

    const insights = [];

    if (avgCal < 1600) insights.push("Seu consumo médio está baixo. Atenção ao déficit exagerado.");
    if (avgCal > 2500) insights.push("Seu consumo médio está alto. Avalie suas metas.");
    if (avgProtein < 60) insights.push("Sua ingestão de proteína está baixa. Inclua frango, ovos ou legumes.");
    if (avgProtein > 150) insights.push("Ótima ingestão de proteínas! Continue assim.");

    return res.json({
      success: true,
      mealsCount: meals.length,
      avgCalories: avgCal,
      avgProtein: avgProtein,
      insights
    });

  } catch (err) {
    console.error("Erro ao gerar insights:", err);
    res.status(500).json({ error: "Não foi possível gerar insights." });
  }
});

module.exports = router;

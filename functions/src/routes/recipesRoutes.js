const express = require('express');
const recipesService = require('../services/recipesService');

const router = express.Router();

router.post('/', async (req, res) => {
  const userId = req.user?.uid || req.body.ownerId;
  if (!userId) {
    return res.status(401).json({ error: 'Usuario nao autenticado' });
  }
  const { name, description, ingredients, steps, timeMinutes, imageUrl } = req.body;
  if (!name || !description) {
    return res.status(400).json({ error: 'Nome e descricao sao obrigatorios.' });
  }
  try {
    const recipe = await recipesService.createRecipe({
      userId,
      name,
      description,
      ingredients,
      steps,
      timeMinutes,
      imageUrl,
    });
    res.status(201).json(recipe);
  } catch (err) {
    console.error('Erro ao criar receita', err);
    res.status(500).json({ error: 'Nao foi possivel criar a receita.' });
  }
});

router.get('/', async (req, res) => {
  const userId = req.user?.uid || req.query.userId;
  const { type = 'mine' } = req.query;
  if (!userId) {
    return res.status(401).json({ error: 'Usuario nao autenticado' });
  }
  try {
    const recipes = await recipesService.listRecipes({ userId, type });
    res.json(recipes);
  } catch (err) {
    console.error('Erro ao listar receitas', err);
    res.status(500).json({ error: 'Nao foi possivel listar as receitas.' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const recipe = await recipesService.getRecipeById(id);
    if (!recipe) {
      return res.status(404).json({ error: 'Receita nao encontrada' });
    }
    res.json(recipe);
  } catch (err) {
    console.error('Erro ao buscar receita', err);
    res.status(500).json({ error: 'Nao foi possivel carregar a receita.' });
  }
});

router.post('/:id/nutrition/refresh', async (req, res) => {
  const { id } = req.params;
  try {
    const recipe = await recipesService.refreshNutrition(id);
    if (!recipe) {
      return res.status(404).json({ error: 'Receita nao encontrada ou sem imagem.' });
    }
    res.json(recipe);
  } catch (err) {
    console.error('Erro ao atualizar nutricao', err);
    res.status(500).json({ error: 'Nao foi possivel recalcular a nutricao.' });
  }
});

module.exports = router;


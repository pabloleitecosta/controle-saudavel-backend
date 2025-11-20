const { v4: uuid } = require('uuid');
const nutritionService = require('./nutritionService');

const RECIPES = [
  {
    id: '1',
    ownerId: 'demo',
    name: 'Bolo Fit de Banana',
    description: 'Receita leve e rapida.',
    ingredients: ['3 bananas maduras', '2 ovos', 'Aveia em flocos'],
    steps: 'Bata tudo e leve ao forno por 35 minutos.',
    timeMinutes: 50,
    imageUrl: null,
    nutrition: null,
  },
  {
    id: '2',
    ownerId: 'demo',
    name: 'Biscoito de Cafe',
    description: 'Biscoitos crocantes para acompanhar o cafe.',
    ingredients: ['Farinha de amendoa', 'Cafe solúvel', 'Manteiga'],
    steps: 'Misture, modele e asse por 20 minutos.',
    timeMinutes: 32,
    imageUrl: null,
    nutrition: null,
  },
];

exports.createRecipe = async (data) => {
  const recipe = {
    id: uuid(),
    ownerId: data.userId || 'demo',
    name: data.name,
    description: data.description || '',
    ingredients: data.ingredients || [],
    steps: data.steps || '',
    timeMinutes: data.timeMinutes || 0,
    imageUrl: data.imageUrl || null,
    nutrition: null,
  };
  RECIPES.unshift(recipe);
  return recipe;
};

exports.listRecipes = async ({ type }) => {
  if (type === 'explore') {
    return RECIPES;
  }
  return RECIPES.filter((_, index) => index % 2 === 0);
};

exports.getRecipeById = async (id) => {
  return RECIPES.find((item) => item.id === id) || null;
};

exports.refreshNutrition = async (id) => {
  const recipe = await exports.getRecipeById(id);
  if (!recipe || !recipe.imageUrl) {
    return recipe;
  }
  const nutrition = await nutritionService.getNutritionFromImageUrl(
    recipe.imageUrl,
  );
  recipe.nutrition = nutrition;
  return recipe;
};


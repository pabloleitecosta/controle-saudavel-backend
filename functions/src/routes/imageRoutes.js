const express = require('express');
const { recognizeImage } = require('../services/imageRecognitionService');

module.exports = (upload) => {
  const router = express.Router();

  router.post('/recognize', upload.single('image'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de imagem é obrigatório.' });
    }

    try {
      const result = await recognizeImage(req.file.buffer);
      const totalCalories = result.items.reduce((acc, i) => acc + (i.calories || 0), 0);
      const totalProtein = result.items.reduce((acc, i) => acc + (i.protein || 0), 0);
      const totalCarbs = result.items.reduce((acc, i) => acc + (i.carbs || 0), 0);
      const totalFat = result.items.reduce((acc, i) => acc + (i.fat || 0), 0);

      res.json({
        success: true,
        items: result.items,
        total_calories: totalCalories,
        total_protein: totalProtein,
        total_carbs: totalCarbs,
        total_fat: totalFat
      });
    } catch (err) {
      console.error('Erro em /image/recognize:', err);
      res.status(500).json({ error: 'Não foi possível processar a imagem.' });
    }
  });

  return router;
};

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
      res.json({
        ...result,
        items: result.items?.map((item) => ({
          ...item,
          calories: item.nutrition?.calories,
          protein: item.nutrition?.protein,
          carbs: item.nutrition?.carbs,
          fat: item.nutrition?.fat
        }))
      });
    } catch (err) {
      console.error('Erro em /image/recognize:', err);
      res.status(500).json({ error: 'Não foi possível processar a imagem.' });
    }
  });

  return router;
};

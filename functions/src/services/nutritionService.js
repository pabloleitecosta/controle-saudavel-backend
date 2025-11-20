const axios = require('axios');

exports.getNutritionFromImageUrl = async (imageUrl) => {
  const apiBaseUrl =
    process.env.API_INTERNAL_BASE_URL ||
    process.env.API_BASE_URL ||
    'https://controle-saudavel-backend.onrender.com';

  const response = await axios.post(`${apiBaseUrl}/image/recognize-by-url`, {
    imageUrl,
  });

  if (response.status >= 200 && response.status < 300) {
    return response.data;
  }

  throw new Error('Falha ao obter nutricao por IA');
};

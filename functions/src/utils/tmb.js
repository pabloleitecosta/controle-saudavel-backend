// src/utils/tmb.js
// Fórmula de Mifflin-St Jeor
function calcularTMB({ peso, altura, idade, sexo }) {
  if (!peso || !altura || !idade || !sexo) return null;

  if (sexo === 'M' || sexo === 'masculino') {
    return 10 * peso + 6.25 * altura - 5 * idade + 5;
  }
  // feminino
  return 10 * peso + 6.25 * altura - 5 * idade - 161;
}

// Ajuste por nível de atividade
function calcularTDEE(tmb, nivelAtividade) {
  const fatores = {
    'sedentario': 1.2,
    'leve': 1.375,
    'moderado': 1.55,
    'intenso': 1.725,
    'muito_intenso': 1.9,
  };
  const fator = fatores[nivelAtividade] || 1.2;
  return tmb * fator;
}

module.exports = { calcularTMB, calcularTDEE };

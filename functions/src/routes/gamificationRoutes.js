const express = require('express');
const { getGamificationSummary } = require('../services/gamificationService');

const router = express.Router();

/**
 * GET /gamification/:id/summary
 * Retorna:
 * - points
 * - streak { current, best, lastDate }
 * - achievements [ ... ]
 */
router.get('/:id/summary', async (req, res) => {
  const { id } = req.params;
  try {
    const summary = await getGamificationSummary(id);
    res.json({ success: true, ...summary });
  } catch (err) {
    console.error('Erro ao buscar gamificação:', err);
    res.status(500).json({ error: 'Não foi possível buscar gamificação.' });
  }
});

module.exports = router;

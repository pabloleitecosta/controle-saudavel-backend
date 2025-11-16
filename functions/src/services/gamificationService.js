const admin = require('firebase-admin');

const db = () => admin.firestore();

/**
 * Regras de pontos por tipo de ação
 */
const POINTS_BY_ACTION = {
  MEAL_MANUAL: 10,
  MEAL_PHOTO: 15,
  DAILY_GOAL_HIT: 20,
};

/**
 * Atualiza pontos, streak e conquistas quando o usuário registra uma refeição.
 * É chamado no POST /user/:id/meals
 */
async function processMealGamification({ userId, date, source }) {
  const batch = db().batch();
  const userRef = db().collection('users').doc(userId);
  const pointsRef = db().collection('user_points').doc(userId);
  const streakRef = db().collection('user_streaks').doc(userId);
  const achievementsRef = db().collection('user_achievements').doc(userId);

  const [userSnap, pointsSnap, streakSnap, achievementsSnap] = await Promise.all([
    userRef.get(),
    pointsRef.get(),
    streakRef.get(),
    achievementsRef.get(),
  ]);

  // --------- PONTOS ----------
  let currentPoints = pointsSnap.exists ? (pointsSnap.data().points || 0) : 0;
  let totalPoints = currentPoints;

  const actionType = source === 'photo' ? 'MEAL_PHOTO' : 'MEAL_MANUAL';
  const pointsToAdd = POINTS_BY_ACTION[actionType] || 0;
  totalPoints += pointsToAdd;

  batch.set(pointsRef, {
    userId,
    points: totalPoints,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // --------- STREAK ----------
  const today = date; // já vem em YYYY-MM-DD
  let currentStreak = 1;
  let bestStreak = 1;
  let lastDate = today;

  if (streakSnap.exists) {
    const data = streakSnap.data();
    currentStreak = data.current || 0;
    bestStreak = data.best || 0;
    lastDate = data.lastDate;

    const yesterday = getYesterday(today);
    if (lastDate === yesterday) {
      currentStreak += 1;
    } else if (lastDate === today) {
      // já contou para hoje, mantém
    } else {
      currentStreak = 1;
    }

    if (currentStreak > bestStreak) bestStreak = currentStreak;
    lastDate = today;
  }

  batch.set(streakRef, {
    userId,
    current: currentStreak,
    best: bestStreak,
    lastDate,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // --------- CONQUISTAS ----------
  const achievements = achievementsSnap.exists ? (achievementsSnap.data().items || []) : [];

  const unlockedNow = [];

  // Primeira refeição
  if (!achievements.includes('first_meal')) {
    achievements.push('first_meal');
    unlockedNow.push('first_meal');
  }

  // Primeira refeição por foto
  if (source === 'photo' && !achievements.includes('first_photo_meal')) {
    achievements.push('first_photo_meal');
    unlockedNow.push('first_photo_meal');
  }

  // Streak de 7
  if (currentStreak >= 7 && !achievements.includes('streak_7')) {
    achievements.push('streak_7');
    unlockedNow.push('streak_7');

    // bônus de pontos
    totalPoints += 100;
    batch.set(pointsRef, {
      userId,
      points: totalPoints,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  // Streak de 30
  if (currentStreak >= 30 && !achievements.includes('streak_30')) {
    achievements.push('streak_30');
    unlockedNow.push('streak_30');

    totalPoints += 300;
    batch.set(pointsRef, {
      userId,
      points: totalPoints,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  batch.set(achievementsRef, {
    userId,
    items: achievements,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  await batch.commit();

  return {
    pointsToAdd,
    totalPoints,
    currentStreak,
    bestStreak,
    unlockedNow,
  };
}

function getYesterday(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().substring(0, 10);
}

/**
 * Retorna resumo de gamificação (para a tela de Perfil / Home)
 */
async function getGamificationSummary(userId) {
  const [pointsSnap, streakSnap, achievementsSnap] = await Promise.all([
    db().collection('user_points').doc(userId).get(),
    db().collection('user_streaks').doc(userId).get(),
    db().collection('user_achievements').doc(userId).get(),
  ]);

  const points = pointsSnap.exists ? (pointsSnap.data().points || 0) : 0;
  const streak = streakSnap.exists
    ? {
        current: streakSnap.data().current || 0,
        best: streakSnap.data().best || 0,
        lastDate: streakSnap.data().lastDate || null,
      }
    : { current: 0, best: 0, lastDate: null };

  const achievements = achievementsSnap.exists
    ? (achievementsSnap.data().items || [])
    : [];

  return { points, streak, achievements };
}

module.exports = {
  processMealGamification,
  getGamificationSummary,
};

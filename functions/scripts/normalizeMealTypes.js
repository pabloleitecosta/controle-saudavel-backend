const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

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

async function run() {
  const usersSnap = await db.collection('users').get();
  for (const userDoc of usersSnap.docs) {
    const mealsRef = userDoc.ref.collection('meals');
    const mealsSnap = await mealsRef.get();
    const batch = db.batch();
    mealsSnap.forEach((doc) => {
      const mealType = canonicalMealType(doc.data().mealType);
      batch.update(doc.ref, { mealType });
    });
    if (!mealsSnap.empty) {
      console.log(`Atualizando ${mealsSnap.size} refeicoes de ${userDoc.id}`);
      await batch.commit();
    }
  }
  console.log('Normalizacao concluida');
}

run().catch((err) => {
  console.error('Erro ao normalizar mealType', err);
  process.exit(1);
});

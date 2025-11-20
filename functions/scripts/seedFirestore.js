#!/usr/bin/env node

/**
 * Seed básico para popular o Firestore com dados mockados.
 * Execute: npm run seed
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

function buildServiceAccount() {
  const decodedKey = process.env.FIREBASE_PRIVATE_KEY_BASE64
    ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
    : process.env.FIREBASE_PRIVATE_KEY;

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !decodedKey) {
    throw new Error('Defina FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.');
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: decodedKey.replace(/\\n/g, '\n'),
  };
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(buildServiceAccount()),
  });
}

const db = admin.firestore();

async function seed() {
  const userId = 'demo';
  console.log('Seeding Firestore...');

  await db.collection('users').doc(userId).set(
    {
      name: 'Usuário Demo',
      email: 'demo@controle.com',
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  );

  await seedPosts(userId);
  await seedCustomFoods(userId);
  await seedRecipes(userId);
  await seedMeals(userId);

  console.log('Seed finalizado.');
}

async function seedPosts(userId) {
  const postsRef = db.collection('posts');
  const snapshot = await postsRef.limit(1).get();
  if (!snapshot.empty) return;

  const samplePosts = [
    {
      userId,
      userName: 'Usuário Demo',
      text: 'Começando o dia com café e frutas!',
      imageUrl: null,
      totalCalories: 220,
      totalProtein: 8,
      totalCarbs: 35,
      totalFat: 5,
    },
    {
      userId,
      userName: 'Usuário Demo',
      text: 'Receita de bolo proteico super prática.',
      imageUrl:
        'https://images.unsplash.com/photo-1509401934319-cb35b19d3277?auto=format&fit=crop&w=800&q=60',
      totalCalories: 320,
      totalProtein: 20,
      totalCarbs: 25,
      totalFat: 12,
    },
  ];

  await Promise.all(
    samplePosts.map((post) =>
      postsRef.add({
        ...post,
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
      }),
    ),
  );
  console.log(' - Posts criados');
}

async function seedCustomFoods(userId) {
  const col = db.collection('users').doc(userId).collection('custom_foods');
  const snap = await col.limit(1).get();
  if (!snap.empty) return;

  const foods = [
    {
      name: 'Vitamina de Banana',
      portionValue: 250,
      portionUnit: 'ml',
      calories: 210,
      protein: 8,
      carbs: 32,
      fat: 5,
    },
    {
      name: 'Panqueca Integral',
      portionValue: 100,
      portionUnit: 'g',
      calories: 180,
      protein: 6,
      carbs: 24,
      fat: 6,
    },
  ];

  await Promise.all(
    foods.map((food) =>
      col.add({
        createdAt: new Date().toISOString(),
        ...food,
      }),
    ),
  );
  console.log(' - Alimentos customizados criados');
}

async function seedRecipes(userId) {
  const col = db.collection('recipes');
  const snap = await col.limit(1).get();
  if (!snap.empty) return;

  const items = [
    {
      ownerId: userId,
      name: 'Bolo Fit de Banana',
      description: 'Receita leve e rápida com aveia.',
      ingredients: ['3 bananas maduras', '2 ovos', 'aveia em flocos'],
      steps: 'Misture tudo no liquidificador e leve ao forno por 40 minutos.',
      timeMinutes: 50,
      imageUrl:
        'https://images.unsplash.com/photo-1543490791-db3f5a6ebd09?auto=format&fit=crop&w=800&q=60',
    },
    {
      ownerId: userId,
      name: 'Biscoito de Café',
      description: 'Crocrante e perfeito para acompanhar o café da tarde.',
      ingredients: ['farinha de amêndoas', 'café solúvel', 'manteiga ghee'],
      steps: 'Abrir a massa, modelar os grãos e assar por 25 minutos.',
      timeMinutes: 35,
      imageUrl:
        'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=800&q=60',
    },
  ];

  await Promise.all(items.map((item) => col.add({ ...item, nutrition: null })));
  console.log(' - Receitas criadas');
}

async function seedMeals(userId) {
  const col = db.collection('users').doc(userId).collection('meals');
  const snap = await col.limit(1).get();
  if (!snap.empty) return;

  await col.add({
    date: new Date().toISOString().slice(0, 10),
    items: [
      {
        label: 'Arroz branco cozido',
        calories: 193,
        protein: 3.5,
        carbs: 42,
        fat: 0.4,
      },
      {
        label: 'Café sem açúcar',
        calories: 5,
        protein: 0,
        carbs: 1,
        fat: 0,
      },
    ],
    totalCalories: 198,
    totalProtein: 3.5,
    totalCarbs: 43,
    totalFat: 0.4,
    source: 'seed',
    createdAt: new Date().toISOString(),
  });
  console.log(' - Refeição demo criada');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

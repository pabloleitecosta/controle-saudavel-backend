#!/usr/bin/env node

const BASE_URL =
  process.env.SMOKE_BASE_URL || 'https://controle-saudavel-backend.onrender.com';
const DEMO_USER = process.env.SMOKE_USER_ID || 'demo';

const endpoints = [
  { name: 'health', path: '/health' },
  { name: 'community', path: '/community/feed?limit=1' },
  { name: 'gamification', path: `/gamification/${DEMO_USER}/summary` },
  { name: 'recipes', path: `/api/recipes?userId=${DEMO_USER}&type=explore` },
];

async function run() {
  const fetcher = global.fetch;
  if (!fetcher) {
    console.error('A API fetch não está disponível nesta versão do Node.');
    process.exit(1);
  }
  const results = [];

  for (const endpoint of endpoints) {
    const url = `${BASE_URL}${endpoint.path}`;
    try {
      const response = await fetcher(url);
      const ok = response.ok;
      const statusInfo = `${response.status}${response.ok ? '' : ' ' + response.statusText}`;
      console.log(`${ok ? '✅' : '❌'}  ${endpoint.name} -> ${url} [${statusInfo}]`);
      results.push(ok);
    } catch (err) {
      console.error(`❌  ${endpoint.name} -> ${url} :: ${err.message}`);
      results.push(false);
    }
  }

  if (results.every(Boolean)) {
    console.log('\nTodos os endpoints essenciais responderam ✅');
    process.exit(0);
  }

  console.error('\nAlguns endpoints falharam. Verifique os logs acima.');
  process.exit(1);
}

run();

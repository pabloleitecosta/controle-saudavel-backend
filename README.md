# Controle Saudável - Backend

API Express utilizada pelo app Controle Saudável.

## Como rodar localmente

```bash
cd functions
npm install
cp .env.example .env # preencha com suas credenciais
npm start
```

A API expõe `GET /health` para checagem e usa a porta definida em `PORT` (padrão 5001).

## Variáveis de ambiente

Todas as chaves utilizadas em produção estão descritas em `functions/.env.example`. Configure-as no Render em **Environment → Environment Variables** (o arquivo `render.yaml` lista todas).

## Deploy no Render

O arquivo `render.yaml` contém o blueprint do serviço `controle-saudavel-backend` (id `srv-d4cu4eq4d50c73de6lp0`). No Render, defina:

- **Root directory:** `functions`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check:** `/health`
- **Node Version:** 20

Com o auto deploy ativado, qualquer push na branch `main` dispara um novo deploy.

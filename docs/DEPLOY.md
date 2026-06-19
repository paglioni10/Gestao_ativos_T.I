# 🚀 Guia de Deploy

Coloca o **T.I STORAGE** no ar de graça: banco + API no **Render** e front na
**Vercel**. (Railway é uma alternativa equivalente ao Render.)

O projeto já está preparado para deploy:

- `backend` tem `build` (gera o Prisma Client + compila) e `start:prod`
  (aplica as migrações e sobe a API).
- `frontend/vercel.json` faz o roteamento da SPA (rotas como
  `/equipamentos/:id` não dão 404 ao atualizar a página).
- Todas as configurações sensíveis vêm de variáveis de ambiente.

---

## 1. Banco de dados (Render PostgreSQL)

1. Crie conta em https://render.com e conecte sua conta do GitHub.
2. **New → PostgreSQL** (plano Free). Dê um nome e crie.
3. Copie a **Internal Database URL** (usada pela API no mesmo provedor).

## 2. API (Render Web Service)

1. **New → Web Service** → selecione o repositório `Gestao_ativos_T.I`.
2. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Health Check Path:** `/health`
3. **Environment Variables:**
   | Chave | Valor |
   | --- | --- |
   | `DATABASE_URL` | a Internal Database URL do passo 1 |
   | `JWT_SECRET` | um valor longo e aleatório |
   | `JWT_EXPIRES_IN` | `1d` |
   | `CREDENTIALS_KEY` | um valor longo e aleatório (cofre de senhas) |
   | `CORS_ORIGIN` | a URL da Vercel (você preenche depois do passo 3) |
4. Faça o deploy. Anote a URL da API, algo como
   `https://gestao-ativos-ti.onrender.com`.
5. **Primeira vez:** rode o seed uma vez para criar o admin e os tipos.
   No painel do serviço → **Shell**: `npm run seed`
   (cria `admin@empresa.com` / `admin123` — troque a senha depois).

## 3. Frontend (Vercel)

1. Crie conta em https://vercel.com e conecte o GitHub.
2. **Add New → Project** → selecione o repositório.
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (detectado automaticamente)
4. **Environment Variable:**
   | Chave | Valor |
   | --- | --- |
   | `VITE_API_URL` | `https://SUA-API.onrender.com/api` (com `/api` no final) |
5. Deploy. Anote a URL, algo como `https://t-i-storage.vercel.app`.

## 4. Conectar os dois (CORS)

1. Volte no Render → variável `CORS_ORIGIN` = a URL da Vercel **sem barra no
   final** (ex.: `https://t-i-storage.vercel.app`).
2. Redeploy da API. Pronto — abra a URL da Vercel e faça login.

> O QR Code dos equipamentos usa o `CORS_ORIGIN` para montar o link, então ele
> passará a apontar para o app publicado.

---

## ⚠️ Observações

- **Render Free hiberna** após inatividade: a primeira requisição depois de um
  tempo demora alguns segundos (a API "acorda").
- **PDFs dos termos** são salvos em disco efêmero no Render e somem a cada
  redeploy. Para produção de verdade, use armazenamento externo (ex.: S3).
  Para portfólio, tudo bem.
- Use segredos **fortes** em `JWT_SECRET` e `CREDENTIALS_KEY`. Se a
  `CREDENTIALS_KEY` mudar depois, as senhas já guardadas no cofre não poderão
  mais ser decifradas.
- Depois do primeiro acesso, **troque a senha do admin** (ou crie um novo admin
  em Colaboradores e remova o padrão).

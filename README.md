# 📦 T.I STORAGE

**Gestão de Ativos de TI** — sistema para controlar a entrega, devolução e
responsabilidade sobre equipamentos corporativos (notebooks, celulares,
monitores, ferramentas).

> **A dor que resolve:** na maioria das empresas ninguém sabe ao certo quem
> está com qual equipamento. Este sistema centraliza o controle, registra um
> termo de responsabilidade digital por entrega e mantém uma trilha de
> auditoria imutável de quem fez o quê.

## 🚀 Acesse

- **App ao vivo:** https://gestao-ativos-t-i.vercel.app
- **Login de demonstração:** `admin@empresa.com` / `admin123`

<!-- Dica: adicione aqui um print da Visão geral e/ou um GIF do fluxo de entrega. -->

## ✨ Funcionalidades

- 🔐 Autenticação com papéis (Admin / Colaborador) via JWT
- 💻 Cadastro de equipamentos com status (disponível, atribuído, manutenção, baixado)
- 🤝 Registro de entrega e devolução com histórico por colaborador
- 📝 Termo de responsabilidade digital + trilha de auditoria
- 📊 Dashboard com métricas de gestão
- 🔧 Alertas de manutenção
- 📱 QR Code para identificação dos equipamentos

## 🛠️ Stack

| Camada   | Tecnologias                                   |
| -------- | --------------------------------------------- |
| Frontend | React, TypeScript, Vite, React Router         |
| Backend  | Node.js, Express, TypeScript                  |
| Banco    | PostgreSQL + Prisma ORM                        |
| Auth     | JWT + bcrypt                                   |

## 🏗️ Arquitetura

Monorepo com backend e frontend separados. O backend segue uma arquitetura
em camadas por módulo:

```
backend/src/modules/<recurso>/
  ├── *.routes.ts      → define os endpoints e middlewares
  ├── *.controller.ts  → valida a entrada (zod) e monta a resposta
  └── *.service.ts     → regra de negócio e acesso ao banco (Prisma)
```

## 🚀 Como rodar

Pré-requisitos: Node 18+ e Docker (para o PostgreSQL).

```bash
# 1. Subir o banco de dados
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run prisma:migrate    # cria as tabelas
npm run seed              # cria o admin (admin@empresa.com / admin123)
npm run dev               # API em http://localhost:3333

# 3. Frontend (em outro terminal)
cd frontend
cp .env.example .env
npm install
npm run dev               # app em http://localhost:5173
```

## 📂 Estrutura

```
transformacao_digital/
├── docker-compose.yml     # PostgreSQL local
├── backend/               # API REST
│   ├── prisma/            # schema do banco + seed
│   └── src/
│       ├── config/        # variáveis de ambiente
│       ├── lib/           # prisma client, helpers, AppError
│       ├── middlewares/   # auth, tratamento de erros
│       └── modules/       # auth, user, equipment, assignment, dashboard
└── frontend/              # SPA em React
    └── src/
        ├── contexts/      # AuthContext
        ├── components/    # ProtectedRoute
        ├── lib/           # cliente HTTP (axios)
        └── pages/         # Login, Dashboard, Equipment
```

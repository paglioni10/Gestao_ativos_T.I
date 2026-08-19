# 📦 T.I STORAGE

**Gestão de Ativos de TI** — sistema para controlar a entrega, devolução e
responsabilidade sobre equipamentos corporativos (notebooks, celulares,
monitores, periféricos e afins).

> **A dor que resolve:** na maioria das empresas ninguém sabe ao certo quem
> está com qual equipamento. Este sistema centraliza o controle, registra um
> termo de responsabilidade por entrega e mantém uma trilha de auditoria
> imutável de quem fez o quê.

## 📖 Do portfólio para o uso real

Este projeto **nasceu como um projeto de portfólio**, para demonstrar a
construção de um sistema full-stack de gestão de ativos.

Depois da primeira versão, a **[American Burrs](https://americanburrs.com)** —
empresa onde atuo — **se interessou em usá-lo internamente**. A partir daí o
T.I STORAGE **deixou de ser um projeto de portfólio e passou a ser uma
ferramenta interna de verdade**, usada pela equipe de T.I no dia a dia.

Essa mudança de contexto guiou a evolução recente do sistema:

- Adoção da **identidade visual da American Burrs** (paleta, tipografia Montserrat, logotipo).
- Ajustes voltados à operação real: setores da empresa, cadastro em massa por
  planilha, regras de nº de série por tipo de equipamento, filtros de busca,
  ficha pública via QR Code e **automações** (ex.: alerta de estoque baixo por e-mail).
- Planejamento de **migração da infraestrutura** para os serviços e domínios
  próprios da empresa (EasyPanel).

## 🚀 Acesse

- **App ao vivo:** https://gestao-ativos-t-i.vercel.app

> O acesso é restrito à equipe de T.I da empresa — não há credenciais públicas
> de demonstração. Para rodar localmente, veja **[Como rodar](#-como-rodar)**
> (o seed cria um administrador padrão de desenvolvimento).

## ✨ Funcionalidades

**Ativos e ciclo de vida**
- 💻 Cadastro de equipamentos com status (disponível, atribuído, manutenção, baixado)
- 🏷️ Tipos de equipamento cadastráveis, com **regra de nº de série por tipo** (obrigatório ou não)
- 🤝 Registro de **entrega e devolução** transacional, com histórico por colaborador
- 📝 **Termo de responsabilidade** em PDF gerado a cada entrega
- 🗑️ Baixa lógica (preserva histórico) e exclusão definitiva com motivo auditado
- 📥 **Importação em massa** de equipamentos e colaboradores via planilha `.xlsx`/`.csv` (rejeição parcial com relatório)

**Governança e visibilidade**
- 🔐 Autenticação com papéis (Admin / Colaborador) via JWT
- 🏢 Colaboradores com **setor** e **cargo**; filtros de busca por nome, setor e papel
- 📊 Dashboard com métricas; cards de manutenção **expansíveis** mostrando os equipamentos
- 📜 **Trilha de auditoria** imutável, com filtros (data, equipamento, ação, setor) e paginação
- 🔧 Agendamento e alerta de manutenções
- 🔑 **Cofre de senhas** dos aparelhos com criptografia AES-256-GCM (distinta do hash de login)

**Identificação e automação**
- 📱 **QR Code** por equipamento que abre uma **ficha pública** read-only (sem login)
- ⚙️ **Automações** configuráveis — ex.: avisar por e-mail (Outlook/SMTP) quando o
  estoque de um tipo chega a um limite, disparando apenas na virada

## 🛠️ Stack

| Camada     | Tecnologias                                             |
| ---------- | ------------------------------------------------------- |
| Frontend   | React, TypeScript, Vite, React Router                   |
| Backend    | Node.js, Express, TypeScript                            |
| Banco      | PostgreSQL + Prisma ORM                                 |
| Auth       | JWT + bcrypt                                            |
| E-mail     | Nodemailer (SMTP / Outlook 365)                         |
| Documentos | pdfkit (termos), qrcode (etiquetas), SheetJS (planilhas)|
| Identidade | Paleta e tipografia da marca American Burrs             |

## 🏗️ Arquitetura

Monorepo com backend e frontend separados. O backend segue uma arquitetura
em camadas por módulo:

```
backend/src/modules/<recurso>/
  ├── *.routes.ts      → define os endpoints e middlewares
  ├── *.controller.ts  → valida a entrada (zod) e monta a resposta
  └── *.service.ts     → regra de negócio e acesso ao banco (Prisma)
```

Decisões de projeto que valem destacar:
- **Baixa lógica** em vez de `DELETE` onde há histórico (equipamentos e usuários),
  para nunca quebrar a trilha de auditoria e as atribuições passadas.
- **Transações** (`prisma.$transaction`) em toda operação com múltiplas escritas
  (entrega, devolução, exclusões em cascata).
- **Criptografia separada por finalidade:** bcrypt para senha de login; AES-256-GCM
  reversível para o cofre de senhas dos aparelhos.

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
npm run seed              # cria o admin padrão de desenvolvimento
npm run dev               # API em http://localhost:3333

# 3. Frontend (em outro terminal)
cd frontend
cp .env.example .env
npm install
npm run dev               # app em http://localhost:5173
```

### Variáveis de ambiente (backend)

Essenciais: `DATABASE_URL`, `JWT_SECRET`, `CREDENTIALS_KEY`, `CORS_ORIGIN`.

Opcionais (automações de e-mail — se ausentes, o envio é ignorado sem quebrar):
`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

## 📂 Estrutura

```
gestao_ti/
├── docker-compose.yml     # PostgreSQL local
├── backend/               # API REST
│   ├── prisma/            # schema do banco + migrations + seed
│   └── src/
│       ├── config/        # variáveis de ambiente
│       ├── lib/           # prisma client, mailer, auditoria, PDF, cripto
│       ├── middlewares/   # auth, tratamento de erros
│       └── modules/       # auth, user, equipment, assignment, maintenance,
│                          #   credential, audit, automation, dashboard...
└── frontend/              # SPA em React
    └── src/
        ├── contexts/      # AuthContext
        ├── components/    # Layout, Badge, PasswordInput, ...
        ├── lib/           # cliente HTTP (axios), setores, importação
        └── pages/         # Login, Dashboard, Equipment, Assignments,
                           #   Users, Audit, Automations, ...
```

## ☁️ Deploy

- **Frontend:** Vercel
- **Backend + PostgreSQL:** Render (com planejamento de migração para a
  infraestrutura própria da empresa no **EasyPanel**, usando domínios da American Burrs)

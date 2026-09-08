# Documentação Técnica de Arquitetura (SAD)
## T.I STORAGE — Sistema de Gestão de Ativos de TI

| | |
|---|---|
| **Projeto** | T.I STORAGE (Gestão de Ativos de TI) |
| **Organização** | American Burrs |
| **Versão do documento** | 1.0 |
| **Data** | 08/09/2026 |
| **Autores** | Time de Engenharia |
| **Status** | Em produção |

---

## 1. Visão Geral e Escopo

### 1.1 Descrição do sistema

O **T.I STORAGE** é uma aplicação web para o **ciclo de vida completo dos ativos de TI** de uma empresa: cadastro de equipamentos, entrega (atribuição) a colaboradores com geração de **termo de responsabilidade em PDF**, controle de manutenções, cofre de senhas dos aparelhos e uma **trilha de auditoria imutável** de todas as ações relevantes.

### 1.2 Proposta de valor

Empresas costumam controlar equipamentos (notebooks, celulares, periféricos) em planilhas — sem histórico confiável de quem está com o quê, sem termo assinado e sem rastreabilidade. O T.I STORAGE resolve isso com:

- **Fonte única da verdade** sobre cada ativo e seu status (disponível → atribuído → manutenção → baixado).
- **Compliance**: cada evento gera um registro de auditoria que nunca é apagado.
- **Formalização**: termo de responsabilidade em PDF com QR Code para consulta pública da ficha do aparelho.
- **Proatividade**: automações por e-mail avisam sobre estoque baixo e prazos de manutenção.

### 1.3 Público-alvo

| Perfil | Papel no sistema | O que faz |
|---|---|---|
| **Administrador de TI** | `ADMIN` | Cadastra ativos e tipos, registra entregas/devoluções, gerencia manutenções, senhas, automações e colaboradores; resolve pedidos de redefinição de senha. |
| **Colaborador** | `COLLABORATOR` | Recebe equipamentos, consulta seus ativos, assina o termo, solicita redefinição de senha. |
| **Público (sem login)** | — | Acessa a **ficha pública** de um equipamento ao escanear o QR Code do termo. |

### 1.4 Limites do sistema (escopo)

**Dentro do escopo:**
- Gestão de equipamentos, tipos de equipamento e status.
- Atribuições (entrega/devolução) com termo em PDF e QR Code.
- Registro e conclusão de manutenções.
- Cofre de credenciais dos aparelhos (criptografia AES-256-GCM).
- Trilha de auditoria imutável.
- Automações por e-mail (estoque baixo e prazo de manutenção).
- Autenticação por JWT com papéis (ADMIN/COLLABORATOR) e fluxo de redefinição de senha via solicitação ao admin.
- Importação de equipamentos e colaboradores por planilha (`.xlsx`/`.csv`).
- Dashboard com indicadores.

**Fora do escopo (atual):**
- Assinatura digital certificada (ICP-Brasil) do termo — hoje é PDF simples.
- Integração com Active Directory / SSO corporativo.
- App mobile nativo (o front é responsivo, mas web).
- Gestão financeira/depreciação contábil dos ativos.
- Envio de e-mail transacional em massa (o disparo é pontual, por automação).

---

## 2. Arquitetura do Sistema

### 2.1 Estilo arquitetural

**Monólito modular** com **SPA desacoplada** (frontend e backend independentes, comunicando-se por API REST/JSON).

**Justificativa:**
- **Domínio coeso e time enxuto** — o esforço operacional de microsserviços (orquestração, service mesh, observabilidade distribuída) não se paga na escala atual.
- **Modularidade interna** — o backend é organizado por módulos de domínio (`equipment`, `assignment`, `automation`, `audit`, …), cada um com suas rotas, controller e service. Isso mantém as fronteiras claras e permite extrair um módulo para serviço próprio no futuro, sem reescrever tudo.
- **Transações simples** — operações como "entregar equipamento + mudar status + gravar auditoria" ocorrem numa única base transacional, sem coordenação distribuída.
- **Deploy barato e rápido** — dois artefatos (SPA estática + API Node) hospedáveis em PaaS de baixo custo.

A checagem temporal (prazos de manutenção) segue o padrão **cron externo → endpoint protegido**, evitando um agendador interno não confiável em ambiente que hiberna por inatividade.

### 2.2 Diagrama de Arquitetura

```mermaid
flowchart TB
    subgraph Client["Cliente (navegador)"]
        SPA["Frontend SPA<br/>React + Vite + TypeScript"]
    end

    subgraph Cloud["Infraestrutura (Cloud)"]
        API["Backend API<br/>Node.js + Express + Prisma"]
        DB[("PostgreSQL<br/>Neon")]
    end

    subgraph Ext["Serviços externos / automação"]
        SMTP["Servidor SMTP<br/>(Outlook/Office 365)"]
        GHA["GitHub Actions<br/>Cron diário + Backup"]
    end

    SPA -- "HTTPS / REST (JSON)<br/>Bearer JWT" --> API
    API -- "Prisma ORM / SQL" --> DB
    API -- "SMTP (avisos)" --> SMTP
    GHA -- "POST /cron/maintenance-checks<br/>(x-cron-secret)" --> API
    GHA -- "pg_dump (backup diário)" --> DB
    Public["Usuário público"] -- "GET /ficha/:id (QR Code)" --> SPA

    classDef db fill:#e8f0fe,stroke:#4285f4;
    class DB db;
```

### 2.3 Camadas do backend

```
Request → Middleware (CORS, JSON, Auth JWT, papel)
        → Routes (define método + caminho + guardas)
        → Controller (valida entrada com Zod, formata resposta)
        → Service (regra de negócio, orquestra Prisma + auditoria + e-mail)
        → Prisma (acesso ao banco)
        → errorHandler (centraliza tratamento de erro → JSON padronizado)
```

---

## 3. Requisitos do Sistema

### 3.1 Requisitos Funcionais (RFs)

| ID | Descrição | Prioridade |
|---|---|---|
| RF-01 | Autenticar usuários por e-mail/senha e emitir token JWT com papel (ADMIN/COLLABORATOR). | Alta |
| RF-02 | Cadastrar, editar, listar, filtrar e dar baixa em equipamentos. | Alta |
| RF-03 | Cadastrar tipos de equipamento em runtime, definindo se o nº de série é obrigatório. | Média |
| RF-04 | Registrar atribuição (entrega) de um equipamento a um colaborador e sua devolução. | Alta |
| RF-05 | Gerar termo de responsabilidade em PDF e QR Code que aponta para a ficha pública do ativo. | Alta |
| RF-06 | Registrar manutenções programadas e marcá-las como concluídas. | Média |
| RF-07 | Armazenar credenciais dos aparelhos criptografadas (AES-256-GCM) e revelá-las sob demanda ao admin. | Alta |
| RF-08 | Registrar toda ação relevante em uma trilha de auditoria imutável e consultável. | Alta |
| RF-09 | Configurar automações de e-mail: alerta de estoque baixo por tipo e aviso de prazo de manutenção. | Média |
| RF-10 | Disparar diariamente a checagem de prazos de manutenção (aviso de proximidade e de estouro), sem duplicar avisos. | Média |
| RF-11 | Gerenciar colaboradores (criar, redefinir senha, dar baixa) e importar em massa por planilha. | Média |
| RF-12 | Permitir ao colaborador solicitar redefinição de senha e ao admin resolvê-la. | Média |
| RF-13 | Exibir dashboard com indicadores (total, disponíveis, atribuídos, em manutenção, prazos vencidos). | Média |
| RF-14 | Expor ficha pública de um equipamento (sem login) via QR Code. | Baixa |

### 3.2 Requisitos Não-Funcionais (RNFs)

**Desempenho**
- Respostas de leitura de listas em **< 500 ms** sob carga típica (dezenas de usuários internos).
- Filtros e ordenação de listas resolvidos no cliente quando o volume é pequeno; paginação/consulta no servidor para tabelas maiores (auditoria).

**Segurança**
- Autenticação por **JWT** assinado (`JWT_SECRET`); autorização por papel (`ensureAuth`, `ensureAdmin`).
- Senhas de usuário armazenadas com **bcrypt** (hash, não reversível).
- Credenciais de aparelhos com **AES-256-GCM** (reversível, mas cifrado); a chave-mestra (`CREDENTIALS_KEY`) fica **fora do banco**, em variável de ambiente.
- Validação de entrada com **Zod** em todos os endpoints de escrita.
- Endpoint de cron protegido por **segredo compartilhado** (`x-cron-secret`), fora do fluxo de JWT.
- CORS restrito à origem do frontend (`CORS_ORIGIN`).
- "Exclusão" de usuário é **baixa lógica** (`active=false`) para preservar histórico.

**Escalabilidade**
- Backend **stateless** (JWT no cliente) → escala horizontalmente por réplicas atrás de um balanceador.
- Banco gerenciado (Neon) com **connection pooling** (endpoint `-pooler`) para suportar múltiplas instâncias serverless.
- Módulos de domínio isolados permitem extrair serviços caso um subdomínio cresça.

**Disponibilidade**
- Banco gerenciado com alta disponibilidade e **backup diário automatizado** (GitHub Actions + `pg_dump`, retenção 90 dias).
- Health check em `GET /health`.
- Migrações versionadas (Prisma Migrate) aplicadas no deploy (`prisma migrate deploy`).
- **Ponto de atenção conhecido:** o PaaS atual (Render free) hiberna por inatividade, gerando *cold start*; mitigado por *keep-alive* e planejada migração para VPS/EasyPanel.

---

## 4. Modelo de Dados

### 4.1 Principais entidades

| Entidade | Descrição | PK | Chaves estrangeiras |
|---|---|---|---|
| **User** | Usuário (admin ou colaborador). | `id` | — |
| **EquipmentType** | Tipo de equipamento (notebook, celular…). | `id` | — |
| **Equipment** | Ativo de TI. | `id` | `typeId → EquipmentType` |
| **Assignment** | Vínculo equipamento ↔ colaborador (entrega). | `id` | `equipmentId → Equipment`, `receiverId → User`, `createdById → User` |
| **MaintenanceRecord** | Manutenção programada/realizada. | `id` | `equipmentId → Equipment` |
| **DeviceCredential** | Credencial cifrada de um aparelho. | `id` | `equipmentId → Equipment` |
| **Automation** | Regra de automação (estoque baixo / prazo). | `id` | `equipmentTypeId → EquipmentType` (nullable) |
| **MaintenanceReminder** | Aviso de manutenção já enviado (idempotência). | `id` | `automationId → Automation`, `maintenanceRecordId → MaintenanceRecord` |
| **AuditLog** | Registro imutável de evento. | `id` | `performedById → User` (nullable), `equipmentId → Equipment` (nullable) |
| **PasswordResetRequest** | Pedido de redefinição de senha. | `id` | `userId → User`, `resolvedById → User` (nullable) |

**Regras notáveis:**
- `Equipment.serialNumber` e `EquipmentType.name` e `User.email` são **únicos**.
- `MaintenanceReminder` tem **unicidade composta** `(automationId, maintenanceRecordId, kind)` — garante no máximo 1 aviso de cada tipo por manutenção.
- `Assignment.returnedAt = null` ⇒ equipamento ainda em posse do colaborador.
- Exclusão de `Automation`/`MaintenanceRecord` faz **cascade** nos `MaintenanceReminder`.

### 4.2 Diagrama Entidade-Relacionamento (ER)

```mermaid
erDiagram
    User ||--o{ Assignment : "recebe (receiver)"
    User ||--o{ Assignment : "registra (createdBy)"
    User ||--o{ AuditLog : "executa"
    User ||--o{ PasswordResetRequest : "solicita"
    User ||--o{ PasswordResetRequest : "resolve"

    EquipmentType ||--o{ Equipment : "classifica"
    EquipmentType ||--o{ Automation : "escopo (LOW_STOCK)"

    Equipment ||--o{ Assignment : "possui"
    Equipment ||--o{ MaintenanceRecord : "sofre"
    Equipment ||--o{ DeviceCredential : "guarda"
    Equipment ||--o{ AuditLog : "referencia"

    Automation ||--o{ MaintenanceReminder : "gera"
    MaintenanceRecord ||--o{ MaintenanceReminder : "origina"

    User {
        string id PK
        string name
        string email UK "nullable"
        string passwordHash
        enum   role "ADMIN|COLLABORATOR"
        enum   sector "nullable"
        bool   active
    }
    EquipmentType {
        string id PK
        string name UK
        bool   serialRequired
    }
    Equipment {
        string id PK
        string name
        string serialNumber UK "nullable"
        enum   status "AVAILABLE|ASSIGNED|MAINTENANCE|RETIRED"
        string typeId FK
    }
    Assignment {
        string id PK
        enum   status "ACTIVE|RETURNED"
        datetime assignedAt
        datetime returnedAt "nullable"
        string termPdfPath "nullable"
        string equipmentId FK
        string receiverId FK
        string createdById FK
    }
    MaintenanceRecord {
        string id PK
        string description
        datetime scheduledFor
        datetime completedAt "nullable"
        string equipmentId FK
    }
    Automation {
        string id PK
        enum   type "LOW_STOCK|MAINTENANCE_DUE"
        int    threshold "nullable"
        int    leadDays "nullable"
        string recipient
        bool   active
        string equipmentTypeId FK "nullable"
    }
    MaintenanceReminder {
        string id PK
        string kind "APPROACHING|OVERDUE"
        datetime sentAt
        string automationId FK
        string maintenanceRecordId FK
    }
    DeviceCredential {
        string id PK
        string label
        string secretEncrypted
        string iv
        string authTag
        string equipmentId FK
    }
    AuditLog {
        string id PK
        string action
        string entity
        string entityId
        json   metadata "nullable"
        string performedById FK "nullable"
        string equipmentId FK "nullable"
    }
    PasswordResetRequest {
        string id PK
        string email
        enum   status "PENDING|RESOLVED"
        string userId FK
        string resolvedById FK "nullable"
    }
```

---

## 5. Especificação de APIs / Endpoints

**Padrão:** REST sobre HTTPS, corpo em JSON. Base: `/api`. Autenticação por header `Authorization: Bearer <JWT>`, exceto onde indicado. Erros retornam `{ "message": "..." }` com o status HTTP apropriado.

### 5.1 Autenticação — `/api/auth`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/auth/login` | público | Autentica e retorna token + usuário. |
| POST | `/api/auth/register` | ADMIN | Registra usuário. |

**Exemplo — `POST /api/auth/login`**

Requisição:
```json
{ "email": "ti@americanburrs.com", "password": "SenhaForte@1" }
```
Resposta `200 OK`:
```json
{
  "token": "eyJhbGciOiJIUzI1Ni...",
  "user": { "id": "167897ce-...", "name": "Administrador", "role": "ADMIN" }
}
```
Status previstos: `200` (ok), `400` (payload inválido), `401` (credenciais inválidas).

### 5.2 Equipamentos — `/api/equipment`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/equipment` | auth | Lista equipamentos (aceita filtros por query). |
| GET | `/api/equipment/:id` | auth | Detalhe de um equipamento. |
| GET | `/api/equipment/:id/qrcode` | auth | PNG do QR Code da ficha pública. |
| POST | `/api/equipment` | ADMIN | Cria equipamento. |
| PUT | `/api/equipment/:id` | ADMIN | Atualiza equipamento. |
| DELETE | `/api/equipment/:id` | ADMIN | Baixa (lógica) do equipamento. |

**Exemplo — `POST /api/equipment`**

Requisição:
```json
{
  "name": "Dell Latitude 5440",
  "typeId": "3f2b...",
  "serialNumber": "BR-9981-77",
  "notes": "Comprado em 2026"
}
```
Resposta `201 Created`:
```json
{
  "id": "a1c2...",
  "name": "Dell Latitude 5440",
  "status": "AVAILABLE",
  "serialNumber": "BR-9981-77",
  "typeId": "3f2b..."
}
```
Status previstos: `201`, `400` (validação), `401`, `403` (não-admin), `409` (nº de série duplicado).

### 5.3 Atribuições — `/api/assignments`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/assignments` | auth | Lista atribuições. |
| POST | `/api/assignments` | ADMIN | Registra entrega. |
| PATCH | `/api/assignments/:id/return` | ADMIN | Registra devolução. |
| GET | `/api/assignments/:id/term` | auth | Baixa o PDF do termo de responsabilidade. |

**Exemplo — `POST /api/assignments`**
```json
{ "equipmentId": "a1c2...", "receiverId": "77aa...", "notes": "Home office" }
```
Resposta `201`: objeto da atribuição criada (`status: "ACTIVE"`). Status: `201`, `400`, `401`, `403`, `409` (equipamento indisponível).

### 5.4 Manutenções — `/api/maintenances`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/maintenances` | auth | Lista manutenções. |
| POST | `/api/maintenances` | ADMIN | Agenda manutenção. |
| PATCH | `/api/maintenances/:id/complete` | ADMIN | Conclui manutenção. |

### 5.5 Automações — `/api/automations`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/automations` | ADMIN | Lista automações. |
| POST | `/api/automations` | ADMIN | Cria automação (LOW_STOCK ou MAINTENANCE_DUE). |
| PUT | `/api/automations/:id` | ADMIN | Edita automação. |
| DELETE | `/api/automations/:id` | ADMIN | Exclui automação. |
| POST | `/api/automations/:id/test-email` | ADMIN | Envia e-mail de teste. |
| POST | `/api/automations/cron/maintenance-checks` | **segredo** `x-cron-secret` | Checagem diária de prazos (uso do cron externo). |

**Exemplo — `POST /api/automations` (prazo de manutenção)**
```json
{ "type": "MAINTENANCE_DUE", "leadDays": 7, "recipient": "ti@americanburrs.com" }
```
**Exemplo — resposta de `POST /cron/maintenance-checks`** `200 OK`:
```json
{ "emailConfigured": true, "automations": 1, "pending": 4, "approachingSent": 2, "overdueSent": 1 }
```
Status previstos: `200`, `401` (segredo ausente/errado).

### 5.6 Demais recursos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/equipment-types` | auth | Lista tipos de equipamento. |
| GET | `/api/dashboard/summary` | auth | Indicadores do dashboard. |
| GET | `/api/audit` | ADMIN | Consulta a trilha de auditoria. |
| GET/POST | `/api/credentials` | ADMIN | Lista/cria credencial de aparelho. |
| GET | `/api/credentials/:id/reveal` | ADMIN | Decifra e revela o segredo. |
| DELETE | `/api/credentials/:id` | ADMIN | Remove credencial. |
| GET/POST | `/api/users` | ADMIN | Lista/cria colaboradores. |
| POST | `/api/users/import` | ADMIN | Importa colaboradores por planilha. |
| PATCH | `/api/users/:id/password` | ADMIN | Redefine senha. |
| DELETE | `/api/users/:id` | ADMIN | Baixa lógica do colaborador. |
| GET | `/api/password-reset-requests` | ADMIN | Lista pedidos de redefinição. |
| PATCH | `/api/password-reset-requests/:id/resolve` | ADMIN | Resolve o pedido. |
| GET | `/health` | público | Health check. |

---

## 6. Guia de Instalação e Execução Local

### 6.1 Pré-requisitos

- **Node.js** ≥ 20 e **npm**.
- **Docker** (para o PostgreSQL local) — ou um PostgreSQL 16+ acessível.
- **Git**.

### 6.2 Configuração

Clone e instale as dependências dos dois projetos:

```bash
git clone https://github.com/paglioni10/Gestao_ativos_T.I.git
cd Gestao_ativos_T.I
```

**Backend** — crie `backend/.env`:

```bash
# Banco
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gestao_ativos?schema=public"

# Autenticação
JWT_SECRET="troque-por-uma-string-aleatoria-forte"
JWT_EXPIRES_IN="1d"

# Cofre de senhas (AES-256-GCM) — 32 bytes em hex (64 caracteres)
CREDENTIALS_KEY="0000000000000000000000000000000000000000000000000000000000000000"

# CORS (origem do frontend)
CORS_ORIGIN="http://localhost:5173"

# Cron dos avisos de manutenção (opcional em dev)
CRON_SECRET="segredo-do-cron"

# SMTP (opcional — sem isto, o envio de e-mail é ignorado)
SMTP_HOST="smtp.office365.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="ti@americanburrs.com"
SMTP_PASS="********"
SMTP_FROM="ti@americanburrs.com"
```

**Frontend** — crie `frontend/.env`:

```bash
VITE_API_URL="http://localhost:3333/api"
```

### 6.3 Subir o banco, migrar e rodar

```bash
# 1) PostgreSQL local via Docker
docker compose up -d

# 2) Backend: dependências, migrações e seed
cd backend
npm install
npx prisma migrate dev
npm run seed          # cria dados iniciais (ex.: usuário admin)
npm run dev           # API em http://localhost:3333

# 3) Frontend (em outro terminal)
cd ../frontend
npm install
npm run dev           # SPA em http://localhost:5173
```

### 6.4 Comandos úteis

```bash
npm run build         # backend: prisma generate && tsc | frontend: build de produção
npx prisma studio     # inspeção visual do banco
npx tsc --noEmit      # checagem de tipos
```

---

## 7. Estratégia de Deploy e DevOps

### 7.1 Pipeline de CI/CD recomendada

```mermaid
flowchart LR
    Dev["Push / PR<br/>branch main"] --> CI

    subgraph CI["CI — GitHub Actions"]
        L["Lint + Typecheck<br/>(tsc --noEmit)"]
        B["Build<br/>(frontend + backend)"]
        L --> B
    end

    CI --> CD

    subgraph CD["CD"]
        MIG["prisma migrate deploy"]
        REL["Deploy Backend (API)"]
        FE["Deploy Frontend (SPA)"]
        MIG --> REL
    end

    REL --> PROD["Produção"]
    FE --> PROD
```

**Etapas sugeridas:**
1. **CI** em cada push/PR: instalar dependências, `tsc --noEmit` (front e back) e `npm run build`. Falha aqui bloqueia o merge.
2. **CD** no merge para `main`: o serviço de hospedagem executa `npm run start:prod`, que roda `prisma migrate deploy` (aplica migrações versionadas) e sobe a API; o frontend é publicado como estático.
3. **Segredos** ficam no cofre da plataforma (variáveis de ambiente) e no GitHub Secrets (`CRON_SECRET`, `PROD_DATABASE_URL`).

### 7.2 Infraestrutura de hospedagem

| Componente | Hospedagem atual | Observação |
|---|---|---|
| **Frontend (SPA)** | Vercel / estático | Build Vite servido por CDN. |
| **Backend (API)** | Render (Web Service) | `start:prod` aplica migrações no deploy. |
| **Banco de dados** | **Neon (PostgreSQL)** | Gerenciado, com pooling (`-pooler`) para a app e endpoint direto para backups. |
| **Automação/cron** | GitHub Actions | Workflows diários (avisos de manutenção, keep-alive, backup). |

> **Nota de evolução:** o plano free do Render bloqueia portas SMTP de saída e hiberna por inatividade. Está prevista a migração da API para **VPS com EasyPanel**, onde o SMTP funciona e não há *cold start*.

### 7.3 Jobs automatizados (GitHub Actions)

| Workflow | Agenda | Função |
|---|---|---|
| **Backup do banco** | Diário | `pg_dump` do PostgreSQL de produção; artefato com retenção de 90 dias. |
| **Avisos de manutenção** | Diário (~08:00 BRT) | `POST /api/automations/cron/maintenance-checks` com `x-cron-secret`. |
| **Keep API awake** | ~10 min | Ping em `/health` para reduzir hibernação. |

### 7.4 Monitoramento e logs

- **Logs de aplicação** via `stdout` (capturados pela plataforma de hospedagem); erros de automação/SMTP logados com contexto (`[automation] …`, `[mailer] …`).
- **Health check** em `GET /health` para *uptime monitors* externos (ex.: UptimeRobot / cron-job.org).
- **Auditoria de negócio** persistida em `AuditLog` — rastreabilidade de quem fez o quê.
- **Recomendações de evolução:** agregador de logs (ex.: Grafana Loki / Better Stack), *error tracking* (Sentry) e alertas de falha nos workflows do GitHub Actions.

---

*Documento gerado para fins de referência arquitetural. Mantê-lo versionado junto ao código e atualizá-lo a cada mudança estrutural (schema, novos módulos, mudança de hospedagem).*

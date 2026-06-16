# 🗺️ Roadmap de construção

Sugestão de ordem para você ir construindo e **commitando por fase**. Cada fase
é um conjunto coerente de commits — bom para mostrar evolução no histórico do Git.

## ✅ Fase 0 — Esqueleto (feito)

- [x] Estrutura do monorepo (backend + frontend)
- [x] PostgreSQL via Docker Compose
- [x] Modelo de dados (Prisma schema)
- [x] Autenticação JWT (register/login) — completa
- [x] Equipamentos: listar / detalhar / criar — fatia vertical de referência
- [x] Dashboard: métricas-resumo — completo
- [x] Frontend: login, rota protegida, dashboard, lista de equipamentos

## ✅ Fase 1 — CRUD completo de equipamentos (feito)

- [x] `PUT /equipment/:id` — editar (`equipmentService.update`)
- [x] `DELETE /equipment/:id` — baixar equipamento (status → RETIRED, soft delete)
- [x] Formulário de cadastro/edição no frontend (visível só para admin)
- [x] Registrar `AuditLog` na criação/edição/baixa (helper `lib/audit.ts`)

## ✅ Fase 2 — Entrega e devolução (núcleo do projeto) (feito)

- [x] `assignmentService.create` — entregar equipamento
  - valida que o equipamento está `AVAILABLE`
  - cria Assignment + muda status para `ASSIGNED` numa **transação** (`prisma.$transaction`)
  - grava `AuditLog` "ASSIGNMENT_CREATED"
- [x] `assignmentService.returnEquipment` — registra devolução (transação inversa + auditoria)
- [x] Tela de Atribuições no frontend (entrega + devolução, só admin)
- [ ] Histórico de posse por colaborador (tela dedicada — fica como melhoria; os dados já existem)

## 🔨 Fase 3 — Termo de responsabilidade + auditoria

- [ ] Gerar PDF do termo na entrega (ex: lib `pdfkit`)
- [ ] Captura de assinatura (canvas) e geração do `signatureHash`
- [ ] Tela de consulta da trilha de auditoria

## 🔨 Fase 4 — QR Code e manutenção

- [ ] Gerar QR Code do equipamento (lib `qrcode`, já nas dependências)
- [ ] Escanear QR → abrir ficha/checkin do equipamento
- [ ] CRUD de manutenções + alertas no dashboard

## 🔐 Fase 4.5 — Cofre de senhas dos aparelhos

> Registrar as senhas atuais de cada aparelho (BIOS, conta do SO, PIN, etc.).
> **Atenção:** senha de aparelho precisa ser RECUPERÁVEL, então usa-se
> **criptografia (AES-256-GCM)**, e NÃO hash (diferente do login de usuário).

- [ ] Tabela `DeviceCredential` (label, username, segredo cifrado, iv, authTag) ligada a `Equipment`
- [ ] Cifrar/decifrar com chave-mestra vinda do `.env` (em produção: KMS/cofre)
- [ ] Acesso apenas para ADMIN; listagem nunca devolve o segredo
- [ ] Endpoint separado de "revelar" senha
- [ ] Cada revelação gera um `AuditLog` (quem viu qual senha e quando)

## 🚀 Fase 5 — Polimento e deploy

- [ ] Tratamento de loading/erros no frontend
- [ ] Deploy: frontend na Vercel, backend + banco no Render/Railway
- [ ] Print/GIF no README + link do app no ar

## 💡 Dicas de commit

- Faça commits pequenos e com mensagem no imperativo: `feat: adiciona devolução de equipamento`.
- Um commit por unidade de trabalho que funciona — evite "WIP" gigante.
- Convenção sugerida: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.

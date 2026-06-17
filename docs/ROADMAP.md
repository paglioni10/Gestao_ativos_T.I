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

## ✅ Fase 3 — Termo de responsabilidade + auditoria (feito)

- [x] Gerar PDF do termo na entrega (lib `pdfkit`, em `lib/term.ts`) + download (`GET /assignments/:id/term`)
- [x] Captura de assinatura (canvas, `SignaturePad`) e geração do `signatureHash` (SHA-256)
- [x] Tela de consulta da trilha de auditoria (`GET /api/audit`, página `Audit`)

## ✅ Fase 4 — QR Code e manutenção (feito)

- [x] Gerar QR Code do equipamento (`GET /equipment/:id/qrcode`, lib `qrcode`)
- [x] Escanear QR → abre a ficha do equipamento (página `EquipmentDetail`)
- [x] CRUD de manutenções (agendar/concluir, módulo `maintenance`) com transação de status
- [x] Alerta de manutenções atrasadas no dashboard (`overdueMaintenance`)

## ✅ Fase 4.5 — Cofre de senhas dos aparelhos (feito)

> Registra as senhas atuais de cada aparelho (BIOS, conta do SO, PIN, etc.).
> **Atenção:** senha de aparelho precisa ser RECUPERÁVEL, então usa-se
> **criptografia (AES-256-GCM)**, e NÃO hash (diferente do login de usuário).

- [x] Tabela `DeviceCredential` (label, username, segredo cifrado, iv, authTag) ligada a `Equipment`
- [x] Cifrar/decifrar com chave-mestra vinda do `.env` (`lib/crypto.ts`; em produção: KMS/cofre)
- [x] Acesso apenas para ADMIN; listagem nunca devolve o segredo
- [x] Endpoint separado de "revelar" senha (`GET /credentials/:id/reveal`)
- [x] Cada revelação gera um `AuditLog` (`CREDENTIAL_REVEALED`)

## 🎨 Fase 5 — Polimento visual (em refinamento)

- [x] Design system (cores, tipografia, componentes) em `index.css`
- [x] Layout com barra de navegação consistente entre as páginas (`Layout`/`AppLayout`)
- [x] Badges de status, tabelas, botões e formulários estilizados
- [x] Tratamento de loading/erros no frontend (mensagens em `.alert-error`)
- [x] Modo escuro com alternância persistida (`ThemeToggle`)
- [ ] Ajustes visuais adicionais (a definir)

## ✅ Fase 6 — Acessibilidade mínima (feito)

- [x] Labels associados aos inputs (`htmlFor`/`id`); canvas da assinatura com `aria-label`
- [x] `aria-label`/`title` em botões só com ícone; ícones decorativos com `aria-hidden`; imagens com `alt`
- [x] Estados de foco visíveis (`:focus-visible`) e navegação por teclado (links/botões reais)
- [x] Contraste de cores ajustado (texto secundário AA no claro e escuro)
- [x] HTML semântico e `scope="col"` nas tabelas
- [x] Modo de alto contraste (3º tema: claro → escuro → alto contraste)

## 🚀 Fase 7 — Deploy e conferência final

- [ ] Deploy: frontend na Vercel, backend + banco no Render/Railway
- [ ] Print/GIF no README + link do app no ar
- [ ] Conferência final ponta a ponta

## 💡 Dicas de commit

- Faça commits pequenos e com mensagem no imperativo: `feat: adiciona devolução de equipamento`.
- Um commit por unidade de trabalho que funciona — evite "WIP" gigante.
- Convenção sugerida: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.

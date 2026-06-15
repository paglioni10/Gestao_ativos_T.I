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

## 🔨 Fase 1 — CRUD completo de equipamentos

- [ ] `PUT /equipment/:id` — editar (implementar `equipmentService.update`)
- [ ] `DELETE /equipment/:id` — baixar equipamento (status → RETIRED)
- [ ] Formulário de cadastro/edição no frontend (visível só para admin)
- [ ] Registrar `AuditLog` na criação/edição

## 🔨 Fase 2 — Entrega e devolução (núcleo do projeto)

- [ ] `assignmentService.create` — entregar equipamento (ver TODOs no arquivo)
  - validar que o equipamento está `AVAILABLE`
  - criar Assignment + mudar status para `ASSIGNED` numa **transação**
- [ ] `assignmentService.returnEquipment` — registrar devolução
- [ ] Telas de entrega/devolução no frontend
- [ ] Histórico de posse por colaborador

## 🔨 Fase 3 — Termo de responsabilidade + auditoria

- [ ] Gerar PDF do termo na entrega (ex: lib `pdfkit`)
- [ ] Captura de assinatura (canvas) e geração do `signatureHash`
- [ ] Tela de consulta da trilha de auditoria

## 🔨 Fase 4 — QR Code e manutenção

- [ ] Gerar QR Code do equipamento (lib `qrcode`, já nas dependências)
- [ ] Escanear QR → abrir ficha/checkin do equipamento
- [ ] CRUD de manutenções + alertas no dashboard

## 🚀 Fase 5 — Polimento e deploy

- [ ] Tratamento de loading/erros no frontend
- [ ] Deploy: frontend na Vercel, backend + banco no Render/Railway
- [ ] Print/GIF no README + link do app no ar

## 💡 Dicas de commit

- Faça commits pequenos e com mensagem no imperativo: `feat: adiciona devolução de equipamento`.
- Um commit por unidade de trabalho que funciona — evite "WIP" gigante.
- Convenção sugerida: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.

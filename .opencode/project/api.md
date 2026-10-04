# API — Documentação de Contratos

Base URL: `http://localhost:4000/api/v1`

Formato de resposta padrão:

- Sucesso: `{ "success": true, "data": ... }`
- Erro: `{ "success": false, "error": { "code", "message" } }`

---

## Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | Login (email + senha) → `{ token, user }` |
| GET | `/users/me` | Perfil do usuário autenticado (Bearer token) |
| GET | `/users` | Lista usuários do establishment (ADMIN/MANAGER) |

Login: `{ "email": "...", "password": "..." }`
JWT: `Authorization: Bearer <token>` | expiração 8h.

Erros: `INVALID_CREDENTIALS`, `USER_INACTIVE`, `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_TOKEN`.

### RBAC — papéis elevados (FASE 23)

`ADMIN` e `MANAGER` são papéis **SUPERVISORES**: nunca ficam bloqueados
por uma allowlist de rota **operacional** (incluindo as rotas exclusivas
dos painéis `/waiter` e `/kitchen`). A regra é aplicada de forma
centralizada no middleware `authorize` (`ELEVATED_ROLES`), e não repetida
rota a rota — assim nenhuma rota operacional nova nasce com o MANAGER
por engano de fora da lista. Espelha o frontend, onde `/admin/*`,
`/waiter` e `/kitchen` aceitam ADMIN e MANAGER.

| Papel | Acesso |
|-------|--------|
| `ADMIN` | Total (inclusive gestão de equipe e settings) |
| `MANAGER` | Total nas rotas operacionais; **sem** gestão de equipe |
| `WAITER` | Operação no seu escopo: mesas sem vínculo ou vinculadas a ele; pedidos, comandas e pagamentos |
| `KITCHEN` | Operação: fila de pedidos (global) e transições de preparo; mesas apenas sem vínculo |

**Exceção explícita:** a gestão de equipe (`/users` CRUD) NÃO é rota
operacional e permanece **ADMIN-only** — o MANAGER não administra
credenciais de outros gestores. A exceção usa `authorizeAdminOnly()`,
que ignora o bypass dos papéis elevados, deixando a decisão explícita e
auditável no código.


## Estabelecimentos (SaaS — FASE 18)

### POST `/establishments/register` — onboarding público (sem JWT)

Cadastro de novos restaurantes. Cria o `Establishment` e o `User` inicial
(role `ADMIN`) atomicamente em **uma transação** (`$transaction`). O hash
bcrypt é aplicado à senha do proprietário antes da persistência.

Body:

```json
{
  "name": "Balneário Praia Azul",
  "slug": "praia-azul",
  "ownerName": "Carlos Proprietário",
  "ownerEmail": "carlos@praiaazul.com",
  "ownerPassword": "senha-segura-123"
}
```

- `slug`: minúsculo, sem acentos, hífens entre segmentos
  (regex `^[a-z0-9]+(-[a-z0-9]+)*$`). Globalmente único na plataforma.
- E-mail do proprietário é globalmente único (não pode ser reutilizado em
  outro restaurante).
- Resposta `201`: `{ establishment, owner }` — sem `passwordHash` e sem
  token (o proprietário faz login no fluxo seguinte).
- Erros: `VALIDATION_ERROR` (400), `SLUG_ALREADY_IN_USE` (409),
  `EMAIL_ALREADY_IN_USE` (409).

### GET/PUT `/establishments/me` — configurações (ADMIN e MANAGER)

- `GET`: configurações do estabelecimento autenticado (`establishmentId`
  extraído do JWT, nunca de parâmetro/body).
- `PUT`: atualiza parcialmente `name`, `logoUrl`, `serviceFeeEnabled`,
  `serviceFeeRate` (0–100, máx. 2 casas decimais); campos ausentes são ignorados.
- `serviceFeeRate` retornado normalizado como `number`.
- Erros: `VALIDATION_ERROR`, `AUTH_REQUIRED`, `FORBIDDEN`,
  `ESTABLISHMENT_NOT_FOUND`.

## Usuários (Equipe)

Roles: `ADMIN`, `MANAGER`, `WAITER`, `KITCHEN`.

CRUD da equipe **restrito a `ADMIN`** (FASE 18). `GET /users/me` continua
acessível a qualquer role autenticada.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/users/me` | Perfil do usuário autenticado (qualquer role) |
| GET | `/users` | Lista usuários do **mesmo** estabelecimento (ADMIN) |
| GET | `/users/:id` | Detalhe de membro da equipe (ADMIN, tenant do token) |
| POST | `/users` | Cria membro (ADMIN) — `name`, `email`, `password`, `role`, `phone?` |
| PUT/PATCH | `/users/:id` | Atualiza membro (ADMIN) — `name?`, `email?`, `password?`, `role?`, `phone?`, `active?` |
| DELETE | `/users/:id` | Remove membro (ADMIN) |

> Estas rotas usam `authorizeAdminOnly()` — **exceção explícita** ao acesso
> irrestrito de ADMIN/MANAGER (ver "RBAC — papéis elevados"). O MANAGER
> recebe `403 FORBIDDEN` aqui por decisão de segurança: gerir credenciais
> da equipe não é operação.


Regras:

- `role` permitida na criação/edição: `MANAGER`, `WAITER`, `KITCHEN` —
  **nunca** `ADMIN` (ADMIN nasce somente no onboarding).
- `establishmentId` NUNCA vem do body: é injetado passivamente pelo token
  do ADMIN (multi-tenancy).
- Listagem/detalhe sempre filtrados pelo tenant: um ADMIN de A não vê nem
  altera usuários de B.
- Usuários `ADMIN` (proprietário) não podem ser modificados nem excluídos:
  `CANNOT_MODIFY_ADMIN` (400) / `CANNOT_DELETE_ADMIN` (400) — evita
  rebaixamento/remoção do único ADMIN e "lockout" do restaurante.
- E-mail é globalmente único: conflito → `EMAIL_ALREADY_IN_USE` (409).

## Áreas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/areas` | Listar áreas do establishment (filtro `?q=`) |
| POST | `/areas` | Criar área |
| GET | `/areas/:id` | Detalhe da área |
| PATCH | `/areas/:id` | Atualizar área |
| DELETE | `/areas/:id` | Excluir área (400 se houver mesas) |

`establishmentId` sempre vindo do token JWT (multi-tenancy).

Erros: `VALIDATION_ERROR`, `AREA_NOT_FOUND`, `AREA_HAS_TABLES`, `FORBIDDEN`.

## Mesas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/tables` | Listar mesas (filtros `?areaId=&q=&status=`) |
| POST | `/tables` | Criar mesa (gera `qrCode` UUID automaticamente) |
| GET | `/tables/:id` | Detalhe da mesa |
| PATCH | `/tables/:id` | Atualizar mesa |
| DELETE | `/tables/:id` | Excluir mesa (400 se houver sessões/pedidos) |
| PATCH | `/tables/:id/status` | Alterar status da mesa |
| PUT | `/tables/:id/waiters` | Definir garçons vinculados à mesa (MANAGER/ADMIN) |

### Permissões (FASE 23 — leitura × escrita)

| Rotas | WAITER | KITCHEN | MANAGER | ADMIN |
|-------|--------|---------|---------|-------|
| `GET /tables`, `GET /tables/:id` | ✅ (escopo) | ✅ (escopo) | ✅ | ✅ |
| `POST /tables`, `PUT/PATCH /tables/:id`, `DELETE /tables/:id` | ❌ | ❌ | ✅ | ✅ |
| `PUT /tables/:id/waiters` | ❌ | ❌ | ✅ | ✅ |

- **Leitura liberada para a operação**: o salão do garçom (`/waiter`)
  lista as mesas para tocar comandas, abrir a conta e acompanhar o
  Delivery. Antes desta fase o WAITER recebia `403 FORBIDDEN`
  ("Permissão insuficiente") ao abrir o painel.
- **Escrita continua exclusiva de ADMIN/MANAGER**: o WAITER apenas
  enxerga as mesas — não cria, edita nem remove (a allowlist de escrita
  não inclui WAITER/KITCHEN).
- **Escopo por garçom (FASE 23)**: um `WAITER` só vê (e só opera) mesas
  **sem garçons vinculados** (bolsa comum do salão) ou mesas em que
  está explicitamente vinculado. Mesas vinculadas a outros garçons
  desaparecem do `GET /tables` e o `GET /tables/:id` responde
  `TABLE_NOT_FOUND` (não vaza a existência). `KITCHEN` também vê apenas
  mesas sem vínculo, mas **não** tem essa restrição nos pedidos.
  `ADMIN`/`MANAGER` têm visão global irrestrita.
- `PUT /tables/:id/waiters` recebe `{ "userIds": ["<uuid>", ...] }`
  (array, pode ser vazio, máx 50). Substitui o conjunto de vínculos
  (`set`). Cada usuário precisa ser `WAITER`, **ativo** e do mesmo
  establishment — senão `400 INVALID_WAITER`.
- As respostas de mesa incluem `waiters: [{ id, name }]`.
- `GET /tables` aceita `?areaId=`; `establishmentId` sempre do JWT, então
  um garçom de A jamais vê as mesas de B.

`number` (String), `capacity` (1–100), `areaId` obrigatória.

Ciclo de status da mesa no fluxo de comanda: `AVAILABLE` → `OCCUPIED`
(abertura de sessão) → `BILL_REQUESTED` (solicitação de conta) → `AVAILABLE`
(fechamento da comanda).

Erros: `VALIDATION_ERROR`, `AREA_NOT_FOUND`, `AREA_HAS_TABLES`, `TABLE_NOT_FOUND`, `TABLE_NUMBER_CONFLICT`, `TABLE_HAS_SESSIONS_OR_ORDERS`, `INVALID_WAITER`.

## Categorias

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/categories` | Listar (ordenar por `?orderBy=displayOrder\|name\|createdAt&order=asc\|desc`) |
| POST | `/categories` | Criar categoria |
| GET | `/categories/:id` | Detalhe |
| PATCH | `/categories/:id` | Atualizar |
| DELETE | `/categories/:id` | Excluir (400 se houver produtos) |

Campos: `name`, `description?`, `icon?`, `displayOrder?` (default 0), `active` (default true).

Erros: `VALIDATION_ERROR`, `CATEGORY_NOT_FOUND`, `CATEGORY_HAS_PRODUCTS`.

## Produtos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/products` | Listar (filtros `?categoryId=&q=&available=`) |
| POST | `/products` | Criar produto |
| GET | `/products/:id` | Detalhe |
| PATCH | `/products/:id` | Atualizar produto |
| DELETE | `/products/:id` | Excluir (400 se houver itens de pedido) |
| PATCH | `/products/:id/availability` | Alternar disponibilidade |

Preços: `Decimal(10,2)`, positivos, máx 9.999.999,99, máx 2 casas decimais.
`promotionalPrice <= price` (quando informado).
`price` retornado como `number` normalizado.

Erros: `VALIDATION_ERROR`, `CATEGORY_NOT_FOUND`, `PRODUCT_NOT_FOUND`, `PRODUCT_HAS_ORDERS`.

## Grupos de Adicionais (ModifierGroup)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/modifier-groups` | Listar grupos (com `_count` de modifiers e produtos vinculados) |
| POST | `/modifier-groups` | Criar grupo |
| GET | `/modifier-groups/:id` | Detalhe (inclui modifiers) |
| PUT | `/modifier-groups/:id` | Atualizar grupo |
| DELETE | `/modifier-groups/:id` | Excluir (400 se vinculado a produtos) |

Campos: `name`, `selectionType` (`SINGLE`|`MULTIPLE`, default SINGLE),
`minSelections` (default 0), `maxSelections?`, `active` (default true).
Regra: `minSelections <= maxSelections` (quando ambos presentes).

Acesso: ADMIN/MANAGER. tenant via JWT.

Erros: `VALIDATION_ERROR`, `MODIFIER_GROUP_NOT_FOUND`, `MODIFIER_GROUP_HAS_PRODUCTS`, `FORBIDDEN`.

## Adicionais (Modifier)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/modifiers` | Listar (filtros `?modifierGroupId=&active=true\|false`) |
| POST | `/modifiers` | Criar adicional (precisa `modifierGroupId`) |
| GET | `/modifiers/:id` | Detalhe |
| PUT | `/modifiers/:id` | Atualizar |
| DELETE | `/modifiers/:id` | Excluir (snapshots em pedidos são preservados via SET NULL) |

Campos: `modifierGroupId` (uuid), `name`, `price` (positivo, ≤2 casas, máx 9.999.999,99), `active`.

Acesso: ADMIN/MANAGER. Multi-tenancy via `modifierGroupId` validado contra o JWT.

Erros: `VALIDATION_ERROR`, `MODIFIER_GROUP_NOT_FOUND`, `MODIFIER_NOT_FOUND`, `FORBIDDEN`.

## Pedidos (Operação — cozinha/garçom)

Rotas privadas. Acesso: ADMIN, MANAGER, WAITER, KITCHEN (RBAC fino na transição).

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/orders` | Listar pedidos operacionais do establishment |
| GET | `/orders/:id` | Detalhe operacional do pedido |
| PATCH | `/orders/:id/status` | Transição de status (máquina de estados + RBAC) |

### GET /orders — filtros

- `status=PENDING&status=CONFIRMED` — múltiplos status (ou um único)
- `scope=ACTIVE` — fila viva: PENDING, CONFIRMED, PREPARING, READY
- `tableId=<uuid>` — pedidos de uma mesa
- `tableSessionId=<uuid>` — pedidos de uma comanda
- `orderBy=createdAt` (default), `order=asc|desc` (default asc = fila de chegada)

**Visão Global de Pedidos (FASE 22)** — sem filtro de status:

- `ADMIN`/`MANAGER`: recebem **todos** os pedidos do estabelecimento,
  independentemente do status (inclui `DELIVERED` e `CANCELLED`) —
  visão gerencial completa;
- `WAITER`/`KITCHEN`: recebem por padrão a fila viva (`ACTIVE`) +
  `DELIVERED` (pedidos de comandas abertas) — **nunca** `CANCELLED`;
- **Escopo por garçom (FASE 23)**: além do filtro de status, um `WAITER`
  só vê pedidos de **mesas sem garçons vinculados** ou de **mesas
  vinculadas a ele mesmo**. `KITCHEN` **não** é filtrado por vínculo de
  mesa (a cozinha prepara tudo); `ADMIN`/`MANAGER` têm visão global.

### Máquina de Estados

```text
PENDING → CONFIRMED → PREPARING → READY → DELIVERED
   └── CANCELLED ←──┘ (de qualquer estado vivo)
```

- Um passo por vez (sem saltos: PENDING→DELIVERED é INVALID).
- Estados terminais: `DELIVERED`, `CANCELLED` — sem transições de saída.
- Transição para o mesmo status é INVALID.

### RBAC de transição (por status de destino)

| Status destino | Roles permitidas |
|----------------|------------------|
| CONFIRMED | WAITER, MANAGER, ADMIN |
| PREPARING | KITCHEN, MANAGER, ADMIN |
| READY | KITCHEN, MANAGER, ADMIN |
| DELIVERED | WAITER, MANAGER, ADMIN |
| CANCELLED | WAITER, MANAGER, ADMIN |

Ordem de validação: (1) pedido no tenant; (2) transição válida na máquina;
(3) escopo do garçom — um `WAITER` não opera pedido de mesa vinculada a
outro garçom (`403 FORBIDDEN`); (4) role autorizada p/ o destino. Erros:
`ORDER_NOT_FOUND`, `INVALID_STATUS_TRANSITION`, `FORBIDDEN`.

Em sucesso, emite `ORDER_STATUS_UPDATED` (ver WebSocket).

## Comandas (TableSession) — Conta e Fechamento

Rotas privadas. Acesso: WAITER, MANAGER, ADMIN.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/table-sessions/:id/bill` | Resumo financeiro da comanda |
| PATCH | `/table-sessions/:id/adjustments` | Ajustes manuais (desconto/acréscimo) — só comanda `OPEN` |
| POST | `/table-sessions/:id/close` | Fechamento atômico (transação) |

### GET /table-sessions/:id/bill

Resumo da comanda para fechamento (calculado NO SERVIDOR):

- Ignora pedidos `CANCELLED`;
- `subtotal` = Σ subtotais dos pedidos válidos;
- `discount` = Σ descontos dos pedidos + `session.discountAmount` (ajuste manual);
- `serviceFee` = subtotal × (serviceFeeRate ÷ 100) se habilitado;
- `extraCharge` = `session.extraChargeAmount` (ajuste manual; ex.: couvert);
- `total` = `max(0, subtotal − discount + serviceFee + extraCharge)` — **nunca negativo**.

**Ajustes manuais (FASE 23)**: `discountAmount`, `extraChargeAmount` e
`extraChargeNote` ficam na própria `TableSession` e são alterados via
`PATCH /table-sessions/:id/adjustments`. O bill é **sempre recalculado no
servidor**; o cliente nunca envia totais. O PATCH exige a comanda `OPEN`
(senão `409 SESSION_CLOSED`) e exige ao menos um campo.

**Intenção de pagamento (FASE 22)**: `session` também inclui
`paymentMethodIntent` (`CASH`|`CARD`|`PIX`, nullable) e `changeRequested`
(número, nullable), lidos da própria `TableSession` (persistidos no
`request-bill`). Permite ao garçom exibir a intenção mesmo quando o evento
realtime `BILL_REQUESTED` foi perdido (fallback do painel).
`changeRequested` é `Decimal` no banco e é serializado como `number`.

```json
{
  "session": {
    "id", "sessionToken", "status", "openedAt", "closedAt",
    "paymentMethodIntent": "CASH",
    "changeRequested": 100,
    "discountAmount": 10,
    "extraChargeAmount": 5,
    "extraChargeNote": "Couvert",
    "table": { "number", "status", "waiters": [{ "id", "name" }] }
  },
  "establishment": { "id", "name", "serviceFeeEnabled", "serviceFeeRate" },
  "summary": { "ordersCount", "itemsCount", "subtotal", "discount", "serviceFee", "serviceFeeRate", "extraCharge", "extraChargeNote", "total" },
  "orders": [{ "id", "orderNumber", "status", "subtotal", "discount", "serviceFee", "total", "items": [...] }],
  "items": [{ "orderNumber", "productName", "quantity", "unitPrice", "totalPrice", "modifiers" }]
}
```

> `variantName` continua a ser devolvido em itens de pedidos históricos como
> snapshot legado (Fase 23 removeu o conceito de variações). Em pedidos novos
> é sempre `null`; `variantId` enviado por clientes antigos é ignorado e o
> preço base do produto é usado.

### POST /table-sessions/:id/close

Fechamento atômico em **uma transação** (`$transaction`):

1. **TRAVA**: se existir pedido em aberto (PENDING, CONFIRMED, PREPARING,
   READY) → `400 SESSION_HAS_OPEN_ORDERS` (comanda não fecha com serviço pendente).
2. **CONCILIAÇÃO**: `total` recalculado no servidor (inclui ajustes manuais);
   se `total > 0` e Σ pagamentos `PAID < total` → `400 INSUFFICIENT_PAYMENT`
   com `{ total, paidAmount, missingAmount }`. Comanda com `total = 0`
   fecha **sem pagamento** (destrava mesas sem consumo).
3. `TableSession` → `CLOSED` + `closedAt`.
4. `Table` → `AVAILABLE` (liberada para novos clientes).
5. Emite `SESSION_CLOSED` (audiência por mesa/garçom — ver WebSocket).

Erros: `VALIDATION_ERROR`, `SESSION_NOT_FOUND`, `SESSION_ALREADY_CLOSED`,
`SESSION_HAS_OPEN_ORDERS`, `FORBIDDEN`.

## Pagamentos — Máquina de Estados e Gateway PIX

Rotas privadas. Acesso: WAITER, MANAGER e ADMIN. Multi-tenancy via sessão + JWT.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/table-sessions/:id/payments` | Listar pagamentos da comanda (+ summary) |
| POST | `/table-sessions/:id/payments` | Registrar pagamento (PIX injeta mock de gateway) |
| PATCH | `/payments/:id` | Atualizar valor/método (status via máquina) |
| PATCH | `/payments/:id/status` | **Transição de estado** (máquina de estados) |
| DELETE | `/payments/:id` | **Estorno** (MANAGER/ADMIN): remove o pagamento e recalcula o saldo |

### Máquina de Estados

```text
PENDING → PAID
PENDING → FAILED
PENDING → CANCELLED
PAID    → REFUNDED
(FAILED, REFUNDED, CANCELLED) → terminais — sem saída
```

- Transição para o mesmo estado ou não prevista → `400 INVALID_PAYMENT_TRANSITION`.
- Datas gravadas automaticamente: `paidAt`, `failedAt`, `refundedAt`, `cancelledAt`.
- O endpoint PATCH `/payments/:id` também respeita a máquina (não é possível
  burlar as regras por ele).

### Mock de Gateway PIX

Criar pagamento `method: PIX` injeta (FASE 11 — integração fictícia):

- `gatewayTransactionId`: `"PIX-<uuid>"`;
- `gatewayResponse`: payload simulado "PIX Copia e Cola" — `copyPaste`
  (formato EMV® QR Code), `qrCodeBase64` (placeholder), `emittedAt`,
  `expiresAt` (+15min), `status: CREATED`.

Campos persistidos: `amount`, `method` (`CASH|CARD|PIX`), `status`,
`gatewayTransactionId`, `gatewayResponse`, `paidAt`/`failedAt`/`refundedAt`/
`cancelledAt`.

### Estorno de pagamento (FASE 23)

`DELETE /payments/:id` é uma operação de **estorno**, restrita a
`MANAGER`/`ADMIN` (WAITER/KITCHEN → `403 FORBIDDEN`). Remove o pagamento
independentemente do status (inclusive `PAID`) e devolve o saldo
recalculado da comanda:

```json
{ "removedPaymentId", "tableSessionId", "total", "paidAmount", "remaining", "settled" }
```

Permite corrigir uma cobrança lançada por engano sem reabrir a comanda.
Multi-tenancy garantido via comanda + JWT.

Erros: `VALIDATION_ERROR`, `SESSION_NOT_FOUND`, `PAYMENT_NOT_FOUND`,
`INVALID_PAYMENT_TRANSITION`, `PAYMENT_NOT_PENDING`, `FORBIDDEN`.

## Fechamento com Conciliação e Comprovante

### POST `/table-sessions/:id/close` (conciliação rigorosa)

Além das travas da Fase 10 (`SESSION_HAS_OPEN_ORDERS`), agora:

1. Calcula o TOTAL da comanda no servidor (subtotal − desconto + taxa de serviço);
2. Soma os pagamentos com status **PAID** da comanda;
3. Se soma < TOTAL → `400 INSUFFICIENT_PAYMENT` informando no `error`:
   `{ total, paidAmount, missingAmount }` — comanda **não fecha**;
4. Se pago ≥ TOTAL → fechamento atômico (`$transaction`): sessão `CLOSED`,
   mesa `AVAILABLE`, evento `SESSION_CLOSED`.

Regras: pagamentos `PENDING/FAILED/REFUNDED/CANCELLED` **não** contam para a
conciliação (refunds criam "buraco"); comanda com total 0 (sem pedidos) fecha
sem pagamento; excesso de pagamento (troco/gorjeta) não bloqueia. O `total`
já inclui descontos de pedido e ajustes manuais da comanda
(`discountAmount`/`extraChargeAmount`). Um **estorno** (`DELETE /payments/:id`)
reduz imediatamente o `paidAmount` e, se deixar a comanda em falta, o fecho
passa a responder `INSUFFICIENT_PAYMENT`.

### GET `/table-sessions/:id/receipt` (privado) e
### GET `/public/table-sessions/:sessionToken/receipt` (público)

Comprovante fiscal não-oficial — resumo **estático e consolidado** (snapshot):

- `receiptId` (= sessionId) e `emittedAt`;
- `establishment` (nome/contato/endereço) e `table` (nº, nome, área);
- `summary`: `ordersCount`, `itemsCount`, `subtotal`, `discount`,
  `serviceFeeRate`, `serviceFee`, `extraCharge`, `extraChargeNote`, `total`;
- `items`: **consolidados** por produto/preço/adicionais iguais
  (quantidade somada);
- `payments`: extrato dos pagamentos **aprovados** (PAID) com método, valor,
  `paidAt` e `gatewayTransactionId`;
- `totals`: `total`, `paidAmount`, `remaining`, `settled`.

O público funciona também para sessões `CLOSED` (comprovante final do cliente)
e nunca expõe o `sessionToken`. Erros: `SESSION_NOT_FOUND`.

## API Pública (cliente — sem JWT)

Endpoints públicos do cardápio. Proteção contra abuso: validação rígida e
**todos os preços são recalculados no servidor a partir do banco**.

### GET `/public/menu/:slug`

Cardápio completo do estabelecimento (somente active/available).

### GET `/public/table/:qrCode`

Identifica a mesa pelo QR Code. Cria automaticamente uma `TableSession`
(status `OPEN`) e marca a mesa `OCCUPIED` (em uma transação); reutiliza a
sessão aberta se existir.

```json
{
  "table": { "id", "number", "name", "capacity", "status", "area" },
  "establishment": { "id", "name", "slug" },
  "sessionToken": "<uuid>"
}
```

Erros: `VALIDATION_ERROR`, `TABLE_NOT_FOUND`, `ESTABLISHMENT_INACTIVE`.

### GET `/public/orders/:id`

Rastreio do pedido pelo cliente (tela de acompanhamento). Exposição mínima:
status, itens (snapshots), valores e número da mesa. Sem dados internos.

Erros: `VALIDATION_ERROR`, `ORDER_NOT_FOUND`.

### POST `/public/orders`

**Regra de ouro**: o corpo contém SOMENTE IDs e quantidades.
Preços, descontos e totais são SEMPRE recalculados no servidor.
Preços forjados no body são ignorados.

`discount` fixado em 0 nesta fase; `serviceFee` da configuração do
estabelecimento; snapshots de item/adicional persistidos.

Resposta (201): pedido com `orderNumber`, `status: PENDING`, valores,
itens (com snapshots e adicionais). Emite `NEW_ORDER`.

Erros: `VALIDATION_ERROR`, `SESSION_NOT_FOUND`, `SESSION_CLOSED`,
`ESTABLISHMENT_INACTIVE`, `PRODUCT_UNAVAILABLE`,
`MODIFIER_UNAVAILABLE`, `MODIFIER_GROUP_SINGLE`, `MODIFIER_GROUP_MIN`,
`MODIFIER_GROUP_MAX`.

### GET `/public/table-sessions/:sessionToken/orders`

Extrato completo da comanda pelo cliente (sem JWT; `sessionToken` é a
credencial de acesso):

- Sessão deve existir (`SESSION_NOT_FOUND`); lida com sessões `OPEN` ou
  encerradas (extrato consultável após o fechamento).
- Retorna TODOS os pedidos da sessão **exceto `CANCELLED`**, em ordem
  cronológica, com itens (snapshots), adicionais e status atual.
- Inclui `sessionStatus`, `table` (número/nome), e `summary` (soma dos
  pedidos não cancelados: `subtotal`, `discount`, `serviceFee`, `total` —
  arredondados a 2 casas).

Resposta (200): `{ sessionId, sessionStatus, table, orders[], summary }`.

### POST `/public/table-sessions/:sessionToken/request-bill`

O cliente da mesa solicita a conta:

1. Sessão deve existir e estar `OPEN` (`SESSION_NOT_FOUND`/`SESSION_CLOSED`).
2. Mesa → `BILL_REQUESTED` (chama o garçom/painéis).
3. **Intenção de pagamento (FASE 22)** — body opcional:
   `paymentMethodIntent` (`CASH`|`CARD`|`PIX`, nullable) e
   `changeRequested` (número positivo, ≤2 casas, máx 9.999.999,99, nullable)
   são persistidos na comanda e repassados no evento.
4. Emite `BILL_REQUESTED`.

Body:

```json
{ "paymentMethodIntent": "CASH", "changeRequested": 100 }
```

Resposta: `{ success, sessionId, tableId, tableNumber, tableStatus,
paymentMethodIntent, changeRequested, requestedAt }`.
Emite `BILL_REQUESTED` em `room_est_` + `room_session_`.

### GET `/public/table-sessions/:sessionToken/receipt`

Comprovante do cliente — mesmo contrato do receipt privado (ver seção
"Fechamento com Conciliação e Comprovante"), acessível sem JWT e com a
comanda encerrada.

## Dashboard — Métricas e Relatório de Vendas

Rotas privadas. Acesso restrito a **MANAGER e ADMIN**.
Multi-tenancy: `establishmentId` SEMPRE extraído do JWT.

### GET `/dashboard/metrics`

Métricas em tempo real do **dia atual** (fuso configurável via
`DASHBOARD_TZ_OFFSET_MIN`, default `-180` = UTC-3):

| Campo | Descrição |
|-------|-----------|
| `date` | Dia no fuso do dashboard (YYYY-MM-DD) |
| `totalRevenueToday` | Soma dos pagamentos **PAID** do dia (mesma fonte da conciliação do fechamento) |
| `activeSessionsCount` | Comandas **OPEN** (mesa em BILL_REQUESTED continua sessão aberta → contabilizada) |
| `pendingOrdersCount` | Fila da operação: PENDING + CONFIRMED + PREPARING |

Erros: `AUTH_REQUIRED`, `FORBIDDEN`.

### GET `/dashboard/sales?startDate&endDate`

Relatório de vendas de comandas **CLOSED** no período (ISO 8601, com timezone).

- Parâmetros obrigatórios; inválidos/ausentes → `400 VALIDATION_ERROR`.
- `closedAt` entre `[startDate, endDate]` (inclusivo).
- Retorno:

```json
{
  "period": { "startDate", "endDate" },
  "summary": { "sessionsCount", "totalRevenue", "totalBill" },
  "sessions": [
    { "sessionId", "tableId", "tableNumber", "tableName",
      "openedAt", "closedAt", "total", "paidAmount", "paymentsCount" }
  ]
}
```

- `totalRevenue`: soma dos pagamentos **PAID** das comandas encerradas.
- `totalBill`: soma dos totais das comandas (conferência).
- Sessões ordenadas por `closedAt` desc.

### GET `/dashboard/sales/export?startDate&endDate` — CSV de vendas

Exporta as comandas **CLOSED** do período como CSV (FASE 22 — compatível
com o Excel na configuração brasileira):

- Parâmetros obrigatórios (ISO 8601 com timezone); inválidos → `400 VALIDATION_ERROR`.
- Resposta: `200` com `Content-Type: text/csv; charset=utf-8` e
  `Content-Disposition: attachment` (nome `vendas-<inicio>_<fim>.csv`).
- **Delimitador de coluna: ponto e vírgula (`;`)** — campos com `;`/`"`/quebra
  de linha escapados entre aspas duplas, aspas internas dobradas
  (RFC 4180 adaptado ao locale `pt-BR` do Excel).
- **BOM UTF-8 (`\uFEFF`)** prefixa o arquivo para acentuação correta no Excel.
- Linhas com CRLF.
- Colunas fixas:

| Coluna | Conteúdo (recalculado no servidor) |
|--------|-------------------------------------|
| `ID` | `sessionId` da comanda |
| `Data` | `closedAt` em UTC (ISO 8601) |
| `Total` | Soma dos totais dos pedidos não cancelados da comanda (2 casas) |
| `Taxa` | Soma das taxas de serviço desses pedidos (2 casas) |
| `Pagamentos` | Soma dos pagamentos **PAID** da comanda (2 casas) |

- Período sem vendas → CSV apenas com o cabeçalho.
- Ordenação: `closedAt` asc.

## Relatórios — Auditoria

Rotas privadas. Acesso restrito a **MANAGER e ADMIN**.
Multi-tenancy: escopo pelo tenant do JWT.

### GET `/reports/audit`

Lista as **últimas 100 ações** de auditoria do estabelecimento
(tabela `audit_logs`), da mais recente para a mais antiga.

- Escopo do tenant via relação `AuditLog.user.establishmentId` (logs de
  usuários removidos não podem ser atribuídos a um tenant e ficam de fora).
- Retorno:

```json
{
  "success": true,
  "data": [
    { "id", "action", "entity", "entityId", "metadata",
      "createdAt",
      "user": { "id", "name", "email" } }
  ]
}
```

- A tabela existe desde a migration inicial; desde a **FASE 22** o gravador
  é o `auditMiddleware` global (ver abaixo), então a rota reflete as ações
  autenticadas do painel em tempo real.

### Gravador de auditoria (auditMiddleware — FASE 22)

Global, aplicado em `/api/v1` **depois** da autenticação e **antes** dos
routers administrativos (rotas públicas `/auth` e `/public/*` ficam fora).

- Grava mutações **autenticadas**: `POST`, `PUT`, `PATCH`, `DELETE`;
- Somente respostas **2xx/3xx** (falhas e 4xx/5xx não poluem o log);
- `action` = `"MÉTODO /api/v1/rota"` (barra final removida);
- `entity` derivado do módulo da rota (USER, ORDER, CATEGORY, PRODUCT,
  TABLE, TABLE_SESSION, PAYMENT, ...) e `entityId` extraído por regex UUID
  da URL;
- `metadata` = body saneado: campos sensíveis (`password`, `token`, `secret`,
  ...) removidos, profundidade limitada a 3, strings truncadas em 500 chars;
- Fire-and-forget (`catch`): falha de gravação **nunca** derruba a requisição;
- Multi-tenancy: o log não copia `establishmentId` — a listagem resolve o
  tenant via `AuditLog.user.establishmentId`.

## WebSocket (Realtime)

- Endpoint: mesma origem do HTTP (`/socket.io`), CORS aberto.
- **Autenticação opcional no handshake (FASE 23)**: o cliente pode enviar
  um access token JWT em `auth.token` (ou `query.token`). Token inválido
  derruba a conexão (`AUTH_INVALID_TOKEN`); sem token, a conexão segue
  anónima (público/legado).
- Salas:
  - `room_est_{establishmentId}` — painéis do estabelecimento
  - `room_user_{userId}` — sessões autenticadas do usuário
  - `room_staff_{establishmentId}` — ADMIN/MANAGER/KITCHEN do estabelecimento
  - `room_table_{tableId}` — mesa específica (cliente)
  - `room_session_{tableSessionId}` — comanda específica (cliente)
- Ao autenticar, o socket entra automaticamente em `room_est_` e em
  `room_user_` (WAITER) ou `room_staff_` (demais papéis).
- Entrada manual: `socket.emit('join_establishment' | 'join_table' | 'join_session', id)`.
- Confirmações: `joined_establishment` / `joined_table` / `joined_session`.
- **Audiência por mesa (FASE 23)**: eventos operacionais de uma mesa usam
  `emitToTableAudience(establishmentId, assignedWaiterIds, ...)`:
  - mesa **sem** garçons vinculados → `room_est_` (legado) — qualquer
    socket do salão recebe;
  - mesa **com** garçons vinculados → `room_user_` de cada garçom
    vinculado + `room_staff_` (gestão/cozinha). Sockets anónimos (cliente)
    não recebem estes eventos.
- Eventos:
  - `NEW_ORDER` → audiência da mesa (pedido criado).
  - `ORDER_STATUS_UPDATED` → audiência da mesa + `room_table_` + `room_session_`.
  - `BILL_REQUESTED` → audiência da mesa + `room_session_` (cliente pediu a
    conta; payload inclui `paymentMethodIntent` e `changeRequested` desde a FASE 22).
  - `SESSION_CLOSED` → audiência da mesa + `room_table_` + `room_session_`.

> **Limitação conhecida**: o cliente web atual ainda liga o socket sem JWT
> (`frontend/src/services/socket.ts`). Enquanto isso, eventos de mesas
> atribuídas a garçons específicos não chegam ao cliente anónimo; é um
> follow-up de frontend (enviar o token no handshake).

## Health

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | `{ status: "ok" }` |

## Multi-tenancy

- `establishmentId` sempre derivado do JWT (rotas privadas) ou da sessão
  (rotas públicas) — nunca confiado apenas ao ID enviado pelo cliente.
- Acesso cruzado entre estabelecimentos retorna 404 (`*_NOT_FOUND`) ou 400.

# Progresso do Projeto

Última atualização: 23/09/2026

## Fases concluídas

### Fase 5 — Autenticação (VALIDADA)
- Login com bcrypt (12 rounds), JWT (8h), anti-enumeração (hash dummy).
- RBAC: ADMIN, MANAGER, WAITER, KITCHEN; role validada contra enum no verify.
- Multi-tenancy: establishmentId do JWT.
- Seed: admin@balneario.dev / admin12345, establishment `balneario-demo`.

### Fase 6 — Áreas e Mesas (VALIDADA)
- CRUD `/areas` e `/tables` (RBAC ADMIN/MANAGER); qrCode UUID v4.
- Integridade: `AREA_HAS_TABLES`, `TABLE_HAS_SESSIONS_OR_ORDERS`, `TABLE_NUMBER_CONFLICT`.

### Fase 7 — Catálogo (VALIDADA)
- CRUD `/categories` e `/products` (+ variantes, disponibilidade).
- Validação financeira (positivos, ≤2 casas, promocional ≤ preço).

### Fase 8 — Menu público, Pedidos e Realtime (VALIDADA)
- Migration `add_service_fee_settings`; endpoints públicos (menu/table/orders).
- WebSocket (socket.io); recálculo de preços no servidor; snapshots.

### Fase 9 — Operação: Cozinha, Garçom e Máquina de Status (VALIDADA)
- CRUD `/modifier-groups` e `/modifiers` (dívida técnica).
- `GET /public/orders/:id` (rastreio); `GET /orders` (filtros/scope); PATCH status.
- Máquina de estados + RBAC de transição; `ORDER_STATUS_UPDATED` em 3 salas.

### Fase 10 — Conta e Fechamento (VALIDADA)
- **Correção de coerência**: abertura de sessão agora marca a mesa `OCCUPIED`
  (em `$transaction` junto da criação da comanda) — ciclo da mesa:
  `AVAILABLE → OCCUPIED → BILL_REQUESTED → AVAILABLE`.
- **Solicitação de conta (público)**: `POST /public/table-sessions/:sessionToken/request-bill`
  → mesa `BILL_REQUESTED` + evento `BILL_REQUESTED` (sala establish. + sessão).
- **Resumo da comanda (privado)**: `GET /table-sessions/:id/bill` (WAITER/MANAGER/ADMIN)
  — ignora CANCELLED; subtotal geral; taxa de serviço (se habilitada); TOTAL
  exato recalculado no servidor (Bill 26.40 = 24.00 + 10% validado).
- **Fechamento atômico**: `POST /table-sessions/:id/close` em `$transaction`:
  - TRAVA validada: pedidos em aberto → `400 SESSION_HAS_OPEN_ORDERS`
    (comanda de 2 pedidos PENDING bloqueou; só fechou após DELIVERED);
  - `TableSession` → CLOSED + closedAt; `Table` → AVAILABLE;
  - Evento `SESSION_CLOSED` (sala establish. + mesa + sessão) recebido no WS;
  - Após fechamento, novos pedidos da sessão são recusados (`SESSION_CLOSED`).
- **Pagamentos (conta dividida)**: CRUD base `GET/POST /table-sessions/:id/payments`
  e `PATCH/DELETE /payments/:id` — múltiplos pagamentos por comanda
  (PIX 12.00 + CASH 11.10 validados); `paidAt` automático; exclusão só PENDING
  (`PAYMENT_NOT_PENDING`); summary `{ count, paidCount, paidAmount }`;
  multi-tenant por sessão (`SESSION_NOT_FOUND` para sessão de outro tenant).
- Cenários validados: 6 blocos (mesa OCCUPIED, bill, TRAVA, fechamento+WS,
  pagamentos, multi-tenant) — foco especial na trava anti-fechamento prematuro.

### Fase 11 — Pagamentos Completos e Conciliação (VALIDADA)
- **Máquina de estados de pagamentos**: `PATCH /payments/:id/status`
  (WAITER/MANAGER/ADMIN) — PENDING→PAID|FAILED|CANCELLED, PAID→REFUNDED;
  terminais (FAILED/REFUNDED/CANCELLED) sem saída; mesmo-estado e saltos →
  `INVALID_PAYMENT_TRANSITION`; datas automáticas (paidAt/failedAt/refundedAt/
  cancelledAt). O `PATCH /payments/:id` também respeita a máquina.
  Migration: enum `PaymentStatus` + `FAILED`; campos `gateway_transaction_id`,
  `gateway_response`, `failedAt`, `refundedAt`, `cancelledAt`.
- **Mock de gateway PIX**: criar pagamento PIX injeta `gatewayTransactionId`
  (`PIX-<uuid>`) e `gatewayResponse` "PIX Copia e Cola" (copyPaste EMV,
  expiresAt +15min, provider mock — validado).
- **Conciliação rigorosa no close**: soma dos pagamentos **PAID** vs TOTAL
  do bill (taxa incluída); abaixo → `400 INSUFFICIENT_PAYMENT` com
  `{ total, paidAmount, missingAmount }` (validado: 25 < 28.60 → faltante 3.60;
  mesa segue OCCUPIED; PENDING não conta; REFUNDED cria buraco 7.70; comanda
  total 0 fecha sem pagamento; excesso não bloqueia).
- **Receipt (comprovante)**: `GET /table-sessions/:id/receipt` (privado) +
  `GET /public/table-sessions/:sessionToken/receipt` (público, funciona com
  comanda CLOSED) — consolida itens iguais, summary (subtotal/taxa/total),
  extrato de pagamentos PAID e `totals` `{ total, paidAmount, remaining,
  settled }` (validado settled false → true após quitação).
- Extensão do `AppError` com `details` (carrega missingAmount no erro).

### Fase 12 — Dashboard, Métricas e Ajustes Finais (VALIDADA)
- **Dívida corrigida — seed**: `prisma/seed.ts` reescrito: RESET transacional
  do tenant de demonstração (deleteMany em ordem de dependência) + recriação
  determinística de usuários (admin/waiter/kitchen), 2 áreas, 10 mesas com
  **qrCode UUID v4 ÚNICO por mesa** (randomUUID — colisão 01/02 resolvida),
  2 categorias, 6 produtos (fixtures das fases anteriores mantidos —
  suco/coca/variantes Lata+Litro/grupo Gelo), idempotente.
  Validado: 10 mesas, qrCodes únicos e todos v4; 2 execuções sem duplicar.
- **GET /dashboard/metrics** (MANAGER/ADMIN): `totalRevenueToday` (soma de
  pagamentos PAID do dia, fuso `DASHBOARD_TZ_OFFSET_MIN` default -180),
  `activeSessionsCount` (comandas OPEN — BILL_REQUESTED permanece OPEN),
  `pendingOrdersCount` (PENDING+CONFIRMED+PREPARING).
  Validado em cenário: PENDING→2 pendentes/1 ativa; pago→revenue 28.60;
  fechou→ativas 0 com revenue mantida.
- **GET /dashboard/sales** (MANAGER/ADMIN): `startDate`/`endDate` ISO 8601
  obrigatórios (zod datetime offset); comandas CLOSED no período com total,
  paidAmount, paymentsCount por sessão + summary consolidado
  (totalRevenue/totalBill). Validado: 1 sessão hoje (28.60/28.60), ontem vazio,
  período maior idem; sem params → VALIDATION_ERROR; waiter/kitchen → FORBIDDEN.
- `typecheck` + `build` OK.

### Fase 13 — Integração de API, Autenticação e Roteamento Seguro (VALIDADA)
- Novas dependências: `axios`, `zustand`, `@tanstack/react-query`,
  `react-hook-form`, `@hookform/resolvers`, `zod`.
- `src/services/api.ts`: instância axios `http://localhost:4000/api/v1`
  (sobrescrevível por `VITE_API_BASE_URL`); interceptor de request injeta
  `Authorization: Bearer <token>` lido do localStorage (`cardapio.auth`);
  interceptor de response normaliza erros para `ApiError { status, code, message }`.
- `src/stores/authStore.ts`: store Zustand c/ persist — `user`, `token`,
  `isAuthenticated`, `role` + `setSession`/`logout`; helper `homeForRole`
  (ADMIN/MANAGER→/admin, WAITER→/waiter, KITCHEN→/kitchen). A store NÃO
  chama a API (página chama e popula); logout só limpa (interceptor para de injetar).
- `src/pages/Login.tsx`: RHF + Zod (email válido, senha ≥ 8 — espelha o
  `loginSchema` do backend), `useMutation` → `POST /auth/login`, popula store,
  grava token, redireciona para `state.from` ou a home do papel; erros da API
  exibidos em `Alert` (danger); estados loading/disabled; layout mobile-first
  centralizado com DS.
- `src/components/ProtectedRoute.tsx`: não autenticado → `/login` (preserva
  destino em `state.from`); papel fora de `allowedRoles` → redireciona para a
  home do próprio papel (WAITER em /admin → /waiter); sessão sem role tratada
  como não autenticada.
- Rotas: `/login` pública; `/admin` (ADMIN/MANAGER), `/kitchen`
  (KITCHEN/ADMIN/MANAGER), `/waiter` (WAITER/ADMIN/MANAGER) protegidas;
  `/menu/:slug` e `/table/:token` continuam públicas; `main.tsx` agora envolve
  app em `QueryClientProvider` (staleTime 30s, sem refetch on focus).
- Validação: `typecheck` limpo; `npm run build` OK (tsc + vite 18.5s);
  dev server em :5173 servindo /login, /admin, /waiter, /kitchen e
  transformando os 4 módulos novos (HTTP 200); login real
  `admin@balneario.dev/admin12345` → `{ role: ADMIN, name: Administrador,
  token JWT 3 partes }`; senha errada → `INVALID_CREDENTIALS`; senha curta →
  `VALIDATION_ERROR`; JWT waiter/kitchen decodificados confirmam
  WAITER→/waiter, KITCHEN→/kitchen (bloqueados de /admin).

### Fase 14 — Painel Administrativo: Dashboard e Catálogo (VALIDADA)
- **Menu lateral (AdminLayout)**: já possuía links Dashboard/Pedidos/Produtos/
  Categorias/Mesas (sidebar desktop + drawer mobile) — mantido e coeso com
  as novas telas.
- **Dashboard** (`AdminDashboardPage.tsx`): `useQuery(['dashboard','metrics'])`
  → `GET /dashboard/metrics`; 3 Cards (Faturamento de hoje, Mesas ativas,
  Pedidos pendentes) + bloco explicativo das métricas; estados loading
  (`Loading`), erro (`Alert` + "Tentar novamente") e dados; `refetchInterval`
  30s + botão Atualizar; datas no fuso do dashboard.
- **Categorias** (`AdminCategoriesPage.tsx`): `useQuery(['categories'])` →
  `GET /categories` (displayOrder asc); Modal create/edit com RHF+Zod
  (nome 2..100, descrição <=255, ícone <=50, ordem 0..9999, ativa/ativa via
  `Switch` novo); delete com modal de confirmação; erro
  `CATEGORY_HAS_PRODUCTS` vira Toast amigável; EmptyState/Loading/Alert;
  `invalidateQueries(['categories'])` após mutações.
- **Produtos** (`AdminProductsPage.tsx`): `useQuery(['products'])` →
  `GET /products`; Modal create/edit com **Select de categorias ativas**
  (categoria atual inativa incluída com sufixo na edição), validação zod
  espelhando o backend (price > 0, máx 2 casas, promo <= price, preparo
  <=10080, ordem <=9999); **Switch de disponibilidade na listagem** com
  UPDATE OTIMISTA (cancelQueries + setQueryData + rollback em erro) →
  `PATCH /products/:id/availability`; delete com confirmação;
  `invalidateQueries(['products'], ['categories'])` após mutações
  (contagem de produtos por categoria atualiza junto).
- **Switch** (`src/components/ui/Switch.tsx`): novo componente do DS
  (`role="switch"`, aria-checked, teclado Enter/Espaço, disabled).
- **Services**: `src/services/catalog.ts` (categories+products CRUD) e
  `src/services/dashboard.ts` (metrics) sobre o `api` (interceptor JWT).
- **Tipos de API** em `domain.ts`: `ApiCategory`, `ApiProduct`,
  `ApiProductVariant`, `DashboardMetrics` (o `Product`/`available` do menu
  do cliente é mantido intacto — tipos separados por camada).
- Validação: typecheck limpo; `npm run build` OK (13.6s); dev server :5173
  transformando as 3 telas + Switch + services sem erro; ciclo CRUD real
  com ADMIN validado: create/update categoria, create produto na categoria,
  delete bloqueado por `CATEGORY_HAS_PRODUCTS` (mensagem → Toast), delete
  produto→categoria limpa; `PATCH availability` true→false→true; RBAC
  WAITER → 403 (UI: ProtectedRoute direciona a /waiter).

### Fase 15 — Painel Administrativo: Áreas, Mesas e QR Codes (VALIDADA)
- **Dependência**: `qrcode.react` v4.2.0 (QRCodeSVG — vetorial, nítido na impressão).
- **Áreas** (`AdminAreasPage.tsx`, nova rota `/admin/areas` + link no AdminLayout):
  `useQuery(['areas'])` → `GET /areas` (name asc); listagem com contagem de
  mesas; Modal create/edit (RHF+Zod espelhando o backend: nome 2..100,
  descrição <=255, ativa via Switch); delete com confirmação e **Toast
  amigável em AREA_HAS_TABLES** ("existem mesas vinculadas"); invalida
  `['areas']`.
- **Mesas** (`AdminTablesPage.tsx`, adaptado do placeholder/rota /admin/tables):
  listagem com número, nome, capacidade, **área** e `TableStatusBadge` (status
  atual da mesa); Modal create/edit com **Select de áreas** (contagem de
  mesas por área sincronizada — invalida `['tables']` e `['areas']`);
  validação zod do backend (number <=20 não negativo, capacity 1..100);
  erros `TABLE_NUMBER_CONFLICT`/`AREA_NOT_FOUND` → Toast (mensagem do backend).
- **QR Code**: botão "Ver QR Code" por linha → Modal com `QRCodeSVG`
  (size 220, level M) codificando `${window.location.origin}/table/${qrCode}`
  (rota pública do menu) + link textual exibido; botão **Imprimir** →
  `window.print()` com CSS `@media print` (índice `#print-qr` visível,
  restante da tela oculto via visibility).
- Validação: typecheck limpo; build OK (16.8s); dev server :5173 transformando
  as 2 novas telas + service sem erro; QR link real (mesa 01) → GET
  `/public/table/<qr>` retorna mesa + sessionToken (menu público abrindo);
  CRUD real validado: criar área→criar mesa (qrCode uuid gerado)→excluir área
  `AREA_HAS_TABLES`→editar mesa (PUT)→limpeza; mesa duplicada
  `TABLE_NUMBER_CONFLICT`; área inválida `AREA_NOT_FOUND`; RBAC kitchen →
  `FORBIDDEN` (UI: ProtectedRoute).

## Próximas fases (pendentes — aguardando autorização)

- **Fases 12–21**: estabelecimentos (rotas CRUD + configurações), dashboard,
  relatórios, auditoria, etc.

## Pendências técnicas conhecidas
- `discount` fixado em 0 (sem cupons/descontos manuais ainda).
- Não há rota para criar estabelecimento pela API (seed `balneario-demo`).
- **RESOLVIDO (Fase 12)**: seed não criava mesas e os qrCodes colidiam —
  agora o seed recria 10 mesas com qrCode UUID v4 único por execução
  (qrCodes mudam a cada seed — esperado; testes buscam o qrCode via API).
- O mock de gateway PIX (`gatewayResponse`) é injetado em qualquer criação
  de pagamento PIX, inclusive PAID (validado).
- Correção de rota: `payments.routes.ts` aplica `authenticate` POR ROTA
  (um `use()` global interceptaria as rotas públicas, pois o router é
  montado em '/').

## Fase 16 — Interface do Cliente: Menu Público, Carrinho e Pedidos ✅

**Objetivo**: jornada completa do cliente mobile-first via QR Code (comanda → cardápio → configuração de produto → carrinho → checkout → rastreio → pedir a conta).

### Entregas (frontend, sem alteração de backend)

- **`src/stores/customerStore.ts`** (novo): Zustand com persist (`cardapio.customer`), isolado do authStore. Guarda `context` da comanda (sessionToken, mesa, área, estabelecimento), `cart` (itens com productId/variantId/modifierIds/quantity + metadados de exibição), `orders` (pedidos criados NESTE dispositivo) e `billRequested`. Merge de itens idênticos por chave estável (`cartItemKey`); troca de comanda limpa os dados da sessão anterior; `cartSubtotal` (estimativa de exibição).
- **`src/services/publicMenu.ts`** (novo): `getTableByQrCode`, `getPublicMenu`, `createPublicOrder` (envia só IDs+qtds — preços recalculados no backend), `getPublicOrder` (rastreio), `requestTableBill`.
- **`src/components/menu/ProductSheet.tsx`** (novo): bottom-sheet de configuração via `Drawer` `bottom`. **Variantes**: seleção única obrigatória quando existem (1ª pré-selecionada). **Grupos de adicionais**: `SINGLE` (radio) / `MULTIPLE` (checkbox), contador e validação visual de `minSelections`/`maxSelections` (Badge "Obrigatório (n/max)"/"Selecione ao menos n"/"Até n"); Add desabilitado até satisfazer mínimos; stepper de quantidade (1..99); botão "Adicionar · R$ X" com preço unitário+adicionais×qtd.
- **`src/components/menu/CustomerPanel.tsx`** (novo): FAB "Ver carrinho" (badge de itens + subtotal; posicionado DENTRO da coluna max-w-md) → Drawer com **Tabs** `Carrinho` / `Meus pedidos`. Carrinho: lista com variante/adicionais, stepper, remover, subtotal, **taxa de serviço** (serviceFeeEnabled/rate do estabelecimento) e total estimado (nota "valores finais confirmados no recebimento"); checkout `POST /public/orders` com toast de sucesso ("Pedido N enviado!") + limpa carrinho + registra pedido + muda para aba Pedidos; erros da API exibidos em Toast. Pedidos: rastreio ao vivo via `useQueries` + `GET /orders/:id` (refetch 10s) com `OrderStatusBadge`; botão **"Pedir a conta"** → `POST /table-sessions/:token/request-bill` (desabilitado após solicitação).
- **`src/pages/menu/MenuPage.tsx`** (rewrite do placeholder): fluxo `/table/:qrCode` (GET `/public/table/:qrCode` → setContext; erros `TABLE_NOT_FOUND`/`ESTABLISHMENT_INACTIVE` com Alert + retry) e `/menu/:slug` (navegação sem comanda, aviso "Escaneie o QR Code da sua mesa"). Header do estabelecimento (badges mesa/área e "Taxa de serviço n%"), chips de categoria sticky (filtro + âncoras), cards de produto (destaque/promoção, "a partir de" para variantes, ticket de quantidade no carrinho), skeleton de carregamento, estados de erro/vazio.
- **`src/types/domain.ts`**: seção "Menu público" (MenuEstablishment, MenuCategory, MenuProduct, MenuVariant, ModifierGroup/Modifier/SINGLE|MULTIPLE, PublicOrder, PublicTableResponse, BillRequestResult).

### Validação (dev :4000 + Vite :5173)

- typecheck e build OK. Vite transforma MenuPage/CustomerPanel/ProductSheet/customerStore/publicMenu sem erro (HTTP 200).
- Jornada real com a mesa 02 (AVAILABLE): GET `/public/table` criou comanda (sessionToken) → POST `/public/orders` (Suco 2× [Com gelo+Gelo extra], Coca **Lata** [Com gelo], Pastel 1×) → backend recalculou: subtotal 37,00 + taxa 10% 3,70 → **total 40,70** (idêntico ao esperado); snapshots históricos corretos na resposta.
- Redo de página (GET `/public/table` de novo) reutiliza a MESMA sessionToken (comanda em aberto).
- Rastreio `GET /orders/:id` → PENDING com itens/snapshots; `POST request-bill` → `success:true`, mesa → `BILL_REQUESTED`.
- Violação de máximo (3 seleções, max=2) → `MODIFIER_GROUP_MAX` (message exibida em Toast). Produto com variantes sem variantId é aceito pelo backend (preço base) — a UI sempre envia a variante pré-selecionada, então não ocorre.
- Limpeza: `prisma db seed` (reset tenant) → ambiente limpo; **novos qrCodes**: mesa 01 = `b0853bcb-1ef6-4b31-9254-5647117f56da`; menu público OK (2 categorias, 6 produtos).

### Pendência de backend (RESOLVIDA na Fase 16.1)

- **Resolvido**: criado `GET /api/v1/public/table-sessions/:sessionToken/orders` —
  extrato completo da comanda (todos os pedidos exceto `CANCELLED`, com itens,
  variantes, adicionais e status) + `summary` arredondado. Validado de ponta a
  ponta (2 pedidos → 1 cancelado via Prisma → extrato lista apenas o restante).
  "Meus Pedidos" do frontend passa a poder usar este endpoint (Fase 17).


## Fase 17 — Operação: KDS (Cozinha), Painel do Garçom e Realtime ✅

**Objetivo**: transformar os placeholders de cozinha/garçom em painéis operacionais reais, com WebSocket (socket.io-client) e refatoração do "Meus Pedidos" do cliente para o extrato público de comanda.

### Entregas (frontend)

- **`src/services/socket.ts`** (novo): singleton `socket.io-client` (`http://localhost:4000`, `VITE_SOCKET_URL` sobrescreve) com `autoConnect:false`; hook `useSocketEvents(establishmentId)` que conecta, emite `join_establishment` e **invalida automaticamente** `['orders']`, `['tables']`, `['table-sessions']`, `['dashboard']` nos eventos `NEW_ORDER`, `ORDER_STATUS_UPDATED`, `BILL_REQUESTED`, `SESSION_CLOSED` (sem reload). Badge Online/Offline nos painéis.
- **`src/services/orders.ts`** (novo): `listOrders({ status[], scope, tableId, tableSessionId })` + `updateOrderStatus(id, status)`. Importante: o backend espera status como **keys repetidas** (`status=PENDING&status=READY`), então `listOrders` usa `paramsSerializer: { indexes: null }` (formato `status[]=` não é lido pelo schema Zod — validado).
- **`src/services/tableSessions.ts`** (novo): `getSessionBill`, `getSessionPayments` (shape real `{ sessionId, payments[], summary }` — não é array direto; corrigido após validar via API), `createPayment`, `closeSession`.
- **`src/services/publicMenu.ts`**: novo `getSessionOrders(token)` → `GET /public/table-sessions/:token/orders` (extrato da Fase 16.1).
- **`src/types/domain.ts`**: `OperationalOrder(+Item/Modifier)`, `SessionBill`, `Payment`, `CreatePaymentInput`, `SessionOrdersExtract`.
- **`src/pages/kitchen/Dashboard.tsx`** (KDS, rota /kitchen via KitchenPage): consome `GET /orders?status=CONFIRMED&status=PREPARING` em duas colunas — **Novos** (aguardando preparo) e **Em preparo** — com botões "Iniciar preparo" (→PREPARING) e "Marcar como pronto" (→READY); cards com pedido #, mesa+área, tempo ("há X min"), itens/qtds/adicionais e notas; EmptyState "Cozinha em dia"; refetch 20s fallback.
- **`src/pages/waiter/Dashboard.tsx`** (rota /waiter via WaiterPage): Tabs **Fila** / **Mesas**.
  - Fila: PENDING → "Aceitar pedido" (→CONFIRMED), READY → "Marcar como entregue" (→DELIVERED); cards com mesa, itens, total e tempo; badge `Fila (N)`.
  - Mesas: mapa agrupado por **área** com `TableStatusBadge`; destaque visual e texto para `BILL_REQUESTED`; clique em mesa ocupada resolve a `sessionId` via `GET /orders?tableId=…` (não há rota de listagem de sessões) e abre o BillDrawer; mesa sem pedidos → Toast informativo.
- **`src/components/waiter/BillDrawer.tsx`** (novo, Drawer `right`): resumo (pedidos, itens, subtotal, taxa %/R$, pago PAID, falta pagar), itens da comanda, **pagamentos registrados** (Badge de status) e formulário **Registrar pagamento** (RHF+Zod: valor>0, método CASH/CARD/PIX, situação PAID/PENDING) → `POST /table-sessions/:id/payments`; rodapé com TOTAL + botão **"Fechar mesa"** → `POST /close` com Toast dos erros amigáveis (`SESSION_HAS_OPEN_ORDERS`/`INSUFFICIENT_PAYMENT`).
- **`CustomerPanel.tsx` (refatorado — Fase 16.1)**: aba "Meus pedidos" agora prioriza o **extrato público** `GET /public/table-sessions/:token/orders` (itens + status + **summary real do backend**: subtotal/taxa/desconto/total), com fallback para o rastreio local pedido-a-pedido apenas quando o extrato não responde; botão "Pedir a conta" mantido.

### Validação (backend :4000 + Vite :5173)

- typecheck + build OK. Vite transforma todos os módulos novos (socket, orders, tableSessions, Kitchen/ Waiter Dashboard, BillDrawer, CustomerPanel) — HTTP 200.
- **Realtime**: cliente socket na sala do estabelecimento recebeu `joined_establishment`, `NEW_ORDER` (payload completo do pedido público criado) e `ORDER_STATUS_UPDATED` em cada transição ({orderId, orderNumber, previousStatus, status, tableId, tableSessionId, updatedAt, order}).
- **RBAC de transição**: cozinha tentando aceitar PENDING → **403 FORBIDDEN**; waiter PENDING→CONFIRMED 200; kitchen CONFIRMED→PREPARING→READY 200; waiter READY→DELIVERED 200.
- **Fila/KDS reais**: `GET /orders?status=PENDING&status=READY` (garçom) → pedido #1 PENDING 31,90 mesa 01; `GET /orders?status=CONFIRMED&status=PREPARING` (cozinha) → vazio até o teste.
- **Contrato `status[]=` invalidado**: backend retorna TODOS quando recebe brackets (`status[]=` não casa com `status` do schema) → corrigido no frontend com `paramsSerializer`.
- **Ciclo completo mesa 02** (não destrutivo): sessão criada → pedido #4 (7,00 + 10% = 7,70, R$ 7 + taxa 0,70) → `request-bill` → **BILL_REQUESTED** (mesa 02 BILL_REQUESTED; evento no WS) → bill (summary ordersCount 1 / itemsCount 1 / subtotal 7 / serviceFee 0,70 / total 7,70) → pagamento PIX PAID 7,70 → **close bloqueado 400 SESSION_HAS_OPEN_ORDERS** (pedido ainda PENDING — trava correta) → entregue o pedido (4 transições) → **close 200 OK** → `SESSION_CLOSED` no WS → **mesa 02 AVAILABLE**; pagamentos da sessão confirmados via API.
- **Extrato público da mesa 01** (Open): pedidos #1 PENDING 31,90 e #3 DELIVERED 7,70 com summary {subtotal 36, taxa 3,60, total 39,60} — alimenta o "Meus Pedidos" do cliente.
- Estado preservado para próximas fases: mesa 01 OCCUPIED com pedido #1 PENDING 31,90 (agançou a fila do garçom na UI), mesa 02 AVAILABLE.

### Ajuste de contrato documentado

- `GET /table-sessions/:id/payments` retorna `{ sessionId, payments, summary }` (não array puro) — o service do frontend lê `.payments` (documentado no código).
- Dependência nova: `socket.io-client` ^4.8.3.

## Fase 19.1 — Backend: Export CSV de Vendas e Auditoria (VALIDADA)

**Objetivo**: entregar o download de vendas em CSV e a rota de auditoria no
backend, após a validação da interface SaaS (Fase 19 — Register/Settings/Team).

### Entregas (backend, sem alteração de banco)

- **`GET /dashboard/sales/export?startDate&endDate`** (MANAGER/ADMIN):
  comandas **CLOSED** do período (ISO 8601 com timezone, obrigatórios —
  mesmo `salesQuerySchema` do relatório) → CSV (RFC 4180 básico: CRLF,
  escape de `,`/`"`/quebra de linha). Colunas fixas
  `ID, Data, Total, Taxa, Pagamentos`; **todos os valores recalculados no
  servidor**: Total = soma dos totais dos pedidos não cancelados da comanda,
  Taxa = soma das taxas de serviço, Pagamentos = soma dos pagamentos PAID.
  Resposta `200` com `Content-Type: text/csv; charset=utf-8` +
  `Content-Disposition: attachment` (`vendas-<inicio>_<fim>.csv`); período
  sem vendas → apenas o cabeçalho; ordenação por `closedAt` asc. Nova função
  dedicada `getSalesExportRows` (o `GET /sales` existente não foi alterado).
- **`GET /reports/audit`** (MANAGER/ADMIN): módulo novo `backend/src/reports/`
  (service/controller/routes). Lista as últimas 100 ações da tabela `audit_logs`
  (existe desde a migration inicial), mais recente primeiro. Multi-tenancy via
  relação `AuditLog.user.establishmentId` (logs de usuários removidos — userId
  nulo — ficam de fora). Ainda não há gravador de logs em produção: retorna
  `data: []` até um gravador ser implementado.
- **Permissões de agentes**: removido `edit: "*": deny` de
  `.opencode/agents/frontend-spa.md` e `.opencode/agents/backend-api-autorizacao.md`
  (mantidos `ask` para raiz/`backend/**`/`frontend/**` — **exige reiniciar o
  opencode** para a config carregada no startup ser substituída).
- `api.md` atualizado com os dois endpoints (seções Dashboard e Relatórios).

### Validação

- `typecheck` + `build` limpos (tsc --noEmit e tsc).
- Export: 200 com header `text/csv` e corpo
  `ID,Data,Total,Taxa,Pagamentos / f32fd90b…,2026-09-23T04:13:41.179Z,7.70,0.70,7.70`
  (comanda CLOSED do seed + pagamento PAID); sem token → 401; WAITER → 403;
  data inválida → 400; período vazio → header apenas.
- Auditoria: ADMIN → 200 `{ success:true, data:[] }`; WAITER → 403.
- Banco intacto (apenas leituras — baseline do seed preservado).

---

## Fase 23 — Frontend: Estorno, Ajustes, Garçons de Mesa e Conta

**Objetivo**: consumir os contratos da Fase 23 (backend já validado; ver
`api.md`) nas interfaces de operação e no menu do cliente, sem mover regras
financeiras para o frontend (todos os valores continuam a ser recalculados e
devolvidos pelo backend).

### Entregas

- **Estorno de pagamento** (`components/waiter/BillDrawer.tsx`): botão de
  lixeira por pagamento, visível apenas a MANAGER/ADMIN (espelha o `authorize`
  do backend). Abre modal de confirmação e chama `DELETE /payments/:id`;
  invalida `['table-sessions', sessionId]` para recarregar bill + pagamentos.
- **Ajustes manuais** (`BillDrawer.tsx`): secção exclusiva de MANAGER/ADMIN
  com `CurrencyInput` de desconto/acréscimo e motivo (obrigatório quando há
  acréscimo, máx. 200). Envia `PATCH /table-sessions/:id/adjustments`; o bill
  recalculado é reexibido. Resumo mostra linhas de desconto e acréscimo.
- **Garçons responsáveis** (`pages/admin/AdminTablesPage.tsx`): checkboxes no
  modal de criar/editar mesa. Como `POST/PUT /tables` não recebe vínculos, o
  frontend grava a mesa e em seguida chama `PUT /tables/:id/waiters`. O cartão
  da mesa lista os garçons vinculados (ou "Sem garçom vinculado").
- **Conta sem consumo** (`components/menu/CustomerPanel.tsx`): comanda sem
  pedidos deixa de oferecer "Pedir a conta" (mostra aviso "Faça um pedido para
  poder solicitar a conta"). O pedido só fica disponível quando há pedidos.
- **Fecho de comanda a R$ 0,00** (`BillDrawer.tsx`): botão "Fechar mesa"
  permanece habilitado sem consumo, com aviso "Sem consumo: o fecho é permitido
  e libera a mesa" (o backend valida e libera a mesa).

### Serviços/tipos

- `services/tableSessions.ts`: `deletePayment`, `updateSessionAdjustments`.
- `services/physical.ts`: `setTableWaiters`.
- `types/domain.ts`: `ApiTable.waiters`, `SessionBill` (ajustes),
  `PaymentRemovalResult`, `SessionAdjustmentsInput`.

### Limitações / necessidades de backend (a comunicar ao project-manager)

1. **`GET /users` é ADMIN-only**: o MANAGER não consegue listar a equipa para
   escolher garçons. Mitigação atual: para MANAGER a lista é derivada dos
   garçons já vinculados em `GET /tables`. Solução desejada: permitir leitura
   de utilizadores (role WAITER) a MANAGER, ou expor `GET /users?role=WAITER`.
2. **Sessão por mesa sem pedidos**: o painel do garçom abre a conta a partir de
   `orders[0].tableSession.id`. Uma mesa OCCUPIED criada por leitura de QR sem
   qualquer pedido não tem sessão acessível pelo frontend (não existe rota
   privada "sessão por mesa"). O `BillDrawer` já fecha a R$ 0,00, mas é
   necessário um meio de a abrir. Solução desejada: `GET /tables/:id/active-session`
   ou incluir `activeSessionId` em `GET /tables`.

### Validação

- `npm run typecheck` (`tsc --noEmit`) limpo.
- `npm run build` (`tsc --noEmit && vite build`) limpo.
- `vite preview` → 200 e `<title>Cardápio Digital</title>`.
- Dev server Vite transforma com 200 `main.tsx`, `BillDrawer.tsx`,
  `AdminTablesPage.tsx` e `CustomerPanel.tsx`.

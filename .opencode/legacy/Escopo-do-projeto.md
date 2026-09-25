Especificação Técnica — Sistema de Cardápio Digital para Balneários
1. Visão geral

Desenvolver um sistema web responsivo de cardápio digital e gerenciamento de pedidos para restaurantes de balneários, clubes, áreas de lazer e estabelecimentos semelhantes.

O sistema terá quatro perfis principais:

Cliente
Garçom
Cozinha
Administrador

O fluxo principal será:

CLIENTE
   ↓
Escaneia QR Code da mesa
   ↓
Visualiza o cardápio
   ↓
Escolhe produtos
   ↓
Personaliza o pedido
   ↓
Adiciona ao carrinho
   ↓
Envia pedido
   ↓
COZINHA recebe
   ↓
Prepara
   ↓
Pedido fica pronto
   ↓
GARÇOM entrega
   ↓
Cliente continua consumindo
   ↓
Solicita conta
   ↓
GARÇOM encerra a comanda
2. Objetivo

Criar uma solução que reduza a dependência de pedidos anotados manualmente pelos garçons e permita que o cliente faça seus pedidos diretamente pelo celular.

O sistema deve permitir:

gerenciamento completo do cardápio;
gerenciamento de categorias;
gerenciamento de produtos;
adicionais e complementos;
controle de disponibilidade;
gerenciamento de mesas;
QR Code por mesa;
pedidos digitais;
comandas;
acompanhamento do pedido;
painel da cozinha;
painel do garçom;
fechamento da conta;
relatórios;
controle de usuários e permissões.
3. Stack tecnológica

Para a primeira versão, utilizar uma arquitetura moderna, porém simples de manter.

Frontend
React
TypeScript
Vite
Tailwind CSS
React Router
TanStack Query
Zod
React Hook Form
Lucide React
Backend
Node.js
TypeScript
NestJS ou Express estruturado em módulos
Banco de dados
PostgreSQL
Prisma ORM
Autenticação
JWT
bcrypt/Argon2 para senha
Refresh Token
Armazenamento de imagens

Criar uma camada de abstração para armazenamento.

A primeira implementação poderá utilizar armazenamento local durante desenvolvimento, mas a arquitetura deve permitir posteriormente:

Cloudinary
Amazon S3
Supabase Storage
Comunicação em tempo real

Utilizar:

WebSocket / Socket.IO

para:

novos pedidos;
alteração de status;
atualização de mesas;
solicitação de conta;
notificações.
4. Arquitetura

Utilizar arquitetura modular.

frontend/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── hooks/
│   ├── services/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   └── routes/
│
backend/
│
├── src/
│   ├── auth/
│   ├── users/
│   ├── establishments/
│   ├── areas/
│   ├── tables/
│   ├── categories/
│   ├── products/
│   ├── modifiers/
│   ├── combos/
│   ├── promotions/
│   ├── orders/
│   ├── kitchen/
│   ├── tabs/
│   ├── payments/
│   ├── reports/
│   ├── uploads/
│   ├── notifications/
│   └── common/
│
└── prisma/
    └── schema.prisma
5. Conceito de estabelecimento

O sistema deve ser desenvolvido pensando em multiestabelecimento.

Isso significa que futuramente será possível ter:


Sistema
│
├── Balneário Paraíso
│   ├── Usuários
│   ├── Mesas
│   ├── Produtos
│   └── Pedidos
│
├── Balneário Sol Nascente
│   ├── Usuários
│   ├── Mesas
│   ├── Produtos
│   └── Pedidos
│
└── Balneário Rio Verde
    ├── Usuários
    ├── Mesas
    ├── Produtos
    └── Pedidos

Todas as entidades relacionadas ao negócio devem possuir establishmentId.

6. Perfis de acesso
ADMIN

Permissões:

dashboard;
produtos;
categorias;
adicionais;
combos;
promoções;
áreas;
mesas;
pedidos;
comandas;
usuários;
configurações;
relatórios.
GERENTE

Permissões:

produtos;
categorias;
pedidos;
mesas;
comandas;
relatórios.

Não pode:

excluir administrador;
alterar configurações críticas;
alterar proprietário.
GARÇOM

Permissões:

visualizar mesas;
visualizar pedidos;
criar pedidos;
alterar pedidos permitidos;
entregar pedidos;
solicitar/fechar contas.
COZINHA

Permissões:

visualizar pedidos;
iniciar preparo;
marcar pedido como pronto.

Não pode:

alterar preço;
excluir produto;
visualizar dados financeiros desnecessários.
7. Banco de dados
Establishment
id
name
slug
logoUrl
bannerUrl
description
phone
whatsapp
address
city
state
zipCode
status
createdAt
updatedAt
User
id
establishmentId
name
email
passwordHash
role
phone
active
createdAt
updatedAt

role:

ADMIN
MANAGER
WAITER
KITCHEN
8. Áreas

Criar tabela:

Area

Campos:

id
establishmentId
name
description
active
createdAt
updatedAt

Exemplos:

Restaurante
Piscina
Área do Rio
Quiosques
Área VIP
Chalés
9. Mesas
Table

Campos:

id
establishmentId
areaId
number
name
capacity
qrCode
status
active
createdAt
updatedAt

Status:

AVAILABLE
OCCUPIED
NEW_ORDER
PREPARING
READY
BILL_REQUESTED
10. QR Code

Cada mesa deve possuir um QR Code exclusivo.

Exemplo:

https://dominio.com/menu/table/abc123

O token não deve simplesmente expor IDs internos previsíveis.

Ao acessar:

/menu/table/:token

o sistema identifica:

Estabelecimento
Área
Mesa

e cria uma sessão de consumo.

11. Sessão da mesa

Criar:

TableSession

Campos:

id
tableId
establishmentId
sessionToken
status
openedAt
closedAt
createdAt
updatedAt

Status:

OPEN
CLOSED

A sessão representa o período em que determinada mesa está ocupada.

12. Categorias
Category

Campos:

id
establishmentId
name
description
imageUrl
icon
displayOrder
active
createdAt
updatedAt

Exemplos:

Refeições
Tira-Gostos
Porções
Lanches
Bebidas
Cervejas
Drinks
Sobremesas
Promoções
13. Produtos
Product

Campos:

id
establishmentId
categoryId
name
description
imageUrl
price
promotionalPrice
preparationTime
ingredients
allergens
displayOrder
featured
active
available
createdAt
updatedAt
14. Variações de produto

Um produto pode ter diferentes tamanhos.

Exemplo:

Batata Frita

P = R$ 20
M = R$ 30
G = R$ 40

Criar:

ProductVariant

Campos:

id
productId
name
price
active
displayOrder
15. Adicionais

Criar:

ModifierGroup

Exemplo:

Escolha o acompanhamento

E:

Modifier

Exemplo:

Arroz
Baião
Macaxeira
Fritas

Campos do grupo:

id
establishmentId
name
selectionType
minSelections
maxSelections
active

selectionType:

SINGLE
MULTIPLE
16. Preço dos adicionais

Cada adicional terá:

id
modifierGroupId
name
price
active

Exemplo:

Bacon       + R$ 7
Queijo      + R$ 4
Ovo         + R$ 3
17. Associação produto → adicionais

Um produto poderá possuir vários grupos de adicionais.

Exemplo:

Carne de Sol
   ↓
Acompanhamento
   ↓
Molho
   ↓
Adicionais
18. Combos

Criar:

Combo

Campos:

id
establishmentId
name
description
imageUrl
price
active
featured
createdAt
updatedAt

Um combo poderá conter vários produtos.

19. Promoções

Criar:

Promotion

Campos:

id
establishmentId
name
description
discountType
discountValue
startDate
endDate
startTime
endTime
active

Tipos:

PERCENTAGE
FIXED
SPECIAL_PRICE
20. Clientes

Como o cliente não precisa necessariamente criar conta, o sistema deve permitir pedidos como visitante.

Criar:

Customer

Campos:

id
establishmentId
name
phone
createdAt
updatedAt
21. Pedido

Tabela:

Order

Campos:

id
establishmentId
tableId
tableSessionId
customerId
orderNumber
status
subtotal
discount
serviceFee
total
notes
createdAt
updatedAt

Status:

PENDING
CONFIRMED
PREPARING
READY
DELIVERED
CANCELLED
22. Itens do pedido
OrderItem

Campos:

id
orderId
productId
productName
quantity
unitPrice
totalPrice
notes

Importante:

productName e unitPrice devem ser armazenados no pedido.

Isso garante histórico.

Se o administrador alterar o preço posteriormente, pedidos antigos não serão alterados.

23. Adicionais do pedido
OrderItemModifier

Campos:

id
orderItemId
modifierId
modifierName
price
quantity

Também guardar o nome e preço no momento da compra.

24. Regras de cálculo

O backend será a autoridade para cálculo.

Nunca confiar somente no preço enviado pelo frontend.

Fórmula:
itemTotal =
(unitPrice × quantity) + adicionais

Depois:

subtotal =
soma dos itens

Depois:

total =
subtotal
- desconto
+ taxa de serviço

Se houver promoção, o backend deve validar se ela está vigente.

25. Taxa de serviço

Configuração do estabelecimento:

serviceFeeEnabled
serviceFeePercentage

Exemplo:

Subtotal: R$ 200

10% serviço:
R$ 20

Total:
R$ 220

O sistema deve permitir desativar.

26. Pedido mínimo

Configuração:

minimumOrderAmount

Se:

Subtotal < mínimo

não permitir finalização.

27. Fluxo do cliente
Etapa 1

Cliente escaneia QR Code.

Etapa 2

Sistema identifica mesa.

Etapa 3

Mostra:

Bem-vindo!

Mesa 24
Etapa 4

Cliente navega pelas categorias.

Etapa 5

Seleciona produto.

Etapa 6

Escolhe variações/adicionais.

Etapa 7

Adiciona observação.

Etapa 8

Adiciona ao carrinho.

Etapa 9

Confirma pedido.

Etapa 10

Sistema calcula novamente no backend.

Etapa 11

Pedido é criado.

Etapa 12

Cozinha recebe em tempo real.

28. Carrinho

O carrinho deverá mostrar:

MEU PEDIDO

2x Peixe Frito       R$ 85,00
   + Molho especial  R$  5,00

1x Batata            R$ 30,00

3x Cerveja           R$ 30,00

----------------------------

Subtotal             R$ 150,00

Taxa de serviço      R$ 15,00

TOTAL                R$ 165,00
29. Pedido adicional

O cliente poderá continuar pedindo enquanto a sessão estiver aberta.

Exemplo:

Mesa 24

Pedido #1024
R$ 120

Pedido #1025
R$ 80

----------------
Total da mesa
R$ 200
30. Agrupamento por comanda

A conta final deve considerar todos os pedidos da sessão.

TableSession
   │
   ├── Order #100
   ├── Order #101
   ├── Order #102
   └── Order #103
31. Solicitação de conta

Cliente toca:

SOLICITAR CONTA

Backend:

table.status = BILL_REQUESTED

Garçom recebe notificação:

🔔 Mesa 24 solicitou a conta.

32. Fechamento da conta

Garçom visualiza:

MESA 24

Subtotal:       R$ 250
Serviço:        R$ 25

TOTAL:          R$ 275

Forma de pagamento:

PIX
DINHEIRO
DÉBITO
CRÉDITO

Depois:

FECHAR CONTA

A sessão passa para:

CLOSED

Mesa:

AVAILABLE
33. Pagamento dividido

Deixar preparado para implementação futura.

Exemplo:

Total: R$ 300

João → R$ 100 PIX
Maria → R$ 100 cartão
Pedro → R$ 100 dinheiro

Criar entidade:

Payment

Campos:

id
tableSessionId
amount
method
status
paidAt
34. Painel da cozinha

Interface otimizada para tablet/computador.

Colunas:

NOVOS
   ↓
EM PREPARO
   ↓
PRONTOS

Pedido:

#1024

MESA 24

2x Peixe Frito
1x Batata Frita
3x Cerveja

OBS:
Sem pimenta

[INICIAR PREPARO]

Depois:

[PEDIDO PRONTO]
35. Painel do garçom

Mostrar:

MESAS

🟢 01 Livre
🟡 02 Ocupada
🔴 03 Novo pedido
🟠 04 Pedido pronto
🟣 05 Conta solicitada
36. Dashboard administrativo

Cards:

Faturamento hoje
R$ 8.540

Pedidos hoje
126

Ticket médio
R$ 67,78

Mesas ocupadas
18

Gráficos:

vendas por hora;
vendas por dia;
produtos mais vendidos;
categorias mais vendidas.
37. Relatórios

Filtros:

Hoje
Ontem
Últimos 7 dias
Este mês
Mês anterior
Personalizado

Relatórios:

Vendas
faturamento;
quantidade de pedidos;
ticket médio.
Produtos
quantidade vendida;
faturamento;
ranking por quantidade.
Categorias
faturamento;
quantidade.
Mesas
consumo por mesa;
número de pedidos.
38. Gestão de disponibilidade

O administrador poderá alterar:

Produto disponível

para:

Produto indisponível

Quando indisponível:

❌ Indisponível no momento

O produto não poderá ser adicionado ao carrinho.

O backend também deve validar isso.

39. Horários

Configurar:

Segunda
11:00 - 23:00

Terça
11:00 - 23:00

...

Domingo
10:00 - 23:00

Possibilidade de:

estabelecimento aberto;
estabelecimento fechado;
pausa temporária.
40. Modo estabelecimento fechado

Quando fechado:

🏝️ Estamos fechados

Nosso horário de funcionamento:

10:00 às 23:00

Opcionalmente:

Visualizar cardápio

mas sem permitir pedidos.

41. Notificações

Criar sistema de notificações em tempo real.

Eventos:

NEW_ORDER
ORDER_CONFIRMED
ORDER_PREPARING
ORDER_READY
BILL_REQUESTED
ORDER_CANCELLED
42. Auditoria

Criar:

AuditLog

Registrar:

userId
action
entity
entityId
metadata
createdAt

Exemplo:

João alterou o preço do Filé com Fritas de R$ 35 para R$ 40.

Isso será importante para segurança administrativa.

43. API

Estruturar API REST.

Autenticação
POST /auth/login
POST /auth/refresh
POST /auth/logout
Produtos
GET    /products
POST   /products
GET    /products/:id
PUT    /products/:id
DELETE /products/:id
PATCH  /products/:id/availability
Categorias
GET
POST
PUT
DELETE
Mesas
GET
POST
PUT
DELETE
GET /tables/:id/qrcode
Pedidos
POST /orders
GET /orders
GET /orders/:id
PATCH /orders/:id/status
POST /orders/:id/cancel
Contas
POST /table-sessions/:id/request-bill
GET /table-sessions/:id/bill
POST /table-sessions/:id/close
44. Endpoints públicos

O cliente não autenticado deverá conseguir acessar:

GET /public/menu/:establishmentSlug
GET /public/table/:token
GET /public/categories
GET /public/products
POST /public/orders
GET /public/orders/:id

Não expor informações administrativas.

45. Segurança

Implementar:

validação com Zod/class-validator;
autenticação JWT;
autorização por função;
hash de senha;
rate limiting;
CORS configurado;
sanitização de entradas;
proteção contra SQL injection via ORM;
validação de upload;
limite de tamanho de imagens;
logs;
variáveis sensíveis em .env.

Nunca colocar:

DATABASE_URL
JWT_SECRET
API_KEYS

diretamente no código.

46. Upload de imagens

Aceitar:

JPG
JPEG
PNG
WEBP

Limite sugerido:

5 MB

Redimensionar/comprimir imagens antes de armazenar quando possível.

47. Responsividade
Cliente

Prioridade:

Mobile
Tablet
Desktop
Administração

Prioridade:

Desktop
Tablet
Mobile
Cozinha

Prioridade:

Tablet
Desktop
48. UX do cliente

O sistema deve evitar excesso de telas.

Fluxo ideal:

CARDÁPIO
   ↓
PRODUTO
   ↓
ADICIONAR
   ↓
CARRINHO
   ↓
CONFIRMAR

O botão do carrinho deve permanecer visível.

Exemplo:

🛒 Meu pedido — R$ 127,00

49. Busca

Adicionar busca:

🔎 Buscar no cardápio

Pesquisar:

nome;
descrição;
categoria;
tags.
50. Produtos favoritos

Deixar preparado para futuro:

❤️ Favoritar

Não é obrigatório no MVP.

51. PWA

Preparar o frontend para funcionar como Progressive Web App.

Permitir:

instalação no celular;
ícone;
splash screen;
cache de recursos estáticos.
52. SEO

A página pública do estabelecimento deve possuir:

título;
descrição;
Open Graph;
favicon;
imagem social;
URL amigável.

Exemplo:

/cardapio/balneario-paraiso
53. Estados importantes

Todo componente deverá tratar:

Loading
Carregando...
Empty
Nenhum produto encontrado.
Error
Não foi possível carregar o cardápio.
Tente novamente.
Offline

Informar ao usuário quando não houver conexão.

54. Regras de negócio importantes
Regra 1

Produto indisponível não pode ser pedido.

Regra 2

Produto excluído não pode desaparecer de pedidos antigos.

Regra 3

Alteração de preço não modifica pedidos antigos.

Regra 4

Pedido enviado não pode ter preço alterado pelo cliente.

Regra 5

Todo cálculo financeiro deve ser validado no backend.

Regra 6

Mesa só pode ser liberada após fechamento da conta.

Regra 7

Pedido cancelado deve permanecer no histórico.

Regra 8

Sessão fechada não aceita novos pedidos.

Regra 9

Somente usuários autorizados podem modificar preços.

Regra 10

Cada QR Code deve identificar exclusivamente sua mesa.

55. Estrutura de telas
Cliente
/
├── Menu
├── Categoria
├── Produto
├── Carrinho
├── Confirmar pedido
├── Pedido enviado
├── Acompanhar pedido
├── Minha conta
└── Solicitar conta
Administração
/admin
├── login
├── dashboard
├── pedidos
├── mesas
├── áreas
├── categorias
├── produtos
├── adicionais
├── combos
├── promoções
├── usuários
├── relatórios
└── configurações
Cozinha
/kitchen
Garçom
/waiter
56. MVP obrigatório

O OpenCode deve considerar como primeira versão funcional:

Cliente
 QR Code
 identificação da mesa
 categorias
 produtos
 imagens
 descrição
 preço
 adicionais
 carrinho
 cálculo automático
 observações
 envio do pedido
 acompanhamento do pedido
 solicitação da conta
Administração
 login
 dashboard
 categorias
 produtos
 upload de imagem
 adicionais
 disponibilidade
 mesas
 QR Codes
 áreas
 pedidos
 usuários
Operação
 painel cozinha
 painel garçom
 atualização em tempo real
 abertura/fechamento de mesa
 fechamento de conta
57. Segunda fase

Depois do MVP:

[ ] Pagamento PIX
[ ] Pagamento online
[ ] Conta dividida
[ ] Controle de estoque
[ ] Combos avançados
[ ] Cupons
[ ] Programa de fidelidade
[ ] Avaliação
[ ] Impressão de pedidos
[ ] Relatórios avançados
[ ] PWA completo
[ ] WhatsApp
58. Terceira fase — SaaS

Como o banco já será estruturado com establishmentId, futuramente transformar o projeto em SaaS.

Exemplo:

PLATAFORMA
│
├── Restaurante A
├── Restaurante B
├── Restaurante C
└── Restaurante D

Cada estabelecimento terá:

cardápio próprio;
usuários próprios;
mesas próprias;
produtos próprios;
pedidos próprios;
configurações próprias.

Poderá existir posteriormente:

SUPER ADMIN

com:

cadastro de estabelecimentos;
planos;
assinaturas;
limites;
pagamentos;
métricas da plataforma.
59. Ordem de desenvolvimento no OpenCode

Eu não recomendaria pedir ao OpenCode para construir tudo de uma vez. Isso aumenta muito a chance de ele criar uma estrutura confusa.

Use esta sequência:

Fase 1 — Fundação
1. Criar projeto
2. Configurar frontend
3. Configurar backend
4. Configurar PostgreSQL
5. Configurar Prisma
6. Configurar variáveis de ambiente
7. Criar estrutura modular
8. Criar migrations
Fase 2 — Autenticação
9. Login
10. JWT
11. Roles
12. Proteção das rotas
Fase 3 — Cadastro
13. Estabelecimento
14. Áreas
15. Mesas
16. Categorias
17. Produtos
18. Variações
19. Adicionais
Fase 4 — Cardápio
20. Página pública
21. Categorias
22. Produtos
23. Detalhes
24. Carrinho
25. QR Code
Fase 5 — Pedidos
26. Criar pedido
27. Cálculo
28. Persistência
29. Status
30. Histórico
Fase 6 — Operação
31. Cozinha
32. Garçom
33. Mesas
34. Comandas
35. Solicitação de conta
36. Fechamento
Fase 7 — Dashboard
37. Faturamento
38. Pedidos
39. Ticket médio
40. Produtos
41. Relatórios
Fase 8 — Refinamento
42. Responsividade
43. UX
44. Segurança
45. Validação
46. Tratamento de erros
47. Performance
48. Testes

60. Regra fundamental
Não implemente todo o sistema de uma única vez. Trabalhe por fases. Antes de iniciar cada fase, analise a estrutura existente, preserve o código funcional e não crie arquivos ou pastas desnecessários. Não altere funcionalidades já concluídas sem necessidade. Após cada etapa, execute testes, verifique erros de TypeScript, lint, build e integração com o banco de dados. Só avance para a próxima etapa quando a etapa atual estiver funcional.

E outra regra importante:

Antes de criar uma nova pasta, arquivo, componente, serviço ou tabela, verifique se já existe uma estrutura equivalente. Evite duplicação. Mantenha a arquitetura simples, modular e coerente.

Desde o começo, a arquitetura deve ser:

              SISTEMA
                 │
        ┌────────┴────────┐
        │                 │
   ESTABELECIMENTO A  ESTABELECIMENTO B
        │                 │
    ┌───┴───┐         ┌───┴───┐
  Mesas   Cardápio   Mesas   Cardápio
    │         │         │        │
 Pedidos   Produtos   Pedidos  Produtos
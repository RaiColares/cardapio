# Modelo de Dados

## 1. Banco

Banco principal:

```text
PostgreSQL
```

ORM:

```text
Prisma
```

---

# 2. Convenções

Todos os modelos devem possuir:

```text
id
createdAt
updatedAt
```

quando aplicável.

IDs não devem ser utilizados de maneira previsível em URLs públicas quando isso representar risco de enumeração.

---

# 3. Establishment

Representa o estabelecimento.

Campos:

```text
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
```

---

# 4. User

Representa usuários administrativos.

Campos:

```text
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
```

Roles:

```text
ADMIN
MANAGER
WAITER
KITCHEN
```

---

# 5. Area

Representa uma área física.

Campos:

```text
id
establishmentId
name
description
active
createdAt
updatedAt
```

Exemplos:

```text
Restaurante
Piscina
Área do Rio
Quiosques
Área VIP
Chalés
```

---

# 6. Table

Representa uma mesa.

Campos:

```text
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
```

---

# 7. TableSession

Representa uma comanda aberta.

Campos:

```text
id
tableId
establishmentId
sessionToken
status
openedAt
closedAt
createdAt
updatedAt
```

Status:

```text
OPEN
CLOSED
```

---

# 8. Category

Campos:

```text
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
```

---

# 9. Product

Campos:

```text
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
```

---

# 10. ProductVariant

Campos:

```text
id
productId
name
price
active
displayOrder
```

---

# 11. ModifierGroup

Campos:

```text
id
establishmentId
name
selectionType
minSelections
maxSelections
active
```

Tipos:

```text
SINGLE
MULTIPLE
```

---

# 12. Modifier

Campos:

```text
id
modifierGroupId
name
price
active
```

---

# 13. Combo

Campos:

```text
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
```

---

# 14. Promotion

Campos:

```text
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
```

Tipos:

```text
PERCENTAGE
FIXED
SPECIAL_PRICE
```

---

# 15. Customer

Campos:

```text
id
establishmentId
name
phone
createdAt
updatedAt
```

O cadastro do cliente não deve ser obrigatório para realizar pedidos no MVP.

---

# 16. Order

Campos:

```text
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
```

Status:

```text
PENDING
CONFIRMED
PREPARING
READY
DELIVERED
CANCELLED
```

---

# 17. OrderItem

Campos:

```text
id
orderId
productId
productName
quantity
unitPrice
totalPrice
notes
```

`productName` e `unitPrice` são snapshots históricos.

---

# 18. OrderItemModifier

Campos:

```text
id
orderItemId
modifierId
modifierName
price
quantity
```

`modifierName` e `price` devem preservar o valor histórico.

---

# 19. Payment

Campos:

```text
id
tableSessionId
amount
method
status
paidAt
```

O modelo deve permitir evolução para:

* PIX;
* cartão;
* dinheiro;
* múltiplos pagamentos;
* divisão da conta.

---

# 20. AuditLog

Campos:

```text
id
userId
action
entity
entityId
metadata
createdAt
```

Deve registrar operações administrativas relevantes.

---

# 21. Relacionamentos principais

```text
Establishment
 ├── Users
 ├── Areas
 │    └── Tables
 │          └── TableSessions
 │                └── Orders
 │                      └── OrderItems
 │
 ├── Categories
 │    └── Products
 │
 ├── ModifierGroups
 │    └── Modifiers
 │
 └── Promotions
```

---

# 22. Integridade

O banco deve utilizar:

* foreign keys;
* unique constraints;
* indexes;
* enum quando apropriado;
* transactions;
* not-null quando necessário.

---

# 23. Índices

Índices devem ser considerados principalmente para:

```text
establishmentId
slug
email
tableId
tableSessionId
status
createdAt
categoryId
productId
```

Os índices finais devem ser definidos conforme consultas reais.

---

# 24. Multi-tenancy

Toda entidade pertencente ao estabelecimento deve possuir `establishmentId` diretamente ou possuir relação inequívoca que permita validar o tenant.

Consultas administrativas devem sempre filtrar pelo estabelecimento autenticado.

---

# 25. Valores monetários

Valores financeiros não devem ser tratados como números de ponto flutuante sem controle adequado.

O projeto deve adotar uma estratégia consistente para dinheiro, preferencialmente representação em unidade mínima ou `Decimal` no banco.

Exemplo:

```text
R$ 10,50
```

não deve sofrer erros de precisão de ponto flutuante.

---

# 26. Histórico

Nunca alterar retroativamente informações financeiras históricas.

Pedidos devem preservar:

```text
nome do produto
preço
nome do adicional
preço do adicional
```

no momento da venda.

---

# 27. Migrations

Alterações estruturais devem ocorrer através de migrations.

Nunca modificar produção manualmente sem controle de versão.

Toda migration deve ser revisada antes de aplicação.

## Migrations (Fase 8)

### `20260923005001_add_service_fee_settings`
- Adiciona ao model `Establishment`:
  - `serviceFeeEnabled` (Boolean, default false) → coluna `service_fee_enabled`
  - `serviceFeeRate` (Decimal(5,2), default 0) → coluna `service_fee_rate`
- Motivo: taxa de serviço configurável por estabelecimento, aplicada sobre o
  subtotal no cálculo de pedidos públicos (Fase 8).

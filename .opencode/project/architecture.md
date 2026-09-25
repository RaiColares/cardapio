# Arquitetura do Sistema

## 1. Visão arquitetural

O projeto será organizado em duas aplicações principais:

```text
frontend/
backend/
```

O frontend será responsável pela interface.

O backend será responsável pela API, autenticação, autorização, regras de negócio, persistência e comunicação em tempo real.

---

# 2. Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router
* TanStack Query
* React Hook Form
* Zod
* Lucide React

## Backend

* Node.js
* TypeScript
* NestJS ou Express estruturado modularmente
* JWT
* bcrypt ou Argon2
* WebSocket/Socket.IO

## Banco

* PostgreSQL
* Prisma ORM

---

# 3. Estrutura

```text
frontend/
└── src/
    ├── components/
    ├── pages/
    ├── layouts/
    ├── hooks/
    ├── services/
    ├── stores/
    ├── types/
    ├── utils/
    └── routes/

backend/
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
```

---

# 4. Separação de responsabilidades

## Frontend

Responsável por:

* apresentação;
* interação;
* navegação;
* formulários;
* estado visual;
* cache de dados;
* consumo da API.

Não deve determinar:

* preço final;
* autorização;
* permissões;
* total financeiro;
* validade de sessão;
* regras críticas.

---

## Backend

Responsável por:

* autenticação;
* autorização;
* validação;
* regras de negócio;
* cálculo financeiro;
* isolamento de tenant;
* persistência;
* controle de pedidos;
* sessões;
* WebSocket;
* auditoria.

---

## Banco

Responsável por:

* persistência;
* integridade;
* relacionamentos;
* constraints;
* índices;
* consistência transacional.

---

# 5. Fluxo arquitetural

```text
Cliente
   ↓
React
   ↓
HTTP / WebSocket
   ↓
API
   ↓
Controllers
   ↓
Services
   ↓
Prisma
   ↓
PostgreSQL
```

---

# 6. Autenticação

Usuários administrativos utilizarão:

```text
JWT access token
+
refresh token
```

O backend deve verificar:

1. identidade;
2. validade do token;
3. usuário ativo;
4. estabelecimento;
5. permissão da operação.

---

# 7. Autorização

As funções possuem diferentes níveis:

```text
ADMIN
MANAGER
WAITER
KITCHEN
```

Autenticação responde:

> Quem é o usuário?

Autorização responde:

> O que esse usuário pode fazer?

Essas duas responsabilidades não devem ser confundidas.

---

# 8. Multi-tenancy

A arquitetura deve considerar o estabelecimento como limite de isolamento.

Exemplo:

```text
Establishment A
 ├── Users
 ├── Tables
 ├── Products
 └── Orders

Establishment B
 ├── Users
 ├── Tables
 ├── Products
 └── Orders
```

Uma consulta nunca deve confiar somente no `id`.

Ela deve considerar o contexto do estabelecimento.

---

# 9. API

A API deve seguir padrão REST para operações convencionais.

Exemplo:

```text
GET    /products
POST   /products
GET    /products/:id
PUT    /products/:id
DELETE /products/:id
```

Operações em tempo real utilizarão WebSocket.

---

# 10. Tempo real

Eventos relevantes:

```text
order.created
order.updated
order.statusChanged
table.updated
bill.requested
session.closed
```

Exemplo:

```text
Cliente envia pedido
        ↓
Backend salva pedido
        ↓
Backend publica evento
        ↓
Painel da cozinha recebe
        ↓
Cozinha altera status
        ↓
Backend publica evento
        ↓
Cliente/garçom recebem atualização
```

---

# 11. Frontend público

O menu público deve possuir rotas semelhantes a:

```text
/menu/:establishmentSlug
/table/:token
```

O token da mesa deve identificar a sessão/mesa sem revelar informações internas desnecessárias.

---

# 12. Painéis internos

As áreas administrativas devem ser protegidas.

Exemplos:

```text
/admin
/admin/dashboard
/admin/products
/admin/categories
/admin/tables
/admin/users

/kitchen
/waiter
```

---

# 13. Estado

O frontend deve separar:

### Estado do servidor

Utilizar TanStack Query.

### Estado local

Utilizar React state quando suficiente.

### Estado global

Utilizar store somente quando realmente necessário.

Não criar gerenciamento global complexo sem necessidade.

---

# 14. Uploads

Imagens devem possuir uma camada de abstração.

Durante desenvolvimento:

```text
storage local
```

Posteriormente:

```text
Cloudinary
S3
Supabase Storage
```

O restante da aplicação não deve depender diretamente do provedor.

---

# 15. Observabilidade

O backend deve possuir:

* logs estruturados;
* tratamento centralizado de erros;
* identificação de requisições;
* registro de operações importantes;
* auditoria de ações administrativas.

---

# 16. Princípios arquiteturais

Prioridades:

```text
Correção
↓
Segurança
↓
Clareza
↓
Manutenibilidade
↓
Testabilidade
↓
Performance
↓
Escalabilidade
```

Não implementar arquitetura complexa apenas para demonstrar sofisticação.

O projeto deve evoluir conforme necessidades reais.

# Roadmap de Desenvolvimento

## Visão geral

O desenvolvimento deve ocorrer em fases.

Não implementar todas as funcionalidades simultaneamente.

Cada fase deve ser concluída e validada antes da próxima.

---

# FASE 1 — Fundação

## Objetivo

Criar a base técnica.

### Tarefas

* criar frontend;
* criar backend;
* configurar TypeScript;
* configurar Vite;
* configurar Tailwind;
* configurar PostgreSQL;
* configurar Prisma;
* configurar variáveis de ambiente;
* definir estrutura de pastas;
* configurar lint;
* configurar formatação;
* configurar tratamento de erros;
* criar documentação inicial.

### Resultado

Projeto executando corretamente em ambiente local.

---

# FASE 2 — Banco de dados

## Objetivo

Criar o modelo persistente.

### Tarefas

* Establishment;
* User;
* Area;
* Table;
* TableSession;
* Category;
* Product;
* ProductVariant;
* ModifierGroup;
* Modifier;
* Order;
* OrderItem;
* OrderItemModifier;
* Payment;
* AuditLog.

### Resultado

Banco funcional com migrations e relacionamentos.

---

# FASE 3 — Autenticação

## Objetivo

Criar segurança para usuários internos.

### Tarefas

* login;
* hash de senha;
* JWT;
* refresh token;
* logout;
* middleware/guard;
* roles;
* autorização;
* tenant isolation.

### Resultado

Usuários internos conseguem acessar apenas recursos autorizados.

---

# FASE 4 — Catálogo

## Objetivo

Permitir administração do cardápio.

### Tarefas

* categorias;
* produtos;
* imagens;
* preços;
* disponibilidade;
* variações;
* adicionais;
* ordem de exibição.

### Resultado

Administrador consegue montar o cardápio.

---

# FASE 5 — Mesas e QR Code

## Objetivo

Criar estrutura física do estabelecimento.

### Tarefas

* áreas;
* mesas;
* status;
* QR Codes;
* sessões;
* abertura de comanda.

### Resultado

Cada mesa possui identidade própria.

---

# FASE 6 — Cardápio público

## Objetivo

Criar experiência do cliente.

### Tarefas

* página do cardápio;
* identificação da mesa;
* categorias;
* produtos;
* detalhes;
* variações;
* adicionais;
* carrinho;
* observações.

### Resultado

Cliente consegue montar um pedido pelo celular.

---

# FASE 7 — Pedidos

## Objetivo

Implementar o fluxo completo de pedido.

### Tarefas

* criação;
* validação;
* cálculo;
* snapshots;
* status;
* cancelamento;
* histórico.

### Resultado

Cliente consegue enviar pedidos reais.

---

# FASE 8 — Cozinha

## Objetivo

Criar operação da cozinha.

### Tarefas

* painel;
* pedidos novos;
* preparação;
* pedidos prontos;
* atualização em tempo real.

### Resultado

Cozinha consegue operar os pedidos.

---

# FASE 9 — Garçom

## Objetivo

Criar operação do atendimento.

### Tarefas

* mapa de mesas;
* status;
* pedidos;
* pedidos prontos;
* solicitação de conta;
* fechamento da sessão.

### Resultado

Garçom consegue acompanhar o salão.

---

# FASE 10 — Tempo real

## Objetivo

Eliminar necessidade de atualização manual.

### Tarefas

* WebSocket;
* eventos;
* reconexão;
* atualização de pedidos;
* atualização de mesas;
* notificações internas.

---

# FASE 11 — Dashboard

## Objetivo

Criar visão gerencial.

### Tarefas

* faturamento;
* pedidos;
* ticket médio;
* mesas;
* produtos;
* indicadores.

---

# FASE 12 — Relatórios

## Objetivo

Criar consultas gerenciais.

### Tarefas

* vendas;
* produtos;
* categorias;
* mesas;
* pagamentos;
* cancelamentos;
* descontos.

---

# FASE 13 — Segurança e QA

## Objetivo

Preparar o sistema para uso real.

### Tarefas

* testes;
* revisão de autorização;
* tenant isolation;
* validações;
* rate limiting;
* uploads;
* logs;
* auditoria;
* testes de regressão.

---

# FASE 14 — Refinamento

### Tarefas

* responsividade;
* acessibilidade;
* performance;
* UX;
* tratamento de erros;
* estados vazios;
* loading;
* feedback visual.

---

# FASE 15 — Futuro

Após o MVP:

* PIX;
* pagamento online;
* divisão de conta;
* estoque;
* combos;
* cupons;
* fidelidade;
* avaliações;
* impressão;
* PWA;
* WhatsApp;
* delivery;
* SaaS;
* Super Admin.

---

# Regra do roadmap

Não avançar de fase simplesmente porque o código foi escrito.

Uma fase só pode ser considerada concluída quando:

```text
Implementada
+
Testada
+
Revisada
+
Validada
+
Documentada quando necessário
```

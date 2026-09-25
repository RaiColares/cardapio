# Especificação do Projeto

## 1. Visão geral

Este projeto é uma plataforma web responsiva de **cardápio digital e gerenciamento de pedidos para restaurantes localizados em balneários, clubes, resorts, áreas de lazer, restaurantes de praia, restaurantes de rio, piscinas, quiosques e ambientes semelhantes**.

O sistema deve permitir que o cliente faça pedidos diretamente pelo celular, utilizando um QR Code associado à mesa.

Fluxo principal:

```text
QR Code da mesa
    ↓
Cardápio digital
    ↓
Identificação automática da mesa
    ↓
Escolha de produtos
    ↓
Variações e adicionais
    ↓
Carrinho
    ↓
Envio do pedido
    ↓
Cozinha recebe em tempo real
    ↓
Preparação
    ↓
Pedido pronto
    ↓
Garçom entrega
    ↓
Cliente pode pedir novamente
    ↓
Cliente solicita a conta
    ↓
Garçom fecha a comanda
    ↓
Mesa fica disponível
```

---

# 2. Objetivo

Criar uma solução simples, rápida, responsiva e confiável para substituir ou complementar o processo tradicional de pedidos realizados por garçons.

O sistema deve:

* reduzir erros de pedidos;
* agilizar o atendimento;
* permitir pedidos diretamente pelo cliente;
* centralizar pedidos da mesa;
* fornecer painel para cozinha;
* fornecer painel para garçons;
* permitir gerenciamento administrativo;
* manter histórico das operações;
* permitir múltiplos pedidos durante uma mesma sessão;
* preparar a arquitetura para futura transformação em SaaS.

---

# 3. Público-alvo

O sistema deve atender principalmente:

* restaurantes de balneários;
* restaurantes de praia;
* restaurantes de rio;
* clubes;
* resorts;
* hotéis com restaurante;
* áreas de piscina;
* quiosques;
* restaurantes de áreas turísticas;
* restaurantes com mesas externas;
* restaurantes com diferentes áreas de atendimento.

---

# 4. Usuários

## 4.1 Cliente

O cliente não precisa criar conta.

Ele acessa o sistema através do QR Code da mesa.

Pode:

* visualizar o cardápio;
* navegar pelas categorias;
* visualizar produtos;
* escolher quantidade;
* escolher variações;
* adicionar complementos;
* escrever observações;
* adicionar produtos ao carrinho;
* enviar pedidos;
* acompanhar o status;
* realizar novos pedidos;
* visualizar sua conta/comanda;
* solicitar a conta.

---

## 4.2 Administrador

Responsável pela configuração do estabelecimento.

Pode:

* gerenciar estabelecimento;
* gerenciar usuários;
* gerenciar categorias;
* gerenciar produtos;
* gerenciar adicionais;
* gerenciar variações;
* gerenciar mesas;
* gerenciar áreas;
* gerar QR Codes;
* controlar disponibilidade dos produtos;
* visualizar pedidos;
* acompanhar mesas;
* visualizar dashboard;
* visualizar relatórios;
* realizar operações administrativas autorizadas.

---

## 4.3 Gerente

Pode executar operações administrativas e operacionais conforme suas permissões.

---

## 4.4 Garçom

Pode:

* visualizar mesas;
* acompanhar status das mesas;
* visualizar pedidos;
* acompanhar pedidos;
* entregar pedidos;
* solicitar/confirmar fechamento da conta;
* auxiliar o cliente;
* acompanhar novas solicitações.

---

## 4.5 Cozinha

Pode:

* visualizar pedidos;
* visualizar itens;
* visualizar observações;
* alterar status;
* marcar pedidos como em preparação;
* marcar pedidos como prontos.

---

# 5. Categorias iniciais

O sistema deve suportar categorias como:

* Refeições
* Tira-Gostos
* Porções
* Lanches
* Bebidas
* Cervejas
* Drinks
* Sobremesas
* Promoções

As categorias devem ser totalmente configuráveis.

---

# 6. Produto

Cada produto pode possuir:

* nome;
* descrição;
* imagem;
* preço;
* preço promocional;
* ingredientes;
* alergênicos;
* tempo estimado de preparo;
* ordem de exibição;
* destaque;
* ativo/inativo;
* disponível/indisponível.

O sistema deve permitir:

* variações;
* adicionais;
* observações;
* quantidade.

---

# 7. Variações

Um produto pode possuir variações.

Exemplos:

```text
Tamanho
- Pequeno
- Médio
- Grande
```

Ou:

```text
Escolha da carne
- Frango
- Carne
- Peixe
```

Cada variação pode possuir preço próprio.

---

# 8. Adicionais

Os produtos podem possuir grupos de adicionais.

Exemplo:

```text
Escolha seus adicionais

[ ] Queijo + R$ 4,00
[ ] Bacon + R$ 5,00
[ ] Ovo + R$ 2,00
```

O grupo deve permitir definir:

* seleção única;
* múltiplas seleções;
* mínimo;
* máximo.

---

# 9. Mesas e áreas

O estabelecimento pode possuir diferentes áreas:

* Restaurante;
* Piscina;
* Área do Rio;
* Quiosques;
* Área VIP;
* Chalés.

Cada mesa deve pertencer a uma área.

Cada mesa possui:

* número;
* nome opcional;
* capacidade;
* QR Code;
* status;
* ativa/inativa.

---

# 10. Status das mesas

Estados principais:

```text
AVAILABLE
OCCUPIED
NEW_ORDER
PREPARING
READY
BILL_REQUESTED
```

O status deve ser derivado das operações da mesa e não utilizado como única fonte de verdade para o estado financeiro.

---

# 11. QR Code

Cada mesa deve possuir um QR Code exclusivo.

O QR Code deve utilizar um token não previsível.

O cliente não deve precisar informar manualmente:

* estabelecimento;
* mesa;
* área.

Essas informações devem ser determinadas pelo QR Code.

O QR Code não deve expor IDs internos previsíveis quando isso puder permitir enumeração ou acesso indevido.

---

# 12. Sessão da mesa

Quando uma mesa inicia atendimento, deve existir uma `TableSession`.

Uma sessão representa a comanda aberta daquela mesa.

Enquanto estiver aberta:

* vários clientes podem utilizar o mesmo QR Code;
* vários pedidos podem ser realizados;
* os pedidos pertencem à mesma sessão;
* o cliente pode pedir novamente.

A sessão somente deve ser encerrada após o fechamento da conta.

---

# 13. Pedido

Cada pedido deve possuir:

* número;
* mesa;
* sessão;
* cliente opcional;
* itens;
* subtotal;
* desconto;
* taxa de serviço;
* total;
* observações;
* status;
* data/hora.

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

# 14. Histórico financeiro

O sistema deve preservar os dados históricos dos pedidos.

Ao criar um `OrderItem`, devem ser armazenados:

* nome do produto no momento da compra;
* preço unitário no momento da compra.

O mesmo princípio deve ser aplicado aos adicionais.

Alterar posteriormente um produto não pode modificar pedidos históricos.

---

# 15. Conta

A conta pertence à sessão da mesa.

Deve considerar:

```text
Pedidos
- descontos
+ taxa de serviço
= total
```

O cálculo final deve ser realizado no backend.

O frontend nunca deve ser considerado autoridade financeira.

---

# 16. Solicitação de conta

O cliente pode solicitar a conta.

A sessão passa para estado de solicitação de fechamento.

O garçom ou usuário autorizado deve poder:

* visualizar a solicitação;
* conferir a conta;
* realizar o fechamento;
* registrar pagamento.

---

# 17. Dashboard

O dashboard deve permitir visualizar informações como:

* faturamento do dia;
* quantidade de pedidos;
* ticket médio;
* mesas ocupadas;
* produtos mais vendidos;
* pedidos em andamento;
* pedidos aguardando atendimento.

---

# 18. Relatórios

O sistema deve ser preparado para relatórios de:

* vendas;
* produtos;
* categorias;
* mesas;
* formas de pagamento;
* cancelamentos;
* descontos;
* períodos.

---

# 19. Requisitos não funcionais

O sistema deve ser:

* responsivo;
* acessível;
* seguro;
* modular;
* escalável;
* testável;
* tipado;
* preparado para múltiplos estabelecimentos;
* adequado para dispositivos móveis;
* compatível com navegadores modernos.

---

# 20. Multi-tenancy

Todos os dados pertencentes a um estabelecimento devem permanecer isolados.

Um usuário de um estabelecimento nunca pode acessar dados de outro estabelecimento.

Toda operação administrativa deve validar o contexto do estabelecimento.

---

# 21. MVP

O MVP deve conter:

### Cliente

* QR Code;
* identificação da mesa;
* cardápio;
* categorias;
* produtos;
* adicionais;
* variações;
* carrinho;
* observações;
* envio de pedido;
* acompanhamento de pedido;
* novos pedidos;
* solicitação de conta.

### Administração

* login;
* dashboard básico;
* categorias;
* produtos;
* imagens;
* adicionais;
* disponibilidade;
* mesas;
* áreas;
* QR Codes;
* usuários.

### Operação

* painel da cozinha;
* painel do garçom;
* atualização de pedidos;
* abertura/fechamento de sessão;
* solicitação de conta.

---

# 22. Funcionalidades futuras

Ficam fora do MVP inicial:

* PIX;
* pagamento online;
* divisão da conta;
* estoque;
* combos avançados;
* cupons;
* fidelidade;
* avaliações;
* impressão;
* relatórios avançados;
* PWA;
* integração com WhatsApp;
* delivery;
* SaaS multi-estabelecimento com super administrador.

Essas funcionalidades não devem ser implementadas antecipadamente sem necessidade.

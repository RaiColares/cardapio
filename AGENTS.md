# AGENTS.md

## SISTEMA DE PEDIDOS PARA BALNEÁRIOS

Este documento contém as regras globais que devem ser respeitadas por todos os agentes durante o desenvolvimento deste projeto.

---

# 1. OBJETIVO DO PROJETO

Estamos desenvolvendo uma plataforma web para restaurantes localizados em:

* Balneários
* Restaurantes de praia
* Restaurantes de rio
* Clubes
* Resorts
* Áreas de lazer
* Restaurantes com piscinas
* Quiosques
* Chalés
* Áreas VIP

O fluxo principal do sistema é:

```text
QR Code da mesa
        ↓
Menu digital
        ↓
Escolha dos produtos
        ↓
Carrinho
        ↓
Envio do pedido
        ↓
Cozinha
        ↓
Preparo
        ↓
Pedido pronto
        ↓
Garçom
        ↓
Entrega
        ↓
Cliente pode pedir novamente
        ↓
Solicitação da conta
        ↓
Fechamento
        ↓
Mesa disponível
```

O sistema deverá ser preparado desde o início para suportar múltiplos estabelecimentos.

---

# 2. PRINCÍPIO FUNDAMENTAL

O projeto deve ser desenvolvido de forma:

* incremental;
* organizada;
* segura;
* simples;
* sustentável;
* escalável;
* testável.

Nenhum agente deve tentar implementar o sistema inteiro de uma única vez.

---

# 3. REGRA DE OURO

## NÃO CRIAR O QUE JÁ EXISTE.

Antes de criar:

* arquivo;
* pasta;
* componente;
* serviço;
* hook;
* função;
* módulo;
* tipo;
* endpoint;
* tabela;
* modelo;
* migration;

procure primeiro se já existe uma implementação equivalente.

Sempre prefira:

```text
REUTILIZAR
    ↓
ADAPTAR
    ↓
ESTENDER
    ↓
CRIAR
```

Criar algo novo deve ser a última opção.

---

# 4. AGENTE PRINCIPAL

O agente responsável por coordenar o projeto é:

`project-manager`

Ele é responsável por:

* analisar;
* planejar;
* organizar;
* delegar;
* controlar escopo;
* acompanhar progresso;
* coordenar os especialistas.

Os demais agentes são especialistas.

---

# 5. AGENTES ESPECIALIZADOS

## arquiteto-banco-dados

Responsável por:

* arquitetura;
* PostgreSQL;
* Prisma;
* modelagem;
* migrations;
* relações;
* índices;
* constraints;
* integridade.

## backend-api-autorizacao

Responsável por:

* backend;
* APIs;
* autenticação;
* autorização;
* regras de negócio;
* pedidos;
* sessões;
* WebSocket.

## frontend-spa

Responsável por:

* React;
* TypeScript;
* páginas;
* rotas;
* componentes;
* estado;
* integração com API.

## ui-ux-css

Responsável por:

* UI;
* UX;
* CSS;
* Tailwind;
* responsividade;
* acessibilidade;
* design system.

## qa-code-review

Responsável por:

* testes;
* QA;
* revisão;
* regressões;
* casos de borda;
* análise de qualidade.

---

# 6. NÃO INVADIR O DOMÍNIO DE OUTRO AGENTE

Cada agente deve respeitar sua área de responsabilidade.

Exemplo:

O frontend não deve alterar regras de negócio do backend.

O backend não deve modificar componentes visuais.

O QA não deve corrigir código durante uma revisão normal.

O banco não deve remodelar o frontend.

Quando uma alteração externa for necessária, o agente deve comunicar a necessidade ao Project Manager.

---

# 7. MULTI-TENANCY

O sistema é multi-tenant.

Todos os dados pertencentes a um estabelecimento devem estar corretamente associados ao respectivo estabelecimento.

Nunca permitir acesso cruzado entre estabelecimentos.

Sempre considerar:

* `establishmentId`;
* autorização;
* contexto do tenant;
* filtros;
* relações;
* isolamento.

---

# 8. BACKEND COMO AUTORIDADE

O frontend nunca é autoridade sobre:

* preço;
* desconto;
* taxa;
* total;
* disponibilidade;
* permissões;
* status;
* fechamento.

Todos os valores importantes devem ser validados e calculados no backend.

---

# 9. HISTÓRICO

Pedidos devem preservar informações históricas.

Alterações futuras no cadastro não podem modificar pedidos antigos.

Devem ser preservados snapshots de:

* nome do produto;
* preço;
* nome dos adicionais;
* preço dos adicionais.

---

# 10. ESTRUTURA

A estrutura principal esperada é:

```text
frontend/
backend/
.opencode/
```

Não criar múltiplos projetos frontend ou backend sem justificativa explícita.

---

# 11. DOCUMENTAÇÃO

A documentação do projeto deve permanecer em:

```text
.opencode/project/
```

Arquivos esperados:

```text
specification.md
architecture.md
database.md
api.md
roadmap.md
progress.md
```

---

# 12. DESENVOLVIMENTO POR FASES

A ordem padrão é:

```text
1. Fundação
2. Autenticação
3. Estabelecimento
4. Catálogo
5. Menu público
6. Pedidos
7. Operação
8. Dashboard
9. Segurança e qualidade
```

Uma fase deve estar suficientemente estável antes de avançar para a próxima.

---

# 13. VALIDAÇÃO

Toda implementação significativa deve ser validada.

Quando aplicável:

* TypeScript;
* lint;
* testes;
* build;
* migrations;
* integração;
* regras de negócio;
* responsividade.

---

# 14. ALTERAÇÕES

Antes de uma alteração significativa:

1. entender o problema;
2. localizar o código;
3. identificar dependências;
4. avaliar impacto;
5. implementar a menor alteração possível;
6. validar;
7. documentar quando necessário.

---

# 15. PROIBIÇÕES

Não:

* apagar código sem necessidade;
* substituir arquivos inteiros sem motivo;
* criar duplicações;
* instalar dependências desnecessárias;
* mudar arquitetura sem justificativa;
* criar funcionalidades não solicitadas;
* ignorar erros;
* esconder falhas;
* alterar banco sem migration;
* expor secrets;
* confiar em dados financeiros enviados pelo cliente.

---

# 16. PRIORIDADES

Quando houver conflito entre objetivos, priorize:

1. segurança;
2. integridade;
3. funcionamento;
4. simplicidade;
5. manutenção;
6. performance;
7. escalabilidade.

---

# 17. FILOSOFIA DO PROJETO

Não queremos um projeto grande.

Queremos um projeto correto.

A melhor solução não é necessariamente a mais sofisticada.

A melhor solução é aquela que resolve o problema com o menor nível de complexidade necessário.

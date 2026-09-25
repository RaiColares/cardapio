# WORKFLOW RULES

Estas regras definem como o desenvolvimento deve acontecer.

---

# 1. NÃO IMPLEMENTAR TUDO DE UMA VEZ

Nunca implementar várias funcionalidades não relacionadas simultaneamente.

Trabalhe em unidades pequenas.

---

# 2. ANTES DE ALTERAR

Sempre:

```text
LER
 ↓
ENTENDER
 ↓
PROCURAR
 ↓
PLANEJAR
 ↓
ALTERAR
 ↓
VALIDAR
```

Nunca:

```text
PEDIDO
 ↓
CRIAR 20 ARQUIVOS
```

---

# 3. INSPEÇÃO OBRIGATÓRIA

Antes de criar qualquer coisa:

* listar estrutura;
* procurar arquivos;
* procurar termos;
* verificar implementação existente;
* verificar documentação.

---

# 4. MENOR ALTERAÇÃO POSSÍVEL

Sempre escolher a menor alteração capaz de resolver o problema.

Exemplo:

Se o objetivo é corrigir um botão:

NÃO:

* refatorar toda a página;
* criar novo design system;
* criar 10 componentes;
* trocar biblioteca.

SIM:

* localizar botão;
* corrigir o problema;
* testar.

---

# 5. NÃO CRIAR DUPLICAÇÕES

Antes de criar:

```text
ProductCard.tsx
```

procure:

```text
ProductCard
product-card
CardProduct
```

O mesmo princípio vale para:

* hooks;
* services;
* utils;
* types;
* APIs;
* módulos.

---

# 6. FASES

Respeitar a ordem:

```text
FASE 1
Fundação

FASE 2
Autenticação

FASE 3
Estabelecimento

FASE 4
Catálogo

FASE 5
Menu público

FASE 6
Pedidos

FASE 7
Operação

FASE 8
Dashboard

FASE 9
Qualidade
```

Não avançar sem necessidade.

---

# 7. UMA TAREFA POR VEZ

Quando uma tarefa possuir várias etapas:

1. identificar etapas;
2. executar a primeira;
3. validar;
4. continuar.

Não assumir automaticamente que todas as etapas precisam ser executadas.

---

# 8. NÃO REFATORAR SEM NECESSIDADE

Não aproveitar uma tarefa pequena para:

* reorganizar todo o projeto;
* renomear dezenas de arquivos;
* mudar arquitetura;
* trocar bibliotecas.

Se uma refatoração for necessária, documentar o motivo.

---

# 9. DEPENDÊNCIAS

Antes de adicionar dependência:

1. verificar dependências existentes;
2. verificar se já existe solução;
3. avaliar custo;
4. justificar.

---

# 10. BANCO

Alterações de banco devem:

1. alterar schema;
2. criar migration;
3. aplicar migration;
4. validar;
5. atualizar documentação.

Nunca modificar banco silenciosamente.

---

# 11. TESTES

Após alteração relevante:

* executar testes relacionados;
* verificar TypeScript;
* verificar build;
* verificar lint quando configurado.

---

# 12. ERROS

Nunca ignorar erros.

Se um comando falhar:

1. entender o erro;
2. verificar a causa;
3. corrigir;
4. executar novamente;
5. registrar se necessário.

---

# 13. ARQUIVOS NÃO SOLICITADOS

Não criar:

* documentação aleatória;
* arquivos temporários;
* componentes experimentais;
* scripts descartáveis;
* versões alternativas;
* backups dentro do projeto.

---

# 14. DOCUMENTAÇÃO

Atualizar documentação somente quando a alteração realmente modificar:

* arquitetura;
* banco;
* API;
* regra de negócio;
* roadmap;
* progresso.

Não gerar documentação excessiva.

---

# 15. FINALIZAÇÃO

Uma tarefa somente pode ser considerada concluída quando:

```text
IMPLEMENTAÇÃO
      ↓
VALIDAÇÃO
      ↓
TESTES
      ↓
REVISÃO
      ↓
DOCUMENTAÇÃO (quando necessária)
      ↓
CONCLUÍDA
```

---

# 16. REGRA ABSOLUTA

Quando houver dúvida entre:

```text
CRIAR MAIS
```

e

```text
REUTILIZAR O QUE EXISTE
```

prefira:

```text
REUTILIZAR
```

Quando houver dúvida entre:

```text
ALTERAR MUITAS COISAS
```

e

```text
ALTERAR SOMENTE O NECESSÁRIO
```

prefira:

```text
ALTERAR SOMENTE O NECESSÁRIO
```

Quando houver dúvida entre:

```text
IMPLEMENTAR AGORA
```

e

```text
INSPECIONAR PRIMEIRO
```

prefira:

```text
INSPECIONAR PRIMEIRO
```

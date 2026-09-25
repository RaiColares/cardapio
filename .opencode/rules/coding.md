# CODING RULES

Estas regras definem os padrões de desenvolvimento do projeto.

---

# 1. PRINCÍPIO

O código deve ser:

* legível;
* previsível;
* simples;
* tipado;
* testável;
* reutilizável;
* fácil de manter.

---

# 2. TYPESCRIPT

Utilize TypeScript de forma rigorosa.

Evite:

```typescript
any
```

quando um tipo adequado puder ser definido.

Evite casts desnecessários:

```typescript
as any
```

e:

```typescript
as unknown as ...
```

sem justificativa.

---

# 3. NOMENCLATURA

Utilize nomes que expressem intenção.

Ruim:

```typescript
const d = ...
const x = ...
const p = ...
```

Preferível:

```typescript
const order = ...
const product = ...
const customer = ...
```

---

# 4. FUNÇÕES

Funções devem possuir uma responsabilidade clara.

Evite funções que:

* fazem validação;
* acessam banco;
* calculam;
* enviam resposta;
* enviam email;

tudo ao mesmo tempo.

Separe responsabilidades quando necessário.

---

# 5. COMPONENTES

Componentes React devem possuir responsabilidade clara.

Evite componentes gigantes.

Antes de dividir um componente, entretanto, verifique se a divisão realmente melhora a manutenção.

Não crie dezenas de componentes minúsculos sem necessidade.

---

# 6. DUPLICAÇÃO

Antes de copiar código:

1. procure implementação existente;
2. verifique se pode reutilizar;
3. avalie abstração;
4. somente então duplique quando houver justificativa.

---

# 7. COMENTÁRIOS

Comentários devem explicar:

* por que algo é feito;
* regras de negócio;
* decisões não óbvias;
* limitações.

Não escreva comentários que apenas repetem o código.

Ruim:

```typescript
// soma os valores
const total = price + fee;
```

Melhor:

```typescript
// A taxa de serviço é calculada no backend
// para evitar manipulação do valor pelo cliente.
```

---

# 8. ERROS

Nunca esconda erros silenciosamente.

Evite:

```typescript
try {
  ...
} catch {
}
```

Sem justificativa.

Erros devem:

* ser tratados;
* registrados quando necessário;
* retornar feedback apropriado.

---

# 9. API

APIs devem possuir:

* contratos claros;
* validação;
* respostas consistentes;
* tratamento de erros;
* autorização.

---

# 10. FRONTEND

O frontend deve separar:

* apresentação;
* estado;
* acesso à API;
* regras locais.

Não coloque lógica pesada diretamente no JSX.

---

# 11. BACKEND

Controllers devem ser enxutos.

Regras de negócio devem ficar em serviços ou estruturas apropriadas.

---

# 12. BANCO

Não acessar banco de forma espalhada pelo sistema.

Mantenha padrões consistentes de acesso aos dados.

---

# 13. DEPENDÊNCIAS

Antes de instalar uma biblioteca:

1. verificar se já existe dependência equivalente;
2. avaliar se a funcionalidade pode ser implementada sem biblioteca;
3. verificar impacto;
4. instalar somente se necessário.

---

# 14. ARQUIVOS

Não crie arquivos apenas para separar poucas linhas de código.

Crie arquivos quando houver responsabilidade real.

---

# 15. REGRA PRINCIPAL

Código simples e correto é preferível a código sofisticado e desnecessariamente complexo.

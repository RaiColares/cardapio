# SECURITY RULES

Estas regras são obrigatórias para todo o projeto.

---

# 1. PRINCÍPIO

Segurança deve existir desde o desenvolvimento.

Não deixe segurança para o final.

---

# 2. AUTENTICAÇÃO

Nunca armazenar senhas em texto puro.

Utilizar hashing apropriado.

Nunca expor:

* senha;
* hash;
* refresh token;
* secrets.

---

# 3. AUTORIZAÇÃO

Autenticação responde:

> Quem é você?

Autorização responde:

> O que você pode fazer?

As duas devem ser tratadas separadamente.

---

# 4. MULTI-TENANCY

Sempre verificar o estabelecimento associado ao usuário e ao recurso.

Nunca confiar somente em:

```text
:id
```

fornecido pelo cliente.

---

# 5. IDOR

Toda API que recebe um identificador deve verificar se o recurso pertence ao contexto autorizado.

Exemplo:

```text
GET /orders/123
```

Não significa que qualquer usuário autenticado pode acessar o pedido 123.

---

# 6. FINANCEIRO

Nunca confiar em valores financeiros enviados pelo frontend.

Não confiar em:

```text
price
subtotal
discount
serviceFee
total
```

O backend deve buscar os valores oficiais e recalcular.

---

# 7. PRODUTOS

Antes de aceitar um pedido:

* produto deve existir;
* produto deve pertencer ao estabelecimento;
* produto deve estar disponível;
* preço deve ser recuperado do banco.

---

# 8. SESSÕES

Antes de aceitar um pedido:

* sessão deve existir;
* sessão deve estar aberta;
* mesa deve pertencer ao estabelecimento;
* token deve ser válido.

---

# 9. QR CODE

Não utilizar IDs internos previsíveis como mecanismo de segurança.

Utilizar tokens suficientemente imprevisíveis.

---

# 10. INPUT

Todo input externo deve ser considerado não confiável.

Validar:

* tipo;
* formato;
* tamanho;
* conteúdo;
* relacionamento;
* autorização.

---

# 11. UPLOAD

Uploads devem validar:

* tamanho;
* tipo;
* MIME;
* extensão;
* nome;
* armazenamento.

Nunca confiar apenas na extensão.

---

# 12. SECRETS

Nunca colocar secrets diretamente no código.

Não versionar:

```text
.env
```

quando contiver credenciais reais.

---

# 13. LOGS

Nunca registrar informações sensíveis desnecessariamente.

Não registrar:

* senhas;
* tokens completos;
* secrets;
* dados pessoais desnecessários.

---

# 14. ENDPOINTS PÚBLICOS

Endpoints públicos devem ser analisados contra:

* abuso;
* spam;
* enumeração;
* payloads inválidos;
* manipulação de IDs;
* excesso de requisições.

---

# 15. DEPENDÊNCIAS

Dependências devem ser mantidas atualizadas de acordo com a estratégia do projeto.

Evitar dependências desnecessárias.

---

# 16. PRINCÍPIO ZERO TRUST

Nunca presumir que:

* frontend é confiável;
* usuário é confiável;
* ID é válido;
* preço recebido é correto;
* sessão está correta;
* recurso pertence ao usuário.

Tudo deve ser validado.

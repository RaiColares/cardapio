-- FASE 24 (refinamento): CARD genérico vira CREDIT_CARD / DEBIT_CARD independentes.
--
-- Regras de dados existentes:
--  1) Pagamentos registrados como CARD passam a CREDIT_CARD (forma mais comum).
--  2) Intenção de pagamento da comanda (payment_method_intent) CARD passa a
--     CREDIT_CARD (o campo é TEXT — não está no enum, mas precisa acompanhar).
--  3) Estabelecimentos que aceitavam CARD passam a aceitar CREDIT_CARD E
--     DEBIT_CARD — preserva o comportamento anterior de "aceitar cartões".
--
-- Estratégia do swap do enum: cria o tipo novo, recasta a coluna `payments.method`
-- passando por TEXT (para remapear o valor antigo CARD), troca o nome no final.

-- 3) Métodos aceites: expande CARD -> {CREDIT_CARD, DEBIT_CARD} nas listas (TEXT[]).
UPDATE "establishments"
SET "accepted_payment_methods" = ARRAY(
  SELECT CASE WHEN v = 'CARD' THEN 'CREDIT_CARD' ELSE v END
  FROM unnest("accepted_payment_methods") AS v
) || ARRAY['DEBIT_CARD']::TEXT[]
WHERE 'CARD' = ANY("accepted_payment_methods");

-- Novo tipo do enum com CREDIT_CARD e DEBIT_CARD (sem CARD).
CREATE TYPE "PaymentMethod_new" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX');

-- 1) Pagamentos: relaxa para TEXT, remapeia CARD -> CREDIT_CARD e recasta.
ALTER TABLE "payments" ALTER COLUMN "method" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "method" TYPE TEXT;
UPDATE "payments" SET "method" = 'CREDIT_CARD' WHERE "method" = 'CARD';
ALTER TABLE "payments" ALTER COLUMN "method" TYPE "PaymentMethod_new" USING ("method"::"PaymentMethod_new");
ALTER TABLE "payments" ALTER COLUMN "method" SET DEFAULT 'CASH';

-- Troca o nome do tipo: o antigo (sem uso) é removido e o novo assume.
DROP TYPE "PaymentMethod";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";

-- 2) Intenções de pagamento das comandas (coluna TEXT — fora do enum).
UPDATE "table_sessions"
SET "payment_method_intent" = 'CREDIT_CARD'
WHERE "payment_method_intent" = 'CARD';

-- ---------------------------------------------------------------
-- Default dos métodos aceites do estabelecimento: agora com crédito/débito.
-- ---------------------------------------------------------------
ALTER TABLE "establishments"
ALTER COLUMN "accepted_payment_methods"
SET DEFAULT ARRAY['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX']::TEXT[];
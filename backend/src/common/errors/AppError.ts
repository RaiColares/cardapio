/**
 * Erro de aplicação com status HTTP e código estável de negócio.
 *
 * O código é utilizado pelo cliente para tratar o erro de forma
 * programática; a mensagem é segura para exibição ao usuário.
 *
 * `details` transporta dados complementares do erro (ex.: o valor
 * faltante em INSUFFICIENT_PAYMENT) sem quebrar o contrato padrão.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

import bcrypt from 'bcrypt';

/**
 * Número de rodadas do bcrypt.
 *
 * 12 é o valor recomendado atualmente para senhas de usuários:
 *  - seguro contra ataques de força bruta;
 *  - rápido o suficiente em hardware moderno.
 */
const BCRYPT_ROUNDS = 12;

/**
 * Gera o hash bcrypt de uma senha em texto puro.
 *
 * Nunca armazenar senhas em texto puro.
 */
export function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

/**
 * Compara uma senha em texto puro com um hash bcrypt.
 *
 * Retorna true somente se a senha corresponde ao hash.
 */
export function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

import { AppError } from '../common/errors/AppError.js';
import { signAccessToken } from '../common/auth/jwt.js';
import { verifyPassword } from '../common/auth/password.js';
import { prisma } from '../common/prisma/prisma.js';
import type { LoginInput } from './auth.schemas.js';

/**
 * Autentica um usuário e retorna o access token JWT.
 *
 * Regras de negócio:
 * 1. usuário deve existir (buscado por e-mail normalizado);
 * 2. usuário deve estar ativo;
 * 3. estabelecimento deve estar ativo;
 * 4. senha deve corresponder ao hash armazenado;
 * 5. payload do token: { sub: userId, establishmentId, role }.
 *
 * Falhas de credenciais usam mensagem genérica para não revelar
 * se o e-mail existe ou não (evita enumeração de usuários).
 */
export async function loginWithCredentials(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // Usuário não encontrado: aplica hash dummy para manter tempo de resposta
  // semelhante ao caso de senha errada (mitiga enumeração por timing).
  if (!user) {
    await verifyPassword(input.password, '$2b$12$WPhGd4ul5a0FUrhCTqaaceT/8UBpptob3DjRuR6YpJt8AU/CvAhqy');
    throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
  }

  if (!user.active) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
  }

  const establishment = await prisma.establishment.findUnique({
    where: { id: user.establishmentId },
    select: { status: true },
  });

  if (!establishment || establishment.status !== 'ACTIVE') {
    throw new AppError(403, 'ESTABLISHMENT_INACTIVE', 'Estabelecimento inativo.');
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
  }

  const token = signAccessToken({
    sub: user.id,
    establishmentId: user.establishmentId,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      establishmentId: user.establishmentId,
    },
  };
}

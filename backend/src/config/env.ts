import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type NodeEnv = 'development' | 'test' | 'production';

/**
 * Carrega o arquivo .env local sem dependências externas.
 *
 * Variáveis já definidas no ambiente real não são sobrescritas.
 * O .env só é utilizado em desenvolvimento/boot local; em produção
 * as variáveis devem vir do ambiente de execução.
 */
function loadLocalEnv(): void {
  const envPath = resolve(__dirname, '../../.env');

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const isQuoted =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"));
    const value = isQuoted ? rawValue.slice(1, -1) : rawValue;

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }

  return value;
}

function parsePort(name: string): number {
  const value = requireEnv(name);
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Variável de ambiente inválida: ${name}="${value}" (esperado uma porta entre 1 e 65535)`,
    );
  }

  return port;
}

function parseNodeEnv(name: string): NodeEnv {
  const value = requireEnv(name);

  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }

  throw new Error(
    `Variável de ambiente inválida: ${name}="${value}" (esperado development, test ou production)`,
  );
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? undefined : value;
}

loadLocalEnv();

export const env = {
  nodeEnv: parseNodeEnv('NODE_ENV'),
  port: parsePort('PORT'),
  corsOrigin: requireEnv('CORS_ORIGIN'),
  databaseUrl: requireEnv('DATABASE_URL'),
  // Autenticação JWT — secret obrigatório em qualquer ambiente.
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN') ?? '8h',
  // Seed do primeiro usuário ADMIN (somente desenvolvimento).
  seedAdminEmail: optionalEnv('SEED_ADMIN_EMAIL') ?? 'admin@balneario.dev',
  seedAdminPassword: optionalEnv('SEED_ADMIN_PASSWORD') ?? 'admin12345',
  seedAdminName: optionalEnv('SEED_ADMIN_NAME') ?? 'Administrador',
} as const;

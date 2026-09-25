import { createServer } from 'node:http';

import { initRealtime } from './realtime/socket.js';

/**
 * Bootstrap do servidor.
 *
 * Os módulos são importados dinamicamente para que falhas de
 * configuração (ex.: variáveis de ambiente ausentes) sejam
 * capturadas e reportadas com mensagem clara de boot.
 */
void (async () => {
  try {
    const [{ env }, { app }] = await Promise.all([
      import('./config/env.js'),
      import('./app.js'),
    ]);

    // HTTP server explícito: necessário para anexar o WebSocket (socket.io).
    const server = createServer(app);

    initRealtime(server);

    server.listen(env.port, () => {
      console.log(`[boot] API iniciada em http://localhost:${env.port} (${env.nodeEnv})`);
    });

    const shutdown = (signal: NodeJS.Signals): void => {
      console.log(`[boot] Sinal ${signal} recebido. Encerrando servidor...`);
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[boot] Falha ao iniciar o servidor: ${message}`);
    process.exit(1);
  }
})();

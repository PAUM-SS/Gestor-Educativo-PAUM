import express from 'express';
import { db } from './db/index.ts';

import { createServer } from './app.ts';

export interface StartServerOptions {
  host?: string;
  port?: number;
  staticDir?: string;
}

export interface StartedServer {
  app: express.Express;
  host: string;
  port: number;
  server: ReturnType<express.Express['listen']>;
  url: string;
}

export async function startServer({
  host = '0.0.0.0',
  port = 3001,
  staticDir,
}: StartServerOptions = {}): Promise<StartedServer> {
  // Inicializar base de datos primero
  await db.init();
  const app = createServer({ staticDir });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('No se pudo resolver la direccion del servidor.'));
        return;
      }

      const resolvedHost = host === '0.0.0.0' ? '127.0.0.1' : host;
      resolve({
        app,
        host,
        port: address.port,
        server,
        url: `http://${resolvedHost}:${address.port}`,
      });
    });

    server.on('error', reject);
  });
}

const isDirectExecution =
  Boolean(process.argv[1]) &&
   (process.argv[1].includes('server/index') || 
   process.argv[1].includes('server\\index'));

if (isDirectExecution) {
  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || '0.0.0.0';
  const staticDir = process.env.STATIC_DIR;

  startServer({ host, port, staticDir })
    .then(({ port: activePort }) => {
      console.log(`Server API running on ${activePort}`);
    })
    .catch((error) => {
      console.error('No se pudo iniciar el servidor:', error);
      process.exit(1);
    });
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { corsOrigins, type Env } from './config/env.js';
import { createApiRouter } from './routes/index.js';
import { ContentService } from './services/contentService.js';
import type { ContentRepository } from './services/repository.js';
import { errorHandler, HttpError, notFoundHandler } from './middleware/errors.js';

export interface AppDeps {
  env: Env;
  repo: ContentRepository;
  cacheTtlMs?: number;
}

export function createApp({ env, repo, cacheTtlMs }: AppDeps) {
  const app = express();
  const service = new ContentService(repo, cacheTtlMs ?? (env.NODE_ENV === 'test' ? 0 : 60_000));
  const allowed = corsOrigins(env);

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow non-browser clients (no Origin header) and configured origins.
        if (!origin || allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
        cb(new HttpError(403, 'CORS_FORBIDDEN', `Origin ${origin} tidak diizinkan`));
      },
      methods: ['GET', 'OPTIONS'],
      maxAge: 86_400,
    }),
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(
    '/api',
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan, coba lagi sebentar lagi' } },
    }),
  );
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'public, max-age=60');
    next();
  });

  app.get('/', (_req, res) => {
    res.json({ name: 'Suspension Lab API', docs: '/api/health' });
  });
  app.use('/api', createApiRouter(service, repo));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

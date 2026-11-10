import { Router } from 'express';
import type { ContentService } from '../services/contentService.js';
import type { ContentRepository } from '../services/repository.js';
import { createContentController } from '../controllers/contentController.js';
import { validateSlugParam } from '../middleware/validate.js';

export function createApiRouter(service: ContentService, repo: ContentRepository) {
  const r = Router();
  const c = createContentController(service);
  const id = validateSlugParam('id');

  r.get('/health', async (_req, res) => {
    const db = await repo.ping();
    res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db: db ? 'up' : 'down', time: new Date().toISOString() });
  });

  r.get('/suspensions', c.listSuspensions);
  r.get('/suspensions/:id', id, c.getSuspension);
  r.get('/suspensions/:id/components', id, c.getSuspensionComponents);
  r.get('/suspensions/:id/damage-scenarios', id, c.getSuspensionDamageScenarios);

  r.get('/components', c.listComponents);
  r.get('/components/:id', id, c.getComponent);
  r.get('/components/:id/damage-scenarios', id, c.getComponentDamageScenarios);

  r.get('/damage-scenarios', c.listDamageScenarios);
  r.get('/damage-scenarios/:id', id, c.getDamageScenario);
  return r;
}

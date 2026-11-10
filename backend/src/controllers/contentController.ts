import type { Request, RequestHandler, Response } from 'express';
import type { ContentService } from '../services/contentService.js';
import { HttpError } from '../middleware/errors.js';

type Handler = (req: Request<{ id: string }>, res: Response) => Promise<void>;
const wrap = (fn: Handler): RequestHandler => (req, res, next) => {
  fn(req as Request<{ id: string }>, res).catch(next);
};

function ok<T>(res: Response, data: T | null, notFoundMessage: string) {
  if (data === null) throw new HttpError(404, 'NOT_FOUND', notFoundMessage);
  res.json({ data });
}

export function createContentController(service: ContentService) {
  return {
    listSuspensions: wrap(async (_req, res) => ok(res, await service.listSuspensions(), '')),
    getSuspension: wrap(async (req, res) =>
      ok(res, await service.getSuspension(req.params.id), `Suspensi '${req.params.id}' tidak ditemukan`)),
    getSuspensionComponents: wrap(async (req, res) =>
      ok(res, await service.getSuspensionComponents(req.params.id), `Suspensi '${req.params.id}' tidak ditemukan`)),
    getSuspensionDamageScenarios: wrap(async (req, res) =>
      ok(res, await service.getSuspensionDamageScenarios(req.params.id), `Suspensi '${req.params.id}' tidak ditemukan`)),
    listComponents: wrap(async (_req, res) => ok(res, await service.listComponents(), '')),
    getComponent: wrap(async (req, res) =>
      ok(res, await service.getComponent(req.params.id), `Komponen '${req.params.id}' tidak ditemukan`)),
    getComponentDamageScenarios: wrap(async (req, res) =>
      ok(res, await service.getComponentDamageScenarios(req.params.id), `Komponen '${req.params.id}' tidak ditemukan`)),
    listDamageScenarios: wrap(async (_req, res) => ok(res, await service.listDamageScenarios(), '')),
    getDamageScenario: wrap(async (req, res) =>
      ok(res, await service.getDamageScenario(req.params.id), `Skenario kerusakan '${req.params.id}' tidak ditemukan`)),
  };
}

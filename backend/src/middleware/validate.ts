import type { RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from './errors.js';

/** Slugs are lowercase kebab-case identifiers (e.g. "double-wishbone"). */
export const SlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'ID harus berupa slug huruf kecil, angka, dan tanda hubung');

export const validateSlugParam =
  (name = 'id'): RequestHandler =>
  (req, _res, next) => {
    const result = SlugSchema.safeParse(req.params[name]);
    if (!result.success) {
      next(new HttpError(400, 'INVALID_PARAMETER', `Parameter '${name}' tidak valid: ${result.error.issues[0]?.message}`));
      return;
    }
    next();
  };

import type { RequestHandler } from 'express';
import { authService } from './auth.service';

export const requireAdminAuth: RequestHandler = (request, _response, next) => {
  try {
    authService.requireAdmin(request);
    next();
  } catch (error) {
    next(error);
  }
};

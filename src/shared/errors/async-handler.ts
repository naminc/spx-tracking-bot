import type { NextFunction, Request, Response } from 'express';

type AsyncController = (request: Request, response: Response, next: NextFunction) => Promise<void>;

export const asyncHandler =
  (controller: AsyncController) =>
  (request: Request, response: Response, next: NextFunction): void => {
    controller(request, response, next).catch(next);
  };

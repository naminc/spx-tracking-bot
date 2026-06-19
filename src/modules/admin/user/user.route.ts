import { Router } from 'express';
import { asyncHandler } from '../../../shared/errors/async-handler';
import { validateRequest } from '../../../shared/validation/validate-request';
import { userController } from './user.controller';
import { listUsersQuerySchema } from './user.schema';

export const userRouter = Router();

userRouter.get(
  '/',
  validateRequest({ query: listUsersQuerySchema }),
  asyncHandler(userController.listUsers),
);

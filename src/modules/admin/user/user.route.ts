import { Router } from 'express';
import { asyncHandler } from '../../../shared/errors/async-handler';
import { validateRequest } from '../../../shared/validation/validate-request';
import { userController } from './user.controller';
import {
  blockUserBodySchema,
  bulkDeleteUsersBodySchema,
  listUsersQuerySchema,
  userIdParamsSchema,
  userOptionsQuerySchema,
} from './user.schema';

export const userRouter = Router();

userRouter.get(
  '/',
  validateRequest({ query: listUsersQuerySchema }),
  asyncHandler(userController.listUsers),
);

userRouter.get(
  '/options',
  validateRequest({ query: userOptionsQuerySchema }),
  asyncHandler(userController.listUserOptions),
);

userRouter.get(
  '/zero-order-preview',
  asyncHandler(userController.previewZeroOrderUsers),
);

userRouter.post(
  '/clear-zero-order',
  asyncHandler(userController.clearZeroOrderUsers),
);

userRouter.post(
  '/bulk-delete',
  validateRequest({ body: bulkDeleteUsersBodySchema }),
  asyncHandler(userController.bulkDeleteUsers),
);

userRouter.patch(
  '/:id/block',
  validateRequest({ params: userIdParamsSchema, body: blockUserBodySchema }),
  asyncHandler(userController.blockUser),
);

userRouter.patch(
  '/:id/unblock',
  validateRequest({ params: userIdParamsSchema }),
  asyncHandler(userController.unblockUser),
);

userRouter.delete(
  '/:id',
  validateRequest({ params: userIdParamsSchema }),
  asyncHandler(userController.deleteUser),
);

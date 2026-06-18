import { Router } from 'express';
import { asyncHandler } from '../../../shared/errors/async-handler';
import { userController } from './user.controller';

export const userRouter = Router();

userRouter.get('/', asyncHandler(userController.listUsers));

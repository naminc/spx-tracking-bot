import { Router } from 'express';
import { asyncHandler } from '../../../shared/errors/async-handler';
import { writeRateLimiter } from '../../../shared/http/rate-limit';
import { validateRequest } from '../../../shared/validation/validate-request';
import { authController } from './auth.controller';
import { requestOtpSchema, verifyOtpSchema } from './auth.schema';

export const authRouter = Router();

authRouter.post(
  '/request-otp',
  writeRateLimiter,
  validateRequest({ body: requestOtpSchema }),
  asyncHandler(authController.requestOtp),
);

authRouter.post(
  '/verify-otp',
  writeRateLimiter,
  validateRequest({ body: verifyOtpSchema }),
  asyncHandler(authController.verifyOtp),
);

authRouter.get('/me', asyncHandler(authController.me));

authRouter.post('/logout', asyncHandler(authController.logout));

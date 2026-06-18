import { Router } from 'express';
import { asyncHandler } from '../../../shared/errors/async-handler';
import { writeRateLimiter } from '../../../shared/http/rate-limit';
import { validateRequest } from '../../../shared/validation/validate-request';
import { settingController } from './setting.controller';
import { updateSettingSchema } from './setting.schema';

export const settingRouter = Router();

settingRouter.get('/', asyncHandler(settingController.getSettings));

settingRouter.put(
  '/',
  writeRateLimiter,
  validateRequest({ body: updateSettingSchema }),
  asyncHandler(settingController.updateSettings),
);

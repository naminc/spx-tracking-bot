import type { Request, Response } from 'express';
import { successResponse } from '../../../shared/response/api-response';
import { authService } from '../auth/auth.service';
import { SettingService, settingService } from './setting.service';
import type { UpdateSettingInput } from './setting.schema';

export class SettingController {
  constructor(private readonly service: SettingService = settingService) {}

  getSettings = async (_request: Request, response: Response): Promise<void> => {
    const settings = await this.service.getSettings();
    response.json(successResponse('Fetched settings successfully', settings));
  };

  updateSettings = async (request: Request, response: Response): Promise<void> => {
    const admin = authService.requireAdmin(request);
    const settings = await this.service.updateSettings(
      request.body as UpdateSettingInput,
      admin,
    );
    response.json(successResponse('Updated settings successfully', settings));
  };
}

export const settingController = new SettingController();

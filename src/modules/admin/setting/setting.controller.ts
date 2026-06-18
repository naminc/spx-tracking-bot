import type { Request, Response } from 'express';
import { successResponse } from '../../../shared/response/api-response';
import { SettingService, settingService } from './setting.service';

export class SettingController {
  constructor(private readonly service: SettingService = settingService) {}

  getSettings = async (_request: Request, response: Response): Promise<void> => {
    const settings = await this.service.getSettings();
    response.json(successResponse('Lấy cấu hình thành công', settings));
  };

  updateSettings = async (request: Request, response: Response): Promise<void> => {
    const settings = await this.service.updateSettings(
      request.body as { adminContact: string; maintenanceEnabled: boolean },
    );
    response.json(successResponse('Cập nhật cấu hình thành công', settings));
  };
}

export const settingController = new SettingController();

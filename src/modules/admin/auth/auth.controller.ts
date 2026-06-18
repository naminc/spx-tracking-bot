import type { Request, Response } from 'express';
import { successResponse } from '../../../shared/response/api-response';
import { AuthService, authService } from './auth.service';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  requestOtp = async (request: Request, response: Response): Promise<void> => {
    const { identifier } = request.body as { identifier: string };
    const result = await this.service.requestOtp(identifier);
    response.json(successResponse('OTP đã được gửi qua Telegram', result));
  };

  verifyOtp = async (request: Request, response: Response): Promise<void> => {
    const { telegramId, otp } = request.body as { telegramId: string; otp: string };
    const admin = this.service.verifyOtp(telegramId, otp);
    this.service.setAuthCookie(response, admin);
    response.json(successResponse('Đăng nhập thành công', admin));
  };

  me = async (request: Request, response: Response): Promise<void> => {
    const admin = this.service.requireAdmin(request);
    response.json(successResponse('Lấy thông tin admin thành công', admin));
  };

  logout = async (_request: Request, response: Response): Promise<void> => {
    this.service.clearAuthCookie(response);
    response.json(successResponse('Đăng xuất thành công'));
  };
}

export const authController = new AuthController();

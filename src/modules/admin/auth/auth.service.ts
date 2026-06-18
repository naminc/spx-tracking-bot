import axios from 'axios';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';
import { env } from '../../../config/env';
import { AppError } from '../../../shared/errors/app-error';
import { logger } from '../../../shared/logger/logger';
import type { AdminUser, JwtAdminPayload } from './auth.types';

type AdminConfig = {
  telegramId: string;
  username: string | null;
};

type OtpRecord = {
  otpHash: string;
  expiresAt: number;
};

const ADMIN_COOKIE_NAME = 'admin_token';
const OTP_TTL_MS = 5 * 60 * 1000;

const normalizeUsername = (value: string): string => value.trim().replace(/^@/, '').toLowerCase();

const base64UrlJson = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const parseCookieHeader = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
    const separatorIndex = part.indexOf('=');

    if (separatorIndex === -1) {
      return cookies;
    }

    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();

    if (!key) {
      return cookies;
    }

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }

    return cookies;
  }, {});
};

const toAdminUser = (admin: AdminConfig): AdminUser => ({
  id: admin.telegramId,
  telegramId: admin.telegramId,
  username: admin.username,
  firstName: null,
});

export class AuthService {
  private readonly admins: AdminConfig[];
  private readonly otpRecords = new Map<string, OtpRecord>();

  constructor() {
    this.admins = this.parseAdmins(env.ADMIN_TELEGRAM_ADMINS);
  }

  async requestOtp(identifier: string): Promise<{ success: true; telegramId: string }> {
    if (this.admins.length === 0) {
      throw new AppError('Admin login is not configured', 503);
    }

    const admin = this.findAdmin(identifier);

    if (!admin) {
      throw new AppError('Không thể gửi OTP cho tài khoản này', 401);
    }

    if (!env.TELEGRAM_BOT_TOKEN) {
      throw new AppError('Telegram bot token is not configured', 503);
    }

    const otp = String(randomInt(100000, 1000000));
    this.otpRecords.set(admin.telegramId, {
      otpHash: this.hashOtp(admin.telegramId, otp),
      expiresAt: Date.now() + OTP_TTL_MS,
    });

    await this.sendOtp(admin, otp);

    return { success: true, telegramId: admin.telegramId };
  }

  verifyOtp(telegramId: string, otp: string): AdminUser {
    const admin = this.admins.find((item) => item.telegramId === telegramId);
    const record = this.otpRecords.get(telegramId);

    if (!admin || !record || record.expiresAt < Date.now()) {
      this.otpRecords.delete(telegramId);
      throw new AppError('OTP không hợp lệ hoặc đã hết hạn', 401);
    }

    if (!this.isSameValue(record.otpHash, this.hashOtp(telegramId, otp))) {
      throw new AppError('OTP không hợp lệ hoặc đã hết hạn', 401);
    }

    this.otpRecords.delete(telegramId);
    return toAdminUser(admin);
  }

  setAuthCookie(response: Response, admin: AdminUser): void {
    response.cookie(ADMIN_COOKIE_NAME, this.signJwt(admin), {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: env.ADMIN_JWT_EXPIRES_IN_SECONDS * 1000,
      path: '/',
    });
  }

  clearAuthCookie(response: Response): void {
    response.clearCookie(ADMIN_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      path: '/',
    });
  }

  getAdminFromRequest(request: Request): AdminUser | null {
    const token = parseCookieHeader(request.headers.cookie)[ADMIN_COOKIE_NAME];

    if (!token) {
      return null;
    }

    const payload = this.verifyJwt(token);

    if (!payload) {
      return null;
    }

    const admin = this.admins.find((item) => item.telegramId === payload.sub);

    return admin ? toAdminUser(admin) : null;
  }

  requireAdmin(request: Request): AdminUser {
    const admin = this.getAdminFromRequest(request);

    if (!admin) {
      throw new AppError('Unauthorized', 401);
    }

    return admin;
  }

  private parseAdmins(value: string): AdminConfig[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [telegramId, username] = item.split(':');

        return {
          telegramId: telegramId.trim(),
          username: username ? normalizeUsername(username) : null,
        };
      })
      .filter((admin) => admin.telegramId);
  }

  private findAdmin(identifier: string): AdminConfig | undefined {
    const trimmedIdentifier = identifier.trim();
    const normalizedIdentifier = normalizeUsername(trimmedIdentifier);

    return this.admins.find(
      (admin) =>
        admin.telegramId === trimmedIdentifier ||
        (admin.username && admin.username === normalizedIdentifier),
    );
  }

  private hashOtp(telegramId: string, otp: string): string {
    return createHmac('sha256', env.ADMIN_JWT_SECRET)
      .update(`${telegramId}:${otp}`)
      .digest('hex');
  }

  private signJwt(admin: AdminUser): string {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
    const payload = base64UrlJson({
      sub: admin.telegramId,
      username: admin.username,
      role: 'ADMIN',
      iat: nowSeconds,
      exp: nowSeconds + env.ADMIN_JWT_EXPIRES_IN_SECONDS,
    } satisfies JwtAdminPayload);
    const signature = this.sign(`${header}.${payload}`);

    return `${header}.${payload}.${signature}`;
  }

  private verifyJwt(token: string): JwtAdminPayload | null {
    const [header, payload, signature] = token.split('.');

    if (!header || !payload || !signature || !this.isValidSignature(`${header}.${payload}`, signature)) {
      return null;
    }

    try {
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as JwtAdminPayload;

      if (parsed.role !== 'ADMIN' || !parsed.sub || parsed.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private sign(value: string): string {
    return createHmac('sha256', env.ADMIN_JWT_SECRET).update(value).digest('base64url');
  }

  private isValidSignature(value: string, signature: string): boolean {
    return this.isSameValue(this.sign(value), signature);
  }

  private isSameValue(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(actual);

    return (
      expectedBuffer.length === actualBuffer.length &&
      timingSafeEqual(expectedBuffer, actualBuffer)
    );
  }

  private async sendOtp(admin: AdminConfig, otp: string): Promise<void> {
    try {
      await axios.post(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: admin.telegramId,
        parse_mode: 'HTML',
        text: `<b>SPX Tracking Admin</b>

Mã OTP của bạn là: <code>${otp}</code>

Mã này hết hạn sau 5 phút.`,
      });
    } catch (error) {
      logger.error({ err: error, telegramId: admin.telegramId }, 'Failed to send admin OTP');
      throw new AppError('Không thể gửi OTP qua Telegram', 502);
    }
  }
}

export const authService = new AuthService();

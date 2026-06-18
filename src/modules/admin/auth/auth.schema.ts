import { z } from 'zod';

export const requestOtpSchema = z.object({
  identifier: z.string().trim().min(1).max(64),
});

export const verifyOtpSchema = z.object({
  telegramId: z.string().trim().min(1).max(64),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

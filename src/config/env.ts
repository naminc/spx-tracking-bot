import dotenv from 'dotenv';
import { z } from 'zod';
import { resolveProjectPath } from './paths';

dotenv.config({ path: resolveProjectPath('.env') });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
  TELEGRAM_ADMIN_USERNAME: z.string().trim().min(1).default('@naminc'),
  TELEGRAM_POLLING_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(25),
  ADMIN_TELEGRAM_ADMINS: z.string().optional().default(''),
  ADMIN_JWT_SECRET: z.string().min(16).default('development-admin-jwt-secret-change-me'),
  ADMIN_JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(604800),
  SPX_API_URL: z
    .string()
    .url()
    .default('https://spx.vn/shipment/order/open/order/get_order_info'),
  SPX_LANGUAGE_CODE: z.string().min(2).default('vi'),
  SPX_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  SPX_CHECK_INTERVAL_MINUTES: z.coerce.number().int().positive().optional(),
  TRACKING_CHECK_INTERVAL_MINUTES: z.coerce.number().int().positive().optional(),
  TRACKING_HTTP_USER_AGENT: z.string().trim().min(1).default('Mozilla/5.0'),
  GHN_TRACKING_LOGS_URL: z
    .string()
    .url()
    .default('https://fe-online-gateway.ghn.vn/order-tracking/public-api/client/tracking-logs'),
  GHN_TRACKING_ORIGIN: z.string().url().default('https://donhang.ghn.vn'),
  GHN_TRACKING_REFERER: z.string().url().default('https://donhang.ghn.vn/'),
  GHN_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  DELIVERED_KEYWORDS: z.string().default('Giao hàng thành công,Delivered'),
  FAILED_KEYWORDS: z
    .string()
    .default(
      'Giao hàng thất bại,Giao không thành công,Không giao được,Delivery failed,Failed delivery',
    ),
  CANCELLED_KEYWORDS: z
    .string()
    .default('Đơn hàng đã bị huỷ,Đơn hàng bị huỷ,Đã huỷ,Cancelled,Canceled'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment variables: ${parsedEnv.error.message}`);
}

const splitKeywords = (value: string): string[] =>
  value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);

export const env = {
  ...parsedEnv.data,
  TRACKING_CHECK_INTERVAL_MINUTES:
    parsedEnv.data.TRACKING_CHECK_INTERVAL_MINUTES ?? parsedEnv.data.SPX_CHECK_INTERVAL_MINUTES ?? 5,
  DELIVERED_KEYWORDS: splitKeywords(parsedEnv.data.DELIVERED_KEYWORDS),
  FAILED_KEYWORDS: splitKeywords(parsedEnv.data.FAILED_KEYWORDS),
  CANCELLED_KEYWORDS: splitKeywords(parsedEnv.data.CANCELLED_KEYWORDS),
};

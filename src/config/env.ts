import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
  TELEGRAM_POLLING_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(25),
  SPX_API_URL: z
    .string()
    .url()
    .default('https://spx.vn/shipment/order/open/order/get_order_info'),
  SPX_LANGUAGE_CODE: z.string().min(2).default('vi'),
  SPX_CHECK_INTERVAL_MINUTES: z.coerce.number().int().positive().default(5),
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
  DELIVERED_KEYWORDS: splitKeywords(parsedEnv.data.DELIVERED_KEYWORDS),
  FAILED_KEYWORDS: splitKeywords(parsedEnv.data.FAILED_KEYWORDS),
  CANCELLED_KEYWORDS: splitKeywords(parsedEnv.data.CANCELLED_KEYWORDS),
};

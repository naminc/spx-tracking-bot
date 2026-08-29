# SPX Tracking Bot

Telegram bot and REST API for tracking SPX Vietnam shipments.

Demo bot: `@spx_track_bot`

## Stack

- Node.js, TypeScript, Express
- Prisma ORM with MySQL
- Axios, Zod, node-cron, dotenv
- Telegram long polling and webhook endpoint support

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

Set these values in `.env` before using Telegram or MySQL:

```env
DATABASE_URL=mysql://root:password@localhost:3306/spx_tracking
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_USERNAME=@naminc
TELEGRAM_POLLING_TIMEOUT_SECONDS=25
PUBLIC_TRACKING_URL=https://track.example.com/track
ADMIN_TELEGRAM_ADMINS=6142403832:naminc
ADMIN_JWT_SECRET=change-this-admin-jwt-secret
ADMIN_JWT_EXPIRES_IN_SECONDS=604800
TRACKING_CHECK_INTERVAL_MINUTES=5
GHN_TRACKING_LOGS_URL=https://fe-online-gateway.ghn.vn/order-tracking/public-api/client/tracking-logs
JNT_TRACKING_URL=https://jtexpress.vn/vi/tracking
```

## Tracking Provider Config

SPX, GHN, and J&T provider HTTP settings are centralized in `src/config/tracking-providers.ts` and read from env.

Common production overrides:

```env
SPX_API_URL=https://spx.vn/shipment/order/open/order/get_order_info
SPX_LANGUAGE_CODE=vi
SPX_REQUEST_TIMEOUT_MS=15000
TRACKING_CHECK_INTERVAL_MINUTES=5
TRACKING_HTTP_USER_AGENT=Mozilla/5.0

GHN_TRACKING_LOGS_URL=https://fe-online-gateway.ghn.vn/order-tracking/public-api/client/tracking-logs
GHN_TRACKING_ORIGIN=https://donhang.ghn.vn
GHN_TRACKING_REFERER=https://donhang.ghn.vn/
GHN_REQUEST_TIMEOUT_MS=15000

JNT_TRACKING_URL=https://jtexpress.vn/vi/tracking
JNT_TRACKING_REFERER=https://jtexpress.vn/vi/tracking
JNT_REQUEST_TIMEOUT_MS=15000
```

GHN tracking requires the recipient phone or a 64-character `phone_verify`; the app stores only the generated/normalized hash in `TrackingOrder.trackingCredential`.
J&T tracking requires the phone last 4 digits and stores that value in `TrackingOrder.trackingCredential`.
API responses only expose a masked credential value.

## Frontend API URL

The Vite frontend calls the backend through `VITE_API_BASE_URL`; API requests must go through `frontend/src/lib/api/client.ts`.
The admin auth flow uses an httpOnly cookie, so the API helper sends `credentials: "include"` and does not store tokens in `localStorage`.

Local frontend development:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_TELEGRAM_BOT_URL=https://t.me/your_bot_username
```

When using the localhost API URL, open Vite at `http://localhost:5173` so browser cookies are sent consistently.

Production/Vercel:

```env
VITE_API_BASE_URL=https://api.example.com/api
VITE_TELEGRAM_BOT_URL=https://t.me/your_bot_username
```

Public tracking page:

```txt
GET  /track
POST /api/public/track
```

The public tracking API is read-only. It checks SPX, GHN, or J&T directly through the configured providers and does not create tracking orders, histories, users, or action logs.

## Response Format

All HTTP APIs use the shared response helper:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

## Endpoints

### Health

```txt
GET /health
```

Response:

```json
{
  "success": true,
  "message": "Service is healthy"
}
```

### Tracking Orders

These endpoints require the admin JWT cookie from the admin login flow.

```txt
GET    /api/orders
GET    /api/orders/histories
GET    /api/orders/:trackingNumber
POST   /api/orders
DELETE /api/orders/:trackingNumber
GET    /api/orders/:trackingNumber/histories
```

Create request:

```json
{
  "carrier": "AUTO",
  "trackingNumber": "SPXVN063015366786",
  "telegramChatId": "api",
  "note": "Optional note",
  "trackingCredential": "0987654321"
}
```

Send `trackingCredential` for GHN and J&T orders. For GHN this can be the recipient phone number or an existing `phone_verify`; for J&T it must be the phone last 4 digits.

Delete request can include the chat id as query string:

```txt
DELETE /api/orders/SPXVN063015366786?telegramChatId=api
```

### Telegram Users

The bot stores only Telegram ID, name, and username when users send messages or press inline menu buttons.

```txt
GET /api/admin/users
```

This endpoint requires the admin JWT cookie.

### Admin Auth

```txt
POST /api/admin/auth/request-otp
POST /api/admin/auth/verify-otp
GET  /api/admin/auth/me
POST /api/admin/auth/logout
```

Admins are configured with `ADMIN_TELEGRAM_ADMINS` using `telegramId:username` entries. After OTP verification, the API sets the httpOnly JWT cookie `admin_token`.

### Admin Settings

```txt
GET /api/admin/settings
PUT /api/admin/settings
```

Settings include `adminContact` and `maintenanceEnabled`. On first use, `adminContact` is initialized from `TELEGRAM_ADMIN_USERNAME`.

### Telegram

```txt
POST /telegram/webhook
```

Commands:

- `/start`
- `/help`
- `/add SPXVNxxxx`
- `/add ghn GYH9PRA6 0987654321 optional note`
- `/add jnt 862195772225 9613 optional note`
- `/list`
- `/remove SPXVNxxxx`
- `/remove GYH9PRA6`
- `/remove jnt 862195772225`
- `/carriers`
- `/contact`

The bot uses Telegram long polling by default, so local development does not need a public webhook URL.

## Scheduler

The scheduler runs every `TRACKING_CHECK_INTERVAL_MINUTES` minutes, defaults to `5`, and checks all orders with `isCompleted = false`. `SPX_CHECK_INTERVAL_MINUTES` is still accepted only as a legacy fallback for old deployments.

When the latest `tracking_code + actual_time` changes, the app updates `TrackingOrder`, inserts `TrackingHistory`, and sends a Telegram notification. Delivered, failed, and cancelled orders are marked completed and no longer tracked.

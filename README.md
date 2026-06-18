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
ADMIN_TELEGRAM_ADMINS=6142403832:naminc
ADMIN_JWT_SECRET=change-this-admin-jwt-secret
ADMIN_JWT_EXPIRES_IN_SECONDS=604800
```

## Frontend API URL

The Vite frontend calls the backend through `VITE_API_BASE_URL`; API requests must go through `frontend/src/lib/api/client.ts`.
The admin auth flow uses an httpOnly cookie, so the API helper sends `credentials: "include"` and does not store tokens in `localStorage`.

Local frontend development:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

When using the localhost API URL, open Vite at `http://localhost:5173` so browser cookies are sent consistently.

Production/Vercel:

```env
VITE_API_BASE_URL=https://api.example.com/api
```

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
  "trackingNumber": "SPXVN063015366786",
  "telegramChatId": "api"
}
```

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
- `/add SPXVNxxxx`
- `/list`
- `/remove SPXVNxxxx`
- `/contact`

The bot uses Telegram long polling by default, so local development does not need a public webhook URL.

## Scheduler

The scheduler runs every `SPX_CHECK_INTERVAL_MINUTES` minutes, defaults to `5`, and checks all orders with `isCompleted = false`.

When the latest `tracking_code + actual_time` changes, the app updates `TrackingOrder`, inserts `TrackingHistory`, and sends a Telegram notification. Delivered, failed, and cancelled orders are marked completed and no longer tracked.

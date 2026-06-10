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

```txt
GET    /api/orders
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

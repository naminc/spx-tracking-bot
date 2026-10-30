# Express Track Bot

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
![Carriers](https://img.shields.io/badge/Carriers-SPX%20%7C%20GHN%20%7C%20J%26T-5B4BDB)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/license/isc-license-txt)

Telegram bot, public tracking page, REST API, and admin dashboard for tracking shipments from SPX Express, Giao Hàng Nhanh (GHN), and J&T Express.

**Demo bot:** `@spx_track_bot`

## Supported Carriers

| Carrier | Supported tracking numbers | Tracking credential |
| --- | --- | --- |
| SPX Express | `SPXVN...` and SPX express/international codes such as `VN260473135399R` | Not required |
| Giao Hàng Nhanh (GHN) | Alphanumeric codes such as `GY8RA4EL` and `VNGH80667097209` | Recipient phone number or a 64-character `phone_verify` |
| J&T Express | Numeric codes such as `862195772225` and prefixed codes such as `JNTXB1012408892` | Last 4 digits of the recipient phone number |

Carrier `AUTO` detection is available in the admin API and public tracking page. Telegram commands use the explicit `ghn` or `jnt` prefix when a credential is required.

## Features

- Track SPX, GHN, and J&T shipments from Telegram, the public `/track` page, or the admin dashboard.
- Automatically poll active orders and notify Telegram users when a new tracking event appears.
- Store normalized tracking history across all supported carriers.
- Manage users, orders, broadcasts, action logs, and analytics from the admin dashboard.
- Record public web lookups as guest action logs without creating tracked orders or histories.

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

The public tracking API is read-only. It checks SPX, GHN, or J&T directly through the configured providers and does not create tracking orders, histories, or users. Successful lookups create a `PUBLIC_TRACK` action log with source `PUBLIC_WEB` and user `Guest`; credentials are never stored in the log.

Example requests:

```json
{
  "carrier": "AUTO",
  "trackingNumber": "SPXVN063015366786"
}
```

```json
{
  "carrier": "GHN",
  "trackingNumber": "GY8RA4EL",
  "trackingCredential": "0987654321"
}
```

```json
{
  "carrier": "JNT",
  "trackingNumber": "862195772225",
  "trackingCredential": "9613"
}
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

Create an SPX order:

```json
{
  "carrier": "AUTO",
  "trackingNumber": "SPXVN063015366786",
  "telegramChatId": "api",
  "note": "Optional note"
}
```

Create a GHN order:

```json
{
  "carrier": "GHN",
  "trackingNumber": "GY8RA4EL",
  "telegramChatId": "api",
  "trackingCredential": "0987654321",
  "note": "Optional note"
}
```

Create a J&T order:

```json
{
  "carrier": "JNT",
  "trackingNumber": "862195772225",
  "telegramChatId": "api",
  "trackingCredential": "9613",
  "note": "Optional note"
}
```

For GHN, `trackingCredential` can be the recipient phone number or an existing 64-character `phone_verify`. For J&T, it must contain exactly the last 4 phone digits. SPX does not require a credential.

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
- `/add SPXVN063015366786 optional note`
- `/add VN260473135399R optional note`
- `/add ghn GY8RA4EL 0987654321 optional note`
- `/add jnt 862195772225 9613 optional note`
- `/add JNTXB1012408892 9613 optional note`
- `/list`
- `/remove SPXVN063015366786`
- `/remove VN260473135399R`
- `/remove GY8RA4EL`
- `/remove jnt 862195772225`
- `/remove JNTXB1012408892`
- `/carriers`
- `/contact`

Notes:

- The note argument is optional for every carrier.
- GHN requires the recipient phone or `phone_verify` when adding an order.
- J&T requires the last 4 phone digits when adding an order.
- `/list` displays the carrier, latest status, locations, note, and event time for each tracked order.

The bot uses Telegram long polling by default, so local development does not need a public webhook URL.

## Scheduler

The scheduler runs every `TRACKING_CHECK_INTERVAL_MINUTES` minutes, defaults to `5`, and checks all orders with `isCompleted = false`. `SPX_CHECK_INTERVAL_MINUTES` is still accepted only as a legacy fallback for old deployments.

When a provider returns a new latest event, the app updates `TrackingOrder`, inserts `TrackingHistory`, and sends a Telegram notification. Delivered, failed, and cancelled orders are marked completed and no longer tracked. Provider failures are isolated per order so a GHN or J&T error does not stop SPX checks, and vice versa.

## Author

Created and maintained by [Ngo Dinh Nam](https://naminc.dev).

If you use or build upon this project, please consider keeping the original author attribution.

If you find this project useful, please consider giving it a [star on GitHub](https://github.com/naminc/spx-tracking-bot). Your support helps the project grow.

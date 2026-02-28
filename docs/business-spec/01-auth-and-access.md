# Auth and Access (MVP)

## System Actors

- Telegram User -> Telegram Bot (chat UI)
- Bot Server -> Goal Tracker API (HTTP)
- Website (browser) -> Goal Tracker API (HTTP)

## Authentication Modes

### Service Auth (for Bot Server)

Goal Tracker API accepts bot-originated calls only with a valid service credential:

- `Authorization: Bearer <BOT_SERVICE_TOKEN>` (recommended for MVP)
- or HMAC-signed request headers (optional alternative)

The bot sends `telegram_user_id` (and optionally `telegram_username`) in each request.
The API must trust these fields only when service auth is valid.

### User Auth (for Website)

Website uses standard user authentication:

- JWT (`access_token`, optional `refresh_token`) or cookie session
- Login strategy for MVP/follow-up: `email + password` now, Telegram Login later

## MVP Direction

- Use service auth for bot traffic.
- Keep `User` model ready now, so web auth can be added later without schema rework.

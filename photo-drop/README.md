# Photo Drop

Pay-once ($10) service: a customer signs in with Google, pays via Stripe, names a folder,
and the app creates that folder in **their own** Google Drive. They can upload from the
dashboard and share a public link so guests can upload too (replacing the single-owner
Apps Script).

## How it works
1. `/auth/google` — OAuth with scope `drive.file` (the app can only touch files/folders it creates).
   Refresh token is stored AES-256-GCM encrypted.
2. `POST /api/checkout` — Stripe Checkout, one-time `PRICE_CENTS`. Unlocked by the
   `checkout.session.completed` webhook (and confirmed on return as a fallback).
3. `POST /api/folder` — creates the named folder in the customer's Drive.
4. `POST /api/upload` (owner) and `POST /api/guest/:token` (public link, rate-limited) upload to it.

## Setup
1. **Google Cloud**: create an OAuth client (Web). Add redirect URI `${BASE_URL}/auth/google/callback`.
   Enable the Drive API. `drive.file` is a non-sensitive scope, so no heavy verification review.
2. **Stripe**: get a secret key; add a webhook to `${BASE_URL}/webhooks/stripe` for
   `checkout.session.completed` (local: `stripe listen --forward-to localhost:3000/webhooks/stripe`).
3. `cp .env.example .env`, fill it in, then `npm install && npm run dev`.

## Before production
- Swap SQLite file for a persistent volume/managed DB; serve over HTTPS (`NODE_ENV=production`).
- Add terms/privacy pages (Google requires them for the consent screen) and a refund policy.
- Consider virus scanning / size limits for guest uploads (`MAX_UPLOAD_MB`).

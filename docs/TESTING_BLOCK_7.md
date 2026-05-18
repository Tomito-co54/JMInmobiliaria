# Block 7 — Manual e2e testing

How to drive a full payment + delivery cycle on the sandbox MercadoPago environment.

## Test cards (Argentina)

MP provides fixed-result test cards. Card number, any future expiry, CVV 123.

| Card | Type | Result |
|---|---|---|
| `5031 7557 3453 0604` | Mastercard | **APRO** (approved) |
| `4509 9535 6623 3704` | Visa | **APRO** (approved) |
| `5031 7557 3453 0604` | Mastercard | **OTHE** (decline, generic) |
| `4774 4633 3811 5959` | Visa | **CONT** (pending) |
| `4774 4633 3811 5959` | Visa | **CALL** (decline, call bank) |
| `4774 4633 3811 5959` | Visa | **FUND** (decline, no funds) |

The behavior is controlled by the **cardholder name** you type, not the card number alone:

- `APRO` → approved
- `OTHE` → declined (generic)
- `CONT` → pending
- `CALL` → declined (call bank)
- `FUND` → declined (no funds)
- `SECU` → declined (security)
- `EXPI` → declined (expired)
- `FORM` → declined (form error)

Reference: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards

## Full happy-path flow (APRO)

1. **Local dev server:** `npm run dev` from the worktree.
2. **Sign in** at `/login` with a buyer account.
3. **Navigate** to any active property's public page, e.g. `/p/<id>`.
4. **Click "Servicios"** at the bottom of the CTAs section.
5. On `/p/<id>/servicios`, **click "Contratar"** on the Informe Catastral ARBA card.
6. You're redirected to MercadoPago's checkout. Use:
   - Card: `5031 7557 3453 0604`
   - **Cardholder name: `APRO`** (this is what triggers the approval)
   - CVV: `123`
   - Expiry: any future date
   - DNI: any valid number (e.g., `12345678`)
7. After payment, MP redirects you to `/pago/exito?order_id=<id>`.

## What happens server-side

- The webhook at `/api/mercadopago/webhook` fires (during local dev it WON'T fire because MP can't reach localhost — see "Webhook in local dev" below).
- The webhook fetches the payment from MP's API, verifies status=approved, finds the order by `external_reference`, marks it paid + processing.
- `fulfillServiceOrder(orderId)` runs detached:
  - Loads property + arba_lookups + user.
  - Generates the PDF via `@react-pdf/renderer`.
  - Uploads to Supabase Storage bucket `service-deliverables`.
  - Generates a 30-day signed URL.
  - Calls `markOrderDelivered(orderId, signedUrl)`.
  - Sends the delivery email via Resend.
- The order moves to `delivered` status; `/mis-servicios` shows the "Descargar PDF" button.

## Webhook in local dev

MP cannot reach `http://localhost:3000`. Two options to test the webhook locally:

### Option A — ngrok (recommended for full e2e)

```bash
# In another terminal:
ngrok http 3000
# Copy the https URL it gives you, e.g. https://abc123.ngrok.app
```

Then set `NEXT_PUBLIC_APP_URL=https://abc123.ngrok.app` in `.env.local` and
restart the dev server. The actions will generate preferences with notification
URLs pointing at the ngrok tunnel, and MP's webhooks will reach you.

### Option B — manual webhook trigger

After paying, manually fire the webhook by hitting:

```bash
# Get the payment_id from MP's checkout success page URL.
curl -X POST 'http://localhost:3000/api/mercadopago/webhook?data.id=<payment_id>&type=payment'
```

This skips signature verification (only enforced when `MERCADOPAGO_WEBHOOK_SECRET`
is set; in local dev it's typically empty).

## Verifying delivery

After a successful fulfillment:

```bash
# Query the order's status
node scripts/db-query.mjs "SELECT id, status, paid_at, delivered_at, result_file_url FROM service_orders ORDER BY created_at DESC LIMIT 5"

# Inspect the bucket
node scripts/db-query.mjs "SELECT name, metadata FROM storage.objects WHERE bucket_id='service-deliverables' ORDER BY created_at DESC LIMIT 5"
```

## Edge cases to test

- **OTHE / CALL / FUND** → redirected to `/pago/error`, no order side-effects (status stays `pending_payment` forever; user can retry from `/mis-servicios`).
- **CONT** → redirected to `/pago/pendiente`. Webhook only fires when the payment eventually resolves (test cards in `CONT` mode don't auto-resolve; just accept that pending lives there).
- **Duplicate webhooks** → MP sometimes retries. The webhook's `markOrderPaid` uses a conditional `UPDATE ... WHERE status != 'paid' AND status != 'delivered'`, returning 0 rows the second time, so fulfillment is skipped.
- **Property without ARBA data** → the PDF still generates, with placeholders in the catastral section. The polygon section shows "(sin polígono disponible)".

## Production cutover

When ready to charge real money:

1. In the MP panel, copy the **Producción** credentials (Public Key + Access Token).
2. Update Vercel env vars `MERCADOPAGO_PUBLIC_KEY` and `MERCADOPAGO_ACCESS_TOKEN`.
3. Configure the production webhook URL in MP: `https://jotaeme-beryl.vercel.app/api/mercadopago/webhook`.
4. Set the **production webhook secret** in Vercel as `MERCADOPAGO_WEBHOOK_SECRET`. Until this is set, the webhook accepts all requests — fine for the test env, NOT for prod.
5. Redeploy.
6. Run one real $0.01-style smoke test if MP allows, then disable test-mode flags.

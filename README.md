# Steam Powered Cleaning

A modern React + Vite experience for Steam Powered Cleaning. The refreshed site now features a cart-based booking flow so visitors can bundle services, reserve time, and receive automated confirmations after checkout.

## Booking Flow Highlights

- Organize services by **Indoor**, **Outdoor**, **Automotive**, and **Add-On** categories covering carpets, tile, upholstery, windows, power washing, detailing, and take-home products.
- Build a personalized cart with quantity controls, realtime pricing, and estimated on-site duration before submitting.
- Collect contact details plus a preferred visit date, time, and time zone.
- Server-side booking endpoint validates availability through Google Calendar, creates the calendar event, and emails the customer a summary (charges still occur after service completion).

## Getting Started

```bash
npm install        # install client and server dependencies (run once)
npm run dev        # start the Vite dev server (frontend)
npm run server     # start the Express API with booking + email logic
```

Visit `http://localhost:5173` for the frontend and `http://localhost:4000/api/health` to verify the API is alive.

## Environment Configuration

Copy `.env.example` to `.env` (or inject these variables another way) and provide values for:

- `VITE_SQUARE_APP_ID`, `VITE_SQUARE_LOCATION_ID`, `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID` – existing Square sandbox values if you still need them.
- `API_PORT` – defaults to `4000`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` – SMTP credentials for the automated booking email. Omit `SMTP_USER`/`SMTP_PASS` if your relay allows anonymous auth.
- `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID` – service account credentials with Calendar scope and the target calendar ID for conflict checks + bookings.

> **Tip:** If SMTP variables are not set, bookings still succeed but the API logs a warning and skips the confirmation email.

Google Calendar credentials remain required so that bookings can check for conflicts and create events—without them, the API responds with a 500 when creating bookings.

## Development Notes

- The new booking UI lives in `components/Services.tsx` and relies on the structured service catalogue in `data/services.ts`.
- API changes are in `server/index.ts`, with email handling encapsulated in `server/email.ts`.
- Install the `nodemailer` dependency locally (`npm install`) to update `node_modules` and the lock file.
- For production, run `npm run build` to generate the static assets that the Express server serves from `dist/`.

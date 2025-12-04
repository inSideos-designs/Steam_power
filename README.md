<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Steam Powered Cleaning

A modern React + Vite marketing site for Steam Powered Cleaning. The project uses Tailwind via CDN for styling and now bundles a Square Web Payments sandbox checkout demo.

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and update the Square values if needed (see "Square sandbox configuration" below).
3. Start the API server (Express): `npm run server`
4. In another terminal, start Vite: `npm run dev`

## Build for production

Run `npm run build` to output the production-ready bundle in `dist/`, then serve it with any static host that supports HTTPS (required for the Square Web Payments SDK).

## Square sandbox configuration

- `VITE_SQUARE_APP_ID` defaults to the provided sandbox application ID but can be overridden in your `.env` file.
- `VITE_SQUARE_LOCATION_ID` controls the Web Payments SDK on the frontend. Use your sandbox location ID (or production when you go live).
- `SQUARE_ACCESS_TOKEN` and `SQUARE_LOCATION_ID` are consumed by the Express server to call Square's Orders + Payments APIs. Keep the production token secret.
- `API_PORT` (optional) lets you run the Express server somewhere other than `4000`.

### API endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Simple heartbeat for monitoring |
| `GET` | `/api/services` | Returns the list of services + prices exposed to the frontend |
| `POST` | `/api/square/checkout` | Accepts `{ token, serviceId }`, creates an order, then calls Square's Payments API in the sandbox |

The site now handles tokenization **and** calls the Square Orders + Payments APIs through the Express server, so each service with a fixed price can be charged end-to-end in the sandbox.

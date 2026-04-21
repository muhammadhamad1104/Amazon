# IRFWARDROBE Deployment (Hostinger)

This project is now configured for deployment with environment variables.

## Single-Domain Monorepo (Express Serves Frontend)

Use this mode when you want one domain (`irfwardrobe.com`) for both website and API.

- Deploy the Node.js app from repo root directory `backend` (Hostinger Node.js setup).
- During backend install, frontend is built automatically from `../frontend` when available.
- Built files are copied to `backend/dist` and served from there as fallback.
- Express serves:
  - API routes from `/api/*`
  - Frontend (React build) for all non-API routes.

Required backend environment values:
- `NODE_ENV=production`
- `MONGODB_URI=<your-mongodb-uri>`
- `JWT_SECRET=<long-random-secret>`
- `CORS_ORIGINS=https://irfwardrobe.com,https://www.irfwardrobe.com`

Important notes:
- Do **not** set `VITE_API_URL` in backend environment variables.
- In `frontend/.env`, use `VITE_API_URL=/api` for single-domain mode.
- `PORT` can be omitted so Hostinger injects it automatically.

DNS for single-domain mode:
- Point `@` (and `www` via CNAME) to your active Hostinger website target.
- If `api` subdomain is not used, it can be removed.

Quick checks:
- `https://irfwardrobe.com/api/health` returns JSON status OK.
- `https://irfwardrobe.com` opens React frontend.

If root returns JSON with `Frontend build not found...`:
- Deployment likely did not include frontend source.
- Ensure the latest backend deployment has run after these changes.

## 1) Backend Deployment (Hostinger Node.js)

- Upload the `backend` folder to your Node.js app directory.
- Set startup file to `server.js`.
- Install dependencies:
  - `npm install`
- Set environment variables from `backend/.env.example`.

Required production values:
- `NODE_ENV=production`
- `PORT` (Hostinger may inject this automatically)
- `MONGODB_URI`
- `JWT_SECRET`
- `CORS_ORIGINS=https://irfwardrobe.com,https://www.irfwardrobe.com`

Image persistence note:
- Product image uploads should not be stored inside `backend/uploads` for production deployments.
- Deploy/release operations often replace app files and can remove local upload folders.
- If `UPLOADS_DIR` is not set, the backend automatically uses a persistent default folder:
  - Linux: `/home/<server-user>/irfwardrobe-uploads`
  - Windows: `C:/Users/<server-user>/irfwardrobe-uploads`
- You can still set `UPLOADS_DIR` manually if you need a custom location.

Start command:
- `npm start`

Quick health check:
- `https://<your-backend-domain>/api/health`

## 2) Frontend Deployment (Hostinger static hosting)

- In the `frontend` folder, create `.env` from `.env.example`.
- Set:
  - `VITE_API_URL=https://<your-backend-domain>/api`
- Build frontend:
  - `npm install`
  - `npm run build`
- Upload the contents of `frontend/dist` to your Hostinger public web root (`public_html`).
- Make sure hidden files are uploaded too (especially `.htaccess`) for React route refresh support.

## 3) Domain Setup

- Point your main domain to frontend hosting.
- Point backend domain/subdomain (recommended `api.irfwardrobe.com`) to Node.js backend app.
- If using Cloudflare or similar proxy, ensure SSL mode and DNS are correct.

## 4) Post-deploy Checks

- Open frontend domain and verify tab title shows `IRF WARDROBE`.
- Verify login/register/products/cart flows.
- Verify browser network calls target your backend domain (not localhost).
- Verify backend CORS allows only configured origins.

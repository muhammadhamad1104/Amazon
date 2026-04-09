# IRFWARDROBE Deployment (Hostinger)

This project is now configured for deployment with environment variables.

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

- Open frontend domain and verify tab title shows `IRFWARDROBE`.
- Verify login/register/products/cart flows.
- Verify browser network calls target your backend domain (not localhost).
- Verify backend CORS allows only configured origins.

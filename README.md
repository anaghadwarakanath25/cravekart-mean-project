# CraveKart – MEAN-style Online Food Ordering System

- `cravekart-frontend/` – **AngularJS 1.8.2** SPA (plain JavaScript, no build step), fully wired to the API
- `backend/` – Node.js + Express + MongoDB REST API, seed script and Postman collection

**Frontend only (demo mode, no backend):** `cd cravekart-frontend && npm start` → http://localhost:4200

Full stack – run in two terminals (and set `useMock: false` in `cravekart-frontend/js/config.js`):

```bash
# 1) backend (MongoDB must be running)
cd backend && npm install && cp .env.example .env   # set JWT_SECRET
npm run seed && npm run dev                         # http://localhost:5000

# 2) frontend
cd cravekart-frontend && npm start                  # http://localhost:4200
```

See `backend/README.md` (API/Postman) and `cravekart-frontend/README.md` (structure, page↔API map).

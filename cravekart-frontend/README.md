# CraveKart – Frontend (AngularJS 1.8.2)

Plain JavaScript single-page app. **No TypeScript, no Angular CLI, no build step.**
AngularJS 1.8.2 + `angular-route` are loaded by `<script>` tags in `index.html` (local copies in `vendor/`).
It talks to the Express/MongoDB API in `../backend` over HTTP + JWT.

## Run (no backend needed – demo mode is ON by default)

```bash
cd cravekart-frontend
npm start        # no npm install needed -> http://localhost:4200
```

Open `http://localhost:4200` (type it in the browser; do not double-click `index.html`).

**Demo mode** (`useMock: true` in `js/config.js`): 8 sample restaurants, 10 dishes, coupons, sample orders and the three demo accounts
all live inside the browser (localStorage). Cart, login, checkout, orders, restaurant portal and admin portal all work.
Click "Reset demo data" in the yellow banner to start over.

**Use the real backend instead:** start the backend (`../backend/README.md`), then in `js/config.js` set `useMock: false`
(and check `apiUrl`). The backend's `CLIENT_URL` must match `http://localhost:4200`. The banner disappears.

## Demo logins (demo mode, or real backend after `npm run seed`)
Customer `customer@cravekart.local` / `Customer@12345` · Restaurant `owner@cravekart.local` / `Owner@12345` · Admin `admin@cravekart.local` / `Admin@12345`.
(The login page has quick-fill buttons; delete `demoAccounts` in `js/controllers/auth.controller.js` and the `.demo-accounts` block in `views/auth.html` before deploying.)

## Structure
```
index.html                 AngularJS bootstrap (ng-app, ng-view, script tags)
js/config.js               useMock switch + API URL
js/mock/mock-server.js     in-browser fake API (demo mode)
js/mock/mock-backend.js    routes API calls to the fake API when useMock is true
js/app.js                  module, routes (#/…), route guards
js/services/core.js        TokenStore, Toast, AuthInterceptor (Bearer token + 401), Api (one method per endpoint)
js/services/auth.service.js   login/register/logout/session
js/services/catalog.service.js  API → UI model mappers, categories/restaurants/foods
js/services/cart.service.js     server cart for customers, localStorage cart for guests (merged on login)
js/services/ui.js          filters (inr, orderStatus), ck-img, food/restaurant card components
js/controllers/*.js        one controller per page
views/*.html               page templates; views/components/* card templates
css/styles.css             original design (unchanged) · css/app.css additions
```

## Pages ↔ API
| Route | Uses |
|---|---|
| `#/` | `GET /categories`, `/restaurants`, `/foods` |
| `#/restaurants` | same (filters/sort run client-side on loaded data) |
| `#/restaurants/:id` | `GET /restaurants/:id`, `/foods?restaurant=`, `/reviews/restaurant/:id` |
| `#/cart` | `GET/POST/PATCH/DELETE /cart…` (customer) · localStorage (guest) |
| `#/checkout` (customer) | `/addresses`, `POST /coupons/validate`, `POST /orders` |
| `#/login`, `#/register` | `POST /auth/login`, `/auth/register`, `GET /auth/me` |
| `#/dashboard` (customer) | `GET /orders/my-orders`, `PATCH /orders/:id/cancel`, `POST /reviews` |
| `#/restaurant-panel` (restaurant) | `/orders/restaurant-orders`, `PATCH /orders/:id/status`, `/foods` CRUD, `PATCH /restaurants/:id`, `POST /restaurants` |
| `#/admin-panel` (admin) | `/admin/dashboard`, `/orders/admin/all`, `/admin/users`, `/restaurants` + `/approval`, `/coupons`, `/categories`, `/foods` |

Login redirects by role. Routes are guarded in `js/app.js`; the API enforces roles again server-side.

## Notes / limits
- The API stores no restaurant "offer" text, food rating, or cuisine icons; the UI shows delivery fee/closed badges, the restaurant rating on dish cards, and maps category names to icons.
- `GET /restaurants` only returns approved restaurants, so the admin portal cannot list *pending* ones (it shows the pending count). Adding `GET /api/admin/restaurants` to the backend would enable an approve button.
- UPI/Card are recorded as the payment method only (the backend has no gateway).
- Cart/order totals shown before checkout are estimates; the server recalculates everything.

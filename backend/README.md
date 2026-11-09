# CraveKart Backend – Node.js + Express + MongoDB

This folder contains the backend API used by the AngularJS frontend in `../cravekart-frontend`.

## 1. What each MEAN technology does

- **MongoDB:** Stores users, restaurants, food, carts, orders, coupons and reviews.
- **Express.js:** Defines REST API routes, middleware and request/response handling.
- **AngularJS 1.8.2:** Frontend in `../cravekart-frontend`; it calls the backend using HTTP.
- **Node.js:** Runs the Express backend JavaScript application.

The backend uses **Mongoose** to define MongoDB models and query the database.

## 2. Prerequisites

- Node.js 20.19 or newer (check: `node -v`)
- npm (check: `npm -v`)
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- VS Code
- Postman (for API testing)

MongoDB Compass is recommended to view collections and documents.

## 3. Install MongoDB on Windows

1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Run the installer and select Complete.
3. Install MongoDB as a Windows Service.
4. Keep the default port `27017`.
5. Optionally install MongoDB Compass: https://www.mongodb.com/products/tools/compass
6. Open Compass and connect to `mongodb://127.0.0.1:27017`.

If the MongoDB service is not running, start the **MongoDB Server** service from Windows Services (`services.msc`). The service name may be `MongoDB`.

## 4. Configure the backend

Open a terminal in this `backend` folder:

```powershell
npm.cmd install
```

Create your environment file by copying `.env.example` to `.env`.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` and set a private JWT secret. Example local-only value:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/cravekart
JWT_SECRET=replace_this_with_a_long_random_secret_at_least_32_characters
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:4200
```

Do not commit `.env` or share its JWT secret.

## 5. Insert demo data

Make sure MongoDB is running, then run:

```powershell
npm.cmd run seed
```

The seed script clears existing CraveKart collections in the `cravekart` database and inserts demo users, one restaurant, sample food and coupons. **Do not run the seed command against data you want to keep.**

Demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | admin@cravekart.local | Admin@12345 |
| Restaurant owner | owner@cravekart.local | Owner@12345 |
| Customer | customer@cravekart.local | Customer@12345 |

These are local demonstration credentials only. Change them before any deployment.

## 6. Start the backend

```powershell
npm.cmd run dev
```

Or:

```powershell
npm.cmd start
```

Expected message:

```text
MongoDB connected: 127.0.0.1/cravekart
CraveKart API running at http://localhost:5000
```

Check the API:

- http://localhost:5000/
- http://localhost:5000/api/health

## 7. Start the AngularJS frontend separately

Open a second VS Code terminal:

```powershell
cd ..\cravekart-frontend
npm.cmd start
```

The AngularJS 1.8.2 frontend runs at `http://localhost:4200` (no `npm install` needed) and calls this API at `http://localhost:5000/api` (configured in `cravekart-frontend/js/config.js`). Log in with the demo accounts above to use the customer, restaurant and admin screens.

## 8. Postman

1. Open Postman.
2. Select Import.
3. Import `postman/CraveKart-Backend.postman_collection.json`.
4. Run `Health` first.
5. Run `Auth > Login customer`.
6. The login request saves the JWT token to the collection variable.
7. Run authenticated requests such as `Current user`, `Get cart`, and `My orders`.

For protected routes, send:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

For JSON requests, set:

```http
Content-Type: application/json
```

To use the admin endpoints, log in using the admin demo account and replace the collection token with the new token returned by that login.

## 9. API endpoint reference

Base URL: `http://localhost:5000/api`

### Health and authentication

| Method | Endpoint | Access |
|---|---|---|
| GET | `/health` | Public |
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | Logged-in user |
| PATCH | `/auth/profile` | Logged-in user |

### Restaurants

| Method | Endpoint | Access |
|---|---|---|
| GET | `/restaurants` | Public |
| GET | `/restaurants/:id` | Public |
| POST | `/restaurants` | Restaurant / Admin |
| PATCH | `/restaurants/:id` | Owner / Admin |
| PATCH | `/restaurants/:id/approval` | Admin |

### Categories

| Method | Endpoint | Access |
|---|---|---|
| GET | `/categories` | Public |
| POST | `/categories` | Admin |
| PATCH | `/categories/:id` | Admin |
| DELETE | `/categories/:id` | Admin |

### Foods

| Method | Endpoint | Access |
|---|---|---|
| GET | `/foods` | Public |
| GET | `/foods/:id` | Public |
| POST | `/foods` | Restaurant / Admin |
| PATCH | `/foods/:id` | Owner / Admin |
| DELETE | `/foods/:id` | Owner / Admin |

### Cart

| Method | Endpoint | Access |
|---|---|---|
| GET | `/cart` | Customer |
| POST | `/cart/items` | Customer |
| PATCH | `/cart/items/:itemId` | Customer |
| DELETE | `/cart/items/:itemId` | Customer |
| DELETE | `/cart` | Customer |

### Addresses

| Method | Endpoint | Access |
|---|---|---|
| GET | `/addresses` | Customer |
| POST | `/addresses` | Customer |
| PATCH | `/addresses/:id` | Customer |
| DELETE | `/addresses/:id` | Customer |

### Orders

| Method | Endpoint | Access |
|---|---|---|
| POST | `/orders` | Customer |
| GET | `/orders/my-orders` | Customer |
| GET | `/orders/restaurant-orders` | Restaurant |
| GET | `/orders/admin/all` | Admin |
| GET | `/orders/:id` | Order owner / Restaurant owner / Admin |
| PATCH | `/orders/:id/status` | Restaurant owner / Admin |
| PATCH | `/orders/:id/cancel` | Customer who placed order |

### Coupons, reviews and administration

| Method | Endpoint | Access |
|---|---|---|
| POST | `/coupons/validate` | Customer |
| GET | `/coupons` | Admin |
| POST | `/coupons` | Admin |
| GET | `/reviews/restaurant/:restaurantId` | Public |
| POST | `/reviews` | Customer with delivered order |
| GET | `/admin/dashboard` | Admin |
| GET | `/admin/users` | Admin |
| PATCH | `/admin/users/:id` | Admin |

## 10. Example request bodies

### Register

`POST /api/auth/register`

```json
{
  "name": "Ananya",
  "email": "ananya@example.com",
  "phone": "9876543210",
  "password": "StrongPass123"
}
```

Public registration always creates a customer. Restaurant/admin roles must be assigned through an authorized administrative process.

### Login

`POST /api/auth/login`

```json
{
  "email": "customer@cravekart.local",
  "password": "Customer@12345"
}
```

### Add cart item

`POST /api/cart/items`

```json
{
  "foodId": "PASTE_A_FOOD_DOCUMENT_ID",
  "quantity": 2
}
```

### Place order

`POST /api/orders`

```json
{
  "deliveryAddress": {
    "recipientName": "Demo Customer",
    "phone": "9000000003",
    "line1": "12 Demo Street",
    "landmark": "Near Park",
    "area": "Vijayanagar",
    "city": "Mysuru",
    "state": "Karnataka",
    "postalCode": "570017"
  },
  "paymentMethod": "COD",
  "couponCode": "WELCOME10",
  "notes": "Call on arrival"
}
```

The backend calculates prices from the database rather than trusting totals sent by the browser.

## 11. Security and project limitations

Included:
- Password hashing with bcrypt.
- JWT authentication.
- Role-based access control.
- Request validation for key authentication fields.
- Helmet security headers.
- CORS allow-list for the Angular origin.
- API rate limiting.
- Centralised error handling.
- Server-side cart and order price calculations.

Not yet included:
- Real payment gateway (UPI/card are not actually charged).
- Email OTP or password reset email.
- Live delivery partner tracking.
- Image upload storage (image URLs are used).
- Automated test suite.
- Production deployment configuration.

Before production, add stronger business validation, automated tests, payment-provider verification, transactional order/coupon handling, audit logs and deployment secrets management. This starter is intended for local development and learning, not direct production deployment.

## 12. Troubleshooting

**MongoDB connection refused**
- Ensure MongoDB Community Server is installed and running.
- Check `MONGODB_URI` in `.env`.
- Confirm local MongoDB is listening on port `27017`.

**Port 5000 already in use**
- Change `PORT=5001` in `.env`, then restart the backend.

**CORS error**
- Ensure `CLIENT_URL=http://localhost:4200` matches the Angular development URL.
- Restart the backend after changing `.env`.

**401 Unauthorized**
- Log in again and send the returned token as `Authorization: Bearer <token>`.

**403 Forbidden**
- Check that you logged in using the correct role for the endpoint.

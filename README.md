# Savannah HMS

A drug store management app for the shop **owner** and **attendants**.
Built with React (frontend), Node.js/Express (backend) and PostgreSQL (free cloud database on [Neon](https://neon.tech)).

## Features

| | Owner | Attendant |
|---|:---:|:---:|
| Sell: search or scan barcode, cart, cash/card/mobile money, printable receipt | ✅ | ✅ |
| See stock levels and prices | ✅ | ✅ (no cost prices) |
| Add/edit/archive products, set expiry and reorder levels | ✅ | |
| Restock, correct counts, write off expired/damaged stock | ✅ | |
| Stock log: every stock change, who made it and when | ✅ | |
| Sales history | All staff | Own sales only |
| Void a sale (stock is returned) | ✅ | |
| Dashboard: revenue, profit, top products, sales by staff and payment method | ✅ | |
| Alerts: low stock, expired, expiring within 60 days | ✅ | |
| Manage staff accounts (add, reset password, disable) | ✅ | |

Safety checks built in:
- Expired products can't be sold.
- You can't sell more than you have in stock.
- Prescription-only (Rx) items need the attendant to confirm they've seen a prescription.
- Prices always come from the database, so they can't be changed from the browser.
- Disabled staff are logged out immediately.

## Setup on your computer (Windows)

You need **Node.js 18 or newer** ([download](https://nodejs.org)) and **Git**.

### 1. Get a free database
1. Sign up at https://neon.tech and create a project.
2. Copy the **connection string**. It looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`.

### 2. Get the code and install
```bash
git clone https://github.com/Aliko2020/Savannah-HMS.git
cd Savannah-HMS
npm install
npm run install-all
```

### 3. Configure
Copy `server/.env.example` to `server/.env` and fill in:
- `DATABASE_URL`: your Neon connection string
- `JWT_SECRET`: any long random text (30+ characters)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD`: the first owner login
- `APP_TIMEZONE`: your timezone, e.g. `Africa/Nairobi`

Optionally copy `client/.env.example` to `client/.env` to set your currency symbol and shop name.

### 4. Run
```bash
npm run dev
```
Open http://localhost:5173 and log in with the admin username and password. **Change the password** under your name (top right) → My account.

The database tables are created automatically on first start.

## Put it online (free)

Deploy as one web service on [Render](https://render.com):
1. New → **Web Service** → connect this GitHub repo.
2. **Build command:** `npm run build`
3. **Start command:** `npm start`
4. Under **Environment**, add the same variables as `server/.env`, plus `VITE_CURRENCY` and `VITE_SHOP_NAME` if you want them.

Render's free tier sleeps after 15 minutes of no use, so the first page load after that takes about 30 seconds.

## Project structure
```
server/            Express API
  src/index.js     app entry, serves the built React app in production
  src/schema.sql   database tables
  src/routes/      auth, users, products, sales, reports
client/            React app (Vite)
  src/pages/       Sell, Inventory, Sales, Dashboard, Staff, Stock log, Account
```

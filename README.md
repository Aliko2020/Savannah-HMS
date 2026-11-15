# Savannah HMS

A drug store management app for the shop **owner** and **attendants**.
Built with React (frontend), Node.js/Express (backend) and SQLite (a database stored as a single file, with no account or setup needed).

## Features

| | Owner | Attendant |
|---|:---:|:---:|
| Sell: search or scan barcode, cart, Cash or Mobile Money, thermal printer receipt | ✅ | ✅ |
| See stock levels and prices | ✅ | ✅ (no cost prices) |
| Add/edit/archive products, set expiry and reorder levels | ✅ | |
| Restock, correct counts, write off expired/damaged stock | ✅ | |
| Stock log: every stock change, who made it and when | ✅ | |
| Sales history | All staff | Own sales only |
| Void a sale (stock is returned) | ✅ | |
| Dashboard: revenue, profit, top products, sales by staff and payment method | ✅ | |
| Alerts: low stock, expired, expiring within 60 days | ✅ | |
| Manage staff accounts (add, reset password, disable) | ✅ | |
| Settings: shop name, phone, address, receipt message, paper width | ✅ | |

Safety checks built in:
- Expired products can't be sold.
- You can't sell more than you have in stock.
- Prescription-only (Rx) items need the attendant to confirm they've seen a prescription.
- Prices always come from the database, so they can't be changed from the browser.
- Disabled staff are logged out immediately.

## Setup on your computer (Windows)

You need **Node.js 22.5 or newer** ([download](https://nodejs.org)) and **Git**. Nothing else: the database is built into Node.js.

```bash
git clone https://github.com/Aliko2020/Savannah-HMS.git
cd Savannah-HMS
npm run install-all
npm install
npm run dev
```

Open http://localhost:5173 and log in as **admin** / **admin123**. **Change the password** right away: click your name (top right) → My account.

The database is created automatically the first time you start the app.

Then open **Settings** (owner only) and enter your shop name, phone number and address. They appear at the top of the app and on every receipt. Prices are in Ghana cedis (GH₵).

Optional: `server/.env` (copy from `server/.env.example`) changes the first admin login, database location or port.

### Receipt printer (thermal)
1. Install your printer's Windows driver and check it prints a test page.
2. In **Settings**, choose the paper roll width: **80 mm** (most common) or **58 mm**.
3. After a sale, click **Print receipt**. In the print window:
   - Printer: your thermal printer
   - More settings → Margins: **None**, Scale: **100**, and untick **Headers and footers**
   
   Chrome and Edge remember these choices for next time.

### Using it on the shop's other devices
While the app runs on the shop PC, phones and laptops on the **same Wi-Fi** can open it at `http://<shop-PC-IP>:5173`. To find the PC's IP address, run `ipconfig` and look for "IPv4 Address". If it doesn't open, allow Node.js through Windows Firewall when asked.

### Backups
All your data is in **one file**: `server/data/savannah.db`. To back it up, stop the app and copy that file (e.g. to a USB stick or Google Drive). To restore, put the copy back in the same place.

## Project structure
```
server/            Express API
  data/            the database file (created on first run, not in git)
  src/index.js     app entry, serves the built React app in production
  src/schema.sql   database tables
  src/routes/      auth, users, products, sales, reports
client/            React app (Vite)
  src/pages/       Sell, Inventory, Sales, Dashboard, Staff, Stock log, Account
```

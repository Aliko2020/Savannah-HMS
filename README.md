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

## Starting the app (for shop staff)

Double-click the **Savannah Pharmacy** icon on the Desktop. The app opens in the browser.
- Keep the black window open while you use the app (you can minimise it).
- To close the app, close the black window. A backup is saved automatically.
- If the browser tab gets closed, double-click the icon again. It just reopens the app.

### One-time setup (Windows)
1. Install **Node.js** (LTS) from https://nodejs.org and **Git** from https://git-scm.com.
2. Download the app: open a terminal in the Desktop folder and run
   `git clone https://github.com/Aliko2020/Savannah-HMS.git`
3. Open the **Savannah-HMS** folder and double-click **Create Desktop Shortcut**.
   It also asks whether the app should start by itself when the PC is switched on.
4. Double-click the new **Savannah Pharmacy** icon. The first start takes a few minutes
   (it needs internet to finish installing). After that it starts in seconds.
5. Log in as **admin** / **admin123**, change the password, then fill in **Settings**.

### Updating
Close the app, then double-click **Update Savannah** in the Savannah-HMS folder.

### Licence key
The first time the app starts on a computer, it shows an **Activate** screen with that computer's
**Machine ID**. Tap **Send on WhatsApp** to send it to Amos Aliko (0507363607), then paste the
licence key you receive. Keys last 3 months; the app reminds you 14 days before the end date.
To renew, go to **Settings → Licence → Enter a new licence key**.

## Setup for developers

You need **Node.js 22.5 or newer** ([download](https://nodejs.org)) and **Git**. Nothing else: the database is built into Node.js.

```bash
git clone https://github.com/Aliko2020/Savannah-HMS.git
cd Savannah-HMS
npm run install-all
npm install
npm run dev
```

This runs a development version with live reload. Open http://localhost:5173 and log in as **admin** / **admin123**. **Change the password** right away: click your name (top right) → My account.

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
While the app runs on the shop PC, phones and laptops on the **same Wi-Fi** can open it too. The black window shows the address to use (e.g. `http://192.168.1.20:4000`). If it doesn't open, allow Node.js through Windows Firewall when asked.

### Backups (automatic)
The app saves a full copy of your data to a **Savannah Backups** folder on the Desktop:
- when the app starts,
- every 3 hours while it's open (if anything changed), and at least once a day,
- when you close it with **Ctrl+C**.

It keeps the newest 60 copies and deletes older ones. The owner can also click **Back up now** on the **Settings** page, which shows when the last backup was made.

For extra safety, copy the **Savannah Backups** folder to a USB stick or Google Drive now and then. If the PC dies, that copy is what saves you.

**To restore a backup:**
1. Stop the app (Ctrl+C).
2. Pick a file in `Desktop\Savannah Backups` (the name has the date and time, e.g. `savannah-2026-11-16_18-30-00.db`).
3. Copy it to `server\data\`, and rename it to `savannah.db` (replacing the old one).
4. Start the app again with `npm run dev`.

To save backups somewhere else, set `BACKUP_DIR` in `server/.env`.

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

## Licence and copyright
Copyright (c) 2026 Amos Aliko (edusavannah.com). All rights reserved. See [LICENSE](LICENSE).
Licence keys are made with the tool in [`licence-tool/`](licence-tool/README.md).

# Savannah Pharmacy Management System

A point-of-sale and stock management app for a pharmacy (drug store), built for a **shop owner** and their **attendants**.
It runs on the shop's own Windows PC and works **without internet**. Prices are in **Ghana cedis (GH₵)**, payments are **Cash** or **Mobile Money**, and receipts print on a **thermal receipt printer**.

© 2026 Amos Aliko · [edusavannah.com](https://edusavannah.com) · 0507363607. All rights reserved. See [Licence and copyright](#licence-and-copyright).

---

## Contents

1. [What it does](#what-it-does)
2. [Who can do what](#who-can-do-what)
3. [What you need](#what-you-need)
4. [Installing on a shop PC (one time)](#installing-on-a-shop-pc-one-time)
5. [Starting and stopping the app](#starting-and-stopping-the-app)
6. [Activating the licence](#activating-the-licence)
7. [First things to do after installing](#first-things-to-do-after-installing)
8. [Daily use](#daily-use)
9. [Receipt printer (thermal)](#receipt-printer-thermal)
10. [Using phones and other computers](#using-phones-and-other-computers)
11. [Backups and restoring](#backups-and-restoring)
12. [Updating to a new version](#updating-to-a-new-version)
13. [Troubleshooting](#troubleshooting)
14. [Questions and answers](#questions-and-answers)
15. [For the developer](#for-the-developer)
16. [Licence and copyright](#licence-and-copyright)

---

## What it does

**Selling**
- Search products by name, category or barcode, or scan a barcode and press **Enter**.
- Cart with quantities, **Cash** or **Mobile Money**, optional customer name.
- Receipt with the shop's name, address and phone, printed on 58 mm or 80 mm thermal paper in one click.
- Built-in safety checks:
  - Expired products **cannot be sold**.
  - You **cannot sell more than you have** in stock.
  - Prescription-only (**Rx**) items need the attendant to confirm they have seen a prescription.
  - Prices always come from the system, never from what's typed on the screen.

**Stock**
- Products with cost price, selling price, barcode, category, expiry date, reorder level and Rx flag.
- Restock, correct counts after a stock-take, and write off expired or damaged stock.
- A **stock log** records every change: sales, deliveries, corrections and write-offs, with who made it and when.

**Owner's dashboard**
- Revenue, profit and margin, number of sales and average sale, for today, 7 days or 30 days.
- Revenue by day, Cash vs Mobile Money, best sellers, and sales by staff member.
- Alerts for **low stock**, **expired** items and items **expiring within 60 days**, plus the value of the stock on hand.

**Running the shop**
- Staff accounts for the owner and attendants. Disabling an account logs that person out immediately.
- Sales history; the owner can **void** a sale (mistake or return) and the stock goes back automatically.
- **Automatic backups** to a folder on the Desktop.
- **Licence keys**, so the app only runs on computers it has been licensed for.

---

## Who can do what

| | Owner | Attendant |
|---|:---:|:---:|
| Sell and print receipts | ✅ | ✅ |
| See products, prices and stock levels | ✅ | ✅ (cost prices hidden) |
| See sales history | Everyone's | Own sales only |
| Dashboard and reports | ✅ | |
| Add, edit and archive products | ✅ | |
| Restock, correct stock, write off expired/damaged | ✅ | |
| Stock log | ✅ | |
| Void a sale | ✅ | |
| Add staff, reset passwords, disable accounts | ✅ | |
| Settings: shop details, receipt, backups, licence | ✅ | |
| Change own password | ✅ | ✅ |

---

## What you need

- A **Windows 10 or 11** PC for the shop (64-bit recommended). macOS and Linux also work for developers.
- **Node.js 22.5 or newer.** Download the **LTS** version from https://nodejs.org.
- **Git**, from https://git-scm.com, to download and update the app.
- Internet **only** for installing and updating. Daily use works offline.
- Optional: a **thermal receipt printer** (58 mm or 80 mm) and a **USB barcode scanner** (any scanner that types like a keyboard works).

---

## Installing on a shop PC (one time)

1. **Install Node.js** (LTS) from https://nodejs.org and **Git** from https://git-scm.com, accepting the default options.
2. **Download the app.** Open **Command Prompt** and run these two commands:
   ```bat
   cd %USERPROFILE%\Desktop
   git clone https://github.com/Aliko2020/Savannah-HMS.git
   ```
   This creates a **Savannah-HMS** folder on the Desktop. (In PowerShell, use `cd $HOME\Desktop` for the first command.)
3. **Make the Desktop icon.** Open the **Savannah-HMS** folder and double-click **Create Desktop Shortcut**.
   It asks whether the app should **start by itself when the PC is switched on**. Answer **Y** for the main shop PC.
4. **Start it.** Double-click the new **Savannah Pharmacy** icon on the Desktop.
   The **first start takes a few minutes and needs internet**, because it finishes installing. After that it starts in seconds.
5. **Activate the licence**: see [Activating the licence](#activating-the-licence).
6. **Log in** with username **`admin`** and password **`admin123`**, then do the [first things](#first-things-to-do-after-installing).

> If the repository is private, Windows asks you to sign in to GitHub the first time you download or update. It remembers the sign-in after that.

---

## Starting and stopping the app

- **To start:** double-click the **Savannah Pharmacy** icon on the Desktop. The app opens in the browser at **http://localhost:4000**.
- A **black window** also opens. **Keep it open** while the app is in use (you can minimise it). It shows the address other devices can use.
- **To stop:** close the black window. A backup is saved automatically.
- **Closed the browser tab by mistake?** Double-click the icon again. It reopens the app; it won't start a second copy.

---

## Activating the licence

Each computer needs its own **licence key**, which lasts **3 months**.

1. The first time the app starts on a computer, it shows the **Activate** screen with that computer's **Machine ID**, for example `7F3A-91C2-4E8B-A1B2`.
2. Tap **Send on WhatsApp** (or **Call 0507363607**) to send the Machine ID to **Amos Aliko**.
3. Paste the key you receive (it starts with `SAV1-`) and click **Activate**.

**Renewing:** the app shows a reminder **14 days before** the end date. When you get a new key, go to **Settings → Licence → Enter a new licence key** and paste it.

**If the licence runs out:** you can still log in and see all your records, stock and reports, and make backups, but **new sales are paused** until the licence is renewed.

**New PC or reinstalled Windows?** The Machine ID changes, so you need a new key. Contact Amos Aliko with the new Machine ID.

---

## First things to do after installing

1. **Change the admin password.** Click your name at the top right → **My account** → Change password.
2. **Enter your shop details.** Go to **Settings** and fill in the shop name, phone number, address and the message printed at the bottom of receipts. The receipt preview updates as you type.
3. **Choose your receipt paper width** in **Settings** (80 mm or 58 mm).
4. **Add staff.** Go to **Staff → + Add staff**. Give each attendant their own username and password, with the role **Attendant**.
5. **Add your products.** Go to **Inventory → + Add product**: name, category, barcode (optional), cost price, selling price, opening stock, reorder level, expiry date, and whether it's prescription-only.

---

## Daily use

### Making a sale (owner and attendants)
1. Open **Sell**.
2. Click a product, type to search, or **scan a barcode and press Enter**.
3. Adjust quantities with **−** and **+**.
4. Choose **Cash** or **Mobile Money**. Optionally type the customer's name.
5. For **Rx** items, tick **"I have seen a valid prescription"**.
6. Click **Complete sale**. The receipt appears:
   - **Print & close** (or press **Enter**) prints the receipt and gets you ready for the next customer.
   - **Done (no print)** closes it without printing.

### Stock (owner)
In **Inventory**, use **Stock** on a product to:
- **Restock** when a delivery arrives. You can note the supplier invoice number.
- **Correct a count** after a stock-take.
- **Remove expired** or **damaged** stock.

Use **Edit** to change prices, expiry dates and other details. A product you no longer sell can be **archived**, which hides it without losing its sales history. Every stock change appears in the **Stock log**.

### Sales history and voiding
- **Sales** lists sales for any date range; click a sale to see or reprint its receipt.
- Attendants see **their own** sales; the owner sees everyone's.
- The owner can **Void sale** (with a reason) for a mistake or a return. The stock is put back and the sale is left out of reports.

### Dashboard (owner)
Choose **Today**, **7 days** or **30 days**. Hover over or tap a bar to see that day's total. Check **Needs attention** daily for low stock and expiring items.

---

## Receipt printer (thermal)

1. Install the printer's **Windows driver** and check that it prints a Windows test page.
2. In **Settings**, choose the paper width: **80 mm** (most common) or **58 mm**.
3. Make a sale and click **Print & close**. The first time, set these in the print window:
   - **Destination / Printer:** your thermal printer
   - **More settings → Margins:** None
   - **Scale:** 100
   - **Headers and footers:** unticked

   Chrome and Edge remember these choices.

If the receipt is cut off or very small, check the paper width in Settings and the Margins/Scale above.

---

## Using phones and other computers

While the app runs on the shop PC, **phones, tablets and laptops on the same Wi-Fi** can use it in their browser. The black window shows the address to type, for example:

```
On other devices (same Wi-Fi):  http://192.168.1.20:4000
```

- The shop PC must be **switched on**, with the app running.
- The first time, Windows may ask whether to allow **Node.js** through the firewall. Click **Allow** for **private** networks.
- All devices share the same data, and each person logs in with their own account.

---

## Backups and restoring

### Automatic backups
The app saves a full copy of all your data to a **Savannah Backups** folder on the Desktop:
- when the app **starts**;
- **every 3 hours** while it's open (if anything changed), and at least **once a day**;
- when the app is **closed**.

It keeps the **newest 60** copies and deletes older ones. Each file is named with its date and time, for example `savannah-2026-11-16_18-30-00.db`.

In **Settings → Backups** the owner can see when the last backup was made, and can click **Back up now** at any time.

> **Important:** these backups are on the same PC. They protect against mistakes and damaged files, but **not** against the PC being stolen or the hard drive failing. Every week or so, **copy the Savannah Backups folder to a USB stick or Google Drive.**

### Restoring a backup
1. **Close the app** (close the black window).
2. Open **Savannah-HMS → server → data**. Make a new folder there called **old**, and move these files into it: **savannah.db**, plus **savannah.db-wal** and **savannah.db-shm** if you see them.
   > Move all three. Leaving an old `-wal` or `-shm` file behind can damage the restored data.
3. Open **Desktop → Savannah Backups** and copy the backup you want (the name shows the date and time) into **server → data**.
4. Rename the copied file to **savannah.db**.
5. Start the app again from the Desktop icon, and check that your products and sales are there.

---

## Updating to a new version

1. **Close the app** (close the black window).
2. Open the **Savannah-HMS** folder and double-click **Update Savannah**.
3. Wait for **"Update complete"**, then start the app as usual.

Your data, settings, backups and licence are kept when you update.

---

## Troubleshooting

| Problem | What to do |
|---|---|
| **"Node.js is not installed"** when starting | Install the **LTS** version from https://nodejs.org, then start again. |
| **First start says "Setup failed"** | It needs internet the first time. Connect and try again. |
| **Browser says "This site can't be reached"** | The app isn't running. Double-click the Desktop icon and keep the black window open. |
| **"The app is already running"** | It's already open. Go to http://localhost:4000 in the browser. |
| **Activate screen appears again** | The key is for another computer, or Windows was reinstalled. Send the Machine ID shown on screen to Amos Aliko for a new key. |
| **"New sales are paused"** | The licence has expired. Contact Amos Aliko (0507363607) and enter the new key in **Settings → Licence**. |
| **Receipt prints cut off or tiny** | Check the paper width in **Settings**, and set Margins **None** and Scale **100** in the print window. |
| **Another device can't open the app** | Use the address shown in the black window, make sure both are on the same Wi-Fi, and allow Node.js through Windows Firewall. |
| **Forgot an attendant's password** | Owner: **Staff → Edit →** type a new password. |
| **Forgot the owner (admin) password** | Another owner account can set a new one in **Staff**. If there's no other owner, contact Amos Aliko. Tip: create a second owner account as a spare. |
| **"Update could not be downloaded"** | Check the internet connection. If the repository is private, sign in to GitHub when asked. |

---

## Questions and answers

**Does it need internet?** Only to install, update, and send your Machine ID for a licence. Selling, stock and reports all work offline.

**Where is my data?** In one file on the shop PC: `Savannah-HMS\server\data\savannah.db`. Backups are in `Desktop\Savannah Backups`.

**Can I use it in more than one shop?** Each shop runs its own copy on its own PC, with its own licence key. The shops don't share data.

**What if the power goes off?** The data is saved after every sale, so completed sales are safe. A **UPS** (battery backup) for the shop PC is strongly recommended.

**Can attendants see my profit?** No. Cost prices, profit, the dashboard and reports are visible to the owner only.

---

## For the developer

### Technology
- **Frontend:** React 18 + Vite (`client/`)
- **Backend:** Node.js + Express 5 (`server/`)
- **Database:** SQLite through Node's built-in `node:sqlite`, a single file with no database server to install
- **Auth:** username/password (bcrypt) with JSON Web Tokens that last 12 hours
- **Licensing:** Ed25519 signatures (`node:crypto`)

### Running in development
```bash
git clone https://github.com/Aliko2020/Savannah-HMS.git
cd Savannah-HMS
npm install
npm run install-all
npm run dev
```
Open **http://localhost:5173** for the development version with live reload. The API runs on port 4000.

### Scripts (in the project root)
| Command | What it does |
|---|---|
| `npm run install-all` | Installs server and client packages |
| `npm run dev` | Development: API (watch mode) + Vite dev server |
| `npm run build` | Installs packages and builds the React app into `client/dist` |
| `npm start` | Production: one server on port 4000 that also serves the built app |

The Windows launchers (`Start Savannah.bat`, `Update Savannah.bat`) run `npm run build` when needed and then start the production server.

### Configuration (`server/.env`, optional)
Copy `server/.env.example` to `server/.env` to change any of these:

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `4000` | Port the app listens on |
| `DB_FILE` | `data/savannah.db` | Database file, relative to `server/` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / `admin123` | First owner account, created only when the database is empty |
| `JWT_SECRET` | auto-generated | Login signing secret; if unset, one is generated and kept in `data/.jwt-secret` |
| `BACKUP_DIR` | `Desktop\Savannah Backups` | Where backups are saved (also finds a OneDrive Desktop) |
| `BACKUP_KEEP` | `60` | How many backups to keep |
| `BACKUP_DISABLED` | unset | Set to `1` to turn automatic backups off |

Shop details (name, phone, address, receipt message, currency, paper width) are set in the app under **Settings**, not in `.env`.

### Project structure
```
Start Savannah.bat           double-click launcher (Windows)
Update Savannah.bat          pulls the latest version and rebuilds
Create Desktop Shortcut.bat  Desktop icon + optional start with Windows
windows/                     shortcut script and app icon
licence-tool/                licence key maker (owner only; see its README)
server/
  data/                      database, login secret, licence key (created on first run, not in git)
  src/index.js               app entry: API, licence guard, serves client/dist
  src/db.js                  SQLite connection and helpers
  src/schema.sql             database tables
  src/auth.js                login tokens and role checks
  src/backup.js              automatic backups
  src/licence.js             machine ID and licence key checks
  src/licence-public-key.js  public key for checking licences (null = licensing off)
  src/routes/                auth, users, products, sales, reports, settings, backups, licence
client/
  src/pages/                 Sell, Inventory, Sales, Dashboard, Staff, Stock log,
                             Settings, Account, Login, Activate, Receipt
  src/*Context.jsx           login, shop settings and licence state
```

### API overview
All endpoints are under `/api`. Owner-only endpoints are marked **(owner)**.

| Endpoint | Purpose |
|---|---|
| `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password` | Login and own account |
| `GET/POST/PUT /users` **(owner)** | Staff accounts |
| `GET /products`, `GET /products/categories` | Product list and search (cost price owner-only) |
| `POST/PUT /products`, `POST /products/:id/stock`, `GET /products/movements` **(owner)** | Products, stock changes, stock log |
| `POST /sales`, `GET /sales`, `GET /sales/:id` | Record and view sales |
| `POST /sales/:id/void` **(owner)** | Void a sale and return stock |
| `GET /reports/summary`, `GET /reports/alerts` **(owner)** | Dashboard figures and alerts |
| `GET /settings`, `PUT /settings` **(owner)** | Shop details |
| `GET/POST /backups` **(owner)** | List backups / back up now |
| `GET/POST /licence` | Licence status / activate a key |

### How licensing works
- Each PC has a **Machine ID**: a hash of Windows' `MachineGuid` (`/etc/machine-id` on Linux, the platform UUID on macOS).
- A key is `SAV1-<details>.<signature>`. The details hold the shop name, Machine ID and end date, signed with the owner's **private** key. The app contains only the **public** key, so it can check keys but not create them.
- The key is stored in `server/data/licence.key`. The latest date the app has seen is stored too, so winding the clock back doesn't extend a licence.
- **Not activated:** the API refuses everything except the licence and settings endpoints. **Expired:** only `POST /sales` is refused.
- While `server/src/licence-public-key.js` exports `null`, licensing is **off**. The owner turns it on by running the licence tool's setup; see [`licence-tool/README.md`](licence-tool/README.md).

### Security notes
- Keep the GitHub repository **private**.
- Never commit `server/data/`, `.env` files or any `.pem` file; `.gitignore` already excludes them.
- The licence **private key** lives only in the owner's user folder (`~/.savannah-licence/`), with a backup copy on a USB stick.
- The app is designed for a trusted shop network. Don't expose port 4000 to the internet.

---

## Licence and copyright

Copyright © 2026 **Amos Aliko** ([edusavannah.com](https://edusavannah.com)). **All rights reserved.**

This software is not open source. You may not copy, modify, distribute, sell, rent or publish it without written permission from the owner. A licensed shop may use it only on the computers it holds a valid licence key for, and only for the period of that licence. See [LICENSE](LICENSE) for the full terms.

**Contact:** Amos Aliko · 0507363607 · [edusavannah.com](https://edusavannah.com)

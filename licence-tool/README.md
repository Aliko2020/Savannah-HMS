# Licence keys: for Amos Aliko only

This folder makes the licence keys that unlock Savannah Pharmacy on a shop's computer.
Each key works on **one computer** and lasts **3 months** (you can choose another length).

## Once, on your own computer: create your signing keys

1. Double-click **`Setup (run once).bat`**.
2. It creates your **private key** at `C:\Users\<you>\.savannah-licence\private-key.pem`.
   - **Copy that file to a USB stick** and keep it somewhere safe.
   - Never send it to anyone or put it in the project folder. Whoever has it can make keys.
   - If you lose it, you can't make keys that work with the current version of the app.
3. It also puts your **public key** into the app (`server/src/licence-public-key.js`).
   Upload that change so every copy of the app gets it:
   ```
   git add server/src/licence-public-key.js
   git commit -m "Add licence public key"
   git push
   ```
4. From now on, **every computer needs a key**, including yours. Make one for yourself below.

Never run the setup a second time: it would make every key you've issued stop working.
(The tool refuses if a private key already exists.)

## Each time a shop needs a key (new shop or renewal)

1. The shop sends you their **Machine ID** (it's on their activation screen, or Settings → Licence),
   usually by the WhatsApp button in the app.
2. Double-click **`Make Licence Key.bat`** and answer:
   - Shop name
   - Machine ID, e.g. `7F3A-91C2-4E8B-A1B2`
   - Months (press Enter for 3)
3. The key is **copied automatically**. Paste it into WhatsApp/SMS for the shop.
4. The shop pastes it into the app (activation screen, or Settings → Licence → Enter a new licence key).

Every key you issue is recorded in `C:\Users\<you>\.savannah-licence\issued-keys.csv`
(open it with Excel), so you can see who has paid until when.

## Good to know

- **Shop gets a new PC, or reinstalls Windows:** the Machine ID changes. Make them a new key.
- **Renewing early is fine:** the new key replaces the old one straight away.
- **What happens when a key runs out:** 14 days before, the app shows a reminder. After the end date
  the shop can still log in and see all their records, but **new sales are paused** until they renew.
- **Winding the PC clock back doesn't help them:** the app remembers the latest date it has seen.
- **Copying the app to another PC doesn't work:** the key only matches the original computer.
- **Limits:** someone with programming skills could edit the app's code to remove the check.
  Keep a signed agreement with each shop, and keep the GitHub repository private.

Advanced: `node make-licence.mjs "Shop name" 7F3A-91C2-4E8B-A1B2 3` makes a key without the questions.

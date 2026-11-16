import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import productRoutes from './routes/products.js';
import saleRoutes from './routes/sales.js';
import reportRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import backupRoutes from './routes/backups.js';
import { startAutoBackup } from './backup.js';

const app = express();
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// In production, serve the built React app from the same server.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const port = Number(process.env.PORT) || 4000;
initDb();
startAutoBackup();
const server = app.listen(port, () => {
  console.log(`Savannah HMS API running on http://localhost:${port}`);
  if (fs.existsSync(clientDist)) {
    // Addresses other phones/computers on the same Wi-Fi can use.
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .filter((a) => a && a.family === 'IPv4' && !a.internal)
      .map((a) => `http://${a.address}:${port}`);
    console.log('');
    console.log('  Open the app on this computer:  http://localhost:' + port);
    if (lan.length) console.log('  On other devices (same Wi-Fi):  ' + lan.join('   '));
    console.log('');
  }
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nThe app is already running (port ${port} is in use). Open http://localhost:${port} in your browser.\n`);
    process.exit(1);
  }
  throw err;
});

import { Router } from 'express';
import { requireAuth, requireAdmin } from '../auth.js';
import { backupDir, backupNow, listBackups } from '../backup.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/', (_req, res) => {
  res.json({ folder: backupDir, backups: listBackups() });
});

router.post('/', (_req, res) => {
  const backup = backupNow('manual');
  res.status(201).json({ folder: backupDir, backup, backups: listBackups() });
});

export default router;

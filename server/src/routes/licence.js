import { Router } from 'express';
import { activate, licenceStatus } from '../licence.js';
import { HttpError } from '../auth.js';

const router = Router();

// Public: the activation screen is shown before anyone logs in.
// Nothing here is secret - the machine ID only identifies this PC.
router.get('/', (_req, res) => res.json(licenceStatus()));

router.post('/', (req, res) => {
  const result = activate(req.body?.key);
  if (!result.ok) throw new HttpError(400, result.error);
  res.json(result.status);
});

export default router;

import type { Request, Response } from 'express';
import { listPlatforms } from '../services/platformService.js';
import { asyncH } from '../utils/asyncH.js';

export const list = asyncH(async (_req: Request, res: Response) => {
  const platforms = await listPlatforms();
  res.json({ success: true, data: platforms });
});

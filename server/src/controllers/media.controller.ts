import type { Request, Response } from 'express';
import { z } from 'zod';
import { analyzeUrl } from '../services/analyzeService.js';
import { asyncH } from '../utils/asyncH.js';

const AnalyzeSchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

export const analyze = asyncH(async (req: Request, res: Response) => {
  const { url } = AnalyzeSchema.parse(req.body);
  const record = await analyzeUrl(url);
  const { info } = record;
  res.json({
    success: true,
    data: {
      id: record.id,
      platform: info.platform,
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail,
      uploader: info.uploader,
      webpageUrl: info.webpageUrl,
      formats: info.formats,
    },
  });
});

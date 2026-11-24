import type { Request, Response } from 'express';
import { z } from 'zod';
import { analyzeUrl } from '../services/analyzeService.js';
import { cancelAnalysisTask, getAnalysisTask, startAnalysisTask } from '../services/analysisTasks.js';
import type { AnalysisRecord } from '../types/index.js';
import { asyncH } from '../utils/asyncH.js';
import { backgroundTracker } from '../utils/background.js';

const AnalyzeSchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

function publicAnalysis(record: AnalysisRecord) {
  const { info } = record;
  return {
    id: record.id,
    platform: info.platform,
    title: info.title,
    duration: info.duration,
    thumbnail: info.thumbnail,
    uploader: info.uploader,
    webpageUrl: info.webpageUrl,
    formats: info.formats,
  };
}

// Keep the original synchronous endpoint for existing API clients.
export const analyze = asyncH(async (req: Request, res: Response) => {
  const { url } = AnalyzeSchema.parse(req.body);
  res.json({ success: true, data: publicAnalysis(await analyzeUrl(url)) });
});

// Some hosts require response headers within 20 seconds. Start the probe and
// return immediately; the browser polls for its result or cancels it.
export const startAnalysis = asyncH(async (req: Request, res: Response) => {
  const { url } = AnalyzeSchema.parse(req.body);
  const { taskId, completion } = startAnalysisTask(url);
  backgroundTracker(req)?.(completion);
  res.status(202).json({ success: true, data: { taskId } });
});

export const analysisStatus = asyncH(async (req: Request, res: Response) => {
  const task = getAnalysisTask(req.params.taskId);
  if (task.status === 'failed') throw task.error;
  res.json({
    success: true,
    data: task.status === 'ready'
      ? { status: 'ready', result: publicAnalysis(task.record) }
      : { status: 'pending' },
  });
});

export const cancelAnalysis = asyncH(async (req: Request, res: Response) => {
  cancelAnalysisTask(req.params.taskId);
  res.json({ success: true });
});

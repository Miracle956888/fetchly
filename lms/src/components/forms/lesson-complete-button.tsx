"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { api, errorMessage } from "./client-api";

/**
 * Lesson completion control. Persists through POST /api/progress
 * (server validates enrollment + ownership) and reflects the result.
 */
export function LessonCompleteButton({
  lessonId,
  completed,
  courseTitle,
  onCompleted,
}: {
  lessonId: string;
  completed: boolean;
  courseTitle: string;
  onCompleted?: (percent: number) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(completed);

  async function markComplete() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ percent: number }>("/api/progress", {
        method: "POST",
        body: { lessonId, completed: true },
      });
      setDone(true);
      onCompleted?.(res.percent);
    } catch (err) {
      setError(errorMessage(err, "Could not save your progress."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {done ? (
        <span className="inline-flex items-center gap-2 rounded-btn bg-success-50 px-4 py-2.5 text-sm font-medium text-success-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Lesson completed
        </span>
      ) : (
        <Button onClick={markComplete} loading={loading}>
          Mark as completed
        </Button>
      )}
      {error && (
        <Alert variant="danger">
          {error} <span className="opacity-70">({courseTitle})</span>
        </Alert>
      )}
    </div>
  );
}

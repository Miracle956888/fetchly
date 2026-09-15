"use client";

import * as React from "react";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { api, errorMessage } from "./client-api";

/**
 * Enroll CTA for the public course page.
 * - signed out → links to /register (preserving intent via `next`)
 * - signed in, not enrolled → POST /api/enrollments
 * - already enrolled → "Continue learning" link
 */
export function EnrollButton({
  courseId,
  enrolled,
  nextHref,
}: {
  courseId: string;
  enrolled: boolean;
  nextHref: string;
}) {
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);

  if (enrolled || state === "done") {
    return (
      <Button href={nextHref} size="lg" variant="secondary">
        {enrolled ? "Continue learning" : "Go to my courses"}
      </Button>
    );
  }

  async function handleEnroll() {
    setState("loading");
    setError(null);
    try {
      await api("/api/enrollments", { method: "POST", body: { courseId } });
      setState("done");
    } catch (err) {
      setError(errorMessage(err, "Could not enroll you in this course."));
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={handleEnroll} loading={state === "loading"} size="lg" className="w-full sm:w-auto">
        Enroll in this course
      </Button>
      {state === "error" && error && (
        <Alert variant="danger" className="w-full">
          {error}
        </Alert>
      )}
    </div>
  );
}

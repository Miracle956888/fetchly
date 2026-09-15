"use client";

/**
 * Learning Assistant — floating entry point + chat panel.
 *
 * Subtle by design: the lesson stays the primary experience. The FAB sits in
 * the corner; the panel is a compact chat on desktop and a bottom sheet on
 * mobile. All context (course/lesson) is passed as serializable props from
 * the server page; the API re-checks enrollment server-side.
 */
import * as React from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { Alert } from "../ui/alert";
import { clsx } from "@/lib/clsx";
import { api, errorMessage } from "../forms/client-api";
import { renderLessonMarkdown } from "@/lib/markdown";

interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

interface AssistantPanelProps {
  courseId: string;
  lessonId: string;
  courseTitle: string;
  lessonTitle: string;
}

export function AssistantPanel({ courseId, lessonId, courseTitle, lessonTitle }: AssistantPanelProps) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  const panelRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const suggestionsLoaded = React.useRef(false);

  // Focus the input when the panel opens; scroll to the newest message on update.
  React.useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  // Escape closes the panel (keyboard a11y).
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function ensureSuggestions() {
    if (suggestionsLoaded.current) return;
    suggestionsLoaded.current = true;
    try {
      const res = await api<{ suggestions: string[] }>(
        `/api/ai/suggestions?courseId=${courseId}&lessonId=${lessonId}`,
      );
      setSuggestions(res.suggestions.slice(0, 4));
    } catch {
      // Suggestions are a nice-to-have — never block the assistant on them.
      setSuggestions([]);
    }
  }

  React.useEffect(() => {
    if (open) void ensureSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setSending(true);
    try {
      const res = await api<{
        conversationId: string;
        reply: string;
        suggestedFollowups: string[];
      }>("/api/ai/assistant", {
        method: "POST",
        body: { message, courseId, lessonId, conversationId: conversationId ?? undefined },
      });
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      if (res.suggestedFollowups?.length) setSuggestions(res.suggestedFollowups.slice(0, 4));
    } catch (err) {
      setError(errorMessage(err, "The Learning Assistant could not be reached. Please try again."));
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void send(input);
  }

  const contextLine = `${courseTitle} · ${lessonTitle}`;

  return (
    <>
      {/* Floating action button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open your Learning Assistant"
          className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2.5 rounded-full border border-brand-200 bg-brand-600 pl-4 pr-5 text-[13.5px] font-medium text-white shadow-pop transition-colors hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <Sparkles className="h-4.5 w-4.5" aria-hidden />
          <span className="hidden sm:inline">Ask your Learning Assistant</span>
        </button>
      )}

      {/* Panel: bottom sheet on mobile, compact card on desktop */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={`Learning Assistant — ${contextLine}`}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-card border-t border-ink-200/80 bg-surface shadow-pop sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[min(620px,calc(100vh-6rem))] sm:w-[420px] sm:rounded-card sm:border"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink-900">
                <Sparkles className="h-4 w-4 text-brand-600" aria-hidden />
                Learning Assistant
              </p>
              <p className="mt-0.5 truncate text-[12px] text-ink-500">{contextLine}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Learning Assistant"
              className="rounded-btn p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              <X className="h-4.5 w-4.5" aria-hidden />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && !sending && (
              <div className="space-y-3">
                <p className="text-[13px] leading-6 text-ink-600">
                  I&apos;m here to help you understand <span className="font-medium text-ink-800">{lessonTitle}</span>.
                  Ask me to explain a concept, show an example, set a practice question, or help with code.
                </p>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] rounded-card rounded-br-sm bg-brand-50 px-3.5 py-2.5 text-[13.5px] leading-6 text-ink-900 ring-1 ring-inset ring-brand-100">
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="lesson-content max-w-[92%] rounded-card rounded-bl-sm border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-[13.5px] leading-6 text-ink-800 [&_pre]:max-h-60 [&_pre]:overflow-x-auto">
                    <AssistantMarkdown content={m.content} />
                  </div>
                </div>
              ),
            )}
            {sending && (
              <div className="flex items-center gap-2 px-1 text-[13px] text-ink-500" role="status">
                <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                Thinking…
              </div>
            )}
            {error && (
              <Alert variant="danger" title="Assistant unavailable">
                {error}
              </Alert>
            )}
          </div>

          {/* Suggested questions */}
          {suggestions.length > 0 && (
            <div className="flex gap-2 overflow-x-auto border-t border-ink-100 px-4 py-2.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={sending}
                  onClick={() => void send(s)}
                  className="shrink-0 whitespace-nowrap rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={onSubmit} className="border-t border-ink-100 p-3">
            <div className="flex items-end gap-2">
              <label htmlFor="assistant-input" className="sr-only">
                Ask your Learning Assistant a question
              </label>
              <textarea
                id="assistant-input"
                ref={inputRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Ask about this lesson…"
                maxLength={1500}
                className="min-h-[42px] flex-1 resize-none rounded-btn border border-ink-200 bg-surface px-3 py-2.5 text-[13.5px] leading-5 text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="submit"
                disabled={sending || input.trim().length < 3}
                aria-label="Send question"
                className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-btn bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {sending ? <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden /> : <Send className="h-4.5 w-4.5" aria-hidden />}
              </button>
            </div>
            <p className={clsx("mt-1.5 px-1 text-[11px] text-ink-400", "hidden sm:block")}>
              Your assistant stays in this lesson. Enter to send · Shift+Enter for a new line.
            </p>
          </form>
        </div>
      )}
    </>
  );
}

/** Assistant replies are rendered by the same constrained, HTML-escaping
 *  markdown renderer used for lesson content (safe by construction). */
function AssistantMarkdown({ content }: { content: string }) {
  return <div dangerouslySetInnerHTML={{ __html: renderLessonMarkdown(content) }} />;
}

import { renderLessonMarkdown } from "@/lib/markdown";

/**
 * Server-rendered lesson markdown. Content is authored by instructors/admins
 * (trusted) and rendered by the constrained, HTML-escaping renderer in
 * lib/markdown.ts — raw HTML in content cannot execute.
 */
export function LessonContent({ content }: { content: string }) {
  const html = renderLessonMarkdown(content);
  return <div className="lesson-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Read-only starter code block for the (future) interactive practice panel. */
export function StarterCode({ code, language }: { code: string; language: string }) {
  return (
    <div className="overflow-hidden rounded-card border border-ink-200/80 shadow-card">
      <div className="flex items-center justify-between border-b border-ink-800 bg-ink-900 px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-300">{language}</span>
      </div>
      <pre className="overflow-x-auto bg-code-bg p-4 font-mono text-[13px] leading-6 text-code-text">
        <code>{code}</code>
      </pre>
    </div>
  );
}

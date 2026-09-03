import { CircleCheck, CircleAlert, ClipboardPaste, Link2, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import type { AnalyzePhase } from '../hooks/useAutoAnalyze';
import { looksLikeUrl } from '../utils/url';

interface UrlInputProps {
  value: string;
  onChange: (value: string, opts?: { immediate?: boolean }) => void;
  onSubmit: () => void;
  phase: AnalyzePhase;
  error: string | null;
  platform: string | null;
  autoFocus?: boolean;
  placeholder?: string;
}

/**
 * The single entry point of the product. No Analyze button: a valid pasted
 * or typed URL is analyzed automatically (debounced), with live status copy.
 */
export function UrlInput({
  value,
  onChange,
  onSubmit,
  phase,
  error,
  platform,
  autoFocus,
  placeholder,
}: UrlInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [clipboardNote, setClipboardNote] = useState<string | null>(null);

  const handleClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (looksLikeUrl(trimmed)) {
        setClipboardNote('URL pasted');
        onChange(trimmed, { immediate: true }); // instant — no second action
      } else {
        setClipboardNote('Clipboard does not contain a valid link');
      }
    } catch {
      setClipboardNote('Clipboard unavailable — press Ctrl+V / ⌘V to paste');
      inputRef.current?.focus();
    }
    setTimeout(() => setClipboardNote(null), 2600);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (text && looksLikeUrl(text.trim())) {
      onChange(text.trim(), { immediate: true });
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const showError = phase === 'error' && !!error;
  const busy = phase === 'debouncing' || phase === 'analyzing';

  const statusText = clipboardNote
    ? clipboardNote
    : showError
      ? error
      : phase === 'debouncing'
        ? 'Checking link…'
        : phase === 'analyzing'
          ? platform
            ? `Analyzing ${platform} video…`
            : 'Analyzing your link…'
          : phase === 'ready'
            ? 'Ready — choose your format below'
            : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <label htmlFor="url-input" className="sr-only">
        Video URL
      </label>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`flex items-center gap-1.5 rounded-2xl border bg-card p-2 pl-4 shadow-[var(--shadow-card)] transition-colors ${
          showError ? 'border-danger/60' : busy ? 'border-primary/60' : 'border-line focus-within:border-primary'
        }`}
      >
        <Link2
          className={`size-5 shrink-0 ${busy ? 'text-primary' : 'text-ink-soft'}`}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="url-input"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder={placeholder ?? 'Paste a video URL…'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={showError}
          aria-describedby="url-status"
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-soft/70 focus:outline-none"
        />
        {busy && <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />}
        <button
          type="button"
          onClick={handleClipboard}
          aria-label="Paste from clipboard"
          title="Paste from clipboard"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-ink transition-colors hover:bg-primary-dark"
        >
          <ClipboardPaste className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div id="url-status" aria-live="polite" className="mt-2 min-h-5 px-1 text-sm">
        {statusText && (
          <p
            className={`inline-flex items-center gap-1.5 font-medium ${
              showError
                ? 'text-danger'
                : phase === 'ready'
                  ? 'text-success'
                  : busy
                    ? 'text-ink-soft'
                    : 'text-ink-soft'
            }`}
          >
            {phase === 'ready' && !clipboardNote && <CircleCheck className="size-4" aria-hidden="true" />}
            {showError && <CircleAlert className="size-4" aria-hidden="true" />}
            {statusText}
          </p>
        )}
      </div>
    </form>
  );
}

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Theme = "emerald" | "zinc";

type Props = {
  onSend?: (text: string) => Promise<void> | void;
  theme?: Theme; // "emerald" (green) or "zinc" (gray)
  right?: number; // px from right
  bottom?: number; // px from bottom
  title?: string;
  placeholder?: string;
};

const COLORS = {
  emerald: { accent: "#21c872", dark: "#14532d" },
  zinc: { accent: "#555555", dark: "#27272a" },
};

export default function FloatingChat({
  onSend,
  theme = "emerald",
  right = 24,
  bottom = 24,
  title = "Quick Chat",
  placeholder = "Type your message…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // portal mount
  const [portalEl] = useState<HTMLDivElement>(() => {
    const el = document.createElement("div");
    el.id = "floating-chat-portal";
    return el;
  });

  useEffect(() => {
    document.body.appendChild(portalEl);
    return () => portalEl.remove();
  }, [portalEl]);

  useEffect(() => {
    if (!open) return;
    // focus textarea
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    // lock scroll
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      clearTimeout(id);
      html.style.overflow = prev;
    };
  }, [open]);

  const submit = async () => {
    const value = text.trim();
    if (!value || sending) return;
    try {
      setSending(true);
      await (onSend ? onSend(value) : Promise.resolve());
      setText("");
      setOpen(false);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const { accent, dark } = COLORS[theme];

  return (
    <>
      {/* FLOATING DOT */}
      <button
        aria-label="Open chat"
        onClick={() => setOpen(true)}
        className="fixed grid place-items-center rounded-full shadow-xl text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none"
        style={{
          right,
          bottom,
          width: 56,
          height: 56,
          backgroundColor: accent,
          zIndex: 1000,
        }}
      >
        {/* simple bubble icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <path d="M4 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9l-4 4V5z" />
        </svg>
      </button>

      {/* OVERLAY + PANEL (PORTAL) */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/40 grid place-items-end p-5"
            style={{ zIndex: 999 }}
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className="w-[360px] max-w-[calc(100vw-32px)] rounded-xl shadow-2xl overflow-hidden animate-[fc-pop_.12s_ease-out_both] bg-white text-zinc-900"
            >
              {/* HEADER */}
              <div
                className="px-4 py-3 flex items-center justify-between text-white"
                style={{ backgroundColor: dark }}
              >
                <span className="font-semibold text-sm tracking-wide">{title}</span>
                <button
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="text-xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* BODY */}
              <div className="px-4 pt-3">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={4}
                  placeholder={placeholder}
                  className="w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-300"
                />
              </div>

              {/* FOOTER */}
              <div className="px-4 py-3 flex gap-2 justify-end">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 bg-zinc-100 text-zinc-900"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={sending || !text.trim()}
                  className="rounded-lg px-3 py-2 text-white disabled:opacity-60"
                  style={{ backgroundColor: accent }}
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>

            {/* tiny keyframes for pop */}
            <style>
              {`@keyframes fc-pop{from{transform:translateY(6px) scale(.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}`}
            </style>
          </div>,
          portalEl
        )}
    </>
  );
}

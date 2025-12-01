import { useEffect, useRef, useState, useContext } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import SpotifySearchContext from "../../context/SpotifySearchContext";
import { spotifySearch } from "../Search/SpotifySearch";

type Theme = "emerald" | "zinc";

type MessageRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: MessageRole;
  text: string;
};

type GeminiSong = {
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  reason?: string;
  image?: string;
};

type GeminiResponse = {
  songs?: GeminiSong[];
  reply?: string;
  note?: string;
  error?: string;
  source?: string;
};

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
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      text: "Tell me an artist, mood, or vibe and I'll ask Gemini for songs you'll like.",
    },
  ]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const { setResult } = useContext(SpotifySearchContext) as any;
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!open) return;
    chatBodyRef.current?.scrollTo({
      top: chatBodyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  const buildAssistantReply = (data: GeminiResponse) => {
    if (Array.isArray(data.songs) && data.songs.length > 0) {
      const lines = data.songs.slice(0, 8).map((song, idx) => {
        const reason = song.reason ? ` (${song.reason})` : "";
        return `${idx + 1}. ${song.title} — ${song.artist}${reason}`;
      });
      return `Here are some tracks to spin:\n${lines.join("\n")}`;
    }
    if (data.reply) return data.reply;
    return "I couldn't get new picks right now. Try another vibe!";
  };

  const submit = async () => {
    const value = text.trim();
    if (!value || sending) return;
    try {
      setSending(true);
      setError(null);
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        text: value,
      };
      setMessages((prev) => [...prev, userMessage]);
      setText("");

      const res = await fetch("http://localhost:3001/gemini/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value }),
      });

      let data: GeminiResponse | { error?: string; details?: any } = {};
      try {
        data = await res.json();
      } catch {
        /* ignore body parse errors */
      }

      if (!res.ok) {
        const message =
          (data as any)?.error ||
          (data as any)?.details ||
          `Gemini request failed (${res.status})`;
        throw new Error(
          typeof message === "string"
            ? message
            : JSON.stringify(message, null, 2)
        );
      }

      const typedData = data as GeminiResponse;
      // Enrich songs with album art from Spotify if missing
      let songsWithImages = typedData.songs || [];
      if (songsWithImages.length) {
        try {
          songsWithImages = await Promise.all(
            songsWithImages.slice(0, 8).map(async (song) => {
              if (song.image) return song;
              try {
                const searchRes: any = await spotifySearch(
                  `${song.title} ${song.artist}`
                );
                const firstTrack =
                  searchRes?.tracks?.items?.[0] ||
                  searchRes?.albums?.items?.[0];
                const img =
                  firstTrack?.album?.images?.[0]?.url ||
                  firstTrack?.images?.[0]?.url ||
                  "";
                return { ...song, image: img };
              } catch {
                return song;
              }
            })
          );
        } catch {
          // ignore enrichment errors
        }
        setResult?.({
          source: "chat",
          songs: songsWithImages,
          note: (data as any)?.note,
          error: (data as any)?.error,
        });
        navigate("/playlist");
      }
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: buildAssistantReply(typedData),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      await (onSend ? onSend(value) : Promise.resolve());
    } catch (err: any) {
      setError(err?.message || "Something went wrong talking to Gemini.");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
      {!open && (
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
      )}

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
              <div className="px-4 pt-3 space-y-3">
                <div
                  ref={chatBodyRef}
                  className="max-h-72 overflow-y-auto space-y-2 pr-1"
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-lg px-3 py-2 text-sm whitespace-pre-line ${
                        msg.role === "user"
                          ? "border"
                          : "bg-zinc-100 text-zinc-900"
                      }`}
                      style={
                        msg.role === "user"
                          ? {
                              borderColor: accent,
                              backgroundColor: `${accent}1a`,
                              color: dark,
                            }
                          : undefined
                      }
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="text-red-600 text-xs">
                    {error} — try again in a moment.
                  </div>
                )}

                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={4}
                  placeholder={
                    placeholder ||
                    "E.g. upbeat indie for a workout, songs like Ariana Grande..."
                  }
                  className="w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-300"
                />
              </div>

              {/* FOOTER */}
              <div className="px-4 py-3 flex gap-2 justify-end">
                <div className="flex-1 text-left text-[11px] text-zinc-500">
                  Powered by Gemini · keep requests under 200 characters.
                </div>
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

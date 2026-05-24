"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  RotateCcw,
  Send,
  Sparkles,
  X,
  ImagePlus,
  Mic,
} from "lucide-react";
import {
  getDefaultQuickActions,
  getWelcomeMessage,
  replyToChat,
  replyToChatTry,
  type ChatMessage,
} from "@/app/lib/ChatBot";
import { getBestActiveBarberFromSupabase } from "@/app/lib/barbersSupabase";
import { getBestServiceForBarberFromSupabase } from "@/app/lib/servicesStore";
import { generateSlotsForDate } from "@/app/lib/availabilityStore";
import { getReservedTimesForBarber } from "@/app/lib/availabilitySupabase";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function uid(prefix = "chat") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function removeAssistantCommands(text: string) {
  return text
    .split("\n")
    .filter((line) => {
      const clean = line.trim();
      if (!clean) return true;
      if (clean === "OPEN_BOOKINGS") return false;
      if (clean === "OPEN_HOME") return false;
      if (clean === "OPEN_BARBER_PORTAL") return false;
      if (clean === "OPEN_SALON_PORTAL") return false;
      if (clean === "BOOKING_INTENT") return false;
      if (clean.startsWith("date=")) return false;
      if (clean.startsWith("time=")) return false;
      if (clean.startsWith("service=")) return false;
      if (clean.startsWith("barber=")) return false;
      return true;
    })
    .join("\n")
    .trim();
}
function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function preferredSlot(slots: string[], query: string) {
  const q = query.toLowerCase();

  if (q.includes("evening") || q.includes("after 6")) {
    return slots.find((s) => s >= "18:00") ?? slots.find((s) => s >= "17:00") ?? slots[0];
  }

  if (q.includes("afternoon")) {
    return slots.find((s) => s >= "13:00") ?? slots[0];
  }

  if (q.includes("morning")) {
    return slots.find((s) => s >= "09:00" && s <= "12:00") ?? slots[0];
  }

  return slots[0];
}

function preferredDate(query: string) {
  const q = query.toLowerCase();

  if (q.includes("tomorrow")) {
    return dayKey(addDays(new Date(), 1));
  }

  return dayKey(new Date());
}

export default function ChatBot() {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") {
      return [getWelcomeMessage()];
    }

    const saved = localStorage.getItem("cutato_ai_chat");

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }

    return [getWelcomeMessage()];
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const quickActions = useMemo(() => {
    if (pathname.startsWith("/barbers")) {
      return [
        { label: "Show services", prompt: "what services are available" },
        { label: "Available slots", prompt: "show available time slots" },
        { label: "Book now", prompt: "book this barber" },
      ];
    }

    if (pathname.startsWith("/book")) {
      return [
        { label: "Change time", prompt: "change my booking time" },
        { label: "Payment help", prompt: "how does payment work" },
      ];
    }

    if (pathname.startsWith("/bookings")) {
      return [
        { label: "Cancel booking", prompt: "cancel my booking" },
        { label: "Reschedule", prompt: "reschedule booking" },
      ];
    }

    return getDefaultQuickActions();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping, open]);

  useEffect(() => {
  localStorage.setItem(
    "cutato_ai_chat",
    JSON.stringify(messages)
  );
}, [messages]);

  function navigateFromCommand(prompt: string) {
    if (prompt.startsWith("open_profile_")) {
      const id = prompt.replace("open_profile_", "");
      router.push(`/barbers/${id}`);
      setOpen(false);
      return true;
    }

    if (prompt.startsWith("open_booking_")) {
      const id = prompt.replace("open_booking_", "");
      router.push(`/book?barberId=${id}`);
      setOpen(false);
      return true;
    }

    const p = prompt.toLowerCase().trim();

    if (p.includes("show barbers")) {
      router.push("/");
      setOpen(false);
      return true;
    }

    if (p.includes("my bookings")) {
      router.push("/bookings");
      setOpen(false);
      return true;
    }

    return false;
  }

  function handleAssistantCommand(replyText: string, originalQuery: string) {
    const cleanText = removeAssistantCommands(replyText);

    const botMsg: ChatMessage = {
      id: uid("bot"),
      role: "bot",
      text: cleanText || "Opening the right page for you.",
      createdAt: new Date().toISOString(),
    };

    if (replyText.includes("OPEN_BOOKINGS")) {
      setMessages((prev) => [...prev, botMsg]);
      setTimeout(() => {
        router.push("/bookings");
        setOpen(false);
      }, 650);
      return true;
    }

    if (replyText.includes("OPEN_HOME")) {
      setMessages((prev) => [...prev, botMsg]);
      setTimeout(() => {
        router.push("/");
        setOpen(false);
      }, 650);
      return true;
    }

    if (replyText.includes("OPEN_BARBER_PORTAL")) {
      setMessages((prev) => [...prev, botMsg]);
      setTimeout(() => {
        router.push("/portal/barber");
        setOpen(false);
      }, 650);
      return true;
    }

    if (replyText.includes("OPEN_SALON_PORTAL")) {
      setMessages((prev) => [...prev, botMsg]);
      setTimeout(() => {
        router.push("/portal/salon");
        setOpen(false);
      }, 650);
      return true;
    }

    if (replyText.includes("BOOKING_INTENT")) {
  setMessages((prev) => [
    ...prev,
    {
      ...botMsg,
      text: cleanText || "I found a possible booking slot for you.",
    },
  ]);

  (async () => {
    try {
      const barber = await getBestActiveBarberFromSupabase();

      const service =
        barber?.id
          ? await getBestServiceForBarberFromSupabase(barber.id, originalQuery)
          : null;

      const date = preferredDate(originalQuery);

      let selectedTime = "";

      if (barber?.id && service) {
        const generated = generateSlotsForDate(
          barber.id,
          date,
          service.durationMin
        );

        const reserved = await getReservedTimesForBarber(barber.id, date);
        const taken = new Set(reserved);

        const available = generated.filter((slot) => !taken.has(slot));
        selectedTime = preferredSlot(available, originalQuery) || "";
      }

      setTimeout(() => {
        if (barber?.id && service?.id) {
          const qs = new URLSearchParams({
            barberId: barber.id,
            serviceId: service.id,
            date,
          });

          if (selectedTime) qs.set("time", selectedTime);

          router.push(`/book?${qs.toString()}`);
        } else if (barber?.id) {
          router.push(`/book?barberId=${encodeURIComponent(barber.id)}`);
        } else {
          router.push("/");
        }

        setOpen(false);
      }, 900);
    } catch (err) {
      console.error("AI booking redirect failed:", err);

      setTimeout(() => {
        router.push("/");
        setOpen(false);
      }, 900);
    }
  })();

  return true;
}

    return false;
  }

async function appendBotReply(trimmed: string) {
  setIsTyping(true);

  try {
    const local = replyToChatTry(trimmed);

    if (
      local?.text &&
      !local.text.toLowerCase().includes(
        "not fully sure what you mean yet"
      )
    ) {
      const botMsg: ChatMessage = {
        id: uid("bot"),
        role: "bot",
        text: local.text,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
      return;
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: trimmed,
        pathname,
      }),
    });

    if (!res.ok) {
      throw new Error("Streaming request failed");
    }

    if (!res.body) {
      throw new Error("No response body");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let streamedText = "";

    const botId = uid("bot");

    setMessages((prev) => [
      ...prev,
      {
        id: botId,
        role: "bot",
        text: "",
        createdAt: new Date().toISOString(),
      },
    ]);

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      streamedText += decoder.decode(value, {
        stream: true,
      });

      const cleanText = streamedText
        .replace(/^data:\s*/gm, "")
        .replace(/\[DONE\]/g, "")
        .trim();

      setMessages((prev) =>
        prev.map((m) =>
          m.id === botId
            ? {
                ...m,
                text: cleanText,
              }
            : m
        )
      );
    }

    const finalText = streamedText
      .replace(/^data:\s*/gm, "")
      .replace(/\[DONE\]/g, "")
      .trim();

    handleAssistantCommand(finalText, trimmed);
  } catch (err) {
    console.error("Chat failed:", err);

    const fallback = replyToChat(trimmed);

    const botMsg: ChatMessage = {
      id: uid("bot"),
      role: "bot",
      text: fallback || "Something went wrong.",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, botMsg]);
  } finally {
    setIsTyping(false);
  }
}

  function pushUserMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (navigateFromCommand(trimmed)) return;

    const userMsg: ChatMessage = {
      id: uid("user"),
      role: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    appendBotReply(trimmed);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isTyping) return;
    pushUserMessage(input);
  }

  function onQuickAction(prompt: string) {
    if (isTyping) return;
    setOpen(true);
    pushUserMessage(prompt);
  }

  function resetChat() {
  localStorage.removeItem("cutato_ai_chat");

  setMessages([getWelcomeMessage()]);
  setInput("");
  setIsTyping(false);
}

  return (
    <>
      {open ? (
        <div className="fixed bottom-24 right-4 z-[120] grid h-[min(720px,calc(100vh-110px))] w-[min(430px,calc(100vw-24px))] grid-rows-[auto_auto_1fr_auto] overflow-hidden rounded-[34px] border border-black/10 bg-white shadow-[0_24px_90px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between gap-3 border-b border-black/10 bg-neutral-950 p-4 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff355d] shadow-lg shadow-[#ff355d]/25">
                <Bot size={22} />
              </div>

              <div className="min-w-0">
                <div className="truncate text-base font-black">
                  Cutato Assistant
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs font-bold text-white/50">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  AI enabled
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetChat}
                title="Reset chat"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 transition hover:bg-white/15"
              >
                <RotateCcw size={17} />
              </button>

              <button
                onClick={() => setOpen(false)}
                title="Close"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 transition hover:bg-white/15"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border-b border-black/10 bg-white p-3">
            <div className="flex min-w-max gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => onQuickAction(action.prompt)}
                  className="rounded-full border border-black/10 bg-neutral-50 px-4 py-2 text-xs font-black transition hover:border-[#ff355d]/30 hover:bg-[#ff355d]/10 hover:text-[#ff355d]"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={scrollRef}
            className="grid content-start gap-4 overflow-y-auto bg-neutral-50 p-4"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "bot" ? (
                  <div className="flex max-w-[88%] items-end gap-2">
                    <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff355d] text-white">
                      <Sparkles size={14} />
                    </div>

                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.text}
                  </ReactMarkdown>
                )}
              </div>
            ))}

            {isTyping ? (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff355d] text-white">
                    <Sparkles size={14} />
                  </div>

                  <div className="rounded-[22px] rounded-bl-md border border-black/10 bg-white px-4 py-4 shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="border-t border-black/10 bg-white p-3">
            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
            <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-black/10 bg-neutral-50 transition hover:bg-neutral-100">
              <ImagePlus size={18} />

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedImage(file);
                  }
                }}
              />
            </label>

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                selectedImage
                  ? `Image selected: ${selectedImage.name}`
                  : "Message Cutato Assistant..."
              }
              className="h-12 rounded-2xl border border-black/10 bg-neutral-50 px-4 text-sm font-bold outline-none transition focus:border-[#ff355d] focus:bg-white"
            />

            <button
              type="button"
              onClick={() => {
                setIsRecording((v) => !v);
              }}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                isRecording
                  ? "bg-red-500 text-white"
                  : "border border-black/10 bg-neutral-50"
              }`}
            >
              <Mic size={18} />
            </button>

            <button
              type="submit"
              disabled={(!input.trim() && !selectedImage) || isTyping}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff355d] text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>

            <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] font-bold text-neutral-400">
              <span>Ask about bookings, barbers, services or portals.</span>
              <span>{isTyping ? "Assistant is typing..." : "Press Enter to send"}</span>
            </div>
          </form>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open chat assistant"
        className="fixed bottom-5 right-5 z-[121] flex h-16 w-16 items-center justify-center rounded-full bg-[#ff355d] text-white shadow-[0_18px_42px_rgba(255,53,93,0.35)] transition hover:-translate-y-1 hover:bg-[#ff1f4c]"
      >
        {open ? <X size={26} /> : <Bot size={27} />}
      </button>
    </>
  );
}

function TypingDots() {
  return (
    <>
      <style>{`
        @keyframes cutatoTyping {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.35;
          }
          40% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
      `}</style>

      <div className="flex min-h-3 items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-neutral-500 [animation:cutatoTyping_1.2s_infinite]" />
        <span className="h-2 w-2 rounded-full bg-neutral-500 [animation:cutatoTyping_1.2s_infinite_0.15s]" />
        <span className="h-2 w-2 rounded-full bg-neutral-500 [animation:cutatoTyping_1.2s_infinite_0.3s]" />
      </div>
    </>
  );
}
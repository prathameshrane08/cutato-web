"use client";

import { Bot, Send, Sparkles, X } from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type PortalRole = "salon" | "barber";

type PortalAssistantContext = {
  role: PortalRole;
  name: string;
  revenue: number;
  bookings: number;
  averageBookingValue: number;
  completionRate: number;
  cancellationRate: number;
  occupancyOrUtilization: number;
  tips?: number;
  topService?: {
    name: string;
    bookings: number;
  } | null;
  topBarber?: {
    name: string;
    revenue: number;
  } | null;
  todayBookings?: number;
  upcomingBookings?: number;
  activeBarbers?: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function welcomeText(role: PortalRole, name: string) {
  if (role === "salon") {
    return `Hi! I’m your CUTATO Business Assistant for ${name}. Ask me about revenue, bookings, staff performance, cancellations, services, or what needs attention today.`;
  }

  return `Hi! I’m your CUTATO Barber Assistant for ${name}. Ask me about your earnings, appointments, tips, top services, schedule, or performance.`;
}

function quickPrompts(role: PortalRole) {
  if (role === "salon") {
    return [
      "How is my salon performing?",
      "Which barber is performing best?",
      "What is my top service?",
      "What needs attention today?",
    ];
  }

  return [
    "How am I performing?",
    "How much did I earn?",
    "What is my top service?",
    "What does my day look like?",
  ];
}

function findNavigation(text: string, role: PortalRole) {
  const q = text.toLowerCase();

  if (q.includes("booking") && (q.includes("open") || q.includes("show") || q.includes("go to"))) {
    return role === "salon" ? "/portal/salon/bookings" : "/portal/barber/bookings";
  }

  if (q.includes("schedule") && role === "barber") {
    return "/portal/barber/schedule";
  }

  if (q.includes("availability")) {
    return role === "salon" ? "/portal/salon/availability" : "/portal/barber/availability";
  }

  if (q.includes("earning") && role === "barber") {
    return "/portal/barber/earnings";
  }

  if (q.includes("staff") && role === "salon") {
    return "/portal/salon/staff";
  }

  if (q.includes("service") && role === "salon" && (q.includes("manage") || q.includes("open"))) {
    return "/portal/salon/services";
  }

  if (q.includes("setting") && role === "salon") {
    return "/portal/salon/settings";
  }

  return null;
}

export default function PortalAssistant({ context }: { context: PortalAssistantContext }) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "assistant",
      text: welcomeText(context.role, context.name),
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const prompts = useMemo(() => quickPrompts(context.role), [context.role]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function send(prompt?: string) {
    const text = (prompt ?? input).trim();

    if (!text || loading) {
      return;
    }

    const navigation = findNavigation(text, context.role);

    const userMessage: Message = {
      id: uid(),
      role: "user",
      text,
    };

    setMessages((previous) => [...previous, userMessage]);

    setInput("");

    if (navigation) {
      setMessages((previous) => [
        ...previous,
        {
          id: uid(),
          role: "assistant",
          text: "Opening that page for you.",
        },
      ]);

      router.push(navigation);

      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/portal-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          context,
          history: messages.slice(-8).map((message) => ({
            role: message.role,
            content: message.text,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Assistant request failed.");
      }

      setMessages((previous) => [
        ...previous,
        {
          id: uid(),
          role: "assistant",
          text: data?.text || "I couldn't generate a response.",
        },
      ]);
    } catch (error) {
      console.error("PORTAL ASSISTANT ERROR:", error);

      setMessages((previous) => [
        ...previous,
        {
          id: uid(),
          role: "assistant",
          text: "I couldn't reach the AI service, but the dashboard analytics are still available.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[80] inline-flex items-center gap-3 rounded-full bg-neutral-950 px-5 py-4 text-sm font-black text-white shadow-[0_18px_60px_rgba(0,0,0,0.25)] transition hover:-translate-y-1"
        >
          <span className="relative">
            <Bot size={20} />

            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#ff355d]" />
          </span>
          AI Assistant
        </button>
      ) : (
        <section className="fixed bottom-5 right-5 z-[90] flex h-[min(680px,calc(100vh-40px))] w-[min(430px,calc(100vw-24px))] flex-col overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_28px_100px_rgba(0,0,0,0.24)]">
          {/* HEADER */}

          <div className="bg-neutral-950 p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff355d]">
                  <Sparkles size={20} />
                </div>

                <div>
                  <p className="font-black">
                    {context.role === "salon" ? "Business Assistant" : "Barber Assistant"}
                  </p>

                  <p className="mt-1 text-xs font-bold text-white/45">
                    {context.name} • Live dashboard context
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* MESSAGES */}

          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-neutral-50 p-4">
            <div className="grid gap-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-12 rounded-[20px] rounded-br-md bg-[#ff355d] px-4 py-3 text-sm font-semibold leading-6 text-white"
                      : "mr-8 rounded-[20px] rounded-bl-md border border-black/5 bg-white px-4 py-3 text-sm font-semibold leading-6 text-neutral-700 shadow-sm"
                  }
                >
                  {message.text}
                </div>
              ))}

              {loading ? (
                <div className="mr-20 rounded-[20px] rounded-bl-md border border-black/5 bg-white px-4 py-3 text-sm font-bold text-neutral-400 shadow-sm">
                  Thinking...
                </div>
              ) : null}
            </div>
          </div>

          {/* QUICK ACTIONS */}

          <div className="border-t border-black/5 bg-white px-4 pt-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void send(prompt)}
                  className="shrink-0 rounded-full border border-black/10 bg-neutral-50 px-3 py-2 text-xs font-black text-neutral-600 transition hover:bg-white hover:text-[#ff355d]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* INPUT */}

          <div className="border-t border-black/5 bg-white p-4">
            <div className="flex items-end gap-2 rounded-[22px] border border-black/10 bg-neutral-50 p-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();

                    void send();
                  }
                }}
                rows={1}
                placeholder={
                  context.role === "salon"
                    ? "Ask about your salon..."
                    : "Ask about your performance..."
                }
                className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm font-semibold outline-none"
              />

              <button
                type="button"
                disabled={loading || !input.trim()}
                onClick={() => void send()}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff355d] text-white transition hover:bg-[#ff1f4c] disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] font-bold text-neutral-300">
              Answers use the analytics currently loaded in your portal.
            </p>
          </div>
        </section>
      )}
    </>
  );
}

export type { PortalAssistantContext, PortalRole };

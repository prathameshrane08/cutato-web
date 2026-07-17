"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePathname, useRouter } from "next/navigation";

import {
  Bot,
  ImagePlus,
  Mic,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

type ChatUIMessage = ChatMessage & {
  imageUrl?: string;
};

function uid(prefix = "chat") {
  return `${prefix}_${Math.random()
    .toString(16)
    .slice(2)}_${Date.now().toString(16)}`;
}

function removeAssistantCommands(text: string) {
  return text
    .split("\n")
    .filter((line) => {
      const clean = line.trim();

      if (!clean) {
        return true;
      }

      if (clean === "OPEN_BOOKINGS") {
        return false;
      }

      if (clean === "OPEN_HOME") {
        return false;
      }

      if (clean === "OPEN_BARBER_PORTAL") {
        return false;
      }

      if (clean === "OPEN_SALON_PORTAL") {
        return false;
      }

      if (clean === "BOOKING_INTENT") {
        return false;
      }

      if (clean.startsWith("date=")) {
        return false;
      }

      if (clean.startsWith("time=")) {
        return false;
      }

      if (clean.startsWith("service=")) {
        return false;
      }

      if (clean.startsWith("barber=")) {
        return false;
      }

      return true;
    })
    .join("\n")
    .trim();
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, numberOfDays: number) {
  const date = new Date(base);

  date.setDate(date.getDate() + numberOfDays);

  return date;
}

function preferredSlot(
  slots: string[],
  query: string
) {
  const lowerQuery = query.toLowerCase();

  if (
    lowerQuery.includes("evening") ||
    lowerQuery.includes("after 6")
  ) {
    return (
      slots.find((slot) => slot >= "18:00") ??
      slots.find((slot) => slot >= "17:00") ??
      slots[0]
    );
  }

  if (lowerQuery.includes("afternoon")) {
    return (
      slots.find((slot) => slot >= "13:00") ??
      slots[0]
    );
  }

  if (lowerQuery.includes("morning")) {
    return (
      slots.find(
        (slot) =>
          slot >= "09:00" &&
          slot <= "12:00"
      ) ?? slots[0]
    );
  }

  return slots[0];
}

function preferredDate(query: string) {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes("tomorrow")) {
    return dayKey(addDays(new Date(), 1));
  }

  return dayKey(new Date());
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("The image could not be read."));
    };

    reader.onerror = () => {
      reject(
        reader.error ??
          new Error("The image could not be read.")
      );
    };

    reader.readAsDataURL(file);
  });
}

function getAudioExtension(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "mp4";
  }

  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  if (mimeType.includes("wav")) {
    return "wav";
  }

  return "webm";
}

function getSupportedAudioMimeType() {
  if (
    typeof MediaRecorder === "undefined"
  ) {
    return "";
  }

  const possibleTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];

  return (
    possibleTypes.find((type) =>
      MediaRecorder.isTypeSupported(type)
    ) ?? ""
  );
}

export default function ChatBot() {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [input, setInput] = useState("");

  const [isTyping, setIsTyping] =
    useState(false);

  const [isRecording, setIsRecording] =
    useState(false);

  const [
    isTranscribing,
    setIsTranscribing,
  ] = useState(false);

  const [selectedImage, setSelectedImage] =
    useState<File | null>(null);

  const [
    selectedImagePreview,
    setSelectedImagePreview,
  ] = useState<string | null>(null);

  const [
    historyLoaded,
    setHistoryLoaded,
  ] = useState(false);

  const [messages, setMessages] = useState<
    ChatUIMessage[]
  >([getWelcomeMessage()]);

  const scrollRef =
    useRef<HTMLDivElement | null>(null);

  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const audioChunksRef = useRef<Blob[]>([]);

  const activeAudioStreamRef =
    useRef<MediaStream | null>(null);

  const quickActions = useMemo(() => {
    if (pathname.startsWith("/barbers")) {
      return [
        {
          label: "Show services",
          prompt: "what services are available",
        },
        {
          label: "Available slots",
          prompt: "show available time slots",
        },
        {
          label: "Book now",
          prompt: "book this barber",
        },
      ];
    }

    if (pathname.startsWith("/book")) {
      return [
        {
          label: "Change time",
          prompt: "change my booking time",
        },
        {
          label: "Payment help",
          prompt: "how does payment work",
        },
      ];
    }

    if (pathname.startsWith("/bookings")) {
      return [
        {
          label: "Cancel booking",
          prompt: "cancel my booking",
        },
        {
          label: "Reschedule",
          prompt: "reschedule booking",
        },
      ];
    }

    return getDefaultQuickActions();
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [open]);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    element.scrollTo({
      top: element.scrollHeight,
      behavior: "smooth",
    });
  }, [
    messages,
    isTyping,
    isTranscribing,
    open,
  ]);

  useEffect(() => {
    try {
      const savedChat = localStorage.getItem(
        "cutato_ai_chat"
      );

      if (savedChat) {
        const parsed = JSON.parse(savedChat);

        if (
          Array.isArray(parsed) &&
          parsed.length > 0
        ) {
          setMessages(parsed);
        }
      }
    } catch (error) {
      console.error(
        "Could not load chat history:",
        error
      );
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!historyLoaded) {
      return;
    }

    try {
      const messagesWithoutImages = messages.map(
        ({ imageUrl: _imageUrl, ...message }) =>
          message
      );

      localStorage.setItem(
        "cutato_ai_chat",
        JSON.stringify(messagesWithoutImages)
      );
    } catch (error) {
      console.error(
        "Could not save chat history:",
        error
      );
    }
  }, [messages, historyLoaded]);

  useEffect(() => {
    return () => {
      activeAudioStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());
    };
  }, []);

  function navigateFromCommand(
    prompt: string
  ) {
    if (prompt.startsWith("open_profile_")) {
      const id = prompt.replace(
        "open_profile_",
        ""
      );

      router.push(`/barbers/${id}`);
      setOpen(false);

      return true;
    }

    if (prompt.startsWith("open_booking_")) {
      const id = prompt.replace(
        "open_booking_",
        ""
      );

      router.push(
        `/book?barberId=${encodeURIComponent(id)}`
      );

      setOpen(false);

      return true;
    }

    const normalizedPrompt = prompt
      .toLowerCase()
      .trim();

    if (
      normalizedPrompt.includes(
        "show barbers"
      )
    ) {
      router.push("/");
      setOpen(false);

      return true;
    }

    if (
      normalizedPrompt.includes("my bookings")
    ) {
      router.push("/bookings");
      setOpen(false);

      return true;
    }

    return false;
  }

  function executeAssistantCommand(
    replyText: string,
    originalQuery: string
  ) {
    if (replyText.includes("OPEN_BOOKINGS")) {
      window.setTimeout(() => {
        router.push("/bookings");
        setOpen(false);
      }, 650);

      return true;
    }

    if (replyText.includes("OPEN_HOME")) {
      window.setTimeout(() => {
        router.push("/");
        setOpen(false);
      }, 650);

      return true;
    }

    if (
      replyText.includes(
        "OPEN_BARBER_PORTAL"
      )
    ) {
      window.setTimeout(() => {
        router.push("/portal/barber");
        setOpen(false);
      }, 650);

      return true;
    }

    if (
      replyText.includes(
        "OPEN_SALON_PORTAL"
      )
    ) {
      window.setTimeout(() => {
        router.push("/portal/salon");
        setOpen(false);
      }, 650);

      return true;
    }

    if (
      replyText.includes("BOOKING_INTENT")
    ) {
      void (async () => {
        try {
          const barber =
            await getBestActiveBarberFromSupabase();

          const service = barber?.id
            ? await getBestServiceForBarberFromSupabase(
                barber.id,
                originalQuery
              )
            : null;

          const date =
            preferredDate(originalQuery);

          let selectedTime = "";

          if (barber?.id && service) {
            const generated =
              generateSlotsForDate(
                barber.id,
                date,
                service.durationMin
              );

            const reserved =
              await getReservedTimesForBarber(
                barber.id,
                date
              );

            const taken = new Set(reserved);

            const available =
              generated.filter(
                (slot) => !taken.has(slot)
              );

            selectedTime =
              preferredSlot(
                available,
                originalQuery
              ) ?? "";
          }

          window.setTimeout(() => {
            if (barber?.id && service?.id) {
              const searchParams =
                new URLSearchParams({
                  barberId: barber.id,
                  serviceId: service.id,
                  date,
                });

              if (selectedTime) {
                searchParams.set(
                  "time",
                  selectedTime
                );
              }

              router.push(
                `/book?${searchParams.toString()}`
              );
            } else if (barber?.id) {
              router.push(
                `/book?barberId=${encodeURIComponent(
                  barber.id
                )}`
              );
            } else {
              router.push("/");
            }

            setOpen(false);
          }, 900);
        } catch (error) {
          console.error(
            "AI booking redirect failed:",
            error
          );

          window.setTimeout(() => {
            router.push("/");
            setOpen(false);
          }, 900);
        }
      })();

      return true;
    }

    return false;
  }

  async function appendBotReply(
    trimmed: string,
    imageFile: File | null
  ) {
    setIsTyping(true);

    try {
      const image = imageFile
        ? await fileToBase64(imageFile)
        : null;

      const response = await fetch(
        "/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            message: trimmed,
            pathname,
            image,
            history: messages
              .slice(-10)
              .map((message) => ({
                role:
                  message.role === "bot"
                    ? "assistant"
                    : "user",
                content: message.text,
              })),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Chat request failed with status ${response.status}.`
        );
      }

      const contentType =
        response.headers.get(
          "content-type"
        ) ?? "";

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        const data = await response.json();

        const replyText =
          typeof data?.text === "string"
            ? data.text
            : "Sorry, I couldn't process that.";

        const cleanText =
          removeAssistantCommands(
            replyText
          );

        const botMessage: ChatUIMessage = {
          id: uid("bot"),
          role: "bot",
          text:
            cleanText ||
            "Opening the right page for you.",
          createdAt:
            new Date().toISOString(),
        };

        setMessages((previous) => [
          ...previous,
          botMessage,
        ]);

        executeAssistantCommand(
          replyText,
          trimmed
        );

        return;
      }

      if (!response.body) {
        throw new Error(
          "The assistant returned no response body."
        );
      }

      const reader =
        response.body.getReader();

      const decoder = new TextDecoder();

      const botId = uid("bot");

      let streamedText = "";

      setMessages((previous) => [
        ...previous,
        {
          id: botId,
          role: "bot",
          text: "",
          createdAt:
            new Date().toISOString(),
        },
      ]);

      while (true) {
        const { done, value } =
          await reader.read();

        if (done) {
          break;
        }

        streamedText += decoder.decode(
          value,
          {
            stream: true,
          }
        );

        const visibleText =
          removeAssistantCommands(
            streamedText
          );

        setMessages((previous) =>
          previous.map((message) =>
            message.id === botId
              ? {
                  ...message,
                  text: visibleText,
                }
              : message
          )
        );
      }

      streamedText += decoder.decode();

      const finalVisibleText =
        removeAssistantCommands(
          streamedText
        );

      setMessages((previous) =>
        previous.map((message) =>
          message.id === botId
            ? {
                ...message,
                text:
                  finalVisibleText ||
                  "Opening the right page for you.",
              }
            : message
        )
      );

      executeAssistantCommand(
        streamedText,
        trimmed
      );
    } catch (error) {
      console.error(
        "Chat request failed:",
        error
      );

      const local =
        await replyToChatTry(trimmed);

      const fallback =
        local?.text ??
        replyToChat(trimmed);

      const botMessage: ChatUIMessage = {
        id: uid("bot"),
        role: "bot",
        text:
          fallback ||
          "Something went wrong. Please try again.",
        createdAt:
          new Date().toISOString(),
      };

      setMessages((previous) => [
        ...previous,
        botMessage,
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  async function pushUserMessage(
    text: string,
    imageFile: File | null =
      selectedImage
  ) {
    const normalizedText = text.trim();

    if (!normalizedText && !imageFile) {
      return;
    }

    if (
      normalizedText &&
      !imageFile &&
      navigateFromCommand(normalizedText)
    ) {
      return;
    }

    const messageText =
      normalizedText ||
      "Please analyze this image.";

    let imageUrl: string | undefined;

    if (imageFile) {
      try {
        imageUrl =
          await fileToBase64(imageFile);
      } catch (error) {
        console.error(
          "Could not create image preview:",
          error
        );
      }
    }

    const userMessage: ChatUIMessage = {
      id: uid("user"),
      role: "user",
      text: messageText,
      imageUrl,
      createdAt:
        new Date().toISOString(),
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setInput("");
    setSelectedImage(null);
    setSelectedImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    await appendBotReply(
      messageText,
      imageFile
    );
  }

  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia
    ) {
      setMessages((previous) => [
        ...previous,
        {
          id: uid("bot"),
          role: "bot",
          text:
            "Voice recording is not supported by this browser.",
          createdAt:
            new Date().toISOString(),
        },
      ]);

      return;
    }

    if (
      typeof MediaRecorder === "undefined"
    ) {
      setMessages((previous) => [
        ...previous,
        {
          id: uid("bot"),
          role: "bot",
          text:
            "MediaRecorder is not supported by this browser.",
          createdAt:
            new Date().toISOString(),
        },
      ]);

      return;
    }

    try {
      const audioStream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        );

      activeAudioStreamRef.current =
        audioStream;

      const supportedMimeType =
        getSupportedAudioMimeType();

      const recorder = supportedMimeType
        ? new MediaRecorder(audioStream, {
            mimeType: supportedMimeType,
          })
        : new MediaRecorder(audioStream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (
        event
      ) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onerror = (event) => {
        console.error(
          "MediaRecorder error:",
          event
        );
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        setIsTranscribing(true);

        audioStream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        activeAudioStreamRef.current =
          null;

        try {
          const mimeType =
            recorder.mimeType ||
            supportedMimeType ||
            "audio/webm";

          const audioBlob = new Blob(
            audioChunksRef.current,
            {
              type: mimeType,
            }
          );

          if (audioBlob.size === 0) {
            throw new Error(
              "No audio was recorded."
            );
          }

          const extension =
            getAudioExtension(mimeType);

          const formData = new FormData();

          formData.append(
            "audio",
            audioBlob,
            `voice-message.${extension}`
          );

          const response = await fetch(
            "/api/transcribe",
            {
              method: "POST",
              body: formData,
            }
          );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data?.error ||
                "Voice transcription failed."
            );
          }

          const transcript = String(
            data?.text || ""
          ).trim();

          if (!transcript) {
            throw new Error(
              "No speech was detected."
            );
          }

          setInput(transcript);

          await pushUserMessage(
            transcript,
            null
          );
        } catch (error) {
          console.warn(
          "Voice transcription failed:",
          error
        );

          const errorMessage =
            error instanceof Error
              ? error.message
              : "Voice transcription failed.";

          setMessages((previous) => [
            ...previous,
            {
              id: uid("bot"),
              role: "bot",
              text: errorMessage,
              createdAt:
                new Date().toISOString(),
            },
          ]);
        } finally {
          setIsTranscribing(false);
          audioChunksRef.current = [];
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error(
        "Microphone access failed:",
        error
      );

      setIsRecording(false);

      setMessages((previous) => [
        ...previous,
        {
          id: uid("bot"),
          role: "bot",
          text:
            "I couldn’t access the microphone. Allow microphone permission in your browser and try again.",
          createdAt:
            new Date().toISOString(),
        },
      ]);
    }
  }

  function onSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (
      isTyping ||
      isRecording ||
      isTranscribing
    ) {
      return;
    }

    void pushUserMessage(
      input,
      selectedImage
    );
  }

  function onQuickAction(
    prompt: string
  ) {
    if (
      isTyping ||
      isRecording ||
      isTranscribing
    ) {
      return;
    }

    setOpen(true);

    void pushUserMessage(prompt, null);
  }

  function resetChat() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
    }

    localStorage.removeItem(
      "cutato_ai_chat"
    );

    setMessages([getWelcomeMessage()]);
    setInput("");
    setSelectedImage(null);
    setSelectedImagePreview(null);
    setIsTyping(false);
    setIsRecording(false);
    setIsTranscribing(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleImageSelection(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessages((previous) => [
        ...previous,
        {
          id: uid("bot"),
          role: "bot",
          text:
            "Please select a valid image file.",
          createdAt:
            new Date().toISOString(),
        },
      ]);

      return;
    }

    const maximumSize =
      8 * 1024 * 1024;

    if (file.size > maximumSize) {
      setMessages((previous) => [
        ...previous,
        {
          id: uid("bot"),
          role: "bot",
          text:
            "The image is too large. Please upload an image smaller than 8 MB.",
          createdAt:
            new Date().toISOString(),
        },
      ]);

      return;
    }

    setSelectedImage(file);

    const previewUrl =
      URL.createObjectURL(file);

    setSelectedImagePreview(
      (previousPreview) => {
        if (
          previousPreview?.startsWith(
            "blob:"
          )
        ) {
          URL.revokeObjectURL(
            previousPreview
          );
        }

        return previewUrl;
      }
    );

    inputRef.current?.focus();
  }

  function removeSelectedImage() {
    if (
      selectedImagePreview?.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        selectedImagePreview
      );
    }

    setSelectedImage(null);
    setSelectedImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

                  {isRecording
                    ? "Recording"
                    : isTranscribing
                      ? "Transcribing"
                      : "AI enabled"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetChat}
                title="Reset chat"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 transition hover:bg-white/15"
              >
                <RotateCcw size={17} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                title="Close"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 transition hover:bg-white/15"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border-b border-black/10 bg-white p-3">
            <div className="flex min-w-max gap-2">
              {quickActions.map(
                (action) => (
                  <button
                    type="button"
                    key={action.label}
                    onClick={() =>
                      onQuickAction(
                        action.prompt
                      )
                    }
                    disabled={
                      isTyping ||
                      isRecording ||
                      isTranscribing
                    }
                    className="rounded-full border border-black/10 bg-neutral-50 px-4 py-2 text-xs font-black transition hover:border-[#ff355d]/30 hover:bg-[#ff355d]/10 hover:text-[#ff355d] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {action.label}
                  </button>
                )
              )}
            </div>
          </div>

          <div
            ref={scrollRef}
            className="grid content-start gap-4 overflow-y-auto bg-neutral-50 p-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {message.role === "bot" ? (
                  <div className="flex max-w-[88%] items-end gap-2">
                    <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff355d] text-white">
                      <Sparkles size={14} />
                    </div>

                    <div className="min-w-0 rounded-[22px] rounded-bl-md border border-black/10 bg-white px-4 py-3 text-sm leading-6 text-neutral-900 shadow-sm [&_a]:underline [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-1 [&_pre]:overflow-x-auto [&_ul]:list-disc">
                      <ReactMarkdown
                        remarkPlugins={[
                          remarkGfm,
                        ]}
                      >
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[82%] overflow-hidden rounded-[22px] rounded-br-md bg-neutral-950 text-sm leading-6 text-white shadow-lg">
                    {message.imageUrl ? (
                      <img
                        src={
                          message.imageUrl
                        }
                        alt="Uploaded attachment"
                        className="max-h-64 w-full object-cover"
                      />
                    ) : null}

                    <div className="px-4 py-3 [&_a]:underline [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-1 [&_pre]:overflow-x-auto [&_ul]:list-disc">
                      <ReactMarkdown
                        remarkPlugins={[
                          remarkGfm,
                        ]}
                      >
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  </div>
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

          <form
            onSubmit={onSubmit}
            className="border-t border-black/10 bg-white p-3"
          >
            {selectedImagePreview ? (
              <div className="mb-3 flex items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50 p-2">
                <img
                  src={
                    selectedImagePreview
                  }
                  alt="Selected upload"
                  className="h-14 w-14 rounded-xl object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-neutral-900">
                    {selectedImage?.name}
                  </p>

                  <p className="mt-1 text-[11px] font-bold text-neutral-400">
                    Ready to send
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    removeSelectedImage
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white transition hover:bg-neutral-100"
                  title="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
            ) : null}

            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={
                  isTyping ||
                  isRecording ||
                  isTranscribing
                }
                title="Upload image"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-neutral-50 text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ImagePlus size={18} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={
                  handleImageSelection
                }
              />

              <input
                ref={inputRef}
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                disabled={
                  isRecording ||
                  isTranscribing
                }
                placeholder={
                  selectedImage
                    ? "Ask something about this image..."
                    : isRecording
                      ? "Recording voice..."
                      : isTranscribing
                        ? "Transcribing voice..."
                        : "Message Cutato Assistant..."
                }
                className="h-12 min-w-0 rounded-2xl border border-black/10 bg-neutral-50 px-4 text-sm font-bold outline-none transition focus:border-[#ff355d] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="button"
                onClick={toggleRecording}
                disabled={
                  isTyping ||
                  isTranscribing
                }
                title={
                  isRecording
                    ? "Stop recording"
                    : "Record voice message"
                }
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                  isRecording
                    ? "animate-pulse bg-red-500 text-white"
                    : "border border-black/10 bg-neutral-50 text-neutral-900 hover:bg-neutral-100"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <Mic size={18} />
              </button>

              <button
                type="submit"
                disabled={
                  (!input.trim() &&
                    !selectedImage) ||
                  isTyping ||
                  isRecording ||
                  isTranscribing
                }
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff355d] text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] font-bold text-neutral-400">
              <span>
                Ask questions, upload an
                image, or record your voice.
              </span>

              <span>
                {isRecording
                  ? "Recording... tap the mic to stop"
                  : isTranscribing
                    ? "Transcribing voice..."
                    : isTyping
                      ? "Assistant is typing..."
                      : "Press Enter to send"}
              </span>
            </div>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        aria-label={
          open
            ? "Close chat assistant"
            : "Open chat assistant"
        }
        className="fixed bottom-5 right-5 z-[121] flex h-16 w-16 items-center justify-center rounded-full bg-[#ff355d] text-white shadow-[0_18px_42px_rgba(255,53,93,0.35)] transition hover:-translate-y-1 hover:bg-[#ff1f4c]"
      >
        {open ? (
          <X size={26} />
        ) : (
          <Bot size={27} />
        )}
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
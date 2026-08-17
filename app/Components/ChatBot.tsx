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

import {
  getHairstyleRecommendations,
} from "@/app/lib/hairstyleAdvisor/scoring";

import type {
  FaceShape,
  FacialHair,
  HairCondition,
  HairLength,
  HairTexture,
  HairThickness,
  HairstyleProfile,
  HairstyleRecommendation,
  PreferredLook,
  StylingEffort,
} from "@/app/lib/hairstyleAdvisor/types";


type ChatUIMessage = ChatMessage & {
  imageUrl?: string;
  showHairstyleActions?: boolean;
  showPhotoAnalysisActions?: boolean;
  showStylingEffortActions?: boolean;
  showPreferredLookActions?: boolean;
  recommendations?: HairstyleRecommendation[];
};

function uid(prefix = "chat") {
  return `${prefix}_${Math.random()
    .toString(16)
    .slice(2)}_${Date.now().toString(16)}`;
}

function isHairstyleAdvisorRequest(text: string) {
  const normalized = text.toLowerCase().trim();

  const phrases = [
    "suggest me a hairstyle",
    "suggest a hairstyle",
    "recommend a hairstyle",
    "recommend me a hairstyle",
    "recommend a haircut",
    "recommend me a haircut",
    "which haircut suits me",
    "which hairstyle suits me",
    "what haircut suits me",
    "what hairstyle suits me",
    "what haircut should i get",
    "what hairstyle should i get",
    "help me choose a hairstyle",
    "help me choose a haircut",
    "find my hairstyle",
    "find me a hairstyle",
    "hairstyle advisor",
    "hairstyle consultation",
    "hair consultation",
  ];

  return phrases.some((phrase) =>
    normalized.includes(phrase)
  );
}

function removeAssistantCommands(text: string) {
  return text
    .replace(
      /BOOKING_PAYLOAD[\s\S]*?END_BOOKING_PAYLOAD/gi,
      ""
    )
    .split("\n")
    .filter((line) => {
      const clean = line.trim();

      const hiddenCommands = [
        "OPEN_BOOKINGS",
        "OPEN_HOME",
        "OPEN_BARBER_PORTAL",
        "OPEN_SALON_PORTAL",
        "OPEN_HAIRSTYLE_ADVISOR",
        "BOOKING_INTENT",
      ];

      return !hiddenCommands.includes(clean);
    })
    .join("\n")
    .trim();
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

function formatDateKey(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeBookingDate(
  value: string
) {
  const normalized =
    value.toLowerCase().trim();

  if (normalized === "today") {
    return formatDateKey(
      new Date()
    );
  }

  if (normalized === "tomorrow") {
    const tomorrow = new Date();

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    return formatDateKey(
      tomorrow
    );
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      normalized
    )
  ) {
    return normalized;
  }

  return "";
}

function normalizeBookingTime(
  value: string
) {
  const normalized =
    value.trim().toLowerCase();

  const twentyFourHour =
    normalized.match(
      /^(\d{1,2}):(\d{2})$/
    );

  if (twentyFourHour) {
    const hour =
      Number(twentyFourHour[1]);

    const minute =
      Number(twentyFourHour[2]);

    if (
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      return `${String(hour).padStart(
        2,
        "0"
      )}:${String(minute).padStart(
        2,
        "0"
      )}`;
    }
  }

  const twelveHour =
    normalized.match(
      /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/
    );

  if (twelveHour) {
    let hour =
      Number(twelveHour[1]);

    const minute =
      Number(
        twelveHour[2] ?? "0"
      );

    const period =
      twelveHour[3];

    if (
      hour < 1 ||
      hour > 12 ||
      minute < 0 ||
      minute > 59
    ) {
      return "";
    }

    if (
      period === "pm" &&
      hour !== 12
    ) {
      hour += 12;
    }

    if (
      period === "am" &&
      hour === 12
    ) {
      hour = 0;
    }

    return `${String(hour).padStart(
      2,
      "0"
    )}:${String(minute).padStart(
      2,
      "0"
    )}`;
  }

  return "";
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
    imagePurpose,
    setImagePurpose,
  ] = useState<"chat" | "hairstyle">("chat");

  const [
    detectedHairstyleProfile,
    setDetectedHairstyleProfile,
  ] = useState<Partial<HairstyleProfile> | null>(null);

  const [
    selectedStylingEffort,
    setSelectedStylingEffort,
  ] = useState<StylingEffort>("unknown");

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
    _originalQuery: string
  ) {
    //--------------------------------------------------
    // AI booking payload
    //--------------------------------------------------

    if (replyText.includes("BOOKING_PAYLOAD")) {
      const payloadMatch = replyText.match(
        /BOOKING_PAYLOAD([\s\S]*?)END_BOOKING_PAYLOAD/i
      );

      if (!payloadMatch) {
        console.error(
          "BOOKING_PAYLOAD markers were found, but the payload could not be parsed.",
          replyText
        );

        return false;
      }

      const payloadText = payloadMatch[1];

      function getPayloadValue(key: string) {
        const pattern = new RegExp(
          `${key}=([^\n\r]+)`,
          "i"
        );

        const match = payloadText.match(pattern);

        return match?.[1]?.trim() ?? "";
      }

      const barberId = getPayloadValue("barberId");
      const serviceId = getPayloadValue("serviceId");
      const rawDate =
        getPayloadValue("date");

      const rawTime =
        getPayloadValue("time");

      const date =
        normalizeBookingDate(
          rawDate
        );

      const time =
        normalizeBookingTime(
          rawTime
        );

      console.log("PARSED BOOKING PAYLOAD:", {
        barberId,
        serviceId,
        rawDate,
        date,
        rawTime,
        time,
      });

      const validDate =
        Boolean(date);

      const validTime =
        Boolean(time);

      if (
        !barberId ||
        !serviceId ||
        !validDate ||
        !validTime
      ) {
        console.warn("Invalid booking payload:", {
          barberId,
          serviceId,
          rawDate,
          date,
          rawTime,
          time,
          rawPayload: payloadText,
        });


        return false;
      }

      const searchParams = new URLSearchParams({
        barberId,
        serviceId,
        date,
        time,
      });

      window.setTimeout(() => {
        router.push(`/book?${searchParams.toString()}`);
        setOpen(false);
      }, 900);

      return true;
    }

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

    if (replyText.includes("OPEN_BARBER_PORTAL")) {
      window.setTimeout(() => {
        router.push("/portal/barber");
        setOpen(false);
      }, 650);

      return true;
    }

    if (replyText.includes("OPEN_SALON_PORTAL")) {
      window.setTimeout(() => {
        router.push("/portal/salon");
        setOpen(false);
      }, 650);

      return true;
    }

    // Hairstyle requests stay inside the chat so the
    // user can choose how they want to start.
    if (
      replyText.includes(
        "OPEN_HAIRSTYLE_ADVISOR"
      )
    ) {
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
            "How would you like to continue?",
          createdAt:
            new Date().toISOString(),
          showHairstyleActions:
            isHairstyleAdvisorRequest(trimmed) ||
            replyText.includes(
              "OPEN_HAIRSTYLE_ADVISOR"
            ),
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
                  "How would you like to continue?",
                showHairstyleActions:
                  isHairstyleAdvisorRequest(trimmed) ||
                  streamedText.includes(
                    "OPEN_HAIRSTYLE_ADVISOR"
                  ),
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
          removeAssistantCommands(fallback) ||
          "Something went wrong. Please try again.",
        createdAt:
          new Date().toISOString(),
        showHairstyleActions:
          isHairstyleAdvisorRequest(trimmed) ||
          fallback.includes(
            "OPEN_HAIRSTYLE_ADVISOR"
          ),
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

  function startHairstylePhotoFlow() {
    setImagePurpose("hairstyle");
    setInput("");
    fileInputRef.current?.click();
  }

  function startHairstyleManualFlow() {
    router.push(
      "/hairstyle-advisor?mode=manual"
    );

    setOpen(false);
  }

  function openFullHairstyleAdvisor() {
    router.push(
      "/hairstyle-advisor"
    );

    setOpen(false);
  }

  async function analyseHairstylePhoto(
    imageDataUrl: string
  ) {
    const analysingId = uid("bot");

    setIsTyping(true);

    setMessages((previous) => [
      ...previous,
      {
        id: analysingId,
        role: "bot",
        text:
          "✨ I’m analysing your face shape and hair characteristics...",
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const response = await fetch(
        "/api/hairstyle-advisor",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: imageDataUrl,
          }),
        }
      );

      const analysis = await response.json();

      if (!response.ok) {
        throw new Error(
          analysis?.error ??
            "The photo could not be analysed."
        );
      }

      const confidence =
        typeof analysis?.confidence === "number"
          ? Math.round(analysis.confidence * 100)
          : null;

      const detectedProfile: Partial<HairstyleProfile> = {
        faceShape: (analysis.faceShape ?? "unknown") as FaceShape,
        hairTexture: (analysis.hairTexture ?? "unknown") as HairTexture,
        hairThickness: (analysis.hairThickness ?? "unknown") as HairThickness,
        hairCondition: (analysis.hairCondition ?? "unknown") as HairCondition,
        currentLength: (analysis.currentLength ?? "unknown") as HairLength,
        facialHair: (analysis.facialHair ?? "unknown") as FacialHair,
      };

      setDetectedHairstyleProfile(detectedProfile);
      setSelectedStylingEffort("unknown");

      const resultText = [
        "✨ **Photo analysis complete**",
        "",
        `**Face shape:** ${analysis.faceShape ?? "Not detected"}`,
        `**Hair texture:** ${analysis.hairTexture ?? "Not detected"}`,
        `**Hair thickness:** ${analysis.hairThickness ?? "Not detected"}`,
        `**Hair condition:** ${analysis.hairCondition ?? "Not detected"}`,
        `**Current length:** ${analysis.currentLength ?? "Not detected"}`,
        `**Facial hair:** ${analysis.facialHair ?? "Not detected"}`,
        `**Hairline:** ${analysis.hairline ?? "Not detected"}`,
        ...(confidence !== null
          ? ["", `**Analysis confidence:** ${confidence}%`]
          : []),
        "",
        "I only need two more preferences to calculate your top hairstyle matches.",
        "",
        "**How much time do you want to spend styling your hair?**",
      ].join("\n");

      setMessages((previous) =>
        previous.map((message) =>
          message.id === analysingId
            ? {
                ...message,
                text: resultText,
                showStylingEffortActions: true,
                showPhotoAnalysisActions: false,
              }
            : message
        )
      );
    } catch (error) {
      console.error(
        "Hairstyle photo analysis failed:",
        error
      );

      setMessages((previous) =>
        previous.map((message) =>
          message.id === analysingId
            ? {
                ...message,
                text:
                  "I couldn’t analyse that photo. Please try another clear front-facing photo, or continue with the manual hairstyle consultation.",
                showPhotoAnalysisActions: true,
              }
            : message
        )
      );
    } finally {
      setIsTyping(false);
      setImagePurpose("chat");
    }
  }

  function chooseStylingEffort(
    value: StylingEffort,
    label: string
  ) {
    setSelectedStylingEffort(value);

    setMessages((previous) => [
      ...previous.map((message) => ({
        ...message,
        showStylingEffortActions: false,
      })),
      {
        id: uid("user"),
        role: "user",
        text: `Styling effort: ${label}`,
        createdAt: new Date().toISOString(),
      },
      {
        id: uid("bot"),
        role: "bot",
        text: [
          "Great. One last preference.",
          "",
          "**What kind of overall look do you prefer?**",
        ].join("\n"),
        createdAt: new Date().toISOString(),
        showPreferredLookActions: true,
      },
    ]);
  }

  function choosePreferredLook(
    value: PreferredLook,
    label: string
  ) {
    if (!detectedHairstyleProfile) {
      setMessages((previous) => [
        ...previous,
        {
          id: uid("bot"),
          role: "bot",
          text:
            "I no longer have the photo analysis in this session. Please upload the photo again.",
          createdAt: new Date().toISOString(),
          showHairstyleActions: true,
        },
      ]);
      return;
    }

    const profile: HairstyleProfile = {
      faceShape:
        (detectedHairstyleProfile.faceShape as FaceShape) ?? "unknown",
      hairTexture:
        (detectedHairstyleProfile.hairTexture as HairTexture) ?? "unknown",
      hairThickness:
        (detectedHairstyleProfile.hairThickness as HairThickness) ?? "unknown",
      hairCondition:
        (detectedHairstyleProfile.hairCondition as HairCondition) ?? "unknown",
      currentLength:
        (detectedHairstyleProfile.currentLength as HairLength) ?? "unknown",
      stylingEffort: selectedStylingEffort,
      preferredLook: value,
      facialHair:
        (detectedHairstyleProfile.facialHair as FacialHair) ?? "unknown",
    };

    const recommendations =
      getHairstyleRecommendations(profile, 3);

    const summary = recommendations
      .map(
        (recommendation, index) =>
          `${index + 1}. **${recommendation.name}** — ${recommendation.matchScore}% match`
      )
      .join("\n");

    setMessages((previous) => [
      ...previous.map((message) => ({
        ...message,
        showPreferredLookActions: false,
      })),
      {
        id: uid("user"),
        role: "user",
        text: `Preferred look: ${label}`,
        createdAt: new Date().toISOString(),
      },
      {
        id: uid("bot"),
        role: "bot",
        text: [
          "✨ **Your top hairstyle matches**",
          "",
          summary,
          "",
          "These recommendations use the same Cutato scoring engine as the full Hairstyle Advisor.",
        ].join("\n"),
        createdAt: new Date().toISOString(),
        recommendations,
      },
    ]);
  }

  function bookRecommendedHairstyle(
    recommendation: HairstyleRecommendation
  ) {
    const searchParams = new URLSearchParams({
      hairstyle: recommendation.name,
      recommendationId: recommendation.id,
    });

    router.push(`/book?${searchParams.toString()}`);
    setOpen(false);
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
    setImagePurpose("chat");
    setDetectedHairstyleProfile(null);
    setSelectedStylingEffort("unknown");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleImageSelection(
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

    if (imagePurpose === "hairstyle") {
      try {
        const imageDataUrl =
          await fileToBase64(file);

        const userMessage: ChatUIMessage = {
          id: uid("user"),
          role: "user",
          text:
            "Use this photo for my hairstyle consultation.",
          imageUrl: imageDataUrl,
          createdAt: new Date().toISOString(),
        };

        setMessages((previous) => [
          ...previous,
          userMessage,
        ]);

        setSelectedImage(null);
        setSelectedImagePreview(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        await analyseHairstylePhoto(
          imageDataUrl
        );
      } catch (error) {
        console.error(
          "Could not prepare hairstyle photo:",
          error
        );

        setImagePurpose("chat");
      }

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

                      {message.showHairstyleActions ? (
                        <div className="mt-4 grid gap-2">
                          <button
                            type="button"
                            onClick={
                              startHairstylePhotoFlow
                            }
                            className="flex w-full items-center gap-3 rounded-2xl border border-[#ff355d]/20 bg-[#ff355d]/5 px-4 py-3 text-left text-sm font-black text-neutral-900 transition hover:border-[#ff355d]/40 hover:bg-[#ff355d]/10"
                          >
                            <ImagePlus
                              size={18}
                              className="text-[#ff355d]"
                            />
                            Upload photo
                          </button>

                          <button
                            type="button"
                            onClick={
                              startHairstyleManualFlow
                            }
                            className="flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-left text-sm font-black text-neutral-900 transition hover:bg-neutral-100"
                          >
                            <Sparkles
                              size={18}
                              className="text-[#ff355d]"
                            />
                            Answer a few questions
                          </button>

                          <button
                            type="button"
                            onClick={
                              openFullHairstyleAdvisor
                            }
                            className="flex w-full items-center justify-between rounded-2xl bg-neutral-950 px-4 py-3 text-left text-sm font-black text-white transition hover:bg-neutral-800"
                          >
                            <span>
                              Open full Hairstyle Advisor
                            </span>

                            <span aria-hidden="true">
                              →
                            </span>
                          </button>
                        </div>
                      ) : null}

                      {message.showPhotoAnalysisActions ? (
                        <div className="mt-4 grid gap-2">
                          <button
                            type="button"
                            onClick={startHairstylePhotoFlow}
                            className="flex w-full items-center gap-3 rounded-2xl border border-[#ff355d]/20 bg-[#ff355d]/5 px-4 py-3 text-left text-sm font-black text-neutral-900 transition hover:border-[#ff355d]/40 hover:bg-[#ff355d]/10"
                          >
                            <ImagePlus
                              size={18}
                              className="text-[#ff355d]"
                            />
                            Try another photo
                          </button>

                          <button
                            type="button"
                            onClick={openFullHairstyleAdvisor}
                            className="flex w-full items-center justify-between rounded-2xl bg-neutral-950 px-4 py-3 text-left text-sm font-black text-white transition hover:bg-neutral-800"
                          >
                            <span>Continue full consultation</span>
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      ) : null}

                      {message.showStylingEffortActions ? (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {[
                            ["none", "No styling"],
                            ["under-5", "Under 5 min"],
                            ["five-to-ten", "5–10 min"],
                            ["high", "10+ min"],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                chooseStylingEffort(
                                  value as StylingEffort,
                                  label
                                )
                              }
                              className="rounded-2xl border border-black/10 bg-neutral-50 px-3 py-3 text-sm font-black text-neutral-900 transition hover:border-[#ff355d]/30 hover:bg-[#ff355d]/10 hover:text-[#ff355d]"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {message.showPreferredLookActions ? (
                        <div className="mt-4 grid gap-2">
                          {[
                            ["professional", "Professional"],
                            ["modern", "Modern"],
                            ["casual", "Casual"],
                            ["bold", "Bold"],
                            ["low-maintenance", "Low maintenance"],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                choosePreferredLook(
                                  value as PreferredLook,
                                  label
                                )
                              }
                              className="flex w-full items-center justify-between rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-left text-sm font-black text-neutral-900 transition hover:border-[#ff355d]/30 hover:bg-[#ff355d]/10 hover:text-[#ff355d]"
                            >
                              <span>{label}</span>
                              <span aria-hidden="true">→</span>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {message.recommendations?.length ? (
                        <div className="mt-4 grid gap-3">
                          {message.recommendations.map(
                            (recommendation, index) => (
                              <div
                                key={recommendation.id}
                                className="overflow-hidden rounded-2xl border border-black/10 bg-neutral-50"
                              >
                                {recommendation.imageUrl ? (
                                  <img
                                    src={recommendation.imageUrl}
                                    alt={recommendation.name}
                                    className="h-32 w-full object-cover"
                                  />
                                ) : null}

                                <div className="p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-xs font-black uppercase tracking-wider text-[#ff355d]">
                                        {index === 0
                                          ? "Best match"
                                          : `Match ${index + 1}`}
                                      </p>
                                      <h4 className="mt-1 text-base font-black">
                                        {recommendation.name}
                                      </h4>
                                    </div>

                                    <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-black text-white">
                                      {recommendation.matchScore}%
                                    </span>
                                  </div>

                                  <p className="mt-2 text-xs leading-5 text-neutral-500">
                                    {recommendation.description}
                                  </p>

                                  {recommendation.whyItSuitsYou[0] ? (
                                    <p className="mt-2 text-xs font-bold leading-5 text-neutral-700">
                                      {recommendation.whyItSuitsYou[0]}
                                    </p>
                                  ) : null}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      bookRecommendedHairstyle(
                                        recommendation
                                      )
                                    }
                                    className="mt-4 w-full rounded-xl bg-[#ff355d] px-4 py-3 text-sm font-black text-white transition hover:bg-[#ff1f4c]"
                                  >
                                    Book this hairstyle
                                  </button>
                                </div>
                              </div>
                            )
                          )}

                          <button
                            type="button"
                            onClick={openFullHairstyleAdvisor}
                            className="flex w-full items-center justify-between rounded-2xl bg-neutral-950 px-4 py-3 text-left text-sm font-black text-white transition hover:bg-neutral-800"
                          >
                            <span>Open full Hairstyle Advisor</span>
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      ) : null}
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
                onClick={() => {
                  setImagePurpose("chat");
                  fileInputRef.current?.click();
                }}
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
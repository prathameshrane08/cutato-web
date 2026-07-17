"use client";

export type ChatRole = "user" | "bot";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
};

export type QuickAction = {
  label: string;
  prompt: string;
};

export type LocalChatReply = {
  text: string;
};

function createId(prefix: string) {
  return `${prefix}_${Math.random()
    .toString(16)
    .slice(2)}_${Date.now().toString(16)}`;
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s:+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(
  text: string,
  phrases: string[]
) {
  return phrases.some((phrase) =>
    text.includes(phrase)
  );
}

function isGreeting(text: string) {
  return includesAny(text, [
    "hello",
    "hey",
    "hii",
    "hi ",
    "good morning",
    "good afternoon",
    "good evening",
  ]);
}

function isBookingRequest(text: string) {
  return includesAny(text, [
    "book appointment",
    "book a haircut",
    "book barber",
    "book now",
    "make a booking",
    "schedule appointment",
    "schedule haircut",
    "i want to book",
    "appointment today",
    "appointment tomorrow",
  ]);
}

function isBookingsPageRequest(text: string) {
  return includesAny(text, [
    "my bookings",
    "show bookings",
    "view bookings",
    "booking history",
    "upcoming booking",
    "upcoming appointment",
  ]);
}

function isCancelRequest(text: string) {
  return includesAny(text, [
    "cancel booking",
    "cancel appointment",
    "delete booking",
  ]);
}

function isRescheduleRequest(text: string) {
  return includesAny(text, [
    "reschedule",
    "change booking time",
    "change appointment",
    "move my booking",
  ]);
}

function isPaymentQuestion(text: string) {
  return includesAny(text, [
    "payment",
    "pay online",
    "pay at salon",
    "card",
    "cash",
    "refund",
  ]);
}

function isServiceQuestion(text: string) {
  return includesAny(text, [
    "services",
    "service available",
    "haircut available",
    "what do you offer",
    "what can i book",
  ]);
}

function isPriceQuestion(text: string) {
  return includesAny(text, [
    "price",
    "cost",
    "how much",
    "cheapest",
    "expensive",
  ]);
}

function isFadeQuestion(text: string) {
  return includesAny(text, [
    "what is a fade",
    "fade haircut",
    "skin fade",
    "taper fade",
  ]);
}

function isImageQuestion(text: string) {
  return includesAny(text, [
    "image",
    "photo",
    "picture",
    "hairstyle recommendation",
    "which haircut suits",
  ]);
}

function isBarberPortalRequest(text: string) {
  return includesAny(text, [
    "barber portal",
    "open barber dashboard",
    "barber dashboard",
  ]);
}

function isSalonPortalRequest(text: string) {
  return includesAny(text, [
    "salon portal",
    "open salon dashboard",
    "salon dashboard",
    "admin portal",
  ]);
}

function isHomeRequest(text: string) {
  return includesAny(text, [
    "go home",
    "open home",
    "show barbers",
    "find barber",
    "browse barbers",
  ]);
}

export function getWelcomeMessage(): ChatMessage {
  return {
    id: createId("bot"),
    role: "bot",
    text:
      "Hi! I’m the Cutato Assistant. I can help you find a barber, understand services, check booking options, and manage appointments.",
    createdAt: new Date().toISOString(),
  };
}

export function getDefaultQuickActions(): QuickAction[] {
  return [
    {
      label: "Show barbers",
      prompt: "show barbers",
    },
    {
      label: "Book appointment",
      prompt: "book an appointment",
    },
    {
      label: "My bookings",
      prompt: "show my bookings",
    },
    {
      label: "Services",
      prompt: "what services are available",
    },
  ];
}

export async function replyToChatTry(
  input: string
): Promise<LocalChatReply | null> {
  const text = normalize(input);

  if (!text) {
    return {
      text: "Please type a question so I can help you.",
    };
  }

  if (isGreeting(text)) {
    return {
      text:
        "Hello! I can help you find a barber, choose a service, or start a booking.",
    };
  }

  if (isBookingsPageRequest(text)) {
    return {
      text:
        "Opening your bookings now.\nOPEN_BOOKINGS",
    };
  }

  if (isBarberPortalRequest(text)) {
    return {
      text:
        "Opening the barber portal.\nOPEN_BARBER_PORTAL",
    };
  }

  if (isSalonPortalRequest(text)) {
    return {
      text:
        "Opening the salon portal.\nOPEN_SALON_PORTAL",
    };
  }

  if (isHomeRequest(text)) {
    return {
      text:
        "Opening the barber list.\nOPEN_HOME",
    };
  }

  if (isBookingRequest(text)) {
    return {
      text:
        "I’ll help you start a booking and select the best available barber, service, date, and time.\nBOOKING_INTENT",
    };
  }

  if (isCancelRequest(text)) {
    return {
      text:
        "Open **My Bookings**, select the appointment, and choose **Cancel booking**. Your booking remains visible until the cancellation is confirmed.\nOPEN_BOOKINGS",
    };
  }

  if (isRescheduleRequest(text)) {
    return {
      text:
        "Open **My Bookings**, choose the appointment, and select **Reschedule** to pick a new date and time.\nOPEN_BOOKINGS",
    };
  }

  if (isPaymentQuestion(text)) {
    return {
      text:
        "Cutato can support online payment or payment at the salon, depending on the booking options shown during checkout. Review the selected method before confirming.",
    };
  }

  if (isFadeQuestion(text)) {
    return {
      text:
        "A **fade haircut** gradually changes from very short hair near the sides and back to longer hair higher up. Common options include low, mid, high, taper, and skin fades.",
    };
  }

  if (isImageQuestion(text)) {
    return {
      text:
        "Upload a clear front or side photo and describe the style you want. The AI image analysis requires an available API connection.",
    };
  }

  if (isServiceQuestion(text)) {
    return {
      text:
        "Cutato commonly includes services such as haircuts, fades, beard trims, haircut-and-beard combinations, colouring, and other barber-specific services. Live availability and prices depend on the selected barber.",
    };
  }

  if (isPriceQuestion(text)) {
    return {
      text:
        "Prices depend on the barber and service. Open a barber profile to see the current service prices, durations, and availability.",
    };
  }

  return null;
}

export function replyToChat(input: string): string {
  const text = normalize(input);

  if (!text) {
    return "Please enter a message.";
  }

  return [
    "I couldn’t reach the online AI service right now.",
    "",
    "You can still use Cutato to:",
    "- browse barbers",
    "- view services and prices",
    "- start a booking",
    "- open your existing bookings",
    "",
    "Try asking **“show barbers”**, **“book an appointment”**, or **“show my bookings.”**",
  ].join("\n");
}
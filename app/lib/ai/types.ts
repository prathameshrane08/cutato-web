export type ChatHistoryMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatRequest = {
  message: string;
  pathname: string;
  history?: ChatHistoryMessage[];
  image?: string | null;
};

export type ToolContext = {
  barbers?: unknown[];
  services?: unknown[];
  bookings?: unknown[];
};

export type AssistantResponse = {
  text: string;

  command?:
    | "OPEN_HOME"
    | "OPEN_BOOKINGS"
    | "OPEN_BARBER_PORTAL"
    | "OPEN_SALON_PORTAL";

  booking?: {
    barber?: string;
    service?: string;
    date?: string;
    time?: string;
  };
};
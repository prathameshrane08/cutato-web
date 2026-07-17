import type { BookingEntities } from "./entities";

export type ConversationIntent =
  | "booking";

export type WaitingFor =
  | "barber"
  | "service"
  | "date"
  | "time";

export type ConversationState = {
  service?: string;
  barber?: string;
  date?: string;
  time?: string;

  activeIntent?: ConversationIntent;
  waitingFor?: WaitingFor;
};

const conversations = new Map<
  string,
  ConversationState
>();

export function getConversationState(
  sessionId: string
): ConversationState {
  return conversations.get(sessionId) ?? {};
}

export function updateConversationState(
  sessionId: string,
  entities: BookingEntities
): ConversationState {
  const current =
    getConversationState(sessionId);

  const updated: ConversationState = {
    ...current,

    service:
      entities.service ??
      current.service,

    barber:
      entities.barber ??
      current.barber,

    date:
      entities.date ??
      current.date,

    time:
      entities.time ??
      current.time,
  };

  conversations.set(
    sessionId,
    updated
  );

  return updated;
}

export function startBookingConversation(
  sessionId: string
): ConversationState {
  const current =
    getConversationState(sessionId);

  const updated: ConversationState = {
    ...current,
    activeIntent: "booking",
  };

  conversations.set(
    sessionId,
    updated
  );

  return updated;
}

export function setConversationWaitingFor(
  sessionId: string,
  waitingFor?: WaitingFor
): ConversationState {
  const current =
    getConversationState(sessionId);

  const updated: ConversationState = {
    ...current,
    waitingFor,
  };

  conversations.set(
    sessionId,
    updated
  );

  return updated;
}

export function isBookingConversationActive(
  sessionId: string
): boolean {
  return (
    getConversationState(sessionId)
      .activeIntent === "booking"
  );
}

export function completeBookingConversation(
  sessionId: string
): void {
  conversations.delete(sessionId);
}

export function clearConversationState(
  sessionId: string
): void {
  conversations.delete(sessionId);
}
"use client";

export type ToastTone = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type Listener = (toast: ToastItem) => void;

const listeners = new Set<Listener>();
let nextId = 1;

function emit(message: unknown, tone: ToastTone) {
  const item: ToastItem = { id: nextId++, message: String(message ?? ""), tone };
  listeners.forEach((listener) => listener(item));
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Non-blocking replacement for window.alert. Rendered by <Toaster /> in the root layout.
export const toast = Object.assign((message: unknown) => emit(message, "info"), {
  success: (message: unknown) => emit(message, "success"),
  error: (message: unknown) => emit(message, "error"),
  info: (message: unknown) => emit(message, "info"),
});

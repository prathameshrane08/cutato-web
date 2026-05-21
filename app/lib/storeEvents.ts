"use client";

const EVENT_NAME = "cutato-store-updated";

export function emitStoreUpdate(key: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: { key, ts: Date.now() },
    })
  );
}

export function subscribeStoreUpdates(
  callback: (info: { key?: string; ts?: number }) => void
) {
  if (typeof window === "undefined") return () => {};

  const customHandler = (event: Event) => {
    const custom = event as CustomEvent<{ key?: string; ts?: number }>;
    callback(custom.detail ?? {});
  };

  const storageHandler = (event: StorageEvent) => {
    callback({
      key: event.key ?? undefined,
      ts: Date.now(),
    });
  };

  window.addEventListener(EVENT_NAME, customHandler);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(EVENT_NAME, customHandler);
    window.removeEventListener("storage", storageHandler);
  };
}
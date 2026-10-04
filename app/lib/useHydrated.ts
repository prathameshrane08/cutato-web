"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// False during SSR and the first client render, true afterwards.
// Use it to gate reads of browser-only state (localStorage) without hydration mismatches.
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

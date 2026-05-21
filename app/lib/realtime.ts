"use client";

import { supabase } from "@/app/lib/supabase";

export function subscribeToBookings(callback: () => void, filter?: string) {
  const channelName = `bookings-${filter || "all"}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

  const config: any = {
    event: "*",
    schema: "public",
    table: "bookings",
  };

  if (filter) {
    config.filter = filter;
  }

  const channel = supabase
    .channel(channelName)
    .on("postgres_changes", config, () => {
      callback();
    });

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
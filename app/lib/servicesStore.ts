"use client";

import { emitStoreUpdate } from "@/app/lib/storeEvents";
import { supabase } from "@/app/lib/supabase";


export type ServiceCategory = "Hair" | "Beard" | "Combo" | "Color" | "Other";

export type Service = {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  basePriceEuro: number;
  description?: string;
  barberIds: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SupabaseService = {
  id: string;
  barber_id: string;

  name: string;
  category: string;

  duration_min: number;
  base_price_euro: number;

  description: string | null;

  active: boolean;
};

const KEY = "cutato_services";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeService(service: Service): Service {
  return {
    id: String(service.id ?? ""),
    name: String(service.name ?? "Service"),
    category: String(service.category ?? "Other"),
    durationMin: Math.max(5, Math.min(240, Number(service.durationMin ?? 30))),
    basePriceEuro: Math.max(0, Math.min(999, Number(service.basePriceEuro ?? 0))),
    description: service.description ? String(service.description) : undefined,
    barberIds: Array.isArray(service.barberIds)
      ? service.barberIds.map((x) => String(x)).filter(Boolean)
      : [],
    active: service.active ?? true,
    createdAt: service.createdAt ? String(service.createdAt) : undefined,
    updatedAt: service.updatedAt ? String(service.updatedAt) : undefined,
  };
}

function mapSupabaseService(row: SupabaseService): Service {
  return normalizeService({
    id: row.id,
    name: row.name,
    category: row.category,
    durationMin: Number(row.duration_min ?? 30),
    basePriceEuro: Number(row.base_price_euro ?? 0),
    description: row.description ?? undefined,
    barberIds: [row.barber_id],
    active: row.active ?? true,
  });
}

function seedServices(): Service[] {
  return [
    {
      id: "haircut",
      name: "Haircut",
      category: "Hair",
      durationMin: 30,
      basePriceEuro: 25,
      barberIds: [],
      active: true,
    },
    {
      id: "fade",
      name: "Fade",
      category: "Hair",
      durationMin: 40,
      basePriceEuro: 30,
      barberIds: [],
      active: true,
    },
    {
      id: "beard",
      name: "Beard Trim",
      category: "Beard",
      durationMin: 20,
      basePriceEuro: 18,
      barberIds: [],
      active: true,
    },
    {
      id: "haircut_beard",
      name: "Haircut + Beard",
      category: "Combo",
      durationMin: 55,
      basePriceEuro: 40,
      barberIds: [],
      active: true,
    },
  ].map(normalizeService);
}

function read(): Service[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  const parsed = safeParse<Service[]>(raw, []);
  return Array.isArray(parsed) ? parsed.map(normalizeService) : [];
}

function write(list: Service[]) {
  if (typeof window === "undefined") return;
  const clean = (list ?? []).map(normalizeService);
  localStorage.setItem(KEY, JSON.stringify(clean));
  emitStoreUpdate(KEY);
}

export function readServices(): Service[] {
  return read();
}

export function readAllServices(): Service[] {
  return read();
}

export function writeAllServices(list: Service[]) {
  write(list);
}

export function addService(service: Service) {
  const now = new Date().toISOString();
  const list = read();
  const next = normalizeService({
    ...service,
    createdAt: service.createdAt ?? now,
    updatedAt: now,
  });
  list.unshift(next);
  write(list);
}

export function updateService(service: Service) {
  const now = new Date().toISOString();
  const list = read().map((s) =>
    s.id === service.id
      ? normalizeService({
          ...service,
          createdAt: service.createdAt ?? s.createdAt ?? now,
          updatedAt: now,
        })
      : s
  );
  write(list);
}

export function deleteService(id: string) {
  const list = read().filter((s) => s.id !== id);
  write(list);
}

export function ensureServicesSeeded(barberIds?: string[]) {
  if (typeof window === "undefined") return;

  const existing = read();
  if (existing.length) return;

  const ids = (barberIds ?? []).filter(Boolean);
  const seeded = seedServices().map((s) => ({
    ...s,
    barberIds: ids.length ? ids.slice(0, Math.min(ids.length, 3)) : [],
  }));

  write(seeded);
}

export function servicesForBarberStore(barberId: string): Service[] {
  return read()
    .filter((s) => s.active)
    .filter((s) => s.barberIds.includes(barberId));
}

export function minServicePriceForBarber(barberId: string): number {
  const list = servicesForBarberStore(barberId);
  if (!list.length) return 0;
  return Math.min(...list.map((s) => Number(s.basePriceEuro) || 0));
}

export function upsertService(next: Service) {
  const all = read();
  const now = new Date().toISOString();
  const normalized = normalizeService({
    ...next,
    createdAt: next.createdAt ?? now,
    updatedAt: now,
  });

  const idx = all.findIndex((s) => s.id === normalized.id);
  if (idx >= 0) {
    all[idx] = normalized;
  } else {
    all.unshift(normalized);
  }

  write(all);
}

export function removeService(id: string) {
  const all = read().filter((s) => s.id !== id);
  write(all);
}

export async function getServicesFromSupabase(includeInactive = false): Promise<Service[]> {
  let query = supabase.from("services").select("*");

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapSupabaseService);
}

export async function upsertServiceToSupabase(service: Service): Promise<void> {
  const rows = service.barberIds.map((barberId) => ({
    id: `${service.id}_${barberId}`,
    barber_id: barberId,
    name: service.name,
    category: service.category,
    duration_min: Number(service.durationMin || 30),
    base_price_euro: Number(service.basePriceEuro || 0),
    description: service.description ?? null,
    active: service.active ?? true,
  }));

  await deleteServiceFromSupabase(service.id);

  if (rows.length === 0) return;

  const { error } = await supabase.from("services").insert(rows);

  if (error) {
    console.error("SUPABASE SERVICE SAVE ERROR:", error.message);
    console.error("SUPABASE SERVICE SAVE DETAILS:", error.details);
    console.error("SERVICE PAYLOAD:", rows);
    throw error;
  }
}

export async function deleteServiceFromSupabase(serviceId: string): Promise<void> {
  const { error } = await supabase
    .from("services")
    .delete()
    .or(`id.eq.${serviceId},id.like.${serviceId}_%`);

  if (error) throw error;
}

export async function getBestServiceForBarberFromSupabase(
  barberId: string,
  query: string
): Promise<Service | null> {
  const services = await getServicesFromSupabase();

  const barberServices = services.filter((s) => s.barberIds.includes(barberId));
  if (!barberServices.length) return null;

  const q = query.toLowerCase();

  const scored = barberServices.map((s) => {
    const hay = `${s.name} ${s.category} ${s.description ?? ""}`.toLowerCase();

    let score = 0;

    if (hay.includes(q)) score += 10;
    if (q.includes("fade") && hay.includes("fade")) score += 8;
    if (q.includes("beard") && hay.includes("beard")) score += 8;
    if (q.includes("combo") && hay.includes("combo")) score += 8;
    if (q.includes("haircut") && hay.includes("hair")) score += 6;
    if (q.includes("cut") && hay.includes("hair")) score += 4;

    return { service: s, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.service.basePriceEuro - b.service.basePriceEuro;
  });

  return scored[0]?.service ?? null;
}
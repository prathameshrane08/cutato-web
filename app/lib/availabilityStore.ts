"use client";

import { emitStoreUpdate } from "@/app/lib/storeEvents";

export type DayName = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type DayRule = {
  open: boolean;
  start: string;
  end: string;
};

export type SalonAvailability = {
  slotStepMin: 30;
  week: Record<DayName, DayRule>;
  updatedAt?: string;
};

export type BarberDayRule = {
  enabled: boolean;
  start: string;
  end: string;
  breakStart?: string;
  breakEnd?: string;
};

export type BarberAvailability = {
  barberId: string;
  week: Record<DayName, BarberDayRule>;
  timeOffDates: string[];
  blocked: Record<string, string[]>;
  updatedAt?: string;
};

const KEY_SALON = "cutato_availability_salon_v1";
const KEY_BARBERS = "cutato_availability_barbers_v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function hmToMin(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

function minToHm(v: number) {
  const h = Math.floor(v / 60);
  const m = v % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function normalizeHm(s: string, fallback: string) {
  if (!/^\d{2}:\d{2}$/.test(String(s ?? ""))) return fallback;
  return s;
}

function normalizeDayRule(rule: DayRule, fallback: DayRule): DayRule {
  return {
    open: rule?.open ?? fallback.open,
    start: normalizeHm(rule?.start, fallback.start),
    end: normalizeHm(rule?.end, fallback.end),
  };
}

function normalizeBarberDayRule(
  rule: BarberDayRule,
  fallback: BarberDayRule
): BarberDayRule {
  return {
    enabled: rule?.enabled ?? fallback.enabled,
    start: normalizeHm(rule?.start, fallback.start),
    end: normalizeHm(rule?.end, fallback.end),
    breakStart: rule?.breakStart ? normalizeHm(rule.breakStart, fallback.breakStart ?? "13:00") : undefined,
    breakEnd: rule?.breakEnd ? normalizeHm(rule.breakEnd, fallback.breakEnd ?? "13:30") : undefined,
  };
}

function weekdayName(date: string): DayName {
  const [y, m, d] = date.split("-").map(Number);
  const jsDay = new Date(y, m - 1, d).getDay();
  return (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as DayName[])[jsDay];
}

function defaultSalonAvailability(): SalonAvailability {
  return {
    slotStepMin: 30,
    week: {
      mon: { open: true, start: "09:00", end: "18:00" },
      tue: { open: true, start: "09:00", end: "18:00" },
      wed: { open: true, start: "09:00", end: "18:00" },
      thu: { open: true, start: "09:00", end: "18:00" },
      fri: { open: true, start: "09:00", end: "19:00" },
      sat: { open: true, start: "10:00", end: "16:00" },
      sun: { open: false, start: "00:00", end: "00:00" },
    },
    updatedAt: new Date().toISOString(),
  };
}

function defaultBarberWeek(): Record<DayName, BarberDayRule> {
  return {
    mon: { enabled: true, start: "09:00", end: "18:00", breakStart: "13:00", breakEnd: "13:30" },
    tue: { enabled: true, start: "09:00", end: "18:00", breakStart: "13:00", breakEnd: "13:30" },
    wed: { enabled: true, start: "09:00", end: "18:00", breakStart: "13:00", breakEnd: "13:30" },
    thu: { enabled: true, start: "09:00", end: "18:00", breakStart: "13:00", breakEnd: "13:30" },
    fri: { enabled: true, start: "09:00", end: "18:00", breakStart: "13:00", breakEnd: "13:30" },
    sat: { enabled: true, start: "10:00", end: "16:00" },
    sun: { enabled: false, start: "10:00", end: "16:00" },
  };
}

function defaultBarberAvailability(barberId: string): BarberAvailability {
  return {
    barberId,
    week: defaultBarberWeek(),
    timeOffDates: [],
    blocked: {},
    updatedAt: new Date().toISOString(),
  };
}

function normalizeSalonAvailability(a: SalonAvailability): SalonAvailability {
  const fallback = defaultSalonAvailability();

  return {
    slotStepMin: 30,
    week: {
      mon: normalizeDayRule(a?.week?.mon, fallback.week.mon),
      tue: normalizeDayRule(a?.week?.tue, fallback.week.tue),
      wed: normalizeDayRule(a?.week?.wed, fallback.week.wed),
      thu: normalizeDayRule(a?.week?.thu, fallback.week.thu),
      fri: normalizeDayRule(a?.week?.fri, fallback.week.fri),
      sat: normalizeDayRule(a?.week?.sat, fallback.week.sat),
      sun: normalizeDayRule(a?.week?.sun, fallback.week.sun),
    },
    updatedAt: a?.updatedAt ? String(a.updatedAt) : fallback.updatedAt,
  };
}

function normalizeBarberAvailability(a: BarberAvailability): BarberAvailability {
  const fallback = defaultBarberAvailability(String(a?.barberId ?? "barber"));

  return {
    barberId: String(a?.barberId ?? fallback.barberId),
    week: {
      mon: normalizeBarberDayRule(a?.week?.mon, fallback.week.mon),
      tue: normalizeBarberDayRule(a?.week?.tue, fallback.week.tue),
      wed: normalizeBarberDayRule(a?.week?.wed, fallback.week.wed),
      thu: normalizeBarberDayRule(a?.week?.thu, fallback.week.thu),
      fri: normalizeBarberDayRule(a?.week?.fri, fallback.week.fri),
      sat: normalizeBarberDayRule(a?.week?.sat, fallback.week.sat),
      sun: normalizeBarberDayRule(a?.week?.sun, fallback.week.sun),
    },
    timeOffDates: Array.isArray(a?.timeOffDates)
      ? a.timeOffDates.map((x) => String(x))
      : [],
    blocked:
      a?.blocked && typeof a.blocked === "object"
        ? Object.fromEntries(
            Object.entries(a.blocked).map(([k, v]) => [
              k,
              Array.isArray(v) ? v.map((x) => String(x)).sort() : [],
            ])
          )
        : {},
    updatedAt: a?.updatedAt ? String(a.updatedAt) : fallback.updatedAt,
  };
}

export function ensureAvailabilitySeeded() {
  if (typeof window === "undefined") return;

  let changed = false;

  if (!safeParse<SalonAvailability>(localStorage.getItem(KEY_SALON))) {
    localStorage.setItem(KEY_SALON, JSON.stringify(defaultSalonAvailability()));
    changed = true;
  }

  if (!safeParse<BarberAvailability[]>(localStorage.getItem(KEY_BARBERS))) {
    localStorage.setItem(KEY_BARBERS, JSON.stringify([]));
    changed = true;
  }

  if (changed) {
    emitStoreUpdate(KEY_SALON);
    emitStoreUpdate(KEY_BARBERS);
  }
}

export function readSalonAvailability(): SalonAvailability {
  if (typeof window === "undefined") return defaultSalonAvailability();
  ensureAvailabilitySeeded();
  return normalizeSalonAvailability(
    safeParse<SalonAvailability>(localStorage.getItem(KEY_SALON)) ??
      defaultSalonAvailability()
  );
}

export function writeSalonAvailability(a: SalonAvailability) {
  if (typeof window === "undefined") return;

  const next = normalizeSalonAvailability({
    ...a,
    updatedAt: new Date().toISOString(),
  });

  localStorage.setItem(KEY_SALON, JSON.stringify(next));
  emitStoreUpdate(KEY_SALON);
}

export function readAllBarberAvailability(): BarberAvailability[] {
  if (typeof window === "undefined") return [];
  ensureAvailabilitySeeded();

  const parsed =
    safeParse<BarberAvailability[]>(localStorage.getItem(KEY_BARBERS)) ?? [];

  return Array.isArray(parsed) ? parsed.map(normalizeBarberAvailability) : [];
}

export function writeAllBarberAvailability(list: BarberAvailability[]) {
  if (typeof window === "undefined") return;

  const clean = (list ?? []).map(normalizeBarberAvailability);
  localStorage.setItem(KEY_BARBERS, JSON.stringify(clean));
  emitStoreUpdate(KEY_BARBERS);
}

export function getBarberAvailability(barberId: string): BarberAvailability {
  const all = readAllBarberAvailability();
  return (
    all.find((x) => x.barberId === barberId) ??
    defaultBarberAvailability(barberId)
  );
}

export function upsertBarberAvailability(av: BarberAvailability) {
  const all = readAllBarberAvailability();
  const idx = all.findIndex((x) => x.barberId === av.barberId);

  const next = normalizeBarberAvailability({
    ...av,
    updatedAt: new Date().toISOString(),
  });

  if (idx >= 0) {
    all[idx] = next;
  } else {
    all.unshift(next);
  }

  writeAllBarberAvailability(all);
  return next;
}

export function updateBarberDayRule(
  barberId: string,
  day: DayName,
  patch: Partial<BarberDayRule>
) {
  const current = getBarberAvailability(barberId);
  return upsertBarberAvailability({
    ...current,
    week: {
      ...current.week,
      [day]: {
        ...current.week[day],
        ...patch,
      },
    },
  });
}

export function addBarberTimeOffDate(barberId: string, date: string) {
  const current = getBarberAvailability(barberId);
  if (current.timeOffDates.includes(date)) return current;

  return upsertBarberAvailability({
    ...current,
    timeOffDates: [date, ...current.timeOffDates].slice(0, 100),
  });
}

export function removeBarberTimeOffDate(barberId: string, date: string) {
  const current = getBarberAvailability(barberId);
  return upsertBarberAvailability({
    ...current,
    timeOffDates: current.timeOffDates.filter((x) => x !== date),
  });
}

export function blockTime(barberId: string, date: string, time: string) {
  const current = getBarberAvailability(barberId);
  const set = new Set(current.blocked[date] ?? []);
  set.add(time);

  return upsertBarberAvailability({
    ...current,
    blocked: {
      ...current.blocked,
      [date]: Array.from(set).sort(),
    },
  });
}

export function unblockTime(barberId: string, date: string, time: string) {
  const current = getBarberAvailability(barberId);
  const set = new Set(current.blocked[date] ?? []);
  set.delete(time);

  return upsertBarberAvailability({
    ...current,
    blocked: {
      ...current.blocked,
      [date]: Array.from(set).sort(),
    },
  });
}

function isInsideBreak(rule: BarberDayRule, startMin: number, durationMin: number) {
  if (!rule.breakStart || !rule.breakEnd) return false;

  const bookingStart = startMin;
  const bookingEnd = startMin + durationMin;
  const breakStart = hmToMin(rule.breakStart);
  const breakEnd = hmToMin(rule.breakEnd);

  return bookingStart < breakEnd && bookingEnd > breakStart;
}

export function generateSlotsForDate(barberId: string, date: string, durationMin = 30) {
  const salon = readSalonAvailability();
  const barber = getBarberAvailability(barberId);
  const day = weekdayName(date);

  if (barber.timeOffDates.includes(date)) return [];

  const salonRule = salon.week[day];
  const barberRule = barber.week[day];

  if (!salonRule?.open) return [];
  if (!barberRule?.enabled) return [];

  const step = salon.slotStepMin || 30;

  const start = Math.max(hmToMin(salonRule.start), hmToMin(barberRule.start));
  const end = Math.min(hmToMin(salonRule.end), hmToMin(barberRule.end));
  const latest = end - durationMin;

  const blocked = new Set(barber.blocked?.[date] ?? []);
  const slots: string[] = [];

  for (let cur = start; cur <= latest; cur += step) {
    if (isInsideBreak(barberRule, cur, durationMin)) continue;

    let ok = true;

    for (let m = 0; m < durationMin; m += step) {
      const t = minToHm(cur + m);
      if (blocked.has(t)) {
        ok = false;
        break;
      }
    }

    if (ok) {
      slots.push(minToHm(cur));
    }
  }

  return slots;
}
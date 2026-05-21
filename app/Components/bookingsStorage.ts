// app/components/bookingsStorage.ts
export type BookingStatus = "confirmed" | "cancelled";

export type Booking = {
  id: string;
  createdAt: string; // ISO
  status: BookingStatus;

  barberId: string;
  barberName: string;

  service: string;
  date: string; // YYYY-MM-DD
  time: string;

  price: number;
};

const KEY = "cutato_bookings_v1";

function safeParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function loadBookings(): Booking[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  const data = safeParse<Booking[]>(raw, []);
  return Array.isArray(data) ? data : [];
}

export function saveBookings(bookings: Booking[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(bookings));
}

export function addBooking(b: Omit<Booking, "id" | "createdAt" | "status">): Booking {
  const bookings = loadBookings();

  const booking: Booking = {
    id: cryptoId(),
    createdAt: new Date().toISOString(),
    status: "confirmed",
    ...b,
  };

  bookings.unshift(booking);
  saveBookings(bookings);
  return booking;
}

export function cancelBooking(id: string) {
  const bookings = loadBookings();
  const updated = bookings.map((b) =>
    b.id === id ? { ...b, status: "cancelled" as const } : b
  );
  saveBookings(updated);
  return updated;
}

export function updateBookingTime(
  id: string,
  patch: { date: string; time: string; price: number }
) {
  const bookings = loadBookings();
  const updated = bookings.map((b) =>
    b.id === id
      ? { ...b, date: patch.date, time: patch.time, price: patch.price }
      : b
  );
  saveBookings(updated);
  return updated;
}

export function hasConfirmedBookingConflict(input: {
  barberId: string;
  date: string;
  time: string;
  excludeId?: string | null;
}) {
  const bookings = loadBookings();
  return bookings.some(
    (b) =>
      b.status === "confirmed" &&
      b.barberId === input.barberId &&
      b.date === input.date &&
      b.time === input.time &&
      (!input.excludeId || b.id !== input.excludeId)
  );
}

export function clearAllBookings() {
  saveBookings([]);
}

function cryptoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `b_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
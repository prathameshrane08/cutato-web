type SlotKey = string; // `${barberId}|${date}|${time}`
type Lock = { bookingId: string; userEmail: string; createdAt: string };

const LOCKS_KEY = "cutato_slot_locks";

function readLocks(): Record<SlotKey, Lock> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(LOCKS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function writeLocks(data: Record<SlotKey, Lock>) {
  localStorage.setItem(LOCKS_KEY, JSON.stringify(data));
}

export function makeSlotKey(barberId: string, date: string, time: string) {
  return `${barberId}|${date}|${time}`;
}

export function isSlotLocked(barberId: string, date: string, time: string) {
  const locks = readLocks();
  return Boolean(locks[makeSlotKey(barberId, date, time)]);
}

export function lockSlot(params: {
  barberId: string;
  date: string;
  time: string;
  bookingId: string;
  userEmail: string;
}) {
  const locks = readLocks();
  const key = makeSlotKey(params.barberId, params.date, params.time);
  locks[key] = { bookingId: params.bookingId, userEmail: params.userEmail, createdAt: new Date().toISOString() };
  writeLocks(locks);
}

export function unlockSlot(params: { barberId: string; date: string; time: string }) {
  const locks = readLocks();
  const key = makeSlotKey(params.barberId, params.date, params.time);
  delete locks[key];
  writeLocks(locks);
}

export function getLocksForBarberDay(barberId: string, date: string) {
  const locks = readLocks();
  const prefix = `${barberId}|${date}|`;
  return Object.keys(locks)
    .filter((k) => k.startsWith(prefix))
    .map((k) => k.slice(prefix.length));
}

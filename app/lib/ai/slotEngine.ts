import {
  timeToMinutes,
  minutesToTime,
} from "./timeUtils";

/**
 * Generate all available 30-minute slots.
 */
export function generateSlots(
  openingTime: string,
  closingTime: string,
  reserved: string[]
): string[] {

  const slots: string[] = [];

  const reservedSet =
    new Set(reserved);

  const start =
    timeToMinutes(openingTime);

  const end =
    timeToMinutes(closingTime);

  for (
    let current = start;
    current < end;
    current += 30
  ) {

    const slot =
      minutesToTime(current);

    if (!reservedSet.has(slot)) {
      slots.push(slot);
    }

  }

  return slots;
}
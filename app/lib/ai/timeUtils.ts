/**
 * Convert "HH:MM" into minutes from midnight.
 * Example: "09:30" -> 570
 */
export function timeToMinutes(
  time: string
): number {

  const [hour, minute] =
    time.split(":").map(Number);

  return hour * 60 + minute;
}

/**
 * Convert minutes into "HH:MM".
 * Example: 570 -> "09:30"
 */
export function minutesToTime(
  minutes: number
): string {

  const hour =
    Math.floor(minutes / 60);

  const minute =
    minutes % 60;

  return (
    String(hour).padStart(2, "0") +
    ":" +
    String(minute).padStart(2, "0")
  );
}

/**
 * Add minutes to a time.
 * Example:
 * 09:30 + 30 -> 10:00
 */
export function addMinutes(
  time: string,
  minutes: number
): string {

  return minutesToTime(
    timeToMinutes(time) + minutes
  );
}
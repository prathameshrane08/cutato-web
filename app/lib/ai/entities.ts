export type BookingEntities = {
  barber?: string;
  service?: string;
  date?: string;
  time?: string;
};

function findFirst(
  text: string,
  values: string[]
) {
  return values.find((value) =>
    text.includes(value.toLowerCase())
  );
}

export function extractBookingEntities(
  message: string,
  barberNames: string[],
  serviceNames: string[]
): BookingEntities {

  const text = message.toLowerCase();

  const result: BookingEntities = {};

  const barber = findFirst(
    text,
    barberNames.map((b) => b.toLowerCase())
  );

  if (barber) {
    result.barber = barber;
  }

  const service = findFirst(
    text,
    serviceNames.map((s) => s.toLowerCase())
  );

  if (service) {
    result.service = service;
  }

  if (text.includes("today")) {
    result.date = "today";
  }

  if (text.includes("tomorrow")) {
    result.date = "tomorrow";
  }

  const timeMatch =
    text.match(/\b([0-2]?\d)(?::([0-5]\d))?\s?(am|pm)?\b/i);

  if (timeMatch) {

    let hour = Number(timeMatch[1]);
    const minute = timeMatch[2] ?? "00";
    const meridiem = timeMatch[3]?.toLowerCase();

    if (meridiem === "pm" && hour < 12) {
      hour += 12;
    }

    if (meridiem === "am" && hour === 12) {
      hour = 0;
    }

    result.time =
      `${String(hour).padStart(2, "0")}:${minute}`;
  }

  return result;
}
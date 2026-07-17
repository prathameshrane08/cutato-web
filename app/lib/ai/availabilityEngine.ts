import {
  getServerBookingsForBarber,
  type AvailabilityBooking,
} from "@/app/lib/bookingsSupabaseServer";

/**
 * Get every active booking for a barber
 * on a specific date.
 */
export async function getBookingsForDate(
  barberId: string,
  date: string
): Promise<AvailabilityBooking[]> {
  const bookings =
    await getServerBookingsForBarber(
      barberId
    );

  return bookings.filter(
    (booking) =>
      booking.date === date &&
      booking.status !== "cancelled"
  );
}

/**
 * Check whether a specific time is free.
 */
export async function isTimeAvailable(
  barberId: string,
  date: string,
  time: string
): Promise<boolean> {
  const reservedTimes =
    await getReservedTimes(
      barberId,
      date
    );

  return !reservedTimes.includes(time);
}

/**
 * Return every reserved time for a
 * barber on a specific date.
 */
export async function getReservedTimes(
  barberId: string,
  date: string
): Promise<string[]> {
  const bookings =
    await getBookingsForDate(
      barberId,
      date
    );

  const reservedTimes: string[] = [];

  for (const booking of bookings) {
    if (
      booking.reservedTimes.length > 0
    ) {
      reservedTimes.push(
        ...booking.reservedTimes
      );

      continue;
    }

    if (booking.time) {
      reservedTimes.push(
        booking.time
      );
    }
  }

  return [...new Set(reservedTimes)];
}
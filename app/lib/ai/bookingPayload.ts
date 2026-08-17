import type { BookingPlan } from "./bookingEngine";

export type BookingPayload = {
  barberId: string;
  barberName: string;

  serviceId: string;
  serviceName: string;

  durationMin: number;
  basePriceEuro: number;

  date: string;
  time: string;
};

export function createBookingPayload(
  plan: BookingPlan
): BookingPayload | null {
  if (
    !plan.barber ||
    !plan.service ||
    !plan.date ||
    !plan.time ||
    !plan.available
  ) {
    return null;
  }

  const durationMin = Number(
    plan.service.duration_min
  );

  const basePriceEuro = Number(
    plan.service.base_price_euro
  );

  if (
    !Number.isFinite(durationMin) ||
    durationMin <= 0
  ) {
    console.error(
      "Invalid service duration:",
      plan.service.duration_min
    );

    return null;
  }

  return {
    barberId: plan.barber.id,
    barberName: plan.barber.name,

    serviceId: plan.service.id,
    serviceName: plan.service.name,

    durationMin,
    basePriceEuro,

    date: plan.date,
    time: plan.time,
  };
}
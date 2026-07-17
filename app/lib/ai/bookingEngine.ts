import {
  AIBarber,
  AIService,
  getCutatoAIContext,
} from "./cutatoData";

import { BookingEntities } from "./entities";

import {
  findBarberByName,
  getBestBarber,
} from "./barberEngine";

import {
  findServiceByName,
  getCheapestService,
  barberOffersService,
} from "./serviceEngine";

import {
  getReservedTimes,
  isTimeAvailable,
} from "./availabilityEngine";

import {
  generateSlots,
} from "./slotEngine";

export type BookingPlan = {
  barber?: AIBarber;
  service?: AIService;

  date?: string;
  time?: string;

  available: boolean;

  availableSlots: string[];

  suggestedSlots: string[];

  confidence: number;

  missing: string[];
};

export async function buildBookingPlan(
  entities: BookingEntities
): Promise<BookingPlan> {

  const { barbers, services } =
    await getCutatoAIContext();

  const missing: string[] = [];

  //--------------------------------------------------
  // Resolve Barber
  //--------------------------------------------------

  let barber: AIBarber | undefined;

  if (entities.barber) {

    barber = findBarberByName(
      barbers,
      entities.barber
    );

    if (!barber) {
      missing.push("barber");
    }

  } else {

    barber = getBestBarber(barbers);

  }

  //--------------------------------------------------
  // Resolve Service
  //--------------------------------------------------

  let service: AIService | undefined;

  if (entities.service) {

    service = findServiceByName(
      services,
      entities.service
    );

    if (!service) {
      missing.push("service");
    }

  } else {

    service = getCheapestService(
      services
    );

  }

  //--------------------------------------------------
  // Validate Barber + Service
  //--------------------------------------------------

  if (
    barber &&
    service &&
    !barberOffersService(
      barber.id,
      service.id,
      services
    )
  ) {

    missing.push("barber");

  }

  //--------------------------------------------------
  // Date
  //--------------------------------------------------

  if (!entities.date) {
    missing.push("date");
  }

  //--------------------------------------------------
  // Time
  //--------------------------------------------------

  if (!entities.time) {
    missing.push("time");
  }

  //--------------------------------------------------
  // Availability
  //--------------------------------------------------

  let available = false;

  let availableSlots: string[] = [];

  let suggestedSlots: string[] = [];

  if (
    barber &&
    entities.date
  ) {

    const reserved =
      await getReservedTimes(
        barber.id,
        entities.date
      );

    availableSlots =
      generateSlots(
        "09:00",
        "18:00",
        reserved
      );

    if (entities.time) {

      available =
        await isTimeAvailable(
          barber.id,
          entities.date,
          entities.time
        );

      if (!available) {

        // Find the closest available slots
        suggestedSlots = availableSlots
          .sort((a, b) => {

            const requested =
              Number(entities.time!.replace(":", ""));

            const first =
              Number(a.replace(":", ""));

            const second =
              Number(b.replace(":", ""));

            return (
              Math.abs(first - requested) -
              Math.abs(second - requested)
            );

          })
          .slice(0, 3);

      }

    }

  }

  //--------------------------------------------------
  // Confidence
  //--------------------------------------------------

  let confidence = 1;

  confidence -= missing.length * 0.2;

  confidence = Math.max(
    confidence,
    0.2
  );

  //--------------------------------------------------
  // Return
  //--------------------------------------------------

  return {

    barber,

    service,

    date: entities.date,

    time: entities.time,

    available,

    availableSlots,

    suggestedSlots,

    confidence,

    missing,

  };

}
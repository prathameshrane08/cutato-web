import {
  getBarbersFromSupabase,
} from "@/app/lib/barbersSupabase";

import {
  getServicesFromSupabase,
} from "@/app/lib/servicesStore";

import {
  getReservedTimesForBarber,
} from "@/app/lib/availabilitySupabase";

import {
  generateSlotsForDate,
} from "@/app/lib/availabilityStore";

export async function getActiveBarbers() {
  const barbers = await getBarbersFromSupabase();

  return barbers.filter((barber) => barber.active);
}

export async function getActiveServices() {
  const services = await getServicesFromSupabase();

  return services.filter((service) => service.active);
}

export async function getCheapestBarber() {
  const [barbers, services] = await Promise.all([
    getActiveBarbers(),
    getActiveServices(),
  ]);

  let cheapest: {
    barber: any;
    service: any;
  } | null = null;

  for (const barber of barbers) {
    const barberServices = services.filter((service) =>
      service.barberIds.includes(barber.id)
    );

    if (!barberServices.length) continue;

    const cheapestService = barberServices.reduce((a, b) =>
      a.basePriceEuro < b.basePriceEuro ? a : b
    );

    if (
      !cheapest ||
      cheapestService.basePriceEuro <
        cheapest.service.basePriceEuro
    ) {
      cheapest = {
        barber,
        service: cheapestService,
      };
    }
  }

  return cheapest;
}

export async function getServicesForBarber(
  barberName: string
) {
  const [barbers, services] = await Promise.all([
    getActiveBarbers(),
    getActiveServices(),
  ]);

  const barber = barbers.find((b) =>
    b.name.toLowerCase().includes(
      barberName.toLowerCase()
    )
  );

  if (!barber) {
    return null;
  }

  return {
    barber,
    services: services.filter((service) =>
      service.barberIds.includes(barber.id)
    ),
  };
}

export async function getAvailableSlots(
  barberId: string,
  date: string,
  duration: number
) {
  const generated = generateSlotsForDate(
    barberId,
    date,
    duration
  );

  const reserved =
    await getReservedTimesForBarber(
      barberId,
      date
    );

  return generated.filter(
    (slot) => !reserved.includes(slot)
  );
}
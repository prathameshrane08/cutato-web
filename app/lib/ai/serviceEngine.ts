import { AIService } from "./cutatoData";

/**
 * Find a service by its name.
 */
export function findServiceByName(
  services: AIService[],
  name: string
): AIService | undefined {

  const search = name.trim().toLowerCase();

  return services.find(
    (service) =>
      service.name.toLowerCase() === search
  );
}

/**
 * Return the cheapest service.
 */
export function getCheapestService(
  services: AIService[]
): AIService | undefined {

  if (services.length === 0) {
    return undefined;
  }

  return [...services].sort(
    (a, b) =>
      a.base_price_euro - b.base_price_euro
  )[0];
}

/**
 * Return all services belonging to a barber.
 */
export function getServicesForBarber(
  services: AIService[],
  barberId: string
): AIService[] {

  return services.filter(
    (service) =>
      service.barber_id === barberId
  );
}

/**
 * Check whether a barber offers a service.
 */
export function barberOffersService(
  barberId: string,
  serviceId: string,
  services: AIService[]
): boolean {

  return services.some(
    (service) =>
      service.barber_id === barberId &&
      service.id === serviceId
  );
}

/**
 * Return every barber offering a service with the given name.
 */
export function getBarbersOfferingService(
  services: AIService[],
  serviceName: string
): string[] {

  const search = serviceName.trim().toLowerCase();

  return services
    .filter(
      (service) =>
        service.name.toLowerCase() === search
    )
    .map((service) => service.barber_id);
}
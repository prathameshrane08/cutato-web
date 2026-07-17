import { AIBarber } from "./cutatoData";

/**
 * Find a barber by their name.
 */
export function findBarberByName(
  barbers: AIBarber[],
  name: string
): AIBarber | undefined {
  const search = name.trim().toLowerCase();

  return barbers.find(
    (barber) =>
      barber.name.toLowerCase() === search
  );
}

/**
 * Return the highest-rated barber.
 * If ratings are equal, use the number of reviews.
 */
export function getBestBarber(
  barbers: AIBarber[]
): AIBarber | undefined {

  if (barbers.length === 0) {
    return undefined;
  }

  return [...barbers].sort((a, b) => {

    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }

    return b.reviews - a.reviews;

  })[0];
}

/**
 * Return the barber closest to the user.
 */
export function getNearestBarber(
  barbers: AIBarber[]
): AIBarber | undefined {

  if (barbers.length === 0) {
    return undefined;
  }

  return [...barbers].sort(
    (a, b) => a.dist_km - b.dist_km
  )[0];
}

/**
 * Find all barbers with a matching speciality.
 */
export function findBarbersBySpeciality(
  barbers: AIBarber[],
  speciality: string
): AIBarber[] {

  const search = speciality.toLowerCase();

  return barbers.filter((barber) =>
    barber.speciality
      ?.toLowerCase()
      .includes(search)
  );
}
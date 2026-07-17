export type Intent =
  | "greeting"
  | "booking"
  | "services"
  | "price"
  | "best_barber"
  | "cheapest"
  | "availability"
  | "barber_search"
  | "cancel_booking"
  | "my_bookings"
  | "image"
  | "unknown";

function has(
  text: string,
  words: string[]
) {
  return words.some((word) =>
    text.includes(word)
  );
}

export function detectIntent(
  message: string
): Intent {

  const text = message.toLowerCase();

  if (
    has(text, [
      "hello",
      "hi",
      "hey",
      "good morning"
    ])
  ) {
    return "greeting";
  }

  if (
    has(text, [
      "book",
      "appointment",
      "reserve"
    ])
  ) {
    return "booking";
  }

  if (
    has(text, [
      "service",
      "services",
      "offer"
    ])
  ) {
    return "services";
  }

  if (
    has(text, [
      "price",
      "cost",
      "how much"
    ])
  ) {
    return "price";
  }

  if (
    has(text, [
      "best barber",
      "highest rated",
      "top barber"
    ])
  ) {
    return "best_barber";
  }

  if (
    has(text, [
      "cheap",
      "cheapest"
    ])
  ) {
    return "cheapest";
  }

  if (
    has(text, [
      "available",
      "availability",
      "slot"
    ])
  ) {
    return "availability";
  }

  if (
    has(text, [
      "near",
      "area",
      "barber"
    ])
  ) {
    return "barber_search";
  }

  if (
    has(text, [
      "cancel"
    ])
  ) {
    return "cancel_booking";
  }

  if (
    has(text, [
      "my booking",
      "bookings"
    ])
  ) {
    return "my_bookings";
  }

  if (
    has(text, [
      "photo",
      "image",
      "picture"
    ])
  ) {
    return "image";
  }

  return "unknown";
}
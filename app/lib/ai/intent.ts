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
  | "hairstyle_advisor"
  | "image"
  | "unknown";

function hasPhrase(
  text: string,
  phrases: string[]
) {
  return phrases.some((phrase) =>
    text.includes(phrase)
  );
}

function hasExactWord(
  text: string,
  words: string[]
) {
  return words.some((word) => {
    const escapedWord =
      word.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    const pattern =
      new RegExp(
        `\\b${escapedWord}\\b`,
        "i"
      );

    return pattern.test(text);
  });
}

export function detectIntent(
  message: string
): Intent {
  const text =
    message
      .toLowerCase()
      .trim();

  //--------------------------------------------------
  // Cancel booking
  //--------------------------------------------------

  if (
    hasExactWord(text, [
      "cancel",
      "delete",
    ])
  ) {
    return "cancel_booking";
  }

  //--------------------------------------------------
  // My bookings
  //--------------------------------------------------

  if (
    hasPhrase(text, [
      "my booking",
      "my bookings",
      "show bookings",
      "view bookings",
    ])
  ) {
    return "my_bookings";
  }

  //--------------------------------------------------
  // Booking
  //--------------------------------------------------

  if (
    hasExactWord(text, [
      "book",
      "booking",
      "appointment",
      "reserve",
      "schedule",
    ])
  ) {
    return "booking";
  }

  //--------------------------------------------------
  // Hairstyle Advisor
  //
  // IMPORTANT:
  // This must come BEFORE image intent.
  //--------------------------------------------------

  if (
    hasPhrase(text, [
      "suggest me a hairstyle",
      "suggest a hairstyle",
      "recommend a hairstyle",
      "recommend me a hairstyle",
      "recommend a haircut",
      "recommend me a haircut",
      "which haircut suits me",
      "which hairstyle suits me",
      "what haircut suits me",
      "what hairstyle suits me",
      "what haircut should i get",
      "what hairstyle should i get",
      "help me choose a hairstyle",
      "help me choose a haircut",
      "find my hairstyle",
      "find me a hairstyle",
      "hairstyle advisor",
      "hair style advisor",
      "hairstyle consultation",
      "hair consultation",
      "analyse my face for hairstyle",
      "analyze my face for hairstyle",
      "which hairstyle is best for me",
      "which haircut is best for me",
    ])
  ) {
    return "hairstyle_advisor";
  }

  //--------------------------------------------------
  // Best barber
  //--------------------------------------------------

  if (
    hasPhrase(text, [
      "best barber",
      "highest rated",
      "top barber",
      "best rated barber",
    ])
  ) {
    return "best_barber";
  }

  //--------------------------------------------------
  // Cheapest
  //--------------------------------------------------

  if (
    hasExactWord(text, [
      "cheap",
      "cheapest",
      "affordable",
    ])
  ) {
    return "cheapest";
  }

  //--------------------------------------------------
  // Price
  //--------------------------------------------------

  if (
    hasPhrase(text, [
      "how much",
      "what does it cost",
    ]) ||
    hasExactWord(text, [
      "price",
      "cost",
      "pricing",
    ])
  ) {
    return "price";
  }

  //--------------------------------------------------
  // Availability
  //--------------------------------------------------

  if (
    hasExactWord(text, [
      "available",
      "availability",
      "slot",
      "slots",
      "free",
    ])
  ) {
    return "availability";
  }

  //--------------------------------------------------
  // Services
  //--------------------------------------------------

  if (
    hasExactWord(text, [
      "service",
      "services",
      "offer",
      "offers",
    ])
  ) {
    return "services";
  }

  //--------------------------------------------------
  // Image
  //
  // General image intent only.
  //--------------------------------------------------

  if (
    hasExactWord(text, [
      "photo",
      "image",
      "picture",
    ])
  ) {
    return "image";
  }

  //--------------------------------------------------
  // Barber search
  //--------------------------------------------------

  if (
    hasExactWord(text, [
      "barber",
      "barbers",
      "near",
      "nearby",
      "area",
    ])
  ) {
    return "barber_search";
  }

  //--------------------------------------------------
  // Greeting
  //--------------------------------------------------

  if (
    hasPhrase(text, [
      "good morning",
      "good afternoon",
      "good evening",
    ]) ||
    hasExactWord(text, [
      "hello",
      "hi",
      "hey",
    ])
  ) {
    return "greeting";
  }

  return "unknown";
}
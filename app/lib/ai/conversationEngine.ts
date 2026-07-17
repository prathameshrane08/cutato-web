import { BookingPlan } from "./bookingEngine";

function formatTime(time: string): string {
  const [hourString, minute] = time.split(":");

  let hour = Number(hourString);

  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;

  if (hour === 0) {
    hour = 12;
  }

  return `${hour}:${minute} ${suffix}`;
}

export function buildConversationReply(
  plan: BookingPlan
): string {

  //--------------------------------------------------
  // Missing Information
  //--------------------------------------------------

  if (plan.missing.includes("service")) {
    return "Sure! Which service would you like to book?";
  }

  if (plan.missing.includes("barber")) {
    return "Great! Which barber would you like?";
  }

  if (plan.missing.includes("date")) {
    return "Which day would you like to book?";
  }

  if (plan.missing.includes("time")) {
    return "What time would you prefer?";
  }

  //--------------------------------------------------
  // Availability
  //--------------------------------------------------

  if (!plan.available) {

    let message =
      `Unfortunately ${plan.barber?.name ?? "the barber"} is unavailable at ${formatTime(plan.time!)}.\n\n`;

    if (plan.suggestedSlots.length > 0) {

      message += "Here are the closest available times:\n\n";

      for (const slot of plan.suggestedSlots) {
        message += `• ${formatTime(slot)}\n`;
      }

      message += "\nWhich one would you like?";
    } else {

      message +=
        "There are no available slots for this day. Please choose another day.";

    }

    return message;

  }

  //--------------------------------------------------
  // Booking Summary
  //--------------------------------------------------

  return `
Perfect! Here's your booking:

💈 Barber: ${plan.barber?.name}

✂️ Service: ${plan.service?.name}

📅 Date: ${plan.date}

🕒 Time: ${formatTime(plan.time!)}

Everything looks good.

I'll prepare your booking now.
`.trim();

}
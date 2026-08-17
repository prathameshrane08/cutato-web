import { detectIntent } from "./intent";
import { getCutatoAIContext } from "./cutatoData";
import { extractBookingEntities } from "./entities";

import { buildBookingPlan } from "./bookingEngine";
import { buildConversationReply } from "./conversationEngine";

import {
  updateConversationState,
  startBookingConversation,
  setConversationWaitingFor,
  isBookingConversationActive,
  completeBookingConversation,
} from "./coversationState";

import {
  BookingPayload,
  createBookingPayload,
} from "./bookingPayload";

export type LocalAssistantReply = {
  handled: boolean;
  text: string;
  bookingPayload?: BookingPayload;
};

export async function runLocalAssistant(
  message: string,
  sessionId = "default-session"
): Promise<LocalAssistantReply> {
  let intent = detectIntent(message);

  if (
    isBookingConversationActive(sessionId)
  ) {
    intent = "booking";
  }

  console.log("Detected intent:", intent);

  const {
    barbers,
    services,
  } = await getCutatoAIContext();

  switch (intent) {
    //--------------------------------------------------
    // Hairstyle Advisor
    //--------------------------------------------------

    case "hairstyle_advisor":
      return {
        handled: true,
        text: [
          "✨ I can help you find a hairstyle that suits you.",
          "",
          "Cutato's Hairstyle Advisor looks at things such as:",
          "",
          "• face shape",
          "• hair texture",
          "• hair thickness",
          "• current hair length",
          "• hair condition",
          "• styling preference",
          "• facial hair",
          "",
          "You can either upload a photo for AI-assisted analysis or answer a few simple questions manually.",
          "",
          "How would you like to start?",
        ].join("\n"),
      };

    //--------------------------------------------------
    // Booking
    //--------------------------------------------------

    case "booking": {
      startBookingConversation(sessionId);

      console.log(
        "Booking case reached"
      );

      const entities =
        extractBookingEntities(
          message,
          barbers.map(
            (barber) => barber.name
          ),
          services.map(
            (service) => service.name
          )
        );

      const mergedEntities =
        updateConversationState(
          sessionId,
          entities
        );

      const bookingPlan =
        await buildBookingPlan(
          mergedEntities
        );

      if (
        bookingPlan.missing.includes(
          "barber"
        )
      ) {
        setConversationWaitingFor(
          sessionId,
          "barber"
        );
      } else if (
        bookingPlan.missing.includes(
          "service"
        )
      ) {
        setConversationWaitingFor(
          sessionId,
          "service"
        );
      } else if (
        bookingPlan.missing.includes(
          "date"
        )
      ) {
        setConversationWaitingFor(
          sessionId,
          "date"
        );
      } else if (
        bookingPlan.missing.includes(
          "time"
        )
      ) {
        setConversationWaitingFor(
          sessionId,
          "time"
        );
      } else {
        completeBookingConversation(
          sessionId
        );
      }

      const bookingPayload =
        createBookingPayload(
          bookingPlan
        );

      const conversationReply =
        buildConversationReply(
          bookingPlan
        );

      if (!bookingPayload) {
        return {
          handled: true,
          text: conversationReply,
        };
      }

      const bookingCommand = `
BOOKING_PAYLOAD
barberId=${bookingPayload.barberId}
barberName=${bookingPayload.barberName}
serviceId=${bookingPayload.serviceId}
serviceName=${bookingPayload.serviceName}
date=${bookingPayload.date}
time=${bookingPayload.time}
durationMin=${bookingPayload.durationMin}
basePriceEuro=${bookingPayload.basePriceEuro}
END_BOOKING_PAYLOAD
      `.trim();

      return {
        handled: true,
        text:
          `${conversationReply}\n\n${bookingCommand}`,
        bookingPayload,
      };
    }

    //--------------------------------------------------
    // Greeting
    //--------------------------------------------------

    case "greeting":
      return {
        handled: true,
        text:
          "Hello! 👋 I'm Cutato Assistant. I can help you find barbers, choose a hairstyle, compare services, answer pricing questions, and book your next appointment.",
      };

    //--------------------------------------------------
    // Services
    //--------------------------------------------------

    case "services": {
      if (!services.length) {
        return {
          handled: true,
          text:
            "There are currently no active services.",
        };
      }

      const uniqueServices = [
        ...new Set(
          services.map(
            (service) => service.name
          )
        ),
      ];

      return {
        handled: true,
        text:
          `We currently offer:\n\n• ${uniqueServices.join(
            "\n• "
          )}`,
      };
    }

    //--------------------------------------------------
    // Best Barber
    //--------------------------------------------------

    case "best_barber": {
      if (!barbers.length) {
        return {
          handled: true,
          text:
            "No active barbers were found.",
        };
      }

      const bestBarber = [
        ...barbers,
      ].sort(
        (first, second) => {
          if (
            second.rating !==
            first.rating
          ) {
            return (
              second.rating -
              first.rating
            );
          }

          return (
            second.reviews -
            first.reviews
          );
        }
      )[0];

      return {
        handled: true,
        text:
`${bestBarber.name} is currently our highest-rated barber.

⭐ Rating: ${bestBarber.rating}
📝 Reviews: ${bestBarber.reviews}
📍 Area: ${bestBarber.area}

${bestBarber.tagline ?? ""}`.trim(),
      };
    }

    //--------------------------------------------------
    // Cheapest Service
    //--------------------------------------------------

    case "cheapest": {
      if (!services.length) {
        return {
          handled: true,
          text:
            "No services were found.",
        };
      }

      const cheapestService = [
        ...services,
      ].sort(
        (first, second) =>
          first.base_price_euro -
          second.base_price_euro
      )[0];

      return {
        handled: true,
        text:
`${cheapestService.name} is currently the cheapest service.

💶 Price: €${cheapestService.base_price_euro}
⏱ Duration: ${cheapestService.duration_min} minutes`,
      };
    }

    //--------------------------------------------------
    // Price
    //--------------------------------------------------

    case "price": {
      const normalizedMessage =
        message.toLowerCase();

      const matchingService =
        services.find(
          (service) =>
            normalizedMessage.includes(
              service.name.toLowerCase()
            )
        );

      if (!matchingService) {
        return {
          handled: false,
          text: "",
        };
      }

      return {
        handled: true,
        text:
`${matchingService.name}

💶 €${matchingService.base_price_euro}
⏱ ${matchingService.duration_min} minutes

${matchingService.description ?? ""}`.trim(),
      };
    }

    //--------------------------------------------------
    // Image
    //--------------------------------------------------

    case "image":
      return {
        handled: false,
        text: "",
      };

    //--------------------------------------------------
    // Default
    //--------------------------------------------------

    default:
      return {
        handled: false,
        text: "",
      };
  }
}
import { buildCutatoSystemPrompt } from "@/app/lib/ai/prompts";
import {
  getCutatoAIContext,
  type AIBarber,
  type AIService,
} from "@/app/lib/ai/cutatoData";

export const runtime = "edge";

type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildDatabaseContext(
  barbers: AIBarber[],
  services: AIService[]
) {
  if (!barbers.length) {
    return [
      "CUTATO DATABASE INFORMATION",
      "",
      "No active barbers are currently available.",
    ].join("\n");
  }

  const barberSections = barbers.map(
    (barber) => {
      const barberServices =
        services.filter(
          (service) =>
            service.barber_id === barber.id
        );

      const serviceText =
        barberServices.length > 0
          ? barberServices
              .map((service) => {
                return [
                  `- ${service.name}`,
                  `category: ${service.category}`,
                  `price: €${service.base_price_euro}`,
                  `duration: ${service.duration_min} minutes`,
                  service.description
                    ? `description: ${service.description}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(", ");
              })
              .join("\n")
          : "- No active services listed";

      return [
        `BARBER: ${barber.name}`,
        `ID: ${barber.id}`,
        `Area: ${barber.area}`,
        `Address: ${barber.address}`,
        `Distance: ${barber.dist_km} km`,
        `Rating: ${barber.rating}`,
        `Reviews: ${barber.reviews}`,
        `Speciality: ${
          barber.speciality ??
          "Not specified"
        }`,
        `Tagline: ${
          barber.tagline ?? "Not specified"
        }`,
        "Services:",
        serviceText,
      ].join("\n");
    }
  );

  return [
    "CUTATO DATABASE INFORMATION",
    "",
    "Use only this information when answering questions about Cutato barbers, services, ratings, durations, locations, or prices.",
    "Never invent missing database information.",
    "",
    ...barberSections,
  ].join("\n\n");
}

function textResponse(text: string, status = 200) {
  return new Response(text, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

function fallbackReply(message: string) {
  const normalizedMessage = message.toLowerCase().trim();

  if (
    normalizedMessage.includes("barber portal") ||
    normalizedMessage.includes("barber dashboard") ||
    normalizedMessage.includes("barber login")
  ) {
    return "OPEN_BARBER_PORTAL\nOpening the barber portal.";
  }

  if (
    normalizedMessage.includes("salon portal") ||
    normalizedMessage.includes("salon dashboard") ||
    normalizedMessage.includes("salon login")
  ) {
    return "OPEN_SALON_PORTAL\nOpening the salon portal.";
  }

  if (
    normalizedMessage.includes("my bookings") ||
    normalizedMessage.includes("my booking") ||
    normalizedMessage.includes("show bookings") ||
    normalizedMessage.includes("open bookings")
  ) {
    return "OPEN_BOOKINGS\nOpening your bookings.";
  }

  const hasBookingAction =
    normalizedMessage.includes("book a") ||
    normalizedMessage.includes("book an") ||
    normalizedMessage.includes("make an appointment") ||
    normalizedMessage.includes("schedule an appointment") ||
    normalizedMessage.includes("reserve a");

  if (hasBookingAction) {
    return [
      "BOOKING_INTENT",
      "date=any",
      "time=any",
      "service=any",
      "barber=any",
      "",
      "I can help you start the booking. What service, date, and time would you prefer?",
    ].join("\n");
  }

  if (
    normalizedMessage.includes("cheapest") ||
    normalizedMessage.includes("cheap barber") ||
    normalizedMessage.includes("lowest price")
  ) {
    return "I can compare prices once the active barber and service information is loaded from Cutato.";
  }

  return [
    "The AI service is temporarily unavailable.",
    "",
    "I can still help you open bookings, start a booking, or navigate to the barber and salon portals.",
  ].join("\n");
}

function sanitizeHistory(history: unknown): HistoryMessage[] {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item): item is HistoryMessage => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const message = item as Partial<HistoryMessage>;

      return (
        (message.role === "user" ||
          message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
      );
    })
    .slice(-10);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = String(body?.message ?? "").trim();
    const pathname = String(body?.pathname ?? "/");
    const image =
      typeof body?.image === "string" && body.image.length > 0
        ? body.image
        : null;

    const history = sanitizeHistory(body?.history);
    let databaseContext =
  "Cutato database information could not be loaded.";

try {
  const { barbers, services } =
    await getCutatoAIContext();

  databaseContext =
    buildDatabaseContext(
      barbers,
      services
    );

  console.log(
    `AI context loaded: ${barbers.length} barbers and ${services.length} services`
  );
} catch (databaseError) {
  console.error(
    "AI DATABASE CONTEXT ERROR:",
    databaseError
  );
}

    if (!message && !image) {
      return textResponse(
        "Please enter a message or upload an image.",
        400
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

      console.log(
        "API Key loaded:",
        apiKey ? "YES" : "NO"
      );

    if (!apiKey) {
      console.error("OPENAI_API_KEY is missing.");

      return textResponse(fallbackReply(message));
    }

    const userContent = image
      ? [
          {
            type: "text",
            text: [
              `Current application page: ${pathname}`,
              "",
              "User message:",
              message ||
                "Please analyze this image and provide useful hairstyle or grooming guidance.",
            ].join("\n"),
          },
          {
            type: "image_url",
            image_url: {
              url: image,
            },
          },
        ]
      : [
          `Current application page: ${pathname}`,
          "",
          "User message:",
          message,
        ].join("\n");

    const messages = [
    {
      role: "system",
      content:
        buildCutatoSystemPrompt(pathname),
    },
    {
      role: "system",
      content: databaseContext,
    },
    ...history,
    {
      role: "user",
      content: userContent,
    },
  ];

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          stream: true,
          messages,
        }),
      }
    );

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();

      console.error(
        "OpenAI request failed:",
        openAIResponse.status,
        errorText
      );

      return textResponse(fallbackReply(message));
    }

    if (!openAIResponse.body) {
      console.error("OpenAI response body is empty.");

      return textResponse(fallbackReply(message));
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = openAIResponse.body!.getReader();

        let buffer = "";
        let streamClosed = false;

        const closeStream = () => {
          if (!streamClosed) {
            streamClosed = true;
            controller.close();
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              closeStream();
              break;
            }

            buffer += decoder.decode(value, {
              stream: true,
            });

            const lines = buffer.split("\n");

            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmedLine = line.trim();

              if (!trimmedLine.startsWith("data:")) {
                continue;
              }

              const data = trimmedLine.replace(
                /^data:\s*/,
                ""
              );

              if (data === "[DONE]") {
                closeStream();
                return;
              }

              try {
                const parsed = JSON.parse(data);

                const token =
                  parsed?.choices?.[0]?.delta?.content;

                if (
                  typeof token === "string" &&
                  token.length > 0
                ) {
                  controller.enqueue(
                    encoder.encode(token)
                  );
                }
              } catch (parseError) {
                console.error(
                  "Could not parse streaming data:",
                  parseError
                );
              }
            }
          }
        } catch (streamError) {
          console.error(
            "Error while reading OpenAI stream:",
            streamError
          );

          if (!streamClosed) {
            controller.enqueue(
              encoder.encode(
                "\n\nThe response was interrupted. Please try again."
              )
            );
          }

          closeStream();
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("CHAT ROUTE ERROR:", error);

    return textResponse(
      "Something went wrong while processing your message. Please try again.",
      500
    );
  }
}
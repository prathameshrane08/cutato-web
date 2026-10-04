import OpenAI from "openai";
import { NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/rateLimit";

export const runtime = "nodejs";

type PortalRole = "salon" | "barber";

type PortalContext = {
  role: PortalRole;
  name: string;
  revenue: number;
  bookings: number;
  averageBookingValue: number;
  completionRate: number;
  cancellationRate: number;
  occupancyOrUtilization: number;
  tips?: number;
  topService?: {
    name: string;
    bookings: number;
  } | null;
  topBarber?: {
    name: string;
    revenue: number;
  } | null;
  todayBookings?: number;
  upcomingBookings?: number;
  activeBarbers?: number;
};

type HistoryItem = {
  role: "user" | "assistant";
  content: string;
};

function euro(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value) || 0);
}

function normalizeContext(raw: unknown): PortalContext | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Partial<PortalContext>;

  if (value.role !== "salon" && value.role !== "barber") {
    return null;
  }

  if (typeof value.name !== "string") {
    return null;
  }

  return {
    role: value.role,
    name: value.name,
    revenue: Number(value.revenue) || 0,
    bookings: Number(value.bookings) || 0,
    averageBookingValue: Number(value.averageBookingValue) || 0,
    completionRate: Number(value.completionRate) || 0,
    cancellationRate: Number(value.cancellationRate) || 0,
    occupancyOrUtilization: Number(value.occupancyOrUtilization) || 0,
    tips: Number(value.tips) || 0,
    topService: value.topService ?? null,
    topBarber: value.topBarber ?? null,
    todayBookings: Number(value.todayBookings) || 0,
    upcomingBookings: Number(value.upcomingBookings) || 0,
    activeBarbers: Number(value.activeBarbers) || 0,
  };
}

function sanitizeHistory(raw: unknown): HistoryItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is HistoryItem => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const value = item as Partial<HistoryItem>;

      return (
        (value.role === "user" || value.role === "assistant") &&
        typeof value.content === "string" &&
        value.content.trim().length > 0
      );
    })
    .slice(-8);
}

function contextText(context: PortalContext) {
  const common = [
    `Account type: ${context.role}`,
    `Name: ${context.name}`,
    `Revenue: ${euro(context.revenue)}`,
    `Bookings: ${context.bookings}`,
    `Average booking value: ${euro(context.averageBookingValue)}`,
    `Completion rate: ${context.completionRate}%`,
    `Cancellation/no-show rate: ${context.cancellationRate}%`,
    `${context.role === "salon" ? "Occupancy" : "Utilization"}: ${context.occupancyOrUtilization}%`,
    `Today's bookings: ${context.todayBookings ?? 0}`,
    `Upcoming bookings: ${context.upcomingBookings ?? 0}`,
  ];

  if (context.role === "salon") {
    common.push(`Active barbers: ${context.activeBarbers ?? 0}`);

    if (context.topBarber) {
      common.push(
        `Top barber: ${context.topBarber.name} (${euro(context.topBarber.revenue)} revenue)`
      );
    }
  } else {
    common.push(`Tips: ${euro(context.tips ?? 0)}`);
  }

  if (context.topService) {
    common.push(
      `Top service: ${context.topService.name} (${context.topService.bookings} bookings)`
    );
  }

  return common.join("\n");
}

function localFallback(message: string, context: PortalContext) {
  const q = message.toLowerCase().trim();

  if (q.includes("perform") || q.includes("summary") || q.includes("overview")) {
    return `${context.role === "salon" ? context.name : `You`} generated ${euro(
      context.revenue
    )} from ${
      context.bookings
    } bookings in the currently selected dashboard period. The completion rate is ${
      context.completionRate
    }% and the cancellation/no-show rate is ${context.cancellationRate}%.`;
  }

  if (q.includes("revenue") || q.includes("earn") || q.includes("money")) {
    return `Tracked revenue for the selected period is ${euro(
      context.revenue
    )}. Average booking value is ${euro(context.averageBookingValue)}.`;
  }

  if (q.includes("tip") && context.role === "barber") {
    return `You received ${euro(context.tips ?? 0)} in tips in the selected period.`;
  }

  if (q.includes("top service") || q.includes("popular service") || q.includes("best service")) {
    if (!context.topService) {
      return "There is not enough booking data yet to identify a top service.";
    }

    return `${context.topService.name} is currently the most-booked service with ${context.topService.bookings} booking${
      context.topService.bookings === 1 ? "" : "s"
    }.`;
  }

  if (
    (q.includes("best barber") || q.includes("top barber") || q.includes("performing best")) &&
    context.role === "salon"
  ) {
    if (!context.topBarber) {
      return "There is not enough barber booking data yet to identify a top performer.";
    }

    return `${context.topBarber.name} currently has the highest tracked revenue at ${euro(
      context.topBarber.revenue
    )}.`;
  }

  if (q.includes("today")) {
    return `There ${
      (context.todayBookings ?? 0) === 1 ? "is" : "are"
    } ${context.todayBookings ?? 0} booking${
      (context.todayBookings ?? 0) === 1 ? "" : "s"
    } scheduled today.`;
  }

  if (q.includes("cancel") || q.includes("no-show")) {
    return `The cancellation/no-show rate for the selected period is ${context.cancellationRate}%.`;
  }

  return `For the selected dashboard period: revenue is ${euro(context.revenue)}, bookings are ${
    context.bookings
  }, completion is ${context.completionRate}%, and ${
    context.role === "salon" ? "occupancy" : "utilization"
  } is ${context.occupancyOrUtilization}%.`;
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "portal-assistant", { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json();

    const message = String(body?.message ?? "").trim();

    const context = normalizeContext(body?.context);

    if (!message) {
      return NextResponse.json(
        {
          error: "Message is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!context) {
      return NextResponse.json(
        {
          error: "Valid portal context is required.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    //----------------------------------------------
    // QUOTA/OFFLINE SAFE:
    // The assistant still answers common analytics
    // questions when AI is unavailable.
    //----------------------------------------------

    if (!apiKey) {
      return NextResponse.json({
        text: localFallback(message, context),
        source: "local",
      });
    }

    const openai = new OpenAI({
      apiKey,
    });

    const history = sanitizeHistory(body?.history);

    const roleInstruction =
      context.role === "salon"
        ? `
You are CUTATO Business Assistant for a salon owner.

Help the owner understand their salon analytics and operations.
Focus on revenue, bookings, average booking value, occupancy,
completion, cancellations/no-shows, services and staff performance.
`
        : `
You are CUTATO Barber Assistant for an individual barber.

Help the barber understand their own appointments and performance.
Focus on personal revenue, bookings, average booking value,
utilization, completion, cancellations/no-shows, tips and services.
`;

    const systemPrompt = `
${roleInstruction}

IMPORTANT RULES:
- Use ONLY the portal analytics context below for business numbers.
- Never invent bookings, customers, revenue, staff or services.
- The context represents the currently selected dashboard time range.
- If the context does not contain enough information, say so.
- Keep answers concise and useful for a SaaS dashboard.
- Give operational suggestions only when supported by the numbers.
- Do not claim that you changed a booking, staff member, service,
  payment, availability or setting.
- Currency is EUR.

CURRENT PORTAL ANALYTICS:
${contextText(context)}
      `.trim();

    try {
      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: systemPrompt,
              },
            ],
          },
          ...history.map((item) => ({
            role: item.role,
            content: [
              {
                type: "input_text" as const,
                text: item.content,
              },
            ],
          })),
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: message,
              },
            ],
          },
        ],
      });

      const text = response.output_text?.trim();

      if (!text) {
        return NextResponse.json({
          text: localFallback(message, context),
          source: "local",
        });
      }

      return NextResponse.json({
        text,
        source: "ai",
      });
    } catch (aiError) {
      console.error("PORTAL ASSISTANT AI ERROR:", aiError);

      return NextResponse.json({
        text: localFallback(message, context),
        source: "local",
      });
    }
  } catch (error) {
    console.error("PORTAL ASSISTANT ROUTE ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Portal assistant failed.",
      },
      {
        status: 500,
      }
    );
  }
}

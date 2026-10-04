import { runChatService } from "@/app/lib/ai/ChatServices";
import { rateLimit } from "@/app/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const limited = rateLimit(req, "chat", { limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    return await runChatService(req);
  } catch (error) {
    console.error("CHAT ROUTE ERROR:", error);

    return new Response("Something went wrong while processing your message. Please try again.", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }
}

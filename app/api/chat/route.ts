import { runChatService } from "@/app/lib/ai/ChatServices";

export const runtime = "edge";

export async function POST(
  req: Request
): Promise<Response> {
  console.log("CHAT API ROUTE CALLED");

  try {
    return await runChatService(req);
  } catch (error) {
    console.error(
      "CHAT ROUTE ERROR:",
      error
    );

    return new Response(
      "Something went wrong while processing your message. Please try again.",
      {
        status: 500,
        headers: {
          "Content-Type":
            "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      }
    );
  }
}
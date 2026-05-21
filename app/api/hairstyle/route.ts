import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const image = body?.image;

    if (!image) {
      return NextResponse.json(
        {
          error: "Missing image",
        },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
You are a professional barber consultant.

Analyze the hairstyle image and return ONLY valid JSON.

Do NOT just say "classic" unless the image is truly a classic haircut.
Describe the actual hairstyle clearly for a barber.

Return:
{
  "service": "fade | haircut | beard | haircut_beard | color",
  "style": "specific hairstyle name",
  "barberBrief": "clear instructions a barber can understand",
  "reason": "why this service fits",
  "confidence": 0.0
}

Rules:
- Identify the hairstyle as specifically as possible.
- Mention side length, top length, fade/taper type, texture, beard, color if visible.
- If Cutato does not offer the exact style, recommend the closest available service.
- If the image is unclear, say it needs barber consultation.
- The barberBrief should help reduce communication problems between customer and barber.

Return format:
{
  "service": "fade",
  "reason": "The hairstyle has short blended sides, so a fade service fits best.",
  "style": "Low fade"
}
            `,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this hairstyle image.",
              },
              {
                type: "image_url",
                image_url: {
                  url: image,
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_object",
        },
      }),
    });

    const data = await res.json();

    const text =
      data?.choices?.[0]?.message?.content ??
      `{"service":"haircut","reason":"Default recommendation","style":"classic"}`;

    return NextResponse.json(JSON.parse(text));
  } catch (err) {
    console.error("HAIRSTYLE AI ERROR:", err);

    return NextResponse.json({
      service: "fade",
      reason: "AI could not fully analyze the image, so I recommend starting with a fade or haircut consultation.",
      style: "Fade / haircut consultation",
    });
  }
}
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type HairstyleAnalysis = {
  faceShape: string;
  hairTexture: string;
  hairThickness: string;
  hairCondition: string;
  currentLength: string;
  facialHair: string;
  hairline: string;
  confidence: number;
};

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is missing from your .env.local file.",
        },
        {
          status: 500,
        }
      );
    }

    const body = await request.json();
    const image = body.image;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        {
          error: "No image was provided.",
        },
        {
          status: 400,
        }
      );
    }

    if (!image.startsWith("data:image/")) {
      return NextResponse.json(
        {
          error: "The uploaded file is not a valid image.",
        },
        {
          status: 400,
        }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-4o-mini",

      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `
You are an experienced professional barber and hairstylist.

Analyse only visually observable hairstyle characteristics.

Return only valid JSON with exactly this structure:

{
  "faceShape": "oval",
  "hairTexture": "straight",
  "hairThickness": "medium",
  "hairCondition": "normal",
  "currentLength": "short",
  "facialHair": "clean-shaven",
  "hairline": "normal",
  "confidence": 0.85
}

Allowed faceShape values:
oval, round, square, diamond, heart, oblong

Allowed hairTexture values:
straight, wavy, curly, coily

Allowed hairThickness values:
thin, medium, thick

Allowed hairCondition values:
normal, dry, frizzy, oily, silky

Allowed currentLength values:
very-short, short, medium, long

Allowed facialHair values:
clean-shaven, stubble, short-beard, full-beard, moustache

The confidence value must be between 0 and 1.

Do not include Markdown.
Do not include explanations outside the JSON.
When uncertain, use your best visual estimate and reduce confidence.
              `.trim(),
            },
          ],
        },

        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Analyse the face and hairstyle in this photo.",
            },
            {
              type: "input_image",
              image_url: image,
              detail: "low",
            },
          ],
        },
      ],
    });

    const output = response.output_text.trim();

    if (!output) {
      throw new Error("OpenAI returned an empty response.");
    }

    const cleanedOutput = output
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const analysis = JSON.parse(
      cleanedOutput
    ) as HairstyleAnalysis;

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error("HAIRSTYLE ANALYSIS ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "An unknown error occurred.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
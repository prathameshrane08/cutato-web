import { NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/rateLimit";

export const runtime = "nodejs";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/m4a",
  "audio/x-m4a",
];

export async function POST(request: Request) {
  const limited = rateLimit(request, "transcribe", { limit: 15, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Voice input is temporarily unavailable.",
        },
        {
          status: 500,
        }
      );
    }

    const formData = await request.formData();

    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        {
          error: "No valid audio file was received.",
        },
        {
          status: 400,
        }
      );
    }

    if (audio.size === 0) {
      return NextResponse.json(
        {
          error: "The recorded audio file is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        {
          error: "The audio file is too large. Please record a shorter voice message.",
        },
        {
          status: 413,
        }
      );
    }

    const normalizedType = audio.type.split(";")[0].toLowerCase();

    if (normalizedType && !ALLOWED_AUDIO_TYPES.includes(normalizedType)) {
      return NextResponse.json(
        {
          error: `Unsupported audio format: ${normalizedType}`,
        },
        {
          status: 415,
        }
      );
    }

    const openAIForm = new FormData();

    openAIForm.append("file", audio, audio.name || "voice-message.webm");

    openAIForm.append("model", "gpt-4o-mini-transcribe");

    openAIForm.append("language", "en");

    openAIForm.append(
      "prompt",
      "The audio is from a barber booking assistant. Expect barber names, haircut services, dates, times, prices, and appointment requests."
    );

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openAIForm,
    });

    const raw = await response.text();

    if (!response.ok) {
      console.error("OpenAI transcription error:", raw);

      let detailedError = "Could not transcribe the audio.";

      try {
        const parsed = JSON.parse(raw);

        detailedError = parsed?.error?.message || detailedError;
      } catch {
        if (raw) {
          detailedError = raw;
        }
      }

      return NextResponse.json(
        {
          error: detailedError,
        },
        {
          status: response.status,
        }
      );
    }

    let data: {
      text?: string;
    };

    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          error: "The transcription service returned an invalid response.",
        },
        {
          status: 502,
        }
      );
    }

    const text = String(data.text || "").trim();

    if (!text) {
      return NextResponse.json(
        {
          error: "The audio was accepted, but no speech could be detected.",
        },
        {
          status: 422,
        }
      );
    }

    return NextResponse.json({
      text,
    });
  } catch (error) {
    console.error("TRANSCRIBE ROUTE ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Voice transcription failed.",
      },
      {
        status: 500,
      }
    );
  }
}

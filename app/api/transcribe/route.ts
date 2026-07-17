import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is missing. Add it to .env.local and restart the server.",
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        {
          error: "No valid audio file was received.",
        },
        { status: 400 }
      );
    }

    if (audio.size === 0) {
      return NextResponse.json(
        {
          error: "The recorded audio file is empty.",
        },
        { status: 400 }
      );
    }

    console.log("Received audio:", {
      name: audio.name,
      type: audio.type,
      size: audio.size,
    });

    const openAIForm = new FormData();

    openAIForm.append(
      "file",
      audio,
      audio.name || "voice-message.webm"
    );

    openAIForm.append(
      "model",
      "gpt-4o-mini-transcribe"
    );

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: openAIForm,
      }
    );

    const raw = await response.text();

    console.log(
      "OpenAI transcription status:",
      response.status
    );

    if (!response.ok) {
      console.error(
        "OpenAI transcription error:",
        raw
      );

      let detailedError =
        "Could not transcribe the audio.";

      try {
        const parsed = JSON.parse(raw);

        detailedError =
          parsed?.error?.message ||
          detailedError;
      } catch {
        if (raw) {
          detailedError = raw;
        }
      }

      return NextResponse.json(
        {
          error: detailedError,
        },
        { status: response.status }
      );
    }

    const data = JSON.parse(raw);

    const text = String(
      data?.text || ""
    ).trim();

    if (!text) {
      return NextResponse.json(
        {
          error:
            "The audio was accepted, but no speech could be detected.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text,
    });
  } catch (error) {
    console.error(
      "TRANSCRIBE ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Voice transcription failed.",
      },
      { status: 500 }
    );
  }
}
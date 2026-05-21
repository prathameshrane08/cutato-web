"use client";

import { useState } from "react";
import { Sparkles, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HairstyleAI() {
  const router = useRouter();

  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function onFile(file: File) {
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64 = reader.result as string;

      setPreview(base64);
      setLoading(true);
      setResult(null);

      try {
        const res = await fetch("/api/hairstyle", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: base64,
          }),
        });

        const data = await res.json();

        setResult(data);

        sessionStorage.setItem(
          "cutato_ai_hair_reference",
          JSON.stringify({
            image: base64,
            service: data.service,
            style: data.style,
            barberBrief: data.barberBrief,
            reason: data.reason,
            confidence: data.confidence,
          })
        );
      } catch (err) {
        console.error("Hairstyle AI failed:", err);
        setResult({
          service: "haircut",
          style: "Barber consultation",
          barberBrief:
            "The image could not be analyzed properly. Please discuss the desired haircut with the customer using the reference image.",
          reason: "AI analysis failed, so a general haircut consultation is recommended.",
          confidence: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    reader.readAsDataURL(file);
  }

  function bookRecommended() {
    const service = result?.service || "haircut";
    router.push(`/book-ai?service=${encodeURIComponent(service)}`);
  }

  return (
    <section className="rounded-[34px] border border-black/10 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff355d]/10 text-[#ff355d]">
          <Sparkles />
        </div>

        <div>
          <h2 className="text-2xl font-black">
            AI Hairstyle Recommendation
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Upload a hairstyle reference and AI will create a barber-ready haircut brief.
          </p>
        </div>
      </div>

      <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-black/10 bg-neutral-50 p-10 transition hover:bg-white">
        <Upload className="text-[#ff355d]" size={34} />

        <div className="mt-4 text-center">
          <p className="font-black">Upload hairstyle image</p>
          <p className="mt-1 text-sm text-neutral-500">
            PNG, JPG or WEBP
          </p>
        </div>

        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </label>

      {preview ? (
        <img
          src={preview}
          alt="Uploaded hairstyle reference"
          className="mt-6 h-72 w-full rounded-[28px] object-cover"
        />
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-[24px] bg-neutral-50 p-5 font-black">
          AI is analyzing hairstyle and preparing barber instructions...
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 rounded-[28px] border border-[#ff355d]/20 bg-[#ff355d]/5 p-6">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
            AI Haircut Brief
          </p>

          <h3 className="mt-3 text-3xl font-black">
            {result.style || "Recommended haircut"}
          </h3>

          <p className="mt-3 text-neutral-600">
            {result.reason || "AI created a recommended service for this hairstyle."}
          </p>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[22px] bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
                Recommended service
              </p>
              <p className="mt-2 font-black">
                {result.service || "haircut"}
              </p>
            </div>

            <div className="rounded-[22px] bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
                Brief for barber
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-700">
                {result.barberBrief ||
                  "Use the uploaded reference image and confirm the exact length, sides, top, and finish with the customer."}
              </p>
            </div>

            {typeof result.confidence !== "undefined" ? (
              <div className="rounded-[22px] bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
                  AI confidence
                </p>
                <p className="mt-2 font-black">
                  {Math.round(Number(result.confidence || 0) * 100)}%
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <button
              onClick={bookRecommended}
              className="rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c]"
            >
              Book with this haircut brief
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
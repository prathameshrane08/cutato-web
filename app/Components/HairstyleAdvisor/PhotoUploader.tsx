"use client";

import Image from "next/image";
import { ChangeEvent, useRef, useState } from "react";

type PhotoUploaderProps = {
  onImageSelected: (base64: string) => void;
};

export default function PhotoUploader({
  onImageSelected,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const image = reader.result as string;

      setPreview(image);

      onImageSelected(image);
    };

    reader.readAsDataURL(file);
  }

  return (
    <div className="mx-auto max-w-xl">

      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={openPicker}
        className="flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-neutral-300 bg-white p-10 transition hover:border-black"
      >
        {preview ? (
          <Image
            src={preview}
            alt="Preview"
            width={350}
            height={350}
            className="rounded-2xl object-cover"
          />
        ) : (
          <>
            <div className="text-6xl">📷</div>

            <h2 className="mt-6 text-2xl font-bold">
              Upload your photo
            </h2>

            <p className="mt-3 text-center text-neutral-500">
              Front-facing photo with good lighting works best.
            </p>
          </>
        )}
      </button>
    </div>
  );
}
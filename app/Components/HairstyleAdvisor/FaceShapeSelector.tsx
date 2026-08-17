"use client";

import Image from "next/image";
import { FACE_SHAPES } from "@/app/lib/hairstyleAdvisor/faceShapes";
import { FaceShape } from "@/app/lib/hairstyleAdvisor/types";

type FaceShapeSelectorProps = {
  selected: FaceShape | null;
  onSelect: (shape: FaceShape) => void;
};

export default function FaceShapeSelector({
  selected,
  onSelect,
}: FaceShapeSelectorProps) {
  return (
    <div className="w-full">

      <h2 className="text-3xl font-bold text-center">
        Which face shape looks most like yours?
      </h2>

      <p className="mt-3 text-center text-gray-500">
        Choose the face shape that most closely matches yours.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

        {FACE_SHAPES.map((shape) => {

          const isSelected = selected === shape.id;

          return (

            <button
              key={shape.id}
              onClick={() => onSelect(shape.id)}
              className={`
                rounded-3xl
                border
                p-6
                text-left
                transition-all
                duration-300
                hover:scale-[1.03]
                hover:shadow-xl

                ${
                  isSelected
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-white"
                }
              `}
            >

              <div className="flex justify-center">

                <Image
                  src={shape.image}
                  alt={shape.title}
                  width={120}
                  height={120}
                />

              </div>

              <h3 className="mt-5 text-2xl font-semibold">
                {shape.title}
              </h3>

              <p className="mt-3 text-sm opacity-80">
                {shape.description}
              </p>

              <ul className="mt-5 space-y-2">

                {shape.characteristics.map((item) => (

                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm"
                  >
                    ✓ {item}
                  </li>

                ))}

              </ul>

            </button>

          );

        })}

      </div>

    </div>
  );
}
"use client";

type Option = {
  value: string;
  label: string;
  description: string;
  emoji: string;
};

type QuestionOptionGridProps = {
  title: string;
  subtitle?: string;
  options: Option[];
  selected: string | null;
  onSelect: (value: string) => void;
};

export default function QuestionOptionGrid({
  title,
  subtitle,
  options,
  selected,
  onSelect,
}: QuestionOptionGridProps) {
  return (
    <div className="w-full">

      {/* Title */}

      <div className="text-center mb-10">

        <h2 className="text-3xl font-bold">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-3 text-gray-500">
            {subtitle}
          </p>
        )}

      </div>

      {/* Grid */}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

        {options.map((option) => {

          const active = selected === option.value;

          return (

            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`
                rounded-3xl
                border
                p-6
                text-left
                transition-all
                duration-300

                hover:scale-[1.02]
                hover:shadow-xl

                ${
                  active
                    ? "bg-black text-white border-black"
                    : "bg-white border-gray-200"
                }
              `}
            >

              <div className="text-5xl">
                {option.emoji}
              </div>

              <h3 className="mt-5 text-xl font-semibold">
                {option.label}
              </h3>

              <p className="mt-3 text-sm opacity-80 leading-relaxed">
                {option.description}
              </p>

            </button>

          );

        })}

      </div>

    </div>
  );
}
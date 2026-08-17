import type {
  FacialHair,
  HairCondition,
  HairLength,
  HairTexture,
  HairThickness,
  PreferredLook,
  StylingEffort,
} from "./types";

export type QuestionnaireOption<T extends string> = {
  value: T;
  label: string;
  description: string;
  emoji: string;
};

export const HAIR_TEXTURE_OPTIONS: QuestionnaireOption<HairTexture>[] = [
  {
    value: "straight",
    label: "Straight",
    description: "Your hair falls mostly flat without waves or curls.",
    emoji: "➖",
  },
  {
    value: "wavy",
    label: "Wavy",
    description: "Your hair forms soft bends or an S-shaped pattern.",
    emoji: "〰️",
  },
  {
    value: "curly",
    label: "Curly",
    description: "Your hair forms visible curls or ringlets.",
    emoji: "➰",
  },
  {
    value: "coily",
    label: "Coily",
    description: "Your hair forms tight curls or coils.",
    emoji: "🌀",
  },
  {
    value: "unknown",
    label: "Not sure",
    description: "You are unsure about your natural hair texture.",
    emoji: "❓",
  },
];

export const HAIR_THICKNESS_OPTIONS: QuestionnaireOption<HairThickness>[] = [
  {
    value: "thin",
    label: "Thin",
    description: "Your scalp may be visible and the hair feels lightweight.",
    emoji: "Ⅰ",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Your hair has an average amount of volume and density.",
    emoji: "Ⅱ",
  },
  {
    value: "thick",
    label: "Thick",
    description: "Your hair feels dense, full, and has a lot of volume.",
    emoji: "Ⅲ",
  },
  {
    value: "unknown",
    label: "Not sure",
    description: "You are unsure about your hair thickness.",
    emoji: "❓",
  },
];

export const HAIR_CONDITION_OPTIONS: QuestionnaireOption<HairCondition>[] = [
  {
    value: "silky",
    label: "Silky and smooth",
    description: "Your hair feels soft and is generally easy to manage.",
    emoji: "✨",
  },
  {
    value: "normal",
    label: "Normal",
    description: "Your hair is neither particularly dry nor oily.",
    emoji: "👍",
  },
  {
    value: "dry",
    label: "Dry or rough",
    description: "Your hair often feels coarse or lacks moisture.",
    emoji: "🌵",
  },
  {
    value: "frizzy",
    label: "Frizzy",
    description: "Your hair easily becomes fluffy or difficult to control.",
    emoji: "⚡",
  },
  {
    value: "oily",
    label: "Oily",
    description: "Your hair becomes greasy relatively quickly.",
    emoji: "💧",
  },
  {
    value: "unknown",
    label: "Not sure",
    description: "You are unsure about your current hair condition.",
    emoji: "❓",
  },
];

export const HAIR_LENGTH_OPTIONS: QuestionnaireOption<HairLength>[] = [
  {
    value: "very-short",
    label: "Very short",
    description: "Buzz cut, shaved, or closely cropped hair.",
    emoji: "▪️",
  },
  {
    value: "short",
    label: "Short",
    description: "Usually less than approximately 7 cm.",
    emoji: "✂️",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Long enough for a quiff, fringe, curtains, or side part.",
    emoji: "💇",
  },
  {
    value: "long",
    label: "Long",
    description: "Your hair reaches the ears, neck, or below.",
    emoji: "🧑‍🦱",
  },
  {
    value: "unknown",
    label: "Not sure",
    description: "You are unsure which category your hair length fits.",
    emoji: "❓",
  },
];

export const STYLING_EFFORT_OPTIONS: QuestionnaireOption<StylingEffort>[] = [
  {
    value: "none",
    label: "Almost none",
    description: "You want a haircut that works without daily styling.",
    emoji: "😌",
  },
  {
    value: "under-5",
    label: "Under 5 minutes",
    description: "You are comfortable with very quick daily styling.",
    emoji: "⏱️",
  },
  {
    value: "five-to-ten",
    label: "5–10 minutes",
    description: "You are willing to use a dryer and styling product.",
    emoji: "🪮",
  },
  {
    value: "high",
    label: "I enjoy styling",
    description: "You do not mind spending extra time creating the look.",
    emoji: "🎨",
  },
  {
    value: "unknown",
    label: "Not sure",
    description: "You have not decided how much effort you prefer.",
    emoji: "❓",
  },
];

export const PREFERRED_LOOK_OPTIONS: QuestionnaireOption<PreferredLook>[] = [
  {
    value: "professional",
    label: "Professional",
    description: "Clean and polished for work, university, or interviews.",
    emoji: "💼",
  },
  {
    value: "modern",
    label: "Modern",
    description: "Current, fashionable, and suitable for everyday life.",
    emoji: "🔥",
  },
  {
    value: "casual",
    label: "Casual",
    description: "Relaxed, natural, and easy-going.",
    emoji: "👕",
  },
  {
    value: "bold",
    label: "Bold",
    description: "Distinctive, confident, and attention-grabbing.",
    emoji: "⚡",
  },
  {
    value: "low-maintenance",
    label: "Low maintenance",
    description: "Simple to maintain with minimal daily work.",
    emoji: "🧘",
  },
  {
    value: "unknown",
    label: "Not sure",
    description: "You would like the advisor to choose for you.",
    emoji: "❓",
  },
];

export const FACIAL_HAIR_OPTIONS: QuestionnaireOption<FacialHair>[] = [
  {
    value: "clean-shaven",
    label: "Clean-shaven",
    description: "You currently do not keep facial hair.",
    emoji: "🙂",
  },
  {
    value: "stubble",
    label: "Light stubble",
    description: "You keep short, visible facial hair.",
    emoji: "🧔‍♂️",
  },
  {
    value: "short-beard",
    label: "Short beard",
    description: "You keep a shaped and relatively short beard.",
    emoji: "🧔",
  },
  {
    value: "full-beard",
    label: "Full beard",
    description: "You keep a longer or fuller beard.",
    emoji: "🥸",
  },
  {
    value: "moustache",
    label: "Moustache",
    description: "Your facial hair is focused mainly above the upper lip.",
    emoji: "👨",
  },
  {
    value: "unknown",
    label: "Not sure",
    description: "You would like the advisor to recommend facial hair.",
    emoji: "❓",
  },
];
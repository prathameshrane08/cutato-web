import type {
  FaceShape,
  HairLength,
  HairTexture,
  HairThickness,
  PreferredLook,
  StylingEffort,
} from "./types";

export type HairstyleCategory =
  | "fade"
  | "classic"
  | "modern"
  | "long"
  | "low-maintenance"
  | "curly";

export type Hairstyle = {
  id: string;
  name: string;
  category: HairstyleCategory;
  description: string;
  image: string;

  suitableFaceShapes: FaceShape[];
  suitableHairTextures: HairTexture[];
  suitableHairThickness: HairThickness[];
  suitableHairLengths: HairLength[];
  suitableLooks: PreferredLook[];
  suitableStylingEffort: StylingEffort[];

  maintenance: "low" | "medium" | "high";
  stylingTimeMinutes: number;
  trendScore: number;
  professionalScore: number;

  topLength: string;
  sideInstructions: string;
  backInstructions: string;
  barberInstructions: string;

  beardRecommendation: string;
  stylingProducts: string[];
  stylingSteps: string[];
  avoidIf: string[];
};

export const HAIRSTYLES: Hairstyle[] = [
  {
    id: "low-taper-textured-top",
    name: "Low Taper Fade + Textured Top",
    category: "fade",
    description:
      "A clean low taper combined with natural texture on top. It works for both casual and professional settings.",
    image: "/hairstyles/low-taper-textured-top.webp",

    suitableFaceShapes: [
      "oval",
      "round",
      "square",
      "diamond",
      "heart",
    ],
    suitableHairTextures: ["straight", "wavy", "curly"],
    suitableHairThickness: ["medium", "thick"],
    suitableHairLengths: ["short", "medium"],
    suitableLooks: [
      "professional",
      "modern",
      "casual",
      "low-maintenance",
    ],
    suitableStylingEffort: ["under-5", "five-to-ten"],

    maintenance: "low",
    stylingTimeMinutes: 4,
    trendScore: 98,
    professionalScore: 95,

    topLength:
      "Keep approximately 7–10 cm on top and leave the front slightly longer.",
    sideInstructions:
      "Ask for a low taper starting around guard 0.5, blended gradually into guards 1 and 2.",
    backInstructions:
      "Keep a natural low taper around the neckline with a smooth blend.",
    barberInstructions:
      "I would like a low taper fade with a textured top. Keep around 7–10 cm on top, leave the front slightly longer, and add texture using scissors. Start the taper low around the sideburns and neckline. Please do not take the fade too high.",

    beardRecommendation:
      "Light stubble or a neatly shaped short beard works especially well with this hairstyle.",
    stylingProducts: ["Matte clay", "Sea salt spray"],
    stylingSteps: [
      "Apply sea salt spray to slightly damp hair.",
      "Dry the hair forward or slightly to one side.",
      "Use a small amount of matte clay.",
      "Shape the texture using your fingers.",
    ],
    avoidIf: [
      "You have extremely thin hair on the top.",
      "You do not want regular taper maintenance.",
    ],
  },

  {
    id: "modern-curtains",
    name: "Modern Curtains",
    category: "modern",
    description:
      "A relaxed middle-part hairstyle with soft movement on both sides of the face.",
    image: "/hairstyles/modern-curtains.webp",

    suitableFaceShapes: ["oval", "diamond", "heart", "oblong"],
    suitableHairTextures: ["straight", "wavy"],
    suitableHairThickness: ["medium", "thick"],
    suitableHairLengths: ["medium", "long"],
    suitableLooks: ["modern", "casual"],
    suitableStylingEffort: ["five-to-ten", "high"],

    maintenance: "medium",
    stylingTimeMinutes: 8,
    trendScore: 96,
    professionalScore: 75,

    topLength:
      "Keep approximately 12–18 cm on top with enough length for a natural middle part.",
    sideInstructions:
      "Keep the sides scissor-cut or use a very soft taper without exposing too much skin.",
    backInstructions:
      "Keep some length at the back and blend it naturally into the sides.",
    barberInstructions:
      "I would like modern curtains with a natural middle part. Keep enough length on top for movement, add soft layers, and avoid removing too much weight from the front. Keep the sides natural with a soft taper.",

    beardRecommendation:
      "Clean-shaven, light stubble, or a short beard can all complement this style.",
    stylingProducts: ["Light styling cream", "Sea salt spray"],
    stylingSteps: [
      "Apply sea salt spray to damp hair.",
      "Create a middle or slightly off-centre part.",
      "Blow-dry both sides away from the centre.",
      "Finish with a small amount of lightweight styling cream.",
    ],
    avoidIf: [
      "Your hair is currently very short.",
      "Your hair becomes very oily quickly.",
      "You do not want to spend time styling.",
    ],
  },

  {
    id: "french-crop",
    name: "French Crop",
    category: "low-maintenance",
    description:
      "A short, practical hairstyle with texture on top and a short fringe at the front.",
    image: "/hairstyles/french-crop.webp",

    suitableFaceShapes: ["oval", "round", "square", "oblong"],
    suitableHairTextures: ["straight", "wavy", "curly"],
    suitableHairThickness: ["thin", "medium", "thick"],
    suitableHairLengths: ["very-short", "short"],
    suitableLooks: [
      "professional",
      "modern",
      "casual",
      "low-maintenance",
    ],
    suitableStylingEffort: ["none", "under-5"],

    maintenance: "low",
    stylingTimeMinutes: 2,
    trendScore: 90,
    professionalScore: 90,

    topLength:
      "Keep approximately 3–5 cm on top with visible texture.",
    sideInstructions:
      "Use a low or mid fade, depending on how much contrast you prefer.",
    backInstructions:
      "Blend the back into the fade and keep the neckline clean.",
    barberInstructions:
      "I would like a French crop with approximately 3–5 cm on top. Add texture with scissors and keep a short natural fringe at the front. Use a low fade on the sides and blend the back cleanly.",

    beardRecommendation:
      "Short stubble or a closely trimmed beard gives this haircut a sharper appearance.",
    stylingProducts: ["Matte paste", "Texture powder"],
    stylingSteps: [
      "Dry the hair forward.",
      "Apply a small amount of matte paste or texture powder.",
      "Use your fingers to create separation and texture.",
    ],
    avoidIf: [
      "You want a long, flowing hairstyle.",
      "You strongly prefer slick or shiny styling.",
    ],
  },

  {
    id: "classic-side-part",
    name: "Classic Side Part + Taper",
    category: "classic",
    description:
      "A polished and timeless hairstyle suitable for interviews, university, and professional environments.",
    image: "/hairstyles/classic-side-part.webp",

    suitableFaceShapes: ["oval", "round", "square", "heart"],
    suitableHairTextures: ["straight", "wavy"],
    suitableHairThickness: ["medium", "thick"],
    suitableHairLengths: ["short", "medium"],
    suitableLooks: ["professional", "casual"],
    suitableStylingEffort: ["under-5", "five-to-ten"],

    maintenance: "medium",
    stylingTimeMinutes: 5,
    trendScore: 82,
    professionalScore: 100,

    topLength:
      "Keep approximately 7–10 cm on top with enough length to create a clean side part.",
    sideInstructions:
      "Ask for a classic taper instead of a very high skin fade.",
    backInstructions:
      "Keep the neckline naturally tapered and neatly blended.",
    barberInstructions:
      "I would like a classic side part with a natural taper. Keep approximately 7–10 cm on top, maintain enough weight for the part, and blend the sides gradually. Please keep the finish clean and professional.",

    beardRecommendation:
      "A clean shave, light stubble, or a neatly shaped short beard suits this polished style.",
    stylingProducts: ["Light pomade", "Styling cream"],
    stylingSteps: [
      "Create the side part while the hair is slightly damp.",
      "Blow-dry the hair in the direction of the part.",
      "Apply a small amount of styling cream or pomade.",
      "Comb into place for a neat finish.",
    ],
    avoidIf: [
      "You want a highly messy or rebellious appearance.",
      "Your hair is too short to form a side part.",
    ],
  },

  {
    id: "messy-quiff",
    name: "Messy Quiff + Mid Fade",
    category: "modern",
    description:
      "A textured hairstyle with moderate height at the front and clean faded sides.",
    image: "/hairstyles/messy-quiff.webp",

    suitableFaceShapes: ["oval", "round", "square", "heart"],
    suitableHairTextures: ["straight", "wavy"],
    suitableHairThickness: ["medium", "thick"],
    suitableHairLengths: ["medium"],
    suitableLooks: ["modern", "casual", "bold"],
    suitableStylingEffort: ["five-to-ten", "high"],

    maintenance: "medium",
    stylingTimeMinutes: 8,
    trendScore: 93,
    professionalScore: 75,

    topLength:
      "Keep approximately 8–12 cm on top, with extra length near the front.",
    sideInstructions:
      "Ask for a mid fade blended smoothly into the longer top.",
    backInstructions:
      "Fade the back consistently and keep the transition soft.",
    barberInstructions:
      "I would like a messy textured quiff with a mid fade. Keep around 8–12 cm on top with additional length at the front. Add texture using scissors and blend the sides smoothly without creating a hard disconnect.",

    beardRecommendation:
      "Light stubble or a short boxed beard balances the height of the quiff.",
    stylingProducts: ["Pre-styling spray", "Matte clay"],
    stylingSteps: [
      "Apply pre-styling spray to damp hair.",
      "Blow-dry the front upward and slightly backward.",
      "Apply matte clay.",
      "Use your fingers to create a loose, textured finish.",
    ],
    avoidIf: [
      "Your face is already very long.",
      "You do not want to use a hairdryer.",
      "Your hair is extremely thin.",
    ],
  },

  {
    id: "buzz-cut",
    name: "Buzz Cut",
    category: "low-maintenance",
    description:
      "A very short, clean hairstyle requiring almost no daily styling.",
    image: "/hairstyles/buzz-cut.webp",

    suitableFaceShapes: ["oval", "square", "diamond"],
    suitableHairTextures: [
      "straight",
      "wavy",
      "curly",
      "coily",
    ],
    suitableHairThickness: ["thin", "medium", "thick"],
    suitableHairLengths: ["very-short", "short"],
    suitableLooks: ["professional", "bold", "low-maintenance"],
    suitableStylingEffort: ["none"],

    maintenance: "low",
    stylingTimeMinutes: 0,
    trendScore: 84,
    professionalScore: 85,

    topLength:
      "Use one consistent clipper guard or keep the top slightly longer than the sides.",
    sideInstructions:
      "Use guards 0.5–2 depending on how short you want the haircut.",
    backInstructions:
      "Keep the back evenly clipped and clean around the neckline.",
    barberInstructions:
      "I would like a clean buzz cut. Keep the top slightly longer than the sides, using a consistent blend. Please clean the edges naturally and avoid making the hairline look overly sharp.",

    beardRecommendation:
      "A short beard or defined stubble can add structure and contrast.",
    stylingProducts: [],
    stylingSteps: [
      "No daily styling is required.",
      "Use scalp moisturiser or sunscreen when necessary.",
    ],
    avoidIf: [
      "You prefer longer hairstyles.",
      "You are uncomfortable exposing your full hairline or head shape.",
    ],
  },

  {
    id: "slick-back-taper",
    name: "Slick Back + Taper",
    category: "classic",
    description:
      "A mature hairstyle where medium-length hair is directed backward with clean tapered sides.",
    image: "/hairstyles/slick-back-taper.webp",

    suitableFaceShapes: ["oval", "square", "diamond"],
    suitableHairTextures: ["straight", "wavy"],
    suitableHairThickness: ["medium", "thick"],
    suitableHairLengths: ["medium", "long"],
    suitableLooks: ["professional", "modern", "bold"],
    suitableStylingEffort: ["five-to-ten", "high"],

    maintenance: "medium",
    stylingTimeMinutes: 8,
    trendScore: 86,
    professionalScore: 94,

    topLength:
      "Keep approximately 10–15 cm on top so the hair can be directed backward.",
    sideInstructions:
      "Ask for a natural taper or low taper rather than an aggressive high fade.",
    backInstructions:
      "Keep enough length for a smooth transition into the top.",
    barberInstructions:
      "I would like a slick back with a natural taper. Keep approximately 10–15 cm on top and enough weight for the hair to move backward. Blend the sides cleanly without taking them too short.",

    beardRecommendation:
      "A short, neatly shaped beard works well with the mature appearance of this style.",
    stylingProducts: ["Styling cream", "Medium-hold pomade"],
    stylingSteps: [
      "Apply styling cream to damp hair.",
      "Blow-dry the hair backward.",
      "Apply a small amount of pomade.",
      "Use fingers for a natural finish or a comb for a polished finish.",
    ],
    avoidIf: [
      "Your hair is currently very short.",
      "You have very thin hair at the front.",
      "You dislike using styling products.",
    ],
  },

  {
    id: "curly-taper-fade",
    name: "Curly Taper Fade",
    category: "curly",
    description:
      "A clean taper that keeps and defines natural curls on the top.",
    image: "/hairstyles/curly-taper-fade.webp",

    suitableFaceShapes: [
      "oval",
      "round",
      "square",
      "diamond",
      "heart",
    ],
    suitableHairTextures: ["curly", "coily"],
    suitableHairThickness: ["medium", "thick"],
    suitableHairLengths: ["short", "medium"],
    suitableLooks: ["modern", "casual", "low-maintenance"],
    suitableStylingEffort: ["under-5", "five-to-ten"],

    maintenance: "medium",
    stylingTimeMinutes: 5,
    trendScore: 95,
    professionalScore: 85,

    topLength:
      "Keep approximately 5–10 cm on top, depending on your curl pattern.",
    sideInstructions:
      "Ask for a low taper around the temples and sideburns while preserving the curls.",
    backInstructions:
      "Taper the neckline cleanly without taking the fade too high.",
    barberInstructions:
      "I would like a curly taper fade. Keep my natural curls on top with approximately 5–10 cm of length. Clean the temples, sideburns, and neckline with a low taper. Please avoid cutting the curls too short or thinning them excessively.",

    beardRecommendation:
      "A short beard or natural stubble complements the texture and shape of this haircut.",
    stylingProducts: ["Curl cream", "Leave-in conditioner"],
    stylingSteps: [
      "Apply leave-in conditioner to damp hair.",
      "Distribute curl cream evenly.",
      "Scrunch the curls gently using your hands.",
      "Allow the hair to air-dry or use a diffuser.",
    ],
    avoidIf: [
      "Your hair is naturally completely straight.",
      "You regularly brush out your curls.",
    ],
  },
];
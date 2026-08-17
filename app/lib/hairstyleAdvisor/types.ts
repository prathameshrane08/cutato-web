export type FaceShape =
  | "oval"
  | "round"
  | "square"
  | "diamond"
  | "heart"
  | "oblong"
  | "unknown";

export type HairTexture =
  | "straight"
  | "wavy"
  | "curly"
  | "coily"
  | "unknown";

export type HairThickness =
  | "thin"
  | "medium"
  | "thick"
  | "unknown";

export type HairCondition =
  | "silky"
  | "normal"
  | "dry"
  | "frizzy"
  | "oily"
  | "unknown";

export type HairLength =
  | "very-short"
  | "short"
  | "medium"
  | "long"
  | "unknown";

export type StylingEffort =
  | "none"
  | "under-5"
  | "five-to-ten"
  | "high"
  | "unknown";

export type PreferredLook =
  | "professional"
  | "modern"
  | "casual"
  | "bold"
  | "low-maintenance"
  | "unknown";

export type FacialHair =
  | "clean-shaven"
  | "stubble"
  | "short-beard"
  | "full-beard"
  | "moustache"
  | "unknown";

export type HairstyleProfile = {
  faceShape: FaceShape;
  hairTexture: HairTexture;
  hairThickness: HairThickness;
  hairCondition: HairCondition;
  currentLength: HairLength;
  stylingEffort: StylingEffort;
  preferredLook: PreferredLook;
  facialHair: FacialHair;
  photo?: string;
};

export type HairstyleRecommendation = {
  id: string;
  name: string;
  matchScore: number;
  description: string;
  whyItSuitsYou: string[];
  topInstructions: string[];
  sideInstructions: string[];
  backInstructions: string[];
  barberInstructions: string;
  facialHairAdvice: string;
  stylingInstructions: string[];
  stylesToAvoid: string[];
  imageUrl?: string;
};
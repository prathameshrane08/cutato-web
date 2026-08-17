import type {
  HairstyleProfile,
  HairstyleRecommendation,
} from "./types";

import {
  HAIRSTYLES,
  type Hairstyle,
} from "./hairstyles";

type ScoredHairstyle = {
  hairstyle: Hairstyle;
  rawScore: number;
  reasons: string[];
};

function addMatchScore(
  condition: boolean,
  points: number,
  reason: string,
  reasons: string[]
): number {
  if (!condition) {
    return 0;
  }

  reasons.push(reason);

  return points;
}

function scoreHairstyle(
  hairstyle: Hairstyle,
  profile: HairstyleProfile
): ScoredHairstyle {
  let score = 0;

  const reasons: string[] = [];

  score += addMatchScore(
    hairstyle.suitableFaceShapes.includes(
      profile.faceShape
    ),
    30,
    `This hairstyle works well with a ${profile.faceShape} face shape.`,
    reasons
  );

  score += addMatchScore(
    hairstyle.suitableHairTextures.includes(
      profile.hairTexture
    ),
    20,
    `It suits ${profile.hairTexture} hair.`,
    reasons
  );

  score += addMatchScore(
    hairstyle.suitableHairThickness.includes(
      profile.hairThickness
    ),
    15,
    `It is suitable for ${profile.hairThickness} hair thickness.`,
    reasons
  );

  score += addMatchScore(
    hairstyle.suitableHairLengths.includes(
      profile.currentLength
    ),
    10,
    `Your current ${profile.currentLength} hair length is suitable for this style.`,
    reasons
  );

  score += addMatchScore(
    hairstyle.suitableLooks.includes(
      profile.preferredLook
    ),
    10,
    `It matches the ${profile.preferredLook} look you selected.`,
    reasons
  );

  score += addMatchScore(
    hairstyle.suitableStylingEffort.includes(
      profile.stylingEffort
    ),
    10,
    "Its styling requirements match the time you want to spend on your hair.",
    reasons
  );

  score += Math.round(
    hairstyle.trendScore * 0.03
  );

  score += Math.round(
    hairstyle.professionalScore * 0.02
  );

  return {
    hairstyle,
    rawScore: score,
    reasons,
  };
}

function calculateMatchPercentage(
  score: number,
  highestScore: number
): number {
  if (highestScore <= 0) {
    return 60;
  }

  const percentage = Math.round(
    (score / highestScore) * 100
  );

  return Math.max(
    55,
    Math.min(98, percentage)
  );
}

function createRecommendation(
  scoredItem: ScoredHairstyle,
  highestScore: number
): HairstyleRecommendation {
  const {
    hairstyle,
    rawScore,
    reasons,
  } = scoredItem;

  return {
    id: hairstyle.id,
    name: hairstyle.name,
    matchScore: calculateMatchPercentage(
      rawScore,
      highestScore
    ),
    description: hairstyle.description,
    whyItSuitsYou:
      reasons.length > 0
        ? reasons
        : [
            "This is a versatile hairstyle that may work well with your preferences.",
          ],
    topInstructions: [
      hairstyle.topLength,
    ],
    sideInstructions: [
      hairstyle.sideInstructions,
    ],
    backInstructions: [
      hairstyle.backInstructions,
    ],
    barberInstructions:
      hairstyle.barberInstructions,
    facialHairAdvice:
      hairstyle.beardRecommendation,
    stylingInstructions:
      hairstyle.stylingSteps,
    stylesToAvoid:
      hairstyle.avoidIf,
    imageUrl: hairstyle.image,
  };
}

export function getHairstyleRecommendations(
  profile: HairstyleProfile,
  limit = 3
): HairstyleRecommendation[] {
  const scoredHairstyles = HAIRSTYLES.map(
    (hairstyle) =>
      scoreHairstyle(
        hairstyle,
        profile
      )
  ).sort(
    (first, second) =>
      second.rawScore -
      first.rawScore
  );

  const highestScore =
    scoredHairstyles[0]?.rawScore ?? 0;

  return scoredHairstyles
    .slice(0, limit)
    .map((scoredItem) =>
      createRecommendation(
        scoredItem,
        highestScore
      )
    );
}
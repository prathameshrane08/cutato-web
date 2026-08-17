"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoUploader from "./PhotoUploader";

import type {
  FaceShape,
  FacialHair,
  HairCondition,
  HairLength,
  HairTexture,
  HairThickness,
  HairstyleProfile,
  HairstyleRecommendation,
  PreferredLook,
  StylingEffort,
} from "@/app/lib/hairstyleAdvisor/types";

import { getHairstyleRecommendations } from "@/app/lib/hairstyleAdvisor/scoring";

import {
  FACIAL_HAIR_OPTIONS,
  HAIR_CONDITION_OPTIONS,
  HAIR_LENGTH_OPTIONS,
  HAIR_TEXTURE_OPTIONS,
  HAIR_THICKNESS_OPTIONS,
  PREFERRED_LOOK_OPTIONS,
  STYLING_EFFORT_OPTIONS,
} from "@/app/lib/hairstyleAdvisor/questions";

import FaceShapeSelector from "./FaceShapeSelector";
import QuestionOptionGrid from "./QuestionOptionGrid";

const TOTAL_QUESTIONS = 8;

const INITIAL_PROFILE: HairstyleProfile = {
  faceShape: "oval",
  hairTexture: "unknown",
  hairThickness: "unknown",
  hairCondition: "unknown",
  currentLength: "medium",
  stylingEffort: "unknown",
  preferredLook: "unknown",
  facialHair: "unknown",
};

export default function HairstyleAdvisor() {
    const [image, setImage] = useState<string | null>(null);

    const [isAnalysing, setIsAnalysing] = useState(false);

    const [usePhoto, setUsePhoto] = useState(false);  
    const router = useRouter();

    const [step, setStep] = useState(-1);

    const [profile, setProfile] =
        useState<HairstyleProfile>(INITIAL_PROFILE);

    const [recommendations, setRecommendations] = useState<
        HairstyleRecommendation[]
    >([]);

    const [isLoading, setIsLoading] = useState(false);

    const progress =
        step > 0 && step <= TOTAL_QUESTIONS
        ? Math.round((step / TOTAL_QUESTIONS) * 100)
        : 0;

  function isCurrentStepAnswered() {
    switch (step) {
        case 1:
        return Boolean(profile.faceShape);

        case 2:
        return profile.hairTexture !== "unknown";

        case 3:
        return profile.hairThickness !== "unknown";

        case 4:
        return profile.hairCondition !== "unknown";

        case 5:
        return profile.currentLength !== "unknown";

        case 6:
        return profile.stylingEffort !== "unknown";

        case 7:
        return profile.preferredLook !== "unknown";

        case 8:
        return profile.facialHair !== "unknown";

        default:
        return true;
    }
    }

  function goToNextStep() {
    setStep((currentStep) =>
      Math.min(currentStep + 1, TOTAL_QUESTIONS)
    );
  }

  function goToPreviousStep() {
    setStep((currentStep) => Math.max(currentStep - 1, 0));
  }

  function updateProfile<
    Key extends keyof HairstyleProfile
  >(
    key: Key,
    value: HairstyleProfile[Key]
  ) {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [key]: value,
    }));
  }

  function handleFaceShapeSelect(
    faceShape: FaceShape
  ) {
    updateProfile("faceShape", faceShape);
  }

  function generateRecommendations() {
    setIsLoading(true);

    window.setTimeout(() => {
      const results =
        getHairstyleRecommendations(profile);

      setRecommendations(results);
      setIsLoading(false);
      setStep(9);
    }, 1800);
  }

  function restartAdvisor() {
    setProfile(INITIAL_PROFILE);
    setRecommendations([]);
    setImage(null);
    setUsePhoto(false);
    setIsAnalysing(false);
    setIsLoading(false);
    setStep(-1);
  }

  function bookHairstyle(
    recommendation: HairstyleRecommendation
  ) {
    const searchParams = new URLSearchParams({
      hairstyle: recommendation.name,
      recommendationId: recommendation.id,
    });

    router.push(`/book?${searchParams.toString()}`);
  }

  async function analysePhoto() {
    if (!image || isAnalysing) return;

    setIsAnalysing(true);

    try {
      const response = await fetch("/api/hairstyle-advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image }),
      });

      const analysis = await response.json();

      if (!response.ok) {
        throw new Error(
          analysis.error ?? "The photo could not be analysed."
        );
      }

      setProfile((previous) => ({
        ...previous,
        faceShape: analysis.faceShape ?? previous.faceShape,
        hairTexture:
          analysis.hairTexture ?? previous.hairTexture,
        hairThickness:
          analysis.hairThickness ?? previous.hairThickness,
        hairCondition:
          analysis.hairCondition ?? previous.hairCondition,
        currentLength:
          analysis.currentLength ?? previous.currentLength,
        facialHair:
          analysis.facialHair ?? previous.facialHair,
      }));

      setStep(1);
    } catch (error) {
      console.error("Photo analysis failed:", error);
      window.alert(
        "We could not analyse that photo. Please try another photo or continue manually."
      );
    } finally {
      setIsAnalysing(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-950 px-5 py-16 text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
          <div className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur md:p-14">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl text-black">
              ✨
            </div>

            <h1 className="mt-8 text-3xl font-bold md:text-5xl">
              Analysing your preferences
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-neutral-400">
              We are comparing your face shape, hair
              characteristics, preferred style and maintenance
              requirements.
            </p>

            <div className="mx-auto mt-10 max-w-md space-y-4 text-left">
              <AnalysisItem text="Checking your face shape" />

              <AnalysisItem text="Matching your hair texture" />

              <AnalysisItem text="Reviewing your styling preferences" />

              <AnalysisItem text="Finding your top hairstyles" />
            </div>

            <div className="mx-auto mt-10 h-2 max-w-md overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-white" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (step === -1) {
    return (
      <main className="min-h-screen bg-neutral-950 px-5 py-12 text-white md:py-20">
        <div className="mx-auto max-w-6xl">
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-7 shadow-2xl md:p-14">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">
                  <span>✨</span>

                  <span>Cutato AI Consultation</span>
                </div>

                <h1 className="mt-7 text-4xl font-black leading-tight md:text-6xl">
                  Find the hairstyle that suits you.
                </h1>

                <p className="mt-6 max-w-xl text-base leading-8 text-neutral-300 md:text-lg">
                  Answer a few simple questions about your face
                  shape, hair and preferred look. Cutato will
                  recommend your top three hairstyles and provide
                  clear instructions for your barber.
                </p>

                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="mt-9 rounded-full bg-white px-8 py-4 font-semibold text-black transition hover:scale-[1.02] hover:bg-neutral-200"
                >
                  Start consultation
                </button>

                <p className="mt-4 text-sm text-neutral-500">
                  It takes approximately two minutes.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FeatureCard
                  emoji="🎯"
                  title="Personal matches"
                  description="Recommendations based on your real hair characteristics."
                />

                <FeatureCard
                  emoji="✂️"
                  title="Barber instructions"
                  description="Clear instructions you can show during your appointment."
                />

                <FeatureCard
                  emoji="🧴"
                  title="Styling guidance"
                  description="Products and steps for recreating the hairstyle."
                />

                <FeatureCard
                  emoji="🧔"
                  title="Beard advice"
                  description="Facial-hair suggestions that complement your haircut."
                />
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (step === 0) {
    return (
      <main className="min-h-screen bg-neutral-950 px-5 py-12 text-white md:py-20">
        <div className="mx-auto max-w-6xl">
          <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-7 shadow-2xl md:p-14">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">
                <span>✨</span>
                <span>Cutato AI Consultation</span>
              </div>

              <h1 className="mt-7 text-4xl font-black leading-tight md:text-6xl">
                How would you like to begin?
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-neutral-300 md:text-lg">
                Upload a clear front-facing photo for AI analysis or
                answer the consultation questions yourself.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setUsePhoto(true)}
                className={`rounded-3xl border p-7 text-left transition ${
                  usePhoto
                    ? "border-white bg-white text-black"
                    : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                }`}
              >
                <div className="text-4xl">📷</div>

                <h2 className="mt-6 text-2xl font-bold">
                  Upload a photo
                </h2>

                <p
                  className={`mt-3 leading-7 ${
                    usePhoto
                      ? "text-neutral-600"
                      : "text-neutral-400"
                  }`}
                >
                  Let AI estimate your face shape, hair texture,
                  thickness, condition, length and facial hair.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsePhoto(false);
                  setStep(1);
                }}
                className="rounded-3xl border border-white/10 bg-white/5 p-7 text-left transition hover:border-white/30 hover:bg-white/10"
              >
                <div className="text-4xl">✍️</div>

                <h2 className="mt-6 text-2xl font-bold">
                  Answer manually
                </h2>

                <p className="mt-3 leading-7 text-neutral-400">
                  Select your face shape, hair characteristics and
                  styling preferences step by step.
                </p>
              </button>
            </div>

            {usePhoto && (
              <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-white/10 bg-black/20 p-5 md:p-7">
                <PhotoUploader onImageSelected={setImage} />

                <button
                  type="button"
                  onClick={analysePhoto}
                  disabled={!image || isAnalysing}
                  className={`mt-6 w-full rounded-full px-7 py-4 font-semibold transition ${
                    image && !isAnalysing
                      ? "bg-white text-black hover:bg-neutral-200"
                      : "cursor-not-allowed bg-neutral-800 text-neutral-500"
                  }`}
                >
                  {isAnalysing
                    ? "Analysing your photo..."
                    : "Analyse my photo"}
                </button>

                <p className="mt-4 text-center text-sm leading-6 text-neutral-500">
                  You can review and change every AI-detected answer
                  before generating your recommendations.
                </p>
              </div>
            )}

            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => {
                  setUsePhoto(false);
                  setImage(null);
                  setStep(-1);
                }}
                className="rounded-full border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Back
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (step === 9) {
    return (
      <main className="min-h-screen bg-neutral-100 px-5 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white">
              Your consultation is complete
            </span>

            <h1 className="mt-7 text-4xl font-black text-neutral-950 md:text-6xl">
              Your top hairstyle matches
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-neutral-600">
              These styles received the strongest scores based on
              your face shape, hair and personal preferences.
            </p>
          </div>

          <div className="mt-12 grid gap-7 lg:grid-cols-3">
            {recommendations.map(
              (recommendation, index) => (
                <article
                  key={recommendation.id}
                  className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex min-h-48 items-center justify-center bg-neutral-900 p-8 text-white">
                    <div className="text-center">
                      <div className="text-5xl">
                        {index === 0
                          ? "🥇"
                          : index === 1
                            ? "🥈"
                            : "🥉"}
                      </div>

                      <p className="mt-5 text-sm uppercase tracking-[0.2em] text-neutral-400">
                        Recommendation {index + 1}
                      </p>
                    </div>
                  </div>

                  <div className="p-7">
                    <div className="flex items-start justify-between gap-5">
                      <h2 className="text-2xl font-bold text-neutral-950">
                        {recommendation.name}
                      </h2>

                      <div className="shrink-0 rounded-full bg-green-100 px-3 py-2 text-sm font-bold text-green-800">
                        {recommendation.matchScore}%
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-neutral-600">
                      {recommendation.description}
                    </p>

                    <div className="mt-7">
                      <h3 className="font-semibold text-neutral-950">
                        Why it suits you
                      </h3>

                      <ul className="mt-3 space-y-3">
                        {recommendation.whyItSuitsYou
                          .slice(0, 3)
                          .map((reason) => (
                            <li
                              key={reason}
                              className="flex gap-3 text-sm leading-6 text-neutral-600"
                            >
                              <span className="font-bold text-green-600">
                                ✓
                              </span>

                              <span>{reason}</span>
                            </li>
                          ))}
                      </ul>
                    </div>

                    <details className="mt-7 rounded-2xl bg-neutral-100 p-5">
                      <summary className="cursor-pointer font-semibold text-neutral-950">
                        Barber and styling details
                      </summary>

                      <div className="mt-5 space-y-5 text-sm leading-6 text-neutral-600">
                        <DetailSection
                          title="Barber instructions"
                          text={
                            recommendation.barberInstructions
                          }
                        />

                        <DetailSection
                          title="Facial hair"
                          text={
                            recommendation.facialHairAdvice
                          }
                        />

                        <div>
                          <h4 className="font-semibold text-neutral-950">
                            Styling steps
                          </h4>

                          <ol className="mt-2 space-y-2">
                            {recommendation.stylingInstructions.map(
                              (instruction, instructionIndex) => (
                                <li
                                  key={instruction}
                                  className="flex gap-3"
                                >
                                  <span className="font-semibold text-neutral-950">
                                    {instructionIndex + 1}.
                                  </span>

                                  <span>{instruction}</span>
                                </li>
                              )
                            )}
                          </ol>
                        </div>
                      </div>
                    </details>

                    <button
                      type="button"
                      onClick={() =>
                        bookHairstyle(recommendation)
                      }
                      className="mt-7 w-full rounded-full bg-black px-6 py-4 font-semibold text-white transition hover:bg-neutral-800"
                    >
                      Book this hairstyle
                    </button>
                  </div>
                </article>
              )
            )}
          </div>

          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={restartAdvisor}
              className="rounded-full border border-neutral-300 bg-white px-7 py-3 font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              Restart consultation
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="text-sm font-medium text-neutral-500">
                Hairstyle consultation
              </p>

              <h1 className="mt-1 text-2xl font-bold text-neutral-950">
                Step {step} of {TOTAL_QUESTIONS}
              </h1>
            </div>

            <span className="text-lg font-bold text-neutral-950">
              {progress}%
            </span>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-black transition-all duration-500"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </header>

        <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm md:p-10">
          {step === 1 && (
            <FaceShapeSelector
              selected={profile.faceShape}
              onSelect={handleFaceShapeSelect}
            />
          )}

          {step === 2 && (
            <QuestionOptionGrid
              title="What is your natural hair texture?"
              subtitle="Choose the option that most closely describes your hair without styling."
              options={HAIR_TEXTURE_OPTIONS}
              selected={profile.hairTexture}
              onSelect={(value) =>
                updateProfile(
                  "hairTexture",
                  value as HairTexture
                )
              }
            />
          )}

          {step === 3 && (
            <QuestionOptionGrid
              title="How thick is your hair?"
              subtitle="Think about the overall density and how visible your scalp is."
              options={HAIR_THICKNESS_OPTIONS}
              selected={profile.hairThickness}
              onSelect={(value) =>
                updateProfile(
                  "hairThickness",
                  value as HairThickness
                )
              }
            />
          )}

          {step === 4 && (
            <QuestionOptionGrid
              title="How would you describe your hair condition?"
              subtitle="Choose the option that best describes how your hair normally feels."
              options={HAIR_CONDITION_OPTIONS}
              selected={profile.hairCondition}
              onSelect={(value) =>
                updateProfile(
                  "hairCondition",
                  value as HairCondition
                )
              }
            />
          )}

          {step === 5 && (
            <QuestionOptionGrid
              title="What is your current hair length?"
              subtitle="Choose your current length, not the length you eventually want."
              options={HAIR_LENGTH_OPTIONS}
              selected={profile.currentLength}
              onSelect={(value) =>
                updateProfile(
                  "currentLength",
                  value as HairLength
                )
              }
            />
          )}

          {step === 6 && (
            <QuestionOptionGrid
              title="How much time will you spend styling?"
              subtitle="We will avoid recommending styles that require more effort than you prefer."
              options={STYLING_EFFORT_OPTIONS}
              selected={profile.stylingEffort}
              onSelect={(value) =>
                updateProfile(
                  "stylingEffort",
                  value as StylingEffort
                )
              }
            />
          )}

          {step === 7 && (
            <QuestionOptionGrid
              title="What kind of appearance do you want?"
              subtitle="Choose the style that best matches your personality and daily routine."
              options={PREFERRED_LOOK_OPTIONS}
              selected={profile.preferredLook}
              onSelect={(value) =>
                updateProfile(
                  "preferredLook",
                  value as PreferredLook
                )
              }
            />
          )}

          {step === 8 && (
            <QuestionOptionGrid
              title="What facial hair do you currently keep?"
              subtitle="This helps us recommend a balanced hairstyle and beard combination."
              options={FACIAL_HAIR_OPTIONS}
              selected={profile.facialHair}
              onSelect={(value) =>
                updateProfile(
                  "facialHair",
                  value as FacialHair
                )
              }
            />
          )}

          <div className="mt-12 flex items-center justify-between gap-4 border-t border-neutral-200 pt-7">
            <button
              type="button"
              onClick={goToPreviousStep}
              className="rounded-full border border-neutral-300 px-6 py-3 font-semibold text-neutral-900 transition hover:bg-neutral-100"
            >
              Back
            </button>

            {step < TOTAL_QUESTIONS ? (
              <button
                type="button"
                onClick={goToNextStep}
                disabled={!isCurrentStepAnswered()}
                className={`
                    rounded-full
                    px-7
                    py-3
                    font-semibold
                    transition
                    ${
                    isCurrentStepAnswered()
                        ? "bg-black text-white hover:bg-neutral-800"
                        : "cursor-not-allowed bg-neutral-200 text-neutral-400"
                    }
                `}
                >
                Continue
                </button>
            ) : (
              <button
                type="button"
                onClick={generateRecommendations}
                disabled={!isCurrentStepAnswered()}
                className={`
                    rounded-full
                    px-7
                    py-3
                    font-semibold
                    transition
                    ${
                    isCurrentStepAnswered()
                        ? "bg-black text-white hover:bg-neutral-800"
                        : "cursor-not-allowed bg-neutral-200 text-neutral-400"
                    }
                `}
                >
                Show my recommendations
                </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

type FeatureCardProps = {
  emoji: string;
  title: string;
  description: string;
};

function FeatureCard({
  emoji,
  title,
  description,
}: FeatureCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="text-3xl">{emoji}</div>

      <h2 className="mt-5 text-lg font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-neutral-400">
        {description}
      </p>
    </div>
  );
}

function AnalysisItem({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-black">
        ✓
      </span>

      <span className="text-neutral-300">{text}</span>
    </div>
  );
}

type DetailSectionProps = {
  title: string;
  text: string;
};

function DetailSection({
  title,
  text,
}: DetailSectionProps) {
  return (
    <div>
      <h4 className="font-semibold text-neutral-950">
        {title}
      </h4>

      <p className="mt-2">{text}</p>
    </div>
  );
}
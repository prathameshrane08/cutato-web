import type { FaceShape } from "./types";

export type FaceShapeOption = {
  id: FaceShape;
  title: string;
  description: string;
  characteristics: string[];
  image: string;
};

export const FACE_SHAPES: FaceShapeOption[] = [
  {
    id: "oval",
    title: "Oval",
    description:
      "Balanced proportions. The forehead is slightly wider than the jaw and the face is slightly longer than it is wide.",
    characteristics: [
      "Balanced face",
      "Soft jawline",
      "Most versatile face shape",
    ],
    image: "/faces/oval.svg",
  },
  {
    id: "round",
    title: "Round",
    description:
      "The face has nearly equal width and height with soft curves and a rounded jawline.",
    characteristics: [
      "Rounded cheeks",
      "Soft jaw",
      "Needs hairstyles that add height",
    ],
    image: "/faces/round.svg",
  },
  {
    id: "square",
    title: "Square",
    description:
      "The forehead, cheekbones, and jaw have similar widths with a strong and angular jawline.",
    characteristics: [
      "Strong jawline",
      "Angular features",
      "Balanced width and length",
    ],
    image: "/faces/square.svg",
  },
  {
    id: "diamond",
    title: "Diamond",
    description:
      "The cheekbones are the widest part of the face, while the forehead and jaw are narrower.",
    characteristics: [
      "Wide cheekbones",
      "Narrow forehead",
      "Defined chin",
    ],
    image: "/faces/diamond.svg",
  },
  {
    id: "heart",
    title: "Heart",
    description:
      "The forehead is wider than the jaw, with a narrower or more pointed chin.",
    characteristics: [
      "Wide forehead",
      "Narrow jaw",
      "Defined or pointed chin",
    ],
    image: "/faces/heart.svg",
  },
  {
    id: "oblong",
    title: "Oblong",
    description:
      "The face is noticeably longer than it is wide, with relatively straight sides.",
    characteristics: [
      "Long face",
      "Straight cheek line",
      "Needs balanced volume",
    ],
    image: "/faces/oblong.svg",
  },
];

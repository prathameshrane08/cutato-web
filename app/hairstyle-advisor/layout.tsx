import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hairstyle advisor",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

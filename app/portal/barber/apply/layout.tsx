import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join as a barber",
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

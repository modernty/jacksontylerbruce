import type { Metadata } from "next";

import { GradientFoot, GradientWash } from "@/components/gradient-wash";

import "./globals.css";

export const metadata: Metadata = {
  title: "Remedy, the work",
  description:
    "Every feature, source file and concept designed for Remedy, with a link to the design behind it.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="relative">
          <GradientWash />
          {children}
          <GradientFoot />
        </div>
      </body>
    </html>
  );
}

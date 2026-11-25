import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

/**
 * Poppins SemiBold is the wordmark and greeting face in the PC Chat designs. It is
 * loaded only so the rebuilt screens match the file — nothing in the documentation
 * site itself uses it.
 */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-pc-chat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PC Chat — Features and Specs",
  description:
    "Review new features for PC Chat and the specs associated with them.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full ${poppins.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

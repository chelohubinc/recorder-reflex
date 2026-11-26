import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recorder Reflex — entraîne tes réflexes",
  description: "Apprends et entraîne les doigtés de la flûte à bec soprano allemande.",
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="dark h-full antialiased" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
